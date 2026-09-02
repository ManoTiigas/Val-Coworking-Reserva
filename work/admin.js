import{createClient}from'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const sb=createClient('https://htsnhqyhhlzqjgqlgkvt.supabase.co','sb_publishable_l1jEP6P84wREppUZwEHwSw_RRw8Ht5y');
const $=id=>document.getElementById(id);
let bookings=[];
const labels={pending_payment:'Em processo',paid:'Pago',cancelled:'Cancelado',expired:'Expirado',failed:'Falhou'};
const dateFmt=new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'});

function setMessage(id,text=''){ $(id).textContent=text; }
function showDashboard(show){$('login-view').hidden=show;$('dashboard-view').hidden=!show;}
function row(b){
  const when=`${dateFmt.format(new Date(b.start_at))} — ${new Intl.DateTimeFormat('pt-BR',{timeStyle:'short'}).format(new Date(b.end_at))}`;
  return `<tr><td><strong>${b.booking_code}</strong><small>Criada em ${dateFmt.format(new Date(b.created_at))}</small></td><td><strong>${b.customer_name}</strong><small>${b.customer_email}<br/>${b.customer_phone}</small></td><td>${b.spaces?.name||'—'}</td><td>${when}</td><td><span class="badge ${b.status}">${labels[b.status]||b.status}</span></td></tr>`;
}
function render(){
  const status=$('status-filter').value,date=$('date-filter').value;
  const items=bookings.filter(b=>(status==='all'||b.status===status)&&(!date||b.start_at.startsWith(date)));
  $('bookings-list').innerHTML=items.length?items.map(row).join(''):`<tr><td class="empty" colspan="5">Nenhuma reserva encontrada.</td></tr>`;
  $('stat-pending').textContent=bookings.filter(b=>b.status==='pending_payment').length;
  $('stat-paid').textContent=bookings.filter(b=>b.status==='paid').length;
  $('stat-cancelled').textContent=bookings.filter(b=>b.status==='cancelled').length;
  $('stat-total').textContent=bookings.length;
}
async function load(){
  setMessage('dashboard-message','Carregando reservas…');
  const {data,error}=await sb.from('bookings').select('id,booking_code,customer_name,customer_email,customer_phone,start_at,end_at,status,created_at,spaces(name)').order('start_at',{ascending:false});
  if(error){bookings=[];render();setMessage('dashboard-message',error.code==='42501'?'Seu usuário não possui permissão de administrador.':'Não foi possível carregar as reservas.');return;}
  bookings=data||[];render();setMessage('dashboard-message','');
}
async function session(){
  const {data:{session}}=await sb.auth.getSession();
  showDashboard(Boolean(session));
  if(session)load();
}
$('login-form').onsubmit=async e=>{
  e.preventDefault();setMessage('login-message','Entrando…');
  const f=new FormData(e.currentTarget);
  const {error}=await sb.auth.signInWithPassword({email:f.get('email'),password:f.get('password')});
  if(error){setMessage('login-message','E-mail ou senha inválidos.');return;}
  setMessage('login-message','');showDashboard(true);load();
};
$('sign-out').onclick=async()=>{await sb.auth.signOut();showDashboard(false);};
$('refresh').onclick=load;
$('status-filter').onchange=render;
$('date-filter').onchange=render;
sb.auth.onAuthStateChange((_event,current)=>{showDashboard(Boolean(current));if(current)load();});
session();
