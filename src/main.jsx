import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import App from './App';
import { AuthProvider } from './auth/AuthProvider';
import './index.css';

// React Query defaults — tuned for an admin app:
// - staleTime: 30s, so a quick re-visit doesn't refetch every list
// - retry: 1, so transient failures get one shot but don't spam the API
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                fontSize: '13px',
                fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
                background: '#FAFAF9',
                color: '#0F172A',
                border: '1px solid #E7E5E4',
                borderRadius: '10px',
                padding: '10px 14px',
              },
              success: { iconTheme: { primary: '#15803D', secondary: '#FAFAF9' } },
              error:   { iconTheme: { primary: '#B91C1C', secondary: '#FAFAF9' } },
            }}
          />
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);
