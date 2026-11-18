import React, { useState, useEffect } from 'react';
import {
  X, Loader2, ShieldCheck, Save,
  FileText, User, CreditCard, Landmark
} from 'lucide-react';
import { toast } from 'react-toastify';
import { onboardingFormsApi } from '../../api/onboardingFormsService';

// ─── Form Config ──────────────────────────────────────────────
const FORM_CONFIG = {
  SAVING_ACCOUNT: { label: 'Saving Account Opening Form', icon: CreditCard, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  MEMBER_FORM:    { label: 'Membership Application Form',  icon: User,       color: 'bg-purple-50 text-purple-700 border-purple-200' },
  FD_RD:          { label: 'FD / RD Account Opening Form', icon: Landmark,   color: 'bg-amber-50 text-amber-700 border-amber-200' },
  LOAN_FILE:      { label: 'Loan File & Sanction Docket',  icon: FileText,   color: 'bg-rose-50 text-rose-700 border-rose-200' },
};

// ─── Reusable Field ───────────────────────────────────────────
const Field = ({ label, id, value, onChange, type = 'text', disabled, placeholder }) => (
  <div className="flex flex-col gap-1">
    <label htmlFor={id} className="text-xs font-bold text-gray-600 uppercase tracking-wide">{label}</label>
    <input
      id={id} type={type} value={value ?? ''} placeholder={placeholder || label}
      onChange={e => onChange(e.target.value)} disabled={disabled}
      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all outline-none ${
        disabled
          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
          : 'bg-white border-gray-300 text-gray-800 focus:border-[#225091] focus:ring-2 focus:ring-[#225091]/10'
      }`}
    />
  </div>
);

const CheckField = ({ label, id, value, onChange, disabled }) => (
  <label htmlFor={id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${disabled ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-70' : 'bg-white border-gray-200 hover:border-[#225091]/40 cursor-pointer'}`}>
    <input id={id} type="checkbox" checked={Boolean(value)} onChange={e => onChange(e.target.checked)} disabled={disabled} className="w-4 h-4 rounded accent-[#225091]" />
    <span className="text-xs font-semibold text-gray-700">{label}</span>
  </label>
);

const SectionHeader = ({ title }) => (
  <div className="pt-4 pb-1 border-b border-gray-200">
    <h4 className="text-xs font-black text-[#225091] uppercase tracking-wider">{title}</h4>
  </div>
);

// ─── Deep setter helper ────────────────────────────────────────
const makeSet = (onChange) => (path, val) => onChange(prev => {
  const next = { ...prev };
  const keys = path.split('.');
  let obj = next;
  for (let i = 0; i < keys.length - 1; i++) {
    obj[keys[i]] = { ...(obj[keys[i]] || {}) };
    obj = obj[keys[i]];
  }
  obj[keys[keys.length - 1]] = val;
  return next;
});

// ─── SAVING ACCOUNT ───────────────────────────────────────────
const SavingAccountFields = ({ data, onChange, locked }) => {
  const set = makeSet(onChange);
  return (
    <>
      <SectionHeader title="Account Details" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field id="sa-op" label="Account Operation" value={data.accountOperation} onChange={v => set('accountOperation', v)} disabled={locked} />
        <Field id="sa-amt" label="Opening Amount (₹)" type="number" value={data.openingAmount} onChange={v => set('openingAmount', Number(v))} disabled={locked} />
      </div>
      <SectionHeader title="Applicant Details" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field id="sa-occ" label="Occupation" value={data.applicant?.occupation} onChange={v => set('applicant.occupation', v)} disabled={locked} />
        <Field id="sa-email" label="Email" type="email" value={data.applicant?.email} onChange={v => set('applicant.email', v)} disabled={locked} />
        <Field id="sa-addr" label="Address" value={data.applicant?.address} onChange={v => set('applicant.address', v)} disabled={locked} />
        <Field id="sa-pin" label="Pin Code" value={data.applicant?.pinCode} onChange={v => set('applicant.pinCode', v)} disabled={locked} />
      </div>
      <SectionHeader title="Nominee Details" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field id="sa-nname" label="Full Name" value={data.nominee?.fullName} onChange={v => set('nominee.fullName', v)} disabled={locked} />
        <Field id="sa-nrel" label="Relationship" value={data.nominee?.relationship} onChange={v => set('nominee.relationship', v)} disabled={locked} />
        <Field id="sa-nage" label="Age" type="number" value={data.nominee?.age} onChange={v => set('nominee.age', Number(v))} disabled={locked} />
        <Field id="sa-naddr" label="Nominee Address" value={data.nominee?.address} onChange={v => set('nominee.address', v)} disabled={locked} />
      </div>
      <SectionHeader title="Introducer Details" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field id="sa-iname" label="Full Name" value={data.introducer?.fullName} onChange={v => set('introducer.fullName', v)} disabled={locked} />
        <Field id="sa-iacno" label="Account Number" value={data.introducer?.accountNumber} onChange={v => set('introducer.accountNumber', v)} disabled={locked} />
        <Field id="sa-iocc" label="Occupation" value={data.introducer?.occupation} onChange={v => set('introducer.occupation', v)} disabled={locked} />
        <Field id="sa-imob" label="Mobile Number" value={data.introducer?.mobileNumber} onChange={v => set('introducer.mobileNumber', v)} disabled={locked} />
        <Field id="sa-idur" label="Known Duration" value={data.introducer?.knownDuration} onChange={v => set('introducer.knownDuration', v)} disabled={locked} />
      </div>
    </>
  );
};

