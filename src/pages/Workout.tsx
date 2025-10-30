import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Camera, StopCircle, Activity, LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

const Workout = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

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
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session?.user) {
          navigate("/auth");
        }
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => {
      subscription.unsubscribe();
      stopCamera();
    };
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.info("Signed out");
    navigate("/");
  };

  return (
    <div className="fixed inset-0 bg-background">
      {/* Full-screen camera feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />
      
      {!isAnalyzing && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm">
          <div className="text-center">
            <Camera className="w-24 h-24 text-muted-foreground mx-auto mb-6" />
            <p className="text-2xl text-foreground mb-2">Camera not active</p>
            <p className="text-muted-foreground">Tap the button to start</p>
          </div>
        </div>
      )}

      {/* Top overlay - Sign out button */}
      <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-background/80 to-transparent">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground">
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Live Analysis
              </span>
            </h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="bg-background/50 backdrop-blur-sm"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* AI Feedback Overlay */}
      {feedback && (
        <div className="absolute top-24 left-6 right-6 md:left-auto md:right-6 md:w-96 p-6 bg-background/90 backdrop-blur-md rounded-2xl border border-border shadow-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-primary animate-pulse" />
            <h2 className="text-lg font-bold">AI Feedback</h2>
          </div>
          
          <div className="p-4 bg-gradient-primary rounded-xl mb-4">
            <p className="text-primary-foreground font-semibold">
              {feedback}
            </p>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p className="mb-2 font-medium">Tips:</p>
            <ul className="space-y-1 text-xs">
              <li>• Keep movements slow and controlled</li>
              <li>• Ensure good lighting</li>
              <li>• Position yourself fully in frame</li>
            </ul>
          </div>
        </div>
      )}

      {/* Analyzing indicator */}
      {isLoading && (
        <div className="absolute top-24 right-6 bg-primary px-4 py-2 rounded-full shadow-glow">
          <span className="text-sm font-bold text-primary-foreground">
            Analyzing...
          </span>
        </div>
      )}

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background/80 to-transparent">
        <div className="max-w-md mx-auto">
          {!isAnalyzing ? (
            <Button
              variant="hero"
              className="w-full shadow-glow"
              size="lg"
              onClick={startCamera}
            >
              <Camera className="mr-2 w-5 h-5" />
              Start Camera
            </Button>
          ) : (
            <Button
              variant="destructive"
              className="w-full"
              size="lg"
              onClick={stopCamera}
            >
              <StopCircle className="mr-2 w-5 h-5" />
              Stop Camera
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Workout;
