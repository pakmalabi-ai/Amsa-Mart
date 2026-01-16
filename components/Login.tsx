import React, { useState } from 'react';
import { User } from '../types';
import { Lock, User as UserIcon, Store, AlertCircle, RefreshCw } from 'lucide-react';
import { Api } from '../services/api';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Mengirim data username & password (plain text) ke backend
      // Backend akan mencocokkan dengan data di Sheet 'Users'
      const response = await Api.postData('LOGIN', {
        username: username.trim(),
        password: password.trim()
      });

      if (response && response.status === 'success' && response.user) {
         onLogin(response.user);
      } else {
         setError(response.message || 'Username atau password salah!');
      }

    } catch (err) {
      console.error(err);
      setError('Gagal menghubungi server. Periksa URL API di Pengaturan.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetUsers = async () => {
    if (!confirm("PERHATIAN: Ini akan menghapus sheet 'Users' dan mengisi ulang dengan akun default (admin, kasir, manager) beserta password aslinya. Lanjutkan?")) return;
    
    setIsResetting(true);
    try {
      const res = await Api.postData('RESET_USERS', {});
      if (res.status === 'success') {
        alert("Reset Sukses! Silakan login.");
        setError('');
      } else {
        alert("Gagal reset: " + res.message);
      }
    } catch (e) {
      alert("Gagal menghubungi server.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-blue-600 p-8 text-center text-white">
          <div className="mx-auto bg-blue-500 w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-inner">
            <Store size={32} />
          </div>
          <h1 className="text-2xl font-bold">Amsa Mart</h1>
          <p className="text-blue-100">Sistem Manajemen Toko</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm font-medium border border-red-200 flex items-center justify-center gap-2 text-center">
                <AlertCircle size={16} className="shrink-0"/> <span>{error}</span>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 block">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <UserIcon size={18} />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="Contoh: admin"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 block">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="Masukkan password"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md active:transform active:scale-95 ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
            >
              {isLoading ? 'Memverifikasi...' : 'Masuk Aplikasi'}
            </button>
          </form>

          {/* Tombol Reset User */}
          <div className="mt-8 pt-4 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400 mb-2">Belum setup data user di Sheet?</p>
            <button 
              onClick={handleResetUsers}
              disabled={isResetting}
              className="text-xs text-blue-600 font-bold hover:text-blue-800 flex items-center justify-center gap-1 mx-auto"
            >
              <RefreshCw size={12} className={isResetting ? "animate-spin" : ""} />
              {isResetting ? "Sedang Mereset..." : "Reset Data User ke Default"}
            </button>
          </div>
          
          <div className="mt-6 text-center text-xs text-gray-400">
            &copy; {new Date().getFullYear()} Amsa Mart System <br/>
            <span className="text-[10px] text-gray-300">Database Connection: Google Sheets</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;