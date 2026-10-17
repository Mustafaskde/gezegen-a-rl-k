import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, BarChart3, CalendarClock, LayoutDashboard, Landmark, Menu, Plus, Settings as SettingsIcon, TrendingUp, Users, Wallet, X } from 'lucide-react';
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

const NAV = [
  { path: '/', label: 'Genel Bakış', icon: LayoutDashboard },
  { path: '/nakit-akisi', label: 'Nakit Akışı', icon: TrendingUp },
  { path: '/islemler', label: 'Gelir & Gider', icon: ArrowLeftRight },
  { path: '/vadeler', label: 'Ödeme & Tahsilat', icon: CalendarClock },
  { path: '/hesaplar', label: 'Banka & Kasa', icon: Landmark },
  { path: '/cariler', label: 'Cari Hesaplar', icon: Users },
  { path: '/raporlar', label: 'Raporlar', icon: BarChart3 },
  { path: '/ayarlar', label: 'Ayarlar', icon: SettingsIcon },
];

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

  useEffect(() => {
    const root = document.documentElement;
    if (data.settings.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', data.settings.theme);
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
          <span className="brand-mark">
            <Wallet size={18} />
          </span>
          <div>
            <strong>Finans</strong>
            <span className="muted small brand-company">{data.settings.companyName}</span>
          </div>
          <button className="icon-btn only-mobile" onClick={() => setMenuOpen(false)} aria-label="Menüyü kapat">
            <X size={18} />
          </button>
        </div>
        <nav>
          {NAV.map((n) => (
            <a key={n.path} href={`#${n.path}`} className={isActive(n.path) ? 'active' : ''} aria-current={isActive(n.path) ? 'page' : undefined}>
              <n.icon size={18} />
              <span>{n.label}</span>
              {n.path === '/vadeler' && overdue > 0 && (
                <span className="nav-count" title={`${overdue} gecikmiş kayıt`}>
                  {overdue}
                </span>
              )}
            </a>
          ))}
        </nav>
        <div className="sidebar-foot muted small">
          <span className={`dot ${persistent ? 'dot-ok' : 'dot-warn'}`} />
          {persistent ? 'Veriler bu cihazda kayıtlı' : 'Tarayıcı depolaması kapalı'}
        </div>
      </aside>
      {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} />}

      <div className="main">
        <header className="topbar">
          <button className="icon-btn only-mobile" onClick={() => setMenuOpen(true)} aria-label="Menüyü aç">
            <Menu size={20} />
          </button>
          <span className="topbar-title only-mobile">{NAV.find((n) => isActive(n.path))?.label ?? 'Finans'}</span>
          <span className="spacer" />
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
