import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Lock, User as UserIcon, Store, HelpCircle, Copy, Check } from 'lucide-react';
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
  
  // State untuk Debugging Hash
  const [debugHash, setDebugHash] = useState('');
  const [showDebug, setShowDebug] = useState(false);
  const [copied, setCopied] = useState(false);

  // Effect untuk generate hash realtime saat user mengetik
  useEffect(() => {
    const generateHash = async () => {
      if (password) {
        const hash = await sha256(password.trim());
        setDebugHash(hash);
      } else {
        setDebugHash('');
      }
    };
    generateHash();
  }, [password]);

  const handleCopyHash = () => {
    if (debugHash) {
      navigator.clipboard.writeText(debugHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const cleanUsername = username.trim().toLowerCase();
      
      // Gunakan hash yang sudah dihitung di state
      const inputHash = debugHash || await sha256(password.trim());
      
      console.log("=== LOGIN ATTEMPT ===");
      console.log("User:", cleanUsername);
      console.log("Pass Hash:", inputHash);

      const response = await Api.postData('LOGIN', {
        username: cleanUsername,
        password: inputHash
      });

      if (response && response.status === 'success' && response.user) {
         onLogin(response.user);
      } else {
         setError(response.message || 'Gagal Login. Pastikan Hash di Sheet Users sesuai dengan Hash di bawah ini.');
         // Otomatis munculkan debug jika gagal
         setShowDebug(true);
      }

    } catch (err) {
      console.error(err);
      setError('Gagal menghubungi server. Periksa URL API di Pengaturan.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-blue-600 p-8 text-center text-white relative">
          <div className="mx-auto bg-blue-500 w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-inner">
            <Store size={32} />
          </div>
          <h1 className="text-2xl font-bold">Amsa Mart</h1>
          <p className="text-blue-100">Sistem Manajemen Toko</p>
          
          <button 
            onClick={() => setShowDebug(!showDebug)}
            className="absolute top-4 right-4 text-blue-300 hover:text-white"
            title="Bantuan Login"
          >
            <HelpCircle size={20} />
          </button>
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

            {/* AREA DEBUG HASH */}
            {showDebug && password && (
              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 text-xs">
                <p className="font-bold text-yellow-800 mb-1">Kode Hash Password Anda:</p>
                <div className="bg-white p-2 border border-gray-200 rounded break-all font-mono text-gray-600 mb-2 select-all">
                  {debugHash}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Copy kode di atas ke kolom 'password' di Google Sheet agar login berhasil.</span>
                  <button 
                    type="button"
                    onClick={handleCopyHash}
                    className="flex items-center gap-1 bg-white border border-gray-300 px-2 py-1 rounded hover:bg-gray-50 transition-colors text-gray-700 font-medium"
                  >
                    {copied ? <Check size={14} className="text-green-600"/> : <Copy size={14}/>}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

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