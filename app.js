/* =========================================================
   Meu Financeiro – App JS
   - Responsivo, minimalista, pronto para Firebase
   - Persistência localStorage se Firebase não estiver configurado
   ========================================================= */

/** ===== Firebase (opcional) =====
 *  Para ativar, descomente os scripts no index.html e preencha abaixo.
 *  Se não preencher, o app usa localStorage e tudo funciona localmente.
 */
// const firebaseConfig = {
//   apiKey: "...",
//   authDomain: "...",
//   projectId: "...",
// };
// let db = null;
// try {
//   firebase.initializeApp(firebaseConfig);
//   db = firebase.firestore();
// } catch(e){ db = null; }

/** ===== Util ===== */
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
const BRL = v => (v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const parseNum = v => Number(String(v||'').replace(',','.'))||0;
const uid = () => Math.random().toString(36).slice(2,10);
const today = () => new Date();
const sha256 = async (text) => {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
};

const DEFAULT_USER = { username:'Felipe', passHash:null }; // senha fixa abaixo
const DEFAULT_SALARIO = 2600;
const DEFAULT_CARDS = ['Nubank','BB','Will Bank','Mercado Pago','Bradesco'];

/** ===== Estado ===== */
let state = {
  currentUser: null, // username
  salarioPadrao: DEFAULT_SALARIO,
  saldos: { // Administração de dinheiro (editável)
    "Caixinha Fatura Futura (Nubank)": 0,
    "Caixinha Parcelas (Nubank)": 0,
    "Carteira Nubank": 0,
    "Mercado Pago (Casa)": 0,
    "Fatura Atual (BB)": 0
  },
  cards: {},         // por cartão: {limite, atual, processando, outros[], cobertas}
  installments: [],  // {id, name, bank, total, qtd, pagas}
  home: {            // Casa
    saldoInicial: 0,
    pensao: 0,
    itens: []        // {id, nome, valor, dia, pago}
  },
  users: [DEFAULT_USER] // lista de usuários (Felipe fixo + demais criados)
};

/** ===== Storage Layer (Firestore ou local) ===== */
const storage = {
  key(u){ return `mf_${u}` },
  async load(u){
    if (db){
      const snap = await db.collection('mf').doc(u).get();
      if (snap.exists) return snap.data();
      return null;
    } else {
      const raw = localStorage.getItem(this.key(u));
      return raw ? JSON.parse(raw) : null;
    }
  },
  async save(u, data){
    if (db){
      await db.collection('mf').doc(u).set(data, {merge:false});
    } else {
      localStorage.setItem(this.key(u), JSON.stringify(data));
    }
  },
  async loadUsers(){
    if (db){
      const snap = await db.collection('mf_users').get();
      const arr = [];
      snap.forEach(d=>arr.push(d.data()));
      return arr.length ? arr : [DEFAULT_USER];
    } else {
      const raw = localStorage.getItem('mf_users');
      return raw ? JSON.parse(raw) : [DEFAULT_USER];
    }
  },
  async saveUsers(users){
    if (db){
      const batch = db.batch();
      // apaga todos e regrava (simplificado)
      const snap = await db.collection('mf_users').get();
      snap.forEach(d=>batch.delete(d.ref));
      users.forEach(u=>{
        const ref = db.collection('mf_users').doc(u.username);
        batch.set(ref, u);
      });
      await batch.commit();
    } else {
      localStorage.setItem('mf_users', JSON.stringify(users));
    }
  }
};

/** ===== Inicialização ===== */
async function ensureUserData(username){
  let data = await storage.load(username);
  if (!data){
    data = {
      salarioPadrao: DEFAULT_SALARIO,
      saldos: {...state.saldos},
      cards: {},
      installments: [],
      home: {saldoInicial:0, pensao:0, itens:[]},
    };
    DEFAULT_CARDS.forEach(c=>{
      data.cards[c] = { limite: 0, atual: 0, processando: 0, cobertas: 0, outros: [] };
    });
    await storage.save(username, data);
  }
  state.salarioPadrao = data.salarioPadrao ?? DEFAULT_SALARIO;
  state.saldos = data.saldos ?? {};
  state.cards = data.cards ?? {};
  state.installments = data.installments ?? [];
  state.home = data.home ?? {saldoInicial:0, pensao:0, itens:[]};
}

async function saveAll(){
  if (!state.currentUser) return;
  const data = {
    salarioPadrao: state.salarioPadrao,
    saldos: state.saldos,
    cards: state.cards,
    installments: state.installments,
    home: state.home,
  };
  await storage.save(state.currentUser, data);
}

/** ===== Login ===== */
async function loadUsers(){
  state.users = await storage.loadUsers();
  // garante Felipe com senha 1515*
  const fel = state.users.find(u=>u.username==='Felipe');
  if (!fel){
    state.users.push({username:'Felipe', passHash:null});
    await storage.saveUsers(state.users);
  }
}

async function login(){
  const u = $('#login-username').value.trim();
  const p = $('#login-password').value;
  const err = $('#login-error');

  // Usuário Felipe com senha fixa 1515*
  if (u==='Felipe' && p==='1515*'){
    state.currentUser = 'Felipe';
  } else {
    const user = state.users.find(x=>x.username===u);
    if (!user){ err.textContent = 'Usuário não encontrado.'; return; }
    if (!user.passHash){ err.textContent = 'Usuário sem senha definida.'; return; }
    const h = await sha256(p);
    if (h!==user.passHash){ err.textContent = 'Senha incorreta.'; return; }
    state.currentUser = user.username;
  }
  err.textContent = '';
  await ensureUserData(state.currentUser);
  afterLogin();
}

function logout(){
  state.currentUser = null;
  $('#app-view').classList.remove('active');
  $('#login-view').classList.add('active');
}

/** ===== Navegação ===== */
function afterLogin(){
  $('#current-user').textContent = state.currentUser;
  $('#login-view').classList.remove('active');
  $('#app-view').classList.add('active');

  // Mostra admin de usuários apenas para Felipe
  $('#user-admin-card').style.display = (state.currentUser==='Felipe') ? '' : 'none';

  renderAll();
}

function hookTabs(){
  $$('.tab').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      $$('.tab').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      $$('.tabview').forEach(v=>v.classList.remove('active'));
      $(`#tab-${tab}`).classList.add('active');
    });
  });
}

