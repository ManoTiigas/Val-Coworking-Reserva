import{createClient}from'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const sb=createClient('https://htsnhqyhhlzqjgqlgkvt.supabase.co','sb_publishable_l1jEP6P84wREppUZwEHwSw_RRw8Ht5y');
const $=id=>document.getElementById(id);
let bookings=[];
let canManageContracts=false;
let trashMode=false;
const labels={pending_payment:'Em processo',paid:'Pago',cancelled:'Cancelado',expired:'Expirado',failed:'Falhou'};
const dateFmt=new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'});

function setMessage(id,text=''){ $(id).textContent=text; }
function showDashboard(show){$('login-view').hidden=show;$('dashboard-view').hidden=!show;}
function row(b){
  const when=`${dateFmt.format(new Date(b.start_at))} — ${new Intl.DateTimeFormat('pt-BR',{timeStyle:'short'}).format(new Date(b.end_at))}`;
  const canCancel=['pending_payment','paid'].includes(b.status);
  const action=canCancel?`<button class="button ghost cancel-booking" type="button" data-booking-id="${b.id}" data-booking-code="${b.booking_code}"><i class="ph ph-x-circle"></i> Cancelar</button>`:trashMode&&b.status==='cancelled'?`<button class="button ghost delete-booking" type="button" data-delete-booking-id="${b.id}" data-delete-booking-code="${b.booking_code}"><i class="ph ph-trash"></i> Excluir</button>`:'—';
  return `<tr><td><strong>${b.booking_code}</strong><small>Criada em ${dateFmt.format(new Date(b.created_at))}</small></td><td><strong>${b.customer_name}</strong><small>${b.customer_email}<br/>${b.customer_phone}</small></td><td>${b.spaces?.name||'—'}</td><td>${when}</td><td><span class="badge ${b.status}">${labels[b.status]||b.status}</span></td><td>${action}</td></tr>`;
}
function render(){
  const status=$('status-filter').value,date=$('date-filter').value;
  const items=bookings.filter(b=>(trashMode?b.status==='cancelled':status==='all'||b.status===status)&&(!date||b.start_at.startsWith(date)));
  $('bookings-list').innerHTML=items.length?items.map(row).join(''):`<tr><td class="empty" colspan="6">Nenhuma reserva encontrada.</td></tr>`;
  $('stat-pending').textContent=bookings.filter(b=>b.status==='pending_payment').length;
  $('stat-paid').textContent=bookings.filter(b=>b.status==='paid').length;
  $('stat-cancelled').textContent=bookings.filter(b=>b.status==='cancelled').length;
  $('stat-total').textContent=bookings.length;
  const cancelledCount=bookings.filter(b=>b.status==='cancelled').length;
  $('trash-toggle').innerHTML=trashMode?'<i class="ph ph-arrow-left"></i> Voltar':'<i class="ph ph-trash"></i> Lixeira'+(cancelledCount?` (${cancelledCount})`:'');
  document.querySelectorAll('[data-booking-id]').forEach(button=>button.onclick=()=>cancelBooking(button.dataset.bookingId,button.dataset.bookingCode));
  document.querySelectorAll('[data-delete-booking-id]').forEach(button=>button.onclick=()=>deleteBooking(button.dataset.deleteBookingId,button.dataset.deleteBookingCode));
}
async function cancelBooking(id,code){
  if(!window.confirm(`Cancelar a reserva ${code}? Esta ação não processa estorno de pagamento.`)) return;
  setMessage('dashboard-message','Cancelando reserva…');
  const {error}=await sb.from('bookings').update({status:'cancelled'}).eq('id',id);
  if(error){setMessage('dashboard-message','Não foi possível cancelar a reserva.');return;}
  await load();
  setMessage('dashboard-message','Reserva cancelada manualmente.');
}
async function deleteBooking(id,code){
  if(!window.confirm(`Excluir definitivamente a reserva ${code}? Esta ação não pode ser desfeita.`)) return;
  setMessage('dashboard-message','Excluindo reserva…');
  const {error}=await sb.from('bookings').delete().eq('id',id);
  if(error){setMessage('dashboard-message','Não foi possível excluir a reserva.');return;}
  await load();
  setMessage('dashboard-message','Reserva excluída definitivamente.');
}
async function load(){
  setMessage('dashboard-message','Carregando reservas…');
  const {data,error}=await sb.from('bookings').select('id,booking_code,customer_name,customer_email,customer_phone,start_at,end_at,status,created_at,spaces(name)').order('start_at',{ascending:false});
  if(error){bookings=[];render();setMessage('dashboard-message',error.code==='42501'?'Acesso às reservas negado: '+error.message:'Não foi possível carregar as reservas.');return;}
  bookings=data||[];render();setMessage('dashboard-message','');
}
async function loadContractAccess(){
  const {data,error}=await sb.rpc('is_admin');
  canManageContracts=!error&&data===true;
  $('contract-upload').hidden=!canManageContracts;
  if(canManageContracts) await loadContractStatus();
}
async function loadContractStatus(){
  const status=$('contract-status');
  const {data,error}=await sb.storage.from('contracts').list('',{limit:20,sortBy:{column:'updated_at',order:'desc'}});
  const file=!error&&(data||[]).find(item=>item.name==='Contrato_VAL_COWORKING_LASFER_REVISADO_FINAL.docx');
  if(!file){
    status.innerHTML='<div><strong>Nenhum contrato salvo</strong><small>Envie o DOCX para habilitar assinaturas dos planos.</small></div>';
    return;
  }
  const updated=file.updated_at?new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(file.updated_at)):'data não disponível';
  const size=file.metadata?.size?`${(file.metadata.size/1024/1024).toFixed(2).replace('.',',')} MB`:'';
  status.innerHTML=`<div><strong><i class="ph ph-file-doc"></i> Contrato salvo e protegido</strong><small>Atualizado em ${updated}${size?` · ${size}`:''}</small></div><button id="view-contract" class="button ghost" type="button"><i class="ph ph-eye"></i> Visualizar</button>`;
  $('view-contract').onclick=async()=>{
    const button=$('view-contract');button.disabled=true;button.textContent='Abrindo…';
    const {data:signed,error:signedError}=await sb.storage.from('contracts').createSignedUrl(file.name,300);
    button.disabled=false;button.innerHTML='<i class="ph ph-eye"></i> Visualizar';
    if(signedError||!signed?.signedUrl){setMessage('contract-upload-message','Não foi possível abrir o contrato privado.');return;}
    window.open(signed.signedUrl,'_blank','noopener');
  };
}
async function session(){
  const {data:{session}}=await sb.auth.getSession();
  showDashboard(Boolean(session));
  if(session){load();loadContractAccess();}
}
$('login-form').onsubmit=async e=>{
  e.preventDefault();setMessage('login-message','Entrando…');
  const f=new FormData(e.currentTarget);
  const {error}=await sb.auth.signInWithPassword({email:f.get('email'),password:f.get('password')});
  if(error){setMessage('login-message','E-mail ou senha inválidos.');return;}
  setMessage('login-message','');showDashboard(true);load();loadContractAccess();
};
$('sign-out').onclick=async()=>{await sb.auth.signOut();showDashboard(false);};
$('refresh').onclick=()=>{load();loadContractAccess();};
$('status-filter').onchange=render;
$('date-filter').onchange=render;
$('trash-toggle').onclick=()=>{trashMode=!trashMode;$('status-filter').value='all';$('date-filter').value='';render();};
$('contract-file').onchange=event=>{$('contract-file-name').textContent=event.target.files?.[0]?.name||'Nenhum arquivo selecionado';};
$('contract-upload-form').onsubmit=async event=>{
  event.preventDefault();
  const form=event.currentTarget;
  const file=$('contract-file').files?.[0];
  if(!canManageContracts){setMessage('contract-upload-message','Seu usuário não possui permissão de administrador.');return;}
  if(!file){setMessage('contract-upload-message','Escolha o arquivo do contrato.');return;}
  if(!file.name.toLowerCase().endsWith('.docx')){setMessage('contract-upload-message','Envie um arquivo DOCX.');return;}
  if(file.size>5242880){setMessage('contract-upload-message','O contrato deve ter no máximo 5 MB.');return;}
  const button=form.querySelector('button');
  button.disabled=true;setMessage('contract-upload-message','Enviando contrato privado…');
  const {error}=await sb.storage.from('contracts').upload('Contrato_VAL_COWORKING_LASFER_REVISADO_FINAL.docx',file,{upsert:true,contentType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
  button.disabled=false;
  if(error){setMessage('contract-upload-message','Não foi possível salvar o contrato.');return;}
  form.reset();$('contract-file-name').textContent='Nenhum arquivo selecionado';await loadContractStatus();setMessage('contract-upload-message','Contrato privado salvo. Novas solicitações já usarão esta versão.');
};
sb.auth.onAuthStateChange((_event,current)=>{showDashboard(Boolean(current));if(current){load();loadContractAccess();}});
session();
