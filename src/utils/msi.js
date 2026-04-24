import { isWithinInterval, parseISO, startOfMonth, endOfMonth, addMonths, differenceInMonths, differenceInCalendarMonths, isBefore, isAfter, format } from 'date-fns';
import { toJSDate } from './format';

export const calculateMSIForMonth = (transactions, targetMonth = new Date()) => {
  const targetStart = startOfMonth(targetMonth);
  const targetEnd = endOfMonth(targetMonth);
  
  let totalMsiForMonth = 0;

  transactions.forEach(tx => {
    if (tx.isMSI && tx.msiData) {
      const { startMonth, endMonth, monthlyAmount } = tx.msiData;
      const start = startOfMonth(parseISO(`${startMonth}-01`));
      const end = endOfMonth(parseISO(`${endMonth}-01`));

      // Si el mes objetivo está dentro del periodo de cobro, sumamos la mensualidad
      if (!isBefore(targetStart, start) && !isAfter(targetEnd, end)) {
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
 * Cuántas cuotas MSI ya se han facturado hasta targetDate (incluyendo el mes actual si aplica).
 * Útil para calcular deuda real cuando los pagos están registrados en la app.
 * @param {Object} tx - La transacción MSI
 * @param {Date} targetDate - Fecha de corte (default: hoy)
 * @returns {Number} Monto total facturado hasta esa fecha.
 */
export const calculateBilledMSISoFar = (tx, targetDate = new Date()) => {
  if (!tx.isMSI || !tx.msiData?.startMonth) return 0;
  const startDate = parseISO(`${tx.msiData.startMonth}-01`);
  if (isAfter(startDate, targetDate)) return 0;
  const monthsElapsed = differenceInCalendarMonths(targetDate, startDate) + 1;
  const monthsBilled = Math.min(monthsElapsed, tx.msiData.totalMonths || 1);
  return monthsBilled * (tx.msiData.monthlyAmount || 0);
};

/**
 * Calcula la deuda remanente real y ponderada en el tiempo de una transacción MSI.
 * @param {Object} tx - La transacción MSI
 * @param {Date} targetDate - Fecha hacia la cual calcular la deuda (default: hoy)
 * @returns {Number} La deuda que queda por pagar a esa fecha.
 */
export const calculateRemainingMSIDebt = (tx, targetDate = new Date()) => {
  if (!tx.isMSI || !tx.msiData || !tx.msiData.endDate) return 0;
  
  // Utilizar la fecha objetivo (targetDate) para evaluación
  const today = targetDate;
  
  // La endDate es la fecha donde termina de pagar
  const endDate = toJSDate(tx.msiData.endDate);
  
  // Si ya pasamos la endDate, ya no debe nada
  if (isAfter(today, endDate)) {
      return 0;
  }
  
  // Calculamos los meses de diferencia calendárica entre hoy y el fin del adeudo
  let monthsLeft = differenceInCalendarMonths(endDate, today);

  // Prevensión: en caso de que meses restantes sea mayor que los originales (por error de fecha de entrada etc.)
  if (monthsLeft > tx.msiData.totalMonths) {
      monthsLeft = tx.msiData.totalMonths;
  }

  // Si estamos en el último mes del MSI, differenceInCalendarMonths devuelve 0 aunque aún no llega endDate.
  // Garantizamos al menos 1 cuota para que el mes final no desaparezca del cálculo.
  if (monthsLeft <= 0) monthsLeft = 1;

  // El adeudo siempre es el de los meses restantes por la mensualidad globalmente hablando
  return monthsLeft * tx.msiData.monthlyAmount;
};
