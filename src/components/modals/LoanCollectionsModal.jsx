import React, { useState, useEffect } from 'react';
import { X, Receipt, Loader2, Info, Banknote, Calendar } from 'lucide-react';
import { toast } from 'react-toastify';
import { societyCustomerService } from '../../api/societyCustomerService';

const LoanCollectionsModal = ({ isOpen, onClose, customerId, loan }) => {
  const [loading, setLoading] = useState(false);
  const [collections, setCollections] = useState([]);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (isOpen && customerId && loan) {
      fetchCollections();
    }
  }, [isOpen, customerId, loan]);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const loanId = loan.id || loan._id;
      const res = await societyCustomerService.getLoanCollections(customerId, loanId);
      if (res && res.success) {
        const data = res.data || {};
        setCollections(Array.isArray(data) ? data : data.items || data.collections || []);
        setSummary(data.summary || data.stats || null);
      }
    } catch (err) {
      console.error('Failed to fetch collections ledger:', err);
      toast.error(err?.response?.data?.message || 'Failed to load collections ledger');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !loan) return null;

  const formatCurrency = (val) => {
    if (val === null || val === undefined) return '₹0';
    return '₹' + Number(val).toLocaleString('en-IN');
  };

  const formatDate = (d) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col z-10 overflow-hidden">
        {/* Header */}
        <div className="bg-[#225091] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Receipt size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Loan Collections Ledger</h3>
              <p className="text-xs text-white/80">Application ID: {loan.applicationId || loan.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Loan Quick Summary */}
        <div className="bg-gray-50/80 px-6 py-3 border-b border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs shrink-0">
          <div>
            <span className="text-gray-400 block text-[10px] uppercase font-bold">Total Loan</span>
            <span className="font-bold text-gray-900">{formatCurrency(loan.totalLoanAmount)}</span>
          </div>
          <div>
            <span className="text-gray-400 block text-[10px] uppercase font-bold">Outstanding</span>
            <span className="font-bold text-rose-600">{formatCurrency(loan.outstandingAmount)}</span>
          </div>
          <div>
            <span className="text-gray-400 block text-[10px] uppercase font-bold">Monthly EMI</span>
            <span className="font-bold text-[#225091]">{formatCurrency(loan.emiAmount)}</span>
          </div>
          <div>
            <span className="text-gray-400 block text-[10px] uppercase font-bold">Status</span>
            <span className="font-bold text-emerald-700">{loan.status}</span>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 size={32} className="animate-spin text-[#225091] mb-2" />
              <p className="text-xs text-gray-400">Loading collection history...</p>
            </div>
          ) : collections.length === 0 ? (
            <div className="text-center py-12">
              <Info size={32} className="text-gray-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-gray-800">No Collection Records Found</h4>
              <p className="text-xs text-gray-400 mt-1">
                There are no recorded repayments or collections for this loan yet.
              </p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-xs border-collapse text-center whitespace-nowrap">
                <thead className="bg-[#225091] text-white">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold text-white uppercase text-[10px] border-r border-white/20">#</th>
                    <th className="py-2.5 px-3 font-semibold text-white uppercase text-[10px] border-r border-white/20">Receipt / Ref</th>
                    <th className="py-2.5 px-3 font-semibold text-white uppercase text-[10px] border-r border-white/20">Date</th>
                    <th className="py-2.5 px-3 font-semibold text-white uppercase text-[10px] border-r border-white/20">Amount Paid</th>
                    <th className="py-2.5 px-3 font-semibold text-white uppercase text-[10px] border-r border-white/20">Mode</th>
                    <th className="py-2.5 px-3 font-semibold text-white uppercase text-[10px]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {collections.map((col, idx) => (
                    <tr key={col.id || col._id || idx} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-2.5 px-3 text-gray-500">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#225091]">
                        {col.receiptNumber || col.transactionId || col.referenceId || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600">{formatDate(col.paymentDate || col.createdAt || col.date)}</td>
                      <td className="py-2.5 px-3 font-bold text-emerald-700">
                        {formatCurrency(col.amount || col.paidAmount || col.amountPaid)}
                      </td>
                      <td className="py-2.5 px-3 text-gray-700 uppercase">{col.paymentMode || col.mode || 'ONLINE'}</td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700">
                          {col.status || 'COMPLETED'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoanCollectionsModal;
