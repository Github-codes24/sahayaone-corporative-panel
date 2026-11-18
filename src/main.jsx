import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Global listener to ensure clicking anywhere on date & time inputs opens the picker
if (typeof window !== 'undefined') {
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (
      target instanceof HTMLInputElement &&
      (target.type === 'date' ||
        target.type === 'datetime-local' ||
        target.type === 'month' ||
        target.type === 'time' ||
        target.type === 'week')
    ) {
      if (typeof target.showPicker === 'function' && !target.disabled && !target.readOnly) {
        try {
          target.showPicker();
        } catch {
          // Ignore if user dismisses or picker cannot be displayed
        }
      }
    }
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
