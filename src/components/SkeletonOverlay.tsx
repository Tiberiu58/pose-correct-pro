import { useEffect, useRef } from 'react';
import { Pose } from '@/hooks/usePoseDetection';

interface SkeletonOverlayProps {
  poses: Pose[];
  videoElement: HTMLVideoElement | null;
}

const SKELETON_CONNECTIONS = [
  // Face
  ['nose', 'left_eye'],
  ['nose', 'right_eye'],
  ['left_eye', 'left_ear'],
  ['right_eye', 'right_ear'],
  
  // Upper body
  ['left_shoulder', 'right_shoulder'],
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],
  
  // Lower body
  ['left_hip', 'left_knee'],
  ['left_knee', 'left_ankle'],
  ['right_hip', 'right_knee'],
  ['right_knee', 'right_ankle'],
];

export const SkeletonOverlay = ({ poses, videoElement }: SkeletonOverlayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !videoElement || !poses.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    poses.forEach((pose) => {
      const keypoints = pose.keypoints;

      // Draw connections
      SKELETON_CONNECTIONS.forEach(([startName, endName]) => {
        const start = keypoints.find((kp) => kp.name === startName);
        const end = keypoints.find((kp) => kp.name === endName);

        if (start && end && start.score && end.score && start.score > 0.3 && end.score > 0.3) {
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.strokeStyle = '#00FF88';
          ctx.lineWidth = 4;
          ctx.stroke();
        }
      });

      // Draw keypoints
      keypoints.forEach((keypoint) => {
        if (keypoint.score && keypoint.score > 0.3) {
          ctx.beginPath();
          ctx.arc(keypoint.x, keypoint.y, 6, 0, 2 * Math.PI);
          ctx.fillStyle = '#00FF88';
          ctx.fill();
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
    });
  }, [poses, videoElement]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ mixBlendMode: 'screen' }}
    />
  );
};
