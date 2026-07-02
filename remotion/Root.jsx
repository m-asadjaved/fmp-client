import { Composition } from "remotion";
import { VideoComposition } from "../app/components/VideoComposition";

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="CaptionComposition"
        component={VideoComposition}
        width={1080}
        height={1920}
        calculateMetadata={({ props }) => {
          return {
            durationInFrames: props.durationInFrames || 450,
            fps: props.fps || 30,
            props
          };
        }}
        defaultProps={{
          videoUrl: "",
          captions: [],
          durationInFrames: 450,
          fps: 30
        }}
      />
    </>
  );
};
