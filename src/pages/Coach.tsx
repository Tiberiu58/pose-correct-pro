import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Bot, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

const Coach = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("coach_messages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages((data || []).map(m => ({ ...m, role: m.role as "user" | "assistant" })));
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Save user message
      const { error: insertError } = await supabase
        .from("coach_messages")
        .insert({ user_id: user.id, role: "user", content: userMessage });

      if (insertError) throw insertError;

      // Call AI coach
      const { data, error } = await supabase.functions.invoke("ai-coach", {
        body: { message: userMessage },
      });

      if (error) throw error;

      // Save assistant response
      const { error: assistantError } = await supabase
        .from("coach_messages")
        .insert({
          user_id: user.id,
          role: "assistant",
          content: data.response,
        });

      if (assistantError) throw assistantError;

      // Reload messages
      await loadMessages();
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error(error.message || "Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-black">AI Coach</h1>
              <p className="text-xs text-muted-foreground">Your personal fitness assistant</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">
          {messages.length === 0 && (
            <Card className="border-2 border-accent/50">
              <CardContent className="p-8 text-center">
                <Bot className="w-16 h-16 mx-auto mb-4 text-accent" />
                <h3 className="text-xl font-bold mb-2">Welcome to your AI Coach!</h3>
                <p className="text-muted-foreground mb-4">
                  I can help you with workout plans, exercise tips, form corrections, and nutrition advice.
                </p>
                <p className="text-sm text-muted-foreground">
                  Try asking: "What workout should I do today?" or "How can I improve my squat form?"
                </p>
              </CardContent>
            </Card>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}
            >
              {message.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl p-4 ${
                  message.role === "user"
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              </div>
              {message.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="bg-muted rounded-2xl p-4">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask your coach anything..."
              disabled={isLoading}
              className="flex-1 h-12"
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-12 w-12 rounded-full bg-gradient-primary"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Coach;
