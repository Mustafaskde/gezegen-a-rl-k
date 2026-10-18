import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftRight, BarChart3, CalendarClock, LayoutDashboard, Landmark, Menu, Plus, Settings as SettingsIcon, Sparkles, TrendingUp, Users, X } from 'lucide-react';
import { EngineBadge, useAssistant } from './components/Assistant';
import { useStore } from './store';
import { useModal } from './components/modals';
import { scheduledStatus } from './lib/finance';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Accounts from './pages/Accounts';
import Contacts from './pages/Contacts';
import ContactDetail from './pages/ContactDetail';
import Schedule from './pages/Schedule';
import CashFlow from './pages/CashFlow';
import Reports from './pages/Reports';
import SettingsPage from './pages/Settings';

const NAV_GROUPS = [
  {
    title: 'Genel',
    items: [
      { path: '/', label: 'Genel Bakış', icon: LayoutDashboard },
      { path: '/nakit-akisi', label: 'Nakit Akışı', icon: TrendingUp },
    ],
  },
  {
    title: 'Kayıtlar',
    items: [
      { path: '/islemler', label: 'Gelir & Gider', icon: ArrowLeftRight },
      { path: '/vadeler', label: 'Ödeme & Tahsilat', icon: CalendarClock },
      { path: '/hesaplar', label: 'Banka & Kasa', icon: Landmark },
      { path: '/cariler', label: 'Cari Hesaplar', icon: Users },
    ],
  },
  {
    title: 'Analiz',
    items: [{ path: '/raporlar', label: 'Raporlar', icon: BarChart3 }],
  },
];
const NAV = [...NAV_GROUPS.flatMap((g) => g.items), { path: '/ayarlar', label: 'Ayarlar', icon: SettingsIcon }];

