import { useEffect, useRef, useState } from 'react';
import { PoseBackend, Pose, ModelType } from '@/pose/PoseBackend';
import { getBackend } from '@/pose/getBackend';
import { KeypointSmoother } from '@/pose/smoothing';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
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
}

export const PoseCamera = ({ onPoseDetected, className = '' }: PoseCameraProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const backendRef = useRef<PoseBackend | null>(null);
  const smootherRef = useRef<KeypointSmoother>(new KeypointSmoother(0.5));
  const animationRef = useRef<number>();

  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [mirrorVideo, setMirrorVideo] = useState(true);
  const [flipKeypoints, setFlipKeypoints] = useState(true);
  const [modelType, setModelType] = useState<ModelType>('lightning');
  const [smoothing, setSmoothing] = useState(0.5);
  const [fps, setFps] = useState(0);

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

      // Request camera with specific constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 20, max: 30 },
        },
      });

      streamRef.current = stream;

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
          canvas.width = video.videoWidth * dpr;
          canvas.height = video.videoHeight * dpr;
          canvas.style.width = `${video.videoWidth}px`;
          canvas.style.height = `${video.videoHeight}px`;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.scale(dpr, dpr);
          }
        }
      }

      // Initialize pose backend
      const backend = getBackend(modelType);
      await backend.init();
      backendRef.current = backend;

      setIsActive(true);
      setIsLoading(false);

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
  };

  const startDetectionLoop = () => {
    let lastTime = Date.now();
    let frameCount = 0;

    const detect = async () => {
      if (!isActive || !videoRef.current || !canvasRef.current || !backendRef.current) {
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx || video.readyState !== 4) {
        animationRef.current = requestAnimationFrame(detect);
        return;
      }

      try {
        // Estimate poses
        let poses = await backendRef.current.estimate(video);

        // Apply smoothing
        if (poses.length > 0) {
          poses = smootherRef.current.smooth(poses);
        }

        // Flip keypoints if needed
        if (flipKeypoints && poses.length > 0) {
          poses = poses.map(pose => ({
            ...pose,
            keypoints: pose.keypoints.map(kp => ({
              ...kp,
              x: video.videoWidth - kp.x,
            })),
          }));
        }

        // Clear canvas
        ctx.clearRect(0, 0, video.videoWidth, video.videoHeight);

        // Draw skeleton
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

      animationRef.current = requestAnimationFrame(detect);
    };

    detect();
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

        if (kp1 && kp2 && kp1.score && kp2.score && kp1.score > 0.3 && kp2.score > 0.3) {
          ctx.beginPath();
          ctx.moveTo(kp1.x, kp1.y);
          ctx.lineTo(kp2.x, kp2.y);
          ctx.stroke();
        }
      });

      // Draw keypoints
      keypoints.forEach(kp => {
        if (kp.score && kp.score > 0.3) {
          ctx.fillStyle = 'rgba(34, 197, 94, 1)';
          ctx.beginPath();
          ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
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

  const handleModelChange = async (value: ModelType) => {
    setModelType(value);
    if (isActive && backendRef.current) {
      setIsLoading(true);
      await backendRef.current.dispose();
      const backend = getBackend(value);
      await backend.init();
      backendRef.current = backend;
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-contain"
          style={{
            transform: mirrorVideo ? 'scaleX(-1)' : 'none',
          }}
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{
            mixBlendMode: 'screen',
          }}
        />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <p className="text-destructive text-center px-4">{error}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 p-4 bg-card rounded-lg border">
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

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="mirror-video">Mirror Video</Label>
            <Switch
              id="mirror-video"
              checked={mirrorVideo}
              onCheckedChange={setMirrorVideo}
              disabled={!isActive}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="flip-keypoints">Flip Keypoints</Label>
            <Switch
              id="flip-keypoints"
              checked={flipKeypoints}
              onCheckedChange={setFlipKeypoints}
              disabled={!isActive}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Model</Label>
          <Select value={modelType} onValueChange={handleModelChange} disabled={isLoading}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lightning">MoveNet Lightning (Fast)</SelectItem>
              <SelectItem value="thunder">MoveNet Thunder (Accurate)</SelectItem>
              <SelectItem value="blazepose-lite">BlazePose Lite</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Smoothing: {smoothing.toFixed(2)}</Label>
          <Slider
            value={[smoothing]}
            onValueChange={([value]) => setSmoothing(value)}
            min={0.3}
            max={0.8}
            step={0.05}
            disabled={!isActive}
          />
        </div>
      </div>
    </div>
  );
};
