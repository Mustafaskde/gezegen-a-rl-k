import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import type { Account, AppData, Category, Contact, Scheduled, Settings, Transaction } from './types';
import { buildDemoData, DATA_VERSION, emptyData } from './lib/seed';
import { nextDueDate, remaining, round2 } from './lib/finance';
import { addDays, diffDays, today } from './lib/date';
import { uid } from './lib/format';

const STORAGE_KEY = 'finans-yonetim:v1';

export type Action =
  | { type: 'account/save'; account: Account }
  | { type: 'account/delete'; id: string }
  | { type: 'contact/save'; contact: Contact }
  | { type: 'contact/delete'; id: string }
  | { type: 'category/save'; category: Category }
  | { type: 'category/delete'; id: string }
  | { type: 'tx/save'; tx: Transaction }
  | { type: 'tx/delete'; id: string }
  | { type: 'scheduled/save'; item: Scheduled }
  | { type: 'scheduled/delete'; id: string }
  | {
      type: 'scheduled/settle';
      scheduledId: string;
      accountId: string;
      date: string;
      amount: number;
      scheduledAmount: number;
      description: string;
    }
  | { type: 'settings/save'; settings: Partial<Settings> }
  | { type: 'data/replace'; data: AppData };

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [...list, item];
  const copy = list.slice();
  copy[i] = item;
  return copy;
}

function adjustPaid(scheduled: Scheduled[], id: string | undefined, delta: number): Scheduled[] {
  if (!id || !delta) return scheduled;
  return scheduled.map((s) => (s.id === id ? { ...s, paidAmount: round2(Math.max(0, s.paidAmount + delta)) } : s));
}

/** Tamamen kapanan tekrarlayan kayıt için bir sonraki dönemi oluşturur. */
function spawnNext(scheduled: Scheduled[], id: string): Scheduled[] {
  const s = scheduled.find((x) => x.id === id);
  if (!s || s.recurrence === 'yok' || s.nextSpawned || remaining(s) > 0) return scheduled;
  const due = nextDueDate(s.dueDate, s.recurrence);
  if (s.recurrenceEnd && due > s.recurrenceEnd) return scheduled;
  const shift = diffDays(due, s.dueDate);
  const next: Scheduled = { ...s, id: uid(), dueDate: due, issueDate: addDays(s.issueDate, shift), paidAmount: 0, nextSpawned: false };
  return [...scheduled.map((x) => (x.id === id ? { ...x, nextSpawned: true } : x)), next];
}

export function reducer(state: AppData, action: Action): AppData {
  const next = reduce(state, action);
  return next === state ? state : { ...next, updatedAt: new Date().toISOString() };
}

