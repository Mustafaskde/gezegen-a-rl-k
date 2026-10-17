import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { Account, Contact, Scheduled, ScheduledKind, Transaction, TransactionKind } from '../types';
import { AccountForm, ContactForm, ScheduledForm, SettleForm, TransactionForm } from './forms';

export type ModalRequest =
  | { type: 'tx'; initial?: Transaction; kind?: TransactionKind }
  | { type: 'scheduled'; initial?: Scheduled; kind?: ScheduledKind; contactId?: string }
  | { type: 'settle'; item: Scheduled }
  | { type: 'account'; initial?: Account }
  | { type: 'contact'; initial?: Contact };

const Ctx = createContext<(m: ModalRequest) => void>(() => {});

export function ModalProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<ModalRequest | null>(null);
  const close = useCallback(() => setCurrent(null), []);
  return (
    <Ctx.Provider value={setCurrent}>
      {children}
      {current?.type === 'tx' && <TransactionForm initial={current.initial} kind={current.kind} onClose={close} />}
      {current?.type === 'scheduled' && <ScheduledForm initial={current.initial} kind={current.kind} contactId={current.contactId} onClose={close} />}
      {current?.type === 'settle' && <SettleForm item={current.item} onClose={close} />}
      {current?.type === 'account' && <AccountForm initial={current.initial} onClose={close} />}
      {current?.type === 'contact' && <ContactForm initial={current.initial} onClose={close} />}
    </Ctx.Provider>
  );
}

export const useModal = () => useContext(Ctx);
