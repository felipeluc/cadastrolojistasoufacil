
// app.js

// Firebase Configuration (substitua com suas próprias credenciais)
// Firebase removido. As funcionalidades de persistência de dados serão desativadas ou adaptadas.
// Para persistência de dados sem autenticação, seria necessário um backend customizado ou um banco de dados local (ex: IndexedDB).
// Por enquanto, os dados serão voláteis (apenas em memória) ou simulados.

const db = {}; // Simula um objeto de banco de dados vazio para evitar erros de referência.

// Funções de simulação do Firestore para localStorage
const collection = (db, name) => ({ name });
const addDoc = async (col, data) => {
    let items = JSON.parse(localStorage.getItem(col.name) || '[]');
    const newId = Date.now().toString();
    items.push({ id: newId, ...data });
    localStorage.setItem(col.name, JSON.stringify(items));
    return { id: newId };
};
const getDocs = async (col) => {
    let items = JSON.parse(localStorage.getItem(col.name) || '[]');
    return { forEach: (callback) => items.forEach(item => callback({ data: () => item, id: item.id })) };
};

// Basic DOM Manipulation for Navigation
document.addEventListener("DOMContentLoaded", () => {
    const navLinks = document.querySelectorAll("nav ul li a");
    const sections = document.querySelectorAll("main section");
    

    navLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const targetId = e.target.getAttribute("href").substring(1);

            sections.forEach(section => {
                if (section.id === targetId) {
                    section.style.display = "block";
                } else {
                    section.style.display = "none";
                }
            });
        });
    });

    // Hide all sections initially except login
    sections.forEach(section => {
        section.style.display = "none";
    });
    document.getElementById("dashboard").style.display = "block";
    document.querySelector("nav").style.display = "block";

    // A lógica de login e registro foi removida.

});





// Card Management (Example for Nubank)
const cardList = document.getElementById("card-list"); // Assuming you'll add a ul with id 'card-list' in index.html

async function loadCards() {
    // This is a placeholder. In a real app, you'd fetch user-specific cards from Firestore.
    const cards = [
        { name: "Nubank", balance: 1500, limit: 2000 },
        { name: "BB", balance: 800, limit: 1600 },
        { name: "Will Bank", balance: 300, limit: 500 },
        { name: "Mercado Pago", balance: 100, limit: 200 },
        { name: "Bradesco", balance: 500, limit: 1000 },
    ];

    if (cardList) {
        cardList.innerHTML = ""; // Clear existing list
        cards.forEach(card => {
            const li = document.createElement("li");
            li.innerHTML = `
                <h3>${card.name}</h3>
                <p>Saldo: R$ ${card.balance.toFixed(2)}</p>
                <p>Limite: R$ ${card.limit.toFixed(2)}</p>
            `;
            cardList.appendChild(li);
        });
    }
}

// Call loadCards when the cards section is displayed (or on login)
// For now, let's assume it's called after successful login
// You'll need to add an element with id 'card-list' in your index.html within the 'cartoes' section





// Expense Management
const expenseForm = document.getElementById("expense-form");
const expenseList = document.getElementById("expense-list");

async function addExpense(description, amount, date) {
    try {
        // In a real app, you'd save this to Firestore for the current user
        const docRef = await addDoc(collection(db, "expenses"), {

            description: description,
            amount: parseFloat(amount),
            date: date,
            timestamp: new Date()
        });
        console.log("Despesa adicionada com ID: ", docRef.id);
        alert("Despesa adicionada com sucesso!");
        loadExpenses(); // Reload expenses after adding a new one
    } catch (e) {
        console.error("Erro ao adicionar despesa: ", e);
        alert("Erro ao adicionar despesa: " + e.message);
    }
}

async function loadExpenses() {

    try {
        expenseList.innerHTML = ""; // Clear existing list
        const querySnapshot = await getDocs(collection(db, "expenses"));
        querySnapshot.forEach((doc) => {
            const expense = doc.data();
            const li = document.createElement("li");
            li.innerHTML = `
                <span>${expense.description}</span>
                <span>R$ ${expense.amount.toFixed(2)}</span>
                <span>${expense.date}</span>
            `;
            expenseList.appendChild(li);
        });
    } catch (e) {
        console.error("Erro ao carregar despesas: ", e);
        alert("Erro ao carregar despesas: " + e.message);
    }
}

if (expenseForm) {
    expenseForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const description = expenseForm["expense-description"].value;
        const amount = expenseForm["expense-amount"].value;
        const date = expenseForm["expense-date"].value;
        addExpense(description, amount, date);
        expenseForm.reset();
    });
}

