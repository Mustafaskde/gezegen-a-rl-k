import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { StoreProvider } from './store';
import { ModalProvider } from './components/modals';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <ModalProvider>
        <App />
      </ModalProvider>
    </StoreProvider>
  </StrictMode>,
);
