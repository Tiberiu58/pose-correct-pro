import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";

const Subscribe = () => {
  const navigate = useNavigate();

  const handleSubscribe = () => {
    // TODO: Integrate with Stripe
    toast.success("Subscription activated! Welcome to FitForm");
    navigate("/workout");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="container max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-black mb-4">
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Choose Your Plan
            </span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Start your journey to perfect form today
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Monthly Plan */}
          <Card className="p-8 bg-card border-border hover:border-primary transition-all duration-300">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold mb-2">Monthly</h3>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-5xl font-black">$9.99</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              {[
                "Unlimited AI form analysis",
                "All exercise types supported",
                "Real-time feedback",
                "Progress tracking",
                "Cancel anytime"
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-secondary shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <Button 
              variant="default"
              className="w-full"
              size="lg"
              onClick={handleSubscribe}
            >
              Subscribe Monthly
            </Button>
          </Card>

          {/* Annual Plan - Featured */}
          <Card className="p-8 bg-gradient-primary border-0 relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <div className="flex items-center gap-1 bg-secondary px-3 py-1 rounded-full">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-bold">BEST VALUE</span>
              </div>
            </div>

            <div className="text-center mb-6 text-primary-foreground">
              <h3 className="text-2xl font-bold mb-2">Annual</h3>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-5xl font-black">$99.99</span>
                <span className="opacity-80">/year</span>
              </div>
              <p className="mt-2 text-sm opacity-90">Save $20 annually</p>
            </div>

            <div className="space-y-3 mb-8 text-primary-foreground">
              {[
                "Everything in Monthly",
                "2 months free",
                "Priority support",
                "Early access to new features",
                "Exclusive workout plans"
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span className="font-semibold">{feature}</span>
                </div>
              ))}
            </div>

            <Button 
              variant="secondary"
              className="w-full"
              size="lg"
              onClick={handleSubscribe}
            >
              Subscribe Annually
            </Button>
          </Card>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Secure payment powered by Stripe • Cancel anytime • 30-day money-back guarantee
        </p>
      </div>
    </div>
  );
};

export default Subscribe;
