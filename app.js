// Login fixo
const USERNAME = "Felipe";
const PASSWORD = "1515*";

function login() {
  const user = document.getElementById("username").value;
  const pass = document.getElementById("password").value;
  if (user === USERNAME && pass === PASSWORD) {
    document.getElementById("login-screen").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
    updateAllCards();
  } else {
    document.getElementById("login-error").innerText = "Usuário ou senha incorretos";
  }
}

function logout() {
  document.getElementById("login-screen").classList.remove("hidden");
  document.getElementById("app").classList.add("hidden");
}

// Navegação
function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
}

// Atualizar cálculo de um cartão
function updateCard(card) {
  const limite = Number(document.getElementById(`${card}-limite`).value) || 0;
  const gasto = Number(document.getElementById(`${card}-gasto`).value) || 0;
  const outros = Number(document.getElementById(`${card}-outros`).value) || 0;
  const parcelas = Number(document.getElementById(`${card}-parcelas`).value) || 0;

  const disponivel = limite - (gasto + outros + parcelas);
  document.getElementById(`${card}-disponivel`).innerText = "R$ " + disponivel;

  updateAllCards();
}

// Atualizar dashboard
function updateAllCards() {
  const cards = ["nubank", "bb", "willbank", "mercadopago", "bradesco"];
  let totalLimite = 0, totalGasto = 0;
  cards.forEach(c => {
    totalLimite += Number(document.getElementById(`${c}-limite`).value) || 0;
    totalGasto += Number(document.getElementById(`${c}-gasto`).value) || 0;
    totalGasto += Number(document.getElementById(`${c}-outros`).value) || 0;
    totalGasto += Number(document.getElementById(`${c}-parcelas`).value) || 0;
  });
  document.getElementById("total-limite").innerText = "R$ " + totalLimite;
  document.getElementById("total-gasto").innerText = "R$ " + totalGasto;
  document.getElementById("total-disponivel").innerText = "R$ " + (totalLimite - totalGasto);
}
