import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { StoreProvider } from './store';
import { ModalProvider } from './components/modals';
import { ConfirmHost } from './components/ui';
import './styles.css';

// Gömülü önizlemelerde (iframe) dosya indirme ve yazdırma çalışmaz; bu düğmeleri gizle.
try {
  if (window.self !== window.top) document.documentElement.classList.add('embedded');
} catch {
  document.documentElement.classList.add('embedded');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <ModalProvider>
        <App />
      </ModalProvider>
      <ConfirmHost />
    </StoreProvider>
  </StrictMode>,
);
