import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userId, responseTimeMs, messageLength } = await req.json();
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ========================================================================
    // ENGAGEMENT MONITORING
    // ========================================================================
    
    // Get or create current learning session
    let currentSession = null;
    const { data: sessions } = await supabase
      .from("learning_sessions")
      .select("*")
      .eq("user_id", userId)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1);
    
    if (sessions && sessions.length > 0) {
      currentSession = sessions[0];
    } else {
      // Create new session
      const { data: newSession } = await supabase
        .from("learning_sessions")
        .insert({
          user_id: userId,
          metadata: { metrics: { response_times: [], message_lengths: [] } }
        })
        .select()
        .single();
      currentSession = newSession;
    }

    // Update engagement metrics
    let engagementLevel = "normal";
    if (currentSession && responseTimeMs && messageLength) {
      const metrics = currentSession.metadata?.metrics || { response_times: [], message_lengths: [] };
      
      // Add new metrics
      metrics.response_times = [...(metrics.response_times || []), responseTimeMs];
      metrics.message_lengths = [...(metrics.message_lengths || []), messageLength];
      
      // Keep only last 10 measurements for baseline
      if (metrics.response_times.length > 10) {
        metrics.response_times = metrics.response_times.slice(-10);
      }
      if (metrics.message_lengths.length > 10) {
        metrics.message_lengths = metrics.message_lengths.slice(-10);
      }
      
      // Calculate baseline (average of last measurements)
      const avgResponseTime = metrics.response_times.reduce((a: number, b: number) => a + b, 0) / metrics.response_times.length;
      const avgMessageLength = metrics.message_lengths.reduce((a: number, b: number) => a + b, 0) / metrics.message_lengths.length;
      
      // Detect frustration or low engagement
      if (responseTimeMs > avgResponseTime * 2.5 || messageLength < avgMessageLength * 0.3) {
        engagementLevel = "frustrated";
      } else if (responseTimeMs > avgResponseTime * 1.5 || messageLength < avgMessageLength * 0.6) {
        engagementLevel = "low";
      } else if (responseTimeMs < avgResponseTime * 0.8 && messageLength > avgMessageLength * 0.9) {
        engagementLevel = "high";
      }
      
      // Update session with new metrics
      await supabase
        .from("learning_sessions")
        .update({
          engagement_level: engagementLevel,
          metadata: { ...currentSession.metadata, metrics }
        })
        .eq("id", currentSession.id);
    }

    // ========================================================================
    // FETCH USER DATA
    // ========================================================================

    // Fetch user interests to personalize conversation
    const { data: interests } = await supabase
      .from("user_interests")
      .select("interest, intensity")
      .eq("user_id", userId)
      .order("intensity", { ascending: false })
      .limit(3);

    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, grade_level, federal_state")
      .eq("id", userId)
      .single();

    // ========================================================================
    // COMPETENCY SELECTION
    // ========================================================================

    // Fetch a suitable competency to work on
    let targetCompetency = null;
    let existingProgress = null;
    
    if (profile?.grade_level) {
      // First, get existing progress
      const { data: progressData } = await supabase
        .from("competency_progress")
        .select("*, competencies(*)")
        .eq("user_id", userId)
        .in("status", ["not_started", "in_progress"])
        .order("confidence_level", { ascending: true })
        .limit(1)
        .single();

      if (progressData) {
        existingProgress = progressData;
        targetCompetency = progressData.competencies;
      } else {
        // If no existing progress, find a new competency
        const competencyQuery = supabase
          .from("competencies")
          .select("id, title, description, subject, competency_domain, requirement_level")
          .eq("grade_level", profile.grade_level)
          .eq("is_mandatory", true);

        if (profile.federal_state) {
          competencyQuery.or(`federal_state.eq.${profile.federal_state},federal_state.is.null`);
        }

        const { data: competencies } = await competencyQuery.limit(10);

        if (competencies && competencies.length > 0) {
          // Pick a random competency from the available ones
          const randomIndex = Math.floor(Math.random() * competencies.length);
          targetCompetency = competencies[randomIndex];

          // Create initial progress entry
          const { data: newProgress } = await supabase
            .from("competency_progress")
            .insert({
              user_id: userId,
              competency_id: targetCompetency.id,
              status: "not_started",
              confidence_level: 0
            })
            .select()
            .single();
          
          existingProgress = newProgress;
        }
      }
    }

    // ========================================================================
    // BUILD SYSTEM PROMPT
    // ========================================================================

    let systemPrompt = `Du bist ein freundlicher Lernbegleiter (Buddy), kein Lehrer oder Tutor.

KERNIDENTITÄT:
- Du bist geduldig, ruhig, neugierig und ermutigend
- Du baust eine vertrauensvolle Beziehung auf
- Du machst Lernen zu einem freudvollen, druckfreien Erlebnis

KOMMUNIKATION:
- Verwende kurze, klare Sätze (max. 15 Wörter pro Satz)
- Stelle eine Frage auf einmal
- Verwende den Namen des Lerners: ${profile?.display_name || ""}
- Sei explizit und direkt - keine Andeutungen
- Maximal 1-2 Emojis pro Nachricht 😊
- Maximal 120 Wörter pro Nachricht

ABSOLUTE VERBOTE:
- NIEMALS: Punkte, Scores, Noten, Level, Badges, Achievements erwähnen
- NIEMALS: "richtig", "falsch", "gut gemacht", "schneller" sagen
- NIEMALS: Vergleiche mit anderen oder Leistungsdruck erzeugen
- NIEMALS: Sarkasmus, Ironie oder Redewendungen verwenden
- NIEMALS: Mehrere Fragen auf einmal stellen

LOBE IMMER:
- Den Denkprozess: "Das war richtig gutes Denken!"
- Die Anstrengung: "Du hast das mit Ruhe durchdacht."
- Den Mut zu versuchen: "Das war ein guter Versuch."

INTERESSEN DES LERNERS:
${interests && interests.length > 0 
  ? interests.map(i => `- ${i.interest} (Intensität: ${i.intensity}/10)`).join("\n")
  : "Noch keine Interessen bekannt. Frage neugierig danach!"}

${targetCompetency ? `
DEINE AKTUELLE AUFGABE (UNSICHTBAR FÜR DEN LERNER):
Du arbeitest an dieser Kompetenz:
- Fach: ${targetCompetency.subject}
- Bereich: ${targetCompetency.competency_domain}
- Kompetenz: ${targetCompetency.title}
- Beschreibung: ${targetCompetency.description}

