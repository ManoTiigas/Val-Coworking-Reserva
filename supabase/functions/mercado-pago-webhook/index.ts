import { createClient } from "jsr:@supabase/supabase-js@2";
const encoder=new TextEncoder();
function parseSignature(value:string){const parts=Object.fromEntries(value.split(",").map(part=>{const[key,...rest]=part.trim().split("=");return[key,rest.join("=")];}));return{ts:parts.ts,v1:parts.v1};}
function toHex(bytes:Uint8Array){return Array.from(bytes,byte=>byte.toString(16).padStart(2,"0")).join("");}
function safeEqual(left:string,right:string){if(left.length!==right.length)return false;let result=0;for(let i=0;i<left.length;i+=1)result|=left.charCodeAt(i)^right.charCodeAt(i);return result===0;}
async function signatureIsValid(request:Request,orderId:string,secret:string){const value=request.headers.get("x-signature");if(!value)return false;const{ts,v1}=parseSignature(value);if(!v1)return false;const requestId=request.headers.get("x-request-id");const manifest=[orderId?`id:${orderId.toLowerCase()};`:"",requestId?`request-id:${requestId};`:"",ts?`ts:${ts};`:""].join("");const key=await crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const sig=new Uint8Array(await crypto.subtle.sign("HMAC",key,encoder.encode(manifest)));return safeEqual(toHex(sig),v1);}
Deno.serve(async request=>{
  if(request.method!=="POST")return new Response("Method not allowed",{status:405});
  const orderId=new URL(request.url).searchParams.get("data.id"),secret=Deno.env.get("MERCADO_PAGO_WEBHOOK_SECRET"),access=Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
  if(!orderId||!secret||!access)return new Response("Invalid notification",{status:400});
  if(!(await signatureIsValid(request,orderId,secret)))return new Response("Invalid signature",{status:401});
  const response=await fetch(`https://api.mercadopago.com/v1/orders/${encodeURIComponent(orderId)}`,{headers:{Authorization:`Bearer ${access}`}});
  if(!response.ok)return new Response("Order lookup failed",{status:502});
  const order=await response.json(),paid=order.status==="processed"&&order.status_detail==="accredited";
  if(!paid)return Response.json({received:true,paid:false});
  const sb=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const payment={status:"paid",paid_at:new Date().toISOString(),payment_provider:"mercado_pago"};
  const [booking,plan]=await Promise.all([
    sb.from("bookings").update(payment).eq("payment_reference",orderId).eq("status","pending_payment").select("id").maybeSingle(),
    sb.from("plan_applications").update({payment_status:"paid",paid_at:new Date().toISOString(),payment_provider:"mercado_pago"}).eq("payment_reference",orderId).neq("payment_status","paid").select("id").maybeSingle()
  ]);
  if(booking.error||plan.error){console.error("payment update failed",booking.error?.message,plan.error?.message);return new Response("Payment update failed",{status:500});}
  return Response.json({received:true,paid:true,bookingUpdated:Boolean(booking.data),planUpdated:Boolean(plan.data)});
});
