import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// ─── GET /api/export/calendar
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch internal jobs that are not yet completed
    const { data: dbJobs, error } = await supabase
      .from("post_jobs")
      .select("id, platforms, scheduled_for, status, created_at, video_id")
      .eq("user_id", userId)
      .not("scheduled_for", "is", null)
      .neq("status", "completed")
      .order("scheduled_for", { ascending: true });

    if (error) throw error;
    let allJobs = dbJobs || [];

    // 2. Try fetching YouTube jobs
    try {
      const client = await clerkClient();
      const tokenResponse = await client.users.getUserOauthAccessToken(userId, 'oauth_google');
      const tokens = tokenResponse.data || tokenResponse;
      const googleToken = tokens.find(t => t.provider === 'oauth_google');

      if (googleToken && googleToken.token) {
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: googleToken.token });
        const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

        // Get user's uploads playlist
        const channelRes = await youtube.channels.list({ mine: true, part: ['contentDetails'] });
        const uploadsPlaylistId = channelRes.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

        if (uploadsPlaylistId) {
          // Get recent items
          const playlistRes = await youtube.playlistItems.list({
            playlistId: uploadsPlaylistId,
            part: ['contentDetails'],
            maxResults: 50
          });
          const videoIds = playlistRes.data.items?.map(item => item.contentDetails?.videoId).filter(Boolean);

          if (videoIds && videoIds.length > 0) {
            // Get full video statuses
            const videosRes = await youtube.videos.list({
              id: videoIds.join(','),
              part: ['snippet', 'status']
            });

            const scheduledYTVideos = videosRes.data.items?.filter(
              v => v.status?.privacyStatus === 'private' && v.status?.publishAt
            );

            if (scheduledYTVideos) {
              const ytJobs = scheduledYTVideos.map(v => ({
                id: `yt_${v.id}`,
                platforms: ['YouTube'],
                scheduled_for: v.status.publishAt,
                status: 'scheduled',
                created_at: v.snippet.publishedAt,
                video_id: null,
                isExternal: true,
                title: v.snippet.title,
                thumbnail: v.snippet.thumbnails?.default?.url
              }));

              allJobs = [...allJobs, ...ytJobs];
            }
          }
        }
      }
    } catch (ytError) {
      console.warn("Failed to fetch YouTube scheduled videos:", ytError.message);
      // We don't fail the whole request, we just return the DB jobs
    }

    // Sort combined jobs by schedule date
    allJobs.sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime());

    return NextResponse.json({ jobs: allJobs });
  } catch (error) {
    console.error("[GET /api/export/calendar]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── DELETE /api/export/calendar
export async function DELETE(req) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing job ID" }, { status: 400 });
    }

    // If it's a YouTube job, delete it via YouTube API
    if (id.startsWith('yt_')) {
      const videoId = id.replace('yt_', '');
      
      const client = await clerkClient();
      const tokenResponse = await client.users.getUserOauthAccessToken(userId, 'oauth_google');
      const tokens = tokenResponse.data || tokenResponse;
      const googleToken = tokens.find(t => t.provider === 'oauth_google');

      if (!googleToken || !googleToken.token) {
        return NextResponse.json({ error: 'No Google OAuth token found.' }, { status: 403 });
      }

      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: googleToken.token });
      const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

      try {
        await youtube.videos.delete({ id: videoId });
        return NextResponse.json({ success: true });
      } catch (ytError) {
        if (ytError.message?.includes('insufficient authentication scopes') || ytError.message?.includes('insufficientPermissions')) {
          return NextResponse.json({ error: 'App only has upload permissions. Please delete this video directly from YouTube Studio.' }, { status: 403 });
        }
        throw ytError;
      }
    }

    // Otherwise, delete from internal DB
    const { error } = await supabase
      .from("post_jobs")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/export/calendar]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
