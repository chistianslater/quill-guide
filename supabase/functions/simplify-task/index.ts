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

    // Call Lovable AI to analyze and simplify the task with structured output
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
            content: `Du bist ein hilfreicher Lernassistent, der Aufgaben für Schüler der ${gradeLevel}. Klasse analysiert und strukturiert aufbereitet.
            
            Analysiere das Bild der Aufgabe und erkenne:
            1. Den Aufgabentyp (z.B. Einmaleins-Tabelle, Textaufgabe, Multiple-Choice, Lückentext)
            2. Die konkrete Aufgabenstellung
            3. Ob interaktive Elemente hilfreich wären (Tabellen, Eingabefelder, Auswahlmöglichkeiten)
            
            WICHTIG für Tabellen (wie Einmaleins):
            Das data-Objekt MUSS diese Struktur haben:
            {
              "rows": ["1", "2", "3", ...],  // Zeilen-Labels
              "columns": ["1", "2", "3", ...],  // Spalten-Labels
              "cells": [  // 2D Array: cells[rowIdx][colIdx]
                [
                  {"row": 0, "col": 0, "value": "1", "isInput": false},
                  {"row": 0, "col": 1, "isInput": true, "correctAnswer": "2"},
                  ...
                ],
                ...
              ]
            }
            - Für Felder, die ausgefüllt werden sollen: isInput=true, correctAnswer mit Lösung
            - Für vorgegebene Werte: isInput=false, value mit dem Wert
            
            Für Multiple-Choice:
            Das data-Objekt: {"question": "...", "options": [{"text": "...", "isCorrect": true/false}, ...]}
            
            Für Lückentexte:
            Erkenne den Text mit Lücken und die fehlenden Wörter/Zahlen`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analysiere diese Aufgabe und strukturiere sie für interaktives Lernen.'
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
        tools: [
          {
            type: 'function',
            function: {
              name: 'structure_task',
              description: 'Strukturiere die Aufgabe mit interaktiven Elementen',
              parameters: {
                type: 'object',
                properties: {
                  taskType: {
                    type: 'string',
                    enum: ['table', 'multiple_choice', 'fill_blanks', 'text', 'calculation'],
                    description: 'Der Typ der Aufgabe'
                  },
                  description: {
                    type: 'string',
                    description: 'Vereinfachte Beschreibung der Aufgabe'
                  },
                  interactiveElement: {
                    type: 'object',
                    properties: {
                      type: {
                        type: 'string',
                        enum: ['table', 'choices', 'inputs', 'none'],
                        description: 'Der Typ des interaktiven Elements'
                      },
                      data: {
                        type: 'object',
                        description: 'Die Daten für das interaktive Element. Für type=table: {rows: string[], columns: string[], cells: array von Zeilen mit {row, col, value?, isInput, correctAnswer?}}. Für type=choices: {question: string, options: [{text, isCorrect}]}',
                        additionalProperties: true
                      }
                    },
                    required: ['type', 'data']
                  },
                  hints: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Hilfreiche Tipps zum Lösen'
                  }
                },
                required: ['taskType', 'description', 'interactiveElement', 'hints']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'structure_task' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI Response:', JSON.stringify(data, null, 2));
    
    // Extract structured task data from tool call
    const toolCall = data.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'structure_task') {
      throw new Error('No valid structured task data returned from AI');
    }
    
    const structuredTask = JSON.parse(toolCall.function.arguments);
    console.log('Task structured successfully:', structuredTask.taskType);

    return new Response(
      JSON.stringify({ 
        simplifiedContent: structuredTask.description,
        structuredTask 
      }),
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