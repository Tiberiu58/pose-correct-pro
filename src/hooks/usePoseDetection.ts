import { useEffect, useRef, useState } from 'react';
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';

export interface Keypoint {
  x: number;
  y: number;
  score?: number;
  name?: string;
}

export interface Pose {
  keypoints: Keypoint[];
  score?: number;
}

export const usePoseDetection = (videoElement: HTMLVideoElement | null) => {
  const [poses, setPoses] = useState<Pose[]>([]);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const detectorRef = useRef<poseDetection.PoseDetector | null>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    let isMounted = true;

    const initDetector = async () => {
      try {
        setIsModelLoading(true);
        // Force TFJS to use WebGL backend only
        await tf.setBackend('webgl');
        await tf.ready();
        // Create detector with MoveNet Lightning (lightweight)
        const detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
        );
        if (isMounted) {
          detectorRef.current = detector;
          setIsModelLoading(false);
        }
      } catch (error) {
        console.error('Error loading pose detection model:', error);
        if (isMounted) {
          setIsModelLoading(false);
        }
      }
    };

    initDetector();

    return () => {
      isMounted = false;
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
      // Dispose detector to free GPU/GL resources
      // @ts-ignore - dispose may not exist on all detector types
      detectorRef.current?.dispose?.();
    };
  }, []);

  useEffect(() => {
    if (!videoElement || !detectorRef.current || isModelLoading) return;

    let isDetecting = true;
    const TARGET_FPS = 12;
    const FRAME_INTERVAL = Math.max(1, Math.floor(1000 / TARGET_FPS));

    const detectPoses = async () => {
      if (!isDetecting || !detectorRef.current || !videoElement) return;
      try {
        if (videoElement.readyState === 4) {
          tf.engine().startScope();
          const result = await detectorRef.current.estimatePoses(videoElement);
          if (isDetecting) setPoses(result);
          tf.engine().endScope();
        }
      } catch (error) {
        console.error('Error detecting poses:', error);
      }
      if (isDetecting) {
        animationRef.current = window.setTimeout(detectPoses, FRAME_INTERVAL);
      }
    };

    detectPoses();

    return () => {
      isDetecting = false;
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [videoElement, isModelLoading]);

  return { poses, isModelLoading };
};
