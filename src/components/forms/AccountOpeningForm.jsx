import React, { useState } from 'react';
import { AlertTriangle, Lock, CheckCircle2, UserCheck, ShieldCheck, FileCheck, Landmark } from 'lucide-react';

const AccountOpeningForm = ({ formData, onChange, isLocked = false }) => {
  const [data, setData] = useState({
    branch: formData?.branch || formData?.branchName || 'Yavatmal Main Branch',
    customerId: formData?.customerId || formData?.customerNo || formData?.merchantId || '',
    accountNo: formData?.accountNo || formData?.societyAccountNumber || formData?.accountNumber || '',
    date: formData?.date || new Date().toISOString().split('T')[0],
    accountOperation: formData?.accountOperation || 'Single',
    
    // 1st Applicant
    applicant1Name: formData?.applicant1Name || formData?.name || formData?.merchantName || '',
    applicant1Dob: formData?.applicant1Dob || formData?.dateOfBirth || '',
    applicant1MembershipNo: formData?.applicant1MembershipNo || formData?.membershipNo || '',
    applicant1AadharNo: formData?.applicant1AadharNo || formData?.aadhaarNumber || '',
    applicant1PanNo: formData?.applicant1PanNo || formData?.panNumber || '',
    applicant1MobileNo: formData?.applicant1MobileNo || formData?.phone || formData?.mobile || '',
    applicant1Occupation: formData?.applicant1Occupation || formData?.businessType || '',
    applicant1Email: formData?.applicant1Email || formData?.email || '',
    applicant1Address: formData?.applicant1Address || formData?.address || '',
    applicant1Pincode: formData?.applicant1Pincode || formData?.pincode || '',

    // 2nd Applicant (Joint)
    applicant2Name: formData?.applicant2Name || '',
    applicant2Dob: formData?.applicant2Dob || '',
    applicant2MembershipNo: formData?.applicant2MembershipNo || '',
    applicant2AadharNo: formData?.applicant2AadharNo || '',
    applicant2PanNo: formData?.applicant2PanNo || '',

    // Nomination Details
    nomineeName: formData?.nomineeName || formData?.nominee || '',
    nomineeAddress: formData?.nomineeAddress || '',
    nomineeRelation: formData?.nomineeRelation || '',
    nomineeAge: formData?.nomineeAge || '',
    nomineeIsMinor: formData?.nomineeIsMinor || false,
    nomineeMinorDob: formData?.nomineeMinorDob || '',

    // Introducer Details
    introducerName: formData?.introducerName || 'Sahayaone Society Admin',
    introducerAddress: formData?.introducerAddress || 'Central Branch, Yavatmal',
    introducerAccountNo: formData?.introducerAccountNo || 'SB-10001',
    introducerOccupation: formData?.introducerOccupation || 'Service',
    introducerEmail: formData?.introducerEmail || 'admin@aumulstate.com',
    introducerMobileNo: formData?.introducerMobileNo || '9876543210',

    // Minor Guardian
    guardianName: formData?.guardianName || '',
    guardianRelation: formData?.guardianRelation || '',
    guardianAddress: formData?.guardianAddress || '',

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
              <span>This Account Opening Form has been legally E-signed. All fields are permanently locked and cannot be edited or modified.</span>
            </div>
          ) : (
            <div>
              <span className="font-bold text-amber-900 text-sm block mb-0.5">
                ⚠️ PRE-SIGNATURE WARNING: EDITABLE UNTIL E-SIGNATURE ONLY
              </span>
              <span>
                Please verify all account opening, applicant, and nomination details below. You can edit and update these details <strong>only prior to E-Signature</strong>. Once the E-Signature is submitted, the form will be <strong>permanently locked</strong> and uneditable.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Official Form Header */}
      <div className="border-b-2 border-gray-900 pb-5 text-center">
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
          <span>* खाते उघडण्याचा अर्ज *</span>
          <span className="border-l border-gray-600 pl-3">Account Opening Form</span>
        </div>
      </div>

      {/* Control Info Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs bg-gray-50 p-4 rounded-xl border border-gray-200">
        <div>
          <label className="block font-bold text-gray-700 mb-1">शाखा (Branch)</label>
          <input
            type="text"
            disabled={isLocked}
            readOnly={isLocked}
            value={data.branch}
            onChange={(e) => handleChange('branch', e.target.value)}
            className={`w-full px-3 py-1.5 border rounded-lg font-medium ${
              isLocked ? 'bg-gray-100/80 text-gray-700 cursor-not-allowed' : 'bg-white'
            }`}
          />
        </div>

        <div>
          <label className="block font-bold text-gray-700 mb-1">ग्राहक क्रमांक (Customer ID)</label>
          <input
            type="text"
            disabled={isLocked}
            readOnly={isLocked}
            value={data.customerId}
            onChange={(e) => handleChange('customerId', e.target.value)}
            className={`w-full px-3 py-1.5 border rounded-lg font-mono font-bold text-gray-900 ${
              isLocked ? 'bg-gray-100/80 text-gray-700 cursor-not-allowed' : 'bg-white'
            }`}
          />
        </div>

        <div>
          <label className="block font-bold text-gray-700 mb-1">खाते क्र. (Account No.)</label>
          <input
            type="text"
            disabled={isLocked}
            readOnly={isLocked}
            value={data.accountNo}
            onChange={(e) => handleChange('accountNo', e.target.value)}
            className={`w-full px-3 py-1.5 border rounded-lg font-mono font-bold text-emerald-700 ${
              isLocked ? 'bg-gray-100/80 cursor-not-allowed' : 'bg-white'
            }`}
          />
        </div>

        <div>
          <label className="block font-bold text-gray-700 mb-1">दिनांक (Date)</label>
          <input
            type="date"
            disabled={isLocked}
            readOnly={isLocked}
            value={data.date}
            onChange={(e) => handleChange('date', e.target.value)}
            className={`w-full px-3 py-1.5 border rounded-lg font-medium ${
              isLocked ? 'bg-gray-100/80 text-gray-700 cursor-not-allowed' : 'bg-white'
            }`}
          />
        </div>
      </div>

      {/* Account Operation Mode */}
      <div className="space-y-2 text-xs">
        <label className="block font-bold text-gray-900">खाते वापराविषयी सूचना (Account Operation Mode)</label>
        <div className="flex flex-wrap gap-4 pt-1">
          {['Single', 'Joint', 'Either or Survivor'].map((mode) => (
            <label key={mode} className="inline-flex items-center gap-2 cursor-pointer font-medium text-gray-800">
              <input
                type="radio"
                name="accountOperation"
                disabled={isLocked}
                checked={data.accountOperation === mode}
                onChange={() => handleChange('accountOperation', mode)}
                className="w-4 h-4 text-[#225091] focus:ring-[#225091]"
              />
              <span>{mode}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 1st Applicant Section */}
      <div className="space-y-3 text-xs pt-2">
        <h4 className="font-bold text-gray-900 uppercase tracking-wider text-[11px] bg-blue-50/80 p-2 rounded-lg text-[#225091] border border-blue-100">
          पहिल्या अर्जदाराचे नाव (1st Applicant Details)
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-8 space-y-1">
            <label className="block font-bold text-gray-800">श्री / श्रीमती (Full Name)</label>
            <input
              type="text"
              disabled={isLocked}
              readOnly={isLocked}
              value={data.applicant1Name}
              onChange={(e) => handleChange('applicant1Name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-xl font-medium ${
                isLocked ? 'bg-gray-100/80 text-gray-700 cursor-not-allowed' : 'bg-white'
              }`}
            />
          </div>

          <div className="md:col-span-4 space-y-1">
            <label className="block font-bold text-gray-800">जन्म दिनांक (Date of Birth)</label>
            <input
              type="date"
              disabled={isLocked}
              readOnly={isLocked}
              value={data.applicant1Dob}
              onChange={(e) => handleChange('applicant1Dob', e.target.value)}
              className={`w-full px-3 py-2 border rounded-xl font-medium ${
                isLocked ? 'bg-gray-100/80 text-gray-700 cursor-not-allowed' : 'bg-white'
              }`}
            />
          </div>

          <div className="md:col-span-4 space-y-1">
            <label className="block font-bold text-gray-800">सभासद क्रमांक (Membership No)</label>
            <input
              type="text"
              disabled={isLocked}
              readOnly={isLocked}
              value={data.applicant1MembershipNo}
              onChange={(e) => handleChange('applicant1MembershipNo', e.target.value)}
              className={`w-full px-3 py-2 border rounded-xl font-mono ${
                isLocked ? 'bg-gray-100/80 text-gray-700 cursor-not-allowed' : 'bg-white'
              }`}
            />
          </div>

          <div className="md:col-span-4 space-y-1">
            <label className="block font-bold text-gray-800">आधार कार्ड क्र. (Aadhaar No)</label>
            <input
              type="text"
              disabled={isLocked}
              readOnly={isLocked}
              value={data.applicant1AadharNo}
              onChange={(e) => handleChange('applicant1AadharNo', e.target.value)}
              className={`w-full px-3 py-2 border rounded-xl font-mono ${
                isLocked ? 'bg-gray-100/80 text-gray-700 cursor-not-allowed' : 'bg-white'
              }`}
            />
          </div>

          <div className="md:col-span-4 space-y-1">
            <label className="block font-bold text-gray-800">पॅन कार्ड नं. (PAN No)</label>
            <input
              type="text"
              disabled={isLocked}
              readOnly={isLocked}
              value={data.applicant1PanNo}
              onChange={(e) => handleChange('applicant1PanNo', e.target.value)}
              className={`w-full px-3 py-2 border rounded-xl font-mono uppercase ${
                isLocked ? 'bg-gray-100/80 text-gray-700 cursor-not-allowed' : 'bg-white'
              }`}
            />
          </div>

          <div className="md:col-span-4 space-y-1">
            <label className="block font-bold text-gray-800">मोबाईल क्र. (Mobile No)</label>
            <input
              type="text"
              disabled={isLocked}
              readOnly={isLocked}
              value={data.applicant1MobileNo}
              onChange={(e) => handleChange('applicant1MobileNo', e.target.value)}
              className={`w-full px-3 py-2 border rounded-xl font-mono ${
                isLocked ? 'bg-gray-100/80 text-gray-700 cursor-not-allowed' : 'bg-white'
              }`}
            />
          </div>

          <div className="md:col-span-4 space-y-1">
            <label className="block font-bold text-gray-800">व्यवसाय (Occupation)</label>
            <input
              type="text"
              disabled={isLocked}
              readOnly={isLocked}
              value={data.applicant1Occupation}
              onChange={(e) => handleChange('applicant1Occupation', e.target.value)}
              className={`w-full px-3 py-2 border rounded-xl font-medium ${
                isLocked ? 'bg-gray-100/80 text-gray-700 cursor-not-allowed' : 'bg-white'
              }`}
            />
          </div>

          <div className="md:col-span-4 space-y-1">
            <label className="block font-bold text-gray-800">ई-मेल (E-mail)</label>
            <input
              type="email"
              disabled={isLocked}
              readOnly={isLocked}
              value={data.applicant1Email}
              onChange={(e) => handleChange('applicant1Email', e.target.value)}
              className={`w-full px-3 py-2 border rounded-xl font-medium ${
                isLocked ? 'bg-gray-100/80 text-gray-700 cursor-not-allowed' : 'bg-white'
              }`}
            />
          </div>

          <div className="md:col-span-9 space-y-1">
            <label className="block font-bold text-gray-800">संपूर्ण पत्ता (Full Address)</label>
            <input
              type="text"
              disabled={isLocked}
              readOnly={isLocked}
              value={data.applicant1Address}
              onChange={(e) => handleChange('applicant1Address', e.target.value)}
              className={`w-full px-3 py-2 border rounded-xl font-medium ${
                isLocked ? 'bg-gray-100/80 text-gray-700 cursor-not-allowed' : 'bg-white'
              }`}
            />
          </div>

          <div className="md:col-span-3 space-y-1">
            <label className="block font-bold text-gray-800">पिनकोड (Pin Code)</label>
            <input
              type="text"
              disabled={isLocked}
              readOnly={isLocked}
              value={data.applicant1Pincode}
              onChange={(e) => handleChange('applicant1Pincode', e.target.value)}
              className={`w-full px-3 py-2 border rounded-xl font-mono ${
                isLocked ? 'bg-gray-100/80 text-gray-700 cursor-not-allowed' : 'bg-white'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Nomination Details (*Zm‘m§H$Z*) */}
      <div className="space-y-3 text-xs pt-3 border-t border-gray-200">
        <h4 className="font-bold text-gray-900 uppercase tracking-wider text-[11px] bg-gray-100 p-2 rounded-lg text-gray-800">
          नामांकन / Nomination Details
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-8 space-y-1">
            <label className="block font-bold text-gray-800">नामनिर्देशन दिलेल्या व्यक्तीचे नाव व पत्ता (Nominee Name & Address)</label>
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

          <div className="md:col-span-4 space-y-1">
            <label className="block font-bold text-gray-800">ठेवीदारासोबतचे नाते (Relationship with Depositor)</label>
            <input
              type="text"
              disabled={isLocked}
              readOnly={isLocked}
              value={data.nomineeRelation}
              onChange={(e) => handleChange('nomineeRelation', e.target.value)}
              className={`w-full px-3 py-2 border rounded-xl font-medium ${
                isLocked ? 'bg-gray-100/80 text-gray-700 cursor-not-allowed' : 'bg-white'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Introducer Details (*n[aM¶H$Ë¶m©Mm Vnerb*) */}
      <div className="space-y-3 text-xs pt-3 border-t border-gray-200">
        <h4 className="font-bold text-gray-900 uppercase tracking-wider text-[11px] bg-gray-100 p-2 rounded-lg text-gray-800">
          परिचयकर्त्यांचा तपशील / Introducer Details
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block font-bold text-gray-700 mb-1">परिचयकर्त्याचे नाव (Introducer Name)</label>
            <input
              type="text"
              disabled={isLocked}
              readOnly={isLocked}
              value={data.introducerName}
              onChange={(e) => handleChange('introducerName', e.target.value)}
              className={`w-full px-3 py-1.5 border rounded-lg font-medium ${
                isLocked ? 'bg-gray-100/80 text-gray-700 cursor-not-allowed' : 'bg-white'
              }`}
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">खाते क्र. (Introducer Account No)</label>
            <input
              type="text"
              disabled={isLocked}
              readOnly={isLocked}
              value={data.introducerAccountNo}
              onChange={(e) => handleChange('introducerAccountNo', e.target.value)}
              className={`w-full px-3 py-1.5 border rounded-lg font-mono ${
                isLocked ? 'bg-gray-100/80 text-gray-700 cursor-not-allowed' : 'bg-white'
              }`}
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">मोबाईल क्र. (Mobile No)</label>
            <input
              type="text"
              disabled={isLocked}
              readOnly={isLocked}
              value={data.introducerMobileNo}
              onChange={(e) => handleChange('introducerMobileNo', e.target.value)}
              className={`w-full px-3 py-1.5 border rounded-lg font-mono ${
                isLocked ? 'bg-gray-100/80 text-gray-700 cursor-not-allowed' : 'bg-white'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Official Signatures Box */}
      <div className="pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center text-xs text-gray-500">
          <div className="border-t border-gray-300 pt-2 font-semibold">Cashier / Clerk Signature</div>
          <div className="border-t border-gray-300 pt-2 font-semibold">Introducer Signature</div>
          <div className="border-t border-gray-300 pt-2 font-semibold">Branch Manager Signature</div>
        </div>
      </div>
    </div>
  );
};

export default AccountOpeningForm;
