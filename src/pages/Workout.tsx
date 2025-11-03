import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, Activity } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";
import { PoseCamera } from "@/components/PoseCamera";
import { analyzePoseForm } from "@/utils/poseAnalysis";
import type { Pose } from "@/pose/PoseBackend";

const Workout = () => {
  const [feedback, setFeedback] = useState<string[]>([]);
  const [formScore, setFormScore] = useState<number>(0);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [smoothing] = useState(() => {
    const saved = localStorage.getItem('pose-smoothing');
    return saved ? parseFloat(saved) : 0.6;
  });
  const navigate = useNavigate();

  const handlePoseDetected = (poses: Pose[]) => {
    if (poses.length === 0) {
      setFeedback(["Move into frame to begin analysis"]);
      setFormScore(0);
      return;
    }
    
    const analysis = analyzePoseForm(poses[0], 'general');
    setFeedback(analysis.feedback);
    setFormScore(analysis.score);
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
    };
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.info("Signed out");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      {/* Top bar - User menu */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-foreground">
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
                className="rounded-full w-10 h-10"
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

      {/* Main content */}
      <div className="max-w-7xl mx-auto grid lg:grid-cols-3 gap-6">
        {/* Camera and controls */}
        <div className="lg:col-span-2">
          <PoseCamera 
            onPoseDetected={handlePoseDetected}
            smoothing={smoothing}
            modelType="lightning"
          />
        </div>

        {/* AI Feedback panel */}
        <div className="lg:col-span-1">
          <div className="p-6 bg-card rounded-lg border h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary animate-pulse" />
                <h2 className="text-lg font-bold">Form Analysis</h2>
              </div>
              {feedback.length > 0 && (
                <div className={`text-2xl font-black ${
                  formScore >= 90 ? 'text-primary' : 
                  formScore >= 70 ? 'text-yellow-500' : 
                  'text-destructive'
                }`}>
                  {formScore}%
                </div>
              )}
            </div>
            
            {feedback.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Start camera to begin analysis
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2 mb-4">
                  {feedback.map((item, index) => (
                    <div 
                      key={index}
                      className={`p-3 rounded-lg ${
                        item.includes('Excellent') || item.includes('Keep it up')
                          ? 'bg-primary/10 border border-primary'
                          : 'bg-destructive/10 border border-destructive'
                      }`}
                    >
                      <p className="text-sm font-medium">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
                
                <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
                  <p className="font-medium mb-1">💡 Tips:</p>
                  <ul className="space-y-1">
                    <li>• Ensure good lighting</li>
                    <li>• Stay fully in frame</li>
                    <li>• Face the camera directly</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Workout;
