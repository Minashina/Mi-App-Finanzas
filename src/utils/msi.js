import { isWithinInterval, parseISO, startOfMonth, endOfMonth, addMonths, differenceInMonths, isBefore, isAfter, format } from 'date-fns';

/**
 * Calcula la mensualidad de los MSI correspondientes al mes indicado (por defecto mes actual)
 * @param {Array} transactions 
 * @param {Date} targetMonth 
 * @param {Boolean} onlyUnpaid Si es true, excluye los meses que ya están pagados
 * @param {Boolean} onlyPaid Si es true, solo incluye los meses pagados
 * @returns {Number} Total a sumar para el mes por gastos MSI
 */
export const calculateMSIForMonth = (transactions, targetMonth = new Date(), onlyUnpaid = false, onlyPaid = false) => {
  const targetStart = startOfMonth(targetMonth);
  const targetEnd = endOfMonth(targetMonth);
  const targetMonthStr = format(targetMonth, 'yyyy-MM');
  
  let totalMsiForMonth = 0;

  transactions.forEach(tx => {
    if (tx.isMSI && tx.msiData) {
      const { startMonth, endMonth, monthlyAmount, paidMonths = [] } = tx.msiData;
      // startMonth y endMonth vienen en formato "YYYY-MM"
      const start = startOfMonth(parseISO(`${startMonth}-01`));
      const end = endOfMonth(parseISO(`${endMonth}-01`));

      // Si el mes objetivo está dentro del periodo de cobro, sumamos la mensualidad
      if (!isBefore(targetStart, start) && !isAfter(targetEnd, end)) {
        const isPaid = paidMonths.includes(targetMonthStr);
        if (onlyUnpaid && isPaid) return;
        if (onlyPaid && !isPaid) return;

        totalMsiForMonth += monthlyAmount;
      }
    }
  });

  return totalMsiForMonth;
};

/**
 * Calcula la deuda futura por MSI (para graficar o mostrar proyección de los próximos N meses)
 * @param {Array} transactions 
 * @param {Number} monthsToProject 
 * @returns {Array} Array con objetos de proyección por mes 
 */
export const projectFutureMSIDebt = (transactions, monthsToProject = 12) => {
  const projection = [];
  let currentMonth = new Date();

  for (let i = 0; i < monthsToProject; i++) {
    const targetMonth = addMonths(currentMonth, i);
    const msiTotal = calculateMSIForMonth(transactions, targetMonth);
    projection.push({
      date: targetMonth,
      amount: msiTotal
    });
  }

  return projection;
};

/**
 * Helper: Calcula el mes de inicio y fin dado un número de meses, basado en la fecha de la transacción
 */
export const calculateMSIPeriod = (transactionDate, months, cutoffDay = null) => {
  // Aseguramos que transactionDate sea un Date válido local
  let start = startOfMonth(transactionDate);
  
  if (cutoffDay) {
      const txDay = transactionDate.getDate();
      // Si el día de la transacción es igual o mayor al día de corte, 
      // el cobro pasa para el siguiente periodo (siguiente mes).
      if (txDay >= cutoffDay) {
          start = startOfMonth(addMonths(transactionDate, 1));
      }
  }
  
  const end = addMonths(start, months - 1); 
  
  // Format to YYYY-MM
  const formatYYYYMM = (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      return `${y}-${m}`;
  };
  
  return {
    startMonth: formatYYYYMM(start),
    endMonth: formatYYYYMM(end)
  };
};

/**
 * Calcula la deuda remanente real y ponderada en el tiempo de una transacción MSI.
 * @param {Object} tx - La transacción MSI
 * @returns {Number} La deuda que queda por pagar al día de hoy.
 */
export const calculateRemainingMSIDebt = (tx) => {
  if (!tx.isMSI || !tx.msiData || !tx.msiData.endDate) return 0;
  
  // Utilizar timezone actual
  const today = new Date();
  
  // La endDate es la fecha donde termina de pagar
  const endDate = tx.msiData.endDate.toDate ? tx.msiData.endDate.toDate() : new Date(tx.msiData.endDate);
  
  // Si ya pasamos la endDate, ya no debe nada
  if (isAfter(today, endDate)) {
      return 0;
  }
  
  // Calculamos los meses de diferencia entre hoy y el fin del adeudo
  let monthsLeft = differenceInMonths(endDate, today);
  
  // Prevensión: en caso de que meses restantes sea mayor que los originales (por error de fecha de entrada etc.)
  if (monthsLeft > tx.msiData.totalMonths) {
      monthsLeft = tx.msiData.totalMonths;
  }
  
  // Si mesesIzq es negativo, devuelve 0 (ya validado por el if() de arriba, pero por seguridad)
  if (monthsLeft <= 0) return 0;

  // Ajuste fino: restar los meses que el usuario explícitamente marcó como pagados
  // pero que podrían no haber sido descontados solo por fecha
  const paidMonthsCount = (tx.msiData.paidMonths || []).length;
  // Es mejor simplemente tomar "meses totales - meses pagados" si el usuario usa trackeo manual
  const remainingByPaid = tx.msiData.totalMonths - paidMonthsCount;
  
  // Usamos el trackeo manual como más confiable, pero sin exceder lo marcado por tiempo.
  return Math.min(monthsLeft, remainingByPaid) * tx.msiData.monthlyAmount;
};
