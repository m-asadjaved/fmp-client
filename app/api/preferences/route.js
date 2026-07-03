import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// ─── GET: Fetch user editor preferences ───────────────────────────────────────
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("editor_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ preferences: data || null });
  } catch (error) {
    console.error("[GET /api/preferences]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── POST: Save (upsert) user editor preferences ──────────────────────────────
export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Whitelist only the fields we want to store
    const {
      activeTheme,
      animationOverride,
      fontSize,
      verticalPosition,
      bgMusicVolume,
      hookEnabled,
      hookText,
      hookDurationSecs,
      hookFontSize,
      hookFontColor,
      hookVerticalPosition,
    } = body;

    const preferencePayload = {
      user_id: userId,
      active_theme: activeTheme ?? "classic",
      animation_override: animationOverride ?? "theme",
      font_size: fontSize ?? 56,
      vertical_position: verticalPosition ?? 80,
      bg_music_volume: bgMusicVolume ?? 20,
      hook_enabled: hookEnabled ?? false,
      hook_text: hookText ?? "WAIT FOR IT...",
      hook_duration_secs: hookDurationSecs ?? 3,
      hook_font_size: hookFontSize ?? 72,
      hook_font_color: hookFontColor ?? "#fbbf24",
      hook_vertical_position: hookVerticalPosition ?? 20,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("editor_preferences")
      .upsert(preferencePayload, { onConflict: "user_id" })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, preferences: data });
  } catch (error) {
    console.error("[POST /api/preferences]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
