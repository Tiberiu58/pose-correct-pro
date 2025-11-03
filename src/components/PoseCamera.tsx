import { useEffect, useRef, useState } from 'react';
import { PoseBackend, Pose, ModelType } from '@/pose/PoseBackend';
import { getBackend } from '@/pose/getBackend';
import { KeypointSmoother } from '@/pose/smoothing';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff } from 'lucide-react';

const SKELETON_CONNECTIONS = [
  ['left_shoulder', 'right_shoulder'],
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],
  ['left_hip', 'left_knee'],
  ['left_knee', 'left_ankle'],
  ['right_hip', 'right_knee'],
  ['right_knee', 'right_ankle'],
];

interface PoseCameraProps {
  onPoseDetected?: (poses: Pose[]) => void;
  className?: string;
  smoothing?: number;
  modelType?: ModelType;
}

export const PoseCamera = ({ 
  onPoseDetected, 
  className = '',
  smoothing = 0.6,
  modelType = 'lightning'
}: PoseCameraProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const backendRef = useRef<PoseBackend | null>(null);
  const smootherRef = useRef<KeypointSmoother>(new KeypointSmoother(smoothing));
  const animationRef = useRef<number>();
  const detectionIntervalRef = useRef<number>();
  const lastPoseTimeRef = useRef<number>(Date.now());

  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [fps, setFps] = useState(0);
  const [noPoseWarning, setNoPoseWarning] = useState(false);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    smootherRef.current.setAlpha(smoothing);
  }, [smoothing]);

  const startCamera = async () => {
    try {
      setIsLoading(true);
      setError('');
      setNoPoseWarning(false);

      // Auto-detect front camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 20, max: 30 },
        },
      });

      streamRef.current = stream;
      setIsFrontCamera(true); // front camera for user-facing

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = resolve;
          }
        });
        await videoRef.current.play();

      // Set canvas to match video intrinsic size with DPI scaling
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (canvas && video) {
        const dpr = window.devicePixelRatio || 1;
        
        // Set intrinsic sizes - one true coordinate space
        video.width = video.videoWidth;
        video.height = video.videoHeight;
        canvas.width = video.videoWidth * dpr;
        canvas.height = video.videoHeight * dpr;
        canvas.style.width = `${video.videoWidth}px`;
        canvas.style.height = `${video.videoHeight}px`;
      }
      }

      // Initialize pose backend
      const backend = getBackend(modelType);
      await backend.init();
      backendRef.current = backend;

      setIsActive(true);
      setIsLoading(false);
      lastPoseTimeRef.current = Date.now();

      // Start detection loop
      startDetectionLoop();
    } catch (err) {
      console.error('Error starting camera:', err);
      setError('Failed to access camera. Please check permissions.');
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (backendRef.current) {
      backendRef.current.dispose();
      backendRef.current = null;
    }

    smootherRef.current.reset();
    setIsActive(false);
    setFps(0);
    setNoPoseWarning(false);
  };

  const startDetectionLoop = () => {
    let lastTime = Date.now();
    let frameCount = 0;
    const TARGET_FPS = 15;
    const FRAME_INTERVAL = 1000 / TARGET_FPS;
    const NO_POSE_TIMEOUT = 2000;

    const detect = async () => {
      if (!videoRef.current || !canvasRef.current || !backendRef.current) {
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx || video.readyState !== 4) {
        return;
      }

      try {
        // Estimate poses with tf.tidy for memory management
        let poses = await backendRef.current.estimate(video);

        // Apply smoothing first (in model coordinate space)
        if (poses.length > 0) {
          poses = smootherRef.current.smooth(poses);
          lastPoseTimeRef.current = Date.now();
          setNoPoseWarning(false);
        } else {
          // Check for no pose timeout
          if (Date.now() - lastPoseTimeRef.current > NO_POSE_TIMEOUT) {
            setNoPoseWarning(true);
          }
        }

        // Reset and clear canvas with proper DPR handling
        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Handle mirroring in canvas context for front camera
        if (isFrontCamera) {
          ctx.translate(video.videoWidth, 0);
          ctx.scale(-1, 1);
        }

        // Draw skeleton (coordinates are now in the correct space)
        drawSkeleton(ctx, poses, video.videoWidth, video.videoHeight);

        // Callback with detected poses
        if (onPoseDetected && poses.length > 0) {
          onPoseDetected(poses);
        }

        // Calculate FPS
        frameCount++;
        const now = Date.now();
        if (now - lastTime >= 1000) {
          setFps(frameCount);
          frameCount = 0;
          lastTime = now;
        }
      } catch (err) {
        console.error('Detection error:', err);
      }
    };

    // Use setInterval for consistent FPS
    detectionIntervalRef.current = window.setInterval(detect, FRAME_INTERVAL);
  };

  const drawSkeleton = (
    ctx: CanvasRenderingContext2D,
    poses: Pose[],
    width: number,
    height: number
  ) => {
    poses.forEach(pose => {
      const { keypoints } = pose;
      const keypointMap = new Map(keypoints.map(kp => [kp.name, kp]));

      // Draw connections
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)';
      ctx.lineWidth = 3;
      SKELETON_CONNECTIONS.forEach(([start, end]) => {
        const kp1 = keypointMap.get(start);
        const kp2 = keypointMap.get(end);

        if (
          kp1 && kp2 && 
          kp1.score && kp2.score && 
          kp1.score > 0.3 && kp2.score > 0.3 &&
          !isNaN(kp1.x) && !isNaN(kp1.y) &&
          !isNaN(kp2.x) && !isNaN(kp2.y)
        ) {
          ctx.beginPath();
          ctx.moveTo(Math.round(kp1.x), Math.round(kp1.y));
          ctx.lineTo(Math.round(kp2.x), Math.round(kp2.y));
          ctx.stroke();
        }
      });

      // Draw keypoints
      keypoints.forEach(kp => {
        if (
          kp.score && kp.score > 0.3 &&
          !isNaN(kp.x) && !isNaN(kp.y)
        ) {
          ctx.fillStyle = 'rgba(34, 197, 94, 1)';
          ctx.beginPath();
          ctx.arc(Math.round(kp.x), Math.round(kp.y), 5, 0, 2 * Math.PI);
          ctx.fill();
        }
      });

      // Draw pose score
      if (pose.score) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = '14px monospace';
        ctx.fillText(`Score: ${pose.score.toFixed(2)}`, 10, 20);
      }
    });

    // Draw FPS
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = '14px monospace';
    ctx.fillText(`FPS: ${fps}`, 10, 40);
  };


  // Handle tab visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      } else if (!document.hidden && isActive) {
        startDetectionLoop();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isActive]);

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-contain"
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          style={{
            mixBlendMode: 'screen',
          }}
        />
        {noPoseWarning && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-yellow-500/90 text-black px-4 py-2 rounded-lg text-sm font-medium">
            Reacquiring pose...
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <p className="text-destructive text-center px-4">{error}</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={isActive ? stopCamera : startCamera}
          disabled={isLoading}
          variant={isActive ? 'destructive' : 'default'}
          className="flex-1"
        >
          {isActive ? <CameraOff className="mr-2" /> : <Camera className="mr-2" />}
          {isLoading ? 'Loading...' : isActive ? 'Stop Camera' : 'Start Camera'}
        </Button>
      </div>
    </div>
  );
};
