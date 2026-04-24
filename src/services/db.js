import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where, orderBy, getDoc, increment, writeBatch } from 'firebase/firestore';
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
  const payload = { ...savingData, uid, createdAt: new Date() };
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
