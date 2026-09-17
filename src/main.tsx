import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import App from './App'
import { store } from '@/store/index'
import { AuthListener } from '@/components/auth/AuthListener'
import { Toaster } from '@/components/ui/sonner'
import './index.css'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <BrowserRouter>
            <AuthListener />
            <App />
          </BrowserRouter>
          <Toaster position="top-center" />
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>
  </StrictMode>
)