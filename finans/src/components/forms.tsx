import { useMemo, useState, type FormEvent } from 'react';
import type { Account, AccountType, Contact, ContactType, Currency, Recurrence, Scheduled, ScheduledKind, Transaction, TransactionKind } from '../types';
import { useStore } from '../store';
import { askConfirm, Field, Modal, Segmented } from './ui';
import { money, parseAmount, uid } from '../lib/format';
import { accountBalances, convert, remaining, round2 } from '../lib/finance';
import { addDays } from '../lib/date';

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = { banka: 'Banka hesabı', kasa: 'Nakit kasa', kredi_karti: 'Kredi kartı' };
export const CONTACT_TYPE_LABEL: Record<ContactType, string> = { musteri: 'Müşteri', tedarikci: 'Tedarikçi', diger: 'Diğer' };
export const RECURRENCE_LABEL: Record<Recurrence, string> = { yok: 'Tek seferlik', haftalik: 'Her hafta', aylik: 'Her ay', yillik: 'Her yıl' };
const CURRENCIES: Currency[] = ['TRY', 'USD', 'EUR'];

const amountStr = (n?: number) => (n === undefined || isNaN(n) ? '' : String(n).replace('.', ','));

function Footer({ onCancel, submitLabel = 'Kaydet', onDelete }: { onCancel: () => void; submitLabel?: string; onDelete?: () => void }) {
  return (
    <>
      {onDelete && (
        <button type="button" className="btn btn-danger-ghost" onClick={onDelete}>
          Sil
        </button>
      )}
      <span className="spacer" />
      <button type="button" className="btn" onClick={onCancel}>
        Vazgeç
      </button>
      <button type="submit" className="btn btn-primary" form="modal-form">
        {submitLabel}
      </button>
    </>
  );
}

function AccountSelect({ value, onChange, exclude, label = 'Hesap' }: { value: string; onChange: (v: string) => void; exclude?: string; label?: string }) {
  const { data } = useStore();
  const bals = useMemo(() => accountBalances(data), [data]);
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)} required>
        <option value="" disabled>
          Seçin…
        </option>
        {data.accounts
          .filter((a) => !a.archived && a.id !== exclude)
          .map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} · {money(bals.get(a.id) ?? 0, a.currency)}
            </option>
          ))}
      </select>
    </Field>
  );
}

/* ------------------------------------------------------------ İşlem formu */

