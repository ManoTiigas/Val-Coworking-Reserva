import{createClient}from'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const sb=createClient('https://htsnhqyhhlzqjgqlgkvt.supabase.co','sb_publishable_l1jEP6P84wREppUZwEHwSw_RRw8Ht5y');
const $=x=>document.getElementById(x);
const s={space:null,date:new Date(),day:null,hour:null,customer:null,booking:null};
const steps=['espaco','agenda','dados','contrato','pagamento'];
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const at=(d,h)=>new Date(`${iso(d)}T${String(h).padStart(2,'0')}:00-03:00`);

function notice(message){
  const el=$('site-notice');
  el.innerHTML=message?'<i class="ph ph-x-circle notice-icon"></i><span class="notice-copy"><b class="notice-title">Atenção</b><span>'+message+'</span></span>':'';
  el.hidden=!message;
}
function go(step){
  notice('');
  const n=steps.indexOf(step);
  history.pushState({},'',`?etapa=${step}`);
  document.querySelectorAll('.step').forEach(x=>x.classList.toggle('active',x.dataset.step===step));
  document.querySelectorAll('.progress i').forEach((x,i)=>x.classList.toggle('active',i<=n));
  window.scrollTo({top:0,behavior:'smooth'});
}
function summary(){
  if(!s.space||!s.day||s.hour===null)return;
  $('selection-summary').innerHTML=`<b>${s.space.name}</b><br>${s.day.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'})}<br>${String(s.hour).padStart(2,'0')}:00 às ${String(s.hour+1).padStart(2,'0')}:00`;
}
function contractSummary(){
  if(!s.customer||!s.booking)return;
  $('contract-summary').innerHTML=`<b>Reserva ${s.booking.booking_code}</b><br>${s.customer.name}<br>${s.customer.email}`;
}
async function loadSpaces(){
  const{data,error}=await sb.from('spaces').select('id,name,capacity').eq('active',true).order('name');
  if(error)return notice('Não foi possível carregar os espaços. Tente novamente.');
  $('spaces').innerHTML=data.map(x=>`<button class="choice" data-space="${x.id}"><b>${x.name}</b><small>Até ${x.capacity} ${x.capacity===1?'pessoa':'pessoas'}</small></button>`).join('');
  document.querySelectorAll('[data-space]').forEach(b=>b.onclick=()=>{
    s.space=data.find(x=>x.id===b.dataset.space);
    document.querySelectorAll('[data-space]').forEach(x=>x.classList.toggle('active',x===b));
  });
}
function calendar(){
  const first=new Date(s.date.getFullYear(),s.date.getMonth(),1);
  const today=new Date();today.setHours(0,0,0,0);
  const days=new Date(s.date.getFullYear(),s.date.getMonth()+1,0).getDate();
  $('month-label').textContent=first.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
  $('calendar').innerHTML=Array(first.getDay()).fill('<i></i>').join('')+Array.from({length:days},(_,i)=>{
    const d=new Date(s.date.getFullYear(),s.date.getMonth(),i+1);
    const off=d<today||d.getDay()===0;
    const chosen=s.day&&iso(d)===iso(s.day);
    return `<button class="day ${chosen?'active':''}" data-day="${iso(d)}" ${off?'disabled':''}>${d.getDate()}</button>`;
  }).join('');
  document.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>{
    s.day=new Date(`${b.dataset.day}T12:00:00`);
    s.hour=null;calendar();times();
  });
}
async function times(){
  if(!s.space||!s.day){$('time-help').textContent='Selecione primeiro um espaço e uma data.';return;}
  $('time-help').textContent='Escolha um horário disponível.';
  const{data,error}=await sb.rpc('get_occupied_slots',{p_space_id:s.space.id,p_from:at(s.day,0).toISOString(),p_to:at(new Date(s.day.getTime()+86400000),0).toISOString()});
  if(error){$('time-help').textContent='Não foi possível consultar os horários. Tente novamente.';return;}
  const hours=s.day.getDay()===6?[8,9,10,11,12]:[8,9,10,11,13,14,15,16,17];
  $('times').innerHTML=hours.map(h=>{
    const a=at(s.day,h),z=at(s.day,h+1);
    const busy=data.some(x=>new Date(x.start_at)<z&&new Date(x.end_at)>a);
    return `<button class="time ${s.hour===h?'active':''}" data-hour="${h}" ${busy?'disabled':''}>${String(h).padStart(2,'0')}:00</button>`;
  }).join('');
  document.querySelectorAll('[data-hour]').forEach(b=>b.onclick=()=>{s.hour=+b.dataset.hour;times();summary();});
}
document.querySelectorAll('[data-next]').forEach(b=>b.onclick=()=>{
  const n=b.dataset.next;
  if(n==='agenda'&&!s.space)return notice('Escolha um espaço para continuar.');
  if(n==='dados'&&(!s.day||s.hour===null))return notice('Escolha a data e o horário para continuar.');
  summary();go(n);
});
document.querySelectorAll('[data-back]').forEach(b=>b.onclick=()=>go(b.dataset.back));
$('prev-month').onclick=()=>{s.date=new Date(s.date.getFullYear(),s.date.getMonth()-1,1);calendar();};
$('next-month').onclick=()=>{s.date=new Date(s.date.getFullYear(),s.date.getMonth()+1,1);calendar();};
$('booking-form').onsubmit=async e=>{
  e.preventDefault();
  const f=new FormData(e.target),button=e.submitter;
  s.customer={name:f.get('name'),email:f.get('email'),phone:f.get('phone')};
  button.disabled=true;$('form-status').textContent='Retendo seu horário…';
  const{data,error}=await sb.rpc('create_booking_hold',{p_space_id:s.space.id,p_start_at:at(s.day,s.hour).toISOString(),p_end_at:at(s.day,s.hour+1).toISOString(),p_customer_name:s.customer.name,p_customer_email:s.customer.email,p_customer_phone:s.customer.phone});
  button.disabled=false;
  if(error){$('form-status').textContent=error.message;return;}
  s.booking=data[0];
  $('form-status').textContent='';
  contractSummary();
  $('payment-summary').innerHTML=`<b>Reserva ${s.booking.booking_code}</b><br>Horário retido por 24 horas.`;
  go('contrato');
};
loadSpaces();calendar();go('espaco');