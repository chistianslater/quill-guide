import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, gradeLevel } = await req.json();
    console.log('Processing image:', imageUrl, 'for grade level:', gradeLevel);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Call Lovable AI to analyze and simplify the task
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Du bist ein hilfreicher Lernassistent, der Aufgaben für Schüler der ${gradeLevel}. Klasse vereinfacht aufbereitet. 
            Analysiere das Bild der Aufgabe und:
            1. Erkenne den Text und die Aufgabenstellung
            2. Vereinfache die Aufgabe so, dass sie für das Lernniveau verständlich ist
            3. Strukturiere die Aufgabe klar und übersichtlich
            4. Füge hilfreiche Tipps hinzu, wenn nötig
            
            Gib die Antwort im folgenden Format zurück:
            ### Aufgabe
            [Vereinfachte Aufgabenstellung]
            
            ### Hinweise
            [Hilfreiche Tipps zum Lösen]`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Bitte analysiere diese Aufgabe und bereite sie verständlich auf.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const simplifiedContent = data.choices[0].message.content;

    console.log('Task simplified successfully');

    return new Response(
      JSON.stringify({ simplifiedContent }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in simplify-task function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});