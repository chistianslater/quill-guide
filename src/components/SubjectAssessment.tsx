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

  const handleSendMessage = () => {
    if (!inputValue.trim() || !waitingForAnswer) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: inputValue
    };

    setMessages(prev => [...prev, userMessage]);
    setAnswers({ ...answers, [currentQuestion.id]: inputValue });
    setInputValue("");
    setWaitingForAnswer(false);

    // Buddy responds with encouragement and next question
    setTimeout(() => {
      const encouragements = [
        "Super! 💪 Danke für deine Antwort!",
        "Klasse! 🎉 Weiter geht's!",
        "Toll gemacht! ⭐ Nächste Frage kommt!",
        "Perfekt! 🚀 Lass uns weitermachen!"
      ];
      
      const encouragement = encouragements[Math.floor(Math.random() * encouragements.length)];
      
      setMessages(prev => [...prev, { role: "buddy", content: encouragement }]);

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
      }, 800);
    }, 500);
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
