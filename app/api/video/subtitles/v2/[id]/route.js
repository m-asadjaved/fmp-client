import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const AWS_BUCKET_URL = process.env.AWS_BUCKET_URL;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";

const elevenlabs = new ElevenLabsClient({
  apiKey: ELEVENLABS_API_KEY
});

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// ─── GET handler ──────────────────────────────────────────────────────────────
export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json(
        { error: "Missing videoId in route params." },
        { status: 400 }
      );
    }

    const { data: videoData, error: fetchError } = await supabase
      .from("video_processing_req")
      .select("*")
      .eq("video_id", id)
      .maybeSingle();

    if (fetchError) throw new Error(`DB fetch failed: ${fetchError.message}`);
    if (!videoData) {
      return NextResponse.json(
        { error: "Video processing record not found." },
        { status: 404 }
      );
    }

    const audioUrl = `${AWS_BUCKET_URL}/processed_audio/${videoData.id}.flac`;
    const { subtitles, words } = await transcribeWithElevenLabs(audioUrl);

    return NextResponse.json({ subtitles, words }, { status: 200 });
  } catch (error) {
    console.error(`[GET /video/:id]`, error);
    return NextResponse.json(
      { success: false, error: error.message || "An unknown error occurred" },
      { status: 500 }
    );
  }
}

