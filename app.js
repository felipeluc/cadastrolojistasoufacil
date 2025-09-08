/* Sistema Financeiro • Versão completa (localStorage)
   - Login fixo: Felipe / 1515*
   - Cartões com abas internas: Resumo | Outros | Parcelas
   - Admin dinheiro (carteiras)
   - Dashboard com cards e resumo
   - Persistência localStorage por usuário "Felipe"
*/

/* ---------- Util ---------- */
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const BRL = (v) => (Number(v||0)).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const parseNum = v => Math.round((Number(String(v||0).replace(',','.'))||0)*100)/100;
const uid = () => Math.random().toString(36).slice(2,9);
const LSKEY = 'mf_user_Felipe_v1';

/* ---------- Estado inicial ---------- */
let state = {
  salario: 2600,
  wallets: { // caixinhas
    "Caixinha Fatura Futura (Nubank)": 500,
    "Caixinha Parcelas (Nubank)": 366,
    "Mercado Pago (Casa)": 350,
    "Fatura Atual (BB)": 600,
    "Carteira Nubank": 2600 - (500+366+350+600)
  },
  cards: { // cada cartão tem: limite, gastoMeu, outros[], parcelas[]
    "Nubank": { limite: 1600, gastoMeu: 0, outros: [], parcelas: [] },
    "BB":     { limite: 1600, gastoMeu: 0, outros: [], parcelas: [] },
    "Will Bank": { limite: 800, gastoMeu: 0, outros: [], parcelas: [] },
    "Mercado Pago": { limite: 800, gastoMeu: 0, outros: [], parcelas: [] },
    "Bradesco": { limite: 800, gastoMeu: 0, outros: [], parcelas: [] }
  },
  lastUpdate: null
};

/* ---------- Persistência ---------- */
function saveState(){
  state.lastUpdate = new Date().toISOString();
  localStorage.setItem(LSKEY, JSON.stringify(state));
}
function loadState(){
  const raw = localStorage.getItem(LSKEY);
  if (raw){
    try { state = JSON.parse(raw); } catch(e){ console.error(e) }
  } else {
    saveState();
  }
}

/* ---------- Login (fixo) ---------- */
const loginScreen = $('#login-screen');
const loginForm = $('#login-form');
const loginUser = $('#login-username');
const loginPass = $('#login-password');
const loginError = $('#login-error');
const app = $('#app');

$('#btn-demo').addEventListener('click', () => {
  loginUser.value = 'Felipe';
  loginPass.value = '1515*';
});

loginForm.addEventListener('submit', (ev) => {
  ev.preventDefault();
  const u = loginUser.value.trim();
  const p = loginPass.value;
  if (u === 'Felipe' && p === '1515*'){
    loadState();
    openApp();
  } else {
    loginError.textContent = 'Usuário ou senha incorretos';
    setTimeout(()=> loginError.textContent = '', 3500);
  }
});
$('#btn-login').addEventListener('click', ()=>{/* submit triggers */});
$('#btn-logout').addEventListener('click', ()=>{
  app.classList.add('hidden');
  loginScreen.classList.remove('hidden');
  loginUser.value=''; loginPass.value='';
});

