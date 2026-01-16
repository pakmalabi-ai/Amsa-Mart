import React, { useState, useEffect } from 'react';
import { X, Save, Link, AlertTriangle } from 'lucide-react';
import { SCRIPT_URL } from '../constants';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave }) => {
  const [url, setUrl] = useState('');

  useEffect(() => {
    const savedUrl = localStorage.getItem('AMSA_MART_API_URL');
    setUrl(savedUrl || SCRIPT_URL);
  }, [isOpen]);

  const handleSave = () => {
    if (url.trim()) {
      localStorage.setItem('AMSA_MART_API_URL', url.trim());
    } else {
      localStorage.removeItem('AMSA_MART_API_URL');
    }
    onSave();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
          <h3 className="text-lg font-bold text-gray-800 flex items-center">
            <Link className="mr-2 h-5 w-5 text-blue-600" />
            Pengaturan Koneksi
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 mb-4">
            <p className="font-semibold mb-1">Hubungkan ke Google Sheets</p>
            <p>Masukkan URL Web App dari Google Apps Script Deployment Anda di sini.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Google Apps Script Web App URL</label>
            <input 
              type="text" 
              placeholder="https://script.google.com/macros/s/..../exec"
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div className="text-xs text-gray-500 space-y-1">
             <p className="flex items-center text-orange-600"><AlertTriangle size={12} className="mr-1"/> Pastikan deployment diatur ke "Anyone" (Siapa saja).</p>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 flex justify-end space-x-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium text-sm"
          >
            Batal
          </button>
          <button 
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 flex items-center shadow-sm"
          >
            <Save size={16} className="mr-2" />
            Simpan & Muat Ulang
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;