// Initial load of expenses when the user logs in or navigates to the section
// This will be called after successful login in the main DOMContentLoaded listener





// Installment Management
const installmentForm = document.getElementById("installment-form");
const installmentList = document.getElementById("installment-list");

async function addInstallment(description, totalAmount, totalInstallments, paidInstallments, bank) {
    try {
        const docRef = await addDoc(collection(db, "installments"), {

            description: description,
            totalAmount: parseFloat(totalAmount),
            totalInstallments: parseInt(totalInstallments),
            paidInstallments: parseInt(paidInstallments),
            bank: bank,
            remainingAmount: parseFloat(totalAmount) - (parseFloat(totalAmount) / parseInt(totalInstallments)) * parseInt(paidInstallments),
            timestamp: new Date()
        });
        console.log("Compra parcelada adicionada com ID: ", docRef.id);
        alert("Compra parcelada adicionada com sucesso!");
        loadInstallments();
    } catch (e) {
        console.error("Erro ao adicionar compra parcelada: ", e);
        alert("Erro ao adicionar compra parcelada: " + e.message);
    }
}

async function loadInstallments() {

    try {
        installmentList.innerHTML = "";
        const querySnapshot = await getDocs(collection(db, "installments"));
        querySnapshot.forEach((doc) => {
            const installment = doc.data();
            const li = document.createElement("li");
            li.innerHTML = `
                <span>${installment.description}</span>
                <span>Total: R$ ${installment.totalAmount.toFixed(2)}</span>
                <span>Parcelas: ${installment.paidInstallments}/${installment.totalInstallments}</span>
                <span>Restante: R$ ${installment.remainingAmount.toFixed(2)}</span>
                <span>Banco: ${installment.bank}</span>
            `;
            installmentList.appendChild(li);
        });
    } catch (e) {
        console.error("Erro ao carregar compras parceladas: ", e);
        alert("Erro ao carregar compras parceladas: " + e.message);
    }
}

if (installmentForm) {
    installmentForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const description = installmentForm["installment-description"].value;
        const totalAmount = installmentForm["installment-amount"].value;
        const totalInstallments = installmentForm["installment-installments"].value;
        const paidInstallments = installmentForm["installment-paid"].value;
        const bank = installmentForm["installment-bank"].value;
        addInstallment(description, totalAmount, totalInstallments, paidInstallments, bank);
        installmentForm.reset();
    });
}





// Dashboard Functionality
async function updateDashboard() {


    // Placeholder for actual data fetching from Firestore
    // For now, let's use some dummy data or data from the current session
    let totalExpenses = 0;
    const expenseSnapshot = await getDocs(collection(db, "expenses"));
    expenseSnapshot.forEach((doc) => {
        const expense = doc.data();
        if (true) {
            totalExpenses += expense.amount;
        }
    });

    let totalInstallmentAmount = 0;
    const installmentSnapshot = await getDocs(collection(db, "installments"));
    installmentSnapshot.forEach((doc) => {
        const installment = doc.data();
            if (true) {
            totalInstallmentAmount += installment.remainingAmount;
        }
    });

    // Dummy data for monthly income for now
    const monthlyIncome = 2600; // From user's initial description
    const availableBalance = monthlyIncome - totalExpenses; // Simplified calculation

    document.getElementById("monthly-income").textContent = `R$ ${monthlyIncome.toFixed(2)}`;
    document.getElementById("total-expenses").textContent = `R$ ${totalExpenses.toFixed(2)}`;
    document.getElementById("available-balance").textContent = `R$ ${availableBalance.toFixed(2)}`;

    // Update Card Summary (using dummy data for now)
    const dashboardCardSummary = document.getElementById("dashboard-card-summary");
    dashboardCardSummary.innerHTML = `
        <li>Nubank: R$ 1500.00 (Limite: R$ 2000.00)</li>
        <li>BB: R$ 800.00 (Limite: R$ 1600.00)</li>
    `;

    // Update Installments Summary (using dummy data for now)
    const dashboardInstallmentsSummary = document.getElementById("dashboard-installments-summary");
    dashboardInstallmentsSummary.innerHTML = `
        <li>Compra X: R$ 100.00 (2/5 parcelas)</li>
        <li>Compra Y: R$ 250.00 (1/3 parcelas)</li>
    `;
}

// Call updateDashboard when the user logs in or navigates to the dashboard section
// This will be called after successful login in the main DOMContentLoaded listener