function useHashPath(): [string, URLSearchParams] {
  const read = () => window.location.hash.replace(/^#/, '') || '/';
  const [hash, setHash] = useState(read);
  useEffect(() => {
    const on = () => {
      setHash(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const [path, query = ''] = hash.split('?');
  return [path, new URLSearchParams(query)];
}

export default function App() {
  const { data, ref, persistent } = useStore();
  const open = useModal();
  const [path, query] = useHashPath();
  const [menuOpen, setMenuOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const assistant = useAssistant();

  const themeSet = useRef(false);
  useEffect(() => {
    // "Sistem" seçiliyken yalnızca kendi koyduğumuz özniteliği kaldır; dışarıdan gelen temaya dokunma.
    const root = document.documentElement;
    if (data.settings.theme !== 'system') {
      root.setAttribute('data-theme', data.settings.theme);
      themeSet.current = true;
    } else if (themeSet.current) {
      root.removeAttribute('data-theme');
      themeSet.current = false;
    }
  }, [data.settings.theme]);

  useEffect(() => setMenuOpen(false), [path]);

  const overdue = useMemo(() => data.scheduled.filter((s) => scheduledStatus(s, ref) === 'gecikmis').length, [data.scheduled, ref]);

  let page;
  const contactMatch = path.match(/^\/cariler\/(.+)$/);
  if (contactMatch) page = <ContactDetail id={decodeURIComponent(contactMatch[1])} />;
  else
    switch (path) {
      case '/islemler':
        page = <Transactions query={query} />;
        break;
      case '/hesaplar':
        page = <Accounts />;
        break;
      case '/cariler':
        page = <Contacts />;
        break;
      case '/vadeler':
        page = <Schedule query={query} />;
        break;
      case '/nakit-akisi':
        page = <CashFlow />;
        break;
      case '/raporlar':
        page = <Reports />;
        break;
      case '/ayarlar':
        page = <SettingsPage />;
        break;
      default:
        page = <Dashboard />;
    }

  const isActive = (p: string) => (p === '/' ? path === '/' : path.startsWith(p));

  const quick = [
    { label: 'Gelir ekle', run: () => open({ type: 'tx', kind: 'gelir' }) },
    { label: 'Gider ekle', run: () => open({ type: 'tx', kind: 'gider' }) },
    { label: 'Transfer yap', run: () => open({ type: 'tx', kind: 'transfer' }) },
    { label: 'Planlı tahsilat', run: () => open({ type: 'scheduled', kind: 'tahsilat' }) },
    { label: 'Planlı ödeme', run: () => open({ type: 'scheduled', kind: 'odeme' }) },
  ];

  return (
    <div className="app">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 17l5-6 4 3 7-8" />
              <path d="M15 6h5v5" />
            </svg>
          </span>
          <div>
            <strong>Finans Merkezi</strong>
            <span className="brand-company">{data.settings.companyName}</span>
          </div>
          <button className="icon-btn only-mobile" onClick={() => setMenuOpen(false)} aria-label="Menüyü kapat">
            <X size={18} />
          </button>
        </div>
        <nav>
          {NAV_GROUPS.map((g) => (
            <div key={g.title} className="nav-group">
              <span className="nav-title">{g.title}</span>
              {g.items.map((n) => (
                <a key={n.path} href={`#${n.path}`} className={isActive(n.path) ? 'active' : ''} aria-current={isActive(n.path) ? 'page' : undefined}>
                  <n.icon size={17} />
                  <span>{n.label}</span>
                  {n.path === '/vadeler' && overdue > 0 && (
                    <span className="nav-count" title={`${overdue} gecikmiş kayıt`}>
                      {overdue}
                    </span>
                  )}
                </a>
              ))}
              {g.title === 'Analiz' && (
                <button
                  className="nav-assistant"
                  onClick={() => {
                    setMenuOpen(false);
                    assistant.setOpen(true);
                  }}
                >
                  <Sparkles size={17} />
                  <span>Finans Asistanı</span>
                  <span className="nav-pill">Yerel AI</span>
                </button>
              )}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <a href="#/ayarlar" className={isActive('/ayarlar') ? 'active' : ''}>
            <SettingsIcon size={17} />
            <span>Ayarlar</span>
          </a>
          <div className="sidebar-status">
            <span>
              <span className={`dot ${persistent ? 'dot-ok' : 'dot-warn'}`} />
              {persistent ? 'Veriler bu cihazda' : 'Depolama kapalı'}
            </span>
            <EngineBadge engine={assistant.engine} />
          </div>
        </div>
      </aside>
      {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} />}

      <div className="main">
        <header className="topbar">
          <button className="icon-btn only-mobile" onClick={() => setMenuOpen(true)} aria-label="Menüyü aç">
            <Menu size={20} />
          </button>
          <span className="topbar-title only-mobile">{NAV.find((n) => isActive(n.path))?.label ?? 'Finans'}</span>
          <form
            className="ask-bar hide-sm"
            onSubmit={(e) => {
              e.preventDefault();
              if (!question.trim()) return assistant.setOpen(true);
              assistant.ask(question);
              setQuestion('');
            }}
          >
            <Sparkles size={16} />
            <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Asistana sorun: bu ay nereye fazla harcadım?" aria-label="Asistana sorun" />
            <kbd>Enter</kbd>
          </form>
          <span className="spacer" />
          <button className="btn btn-ghost-accent" onClick={() => assistant.setOpen(true)} aria-label="Finans asistanını aç">
            <Sparkles size={16} /> <span className="hide-xs">Asistan</span>
          </button>
          <div className="quick">
            <button className="btn btn-primary" onClick={() => setQuickOpen((v) => !v)} aria-expanded={quickOpen} aria-haspopup="menu">
              <Plus size={16} /> <span className="hide-xs">Yeni kayıt</span>
            </button>
            {quickOpen && (
              <>
                <div className="quick-scrim" onClick={() => setQuickOpen(false)} />
                <div className="quick-menu" role="menu">
                  {quick.map((q) => (
                    <button
                      key={q.label}
                      role="menuitem"
                      onClick={() => {
                        setQuickOpen(false);
                        q.run();
                      }}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </header>
        <main className="content">{page}</main>
      </div>
    </div>
  );
}
