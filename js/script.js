
let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
let budgetByMonth = {};

try {
    const savedBudgets = JSON.parse(localStorage.getItem("budgets") || "{}");

    if (
        savedBudgets &&
        typeof savedBudgets === "object" &&
        !Array.isArray(savedBudgets) &&
        Object.keys(savedBudgets).length
    ) {
        budgetByMonth = savedBudgets;
    } else {
        const oldBudget = parseFloat(localStorage.getItem("budget")) || 0;

        if (oldBudget > 0) {
            const now = new Date();
            const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
            budgetByMonth[month] = oldBudget;
        }
    }
} catch {
    const oldBudget = parseFloat(localStorage.getItem("budget")) || 0;

    if (oldBudget > 0) {
        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        budgetByMonth[month] = oldBudget;
    }
}

let budget = 0;
let chart = null;

const list = document.getElementById("transactionList");
const incomeEl = document.getElementById("income");
const expenseEl = document.getElementById("expense");
const savingsEl = document.getElementById("savings");
const aiText = document.getElementById("aiText");
const monthPicker = document.getElementById("monthPicker");

const currency = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
});

document.getElementById("addBtn")?.addEventListener("click", addTransaction);
document.getElementById("setBudgetBtn")?.addEventListener("click", setBudget);
document.getElementById("resetBtn")?.addEventListener("click", resetAll);

monthPicker?.addEventListener("change", () => {
    loadSelectedMonthBudget();
    updateUI();
});

document.getElementById("sortOption")?.addEventListener("change", updateUI);
document.getElementById("askBtn")?.addEventListener("click", askAI);

document.getElementById("aiQuestion")?.addEventListener("keydown", event => {
    if (event.key === "Enter") askAI();
});

document.getElementById("desc")?.addEventListener("keydown", event => {
    if (event.key === "Enter") addTransaction();
});

function localDateParts(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return {
        month: `${year}-${month}`,
        date: `${year}-${month}-${day}`
    };
}

if (monthPicker) {
    monthPicker.value = localDateParts().month;
}

const dateInput = document.getElementById("date");

if (dateInput) {
    dateInput.value = localDateParts().date;
}

loadSelectedMonthBudget();

function money(value) {
    return currency.format(Number(value) || 0);
}

function selectedMonth() {
    return monthPicker?.value || localDateParts().month;
}

function loadSelectedMonthBudget() {
    budget = Number(budgetByMonth[selectedMonth()]) || 0;

    const budgetInput = document.getElementById("budgetInput");

    if (budgetInput) {
        budgetInput.value = budget > 0 ? String(budget) : "";
    }
}

function saveData() {
    localStorage.setItem("transactions", JSON.stringify(transactions));
    localStorage.setItem("budgets", JSON.stringify(budgetByMonth));
    localStorage.setItem("budget", String(budget));
}

