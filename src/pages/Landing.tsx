import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import heroWorkout from "@/assets/hero-workout.jpg";
import { Activity, Camera, Zap } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Hero Section */}
      <div className="relative min-h-screen flex items-center justify-center">
        {/* Background Image with Gradient Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroWorkout})` }}
        >
          <div className="absolute inset-0 bg-gradient-hero" />
        </div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-6 text-center">
          <div className="flex items-center justify-center mb-8">
            <Activity className="w-16 h-16 text-primary animate-pulse" />
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black mb-6 tracking-tight">
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              FitForm
            </span>
          </h1>
          
          <p className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Perfect Your Form with AI
          </p>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Real-time exercise form analysis powered by artificial intelligence. 
            Get instant feedback and corrections to maximize your gains and prevent injuries.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              variant="hero" 
              size="lg"
              onClick={() => navigate("/intro")}
              className="w-full sm:w-auto min-w-[200px]"
            >
              Get Started
            </Button>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap gap-4 justify-center mt-16">
            <div className="flex items-center gap-2 bg-card/80 backdrop-blur-sm px-4 py-2 rounded-full border border-border">
              <Camera className="w-5 h-5 text-secondary" />
              <span className="text-sm font-semibold">Live Camera Analysis</span>
            </div>
            <div className="flex items-center gap-2 bg-card/80 backdrop-blur-sm px-4 py-2 rounded-full border border-border">
              <Zap className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold">Instant AI Feedback</span>
            </div>
            <div className="flex items-center gap-2 bg-card/80 backdrop-blur-sm px-4 py-2 rounded-full border border-border">
              <Activity className="w-5 h-5 text-accent" />
              <span className="text-sm font-semibold">Form Correction</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
