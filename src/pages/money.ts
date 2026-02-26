interface Transaction {
    id: number;
    type: 'income' | 'expense';
    amount: number;
    description: string;
    date: string;
}

const STORAGE_KEY = 'money-transactions';

function loadTransactions(): Transaction[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((item): item is Transaction =>
            item &&
            (item.type === 'income' || item.type === 'expense') &&
            typeof item.amount === 'number' &&
            typeof item.description === 'string' &&
            typeof item.date === 'string'
        );
    } catch (error) {
        console.warn('Failed to load money transactions:', error);
        return [];
    }
}

function saveTransactions(transactions: Transaction[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

document.addEventListener('DOMContentLoaded', () => {
    const transactions = loadTransactions();

    const totalIncomeEl = document.getElementById('total-income');
    const totalExpensesEl = document.getElementById('total-expenses');
    const netAmountEl = document.getElementById('net-amount');
    const transactionsListEl = document.getElementById('transactions-list');
    const addIncomeBtn = document.getElementById('add-income-btn');
    const addExpenseBtn = document.getElementById('add-expense-btn');
    const viewTransactionsBtn = document.getElementById('view-transactions-btn');

    if (
        !totalIncomeEl ||
        !totalExpensesEl ||
        !netAmountEl ||
        !transactionsListEl ||
        !addIncomeBtn ||
        !addExpenseBtn ||
        !viewTransactionsBtn
    ) {
        return;
    }
    const totalIncomeDisplay = totalIncomeEl as HTMLElement;
    const totalExpensesDisplay = totalExpensesEl as HTMLElement;
    const netAmountDisplay = netAmountEl as HTMLElement;
    const transactionsList = transactionsListEl as HTMLElement;
    const addIncome = addIncomeBtn as HTMLElement;
    const addExpense = addExpenseBtn as HTMLElement;
    const viewTransactions = viewTransactionsBtn as HTMLElement;

    function updateFinancialOverview() {
        const totalIncome = transactions
            .filter((t) => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpenses = transactions
            .filter((t) => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const netAmount = totalIncome - totalExpenses;

        totalIncomeDisplay.textContent = `$${totalIncome.toFixed(2)}`;
        totalExpensesDisplay.textContent = `$${totalExpenses.toFixed(2)}`;
        netAmountDisplay.textContent = `$${netAmount.toFixed(2)}`;

        if (netAmount > 0) {
            netAmountDisplay.className = 'text-2xl font-bold text-green-700';
        } else if (netAmount < 0) {
            netAmountDisplay.className = 'text-2xl font-bold text-red-700';
        } else {
            netAmountDisplay.className = 'text-2xl font-bold text-blue-700';
        }
    }

    function updateTransactionsList() {
        if (transactions.length === 0) {
            transactionsList.innerHTML = `
                <div class="text-center text-gray-500 text-sm">
                    No transactions yet. Add your first income or expense!
                </div>
            `;
            return;
        }

        transactionsList.innerHTML = transactions.slice(0, 5).map((transaction) => `
            <div class="bg-gray-100 p-3 rounded-lg text-sm">
                <div class="flex justify-between items-center">
                    <div>
                        <div class="font-semibold">${transaction.description}</div>
                        <div class="text-gray-600">${new Date(transaction.date).toLocaleDateString()}</div>
                    </div>
                    <div class="text-right">
                        <div class="font-bold ${transaction.type === 'income' ? 'text-green-700' : 'text-red-700'}">
                            ${transaction.type === 'income' ? '+' : '-'}$${transaction.amount.toFixed(2)}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    function addTransaction(type: Transaction['type'], amount: number, description: string) {
        const transaction: Transaction = {
            id: Date.now(),
            type,
            amount,
            description,
            date: new Date().toISOString()
        };

        transactions.unshift(transaction);
        saveTransactions(transactions);
        updateFinancialOverview();
        updateTransactionsList();
    }

    function promptForTransaction(type: Transaction['type']) {
        const amountInput = window.prompt(`Enter ${type} amount:`);
        const parsedAmount = Number(amountInput);
        if (!amountInput || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
            window.alert('Please enter a valid amount.');
            return;
        }

        const description = window.prompt(`Enter description for this ${type}:`);
        if (!description) {
            window.alert('Please enter a description.');
            return;
        }

        addTransaction(type, parsedAmount, description);
    }

    addIncome.addEventListener('click', () => promptForTransaction('income'));
    addExpense.addEventListener('click', () => promptForTransaction('expense'));

    viewTransactions.addEventListener('click', () => {
        if (transactions.length === 0) {
            window.alert('No transactions to view yet.');
            return;
        }

        const allTransactions = transactions.map((t) =>
            `${t.type.toUpperCase()}: $${t.amount.toFixed(2)} - ${t.description} (${new Date(t.date).toLocaleDateString()})`
        ).join('\n');

        window.alert(`All Transactions:\n\n${allTransactions}`);
    });

    updateFinancialOverview();
    updateTransactionsList();
});