function addTransaction() {
    const type = document.getElementById("type").value;
    const category = document.getElementById("category").value;
    const desc = document.getElementById("desc").value.trim();
    const amount = parseFloat(document.getElementById("amount").value);
    const date = document.getElementById("date").value;

    if (
        !type ||
        !category ||
        !desc ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        !date
    ) {
        alert("Please complete every field and enter an amount greater than zero.");
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

    document.getElementById("desc").value = "";
    document.getElementById("amount").value = "";
    document.getElementById("type").value = "";
    document.getElementById("category").value = "";

    updateUI();
}

function setBudget() {
    const value = parseFloat(
        document.getElementById("budgetInput").value
    );

    if (!Number.isFinite(value) || value <= 0) {
        alert("Enter a monthly budget greater than zero.");
        return;
    }

    budget = value;
    budgetByMonth[selectedMonth()] = value;

    saveData();

    document.getElementById("budgetInput").value = String(value);

    updateUI();
}

function updateUI() {
    if (!list) return;

    list.innerHTML = "";

    const month = selectedMonth();
    const sort = document.getElementById("sortOption")?.value;

    let filtered = transactions.filter(
        transaction => transaction.date.startsWith(month)
    );

    filtered.sort((a, b) =>
        sort === "oldest"
            ? new Date(a.date) - new Date(b.date)
            : new Date(b.date) - new Date(a.date)
    );

    let income = 0;
    let expense = 0;

    filtered.forEach(transaction => {
        const li = document.createElement("li");

        const symbol = document.createElement("div");
        symbol.className = `transaction-symbol ${transaction.type}`;
        symbol.textContent = categorySymbol(
            transaction.category,
            transaction.type
        );

        const details = document.createElement("div");
        details.className = "transaction-details";

        const title = document.createElement("strong");
        title.textContent = transaction.desc;

        const meta = document.createElement("small");
        meta.textContent =
            `${transaction.category} · ${formatDate(transaction.date)}`;

        details.append(title, meta);

        const amount = document.createElement("span");
        amount.className = `transaction-amount ${transaction.type}`;

        amount.textContent =
            `${transaction.type === "income" ? "+" : "−"}${money(transaction.amount)}`;

        const del = document.createElement("button");
        del.className = "delete-transaction";
        del.type = "button";
        del.title = "Delete transaction";
        del.setAttribute(
            "aria-label",
            `Delete ${transaction.desc}`
        );
        del.textContent = "×";

        del.addEventListener("click", () => {
            deleteTransaction(transaction.id);
        });

        li.append(symbol, details, amount, del);
        list.appendChild(li);

        const value = Number(transaction.amount);

        if (Number.isFinite(value) && value > 0) {
            if (transaction.type === "income") {
                income += value;
            } else if (transaction.type === "expense") {
                expense += value;
            }
        }
    });

    // TOTAL MONEY = BUDGET + INCOME - EXPENSES
    const totalMoney = budget + income - expense;

    if (incomeEl) {
        incomeEl.textContent = money(income);
    }

    if (expenseEl) {
        expenseEl.textContent = money(expense);
    }

    if (savingsEl) {
        savingsEl.textContent = money(totalMoney);
        savingsEl.style.color =
            totalMoney < 0 ? "#ffb3b7" : "";
    }

    const emptyState = document.getElementById("emptyState");

    if (emptyState) {
        emptyState.style.display = filtered.length ? "none" : "block";
    }

    const count = document.getElementById("recordsCount");

    if (count) {
        count.textContent =
            `${filtered.length} ${filtered.length === 1 ? "record" : "records"}`;
    }

    updateBudget(expense);
    updateChart(income, expense);
    generateAISummary(income, expense, totalMoney);
}

function categorySymbol(category, type) {
    if (type === "income") return "↓";

    return ({
        Food: "✳",
        Shopping: "◇",
        Travel: "↗",
        Bills: "▤",
        Other: "•"
    })[category] || "↗";
}

function formatDate(value) {
    const date = new Date(`${value}T00:00:00`);

    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
}

function updateBudget(expense) {
    const amountEl = document.getElementById("budgetRingAmount");
    const percentEl = document.getElementById("budgetPercent");
    const info = document.getElementById("budgetInfo");
    const ring = document.querySelector(".budget-ring");

    if (amountEl) {
        amountEl.textContent = money(budget);
    }

    const used = budget > 0
        ? Math.round((expense / budget) * 100)
        : 0;

    if (percentEl) {
        percentEl.textContent = budget > 0
            ? `${used}% used`
            : "Set a budget";
    }

    if (ring) {
        const degree = budget > 0
            ? Math.min(expense / budget, 1) * 360
            : 0;

        const ringColor = expense > budget
            ? "#e56b72"
            : "#6c59e8";

        ring.style.background =
            `conic-gradient(${ringColor} 0deg ${degree}deg, #e9edf5 ${degree}deg 360deg)`;
    }

    if (info) {
        if (!budget) {
            info.textContent =
                "Set a monthly budget to start tracking your spending progress.";
        } else if (expense > budget) {
            info.textContent =
                `You're ${money(expense - budget)} over budget. Review your spending to get back on track.`;
        } else {
            info.textContent =
                `${money(budget - expense)} left to spend this month. ${
                    used >= 80
                        ? "You're getting close to your limit."
                        : "You're within your spending limit."
                }`;
        }
    }
}

function updateChart(income, expense) {
    const canvas = document.getElementById("financeChart");

    if (!canvas || typeof Chart === "undefined") return;

    if (chart) chart.destroy();

    const isDark = document.body.classList.contains("dark");

    chart = new Chart(canvas, {
        type: "bar",
        data: {
            labels: ["Income", "Expenses"],
            datasets: [{
                data: [income, expense],
                backgroundColor: ["#35c996", "#ee858d"],
                borderRadius: 7,
                borderSkipped: false,
                maxBarThickness: 58
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: context => money(context.raw)
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: isDark ? "#9ba7bc" : "#7c879b",
                        font: {
                            family: "DM Sans",
                            size: 10
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: isDark ? "#293448" : "#edf0f6",
                        drawTicks: false
                    },
                    border: {
                        display: false,
                        dash: [3, 4]
                    },
                    ticks: {
                        color: isDark ? "#9ba7bc" : "#7c879b",
                        padding: 8,
                        font: {
                            family: "DM Sans",
                            size: 9
                        },
                        callback: value =>
                            value >= 1000
                                ? `₹${value / 1000}k`
                                : `₹${value}`
                    }
                }
            }
        }
    });
}

function generateAISummary(income, expense, totalMoney) {
    if (!aiText) return;

    if (!transactions.length) {
        aiText.textContent =
            "Your dashboard is ready. Add a few transactions and set a budget to see a useful snapshot of your money habits.";
    } else if (!budget) {
        aiText.textContent =
            `You've recorded ${money(income)} in income and ${money(expense)} in expenses. Set a monthly budget to get a clearer spending target.`;
    } else if (expense > budget) {
        aiText.textContent =
            `Your expenses are ${money(expense - budget)} above your budget. Check your non-essential purchases and set a realistic limit for the rest of the month.`;
    } else {
        aiText.textContent =
            `Your total money is ${money(totalMoney)} (budget + income − expenses). You have ${money(budget - expense)} of your monthly budget remaining.`;
    }
}

function askAI() {
    const input = document.getElementById("aiQuestion");
    const question = input?.value.trim().toLowerCase();
    const response = document.getElementById("aiResponse");

    if (!response) return;

    if (!question) {
        response.textContent =
            "Type a question first—for example, “How can I save more?”";
        return;
    }

    if (question.includes("save") || question.includes("saving")) {
        response.textContent =
            "Try setting an automatic savings target, planning purchases before shopping, and reviewing small recurring expenses each week.";
    } else if (question.includes("budget")) {
        response.textContent = budget
            ? `Your current monthly budget is ${money(budget)}. Compare your recorded expenses with this limit regularly and leave room for unexpected costs.`
            : "Start by listing essential costs, setting a realistic monthly limit, and tracking every expense against it.";
    } else if (question.includes("food") || question.includes("grocery")) {
        response.textContent =
            "Plan meals before shopping, make a grocery list, compare unit prices, and set a weekly food limit.";
    } else if (question.includes("shopping") || question.includes("buy")) {
        response.textContent =
            "Use a 24-hour pause for non-essential purchases, compare prices, and decide on a monthly shopping cap.";
    } else if (question.includes("expense") || question.includes("spend")) {
        response.textContent =
            "Review your transaction list by category, identify repeat purchases, and choose one flexible expense to reduce this week.";
    } else if (question.includes("income") || question.includes("balance")) {
        response.textContent =
            `For the selected month, income is ${incomeEl?.textContent || money(0)} and expenses are ${expenseEl?.textContent || money(0)}.`;
    } else {
        response.textContent =
            "A simple starting point: track spending daily, review your budget weekly, and set one specific savings goal.";
    }
}

function deleteTransaction(id) {
    transactions = transactions.filter(
        transaction => transaction.id !== id
    );

    saveData();
    updateUI();
}

function resetAll() {
    if (confirm("Delete all transactions and your saved budget? This cannot be undone.")) {
        transactions = [];
        budgetByMonth = {};
        budget = 0;

        saveData();

        const budgetInput = document.getElementById("budgetInput");

        if (budgetInput) {
            budgetInput.value = "";
        }

        updateUI();
    }
}

const toggleBtn = document.getElementById("themeToggle");

function applyTheme(theme) {
    document.body.classList.toggle("dark", theme === "dark");

    if (toggleBtn) {
        toggleBtn.innerHTML = theme === "dark"
            ? "<span>☀</span> Switch to light mode"
            : "<span>◐</span> Switch appearance";
    }

    localStorage.setItem("theme", theme);

    const month = selectedMonth();

    const income = transactions
        .filter(t => t.date.startsWith(month) && t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0);

    const expense = transactions
        .filter(t => t.date.startsWith(month) && t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);

    updateChart(income, expense);
}

toggleBtn?.addEventListener("click", () => {
    applyTheme(
        document.body.classList.contains("dark")
            ? "light"
            : "dark"
    );
});

applyTheme(
    localStorage.getItem("theme") === "dark"
        ? "dark"
        : "light"
);

updateUI();
