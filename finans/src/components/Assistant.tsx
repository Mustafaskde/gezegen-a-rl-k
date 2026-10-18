import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowUp, Check, Cpu, Lock, PlusCircle, RefreshCw, Sparkles, Square, Trash2, X } from 'lucide-react';
import { useStore } from '../store';
import { analyze } from '../lib/insights';
import { buildPrompt, SUGGESTED_QUESTIONS, type ChatMessage } from '../lib/assistant';
import { chatJSON, hasModel, isLocalUrl, ollamaStatus, streamChat } from '../lib/ollama';
import { fmtDate, money, uid } from '../lib/format';
import { isActionRequest, modelExtractionPrompt, normalizeModelAction, type ProposedAction } from '../lib/actions';
import { ACCOUNT_TYPE_LABEL, CONTACT_TYPE_LABEL, RECURRENCE_LABEL } from './forms';
import type { AppData } from '../types';

interface Message extends ChatMessage {
  id: string;
  streaming?: boolean;
  /** Modelden cevap alınamadıysa hata açıklaması. */
  error?: string;
  /** Kullanıcı onayı bekleyen kayıt önerisi. */
  action?: ProposedAction;
  actionState?: 'pending' | 'done' | 'cancelled';
}

export type EngineState =
  | { kind: 'checking' }
  | { kind: 'ready'; model: string }
  | { kind: 'no-model'; model: string; models: string[] }
  | { kind: 'offline'; error: string };

interface AssistantCtx {
  open: boolean;
  setOpen: (v: boolean) => void;
  ask: (q: string) => void;
  engine: EngineState;
  refresh: () => void;
}

const Ctx = createContext<AssistantCtx | null>(null);

export function useAssistant() {
  const c = useContext(Ctx);
  if (!c) throw new Error('AssistantProvider eksik');
  return c;
}

