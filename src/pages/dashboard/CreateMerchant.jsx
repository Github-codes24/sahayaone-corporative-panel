import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2, X, AlertCircle, Phone, Lock,
  UserCheck, Building2, UploadCloud, Eye, EyeOff, Loader2, ShieldCheck,
  User, ExternalLink
} from 'lucide-react';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import { merchantService } from '../../api/merchantService';
import { branchService } from '../../api/branchService';
import useAuthStore from '../../store/authStore';
import useBranchStore from '../../store/branchStore';
import {
  validatePhone,
  validateAadhaar,
  validatePAN,
  validateGSTIN,
  validatePassword,
  sanitizeDigits,
  sanitizePAN,
  sanitizeGSTIN
} from '../../utils/validation';

// ─── STEP NAME CONSTANTS ──────────────────────────────────────────────────────
const STEP_MOBILE   = 'mobile-lookup';
const STEP_OTP      = 'verify-otp';
const STEP_DIGI     = 'digilocker-kyc';
const STEP_CUSTOMER = 'customer-details';
const STEP_SHOP     = 'shop-details';

const ALL_STEPS = [STEP_MOBILE, STEP_OTP, STEP_DIGI, STEP_CUSTOMER, STEP_SHOP];

const stepIndex = (name) => {
  const i = ALL_STEPS.indexOf(name);
  return i !== -1 ? i + 1 : 1;
};
const stepName = (index) => ALL_STEPS[index - 1] || ALL_STEPS[0];

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────
const FileUploadField = ({ label, id, name, onChange, onRemove, selectedFile, error }) => (
  <div className="flex flex-col gap-2">
    {label && <label className="text-[14px] font-semibold text-gray-700">{label}</label>}
    <div className={`relative flex items-center justify-center w-full h-24 border-2 border-dashed rounded-xl transition-colors cursor-pointer group ${
      error ? 'border-rose-400 bg-rose-50/30' :
      selectedFile ? 'border-[#225091] bg-teal-50 hover:bg-teal-100' :
      'border-gray-300 bg-gray-50 hover:bg-gray-100'
    }`}>
      <input
        type="file" id={id} name={name}
        onChange={(e) => { if (e.target.files?.[0]) onChange(name, e.target.files[0]); }}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        accept="image/*,.pdf"
      />
      {selectedFile ? (
        <div className="flex flex-col items-center gap-1 text-[#225091] px-2 text-center w-full">
          <CheckCircle2 size={24} className="text-[#32c965]" />
          <span className="text-xs font-medium text-gray-700 truncate w-full px-2">{selectedFile.name}</span>
          <span className="text-[10px] text-gray-500">Click to change</span>
          {onRemove && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(name); }}
              className="absolute top-1.5 right-1.5 z-20 p-1 bg-white rounded-full shadow hover:bg-rose-50 text-gray-400 hover:text-rose-500 transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1 text-gray-500 group-hover:text-[#225091] transition-colors">
          <UploadCloud size={24} />
          <span className="text-xs font-medium">Click to upload (PDF/Image)</span>
          <span className="text-[10px] text-gray-400">Max 5MB</span>
        </div>
      )}
    </div>
    {error && <p className="flex items-center gap-1 text-xs text-rose-500 font-medium mt-0.5"><AlertCircle size={13} /> {error}</p>}
  </div>
);

