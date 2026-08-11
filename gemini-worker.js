export default {
  async fetch(request, env) {
    const allowed = new Set([
      "https://hhaskins01.github.io",
      "https://www.haskinsandassociates.co.za",
      "https://haskinsandassociates.co.za"
    ]);
    const origin = request.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": allowed.has(origin) ? origin : "https://hhaskins01.github.io",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Vary": "Origin"
    };
    if (request.method === "OPTIONS") return new Response(null,{headers:cors});
    if (request.method !== "POST") return new Response("Method not allowed",{status:405,headers:cors});
    if (!allowed.has(origin)) return new Response(JSON.stringify({error:"Origin not allowed"}),{status:403,headers:{...cors,"Content-Type":"application/json"}});
    if (!env.GEMINI_API_KEY) return new Response(JSON.stringify({error:"Gemini key not configured"}),{status:500,headers:{...cors,"Content-Type":"application/json"}});

    let body;
    try { body = await request.json(); } catch { return new Response(JSON.stringify({error:"Invalid request"}),{status:400,headers:{...cors,"Content-Type":"application/json"}}); }
    const message = String(body.message || "").slice(0,600);
    if (!message) return new Response(JSON.stringify({error:"Message required"}),{status:400,headers:{...cors,"Content-Type":"application/json"}});

    const system = `You are the Haskins & Associates AI Financial Concierge for a South African financial-advice practice.
Your role is informational and lead-routing only, not personalised financial advice.
Practice team:
- Hamilton Patrick Haskins — Practice Principal | Senior Financial Adviser
- Clive Wildemans — Senior Financial Adviser
- Derek Jupp — Senior Financial Adviser
- Divan Potgieter — Associate Financial Adviser
Service areas include risk/family protection, investments and wealth, retirement planning, short-term insurance, wills and estate planning, education planning, financial reviews and business assurance.
Rules:
1. Be warm, concise and professional.
2. Never claim to be a human adviser.
3. Never recommend a specific financial product, insurer, investment, fund, security, tax strategy or transaction as suitable for the visitor.
4. Never provide a quotation, premium, return promise, tax/legal conclusion, or personalised financial recommendation.
5. Do not invent Old Mutual or Haskins & Associates products, benefits, credentials, fees or facts.
6. For personalised questions, explain the general principle briefly and recommend speaking with an adviser.
7. Encourage the visitor to use the website enquiry form when they want advice, a review, a quote, a meeting or a call back.
8. Tell visitors not to enter passwords, PINs, banking credentials, ID numbers or highly sensitive personal information in chat.
9. Keep replies under 140 words unless clarity genuinely requires more.
10. Use South African English.`;

    const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
    const transcript = history.map(x => `${x.role === "assistant" ? "Assistant" : "Visitor"}: ${String(x.text||"").slice(0,500)}`).join("\n");
    const prompt = `${system}\n\nConversation so far:\n${transcript}\n\nVisitor: ${message}\nAssistant:`;

    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent";
    const resp = await fetch(url,{
      method:"POST",
      headers:{"Content-Type":"application/json","x-goog-api-key":env.GEMINI_API_KEY},
      body:JSON.stringify({
        contents:[{parts:[{text:prompt}]}],
        generationConfig:{temperature:0.35,maxOutputTokens:320}
      })
    });
    const data = await resp.json();
    if (!resp.ok) return new Response(JSON.stringify({error:"Gemini request failed"}),{status:502,headers:{...cors,"Content-Type":"application/json"}});
    const reply = data?.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("").trim();
    if (!reply) return new Response(JSON.stringify({error:"No AI response"}),{status:502,headers:{...cors,"Content-Type":"application/json"}});

    const offerLead = /(adviser|advisor|meeting|appointment|quote|review|contact|call|personalised|personalized)/i.test(message+" "+reply);
    return new Response(JSON.stringify({reply,offerLead}),{headers:{...cors,"Content-Type":"application/json"}});
  }
};