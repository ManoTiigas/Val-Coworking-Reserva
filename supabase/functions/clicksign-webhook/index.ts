import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-clicksign-signature, content-hmac, event",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

async function hmacHex(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function sameValue(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function envelopeId(payload: any) {
  const candidates = [
    payload?.data?.id,
    payload?.data?.attributes?.envelope_id,
    payload?.envelope?.id,
    payload?.event?.data?.envelope?.id,
    payload?.event?.data?.envelope_id,
    payload?.event?.data?.document?.envelope_id,
  ];
  return candidates.find((value) => typeof value === "string" && value.length > 0) || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "Método não permitido" }, 405);

  const webhookSecret = Deno.env.get("CLICKSIGN_WEBHOOK_SECRET")?.trim();
  const clicksignToken = Deno.env.get("CLICKSIGN_ACCESS_TOKEN")?.trim();
  const environment = Deno.env.get("CLICKSIGN_ENVIRONMENT");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!webhookSecret || !clicksignToken || !environment || !supabaseUrl || !serviceKey) {
    return reply({ error: "Webhook Clicksign não configurado." }, 503);
  }

  const rawBody = await req.text();
  const supplied = (req.headers.get("x-clicksign-signature") || req.headers.get("content-hmac") || "")
    .replace(/^sha256=/i, "")
    .trim()
    .toLowerCase();
  const expected = await hmacHex(webhookSecret, rawBody);
  if (!supplied || !sameValue(supplied, expected)) return reply({ error: "Assinatura do webhook inválida." }, 401);

  const payload = JSON.parse(rawBody || "{}");
  const id = envelopeId(payload);
  if (!id) return reply({ received: true, ignored: true });

  const apiBase = environment === "production"
    ? "https://app.clicksign.com/api/v3"
    : "https://sandbox.clicksign.com/api/v3";
  const response = await fetch(`${apiBase}/envelopes/${id}`, {
    headers: {
      Authorization: clicksignToken,
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
    },
  });
  const envelope = await response.json().catch(() => ({}));
  if (!response.ok) return reply({ error: "Não foi possível validar o envelope." }, 502);

  if (envelope?.data?.attributes?.status !== "closed") return reply({ received: true, signed: false });

  const sb = createClient(supabaseUrl, serviceKey);
  const { error } = await sb
    .from("plan_applications")
    .update({ contract_status: "signed", contract_signed_at: new Date().toISOString() })
    .eq("clicksign_envelope_id", id)
    .neq("contract_status", "signed");
  if (error) return reply({ error: "Não foi possível atualizar o contrato." }, 500);

  return reply({ received: true, signed: true });
});
