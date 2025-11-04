import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Competency {
  id: string;
  title: string;
  subject: string;
  competency_domain: string;
  description: string;
}

interface InitialAssessmentProps {
  userId: string;
  gradeLevel: number;
  federalState: string | null;
  open: boolean;
  onComplete: () => void;
}

export const InitialAssessment = ({ 
  userId, 
  gradeLevel, 
  federalState, 
  open,
  onComplete 
}: InitialAssessmentProps) => {
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [selectedWeaknesses, setSelectedWeaknesses] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && gradeLevel) {
      fetchCompetencies();
    }
  }, [open, gradeLevel, federalState]);

  const fetchCompetencies = async () => {
    const query = supabase
      .from("competencies")
      .select("id, title, subject, competency_domain, description")
      .eq("grade_level", gradeLevel)
      .eq("is_mandatory", true);

    if (federalState) {
      query.or(`federal_state.eq.${federalState},federal_state.is.null`);
    }

    const { data } = await query.limit(10);
    if (data) setCompetencies(data);
  };

  const toggleWeakness = (competencyId: string) => {
    const newSet = new Set(selectedWeaknesses);
    if (newSet.has(competencyId)) {
      newSet.delete(competencyId);
    } else {
      newSet.add(competencyId);
    }
    setSelectedWeaknesses(newSet);
  };

  const saveAssessment = async () => {
    setLoading(true);
    try {
      // Create progress entries for selected weaknesses with high priority
      const weaknessEntries = Array.from(selectedWeaknesses).map(competencyId => ({
        user_id: userId,
        competency_id: competencyId,
        status: "not_started",
        confidence_level: 0,
        priority: 10, // High priority for self-assessed weaknesses
        struggles_count: 1, // Mark as having struggles
        weakness_indicators: { 
          initial_self_assessment: true,
          indicators: ["user_marked_as_weakness"]
        }
      }));

      if (weaknessEntries.length > 0) {
        const { error } = await supabase
          .from("competency_progress")
          .insert(weaknessEntries);

        if (error) throw error;
      }

      toast({
        title: "Gespeichert! 😊",
        description: "Der Buddy wird sich auf diese Bereiche fokussieren.",
      });

      onComplete();
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onComplete()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Wo möchtest du dich verbessern? 🎯</DialogTitle>
          <DialogDescription>
            Markiere die Bereiche, in denen du Unterstützung brauchst. Der Buddy wird sich darauf konzentrieren.
            Du kannst das später jederzeit in den Einstellungen ändern.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {competencies.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Bitte wähle zuerst deine Klassenstufe und dein Bundesland in den Einstellungen.
            </p>
          ) : (
            <>
              {competencies.map((comp) => (
                <div
                  key={comp.id}
                  className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer"
                  onClick={() => toggleWeakness(comp.id)}
                >
                  <Checkbox
                    id={comp.id}
                    checked={selectedWeaknesses.has(comp.id)}
                    onCheckedChange={() => toggleWeakness(comp.id)}
                  />
                  <div className="flex-1">
                    <Label htmlFor={comp.id} className="cursor-pointer">
                      <div className="font-semibold">{comp.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {comp.subject} · {comp.competency_domain}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {comp.description}
                      </div>
                    </Label>
                  </div>
                </div>
              ))}

              <div className="flex gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={onComplete}
                  disabled={loading}
                  className="flex-1"
                >
                  Später
                </Button>
                <Button
                  onClick={saveAssessment}
                  disabled={loading || selectedWeaknesses.size === 0}
                  className="flex-1"
                >
                  Speichern ({selectedWeaknesses.size})
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
