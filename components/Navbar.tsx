import React from 'react';
import { LayoutGrid, ShoppingCart, BookOpen, BarChart3, Store, Settings, LogOut } from 'lucide-react';
import { ViewState, User } from '../types';

interface NavbarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  onOpenSettings: () => void;
  user: User;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, setView, onOpenSettings, user, onLogout }) => {
  // Definisi menu dengan hak akses
  const allNavItems = [
    { id: 'POS', label: 'Kasir', icon: ShoppingCart, roles: ['admin', 'kasir'] },
    { id: 'INVENTORY', label: 'Barang', icon: LayoutGrid, roles: ['admin', 'manager'] },
    { id: 'LEDGER', label: 'Buku Kas', icon: BookOpen, roles: ['admin', 'manager'] },
    { id: 'REPORTS', label: 'Laporan', icon: BarChart3, roles: ['admin', 'manager'] },
  ] as const;

  // Filter menu berdasarkan role user yang sedang login
  const navItems = allNavItems.filter(item => (item.roles as readonly string[]).includes(user.role));

  return (
    <nav className="bg-blue-600 text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <Store className="h-8 w-8" />
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight leading-none">Amsa Mart</span>
              <span className="text-xs text-blue-200 font-medium">Halo, {user.username} ({user.role})</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="flex space-x-1 overflow-x-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setView(item.id as ViewState)}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors
                      ${isActive 
                        ? 'bg-blue-800 text-white shadow-inner' 
                        : 'text-blue-100 hover:bg-blue-500 hover:text-white'
                      }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden md:inline">{item.label}</span>
                  </button>
                );
              })}
            </div>
            
            <div className="flex items-center border-l border-blue-500 pl-2 ml-2 space-x-1">
              {/* Hanya Admin yang bisa akses Settings */}
              {user.role === 'admin' && (
                <button 
                  onClick={onOpenSettings}
                  className="p-2 text-blue-100 hover:bg-blue-700 rounded-full transition-colors"
                  title="Pengaturan Koneksi"
                >
                  <Settings className="h-5 w-5" />
                </button>
              )}
              
              <button 
                onClick={onLogout}
                className="p-2 text-red-200 hover:bg-red-600 hover:text-white rounded-full transition-colors"
                title="Keluar"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;