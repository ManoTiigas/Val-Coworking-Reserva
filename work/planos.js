import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const sb = createClient('https://htsnhqyhhlzqjgqlgkvt.supabase.co', 'sb_publishable_l1jEP6P84wREppUZwEHwSw_RRw8Ht5y');
const plans = {
  fiscal_monthly:{name:'Endereço Fiscal',price:'R$ 78,00',period:'Mensal'}, fiscal_annual:{name:'Endereço Fiscal',price:'R$ 698,00',period:'Anual à vista'}, fiscal_biennial:{name:'Endereço Fiscal',price:'R$ 912,00',period:'Bianual à vista'},
  premium_monthly:{name:'Plano Premium',price:'R$ 198,00',period:'Mensal'}, premium_annual:{name:'Plano Premium',price:'R$ 1.699,00',period:'Anual à vista'}, premium_biennial:{name:'Plano Premium',price:'R$ 2.199,00',period:'Bianual à vista'}
};
const $=(id)=>document.getElementById(id); const state={plan:null,application:null,widget:null};
function go(step){document.querySelectorAll('.step').forEach(el=>el.classList.toggle('active',el.dataset.step===step));const index=['plano','dados','contrato'].indexOf(step);document.querySelectorAll('.progress i').forEach((el,i)=>el.classList.toggle('active',i<=index));history.replaceState({},'',`?etapa=${step}`);window.scrollTo({top:0,behavior:'smooth'});}
function alert(message){const el=$('notice');el.textContent=message;el.hidden=!message;}
document.querySelectorAll('[data-plan]').forEach(button=>button.onclick=()=>{state.plan=button.dataset.plan;document.querySelectorAll('[data-plan]').forEach(el=>el.classList.toggle('active',el===button));alert('');});
$('continue-plan').onclick=()=>{if(!state.plan)return alert('Escolha um plano para continuar.');const p=plans[state.plan];$('plan-summary').innerHTML=`<div><span class="summary-label">Plano selecionado</span><strong>${p.name}</strong><small>${p.period}</small></div><span class="summary-price">${p.price}</span>`;go('dados');};
document.querySelectorAll('[data-back]').forEach(button=>button.onclick=()=>go(button.dataset.back));

async function signature(action){
  const {data,error}=await sb.functions.invoke('clicksign-plan-signature',{body:{application_id:state.application.id,access_token:state.application.access_token,action}});
  if(error){const details=await error.context?.json?.().catch(()=>null);throw new Error(details?.error||error.message||'Não foi possível acessar a assinatura digital.');}
  if(data?.error)throw new Error(data.error);
  return data;
}
function contractMessage(title,text,kind=''){$('contract-content').innerHTML=`<span class="contract-icon"><i class="ph ph-file-text"></i></span><h3>${title}</h3><p>${text}</p>${kind?`<p class="${kind}">Pagamento bloqueado até o contrato ser assinado.</p>`:''}`;}
function loadWidget(){return new Promise((resolve,reject)=>{if(window.Clicksign)return resolve();const script=document.createElement('script');script.src='https://cdn-public-library.clicksign.com/embedded/embedded.min-2.1.0.js';script.onload=resolve;script.onerror=()=>reject(new Error('Não foi possível carregar a assinatura digital.'));document.body.append(script);});}
async function showSigned(){
  contractMessage('Contrato assinado','Sua assinatura foi validada. O próximo passo é o pagamento do plano.');
  $('contract-actions').innerHTML='<a class="button primary" href="/planos?etapa=pagamento">Ir para pagamento <i class="ph ph-arrow-right"></i></a>';
}
async function verifySignature(){
  contractMessage('Validando assinatura…','Estamos confirmando a assinatura diretamente com a Clicksign.');
  try{const result=await signature('status');if(result.signed)return showSigned();contractMessage('Assinatura pendente','Conclua a assinatura no formulário acima. Se você já assinou, aguarde alguns segundos e tente novamente.','success');$('contract-actions').innerHTML='<button id="check-signature" class="button primary">Verificar assinatura <i class="ph ph-check"></i></button>';$('check-signature').onclick=verifySignature;}catch(error){contractMessage('Não foi possível validar',error.message);}
}
async function mountSignature(){
  contractMessage(`Contrato ${state.application.request_code}`,'Preparando o contrato para assinatura…');go('contrato');
  try{
    const result=await signature('create');
    if(result.signed)return showSigned();
    if(result.environment==='production'&&window.location.protocol!=='https:'){
      $('contract-content').innerHTML='<div class="signature-head"><span class="contract-icon"><i class="ph ph-lock-key"></i></span><div><h3>Assinatura disponível no site seguro</h3><p>A Clicksign exige HTTPS para mostrar a assinatura dentro da página. Abra esta etapa pelo site publicado.</p></div></div>';
      $('contract-actions').innerHTML='';
      return;
    }
    await loadWidget();
    $('contract-content').innerHTML='<div class="signature-head"><span class="contract-icon"><i class="ph ph-signature"></i></span><div><h3>Assine seu contrato</h3><p>Confirme sua identidade por e-mail e conclua a assinatura abaixo.</p></div></div><div id="clicksign-widget" class="clicksign-widget" aria-label="Assinatura digital"></div>';
    if(state.widget)state.widget.unmount();
    state.widget=new window.Clicksign(result.signer_id);
    state.widget.endpoint=result.environment==='production'?'https://app.clicksign.com':'https://sandbox.clicksign.com';
    state.widget.origin=window.location.origin;
    state.widget.mount('clicksign-widget');
    state.widget.on('resized',event=>{$('clicksign-widget').style.height=`${Math.max(520,event.data.height)}px`;});
    state.widget.on('signed',()=>setTimeout(verifySignature,1200));
    $('contract-actions').innerHTML='<button id="check-signature" class="button">Já assinei — verificar <i class="ph ph-check"></i></button>';
    $('check-signature').onclick=verifySignature;
  }catch(error){contractMessage('Contrato indisponível',error.message);}
}
$('plan-form').onsubmit=async(event)=>{event.preventDefault();const button=event.submitter;const form=new FormData(event.target);button.disabled=true;$('form-status').hidden=false;$('form-status').textContent='Registrando sua solicitação…';const {data,error}=await sb.rpc('create_plan_application',{p_plan_key:state.plan,p_customer_name:form.get('name'),p_customer_email:form.get('email'),p_customer_phone:form.get('phone'),p_company_name:form.get('company'),p_company_cnpj:form.get('cnpj')});button.disabled=false;if(error){$('form-status').textContent=error.message;return;}state.application=data?.[0];if(!state.application){$('form-status').textContent='Não foi possível iniciar o contrato.';return;}mountSignature();};
