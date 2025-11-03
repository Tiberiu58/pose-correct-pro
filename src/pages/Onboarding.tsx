import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dumbbell, Target, TrendingUp, ChevronRight } from "lucide-react";

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState("");
  const [experience, setExperience] = useState("");
  const [equipment, setEquipment] = useState<string[]>([]);

  const equipmentOptions = [
    "Dumbbells",
    "Barbell",
    "Resistance Bands",
    "Yoga Mat",
    "Pull-up Bar",
    "Kettlebell",
    "None (Bodyweight only)",
  ];

  const handleComplete = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          fitness_goal: goal as any,
          experience_level: experience as any,
          available_equipment: equipment,
          onboarding_completed: true,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Profile setup complete!");
      navigate("/home");
    } catch (error) {
      console.error("Error saving onboarding:", error);
      toast.error("Failed to save your preferences");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl border-2">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center">
              <Dumbbell className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-3xl font-black">Welcome to FitForm</CardTitle>
          <CardDescription className="text-lg">
            Let's personalize your fitness journey
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-accent" />
                  What's your fitness goal?
                </h3>
                <RadioGroup value={goal} onValueChange={setGoal}>
                  <div className="space-y-3">
                    {[
                      { value: "muscle_gain", label: "Build Muscle 💪", desc: "Gain strength and size" },
                      { value: "fat_loss", label: "Lose Fat 🔥", desc: "Burn calories and get lean" },
                      { value: "endurance", label: "Boost Endurance 🏃", desc: "Increase stamina" },
                      { value: "flexibility", label: "Improve Flexibility 🧘", desc: "Enhance mobility" },
                      { value: "general_fitness", label: "General Fitness ⚡", desc: "Stay healthy and active" },
                    ].map((option) => (
                      <Label
                        key={option.value}
                        htmlFor={option.value}
                        className={`flex items-center space-x-3 p-4 rounded-xl border-2 cursor-pointer transition-all hover:border-accent ${
                          goal === option.value ? "border-accent bg-accent/10" : "border-border"
                        }`}
                      >
                        <RadioGroupItem value={option.value} id={option.value} />
                        <div className="flex-1">
                          <div className="font-semibold">{option.label}</div>
                          <div className="text-sm text-muted-foreground">{option.desc}</div>
                        </div>
                      </Label>
                    ))}
                  </div>
                </RadioGroup>
              </div>
              <Button
                onClick={() => setStep(2)}
                disabled={!goal}
                className="w-full"
                size="lg"
              >
                Continue <ChevronRight className="ml-2" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-accent" />
                  What's your experience level?
                </h3>
                <RadioGroup value={experience} onValueChange={setExperience}>
                  <div className="space-y-3">
                    {[
                      { value: "beginner", label: "Beginner 🌱", desc: "New to fitness" },
                      { value: "intermediate", label: "Intermediate 📈", desc: "Some experience" },
                      { value: "advanced", label: "Advanced 🏆", desc: "Experienced athlete" },
                    ].map((option) => (
                      <Label
                        key={option.value}
                        htmlFor={option.value}
                        className={`flex items-center space-x-3 p-4 rounded-xl border-2 cursor-pointer transition-all hover:border-accent ${
                          experience === option.value ? "border-accent bg-accent/10" : "border-border"
                        }`}
                      >
                        <RadioGroupItem value={option.value} id={option.value} />
                        <div className="flex-1">
                          <div className="font-semibold">{option.label}</div>
                          <div className="text-sm text-muted-foreground">{option.desc}</div>
                        </div>
                      </Label>
                    ))}
                  </div>
                </RadioGroup>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => setStep(1)} variant="outline" className="flex-1" size="lg">
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!experience}
                  className="flex-1"
                  size="lg"
                >
                  Continue <ChevronRight className="ml-2" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Dumbbell className="w-5 h-5 text-accent" />
                  What equipment do you have?
                </h3>
                <div className="space-y-3">
                  {equipmentOptions.map((item) => (
                    <Label
                      key={item}
                      htmlFor={item}
                      className={`flex items-center space-x-3 p-4 rounded-xl border-2 cursor-pointer transition-all hover:border-accent ${
                        equipment.includes(item) ? "border-accent bg-accent/10" : "border-border"
                      }`}
                    >
                      <Checkbox
                        id={item}
                        checked={equipment.includes(item)}
                        onCheckedChange={(checked) => {
                          setEquipment(
                            checked
                              ? [...equipment, item]
                              : equipment.filter((e) => e !== item)
                          );
                        }}
                      />
                      <span className="font-medium">{item}</span>
                    </Label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => setStep(2)} variant="outline" className="flex-1" size="lg">
                  Back
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={equipment.length === 0}
                  className="flex-1 bg-gradient-primary"
                  size="lg"
                >
                  Start Training! 🚀
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-center gap-2 pt-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-2 w-12 rounded-full transition-all ${
                  i === step ? "bg-accent" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
