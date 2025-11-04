import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { X, Plus } from "lucide-react";

interface Interest {
  id: string;
  interest: string;
  intensity: number;
}

export const InterestsManager = ({ userId }: { userId: string }) => {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [newInterest, setNewInterest] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchInterests();
  }, [userId]);

  const fetchInterests = async () => {
    const { data } = await supabase
      .from("user_interests")
      .select("*")
      .eq("user_id", userId)
      .order("intensity", { ascending: false });
    
    if (data) setInterests(data);
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

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Deine Interessen</CardTitle>
        <CardDescription>
          Teile mit, was dich interessiert. Dein Buddy wird Lerninhalte mit deinen Interessen verbinden.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
      </CardContent>
    </Card>
  );
};
