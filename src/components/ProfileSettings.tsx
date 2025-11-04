import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { X, Plus } from "lucide-react";

interface Interest {
  id: string;
  interest: string;
  intensity: number;
}

interface Profile {
  display_name: string;
  grade_level: number | null;
  federal_state: string | null;
}

interface ProfileSettingsProps {
  userId: string;
  onComplete?: () => void;
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

export const ProfileSettings = ({ userId, onComplete }: ProfileSettingsProps) => {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [newInterest, setNewInterest] = useState("");
  const [profile, setProfile] = useState<Profile>({
    display_name: "",
    grade_level: null,
    federal_state: null,
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchInterests();
    fetchProfile();
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
      .select("display_name, grade_level, federal_state")
      .eq("id", userId)
      .single();
    
    if (data) setProfile(data);
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="interests">Interessen</TabsTrigger>
            <TabsTrigger value="profile">Profil</TabsTrigger>
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
        </Tabs>
      </CardContent>
    </Card>
  );
};