/* ---------- Navegação top ---------- */
$$('.navbtn').forEach(b=>{
  b.addEventListener('click', ()=>{
    $$('.navbtn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    const tab = b.dataset.tab;
    $$('.tabview').forEach(v=>v.classList.remove('active'));
    $(`#tab-${tab}`).classList.add('active');
    if (tab === 'cards') renderCardsList();
    if (tab === 'money') renderWallets();
    if (tab === 'dashboard') renderDashboard();
  });
});

/* ---------- Abrir app após login ---------- */
function openApp(){
  loginScreen.classList.add('hidden');
  app.classList.remove('hidden');
  $('#cfg-salario').value = state.salario;
  renderDashboard();
  renderCardsList();
  renderWallets();
  $('#last-update').textContent = new Date(state.lastUpdate||Date.now()).toLocaleString();
}

/* ---------- DASHBOARD ---------- */
function calcTotals(){
  // total dos limites usados (somatório gastoMeu + outros não pagos + parcelas restantes por cartão)
  let totalCartoes = 0;
  let meuGastoTotal = 0;
  let guardado = 0;
  Object.values(state.wallets).forEach(v => guardado += parseNum(v));
  Object.entries(state.cards).forEach(([name,c])=>{
    const outrosNaoPagos = (c.outros||[]).reduce((s,o)=> s + (o.pago?0:parseNum(o.valor)), 0);
    const parcelasRestantes = (c.parcelas||[]).reduce((s,p)=> {
      const faltam = Math.max(p.qtd - p.pagas,0);
      return s + faltam * parseNum(p.valorParcela);
    },0);
    const usado = parseNum(c.gastoMeu) + outrosNaoPagos + parcelasRestantes;
    totalCartoes += usado;
    meuGastoTotal += parseNum(c.gastoMeu);
  });
  const disponivelBB = (() => {
    const bb = state.cards['BB'] || {limite:0, gastoMeu:0, outros:[], parcelas:[]};
    const outrosNaoPagos = (bb.outros||[]).reduce((s,o)=> s + (o.pago?0:parseNum(o.valor)), 0);
    const parcelasRestantes = (bb.parcelas||[]).reduce((s,p)=> s + Math.max(p.qtd - p.pagas,0) * parseNum(p.valorParcela), 0);
    const ocupado = parseNum(bb.gastoMeu) + outrosNaoPagos + parcelasRestantes;
    return parseNum(bb.limite) - ocupado;
  })();

  return { totalCartoes, meuGastoTotal, guardado, disponivelBB };
}

function renderDashboard(){
  const t = calcTotals();
  $('#dash-total-cards').textContent = BRL(t.totalCartoes);
  $('#dash-meu-gasto').textContent = BRL(t.meuGastoTotal);
  $('#dash-disponivel-bb').textContent = BRL(t.disponivelBB);
  $('#dash-guardado').textContent = BRL(t.guardado);

  $('#last-update').textContent = new Date(state.lastUpdate||Date.now()).toLocaleString();

  // quick summary list
  const quick = $('#quick-summary');
  quick.innerHTML = '';
  Object.entries(state.wallets).forEach(([k,v])=>{
    const div = document.createElement('div');
    div.className = 'wallet';
    div.innerHTML = `<strong>${k}</strong><div class="muted tiny">${BRL(v)}</div>`;
    quick.appendChild(div);
  });
}

/* ---------- CARDS (lista) ---------- */
$('#btn-new-card').addEventListener('click', ()=>{
  const name = prompt('Nome do cartão (ex: Nubank)');
  if (!name) return;
  if (state.cards[name]) return alert('Cartão já existe');
  state.cards[name] = { limite: 0, gastoMeu: 0, outros: [], parcelas: [] };
  saveState(); renderCardsList(); renderDashboard();
});

function renderCardsList(){
  const wrap = $('#cards-list');
  wrap.innerHTML = '';
  Object.entries(state.cards).forEach(([name, card])=>{
    const el = document.createElement('div');
    el.className = 'card-card';
    el.innerHTML = cardTemplate(name, card);
    wrap.appendChild(el);

    // hook subtabs
    const tabs = el.querySelectorAll('.card-tab');
    const panes = el.querySelectorAll('.card-pane');
    tabs.forEach(t=>{
      t.addEventListener('click', ()=>{
        tabs.forEach(x=>x.classList.remove('active'));
        panes.forEach(p=>p.classList.remove('active'));
        t.classList.add('active');
        el.querySelector(`#pane-${cssId(name)}-${t.dataset.p}`).classList.add('active');
      });
    });

    // hooks inside the card
    // limit & gastoMeu
    el.querySelectorAll('input[data-f]').forEach(inp=>{
      inp.addEventListener('change', async ()=>{
        const key = inp.dataset.f;
        const val = parseNum(inp.value);
        if (key === 'limite') state.cards[name].limite = val;
        if (key === 'gastoMeu') state.cards[name].gastoMeu = val;
        await saveAndRefresh();
      });
    });

    // add other person expense
    el.querySelector(`[data-act="add-outro"]`).addEventListener('click', async ()=>{
      const nn = el.querySelector(`[data-fout="nome"]`).value.trim();
      const obs = el.querySelector(`[data-fout="obs"]`).value.trim();
      const v = parseNum(el.querySelector(`[data-fout="valor"]`).value);
      if (!nn || v <= 0) { alert('Nome e valor válidos'); return; }
      state.cards[name].outros.push({ id: uid(), nome: nn, obs, valor: v, pago: false });
      state.cards[name].gastoMeu = parseNum(state.cards[name].gastoMeu) ; // não altera aqui
      await saveAndRefresh();
      // clear
      el.querySelector(`[data-fout="nome"]`).value=''; el.querySelector(`[data-fout="obs"]`).value=''; el.querySelector(`[data-fout="valor"]`).value='';
    });

    // toggle pago/outro delete
    el.querySelectorAll('[data-out-action]').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const parts = btn.dataset.outAction.split('|'); // cmd|id
        const cmd = parts[0], id = parts[1];
        if (cmd === 'toggle'){
          const it = state.cards[name].outros.find(o=>o.id===id);
          if (it){ it.pago = !it.pago; await saveAndRefresh(); }
        } else if (cmd === 'del'){
          state.cards[name].outros = state.cards[name].outros.filter(o=>o.id!==id);
          await saveAndRefresh();
        }
      });
    });

    // parcels: add
    el.querySelector('[data-act="add-parc"]').addEventListener('click', async ()=>{
      const descricao = el.querySelector('[data-par="desc"]').value.trim();
      const valorParc = parseNum(el.querySelector('[data-par="valor"]').value);
      const qtd = parseInt(el.querySelector('[data-par="qtd"]').value||'0',10);
      const pagas = parseInt(el.querySelector('[data-par="pagas"]').value||'0',10);
      if (!descricao || valorParc<=0 || qtd<=0) { alert('Preencha parcelas corretamente'); return; }
      state.cards[name].parcelas.push({ id: uid(), descricao, valorParcela: valorParc, qtd, pagas: Math.min(pagas,qtd) });
      await saveAndRefresh();
      el.querySelector('[data-par="desc"]').value=''; el.querySelector('[data-par="valor"]').value=''; el.querySelector('[data-par="qtd"]').value=''; el.querySelector('[data-par="pagas"]').value='';
    });

    // parcel actions (pay one / del)
    el.querySelectorAll('[data-par-action]').forEach(b=>{
      b.addEventListener('click', async ()=>{
        const [cmd,id] = b.dataset.parAction.split('|');
        const item = state.cards[name].parcelas.find(p=>p.id===id);
        if (!item) return;
        if (cmd === 'pay'){ item.pagas = Math.min(item.pagas + 1, item.qtd); }
        if (cmd === 'del'){ state.cards[name].parcelas = state.cards[name].parcelas.filter(x=>x.id!==id); }
        await saveAndRefresh();
      });
    });

    // delete card
    el.querySelector('[data-act="del-card"]').addEventListener('click', async ()=>{
      if (!confirm(`Excluir cartão ${name}?`)) return;
      delete state.cards[name];
      await saveAndRefresh();
      renderCardsList();
    });
  });
}

