import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getQuestionsForSubject, AssessmentQuestion } from "@/data/assessmentQuestions";
import { Send } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BuddyAvatar } from "./BuddyAvatar";
import { motion, AnimatePresence } from "framer-motion";

interface SubjectAssessmentProps {
  userId: string;
  subject: string;
  gradeLevel: number;
  onComplete: (estimatedLevel: number) => void;
  onSkip: () => void;
}

interface ChatMessage {
  role: "buddy" | "user";
  content: string;
  questionId?: string;
}

export const SubjectAssessment = ({ 
  userId, 
  subject, 
  gradeLevel, 
  onComplete,
  onSkip
}: SubjectAssessmentProps) => {
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [waitingForAnswer, setWaitingForAnswer] = useState(false);
  const [buddyPersonality, setBuddyPersonality] = useState<"encouraging" | "funny" | "professional" | "friendly">("encouraging");
  const [uncertaintyCount, setUncertaintyCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadPersonalityAndQuestions = async () => {
      // Load buddy personality
      const { data: profileData } = await supabase
        .from("profiles")
        .select("buddy_personality")
        .eq("id", userId)
        .single();
      
      if (profileData?.buddy_personality) {
        setBuddyPersonality(profileData.buddy_personality as any);
      }

      // Load questions
      const qs = getQuestionsForSubject(subject, gradeLevel).slice(0, 3);
      if (qs.length === 0) {
        toast({
          title: "Keine Fragen verfügbar",
          description: `Für ${subject} sind aktuell keine Fragen verfügbar.`,
          variant: "destructive"
        });
        onSkip();
        return;
      }
      setQuestions(qs);
      
      // Initial buddy message
      const welcomeMessages: ChatMessage[] = [
        { 
          role: "buddy", 
          content: `Hey! 🌟 Lass uns zusammen ${subject} erkunden! Ich stelle dir ein paar Fragen, damit ich besser verstehe, wo du gerade stehst. Kein Stress - das ist kein Test, sondern einfach nur ein Gespräch zwischen uns! 😊` 
        },
        { 
          role: "buddy", 
          content: qs[0].question,
          questionId: qs[0].id
        }
      ];
      setMessages(welcomeMessages);
      setWaitingForAnswer(true);
    };

    loadPersonalityAndQuestions();
  }, [subject, gradeLevel, userId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (questions.length === 0) {
    return <div className="text-center">Lädt Fragen...</div>;
  }

  const currentQuestion = questions[currentQuestionIndex];

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !waitingForAnswer) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: inputValue
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setLoading(true);

    // Check if this is an "I don't know" type answer
    const isUncertainAnswer = inputValue.toLowerCase().match(/(weiß nicht|keine ahnung|verstehe (ich )?(die frage )?nicht|was meinst du|wie meinst du)/);
    
    if (isUncertainAnswer) {
      setUncertaintyCount(prev => prev + 1);
    }

    // Use AI to evaluate if the answer is valid and relevant
    try {
      const shouldProvideExamples = isUncertainAnswer && uncertaintyCount >= 1;
      
      const assessmentContext = `Du bewertest gerade Antworten für ein Assessment im Fach ${subject}.
      
Die aktuelle Frage ist: "${currentQuestion.question}"
${currentQuestion.correctAnswer ? `Die korrekte Antwort wäre: "${currentQuestion.correctAnswer}"` : ''}

Der Schüler hat geantwortet: "${inputValue}"

${shouldProvideExamples ? `WICHTIG: Der Schüler ist mehrfach unsicher. Gib ihm 2-3 konkrete BEISPIELANTWORTEN, die er als Orientierung nutzen kann. Zum Beispiel:
"Kein Problem! Lass mich dir ein paar Beispiele geben:
- [Beispiel 1]
- [Beispiel 2]
- [Beispiel 3]
Versuch es einfach mit einer dieser Richtungen!"` : ''}

Deine Aufgabe:
1. Prüfe, ob die Antwort auf die Frage eingeht
2. Wenn die Antwort eine Rückfrage ist oder "ich weiß nicht" bedeutet, erkläre freundlich die Frage nochmal
3. Wenn die Antwort unklar ist, frage nach Klarstellung
4. Wenn die Antwort auf die Frage eingeht, gib kurzes Feedback (positiv und ermutigend, egal ob richtig oder falsch!)

WICHTIG: 
- Sei super freundlich und ermutigend
- Sage dem Schüler NICHT direkt ob richtig oder falsch
- Wenn er eine echte Antwort gegeben hat (auch wenn falsch), bedanke dich und mache weiter
- Maximal 2-3 Sätze (außer bei Beispielantworten)`;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/buddy-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [
              { role: "system", content: assessmentContext },
              { role: "user", content: inputValue }
            ],
            userId,
          }),
        }
      );

      if (!response.ok || !response.body) {
        throw new Error("Konnte keine Antwort erhalten");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let buddyResponse = "";

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
            if (content) {
              buddyResponse += content;
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      setMessages(prev => [...prev, { role: "buddy", content: buddyResponse }]);

      // Check if this was a valid attempt (not just a question or "I don't know")
      const isValidAttempt = !inputValue.toLowerCase().match(/(was|wie|wer|warum|wo|wann|welche|meinst du|verstehe ich nicht|weiß nicht|keine ahnung)/);
      
      if (isValidAttempt) {
        // Save the answer
        setAnswers({ ...answers, [currentQuestion.id]: inputValue });
        
        // Reset uncertainty counter for next question
        setUncertaintyCount(0);
        
        // Move to next question after a short delay
        setTimeout(() => {
          if (currentQuestionIndex < questions.length - 1) {
            const nextQuestion = questions[currentQuestionIndex + 1];
            setMessages(prev => [...prev, { 
              role: "buddy", 
              content: nextQuestion.question,
              questionId: nextQuestion.id
            }]);
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setWaitingForAnswer(true);
          } else {
            setMessages(prev => [...prev, { 
              role: "buddy", 
              content: "Das war's schon! 🎊 Du hast alle Fragen beantwortet. Ich werte das jetzt für dich aus!" 
            }]);
            setTimeout(() => finishAssessment(), 2000);
          }
        }, 1500);
      } else {
        // Allow another attempt at the same question
        setWaitingForAnswer(true);
      }

      setLoading(false);
    } catch (error) {
      console.error("Assessment error:", error);
      toast({
        title: "Fehler",
        description: "Konnte Antwort nicht verarbeiten. Bitte versuche es erneut.",
        variant: "destructive"
      });
      setLoading(false);
      setWaitingForAnswer(true);
    }
  };

  const finishAssessment = async () => {
    setLoading(true);

    let correctCount = 0;
    let totalLevel = 0;

    questions.forEach(q => {
      const userAnswer = answers[q.id];
      if (q.correctAnswer && userAnswer === q.correctAnswer) {
        correctCount++;
        totalLevel += q.level;
      } else if (!q.correctAnswer && userAnswer && userAnswer.length > 10) {
        correctCount += 0.5;
        totalLevel += q.level * 0.5;
      }
    });

    const estimatedLevel = correctCount > 0 
      ? Math.round(totalLevel / correctCount) 
      : Math.max(gradeLevel - 3, 5);

    const confidence = correctCount / questions.length;

    const { error } = await supabase.from("subject_assessments").insert({
      user_id: userId,
      subject,
      actual_grade_level: gradeLevel,
      estimated_level: estimatedLevel,
      confidence: confidence,
      questions_asked: questions.map(q => q.id),
      answers_given: answers
    });

    if (error) {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Super! 🎉",
        description: `${subject} geschafft!`
      });
      onComplete(estimatedLevel);
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col h-[600px] max-w-3xl mx-auto border rounded-lg bg-card">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <BuddyAvatar personality={buddyPersonality} size="sm" />
          <div>
            <h3 className="font-semibold">{subject} Kennenlernen</h3>
            <p className="text-sm text-muted-foreground">
              Frage {currentQuestionIndex + 1} von {questions.length}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSkip}
          disabled={loading}
        >
          Fach überspringen
        </Button>
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          <AnimatePresence>
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "buddy" && (
                  <BuddyAvatar personality={buddyPersonality} size="sm" animate={idx === messages.length - 1} />
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3 justify-start"
            >
              <BuddyAvatar personality={buddyPersonality} size="sm" />
              <div className="bg-muted rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <motion.div 
                    className="w-2 h-2 rounded-full bg-muted-foreground/40"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                  />
                  <motion.div 
                    className="w-2 h-2 rounded-full bg-muted-foreground/40"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                  />
                  <motion.div 
                    className="w-2 h-2 rounded-full bg-muted-foreground/40"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t bg-background">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Deine Antwort..."
            disabled={!waitingForAnswer || loading}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || !waitingForAnswer || loading}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Antworte einfach so, wie du denkst - es gibt keine falschen Antworten! 💫
        </p>
      </div>
    </div>
  );
};
