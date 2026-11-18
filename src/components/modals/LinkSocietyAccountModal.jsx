import React, { useState, useEffect } from 'react';
import { X, Landmark, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import { societyCustomerService } from '../../api/societyCustomerService';

const LinkSocietyAccountModal = ({ isOpen, onClose, member, onSuccess }) => {
  const [societyAccountNumber, setSocietyAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [pincode, setPincode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (member && isOpen) {
      const sa = member.societyAccountDetails || member.societyAccount || {};
      const primaryBank = (member.bankDetails && member.bankDetails[0]) || {};

      setSocietyAccountNumber(sa.accountNumber || sa.societyAccountNumber || primaryBank.accountNumber || '');
      setAccountHolderName(
        sa.accountHolderName ||
        member.name ||
        member.personalDetails?.fullName ||
        primaryBank.accountHolderName ||
        ''
      );
      setIfscCode(sa.ifscCode || primaryBank.ifscCode || 'MAHB0001234');
      setBankName(sa.bankName || primaryBank.bankName || 'Main Branch Bank');
      setBranchName(sa.branchName || member.branchName || primaryBank.branchName || 'Main Branch');
      setPincode(
        sa.pincode ||
        member.personalDetails?.residentialPincode ||
        member.personalDetails?.currentPinCode ||
        primaryBank.pincode ||
        ''
      );
      setFieldErrors({});
    }
  }, [member, isOpen]);

  if (!isOpen || !member) return null;

  const validate = () => {
    const errors = {};
    if (!societyAccountNumber.trim()) {
      errors.societyAccountNumber = 'Society account number is required.';
    } else if (societyAccountNumber.trim().length < 4) {
      errors.societyAccountNumber = 'Account number must be at least 4 characters.';
    }

    if (!accountHolderName.trim()) {
      errors.accountHolderName = 'Account holder name is required.';
    }

    if (!ifscCode.trim()) {
      errors.ifscCode = 'IFSC code is required.';
    } else if (!/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(ifscCode.trim())) {
      errors.ifscCode = 'Invalid IFSC format (e.g. MAHB0001234).';
    }

    if (!bankName.trim()) {
      errors.bankName = 'Bank name is required.';
    }

    if (!branchName.trim()) {
      errors.branchName = 'Branch name is required.';
    }

    if (pincode && !/^\d{6}$/.test(pincode.trim())) {
      errors.pincode = 'Pincode must be exactly 6 digits.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      societyAccountNumber: societyAccountNumber.trim(),
      accountHolderName: accountHolderName.trim(),
      ifscCode: ifscCode.trim().toUpperCase(),
      bankName: bankName.trim(),
      branchName: branchName.trim(),
      pincode: pincode.trim() || undefined,
    };

    setSubmitting(true);
    try {
      const memberId = member.id || member._id;
      const res = await societyCustomerService.linkSocietyAccount(memberId, payload);
      toast.success(res?.message || 'Society account linked successfully!');
      if (onSuccess) {
        onSuccess(res?.data || payload);
      }
      onClose();
    } catch (err) {
      console.error('Failed to link society account:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to link society account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg z-10 overflow-hidden">
        {/* Header */}
        <div className="bg-[#225091] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Landmark size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Link Society Bank Account</h3>
              <p className="text-xs text-white/80">{member.name} ({member.customerId || member.entityType})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Society Account Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={societyAccountNumber}
              onChange={(e) => setSocietyAccountNumber(e.target.value)}
              placeholder="e.g. SOC-900123456"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#225091] focus:border-[#225091] font-mono"
            />
            {fieldErrors.societyAccountNumber && (
              <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {fieldErrors.societyAccountNumber}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Account Holder Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={accountHolderName}
              onChange={(e) => setAccountHolderName(e.target.value)}
              placeholder="Full name as in passbook"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#225091] focus:border-[#225091]"
            />
            {fieldErrors.accountHolderName && (
              <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {fieldErrors.accountHolderName}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                IFSC Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                placeholder="e.g. MAHB0001234"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#225091] focus:border-[#225091] font-mono uppercase"
              />
              {fieldErrors.ifscCode && (
                <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {fieldErrors.ifscCode}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Pincode
              </label>
              <input
                type="text"
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 440010"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#225091] focus:border-[#225091] font-mono"
              />
              {fieldErrors.pincode && (
                <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {fieldErrors.pincode}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Bank Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. Main Branch Bank"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#225091] focus:border-[#225091]"
              />
              {fieldErrors.bankName && (
                <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {fieldErrors.bankName}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Branch Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="e.g. Main Branch"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#225091] focus:border-[#225091]"
              />
              {fieldErrors.branchName && (
                <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {fieldErrors.branchName}
                </p>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-sm font-bold text-white bg-[#225091] hover:bg-[#1a3f73] rounded-lg transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <ShieldCheck size={16} /> Link Account
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LinkSocietyAccountModal;
