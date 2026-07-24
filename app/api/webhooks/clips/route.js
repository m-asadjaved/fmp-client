import { NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";

// Global memory-store to track connected listeners by their processing ID
// Note: In production environments (like Vercel), serverless functions reset their state.
// For distributed scaling, switch this out for a Redis Pub/Sub client.
global.clipListeners = global.clipListeners || {};

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

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
    const { searchParams } = new URL(request.url);
    const clipIndexParam = searchParams.get('clip_index');
    const clip_index = clipIndexParam ? parseInt(clipIndexParam, 10) : 0;

    const body = await request.json();
    const reqId = body.req_id || body.ref;
    const status = body.status?.toUpperCase(); 

    if (!reqId || !status) {
      return NextResponse.json(
        { error: 'Payload must include req_id (or ref) and status' },
        { status: 400 }
      );
    }

    // 1. Fetch the request to get ai_analysis and current status
    const { data: reqData } = await supabase
      .from('video_processing_req')
      .select('video_id, ai_analysis, status')
      .eq('id', reqId)
      .single();
      
    const listenerId = reqData?.video_id || reqId;

    // 2. Fetch the user_id
    const { data: videoData } = await supabase
      .from('videos')
      .select('user_id')
      .eq('video_id', listenerId)
      .single();

    // 3. Log the clip's specific finish
    await supabase.from("video_processing_logs").insert([{
      video_id: listenerId,
      current_process: status === 'FAILED' ? `Clip ${clip_index} Failed: ${body.error || body.reason || 'Unknown error'}` : `Clip ${clip_index} Edited Successfully`,
      status: status === 'FAILED' ? 'clip_failed' : 'clip_completed'
    }]);

    // 4. Insert into generated_clips ONLY if this specific clip succeeded
    if (status === 'COMPLETED' && videoData?.user_id && process.env.AWS_BUCKET_URL) {
        await supabase.from('generated_clips').insert([{
          user_id: videoData.user_id,
          video_id: listenerId,
          clip_index: clip_index,
          clip_url: `${process.env.AWS_BUCKET_URL}/processed_videos/output-${listenerId}-${clip_index}.mp4`
        }]);
    }

    // 5. Determine if this is the FINAL clip finishing
    const { count: finishedClipsCount } = await supabase
      .from('video_processing_logs')
      .select('id', { count: 'exact', head: true })
      .eq('video_id', listenerId)
      .in('status', ['clip_completed', 'clip_failed']);

    let analysis = reqData?.ai_analysis;
    if (typeof analysis === 'string') {
      try { analysis = JSON.parse(analysis); } catch(e){}
    }

    let expectedClips = 1;
    if (analysis && Array.isArray(analysis.recommended_shorts)) {
       const newClips = analysis.recommended_shorts.filter(c => c.is_new !== false);
       expectedClips = newClips.length > 0 ? newClips.length : analysis.recommended_shorts.length;
       expectedClips = Math.min(expectedClips, 5); // Matches backend limit
    }

    const isFinalEvent = finishedClipsCount >= expectedClips;
    let sseStatus = status;

    if (isFinalEvent) {
       // Determine if at least one clip succeeded
       const { count: successCount } = await supabase
         .from('generated_clips')
         .select('id', { count: 'exact', head: true })
         .eq('video_id', listenerId);
       
       sseStatus = successCount > 0 ? 'COMPLETED' : 'FAILED';
       
       await supabase.from('video_processing_req').update({ 
           status: sseStatus.toLowerCase() 
       }).eq('id', reqId);
       
       await supabase.from("video_processing_logs").insert([{
         video_id: listenerId,
         current_process: sseStatus === 'FAILED' ? 'All clips failed processing.' : 'Pipeline finished successfully.',
         status: sseStatus.toLowerCase()
       }]);
    } else {
       sseStatus = status === 'COMPLETED' ? 'PARTIAL_COMPLETED' : 'PARTIAL_FAILED';
    }

    // 6. Broadcast to frontend
    const listeners = global.clipListeners[listenerId];

    if (!listeners || listeners.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Webhook received, but no browser clients are watching this ID right now.',
      });
    }

    const encoder = new TextEncoder();
    const dataPayload = encoder.encode(`data: ${JSON.stringify({ ...body, status: sseStatus, clip_index })}\n\n`);

    await Promise.allSettled(
      listeners.map((client) => {
        try {
          client.write(dataPayload);
          // Only close stream on the absolute final event
          if (isFinalEvent) {
            client.close();
          }
        } catch (err) {
          console.warn(`[SSE] Failed to write to client for ${reqId}:`, err.message);
        }
      })
    );

    if (isFinalEvent) {
      delete global.clipListeners[listenerId];
    }

    return NextResponse.json({
      success: true,
      message: `Dispatched "${sseStatus}" to ${listeners.length} active client(s). (${finishedClipsCount}/${expectedClips} clips finished)`,
    });
  } catch (error) {
    console.error('[Webhook] Unexpected error:', error);
    return NextResponse.json({ error: 'Invalid JSON payload structure' }, { status: 400 });
  }
}