// ─── MEMBER FORM ─────────────────────────────────────────────
const MemberFormFields = ({ data, onChange, locked }) => {
  const set = makeSet(onChange);
  return (
    <>
      <SectionHeader title="Member Details" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field id="mf-rel" label="Religion" value={data.memberDetails?.religion} onChange={v => set('memberDetails.religion', v)} disabled={locked} />
        <Field id="mf-caste" label="Caste" value={data.memberDetails?.caste} onChange={v => set('memberDetails.caste', v)} disabled={locked} />
        <Field id="mf-occ" label="Occupation" value={data.memberDetails?.occupation} onChange={v => set('memberDetails.occupation', v)} disabled={locked} />
        <Field id="mf-ann" label="Annual Income (₹)" type="number" value={data.memberDetails?.annualIncome} onChange={v => set('memberDetails.annualIncome', Number(v))} disabled={locked} />
        <Field id="mf-sal" label="Monthly Salary (₹)" type="number" value={data.memberDetails?.monthlySalary} onChange={v => set('memberDetails.monthlySalary', Number(v))} disabled={locked} />
      </div>
      <SectionHeader title="Nominee Details" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field id="mf-nname" label="Nominee Name" value={data.nominee?.fullName} onChange={v => set('nominee.fullName', v)} disabled={locked} />
        <Field id="mf-nrel" label="Relationship" value={data.nominee?.relationship} onChange={v => set('nominee.relationship', v)} disabled={locked} />
      </div>
      <SectionHeader title="Witness Details" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field id="mf-wname" label="Witness Name" value={data.witness?.name} onChange={v => set('witness.name', v)} disabled={locked} />
        <Field id="mf-waddr" label="Address" value={data.witness?.address} onChange={v => set('witness.address', v)} disabled={locked} />
        <Field id="mf-wmob" label="Mobile Number" value={data.witness?.mobile} onChange={v => set('witness.mobile', v)} disabled={locked} />
      </div>
    </>
  );
};

// ─── FD/RD FORM ──────────────────────────────────────────────
const FdRdFormFields = ({ data, onChange, locked }) => {
  const set = makeSet(onChange);
  const setWitness = (index, val) => onChange(prev => {
    const witnesses = [...(prev.witnesses || [{ name: '' }, { name: '' }])];
    witnesses[index] = { ...witnesses[index], name: val };
    return { ...prev, witnesses };
  });
  return (
    <>
      <SectionHeader title="Deposit Details" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field id="fd-amt" label="Deposit Amount (₹)" type="number" value={data.depositAmount} onChange={v => set('depositAmount', Number(v))} disabled={locked} />
        <Field id="fd-words" label="Amount in Words" value={data.depositAmountWords} onChange={v => set('depositAmountWords', v)} disabled={locked} />
      </div>
      <SectionHeader title="Nominee Details" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field id="fd-nname" label="Nominee Name" value={data.nominee?.name} onChange={v => set('nominee.name', v)} disabled={locked} />
        <Field id="fd-nrel" label="Relationship" value={data.nominee?.relationship} onChange={v => set('nominee.relationship', v)} disabled={locked} />
        <Field id="fd-nage" label="Age" type="number" value={data.nominee?.age} onChange={v => set('nominee.age', Number(v))} disabled={locked} />
        <Field id="fd-naddr" label="Address" value={data.nominee?.address} onChange={v => set('nominee.address', v)} disabled={locked} />
        <Field id="fd-ninst" label="Special Instructions" value={data.nominee?.specialInstructions} onChange={v => set('nominee.specialInstructions', v)} disabled={locked} />
      </div>
      <SectionHeader title="Witnesses" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field id="fd-w1" label="Witness 1 Name" value={data.witnesses?.[0]?.name} onChange={v => setWitness(0, v)} disabled={locked} />
        <Field id="fd-w2" label="Witness 2 Name" value={data.witnesses?.[1]?.name} onChange={v => setWitness(1, v)} disabled={locked} />
      </div>
    </>
  );
};

