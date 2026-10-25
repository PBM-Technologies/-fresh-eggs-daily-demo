import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AppDataProvider } from './state/AppData';
import { registerPwa } from './pwa';
import './styles.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <AppDataProvider>
      <App />
    </AppDataProvider>
  </StrictMode>
);

registerPwa();
