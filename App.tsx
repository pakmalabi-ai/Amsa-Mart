import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import POS from './components/POS';
import Inventory from './components/Inventory';
import Ledger from './components/Ledger';
import Reports from './components/Reports';
import SettingsModal from './components/SettingsModal';
import Login from './components/Login';
import { ViewState, Product, LedgerEntry, User } from './types';
import { Api } from './services/api';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('POS');
  const [inventory, setInventory] = useState<Product[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Cek sesi login saat startup
  useEffect(() => {
     // Cek Login
     const savedUser = localStorage.getItem('AMSA_MART_USER');
     if (savedUser) {
       setUser(JSON.parse(savedUser));
     }
  }, []);

  // Effect untuk memuat data jika user sudah login
  useEffect(() => {
    if (user) {
      loadData();
      // Set default view berdasarkan role saat pertama kali load / login
      if (user.role === 'manager' && currentView === 'POS') {
        setCurrentView('REPORTS');
      }
    }
  }, [user]);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('AMSA_MART_USER', JSON.stringify(loggedInUser));
    // Redirect manager ke Laporan, karena tidak punya akses POS
    if (loggedInUser.role === 'manager') {
      setCurrentView('REPORTS');
    } else {
      setCurrentView('POS'); 
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('AMSA_MART_USER');
    setInventory([]);
    setLedger([]);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [invData, ledgerData] = await Promise.all([
        Api.getInventory(),
        Api.getLedger()
      ]);
      setInventory(invData || []);
      setLedger(ledgerData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = () => {
    loadData(); // Reload data dengan URL baru
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-500">Memuat data...</p>
        </div>
      );
    }

    // Proteksi Tampilan berdasarkan Role
    // Kasir hanya boleh POS
    if (user?.role === 'kasir' && currentView !== 'POS') {
      return <POS inventory={inventory} refreshData={loadData} />;
    }
    // Manager tidak boleh POS
    if (user?.role === 'manager' && currentView === 'POS') {
       return <div className="p-8 text-center text-red-500">Anda tidak memiliki akses ke halaman ini.</div>;
    }

    switch (currentView) {
      case 'POS':
        return <POS inventory={inventory} refreshData={loadData} />;
      case 'INVENTORY':
        return <Inventory data={inventory} refreshData={loadData} />;
      case 'LEDGER':
        return <Ledger data={ledger} />;
      case 'REPORTS':
        return <Reports inventory={inventory} ledger={ledger} />;
      default:
        return <POS inventory={inventory} refreshData={loadData} />;
    }
  };

  // Jika belum login, tampilkan halaman Login
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-900 flex flex-col">
      <Navbar 
        currentView={currentView} 
        setView={setCurrentView} 
        onOpenSettings={() => setIsSettingsOpen(true)}
        user={user}
        onLogout={handleLogout}
      />
      
      <main className="flex-grow">
        {renderContent()}
      </main>

      <footer className="bg-gray-50 border-t border-gray-200 py-4 text-center text-xs text-gray-500 print:hidden">
        Dikembangkan oleh : MWS AI Studio
      </footer>

      {/* Modal Settings hanya dirender jika Admin */}
      {user.role === 'admin' && (
        <SettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
          onSave={handleSaveSettings}
        />
      )}
    </div>
  );
}

export default App;