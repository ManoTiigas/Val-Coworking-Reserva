import { createClient } from "jsr:@supabase/supabase-js@2";

const headers={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
const pixOutput=(order:Record<string,unknown>)=>{const payment=(order.transactions as {payments?:Array<{payment_method?:Record<string,string>}>}|undefined)?.payments?.[0]?.payment_method;return{order_id:order.id,qr_code:payment?.qr_code,qr_code_base64:payment?.qr_code_base64};};
const paid=(order:Record<string,unknown>)=>order.status==="processed"&&order.status_detail==="accredited";

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers});
  if(req.method!=="POST")return reply({error:"Método não permitido"},405);
  const access=Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN"),url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!access||!url||!key)return reply({error:"Pagamento não configurado"},503);
  const input=await req.json().catch(()=>({}));
  const {application_id,access_token,action,card_token,payment_method_id,payment_type,installments}=input;
  if(typeof application_id!=="string"||typeof access_token!=="string"||!["pix","card"].includes(action))return reply({error:"Solicitação inválida"},400);
  const sb=createClient(url,key);
  const {data:app,error}=await sb.from("plan_applications").select("id,request_code,customer_email,customer_name,amount_cents,plan_name,contract_status,payment_status,payment_reference,payment_provider").eq("id",application_id).eq("access_token",access_token).maybeSingle();
  if(error||!app)return reply({error:"Solicitação de plano não encontrada"},404);
  if(app.contract_status!=="signed")return reply({error:"Assine o contrato antes de pagar."},409);
  if(app.payment_status==="paid")return reply({paid:true,status:"paid"});
  const orderUrl=app.payment_reference?`https://api.mercadopago.com/v1/orders/${encodeURIComponent(app.payment_reference)}`:null;
  if(action==="pix"&&orderUrl){
    const prior=await fetch(orderUrl,{headers:{Authorization:`Bearer ${access}`}});
    if(prior.ok)return reply({...pixOutput(await prior.json()),paid:false});
  }
  if(action==="card"&&app.payment_reference)return reply({error:"Já existe um pagamento em processamento para este plano."},409);
  const amount=(app.amount_cents/100).toFixed(2);
  const payment=action==="pix"
    ? {amount,payment_method:{id:"pix",type:"bank_transfer"},expiration_time:"P1D"}
    : {amount,payment_method:{id:payment_method_id,type:payment_type,token:card_token,installments:Number(installments)||1}};
  if(action==="card"&&(!card_token||!payment_method_id||!["credit_card","debit_card"].includes(payment_type)))return reply({error:"Dados do cartão inválidos"},400);
  const response=await fetch("https://api.mercadopago.com/v1/orders",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json",Authorization:`Bearer ${access}`,"X-Idempotency-Key":action==="pix"?`plan-pix-${app.id}`:crypto.randomUUID()},body:JSON.stringify({type:"online",processing_mode:"automatic",total_amount:amount,external_reference:app.request_code,payer:{email:app.customer_email},description:`Plano ${app.plan_name}`,transactions:{payments:[payment]}})});
  const order=await response.json();
  if(!response.ok)return reply({error:order.message||order.cause?.[0]?.description||"Pagamento indisponível no Mercado Pago"},422);
  const nowPaid=paid(order);
  const {error:updateError}=await sb.from("plan_applications").update({payment_provider:"mercado_pago",payment_reference:order.id,payment_status:nowPaid?"paid":"processing",paid_at:nowPaid?new Date().toISOString():null}).eq("id",app.id).eq("access_token",access_token).neq("payment_status","paid");
  if(updateError)return reply({error:"Não foi possível salvar o pagamento"},500);
  return reply(action==="pix"?{...pixOutput(order),paid:nowPaid}:{order_id:order.id,paid:nowPaid,status:order.status,status_detail:order.status_detail},201);
});
