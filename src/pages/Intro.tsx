import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import appMockup from "@/assets/app-mockup.png";
import { CheckCircle2, Camera, Zap, TrendingUp, Shield } from "lucide-react";

const Intro = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Camera,
      title: "Live Camera Tracking",
      description: "Your phone's camera analyzes your movements in real-time"
    },
    {
      icon: Zap,
      title: "Instant AI Analysis",
      description: "Advanced AI detects form issues immediately as you exercise"
    },
    {
      icon: TrendingUp,
      title: "Personalized Corrections",
      description: "Get specific guidance on how to improve your technique"
    },
    {
      icon: Shield,
      title: "Injury Prevention",
      description: "Prevent injuries by maintaining proper form throughout your workout"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-black mb-6">
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Train Smarter,
            </span>
            <br />
            <span className="text-foreground">Not Harder</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            FitForm uses cutting-edge AI to ensure every rep counts. 
            Perfect form means better results and fewer injuries.
          </p>
        </div>

        {/* App Preview */}
        <div className="flex justify-center mb-16">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-primary blur-3xl opacity-20 animate-pulse" />
            <img 
              src={appMockup} 
              alt="FitForm App Interface" 
              className="relative w-full max-w-md rounded-3xl shadow-card"
            />
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="p-6 bg-card border-border hover:shadow-glow transition-all duration-300">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-gradient-primary">
                    <Icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Benefits List */}
        <Card className="p-8 bg-card border-border mb-12">
          <h2 className="text-3xl font-bold mb-6 text-center">What You'll Get</h2>
          <div className="space-y-4">
            {[
              "Real-time form analysis during every workout",
              "Detailed corrections for common mistakes",
              "Progress tracking and improvement metrics",
              "Unlimited access to AI form checker",
              "Support for all major exercises"
            ].map((benefit, index) => (
              <div key={index} className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-secondary shrink-0" />
                <span className="text-lg">{benefit}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* CTA */}
        <div className="text-center">
          <Button 
            variant="hero" 
            size="lg"
            onClick={() => navigate("/subscribe")}
            className="min-w-[250px]"
          >
            Continue to Subscription
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Intro;
