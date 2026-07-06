import { createClient } from "@supabase/supabase-js";
import CaptionEditor from "../../components/CaptionEditor";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Video Caption Editor | Lumina AI',
  description: 'Edit video captions using Remotion',
};

export default async function EditorPage({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  const videoId = resolvedParams.id;
  const jobId = resolvedSearch.jobId;
  
  let clipIndex = 0;
  if (resolvedSearch.index !== undefined && resolvedSearch.index !== null) {
    clipIndex = parseInt(resolvedSearch.index, 10);
  }

  let initialJob = null;
  let initialHookText = null;

  const supabase = createClient(
    process.env.SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );

  if (jobId) {
    const { data } = await supabase
      .from("post_jobs")
      .select("id, scheduled_for, platforms")
      .eq("id", jobId)
      .single();
    
    if (data) {
      initialJob = data;
    }
  }

  if (clipIndex !== null && !isNaN(clipIndex)) {
    const { data: reqDataArray } = await supabase
      .from("video_processing_req")
      .select("ai_analysis")
      .eq("video_id", videoId)
      .order("created_at", { ascending: false })
      .limit(1);

    const reqData = reqDataArray?.[0];

    if (reqData && reqData.ai_analysis) {
      const parsedAi = typeof reqData.ai_analysis === 'string' ? JSON.parse(reqData.ai_analysis) : reqData.ai_analysis;
      const shorts = parsedAi?.recommended_shorts || [];
      if (shorts[clipIndex] && shorts[clipIndex].title_or_hook) {
        initialHookText = shorts[clipIndex].title_or_hook;
      }
    }
  }

  console.log("EditorPage Server Log:");
  console.log("videoId:", videoId);
  console.log("clipIndex:", clipIndex);
  console.log("initialHookText:", initialHookText);

  return (
    <main className="min-h-screen bg-background">
      <CaptionEditor videoId={videoId} initialJob={initialJob} initialHookText={initialHookText} />
    </main>
  );
}
