import React, { useState } from 'react';
import { X, Mail, Phone, User, ShieldCheck } from 'lucide-react';

const InitializeEsignModal = ({ isOpen, onClose, formTitle, onInitialize, isInitializing, isReinitializing = false, defaultCoordinates }) => {
  const [formData, setFormData] = useState({
    email: '',
    mobile: '',
    fullName: '',
    coordX: defaultCoordinates?.x?.toString() || '',
    coordY: defaultCoordinates?.y?.toString() || ''
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {};
    if (formData.email.trim()) payload.email = formData.email.trim();
    if (formData.mobile.trim()) payload.mobile = formData.mobile.trim();
    if (formData.fullName.trim()) payload.fullName = formData.fullName.trim();
    if (formData.coordX.trim()) payload.coordX = formData.coordX.trim();
    if (formData.coordY.trim()) payload.coordY = formData.coordY.trim();
    
    onInitialize(payload);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="text-[#225091]" size={20} />
              {isReinitializing ? 'Re-initialize E-Signature' : 'Initialize E-Signature'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[280px]">{formTitle}</p>
          </div>
          <button 
            onClick={onClose}
            disabled={isInitializing} 
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5 text-sm text-blue-800">
            <p className="font-semibold mb-1">
              {isReinitializing ? 'Re-initialize pending e-signature' : 'VerifyA2Z Email Override (Optional)'}
            </p>
            <p className="text-xs opacity-90 leading-relaxed">
              {isReinitializing
                ? 'This will call the existing e-signature initialization service again. The invitation will be sent to the registered contact details unless you provide an override below.'
                : "By default, the signature invitation will be sent to the applicant's registered email address from the form data. You can optionally override the contact details below."}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">Override Customer Email (Optional)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  placeholder="e.g. applicant@example.com"
                  className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#225091]/20 focus:border-[#225091] transition-all"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={isInitializing}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">Override Customer Mobile (Optional)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Phone size={16} />
                </div>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#225091]/20 focus:border-[#225091] transition-all"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  disabled={isInitializing}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">Override Customer Name (Optional)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  placeholder="Full Name"
                  className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#225091]/20 focus:border-[#225091] transition-all"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  disabled={isInitializing}
                />
              </div>
            </div>

            <div className="flex gap-4 pt-2 border-t border-gray-100">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Override X Position (Optional)</label>
                <input
                  type="number"
                  placeholder="e.g. 390"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 text-gray-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#225091]/20 focus:border-[#225091] transition-all"
                  value={formData.coordX}
                  onChange={(e) => setFormData({ ...formData, coordX: e.target.value })}
                  disabled={isInitializing}
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Override Y Position (Optional)</label>
                <input
                  type="number"
                  placeholder="e.g. 690"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 text-gray-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#225091]/20 focus:border-[#225091] transition-all"
                  value={formData.coordY}
                  onChange={(e) => setFormData({ ...formData, coordY: e.target.value })}
                  disabled={isInitializing}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isInitializing}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isInitializing}
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#225091] hover:bg-[#183d73] text-white shadow-md shadow-blue-900/10 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-70"
            >
              {isInitializing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Initializing...
                </>
              ) : (
                isReinitializing ? 'Re-initialize E-Signature' : 'Initialize E-Signature'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InitializeEsignModal;
