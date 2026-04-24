export const formatCurrency = (amount) => {
  if (amount == null || isNaN(amount)) return '0.00';
  return Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// Convierte un Timestamp de Firestore o cualquier valor de fecha a Date nativo de JS.
export const toJSDate = (value) => value?.toDate ? value.toDate() : new Date(value);

// Formatea el input de montos mientras el usuario escribe: filtra caracteres inválidos,
// previene múltiples puntos decimales y actualiza el display con separadores de miles.
export const formatAmountInput = (e, setter, displaySetter) => {
    const rawValue = e.target.value.replace(/[^0-9.]/g, '');
    const parts = rawValue.split('.');
    if (parts.length > 2) return;
    setter(rawValue);
    if (rawValue === '') { displaySetter(''); return; }
    if (parts.length === 2) {
        displaySetter(`${new Intl.NumberFormat('en-US').format(parts[0] || '0')}.${parts[1]}`);
    } else {
        displaySetter(new Intl.NumberFormat('en-US').format(rawValue));
    }
};
