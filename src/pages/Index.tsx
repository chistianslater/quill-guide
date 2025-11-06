import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Auth } from "@/components/Auth";
import { Chat } from "@/components/Chat";
import { ProfileSettings } from "@/components/ProfileSettings";
import { InitialAssessment } from "@/components/InitialAssessment";
import { ComprehensiveAssessment } from "@/components/ComprehensiveAssessment";
import { Button } from "@/components/ui/button";
import { LogOut, Settings } from "lucide-react";

const Index = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showAssessment, setShowAssessment] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [needsComprehensiveAssessment, setNeedsComprehensiveAssessment] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      
      // Check if user needs onboarding
      if (session) {
        const { data: interests } = await supabase
          .from("user_interests")
          .select("*")
          .eq("user_id", session.user.id);
        
        // Fetch profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();
        
        setProfile(profileData);
        
        // Check if comprehensive assessment is completed
        const assessmentCompleted = profileData?.preferences?.assessment_completed || false;
        
        if (!interests || interests.length === 0) {
          setNeedsOnboarding(true);
        } else if (!assessmentCompleted && profileData?.grade_level) {
          setNeedsComprehensiveAssessment(true);
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
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <ProfileSettings 
          userId={session.user.id} 
          onComplete={() => {
            setNeedsOnboarding(false);
            if (profile?.grade_level) {
              setNeedsComprehensiveAssessment(true);
            }
          }}
        />
      </div>
    );
  }

  // Comprehensive assessment for subject-specific evaluation
  if (needsComprehensiveAssessment && profile?.grade_level) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <ComprehensiveAssessment
          userId={session.user.id}
          gradeLevel={profile.grade_level}
          onComplete={() => setNeedsComprehensiveAssessment(false)}
        />
      </div>
    );
  }

  if (showSettings) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex justify-between items-center">
            <Button variant="ghost" onClick={() => setShowSettings(false)}>
              ← Zurück zum Chat
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          <ProfileSettings 
            userId={session.user.id} 
            onComplete={() => setShowSettings(false)}
            onOpenAssessment={() => setShowAssessment(true)}
          />
          {profile && (
            <InitialAssessment
              userId={session.user.id}
              gradeLevel={profile.grade_level}
              federalState={profile.federal_state}
              open={showAssessment}
              onComplete={() => setShowAssessment(false)}
            />
          )}
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
          onClick={() => setShowSettings(true)}
        >
          <Settings className="h-4 w-4 mr-2" />
          Einstellungen
        </Button>
        <Button variant="ghost" size="icon" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
      <Chat />
      
      {profile && (
        <InitialAssessment
          userId={session.user.id}
          gradeLevel={profile.grade_level}
          federalState={profile.federal_state}
          open={showAssessment}
          onComplete={() => setShowAssessment(false)}
        />
      )}
    </div>
  );
};

export default Index;