export function TransactionForm({ initial, kind: initialKind = 'gelir', onClose }: { initial?: Transaction; kind?: TransactionKind; onClose: () => void }) {
  const { data, dispatch, ref } = useStore();
  const [kind, setKind] = useState<TransactionKind>(initial?.kind ?? initialKind);
  const firstAcc = data.accounts.find((a) => !a.archived)?.id ?? '';
  const [accountId, setAccountId] = useState(initial?.accountId ?? firstAcc);
  const [toAccountId, setToAccountId] = useState(initial?.toAccountId ?? '');
  const [amount, setAmount] = useState(amountStr(initial?.amount));
  const [toAmount, setToAmount] = useState(amountStr(initial?.toAmount));
  const [date, setDate] = useState(initial?.date ?? ref);
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '');
  const [contactId, setContactId] = useState(initial?.contactId ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [error, setError] = useState('');

  const acc = data.accounts.find((a) => a.id === accountId);
  const toAcc = data.accounts.find((a) => a.id === toAccountId);
  const crossCurrency = kind === 'transfer' && acc && toAcc && acc.currency !== toAcc.currency;
  const linked = !!initial?.scheduledId;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const amt = parseAmount(amount);
    if (!(amt > 0)) return setError('Geçerli bir tutar girin.');
    if (!accountId) return setError('Hesap seçin.');
    let to: number | undefined;
    if (kind === 'transfer') {
      if (!toAccountId || toAccountId === accountId) return setError('Farklı bir hedef hesap seçin.');
      if (crossCurrency) {
        to = parseAmount(toAmount);
        if (!(to > 0)) to = round2(convert(amt, acc!.currency, toAcc!.currency, data.settings.rates));
      }
    }
    dispatch({
      type: 'tx/save',
      tx: {
        ...initial,
        id: initial?.id ?? uid(),
        kind,
        date,
        amount: round2(amt),
        accountId,
        toAccountId: kind === 'transfer' ? toAccountId : undefined,
        toAmount: to,
        categoryId: kind === 'transfer' ? undefined : categoryId || undefined,
        contactId: kind === 'transfer' ? undefined : contactId || undefined,
        description: description.trim(),
      },
    });
    onClose();
  };

  const remove = initial
    ? async () => {
        if (await askConfirm(linked ? 'Bu işlem bir vadeli kayda bağlı. Silerseniz kaydın ödenen tutarı geri alınır. Devam edilsin mi?' : 'İşlem silinsin mi?', { danger: true, confirmLabel: 'Sil' })) {
          dispatch({ type: 'tx/delete', id: initial.id });
          onClose();
        }
      }
    : undefined;

  const title = initial ? 'İşlemi düzenle' : kind === 'gelir' ? 'Yeni gelir' : kind === 'gider' ? 'Yeni gider' : 'Hesaplar arası transfer';

  return (
    <Modal title={title} onClose={onClose} footer={<Footer onCancel={onClose} onDelete={remove} />}>
      <form id="modal-form" className="form-grid" onSubmit={submit}>
        {!linked && (
          <div className="field-full">
            <Segmented
              label="İşlem türü"
              value={kind}
              onChange={setKind}
              options={[
                { value: 'gelir', label: 'Gelir' },
                { value: 'gider', label: 'Gider' },
                { value: 'transfer', label: 'Transfer' },
              ]}
            />
          </div>
        )}
        {linked && <p className="note field-full">Bu işlem bir vadeli kaydı kapatıyor. Tutar değişikliği kayda da yansıtılır.</p>}
        <AccountSelect value={accountId} onChange={setAccountId} label={kind === 'transfer' ? 'Çıkış hesabı' : 'Hesap'} />
        {kind === 'transfer' && <AccountSelect value={toAccountId} onChange={setToAccountId} exclude={accountId} label="Giriş hesabı" />}
        <Field label={`Tutar (${acc?.currency ?? 'TRY'})`}>
          <input inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </Field>
        {crossCurrency && (
          <Field label={`Hedefe geçen tutar (${toAcc!.currency})`} hint="Boş bırakılırsa güncel kurla hesaplanır.">
            <input inputMode="decimal" placeholder={amountStr(round2(convert(parseAmount(amount) || 0, acc!.currency, toAcc!.currency, data.settings.rates)))} value={toAmount} onChange={(e) => setToAmount(e.target.value)} />
          </Field>
        )}
        <Field label="Tarih">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        {kind !== 'transfer' && (
          <>
            <Field label="Kategori">
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Kategorisiz</option>
                {data.categories
                  .filter((c) => c.kind === kind)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Cari (isteğe bağlı)">
              <select value={contactId} onChange={(e) => setContactId(e.target.value)} disabled={linked}>
                <option value="">—</option>
                {data.contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}
        <Field label="Açıklama" full>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Örn. Fatura #123 tahsilatı" />
        </Field>
        {error && <p className="form-error field-full">{error}</p>}
      </form>
    </Modal>
  );
}

/* --------------------------------------------------- Vadeli kayıt formu */

export function ScheduledForm({ initial, kind: initialKind = 'tahsilat', contactId: presetContact, onClose }: { initial?: Scheduled; kind?: ScheduledKind; contactId?: string; onClose: () => void }) {
  const { data, dispatch, ref } = useStore();
  const [kind, setKind] = useState<ScheduledKind>(initial?.kind ?? initialKind);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [contactId, setContactId] = useState(initial?.contactId ?? presetContact ?? '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '');
  const [amount, setAmount] = useState(amountStr(initial?.amount));
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? 'TRY');
  const [issueDate, setIssueDate] = useState(initial?.issueDate ?? ref);
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? addDays(ref, 30));
  const [recurrence, setRecurrence] = useState<Recurrence>(initial?.recurrence ?? 'yok');
  const [recurrenceEnd, setRecurrenceEnd] = useState(initial?.recurrenceEnd ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const amt = parseAmount(amount);
    if (!(amt > 0)) return setError('Geçerli bir tutar girin.');
    if (initial && amt < initial.paidAmount) return setError(`Tutar, ödenmiş tutardan (${money(initial.paidAmount, initial.currency)}) küçük olamaz.`);
    if (dueDate < issueDate) return setError('Vade tarihi kayıt tarihinden önce olamaz.');
    dispatch({
      type: 'scheduled/save',
      item: {
        ...initial,
        id: initial?.id ?? uid(),
        kind,
        title: title.trim() || (kind === 'tahsilat' ? 'Tahsilat' : 'Ödeme'),
        contactId: contactId || undefined,
        categoryId: categoryId || undefined,
        amount: round2(amt),
        currency,
        issueDate,
        dueDate,
        paidAmount: initial?.paidAmount ?? 0,
        recurrence,
        recurrenceEnd: recurrence !== 'yok' && recurrenceEnd ? recurrenceEnd : undefined,
        note: note.trim() || undefined,
      },
    });
    onClose();
  };

  const remove = initial
    ? async () => {
        if (await askConfirm('Vadeli kayıt silinsin mi? Bağlı ödeme işlemleri hesaplarda kalır ancak kayıtla ilişkisi kaldırılır.', { danger: true, confirmLabel: 'Sil' })) {
          dispatch({ type: 'scheduled/delete', id: initial.id });
          onClose();
        }
      }
    : undefined;

  const catKind = kind === 'tahsilat' ? 'gelir' : 'gider';

  return (
    <Modal title={initial ? 'Vadeli kaydı düzenle' : kind === 'tahsilat' ? 'Yeni planlı tahsilat' : 'Yeni planlı ödeme'} onClose={onClose} footer={<Footer onCancel={onClose} onDelete={remove} />}>
      <form id="modal-form" className="form-grid" onSubmit={submit}>
        <div className="field-full">
          <Segmented
            label="Kayıt türü"
            value={kind}
            onChange={(v) => {
              setKind(v);
              setCategoryId('');
            }}
            options={[
              { value: 'tahsilat', label: 'Tahsilat (alacak)' },
              { value: 'odeme', label: 'Ödeme (borç)' },
            ]}
          />
        </div>
        <Field label="Başlık" full>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Örn. Fatura #2024-150, Çek, Kira" />
        </Field>
        <Field label="Cari">
          <select value={contactId} onChange={(e) => setContactId(e.target.value)}>
            <option value="">—</option>
            {data.contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Kategori">
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Kategorisiz</option>
            {data.categories
              .filter((c) => c.kind === catKind)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Tutar">
          <input inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </Field>
        <Field label="Para birimi">
          <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} disabled={!!initial?.paidAmount}>
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Kayıt / fatura tarihi">
          <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required />
        </Field>
        <Field label="Vade tarihi">
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
        </Field>
        <Field label="Tekrar">
          <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as Recurrence)}>
            {(Object.keys(RECURRENCE_LABEL) as Recurrence[]).map((r) => (
              <option key={r} value={r}>
                {RECURRENCE_LABEL[r]}
              </option>
            ))}
          </select>
        </Field>
        {recurrence !== 'yok' && (
          <Field label="Tekrar bitişi" hint="Boş: süresiz">
            <input type="date" value={recurrenceEnd} onChange={(e) => setRecurrenceEnd(e.target.value)} />
          </Field>
        )}
        <Field label="Not" full>
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        {error && <p className="form-error field-full">{error}</p>}
      </form>
    </Modal>
  );
}

