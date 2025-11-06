import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Auth } from "@/components/Auth";
import { Chat } from "@/components/Chat";
import { ProfileSettings } from "@/components/ProfileSettings";
import { InitialAssessment } from "@/components/InitialAssessment";
import { ComprehensiveAssessment } from "@/components/ComprehensiveAssessment";
import { AvatarCustomizer } from "@/components/AvatarCustomizer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogOut, Settings, User, Package } from "lucide-react";
import { TaskBasket } from "@/components/TaskBasket";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showAssessment, setShowAssessment] = useState(false);
  const [showAvatarCustomizer, setShowAvatarCustomizer] = useState(false);
  const [needsAvatarCreation, setNeedsAvatarCreation] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [needsComprehensiveAssessment, setNeedsComprehensiveAssessment] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [showTaskBasket, setShowTaskBasket] = useState(false);
  const [activeTask, setActiveTask] = useState<any>(null);
  const { toast } = useToast();

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
        const assessmentCompleted = (profileData as any)?.preferences?.assessment_completed || false;
        
        // Check if avatar has been created (buddyName exists in avatar_customization)
        const avatarCustomization = (profileData as any)?.avatar_customization;
        const hasAvatar = avatarCustomization?.buddyName;
        
        if (!hasAvatar) {
          setNeedsAvatarCreation(true);
        } else if (!interests || interests.length === 0) {
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

  const refreshProfile = async () => {
    if (!session?.user.id) return;
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .maybeSingle();
    
    if (profileData) setProfile(profileData);
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

  // Avatar creation as first step
  if (needsAvatarCreation) {
    return (
      <div className="min-h-screen bg-background">
        <AvatarCustomizer
          userId={session.user.id}
          onClose={() => {
            setNeedsAvatarCreation(false);
            setNeedsOnboarding(true);
          }}
        />
      </div>
    );
  }

  // Onboarding for new users
  if (needsOnboarding) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <ProfileSettings 
          userId={session.user.id} 
          onComplete={async () => {
            await refreshProfile();
            setNeedsOnboarding(false);
            // Check again after refresh
            const { data: updatedProfile } = await supabase
              .from("profiles")
              .select("grade_level")
              .eq("id", session.user.id)
              .single();
            if (updatedProfile?.grade_level) {
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

  const handleStartTask = (taskId: string, taskData: any) => {
    setActiveTask(taskData);
    setShowTaskBasket(false);
  };

  const handleTaskComplete = async (taskId: string) => {
    // Mark task as completed
    await supabase
      .from("task_items")
      .update({ is_completed: true })
      .eq("id", taskId);
    
    toast({
      title: "Glückwunsch! 🎉",
      description: "Du hast die Aufgabe erfolgreich abgeschlossen!",
    });
    
    setActiveTask(null);
  };

  if (showTaskBasket) {
    return (
      <div className="min-h-screen bg-background">
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowTaskBasket(false)}
          >
            ← Zurück zum Chat
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        <TaskBasket userId={session.user.id} onStartTask={handleStartTask} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Fixed Header */}
      <header className="sticky top-0 z-20 bg-background border-b">
        <div className="flex items-center justify-between p-4">
          {/* Active Task Badge */}
          {activeTask && (
            <Card className="p-3 bg-primary/10 border-primary flex-1 mr-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs font-semibold">Aktive Aufgabe</p>
                    <p className="text-xs text-muted-foreground">
                      {activeTask.package_title || "Aus Lernkorb"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTask(null)}
                >
                  Beenden
                </Button>
              </div>
            </Card>
          )}
          
          {/* Header Actions */}
          <div className="flex gap-2 ml-auto">
            {/* DEV: Manual Assessment Trigger */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNeedsComprehensiveAssessment(true)}
              className="border-orange-500 text-orange-600 hover:bg-orange-50"
            >
              🔧 DEV: Assessment starten
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowTaskBasket(true)}
            >
              <Package className="h-4 w-4 mr-2" />
              Lernkorb
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowAvatarCustomizer(true)}
            >
              <User className="h-4 w-4 mr-2" />
              Avatar
            </Button>
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
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <Chat activeTask={activeTask} onTaskComplete={handleTaskComplete} />
      </main>
      
      {showAvatarCustomizer && (
        <AvatarCustomizer
          userId={session.user.id}
          onClose={() => setShowAvatarCustomizer(false)}
        />
      )}
      
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