// ─── LOAN FILE FORM ──────────────────────────────────────────
const LoanFileFormFields = ({ data, onChange, locked }) => {
  const set = makeSet(onChange);
  return (
    <>
      <SectionHeader title="Loan Docket" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field id="lf-nat" label="Business Nature" value={data.docket?.businessNature} onChange={v => set('docket.businessNature', v)} disabled={locked} />
        <Field id="lf-agent" label="Pigmy Agent Name" value={data.docket?.pigmyAgentName} onChange={v => set('docket.pigmyAgentName', v)} disabled={locked} />
      </div>
      <SectionHeader title="Co-Borrower Details" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field id="lf-coname" label="Full Name" value={data.coBorrower?.fullName} onChange={v => set('coBorrower.fullName', v)} disabled={locked} />
        <Field id="lf-corel" label="Relationship" value={data.coBorrower?.relationship} onChange={v => set('coBorrower.relationship', v)} disabled={locked} />
        <Field id="lf-coinc" label="Monthly Income (₹)" type="number" value={data.coBorrower?.netMonthlyIncome} onChange={v => set('coBorrower.netMonthlyIncome', Number(v))} disabled={locked} />
      </div>
      <SectionHeader title="Guarantor 1" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field id="lf-g1n" label="Full Name" value={data.guarantor1?.fullName} onChange={v => set('guarantor1.fullName', v)} disabled={locked} />
        <Field id="lf-g1m" label="Mobile Number" value={data.guarantor1?.mobileNumber} onChange={v => set('guarantor1.mobileNumber', v)} disabled={locked} />
        <Field id="lf-g1a" label="Address" value={data.guarantor1?.address} onChange={v => set('guarantor1.address', v)} disabled={locked} />
        <Field id="lf-g1p" label="Property Details" value={data.guarantor1?.propertyDetails} onChange={v => set('guarantor1.propertyDetails', v)} disabled={locked} />
      </div>
      <SectionHeader title="Guarantor 2" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field id="lf-g2n" label="Full Name" value={data.guarantor2?.fullName} onChange={v => set('guarantor2.fullName', v)} disabled={locked} />
        <Field id="lf-g2m" label="Mobile Number" value={data.guarantor2?.mobileNumber} onChange={v => set('guarantor2.mobileNumber', v)} disabled={locked} />
        <Field id="lf-g2a" label="Address" value={data.guarantor2?.address} onChange={v => set('guarantor2.address', v)} disabled={locked} />
        <Field id="lf-g2p" label="Property Details" value={data.guarantor2?.propertyDetails} onChange={v => set('guarantor2.propertyDetails', v)} disabled={locked} />
      </div>
      <SectionHeader title="Document Checklist" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <CheckField id="lf-c1" label="Loan Application Attached" value={data.checklist?.loanApplicationAttached} onChange={v => set('checklist.loanApplicationAttached', v)} disabled={locked} />
        <CheckField id="lf-c2" label="Promissory Note Attached" value={data.checklist?.promissoryNoteAttached} onChange={v => set('checklist.promissoryNoteAttached', v)} disabled={locked} />
        <CheckField id="lf-c3" label="Tax Receipt Attached" value={data.checklist?.taxReceiptAttached} onChange={v => set('checklist.taxReceiptAttached', v)} disabled={locked} />
        <CheckField id="lf-c4" label="Salary Deduction Form K Attached" value={data.checklist?.salaryDeductionFormKAttached} onChange={v => set('checklist.salaryDeductionFormKAttached', v)} disabled={locked} />
        <CheckField id="lf-c5" label="Stamp Agreement Attached" value={data.checklist?.stampAgreementAttached} onChange={v => set('checklist.stampAgreementAttached', v)} disabled={locked} />
      </div>
    </>
  );
};

