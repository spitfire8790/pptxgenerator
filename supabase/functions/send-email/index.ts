// Follow this setup guide to integrate the Deno runtime and use TypeScript: https://docs.supabase.com/guides/functions/getting-started
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

// Configure with your email service provider details
const EMAIL_SERVICE = {
  PROVIDER: "sendgrid", // sendgrid, mailgun, etc.
  API_KEY: Deno.env.get("EMAIL_API_KEY") || "",
  FROM_EMAIL: Deno.env.get("FROM_EMAIL") || "reports@propertyanalysistool.com",
  FROM_NAME: Deno.env.get("FROM_NAME") || "Property Analysis Tool",
}

interface EmailPayload {
  to: string
  subject: string
  text?: string
  html?: string
  reportName: string
  status: string
  userName: string
}

async function sendWithSendGrid(payload: EmailPayload) {
  const { to, subject, text, html } = payload
  const url = "https://api.sendgrid.com/v3/mail/send"
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${EMAIL_SERVICE.API_KEY}`
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: EMAIL_SERVICE.FROM_EMAIL, name: EMAIL_SERVICE.FROM_NAME },
      subject,
      content: [
        { type: "text/plain", value: text || "" },
        { type: "text/html", value: html || "" }
      ]
    })
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`SendGrid API error: ${error}`)
  }
  
  return { success: true }
}

async function sendWithMailgun(payload: EmailPayload) {
  const { to, subject, text, html } = payload
  const domain = Deno.env.get("MAILGUN_DOMAIN") || ""
  const url = `https://api.mailgun.net/v3/${domain}/messages`
  
  const formData = new FormData()
  formData.append("from", `${EMAIL_SERVICE.FROM_NAME} <${EMAIL_SERVICE.FROM_EMAIL}>`)
  formData.append("to", to)
  formData.append("subject", subject)
  if (text) formData.append("text", text)
  if (html) formData.append("html", html)
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${btoa(`api:${EMAIL_SERVICE.API_KEY}`)}`
    },
    body: formData
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Mailgun API error: ${error}`)
  }
  
  return { success: true }
}

async function sendEmail(payload: EmailPayload) {
  try {
    switch (EMAIL_SERVICE.PROVIDER.toLowerCase()) {
      case "sendgrid":
        return await sendWithSendGrid(payload)
      case "mailgun":
        return await sendWithMailgun(payload)
      default:
        // Default to a mock implementation for development
        console.log("Email would be sent with:", payload)
        return { success: true, mock: true }
    }
  } catch (error) {
    console.error("Error sending email:", error)
    return { success: false, error: error.message }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    // Get the request body
    const payload: EmailPayload = await req.json()
    
    // Validate required fields
    if (!payload.to) {
      throw new Error("Missing required field: to")
    }
    
    const result = await sendEmail(payload)
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: result.success ? 200 : 400
    })
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400
    })
  }
})
