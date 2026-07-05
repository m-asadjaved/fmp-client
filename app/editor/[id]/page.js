import { createClient } from "@supabase/supabase-js";
import CaptionEditor from "../../components/CaptionEditor";

export const metadata = {
  title: 'Video Caption Editor | Lumina AI',
  description: 'Edit video captions using Remotion',
};

export default async function EditorPage({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  const videoId = resolvedParams.id;
  const jobId = resolvedSearch.jobId;
  const clipIndex = resolvedSearch.index ? parseInt(resolvedSearch.index, 10) : null;

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
    const { data: reqData } = await supabase
      .from("video_processing_req")
      .select("ai_analysis")
      .eq("video_id", videoId)
      .single();

    if (reqData && reqData.ai_analysis) {
      const parsedAi = typeof reqData.ai_analysis === 'string' ? JSON.parse(reqData.ai_analysis) : reqData.ai_analysis;
      const shorts = parsedAi?.recommended_shorts || [];
      if (shorts[clipIndex] && shorts[clipIndex].title_or_hook) {
        initialHookText = shorts[clipIndex].title_or_hook;
      }
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <CaptionEditor videoId={videoId} initialJob={initialJob} initialHookText={initialHookText} />
    </main>
  );
}