function hookSubtabs(){
  $$('.subtab').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      $$('.subtab').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      renderCardPanels(btn.dataset.card);
    });
  });
}

/** ===== Renderização ===== */
function renderDashboard(){
  // KPI total de cartões (soma atual+processando)
  const total = Object.values(state.cards).reduce((acc,c)=>acc + (c.atual||0) + (c.processando||0), 0);
  $('#kpi-total-cartoes').textContent = BRL(total);

  // KPI base BB
  const bb = state.cards['BB'] || {limite:0, atual:0, processando:0, cobertas:0, outros:[]};
  const outrosTotal = (bb.outros||[]).reduce((a,o)=>a + (o.pago?0:o.valor||0), 0); // se pago, não desconta
  const meuGasto = (bb.atual + bb.processando) - outrosTotal - (bb.cobertas||0);
  $('#kpi-meu-gasto').textContent = BRL(Math.max(meuGasto,0));
  const podeGastar = (bb.limite||0) - Math.max(meuGasto,0);
  $('#kpi-pode-gastar').textContent = BRL(podeGastar);

  // Resumo saldos
  const saldoUl = $('#saldo-list');
  saldoUl.innerHTML = '';
  Object.entries(state.saldos).forEach(([nome, val])=>{
    const li = document.createElement('li');
    li.innerHTML = `<span>${nome}</span><span>${BRL(val)}</span>`;
    saldoUl.appendChild(li);
  });

  // Próximas contas (Casa)
  const todayDate = new Date().getDate();
  const proximas = [...state.home.itens].sort((a,b)=>a.dia-b.dia).slice(0,6);
  const nxt = $('#next-bills');
  nxt.innerHTML = '';
  proximas.forEach(i=>{
    const li = document.createElement('li');
    const status = i.pago ? '<span class="badge">pago</span>' : '';
    li.innerHTML = `<div><strong>${i.nome}</strong> • dia ${i.dia} ${status}</div><div>${BRL(i.valor)}</div>`;
    nxt.appendChild(li);
  });
}

