// Follow this setup guide to integrate the Deno runtime and use TypeScript: https://docs.supabase.com/guides/functions/getting-started
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

const EMAIL_SERVICE = {
  PROVIDER: Deno.env.get("EMAIL_PROVIDER") || "",
  API_KEY: Deno.env.get("EMAIL_API_KEY") || "",
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    // Check if email service is configured
    const available = !!EMAIL_SERVICE.PROVIDER && !!EMAIL_SERVICE.API_KEY
    
    // Return the status of the email service
    return new Response(
      JSON.stringify({
        available,
        provider: EMAIL_SERVICE.PROVIDER ? EMAIL_SERVICE.PROVIDER : undefined
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ available: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
