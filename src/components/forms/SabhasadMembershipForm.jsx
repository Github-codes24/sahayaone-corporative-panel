import React, { useState } from 'react';
import { AlertTriangle, Lock, CheckCircle2, User, FileText, Calendar, Building, CreditCard } from 'lucide-react';

const SabhasadMembershipForm = ({ formData, onChange, isLocked = false, onSaveDraft }) => {
  const [data, setData] = useState({
    membershipNo: formData?.membershipNo || formData?.sabhasadKramank || '',
    applicantName: formData?.applicantName || formData?.name || formData?.merchantName || '',
    address: formData?.address || formData?.fullAddress || '',
    shareAmount: formData?.shareAmount || '100',
    entranceFee: formData?.entranceFee || '10',
    totalAmount: formData?.totalAmount || '110',
    dob: formData?.dob || formData?.dateOfBirth || '',
    age: formData?.age || '',
    religion: formData?.religion || 'Hindu',
    caste: formData?.caste || '',
    occupation: formData?.occupation || formData?.businessType || '',
    annualIncome: formData?.annualIncome || formData?.turnover || '',
    salary: formData?.salary || '',
    nomineeName: formData?.nomineeName || formData?.nominee || '',
    nomineeRelation: formData?.nomineeRelation || '',
    mobileNo: formData?.mobileNo || formData?.phone || formData?.mobile || '',
    aadharNo: formData?.aadharNo || formData?.aadhaarNumber || '',
    panNo: formData?.panNo || formData?.panNumber || '',
    witnessName: formData?.witnessName || '',
    meetingDate: formData?.meetingDate || new Date().toISOString().split('T')[0],
    resolutionNo: formData?.resolutionNo || '3',
    boardDecision: formData?.boardDecision || 'APPROVED',
    specimen1Url: formData?.specimen1Url || null,
    specimen2Url: formData?.specimen2Url || null,
    specimen3Url: formData?.specimen3Url || null,
    ...formData
  });

  const handleChange = (field, value) => {
    if (isLocked) return;
    const updated = { ...data, [field]: value };
    setData(updated);
    if (onChange) onChange(updated);
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-gray-200 shadow-xs p-6 md:p-8 space-y-6">
      {/* 1. Mandatory Pre-Signature Warning Banner */}
      <div className={`p-4 rounded-2xl border flex items-start gap-3.5 transition-all ${
        isLocked 
          ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
          : 'bg-amber-50/90 border-amber-300/80 text-amber-900 shadow-2xs'
      }`}>
        {isLocked ? (
          <Lock className="text-emerald-600 shrink-0 mt-0.5" size={20} />
        ) : (
          <AlertTriangle className="text-amber-600 shrink-0 mt-0.5 animate-pulse" size={20} />
        )}
        <div className="flex-1 text-xs leading-relaxed">
          {isLocked ? (
            <div>
              <span className="font-bold text-emerald-800 text-sm block mb-0.5">
                🔒 PERMANENTLY LOCKED & E-SIGNED
              </span>
              <span>This Sabhasad Membership Application Form has been legally E-signed. All fields are permanently locked and cannot be edited or modified.</span>
            </div>
          ) : (
            <div>
              <span className="font-bold text-amber-900 text-sm block mb-0.5">
                ⚠️ PRE-SIGNATURE WARNING: EDITABLE UNTIL E-SIGNATURE ONLY
              </span>
              <span>
                Please carefully verify all membership application fields below. You can edit and update these details <strong>only prior to E-Signature</strong>. Once the E-Signature is submitted, the form will be <strong>permanently locked</strong> and uneditable.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Official Form Header */}
      <div className="border-b-2 border-gray-900 pb-5 text-center relative">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-2">
          <div className="text-left">
            <h2 className="text-xl font-black text-gray-900 tracking-tight">अद्विता अर्बन</h2>
            <p className="text-xs font-bold text-gray-700">मल्टीस्टेट क्रेडिट को-ऑपरेटिव्ह सोसायटी लि.</p>
            <p className="text-[10px] text-gray-500 font-mono">Reg.No.: MSCS/CR/1669/2026</p>
          </div>
          <div className="text-right text-[11px] text-gray-600 leading-tight">
            <p className="font-bold text-gray-800">मुख्य शाखा: राठी कॉम्प्लेक्स, यवतमाळ (महा.) ४४५१०३</p>
            <p>Ph: 07234-266499 | Email: aumulstate@gmail.com</p>
          </div>
        </div>

        <div className="mt-4 inline-flex items-center justify-center gap-3 px-6 py-1.5 bg-gray-900 text-white rounded-full text-xs font-bold uppercase tracking-wider">
          <span>* सभासदाकरिता अर्ज *</span>
          <span className="border-l border-gray-600 pl-3">Membership Application Form</span>
        </div>

        {/* Sabhasad Kramank / Membership No */}
        <div className="absolute top-0 right-0 hidden md:flex flex-col items-end">
          <span className="text-[11px] font-bold text-gray-600 mb-1">सभासद क्रमांक (Membership No.)</span>
          <input
            type="text"
            disabled={isLocked}
            readOnly={isLocked}
            value={data.membershipNo}
            onChange={(e) => handleChange('membershipNo', e.target.value)}
            placeholder="MEM-000000"
            className={`w-36 text-center font-mono font-bold text-sm px-3 py-1 border border-gray-300 rounded-lg ${
              isLocked ? 'bg-gray-100/90 text-gray-700 cursor-not-allowed' : 'bg-white text-gray-900'
            }`}
          />
        </div>
      </div>

      {/* Form Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
        
        {/* Applicant Name */}
        <div className="md:col-span-8 space-y-1">
          <label className="block font-bold text-gray-800">
            मी (Applicant Full Name) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            disabled={isLocked}
            readOnly={isLocked}
            value={data.applicantName}
            onChange={(e) => handleChange('applicantName', e.target.value)}
            placeholder="Enter applicant full name..."
            className={`w-full px-3 py-2 border rounded-xl font-medium ${
              isLocked ? 'bg-gray-100/80 text-gray-700 cursor-not-allowed' : 'bg-white focus:border-[#225091]'
            }`}
          />
        </div>

        {/* Membership No for small screens */}
        <div className="md:hidden md:col-span-4 space-y-1">
          <label className="block font-bold text-gray-800">सभासद क्रमांक</label>
          <input
            type="text"
            disabled={isLocked}
            readOnly={isLocked}
            value={data.membershipNo}
            onChange={(e) => handleChange('membershipNo', e.target.value)}
            className={`w-full px-3 py-2 border rounded-xl font-mono ${
              isLocked ? 'bg-gray-100/80 text-gray-700 cursor-not-allowed' : 'bg-white'
            }`}
          />
        </div>

        {/* Address */}
        <div className="md:col-span-12 space-y-1">
          <label className="block font-bold text-gray-800">
            राहणार (Full Permanent Address) <span className="text-red-500">*</span>
          </label>
          <textarea
            rows="2"
            disabled={isLocked}
            readOnly={isLocked}
            value={data.address}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder="Enter complete residential address..."
            className={`w-full p-3 border rounded-xl font-medium ${
              isLocked ? 'bg-gray-100/80 text-gray-700 cursor-not-allowed' : 'bg-white focus:border-[#225091]'
            }`}
          />
        </div>

        {/* Shares & Entrance Fee */}
        <div className="md:col-span-4 space-y-1">
          <label className="block font-bold text-gray-800">संस्थेचे हिस्से (Share Amount ₹)</label>
          <input
            type="number"
            disabled={isLocked}
            readOnly={isLocked}
            value={data.shareAmount}
            onChange={(e) => handleChange('shareAmount', e.target.value)}
            className={`w-full px-3 py-2 border rounded-xl font-mono ${
              isLocked ? 'bg-gray-100/80 text-gray-700 cursor-not-allowed' : 'bg-white'
            }`}
          />
        </div>

        <div className="md:col-span-4 space-y-1">
          <label className="block font-bold text-gray-800">प्रवेश फी (Entrance Fee ₹)</label>
          <input
            type="number"
            disabled={isLocked}
            readOnly={isLocked}
            value={data.entranceFee}
            onChange={(e) => handleChange('entranceFee', e.target.value)}
            className={`w-full px-3 py-2 border rounded-xl font-mono ${
              isLocked ? 'bg-gray-100/80 text-gray-700 cursor-not-allowed' : 'bg-white'
            }`}
          />
        </div>

        <div className="md:col-span-4 space-y-1">
          <label className="block font-bold text-gray-800">एकूण रुपये (Total Amount ₹)</label>
          <input
            type="number"
            disabled={isLocked}
            readOnly={isLocked}
            value={data.totalAmount}
            onChange={(e) => handleChange('totalAmount', e.target.value)}
            className={`w-full px-3 py-2 border rounded-xl font-mono font-bold text-emerald-700 ${
              isLocked ? 'bg-gray-100/80 cursor-not-allowed' : 'bg-white'
            }`}
          />
        </div>

        {/* DOB & Age */}
        <div className="md:col-span-3 space-y-1">
          <label className="block font-bold text-gray-800">जन्म तारीख (Date of Birth)</label>
          <input
            type="date"
            disabled={isLocked}
            readOnly={isLocked}
            value={data.dob}
            onChange={(e) => handleChange('dob', e.target.value)}
            className={`w-full px-3 py-2 border rounded-xl font-medium ${
              isLocked ? 'bg-gray-100/80 text-gray-700 cursor-not-allowed' : 'bg-white'
            }`}
          />
        </div>

        <div className="md:col-span-3 space-y-1">
          <label className="block font-bold text-gray-800">वय (Age)</label>
          <input
            type="text"
            disabled={isLocked}
            readOnly={isLocked}
            value={data.age}
            onChange={(e) => handleChange('age', e.target.value)}
            placeholder="e.g. 32"
            className={`w-full px-3 py-2 border rounded-xl font-medium ${
              isLocked ? 'bg-gray-100/80 text-gray-700 cursor-not-allowed' : 'bg-white'
            }`}
          />
        </div>

        <div className="md:col-span-3 space-y-1">
          <label className="block font-bold text-gray-800">धर्म (Religion)</label>
          <input
            type="text"
            disabled={isLocked}
            readOnly={isLocked}
            value={data.religion}
            onChange={(e) => handleChange('religion', e.target.value)}
            className={`w-full px-3 py-2 border rounded-xl font-medium ${
              isLocked ? 'bg-gray-100/80 text-gray-700 cursor-not-allowed' : 'bg-white'
            }`}
          />
        </div>

        <div className="md:col-span-3 space-y-1">
          <label className="block font-bold text-gray-800">जात (Caste)</label>
          <input
            type="text"
            disabled={isLocked}
            readOnly={isLocked}
            value={data.caste}
            onChange={(e) => handleChange('caste', e.target.value)}
            className={`w-full px-3 py-2 border rounded-xl font-medium ${
              isLocked ? 'bg-gray-100/80 text-gray-700 cursor-not-allowed' : 'bg-white'
            }`}
          />
        </div>

        {/* Occupation, Income & Salary */}
        <div className="md:col-span-4 space-y-1">
          <label className="block font-bold text-gray-800">व्यवसाय (Occupation)</label>
          <input
            type="text"
            disabled={isLocked}
            readOnly={isLocked}
            value={data.occupation}
            onChange={(e) => handleChange('occupation', e.target.value)}
            className={`w-full px-3 py-2 border rounded-xl font-medium ${
              isLocked ? 'bg-gray-100/80 text-gray-700 cursor-not-allowed' : 'bg-white'
            }`}
          />
        </div>

        <div className="md:col-span-4 space-y-1">
          <label className="block font-bold text-gray-800">वार्षिक उत्पन्न (Annual Income ₹)</label>
          <input
            type="text"
            disabled={isLocked}
            readOnly={isLocked}
            value={data.annualIncome}
            onChange={(e) => handleChange('annualIncome', e.target.value)}
            className={`w-full px-3 py-2 border rounded-xl font-medium ${
              isLocked ? 'bg-gray-100/80 text-gray-700 cursor-not-allowed' : 'bg-white'
            }`}
          />
        </div>

        <div className="md:col-span-4 space-y-1">
          <label className="block font-bold text-gray-800">पगार रुपये (Monthly Salary ₹)</label>
          <input
            type="text"
            disabled={isLocked}
            readOnly={isLocked}
            value={data.salary}
            onChange={(e) => handleChange('salary', e.target.value)}
            className={`w-full px-3 py-2 border rounded-xl font-medium ${
              isLocked ? 'bg-gray-100/80 text-gray-700 cursor-not-allowed' : 'bg-white'
            }`}
          />
        </div>

        {/* Nominee Details */}
        <div className="md:col-span-8 space-y-1 pt-2">
          <label className="block font-bold text-gray-800">वारसदार नाव (Nominee Name for Death Claim)</label>
          <input
            type="text"
            disabled={isLocked}
            readOnly={isLocked}
            value={data.nomineeName}
            onChange={(e) => handleChange('nomineeName', e.target.value)}
            className={`w-full px-3 py-2 border rounded-xl font-medium ${
              isLocked ? 'bg-gray-100/80 text-gray-700 cursor-not-allowed' : 'bg-white'
            }`}
          />
        </div>

        <div className="md:col-span-4 space-y-1 pt-2">
          <label className="block font-bold text-gray-800">नाते (Relationship)</label>
          <input
            type="text"
            disabled={isLocked}
            readOnly={isLocked}
            value={data.nomineeRelation}
            onChange={(e) => handleChange('nomineeRelation', e.target.value)}
            placeholder="e.g. Spouse / Son"
            className={`w-full px-3 py-2 border rounded-xl font-medium ${
              isLocked ? 'bg-gray-100/80 text-gray-700 cursor-not-allowed' : 'bg-white'
            }`}
          />
        </div>

        {/* Mobile, Aadhaar & PAN */}
        <div className="md:col-span-4 space-y-1">
          <label className="block font-bold text-gray-800">मोबाईल नं. (Mobile No.)</label>
          <input
            type="text"
            disabled={isLocked}
            readOnly={isLocked}
            value={data.mobileNo}
            onChange={(e) => handleChange('mobileNo', e.target.value)}
            className={`w-full px-3 py-2 border rounded-xl font-mono ${
              isLocked ? 'bg-gray-100/80 text-gray-700 cursor-not-allowed' : 'bg-white'
            }`}
          />
        </div>

        <div className="md:col-span-4 space-y-1">
          <label className="block font-bold text-gray-800">आधार नं. (Aadhaar Card No.)</label>
          <input
            type="text"
            disabled={isLocked}
            readOnly={isLocked}
            value={data.aadharNo}
            onChange={(e) => handleChange('aadharNo', e.target.value)}
            className={`w-full px-3 py-2 border rounded-xl font-mono ${
              isLocked ? 'bg-gray-100/80 text-gray-700 cursor-not-allowed' : 'bg-white'
            }`}
          />
        </div>

        <div className="md:col-span-4 space-y-1">
          <label className="block font-bold text-gray-800">पॅन नं. (PAN Card No.)</label>
          <input
            type="text"
            disabled={isLocked}
            readOnly={isLocked}
            value={data.panNo}
            onChange={(e) => handleChange('panNo', e.target.value)}
            className={`w-full px-3 py-2 border rounded-xl font-mono uppercase ${
              isLocked ? 'bg-gray-100/80 text-gray-700 cursor-not-allowed' : 'bg-white'
            }`}
          />
        </div>
      </div>

      {/* Specimen Signatures Box Section */}
      <div className="pt-4 border-t border-gray-200">
        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">
          नमुनाची स्वाक्षरी (Specimen Signatures)
        </h4>
        <div className="grid grid-cols-3 gap-4 text-center">
          {[1, 2, 3].map((num) => (
            <div key={num} className="border-2 border-dashed border-gray-300 rounded-xl p-3 bg-gray-50/50 flex flex-col items-center justify-center min-h-[90px]">
              <span className="text-[11px] font-bold text-gray-500 mb-1">{num}). स्वाक्षरी (Sig {num})</span>
              {data[`specimen${num}Url`] ? (
                <img src={data[`specimen${num}Url`]} alt={`Specimen ${num}`} className="max-h-12 object-contain" />
              ) : (
                <span className="text-[10px] text-gray-400 italic">Specimen Box</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Board Committee Approval Section */}
      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-xs space-y-3">
        <h4 className="font-bold text-gray-900 border-b border-gray-200 pb-1.5">
          कार्यकारी मंडळाचा निर्णय (Executive Board Resolution Section)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <span className="text-gray-600 block">सभेत दिनांक (Meeting Date):</span>
            <span className="font-semibold text-gray-900">{data.meetingDate}</span>
          </div>
          <div>
            <span className="text-gray-600 block">ठराव क्रमांक (Resolution No.):</span>
            <span className="font-semibold text-gray-900">ठराव क्र. {data.resolutionNo}</span>
          </div>
          <div>
            <span className="text-gray-600 block">निर्णय (Decision):</span>
            <span className="font-bold text-emerald-700">{data.boardDecision}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SabhasadMembershipForm;