// ─── Main Modal ────────────────────────────────────────────────
const FormEditModal = ({ isOpen, onClose, formType, referenceId, formData, isESigned, onSaved }) => {
  const [fields, setFields] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && formData) setFields({ ...formData });
  }, [isOpen, formData]);

  if (!isOpen) return null;

  const config = FORM_CONFIG[formType] || {};
  const ConfigIcon = config.icon || FileText;
  const locked = Boolean(isESigned);

  const buildPayload = () => {
    switch (formType) {
      case 'SAVING_ACCOUNT': return {
        accountOperation: fields.accountOperation, openingAmount: fields.openingAmount,
        applicant: { occupation: fields.applicant?.occupation, email: fields.applicant?.email, address: fields.applicant?.address, pinCode: fields.applicant?.pinCode },
        nominee: { fullName: fields.nominee?.fullName, relationship: fields.nominee?.relationship, age: fields.nominee?.age, address: fields.nominee?.address },
        introducer: { fullName: fields.introducer?.fullName, accountNumber: fields.introducer?.accountNumber, occupation: fields.introducer?.occupation, mobileNumber: fields.introducer?.mobileNumber, knownDuration: fields.introducer?.knownDuration },
      };
      case 'MEMBER_FORM': return {
        memberDetails: { religion: fields.memberDetails?.religion, caste: fields.memberDetails?.caste, occupation: fields.memberDetails?.occupation, annualIncome: fields.memberDetails?.annualIncome, monthlySalary: fields.memberDetails?.monthlySalary },
        nominee: { fullName: fields.nominee?.fullName, relationship: fields.nominee?.relationship },
        witness: { name: fields.witness?.name, address: fields.witness?.address, mobile: fields.witness?.mobile },
      };
      case 'FD_RD': return {
        depositAmount: fields.depositAmount, depositAmountWords: fields.depositAmountWords,
        nominee: { name: fields.nominee?.name, relationship: fields.nominee?.relationship, age: fields.nominee?.age, address: fields.nominee?.address, specialInstructions: fields.nominee?.specialInstructions },
        witnesses: fields.witnesses,
      };
      case 'LOAN_FILE': return {
        docket: { businessNature: fields.docket?.businessNature, pigmyAgentName: fields.docket?.pigmyAgentName },
        coBorrower: { fullName: fields.coBorrower?.fullName, relationship: fields.coBorrower?.relationship, netMonthlyIncome: fields.coBorrower?.netMonthlyIncome },
        guarantor1: fields.guarantor1, guarantor2: fields.guarantor2, checklist: fields.checklist,
      };
      default: return fields;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (locked) { toast.warn('This form is permanently locked after e-signature.'); return; }
    if (!referenceId) { toast.error('Reference ID is missing. Cannot save.'); return; }
    setSubmitting(true);
    try {
      const payload = buildPayload();
      payload.formType = formType; // Explicitly inject formType so backend can filter/update correctly
      
      if (referenceId.startsWith('/api')) {
        // We received an exact API endpoint from the backend overview
        const axiosInstance = (await import('../../api/axiosConfig')).default;
        let putUrl = referenceId.replace('/api', '');
        const url = putUrl.includes('?') ? putUrl : `${putUrl}?_req=update-${formType}`;
        await axiosInstance.put(url, payload);
      } else {
        const slug = formType.toLowerCase().replace('_', '-');
        await onboardingFormsApi.updateFormData(slug, referenceId, payload);
      }
      
      toast.success(`${config.label || formType} updated successfully!`);
      onSaved?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to update form.');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs">
      <div className="bg-gray-50 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-white border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${config.color || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
              <ConfigIcon size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900">{config.label || formType}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {locked ? '🔒 E-SIGNED — Read-only. No modifications allowed.' : '📝 DRAFT — Edit fields below and save.'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* E-Sign Lock Banner */}
        {locked && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-3 flex items-center gap-3 text-sm text-emerald-900 shrink-0">
            <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
            <span><strong>Permanently Locked:</strong> This form has been e-signed and cannot be modified. Preview or download signed PDF from the overview.</span>
          </div>
        )}

        {/* Scrollable Fields */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-2">
          {formType === 'SAVING_ACCOUNT' && <SavingAccountFields data={fields} onChange={setFields} locked={locked} />}
          {formType === 'MEMBER_FORM'    && <MemberFormFields    data={fields} onChange={setFields} locked={locked} />}
          {formType === 'FD_RD'          && <FdRdFormFields      data={fields} onChange={setFields} locked={locked} />}
          {formType === 'LOAN_FILE'      && <LoanFileFormFields  data={fields} onChange={setFields} locked={locked} />}

          {/* Footer */}
          <div className="pt-5 border-t border-gray-200 flex items-center justify-between gap-3 sticky bottom-0 bg-gray-50 pb-1">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 transition-colors cursor-pointer">
              {locked ? 'Close' : 'Cancel'}
            </button>
            {!locked && (
              <button type="submit" disabled={submitting} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#225091] hover:bg-[#183d73] text-white font-bold text-xs shadow-sm transition-all disabled:opacity-60 cursor-pointer">
                {submitting ? <><Loader2 size={15} className="animate-spin" /><span>Saving...</span></> : <><Save size={15} /><span>Save Changes</span></>}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default FormEditModal;
