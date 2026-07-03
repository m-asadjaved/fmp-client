"use client";

import React, { use } from "react";

export default function AIClipsPage({ params }) {
    const { videoId } = use(params);

    // ─── Render ───────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-neutral-950 text-white p-6 md:p-12 relative overflow-hidden">
            <div className="flex flex-col gap-6 max-w-2xl mx-auto">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">
                        Review Your Video
                    </h1>
                    <p className="text-xs text-neutral-400 font-mono">
                        Asset Ref:{" "}
                        <span className="text-neutral-300">{videoId}</span>
                    </p>
                </div>

                {/* Video player card - Changed to w-fit and mx-auto so it wraps the vertical video tightly */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden w-fit mx-auto">
                    {/* Thumbnail / video container */}
                    <div
                        className="relative bg-black aspect-[9/16] h-[80vh] max-h-[550px] min-h-[400px] mx-auto"
                    >
                        <video
                            className="w-full h-full object-cover"
                            controls
                            preload="metadata"
                            poster={`/api/thumbnail/${videoId}`}
                        >
                            <source
                                src={`/api/video/output/${videoId}`}
                                type="video/mp4"
                            />
                            Your browser does not support the video tag.
                        </video>
                    </div>

                    {/* Video meta + action */}
                    <div className="p-5 border-t border-neutral-800 bg-neutral-900">
                        <div className="flex items-start justify-between gap-12 mb-2">
                            <div>
                                <h2 className="text-sm font-semibold text-white">
                                    Source Video
                                </h2>
                                <p className="text-xs text-neutral-500 mt-0.5">
                                    Your video is ready<br />
                                    Scene detection · 9:16 reframe
                                </p>
                            </div>
                            <span className="shrink-0 text-[10px] bg-neutral-950 border border-neutral-800 px-2.5 py-1 rounded-md text-lime-400 font-mono">
                                READY
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}