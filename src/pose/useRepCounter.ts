import { Pose, Keypoint } from './PoseBackend';

type ExerciseType = 'squat' | 'pushup' | 'bicep_curl';

interface RepState {
  count: number;
  angle: number;
  state: 'up' | 'down' | 'idle';
  lastRepTime: number;
}

function angleBetween(a: Keypoint, b: Keypoint, c: Keypoint): number {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const magAB = Math.hypot(ab.x, ab.y);
  const magCB = Math.hypot(cb.x, cb.y);
  const cosine = dot / (magAB * magCB);
  return Math.acos(Math.max(-1, Math.min(1, cosine))) * (180 / Math.PI);
}

export class RepCounter {
  private exerciseType: ExerciseType;
  private state: RepState;
  private readonly DEBOUNCE_MS = 300;
  private readonly MIN_CONFIDENCE = 0.5;
  private angleHistory: number[] = [];
  private readonly SMOOTHING_WINDOW = 3;

  constructor(exerciseType: ExerciseType = 'squat') {
    this.exerciseType = exerciseType;
    this.state = {
      count: 0,
      angle: 0,
      state: 'idle',
      lastRepTime: Date.now(),
    };
  }

  private smoothAngle(angle: number): number {
    this.angleHistory.push(angle);
    if (this.angleHistory.length > this.SMOOTHING_WINDOW) {
      this.angleHistory.shift();
    }
    return this.angleHistory.reduce((a, b) => a + b, 0) / this.angleHistory.length;
  }

  private getKeypoint(pose: Pose, name: string): Keypoint | null {
    const kp = pose.keypoints.find((k) => k.name === name);
    if (!kp || (kp.score ?? 0) < this.MIN_CONFIDENCE) return null;
    return kp;
  }

  private computeSquatAngle(pose: Pose): number | null {
    const leftHip = this.getKeypoint(pose, 'left_hip');
    const leftKnee = this.getKeypoint(pose, 'left_knee');
    const leftAnkle = this.getKeypoint(pose, 'left_ankle');
    const rightHip = this.getKeypoint(pose, 'right_hip');
    const rightKnee = this.getKeypoint(pose, 'right_knee');
    const rightAnkle = this.getKeypoint(pose, 'right_ankle');

    if (!leftHip || !leftKnee || !leftAnkle || !rightHip || !rightKnee || !rightAnkle) {
      return null;
    }

    const leftKneeAngle = angleBetween(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = angleBetween(rightHip, rightKnee, rightAnkle);
    
    return (leftKneeAngle + rightKneeAngle) / 2;
  }

  update(poses: Pose[]): RepState {
    if (poses.length === 0) {
      return this.state;
    }

    const pose = poses[0];
    let angle: number | null = null;

    if (this.exerciseType === 'squat') {
      angle = this.computeSquatAngle(pose);
    }

    if (angle === null) {
      return this.state;
    }

    const smoothedAngle = this.smoothAngle(angle);
    this.state.angle = Math.round(smoothedAngle);

    const now = Date.now();
    const timeSinceLastRep = now - this.state.lastRepTime;

    // Squat rep detection: down < 90°, up > 160°
    if (this.exerciseType === 'squat') {
      if (smoothedAngle < 90 && this.state.state !== 'down') {
        this.state.state = 'down';
      } else if (
        smoothedAngle > 160 &&
        this.state.state === 'down' &&
        timeSinceLastRep > this.DEBOUNCE_MS
      ) {
        this.state.count++;
        this.state.state = 'up';
        this.state.lastRepTime = now;
      }
    }

    return this.state;
  }

  reset(): void {
    this.state = {
      count: 0,
      angle: 0,
      state: 'idle',
      lastRepTime: Date.now(),
    };
    this.angleHistory = [];
  }

  getState(): RepState {
    return this.state;
  }

  setExercise(exerciseType: ExerciseType): void {
    this.exerciseType = exerciseType;
    this.reset();
  }

  getExerciseName(): string {
    return this.exerciseType.charAt(0).toUpperCase() + this.exerciseType.slice(1).replace('_', ' ');
  }
}
