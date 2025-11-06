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
    const { messages, userId, responseTimeMs, messageLength, activeTask } = await req.json();
    
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
      .select("display_name, grade_level, federal_state, buddy_personality")
      .eq("id", userId)
      .single();

    // ========================================================================
    // COMPETENCY SELECTION (Priority & Weakness-Based with Subject Assessment)
    // ========================================================================

    // Fetch a suitable competency to work on
    let targetCompetency: any = null;
    let existingProgress: any = null;
    let isPrioritySubject = false;
    
    if (profile?.grade_level) {
      // First, check for priority subjects from comprehensive assessment
      const { data: priorityAssessments } = await supabase
        .from("subject_assessments")
        .select("subject, estimated_level, is_priority")
        .eq("user_id", userId)
        .eq("is_priority", true)
        .order("discrepancy", { ascending: false })
        .limit(3);

      // Priority-based selection: 
      // 1. Existing progress in priority subjects with struggles
      // 2. High struggles (AI-detected weaknesses) in any subject
      // 3. New competencies in priority subjects at estimated level
      // 4. High manual priority
      // 5. Lowest confidence in progress
      // 6. New mandatory competency
      
      // Try to find existing progress in priority subjects first
      if (priorityAssessments && priorityAssessments.length > 0) {
        const prioritySubjects = priorityAssessments.map(a => a.subject);
        
        const { data: priorityProgress } = await supabase
          .from("competency_progress")
          .select("*, competencies(*)")
          .eq("user_id", userId)
          .in("status", ["not_started", "in_progress"])
          .order("struggles_count", { ascending: false })
          .order("confidence_level", { ascending: true })
          .limit(10);

        // Filter for priority subjects
        const priorityMatches = priorityProgress?.filter(p => 
          p.competencies && prioritySubjects.includes(p.competencies.subject)
        );

        if (priorityMatches && priorityMatches.length > 0) {
          existingProgress = priorityMatches[0];
          targetCompetency = priorityMatches[0].competencies;
          isPrioritySubject = true;
        }
      }

      // If no existing priority progress, try any existing progress
      if (!targetCompetency) {
        const { data: progressData } = await supabase
          .from("competency_progress")
          .select("*, competencies(*)")
          .eq("user_id", userId)
          .in("status", ["not_started", "in_progress"])
          .order("priority", { ascending: false })
          .order("struggles_count", { ascending: false })
          .order("confidence_level", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (progressData) {
          existingProgress = progressData;
          targetCompetency = progressData.competencies;
          
          // Check if this is a priority subject
          if (priorityAssessments && targetCompetency) {
            isPrioritySubject = priorityAssessments.some(a => a.subject === targetCompetency.subject);
          }
        }
      }

      // If still no competency, create new one from priority subjects
      if (!targetCompetency && priorityAssessments && priorityAssessments.length > 0) {
        const prioritySubject = priorityAssessments[0];
        
        const competencyQuery = supabase
          .from("competencies")
          .select("id, title, description, subject, competency_domain, requirement_level")
          .eq("subject", prioritySubject.subject)
          .eq("grade_level", prioritySubject.estimated_level)
          .eq("is_mandatory", true);

        if (profile.federal_state) {
          competencyQuery.or(`federal_state.eq.${profile.federal_state},federal_state.is.null`);
        }

        const { data: competencies } = await competencyQuery.limit(10);

        if (competencies && competencies.length > 0) {
          const randomIndex = Math.floor(Math.random() * competencies.length);
          targetCompetency = competencies[randomIndex];
          isPrioritySubject = true;

          const { data: newProgress } = await supabase
            .from("competency_progress")
            .insert({
              user_id: userId,
              competency_id: targetCompetency.id,
              status: "not_started",
              confidence_level: 0,
              priority: 10,
              struggles_count: 0,
              is_priority: true,
              estimated_level: prioritySubject.estimated_level
            })
            .select()
            .maybeSingle();
          
          existingProgress = newProgress;
        }
      }

      // Final fallback: any mandatory competency at grade level
      if (!targetCompetency) {
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
          const randomIndex = Math.floor(Math.random() * competencies.length);
          targetCompetency = competencies[randomIndex];

          const { data: newProgress } = await supabase
            .from("competency_progress")
            .insert({
              user_id: userId,
              competency_id: targetCompetency.id,
              status: "not_started",
              confidence_level: 0,
              priority: 0,
              struggles_count: 0
            })
            .select()
            .maybeSingle();
          
          existingProgress = newProgress;
        }
      }
    }

    // ========================================================================
    // BUILD SYSTEM PROMPT
    // ========================================================================

    // Get buddy personality traits
    const buddyPersonality = profile?.buddy_personality || "encouraging";
    let personalityPrompt = "";

    switch (buddyPersonality) {
      case "encouraging":
        personalityPrompt = `PERSÖNLICHKEIT - ERMUTIGEND:
- Du bist wie eine unterstützende große Schwester / ein unterstützender großer Bruder
- Du baust den Lerner auf und feierst jeden Fortschritt
- Verwende motivierende Worte: "Du schaffst das!", "Weiter so!", "Toll gemacht!"
- Zeige echte Begeisterung mit Emojis wie 💪, 🌟, ✨, 🎉
- Betone immer das Positive und den Fortschritt`;
        break;
      
      case "funny":
        personalityPrompt = `PERSÖNLICHKEIT - LUSTIG:
- Du bist witzig und machst Lernen zum Spaß
- Verwende humorvolle Vergleiche und witzige Beispiele
- Spiele mit Worten und mache clevere Witze (kindgerecht!)
- Verwende lustige Emojis wie 😄, 🤪, 😅, 🥳
- Halte die Stimmung locker und leicht, aber respektvoll
- Lache auch mal über kleine Fehler (ohne auszulachen!)`;
        break;
      
      case "professional":
        personalityPrompt = `PERSÖNLICHKEIT - SACHLICH:
- Du bist fokussiert, klar und strukturiert
- Verwende präzise Sprache ohne zu viele Emojis (max. 1 pro Nachricht)
- Erkläre Schritt für Schritt und logisch aufgebaut
- Bevorzuge Beispiele, die die Logik zeigen
- Bleibe ruhig und methodisch
- Verwende neutrale Emojis wie 📚, 💡, ✓`;
        break;
      
      case "friendly":
        personalityPrompt = `PERSÖNLICHKEIT - FREUNDLICH:
- Du bist wie ein guter Freund - warmherzig und zugänglich
- Verwende eine lockere, freundschaftliche Sprache
- Zeige echtes Interesse am Leben des Lerners
- Verwende freundliche Emojis wie 😊, 🤗, 💫, 👍
- Teile manchmal auch eigene "Erfahrungen" (als Lern-Buddy)
- Mache den Lerner zum Teil eines Teams: "Lass uns zusammen..."`;
        break;
    }

    let systemPrompt = `Du bist ein freundlicher Lernbegleiter (Buddy), kein Lehrer oder Tutor.

KERNIDENTITÄT:
- Du bist geduldig, ruhig, neugierig und ermutigend
- Du baust eine vertrauensvolle Beziehung auf
- Du machst Lernen zu einem freudvollen, druckfreien Erlebnis

${personalityPrompt}

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
- Fach: ${targetCompetency.subject}${isPrioritySubject ? ' 🎯 PRIORITÄTSFACH' : ''}
- Bereich: ${targetCompetency.competency_domain}
- Kompetenz: ${targetCompetency.title}
- Beschreibung: ${targetCompetency.description}
${existingProgress?.estimated_level ? `- Niveau: Klasse ${existingProgress.estimated_level}` : ''}

${isPrioritySubject ? `
🎯 WICHTIG - PRIORITÄTSFACH:
Dieses Fach wurde als besonders wichtig für den Lerner identifiziert.
- Gehe extra behutsam vor und baue viel Ermutigung ein
- Feiere jeden kleinen Fortschritt besonders
- Erkläre Konzepte in noch kleineren Schritten
- Nutze die Interessen des Lerners intensiv als Anker
` : ''}

${existingProgress && existingProgress.struggles_count > 0 ? `
⚠️ VORSICHT: Der Lerner hatte bereits ${existingProgress.struggles_count} Schwierigkeiten mit dieser Kompetenz.
- Wähle einen völlig neuen Zugang oder Erklärungsweg
- Nutze andere Beispiele aus den Interessen
- Teile die Aufgabe in noch kleinere Schritte
- Biete mehr Unterstützung und Hilfestellungen an
` : ''}

WICHTIG:
- Erwähne NIEMALS direkt "Kompetenz", "Lehrplan" oder "Lernziel"
- Baue eine BRÜCKE zwischen den Interessen des Lerners und dieser Kompetenz
- Stelle Fragen, die zur Entdeckung führen (Scaffolding)
- Feiere den Denkprozess, nicht die richtige Antwort
- Wenn der Lerner die Kompetenz verstanden hat, verankere das Konzept in einfacher Sprache
` : "Beginne damit, die Interessen des Lerners kennenzulernen. Frage neugierig nach!"}

