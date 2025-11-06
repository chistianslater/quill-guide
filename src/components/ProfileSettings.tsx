import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { X, Plus, ArrowUp, ArrowDown, AlertCircle } from "lucide-react";
import { ProgressReport } from "./ProgressReport";

interface Interest {
  id: string;
  interest: string;
  intensity: number;
}

interface Profile {
  display_name: string;
  grade_level: number | null;
  federal_state: string | null;
  tts_enabled: boolean | null;
}

interface CompetencyProgress {
  id: string;
  competency_id: string;
  confidence_level: number;
  status: string;
  priority: number;
  struggles_count: number;
  last_struggle_at: string | null;
  competencies: {
    title: string;
    subject: string;
    competency_domain: string;
    description: string;
  };
}

interface ProfileSettingsProps {
  userId: string;
  onComplete?: () => void;
  onOpenAssessment?: () => void;
}

const FEDERAL_STATES = [
  "Baden-Württemberg",
  "Bayern",
  "Berlin",
  "Brandenburg",
  "Bremen",
  "Hamburg",
  "Hessen",
  "Mecklenburg-Vorpommern",
  "Niedersachsen",
  "Nordrhein-Westfalen",
  "Rheinland-Pfalz",
  "Saarland",
  "Sachsen",
  "Sachsen-Anhalt",
  "Schleswig-Holstein",
  "Thüringen",
];

const GRADE_LEVELS = [5, 6, 7, 8, 9, 10, 11, 12, 13];

