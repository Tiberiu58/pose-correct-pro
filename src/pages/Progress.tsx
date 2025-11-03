import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const Progress = () => {
  const navigate = useNavigate();
  const [chartData, setChartData] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);

  useEffect(() => {
    loadProgressData();
    loadBadges();
  }, []);

  const loadProgressData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: sessions, error } = await supabase
        .from("workout_sessions")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Group by day and calculate average accuracy
      const grouped = sessions?.reduce((acc: any, session) => {
        const date = new Date(session.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        if (!acc[date]) {
          acc[date] = { date, total: 0, count: 0 };
        }
        acc[date].total += session.form_accuracy_score || 0;
        acc[date].count += 1;
        return acc;
      }, {});

      const data = Object.values(grouped || {}).map((item: any) => ({
        date: item.date,
        accuracy: Math.round(item.total / item.count),
      }));

      setChartData(data);
    } catch (error) {
      console.error("Error loading progress:", error);
    }
  };

  const loadBadges = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_badges")
        .select(`
          *,
          badges (*)
        `)
        .eq("user_id", user.id);

      if (error) throw error;
      setBadges(data || []);
    } catch (error) {
      console.error("Error loading badges:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-black">Your Progress</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Chart */}
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              <CardTitle>Form Accuracy Over Time</CardTitle>
            </div>
            <CardDescription>Your average form score for the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis domain={[0, 100]} className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="accuracy"
                    stroke="hsl(var(--accent))"
                    strokeWidth={3}
                    dot={{ fill: "hsl(var(--accent))", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Complete some workouts to see your progress
              </div>
            )}
          </CardContent>
        </Card>

        {/* Badges */}
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-accent" />
              <CardTitle>Your Achievements</CardTitle>
            </div>
            <CardDescription>Badges you've earned on your fitness journey</CardDescription>
          </CardHeader>
          <CardContent>
            {badges.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {badges.map((userBadge: any) => (
                  <Card key={userBadge.id} className="border-2 border-accent/50">
                    <CardContent className="p-6 text-center">
                      <div className="text-4xl mb-3">{userBadge.badges.icon}</div>
                      <h3 className="font-bold mb-1">{userBadge.badges.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {userBadge.badges.description}
                      </p>
                      <Badge variant="outline" className="mt-2 text-xs">
                        {new Date(userBadge.earned_at).toLocaleDateString()}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>No badges yet. Keep working out to earn achievements!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Progress;
