import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.js'
import { initSocket } from './api/socket.js'
import './index.css'

const queryClient = new QueryClient()

// Bartender needs live Socket.IO like Patron (unlike Barback, which has
// none) — connects as soon as the app boots, independent of which view is
// currently mounted.
initSocket(queryClient)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
