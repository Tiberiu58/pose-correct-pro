export type Keypoint = { 
  x: number; 
  y: number; 
  score?: number; 
  name?: string;
};

export type Pose = { 
  keypoints: Keypoint[]; 
  score?: number;
};

export interface PoseBackend {
  init(): Promise<void>;
  estimate(video: HTMLVideoElement | HTMLCanvasElement): Promise<Pose[]>;
  dispose(): Promise<void>;
  name: 'tfjs' | 'mlkit';
}

export type ModelType = 'lightning' | 'thunder' | 'blazepose-lite';
