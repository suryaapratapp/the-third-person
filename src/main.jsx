import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { AnalysisProvider } from './state/AnalysisContext.jsx';
import { AuthProvider } from './state/AuthContext.jsx';
import { installGlobalErrorHandlers } from './lib/errorReporter.js';

installGlobalErrorHandlers();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Outermost so a crash in any provider or page still renders a way out. */}
    <ErrorBoundary>
      <AnalysisProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </AnalysisProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