function cardTemplate(name, c){
  const outros = (c.outros||[]);
  const parcelas = (c.parcelas||[]);
  const outrosTotalNaoPagos = outros.reduce((s,o)=> s + (o.pago?0:parseNum(o.valor)), 0);
  const parcelasRestantesTotal = parcelas.reduce((s,p)=> s + Math.max(p.qtd - p.pagas,0) * parseNum(p.valorParcela), 0);
  const usado = parseNum(c.gastoMeu) + outrosTotalNaoPagos + parcelasRestantesTotal;
  const disponivel = parseNum(c.limite) - usado;
  return `
    <div class="card-head">
      <div class="card-title"><svg width="36" height="36" viewBox="0 0 24 24" style="opacity:.9"><rect x="1" y="1" width="22" height="22" rx="6" fill="white" opacity="0.03"/></svg><div><strong>${name}</strong><div class="muted tiny">${c.limite? 'Limite: ' + BRL(c.limite) : 'Defina limite'}</div></div></div>
      <div>
        <div class="muted tiny">Disponível</div>
        <div style="font-weight:700">${BRL(disponivel)}</div>
      </div>
    </div>

    <div class="card-body">
      <div class="kpis">
        <div class="kpi"><div class="label">Limite</div><div class="val">${BRL(c.limite)}</div></div>
        <div class="kpi"><div class="label">Seu gasto</div><div class="val">${BRL(c.gastoMeu)}</div></div>
        <div class="kpi"><div class="label">Outros (não pagos)</div><div class="val">${BRL(outrosTotalNaoPagos)}</div></div>
        <div class="kpi"><div class="label">Parcelas restantes</div><div class="val">${BRL(parcelasRestantesTotal)}</div></div>
      </div>

      <div class="card-tabs" style="margin-top:14px">
        <button class="card-tab active" data-p="resumo">Resumo</button>
        <button class="card-tab" data-p="outros">Outros</button>
        <button class="card-tab" data-p="parcelas">Parcelas</button>
      </div>

      <div id="pane-${cssId(name)}-resumo" class="card-pane active" style="margin-top:12px">
        <div class="muted">Ajustes rápidos</div>
        <div class="form-inline" style="margin-top:8px">
          <input data-f="limite" type="number" placeholder="Limite R$" value="${c.limite||0}" />
          <input data-f="gastoMeu" type="number" placeholder="Seu gasto R$" value="${c.gastoMeu||0}" />
          <button class="btn" data-act="del-card">Excluir</button>
        </div>
        <div style="margin-top:12px" class="muted tiny">Cálculo: Limite − (Seu gasto + Outros não pagos + Parcelas restantes) = Disponível</div>
      </div>

      <div id="pane-${cssId(name)}-outros" class="card-pane" style="display:none; margin-top:12px">
        <div class="muted">Adicionar gasto de outra pessoa</div>
        <div class="form-inline" style="margin-top:8px">
          <input data-fout="nome" placeholder="Nome" />
          <input data-fout="valor" type="number" placeholder="Valor R$" />
          <button class="btn" data-act="add-outro">Adicionar</button>
        </div>
        <table class="small-table" style="margin-top:10px">
          <thead><tr><th>Nome</th><th>Valor</th><th>Pago?</th><th></th></tr></thead>
          <tbody>
            ${outros.map(o=> `<tr>
              <td>${o.nome}${o.obs? ' • <span class="muted tiny">'+o.obs+'</span>':''}</td>
              <td>${BRL(o.valor)}</td>
              <td><button class="btn small" data-out-action="toggle|${o.id}">${o.pago? 'Desmarcar':'Marcar pago'}</button></td>
              <td><button class="btn small" data-out-action="del|${o.id}">Excluir</button></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>

      <div id="pane-${cssId(name)}-parcelas" class="card-pane" style="display:none; margin-top:12px">
        <div class="muted">Adicionar compra parcelada (vinculada a este cartão)</div>
        <div class="form-inline" style="margin-top:8px">
          <input data-par="desc" placeholder="Descrição" />
          <input data-par="valor" type="number" placeholder="Valor parcela R$" />
          <input data-par="qtd" type="number" placeholder="Qtd" />
          <input data-par="pagas" type="number" placeholder="Pagas" />
          <button class="btn" data-act="add-parc">Adicionar</button>
        </div>

        <table class="small-table" style="margin-top:10px">
          <thead><tr><th>Desc</th><th>Parc.</th><th>Valor</th><th>Restam</th><th></th></tr></thead>
          <tbody>
            ${parcelas.map(p=> `<tr>
              <td>${p.descricao}</td>
              <td>${p.pagas}/${p.qtd}</td>
              <td>${BRL(p.valorParcela)}</td>
              <td>${BRL(Math.max(p.qtd - p.pagas,0) * parseNum(p.valorParcela))}</td>
              <td>
                <button class="btn small" data-par-action="pay|${p.id}">+1</button>
                <button class="btn small" data-par-action="del|${p.id}">Excluir</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>

      </div>

    </div>
  `;
}

/* ---------- helpers ---------- */
function cssId(name){ return name.replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_]/g,''); }

