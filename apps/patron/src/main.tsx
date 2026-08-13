import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.js'
import { initSocket } from './api/socket.js'
import './index.css'

const queryClient = new QueryClient()

// SYNC-01/D-47: connects as soon as the app boots, independent of which
// view is currently mounted, so cache invalidation works identically
// whether the browse grid or a detail view happens to be open.
initSocket(queryClient)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
