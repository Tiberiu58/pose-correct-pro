// src/components/PoseCamera.tsx
import { useEffect, useRef, useState } from 'react';
import { PoseBackend, Pose, ModelType } from '@/pose/PoseBackend';
import { getBackend } from '@/pose/getBackend';
import { KeypointSmoother } from '@/pose/smoothing';
import { RepCounter } from '@/pose/useRepCounter';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff, Settings } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

type KPName =
  | 'nose' | 'left_eye' | 'right_eye' | 'left_ear' | 'right_ear'
  | 'left_shoulder' | 'right_shoulder' | 'left_elbow' | 'right_elbow'
  | 'left_wrist' | 'right_wrist' | 'left_hip' | 'right_hip'
  | 'left_knee' | 'right_knee' | 'left_ankle' | 'right_ankle';

const SKELETON_CONNECTIONS: [KPName, KPName][] = [
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

// === Helper: where the video actually renders inside the container (object-contain math)
function computeRenderRect(
  videoW: number, videoH: number,
  boxW: number, boxH: number,
  fit: 'contain' | 'cover' = 'contain'
) {
  const videoAR = videoW / videoH;
  const boxAR = boxW / boxH;
  let renderW = 0, renderH = 0, renderX = 0, renderY = 0;

  if (fit === 'contain') {
    if (videoAR > boxAR) {
      renderW = boxW;
      renderH = boxW / videoAR;
      renderX = 0;
      renderY = (boxH - renderH) / 2;
    } else {
      renderH = boxH;
      renderW = boxH * videoAR;
      renderX = (boxW - renderW) / 2;
      renderY = 0;
    }
  } else {
    if (videoAR > boxAR) {
      renderH = boxH;
      renderW = boxH * videoAR;
      renderX = (boxW - renderW) / 2;
      renderY = 0;
    } else {
      renderW = boxW;
      renderH = boxW / videoAR;
      renderX = 0;
      renderY = (boxH - renderH) / 2;
    }
  }

  return { renderX, renderY, renderW, renderH };
}

interface PoseCameraProps {
  onPoseDetected?: (poses: Pose[]) => void;
  className?: string;
  smoothing?: number;       // 0.3–0.8 (default 0.6)
  modelType?: ModelType;    // 'lightning' | 'thunder' | 'blazepose'
}

export const PoseCamera = ({
  onPoseDetected,
  className = '',
  smoothing = 0.6,
  modelType = 'lightning',
}: PoseCameraProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const backendRef = useRef<PoseBackend | null>(null);
  const smootherRef = useRef<KeypointSmoother>(new KeypointSmoother(0.3)); // More aggressive smoothing
  const repCounterRef = useRef<RepCounter>(new RepCounter('squat'));
  const detectionIntervalRef = useRef<number | null>(null);
  const lastPoseTimeRef = useRef<number>(Date.now());

  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [fps, setFps] = useState(0);
  const [noPoseWarning, setNoPoseWarning] = useState(false);
  const [videoAspectRatio, setVideoAspectRatio] = useState<number>(4/3);
  const [repCount, setRepCount] = useState(0);
  const [currentAngle, setCurrentAngle] = useState(0);
  const [exerciseName, setExerciseName] = useState('Squat');
  const [selectedExercise, setSelectedExercise] = useState<'squat' | 'pushup'>('squat');
  const [calibrationMode, setCalibrationMode] = useState(false);
  const [smoothingValue, setSmoothingValue] = useState(0.3);

  const TARGET_FPS = 15;
  const FRAME_INTERVAL = 1000 / TARGET_FPS;
  const NO_POSE_TIMEOUT = 2000;

  useEffect(() => () => stopCamera(), []);
  useEffect(() => { smootherRef.current.setAlpha(smoothing); }, [smoothing]);
  
  const handleExerciseChange = (exercise: 'squat' | 'pushup') => {
    setSelectedExercise(exercise);
    repCounterRef.current.setExercise(exercise);
    setExerciseName(repCounterRef.current.getExerciseName());
    setRepCount(0);
    setCurrentAngle(0);
  };

  const handleSmoothingChange = (value: number[]) => {
    const newValue = value[0];
    setSmoothingValue(newValue);
    smootherRef.current.setAlpha(newValue);
  };

  async function startCamera() {
    try {
      setIsLoading(true);
      setError('');
      setNoPoseWarning(false);

      // Detect native aspect ratio (mobile vs desktop)
      const aspectRatio = window.screen?.height && window.screen?.width 
        ? window.screen.height / window.screen.width 
        : 4 / 3; // fallback to 4:3 for desktop
      
      const idealWidth = 640;
      const idealHeight = Math.round(idealWidth * aspectRatio);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: idealWidth },
          height: { ideal: idealHeight },
          frameRate: { ideal: 20, max: 30 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setIsFrontCamera(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise<void>((resolve) => {
          if (!videoRef.current) return resolve();
          videoRef.current.onloadedmetadata = () => resolve();
        });
        await videoRef.current.play();

        // Detect actual camera aspect ratio
        const actualWidth = videoRef.current.videoWidth;
        const actualHeight = videoRef.current.videoHeight;
        setVideoAspectRatio(actualWidth / actualHeight);

        videoRef.current.width = actualWidth;
        videoRef.current.height = actualHeight;
      }

      const backend = getBackend(modelType);
      await backend.init();
      backendRef.current = backend;

      setIsActive(true);
      setIsLoading(false);
      lastPoseTimeRef.current = Date.now();
      startDetectionLoop();
    } catch (err) {
      console.error('Error starting camera:', err);
      setError('Failed to access camera. Please check permissions.');
      setIsLoading(false);
    }
  }

  function stopCamera() {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (backendRef.current) {
      backendRef.current.dispose();
      backendRef.current = null;
    }
    smootherRef.current.reset();
    repCounterRef.current.reset();
    setIsActive(false);
    setFps(0);
    setNoPoseWarning(false);
    setRepCount(0);
    setCurrentAngle(0);
  }

  function startDetectionLoop() {
    let lastFpsTime = Date.now();
    let frameCount = 0;

    const detect = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const box = containerRef.current;
      const backend = backendRef.current;
      if (!video || !canvas || !box || !backend) return;
      if (video.readyState !== 4) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1) Container (display) size + render rect for object-cover
      const boxW = box.clientWidth;
      const boxH = box.clientHeight;
      const { renderX, renderY, renderW, renderH } = computeRenderRect(
        video.videoWidth, video.videoHeight, boxW, boxH, 'cover'
      );

      // 2) Canvas size to *display* pixels (with DPR)
      const dpr = window.devicePixelRatio || 1;
      const needResize =
        canvas.width !== Math.round(boxW * dpr) ||
        canvas.height !== Math.round(boxH * dpr);
      if (needResize) {
        canvas.width = Math.round(boxW * dpr);
        canvas.height = Math.round(boxH * dpr);
      }

      try {
        // 3) Estimate poses (model coords are in *video pixel space*)
        let poses = await backend.estimate(video);

        // 4) Smoothing in model space (OK)
        if (poses.length > 0) {
          poses = smootherRef.current.smooth(poses);
          
          // 4.5) Update rep counter
          const repState = repCounterRef.current.update(poses);
          setRepCount(repState.count);
          setCurrentAngle(repState.angle);
          
          lastPoseTimeRef.current = Date.now();
          if (noPoseWarning) setNoPoseWarning(false);
        } else if (Date.now() - lastPoseTimeRef.current > NO_POSE_TIMEOUT) {
          setNoPoseWarning(true);
        }

        // 5) Clear + set DPR transform
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // 6) Go to render rect, mirror (if front cam), then scale to fit model -> display
        ctx.save();
        ctx.translate(renderX, renderY);

        if (isFrontCamera) {
          ctx.translate(renderW, 0);
          ctx.scale(-1, 1); // mirror in the same space as drawing
        }

        const sx = renderW / video.videoWidth;
        const sy = renderH / video.videoHeight;
        ctx.scale(sx, sy);

        // 7) Draw using raw model coordinates (video pixel space)
        drawSkeleton(ctx, poses, video.videoWidth, video.videoHeight, fps);

        ctx.restore();

        // 8) FPS calc
        frameCount++;
        const now = Date.now();
        if (now - lastFpsTime >= 1000) {
          setFps(frameCount);
          frameCount = 0;
          lastFpsTime = now;
        }
      } catch (e) {
        console.error('Detection error:', e);
      }
    };

    detectionIntervalRef.current = window.setInterval(detect, FRAME_INTERVAL);
  }

  // Draw in *model/video pixel* space (we already transformed ctx to display space)
  function drawSkeleton(
    ctx: CanvasRenderingContext2D,
    poses: Pose[],
    videoW: number,
    videoH: number,
    fpsVal: number
  ) {
    const KEYPOINT_OFFSET_Y = -55; // Offset pentru a muta keypoints mai sus
    const KEYPOINT_OFFSET_X = 30; // Offset pentru a muta keypoints la dreapta
    
    poses.forEach((pose) => {
      const { keypoints } = pose;
      const map = new Map(keypoints.map((kp) => [kp.name, kp]));

      // bones
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.85)';
      ctx.lineWidth = 3;
      SKELETON_CONNECTIONS.forEach(([a, b]) => {
        const p1 = map.get(a);
        const p2 = map.get(b);
        if (!p1 || !p2) return;
        if ((p1.score ?? 0) < 0.35 || (p2.score ?? 0) < 0.35) return; // Higher threshold
        if (Number.isNaN(p1.x) || Number.isNaN(p1.y) || Number.isNaN(p2.x) || Number.isNaN(p2.y)) return;

        // Smooth rendering with sub-pixel precision
        ctx.beginPath();
        ctx.moveTo(p1.x + KEYPOINT_OFFSET_X, p1.y + KEYPOINT_OFFSET_Y);
        ctx.lineTo(p2.x + KEYPOINT_OFFSET_X, p2.y + KEYPOINT_OFFSET_Y);
        ctx.stroke();
      });

      // joints
      keypoints.forEach((kp) => {
        if ((kp.score ?? 0) < 0.35) return; // Higher threshold
        if (Number.isNaN(kp.x) || Number.isNaN(kp.y)) return;

        // Variable opacity based on confidence
        const opacity = Math.min(1, (kp.score ?? 0) / 0.5);
        ctx.fillStyle = `rgba(34, 197, 94, ${opacity})`;
        ctx.beginPath();
        ctx.arc(kp.x + KEYPOINT_OFFSET_X, kp.y + KEYPOINT_OFFSET_Y, 5, 0, 2 * Math.PI);
        ctx.fill();
      });

      // pose score
      if (pose.score) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = '14px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillText(`Score: ${pose.score.toFixed(2)}`, 10, 20);
      }
    });

    // FPS
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '14px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(`FPS: ${fpsVal}`, 10, 40);
  }

  // Pause/resume loop when tab hidden/visible
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        if (detectionIntervalRef.current) {
          clearInterval(detectionIntervalRef.current);
          detectionIntervalRef.current = null;
        }
      } else if (isActive && !detectionIntervalRef.current) {
        startDetectionLoop();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [isActive]);

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div
        ref={containerRef}
        className="relative bg-black rounded-lg overflow-hidden w-full mx-auto"
        style={{ 
          aspectRatio: `${1 / videoAspectRatio}`,
          maxHeight: '70vh'
        }}
      >
        {/* IMPORTANT: no CSS flip on the video; we mirror only in canvas math */}
       <video
  ref={videoRef}
  autoPlay
  playsInline
  muted
  className="absolute inset-0 w-full h-full object-cover"
  style={{ transform: 'scaleX(-1)' }}