export const ProfileSettings = ({ userId, onComplete, onOpenAssessment }: ProfileSettingsProps) => {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [newInterest, setNewInterest] = useState("");
  const [competencies, setCompetencies] = useState<CompetencyProgress[]>([]);
  const [profile, setProfile] = useState<Profile>({
    display_name: "",
    grade_level: null,
    federal_state: null,
    tts_enabled: null,
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchInterests();
    fetchProfile();
    fetchCompetencies();
  }, [userId]);

  const fetchInterests = async () => {
    const { data } = await supabase
      .from("user_interests")
      .select("*")
      .eq("user_id", userId)
      .order("intensity", { ascending: false });
    
    if (data) setInterests(data);
  };

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, grade_level, federal_state, tts_enabled")
      .eq("id", userId)
      .maybeSingle();
    
    if (data) setProfile(data);
  };

  const fetchCompetencies = async () => {
    const { data } = await supabase
      .from("competency_progress")
      .select("*, competencies(*)")
      .eq("user_id", userId)
      .in("status", ["not_started", "in_progress"])
      .order("priority", { ascending: false })
      .order("struggles_count", { ascending: false });
    
    if (data) setCompetencies(data as any);
  };

  const addInterest = async () => {
    if (!newInterest.trim()) return;
    setLoading(true);

    try {
      const { error } = await supabase.from("user_interests").insert({
        user_id: userId,
        interest: newInterest.trim(),
        intensity: 5,
      });

      if (error) throw error;

      toast({
        title: "Super! 😊",
        description: "Dein Interesse wurde hinzugefügt.",
      });
      
      setNewInterest("");
      fetchInterests();
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

  const removeInterest = async (id: string) => {
    try {
      const { error } = await supabase
        .from("user_interests")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Gelöscht",
        description: "Interesse wurde entfernt.",
      });
      
      fetchInterests();
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateProfile = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          grade_level: profile.grade_level,
          federal_state: profile.federal_state,
        })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Gespeichert! ✓",
        description: "Deine Profileinstellungen wurden aktualisiert.",
      });

      if (onComplete) onComplete();
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

  const updatePriority = async (competencyId: string, newPriority: number) => {
    try {
      const { error } = await supabase
        .from("competency_progress")
        .update({ priority: newPriority })
        .eq("id", competencyId);

      if (error) throw error;

      toast({
        title: "Priorität aktualisiert",
        description: "Die Priorität wurde erfolgreich geändert.",
      });

      fetchCompetencies();
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Einstellungen</CardTitle>
        <CardDescription>
          Verwalte deine Interessen und Profildaten
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="interests" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="interests">Interessen</TabsTrigger>
            <TabsTrigger value="profile">Profil</TabsTrigger>
            <TabsTrigger value="competencies">Schwerpunkte</TabsTrigger>
            <TabsTrigger value="progress">Fortschritt</TabsTrigger>
            <TabsTrigger value="accessibility">Barrierefreiheit</TabsTrigger>
          </TabsList>

          <TabsContent value="interests" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="interest">Neues Interesse</Label>
              <div className="flex gap-2">
                <Input
                  id="interest"
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  placeholder="z.B. Minecraft, Dinosaurier, Weltraum..."
                  onKeyPress={(e) => e.key === "Enter" && addInterest()}
                />
                <Button
                  onClick={addInterest}
                  disabled={loading || !newInterest.trim()}
                  size="icon"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {interests.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Noch keine Interessen hinzugefügt. Füge dein erstes Interesse hinzu!
                </p>
              ) : (
                interests.map((interest) => (
                  <div
                    key={interest.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary"
                  >
                    <span className="text-sm font-medium">{interest.interest}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeInterest(interest.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="profile" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="grade">Klassenstufe</Label>
              <Select
                value={profile.grade_level?.toString() || ""}
                onValueChange={(value) =>
                  setProfile({ ...profile, grade_level: parseInt(value) })
                }
              >
                <SelectTrigger id="grade">
                  <SelectValue placeholder="Wähle deine Klassenstufe" />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_LEVELS.map((grade) => (
                    <SelectItem key={grade} value={grade.toString()}>
                      {grade}. Klasse
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">Bundesland</Label>
              <Select
                value={profile.federal_state || ""}
                onValueChange={(value) =>
                  setProfile({ ...profile, federal_state: value })
                }
              >
                <SelectTrigger id="state">
                  <SelectValue placeholder="Wähle dein Bundesland" />
                </SelectTrigger>
                <SelectContent>
                  {FEDERAL_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={updateProfile}
              disabled={loading}
              className="w-full"
            >
              Profil speichern
            </Button>
          </TabsContent>

          <TabsContent value="competencies" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Lernbereiche & Schwerpunkte</Label>
              <p className="text-sm text-muted-foreground">
                Markiere Bereiche, in denen du dich verbessern möchtest. Der Buddy wird sich darauf fokussieren.
              </p>
            </div>

            {onOpenAssessment && (
              <Button
                variant="outline"
                onClick={onOpenAssessment}
                className="w-full"
              >
                Selbsteinschätzung durchführen
              </Button>
            )}

            <div className="space-y-3">
              {competencies.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Noch keine Kompetenzen. Beginne ein Gespräch, um loszulegen!
                </p>
              ) : (
                competencies.map((comp) => (
                  <div
                    key={comp.id}
                    className="p-4 rounded-lg bg-secondary space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold">{comp.competencies.title}</h4>
                          {comp.struggles_count > 2 && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Schwachstelle
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {comp.competencies.subject} · {comp.competencies.competency_domain}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Fortschritt: {comp.confidence_level}%
                        </p>
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updatePriority(comp.id, comp.priority + 1)}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updatePriority(comp.id, Math.max(0, comp.priority - 1))}
                          disabled={comp.priority === 0}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {comp.priority > 0 && (
                      <Badge variant="default" className="text-xs">
                        Priorität: {comp.priority}
                      </Badge>
                    )}
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="progress" className="mt-4">
            <ProgressReport
              userId={userId}
              displayName={profile.display_name}
              gradeLevel={profile.grade_level || 0}
            />
          </TabsContent>

          <TabsContent value="accessibility" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="tts-toggle">Text-to-Speech</Label>
                  <p className="text-sm text-muted-foreground">
                    Bot liest Nachrichten automatisch vor
                  </p>
                </div>
                <Switch
                  id="tts-toggle"
                  checked={profile?.tts_enabled || false}
                  onCheckedChange={async (checked) => {
                    const { error } = await supabase
                      .from("profiles")
                      .update({ tts_enabled: checked })
                      .eq("id", userId);

                    if (error) {
                      toast({
                        title: "Fehler",
                        description: "Konnte Einstellung nicht speichern",
                        variant: "destructive",
                      });
                    } else {
                      setProfile((prev) => prev ? { ...prev, tts_enabled: checked } : prev);
                      toast({
                        title: "Gespeichert",
                        description: "Text-to-Speech wurde " + (checked ? "aktiviert" : "deaktiviert"),
                      });
                    }
                  }}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
