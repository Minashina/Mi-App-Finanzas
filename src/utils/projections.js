import { getDaysInMonth, getDate, format } from 'date-fns';
import { toJSDate } from './format';

/**
 * Calcula el "Burn Rate" (Ritmo de Gasto) del mes actual.
 * @param {number} realAvailableBalance - Saldo total actual.
 * @param {number} variableSpendThisMonth - Total gastado en variables este mes.
 * @param {Date} currentDate - Fecha actual.
 * @returns {Object} { status: 'green' | 'yellow' | 'red', actualDailySpend, safeDailySpend, remainingDays }
 */
export const calculateBurnRate = (realAvailableBalance, variableSpendThisMonth, currentDate) => {
    const currentDay = getDate(currentDate);
    const totalDays = getDaysInMonth(currentDate);
    const remainingDays = totalDays - currentDay + 1; // Incluyendo hoy

    const actualDailySpend = currentDay > 0 ? variableSpendThisMonth / currentDay : 0;
    
    // Lo que podemos gastar por día asumiendo que el saldo actual (más lo que se va a gastar) 
    // debe durar hasta fin de mes. 
    // realAvailableBalance es el saldo HOY. 
    const safeDailySpend = remainingDays > 0 ? realAvailableBalance / remainingDays : 0;

    let status = 'green';
    
    // Si el gasto actual es 0 y el saldo es 0, no hacer divisiones raras
    if (actualDailySpend === 0 && safeDailySpend === 0) {
        status = 'green';
    } else if (actualDailySpend > safeDailySpend) {
        status = 'red';
    } else if (actualDailySpend > safeDailySpend * 0.8) {
        status = 'yellow';
    }

    return {
        status,
        actualDailySpend,
        safeDailySpend,
        remainingDays
    };
};

/**
 * Calcula los datos proyectados del mes para Recharts.
 */
export const calculateProjectedBalance = (thisMonthTxs, currentBalance, unpaidFixedExpensesAmount, currentDate) => {
    const totalDays = getDaysInMonth(currentDate);
    const currentDay = getDate(currentDate);
    
    const txsByDay = {};
    for (let i = 1; i <= totalDays; i++) {
        txsByDay[i] = { income: 0, expense: 0 };
    }
    
    thisMonthTxs.forEach(tx => {
        const date = toJSDate(tx.date);
        const day = getDate(date);
        if (tx.type === 'expense') {
            txsByDay[day].expense += tx.amount;
        } else if (tx.type === 'income') {
            txsByDay[day].income += tx.amount;
        }
    });

    const pastBalances = [];
    let backBalance = currentBalance;
    
    for (let i = currentDay; i >= 1; i--) {
        pastBalances.unshift({
            day: i,
            date: format(new Date(currentDate.getFullYear(), currentDate.getMonth(), i), 'dd MMM'),
            realBalance: backBalance,
            projectedBalance: null
        });
        
        backBalance = backBalance + txsByDay[i].expense - txsByDay[i].income;
    }
    
    const variableTxs = thisMonthTxs.filter(tx => tx.type === 'expense' && !tx.isMSI && !tx.fixedExpenseId);
    const totalVariableSpend = variableTxs.reduce((acc, tx) => acc + tx.amount, 0);
    const avgDailyVariable = currentDay > 0 ? totalVariableSpend / currentDay : 0;
    
    const remainingDays = totalDays - currentDay;
    const dailyFixedPortion = remainingDays > 0 ? unpaidFixedExpensesAmount / remainingDays : unpaidFixedExpensesAmount;
    
    const futureBalances = [];
    let forwardBalance = currentBalance;
    
    for (let i = currentDay + 1; i <= totalDays; i++) {
        forwardBalance = forwardBalance - avgDailyVariable - dailyFixedPortion;
        futureBalances.push({
            day: i,
            date: format(new Date(currentDate.getFullYear(), currentDate.getMonth(), i), 'dd MMM'),
            realBalance: null,
            projectedBalance: Math.max(0, forwardBalance) 
        });
    }

    if (pastBalances.length > 0) {
        pastBalances[pastBalances.length - 1].projectedBalance = pastBalances[pastBalances.length - 1].realBalance;
    }

    return [...pastBalances, ...futureBalances];
};