// Other People's Expenses Management
const otherExpenseForm = document.getElementById("other-expense-form");
const otherExpenseList = document.getElementById("other-expense-list");

async function addOtherExpense(name, amount, card, paid) {
    try {
        const docRef = await addDoc(collection(db, "otherExpenses"), {

            name: name,
            amount: parseFloat(amount),
            card: card,
            paid: paid,
            timestamp: new Date()
        });
        console.log("Gasto de outra pessoa adicionado com ID: ", docRef.id);
        alert("Gasto de outra pessoa adicionado com sucesso!");
        loadOtherExpenses();
    } catch (e) {
        console.error("Erro ao adicionar gasto de outra pessoa: ", e);
        alert("Erro ao adicionar gasto de outra pessoa: " + e.message);
    }
}

async function loadOtherExpenses() {

    try {
        otherExpenseList.innerHTML = "";
        const querySnapshot = await getDocs(collection(db, "otherExpenses"));
        querySnapshot.forEach((doc) => {
            const expense = doc.data();
            const li = document.createElement("li");
            li.innerHTML = `
                <span>${expense.name}</span>
                <span>R$ ${expense.amount.toFixed(2)}</span>
                <span>Cartão: ${expense.card}</span>
                <span>Status: ${expense.paid ? "Pago" : "Pendente"}</span>
            `;
            otherExpenseList.appendChild(li);
        });
    } catch (e) {
        console.error("Erro ao carregar gastos de outras pessoas: ", e);
        alert("Erro ao carregar gastos de outras pessoas: " + e.message);
    }
}

if (otherExpenseForm) {
    otherExpenseForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = otherExpenseForm["other-expense-name"].value;
        const amount = otherExpenseForm["other-expense-amount"].value;
        const card = otherExpenseForm["other-expense-card"].value;
        const paid = otherExpenseForm["other-expense-paid"].checked;
        addOtherExpense(name, amount, card, paid);
        otherExpenseForm.reset();
    });
}





// House Expenses Management
const houseExpenseForm = document.getElementById("house-expense-form");
const houseExpenseList = document.getElementById("house-expense-list");
const houseCurrentBalanceSpan = document.getElementById("house-current-balance");
const houseTotalExpensesSpan = document.getElementById("house-total-expenses");

async function addHouseExpense(description, amount, paid, dueDate) {
    try {
        const docRef = await addDoc(collection(db, "houseExpenses"), {

            description: description,
            amount: parseFloat(amount),
            paid: paid,
            dueDate: dueDate,
            timestamp: new Date()
        });
        console.log("Gasto da casa adicionado com ID: ", docRef.id);
        alert("Gasto da casa adicionado com sucesso!");
        loadHouseExpenses();
    } catch (e) {
        console.error("Erro ao adicionar gasto da casa: ", e);
        alert("Erro ao adicionar gasto da casa: " + e.message);
    }
}

async function loadHouseExpenses() {

    try {
        houseExpenseList.innerHTML = "";
        let totalHouseExpenses = 0;
        const querySnapshot = await getDocs(collection(db, "houseExpenses"));
        querySnapshot.forEach((doc) => {
            const expense = doc.data();
            totalHouseExpenses += expense.amount;
            const li = document.createElement("li");
            li.innerHTML = `
                <span>${expense.description}</span>
                <span>R$ ${expense.amount.toFixed(2)}</span>
                <span>Vencimento: ${expense.dueDate}</span>
                <span>Status: ${expense.paid ? "Pago" : "Pendente"}</span>
            `;
            houseExpenseList.appendChild(li);
        });
        houseTotalExpensesSpan.textContent = `R$ ${totalHouseExpenses.toFixed(2)}`;
        // Placeholder for actual house balance calculation (e.g., income - expenses)
        const houseIncome = 0; // You need to define how house income is managed
        houseCurrentBalanceSpan.textContent = `R$ ${(houseIncome - totalHouseExpenses).toFixed(2)}`;

    } catch (e) {
        console.error("Erro ao carregar gastos da casa: ", e);
        alert("Erro ao carregar gastos da casa: " + e.message);
    }
}

if (houseExpenseForm) {
    houseExpenseForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const description = houseExpenseForm["house-expense-description"].value;
        const amount = houseExpenseForm["house-expense-amount"].value;
        const paid = houseExpenseForm["house-expense-paid"].checked;
        const dueDate = houseExpenseForm["house-expense-date"].value;
        addHouseExpense(description, amount, paid, dueDate);
        houseExpenseForm.reset();
    });
}


