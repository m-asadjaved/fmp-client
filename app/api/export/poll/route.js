import { getRenderProgress } from "@remotion/lambda/client";
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import stream from "stream";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// ─── GET /api/export/poll
// Called by the dashboard to check pending jobs for the current user.
// For each "processing" job, fetches Remotion progress.
// If done → marks completed in DB and returns the finished job.
// Returns: { jobs: [...] } where each job has status, progress, platform, etc.
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all pending jobs for this user
    const { data: jobs, error } = await supabase
      .from("post_jobs")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "processing")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ jobs: [] });
    }

    const results = await Promise.all(
      jobs.map(async (job) => {
        try {
          const progress = await getRenderProgress({
            renderId: job.render_id,
            bucketName: job.bucket_name,
            functionName: job.function_name,
            region: job.region,
          });

          if (progress.fatalErrorEncountered) {
            // Mark as failed
            await supabase
              .from("post_jobs")
              .update({
                status: "failed",
                error_message:
                  progress.errors?.[0]?.message || "Unknown render error",
              })
              .eq("id", job.id);

            return { ...job, status: "failed", progress: 0 };
          }

          if (progress.done) {
            const outputUrl = progress.outputFile || null;
            let youtubeError = null;

            // If this job includes YouTube, do the upload
            const platforms = Array.isArray(job.platforms) ? job.platforms : (job.platform ? [job.platform] : []);
            if (platforms.includes('YouTube') && outputUrl) {
              try {
                const client = await clerkClient();
                const tokenResponse = await client.users.getUserOauthAccessToken(job.user_id, 'oauth_google');
                const tokens = tokenResponse.data || tokenResponse;
                const googleToken = tokens.find(t => t.provider === 'oauth_google');
                
                if (googleToken && googleToken.token) {
                  const oauth2Client = new google.auth.OAuth2();
                  oauth2Client.setCredentials({ access_token: googleToken.token });
                  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
                  
                  const videoResponse = await fetch(outputUrl);
                  if (videoResponse.ok) {
                    const arrayBuffer = await videoResponse.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    const bufferStream = new stream.PassThrough();
                    bufferStream.end(buffer);
                    
                    await youtube.videos.insert({
                      part: ['snippet', 'status'],
                      requestBody: {
                        snippet: {
                          title: 'Generated Clip from Twenty2Short',
                          description: 'Created with Twenty2Short',
                          categoryId: '22',
                        },
                        status: {
                          privacyStatus: 'private',
                          publishAt: job.scheduled_for ? (
                            new Date(job.scheduled_for) > new Date(Date.now() + 15 * 60 * 1000)
                              ? new Date(job.scheduled_for).toISOString()
                              : new Date(Date.now() + 15 * 60 * 1000).toISOString()
                          ) : undefined,
                          selfDeclaredMadeForKids: false,
                        },
                      },
                      media: {
                        body: bufferStream,
                      },
                    });
                  } else {
                    youtubeError = "Failed to download video from storage for YouTube upload.";
                  }
                } else {
                  youtubeError = "No Google OAuth token found. Please connect your Google account in settings.";
                }
              } catch (e) {
                console.error("YouTube Upload error during poll:", e);
                youtubeError = e.message;
              }
            }

            // Mark as completed
            await supabase
              .from("post_jobs")
              .update({
                status: "completed",
                output_url: outputUrl,
                error_message: youtubeError || job.error_message,
                completed_at: new Date().toISOString(),
              })
              .eq("id", job.id);

            return {
              ...job,
              status: "completed",
              output_url: outputUrl,
              progress: 100,
            };
          }

          // Still processing
          return {
            ...job,
            status: "processing",
            progress: Math.round((progress.overallProgress || 0) * 100),
          };
        } catch (pollErr) {
          console.error(`[poll] Error checking job ${job.id}:`, pollErr);
          return { ...job, status: "processing", progress: 0 };
        }
      })
    );

    return NextResponse.json({ jobs: results });
  } catch (error) {
    console.error("[GET /api/export/poll]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── GET /api/export/poll?completed=1
// Called once to fetch recently completed (but not-yet-acknowledged) jobs.
// After the dashboard shows the alert, it should PATCH the job to mark it acknowledged.
export async function PATCH(req) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = await req.json();
    if (!jobId) {
      return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    }

    await supabase
      .from("post_jobs")
      .update({ acknowledged: true })
      .eq("id", jobId)
      .eq("user_id", userId); // ownership check

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/export/poll]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
