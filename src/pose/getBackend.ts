import { PoseBackend, ModelType } from './PoseBackend';
import { TfjsPoseBackend } from './tfjs-backend';
import { MlkitPoseBackend } from './mlkit-backend';

export function getBackend(modelType?: ModelType): PoseBackend {
  // Check for environment variable override
  const envBackend = import.meta.env.VITE_POSE_BACKEND;
  
  // Check if running in native environment
  const isNative = !!(
    // @ts-ignore - Check for React Native WebView
    window.ReactNativeWebView ||
    // Check for Capacitor
    (window as any).Capacitor?.isNative
  );

  // Use ML Kit on native if available and not overridden
  if (envBackend === 'mlkit' || (isNative && envBackend !== 'tfjs')) {
    try {
      return new MlkitPoseBackend();
    } catch (error) {
      console.warn('ML Kit not available, falling back to TensorFlow.js:', error);
    }
  }

  // Default to TensorFlow.js
  return new TfjsPoseBackend({ modelType });
}
