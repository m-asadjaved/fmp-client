import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenAI } from '@google/genai';
import { createClient } from "@supabase/supabase-js";

const AWS_LAMBDA_START_VIDEO_PROCESSING_TASK_URL = process.env.AWS_LAMBDA_START_VIDEO_PROCESSING_TASK_URL;
const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME;
const WEBHOOK_URL_VIDEO_STATUS = process.env.WEBHOOK_URL_VIDEO_STATUS;
const AWS_BUCKET_URL = process.env.AWS_BUCKET_URL;

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST(request, context) {
  try {
    // Await params correctly for modern Next.js versions
    const params = await context.params;
    const { videoId } = params;

    const { userId } = await auth();

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    // ✅ Fixed - use maybeSingle() which returns null if not found
    const { data: videoData, error } = await supabase
    .from('video_processing_req')
    .select('*')
    .eq('video_id', videoId)
    .maybeSingle(); // returns null instead of throwing

    if (error) throw new Error(error.message);

    if (videoData && videoData.status === 'completed') {
    return NextResponse.json(
      { success: true, videoStatus: "exist", message: "Clips already generated." },
      { status: 200 }
    );
    }
    
    if (error) {
      throw new Error(error.message);
    }

    if(videoData && videoData.length > 0)
    if(videoData.status === 'completed'){
      return NextResponse.json({ success: true, videoStatus: "exist", message: "The clips have already has been generated of this video."}, {status: 200});
    }

    await supabase
      .from("video_processing_logs")
      .insert([
        {
          video_id: videoId,
          current_process: 'Send the req to AI for analysis',
          status: 'analyzing'
        },
      ])
      .select()
      .single();

    const ai_response = await SummarizeUsingAI(`${AWS_BUCKET_URL}/raw_videos/${videoId}.mp4`);

    const {data: videoReqData, error: videoReqError } = await supabase
      .from("video_processing_req")
      .insert([
        {
          video_id: videoId,
          status: 'processing',
          ai_analysis: ai_response
        },
      ])
      .select("id")
      .single();

    // 1. Convert JSON string into a JavaScript object
    const raw_data = JSON.parse(ai_response);

    if (
        !raw_data.recommended_shorts ||
        raw_data.recommended_shorts.length === 0
    ) {
        throw new Error("AI returned no recommended clips.");
    }
    
    // 2. Access the FIRST item in the array using [0]
    const firstClip = raw_data.recommended_shorts[0];
    
    // 3. Extract the variables safely from that first clip
    const start_time = firstClip.start_time;
    // Note: your JSON uses 'duration_seconds' instead of 'duration'
    const duration = firstClip.duration_seconds; 
    const fullSubtitles = raw_data.full_subtitles; 
    
    // 4. Create your clip_info object matching your required format
    const clip_info = {
      "start_time": start_time,
      "duration_seconds": duration // Converts 0 to "0" if you need it as a string
    };

    await supabase
      .from("video_processing_logs")
      .insert([
        {
          video_id: videoId,
          current_process: 'Send the video to edit engine for video editing',
          status: 'editing'
        },
      ])
      .select()
      .single();

    // 2. Send the POST request to the external/specific URL
    const response = await fetch(AWS_LAMBDA_START_VIDEO_PROCESSING_TASK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        req_id: videoReqData.id,
        user_id: userId,
        s3_bucket: AWS_BUCKET_NAME,
        s3_input_key: `raw_videos/${videoId}.mp4`,
        s3_output_key: `processed_videos/output-${videoId}.mp4`,
        webhook_url: WEBHOOK_URL_VIDEO_STATUS,
        clip_info: clip_info,
        full_subtitles: fullSubtitles,
      }),
    });

    // 3. Handle errors from the target server
    if (!response.ok) {
      throw new Error(`External API responded with status: ${response.status}`);
    }

    // 5. Return the data back to your client
    return NextResponse.json({success: true});

  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Initialize the client. It automatically picks up process.env.GEMINI_API_KEY
const ai = new GoogleGenAI({});

// Define the precise schema according to the guide structure
const summaryJsonSchema = {
  type: "object",
  properties: {
    recommended_shorts: {
      type: "array",
      description: "Must contain exactly ONE object representing the single best viral clip from the video.",
      items: {
        type: "object",
        properties: {
          clip_number: { type: "integer" },
          start_time: { type: "string", description: "Timestamp format MM:SS" },
          end_time: { type: "string", description: "Timestamp format MM:SS" },
          duration_seconds: { type: "integer" },
          title_or_hook: { type: "string", description: "Catchy, viral hook headline." },
          rationale: { type: "string", description: "Detailed explanation of why this specific segment makes the best standalone short-form clip." }
        },
        required: ["clip_number", "start_time", "end_time", "duration_seconds", "title_or_hook", "rationale"]
      }
    },
    full_subtitles: {
      type: "string",
      description: "[00:00:00] subtitle text here [00:00:05] next line of subtitle text..."
    }
  },
  required: ["recommended_shorts", "full_subtitles"]
};

export async function SummarizeUsingAI(videoUrl) {
  try {
    if (!videoUrl) {
      throw new Error("Video URL is required");
    }

    const prompt = `
                    You are an expert AI video editor and short-form content strategist. Analyze the provided YouTube video transcript/content and identify exactly ONE highly engaging, viral-worthy segment suitable for a YouTube Short, TikTok, or Instagram Reel.

                    Your response must be strictly formatted as a single JSON object. Do not include any conversational text, markdown formatting outside of the json code block, or explanations before or after the JSON.
                    
                    Requirements:
                    1. recommended_shorts: Must contain exactly ONE object representing the single best viral clip from the video.
                    2. full_subtitles: Provide the full subtitles of the video with embedded timestamps throughout the text.`;

    const interaction = await ai.interactions.create({
      model: 'gemini-3.1-flash-lite', // Upgraded to match the guide's model version
      input: [
        {
          type: "video",
          uri: videoUrl, 
          mime_type: "video/mp4" 
        },
        { 
          type: "text", 
          text: prompt 
        } 
      ], 
      system_instruction: "You are an expert AI video editor and short-form content strategist.",
      // Map configuration structure perfectly to the format provided in the guide
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: summaryJsonSchema
      }
    });

    console.log(interaction.output_text);
    return interaction.output_text;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}