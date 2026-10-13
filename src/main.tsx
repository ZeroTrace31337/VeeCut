// Ensure window.fetch has both getter and setter in iframe environments
if (typeof window !== 'undefined') {
  try {
    const desc = Object.getOwnPropertyDescriptor(window, 'fetch');
    if (desc && desc.get && !desc.set) {
      let activeFetch = window.fetch;
      Object.defineProperty(window, 'fetch', {
        get() {
          return activeFetch;
        },
        set(val) {
          activeFetch = val;
        },
        configurable: true,
        enumerable: true,
      });
    }
  } catch (_e) {}
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
