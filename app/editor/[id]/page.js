import CaptionEditor from "../../components/CaptionEditor";

export const metadata = {
  title: 'Video Caption Editor | Lumina AI',
  description: 'Edit video captions using Remotion',
};

export default async function EditorPage({ params }) {
  const resolvedParams = await params;
  const videoId = resolvedParams.id;

  return (
    <main className="min-h-screen bg-background">
      <CaptionEditor videoId={videoId} />
    </main>
  );
}
