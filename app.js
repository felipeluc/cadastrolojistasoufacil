// ------------------ LOGIN FIXO ------------------
const loginForm = document.getElementById("loginForm");
const loginSection = document.getElementById("loginSection");
const dashboard = document.getElementById("dashboard");
const logoutBtn = document.getElementById("logoutBtn");

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (username === "Felipe" && password === "1515*") {
    loginSection.style.display = "none";
    dashboard.style.display = "block";
    renderCartoes();
    renderResumo();
  } else {
    alert("Usuário ou senha incorretos!");
  }
});

logoutBtn.addEventListener("click", () => {
  dashboard.style.display = "none";
  loginSection.style.display = "flex";
  loginForm.reset();
});

// ------------------ ABAS ------------------
const tabBtns = document.querySelectorAll(".tabBtn");
const tabs = document.querySelectorAll(".tab");

tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-tab");

    tabs.forEach((tab) => {
      tab.classList.remove("active");
      if (tab.id === target) {
        tab.classList.add("active");
      }
    });
  });
});

// ------------------ DADOS INICIAIS ------------------
let salario = 2600;
let caixa = {
  nubank_fatura: 500,
  nubank_parcelas: 366,
  mercado_pago: 350,
  fatura_mes: 600,
  carteira_nubank: salario - (500 + 366 + 350 + 600)
};

let cartoes = {
  Nubank: { limite: 1000, gastos: 0, outros: [] },
  BB: { limite: 1600, gastos: 0, outros: [] },
  "Will Bank": { limite: 1000, gastos: 0, outros: [] },
  "Mercado Pago": { limite: 1000, gastos: 0, outros: [] },
  Bradesco: { limite: 1000, gastos: 0, outros: [] }
};

let parcelas = [];
let gastosCasa = [];

// ------------------ CARTÕES ------------------
function renderCartoes() {
  const list = document.getElementById("cartoesList");
  const select = document.getElementById("cartaoSelect");
  list.innerHTML = "";
  select.innerHTML = "";

  Object.keys(cartoes).forEach((nome) => {
    const c = cartoes[nome];
    const outrosTotal = c.outros.reduce((acc, o) => acc + o.valor, 0);
    const gastoReal = c.gastos - outrosTotal;

    list.innerHTML += `
      <div>
        <strong>${nome}</strong><br>
        Limite: R$ ${c.limite}<br>
        Gastos: R$ ${c.gastos}<br>
        Gastos de outros: R$ ${outrosTotal}<br>
        Seu gasto real: R$ ${gastoReal}<br>
        Disponível: R$ ${c.limite - c.gastos}
      </div>
    `;

    select.innerHTML += `<option value="${nome}">${nome}</option>`;
  });
}

// Adicionar gasto de outra pessoa
document.getElementById("outrosForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const cartao = document.getElementById("cartaoSelect").value;
  const nome = document.getElementById("nomeOutro").value;
  const valor = parseFloat(document.getElementById("valorOutro").value);

  cartoes[cartao].outros.push({ nome, valor });
  cartoes[cartao].gastos += valor;

  renderCartoes();
  renderResumo();
  e.target.reset();
});

// ------------------ PARCELAS ------------------
document.getElementById("parcelaForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const nome = document.getElementById("parcelaNome").value;
  const valor = parseFloat(document.getElementById("parcelaValor").value);
  const qtd = parseInt(document.getElementById("qtdParcelas").value);
  const banco = document.getElementById("bancoParcela").value;

  parcelas.push({ nome, valor, qtd, restantes: qtd, banco });

  renderParcelas();
  renderResumo();
  e.target.reset();
});

function renderParcelas() {
  const lista = document.getElementById("listaParcelas");
  lista.innerHTML = "";
  parcelas.forEach((p) => {
    lista.innerHTML += `
      <div>
        ${p.nome} - R$ ${p.valor} (${p.restantes}/${p.qtd}) - ${p.banco}
      </div>
    `;
  });
}

// ------------------ CASA ------------------
document.getElementById("casaForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const tipo = document.getElementById("tipoGastoCasa").value;
  const valor = parseFloat(document.getElementById("valorCasa").value);
  const data = document.getElementById("dataCasa").value;

  gastosCasa.push({ tipo, valor, data, pago: false });
  renderCasa();
  renderResumo();
  e.target.reset();
});

function renderCasa() {
  const lista = document.getElementById("listaCasa");
  lista.innerHTML = "";
  gastosCasa.forEach((g, i) => {
    lista.innerHTML += `
      <div>
        ${g.tipo} - R$ ${g.valor} - ${g.data} - ${g.pago ? "Pago" : "Pendente"}
        <button onclick="togglePago(${i})">Marcar</button>
      </div>
    `;
  });
}

window.togglePago = function (i) {
  gastosCasa[i].pago = !gastosCasa[i].pago;
  renderCasa();
  renderResumo();
};

// ------------------ RESUMO ------------------
function renderResumo() {
  const totalCartoes = Object.values(cartoes).reduce(
    (acc, c) => acc + c.gastos,
    0
  );
  const totalCasa = gastosCasa.reduce((acc, g) => acc + g.valor, 0);

  document.getElementById("resumo").innerHTML = `
    <p><strong>Salário:</strong> R$ ${salario}</p>
    <p><strong>Guardado:</strong> R$ ${Object.values(caixa).reduce((a, b) => a + b, 0)}</p>
    <p><strong>Total Cartões:</strong> R$ ${totalCartoes}</p>
    <p><strong>Total Casa:</strong> R$ ${totalCasa}</p>
  `;
}
