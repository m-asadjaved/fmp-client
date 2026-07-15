import { auth, clerkClient } from '@clerk/nextjs/server';
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { videoUrl, title, description, privacyStatus = 'private', scheduleDate } = body;

    if (!videoUrl) {
      return NextResponse.json({ error: 'Missing videoUrl' }, { status: 400 });
    }

    // Retrieve Google OAuth token from Clerk
    // Note: User must have connected their Google account with the YouTube upload scope
    const client = await clerkClient();
    const tokenResponse = await client.users.getUserOauthAccessToken(userId, 'oauth_google');
    
    // Clerk SDK v4/v5 vs v7 compatibility check
    const tokens = tokenResponse.data || tokenResponse;
    const googleToken = tokens.find(t => t.provider === 'oauth_google');

    if (!googleToken || !googleToken.token) {
      return NextResponse.json({ 
        error: 'No Google OAuth token found. Please connect your Google account in settings.' 
      }, { status: 403 });
    }

    // Initialize Google API Client
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: googleToken.token });

    const youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client,
    });

    // Fetch the video file as a stream
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      return NextResponse.json({ error: 'Failed to download video from storage.' }, { status: 500 });
    }

    // Using web streams directly or converting to Buffer (Node stream might be needed by googleapis)
    // googleapis prefers Node.js streams, so we can pass a Node Readable stream.
    // However, fetch returns a Web Stream. We can convert it or just use an arrayBuffer.
    // Since clips might be large (but shorts are usually < 50MB), array buffer is fine for memory.
    const arrayBuffer = await videoResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const stream = require('stream');
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);

    // Upload to YouTube
    const uploadRes = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: title || 'Generated Clip from Twenty2Short',
          description: description || 'Created with Twenty2Short',
          categoryId: '22', // People & Blogs
        },
        status: {
          privacyStatus: scheduleDate ? 'private' : privacyStatus, // Must be private to schedule
          publishAt: scheduleDate ? new Date(scheduleDate).toISOString() : undefined,
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        body: bufferStream,
      },
    });

    return NextResponse.json({ 
      success: true, 
      videoId: uploadRes.data.id,
      url: `https://youtu.be/${uploadRes.data.id}`
    });

  } catch (error) {
    console.error("YouTube Upload API Error:", error);
    
    // Check if error is related to scopes
    if (error.message?.includes('insufficientPermissions')) {
      return NextResponse.json({ error: 'YouTube Upload permission not granted. Re-connect Google account.' }, { status: 403 });
    }

    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