export function AssistantProvider({ children }: { children: ReactNode }) {
  const { data, ref, dispatch } = useStore();
  const ai = data.settings.ai;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [engine, setEngine] = useState<EngineState>({ kind: 'checking' });
  const abortRef = useRef<AbortController | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  const refresh = useCallback(async () => {
    if (document.documentElement.classList.contains('embedded')) {
      return setEngine({ kind: 'offline', error: 'Bu önizleme sayfası güvenlik nedeniyle bilgisayardaki modele bağlanamaz. Uygulamayı kendi bilgisayarınızda baslat.bat ile açtığınızda Qwen devreye girer.' });
    }
    if (!isLocalUrl(ai.ollamaUrl)) return setEngine({ kind: 'offline', error: 'Güvenlik için yalnızca bu bilgisayardaki (localhost) Ollama adresine bağlanılır.' });
    setEngine({ kind: 'checking' });
    const s = await ollamaStatus(ai.ollamaUrl);
    if (!s.ok) return setEngine({ kind: 'offline', error: s.error ?? 'Ollama’ya ulaşılamadı.' });
    if (!hasModel(s.models, ai.ollamaModel)) return setEngine({ kind: 'no-model', model: ai.ollamaModel, models: s.models });
    setEngine({ kind: 'ready', model: ai.ollamaModel });
  }, [ai.ollamaUrl, ai.ollamaModel]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Escape paneli kapatır (üstte açık bir form penceresi yoksa).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !document.querySelector('.modal') && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Panel açıldığında durumu tazele (Ollama sonradan başlatılmış olabilir).
  useEffect(() => {
    if (open && engine.kind !== 'ready') refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const patch = (id: string, fn: (m: Message) => Message) => setMessages((ms) => ms.map((m) => (m.id === id ? fn(m) : m)));

  // Bütün cevapları yerel model yazar. Uygulamanın hesapladığı özetler yalnızca modele bağlam
  // olarak verilir; model bağlı değilse hazır cevap üretilmez, panel kurulum uyarısı gösterir.
  const ask = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q) return;
      setOpen(true);
      if (engine.kind !== 'ready') {
        refresh();
        return;
      }
      const d = dataRef.current;
      const { ollamaUrl } = d.settings.ai;
      const history = messages.filter((m) => !m.streaming && !m.error && !m.action && m.content).map(({ role, content }) => ({ role, content }));
      const replyId = uid();
      setMessages((ms) => [...ms, { id: uid(), role: 'user', content: q }, { id: replyId, role: 'assistant', content: '', streaming: true }]);
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        // Kayıt ekleme isteği: model isteği bir kayda çevirir, kod doğrular, kullanıcı onaylamadan yazılmaz.
        if (isActionRequest(q)) {
          const { system, schema } = modelExtractionPrompt(d, ref);
          const raw = await chatJSON(ollamaUrl, engine.model, [{ role: 'system', content: system }, { role: 'user', content: q }], schema, ctrl.signal);
          const action = normalizeModelAction(raw, d, ref);
          if (action) {
            patch(replyId, (m) => ({ ...m, streaming: false, content: 'Şu kaydı eklememi onaylıyor musunuz?', action, actionState: 'pending' }));
            return;
          }
          // Kayıt çıkarılamadıysa (ör. tutar eksik) model normal sohbette eksik bilgiyi sorar.
        }
        const analysis = analyze(d, ref);
        await streamChat(ollamaUrl, engine.model, buildPrompt(q, history, analysis, d.settings.companyName, ref), (t) => patch(replyId, (m) => ({ ...m, content: m.content + t })), ctrl.signal);
        patch(replyId, (m) => ({ ...m, streaming: false }));
      } catch (err) {
        if (ctrl.signal.aborted) {
          patch(replyId, (m) => ({ ...m, streaming: false, content: m.content || '_Durduruldu._' }));
        } else {
          patch(replyId, (m) => ({ ...m, streaming: false, error: `Yerel modelden cevap alınamadı: ${err instanceof Error ? err.message : 'bilinmeyen hata'}` }));
          refresh();
        }
      } finally {
        abortRef.current = null;
      }
    },
    [engine, messages, ref, refresh],
  );

  const confirmAction = (id: string, action: ProposedAction) => {
    const link = applyAction(action, dispatch, ref);
    patch(id, (m) => ({ ...m, actionState: 'done', content: `Eklendi. [${link.label}](${link.href})` }));
  };
  const cancelAction = (id: string) => patch(id, (m) => ({ ...m, actionState: 'cancelled', content: 'Vazgeçildi, hiçbir kayıt eklenmedi.' }));

  const stop = () => abortRef.current?.abort();
  const clear = () => {
    stop();
    setMessages([]);
  };
  const busy = messages.some((m) => m.streaming);

  const value = useMemo(() => ({ open, setOpen, ask, engine, refresh }), [open, ask, engine, refresh]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {open && <div className="drawer-scrim" onClick={() => setOpen(false)} />}
      <aside className={`assistant ${open ? 'open' : ''}`} aria-hidden={!open} aria-label="Finans asistanı">
        <header className="assistant-head">
          <span className="assistant-mark">
            <Sparkles size={16} />
          </span>
          <div className="grow">
            <strong>Finans Asistanı</strong>
            <EngineBadge engine={engine} />
          </div>
          {messages.length > 0 && (
            <button className="icon-btn" onClick={clear} aria-label="Sohbeti temizle" title="Sohbeti temizle">
              <Trash2 size={16} />
            </button>
          )}
          <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Asistanı kapat">
            <X size={18} />
          </button>
        </header>
        <Conversation messages={messages} engine={engine} onAsk={ask} onConfirm={confirmAction} onCancel={cancelAction} onRetry={refresh} />
        <Composer busy={busy} disabled={engine.kind !== 'ready'} onSend={ask} onStop={stop} open={open} />
        <p className="assistant-privacy">
          <Lock size={12} /> Veriler bu bilgisayardan çıkmaz · Kayıtlar yalnızca onayınızla eklenir.
        </p>
      </aside>
    </Ctx.Provider>
  );
}

export function EngineBadge({ engine }: { engine: EngineState }) {
  switch (engine.kind) {
    case 'ready':
      return (
        <span className="engine engine-ok">
          <Cpu size={12} /> Yerel model · {engine.model}
        </span>
      );
    case 'checking':
      return <span className="engine">Yerel model kontrol ediliyor…</span>;
    case 'no-model':
      return <span className="engine engine-warn">{engine.model} yüklü değil</span>;
    case 'offline':
      return <span className="engine engine-warn">Yerel model bağlı değil</span>;
  }
}