function cardPanelTemplate(cardName, card){
  const outrosTotal = (card.outros||[]).reduce((a,o)=>a + (o.pago?0:o.valor||0), 0);
  const meu = (card.atual + card.processando) - outrosTotal - (card.cobertas||0);
  return `
    <div class="card">
      <h3>${cardName}</h3>
      <div class="grid form-4">
        <input data-f="${cardName}|limite" type="number" step="0.01" placeholder="Limite (R$)" value="${card.limite||0}">
        <input data-f="${cardName}|atual" type="number" step="0.01" placeholder="Valor atual (R$)" value="${card.atual||0}">
        <input data-f="${cardName}|processando" type="number" step="0.01" placeholder="Processando (R$)" value="${card.processando||0}">
        <input data-f="${cardName}|cobertas" type="number" step="0.01" placeholder="Parcelas cobertas (R$)" value="${card.cobertas||0}">
      </div>
      <p class="tiny muted">Gasto por mim = (Atual + Processando) − Outros (não pagos) − Parcelas cobertas.</p>
      <div class="grid cards-2">
        <div class="card">
          <h4>Resumo</h4>
          <ul class="list">
            <li><span>Outros (não pagos)</span><span>${BRL(outrosTotal)}</span></li>
            <li><span>Gasto por mim</span><span class="badge">${BRL(Math.max(meu,0))}</span></li>
            <li><span>Disponível</span><span>${BRL((card.limite||0)-Math.max(meu,0))}</span></li>
          </ul>
        </div>
        <div class="card">
          <h4>Gastos de outras pessoas</h4>
          <div class="grid form-4">
            <input data-o="${cardName}|nome" placeholder="Nome" />
            <input data-o="${cardName}|obs" placeholder="Obs" />
            <input data-o="${cardName}|valor" type="number" step="0.01" placeholder="Valor (R$)" />
            <button class="btn" data-o="${cardName}|add">Adicionar</button>
          </div>
          <table class="table small" id="ot-${cardName}">
            <thead><tr><th>Nome</th><th>Obs</th><th>Valor</th><th>Pago?</th><th>Ações</th></tr></thead>
            <tbody>
              ${(card.outros||[]).map(o=>`
                <tr data-id="${o.id}">
                  <td>${o.nome||''}</td>
                  <td>${o.obs||''}</td>
                  <td>${BRL(o.valor||0)}</td>
                  <td><input type="checkbox" ${o.pago?'checked':''} data-o="${cardName}|toggle|${o.id}"></td>
                  <td class="act">
                    <button class="btn" data-o="${cardName}|del|${o.id}">Excluir</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function renderCardPanels(activeCardName){
  const wrap = $('#card-panels');
  wrap.innerHTML = '';
  const active = activeCardName || ($('.subtab.active')?.dataset.card) || 'Nubank';
  DEFAULT_CARDS.forEach(name=>{
    const card = state.cards[name] || {limite:0, atual:0, processando:0, cobertas:0, outros:[]};
    if (name===active){
      const div = document.createElement('div');
      div.innerHTML = cardPanelTemplate(name, card);
      wrap.appendChild(div);
    }
  });

  // Hooks de inputs do cartão
  $$('input[data-f]').forEach(inp=>{
    inp.addEventListener('change', async ()=>{
      const [cardName, field] = inp.dataset.f.split('|');
      const v = parseNum(inp.value);
      state.cards[cardName][field] = v;
      await saveAll();
      renderDashboard();
      renderCardPanels(cardName);
    });
  });
  // Outros: adicionar
  $$('button[data-o$="|add"]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const [cardName] = btn.dataset.o.split('|');
      const n = $(`input[data-o="${cardName}|nome"]`).value.trim();
      const obs = $(`input[data-o="${cardName}|obs"]`).value.trim();
      const val = parseNum($(`input[data-o="${cardName}|valor"]`).value);
      if (!n || val<=0) return;
      state.cards[cardName].outros.push({id:uid(), nome:n, obs, valor:val, pago:false});
      await saveAll();
      renderCardPanels(cardName);
      renderDashboard();
    });
  });
  // Outros: toggle + del
  $$('input[type="checkbox"][data-o*="|toggle|"]').forEach(cb=>{
    cb.addEventListener('change', async ()=>{
      const [cardName, , id] = cb.dataset.o.split('|');
      const arr = state.cards[cardName].outros;
      const it = arr.find(x=>x.id===id);
      if (it){ it.pago = cb.checked; await saveAll(); renderCardPanels(cardName); renderDashboard(); }
    });
  });
  $$('button[data-o*="|del|"]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const [cardName, , id] = btn.dataset.o.split('|');
      state.cards[cardName].outros = state.cards[cardName].outros.filter(x=>x.id!==id);
      await saveAll();
      renderCardPanels(cardName);
      renderDashboard();
    });
  });
}

