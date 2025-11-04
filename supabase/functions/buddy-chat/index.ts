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
    const { messages, userId } = await req.json();
    
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
      .select("display_name, grade_level")
      .eq("id", userId)
      .single();

    // Build system prompt based on master prompt
    const systemPrompt = `Du bist ein freundlicher Lernbegleiter (Buddy), kein Lehrer oder Tutor.

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

Verbinde JEDE Lernaktivität mit den Interessen des Lerners.
Bei Frustration: "Lass uns eine Pause machen oder über etwas anderes reden."`;

    // Call Lovable AI
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
