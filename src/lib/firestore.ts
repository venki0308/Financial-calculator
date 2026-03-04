/**
 * Firestore Service
 * Handles all database operations for FinCalix
 * Collections: users/{uid}/savedCalculations, users/{uid}/history, users/{uid}/budgetEntries
 */
import {
    doc, setDoc, getDoc, updateDoc,
    collection, addDoc, getDocs, deleteDoc, query, orderBy, limit,
    serverTimestamp, Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

// ─── User Profile ──────────────────────────────────────────────────────────

export interface UserProfile {
    uid: string;
    name: string;
    email: string;
    photoURL?: string;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

export async function createOrUpdateUserProfile(profile: UserProfile) {
    const ref = doc(db, 'users', profile.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
        await setDoc(ref, { ...profile, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    } else {
        await updateDoc(ref, { name: profile.name, photoURL: profile.photoURL || null, updatedAt: serverTimestamp() });
    }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? (snap.data() as UserProfile) : null;
}

// ─── Saved Calculations ────────────────────────────────────────────────────

export interface SavedCalculation {
    id?: string;
    type: string;
    inputs: Record<string, any>;
    result: Record<string, any>;
    note?: string;
    savedAt?: Timestamp;
}

export async function saveCalculation(uid: string, calc: SavedCalculation) {
    const ref = collection(db, 'users', uid, 'savedCalculations');
    return addDoc(ref, { ...calc, savedAt: serverTimestamp() });
}

export async function getSavedCalculations(uid: string): Promise<SavedCalculation[]> {
    const q = query(collection(db, 'users', uid, 'savedCalculations'), orderBy('savedAt', 'desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as SavedCalculation));
}

export async function deleteSavedCalculation(uid: string, calcId: string) {
    await deleteDoc(doc(db, 'users', uid, 'savedCalculations', calcId));
}

// ─── Calculation History ────────────────────────────────────────────────────

export interface HistoryEntry {
    id?: string;
    type: string;
    inputs: Record<string, any>;
    result: Record<string, any>;
    timestamp?: Timestamp;
}

export async function addHistoryEntry(uid: string, entry: HistoryEntry) {
    const ref = collection(db, 'users', uid, 'history');
    return addDoc(ref, { ...entry, timestamp: serverTimestamp() });
}

export async function getHistory(uid: string): Promise<HistoryEntry[]> {
    const q = query(collection(db, 'users', uid, 'history'), orderBy('timestamp', 'desc'), limit(100));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as HistoryEntry));
}

export async function clearHistory(uid: string) {
    const q = query(collection(db, 'users', uid, 'history'));
    const snap = await getDocs(q);
    const deletes = snap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletes);
}

// ─── Budget Entries ─────────────────────────────────────────────────────────

export interface BudgetEntry {
    id?: string;
    category: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    date: string;
    createdAt?: Timestamp;
}

export async function addBudgetEntry(uid: string, entry: BudgetEntry) {
    const ref = collection(db, 'users', uid, 'budgetEntries');
    return addDoc(ref, { ...entry, createdAt: serverTimestamp() });
}

export async function getBudgetEntries(uid: string): Promise<BudgetEntry[]> {
    const q = query(collection(db, 'users', uid, 'budgetEntries'), orderBy('createdAt', 'desc'), limit(200));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as BudgetEntry));
}

export async function deleteBudgetEntry(uid: string, entryId: string) {
    await deleteDoc(doc(db, 'users', uid, 'budgetEntries', entryId));
}
