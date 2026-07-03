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

  let initialJob = null;
  if (jobId) {
    const supabase = createClient(
      process.env.SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );
    const { data } = await supabase
      .from("post_jobs")
      .select("id, scheduled_for, platforms")
      .eq("id", jobId)
      .single();
    
    if (data) {
      initialJob = data;
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <CaptionEditor videoId={videoId} initialJob={initialJob} />
    </main>
  );
}
