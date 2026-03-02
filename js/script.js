let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
let budget = parseFloat(localStorage.getItem("budget")) || 0;
let chart = null;

const list = document.getElementById("transactionList");
const incomeEl = document.getElementById("income");
const expenseEl = document.getElementById("expense");
const savingsEl = document.getElementById("savings");
const aiText = document.getElementById("aiText");

document.getElementById("addBtn")?.addEventListener("click", addTransaction);
document.getElementById("setBudgetBtn")?.addEventListener("click", setBudget);
document.getElementById("resetBtn")?.addEventListener("click", resetAll);
document.getElementById("monthPicker")?.addEventListener("change", updateUI);
document.getElementById("sortOption")?.addEventListener("change", updateUI);
document.getElementById("askBtn")?.addEventListener("click", askAI);

function saveData() {
    localStorage.setItem("transactions", JSON.stringify(transactions));
    localStorage.setItem("budget", budget);
}

function addTransaction() {
    const type = document.getElementById("type").value;
    const category = document.getElementById("category").value;
    const desc = document.getElementById("desc").value.trim();
    const amount = parseFloat(document.getElementById("amount").value);
    const date = document.getElementById("date").value;

    if (!type || !category || !desc || isNaN(amount) || !date) {
        alert("Please fill all fields correctly.");
        return;
    }

    transactions.push({
        id: Date.now(),
        type,
        category,
        desc,
        amount,
        date
    });

    saveData();
    updateUI();
}

function setBudget() {
    const value = parseFloat(document.getElementById("budgetInput").value);

    if (isNaN(value) || value <= 0) {
        alert("Enter a valid budget.");
        return;
    }

    budget = value;
    saveData();
    document.getElementById("budgetInfo").innerText =
        "Budget Set: ₹" + budget;

    updateUI();
}

function updateUI() {

    if (!list) return;

    list.innerHTML = "";

    const month = document.getElementById("monthPicker")?.value;
    const sort = document.getElementById("sortOption")?.value;

    let filtered = [...transactions];


    if (month) {
        filtered = filtered.filter(t => t.date.startsWith(month));
    }

    filtered.sort((a, b) =>
        sort === "oldest"
            ? new Date(a.date) - new Date(b.date)
            : new Date(b.date) - new Date(a.date)
    );

    let income = 0;
    let expense = 0;

    filtered.forEach(t => {
        const li = document.createElement("li");

        li.innerHTML = `
            ${t.date} - ${t.category} - ${t.desc} - ₹${t.amount}
            <button onclick="deleteTransaction(${t.id})">X</button>
        `;

        list.appendChild(li);

        if (t.type === "income") income += t.amount;
        else expense += t.amount;
    });

    const savings = (budget - expense) + income;

    if (incomeEl) incomeEl.innerText = "₹" + income;
    if (expenseEl) expenseEl.innerText = "₹" + expense;

    if (savingsEl) {
        savingsEl.innerText = "₹" + savings;
        savingsEl.style.color = savings >= 0 ? "green" : "red";
    }

    updateChart(income, expense);
    generateAISummary(income, expense, savings);
}

function updateChart(income, expense) {
    const ctx = document.getElementById("financeChart");
    if (!ctx) return;

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["Income", "Expense"],
            datasets: [{
                label: "Monthly Overview",
                data: [income, expense],
                backgroundColor: ["#23c95d", "#dd2c2c"]
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } }
        }
    });
}

function generateAISummary(income, expense, savings) {

    if (!aiText) return;

    if (!budget) {
        aiText.innerText =
            "Set a monthly budget to properly track savings.";
        return;
    }

    if (savings < 0) {
        aiText.innerText =
            "⚠ You are overspending. Your total expenses exceed your budget and income combined. Reduce non-essential spending immediately.";
    } else {
        aiText.innerText =
            "Your current savings is ₹" + savings +
            ". Keep monitoring expenses and stay within budget.";
    }
}

function askAI() {
    const question = document.getElementById("aiQuestion")?.value.trim().toLowerCase();
    const response = document.getElementById("aiResponse");

    if (!response) return;

    if (!question) {
        response.innerText = "Please ask a financial question.";
        return;
    }

    if (question.includes("save")) {
        response.innerText =
            "To increase savings: reduce unnecessary expenses, control shopping, and review spending weekly.";
    }
    else if (question.includes("budget")) {
        response.innerText =
            "A budget helps limit spending. Try not to use more than 80% of your budget.";
    }
    else if (question.includes("food")) {
        response.innerText =
            "To reduce food expenses, avoid eating out frequently and plan groceries weekly.";
    }
    else if (question.includes("shopping")) {
        response.innerText =
            "Avoid impulse buying and compare prices before purchasing.";
    }
    else {
        response.innerText =
            "Track your income and expenses regularly to maintain financial stability.";
    }
}

function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    saveData();
    updateUI();
}

function resetAll() {
    if (confirm("Delete all data?")) {
        localStorage.clear();
        transactions = [];
        budget = 0;
        updateUI();
    }
}

const toggleBtn = document.getElementById("themeToggle");

if (toggleBtn) {

    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark");
        toggleBtn.innerText = "☀ Light Mode";
    }

    toggleBtn.addEventListener("click", () => {
        document.body.classList.toggle("dark");

        if (document.body.classList.contains("dark")) {
            localStorage.setItem("theme", "dark");
            toggleBtn.innerText = "☀ Light Mode";
        } else {
            localStorage.setItem("theme", "light");
            toggleBtn.innerText = "🌙 Dark Mode";
        }
    });
}
updateUI();