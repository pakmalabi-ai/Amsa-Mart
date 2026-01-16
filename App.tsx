import React, { useState, useEffect } from 'react';
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
  const [isConnected, setIsConnected] = useState(false);

  // Cek sesi login & URL saat startup
  useEffect(() => {
     // Cek Login
     const savedUser = localStorage.getItem('AMSA_MART_USER');
     if (savedUser) {
       setUser(JSON.parse(savedUser));
     }

     // Cek Koneksi
     const url = localStorage.getItem('AMSA_MART_API_URL');
     setIsConnected(!!url);
  }, []);

  // Effect untuk memuat data jika user sudah login
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('AMSA_MART_USER', JSON.stringify(loggedInUser));
    setCurrentView('POS'); // Default view setelah login
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
    const url = localStorage.getItem('AMSA_MART_API_URL');
    setIsConnected(!!url);
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
    // Jika User Kasir mencoba akses selain POS, paksa kembali ke POS
    if (user?.role === 'kasir' && currentView !== 'POS') {
      return <POS inventory={inventory} refreshData={loadData} />;
    }

    switch (currentView) {
      case 'POS':
        return <POS inventory={inventory} refreshData={loadData} />;
      case 'INVENTORY':
        // Hanya Admin
        return user?.role === 'admin' ? <Inventory data={inventory} refreshData={loadData} /> : null;
      case 'LEDGER':
        // Hanya Admin
        return user?.role === 'admin' ? <Ledger data={ledger} /> : null;
      case 'REPORTS':
        // Hanya Admin
        return user?.role === 'admin' ? <Reports inventory={inventory} ledger={ledger} /> : null;
      default:
        return <POS inventory={inventory} refreshData={loadData} />;
    }
  };

  // Jika belum login, tampilkan halaman Login
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-900">
      <Navbar 
        currentView={currentView} 
        setView={setCurrentView} 
        onOpenSettings={() => setIsSettingsOpen(true)}
        user={user}
        onLogout={handleLogout}
      />
      
      {!isConnected && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-bold">Mode Demo</p>
              <p className="text-sm">Anda sedang menggunakan data dummy. 
                {user.role === 'admin' 
                  ? ' Klik ikon Gerigi di pojok kanan atas untuk menghubungkan Google Sheet.' 
                  : ' Hubungi Admin untuk konfigurasi database.'}
              </p>
            </div>
            {user.role === 'admin' && (
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="bg-yellow-200 hover:bg-yellow-300 text-yellow-800 px-3 py-1 rounded text-sm font-semibold"
              >
                Hubungkan
              </button>
            )}
          </div>
        </div>
      )}

      <main>
        {renderContent()}
      </main>

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