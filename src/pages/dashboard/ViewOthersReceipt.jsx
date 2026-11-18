import React, { useState, useEffect } from 'react';
import { ChevronRight, ArrowLeft, Download, Printer, Loader2, XCircle, CheckCircle, X } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { othersReceiptService } from '../../api/othersReceiptService';
import useAuthStore from '../../store/authStore';
import PageHeader from '../../components/common/PageHeader';
import { isBankOwner, canApproveReceipts } from '../../utils/roleUtils';
import { SkeletonReceiptView } from '../../components/common/Skeleton';

const ViewOthersReceipt = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Reject & Preview modal state
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState(null);

  const authRole = useAuthStore((state) => state.role);
  const authUser = useAuthStore((state) => state.user);
  const permissions = useAuthStore((state) => state.permissions) || [];
  const canApprove = canApproveReceipts(authRole, authUser, permissions);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const res = await othersReceiptService.getById(id);
        if (res && res.success && res.data) {
          setReceipt(res.data);
        } else {
          throw new Error(res?.message || 'Receipt not found');
        }
      } catch (err) {
        console.warn('Could not fetch receipt details from API:', err.message);
        toast.error(err.message || 'Failed to load receipt details.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchDetails();
    }
  }, [id]);

  const handleApprove = async () => {
    setUpdating(true);
    try {
      const receiptId = receipt?._id || receipt?.id || id;
      const res = await othersReceiptService.approve(receiptId);
      toast.success(res?.message || 'Others Receipt approved successfully.');
      setReceipt(prev => ({
        ...prev,
        status: 'APPROVED',
        rejectionReason: null,
        approvedBy: res?.data?.approvedBy || 'Branch Manager / Owner'
      }));
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to approve receipt');
    } finally {
      setUpdating(false);
    }
  };

  const handleReject = async (e) => {
    if (e) e.preventDefault();
    if (!rejectionReason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }
    setUpdating(true);
    try {
      const receiptId = receipt?._id || receipt?.id || id;
      const res = await othersReceiptService.reject(receiptId, rejectionReason.trim());
      toast.success(res?.message || 'Others Receipt rejected successfully.');
      setIsRejectModalOpen(false);
      setReceipt(prev => ({
        ...prev,
        status: 'REJECTED',
        rejectionReason: rejectionReason.trim(),
        rejectedBy: res?.data?.rejectedBy || 'Branch Manager / Owner'
      }));
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to reject receipt');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'PENDING':
      case 'NEW':
        return <span className="inline-flex items-center justify-center px-4 py-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full">PENDING</span>;
      case 'APPROVED':
        return <span className="inline-flex items-center justify-center px-4 py-1 text-xs font-bold text-[#225091] bg-teal-50 border border-teal-200 rounded-full">APPROVED</span>;
      case 'REJECTED':
        return <span className="inline-flex items-center justify-center px-4 py-1 text-xs font-bold text-red-500 bg-red-50 border border-red-200 rounded-full">REJECTED</span>;
      default:
        return <span className="inline-flex items-center justify-center px-4 py-1 text-xs font-bold text-gray-600 bg-gray-100 border border-gray-200 rounded-full">{status}</span>;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    window.print();
  };

  if (loading) {
    return <SkeletonReceiptView />;
  }

  if (!receipt) {
    return (
      <div className="w-full p-12 text-center text-gray-500">
        <p className="text-lg font-semibold mb-4">Others Receipt not found.</p>
        <button 
          onClick={() => navigate('/others-receipt')}
          className="px-6 py-2 bg-[#225091] text-white rounded-full font-medium"
        >
          Back to Others Receipts
        </button>
      </div>
    );
  }

  const receiptDate = receipt.date ? (receipt.date.includes('T') ? receipt.date.split('T')[0] : receipt.date) : '—';
  const payeeName = receipt.name || receipt.preparedBy || '—';
  const accountNumber = receipt.accountNumber || receipt.acNo || '—';
  const isPending = ['NEW', 'PENDING'].includes((receipt.status || '').toUpperCase());

  return (
    <div className="w-full max-w-none space-y-6">
      {/* Header and Breadcrumb */}
      <PageHeader
        title="View Others Receipt"
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Receipt Management' },
          { label: 'Others Receipt', to: '/others-receipt' },
          { label: 'View Receipt' }
        ]}
        showBack={true}
        backUrl="/others-receipt"
        className="print:hidden"
      >
        {isPending && canApprove ? (
          <>
            <button 
              type="button"
              disabled={updating}
              onClick={() => {
                setRejectionReason('');
                setIsRejectModalOpen(true);
              }}
              className="px-5 py-2 rounded-full border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 font-semibold text-xs transition-colors shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              <XCircle size={14} />
              <span>Reject</span>
            </button>
            <button 
              type="button"
              disabled={updating}
              onClick={handleApprove}
              className="px-6 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors shadow-sm text-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {updating ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              <span>Approve Receipt</span>
            </button>
          </>
        ) : (
          <>
            <button 
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-full font-semibold text-xs transition-colors shadow-sm cursor-pointer"
            >
              <Download size={14} />
              <span>Download</span>
            </button>
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-[#225091] hover:bg-[#1b427b] text-white rounded-full font-semibold text-xs transition-colors shadow-sm cursor-pointer"
            >
              <Printer size={14} />
              <span>Print</span>
            </button>
          </>
        )}
      </PageHeader>

      {/* Main Receipt Voucher */}
      <div className="w-full bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden relative pb-24">
        
        {/* Document Header */}
        <div className="px-10 py-8 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gradient-to-r from-gray-50/50 to-white">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-[#225091]/10 rounded-xl flex flex-col items-center justify-center shrink-0 text-[#225091]">
               <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                 <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
               </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{receipt.bankName || 'Sahayaone Co-operative Bank'}</h2>
              <p className="text-sm text-gray-600 mt-0.5">
                {receipt.branchName ? `${receipt.branchName}, ` : ''}
                {typeof receipt.address === 'object' ? (receipt.address?.city || receipt.address?.addressLine1 || receipt.address?.name || 'Central Office, Maharashtra') : (receipt.address || receipt.city || 'Central Office, Maharashtra')}
              </p>
              <p className="text-sm text-gray-600">{receipt.phone || '+91 98765 43210'}</p>
            </div>
          </div>
          <div className="text-left md:text-right">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider text-[#225091]">OTHERS RECEIPT</h3>
            <p className="text-sm text-gray-600 mt-2">Receipt No: <span className="font-bold text-[#1b2559]">{receipt.receiptNo || 'OT-000001'}</span></p>
            <p className="text-sm text-gray-600 mt-0.5">Receipt Date: <span className="font-medium text-gray-800">{receiptDate}</span></p>
          </div>
        </div>

        {/* Rejection Alert Banner */}
        {receipt.status === 'REJECTED' && (
          <div className="mx-10 mt-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
            <XCircle className="text-rose-600 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="text-sm font-bold text-rose-800">Receipt Rejected</h4>
              <p className="text-sm text-rose-700 mt-1">
                <span className="font-semibold">Rejection Reason: </span>
                {receipt.rejectionReason || 'No specific reason provided.'}
              </p>
            </div>
          </div>
        )}

        {/* Details Grid */}
        <div className="px-10 py-8">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
             <div>
                <p className="text-xs uppercase font-bold text-gray-400 mb-1">Payee / Member Name</p>
                <p className="text-gray-900 font-semibold text-[16px]">{payeeName}</p>
             </div>
             <div className="flex flex-col md:items-end">
                <p className="text-xs uppercase font-bold text-gray-400 mb-1">Status</p>
                <div>{getStatusBadge(receipt.status)}</div>
             </div>
             
             <div>
                <p className="text-xs uppercase font-bold text-gray-400 mb-1">Section & Type</p>
                <p className="text-gray-900 font-semibold text-sm">
                  <span className="inline-block bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs mr-2 font-bold">{receipt.section || 'Account section'}</span>
                  <span>{receipt.type || 'Saving account'}</span>
                </p>
             </div>
             <div className="md:text-right">
                <p className="text-xs uppercase font-bold text-gray-400 mb-1">Account Number</p>
                <p className="text-gray-800 font-medium text-sm font-mono">{accountNumber}</p>
             </div>

             <div>
                <p className="text-xs uppercase font-bold text-gray-400 mb-1">GL Head</p>
                <p className="text-gray-800 font-medium text-sm">
                  {receipt.glHeadName ? `${receipt.glHeadName} (${receipt.glHead || ''})` : (receipt.glHead || '—')}
                </p>
             </div>
             <div className="md:text-right">
                <p className="text-xs uppercase font-bold text-gray-400 mb-1">Location / Branch</p>
                <p className="text-gray-800 font-medium text-sm">{receipt.branchName || receipt.location || receipt.branch || '—'}</p>
             </div>

             <div>
                <p className="text-xs uppercase font-bold text-gray-400 mb-1">Amount</p>
                <p className="text-emerald-600 font-bold text-xl">{receipt.formattedAmount || `₹${Number(receipt.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}</p>
             </div>
           </div>

           {/* Description / Narration */}
           <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-xs uppercase font-bold text-gray-400 mb-2">Narration / Remarks</p>
              <p className="text-gray-700 text-sm leading-relaxed bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                {receipt.description || receipt.narration || receipt.remarks || 'No remarks provided.'}
              </p>
           </div>

           {/* Receipt Image Proof Attachment */}
           {(receipt.receiptImage || receipt.image || receipt.imageUrl) && (
             <div className="mt-8 pt-6 border-t border-gray-100">
                <p className="text-xs uppercase font-bold text-gray-400 mb-3">Attached Document / Proof</p>
                <div className="relative inline-block border rounded-xl overflow-hidden shadow-xs group cursor-pointer" onClick={() => setPreviewImageUrl(receipt.receiptImage || receipt.image || receipt.imageUrl)}>
                   <img 
                     src={receipt.receiptImage || receipt.image || receipt.imageUrl} 
                     alt="Receipt Document" 
                     className="max-h-48 rounded-lg object-contain bg-gray-50"
                   />
                   <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold transition-opacity">
                     Click to View Full Preview
                   </div>
                </div>
             </div>
           )}

           {/* Signature Line */}
           <div className="mt-16 pt-10 border-t border-gray-200 flex justify-between items-end text-xs text-gray-500">
              <div className="text-center">
                <div className="w-40 border-b border-gray-300 pb-1 mb-1 font-semibold text-gray-700">
                  {receipt.preparedBy || 'Cashier / Officer'}
                </div>
                <p>Prepared By</p>
              </div>
              <div className="text-center">
                <div className="w-40 border-b border-gray-300 pb-1 mb-1 font-semibold text-gray-700">
                  {receipt.approvedBy || (receipt.status === 'APPROVED' ? 'Branch Manager' : '—')}
                </div>
                <p>Authorized Signatory</p>
              </div>
           </div>
        </div>
      </div>

      {/* Reject Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 shadow-xl max-w-md w-full animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Reject Others Receipt</h3>
            <p className="text-xs text-gray-500 mb-4">Please specify the reason for rejecting receipt <strong>{receipt.receiptNo}</strong>.</p>
            <form onSubmit={handleReject}>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 min-h-[100px]"
                required
              />
              <div className="flex items-center justify-end gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-full text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-xs font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {updating ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                  <span>Confirm Rejection</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setPreviewImageUrl(null)}>
          <div className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setPreviewImageUrl(null)}
              className="absolute -top-10 right-0 p-2 text-white/80 hover:text-white cursor-pointer"
            >
              <X size={24} />
            </button>
            <img src={previewImageUrl} alt="Full Receipt Preview" className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewOthersReceipt;
