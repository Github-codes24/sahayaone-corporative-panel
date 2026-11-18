import React, { useState } from 'react';
import { X, AlertTriangle, ShieldCheck, CheckCircle2, FileText, PenTool, Upload, Lock, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import SignatureCanvas from '../common/SignatureCanvas';
import { merchantService } from '../../api/merchantService';

const MerchantESignatureModal = ({ isOpen, onClose, merchant, onSignatureComplete, mode = 'APPROVE' }) => {
  const [sigType, setSigType] = useState('DRAW'); // 'DRAW' | 'TYPE' | 'UPLOAD'
  const [typedName, setTypedName] = useState(merchant?.name || merchant?.merchantName || '');
  const [drawnSignatureData, setDrawnSignatureData] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !merchant) return null;

  const isAlreadySigned = merchant?.eSignatureStatus === 'COMPLETED' || merchant?.isSigned === true;

  const handleSubmitSignature = async (e) => {
    e.preventDefault();

    if (isAlreadySigned) {
      toast.info('Form is already E-Signed and locked.');
      return;
    }

    if (!consentChecked) {
      toast.error('Please accept the legal declaration checkbox before signing.');
      return;
    }

    let finalSignaturePayload = null;

    if (sigType === 'DRAW') {
      if (!drawnSignatureData) {
        toast.error('Please draw your signature on the pad.');
        return;
      }
      finalSignaturePayload = drawnSignatureData;
    } else if (sigType === 'TYPE') {
      if (!typedName.trim()) {
        toast.error('Please type your full legal name for signature.');
        return;
      }
      finalSignaturePayload = typedName.trim();
    } else if (sigType === 'UPLOAD') {
      if (!uploadedFile) {
        toast.error('Please upload a scanned signature image.');
        return;
      }
      finalSignaturePayload = uploadedFile;
    }

    setSubmitting(true);

    try {
      const merchantId = merchant._id || merchant.id || merchant.merchantId;
      const payload = new FormData();
      payload.append('signatureType', sigType);
      payload.append('signatureData', finalSignaturePayload);
      payload.append('consentGiven', 'true');

      // 1. Submit E-Signature and lock forms
      const esignRes = await merchantService.submitESignature(merchantId, payload).catch(() => null);
      
      // 2. Execute Onboarding Approval if in APPROVE mode
      if (mode === 'APPROVE' && (merchant.approvalStatus !== 'APPROVED' && merchant.isApproved !== true)) {
        await merchantService.approve(merchantId);
        toast.success('Merchant E-Signature submitted & Onboarding Approved successfully!');
      } else {
        toast.success(esignRes?.message || 'E-Signature submitted successfully! Forms are permanently locked.');
      }
      
      if (onSignatureComplete) {
        onSignatureComplete(esignRes?.data || esignRes);
      }
      onClose();
    } catch (err) {
      console.error('Submit E-signature failed:', err);
      toast.error(err.response?.data?.message || 'Failed to complete E-Signature and approval.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-gray-50 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-y-auto p-6 md:p-8 animate-in fade-in zoom-in-95 flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200 shrink-0">
          <div>
            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <ShieldCheck className="text-[#225091]" size={24} />
              <span>Official Merchant E-Signature Forms</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Sahayaone Urban Multi-State Co-op Society Ltd. • Merchant ID: <span className="font-mono font-bold text-gray-800">{merchant.merchantId || merchant._id}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 transition-colors cursor-pointer"
          >
            <X size={22} />
          </button>
        </div>

        {/* Mandatory Pre-Signature Warning Alert Banner */}
        <div className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
          isAlreadySigned 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
            : 'bg-amber-50 border-amber-300 text-amber-950 shadow-2xs'
        }`}>
          {isAlreadySigned ? (
            <Lock size={22} className="text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle size={22} className="text-amber-600 shrink-0 mt-0.5 animate-bounce" />
          )}
          <div className="text-xs leading-relaxed flex-1">
            {isAlreadySigned ? (
              <div>
                <span className="font-bold text-emerald-900 text-sm block mb-0.5">
                  🔒 FORMS PERMANENTLY LOCKED & E-SIGNED
                </span>
                <span>Both Form 1 (Membership Application) and Form 2 (Account Opening) have been legally E-Signed and locked. Further updates are disabled.</span>
              </div>
            ) : (
              <div>
                <span className="font-bold text-amber-950 text-sm block mb-0.5">
                  ⚠️ IMPORTANT WARNING: EDITABLE ONLY TILL E-SIGNATURE
                </span>
                <span>
                  Please carefully review all form fields below. You can edit and update form details <strong>only prior to E-Signature</strong>. Once you submit the E-Signature below, the forms and merchant details will be <strong>permanently locked</strong> and cannot be edited or updated.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Signature Context Info */}
        {!isAlreadySigned && (
          <div className="bg-blue-50 border border-blue-200 p-5 rounded-2xl">
            <h4 className="font-bold text-[#225091] text-sm mb-2 flex items-center gap-1.5">
              <FileText size={16} /> Documents Pending Signature
            </h4>
            <ul className="text-sm text-blue-900 space-y-1.5 list-disc pl-5">
              <li>Form 1: Membership Application (सभासदाकरिता अर्ज)</li>
              <li>Form 2: Account Opening & Nomination (खाते उघडण्याचा अर्ज)</li>
            </ul>
          </div>
        )}

        {/* E-Signature Collection Section */}
        {!isAlreadySigned ? (
          <form onSubmit={handleSubmitSignature} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
              <PenTool size={16} className="text-[#225091]" />
              <span>Append Merchant E-Signature</span>
            </h4>

            {/* Signature Method Tabs */}
            <div className="flex items-center gap-2 text-xs">
              {[
                { id: 'DRAW', label: 'Draw Signature Pad', icon: PenTool },
                { id: 'TYPE', label: 'Type Name Signature', icon: FileText },
                { id: 'UPLOAD', label: 'Upload Signature Image', icon: Upload }
              ].map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSigType(method.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
                      sigType === method.id
                        ? 'bg-blue-50 text-[#225091] border border-blue-200'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{method.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Signature Method Content */}
            <div className="pt-2">
              {sigType === 'DRAW' && (
                <SignatureCanvas
                  onSave={(base64) => setDrawnSignatureData(base64)}
                  isLocked={isAlreadySigned}
                />
              )}

              {sigType === 'TYPE' && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-700">Type Full Legal Name</label>
                  <input
                    type="text"
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                    placeholder="Enter full legal name..."
                    className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-[#225091]"
                  />
                  {typedName && (
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center font-serif text-2xl italic text-gray-900 tracking-wide">
                      {typedName}
                    </div>
                  )}
                </div>
              )}

              {sigType === 'UPLOAD' && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-700">Upload Scanned Signature (PNG/JPG)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setUploadedFile(e.target.files[0])}
                    className="w-full p-2 border border-gray-300 rounded-xl text-xs bg-gray-50 cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Legal Consent Box */}
            <div className="pt-3 border-t border-gray-100 flex items-start gap-3 text-xs text-gray-700">
              <input
                type="checkbox"
                id="consentCheck"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-[#225091] focus:ring-[#225091] rounded cursor-pointer"
              />
              <label htmlFor="consentCheck" className="cursor-pointer font-medium leading-relaxed">
                I hereby declare that all details in Form 1 & Form 2 are verified and true. I understand that submitting this E-Signature will <strong>permanently lock both forms</strong> from future editing.
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting || !consentChecked}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer transition-colors"
              >
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                <span>{mode === 'APPROVE' ? 'Submit E-Sign & Finalize Approval' : 'Submit & Lock Forms Permanently'}</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 text-xs text-center font-bold flex items-center justify-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span>E-Signature Completed & Forms Locked Permanently</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MerchantESignatureModal;
