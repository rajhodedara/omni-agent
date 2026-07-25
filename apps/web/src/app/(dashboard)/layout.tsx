import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Header />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, position: 'relative', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
