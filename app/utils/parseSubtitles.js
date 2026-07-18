export function parseSubtitleString(input) {
  // Regex updated to include optional milliseconds block: (?:\.(\d{3}))?
  // Also updated the lookahead pattern to match the same structure
  const regex = /\[(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?\]\s*(.*?)(?=\[\d{2}:\d{2}:\d{2}(?:\.\d{3})?\]|$)/gs;
  const matches = [...input.matchAll(regex)];

  return matches
    .map((match, index) => {
      const hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const seconds = parseInt(match[3]);
      const ms = match[4] ? parseInt(match[4]) : 0; // Default to 0 if milliseconds are missing
      const text = match[5].trim();

      if (!text) return null;

      let startMs = (hours * 3600 + minutes * 60 + seconds) * 1000 + ms;
      const originalStartMs = startMs;

      // Force the first caption to start from 0 so there's no initial gap
      if (index === 0) {
        startMs = 0;
      }

      // endMs = next caption's original startMs, or originalStartMs + 5s for the last one
      const nextMatch = matches[index + 1];
      let endMs;
      if (nextMatch) {
        const nh = parseInt(nextMatch[1]);
        const nm = parseInt(nextMatch[2]);
        const ns = parseInt(nextMatch[3]);
        const nms = nextMatch[4] ? parseInt(nextMatch[4]) : 0;
        endMs = (nh * 3600 + nm * 60 + ns) * 1000 + nms;
      } else {
        endMs = originalStartMs + 5000;
      }

      return {
        id: index + 1,
        text: text + " ",
        startMs,
        endMs,
        timestampMs: originalStartMs, // Keep the original timestamp for UI reference
      };
    })
    .filter((c) => c !== null);
}
