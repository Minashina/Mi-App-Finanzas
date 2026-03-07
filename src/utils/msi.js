import { isWithinInterval, parseISO, startOfMonth, endOfMonth, addMonths, differenceInMonths, isBefore, isAfter } from 'date-fns';

/**
 * Calcula la mensualidad de los MSI correspondientes al mes indicado (por defecto mes actual)
 * @param {Array} transactions 
 * @param {Date} targetMonth 
 * @returns {Number} Total a sumar para el mes por gastos MSI
 */
export const calculateMSIForMonth = (transactions, targetMonth = new Date()) => {
  const targetStart = startOfMonth(targetMonth);
  const targetEnd = endOfMonth(targetMonth);
  
  let totalMsiForMonth = 0;

  transactions.forEach(tx => {
    if (tx.isMSI && tx.msiData) {
      const { startMonth, endMonth, monthlyAmount } = tx.msiData;
      // startMonth y endMonth vienen en formato "YYYY-MM"
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
export const calculateMSIPeriod = (transactionDate, months) => {
  // Ej: Si la compra es el 15 de Nov 2023 a 3 meses.
  // El primer cobro podría ser en el mismo mes o en el siguiente dependiendo de la fecha de corte,
  // Para simplificar, asumiremos que empieza el mes de la compra (o el mes siguiente si así se configura).
  // Aquí usamos el mes actual de la compra como inicio.
  
  const start = startOfMonth(transactionDate);
  const end = addMonths(start, months - 1); // Si es a 3 meses, incluye mes 0, 1 y 2
  
  // Format to YYYY-MM
  const formatYYYYMM = (date) => date.toISOString().slice(0, 7);
  
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

  return monthsLeft * tx.msiData.monthlyAmount;
};
