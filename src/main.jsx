import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App.jsx';
import { AnalysisProvider } from './state/AnalysisContext.jsx';
import { AuthProvider } from './state/AuthContext.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AnalysisProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </AnalysisProvider>
  </React.StrictMode>,
);