const MOCK_ELEVENLABS_RESPONSE = {
  "language_code": "eng",
  "language_probability": 0.9855594038963318,
  "text": "It's funny, the Italians were the smallest... Uh, they, they call them gangs in prison. Uh, the Italians weren't a gang. Mm-hmm. This is... I'll, I'll use the word \"gang\" just for the purpose of this response. They were the smallest gang in the prison yet commanded the highest level of respect. Really? Mm-hmm. More than the Blacks and Latinos? The Blacks and Latinos were always at, at each other's throats- Right. ... and they had... Like, for example, it was Crips and Bloods, and there was this uneasy peace between them just because it's not worth upsetting the apple cart. And everybody goes to solitary and then gets spread out all over the country. For the Latinos, it was far more complicated because it was Borrachos, Norteños, uh, Latin Kings, MS-13, um, Mexican Mafia, and then the individual cartels. So overall, there's one gigantic Hispanic prison gang called Pisces, and then within Pisces are all the-",
  "words": [
    {
      "text": "It's",
      "start": 0,
      "end": 0.019,
      "type": "word",
      "logprob": -1.2541625499725342
    },
    {
      "text": " ",
      "start": 0.019,
      "end": 0.039,
      "type": "spacing",
      "logprob": -0.21251222491264343
    },
    {
      "text": "funny,",
      "start": 0.039,
      "end": 0.099,
      "type": "word",
      "logprob": -0.2659815102815628
    },
    {
      "text": " ",
      "start": 0.099,
      "end": 0.14,
      "type": "spacing",
      "logprob": -0.0011342290090397
    },
    {
      "text": "the",
      "start": 0.14,
      "end": 0.199,
      "type": "word",
      "logprob": -0.0011342290090397
    },
    {
      "text": " ",
      "start": 0.199,
      "end": 0.239,
      "type": "spacing",
      "logprob": -0.000774798565544188
    },
    {
      "text": "Italians",
      "start": 0.239,
      "end": 1.059,
      "type": "word",
      "logprob": -0.000774798565544188
    },
    {
      "text": " ",
      "start": 1.059,
      "end": 1.099,
      "type": "spacing",
      "logprob": -0.003606602782383561
    },
    {
      "text": "were",
      "start": 1.1,
      "end": 1.199,
      "type": "word",
      "logprob": -0.003606602782383561
    },
    {
      "text": " ",
      "start": 1.199,
      "end": 1.259,
      "type": "spacing",
      "logprob": -0.0002774807217065245
    },
    {
      "text": "the",
      "start": 1.259,
      "end": 1.319,
      "type": "word",
      "logprob": -0.0002774807217065245
    },
    {
      "text": " ",
      "start": 1.319,
      "end": 1.439,
      "type": "spacing",
      "logprob": -0.0007310817018151283
    },
    {
      "text": "smallest...",
      "start": 1.439,
      "end": 1.999,
      "type": "word",
      "logprob": -0.09030573544177142
    },
    {
      "text": " ",
      "start": 1.999,
      "end": 2.559,
      "type": "spacing",
      "logprob": -0.7002449035644531
    },
    {
      "text": "Uh,",
      "start": 2.559,
      "end": 2.599,
      "type": "word",
      "logprob": -0.4668331146088652
    },
    {
      "text": " ",
      "start": 2.599,
      "end": 2.659,
      "type": "spacing",
      "logprob": -0.00006210611172718927
    },
    {
      "text": "they,",
      "start": 2.659,
      "end": 2.72,
      "type": "word",
      "logprob": -0.021475750155514107
    },
    {
      "text": " ",
      "start": 2.72,
      "end": 2.799,
      "type": "spacing",
      "logprob": -0.000046967357775429264
    },
    {
      "text": "they",
      "start": 2.799,
      "end": 2.919,
      "type": "word",
      "logprob": -0.000046967357775429264
    },
    {
      "text": " ",
      "start": 2.919,
      "end": 2.979,
      "type": "spacing",
      "logprob": -0.001279846066609025
    },
    {
      "text": "call",
      "start": 2.98,
      "end": 3.099,
      "type": "word",
      "logprob": -0.001279846066609025
    },
    {
      "text": " ",
      "start": 3.099,
      "end": 3.119,
      "type": "spacing",
      "logprob": -0.00039664984797127545
    },
    {
      "text": "them",
      "start": 3.119,
      "end": 3.22,
      "type": "word",
      "logprob": -0.00039664984797127545
    },
    {
      "text": " ",
      "start": 3.22,
      "end": 3.379,
      "type": "spacing",
      "logprob": -0.006242657080292702
    },
    {
      "text": "gangs",
      "start": 3.379,
      "end": 3.779,
      "type": "word",
      "logprob": -0.006242657080292702
    },
    {
      "text": " ",
      "start": 3.779,
      "end": 3.839,
      "type": "spacing",
      "logprob": -0.000028132995794294402
    },
    {
      "text": "in",
      "start": 3.839,
      "end": 3.899,
      "type": "word",
      "logprob": -0.000028132995794294402
    },
    {
      "text": " ",
      "start": 3.899,
      "end": 3.999,
      "type": "spacing",
      "logprob": -0.0024028734769672155
    },
    {
      "text": "prison.",
      "start": 4,
      "end": 4.219,
      "type": "word",
      "logprob": -0.03087385351370488
    },
    {
      "text": " ",
      "start": 4.219,
      "end": 4.4,
      "type": "spacing",
      "logprob": -0.41170987486839294
    },
    {
      "text": "Uh,",
      "start": 4.4,
      "end": 4.42,
      "type": "word",
      "logprob": -0.27447523672784274
    },
    {
      "text": " ",
      "start": 4.42,
      "end": 4.42,
      "type": "spacing",
      "logprob": -0.012935653328895569
    },
    {
      "text": "the",
      "start": 4.42,
      "end": 4.48,
      "type": "word",
      "logprob": -0.012935653328895569
    },
    {
      "text": " ",
      "start": 4.48,
      "end": 4.519,
      "type": "spacing",
      "logprob": -0.0009683449170552194
    },
    {
      "text": "Italians",
      "start": 4.519,
      "end": 4.859,
      "type": "word",
      "logprob": -0.0009683449170552194
    },
    {
      "text": " ",
      "start": 4.859,
      "end": 4.899,
      "type": "spacing",
      "logprob": -0.000635183765552938
    },
    {
      "text": "weren't",
      "start": 4.9,
      "end": 5.039,
      "type": "word",
      "logprob": -0.0004570064707617608
    },
    {
      "text": " ",
      "start": 5.039,
      "end": 5.059,
      "type": "spacing",
      "logprob": -0.0000016689286894688848
    },
    {
      "text": "a",
      "start": 5.059,
      "end": 5.139,
      "type": "word",
      "logprob": -0.0000016689286894688848
    },
    {
      "text": " ",
      "start": 5.139,
      "end": 5.199,
      "type": "spacing",
      "logprob": -0.000056503606174374
    },
    {
      "text": "gang.",
      "start": 5.199,
      "end": 5.48,
      "type": "word",
      "logprob": -0.000054787081899121405
    },
    {
      "text": " ",
      "start": 5.48,
      "end": 5.779,
      "type": "spacing",
      "logprob": 0
    },
    {
      "text": "Mm-hmm.",
      "start": 5.779,
      "end": 5.819,
      "type": "word",
      "logprob": -0.0002568408890510909
    },
    {
      "text": " ",
      "start": 5.819,
      "end": 5.859,
      "type": "spacing",
      "logprob": 0
    },
    {
      "text": "This",
      "start": 5.859,
      "end": 6.039,
      "type": "word",
      "logprob": -0.08387959748506546
    },
    {
      "text": " ",
      "start": 6.039,
      "end": 6.059,
      "type": "spacing",
      "logprob": -0.01690560393035412
    },
    {
      "text": "is...",
      "start": 6.059,
      "end": 6.259,
      "type": "word",
      "logprob": -0.01311253234744072
    },
    {
      "text": " ",
      "start": 6.259,
      "end": 6.299,
      "type": "spacing",
      "logprob": -0.22713111340999603
    },
    {
      "text": "I'll,",
      "start": 6.299,
      "end": 6.399,
      "type": "word",
      "logprob": -0.045849735714728015
    },
    {
      "text": " ",
      "start": 6.399,
      "end": 6.619,
      "type": "spacing",
      "logprob": -9.536738616588991e-7
    },
    {
      "text": "I'll",
      "start": 6.619,
      "end": 6.719,
      "type": "word",
      "logprob": -0.00008391867402224307
    },
    {
      "text": " ",
      "start": 6.719,
      "end": 6.799,
      "type": "spacing",
      "logprob": -0.000006198863957251888
    },
    {
      "text": "use",
      "start": 6.799,
      "end": 6.899,
      "type": "word",
      "logprob": -0.000006198863957251888
    },
    {
      "text": " ",
      "start": 6.899,
      "end": 6.939,
      "type": "spacing",
      "logprob": -0.000051020273531321436
    },
    {
      "text": "the",
      "start": 6.94,
      "end": 7,
      "type": "word",
      "logprob": -0.000051020273531321436
    },
    {
      "text": " ",
      "start": 7,
      "end": 7.039,
      "type": "spacing",
      "logprob": -0.00042215018766000867
    },
    {
      "text": "word",
      "start": 7.039,
      "end": 7.159,
      "type": "word",
      "logprob": -0.00042215018766000867
    },
    {
      "text": " ",
      "start": 7.159,
      "end": 7.219,
      "type": "spacing",
      "logprob": -1.7016843557357788
    },
    {
      "text": "\"gang\"",
      "start": 7.219,
      "end": 7.419,
      "type": "word",
      "logprob": -0.28469378216929425
    },
    {
      "text": " ",
      "start": 7.419,
      "end": 7.519,
      "type": "spacing",
      "logprob": -0.00010144196130568162
    },
    {
      "text": "just",
      "start": 7.519,
      "end": 7.619,
      "type": "word",
      "logprob": -0.00010144196130568162
    },
    {
      "text": " ",
      "start": 7.619,
      "end": 7.659,
      "type": "spacing",
      "logprob": -0.000002622600959512056
    },
    {
      "text": "for",
      "start": 7.659,
      "end": 7.719,
      "type": "word",
      "logprob": -0.000002622600959512056
    },
    {
      "text": " ",
      "start": 7.719,
      "end": 7.739,
      "type": "spacing",
      "logprob": -0.0001081169830285944
    },
    {
      "text": "the",
      "start": 7.739,
      "end": 7.819,
      "type": "word",
      "logprob": -0.0001081169830285944
    },
    {
      "text": " ",
      "start": 7.819,
      "end": 7.879,
      "type": "spacing",
      "logprob": -0.0041178204119205475
    },
    {
      "text": "purpose",
      "start": 7.879,
      "end": 8.139,
      "type": "word",
      "logprob": -0.0041178204119205475
    },
    {
      "text": " ",
      "start": 8.139,
      "end": 8.159,
      "type": "spacing",
      "logprob": -8.344646857949556e-7
    },
    {
      "text": "of",
      "start": 8.159,
      "end": 8.22,
      "type": "word",
      "logprob": -8.344646857949556e-7
    },
    {
      "text": " ",
      "start": 8.22,
      "end": 8.26,
      "type": "spacing",
      "logprob": -7.152555099310121e-7
    },
    {
      "text": "this",
      "start": 8.26,
      "end": 8.42,
      "type": "word",
      "logprob": -7.152555099310121e-7
    },
    {
      "text": " ",
      "start": 8.42,
      "end": 8.639,
      "type": "spacing",
      "logprob": -0.000529149197973311
    },
    {
      "text": "response.",
      "start": 8.639,
      "end": 9.079,
      "type": "word",
      "logprob": -0.0004789773132263993
    },
    {
      "text": " ",
      "start": 9.079,
      "end": 9.699,
      "type": "spacing",
      "logprob": -0.0012143626809120178
    },
    {
      "text": "They",
      "start": 9.699,
      "end": 9.779,
      "type": "word",
      "logprob": -0.0012143626809120178
    },
    {
      "text": " ",
      "start": 9.779,
      "end": 9.819,
      "type": "spacing",
      "logprob": -8.344646857949556e-7
    },
    {
      "text": "were",
      "start": 9.819,
      "end": 9.88,
      "type": "word",
      "logprob": -8.344646857949556e-7
    },
    {
      "text": " ",
      "start": 9.88,
      "end": 9.92,
      "type": "spacing",
      "logprob": -0.000024437606043647975
    },
    {
      "text": "the",
      "start": 9.92,
      "end": 10.019,
      "type": "word",
      "logprob": -0.000024437606043647975
    },
    {
      "text": " ",
      "start": 10.019,
      "end": 10.079,
      "type": "spacing",
      "logprob": -0.000017165990357170813
    },
    {
      "text": "smallest",
      "start": 10.079,
      "end": 10.519,
      "type": "word",
      "logprob": -0.000017165990357170813
    },
    {
      "text": " ",
      "start": 10.519,
      "end": 10.679,
      "type": "spacing",
      "logprob": -0.00562252476811409
    },
    {
      "text": "gang",
      "start": 10.679,
      "end": 11.02,
      "type": "word",
      "logprob": -0.00562252476811409
    },
    {
      "text": " ",
      "start": 11.02,
      "end": 11.079,
      "type": "spacing",
      "logprob": 0
    },
    {
      "text": "in",
      "start": 11.079,
      "end": 11.139,
      "type": "word",
      "logprob": 0
    },
    {
      "text": " ",
      "start": 11.139,
      "end": 11.179,
      "type": "spacing",
      "logprob": -8.344646857949556e-7
    },
    {
      "text": "the",
      "start": 11.179,
      "end": 11.259,
      "type": "word",
      "logprob": -8.344646857949556e-7
    },
    {
      "text": " ",
      "start": 11.259,
      "end": 11.319,
      "type": "spacing",
      "logprob": -0.0000849926145747304
    },
    {
      "text": "prison",
      "start": 11.319,
      "end": 11.679,
      "type": "word",
      "logprob": -0.0000849926145747304
    },
    {
      "text": " ",
      "start": 11.679,
      "end": 12.119,
      "type": "spacing",
      "logprob": -0.01044662855565548
    },
    {
      "text": "yet",
      "start": 12.119,
      "end": 12.279,
      "type": "word",
      "logprob": -0.01044662855565548
    },
    {
      "text": " ",
      "start": 12.279,
      "end": 12.34,
      "type": "spacing",
      "logprob": -0.0006171943969093263
    },
    {
      "text": "commanded",
      "start": 12.34,
      "end": 12.759,
      "type": "word",
      "logprob": -0.0006171943969093263
    },
    {
      "text": " ",
      "start": 12.759,
      "end": 12.819,
      "type": "spacing",
      "logprob": -0.000005960446742392378
    },
    {
      "text": "the",
      "start": 12.819,
      "end": 12.979,
      "type": "word",
      "logprob": -0.000005960446742392378
    },
    {
      "text": " ",
      "start": 12.979,
      "end": 13.039,
      "type": "spacing",
      "logprob": -0.000010490362910786644
    },
    {
      "text": "highest",
      "start": 13.039,
      "end": 13.399,
      "type": "word",
      "logprob": -0.000010490362910786644
    },
    {
      "text": " ",
      "start": 13.399,
      "end": 13.46,
      "type": "spacing",
      "logprob": -0.00004482168878894299
    },
    {
      "text": "level",
      "start": 13.46,
      "end": 13.779,
      "type": "word",
      "logprob": -0.00004482168878894299
    },
    {
      "text": " ",
      "start": 13.779,
      "end": 13.84,
      "type": "spacing",
      "logprob": -5.960462772236497e-7
    },
    {
      "text": "of",
      "start": 13.84,
      "end": 13.96,
      "type": "word",
      "logprob": -5.960462772236497e-7
    },
    {
      "text": " ",
      "start": 13.96,
      "end": 14.039,
      "type": "spacing",
      "logprob": -0.0000069141146923357155
    },
    {
      "text": "respect.",
      "start": 14.039,
      "end": 14.559,
      "type": "word",
      "logprob": -0.00015835119921803198
    },
    {
      "text": " ",
      "start": 14.559,
      "end": 14.759,
      "type": "spacing",
      "logprob": 0
    },
    {
      "text": "Really?",
      "start": 14.759,
      "end": 15.159,
      "type": "word",
      "logprob": -0.020285444165762914
    },
    {
      "text": " ",
      "start": 15.159,
      "end": 15.239,
      "type": "spacing",
      "logprob": 0
    },
    {
      "text": "Mm-hmm.",
      "start": 15.239,
      "end": 15.439,
      "type": "word",
      "logprob": -0.00005609226198950117
    },
    {
      "text": " ",
      "start": 15.439,
      "end": 15.639,
      "type": "spacing",
      "logprob": 0
    },
    {
      "text": "More",
      "start": 15.639,
      "end": 15.759,
      "type": "word",
      "logprob": -0.00002706014311115723
    },
    {
      "text": " ",
      "start": 15.759,
      "end": 15.819,
      "type": "spacing",
      "logprob": -0.000014662635294371285
    },
    {
      "text": "than",
      "start": 15.819,
      "end": 15.92,
      "type": "word",
      "logprob": -0.000014662635294371285
    },
    {
      "text": " ",
      "start": 15.92,
      "end": 15.96,
      "type": "spacing",
      "logprob": -0.000016212332411669195
    },
    {
      "text": "the",
      "start": 15.96,
      "end": 16.02,
      "type": "word",
      "logprob": -0.000016212332411669195
    },
    {
      "text": " ",
      "start": 16.02,
      "end": 16.059,
      "type": "spacing",
      "logprob": -0.0018484188476577401
    },
    {
      "text": "Blacks",
      "start": 16.059,
      "end": 16.379,
      "type": "word",
      "logprob": -0.0018484188476577401
    },
    {
      "text": " ",
      "start": 16.379,
      "end": 16.399,
      "type": "spacing",
      "logprob": -0.0003057250869460404
    },
    {
      "text": "and",
      "start": 16.399,
      "end": 16.459,
      "type": "word",
      "logprob": -0.0003057250869460404
    },
    {
      "text": " ",
      "start": 16.459,
      "end": 16.579,
      "type": "spacing",
      "logprob": -1.9112595319747925
    },
    {
      "text": "Latinos?",
      "start": 16.579,
      "end": 17.199,
      "type": "word",
      "logprob": -1.6723558008120563
    },
    {
      "text": " ",
      "start": 17.199,
      "end": 17.639,
      "type": "spacing",
      "logprob": 0
    },
    {
      "text": "The",
      "start": 17.639,
      "end": 17.7,
      "type": "word",
      "logprob": -0.00006651657167822123
    },
    {
      "text": " ",
      "start": 17.7,
      "end": 17.76,
      "type": "spacing",
      "logprob": -0.00017820201173890382
    },
    {
      "text": "Blacks",
      "start": 17.76,
      "end": 18,
      "type": "word",
      "logprob": -0.00017820201173890382
    },
    {
      "text": " ",
      "start": 18,
      "end": 18.02,
      "type": "spacing",
      "logprob": -0.00000822540732769994
    },
    {
      "text": "and",
      "start": 18.02,
      "end": 18.079,
      "type": "word",
      "logprob": -0.00000822540732769994
    },
    {
      "text": " ",
      "start": 18.079,
      "end": 18.1,
      "type": "spacing",
      "logprob": -0.006273695267736912
    },
    {
      "text": "Latinos",
      "start": 18.1,
      "end": 18.699,
      "type": "word",
      "logprob": -0.006273695267736912
    },
    {
      "text": " ",
      "start": 18.699,
      "end": 18.759,
      "type": "spacing",
      "logprob": -0.0000821318244561553
    },
    {
      "text": "were",
      "start": 18.76,
      "end": 18.919,
      "type": "word",
      "logprob": -0.0000821318244561553
    },
    {
      "text": " ",
      "start": 18.919,
      "end": 19.02,
      "type": "spacing",
      "logprob": -0.003843659767881036
    },
    {
      "text": "always",
      "start": 19.02,
      "end": 19.319,
      "type": "word",
      "logprob": -0.003843659767881036
    },
    {
      "text": " ",
      "start": 19.319,
      "end": 19.399,
      "type": "spacing",
      "logprob": -0.00004124556289752945
    },
    {
      "text": "at,",
      "start": 19.399,
      "end": 19.539,
      "type": "word",
      "logprob": -0.00022139415280738225
    },
    {
      "text": " ",
      "start": 19.539,
      "end": 20.119,
      "type": "spacing",
      "logprob": -0.00035041390219703317
    },
    {
      "text": "at",
      "start": 20.119,
      "end": 20.279,
      "type": "word",
      "logprob": -0.00035041390219703317
    },
    {
      "text": " ",
      "start": 20.279,
      "end": 20.339,
      "type": "spacing",
      "logprob": -0.00005113947918289341
    },
    {
      "text": "each",
      "start": 20.34,
      "end": 20.459,
      "type": "word",
      "logprob": -0.00005113947918289341
    },
    {
      "text": " ",
      "start": 20.459,
      "end": 20.539,
      "type": "spacing",
      "logprob": -0.02632436715066433
    },
    {
      "text": "other's",
      "start": 20.539,
      "end": 20.76,
      "type": "word",
      "logprob": -0.018884408562111536
    },
    {
      "text": " ",
      "start": 20.76,
      "end": 20.819,
      "type": "spacing",
      "logprob": -0.000017046782886609435
    },
    {
      "text": "throats-",
      "start": 20.819,
      "end": 21.139,
      "type": "word",
      "logprob": -0.004281485049432376
    },
    {
      "text": " ",
      "start": 21.139,
      "end": 21.319,
      "type": "spacing",
      "logprob": 0
    },
    {
      "text": "Right.",
      "start": 21.319,
      "end": 21.359,
      "type": "word",
      "logprob": -0.009084844452445395
    },
    {
      "text": " ",
      "start": 21.359,
      "end": 21.379,
      "type": "spacing",
      "logprob": 0
    },
    {
      "text": "...",
      "start": 21.379,
      "end": 21.379,
      "type": "word",
      "logprob": -0.0009944260818883777
    },
    {
      "text": " ",
      "start": 21.379,
      "end": 21.379,
      "type": "spacing",
      "logprob": -0.009416923858225346
    },
    {
      "text": "and",
      "start": 21.379,
      "end": 21.399,
      "type": "word",
      "logprob": -0.009416923858225346
    },
    {
      "text": " ",
      "start": 21.399,
      "end": 21.42,
      "type": "spacing",
      "logprob": -0.000013589766240329482
    },
    {
      "text": "they",
      "start": 21.42,
      "end": 21.579,
      "type": "word",
      "logprob": -0.000013589766240329482
    },
    {
      "text": " ",
      "start": 21.579,
      "end": 21.659,
      "type": "spacing",
      "logprob": -0.00002396077979938127
    },
    {
      "text": "had...",
      "start": 21.659,
      "end": 21.859,
      "type": "word",
      "logprob": -0.00042790736370079685
    },
    {
      "text": " ",
      "start": 21.859,
      "end": 22.079,
      "type": "spacing",
      "logprob": -0.0002441108226776123
    },
    {
      "text": "Like,",
      "start": 22.079,
      "end": 22.159,
      "type": "word",
      "logprob": -0.0007586643099784851
    },
    {
      "text": " ",
      "start": 22.159,
      "end": 22.239,
      "type": "spacing",
      "logprob": -0.000011086402082582936
    },
    {
      "text": "for",
      "start": 22.239,
      "end": 22.3,
      "type": "word",
      "logprob": -0.000011086402082582936
    },
    {
      "text": " ",
      "start": 22.3,
      "end": 22.339,
      "type": "spacing",
      "logprob": -0.00005578839045483619
    },
    {
      "text": "example,",
      "start": 22.34,
      "end": 22.62,
      "type": "word",
      "logprob": -0.0000491575678722711
    },
    {
      "text": " ",
      "start": 22.62,
      "end": 22.68,
      "type": "spacing",
      "logprob": -0.03784343600273132
    },
    {
      "text": "it",
      "start": 22.68,
      "end": 22.739,
      "type": "word",
      "logprob": -0.03784343600273132
    },
    {
      "text": " ",
      "start": 22.739,
      "end": 22.76,
      "type": "spacing",
      "logprob": -0.000014305012882687151
    },
    {
      "text": "was",
      "start": 22.76,
      "end": 22.84,
      "type": "word",
      "logprob": -0.000014305012882687151
    },
    {
      "text": " ",
      "start": 22.84,
      "end": 22.92,
      "type": "spacing",
      "logprob": -0.00011669908417388797
    },
    {
      "text": "Crips",
      "start": 22.92,
      "end": 23.119,
      "type": "word",
      "logprob": -0.0007821046165190637
    },
    {
      "text": " ",
      "start": 23.119,
      "end": 23.159,
      "type": "spacing",
      "logprob": -0.000003576272320060525
    },
    {
      "text": "and",
      "start": 23.159,
      "end": 23.219,
      "type": "word",
      "logprob": -0.000003576272320060525
    },
    {
      "text": " ",
      "start": 23.219,
      "end": 23.299,
      "type": "spacing",
      "logprob": -0.00036864637513644993
    },
    {
      "text": "Bloods,",
      "start": 23.299,
      "end": 23.6,
      "type": "word",
      "logprob": -0.00028882828649199965
    },
    {
      "text": " ",
      "start": 23.6,
      "end": 23.6,
      "type": "spacing",
      "logprob": -0.05496298521757126
    },
    {
      "text": "and",
      "start": 24.939,
      "end": 25,
      "type": "word",
      "logprob": -0.05496298521757126
    },
    {
      "text": " ",
      "start": 25,
      "end": 25.039,
      "type": "spacing",
      "logprob": -0.0000029802276912960224
    },
    {
      "text": "there",
      "start": 25.039,
      "end": 25.12,
      "type": "word",
      "logprob": -0.0000029802276912960224
    },
    {
      "text": " ",
      "start": 25.12,
      "end": 25.159,
      "type": "spacing",
      "logprob": -0.00003313963316031732
    },
    {
      "text": "was",
      "start": 25.159,
      "end": 25.239,
      "type": "word",
      "logprob": -0.00003313963316031732
    },
    {
      "text": " ",
      "start": 25.239,
      "end": 25.279,
      "type": "spacing",
      "logprob": -0.00008451581379631534
    },
    {
      "text": "this",
      "start": 25.279,
      "end": 25.5,
      "type": "word",
      "logprob": -0.00008451581379631534
    },
    {
      "text": " ",
      "start": 25.5,
      "end": 25.599,
      "type": "spacing",
      "logprob": -0.0017423938261345029
    },
    {
      "text": "uneasy",
      "start": 25.599,
      "end": 26.039,
      "type": "word",
      "logprob": -0.0017423938261345029
    },
    {
      "text": " ",
      "start": 26.039,
      "end": 26.099,
      "type": "spacing",
      "logprob": -0.0022050845436751842
    },
    {
      "text": "peace",
      "start": 26.099,
      "end": 26.34,
      "type": "word",
      "logprob": -0.0022050845436751842
    },
    {
      "text": " ",
      "start": 26.34,
      "end": 26.379,
      "type": "spacing",
      "logprob": -0.000004887569048150908
    },
    {
      "text": "between",
      "start": 26.379,
      "end": 26.699,
      "type": "word",
      "logprob": -0.000004887569048150908
    },
    {
      "text": " ",
      "start": 26.699,
      "end": 26.719,
      "type": "spacing",
      "logprob": -0.00024768622824922204
    },
    {
      "text": "them",
      "start": 26.719,
      "end": 26.84,
      "type": "word",
      "logprob": -0.00024768622824922204
    },
    {
      "text": " ",
      "start": 26.84,
      "end": 26.959,
      "type": "spacing",
      "logprob": -0.5236120223999023
    },
    {
      "text": "just",
      "start": 26.959,
      "end": 27.059,
      "type": "word",
      "logprob": -0.5236120223999023
    },
    {
      "text": " ",
      "start": 27.059,
      "end": 27.099,
      "type": "spacing",
      "logprob": -0.000064490144723095
    },
    {
      "text": "because",
      "start": 27.099,
      "end": 27.319,
      "type": "word",
      "logprob": -0.000064490144723095
    },
    {
      "text": " ",
      "start": 27.319,
      "end": 27.379,
      "type": "spacing",
      "logprob": -0.000004529942543740617
    },
    {
      "text": "it's",
      "start": 27.379,
      "end": 27.579,
      "type": "word",
      "logprob": -0.00011007814669028448
    },
    {
      "text": " ",
      "start": 27.579,
      "end": 27.639,
      "type": "spacing",
      "logprob": -7.152555099310121e-7
    },
    {
      "text": "not",
      "start": 27.639,
      "end": 27.879,
      "type": "word",
      "logprob": -7.152555099310121e-7
    },
    {
      "text": " ",
      "start": 27.879,
      "end": 27.939,
      "type": "spacing",
      "logprob": -0.00011955977242905647
    },
    {
      "text": "worth",
      "start": 27.939,
      "end": 28.679,
      "type": "word",
      "logprob": -0.00011955977242905647
    },
    {
      "text": " ",
      "start": 28.679,
      "end": 28.76,
      "type": "spacing",
      "logprob": -0.00003564294092939235
    },
    {
      "text": "upsetting",
      "start": 28.76,
      "end": 29.139,
      "type": "word",
      "logprob": -0.00003564294092939235
    },
    {
      "text": " ",
      "start": 29.139,
      "end": 29.179,
      "type": "spacing",
      "logprob": -3.576278118089249e-7
    },
    {
      "text": "the",
      "start": 29.179,
      "end": 29.239,
      "type": "word",
      "logprob": -3.576278118089249e-7
    },
    {
      "text": " ",
      "start": 29.239,
      "end": 29.319,
      "type": "spacing",
      "logprob": -0.0032534070778638124
    },
    {
      "text": "apple",
      "start": 29.319,
      "end": 29.539,
      "type": "word",
      "logprob": -0.0032534070778638124
    },
    {
      "text": " ",
      "start": 29.539,
      "end": 29.619,
      "type": "spacing",
      "logprob": -0.02517187036573887
    },
    {
      "text": "cart.",
      "start": 29.619,
      "end": 29.899,
      "type": "word",
      "logprob": -0.034343180060386655
    },
    {
      "text": " ",
      "start": 29.899,
      "end": 30.299,
      "type": "spacing",
      "logprob": -0.000009179073458653875
    },
    {
      "text": "And",
      "start": 30.299,
      "end": 30.379,
      "type": "word",
      "logprob": -0.000009179073458653875
    },
    {
      "text": " ",
      "start": 30.379,
      "end": 30.439,
      "type": "spacing",
      "logprob": -0.0012041230220347643
    },
    {
      "text": "everybody",
      "start": 30.439,
      "end": 30.779,
      "type": "word",
      "logprob": -0.0012041230220347643
    },
    {
      "text": " ",
      "start": 30.779,
      "end": 30.819,
      "type": "spacing",
      "logprob": -0.000007271740287251305
    },
    {
      "text": "goes",
      "start": 30.819,
      "end": 30.979,
      "type": "word",
      "logprob": -0.000007271740287251305
    },
    {
      "text": " ",
      "start": 30.979,
      "end": 31.019,
      "type": "spacing",
      "logprob": -0.0000027418097943154862
    },
    {
      "text": "to",
      "start": 31.019,
      "end": 31.159,
      "type": "word",
      "logprob": -0.0000027418097943154862
    },
    {
      "text": " ",
      "start": 31.159,
      "end": 31.34,
      "type": "spacing",
      "logprob": -0.07115088403224945
    },
    {
      "text": "solitary",
      "start": 31.34,
      "end": 31.879,
      "type": "word",
      "logprob": -0.07115088403224945
    },
    {
      "text": " ",
      "start": 31.879,
      "end": 31.899,
      "type": "spacing",
      "logprob": -0.42897433042526245
    },
    {
      "text": "and",
      "start": 31.899,
      "end": 31.979,
      "type": "word",
      "logprob": -0.42897433042526245
    },
    {
      "text": " ",
      "start": 31.979,
      "end": 31.979,
      "type": "spacing",
      "logprob": -0.00025042734341695905
    },
    {
      "text": "then",
      "start": 31.979,
      "end": 32.059,
      "type": "word",
      "logprob": -0.00025042734341695905
    },
    {
      "text": " ",
      "start": 32.059,
      "end": 32.099,
      "type": "spacing",
      "logprob": -0.008647141046822071
    },
    {
      "text": "gets",
      "start": 32.099,
      "end": 32.259,
      "type": "word",
      "logprob": -0.008647141046822071
    },
    {
      "text": " ",
      "start": 32.259,
      "end": 32.319,
      "type": "spacing",
      "logprob": -0.00027509720530360937
    },
    {
      "text": "spread",
      "start": 32.319,
      "end": 32.619,
      "type": "word",
      "logprob": -0.00027509720530360937
    },
    {
      "text": " ",
      "start": 32.619,
      "end": 32.659,
      "type": "spacing",
      "logprob": -0.00006687417771900073
    },
    {
      "text": "out",
      "start": 32.659,
      "end": 32.759,
      "type": "word",
      "logprob": -0.00006687417771900073
    },
    {
      "text": " ",
      "start": 32.759,
      "end": 32.799,
      "type": "spacing",
      "logprob": -0.0003618539194576442
    },
    {
      "text": "all",
      "start": 32.799,
      "end": 32.899,
      "type": "word",
      "logprob": -0.0003618539194576442
    },
    {
      "text": " ",
      "start": 32.899,
      "end": 32.959,
      "type": "spacing",
      "logprob": -0.000040411134250462055
    },
    {
      "text": "over",
      "start": 32.959,
      "end": 33.059,
      "type": "word",
      "logprob": -0.000040411134250462055
    },
    {
      "text": " ",
      "start": 33.059,
      "end": 33.099,
      "type": "spacing",
      "logprob": -0.000048874615458771586
    },
    {
      "text": "the",
      "start": 33.099,
      "end": 33.18,
      "type": "word",
      "logprob": -0.000048874615458771586
    },
    {
      "text": " ",
      "start": 33.18,
      "end": 33.239,
      "type": "spacing",
      "logprob": -0.0004001055203843862
    },
    {
      "text": "country.",
      "start": 33.239,
      "end": 33.619,
      "type": "word",
      "logprob": -0.00035016683612099087
    },
    {
      "text": " ",
      "start": 33.619,
      "end": 34.119,
      "type": "spacing",
      "logprob": -0.00007819823804311454
    },
    {
      "text": "For",
      "start": 34.119,
      "end": 34.2,
      "type": "word",
      "logprob": -0.00007819823804311454
    },
    {
      "text": " ",
      "start": 34.2,
      "end": 34.239,
      "type": "spacing",
      "logprob": -0.000013112935448589269
    },
    {
      "text": "the",
      "start": 34.239,
      "end": 34.299,
      "type": "word",
      "logprob": -0.000013112935448589269
    },
    {
      "text": " ",
      "start": 34.299,
      "end": 34.36,
      "type": "spacing",
      "logprob": -0.000016689160474925302
    },
    {
      "text": "Latinos,",
      "start": 34.36,
      "end": 34.799,
      "type": "word",
      "logprob": -0.009880200837187658
    },
    {
      "text": " ",
      "start": 34.799,
      "end": 34.86,
      "type": "spacing",
      "logprob": -0.000025510462364763953
    },
    {
      "text": "it",
      "start": 34.86,
      "end": 34.919,
      "type": "word",
      "logprob": -0.000025510462364763953
    },
    {
      "text": " ",
      "start": 34.919,
      "end": 34.939,
      "type": "spacing",
      "logprob": -7.152555099310121e-7
    },
    {
      "text": "was",
      "start": 34.939,
      "end": 35.139,
      "type": "word",
      "logprob": -7.152555099310121e-7
    },
    {
      "text": " ",
      "start": 35.139,
      "end": 35.279,
      "type": "spacing",
      "logprob": -0.00040928093949332833
    },
    {
      "text": "far",
      "start": 35.279,
      "end": 35.459,
      "type": "word",
      "logprob": -0.00040928093949332833
    },
    {
      "text": " ",
      "start": 35.459,
      "end": 35.54,
      "type": "spacing",
      "logprob": -0.00003909988299710676
    },
    {
      "text": "more",
      "start": 35.54,
      "end": 35.7,
      "type": "word",
      "logprob": -0.00003909988299710676
    },
    {
      "text": " ",
      "start": 35.7,
      "end": 35.779,
      "type": "spacing",
      "logprob": -0.00001811964830267243
    },
    {
      "text": "complicated",
      "start": 35.779,
      "end": 36.839,
      "type": "word",
      "logprob": -0.00001811964830267243
    },
    {
      "text": " ",
      "start": 36.839,
      "end": 36.899,
      "type": "spacing",
      "logprob": -0.2519826889038086
    },
    {
      "text": "because",
      "start": 36.899,
      "end": 37.18,
      "type": "word",
      "logprob": -0.2519826889038086
    },
    {
      "text": " ",
      "start": 37.18,
      "end": 37.239,
      "type": "spacing",
      "logprob": -0.000005245195097813848
    },
    {
      "text": "it",
      "start": 37.239,
      "end": 37.319,
      "type": "word",
      "logprob": -0.000005245195097813848
    },
    {
      "text": " ",
      "start": 37.319,
      "end": 37.38,
      "type": "spacing",
      "logprob": -0.000013470558769768104
    },
    {
      "text": "was",
      "start": 37.38,
      "end": 37.819,
      "type": "word",
      "logprob": -0.000013470558769768104
    },
    {
      "text": " ",
      "start": 37.819,
      "end": 37.879,
      "type": "spacing",
      "logprob": -0.03291460871696472
    },
    {
      "text": "Borrachos,",
      "start": 37.879,
      "end": 38.659,
      "type": "word",
      "logprob": -0.005421107296251648
    },
    {
      "text": " ",
      "start": 38.659,
      "end": 38.779,
      "type": "spacing",
      "logprob": -0.15349291265010834
    },
    {
      "text": "Norteños,",
      "start": 38.779,
      "end": 39.779,
      "type": "word",
      "logprob": -0.08604785685616258
    },
    {
      "text": " ",
      "start": 39.779,
      "end": 39.899,
      "type": "spacing",
      "logprob": -0.007220009341835976
    },
    {
      "text": "uh,",
      "start": 39.899,
      "end": 40,
      "type": "word",
      "logprob": -0.004814015079849317
    },
    {
      "text": " ",
      "start": 40,
      "end": 40.18,
      "type": "spacing",
      "logprob": -0.000019907753085135482
    },
    {
      "text": "Latin",
      "start": 40.18,
      "end": 40.519,
      "type": "word",
      "logprob": -0.000019907753085135482
    },
    {
      "text": " ",
      "start": 40.519,
      "end": 40.579,
      "type": "spacing",
      "logprob": -0.00035363141796551645
    },
    {
      "text": "Kings,",
      "start": 40.579,
      "end": 41.04,
      "type": "word",
      "logprob": -0.0004911531335286176
    },
    {
      "text": " ",
      "start": 41.04,
      "end": 41.239,
      "type": "spacing",
      "logprob": -0.0019301610300317407
    },
    {
      "text": "MS-13,",
      "start": 41.239,
      "end": 42.84,
      "type": "word",
      "logprob": -0.0009404925483522675
    },
    {
      "text": " ",
      "start": 42.84,
      "end": 42.959,
      "type": "spacing",
      "logprob": -0.0008930747280828655
    },
    {
      "text": "um,",
      "start": 42.959,
      "end": 43.119,
      "type": "word",
      "logprob": -0.0005953831520552436
    },
    {
      "text": " ",
      "start": 43.119,
      "end": 43.119,
      "type": "spacing",
      "logprob": -1.2135415077209473
    },
    {
      "text": "Mexican",
      "start": 44.159,
      "end": 44.579,
      "type": "word",
      "logprob": -1.2135415077209473
    },
    {
      "text": " ",
      "start": 44.579,
      "end": 44.659,
      "type": "spacing",
      "logprob": -0.09329722076654434
    },
    {
      "text": "Mafia,",
      "start": 44.659,
      "end": 45.319,
      "type": "word",
      "logprob": -0.08586268002788226
    },
    {
      "text": " ",
      "start": 45.319,
      "end": 45.659,
      "type": "spacing",
      "logprob": -0.0001209901092806831
    },
    {
      "text": "and",
      "start": 45.659,
      "end": 45.799,
      "type": "word",
      "logprob": -0.0001209901092806831
    },
    {
      "text": " ",
      "start": 45.799,
      "end": 45.84,
      "type": "spacing",
      "logprob": -0.00001680836794548668
    },
    {
      "text": "then",
      "start": 45.84,
      "end": 46,
      "type": "word",
      "logprob": -0.00001680836794548668
    },
    {
      "text": " ",
      "start": 46,
      "end": 46.059,
      "type": "spacing",
      "logprob": -0.000031470757676288486
    },
    {
      "text": "the",
      "start": 46.059,
      "end": 46.139,
      "type": "word",
      "logprob": -0.000031470757676288486
    },
    {
      "text": " ",
      "start": 46.139,
      "end": 46.219,
      "type": "spacing",
      "logprob": -0.00006031808152329177
    },
    {
      "text": "individual",
      "start": 46.219,
      "end": 46.739,
      "type": "word",
      "logprob": -0.00006031808152329177
    },
    {
      "text": " ",
      "start": 46.739,
      "end": 46.819,
      "type": "spacing",
      "logprob": -0.0006822404102422297
    },
    {
      "text": "cartels.",
      "start": 46.819,
      "end": 47.659,
      "type": "word",
      "logprob": -0.0003447113358454601
    },
    {
      "text": " ",
      "start": 47.659,
      "end": 48.5,
      "type": "spacing",
      "logprob": -0.000005125986263010418
    },
    {
      "text": "So",
      "start": 48.5,
      "end": 48.939,
      "type": "word",
      "logprob": -0.000005125986263010418
    },
    {
      "text": " ",
      "start": 48.939,
      "end": 49.079,
      "type": "spacing",
      "logprob": -1.13690984249115
    },
    {
      "text": "overall,",
      "start": 49.079,
      "end": 49.52,
      "type": "word",
      "logprob": -0.9963598675094545
    },
    {
      "text": " ",
      "start": 49.52,
      "end": 49.579,
      "type": "spacing",
      "logprob": -0.000006079655122448457
    },
    {
      "text": "there's",
      "start": 49.579,
      "end": 49.899,
      "type": "word",
      "logprob": -0.00002007780358326272
    },
    {
      "text": " ",
      "start": 49.899,
      "end": 50.019,
      "type": "spacing",
      "logprob": -0.0000011920922133867862
    },
    {
      "text": "one",
      "start": 50.02,
      "end": 50.279,
      "type": "word",
      "logprob": -0.0000011920922133867862
    },
    {
      "text": " ",
      "start": 50.279,
      "end": 50.379,
      "type": "spacing",
      "logprob": -0.0003093002596870065
    },
    {
      "text": "gigantic",
      "start": 50.379,
      "end": 51.259,
      "type": "word",
      "logprob": -0.0003093002596870065
    },
    {
      "text": " ",
      "start": 51.259,
      "end": 51.419,
      "type": "spacing",
      "logprob": -0.00001823885577323381
    },
    {
      "text": "Hispanic",
      "start": 51.419,
      "end": 51.899,
      "type": "word",
      "logprob": -0.00001823885577323381
    },
    {
      "text": " ",
      "start": 51.899,
      "end": 51.959,
      "type": "spacing",
      "logprob": -0.00009953480184776708
    },
    {
      "text": "prison",
      "start": 51.959,
      "end": 52.279,
      "type": "word",
      "logprob": -0.00009953480184776708
    },
    {
      "text": " ",
      "start": 52.279,
      "end": 52.36,
      "type": "spacing",
      "logprob": -0.00003957670196541585
    },
    {
      "text": "gang",
      "start": 52.36,
      "end": 52.739,
      "type": "word",
      "logprob": -0.00003957670196541585
    },
    {
      "text": " ",
      "start": 52.739,
      "end": 52.799,
      "type": "spacing",
      "logprob": -0.0002101439022226259
    },
    {
      "text": "called",
      "start": 52.799,
      "end": 53.059,
      "type": "word",
      "logprob": -0.0002101439022226259
    },
    {
      "text": " ",
      "start": 53.059,
      "end": 53.139,
      "type": "spacing",
      "logprob": -0.019555628299713135
    },
    {
      "text": "Pisces,",
      "start": 53.139,
      "end": 53.759,
      "type": "word",
      "logprob": -0.031404585955897346
    },
    {
      "text": " ",
      "start": 53.759,
      "end": 54.399,
      "type": "spacing",
      "logprob": -0.000003576272320060525
    },
    {
      "text": "and",
      "start": 54.399,
      "end": 54.479,
      "type": "word",
      "logprob": -0.000003576272320060525
    },
    {
      "text": " ",
      "start": 54.479,
      "end": 54.5,
      "type": "spacing",
      "logprob": -0.00009047575440490618
    },
    {
      "text": "then",
      "start": 54.5,
      "end": 54.579,
      "type": "word",
      "logprob": -0.00009047575440490618
    },
    {
      "text": " ",
      "start": 54.579,
      "end": 54.659,
      "type": "spacing",
      "logprob": -0.00004911301948595792
    },
    {
      "text": "within",
      "start": 54.659,
      "end": 54.899,
      "type": "word",
      "logprob": -0.00004911301948595792
    },
    {
      "text": " ",
      "start": 54.899,
      "end": 55.039,
      "type": "spacing",
      "logprob": -0.00008153582894010469
    },
    {
      "text": "Pisces",
      "start": 55.039,
      "end": 55.5,
      "type": "word",
      "logprob": -0.00006985413529037032
    },
    {
      "text": " ",
      "start": 55.5,
      "end": 55.579,
      "type": "spacing",
      "logprob": -0.0008394769974984229
    },
    {
      "text": "are",
      "start": 55.579,
      "end": 55.719,
      "type": "word",
      "logprob": -0.0008394769974984229
    },
    {
      "text": " ",
      "start": 55.719,
      "end": 55.799,
      "type": "spacing",
      "logprob": -0.00008356221951544285
    },
    {
      "text": "all",
      "start": 55.799,
      "end": 55.879,
      "type": "word",
      "logprob": -0.00008356221951544285
    },
    {
      "text": " ",
      "start": 55.879,
      "end": 55.919,
      "type": "spacing",
      "logprob": -0.006439649034291506
    },
    {
      "text": "the-",
      "start": 55.919,
      "end": 55.979,
      "type": "word",
      "logprob": -0.027742173871956766
    }
  ],
  "transcription_id": "5OokD5L1UyXzbEQq7WzJ",
  "audio_duration_secs": 56
};

