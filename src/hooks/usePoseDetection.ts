import { useEffect, useRef, useState } from 'react';
import * as poseDetection from '@tensorflow-models/pose-detection';
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
        
        // Create detector with MoveNet model (fast and accurate)
        const detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          }
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
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!videoElement || !detectorRef.current || isModelLoading) return;

    let isDetecting = true;

    const detectPoses = async () => {
      if (!isDetecting || !detectorRef.current || !videoElement) return;

      try {
        if (videoElement.readyState === 4) {
          const poses = await detectorRef.current.estimatePoses(videoElement);
          if (isDetecting) {
            setPoses(poses);
          }
        }
      } catch (error) {
        console.error('Error detecting poses:', error);
      }

      if (isDetecting) {
        animationRef.current = requestAnimationFrame(detectPoses);
      }
    };

    detectPoses();

    return () => {
      isDetecting = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [videoElement, isModelLoading]);

  return { poses, isModelLoading };
};
