import { PoseBackend, Pose } from './PoseBackend';

// Stub for web - ML Kit is only available on native platforms
export class MlkitPoseBackend implements PoseBackend {
  name: 'mlkit' = 'mlkit';

  async init(): Promise<void> {
    throw new Error('ML Kit is not available on web. Use TensorFlow.js backend instead.');
  }

  async estimate(_video: HTMLVideoElement | HTMLCanvasElement): Promise<Pose[]> {
    throw new Error('ML Kit is not available on web. Use TensorFlow.js backend instead.');
  }

  async dispose(): Promise<void> {
    // No-op for web stub
  }
}

// TODO: For native implementation, use React Native Vision Camera + ML Kit plugin
// This would be implemented in a separate .native.ts file with actual native bridge code
