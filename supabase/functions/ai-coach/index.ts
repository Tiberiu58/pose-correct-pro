import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    const authHeader = req.headers.get("Authorization")!;
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseClient.auth.getUser(token);
    
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Get user profile for context
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // Get recent workout history
    const { data: recentSessions } = await supabaseClient
      .from("workout_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    const systemPrompt = `You are an expert AI fitness coach for FitForm, a fitness app focused on perfect form and injury prevention.

User Profile:
- Fitness Goal: ${profile?.fitness_goal || "general fitness"}
- Experience Level: ${profile?.experience_level || "beginner"}
- Available Equipment: ${profile?.available_equipment?.join(", ") || "none"}

Recent Performance:
${recentSessions?.map(s => `- ${s.exercise_name}: ${s.sets_completed} sets, ${s.form_accuracy_score}% accuracy`).join("\n") || "No recent workouts"}

Your role:
- Provide personalized workout recommendations
- Give form tips and corrections
- Suggest exercises based on available equipment
- Motivate and encourage
- Keep responses concise and actionable (2-3 paragraphs max)
- Use emojis occasionally to keep it friendly

Be supportive, knowledgeable, and adapt to their fitness level.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error("AI service error");
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ai-coach function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
