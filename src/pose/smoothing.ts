import { Keypoint, Pose } from './PoseBackend';

export class KeypointSmoother {
  private previousKeypoints: Map<string, Keypoint> = new Map();
  private alpha: number;

  constructor(alpha = 0.5) {
    this.alpha = alpha;
  }

  setAlpha(alpha: number): void {
    this.alpha = Math.max(0.1, Math.min(1.0, alpha));
  }

  smooth(poses: Pose[]): Pose[] {
    if (poses.length === 0) return poses;

    return poses.map(pose => {
      const smoothedKeypoints = pose.keypoints.map(kp => {
        const key = kp.name || `${kp.x}_${kp.y}`;
        const prev = this.previousKeypoints.get(key);

        let smoothed: Keypoint;
        if (prev && kp.score && kp.score > 0.3) {
          // Apply Exponential Moving Average (EMA)
          smoothed = {
            x: this.alpha * kp.x + (1 - this.alpha) * prev.x,
            y: this.alpha * kp.y + (1 - this.alpha) * prev.y,
            score: kp.score,
            name: kp.name,
          };
        } else {
          smoothed = { ...kp };
        }

        this.previousKeypoints.set(key, smoothed);
        return smoothed;
      });

      return {
        ...pose,
        keypoints: smoothedKeypoints,
      };
    });
  }

  reset(): void {
    this.previousKeypoints.clear();
  }
}
