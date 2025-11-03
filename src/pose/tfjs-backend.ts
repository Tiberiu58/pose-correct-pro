import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import { initTf } from '@/lib/tf-init';
import { PoseBackend, Pose, ModelType } from './PoseBackend';

export interface TfjsBackendOptions {
  modelType?: ModelType;
  flipHorizontal?: boolean;
}

export class TfjsPoseBackend implements PoseBackend {
  name: 'tfjs' = 'tfjs';
  private detector: poseDetection.PoseDetector | null = null;
  private options: TfjsBackendOptions;
  private lastEstimateTime = 0;
  private readonly TARGET_FPS = 20;
  private readonly FRAME_INTERVAL = 1000 / this.TARGET_FPS;

  constructor(options: TfjsBackendOptions = {}) {
    this.options = {
      modelType: 'lightning',
      flipHorizontal: false,
      ...options,
    };
  }

  async init(): Promise<void> {
    await initTf();
    
    const modelType = this.options.modelType || 'lightning';
    
    if (modelType === 'blazepose-lite') {
      this.detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.BlazePose,
        {
          runtime: 'tfjs',
          modelType: 'lite',
        }
      );
    } else {
      this.detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        {
          modelType: modelType === 'thunder' 
            ? poseDetection.movenet.modelType.SINGLEPOSE_THUNDER 
            : poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        }
      );
    }
  }

  async estimate(video: HTMLVideoElement | HTMLCanvasElement): Promise<Pose[]> {
    if (!this.detector) return [];

    // Throttle to target FPS
    const now = Date.now();
    if (now - this.lastEstimateTime < this.FRAME_INTERVAL) {
      return [];
    }
    this.lastEstimateTime = now;

    try {
      tf.engine().startScope();
      const poses = await this.detector.estimatePoses(video, {
        flipHorizontal: this.options.flipHorizontal,
      });
      tf.engine().endScope();

      return poses.map(pose => ({
        keypoints: pose.keypoints.map(kp => ({
          x: kp.x,
          y: kp.y,
          score: kp.score,
          name: kp.name,
        })),
        score: pose.score,
      }));
    } catch (error) {
      tf.engine().endScope();
      throw error;
    }
  }

  async dispose(): Promise<void> {
    if (this.detector) {
      // @ts-ignore - dispose may not exist on all detector types
      this.detector.dispose?.();
      this.detector = null;
    }
  }

  setFlipHorizontal(flip: boolean): void {
    this.options.flipHorizontal = flip;
  }

  async setModelType(modelType: ModelType): Promise<void> {
    await this.dispose();
    this.options.modelType = modelType;
    await this.init();
  }
}
