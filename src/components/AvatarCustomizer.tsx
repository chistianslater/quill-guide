import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { BuddyAvatar } from "./BuddyAvatar";
import { motion } from "framer-motion";

interface AvatarCustomizerProps {
  userId: string;
  onClose: () => void;
}

const avatarOptions = {
  baseAvatar: [
    { value: "encouraging", label: "Ermutigend" },
    { value: "funny", label: "Lustig" },
    { value: "professional", label: "Professionell" },
    { value: "friendly", label: "Freundlich" }
  ],
  skinTone: [
    { value: "light", label: "Hell", color: "#FFE0BD" },
    { value: "medium", label: "Medium", color: "#F1C27D" },
    { value: "tan", label: "Gebräunt", color: "#C68642" },
    { value: "dark", label: "Dunkel", color: "#8D5524" }
  ],
  hairStyle: [
    { value: "short", label: "Kurz" },
    { value: "medium", label: "Mittel" },
    { value: "long", label: "Lang" },
    { value: "curly", label: "Lockig" }
  ],
  hairColor: [
    { value: "black", label: "Schwarz", color: "#2C1B18" },
    { value: "brown", label: "Braun", color: "#6F4E37" },
    { value: "blonde", label: "Blond", color: "#F4E7C3" },
    { value: "red", label: "Rot", color: "#A0522D" },
    { value: "colorful", label: "Bunt", color: "linear-gradient(90deg, #FF0000, #00FF00, #0000FF)" }
  ],
  accessories: [
    { value: "glasses", label: "👓 Brille" },
    { value: "hat", label: "🧢 Mütze" },
    { value: "headphones", label: "🎧 Kopfhörer" },
    { value: "bow", label: "🎀 Schleife" }
  ]
};

export const AvatarCustomizer = ({ userId, onClose }: AvatarCustomizerProps) => {
  const { toast } = useToast();
  const [customization, setCustomization] = useState({
    baseAvatar: "encouraging" as "encouraging" | "funny" | "professional" | "friendly",
    skinTone: "medium",
    hairStyle: "short",
    hairColor: "brown",
    accessories: [] as string[]
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCustomization();
  }, [userId]);

  const loadCustomization = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("avatar_customization")
      .eq("id", userId)
      .single();

    if (data?.avatar_customization && typeof data.avatar_customization === 'object') {
      const custom = data.avatar_customization as any;
      setCustomization({
        baseAvatar: custom.baseAvatar || "encouraging",
        skinTone: custom.skinTone || "medium",
        hairStyle: custom.hairStyle || "short",
        hairColor: custom.hairColor || "brown",
        accessories: Array.isArray(custom.accessories) ? custom.accessories : []
      });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ 
        avatar_customization: customization,
        buddy_personality: customization.baseAvatar
      })
      .eq("id", userId);

    if (error) {
      toast({
        title: "Fehler",
        description: "Konnte Avatar nicht speichern",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Gespeichert! 🎉",
        description: "Dein Avatar wurde aktualisiert"
      });
      onClose();
    }
    setLoading(false);
  };

  const toggleAccessory = (accessory: string) => {
    setCustomization(prev => ({
      ...prev,
      accessories: prev.accessories.includes(accessory)
        ? prev.accessories.filter(a => a !== accessory)
        : [...prev.accessories, accessory]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Passe deinen Buddy an! 🎨</h2>
          <Button variant="ghost" onClick={onClose}>✕</Button>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Preview */}
          <div className="flex flex-col items-center gap-4">
            <Label className="text-lg font-semibold">Vorschau</Label>
            <div className="bg-muted rounded-2xl p-8 flex items-center justify-center">
              <BuddyAvatar 
                personality={customization.baseAvatar} 
                size="lg" 
                animate={true}
              />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              So sieht dein Buddy aus!
            </p>
          </div>

          {/* Customization Options */}
          <div className="space-y-6">
            {/* Base Avatar */}
            <div>
              <Label className="text-base mb-3 block">Persönlichkeit</Label>
              <div className="grid grid-cols-2 gap-2">
                {avatarOptions.baseAvatar.map(option => (
                  <Button
                    key={option.value}
                    variant={customization.baseAvatar === option.value ? "default" : "outline"}
                    onClick={() => setCustomization(prev => ({ ...prev, baseAvatar: option.value as any }))}
                    className="h-auto py-3"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Skin Tone */}
            <div>
              <Label className="text-base mb-3 block">Hautfarbe</Label>
              <div className="flex gap-2">
                {avatarOptions.skinTone.map(option => (
                  <motion.button
                    key={option.value}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCustomization(prev => ({ ...prev, skinTone: option.value }))}
                    className={`w-12 h-12 rounded-full border-2 ${
                      customization.skinTone === option.value ? "border-primary ring-2 ring-primary/50" : "border-border"
                    }`}
                    style={{ backgroundColor: option.color }}
                    title={option.label}
                  />
                ))}
              </div>
            </div>

            {/* Hair Style */}
            <div>
              <Label className="text-base mb-3 block">Frisur</Label>
              <div className="grid grid-cols-2 gap-2">
                {avatarOptions.hairStyle.map(option => (
                  <Button
                    key={option.value}
                    variant={customization.hairStyle === option.value ? "default" : "outline"}
                    onClick={() => setCustomization(prev => ({ ...prev, hairStyle: option.value }))}
                    size="sm"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Hair Color */}
            <div>
              <Label className="text-base mb-3 block">Haarfarbe</Label>
              <div className="flex gap-2">
                {avatarOptions.hairColor.map(option => (
                  <motion.button
                    key={option.value}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCustomization(prev => ({ ...prev, hairColor: option.value }))}
                    className={`w-12 h-12 rounded-full border-2 ${
                      customization.hairColor === option.value ? "border-primary ring-2 ring-primary/50" : "border-border"
                    }`}
                    style={{ 
                      background: option.color,
                      backgroundColor: !option.color.includes('gradient') ? option.color : undefined
                    }}
                    title={option.label}
                  />
                ))}
              </div>
            </div>

            {/* Accessories */}
            <div>
              <Label className="text-base mb-3 block">Accessoires</Label>
              <div className="grid grid-cols-2 gap-2">
                {avatarOptions.accessories.map(option => (
                  <Button
                    key={option.value}
                    variant={customization.accessories.includes(option.value) ? "default" : "outline"}
                    onClick={() => toggleAccessory(option.value)}
                    size="sm"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex gap-3">
          <Button onClick={handleSave} disabled={loading} className="flex-1">
            {loading ? "Speichert..." : "Speichern"}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
        </div>
      </Card>
    </div>
  );
};