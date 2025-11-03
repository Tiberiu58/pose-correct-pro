import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Camera, StopCircle, Activity, LogOut, User, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";
import { usePoseDetection } from "@/hooks/usePoseDetection";
import { SkeletonOverlay } from "@/components/SkeletonOverlay";
import { analyzePoseForm } from "@/utils/poseAnalysis";

const Workout = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<string[]>([]);
  const [formScore, setFormScore] = useState<number>(0);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const navigate = useNavigate();
  
  const { poses, isModelLoading } = usePoseDetection(isAnalyzing ? videoRef.current : null);

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
        toast.success("Camera activated - AI analyzing your form");
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
    setIsAnalyzing(false);
    setFeedback([]);
    setFormScore(0);
    toast.info("Camera stopped");
  };

  // Analyze poses in real-time
  useEffect(() => {
    if (!poses.length || !isAnalyzing) return;

    const analysis = analyzePoseForm(poses[0], 'general');
    setFeedback(analysis.feedback);
    setFormScore(analysis.score);
  }, [poses, isAnalyzing]);

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
    <div className="fixed inset-0 bg-background overflow-y-auto">
      {/* Full-screen camera feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />
      
      {!isAnalyzing && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm overflow-y-auto">
          <div className="text-center p-6">
            <Camera className="w-24 h-24 text-muted-foreground mx-auto mb-6" />
            <p className="text-2xl text-foreground mb-2">Camera not active</p>
            <p className="text-muted-foreground">Tap the button to start</p>
          </div>
        </div>
      )}

      {/* Top overlay - User menu */}
      <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-background/80 to-transparent z-50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground">
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Live Analysis
              </span>
            </h1>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="bg-background/50 backdrop-blur-sm rounded-full w-10 h-10"
              >
                <User className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Skeleton Overlay */}
      {isAnalyzing && videoRef.current && (
        <SkeletonOverlay poses={poses} videoElement={videoRef.current} />
      )}

      {/* Model Loading Indicator */}
      {isModelLoading && (
        <div className="absolute top-24 right-6 bg-accent/90 backdrop-blur-sm px-4 py-3 rounded-xl shadow-glow flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-accent-foreground" />
          <span className="text-sm font-bold text-accent-foreground">
            Loading AI Model...
          </span>
        </div>
      )}

      {/* AI Feedback Overlay */}
      {feedback.length > 0 && isAnalyzing && (
        <div className="absolute top-24 left-6 right-6 md:left-auto md:right-6 md:w-96 p-6 bg-background/95 backdrop-blur-md rounded-2xl border-2 border-accent shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-accent animate-pulse" />
              <h2 className="text-lg font-bold">Real-Time Analysis</h2>
            </div>
            <div className={`text-2xl font-black ${
              formScore >= 90 ? 'text-accent' : 
              formScore >= 70 ? 'text-yellow-500' : 
              'text-destructive'
            }`}>
              {formScore}%
            </div>
          </div>
          
          <div className="space-y-2 mb-4">
            {feedback.map((item, index) => (
              <div 
                key={index}
                className={`p-3 rounded-xl ${
                  item.includes('Excellent') || item.includes('Keep it up')
                    ? 'bg-accent/20 border border-accent'
                    : 'bg-destructive/20 border border-destructive'
                }`}
              >
                <p className="text-sm font-semibold">
                  {item}
                </p>
              </div>
            ))}
          </div>
          
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <p className="font-medium mb-1">💡 Tips:</p>
            <ul className="space-y-1">
              <li>• Ensure good lighting</li>
              <li>• Stay fully in frame</li>
              <li>• Face the camera directly</li>
            </ul>
          </div>
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
