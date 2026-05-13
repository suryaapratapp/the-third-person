import { createContext, useContext, useMemo, useState } from 'react';
import { RouterProvider } from './RouterContext.jsx';

const AnalysisContext = createContext(null);

const initialFlow = {
  platform: '',
  relationshipType: '',
  personName: '',
  otherPersonDateOfBirth: '',
  chatText: '',
  sourceMode: 'paste',
  fileName: '',
  fileSize: 0,
  preparedConversation: null,
  analysisResult: null,
  promptScan: null,
  analysisError: '',
  sensitiveData: null,
  reportSource: null,
  fileSafety: null,
  cacheNotice: '',
};

export function AnalysisProvider({ children }) {
  const [flow, setFlow] = useState(initialFlow);

  const value = useMemo(() => ({
    flow,
    updateFlow: (patch) => setFlow((current) => ({ ...current, ...patch })),
    resetFlow: () => setFlow(initialFlow),
  }), [flow]);

  return (
    <RouterProvider>
      <AnalysisContext.Provider value={value}>
        {children}
      </AnalysisContext.Provider>
    </RouterProvider>
  );
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (!context) throw new Error('useAnalysis must be used inside AnalysisProvider');
  return context;
}
