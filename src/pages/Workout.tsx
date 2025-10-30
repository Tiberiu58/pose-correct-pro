import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, StopCircle, Activity } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Workout = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 1280, height: 720 },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsAnalyzing(true);
        toast.success("Camera activated");
        
        // Start analyzing frames every 3 seconds
        intervalRef.current = setInterval(() => {
          captureAndAnalyze();
        }, 3000);
      }
    } catch (error) {
      console.error("Camera error:", error);
      toast.error("Failed to access camera");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsAnalyzing(false);
    setFeedback("");
    toast.info("Camera stopped");
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || isLoading) return;

    setIsLoading(true);
    
    try {
      // Capture frame from video
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;
      
      ctx.drawImage(videoRef.current, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.8);

      // Send to AI for analysis
      const { data, error } = await supabase.functions.invoke('analyze-form', {
        body: { image: imageData }
      });

      if (error) throw error;

      if (data?.feedback) {
        setFeedback(data.feedback);
      }
    } catch (error) {
      console.error("Analysis error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black mb-2">
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Live Analysis
              </span>
            </h1>
            <p className="text-muted-foreground">
              Position yourself in frame and start exercising
            </p>
          </div>
          <Activity className="w-12 h-12 text-primary animate-pulse" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Camera Feed */}
          <div className="lg:col-span-2">
            <Card className="p-6 bg-card border-border">
              <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-4 relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {!isAnalyzing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                    <div className="text-center">
                      <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-lg text-muted-foreground">
                        Camera not active
                      </p>
                    </div>
                  </div>
                )}
                {isLoading && (
                  <div className="absolute top-4 right-4 bg-primary px-3 py-1 rounded-full">
                    <span className="text-sm font-bold text-primary-foreground">
                      Analyzing...
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                {!isAnalyzing ? (
                  <Button
                    variant="hero"
                    className="flex-1"
                    size="lg"
                    onClick={startCamera}
                  >
                    <Camera className="mr-2" />
                    Start Camera
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    className="flex-1"
                    size="lg"
                    onClick={stopCamera}
                  >
                    <StopCircle className="mr-2" />
                    Stop Camera
                  </Button>
                )}
              </div>
            </Card>
          </div>

          {/* Feedback Panel */}
          <div className="lg:col-span-1">
            <Card className="p-6 bg-card border-border h-full">
              <h2 className="text-2xl font-bold mb-4">AI Feedback</h2>
              
              {!feedback && !isAnalyzing && (
                <div className="text-center py-12">
                  <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Start the camera to receive real-time form analysis
                  </p>
                </div>
              )}

              {isAnalyzing && !feedback && (
                <div className="text-center py-12">
                  <Activity className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
                  <p className="text-muted-foreground">
                    Waiting for analysis...
                  </p>
                </div>
              )}

              {feedback && (
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-primary rounded-lg">
                    <p className="text-primary-foreground font-semibold">
                      {feedback}
                    </p>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <p className="mb-2">Tips:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Keep your movements slow and controlled</li>
                      <li>Ensure good lighting for best results</li>
                      <li>Position yourself fully in frame</li>
                    </ul>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Workout;
