import React, { useState, useEffect } from 'react';
import { X, Loader2, Download, Eye, AlertTriangle, ShieldCheck, FileText } from 'lucide-react';
import axiosInstance from '../../api/axiosConfig';
import { toast } from 'react-toastify';

const FormPdfPreviewModal = ({ isOpen, onClose, previewUrl, title, isESigned, downloadUrl }) => {
  const [loading, setLoading] = useState(true);
  const [blobUrl, setBlobUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let activeUrl = null;
    const fetchPdfBlob = async () => {
      if (!isOpen || !previewUrl) return;
      setLoading(true);
      setErrorMsg('');
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await axiosInstance.get(previewUrl, {
          responseType: 'blob',
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined
          }
        });
        const blob = new Blob([response.data], { type: 'application/pdf' });
        activeUrl = window.URL.createObjectURL(blob);
        setBlobUrl(activeUrl);
      } catch (err) {
        console.error('Failed to load PDF preview:', err);
        setErrorMsg(err.response?.data?.message || err.message || 'Failed to load document preview.');
      } finally {
        setLoading(false);
      }
    };

    fetchPdfBlob();

    return () => {
      if (activeUrl) {
        window.URL.revokeObjectURL(activeUrl);
      }
    };
  }, [isOpen, previewUrl]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (!isESigned) {
      toast.warn('Cannot download form before e-signature is completed. Only preview is allowed prior to signing.');
      return;
    }
    if (!downloadUrl) return;
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await axiosInstance.get(downloadUrl, {
        responseType: 'blob',
        headers: { Authorization: token ? `Bearer ${token}` : undefined }
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title || 'Form'}_signed.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Signed document downloaded successfully!');
    } catch (err) {
      const fallbackUrl =
        err?.request?.responseURL ||
        err?.response?.request?.responseURL ||
        err?.response?.headers?.location;

      if (fallbackUrl && (fallbackUrl.includes('aces3.ai') || fallbackUrl.includes('.pdf'))) {
        const link = document.createElement('a');
        link.href = fallbackUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.setAttribute('download', `${title || 'Form'}_signed.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success('Signed document downloaded successfully!');
        return;
      }

      toast.error(err.response?.data?.message || 'Download failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 px-6 border-b border-gray-200 bg-gray-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#225091] flex items-center justify-center font-bold">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">{title || 'Form PDF Document'}</h3>
              <p className="text-xs text-gray-500">
                Status: {isESigned ? (
                  <span className="text-emerald-700 font-bold">🔒 E-SIGNED & LOCKED</span>
                ) : (
                  <span className="text-amber-700 font-bold">⚠️ DRAFT / WATERMARKED PREVIEW</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={!isESigned}
              title={isESigned ? "Download Signed S3 PDF" : "Download blocked until E-Signature"}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isESigned
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                  : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
              }`}
            >
              <Download size={15} />
              <span>Download PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Phase Banner */}
        {!isESigned && (
          <div className="bg-amber-50 border-b border-amber-200 p-3 px-6 text-xs text-amber-900 flex items-center gap-2 shrink-0">
            <AlertTriangle size={16} className="text-amber-600 shrink-0" />
            <span>
              <strong>PREVIEW ONLY MODE:</strong> Streamed in-memory with a watermark. Downloading signed PDF will be unlocked after e-signature.
            </span>
          </div>
        )}

        {/* PDF View Container */}
        <div className="flex-1 bg-gray-100 relative">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/80">
              <Loader2 size={36} className="animate-spin text-[#225091]" />
              <p className="text-sm font-semibold text-gray-600">Generating document stream…</p>
            </div>
          ) : errorMsg ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <AlertTriangle size={40} className="text-rose-500" />
              <p className="text-base font-bold text-gray-800">Unable to load document</p>
              <p className="text-xs text-gray-500 max-w-md">{errorMsg}</p>
            </div>
          ) : blobUrl ? (
            <iframe
              src={blobUrl}
              title={title}
              className="w-full h-full border-0"
            />
          ) : null}
        </div>

      </div>
    </div>
  );
};

export default FormPdfPreviewModal;