function Conversation({
  messages,
  engine,
  onAsk,
  onConfirm,
  onCancel,
  onRetry,
}: {
  messages: Message[];
  engine: EngineState;
  onAsk: (q: string) => void;
  onConfirm: (id: string, a: ProposedAction) => void;
  onCancel: (id: string) => void;
  onRetry: () => void;
}) {
  const ready = engine.kind === 'ready';
  const endRef = useRef<HTMLDivElement>(null);
  const last = messages[messages.length - 1];
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, last?.content]);

  return (
    <div className="assistant-body">
      {(engine.kind === 'offline' || engine.kind === 'no-model') && (
        <div className="assistant-notice">
          {engine.kind === 'offline' ? (
            <>
              <strong>Yerel model bağlı değil.</strong> Asistan cevaplarını Qwen yazar; model çalışmadan soru cevaplanamaz. {engine.error}
            </>
          ) : (
            <>
              <strong>{engine.model} modeli yüklü değil.</strong> Komut satırında <code>ollama pull {engine.model}</code> çalıştırın.
            </>
          )}
          <div className="row-gap notice-actions">
            <button className="btn btn-sm" onClick={onRetry}>
              <RefreshCw size={14} /> Tekrar dene
            </button>
            <a href="#/ayarlar?bolum=ai">Kurulum adımları</a>
          </div>
        </div>
      )}
      {messages.length === 0 ? (
        <div className="assistant-empty">
          <h3>Finanslarınız hakkında soru sorun</h3>
          <p className="muted">Hesaplar, işlemler, cariler ve vadeli kayıtlarınız analiz edilir. Örneğin:</p>
          <div className="chips">
            {[...SUGGESTED_QUESTIONS, 'Akbank vadesiz hesabım var, bakiyesi 85 bin TL, ekle'].map((q) => (
              <button key={q} className="chip" onClick={() => onAsk(q)} disabled={!ready}>
                {q}
              </button>
            ))}
          </div>
        </div>
      ) : (
        messages.map((m) => (
          <div key={m.id} className={`msg msg-${m.role}`}>
            {m.role === 'assistant' ? (
              <>
                {m.content ? <Markdown text={m.content} /> : m.streaming ? <span className="typing" aria-label="Yazıyor">●●●</span> : null}
                {m.error && <p className="msg-note">{m.error}</p>}
                {m.action && m.actionState === 'pending' && <ActionCard action={m.action} onConfirm={() => onConfirm(m.id, m.action!)} onCancel={() => onCancel(m.id)} />}
              </>
            ) : (
              m.content
            )}
          </div>
        ))
      )}
      {ready && messages.length > 0 && !last?.streaming && (
        <div className="chips chips-follow">
          {SUGGESTED_QUESTIONS.filter((q) => !messages.some((m) => m.content === q))
            .slice(0, 3)
            .map((q) => (
              <button key={q} className="chip" onClick={() => onAsk(q)}>
                {q}
              </button>
            ))}
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}

function Composer({ busy, disabled, onSend, onStop, open }: { busy: boolean; disabled: boolean; onSend: (q: string) => void; onStop: () => void; open: boolean }) {
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (open) setTimeout(() => ref.current?.focus(), 150);
  }, [open]);
  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (busy || disabled || !text.trim()) return;
    onSend(text);
    setText('');
  };
  return (
    <form className="composer" onSubmit={submit}>
      <textarea
        ref={ref}
        rows={1}
        value={text}
        placeholder={disabled ? 'Yerel model bağlanınca soru sorabilirsiniz' : 'Örn. bu ay hangi harcamaları kısabilirim?'}
        disabled={disabled}
        aria-label="Asistana sorunuz"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
      />
      {busy ? (
        <button type="button" className="send-btn" onClick={onStop} aria-label="Durdur">
          <Square size={14} />
        </button>
      ) : (
        <button type="submit" className="send-btn" disabled={disabled || !text.trim()} aria-label="Gönder">
          <ArrowUp size={16} />
        </button>
      )}
    </form>
  );
}

