import { NextResponse } from 'next/server';

// Global memory-store to track connected listeners by their processing ID
// Note: In production environments (like Vercel), serverless functions reset their state.
// For distributed scaling, switch this out for a Redis Pub/Sub client.
global.clipListeners = global.clipListeners || {};

// 1. THE FRONTEND SEES THIS (GET Request to listen for real-time changes)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const reqId = searchParams.get('id');

  if (!reqId) {
    return new NextResponse('Missing reference ID parameter', { status: 400 });
  }

  const encoder = new TextEncoder();

  // Use a ReadableStream so we control exactly when it stays open or closes.
  // The stream's `cancel` callback fires when the client disconnects.
  const stream = new ReadableStream({
    start(controller) {
      // --- Register this client so the POST webhook can reach it ---
      if (!global.clipListeners[reqId]) {
        global.clipListeners[reqId] = [];
      }

      // Wrap the controller in a helper that matches the writer API used by POST
      const client = {
        // Called by POST to push an SSE event to this browser tab
        write(chunk) {
          controller.enqueue(chunk);
        },
        // Called during cleanup
        close() {
          try { controller.close(); } catch (_) {}
        },
      };

      global.clipListeners[reqId].push(client);

      // Send an immediate connection-confirmed comment so the browser
      // knows the stream is live (prevents instant timeout on some proxies)
      controller.enqueue(encoder.encode(': connected\n\n'));

      // --- Heartbeat: send a comment every 20 s to keep the TCP connection
      //     alive through proxies, load-balancers, and Vercel's 30 s timeout ---
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch (_) {
          clearInterval(heartbeat);
        }
      }, 20_000);

      // --- Cleanup when the browser tab closes or navigates away ---
      const cleanup = () => {
        clearInterval(heartbeat);
        global.clipListeners[reqId] = global.clipListeners[reqId]?.filter(
          (c) => c !== client
        );
        if (global.clipListeners[reqId]?.length === 0) {
          delete global.clipListeners[reqId];
        }
        try { controller.close(); } catch (_) {}
      };

      request.signal.addEventListener('abort', cleanup);
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      // Tell Nginx / Vercel not to buffer SSE responses
      'X-Accel-Buffering': 'no',
    },
  });
}

// 2. THE EXTERNAL PROGRAM CALLS THIS (POST Request webhook)
export async function POST(request) {
  try {
    const body = await request.json();

    // Extract your identifier. Adapt depending on what your external program sends.
    const reqId = body.req_id || body.ref;
    const status = body.status; // e.g. "COMPLETED" or "FAILED"

    if (!reqId || !status) {
      return NextResponse.json(
        { error: 'Payload must include req_id (or ref) and status' },
        { status: 400 }
      );
    }

    const listeners = global.clipListeners[reqId];

    if (!listeners || listeners.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Webhook received, but no browser clients are watching this ID right now.',
      });
    }

    const encoder = new TextEncoder();
    const dataPayload = encoder.encode(`data: ${JSON.stringify({ status })}\n\n`);

    // Write to every connected tab; skip any whose stream already closed
    const writeResults = await Promise.allSettled(
      listeners.map((client) => {
        try {
          client.write(dataPayload);
          // After a terminal status, close the stream from the server side
          if (status === 'COMPLETED' || status === 'FAILED') {
            client.close();
          }
        } catch (err) {
          console.warn(`[SSE] Failed to write to client for ${reqId}:`, err.message);
        }
      })
    );

    // Remove dead clients after a terminal event
    if (status === 'COMPLETED' || status === 'FAILED') {
      delete global.clipListeners[reqId];
    }

    return NextResponse.json({
      success: true,
      message: `Dispatched "${status}" to ${listeners.length} active client(s).`,
    });
  } catch (error) {
    console.error('[Webhook] Unexpected error:', error);
    return NextResponse.json({ error: 'Invalid JSON payload structure' }, { status: 400 });
  }
}