function renderInstallments(){
  const tbody = $('#ins-table tbody');
  tbody.innerHTML = '';
  state.installments.forEach(ins=>{
    const faltam = Math.max(ins.qtd - ins.pagas, 0);
    const restante = Math.max(ins.total * (faltam/ins.qtd), 0);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${ins.name}</td><td>${ins.bank}</td><td>${BRL(ins.total)}</td>
      <td>${ins.pagas}/${ins.qtd}</td><td>${faltam}</td><td>${BRL(restante)}</td>
      <td class="act">
        <button class="btn" data-ins="pay|${ins.id}">+1 parcela</button>
        <button class="btn" data-ins="del|${ins.id}">Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Ações
  $$('button[data-ins^="pay|"]').forEach(b=>{
    b.addEventListener('click', async ()=>{
      const id = b.dataset.ins.split('|')[1];
      const it = state.installments.find(x=>x.id===id);
      if (!it) return;
      it.pagas = Math.min(it.pagas+1, it.qtd);
      await saveAll();
      renderInstallments();
    });
  });
  $$('button[data-ins^="del|"]').forEach(b=>{
    b.addEventListener('click', async ()=>{
      const id = b.dataset.ins.split('|')[1];
      state.installments = state.installments.filter(x=>x.id!==id);
      await saveAll();
      renderInstallments();
    });
  });
}

function renderHome(){
  // tabela
  const tb = $('#home-table tbody');
  tb.innerHTML = '';
  state.home.itens.forEach(i=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i.nome}</td>
      <td>${BRL(i.valor)}</td>
      <td>${i.dia}</td>
      <td><input type="checkbox" ${i.pago?'checked':''} data-home="toggle|${i.id}"></td>
      <td class="act"><button class="btn" data-home="del|${i.id}">Excluir</button></td>
    `;
    tb.appendChild(tr);
  });

  // saldo disponível para casa
  const saldoCasa = parseNum(state.home.saldoInicial) + parseNum(state.home.pensao);
  $('#home-resultado').textContent = BRL(saldoCasa);

  // hooks
  $$('input[data-home^="toggle|"]').forEach(cb=>{
    cb.addEventListener('change', async ()=>{
      const id = cb.dataset.home.split('|')[1];
      const it = state.home.itens.find(x=>x.id===id);
      if (it){ it.pago = cb.checked; await saveAll(); renderHome(); }
    });
  });
  $$('button[data-home^="del|"]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const id = btn.dataset.home.split('|')[1];
      state.home.itens = state.home.itens.filter(x=>x.id!==id);
      await saveAll(); renderHome();
    });
  });
}

function renderMoney(){
  // tabela saldos
  const tbody = $('#saldo-table tbody');
  tbody.innerHTML = '';
  Object.entries(state.saldos).forEach(([k,v])=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${k}</td>
      <td>${BRL(v)}</td>
      <td class="act">
        <button class="btn" data-saldo="edit|${k}">Editar</button>
        <button class="btn" data-saldo="del|${k}">Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  $$('button[data-saldo^="edit|"]').forEach(b=>{
    b.addEventListener('click', ()=>{
      const nome = b.dataset.saldo.split('|')[1];
      $('#saldo-nome').value = nome;
      $('#saldo-valor').value = state.saldos[nome]||0;
    });
  });
  $$('button[data-saldo^="del|"]').forEach(async b=>{
    b.addEventListener('click', async ()=>{
      const nome = b.dataset.saldo.split('|')[1];
      delete state.saldos[nome];
      await saveAll(); renderMoney(); renderDashboard();
    });
  });
}

function renderUsers(){
  const list = $('#u-list');
  if (!list) return;
  list.innerHTML = '';
  state.users.forEach(u=>{
    const li = document.createElement('li');
    li.innerHTML = `<span>${u.username}</span><span class="tiny muted">${u.username==='Felipe'?'(fixo)':''}</span>`;
    list.appendChild(li);
  });
}

function renderAll(){
  renderDashboard();
  renderCardPanels();
  renderInstallments();
  renderHome();
  renderMoney();
  renderUsers();

  // preencher config
  $('#cfg-salario').value = state.salarioPadrao || DEFAULT_SALARIO;
}

/** ===== Eventos de UI ===== */
window.addEventListener('DOMContentLoaded', async ()=>{
  hookTabs(); hookSubtabs();

  await loadUsers();

  // Login
  $('#btn-login').addEventListener('click', login);
  $('#btn-logout').addEventListener('click', logout);

  // Distribuir salário
  $('#btn-distribuir').addEventListener('click', async ()=>{
    const salario = state.salarioPadrao || DEFAULT_SALARIO;
    const base = 2600; // conforme sua regra original
    const val = salario || base;
    // Regras:
    const v500 = 500;
    const v366 = 366;
    const v350 = 350;
    const v600 = 600;
    const usado = v500 + v366 + v350 + v600;
    const resto = Math.max(val - usado, 0);

    state.saldos["Caixinha Fatura Futura (Nubank)"] = (state.saldos["Caixinha Fatura Futura (Nubank)"]||0) + v500;
    state.saldos["Caixinha Parcelas (Nubank)"] = (state.saldos["Caixinha Parcelas (Nubank)"]||0) + v366;
    state.saldos["Mercado Pago (Casa)"] = (state.saldos["Mercado Pago (Casa)"]||0) + v350;
    state.saldos["Fatura Atual (BB)"] = (state.saldos["Fatura Atual (BB)"]||0) + v600;
    state.saldos["Carteira Nubank"] = (state.saldos["Carteira Nubank"]||0) + resto;

    $('#dist-msg').textContent = `Distribuído: 500 + 366 + 350 + 600 e resto (${BRL(resto)}) para Carteira Nubank.`;
    await saveAll();
    renderDashboard(); renderMoney();
  });

  // Parceladas – adicionar
  $('#ins-add').addEventListener('click', async ()=>{
    const name = $('#ins-name').value.trim();
    const bank = $('#ins-bank').value.trim();
    const total = parseNum($('#ins-total').value);
    const qtd = parseInt($('#ins-qtd').value||'0',10);
    const pagas = parseInt($('#ins-paid').value||'0',10);
    if (!name || !bank || total<=0 || qtd<=0) return;
    state.installments.push({id:uid(), name, bank, total, qtd, pagas:Math.min(pagas,qtd)});
    await saveAll(); renderInstallments();
    $('#ins-name').value=''; $('#ins-bank').value=''; $('#ins-total').value='';
    $('#ins-qtd').value=''; $('#ins-paid').value='';
  });

  // Casa – aplicar saldo/pensão
  $('#home-aplicar').addEventListener('click', async ()=>{
    state.home.saldoInicial = parseNum($('#home-saldo-inicial').value);
    state.home.pensao = parseNum($('#home-pensao').value);
    await saveAll(); renderHome();
  });
  // Casa – adicionar item
  $('#home-add').addEventListener('click', async ()=>{
    const nome = $('#home-nome').value.trim();
    const valor = parseNum($('#home-valor').value);
    const dia = parseInt($('#home-dia').value||'0',10);
    if (!nome || valor<=0 || !dia) return;
    state.home.itens.push({id:uid(), nome, valor, dia, pago:false});
    await saveAll(); renderHome();
    $('#home-nome').value=''; $('#home-valor').value=''; $('#home-dia').value='';
  });

  // Adm Dinheiro – salvar/atualizar saldo
  $('#saldo-add').addEventListener('click', async ()=>{
    const nome = $('#saldo-nome').value.trim();
    const val = parseNum($('#saldo-valor').value);
    if (!nome) return;
    state.saldos[nome] = val;
    await saveAll(); renderMoney(); renderDashboard();
    $('#saldo-nome').value=''; $('#saldo-valor').value='';
  });

  // Transferência simples (movimentar)
  $('#mv-exec').addEventListener('click', async ()=>{
    const o = $('#mv-origem').value.trim();
    const d = $('#mv-destino').value.trim();
    const v = parseNum($('#mv-valor').value);
    if (!o || !d || v<=0) return;
    if ((state.saldos[o]||0) < v){ alert('Saldo insuficiente na origem.'); return; }
    state.saldos[o] = (state.saldos[o]||0) - v;
    state.saldos[d] = (state.saldos[d]||0) + v;
    await saveAll(); renderMoney(); renderDashboard();
    $('#mv-origem').value=''; $('#mv-destino').value=''; $('#mv-valor').value='';
  });

  // Settings
  $('#cfg-salario-save').addEventListener('click', async ()=>{
    const v = parseNum($('#cfg-salario').value);
    state.salarioPadrao = v>0 ? v : DEFAULT_SALARIO;
    await saveAll();
    alert('Salário padrão salvo.');
  });

  // Users (apenas Felipe)
  $('#u-add').addEventListener('click', async ()=>{
    if (state.currentUser!=='Felipe') return;
    const u = $('#u-username').value.trim();
    const p = $('#u-password').value;
    if (!u || !p) return;
    if (state.users.some(x=>x.username===u)){ alert('Usuário já existe.'); return; }
    const passHash = await sha256(p);
    state.users.push({username:u, passHash});
    await storage.saveUsers(state.users);
    // cria dados iniciais do usuário
    await ensureUserData(u);
    renderUsers();
    $('#u-username').value=''; $('#u-password').value='';
    alert('Usuário criado.');
  });

  // Précria estrutura de cartões se vazia
  DEFAULT_CARDS.forEach(c=>{
    if (!state.cards[c]) state.cards[c] = {limite:0, atual:0, processando:0, cobertas:0, outros:[]};
  });

  // Exibe login por padrão
  $('#login-view').classList.add('active');
});

/* ===== Atalhos úteis =====
 * - Para cobrir parcelas com dinheiro guardado: preencha "Parcelas cobertas (R$)" no cartão.
 * - Gastos de terceiros: adicione e marque como "Pago?" quando te devolverem.
 * - A base de cálculo "pode gastar" sempre considera o cartão BB.
 */
