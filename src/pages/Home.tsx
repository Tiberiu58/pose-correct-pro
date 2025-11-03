import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dumbbell, TrendingUp, Flame, Target, LogOut, User, MessageSquare, BarChart3, Video, Crown } from "lucide-react";
import { toast } from "sonner";

const Home = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({
    todaySessions: 0,
    weeklyAccuracy: 0,
    totalSets: 0,
    caloriesBurned: 0,
  });

  useEffect(() => {
    checkAuth();
    loadProfile();
    loadStats();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (!data.onboarding_completed) {
        navigate("/onboarding");
      }

      setProfile(data);
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const loadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: sessions, error } = await supabase
        .from("workout_sessions")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", weekAgo.toISOString());

      if (error) throw error;

      const todaySessions = sessions?.filter(
        (s) => new Date(s.created_at) >= today
      ).length || 0;

      const avgAccuracy =
        sessions?.reduce((acc, s) => acc + (s.form_accuracy_score || 0), 0) /
          (sessions?.length || 1) || 0;

      const totalSets = sessions?.reduce((acc, s) => acc + (s.sets_completed || 0), 0) || 0;
      const calories = sessions?.reduce((acc, s) => acc + (s.calories_burned || 0), 0) || 0;

      setStats({
        todaySessions,
        weeklyAccuracy: Math.round(avgAccuracy),
        totalSets,
        caloriesBurned: calories,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.info("Signed out");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">
              <span className="bg-gradient-primary bg-clip-text text-transparent">FitForm</span>
            </h1>
            {profile?.subscription_tier === "pro" && (
              <Badge className="mt-1 bg-gradient-primary">
                <Crown className="w-3 h-3 mr-1" /> Pro
              </Badge>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full">
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

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Welcome Section */}
        <div>
          <h2 className="text-3xl font-black mb-2">
            Welcome back, {profile?.email?.split("@")[0]}! 👋
          </h2>
          <p className="text-muted-foreground text-lg">
            Ready to crush your workout today?
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs uppercase font-semibold">Today</CardDescription>
              <CardTitle className="text-3xl font-black">{stats.todaySessions}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Target className="w-4 h-4" /> Sessions
              </p>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs uppercase font-semibold">Accuracy</CardDescription>
              <CardTitle className="text-3xl font-black">{stats.weeklyAccuracy}%</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <TrendingUp className="w-4 h-4" /> This week
              </p>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs uppercase font-semibold">Sets</CardDescription>
              <CardTitle className="text-3xl font-black">{stats.totalSets}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Dumbbell className="w-4 h-4" /> Total
              </p>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs uppercase font-semibold">Burned</CardDescription>
              <CardTitle className="text-3xl font-black">{stats.caloriesBurned}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Flame className="w-4 h-4" /> Calories
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-2 hover:border-accent transition-colors cursor-pointer group" onClick={() => navigate("/workout")}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Video className="w-6 h-6 text-primary-foreground" />
                </div>
                <Badge variant="outline" className="text-accent border-accent">Today's Workout</Badge>
              </div>
              <CardTitle className="text-2xl mt-4">Start Live Analysis</CardTitle>
              <CardDescription className="text-base">
                Get real-time form feedback with AI pose detection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-gradient-primary" size="lg">
                Start Workout
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-accent transition-colors cursor-pointer group" onClick={() => navigate("/coach")}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-6 h-6 text-accent" />
                </div>
                <Badge variant="outline">AI Coach</Badge>
              </div>
              <CardTitle className="text-2xl mt-4">Talk to Your Coach</CardTitle>
              <CardDescription className="text-base">
                Get personalized workout recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline" size="lg">
                Open Chat
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Progress Card */}
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">Your Progress</CardTitle>
              <Button variant="outline" onClick={() => navigate("/progress")}>
                <BarChart3 className="w-4 h-4 mr-2" />
                View Details
              </Button>
            </div>
            <CardDescription>Track your fitness journey over time</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
};

export default Home;
