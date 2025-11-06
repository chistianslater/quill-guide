import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface AvatarCustomizerProps {
  userId: string;
  onClose: () => void;
}

const avatarOptions = {
  gender: [
    { value: "male", label: "Männlich" },
    { value: "female", label: "Weiblich" }
  ],
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
    gender: "male" as "male" | "female",
    baseAvatar: "encouraging" as "encouraging" | "funny" | "professional" | "friendly",
    skinTone: "medium",
    hairStyle: "short",
    hairColor: "brown",
    accessories: [] as string[],
    buddyName: ""
  });
  const [loading, setLoading] = useState(false);
  const [generatedAvatarUrl, setGeneratedAvatarUrl] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [chatMessages, setChatMessages] = useState<Array<{ text: string; isBot: boolean }>>([
    { text: "Hi! Ich helfe dir dabei, deinen persönlichen Lern-Buddy zu gestalten. Lass uns Schritt für Schritt deinen perfekten Avatar erstellen! 🎨", isBot: true },
    { text: "Fangen wir an: Ist dein Buddy männlich oder weiblich?", isBot: true }
  ]);

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
        gender: custom.gender || "male",
        baseAvatar: custom.baseAvatar || "encouraging",
        skinTone: custom.skinTone || "medium",
        hairStyle: custom.hairStyle || "short",
        hairColor: custom.hairColor || "brown",
        accessories: Array.isArray(custom.accessories) ? custom.accessories : [],
        buddyName: custom.buddyName || ""
      });
      // Load previously generated avatar
      if (custom.generatedAvatarUrl) {
        setGeneratedAvatarUrl(custom.generatedAvatarUrl);
      }
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    
    try {
      // Generate custom avatar based on all customization options
      const avatarPrompt = generateAvatarPrompt(customization);
      
      toast({
        title: "Generiere Avatar... 🎨",
        description: "Dies kann einen Moment dauern"
      });
      
      // Generate the avatar image using Supabase edge function
      const { data, error: fnError } = await supabase.functions.invoke('generate-avatar', {
        body: { 
          prompt: avatarPrompt,
          userId 
        }
      });
      
      if (fnError) throw fnError;
      if (!data.success) throw new Error(data.error || 'Avatar generation failed');
      
      // Display generated avatar
      setGeneratedAvatarUrl(data.imageUrl);
      
      toast({
        title: "Avatar generiert! ✨",
        description: "Gefällt er dir? Klicke Speichern um ihn zu übernehmen."
      });
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Konnte Avatar nicht generieren",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!generatedAvatarUrl) {
      toast({
        title: "Kein Avatar generiert",
        description: "Bitte generiere zuerst einen Avatar",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      // Save customization and generated avatar URL
      const { error } = await supabase
        .from("profiles")
        .update({ 
          avatar_customization: {
            ...customization,
            generatedAvatarUrl
          },
          buddy_personality: customization.baseAvatar
        })
        .eq("id", userId);

      if (error) throw error;
      
      toast({
        title: "Gespeichert! 🎉",
        description: "Dein Avatar wurde aktualisiert"
      });
      onClose();
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Konnte Avatar nicht speichern",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAvatarPrompt = (custom: typeof customization) => {
    const genderDescriptions = {
      male: "male character",
      female: "female character"
    };

    const personalityDescriptions = {
      encouraging: "warm, supportive, uplifting expression with bright eyes",
      funny: "playful, cheerful expression with a big smile",
      professional: "calm, confident expression with attentive eyes",
      friendly: "welcoming, kind expression with a gentle smile"
    };

    const skinToneDescriptions = {
      light: "fair skin tone",
      medium: "medium skin tone",
      tan: "tan skin tone",
      dark: "dark skin tone"
    };

    const hairStyleDescriptions = {
      short: "short hair",
      medium: "medium-length hair",
      long: "long hair",
      curly: "curly hair"
    };

    const hairColorDescriptions = {
      black: "black hair",
      brown: "brown hair",
      blonde: "blonde hair",
      red: "red hair",
      colorful: "vibrant multicolored hair"
    };

    const accessoriesText = custom.accessories.length > 0
      ? `, wearing ${custom.accessories.map(a => {
          if (a === 'glasses') return 'simple glasses with no branding';
          if (a === 'hat') return 'a plain cap with no logos or brands';
          if (a === 'headphones') return 'simple headphones with no branding';
          if (a === 'bow') return 'a hair bow';
          return a;
        }).join(' and ')}`
      : '';

    return `3D cartoon avatar in the style of Apple Memoji: ${genderDescriptions[custom.gender]}, ${skinToneDescriptions[custom.skinTone]}, ${hairStyleDescriptions[custom.hairStyle]}, ${hairColorDescriptions[custom.hairColor]}, ${personalityDescriptions[custom.baseAvatar]}${accessoriesText}. IMPORTANT: No brand logos, no Apple logos, no trademark symbols, completely generic design. Ultra high resolution, clean background, professional digital art, vibrant colors, soft lighting, friendly and approachable style.`;
  };

  const toggleAccessory = (accessory: string) => {
    setCustomization(prev => ({
      ...prev,
      accessories: prev.accessories.includes(accessory)
        ? prev.accessories.filter(a => a !== accessory)
        : [...prev.accessories, accessory]
    }));
  };

  const handleStepChoice = (choice: string, nextQuestion: string) => {
    setChatMessages(prev => [
      ...prev,
      { text: choice, isBot: false },
      { text: nextQuestion, isBot: true }
    ]);
    setCurrentStep(prev => prev + 1);
  };

  const handleNameInput = (name: string) => {
    setCustomization(prev => ({ ...prev, buddyName: name }));
    setChatMessages(prev => [
      ...prev,
      { text: name, isBot: false },
      { text: `Perfekt! ${name} ist ein toller Name! 🎉 Ich generiere jetzt deinen Avatar...`, isBot: true }
    ]);
    setCurrentStep(7);
    setTimeout(() => handleGenerate(), 1000);
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: // Gender
        return (
          <div className="grid grid-cols-2 gap-2">
            {avatarOptions.gender.map(option => (
              <Button
                key={option.value}
                variant={customization.gender === option.value ? "default" : "outline"}
                onClick={() => {
                  setCustomization(prev => ({ ...prev, gender: option.value as any }));
                  handleStepChoice(option.label, "Super! Welche Persönlichkeit soll dein Buddy haben?");
                }}
                className="h-auto py-3"
              >
                {option.label}
              </Button>
            ))}
          </div>
        );
      case 1: // Personality
        return (
          <div className="grid grid-cols-2 gap-2">
            {avatarOptions.baseAvatar.map(option => (
              <Button
                key={option.value}
                variant={customization.baseAvatar === option.value ? "default" : "outline"}
                onClick={() => {
                  setCustomization(prev => ({ ...prev, baseAvatar: option.value as any }));
                  handleStepChoice(option.label, "Schöne Wahl! Welche Hautfarbe soll dein Buddy haben?");
                }}
                className="h-auto py-3"
              >
                {option.label}
              </Button>
            ))}
          </div>
        );
      case 2: // Skin Tone
        return (
          <div className="flex gap-3 justify-center">
            {avatarOptions.skinTone.map(option => (
              <motion.button
                key={option.value}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setCustomization(prev => ({ ...prev, skinTone: option.value }));
                  handleStepChoice(option.label, "Toll! Welche Frisur gefällt dir?");
                }}
                className={`w-16 h-16 rounded-full border-4 ${
                  customization.skinTone === option.value 
                    ? 'border-primary ring-2 ring-primary ring-offset-2' 
                    : 'border-border hover:border-primary'
                }`}
                style={{ backgroundColor: option.color }}
                title={option.label}
              />
            ))}
          </div>
        );
      case 3: // Hair Style
        return (
          <div className="grid grid-cols-2 gap-2">
            {avatarOptions.hairStyle.map(option => (
              <Button
                key={option.value}
                variant={customization.hairStyle === option.value ? "default" : "outline"}
                onClick={() => {
                  setCustomization(prev => ({ ...prev, hairStyle: option.value }));
                  handleStepChoice(option.label, "Passt gut! Welche Haarfarbe soll es sein?");
                }}
              >
                {option.label}
              </Button>
            ))}
          </div>
        );
      case 4: // Hair Color
        return (
          <div className="flex gap-3 justify-center">
            {avatarOptions.hairColor.map(option => (
              <motion.button
                key={option.value}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setCustomization(prev => ({ ...prev, hairColor: option.value }));
                  handleStepChoice(option.label, "Sieht super aus! Möchtest du Accessoires hinzufügen? (Mehrfachauswahl möglich)");
                }}
                className={`w-16 h-16 rounded-full border-4 ${
                  customization.hairColor === option.value 
                    ? 'border-primary ring-2 ring-primary ring-offset-2' 
                    : 'border-border hover:border-primary'
                }`}
                style={{ 
                  background: option.color,
                  backgroundColor: !option.color.includes('gradient') ? option.color : undefined
                }}
                title={option.label}
              />
            ))}
          </div>
        );
      case 5: // Accessories
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {avatarOptions.accessories.map(option => (
                <Button
                  key={option.value}
                  variant={customization.accessories.includes(option.value) ? "default" : "outline"}
                  onClick={() => toggleAccessory(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <Button 
              onClick={() => {
                const accessories = customization.accessories.length > 0 
                  ? customization.accessories.join(", ") 
                  : "Keine";
                handleStepChoice(
                  `Accessoires: ${accessories}`, 
                  "Fast fertig! Wie soll dein Buddy heißen?"
                );
              }}
              className="w-full"
            >
              Weiter
            </Button>
          </div>
        );
      case 6: // Name
        return (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Name eingeben..."
              className="w-full px-4 py-3 rounded-lg border bg-background"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  handleNameInput(e.currentTarget.value.trim());
                }
              }}
              autoFocus
            />
            <p className="text-xs text-muted-foreground text-center">
              Drücke Enter zum Fortfahren
            </p>
          </div>
        );
      case 7: // Generating
        return (
          <div className="text-center py-4">
            <div className="animate-spin text-4xl mb-2">🎨</div>
            <p className="text-muted-foreground">Erstelle deinen Avatar...</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] flex flex-col p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Erstelle deinen Buddy 🎨</h2>
          <Button variant="ghost" onClick={onClose}>✕</Button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-[300px] max-h-[400px] p-4 bg-muted/30 rounded-lg">
          {chatMessages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}
            >
              <div className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                msg.isBot 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-secondary text-secondary-foreground'
              }`}>
                {msg.text}
              </div>
            </motion.div>
          ))}
          
          {generatedAvatarUrl && currentStep === 7 && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex justify-center py-4"
            >
              <img
                src={generatedAvatarUrl}
                alt="Generated Avatar"
                className="w-48 h-48 rounded-full object-cover shadow-lg"
              />
            </motion.div>
          )}
        </div>

        {/* Current Step Options */}
        {currentStep < 7 && (
          <div className="p-4 bg-background rounded-lg border">
            {renderCurrentStep()}
          </div>
        )}

        {/* Save Button (only show when avatar is generated) */}
        {generatedAvatarUrl && currentStep === 7 && (
          <div className="mt-4 flex gap-3">
            <Button 
              onClick={handleSave} 
              disabled={loading} 
              className="flex-1"
            >
              {customization.buddyName} übernehmen
            </Button>
            <Button 
              onClick={() => {
                setCurrentStep(0);
                setGeneratedAvatarUrl(null);
                setChatMessages([
                  { text: "Lass uns nochmal von vorne beginnen! 🎨", isBot: true },
                  { text: "Ist dein Buddy männlich oder weiblich?", isBot: true }
                ]);
              }} 
              variant="outline"
            >
              Neu starten
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};