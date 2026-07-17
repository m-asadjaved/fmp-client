import React from "react";
import { AbsoluteFill, OffthreadVideo, Video, Sequence, Audio, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export const VideoComposition = ({
  videoUrl,
  captions = [],
  words = [],
  overlays = [],
  brolls = [],
  bgMusicSrc = "",
  bgMusicVolume = 20,
  hook = null,
  theme = null,
  fontSize = 64,
  fontColor = "#ffffff",
  fontFamily = "Inter, sans-serif",
  activeWordColor = "#a3e635",
  verticalPosition = 85, // percentage from top (85 is near bottom)
  splitTemplate = null,
  splitPosition = "bottom",
  splitScale = 1,
  splitX = 0,
  splitY = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // If there's a hook meme video, the main video timeline is shifted.
  const hookDurationFrames = (hook && hook.memeSrc) ? Math.round(hook.durationSecs * fps) : 0;
  const isMainVideoActive = frame >= hookDurationFrames;
  
  // Calculate currentTimeMs relative to the main video start
  const mainVideoFrame = frame - hookDurationFrames;
  const currentTimeMs = (mainVideoFrame / fps) * 1000;

  // Find active caption
  const activeLine = captions.find(
    (c) => currentTimeMs >= c.startMs && currentTimeMs < c.endMs
  );

  // Find active overlays
  const activeOverlays = overlays.filter(
    (o) => currentTimeMs >= o.startMs && currentTimeMs < o.endMs
  );

  // Filter words that belong to the active caption
  const lineWords = activeLine
    ? words.filter(
        (w) =>
          w.start * 1000 >= activeLine.startMs - 50 &&
          w.start * 1000 < activeLine.endMs
      )
    : [];

  const activeTheme = theme || {
    fontColor: fontColor || "#ffffff",
    activeWordColor: activeWordColor || "#a3e635",
    textShadow: `
      2px 2px 4px rgba(0,0,0,0.9), -2px -2px 4px rgba(0,0,0,0.9),
      2px -2px 4px rgba(0,0,0,0.9), -2px 2px 4px rgba(0,0,0,0.9),
      0px 4px 12px rgba(0,0,0,1)
    `,
    textTransform: "none",
    fontWeight: "bold",
  };

  const renderCaptionWords = () => {
    if (!activeLine) return null;
    
    if (lineWords.length > 0) {
      // Use the edited text as the source of truth, but keep timings from lineWords
      const editedWords = activeLine.text.trim().split(/\s+/);
      
      return editedWords.map((wordStr, i) => {
        // Map to the timing of the i-th word, or fallback to the last known word timing
        const timingWord = lineWords[i] || lineWords[lineWords.length - 1];
        
        // The active window for this word ends when the next word starts, or at the end of the caption
        const nextStartMs = i < editedWords.length - 1
          ? (lineWords[i + 1] ? lineWords[i + 1].start * 1000 : activeLine.endMs)
          : activeLine.endMs;
          
        const isActive = timingWord && (currentTimeMs >= timingWord.start * 1000 && currentTimeMs < nextStartMs);
        
        const wordStartFrame = timingWord ? Math.round((timingWord.start * 1000) / (1000 / fps)) : 0;
        let transform = "none";
        let opacity = 1;

        if (timingWord && frame >= wordStartFrame) {
          const frameRelative = frame - wordStartFrame;
          const animType = activeTheme.animation || "pop"; // default animation
          
          if (animType === "pop") {
            const scale = spring({
              fps,
              frame: frameRelative,
              config: { damping: 12, stiffness: 200, mass: 0.5 },
            });
            const mappedScale = interpolate(scale, [0, 1], [0.8, 1]);
            transform = `scale(${isActive ? mappedScale * 1.15 : mappedScale})`;
          } else if (animType === "slide") {
            const translateY = interpolate(frameRelative, [0, 8], [20, 0], { extrapolateRight: "clamp" });
            const opacityInterp = interpolate(frameRelative, [0, 8], [0, 1], { extrapolateRight: "clamp" });
            transform = `translateY(${translateY}px) scale(${isActive ? 1.1 : 1})`;
            opacity = opacityInterp;
          } else if (animType === "fade") {
            const opacityInterp = interpolate(frameRelative, [0, 10], [0, 1], { extrapolateRight: "clamp" });
            opacity = opacityInterp;
            transform = `scale(${isActive ? 1.1 : 1})`;
          } else {
            transform = `scale(${isActive ? 1.1 : 1})`; 
          }
        }
        
        return (
          <React.Fragment key={i}>
            <span 
              style={{ 
                color: isActive ? activeTheme.activeWordColor : activeTheme.fontColor,
                display: "inline-block",
                transform,
                opacity,
                transformOrigin: "center center",
                willChange: "transform, opacity",
              }}
            >
              {wordStr}
            </span>
            {i < editedWords.length - 1 ? " " : ""}
          </React.Fragment>
        );
      });
    }
    
    // Fallback if no word timings exist
    return <span style={{ color: activeTheme.fontColor }}>{activeLine.text}</span>;
  };

  return (
    <AbsoluteFill>
      {/* Hook Meme Video */}
      {hook && hook.memeSrc && frame < hookDurationFrames && (
        <Video 
          pauseWhenBuffering
          src={hook.memeSrc} 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
      )}

      {/* Main Video & Audio (Shifted) */}
      <Sequence from={hookDurationFrames}>
        {bgMusicSrc && (
          <Audio src={bgMusicSrc} volume={bgMusicVolume / 100} pauseWhenBuffering />
        )}

        {splitTemplate ? (
          <>
            <Video 
              pauseWhenBuffering
              src={videoUrl} 
              style={{ width: '100%', height: '50%', objectFit: 'cover', position: 'absolute', top: splitPosition === "bottom" ? 0 : "50%" }} 
            />
            <div style={{ width: '100%', height: '50%', position: 'absolute', top: splitPosition === "top" ? 0 : "50%", overflow: 'hidden', background: '#000' }}>
              <Video 
                pauseWhenBuffering
                src={splitTemplate.url} 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain', 
                  transform: `scale(${splitScale}) translate(${splitX}%, ${splitY}%)` 
                }} 
                muted
                loop
              />
            </div>
          </>
        ) : (
          videoUrl && (
            <Video 
              pauseWhenBuffering
              src={videoUrl} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          )
        )}
      </Sequence>

      {/* B-Rolls (Shifted by Sequence) */}
      {brolls.map((broll, idx) => {
        // Adjust fromFrame by adding hookDurationFrames
        const fromFrame = hookDurationFrames + Math.floor((broll.startMs / 1000) * fps);
        const durationInFrames = Math.max(1, Math.floor(((broll.endMs - broll.startMs) / 1000) * fps));
        return (
          <Sequence key={`broll-${idx}`} from={fromFrame} durationInFrames={durationInFrames}>
            <AbsoluteFill>
              <Video 
                pauseWhenBuffering
                src={broll.url} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                muted
              />
            </AbsoluteFill>
          </Sequence>
        );
      })}

      {/* Captions Overlay */}
      <AbsoluteFill style={{ alignItems: "center" }}>
        {activeLine && mainVideoFrame >= 0 && (
          <div
            style={{
              position: "absolute",
              top: `${verticalPosition}%`,
              transform: "translateY(-50%)",
              fontSize: `${fontSize}px`,
              fontFamily,
              fontWeight: activeTheme.fontWeight,
              textTransform: activeTheme.textTransform,
              textAlign: "center",
              width: "100%",
              maxWidth: "85%",
              textShadow: activeTheme.textShadow,
            }}
          >
            {renderCaptionWords()}
          </div>
        )}
      </AbsoluteFill>

      {/* Custom Text Overlays */}
      {activeOverlays.map((overlay) => (
        <AbsoluteFill key={overlay.id} style={{ alignItems: "center" }}>
          <div
            style={{
              position: "absolute",
              top: `${overlay.verticalPosition}%`,
              transform: "translateY(-50%)",
              fontSize: `${overlay.fontSize}px`,
              fontFamily,
              fontWeight: "bold",
              textAlign: "center",
              width: "100%",
              maxWidth: "85%",
              color: overlay.color,
              textShadow: `
                2px 2px 4px rgba(0,0,0,0.9), -2px -2px 4px rgba(0,0,0,0.9),
                2px -2px 4px rgba(0,0,0,0.9), -2px 2px 4px rgba(0,0,0,0.9),
                0px 4px 12px rgba(0,0,0,1)
              `,
            }}
          >
            {overlay.text}
          </div>
        </AbsoluteFill>
      ))}

      {/* Hook Text Overlay */}
      {hook && frame < (hook.durationSecs * fps) && (
        <AbsoluteFill style={{ alignItems: "center" }}>
          <div
            style={{
              position: "absolute",
              top: `${hook.verticalPosition}%`,
              transform: "translateY(-50%)",
              fontSize: `${hook.fontSize}px`,
              fontFamily,
              fontWeight: "900",
              textTransform: "uppercase",
              textAlign: "center",
              width: "100%",
              maxWidth: "90%",
              color: hook.fontColor,
              textShadow: `
                -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000, 3px 3px 0 #000, 0px 4px 15px rgba(0,0,0,1)
              `,
              zIndex: 50,
            }}
          >
            {hook.text}
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