// ─── ElevenLabs transcription ─────────────────────────────────────────────────
async function transcribeWithElevenLabs(audioUrl) {
  const USE_MOCK = true;

  if (USE_MOCK) {
    const words = MOCK_ELEVENLABS_RESPONSE.words
      .filter(w => w.type === "word")
      .map(w => ({ text: w.text, start: w.start, end: w.end }));
    return { subtitles: wordsToSubtitleString(MOCK_ELEVENLABS_RESPONSE.words), words };
  }

  // 1. Fetch audio from S3
  const audioResponse = await fetch(audioUrl);
  if (!audioResponse.ok) {
    throw new Error(`Failed to fetch audio from S3: ${audioResponse.statusText}`);
  }
  const audioBuffer = await audioResponse.arrayBuffer();

  // 2. Send to ElevenLabs Speech-to-Text
  const audioBlob = new Blob([audioBuffer], { type: "audio/flac" });

  const data = await elevenlabs.speechToText.convert({
    file: audioBlob,
    model_id: "scribe_v1",
    timestamps_granularity: "word"
  });

  const words = data.words
    .filter(w => w.type === "word")
    .map(w => ({ text: w.text, start: w.start, end: w.end }));

  return {
    subtitles: wordsToSubtitleString(data.words),
    words,
  };
}

// ─── Convert word-level data → subtitle string ────────────────────────────────
function wordsToSubtitleString(words) {
  const onlyWords = words.filter((w) => w.type === "word");
  const lines = [];
  let group = [];

  for (let i = 0; i < onlyWords.length; i++) {
    const word = onlyWords[i];
    const nextWord = onlyWords[i + 1];

    group.push(word);

    const gapToNext = nextWord ? nextWord.start - word.end : 999;
    const isNaturalPause = gapToNext > 0.4;
    const isMaxLength = group.length >= 5;
    const isLast = !nextWord;

    if (isMaxLength || isNaturalPause || isLast) {
      const startTimestamp = secondsToTimestamp(group[0].start);
      const text = group
        .map((w, idx) =>
          idx < group.length - 1
            ? w.text.replace(/[,،]$/, "")
            : w.text
        )
        .join(" ")
        .trim();

      if (text) lines.push(`${startTimestamp} ${text}`);
      group = [];
    }
  }

  return lines.join("\n");
}

// ─── Format seconds → [HH:MM:SS.mmm] ────────────────────────────────────────
function secondsToTimestamp(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `[${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms, 3)}]`;
}

function pad(n, length = 2) {
  return String(n).padStart(length, "0");
}
