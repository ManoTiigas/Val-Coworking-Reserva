import { createClient } from "jsr:@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json; charset=utf-8"};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
const headers=(token:string)=>({Authorization:token,"Content-Type":"application/vnd.api+json",Accept:"application/vnd.api+json"});
const money=(value:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(value/100);

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return reply({error:"Método não permitido"},405);
  const clicksignToken=Deno.env.get("CLICKSIGN_ACCESS_TOKEN")?.trim(),environment=Deno.env.get("CLICKSIGN_ENVIRONMENT"),templateKey=Deno.env.get("CLICKSIGN_TEMPLATE_KEY")?.trim(),url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!clicksignToken||!environment||!templateKey||!url||!key)return reply({error:"Assinatura digital não configurada."},503);
  const {booking_id,payment_token,action="create"}=await req.json().catch(()=>({}));
  if(typeof booking_id!=="string"||typeof payment_token!=="string")return reply({error:"Reserva inválida."},400);
  const sb=createClient(url,key),api=environment==="production"?"https://app.clicksign.com/api/v3":"https://sandbox.clicksign.com/api/v3";
  const {data:b,error}=await sb.from("bookings").select("id,booking_code,payment_token,customer_name,customer_email,customer_phone,customer_document,customer_address,company_name,amount_cents,start_at,end_at,hold_expires_at,contract_required,contract_status,clicksign_envelope_id,clicksign_document_id,clicksign_signer_id,clicksign_ready_at,spaces(name)").eq("id",booking_id).eq("payment_token",payment_token).maybeSingle();
  if(error||!b)return reply({error:"Reserva não encontrada."},404);
  if(!b.contract_required)return reply({signed:true,contract_status:"not_required"});
  if(new Date(b.hold_expires_at)<=new Date())return reply({error:"Esta reserva expirou."},409);
  if(action==="status"){
    if(!b.clicksign_envelope_id)return reply({error:"Contrato ainda não foi criado."},409);
    const response=await fetch(`${api}/envelopes/${b.clicksign_envelope_id}`,{headers:headers(clicksignToken)}),result=await response.json().catch(()=>({}));
    if(!response.ok)return reply({error:result?.errors?.[0]?.detail||"Não foi possível validar o contrato."},502);
    if(result?.data?.attributes?.status==="closed"){await sb.from("bookings").update({contract_status:"signed",contract_signed_at:new Date().toISOString()}).eq("id",b.id);return reply({signed:true,contract_status:"signed"});}
    return reply({signed:false,contract_status:b.contract_status});
  }
  if(action!=="create")return reply({error:"Ação inválida."},400);
  if(b.contract_status==="signed")return reply({signed:true,contract_status:"signed"});
  const document=String(b.customer_document||"").replace(/\D/g,"");
  if(!/^\d{11}$|^\d{14}$/.test(document)||!b.company_name||!b.customer_address)return reply({error:"Dados do responsável incompletos para o contrato."},422);
  try{
    let envelopeId=b.clicksign_envelope_id,documentId=b.clicksign_document_id,signerId=b.clicksign_signer_id;
    if(!envelopeId){const r=await fetch(`${api}/envelopes`,{method:"POST",headers:headers(clicksignToken),body:JSON.stringify({data:{type:"envelopes",attributes:{name:`Contrato mensal Val Coworking - ${b.booking_code}`,locale:"pt-BR",auto_close:true,block_after_refusal:true,deadline_at:new Date(Date.now()+7*86400000).toISOString()}}})}),j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j?.errors?.[0]?.detail||"Não foi possível criar o contrato.");envelopeId=j?.data?.id;await sb.from("bookings").update({clicksign_envelope_id:envelopeId,contract_status:"sent"}).eq("id",b.id);}
    if(!documentId){const r=await fetch(`${api}/envelopes/${envelopeId}/documents`,{method:"POST",headers:headers(clicksignToken),body:JSON.stringify({data:{type:"documents",attributes:{filename:`Contrato mensal Val Coworking - ${b.booking_code}.docx`,template:{key:templateKey,data:{NOME_ASSINANTE:b.customer_name,EMAIL_ASSINANTE:b.customer_email,TELEFONE_ASSINANTE:b.customer_phone,ENDERECO_CONTRATANTE:b.customer_address,CPF_CNPJ_ASSINANTE:document,NOME_EMPRESA:b.company_name,CNPJ_EMPRESA:document.length===14?document:"Não informado",PLANO:`${(b.spaces as any)?.name||"Espaço"} - Mensal`,PERIODO_PLANO:`${new Date(b.start_at).toLocaleDateString("pt-BR")} a ${new Date(b.end_at).toLocaleDateString("pt-BR")}`,VALOR_PLANO:money(b.amount_cents),CODIGO_SOLICITACAO:b.booking_code}},metadata:{booking_id:b.id}}}})}),j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j?.errors?.[0]?.detail||"Não foi possível gerar o contrato.");documentId=j?.data?.id;await sb.from("bookings").update({clicksign_document_id:documentId}).eq("id",b.id);}
    if(!signerId){const r=await fetch(`${api}/envelopes/${envelopeId}/signers`,{method:"POST",headers:headers(clicksignToken),body:JSON.stringify({data:{type:"signers",attributes:{name:b.customer_name,email:b.customer_email,phone_number:String(b.customer_phone).replace(/\D/g,""),has_documentation:false,refusable:true,group:1,communicate_events:{document_signed:"email",signature_request:"email",signature_reminder:"email"}}}})}),j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j?.errors?.[0]?.detail||"Não foi possível criar o signatário.");signerId=j?.data?.id;await sb.from("bookings").update({clicksign_signer_id:signerId}).eq("id",b.id);}
    if(!b.clicksign_ready_at){const relationships={document:{data:{type:"documents",id:documentId}},signer:{data:{type:"signers",id:signerId}}};for(const attributes of[{action:"agree",role:"sign"},{action:"provide_evidence",auth:"email"}]){const r=await fetch(`${api}/envelopes/${envelopeId}/requirements`,{method:"POST",headers:headers(clicksignToken),body:JSON.stringify({data:{type:"requirements",attributes,relationships}})});if(!r.ok)throw new Error("Não foi possível configurar a assinatura.");}const r=await fetch(`${api}/envelopes/${envelopeId}`,{method:"PATCH",headers:headers(clicksignToken),body:JSON.stringify({data:{id:envelopeId,type:"envelopes",attributes:{status:"running"}}})});if(!r.ok)throw new Error("Não foi possível ativar o contrato.");await sb.from("bookings").update({clicksign_ready_at:new Date().toISOString(),contract_status:"sent"}).eq("id",b.id);}
    return reply({signer_id:signerId,environment,contract_status:"sent"});
  }catch(e){return reply({error:e instanceof Error?e.message:"Não foi possível preparar o contrato."},502);}
});
