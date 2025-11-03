import { Pose } from '@/hooks/usePoseDetection';

interface PoseAnalysisResult {
  feedback: string[];
  score: number;
}

export const analyzePoseForm = (pose: Pose, exerciseType: string = 'general'): PoseAnalysisResult => {
  const feedback: string[] = [];
  let score = 100;

  if (!pose.keypoints.length) {
    return { feedback: ['Position yourself in frame'], score: 0 };
  }

  // Get keypoint by name
  const getKeypoint = (name: string) => pose.keypoints.find((kp) => kp.name === name);

  // Calculate angle between three points
  const calculateAngle = (a: any, b: any, c: any): number => {
    if (!a || !b || !c) return 0;
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
  };

  const leftShoulder = getKeypoint('left_shoulder');
  const rightShoulder = getKeypoint('right_shoulder');
  const leftHip = getKeypoint('left_hip');
  const rightHip = getKeypoint('right_hip');
  const leftKnee = getKeypoint('left_knee');
  const rightKnee = getKeypoint('right_knee');
  const leftAnkle = getKeypoint('left_ankle');
  const rightAnkle = getKeypoint('right_ankle');
  const leftElbow = getKeypoint('left_elbow');
  const rightElbow = getKeypoint('right_elbow');

  // Check shoulder alignment
  if (leftShoulder && rightShoulder && leftShoulder.score! > 0.5 && rightShoulder.score! > 0.5) {
    const shoulderTilt = Math.abs(leftShoulder.y - rightShoulder.y);
    if (shoulderTilt > 30) {
      feedback.push('Keep shoulders level');
      score -= 10;
    }
  }

  // Check back posture (shoulder-hip alignment)
  if (leftShoulder && leftHip && leftShoulder.score! > 0.5 && leftHip.score! > 0.5) {
    const backAngle = Math.abs(Math.atan2(leftHip.y - leftShoulder.y, leftHip.x - leftShoulder.x) * 180 / Math.PI);
    if (backAngle < 75 || backAngle > 105) {
      feedback.push('Straighten your back');
      score -= 15;
    }
  }

  // Check knee alignment for squats/lunges
  if (exerciseType === 'squat' || exerciseType === 'lunge') {
    if (leftHip && leftKnee && leftAnkle && leftHip.score! > 0.5 && leftKnee.score! > 0.5 && leftAnkle.score! > 0.5) {
      const kneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
      
      // Check if knee goes past toes
      if (leftKnee.x > leftAnkle.x + 20) {
        feedback.push('Knees too far forward');
        score -= 15;
      }

      // Check squat depth
      if (kneeAngle > 120) {
        feedback.push('Go deeper for full range');
        score -= 5;
      }
    }
  }

  // Check arm form for exercises
  if (exerciseType === 'push-up' || exerciseType === 'plank') {
    if (leftShoulder && leftElbow && leftShoulder.score! > 0.5 && leftElbow.score! > 0.5) {
      const elbowAlignment = Math.abs(leftShoulder.y - leftElbow.y);
      if (elbowAlignment > 40) {
        feedback.push('Keep elbows aligned with shoulders');
        score -= 10;
      }
    }
  }

  // General visibility check
  const visibleKeypoints = pose.keypoints.filter((kp) => kp.score && kp.score > 0.5).length;
  if (visibleKeypoints < 10) {
    feedback.push('Move closer or adjust lighting');
    score -= 10;
  }

  // Positive feedback if form is good
  if (feedback.length === 0) {
    feedback.push('Excellent form! Keep it up! 💪');
  }

  return {
    feedback,
    score: Math.max(0, Math.min(100, score)),
  };
};
