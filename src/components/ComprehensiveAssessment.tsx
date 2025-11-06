import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubjectAssessment } from "./SubjectAssessment";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const MAIN_SUBJECTS = [
  "Mathematik",
  "Deutsch",
  "Englisch",
  "Biologie",
  "Physik",
  "Chemie",
  "Geschichte",
  "Erdkunde"
];

interface ComprehensiveAssessmentProps {
  userId: string;
  gradeLevel: number;
  onComplete: () => void;
}

export const ComprehensiveAssessment = ({ 
  userId, 
  gradeLevel, 
  onComplete 
}: ComprehensiveAssessmentProps) => {
  const [currentSubjectIndex, setCurrentSubjectIndex] = useState(0);
  const [assessmentResults, setAssessmentResults] = useState<Record<string, number>>({});
  const [showSummary, setShowSummary] = useState(false);
  const { toast } = useToast();

  const currentSubject = MAIN_SUBJECTS[currentSubjectIndex];
  const overallProgress = ((currentSubjectIndex) / MAIN_SUBJECTS.length) * 100;

  const handleSubjectComplete = (estimatedLevel: number) => {
    const newResults = {
      ...assessmentResults,
      [currentSubject]: estimatedLevel
    };
    setAssessmentResults(newResults);

    if (currentSubjectIndex < MAIN_SUBJECTS.length - 1) {
      setCurrentSubjectIndex(currentSubjectIndex + 1);
    } else {
      setShowSummary(true);
    }
  };

  const handleSkip = () => {
    if (currentSubjectIndex < MAIN_SUBJECTS.length - 1) {
      setCurrentSubjectIndex(currentSubjectIndex + 1);
    } else {
      setShowSummary(true);
    }
  };

  const handleFinish = async () => {
    const discrepancies = Object.entries(assessmentResults).map(([subject, level]) => ({
      subject,
      level,
      discrepancy: gradeLevel - level
    }));

    discrepancies.sort((a, b) => b.discrepancy - a.discrepancy);

    const prioritySubjects = discrepancies.slice(0, 3);

    for (const { subject } of prioritySubjects) {
      await supabase
        .from("subject_assessments")
        .update({ is_priority: true })
        .eq("user_id", userId)
        .eq("subject", subject);
    }

    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    const updatedPreferences = {
      ...(currentProfile?.preferences || {}),
      assessment_completed: true,
      priority_subjects: prioritySubjects.map(p => p.subject)
    };

    await supabase
      .from("profiles")
      .update({
        preferences: updatedPreferences
      })
      .eq("id", userId);

    toast({
      title: "Einstufung abgeschlossen! 🎉",
      description: `Wir konzentrieren uns auf: ${prioritySubjects.map(p => p.subject).join(", ")}`
    });

    onComplete();
  };

  if (showSummary) {
    const discrepancies = Object.entries(assessmentResults).map(([subject, level]) => ({
      subject,
      level,
      discrepancy: gradeLevel - level
    }));
    discrepancies.sort((a, b) => b.discrepancy - a.discrepancy);

    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl">Deine Einstufung 🎯</CardTitle>
          <CardDescription>
            Hier siehst du, wo du in jedem Fach stehst
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            {discrepancies.map(({ subject, level, discrepancy }, idx) => (
              <div key={subject} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-lg">{subject}</p>
                    {idx < 3 && (
                      <Badge variant="secondary" className="text-xs">
                        Priorität
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Niveau: Klasse {level}
                    {discrepancy > 0 && ` (${discrepancy} Klasse${discrepancy > 1 ? 'n' : ''} zurück)`}
                    {discrepancy < 0 && ` (${Math.abs(discrepancy)} Klasse${Math.abs(discrepancy) > 1 ? 'n' : ''} voraus!)`}
                    {discrepancy === 0 && " (genau richtig!)"}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {discrepancies.length > 0 && (
            <div className="bg-accent p-6 rounded-lg border">
              <p className="font-semibold mb-3 text-lg">🎯 Dein persönlicher Lernplan</p>
              <p className="text-sm mb-3">
                Dein Buddy wird sich besonders auf diese Fächer konzentrieren:
              </p>
              <ul className="space-y-2">
                {discrepancies.slice(0, 3).map(({ subject, discrepancy }) => (
                  <li key={subject} className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 bg-primary rounded-full" />
                    <span className="font-medium">{subject}</span>
                    {discrepancy > 2 && (
                      <span className="text-xs text-muted-foreground">
                        (hier starten wir mit den Grundlagen)
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button onClick={handleFinish} className="w-full" size="lg">
            Los geht's! 🚀
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Fach {currentSubjectIndex + 1} von {MAIN_SUBJECTS.length}
        </p>
        <Progress value={overallProgress} className="max-w-md mx-auto" />
      </div>
      <SubjectAssessment
        userId={userId}
        subject={currentSubject}
        gradeLevel={gradeLevel}
        onComplete={handleSubjectComplete}
        onSkip={handleSkip}
      />
    </div>
  );
};
