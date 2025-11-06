import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, userId } = await req.json();
    
    if (!prompt || !userId) {
      throw new Error('Missing required fields');
    }

    console.log('Generating avatar for user:', userId);
    console.log('Prompt:', prompt);

    // Call Lovable AI image generation
    const imageResponse = await fetch('https://api.lovable.app/v1/image-generation', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        width: 512,
        height: 512,
        model: 'flux.schnell'
      }),
    });

    if (!imageResponse.ok) {
      const error = await imageResponse.text();
      console.error('Image generation failed:', error);
      throw new Error(`Image generation failed: ${error}`);
    }

    const imageData = await imageResponse.json();
    console.log('Avatar generated successfully');

    return new Response(
      JSON.stringify({ 
        imageUrl: imageData.url,
        success: true 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Error generating avatar:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
