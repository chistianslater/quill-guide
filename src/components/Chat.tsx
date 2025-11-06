import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Volume2 } from "lucide-react";
import { BuddyAvatar } from "./BuddyAvatar";
import { TypeAnimation } from 'react-type-animation';

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
  isComplete?: boolean; // Marks if streaming is done
}

export const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [lastBuddyMessageTime, setLastBuddyMessageTime] = useState<number | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [buddyPersonality, setBuddyPersonality] = useState<"encouraging" | "funny" | "professional" | "friendly">("encouraging");
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | undefined>(undefined);
  const [buddyName, setBuddyName] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id || null;
      setUserId(uid);

      // Fetch TTS setting and avatar customization
      if (uid) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('tts_enabled, avatar_customization')
          .eq('id', uid)
          .single();
        
        if (profile) {
          setTtsEnabled(profile.tts_enabled || false);
          // Use baseAvatar from customization if available
          const customization = profile.avatar_customization as any;
          if (customization?.baseAvatar) {
            setBuddyPersonality(customization.baseAvatar as any);
          }
          if (customization?.generatedAvatarUrl) {
            setCustomAvatarUrl(customization.generatedAvatarUrl);
          }
          if (customization?.buddyName) {
            setBuddyName(customization.buddyName);
          }
        }
      }
    };
    getUser();
  }, []);

  // Separate useEffect for realtime subscription that depends on userId
  useEffect(() => {
    if (!userId) return;

    // Subscribe to profile changes to update avatar in real-time
    const profileSubscription = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`
        },
        (payload) => {
          const customization = (payload.new as any)?.avatar_customization;
          if (customization?.baseAvatar) {
            setBuddyPersonality(customization.baseAvatar as any);
          }
          if (customization?.generatedAvatarUrl) {
            setCustomAvatarUrl(customization.generatedAvatarUrl);
          }
          if (customization?.buddyName) {
            setBuddyName(customization.buddyName);
          }
        }
      )
      .subscribe();

    return () => {
      profileSubscription.unsubscribe();
    };
  }, [userId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-focus input when bot finishes responding
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      inputRef.current?.focus();
    }
  }, [isLoading, messages.length]);


  // Auto-play TTS for new assistant messages
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === "assistant" && lastMessage.isComplete && ttsEnabled && !isLoading) {
      playTTS(lastMessage.content);
    }
  }, [messages, ttsEnabled, isLoading]);

  const playTTS = async (text: string) => {
    if (isSpeaking || !text.trim()) return;

    setIsSpeaking(true);
    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text }
      });

      if (error) throw error;

      // Create audio from base64
      const audioBlob = new Blob(
        [Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))],
        { type: 'audio/mpeg' }
      );
      const audioUrl = URL.createObjectURL(audioBlob);

      // Play audio
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };
      audioRef.current.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };
      audioRef.current.play();
    } catch (error) {
      console.error('TTS error:', error);
      setIsSpeaking(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !userId) return;

    const userMessage: Message = { 
      role: "user", 
      content: input.trim(),
      timestamp: Date.now()
    };
    
    // Calculate engagement metrics
    const responseTimeMs = lastBuddyMessageTime 
      ? Date.now() - lastBuddyMessageTime 
      : null;
    const messageLength = input.trim().length;
    
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/buddy-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage],
            userId,
            responseTimeMs,
            messageLength,
          }),
        }
      );

      if (response.status === 429 || response.status === 402) {
        const errorData = await response.json();
        toast({
          title: "Hinweis",
          description: errorData.error,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (!response.ok || !response.body) {
        throw new Error("Konnte keine Antwort erhalten");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const upsertAssistant = (chunk: string) => {
        assistantContent += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: assistantContent } : m
            );
          }
          return [...prev, { 
            role: "assistant", 
            content: assistantContent,
            timestamp: Date.now(),
            isComplete: false
          }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Flush remaining buffer
      if (buffer.trim()) {
        for (let raw of buffer.split("\n")) {
          if (!raw || raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch {}
        }
      }

      // Mark message as complete for typewriter effect
      setMessages((prev) => prev.map((m, i) =>
        i === prev.length - 1 && m.role === "assistant" ? { ...m, isComplete: true } : m
      ));
      
      // Track when buddy message was sent
      setLastBuddyMessageTime(Date.now());
      setIsLoading(false);
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Fehler",
        description: "Konnte keine Antwort erhalten. Bitte versuche es erneut.",
        variant: "destructive",
      });
      setMessages((prev) => prev.slice(0, -1));
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md space-y-2">
              <h2 className="text-2xl font-medium text-foreground">
                Hallo! 😊
              </h2>
              <p className="text-muted-foreground">
                Ich bin dein Lernbegleiter. Wir können über alles reden, was dich interessiert.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isLastMessage = idx === messages.length - 1;
          const shouldAnimate = msg.role === "assistant" && msg.isComplete && isLastMessage;
          
          return (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-3 items-start animate-fade-in`}
            >
              {msg.role === "assistant" && (
                <div className="flex flex-col items-center gap-1">
                  <BuddyAvatar 
                    personality={buddyPersonality} 
                    size="md" 
                    animate={shouldAnimate}
                    customAvatarUrl={customAvatarUrl}
                  />
                  {buddyName && (
                    <span className="text-xs font-medium text-muted-foreground">
                      {buddyName}
                    </span>
                  )}
                </div>
              )}
              <div
                className={`max-w-2xl rounded-xl px-5 py-4 ${
                  msg.role === "user"
                    ? "bg-[hsl(var(--user-message))] text-foreground"
                    : "bg-[hsl(var(--buddy-message))] text-foreground"
                }`}
              >
                {msg.role === "assistant" && msg.isComplete ? (
                  <TypeAnimation
                    sequence={[msg.content]}
                    wrapper="p"
                    speed={75}
                    className="text-base leading-relaxed whitespace-pre-wrap"
                    cursor={false}
                  />
                ) : (
                  <p className="text-base leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </p>
                )}
              </div>
              {msg.role === "assistant" && ttsEnabled && msg.isComplete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => playTTS(msg.content)}
                  title="Vorlesen"
                  disabled={isSpeaking}
                >
                  <Volume2 className={`h-4 w-4 ${isSpeaking ? 'animate-pulse' : ''}`} />
                </Button>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start gap-3 items-start">
            <div className="flex flex-col items-center gap-1">
              <BuddyAvatar 
                personality={buddyPersonality} 
                size="md" 
                animate={true}
                customAvatarUrl={customAvatarUrl}
              />
              {buddyName && (
                <span className="text-xs font-medium text-muted-foreground">
                  {buddyName}
                </span>
              )}
            </div>
            <div className="max-w-2xl rounded-xl px-5 py-4 bg-[hsl(var(--buddy-message))]">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card p-4">
        <div className="max-w-4xl mx-auto flex gap-3">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Schreibe eine Nachricht..."
            className="min-h-[60px] max-h-[200px] resize-none text-base"
            disabled={isLoading}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-[60px] w-[60px] shrink-0"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
