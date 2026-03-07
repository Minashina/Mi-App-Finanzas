import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { FinanceProvider } from './context/FinanceContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <FinanceProvider>
          <App />
        </FinanceProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