async function saveAndRefresh(){
  saveState();
  renderCardsList();
  renderDashboard();
}

/* ---------- WALLETS (admin dinheiro) ---------- */
$('#wallet-add').addEventListener('click', ()=>{
  const name = $('#wallet-name').value.trim();
  const val = parseNum($('#wallet-value').value);
  if (!name) return alert('Nome vazio');
  state.wallets[name] = val;
  $('#wallet-name').value=''; $('#wallet-value').value='';
  saveAndRefresh(); renderWallets();
});

function renderWallets(){
  const wrap = $('#wallets-list'); wrap.innerHTML='';
  Object.entries(state.wallets).forEach(([k,v])=>{
    const el = document.createElement('div'); el.className='wallet';
    el.innerHTML = `<strong>${k}</strong><div class="muted tiny">${BRL(v)}</div>
      <div style="margin-top:8px"><button class="btn small" data-wact="edit|${k}">Editar</button> <button class="btn small" data-wact="del|${k}">Excluir</button></div>`;
    wrap.appendChild(el);
  });
  // hooks
  $$('[data-wact]').forEach(b=>{
    b.addEventListener('click', ()=>{
      const [cmd,k] = b.dataset.wact.split('|');
      if (cmd==='del'){ delete state.wallets[k]; saveAndRefresh(); renderWallets(); }
      if (cmd==='edit'){
        const novo = prompt('Novo valor R$', state.wallets[k]);
        if (novo!==null){ state.wallets[k] = parseNum(novo); saveAndRefresh(); renderWallets(); }
      }
    });
  });
}

/* ---------- CONFIG ---------- */
$('#cfg-save').addEventListener('click', ()=>{
  state.salario = parseNum($('#cfg-salario').value);
  saveAndRefresh();
  alert('Salário salvo');
});

/* ---------- startup ---------- */
(function init(){
  // preload saved state if present
  loadState();

  // keep login visible initially
  loginScreen.classList.remove('hidden');
  app.classList.add('hidden');
})();
