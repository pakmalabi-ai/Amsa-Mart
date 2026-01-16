import React, { useState } from 'react';
import { User } from '../types';
import { Lock, User as UserIcon, Store } from 'lucide-react';
import { Api } from '../services/api';

interface LoginProps {
  onLogin: (user: User) => void;
}

// Fungsi Utility untuk Hashing SHA-256
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Normalisasi di frontend juga: Username Lowercase, Trim Password
      const cleanUsername = username.trim().toLowerCase();
      const cleanPassword = password.trim(); 

      // 1. Hash password di sisi Client
      const inputHash = await sha256(cleanPassword);
      
      // DEBUG: Lihat hash ini di Console Browser (F12). 
      // Jika login gagal, copy hash dari console dan paste ke kolom password di Google Sheet.
      console.log("=== DEBUG LOGIN ===");
      console.log("Username:", cleanUsername);
      console.log("Password Hash:", inputHash);
      
      // 2. Kirim ke API
      const response = await Api.postData('LOGIN', {
        username: cleanUsername,
        password: inputHash
      });

      if (response && response.status === 'success' && response.user) {
         onLogin(response.user);
      } else {
         // Jika gagal, tampilkan pesan dari server atau pesan default
         setError(response.message || 'Username atau password salah! Periksa Google Sheet Users.');
      }

    } catch (err) {
      console.error(err);
      setError('Gagal menghubungi server. Periksa koneksi internet atau URL API.');
    } finally {
      setIsLoading(false);
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
          <p className="text-blue-100">Silakan login untuk melanjutkan</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center font-medium border border-red-100">
                {error}
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
                  placeholder="Masukkan username"
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