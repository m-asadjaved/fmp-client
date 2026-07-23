import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: "Missing YouTube URL." }, { status: 400 });
    }

    const apiKey = process.env.VIDEO_DOWNLOAD_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing VIDEO_DOWNLOAD_API_KEY in environment variables." }, { status: 500 });
    }

    // Call video-download-api.com to start the job
    const apiUrl = new URL("https://p.savenow.to/ajax/download.php");
    apiUrl.searchParams.append("url", url);
    apiUrl.searchParams.append("format", "1080");
    apiUrl.searchParams.append("apikey", apiKey);
    apiUrl.searchParams.append("add_info", "1");
    apiUrl.searchParams.append("no_merge", "0");

    const response = await fetch(apiUrl.toString());
    const data = await response.json();

    if (!response.ok || !data.success) {
      return NextResponse.json({ error: "Failed to initiate download job via external API.", details: data }, { status: 500 });
    }

    return NextResponse.json({
      jobId: data.id,
      info: data.info || {},
    });

  } catch (error) {
    console.error("YouTube Download Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