function ActionCard({ action, onConfirm, onCancel }: { action: ProposedAction; onConfirm: () => void; onCancel: () => void }) {
  const { data } = useStore();
  const rows = describeAction(action, data);
  return (
    <div className="action-card">
      <div className="action-title">
        <PlusCircle size={15} /> {rows.title}
      </div>
      <dl>
        {rows.fields.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="row-gap">
        <button className="btn btn-primary btn-sm" onClick={onConfirm}>
          <Check size={14} /> Ekle
        </button>
        <button className="btn btn-sm" onClick={onCancel}>
          Vazgeç
        </button>
      </div>
    </div>
  );
}

function describeAction(a: ProposedAction, data: AppData): { title: string; fields: [string, string][] } {
  const acc = (id?: string) => data.accounts.find((x) => x.id === id)?.name ?? '—';
  const cat = (id?: string) => data.categories.find((x) => x.id === id)?.name ?? 'Kategorisiz';
  const con = (id?: string) => data.contacts.find((x) => x.id === id)?.name ?? '—';
  switch (a.type) {
    case 'account':
      return {
        title: 'Yeni hesap',
        fields: [
          ['Hesap adı', a.name],
          ['Tür', ACCOUNT_TYPE_LABEL[a.accountType]],
          ...(a.bank ? ([['Banka', a.bank]] as [string, string][]) : []),
          ['Para birimi', a.currency],
          ['Güncel bakiye', money(a.balance, a.currency)],
        ],
      };
    case 'transaction':
      return {
        title: a.kind === 'gelir' ? 'Yeni gelir' : 'Yeni gider',
        fields: [
          ['Tutar', money(a.amount, data.accounts.find((x) => x.id === a.accountId)?.currency)],
          ['Hesap', acc(a.accountId)],
          ['Kategori', cat(a.categoryId)],
          ['Cari', con(a.contactId)],
          ['Tarih', fmtDate(a.date)],
          ['Açıklama', a.description || '—'],
        ],
      };
    case 'scheduled':
      return {
        title: a.kind === 'tahsilat' ? 'Planlı tahsilat' : 'Planlı ödeme',
        fields: [
          ['Başlık', a.title],
          ['Tutar', money(a.amount, a.currency)],
          ['Vade', fmtDate(a.dueDate)],
          ['Cari', con(a.contactId)],
          ['Kategori', cat(a.categoryId)],
          ['Tekrar', RECURRENCE_LABEL[a.recurrence]],
        ],
      };
    case 'contact':
      return { title: 'Yeni cari', fields: [['Unvan', a.name], ['Tür', CONTACT_TYPE_LABEL[a.contactType]]] };
  }
}

/** Onaylanan öneriyi kayda dönüştürür; eklenen kaydın sayfasına bağlantı döner. */
function applyAction(a: ProposedAction, dispatch: ReturnType<typeof useStore>['dispatch'], ref: string): { label: string; href: string } {
  const id = uid();
  switch (a.type) {
    case 'account':
      dispatch({ type: 'account/save', account: { id, name: a.name, type: a.accountType, bank: a.bank, currency: a.currency, openingBalance: a.balance, openingDate: ref } });
      return { label: 'Banka & Kasa’da görüntüle', href: '#/hesaplar' };
    case 'transaction':
      dispatch({ type: 'tx/save', tx: { id, kind: a.kind, amount: a.amount, accountId: a.accountId, categoryId: a.categoryId, contactId: a.contactId, description: a.description, date: a.date } });
      return { label: 'Gelir & Gider’de görüntüle', href: '#/islemler' };
    case 'scheduled':
      dispatch({ type: 'scheduled/save', item: { id, kind: a.kind, title: a.title, amount: a.amount, currency: a.currency, issueDate: ref < a.dueDate ? ref : a.dueDate, dueDate: a.dueDate, paidAmount: 0, recurrence: a.recurrence, contactId: a.contactId, categoryId: a.categoryId } });
      return { label: 'Ödeme & Tahsilat’ta görüntüle', href: '#/vadeler' };
    case 'contact':
      dispatch({ type: 'contact/save', contact: { id, name: a.name, type: a.contactType } });
      return { label: 'Cari kartını aç', href: `#/cariler/${id}` };
  }
}

/** Asistan cevapları için küçük, güvenli Markdown görüntüleyici (kalın, italik, madde, satır). */
export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: ReactNode[] = [];
  const flush = () => {
    if (list.length) blocks.push(<ul key={`u${blocks.length}`}>{list}</ul>);
    list = [];
  };
  text.split('\n').forEach((raw, i) => {
    const line = raw.trimEnd();
    const item = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (item) {
      list.push(<li key={i}>{inline(item[1])}</li>);
      return;
    }
    flush();
    if (!line.trim()) return;
    const h = line.match(/^#{1,4}\s+(.*)$/);
    blocks.push(h ? <h4 key={i}>{inline(h[1])}</h4> : <p key={i}>{inline(line)}</p>);
  });
  flush();
  return <div className="md">{blocks}</div>;
}

function inline(s: string): ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`|\[[^\]]+\]\(#[^)]*\))/g).map((part, i) => {
    const link = part.match(/^\[([^\]]+)\]\((#[^)]*)\)$/);
    if (link) return <a key={i} href={link[2]}>{link[1]}</a>;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('_') && part.endsWith('_') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) return <code key={i}>{part.slice(1, -1)}</code>;
    return part;
  });
}
