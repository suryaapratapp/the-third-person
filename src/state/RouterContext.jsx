import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const RouterContext = createContext(null);

export function RouterProvider({ children }) {
  const [path, setPath] = useState(() => window.location.pathname || '/');

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname || '/');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (!window.location.hash) return;
    window.setTimeout(() => {
      document.querySelector(window.location.hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }, [path]);

  const value = useMemo(() => ({
    path,
    navigate: (nextPath) => {
      window.history.pushState({}, '', nextPath);
      setPath(window.location.pathname || '/');
      if (window.location.hash) {
        window.setTimeout(() => {
          document.querySelector(window.location.hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
  }), [path]);

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) throw new Error('useRouter must be used inside RouterProvider');
  return context;
}
