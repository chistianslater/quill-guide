import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getQuestionsForSubject, AssessmentQuestion } from "@/data/assessmentQuestions";
import { Progress } from "@/components/ui/progress";

interface SubjectAssessmentProps {
  userId: string;
  subject: string;
  gradeLevel: number;
  onComplete: (estimatedLevel: number) => void;
  onSkip: () => void;
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
  const { toast } = useToast();

  useEffect(() => {
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
  }, [subject, gradeLevel]);

  if (questions.length === 0) {
    return <div className="text-center">Lädt Fragen...</div>;
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  const handleAnswer = (answer: string) => {
    setAnswers({ ...answers, [currentQuestion.id]: answer });
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      finishAssessment();
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
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
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">{subject}</CardTitle>
        <CardDescription>
          Frage {currentQuestionIndex + 1} von {questions.length}
        </CardDescription>
        <Progress value={progress} className="mt-2" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-lg font-medium mb-6">{currentQuestion.question}</p>

          {currentQuestion.type === "multiple_choice" && (
            <RadioGroup
              value={answers[currentQuestion.id] || ""}
              onValueChange={handleAnswer}
              className="space-y-3"
            >
              {currentQuestion.options?.map((option, idx) => (
                <div key={idx} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent transition-colors">
                  <RadioGroupItem value={option} id={`option-${idx}`} />
                  <Label htmlFor={`option-${idx}`} className="cursor-pointer flex-1">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {currentQuestion.type === "open" && (
            <Textarea
              value={answers[currentQuestion.id] || ""}
              onChange={(e) => handleAnswer(e.target.value)}
              placeholder="Schreibe deine Antwort hier..."
              rows={5}
              className="text-base"
            />
          )}

          {currentQuestion.type === "true_false" && (
            <RadioGroup
              value={answers[currentQuestion.id] || ""}
              onValueChange={handleAnswer}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent transition-colors">
                <RadioGroupItem value="true" id="true" />
                <Label htmlFor="true" className="cursor-pointer flex-1">
                  Richtig
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent transition-colors">
                <RadioGroupItem value="false" id="false" />
                <Label htmlFor="false" className="cursor-pointer flex-1">
                  Falsch
                </Label>
              </div>
            </RadioGroup>
          )}
        </div>

        <div className="flex gap-3 pt-4">
          {currentQuestionIndex > 0 && (
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={loading}
            >
              Zurück
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!answers[currentQuestion.id] || loading}
            className="flex-1"
          >
            {currentQuestionIndex < questions.length - 1 ? "Weiter" : "Fertig"}
          </Button>
        </div>

        <Button
          variant="ghost"
          onClick={onSkip}
          disabled={loading}
          className="w-full"
        >
          Ich habe dieses Fach nicht
        </Button>
      </CardContent>
    </Card>
  );
};
