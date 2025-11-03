import { Keypoint, Pose } from './PoseBackend';

interface KeypointHistory {
  keypoint: Keypoint;
  timestamp: number;
  stabilityCount: number;
}

export class KeypointSmoother {
  private previousKeypoints: Map<string, KeypointHistory> = new Map();
  private alpha: number;
  private readonly MIN_CONFIDENCE = 0.25;
  private readonly RENDER_CONFIDENCE = 0.35;
  private readonly STABILITY_THRESHOLD = 3;
  private readonly MAX_POSITION_JUMP = 100; // pixels

  constructor(alpha = 0.3) {
    this.alpha = alpha;
  }

  setAlpha(alpha: number): void {
    this.alpha = Math.max(0.1, Math.min(1.0, alpha));
  }

  private isValidJump(current: Keypoint, previous: Keypoint): boolean {
    const distance = Math.hypot(current.x - previous.x, current.y - previous.y);
    return distance < this.MAX_POSITION_JUMP;
  }

  smooth(poses: Pose[]): Pose[] {
    if (poses.length === 0) return poses;

    const now = Date.now();

    return poses.map(pose => {
      const smoothedKeypoints = pose.keypoints.map(kp => {
        const key = kp.name || `${kp.x}_${kp.y}`;
        const history = this.previousKeypoints.get(key);
        const confidence = kp.score ?? 0;

        // Reject very low confidence detections
        if (confidence < this.MIN_CONFIDENCE) {
          // Return previous if available, otherwise skip
          if (history && history.keypoint.score && history.keypoint.score >= this.RENDER_CONFIDENCE) {
            return {
              ...history.keypoint,
              score: Math.max(0, (history.keypoint.score ?? 0) * 0.9), // decay confidence
            };
          }
          return { ...kp, score: 0 }; // mark as invalid
        }

        let smoothed: Keypoint;
        let stabilityCount = 1;

        if (history) {
          const prev = history.keypoint;
          
          // Check for unrealistic jumps (teleportation)
          if (!this.isValidJump(kp, prev)) {
            // Ignore this detection, use previous
            return {
              ...prev,
              score: Math.max(0, (prev.score ?? 0) * 0.95),
            };
          }

          // Apply stronger smoothing based on confidence
          const adaptiveAlpha = confidence > 0.7 ? this.alpha : this.alpha * 0.7;
          
          smoothed = {
            x: adaptiveAlpha * kp.x + (1 - adaptiveAlpha) * prev.x,
            y: adaptiveAlpha * kp.y + (1 - adaptiveAlpha) * prev.y,
            score: 0.8 * confidence + 0.2 * (prev.score ?? confidence), // smooth confidence too
            name: kp.name,
          };

          // Increase stability count if consistently detected
          stabilityCount = Math.min(history.stabilityCount + 1, this.STABILITY_THRESHOLD + 5);
        } else {
          // First detection - require stability before showing
          smoothed = { ...kp };
          stabilityCount = 1;
        }

        this.previousKeypoints.set(key, {
          keypoint: smoothed,
          timestamp: now,
          stabilityCount,
        });

        // Only return keypoints that are stable and confident enough
        if (stabilityCount >= this.STABILITY_THRESHOLD && (smoothed.score ?? 0) >= this.RENDER_CONFIDENCE) {
          return smoothed;
        }

        // Not stable yet - return with low score to filter out in rendering
        return { ...smoothed, score: 0 };
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
