import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where, orderBy, getDoc, increment, writeBatch, arrayUnion, runTransaction } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { toJSDate } from '../utils/format';

const ACCOUNTS_COL = 'accounts';
const TRANSACTIONS_COL = 'transactions';
const CATEGORIES_COL = 'categories';
const FIXED_EXPENSES_COL = 'fixedExpenses'; // Nueva colección V3
const SAVINGS_COL = 'savings'; // Nueva colección V4

// Verifica si el usuario está autenticado antes de operar
const getExpectedUid = () => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Usuario no autenticado.");
  return uid;
};

// ==========================================
// ACCOUNTS (CUENTAS/TARJETAS)
// ==========================================

export const addAccount = async (accountData) => {
  const uid = getExpectedUid();
  const payload = { ...accountData, uid, createdAt: new Date() };
  const docRef = await addDoc(collection(db, ACCOUNTS_COL), payload);
  return { id: docRef.id, ...payload };
};

export const getAccounts = async () => {
  if (!auth.currentUser) return [];
  const q = query(
    collection(db, ACCOUNTS_COL), 
    where("uid", "==", auth.currentUser.uid),
    orderBy('name')
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateAccount = async (id, data) => {
  const docRef = doc(db, ACCOUNTS_COL, id);
  await updateDoc(docRef, data);
};

export const deleteAccount = async (id) => {
  const docRef = doc(db, ACCOUNTS_COL, id);
  await deleteDoc(docRef);
};


// ==========================================
// TRANSACTIONS (TRANSACCIONES)
// ==========================================

export const addTransaction = async (transactionData) => {
  const uid = getExpectedUid();
  const payload = { ...transactionData, uid };

  const accountRef = doc(db, ACCOUNTS_COL, transactionData.accountId);
  const accountSnap = await getDoc(accountRef);

  const batch = writeBatch(db);

  if (accountSnap.exists()) {
      const account = accountSnap.data();
      if (account.type === 'debit' || account.type === 'cash') {
          const isExpense = transactionData.type === 'expense';
          const amountChange = isExpense ? -transactionData.amount : transactionData.amount;
          batch.update(accountRef, { balance: increment(amountChange) });
      }
  }

  const newTxRef = doc(collection(db, TRANSACTIONS_COL));
  batch.set(newTxRef, payload);

  await batch.commit();
  return { id: newTxRef.id, ...payload };
};

export const getTransactions = async () => {
    if (!auth.currentUser) return [];
  // Importante: Para usar orderBy y where en diferentes campos en Firestore se requiere Indice Compuesto.
  // Almacenamos temporalmente sin orderBy y ordenamos en front-end si aún no creas el índice.
  const q = query(
    collection(db, TRANSACTIONS_COL),
    where("uid", "==", auth.currentUser.uid)
  );
  const snap = await getDocs(q);
  const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  // Ordenado local para no obligar a un índice compuesto inmediato en la demo
  return data.sort((a, b) => {
      const dateA = toJSDate(a.date);
      const dateB = toJSDate(b.date);
      return dateB.getTime() - dateA.getTime();
  });
};

export const deleteTransaction = async (id) => {
  const txRef = doc(db, TRANSACTIONS_COL, id);
  const snap = await getDoc(txRef);

  const batch = writeBatch(db);

  if (snap.exists()) {
      const tx = snap.data();
      const accountRef = doc(db, ACCOUNTS_COL, tx.accountId);
      const accountSnap = await getDoc(accountRef);

      if (accountSnap.exists()) {
          const account = accountSnap.data();
          if (account.type === 'debit' || account.type === 'cash') {
              const isExpense = tx.type === 'expense';
              const amountChange = isExpense ? tx.amount : -tx.amount;
              batch.update(accountRef, { balance: increment(amountChange) });
          }
      }
  }

  batch.delete(txRef);
  await batch.commit();
};

// ==========================================
// FIXED EXPENSES (GASTOS FIJOS) V3
// ==========================================

export const addFixedExpense = async (expenseData) => {
  const uid = getExpectedUid();
  const payload = { ...expenseData, uid, createdAt: new Date() };
  const docRef = await addDoc(collection(db, FIXED_EXPENSES_COL), payload);
  return { id: docRef.id, ...payload };
};

export const getFixedExpenses = async () => {
    if (!auth.currentUser) return [];
    const q = query(
        collection(db, FIXED_EXPENSES_COL),
        where("uid", "==", auth.currentUser.uid)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const deleteFixedExpense = async (id) => {
    const docRef = doc(db, FIXED_EXPENSES_COL, id);
    await deleteDoc(docRef);
};
// ==========================================
// CATEGORIES (CATEGORÍAS CUSTOM)
// ==========================================

export const addCategory = async (name) => {
  const uid = getExpectedUid();
  const payload = { name, uid };
  const docRef = await addDoc(collection(db, CATEGORIES_COL), payload);
  return { id: docRef.id, ...payload };
};

export const getCustomCategories = async () => {
  if (!auth.currentUser) return [];
  const q = query(
    collection(db, CATEGORIES_COL),
    where("uid", "==", auth.currentUser.uid)
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => doc.data().name);
};


// ==========================================
// SAVINGS (AHORROS) V4
// ==========================================

export const addSavingGoal = async (savingData) => {
  const uid = getExpectedUid();
  const payload = { 
    ...savingData, 
    uid, 
    createdAt: new Date(),
    lastYieldDate: new Date(),
    yieldHistory: []
  };
  const docRef = await addDoc(collection(db, SAVINGS_COL), payload);
  return { id: docRef.id, ...payload };
};

export const getSavings = async () => {
    if (!auth.currentUser) return [];
    const q = query(
        collection(db, SAVINGS_COL),
        where("uid", "==", auth.currentUser.uid)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addFundsToSaving = async (savingId, accountId, amount) => {
    getExpectedUid();

    const batch = writeBatch(db);

    batch.update(doc(db, ACCOUNTS_COL, accountId), { balance: increment(-amount) });
    batch.update(doc(db, SAVINGS_COL, savingId), { savedAmount: increment(amount) });

    const newTxRef = doc(collection(db, TRANSACTIONS_COL));
    batch.set(newTxRef, {
        amount,
        type: 'expense',
        category: 'Ahorro',
        description: 'Aporte a meta de ahorro',
        date: new Date(),
        accountId,
        uid: auth.currentUser.uid,
        isMSI: false
    });

    await batch.commit();
};

export const withdrawFromSaving = async (savingId, accountId, amount) => {
    getExpectedUid();

    const batch = writeBatch(db);

    batch.update(doc(db, ACCOUNTS_COL, accountId), { balance: increment(amount) });
    batch.update(doc(db, SAVINGS_COL, savingId), { savedAmount: increment(-amount) });

    const newTxRef = doc(collection(db, TRANSACTIONS_COL));
    batch.set(newTxRef, {
        amount,
        type: 'income',
        category: 'Ahorro',
        description: 'Retiro de meta de ahorro',
        date: new Date(),
        accountId,
        uid: auth.currentUser.uid,
        isMSI: false
    });

    await batch.commit();
};

export const deleteSavingGoal = async (id) => {
    const docRef = doc(db, SAVINGS_COL, id);
    await deleteDoc(docRef);
};

// ==========================================
// MSI PAYMENTS
// ==========================================

export const payCreditCard = async (creditAccountId, debitAccountId, amount, monthString) => {
    getExpectedUid();

    const batch = writeBatch(db);

    batch.update(doc(db, ACCOUNTS_COL, debitAccountId), { balance: increment(-amount) });

    const expenseTxRef = doc(collection(db, TRANSACTIONS_COL));
    batch.set(expenseTxRef, {
        amount,
        type: 'expense',
        category: 'Pago de Tarjeta',
        description: `Transferencia a TC (${monthString})`,
        date: new Date(),
        accountId: debitAccountId,
        uid: auth.currentUser.uid,
        isMSI: false
    });

    const incomeTxRef = doc(collection(db, TRANSACTIONS_COL));
    batch.set(incomeTxRef, {
        amount,
        type: 'income',
        category: 'Pago de Tarjeta',
        description: `Pago recibido (${monthString})`,
        date: new Date(),
        accountId: creditAccountId,
        uid: auth.currentUser.uid,
        isMSI: false
    });

    await batch.commit();
};

// ==========================================
// YIELDS ACCRUAL (RENDIMIENTOS DIARIOS)
// ==========================================

export const processSavingsYields = async (savings) => {
    if (!savings || savings.length === 0) return null;
    let globalUpdates = false;

    // --- AUTO-HEALING: Limpiar posibles duplicados generados por la concurrencia anterior ---
    const cleanupBatch = writeBatch(db);
    let needsCleanup = false;

    for (let i = 0; i < savings.length; i++) {
        const s = savings[i];
        if (!s.yieldHistory || s.yieldHistory.length <= 1) continue;

        const yieldsByDate = {};
        const newHistory = [];
        let excessiveAmount = 0;

        s.yieldHistory.forEach(y => {
            if (!y.date) {
               newHistory.push(y); return;
            }
            const yDate = toJSDate(y.date);
            const tzOffset = yDate.getTimezoneOffset() * 60000;
            const localISOTime = (new Date(yDate - tzOffset)).toISOString().slice(0, -1).split('T')[0];

            if (!yieldsByDate[localISOTime]) {
                yieldsByDate[localISOTime] = [y];
                newHistory.push(y);
            } else {
                const isExactDup = yieldsByDate[localISOTime].some(existing => existing.amount === y.amount);
                if (isExactDup) {
                    excessiveAmount += y.amount;
                } else {
                    yieldsByDate[localISOTime].push(y);
                    newHistory.push(y);
                }
            }
        });

        if (excessiveAmount > 0) {
            const docRef = doc(db, SAVINGS_COL, s.id);
            // Usamos cálculos matemáticos absolutos para que sea idempotente
            const correctedAmount = s.savedAmount - excessiveAmount;
            cleanupBatch.update(docRef, {
                savedAmount: correctedAmount,
                yieldHistory: newHistory
            });
            
            savings[i] = {
                ...s,
                savedAmount: correctedAmount,
                yieldHistory: newHistory
            };
            needsCleanup = true;
            globalUpdates = true;
            console.log("Reparación automática: se restó de saldo extra $", excessiveAmount);
        }
    }

    if (needsCleanup) {
        await cleanupBatch.commit();
    }
    // --------------------------------------------------------------------------------------
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const today = new Date(todayStr); // Hoy a la medianoche

    // Verificar localmente primero para evitar transacciones innecesarias
    const savingsToUpdate = savings.filter(s => {
        if (!s.annualYield || s.annualYield <= 0 || s.savedAmount <= 0) return false;
        const lastUpdate = s.lastYieldDate ? toJSDate(s.lastYieldDate) : (s.createdAt ? toJSDate(s.createdAt) : today);
        const lastUpdateStr = lastUpdate.toISOString().split('T')[0];
        const lastUpdateAtMidnight = new Date(lastUpdateStr);
        const daysPassed = Math.floor((today - lastUpdateAtMidnight) / (1000 * 60 * 60 * 24));
        return daysPassed >= 1;
    });

    if (savingsToUpdate.length === 0) return null;

    const updatedLocally = [...savings];

    try {
        await runTransaction(db, async (transaction) => {
            const readDocs = [];
            // Fase de lectura
            for (const s of savingsToUpdate) {
                const docRef = doc(db, SAVINGS_COL, s.id);
                const snap = await transaction.get(docRef);
                readDocs.push({ docRef, snap, localSaving: s });
            }

            // Fase de chequeo y escritura
            for (const item of readDocs) {
                const { docRef, snap, localSaving } = item;
                if (!snap.exists()) continue;
                
                const data = snap.data();
                const sLastYield = data.lastYieldDate ? toJSDate(data.lastYieldDate) : (data.createdAt ? toJSDate(data.createdAt) : today);
                const lastUpdateStr = sLastYield.toISOString().split('T')[0];
                const lastUpdateAtMidnight = new Date(lastUpdateStr);
                const daysPassed = Math.floor((today - lastUpdateAtMidnight) / (1000 * 60 * 60 * 24));

                // Asegurar que dentro de la transacción los días siguen siendo > 0
                if (daysPassed >= 1) {
                    const savedAmt = data.savedAmount || 0;
                    const dailyYield = (savedAmt * (localSaving.annualYield / 100)) / 365;
                    const yieldGenerated = dailyYield * daysPassed;

                    const yieldEntry = { date: now, amount: yieldGenerated, days: daysPassed };

                    // Usar actualización calculada exacta para evitar bugs de concurrencia y reemplazos destructivos
                    transaction.update(docRef, {
                        savedAmount: savedAmt + yieldGenerated,
                        lastYieldDate: now,
                        yieldHistory: arrayUnion(yieldEntry)
                    });

                    // Modificar la copia en memoria para refrescar el Dashboard instantáneamente
                    const index = updatedLocally.findIndex(x => x.id === localSaving.id);
                    if (index !== -1) {
                        updatedLocally[index] = {
                            ...updatedLocally[index],
                            savedAmount: savedAmt + yieldGenerated,
                            lastYieldDate: now,
                            yieldHistory: [...(data.yieldHistory || []), yieldEntry]
                        };
                        globalUpdates = true;
                    }
                }
            }
        });

        if (globalUpdates) return updatedLocally;

    } catch (e) {
        console.error("Error al procesar rendimientos diarios concurrentes:", e);
    }

    return null;
};

