import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Smile, Briefcase, Heart } from "lucide-react";

interface BuddyPersonality {
  id: string;
  name: string;
  description: string;
  emoji: string;
  icon: React.ReactNode;
  example: string;
}

const personalities: BuddyPersonality[] = [
  {
    id: "encouraging",
    name: "Ermutigend",
    description: "Dein Buddy ist unterstützend und motivierend",
    emoji: "💪",
    icon: <Heart className="w-8 h-8" />,
    example: "Du schaffst das! Jeder kleine Schritt ist ein Fortschritt! 🌟"
  },
  {
    id: "funny",
    name: "Lustig",
    description: "Dein Buddy macht Lernen mit Humor zum Spaß",
    emoji: "😄",
    icon: <Smile className="w-8 h-8" />,
    example: "Mathe? Kein Problem! Wir knacken die Zahlen wie Nüsse! 🥜"
  },
  {
    id: "professional",
    name: "Sachlich",
    description: "Dein Buddy ist fokussiert und strukturiert",
    emoji: "📚",
    icon: <Briefcase className="w-8 h-8" />,
    example: "Lass uns systematisch vorgehen und das Thema Schritt für Schritt erarbeiten."
  },
  {
    id: "friendly",
    name: "Freundlich",
    description: "Dein Buddy ist wie ein guter Freund",
    emoji: "🤗",
    icon: <Sparkles className="w-8 h-8" />,
    example: "Hey! Lass uns gemeinsam herausfinden, wie das funktioniert! 😊"
  }
];

interface BuddyPersonalitySelectorProps {
  userId: string;
  onSelect?: (personality: string) => void;
}

export const BuddyPersonalitySelector = ({ userId, onSelect }: BuddyPersonalitySelectorProps) => {
  const [selectedPersonality, setSelectedPersonality] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCurrentPersonality();
  }, [userId]);

  const loadCurrentPersonality = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("buddy_personality")
      .eq("id", userId)
      .single();

    if (!error && data) {
      setSelectedPersonality(data.buddy_personality || "encouraging");
    }
  };

  const handleSelect = async (personalityId: string) => {
    setLoading(true);
    
    const { error } = await supabase
      .from("profiles")
      .update({ buddy_personality: personalityId })
      .eq("id", userId);

    if (error) {
      toast({
        title: "Fehler",
        description: "Persönlichkeit konnte nicht gespeichert werden.",
        variant: "destructive"
      });
    } else {
      setSelectedPersonality(personalityId);
      toast({
        title: "Gespeichert! 🎉",
        description: "Dein Buddy hat jetzt eine neue Persönlichkeit!"
      });
      onSelect?.(personalityId);
    }

    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Wähle deinen Buddy-Typ</h2>
        <p className="text-muted-foreground">
          Dein Lern-Buddy passt sich deinem bevorzugten Stil an
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {personalities.map((personality) => (
          <Card
            key={personality.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedPersonality === personality.id
                ? "ring-2 ring-primary shadow-lg"
                : ""
            }`}
            onClick={() => !loading && handleSelect(personality.id)}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${
                  selectedPersonality === personality.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}>
                  {personality.icon}
                </div>
                <div>
                  <CardTitle className="text-lg">
                    {personality.name} {personality.emoji}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {personality.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm italic">"{personality.example}"</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedPersonality && (
        <div className="text-center">
          <Button
            onClick={() => onSelect?.(selectedPersonality)}
            disabled={loading}
            size="lg"
          >
            Weiter mit diesem Buddy-Typ
          </Button>
        </div>
      )}
    </div>
  );
};