WICHTIG:
- Erwähne NIEMALS direkt "Kompetenz", "Lehrplan" oder "Lernziel"
- Baue eine BRÜCKE zwischen den Interessen des Lerners und dieser Kompetenz
- Stelle Fragen, die zur Entdeckung führen (Scaffolding)
- Feiere den Denkprozess, nicht die richtige Antwort
- Wenn der Lerner die Kompetenz verstanden hat, verankere das Konzept in einfacher Sprache
` : "Beginne damit, die Interessen des Lerners kennenzulernen. Frage neugierig nach!"}

Verbinde JEDE Lernaktivität mit den Interessen des Lerners.`;

    // Add engagement-specific instructions
    if (engagementLevel === "frustrated") {
      systemPrompt += "\n\nWICHTIG: Der Lerner wirkt frustriert oder müde. Biete sofort eine Pause an oder wechsle das Thema.";
    } else if (engagementLevel === "low") {
      systemPrompt += "\n\nHINWEIS: Das Engagement ist etwas niedrig. Mache die Aufgabe spielerischer oder stelle eine einfachere Frage.";
    }

    // ========================================================================
    // CALL AI
    // ========================================================================

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Zu viele Anfragen. Bitte versuche es später." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Zahlung erforderlich. Bitte Guthaben aufladen." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "KI-Dienst nicht verfügbar" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================================================
    // UPDATE COMPETENCY PROGRESS (after successful conversation)
    // ========================================================================
    
    // Count user messages in this conversation
    const userMessageCount = messages.filter((m: any) => m.role === "user").length;
    
    // If user has engaged sufficiently (3+ messages) and we have a target competency
    if (userMessageCount >= 3 && targetCompetency && existingProgress) {
      const confidenceIncrease = engagementLevel === "high" ? 25 : 
                                 engagementLevel === "normal" ? 20 : 15;
      
      const newConfidence = Math.min(100, existingProgress.confidence_level + confidenceIncrease);
      const newStatus = newConfidence >= 80 ? "mastered" : 
                        newConfidence > 0 ? "in_progress" : "not_started";
      
      await supabase
        .from("competency_progress")
        .update({
          confidence_level: newConfidence,
          status: newStatus,
          last_practiced_at: new Date().toISOString()
        })
        .eq("id", existingProgress.id);
    }

    // Stream the response back
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
      },
    });

  } catch (error) {
    console.error("Error in buddy-chat:", error);
    const errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