/>

        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none z-10"
          style={{ mixBlendMode: 'screen' }}
        />
        {/* Rep Counter HUD */}
        {isActive && !calibrationMode && (
          <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm text-white px-4 py-3 rounded-lg space-y-1 min-w-[140px]">
            <div className="text-xs text-gray-400 font-medium">Exercise</div>
            <div className="text-sm font-semibold">{exerciseName}</div>
            <div className="text-xs text-gray-400 font-medium mt-2">Reps</div>
            <div className="text-3xl font-bold text-green-500">{repCount}</div>
            <div className="text-xs text-gray-400 font-medium mt-2">Angle</div>
            <div className="text-sm font-mono">{currentAngle}°</div>
          </div>
        )}

        {/* Calibration HUD */}
        {isActive && calibrationMode && (
          <div className="absolute top-4 left-4 bg-black/90 backdrop-blur-sm text-white px-5 py-4 rounded-lg space-y-3 min-w-[280px]">
            <div className="flex items-center gap-2 mb-2">
              <Settings className="w-4 h-4 text-green-500" />
              <div className="text-sm font-semibold">Calibration Mode</div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs text-gray-400">Smoothing Strength</Label>
                <span className="text-xs text-green-500 font-mono">{smoothingValue.toFixed(2)}</span>
              </div>
              <Slider
                value={[smoothingValue]}
                onValueChange={handleSmoothingChange}
                min={0.1}
                max={0.9}
                step={0.05}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-gray-500">
                <span>More Responsive</span>
                <span>More Stable</span>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-700">
              <div className="text-xs text-gray-400">Tips:</div>
              <ul className="text-[10px] text-gray-500 mt-1 space-y-1">
                <li>• Lower values = faster tracking</li>
                <li>• Higher values = smoother motion</li>
                <li>• Adjust until keypoints feel stable</li>
              </ul>
            </div>
          </div>
        )}

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

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Select value={selectedExercise} onValueChange={handleExerciseChange} disabled={isActive}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Exercise" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="squat">Squat</SelectItem>
              <SelectItem value="pushup">Push-up</SelectItem>
            </SelectContent>
          </Select>
          
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

        {isActive && (
          <Button
            onClick={() => setCalibrationMode(!calibrationMode)}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Settings className="mr-2 h-4 w-4" />
            {calibrationMode ? 'Exit Calibration' : 'Calibrate Smoothing'}
          </Button>
        )}
      </div>
    </div>
  );
};
