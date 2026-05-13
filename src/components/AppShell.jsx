import TopNav from './TopNav.jsx';

export default function AppShell({ children }) {
  return (
    <div className="min-h-screen bg-ink text-bone">
      <TopNav />
      <main>{children}</main>
    </div>
  );
}