const ReadOnlyField = ({ label, value }) => (
  <div className="py-3 px-4 border-b border-gray-100 last:border-0">
    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
    <p className="text-[15px] font-semibold text-gray-800">{value || '—'}</p>
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const CreateMerchant = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const autoVerifyRan = useRef(false);
  
  const role = useAuthStore((state) => state.role);
  const user = useAuthStore((state) => state.user);
  const globalBranchId = useBranchStore((state) => state.globalBranchId);
  const isAdmin = ['BANK_OWNER', 'BANK_ADMIN', 'SOCIETY_ADMIN', 'HO_ADMIN'].includes(role);

  // ── Persisted State (sessionStorage) ────────────────────────────────────────
  // Check if there is an active wizard session in URL or returning from DigiLocker
  const isOngoingFlow = !!(searchParams.get('refid') || (searchParams.get('step') && searchParams.get('step') !== STEP_MOBILE));

  const [otpSent, setOtpSent]           = useState(() => isOngoingFlow && sessionStorage.getItem('merchant_otpSent') === 'true');
  const [kycValid, setKycValid]         = useState(() => isOngoingFlow && sessionStorage.getItem('merchant_kycValid') === 'true');
  const [step4Done, setStep4Done]       = useState(() => isOngoingFlow && sessionStorage.getItem('merchant_step4Done') === 'true');
  const [termsAccepted, setTermsAccepted] = useState(() => isOngoingFlow && sessionStorage.getItem('merchant_termsAccepted') === 'true');
  const [customerId, setCustomerId]     = useState(() => isOngoingFlow ? (sessionStorage.getItem('merchant_customerId') || null) : null);
  const [onboardedCustomer, setOnboardedCustomer] = useState(() => {
    if (!isOngoingFlow) return null;
    try { return JSON.parse(sessionStorage.getItem('merchant_onboardedCustomer')) || null; } catch { return null; }
  });

  const [phoneNumber, setPhoneNumber]   = useState(() => isOngoingFlow ? (sessionStorage.getItem('merchant_phoneNumber') || '') : '');
  const [otp, setOtp]                   = useState('');
  const [customerProfile, setCustomerProfile] = useState(() => {
    if (!isOngoingFlow) return null;
    try { return JSON.parse(sessionStorage.getItem('merchant_customerProfile')) || null; } catch { return null; }
  });
  const [digiAadhaar, setDigiAadhaar]   = useState(() => isOngoingFlow ? (sessionStorage.getItem('merchant_digiAadhaar') || '') : '');
  const [digiPan, setDigiPan]           = useState(() => isOngoingFlow ? (sessionStorage.getItem('merchant_digiPan') || '') : '');
  const [digiRefId, setDigiRefId]       = useState(() => isOngoingFlow ? (sessionStorage.getItem('merchant_digiRefId') || null) : null);
  const [digilockerData, setDigilockerData] = useState(() => {
    if (!isOngoingFlow) return null;
    try { return JSON.parse(sessionStorage.getItem('merchant_digilockerData')) || null; } catch { return null; }
  });
  const [formData, setFormData]         = useState(() => {
    if (isOngoingFlow) {
      try {
        const saved = sessionStorage.getItem('merchant_formData');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {
      fullName: '', dob: '', address: '', gender: '',
      shopName: '', secondaryNumber: '', email: '', shopAddress: '', businessProofType: '', businessProofNumber: '', password: '', branchId: '', residentialPincode: ''
    };
  });
  const [files, setFiles] = useState({
    businessProofPhoto: null, shopPhoto: null,
    panImage: null, aadhaarImage: null, livePhoto: null
  });

  // ── UI State ─────────────────────────────────────────────────────────────────
  const [loading, setLoading]     = useState(false);
  const [errors, setErrors]       = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [branches, setBranches]   = useState([]);
  const [previewImage, setPreviewImage] = useState(null);

  // ── Step Logic ────────────────────────────────────────────────────────────────
  /**
   * Returns the highest step the user is ALLOWED to be on, given session data or immediate overrides.
   * Passing overrides prevents stale React closure issues during immediate state transitions.
   */
  const getHighestAllowed = (overrides = {}) => {
    const sOtpSent         = overrides.otpSent         !== undefined ? overrides.otpSent         : otpSent;
    const sCustomerProfile = overrides.customerProfile !== undefined ? overrides.customerProfile : customerProfile;
    const sKycValid        = overrides.kycValid        !== undefined ? overrides.kycValid        : kycValid;
    const sDigilockerData  = overrides.digilockerData  !== undefined ? overrides.digilockerData  : digilockerData;
    const sStep4Done       = overrides.step4Done       !== undefined ? overrides.step4Done       : step4Done;
    const sCustomerId      = overrides.customerId      !== undefined ? overrides.customerId      : customerId;

    if (!sOtpSent)                              return stepIndex(STEP_MOBILE);
    if (!sCustomerProfile)                      return stepIndex(STEP_OTP);
    if (sKycValid)                              return stepIndex(STEP_SHOP);      // Scenario A: already has customer, skip 3 & 4
    if (!sDigilockerData)                       return stepIndex(STEP_DIGI);      // Scenario B/C: need DigiLocker first
    if (!sStep4Done || !sCustomerId)             return stepIndex(STEP_CUSTOMER);  // must complete customer onboarding API
    return stepIndex(STEP_SHOP);
  };

  const [currentStep, setCurrentStep] = useState(() => {
    const urlStep = stepIndex(searchParams.get('step'));
    return Math.min(urlStep, 1); // start at 1, useEffect will correct it
  });

  // Sync URL ↔ currentStep with guard
  useEffect(() => {
    const urlName  = searchParams.get('step');
    let   urlStep  = stepIndex(urlName);
    const highest  = getHighestAllowed();

    if (urlStep > highest) {
      urlStep = highest;
      setSearchParams({ step: stepName(urlStep) }, { replace: true });
    } else if (!urlName || urlName !== stepName(urlStep)) {
      setSearchParams({ step: stepName(urlStep) }, { replace: true });
    }

    setCurrentStep(urlStep);
  }, [searchParams, otpSent, customerProfile, kycValid, digilockerData, step4Done, customerId]);

  const goTo = (target, overrides = {}) => {
    const highest = getHighestAllowed(overrides);
    const allowed = Math.min(target, highest);
    setSearchParams({ step: stepName(allowed) });
  };

  // ── Persist to sessionStorage ────────────────────────────────────────────────
  useEffect(() => {
    sessionStorage.setItem('merchant_phoneNumber',      phoneNumber);
    sessionStorage.setItem('merchant_otpSent',          String(otpSent));
    sessionStorage.setItem('merchant_kycValid',         String(kycValid));
    sessionStorage.setItem('merchant_step4Done',        String(step4Done));
    sessionStorage.setItem('merchant_termsAccepted',    String(termsAccepted));
    sessionStorage.setItem('merchant_customerProfile',  JSON.stringify(customerProfile));
    sessionStorage.setItem('merchant_digiAadhaar',      digiAadhaar);
    sessionStorage.setItem('merchant_digiPan',          digiPan);
    sessionStorage.setItem('merchant_digilockerData',   JSON.stringify(digilockerData));
    sessionStorage.setItem('merchant_formData',         JSON.stringify(formData));
    if (digiRefId)          sessionStorage.setItem('merchant_digiRefId',          digiRefId);
    if (customerId)         sessionStorage.setItem('merchant_customerId',         customerId);
    if (onboardedCustomer)  sessionStorage.setItem('merchant_onboardedCustomer',  JSON.stringify(onboardedCustomer));
  }, [phoneNumber, otpSent, kycValid, step4Done, termsAccepted, customerProfile,
      digiAadhaar, digiPan, digiRefId, digilockerData, formData, customerId, onboardedCustomer]);

  // ── Auto-verify DigiLocker on return ─────────────────────────────────────────
  useEffect(() => {
    const urlRefId = searchParams.get('refid');
    const savedRefId = sessionStorage.getItem('merchant_digiRefId');
    const refid = urlRefId || savedRefId;

    if (!refid || autoVerifyRan.current || digilockerData) return;
    if (!phoneNumber || !digiAadhaar || !digiPan) return;

    autoVerifyRan.current = true;

    const autoVerify = async () => {
      setLoading(true);
      try {
        const targetBranchId = formData.branchId || globalBranchId || user?.branchId || (branches[0]?._id || branches[0]?.id || branches[0]?.branchId || '');
        const res = await merchantService.digilockerKycCheck({
          phoneNumber, aadhaarNumber: digiAadhaar, panNumber: digiPan,
          refid, productType: 'MERCHANT',
          ...(targetBranchId ? { branchId: targetBranchId } : {})
        });
        if (res.success && res.data?.verified) {
          const dData = res.data.digilockerData || {};
          setDigilockerData(dData);
          setFormData(prev => ({
            ...prev,
            fullName: dData.fullName || '',
            dob:      dData.dob      || '',
            address:  dData.address  || '',
            gender:   dData.gender   || ''
          }));
          toast.success('DigiLocker KYC verified successfully!');
          // Clean refid from URL, go to customer-details
          setSearchParams({ step: STEP_CUSTOMER });
        } else {
          toast.error(res.message || 'DigiLocker verification incomplete. Please try again.');
          setSearchParams({ step: STEP_DIGI });
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'DigiLocker auto-verify failed.');
        setSearchParams({ step: STEP_DIGI });
      } finally {
        setLoading(false);
      }
    };

    autoVerify();
  }, []); // run once on mount

  // ── Fetch Branches ────────────────────────────────────────────────────────────
  useEffect(() => {
    branchService.list({ limit: 100 })
      .then(res => {
        if (res?.success) {
          const list = Array.isArray(res.data) ? res.data : (res.data?.branches || res.data?.items || []);
          setBranches(list);
          if (list.length > 0) {
            const firstId = list[0]._id || list[0].id || list[0].branchId || '';
            setFormData(prev => ({
              ...prev,
              branchId: prev.branchId || globalBranchId || user?.branchId || firstId
            }));
          }
        }
      })
      .catch(() => {});
  }, [globalBranchId, user?.branchId]);

  // ── Reset All ─────────────────────────────────────────────────────────────────
  const handleResetAll = () => {
    [
      'merchant_phoneNumber','merchant_otpSent','merchant_kycValid','merchant_step4Done',
      'merchant_termsAccepted','merchant_customerProfile','merchant_digiAadhaar',
      'merchant_digiPan','merchant_digiRefId','merchant_digilockerData','merchant_formData',
      'merchant_customerId','merchant_onboardedCustomer'
    ].forEach(k => sessionStorage.removeItem(k));

    setPhoneNumber(''); setOtp(''); setCustomerProfile(null);
    setDigiAadhaar(''); setDigiPan(''); setDigiRefId(null); setDigilockerData(null);
    setOtpSent(false); setKycValid(false); setStep4Done(false); setTermsAccepted(false);
    setCustomerId(null); setOnboardedCustomer(null);
    setFormData({ fullName:'', dob:'', address:'', gender:'', shopName:'', secondaryNumber: '', email: '', shopAddress: '', businessProofType: '', businessProofNumber:'', password:'', branchId:'', residentialPincode:'' });
    setFiles({ businessProofPhoto: null, shopPhoto: null, panImage: null, aadhaarImage: null, livePhoto: null });
    setErrors({});
    setSearchParams({ step: STEP_MOBILE }, { replace: true });
    toast.info('Form cleared');
  };

  // ── File Handlers ─────────────────────────────────────────────────────────────
  const handleFileChange = (name, file) => {
    if (!file) return;
    const allowed = ['image/jpeg','image/png','image/jpg','image/webp','application/pdf'];
    if (!allowed.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|pdf)$/i)) {
      setErrors(p => ({ ...p, [name]: 'Invalid file type.' })); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors(p => ({ ...p, [name]: 'File size exceeds 5MB.' })); return;
    }
    setErrors(p => { const u = { ...p }; delete u[name]; return u; });
    setFiles(p => ({ ...p, [name]: file }));
  };
  const handleFileRemove = (name) => setFiles(p => ({ ...p, [name]: null }));

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────

  // Step 1 – Send OTP
  const handleStep1Submit = async (e) => {
    e.preventDefault();
    setErrors({});
    const v = validatePhone(phoneNumber, { required: true, fieldName: 'Phone number' });
    if (!v.isValid) { setErrors({ phone: v.error }); return; }

    setLoading(true);
    try {
      const res = await merchantService.sendLookupOtp({ phoneNumber, productType: 'MERCHANT' });
      if (res.success) {
        toast.success(res.message || 'OTP sent successfully');
        // Reset downstream state when phone changes
        setOtp(''); setCustomerProfile(null); setDigilockerData(null);
        setKycValid(false); setStep4Done(false); setDigiRefId(null);
        setOtpSent(true);
        goTo(stepIndex(STEP_OTP), { otpSent: true });
      } else {
        toast.error(res.message || 'Failed to send OTP');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  // Step 2 – Verify OTP
  const handleStep2Submit = async (e) => {
    e.preventDefault();
    setErrors({});
    if (otp.length < 6) { setErrors({ otp: 'Please enter a valid 6-digit OTP.' }); return; }

    setLoading(true);
    try {
      const res = await merchantService.verifyLookupOtp({ phoneNumber, otp, productType: 'MERCHANT' });
      if (res.success && res.data) {
        if (res.data.productEligibility && res.data.productEligibility.canApply === false) {
          toast.error(res.data.productEligibility.reason || 'Customer is already an onboarded Merchant.');
          return;
        }

        toast.success(res.message || 'OTP verified');
        setCustomerProfile(res.data);

        const isKycValid = !!res.data.kycStatus?.isKycValid;
        if (isKycValid) {
          // ── Scenario A: KYC valid → extract customerId, go straight to Shop Details ──
          toast.info('Existing KYC found. Proceeding to Shop Details.');
          const profile = res.data.userProfile || res.data.profileDetails || {};
          // Extract customerId from the OTP verify response for Scenario A
          const existingCustomerId = res.data.customerId || res.data._id || res.data.id || null;
          if (existingCustomerId) {
            setCustomerId(existingCustomerId);
            sessionStorage.setItem('merchant_customerId', existingCustomerId);
          }
          const dData = {
            fullName:      res.data.fullName      || profile.fullName      || '',
            dob:           profile.dob            || profile.dateOfBirth   || '',
            gender:        profile.gender         || '',
            address:       profile.address        || '',
            aadhaarNumber: profile.aadhaarNumber  || res.data.aadhaarNumber || '',
            panNumber:     profile.panNumber      || res.data.panNumber     || '',
          };
          setDigilockerData(dData);
          setFormData(prev => ({
            ...prev,
            fullName: res.data.fullName || profile.fullName || '',
            dob:      profile.dob || profile.dateOfBirth || '',
            address:  profile.address || '',
            gender:   profile.gender || ''
          }));
          setKycValid(true);
          setStep4Done(true); // customer already onboarded, no need for step 4 API
          goTo(stepIndex(STEP_SHOP), {
            otpSent: true,
            customerProfile: res.data,
            kycValid: true,
            step4Done: true,
            customerId: existingCustomerId || 'existing'
          });
        } else {
          // ── Scenario B/C: No KYC → go to DigiLocker ──
          setKycValid(false);
          goTo(stepIndex(STEP_DIGI), {
            otpSent: true,
            customerProfile: res.data,
            kycValid: false
          });
        }
      } else {
        toast.error(res.message || 'Invalid OTP');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
    } finally { setLoading(false); }
  };

  // Step 3 – Initiate DigiLocker
  const handleInitiateDigilocker = async () => {
    setErrors({});
    const av = validateAadhaar(digiAadhaar, { required: true });
    const pv = validatePAN(digiPan, { required: true });
    if (!av.isValid || !pv.isValid) {
      setErrors({ aadhaar: !av.isValid ? av.error : null, pan: !pv.isValid ? pv.error : null });
      return;
    }
    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}${window.location.pathname}?step=${STEP_DIGI}`;
      const targetBranchId = formData.branchId || globalBranchId || user?.branchId || (branches[0]?._id || branches[0]?.id || branches[0]?.branchId || '');
      if (!targetBranchId) {
        toast.error('Please select a target branch for onboarding this customer.');
        setLoading(false);
        return;
      }
      const res = await merchantService.digilockerKycCheck({
        phoneNumber, aadhaarNumber: digiAadhaar, panNumber: digiPan,
        productType: 'MERCHANT', redirectUrl,
        branchId: targetBranchId
      });
      if (res.success && res.data) {
        setDigiRefId(res.data.refid);
        sessionStorage.setItem('merchant_digiRefId', res.data.refid);
        if (res.data.authorizationUrl) {
          toast.success('Redirecting to DigiLocker…');
          window.location.href = res.data.authorizationUrl;
        }
      } else {
        toast.error(res.message || 'Failed to initiate DigiLocker');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error connecting to DigiLocker');
    } finally { setLoading(false); }
  };

  // Step 3 – Manual verify (after returning from DigiLocker if auto-verify didn't fire)
  const handleVerifyDigilocker = async () => {
    if (!digiRefId) return;
    setLoading(true);
    try {
      const targetBranchId = formData.branchId || globalBranchId || user?.branchId || (branches[0]?._id || branches[0]?.id || branches[0]?.branchId || '');
      if (!targetBranchId) {
        toast.error('Please select a target branch for onboarding this customer.');
        setLoading(false);
        return;
      }
      const res = await merchantService.digilockerKycCheck({
        phoneNumber, aadhaarNumber: digiAadhaar, panNumber: digiPan,
        refid: digiRefId, productType: 'MERCHANT',
        branchId: targetBranchId
      });
      if (res.success && res.data?.verified) {
        const dData = res.data.digilockerData || {};
        setDigilockerData(dData);
        setFormData(prev => ({
          ...prev,
          fullName: dData.fullName || '',
          dob:      dData.dob      || '',
          address:  dData.address  || '',
          gender:   dData.gender   || ''
        }));
        toast.success('DigiLocker KYC completed successfully!');
        goTo(stepIndex(STEP_CUSTOMER), {
          otpSent: true,
          customerProfile,
          kycValid: false,
          digilockerData: dData
        });
      } else {
        toast.error(res.message || 'DigiLocker KYC incomplete or failed.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'KYC check failed');
    } finally { setLoading(false); }
  };

  // Step 4 – Customer Details → calls submit-customer-onboarding API
  const handleStep4Next = async (e) => {
    e.preventDefault();
    setErrors({});
    const errs = {};
    if (!formData.residentialPincode.trim()) errs.residentialPincode = 'Current Residential Pin Code is required';
    if (isAdmin && !formData.branchId)       errs.branchId = 'Branch is required for your role';
    if (!files.livePhoto)    errs.livePhoto    = 'Live Photo is required';
    if (!files.panImage)     errs.panImage     = 'PAN Card image is required';
    if (!files.aadhaarImage) errs.aadhaarImage = 'Aadhaar Card image is required';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      // Build customer onboarding payload (identity data only)
      const payload = new FormData();
      payload.append('phoneNumber',       phoneNumber);
      payload.append('productType',       'MERCHANT');
      payload.append('fullName',          (formData.fullName || digilockerData?.fullName || '').trim());
      payload.append('panNumber',         (digilockerData?.panNumber  || digiPan).trim());
      payload.append('aadhaarNumber',     (digilockerData?.aadhaarNumber || digiAadhaar).trim());
      payload.append('dob',               (formData.dob || digilockerData?.dob || '').trim());
      payload.append('gender',            (formData.gender || digilockerData?.gender || 'MALE').toUpperCase());
      payload.append('address',           (formData.address || digilockerData?.address || '').trim());
      payload.append('residentialPincode', formData.residentialPincode.trim());
      const activeBranchId = formData.branchId || globalBranchId || user?.branchId || '';
      if (activeBranchId) {
        payload.append('branchId', activeBranchId);
      }
      // Identity document uploads
      payload.append('panImage',     files.panImage);
      payload.append('aadhaarImage', files.aadhaarImage);
      payload.append('livePhoto',    files.livePhoto);

      const res = await merchantService.submitCustomerOnboarding(payload);

      if (res?.success && res.data) {
        const cid = res.data.customerId || res.data._id || res.data.id;
        if (!cid) throw new Error('No customerId returned from customer onboarding.');
        setCustomerId(cid);
        sessionStorage.setItem('merchant_customerId', cid);
        setOnboardedCustomer(res.data);
        sessionStorage.setItem('merchant_onboardedCustomer', JSON.stringify(res.data));
        if (res.data.branch?.id) {
          setFormData(prev => ({ ...prev, branchId: prev.branchId || res.data.branch.id }));
        }
        setStep4Done(true);
        sessionStorage.setItem('merchant_step4Done', 'true');
        toast.success(res.message || 'Customer onboarding completed!');
        goTo(stepIndex(STEP_SHOP), {
          otpSent: true,
          customerProfile,
          kycValid: false,
          digilockerData,
          step4Done: true,
          customerId: cid
        });
      } else {
        toast.error(res?.message || 'Customer onboarding failed.');
      }
    } catch (err) {
      const status = err.response?.status;
      const msg    = err.response?.data?.message || err.message || 'Customer onboarding failed.';
      if (status === 403) {
        toast.error(`Insufficient Verification Credits. ${msg}`);
      } else {
        toast.error(msg);
      }
    } finally { setLoading(false); }
  };

  // Step 5 – Shop Details → calls POST /v1/society/merchants (create merchant)
  const handleStep5Submit = async (e) => {
    e.preventDefault();
    setErrors({});
    const errs = {};
    if (!formData.shopName?.trim()) errs.shopName = 'Shop Name is required';
    if (!formData.email?.trim()) errs.email = 'Email is required';
    if (!formData.shopAddress?.trim()) errs.shopAddress = 'Shop Address is required';
    if (!customerId)               errs.shopName = 'Customer ID is missing. Please go back and complete Step 4.';
    
    if (!formData.businessProofNumber?.trim()) {
      errs.businessProofNumber = 'GST / Shop Licence Number is required';
    }
    
    if (!files.businessProofPhoto) errs.businessProofPhoto = 'GST / Shop Licence Photo is required';
    if (!files.shopPhoto) errs.shopPhoto = 'Shop Photo is required';

    if (!formData.password) {
      errs.password = 'Account Password is required';
    } else {
      const pv = validatePassword(formData.password, { minLength: 6 });
      if (!pv.isValid) errs.password = pv.error;
    }

    if (!termsAccepted) errs.termsAccepted = 'You must accept the Terms & Conditions to proceed';

    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    // Shop details payload — customer identity is already stored via API 1
    const payload = new FormData();
    payload.append('customerId',  customerId);

    // Auto-filled locked fields
    payload.append('primaryPhoneNumber', phoneNumber);
    
    const finalOwnerName = (onboardedCustomer?.fullName || digilockerData?.fullName || customerProfile?.fullName || formData.fullName || '').trim();
    if (finalOwnerName) payload.append('ownerName', finalOwnerName);
    
    const finalAadhaar = (digilockerData?.aadhaarNumber || customerProfile?.aadhaarNumber || digiAadhaar || '').trim();
    if (finalAadhaar) payload.append('aadhaarNumber', finalAadhaar);
    
    const finalPan = (digilockerData?.panNumber || customerProfile?.panNumber || digiPan || '').trim();
    if (finalPan) payload.append('panNumber', finalPan);
    
    // Form fields
    payload.append('shopName', formData.shopName.trim());
    if (formData.email) payload.append('email', formData.email.trim());
    if (formData.secondaryNumber) payload.append('secondaryPhoneNumber', formData.secondaryNumber.trim());
    if (formData.shopAddress) payload.append('shopAddress', formData.shopAddress.trim());
    if (formData.businessProofType) payload.append('businessProofType', formData.businessProofType);
    if (formData.businessProofNumber) payload.append('businessProofNumber', formData.businessProofNumber.trim().toUpperCase());
    if (formData.password) payload.append('password', formData.password.trim());
    
    payload.append('termsAccepted', termsAccepted ? 'true' : 'false');

    const finalBranchId = formData.branchId || globalBranchId || user?.branchId || '';
    if (finalBranchId) payload.append('branchId', finalBranchId);

    // Files
    if (files.businessProofPhoto) payload.append('businessProof', files.businessProofPhoto);
    if (files.shopPhoto) payload.append('shopPhoto', files.shopPhoto);
    if (files.aadhaarImage) payload.append('ownerAadhaar', files.aadhaarImage);
    if (files.panImage) payload.append('ownerPan', files.panImage);

    try {
      const res = await merchantService.onboardMerchant(payload);
      if (res?.success) {
        toast.success(res.message || 'Merchant successfully created!');
        [
          'merchant_phoneNumber','merchant_otpSent','merchant_kycValid','merchant_step4Done',
          'merchant_termsAccepted','merchant_customerProfile','merchant_digiAadhaar',
          'merchant_digiPan','merchant_digiRefId','merchant_digilockerData','merchant_formData',
          'merchant_customerId','merchant_onboardedCustomer'
        ].forEach(k => sessionStorage.removeItem(k));
        navigate('/merchant');
      } else {
        toast.error(res?.message || 'Failed to create merchant.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating merchant.');
    } finally { setLoading(false); }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // DYNAMIC STEPS (3 vs 5 based on KYC validity)
  // ─────────────────────────────────────────────────────────────────────────────
  const visibleSteps = kycValid
    ? [
        { id: stepIndex(STEP_MOBILE),   name: STEP_MOBILE,   title: 'Mobile Lookup',  icon: Phone },
        { id: stepIndex(STEP_OTP),      name: STEP_OTP,      title: 'Verify OTP',     icon: Lock },
        { id: stepIndex(STEP_SHOP),     name: STEP_SHOP,     title: 'Shop Details',   icon: Building2 },
      ]
    : [
        { id: stepIndex(STEP_MOBILE),   name: STEP_MOBILE,   title: 'Mobile Lookup',  icon: Phone },
        { id: stepIndex(STEP_OTP),      name: STEP_OTP,      title: 'Verify OTP',     icon: Lock },
        { id: stepIndex(STEP_DIGI),     name: STEP_DIGI,     title: 'DigiLocker KYC', icon: ShieldCheck },
        { id: stepIndex(STEP_CUSTOMER), name: STEP_CUSTOMER, title: 'Add Customer',   icon: UserCheck },
        { id: stepIndex(STEP_SHOP),     name: STEP_SHOP,     title: 'Shop Details',   icon: Building2 },
      ];

  const visibleIndex = visibleSteps.findIndex(s => s.id === currentStep);
  const progressPct  = visibleSteps.length > 1
    ? (Math.max(visibleIndex, 0) / (visibleSteps.length - 1)) * 100
    : 0;

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      <PageHeader
        title="Add New Merchant"
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Partner Management' },
          { label: 'Merchant', to: '/merchant' },
          { label: 'Create' }
        ]}
        showBack={true} backUrl="/merchant"
      >
        <button
          type="button"
          onClick={handleResetAll}
          className="text-xs font-semibold text-gray-500 hover:text-rose-600 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
        >
          Reset / Clear Form
        </button>
      </PageHeader>

      {/* ── Wizard Progress Bar ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between relative w-full mx-auto px-4 lg:px-12">
          <div className="absolute top-5 left-8 right-8 h-1 bg-gray-100 rounded-full z-0 overflow-hidden">
            <div className="h-full bg-[#225091] transition-all duration-500 ease-in-out" style={{ width: `${progressPct}%` }} />
          </div>
          {visibleSteps.map((step, idx) => {
            const Icon       = step.icon;
            const isActive   = currentStep === step.id;
            const isDone     = visibleIndex > idx;
            const isClickable = isDone;
            return (
              <div key={step.id}
                className={`relative z-10 flex flex-col items-center gap-2 ${isClickable ? 'cursor-pointer hover:opacity-80' : ''}`}
                onClick={() => isClickable && goTo(step.id)}>
                <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isActive ? 'bg-[#225091] text-white shadow-md ring-4 ring-[#225091]/20 scale-110' :
                  isDone   ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  {isDone ? <CheckCircle2 size={20} /> : <Icon size={isActive ? 20 : 18} />}
                </div>
                <span className={`text-[11px] font-bold tracking-wide uppercase transition-colors ${
                  isActive ? 'text-[#225091]' : isDone ? 'text-emerald-600' : 'text-gray-400'
                }`}>{step.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Step Content ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full mx-auto">

        {/* ── Step 1: Mobile Lookup ── */}
        {currentStep === stepIndex(STEP_MOBILE) && (
          <form onSubmit={handleStep1Submit} className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-[#1b2559]">Verify Mobile Number</h2>
              <p className="text-sm text-gray-500 mt-2">Enter the merchant's 10-digit mobile number to begin onboarding.</p>
            </div>

            {branches.length > 0 && (
              <div className="mb-6">
                <label className="block text-[15px] font-semibold text-gray-800 mb-2.5">
                  Target Branch <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.branchId || globalBranchId || user?.branchId || (branches[0]?._id || branches[0]?.id || branches[0]?.branchId || '')}
                  onChange={(e) => setFormData(prev => ({ ...prev, branchId: e.target.value }))}
                  className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-[#225091] focus:ring-2 focus:ring-[#225091]/20 outline-none text-[15px] font-medium bg-white"
                >
                  {branches.map(b => (
                    <option key={b._id || b.id || b.branchId} value={b._id || b.id || b.branchId}>
                      {b.name || b.branchName} {b.branchCode || b.code ? `(${b.branchCode || b.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="mb-6">
              <label className="block text-[15px] font-semibold text-gray-800 mb-2.5">Mobile Number <span className="text-rose-500">*</span></label>
              <input type="tel" value={phoneNumber}
                onChange={(e) => setPhoneNumber(sanitizeDigits(e.target.value, 10))}
                placeholder="e.g. 9876543210"
                className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-[#225091] focus:ring-2 focus:ring-[#225091]/20 outline-none text-[15px]"
                required />
              {errors.phone && <p className="flex items-center gap-1 text-xs text-rose-500 font-medium mt-1.5"><AlertCircle size={14}/>{errors.phone}</p>}
            </div>
            <button type="submit" disabled={loading || phoneNumber.length !== 10}
              className="w-full py-3.5 rounded-xl bg-[#225091] text-white font-bold text-[15px] hover:bg-[#193e73] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2">
              {loading && <Loader2 size={18} className="animate-spin" />} Send OTP
            </button>
          </form>
        )}

        {/* ── Step 2: Verify OTP ── */}
        {currentStep === stepIndex(STEP_OTP) && (
          <form onSubmit={handleStep2Submit} className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-[#1b2559]">Enter Verification Code</h2>
              <p className="text-sm text-gray-500 mt-2">We've sent a 6-digit code to <strong>+91 {phoneNumber}</strong>.</p>
            </div>
            <div className="mb-6">
              <label className="block text-[15px] font-semibold text-gray-800 mb-2.5">Verification Code <span className="text-rose-500">*</span></label>
              <input type="text" value={otp}
                onChange={(e) => setOtp(sanitizeDigits(e.target.value, 6))}
                placeholder="Enter 6-digit OTP"
                className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-[#225091] focus:ring-2 focus:ring-[#225091]/20 outline-none text-[15px] tracking-widest text-center text-lg font-bold"
                required />
              {errors.otp && <p className="flex items-center gap-1 text-xs text-rose-500 font-medium mt-1.5 justify-center"><AlertCircle size={14}/>{errors.otp}</p>}
            </div>
            <button type="submit" disabled={loading || otp.length < 6}
              className="w-full py-3.5 rounded-xl bg-[#225091] text-white font-bold text-[15px] hover:bg-[#193e73] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2">
              {loading && <Loader2 size={18} className="animate-spin" />} Verify & Continue
            </button>
            <div className="mt-4 text-center">
              <button type="button" onClick={() => goTo(stepIndex(STEP_MOBILE))}
                className="text-sm font-semibold text-[#225091] hover:underline">← Change Mobile Number</button>
            </div>
          </form>
        )}

        {/* ── Step 3: DigiLocker KYC ── */}
        {currentStep === stepIndex(STEP_DIGI) && (
          <div className="max-w-lg mx-auto">
            {loading ? (
              <div className="text-center py-16">
                <Loader2 size={40} className="animate-spin text-[#225091] mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Verifying your DigiLocker session…</p>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck size={32} className="text-[#225091]" />
                  </div>
                  <h2 className="text-2xl font-bold text-[#1b2559]">DigiLocker KYC</h2>
                  <p className="text-sm text-gray-500 mt-2">Verify merchant identity securely via DigiLocker.</p>
                </div>
                <div className="space-y-5 mb-8">
                  <div>
                    <label className="block text-[15px] font-semibold text-gray-800 mb-2.5">Aadhaar Number <span className="text-rose-500">*</span></label>
                    <input type="text" value={digiAadhaar}
                      onChange={(e) => setDigiAadhaar(sanitizeDigits(e.target.value, 12))}
                      disabled={!!digiRefId} placeholder="12-digit Aadhaar"
                      className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-[#225091] outline-none disabled:bg-gray-50" />
                    {errors.aadhaar && <p className="flex items-center gap-1 text-xs text-rose-500 font-medium mt-1.5"><AlertCircle size={14}/>{errors.aadhaar}</p>}
                  </div>
                  <div>
                    <label className="block text-[15px] font-semibold text-gray-800 mb-2.5">PAN Number <span className="text-rose-500">*</span></label>
                    <input type="text" value={digiPan}
                      onChange={(e) => setDigiPan(sanitizePAN(e.target.value))}
                      disabled={!!digiRefId} placeholder="e.g. ABCDE1234F"
                      className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-[#225091] uppercase outline-none disabled:bg-gray-50" />
                    {errors.pan && <p className="flex items-center gap-1 text-xs text-rose-500 font-medium mt-1.5"><AlertCircle size={14}/>{errors.pan}</p>}
                  </div>
                </div>

                {!digiRefId ? (
                  <button type="button" onClick={handleInitiateDigilocker}
                    disabled={loading || digiAadhaar.length < 12 || digiPan.length < 10}
                    className="w-full py-3.5 rounded-xl bg-[#225091] text-white font-bold text-[15px] hover:bg-[#193e73] transition-colors disabled:opacity-50 flex justify-center items-center gap-2">
                    {loading && <Loader2 size={18} className="animate-spin" />} Initiate DigiLocker
                  </button>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-center space-y-3">
                    <p className="text-sm text-[#225091] font-semibold">
                      Please complete the DigiLocker verification. Once done, click the button below.
                    </p>
                    <button type="button" onClick={handleVerifyDigilocker} disabled={loading}
                      className="w-full py-3 rounded-lg bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-colors flex justify-center items-center gap-2">
                      {loading && <Loader2 size={16} className="animate-spin" />} Check Verification Status
                    </button>
                    <button type="button"
                      onClick={() => { setDigiRefId(null); sessionStorage.removeItem('merchant_digiRefId'); }}
                      className="text-sm font-semibold text-rose-500 hover:underline">
                      Verification failed? Click here to try again.
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Step 4: Customer Details ── */}
        {currentStep === stepIndex(STEP_CUSTOMER) && (
          <form onSubmit={handleStep4Next} className="max-w-4xl mx-auto">
            {/* DigiLocker Verified Card */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={20} className="text-emerald-500" />
                <h2 className="text-xl font-bold text-gray-800">DigiLocker Verified Details</h2>
              </div>
              <p className="text-sm text-gray-500 mb-4">These fields were fetched from DigiLocker and are locked to keep the verified identity unchanged.</p>
              <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                <ReadOnlyField label="Full Name"       value={formData.fullName} />
                <ReadOnlyField label="Date of Birth"   value={formData.dob} />
                <ReadOnlyField label="Gender"          value={formData.gender} />
                <ReadOnlyField label="Phone Number"    value={phoneNumber} />
                <ReadOnlyField label="PAN Number"      value={digilockerData?.panNumber  || digiPan} />
                <ReadOnlyField label="Aadhaar Number"  value={digilockerData?.aadhaarNumber || digiAadhaar} />
                <ReadOnlyField label="Address"         value={formData.address} />
              </div>
            </div>

            {/* Residential Pincode */}
            <div className="mb-8">
              <label className="block text-[15px] font-semibold text-gray-800 mb-2.5">
                Current Residential Pin Code <span className="text-rose-500">*</span>
              </label>
              <input type="text" value={formData.residentialPincode}
                onChange={(e) => setFormData({ ...formData, residentialPincode: sanitizeDigits(e.target.value, 6) })}
                placeholder="Enter 6-digit Current Residential Pin Code"
                className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-[#225091] outline-none" />
              {errors.residentialPincode && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.residentialPincode}</p>}
            </div>

            {/* Branch Selection */}
            {isAdmin && (
              <div className="mb-8">
                <label className="block text-[15px] font-semibold text-gray-800 mb-2.5">Branch <span className="text-rose-500">*</span></label>
                <select value={formData.branchId}
                  onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                  className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-[#225091] bg-white outline-none cursor-pointer">
                  <option value="">Select Branch</option>
                  {branches.map(b => (
                    <option key={b.id || b._id} value={b.id || b._id}>{b.name}</option>
                  ))}
                </select>
                {errors.branchId && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.branchId}</p>}
              </div>
            )}

            {/* Document Uploads */}
            <div className="mb-8 space-y-6">
              <div>
                <p className="text-[14px] font-semibold text-gray-700 mb-2">Live Photo <span className="text-rose-500">*</span></p>
                <FileUploadField id="live-photo-upload" name="livePhoto"
                  onChange={handleFileChange} onRemove={handleFileRemove}
                  selectedFile={files.livePhoto} error={errors.livePhoto} />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-gray-700 mb-2">PAN Card <span className="text-rose-500">*</span></p>
                <FileUploadField id="pan-img-upload" name="panImage"
                  onChange={handleFileChange} onRemove={handleFileRemove}
                  selectedFile={files.panImage} error={errors.panImage} />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-gray-700 mb-2">Aadhaar Card <span className="text-rose-500">*</span></p>
                <FileUploadField id="aadhaar-img-upload" name="aadhaarImage"
                  onChange={handleFileChange} onRemove={handleFileRemove}
                  selectedFile={files.aadhaarImage} error={errors.aadhaarImage} />
              </div>
            </div>

            <button type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-[#225091] text-white font-bold text-lg hover:bg-[#193e73] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2">
              {loading && <Loader2 size={20} className="animate-spin" />}
              Create Customer →
            </button>
          </form>
        )}

        {/* ── Step 5: Shop Details ── */}
        {currentStep === stepIndex(STEP_SHOP) && (
          <form onSubmit={handleStep5Submit}>
            {/* ── Verified Customer Details Summary Card ── */}
            {(() => {
              const raw = onboardedCustomer || (customerProfile || digilockerData ? {
                customerId: customerId || customerProfile?.customerId || customerProfile?._id,
                customerUniqueId: customerProfile?.customerUniqueId,
                fullName: digilockerData?.fullName || customerProfile?.fullName || formData.fullName,
                phoneNumber: phoneNumber || customerProfile?.phoneNumber,
                gender: digilockerData?.gender || customerProfile?.gender || formData.gender,
                dob: digilockerData?.dob || customerProfile?.dob || formData.dob,
                panNumber: digilockerData?.panNumber || customerProfile?.panNumber || digiPan,
                aadhaarNumber: digilockerData?.aadhaarNumber || customerProfile?.aadhaarNumber || digiAadhaar,
                address: digilockerData?.address || customerProfile?.address || formData.address,
                residentialPincode: customerProfile?.profileDetails?.pinCode || customerProfile?.pincode || customerProfile?.residentialPincode || formData.residentialPincode,
                panImage: customerProfile?.panImage,
                aadhaarImage: customerProfile?.aadhaarImage,
                livePhoto: customerProfile?.livePhoto,
                kycStatus: customerProfile?.kycStatus || 'VERIFIED',
                cibilStatus: customerProfile?.cibilStatus || 'APPROVED',
                onboardingStage: customerProfile?.onboardingStage || 'COMPLETED',
                bank: customerProfile?.bank,
                branch: customerProfile?.branch || branches.find(b => b.id === formData.branchId || b._id === formData.branchId)
              } : null);

              if (!raw) return null;

              // Helper to safely extract string from string or status object (prevents React Error #31)
              const toSafeString = (v, fallback = '') => {
                if (!v) return fallback;
                if (typeof v === 'string') return v;
                if (typeof v === 'number') return String(v);
                if (typeof v === 'object') {
                  if (v.status && typeof v.status === 'string') return v.status;
                  if (v.name && typeof v.name === 'string') return v.name;
                  if (v.isCibilValid) return 'APPROVED';
                  if (v.isKycValid) return 'VERIFIED';
                  return fallback;
                }
                return fallback;
              };

              const toAddressString = (addr) => {
                if (!addr) return '—';
                if (typeof addr === 'string') return addr;
                if (typeof addr === 'object') {
                  return [addr.addressLine1, addr.addressLine2, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ') || '—';
                }
                return String(addr);
              };

              const kycText = toSafeString(raw.kycStatus, 'VERIFIED');
              const cibilText = toSafeString(raw.cibilStatus, '');
              const stageText = toSafeString(raw.onboardingStage, '');
              const bankName = typeof raw.bank === 'object' ? (raw.bank?.name || '') : (typeof raw.bank === 'string' ? raw.bank : '');
              const branchName = typeof raw.branch === 'object' ? (raw.branch?.name || '') : (typeof raw.branch === 'string' ? raw.branch : '');
              const fullName = toSafeString(raw.fullName, 'Verified Customer');
              const uniqueId = toSafeString(raw.customerUniqueId, '');
              const panNum = toSafeString(raw.panNumber || digilockerData?.panNumber || digiPan, '—');
              const aadhaarNum = toSafeString(raw.aadhaarNumber || digilockerData?.aadhaarNumber || digiAadhaar, '—');
              const dobText = toSafeString(raw.dob || formData.dob, '—');
              const genderText = toSafeString(raw.gender || formData.gender, '—');
              const addressText = toAddressString(raw.address || formData.address);
              const pincodeText = toSafeString(raw.profileDetails?.pinCode || raw.pincode || raw.residentialPincode || formData.residentialPincode, '—');
              const phoneText = toSafeString(raw.phoneNumber || phoneNumber, '—');
              const custId = toSafeString(raw.customerId || customerId, '—');
              const livePhoto = typeof raw.livePhoto === 'string' ? raw.livePhoto : null;
              const panImage = typeof raw.panImage === 'string' ? raw.panImage : null;
              const aadhaarImage = typeof raw.aadhaarImage === 'string' ? raw.aadhaarImage : null;

              return (
                <div className="mb-10 bg-gradient-to-br from-blue-50/60 via-white to-slate-50 border border-blue-100 rounded-2xl p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4 mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center text-[#225091] font-bold border-2 border-[#225091]/20 shrink-0">
                        {livePhoto ? (
                          <img src={livePhoto} alt="Customer" className="w-full h-full object-cover" />
                        ) : (
                          <User size={24} />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-gray-900 leading-tight">
                            {fullName}
                          </h3>
                          {uniqueId && (
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#225091]/10 text-[#225091]">
                              {uniqueId}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                          <span>+91 {phoneText}</span>
                          {bankName && (
                            <span>• {bankName} ({branchName || 'Branch'})</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Status Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      {kycText && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={13} /> KYC {kycText}
                        </span>
                      )}
                      {cibilText && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                          <ShieldCheck size={13} /> CIBIL {cibilText}
                        </span>
                      )}
                      {stageText && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {stageText}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Identity Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-xs mb-5">
                    <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-2xs">
                      <p className="text-gray-400 font-medium uppercase tracking-wider text-[10px] mb-1">Customer ID</p>
                      <p className="font-semibold text-gray-800 font-mono truncate" title={custId}>
                        {custId}
                      </p>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-2xs">
                      <p className="text-gray-400 font-medium uppercase tracking-wider text-[10px] mb-1">PAN Number</p>
                      <p className="font-semibold text-gray-800 font-mono">
                        {panNum}
                      </p>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-2xs">
                      <p className="text-gray-400 font-medium uppercase tracking-wider text-[10px] mb-1">Aadhaar Number</p>
                      <p className="font-semibold text-gray-800 font-mono">
                        {aadhaarNum}
                      </p>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-2xs">
                      <p className="text-gray-400 font-medium uppercase tracking-wider text-[10px] mb-1">DOB / Gender</p>
                      <p className="font-semibold text-gray-800">
                        {dobText} • {genderText}
                      </p>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-2xs col-span-2 sm:col-span-2 lg:col-span-3">
                      <p className="text-gray-400 font-medium uppercase tracking-wider text-[10px] mb-1">Residential Address</p>
                      <p className="font-semibold text-gray-800 line-clamp-2">
                        {addressText}
                      </p>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-2xs">
                      <p className="text-gray-400 font-medium uppercase tracking-wider text-[10px] mb-1">PIN Code</p>
                      <p className="font-semibold text-gray-800 font-mono">
                        {pincodeText}
                      </p>
                    </div>
                  </div>

                  {/* Uploaded Identity Documents Thumbnail Strip */}
                  {(panImage || aadhaarImage || livePhoto) && (
                    <div className="border-t border-gray-100 pt-4">
                      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Verified Identity Documents</p>
                      <div className="flex flex-wrap gap-4">
                        {livePhoto && (
                          <div onClick={() => setPreviewImage(livePhoto)}
                            className="flex flex-col items-center gap-2 p-2 bg-white border border-gray-200 rounded-xl hover:border-[#225091] cursor-pointer shadow-sm transition-colors group">
                            <div className="w-24 h-24 overflow-hidden rounded-lg bg-gray-50 flex items-center justify-center">
                              <img src={livePhoto} alt="Live Photo" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                            </div>
                            <span className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                              Live Photo <Eye size={12} className="text-gray-400 group-hover:text-[#225091]" />
                            </span>
                          </div>
                        )}
                        {panImage && (
                          <div onClick={() => setPreviewImage(panImage)}
                            className="flex flex-col items-center gap-2 p-2 bg-white border border-gray-200 rounded-xl hover:border-[#225091] cursor-pointer shadow-sm transition-colors group">
                            <div className="w-24 h-24 overflow-hidden rounded-lg bg-gray-50 flex items-center justify-center">
                              <img src={panImage} alt="PAN Card" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                            </div>
                            <span className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                              PAN Card <Eye size={12} className="text-gray-400 group-hover:text-[#225091]" />
                            </span>
                          </div>
                        )}
                        {aadhaarImage && (
                          <div onClick={() => setPreviewImage(aadhaarImage)}
                            className="flex flex-col items-center gap-2 p-2 bg-white border border-gray-200 rounded-xl hover:border-[#225091] cursor-pointer shadow-sm transition-colors group">
                            <div className="w-24 h-24 overflow-hidden rounded-lg bg-gray-50 flex items-center justify-center">
                              <img src={aadhaarImage} alt="Aadhaar Card" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                            </div>
                            <span className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                              Aadhaar Card <Eye size={12} className="text-gray-400 group-hover:text-[#225091]" />
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="mb-10">
              <h2 className="text-[22px] font-bold text-[#1b2559] mb-6">Shop Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                <div className="md:col-span-2">
                  <label className="block text-[15px] font-semibold text-gray-800 mb-2.5">Shop Name <span className="text-rose-500">*</span></label>
                  <input type="text" value={formData.shopName}
                    onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                    placeholder="Enter shop name"
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-[#225091] outline-none" />
                  {errors.shopName && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.shopName}</p>}
                </div>
                <div>
                  <label className="block text-[15px] font-semibold text-gray-800 mb-2.5">Secondary Number</label>
                  <input type="tel" value={formData.secondaryNumber}
                    onChange={(e) => setFormData({ ...formData, secondaryNumber: sanitizeDigits(e.target.value, 10) })}
                    placeholder="Enter secondary number"
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-[#225091] outline-none" />
                </div>
                <div>
                  <label className="block text-[15px] font-semibold text-gray-800 mb-2.5">Email <span className="text-rose-500">*</span></label>
                  <input type="email" value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email id"
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-[#225091] outline-none" />
                  {errors.email && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.email}</p>}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[15px] font-semibold text-gray-800 mb-2.5">Shop Address <span className="text-rose-500">*</span></label>
                  <input type="text" value={formData.shopAddress}
                    onChange={(e) => setFormData({ ...formData, shopAddress: e.target.value })}
                    placeholder="Enter Shop address, city, pincode"
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-[#225091] outline-none" />
                  {errors.shopAddress && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.shopAddress}</p>}
                </div>
              </div>
            </div>

            <div className="mb-10">
              <h2 className="text-[22px] font-bold text-[#1b2559] mb-1">Supporting Documents</h2>
              <p className="text-sm text-gray-500 mb-6">Supporting documents details can be captured here.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                <div className="md:col-span-2">
                  <label className="block text-[15px] font-semibold text-gray-800 mb-2.5">Business Proof Type</label>
                  <select value={formData.businessProofType}
                    onChange={(e) => setFormData({ ...formData, businessProofType: e.target.value })}
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-[#225091] bg-white outline-none cursor-pointer appearance-none">
                    <option value="">Select business proof type</option>
                    <option value="GST">GST Certificate</option>
                    <option value="SHOP_LICENCE">Shop Act Licence</option>
                    <option value="UDYAM">Udyam Aadhaar</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[15px] font-semibold text-gray-800 mb-2.5">GST / Shop Licence Number <span className="text-rose-500">*</span></label>
                  <input type="text" value={formData.businessProofNumber}
                    onChange={(e) => setFormData({ ...formData, businessProofNumber: e.target.value.toUpperCase() })}
                    placeholder="Enter GST / Shop Licence number"
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-[#225091] uppercase outline-none" />
                  {errors.businessProofNumber && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.businessProofNumber}</p>}
                </div>
                
                <div className="md:col-span-2 space-y-6">
                  <div>
                    <p className="text-[14px] font-semibold text-gray-700 mb-2">GST / Shop Licence Photo <span className="text-rose-500">*</span></p>
                    <FileUploadField id="gst-cert-upload" name="businessProofPhoto"
                      onChange={handleFileChange} onRemove={handleFileRemove}
                      selectedFile={files.businessProofPhoto} error={errors.businessProofPhoto} />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-gray-700 mb-2">Shop Photo <span className="text-rose-500">*</span></p>
                    <FileUploadField id="shop-photo-upload" name="shopPhoto"
                      onChange={handleFileChange} onRemove={handleFileRemove}
                      selectedFile={files.shopPhoto} error={errors.shopPhoto} />
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-[15px] font-semibold text-gray-800 mb-2.5">Merchant Panel Password <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Enter password"
                      className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-[#225091] outline-none pr-12" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.password}</p>}
                </div>
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start gap-3 mb-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <input type="checkbox" id="terms" checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded border-gray-300 text-[#225091] focus:ring-[#225091] cursor-pointer" />
              <div>
                <label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer">
                  I have read, understand, and hereby accept the Sahayaone Product application{' '}
                  <span className="font-bold text-rose-500 underline">Terms & Conditions</span>
                </label>
                {errors.termsAccepted && <p className="text-xs text-rose-500 font-medium mt-1">{errors.termsAccepted}</p>}
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <button type="button" onClick={() => { handleResetAll(); navigate('/merchant'); }}
                className="px-6 py-3 rounded-full border border-gray-200 font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="px-8 py-3 rounded-full bg-[#225091] text-white font-bold hover:bg-[#193e73] transition-colors flex items-center gap-2 disabled:opacity-50">
                {loading && <Loader2 size={18} className="animate-spin" />} Submit & Onboard
              </button>
            </div>
          </form>
        )}

      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-4xl max-h-screen w-full flex items-center justify-center">
            <button onClick={() => setPreviewImage(null)} className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 p-2 rounded-full text-white backdrop-blur-md transition-colors">
              <X size={24} />
            </button>
            <img src={previewImage} alt="Preview" className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl" onClick={e => e.stopPropagation()} />
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateMerchant;
