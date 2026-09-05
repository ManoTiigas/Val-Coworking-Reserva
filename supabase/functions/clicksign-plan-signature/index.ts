import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const clicksignHeaders = (token: string) => ({ Authorization: token, "Content-Type": "application/vnd.api+json", Accept: "application/vnd.api+json" });
const money = (amount: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount / 100);

async function resolveTemplateKey(apiBase: string, token: string) {
  const configured = Deno.env.get("CLICKSIGN_TEMPLATE_KEY")?.trim();
  if (configured) return configured;
  const response = await fetch(`${apiBase}/templates?page[size]=50`, { headers: clicksignHeaders(token) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.errors?.[0]?.detail || "Não foi possível localizar o modelo privado da Clicksign.");
  const templates = result?.data || [];
  const matches = templates.filter((template: any) => {
    const name = String(template?.attributes?.name || "").toLowerCase();
    return name.includes("contrato") && (name.includes("val") || name.includes("coworking"));
  });
  const selected = matches.length === 1 ? matches[0] : templates.length === 1 ? templates[0] : null;
  if (selected?.id) return selected.id;
  throw new Error("Modelo dinâmico não localizado. Salve a chave do modelo privado em CLICKSIGN_TEMPLATE_KEY.");
}

function digits(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "Método não permitido" }, 405);

  const clicksignToken = Deno.env.get("CLICKSIGN_ACCESS_TOKEN")?.trim();
  const environment = Deno.env.get("CLICKSIGN_ENVIRONMENT");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!clicksignToken || !environment || !supabaseUrl || !serviceKey) return reply({ error: "Assinatura digital não configurada." }, 503);
  if (!/^[\x21-\x7E]+$/.test(clicksignToken)) return reply({ error: "O token da Clicksign contém caractere inválido." }, 503);
  const apiBase = environment === "production" ? "https://app.clicksign.com/api/v3" : "https://sandbox.clicksign.com/api/v3";
  const { application_id, access_token, action = "create" } = await req.json().catch(() => ({}));

  if (action === "health") {
    try { await resolveTemplateKey(apiBase, clicksignToken); return reply({ configured: true, environment, dynamic_contract: true }); }
    catch (error) { return reply({ configured: true, environment, dynamic_contract: false, error: error instanceof Error ? error.message : "Modelo dinâmico indisponível." }); }
  }
  if (typeof application_id !== "string" || typeof access_token !== "string") return reply({ error: "Solicitação de plano inválida." }, 400);

  const sb = createClient(supabaseUrl, serviceKey);
  const { data: app, error: lookupError } = await sb.from("plan_applications")
    .select("id,request_code,access_token,plan_name,amount_cents,billing_label,customer_name,customer_email,customer_phone,customer_document,company_name,company_cnpj,contract_status,clicksign_envelope_id,clicksign_document_id,clicksign_signer_id,clicksign_ready_at")
    .eq("id", application_id).eq("access_token", access_token).maybeSingle();
  if (lookupError || !app) return reply({ error: "Solicitação não encontrada." }, 404);

  const checkStatus = async () => {
    if (!app.clicksign_envelope_id) return reply({ error: "Contrato ainda não foi criado." }, 409);
    const response = await fetch(`${apiBase}/envelopes/${app.clicksign_envelope_id}`, { headers: clicksignHeaders(clicksignToken) });
    const envelope = await response.json().catch(() => ({}));
    if (!response.ok) return reply({ error: envelope?.errors?.[0]?.detail || "Não foi possível validar o contrato." }, 502);
    if (envelope?.data?.attributes?.status === "closed") {
      await sb.from("plan_applications").update({ contract_status: "signed", contract_signed_at: new Date().toISOString() }).eq("id", app.id);
      return reply({ signed: true, contract_status: "signed" });
    }
    return reply({ signed: false, contract_status: app.contract_status || "sent" });
  };
  if (action === "status") return await checkStatus();
  if (action !== "create") return reply({ error: "Ação inválida." }, 400);
  if (app.contract_status === "signed") return reply({ signed: true, contract_status: "signed" });

  const customerDocument = digits(app.customer_document);
  if (!/^(\d{11}|\d{14})$/.test(customerDocument)) return reply({ error: "CPF ou CNPJ do responsável é obrigatório para gerar o contrato." }, 422);

  try {
    const templateKey = await resolveTemplateKey(apiBase, clicksignToken);

    let envelopeId = app.clicksign_envelope_id;
    let documentId = app.clicksign_document_id;
    let signerId = app.clicksign_signer_id;
    if (!envelopeId) {
      const response = await fetch(`${apiBase}/envelopes`, { method: "POST", headers: clicksignHeaders(clicksignToken), body: JSON.stringify({ data: { type: "envelopes", attributes: { name: `Contrato Val Coworking - ${app.request_code}`, locale: "pt-BR", auto_close: true, block_after_refusal: true, deadline_at: new Date(Date.now() + 7 * 86400000).toISOString() } } }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.errors?.[0]?.detail || "Não foi possível criar o contrato.");
      envelopeId = result?.data?.id;
      if (!envelopeId) throw new Error("Clicksign não retornou o identificador do contrato.");
      await sb.from("plan_applications").update({ clicksign_envelope_id: envelopeId, contract_status: "sent" }).eq("id", app.id);
    }
    if (!documentId) {
      const templateData = {
        NOME_ASSINANTE: app.customer_name,
        TELEFONE_ASSINANTE: app.customer_phone,
        CPF_CNPJ_ASSINANTE: customerDocument,
        NOME_EMPRESA: app.company_name || "Não informado",
        CNPJ_EMPRESA: app.company_cnpj || (customerDocument.length === 14 ? customerDocument : "Não informado"),
        PLANO: app.plan_name,
        PERIODO_PLANO: app.billing_label,
        VALOR_PLANO: money(app.amount_cents),
        CODIGO_SOLICITACAO: app.request_code,
      };
      const response = await fetch(`${apiBase}/envelopes/${envelopeId}/documents`, { method: "POST", headers: clicksignHeaders(clicksignToken), body: JSON.stringify({ data: { type: "documents", attributes: { filename: `Contrato Val Coworking - ${app.request_code}.docx`, template: { key: templateKey, data: templateData }, metadata: { request_code: app.request_code, plan_application_id: app.id } } } }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.errors?.[0]?.detail || "Não foi possível gerar o contrato pelo modelo.");
      documentId = result?.data?.id;
      if (!documentId) throw new Error("Clicksign não retornou o documento.");
      await sb.from("plan_applications").update({ clicksign_document_id: documentId }).eq("id", app.id);
    }
    if (!signerId) {
      const response = await fetch(`${apiBase}/envelopes/${envelopeId}/signers`, { method: "POST", headers: clicksignHeaders(clicksignToken), body: JSON.stringify({ data: { type: "signers", attributes: { name: app.customer_name, email: app.customer_email, phone_number: digits(app.customer_phone), has_documentation: false, refusable: true, group: 1, communicate_events: { document_signed: "email", signature_request: "email", signature_reminder: "email" } } } }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.errors?.[0]?.detail || "Não foi possível criar o signatário.");
      signerId = result?.data?.id;
      if (!signerId) throw new Error("Clicksign não retornou o signatário.");
      await sb.from("plan_applications").update({ clicksign_signer_id: signerId }).eq("id", app.id);
    }
    if (!app.clicksign_ready_at) {
      const relationships = { document: { data: { type: "documents", id: documentId } }, signer: { data: { type: "signers", id: signerId } } };
      for (const attributes of [{ action: "agree", role: "sign" }, { action: "provide_evidence", auth: "email" }]) {
        const response = await fetch(`${apiBase}/envelopes/${envelopeId}/requirements`, { method: "POST", headers: clicksignHeaders(clicksignToken), body: JSON.stringify({ data: { type: "requirements", attributes, relationships } }) });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result?.errors?.[0]?.detail || "Não foi possível configurar a assinatura.");
      }
      const response = await fetch(`${apiBase}/envelopes/${envelopeId}`, { method: "PATCH", headers: clicksignHeaders(clicksignToken), body: JSON.stringify({ data: { id: envelopeId, type: "envelopes", attributes: { status: "running" } } }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.errors?.[0]?.detail || "Não foi possível ativar o contrato.");
      await sb.from("plan_applications").update({ clicksign_ready_at: new Date().toISOString(), contract_status: "sent" }).eq("id", app.id);
    }
    return reply({ signer_id: signerId, environment, contract_status: "sent" });
  } catch (error) {
    console.error("clicksign-plan-signature", error);
    return reply({ error: error instanceof Error ? error.message : "Não foi possível preparar o contrato." }, 502);
  }
});