/* --------------------------------------------- Tahsil et / öde formu */

export function SettleForm({ item, onClose }: { item: Scheduled; onClose: () => void }) {
  const { data, dispatch, ref } = useStore();
  const rem = remaining(item);
  const sameCur = data.accounts.find((a) => !a.archived && a.currency === item.currency);
  const [accountId, setAccountId] = useState(sameCur?.id ?? data.accounts.find((a) => !a.archived)?.id ?? '');
  const [amount, setAmount] = useState(amountStr(rem));
  const [accAmount, setAccAmount] = useState('');
  const [date, setDate] = useState(ref);
  const [description, setDescription] = useState(`${item.title} – ${item.kind === 'tahsilat' ? 'tahsilat' : 'ödeme'}`);
  const [error, setError] = useState('');
  const acc = data.accounts.find((a) => a.id === accountId);
  const cross = acc && acc.currency !== item.currency;
  const parsed = parseAmount(amount);
  const autoAcc = acc ? round2(convert(parsed || 0, item.currency, acc.currency, data.settings.rates)) : 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!(parsed > 0)) return setError('Geçerli bir tutar girin.');
    if (parsed > rem + 0.001) return setError(`Kalan tutardan (${money(rem, item.currency)}) fazla olamaz.`);
    if (!acc) return setError('Hesap seçin.');
    const accAmt = cross ? parseAmount(accAmount) || autoAcc : parsed;
    dispatch({ type: 'scheduled/settle', scheduledId: item.id, accountId, date, amount: accAmt, scheduledAmount: parsed, description: description.trim() });
    onClose();
  };

  const verb = item.kind === 'tahsilat' ? 'Tahsil et' : 'Öde';
  return (
    <Modal title={`${verb}: ${item.title}`} onClose={onClose} footer={<Footer onCancel={onClose} submitLabel={verb} />}>
      <form id="modal-form" className="form-grid" onSubmit={submit}>
        <p className="note field-full">
          Toplam {money(item.amount, item.currency)} · Ödenen {money(item.paidAmount, item.currency)} · <strong>Kalan {money(rem, item.currency)}</strong>
          {item.recurrence !== 'yok' && ' · Tamamen kapanınca bir sonraki dönem otomatik oluşturulur.'}
        </p>
        <AccountSelect value={accountId} onChange={setAccountId} label={item.kind === 'tahsilat' ? 'Giriş hesabı' : 'Çıkış hesabı'} />
        <Field label={`Kapatılacak tutar (${item.currency})`} hint="Kısmi ödeme için tutarı azaltın.">
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </Field>
        {cross && (
          <Field label={`Hesaba yansıyan (${acc!.currency})`} hint="Boş: güncel kurla">
            <input inputMode="decimal" placeholder={amountStr(autoAcc)} value={accAmount} onChange={(e) => setAccAmount(e.target.value)} />
          </Field>
        )}
        <Field label="İşlem tarihi">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <Field label="Açıklama" full>
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        {error && <p className="form-error field-full">{error}</p>}
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------ Hesap formu */

export function AccountForm({ initial, onClose }: { initial?: Account; onClose: () => void }) {
  const { data, dispatch, ref } = useStore();
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<AccountType>(initial?.type ?? 'banka');
  const [bank, setBank] = useState(initial?.bank ?? '');
  const [iban, setIban] = useState(initial?.iban ?? '');
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? 'TRY');
  const [opening, setOpening] = useState(amountStr(initial?.openingBalance ?? 0));
  const [openingDate, setOpeningDate] = useState(initial?.openingDate ?? ref);
  const [error, setError] = useState('');
  const used = !!initial && data.transactions.some((t) => t.accountId === initial.id || t.toAccountId === initial.id);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Hesap adı girin.');
    const ob = opening.trim() === '' ? 0 : parseAmount(opening);
    if (isNaN(ob)) return setError('Açılış bakiyesi geçersiz.');
    dispatch({
      type: 'account/save',
      account: { ...initial, id: initial?.id ?? uid(), name: name.trim(), type, bank: bank.trim() || undefined, iban: iban.trim() || undefined, currency, openingBalance: round2(ob), openingDate },
    });
    onClose();
  };

  const remove = initial
    ? async () => {
        const msg = used ? 'Bu hesabın işlemleri var; silinmek yerine arşivlenecek ve toplamlardan çıkarılacak. Devam edilsin mi?' : 'Hesap silinsin mi?';
        if (await askConfirm(msg, { danger: true, confirmLabel: used ? 'Arşivle' : 'Sil' })) {
          dispatch({ type: 'account/delete', id: initial.id });
          onClose();
        }
      }
    : undefined;

  return (
    <Modal title={initial ? 'Hesabı düzenle' : 'Yeni hesap'} onClose={onClose} footer={<Footer onCancel={onClose} onDelete={initial && !initial.archived ? remove : undefined} />}>
      <form id="modal-form" className="form-grid" onSubmit={submit}>
        <Field label="Hesap adı" full>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn. Ziraat Vadesiz" required />
        </Field>
        <Field label="Tür">
          <select value={type} onChange={(e) => setType(e.target.value as AccountType)}>
            {(Object.keys(ACCOUNT_TYPE_LABEL) as AccountType[]).map((t) => (
              <option key={t} value={t}>
                {ACCOUNT_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Para birimi">
          <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} disabled={used}>
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        {type !== 'kasa' && (
          <Field label="Banka">
            <input value={bank} onChange={(e) => setBank(e.target.value)} />
          </Field>
        )}
        {type === 'banka' && (
          <Field label="IBAN">
            <input value={iban} onChange={(e) => setIban(e.target.value.toUpperCase())} placeholder="TR.." />
          </Field>
        )}
        <Field label="Açılış bakiyesi" hint={type === 'kredi_karti' ? 'Kart borcu için eksi değer girin.' : undefined}>
          <input inputMode="decimal" value={opening} onChange={(e) => setOpening(e.target.value)} />
        </Field>
        <Field label="Açılış tarihi">
          <input type="date" value={openingDate} onChange={(e) => setOpeningDate(e.target.value)} />
        </Field>
        {initial?.archived && (
          <div className="field-full">
            <button type="button" className="btn" onClick={() => (dispatch({ type: 'account/save', account: { ...initial, archived: false } }), onClose())}>
              Arşivden çıkar
            </button>
          </div>
        )}
        {error && <p className="form-error field-full">{error}</p>}
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------- Cari formu */

export function ContactForm({ initial, onClose }: { initial?: Contact; onClose: () => void }) {
  const { dispatch } = useStore();
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<ContactType>(initial?.type ?? 'musteri');
  const [taxNo, setTaxNo] = useState(initial?.taxNo ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Cari adı girin.');
    dispatch({
      type: 'contact/save',
      contact: { id: initial?.id ?? uid(), name: name.trim(), type, taxNo: taxNo.trim() || undefined, phone: phone.trim() || undefined, email: email.trim() || undefined, note: note.trim() || undefined },
    });
    onClose();
  };

  const remove = initial
    ? async () => {
        if (await askConfirm('Cari silinsin mi? İlişkili işlemler ve vadeli kayıtlar silinmez, yalnızca cari bağlantısı kaldırılır.', { danger: true, confirmLabel: 'Sil' })) {
          dispatch({ type: 'contact/delete', id: initial.id });
          onClose();
        }
      }
    : undefined;

  return (
    <Modal title={initial ? 'Cariyi düzenle' : 'Yeni cari hesap'} onClose={onClose} footer={<Footer onCancel={onClose} onDelete={remove} />}>
      <form id="modal-form" className="form-grid" onSubmit={submit}>
        <Field label="Unvan / ad" full>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Tür">
          <select value={type} onChange={(e) => setType(e.target.value as ContactType)}>
            {(Object.keys(CONTACT_TYPE_LABEL) as ContactType[]).map((t) => (
              <option key={t} value={t}>
                {CONTACT_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Vergi / TC no">
          <input value={taxNo} onChange={(e) => setTaxNo(e.target.value)} inputMode="numeric" />
        </Field>
        <Field label="Telefon">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
        </Field>
        <Field label="E-posta">
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
        </Field>
        <Field label="Not" full>
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        {error && <p className="form-error field-full">{error}</p>}
      </form>
    </Modal>
  );
}
