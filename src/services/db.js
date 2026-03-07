import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

const ACCOUNTS_COL = 'accounts';
const TRANSACTIONS_COL = 'transactions';
const CATEGORIES_COL = 'categories';

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
  const docRef = await addDoc(collection(db, TRANSACTIONS_COL), payload);
  return { id: docRef.id, ...payload };
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
      const dateA = a.date.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date.toDate ? b.date.toDate() : new Date(b.date);
      return dateB.getTime() - dateA.getTime();
  });
};

export const deleteTransaction = async (id) => {
  const docRef = doc(db, TRANSACTIONS_COL, id);
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