function reduce(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'account/save':
      return { ...state, accounts: upsert(state.accounts, action.account) };
    case 'account/delete': {
      // İşlemi olan hesap silinmez, arşivlenir; bakiye geçmişi bozulmasın.
      const used = state.transactions.some((t) => t.accountId === action.id || t.toAccountId === action.id);
      if (used) return { ...state, accounts: state.accounts.map((a) => (a.id === action.id ? { ...a, archived: true } : a)) };
      return { ...state, accounts: state.accounts.filter((a) => a.id !== action.id) };
    }
    case 'contact/save':
      return { ...state, contacts: upsert(state.contacts, action.contact) };
    case 'contact/delete':
      return {
        ...state,
        contacts: state.contacts.filter((c) => c.id !== action.id),
        transactions: state.transactions.map((t) => (t.contactId === action.id ? { ...t, contactId: undefined } : t)),
        scheduled: state.scheduled.map((s) => (s.contactId === action.id ? { ...s, contactId: undefined } : s)),
      };
    case 'category/save':
      return { ...state, categories: upsert(state.categories, action.category) };
    case 'category/delete':
      return {
        ...state,
        categories: state.categories.filter((c) => c.id !== action.id),
        transactions: state.transactions.map((t) => (t.categoryId === action.id ? { ...t, categoryId: undefined } : t)),
        scheduled: state.scheduled.map((s) => (s.categoryId === action.id ? { ...s, categoryId: undefined } : s)),
      };
    case 'tx/save': {
      const old = state.transactions.find((t) => t.id === action.tx.id);
      let tx = action.tx;
      let scheduled = state.scheduled;
      if (old?.scheduledId) {
        // Bağlı işlemin tutarı değiştiyse kapatılan vadeli tutar da orantılı güncellenir.
        const oldApplied = old.scheduledAmount ?? old.amount;
        const newApplied = old.amount ? round2((oldApplied * tx.amount) / old.amount) : tx.amount;
        tx = { ...tx, scheduledId: old.scheduledId, scheduledAmount: newApplied };
        scheduled = adjustPaid(scheduled, old.scheduledId, newApplied - oldApplied);
        scheduled = spawnNext(scheduled, old.scheduledId);
      }
      return { ...state, scheduled, transactions: upsert(state.transactions, tx) };
    }
    case 'tx/delete': {
      const old = state.transactions.find((t) => t.id === action.id);
      if (!old) return state;
      return {
        ...state,
        transactions: state.transactions.filter((t) => t.id !== action.id),
        scheduled: adjustPaid(state.scheduled, old.scheduledId, -(old.scheduledAmount ?? old.amount)),
      };
    }
    case 'scheduled/save':
      return { ...state, scheduled: spawnNext(upsert(state.scheduled, action.item), action.item.id) };
    case 'scheduled/delete':
      return {
        ...state,
        scheduled: state.scheduled.filter((s) => s.id !== action.id),
        transactions: state.transactions.map((t) => (t.scheduledId === action.id ? { ...t, scheduledId: undefined, scheduledAmount: undefined } : t)),
      };
    case 'scheduled/settle': {
      const s = state.scheduled.find((x) => x.id === action.scheduledId);
      if (!s) return state;
      const tx: Transaction = {
        id: uid(),
        kind: s.kind === 'tahsilat' ? 'gelir' : 'gider',
        date: action.date,
        amount: round2(action.amount),
        accountId: action.accountId,
        categoryId: s.categoryId,
        contactId: s.contactId,
        description: action.description,
        scheduledId: s.id,
        scheduledAmount: round2(action.scheduledAmount),
      };
      const scheduled = spawnNext(adjustPaid(state.scheduled, s.id, action.scheduledAmount), s.id);
      return { ...state, scheduled, transactions: [...state.transactions, tx] };
    }
    case 'settings/save':
      return { ...state, settings: { ...state.settings, ...action.settings } };
    case 'data/replace':
      return action.data;
  }
}

export function validateData(raw: unknown): AppData {
  const d = raw as Partial<AppData>;
  if (!d || typeof d !== 'object' || !Array.isArray(d.accounts) || !Array.isArray(d.transactions) || !Array.isArray(d.scheduled)) {
    throw new Error('Geçersiz veri dosyası');
  }
  const base = emptyData();
  return {
    ...base,
    ...d,
    contacts: d.contacts ?? [],
    categories: d.categories ?? base.categories,
    settings: { ...base.settings, ...d.settings, rates: { ...base.settings.rates, ...d.settings?.rates } },
    version: DATA_VERSION,
  } as AppData;
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return validateData(JSON.parse(raw));
  } catch {
    /* bozuk ya da erişilemeyen depolama: demo verisiyle başla */
  }
  return buildDemoData(today());
}

interface Store {
  data: AppData;
  dispatch: (a: Action) => void;
  ref: string;
  persistent: boolean;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, rawDispatch] = useReducer(reducer, undefined, load);
  const [persistent, setPersistent] = useState(true);
  const [ref, setRef] = useState(today());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setPersistent(true);
    } catch {
      setPersistent(false);
    }
  }, [data]);

  // Diğer sekmelerde yapılan değişiklikleri anında yansıt.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        rawDispatch({ type: 'data/replace', data: validateData(JSON.parse(e.newValue)) });
      } catch {
        /* yoksay */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Gün dönümünde vade durumlarını güncelle.
  useEffect(() => {
    const t = setInterval(() => setRef(today()), 60_000);
    return () => clearInterval(t);
  }, []);

  const dispatch = useCallback((a: Action) => rawDispatch(a), []);
  const value = useMemo(() => ({ data, dispatch, ref, persistent }), [data, dispatch, ref, persistent]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider eksik');
  return s;
}