${activeTask ? `
🎯 AKTIVE AUFGABE AUS DEM LERNKORB:
Der Lerner arbeitet gerade an einer Aufgabe, die er hochgeladen hat.
${activeTask.package_title ? `Paket: ${activeTask.package_title}` : ''}

VEREINFACHTER INHALT DER AUFGABE:
${activeTask.simplified_content}

${activeTask.structured_task ? `
📋 INTERAKTIVE AUFGABE:
Die Aufgabe wurde als "${activeTask.structured_task.taskType}" erkannt.
Der Lerner sieht jetzt ein interaktives Element (${activeTask.structured_task.interactiveElement?.type}), mit dem er arbeiten kann.

WICHTIG FÜR DICH:
- Der Lerner kann die Aufgabe direkt im interaktiven Element bearbeiten
- Beziehe dich auf die Tabelle/Eingabefelder/Auswahlmöglichkeiten
- Sage z.B. "Schau dir die Tabelle an" oder "Füll mal die erste Zeile aus"
- Leite den Lerner an, das interaktive Element zu nutzen
- Du kannst nachfragen "Was steht in Zeile 2, Spalte 3?" etc.
- Wenn der Lerner etwas ausfüllt, gib Feedback dazu

HINWEISE FÜR DIE AUFGABE:
${activeTask.structured_task.hints?.join('\n') || 'Keine speziellen Hinweise'}
` : ''}

ORIGINALBILD DER AUFGABE:
[Siehe Bild unter: ${activeTask.original_image_url}]

DEINE AUFGABE:
- Gehe die Aufgabe SPIELERISCH und SCHRITT FÜR SCHRITT mit dem Lerner durch
- Stelle EINE Frage nach der anderen, um den Lerner zum Nachdenken anzuregen
- NIEMALS die komplette Lösung auf einmal verraten
- Nutze die Interessen des Lerners als Brücke zum Verständnis
- Feiere jeden kleinen Fortschritt und jeden guten Gedanken
- Wenn der Lerner eine Teilaufgabe verstanden hat, gehe zur nächsten über
- Am Ende fasse zusammen, was der Lerner gelernt hat
- Wenn die Aufgabe komplett verstanden und durchgearbeitet wurde, gratuliere herzlich!

METHODIK:
1. Verstehe erst, was der Lerner bereits weiß
2. Teile komplexe Aufgaben in kleine Schritte
3. Lasse den Lerner selbst Lösungen finden (mit Hints)
4. Erkläre nur, wenn wirklich nötig - Fragen sind besser
5. Verwende Beispiele aus den Interessen des Lerners
` : ''}

