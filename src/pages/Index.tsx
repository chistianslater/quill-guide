import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Auth } from "@/components/Auth";
import { Chat } from "@/components/Chat";
import { InterestsManager } from "@/components/InterestsManager";
import { Button } from "@/components/ui/button";
import { LogOut, Heart } from "lucide-react";

const Index = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showInterests, setShowInterests] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      
      // Check if user needs onboarding
      if (session) {
        const { data: interests } = await supabase
          .from("user_interests")
          .select("*")
          .eq("user_id", session.user.id);
        
        if (!interests || interests.length === 0) {
          setNeedsOnboarding(true);
        }
      }
      
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-muted-foreground">Lädt...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  // Onboarding for new users
  if (needsOnboarding) {
    return (
      <InterestsManager 
        userId={session.user.id} 
        onComplete={() => setNeedsOnboarding(false)}
      />
    );
  }

  if (showInterests) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex justify-between items-center">
            <Button variant="ghost" onClick={() => setShowInterests(false)}>
              ← Zurück zum Chat
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          <InterestsManager userId={session.user.id} onComplete={() => setShowInterests(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen">
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowInterests(true)}
        >
          <Heart className="h-4 w-4 mr-2" />
          Interessen
        </Button>
        <Button variant="ghost" size="icon" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
      <Chat />
    </div>
  );
};

export default Index;