Verbinde JEDE Lernaktivität mit den Interessen des Lerners.`;

    // Add engagement-specific instructions
    if (engagementLevel === "frustrated") {
      systemPrompt += "\n\nWICHTIG: Der Lerner wirkt frustriert oder müde. Biete sofort eine Pause an oder wechsle das Thema.";
    } else if (engagementLevel === "low") {
      systemPrompt += "\n\nHINWEIS: Das Engagement ist etwas niedrig. Mache die Aufgabe spielerischer oder stelle eine einfachere Frage.";
    }

    // ========================================================================
    // CALL AI WITH WEAKNESS DETECTION & RETRY MECHANISM
    // ========================================================================

    // Add weakness detection instructions to system prompt
    const weaknessDetectionPrompt = `

SCHWACHSTELLENERKENNUNG (Intern - nicht erwähnen):
Achte auf folgende Signale, die auf Schwierigkeiten hindeuten:
- Unsicherheit: "Ich weiß nicht", "Vielleicht", "Ich bin mir nicht sicher"
- Fehler im Verständnis: Falsche Annahmen oder Konzeptfehler
- Frustration: Sehr kurze Antworten, wiederholte Fehler
- Explizite Aussagen: "Das verstehe ich nicht", "Das ist schwierig"

Wenn du solche Signale erkennst, passe deinen Ansatz an:
- Vereinfache die Erklärung
- Nutze andere Beispiele aus den Interessen
- Teile die Aufgabe in kleinere Schritte
`;

    const fullSystemPrompt = systemPrompt + weaknessDetectionPrompt;

    // Helper function for AI Gateway calls with retry
    const callAIGateway = async (retries = 3, delay = 1000): Promise<Response> => {
      for (let i = 0; i < retries; i++) {
        try {
          console.log(`AI Gateway call attempt ${i + 1}/${retries}`);
          
          const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: fullSystemPrompt },
                ...messages,
              ],
              stream: true,
              tools: [{
                type: "function",
                function: {
                  name: "detect_weakness",
                  description: "Erkenne Schwachstellen oder Schwierigkeiten beim Lerner",
                  parameters: {
                    type: "object",
                    properties: {
                      has_difficulty: {
                        type: "boolean",
                        description: "Hat der Lerner Schwierigkeiten mit dem aktuellen Thema?"
                      },
                      indicators: {
                        type: "array",
                        items: { type: "string" },
                        description: "Liste der erkannten Schwierigkeits-Indikatoren"
                      }
                    }
                  }
                }
              }]
            }),
          });

          if (response.ok) {
            console.log("AI Gateway call successful");
            return response;
          }

          // Don't retry on 4xx errors (client errors)
          if (response.status >= 400 && response.status < 500) {
            const errorText = await response.text();
            console.error(`AI Gateway client error ${response.status}:`, errorText);
            return response;
          }

          // Log error for 5xx (server errors) and retry
          const errorText = await response.text();
          console.error(`AI Gateway error ${response.status} (attempt ${i + 1}/${retries}):`, errorText);

          // Wait before retry with exponential backoff
          if (i < retries - 1) {
            const waitTime = delay * Math.pow(2, i);
            console.log(`Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        } catch (error) {
          console.error(`AI Gateway request failed (attempt ${i + 1}/${retries}):`, error);
          
          // Wait before retry
          if (i < retries - 1) {
            const waitTime = delay * Math.pow(2, i);
            console.log(`Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }
      
      throw new Error("AI Gateway unavailable after multiple retries");
    };

    let response: Response;
    try {
      response = await callAIGateway();
    } catch (error) {
      console.error("All AI Gateway retry attempts failed:", error);
      return new Response(
        JSON.stringify({ 
          error: "Der KI-Dienst ist momentan nicht erreichbar. Bitte versuche es in ein paar Sekunden erneut." 
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Zu viele Anfragen. Bitte versuche es in einer Minute erneut." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "KI-Guthaben aufgebraucht. Bitte Guthaben aufladen." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const errorText = await response.text();
      console.error("AI Gateway final error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Der KI-Dienst ist momentan nicht verfügbar. Bitte versuche es später erneut." }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================================================
    // ANALYZE MESSAGE FOR WEAKNESSES & UPDATE PROGRESS
    // ========================================================================
    
    // Count user messages in this conversation
    const userMessageCount = messages.filter((m: any) => m.role === "user").length;
    const lastUserMessage = messages.filter((m: any) => m.role === "user").pop()?.content || "";
    
    // Detect weakness indicators in user message
    const weaknessKeywords = [
      "weiß nicht", "verstehe nicht", "schwierig", "kompliziert", 
      "keine ahnung", "vielleicht", "unsicher", "nicht sicher",
      "zu schwer", "kann ich nicht"
    ];
    
    let hasWeakness = false;
    const detectedIndicators: string[] = [];
    
    weaknessKeywords.forEach(keyword => {
      if (lastUserMessage.toLowerCase().includes(keyword)) {
        hasWeakness = true;
        detectedIndicators.push(keyword);
      }
    });
    
    // Also detect short responses as potential frustration
    if (lastUserMessage.length < 10 && userMessageCount > 2) {
      hasWeakness = true;
      detectedIndicators.push("very_short_response");
    }

    // ========================================================================
    // TASK COMPLETION DETECTION
    // ========================================================================
    let taskCompleted = false;
    
    if (activeTask && userMessageCount >= 5) {
      // Task is considered complete if:
      // 1. At least 5 user messages (sufficient interaction)
      // 2. Low struggle count or good engagement
      const strugglesInSession = detectedIndicators.length;
      
      if (strugglesInSession === 0 || engagementLevel === "high" || engagementLevel === "normal") {
        taskCompleted = true;
        
        // Mark task as completed in database
        await supabase
          .from("task_items")
          .update({ is_completed: true })
          .eq("id", activeTask.id);
      }
    }
    
    // If user has engaged sufficiently (3+ messages) and we have a target competency
    if (userMessageCount >= 3 && targetCompetency && existingProgress) {
      const updates: any = {
        last_practiced_at: new Date().toISOString()
      };
      
      // Update weakness indicators if detected
      if (hasWeakness) {
        const currentIndicators = existingProgress.weakness_indicators || {};
        const updatedIndicators = {
          ...currentIndicators,
          last_detected: new Date().toISOString(),
          indicators: [...(currentIndicators.indicators || []), ...detectedIndicators].slice(-10)
        };
        
        updates.weakness_indicators = updatedIndicators;
        updates.struggles_count = (existingProgress.struggles_count || 0) + 1;
        updates.last_struggle_at = new Date().toISOString();
        
        // Lower confidence increase when struggling
        const confidenceIncrease = 5;
        updates.confidence_level = Math.max(0, existingProgress.confidence_level + confidenceIncrease);
        updates.status = "in_progress";
      } else {
        // Normal progress when no weakness detected
        const confidenceIncrease = engagementLevel === "high" ? 25 : 
                                   engagementLevel === "normal" ? 20 : 15;
        
        const newConfidence = Math.min(100, existingProgress.confidence_level + confidenceIncrease);
        updates.confidence_level = newConfidence;
        updates.status = newConfidence >= 80 ? "mastered" : 
                         newConfidence > 0 ? "in_progress" : "not_started";
      }
      
      await supabase
        .from("competency_progress")
        .update(updates)
        .eq("id", existingProgress.id);
    }

    // Stream the response back with task completion signal if needed
    if (taskCompleted && activeTask) {
      // Create a transformed stream that includes task completion event
      const reader = response.body!.getReader();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Stream all AI response chunks first
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
            
            // After AI response is complete, send task completion event
            const completionEvent = `data: ${JSON.stringify({ 
              type: "task_complete", 
              taskId: activeTask.id 
            })}\n\n`;
            controller.enqueue(new TextEncoder().encode(completionEvent));
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
        },
      });
    }

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
