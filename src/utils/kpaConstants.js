/**
 * KPA (Key Performance Area) Constants, Role Configuration Matrix & Goal Derivation Utilities
 * Aligned with Advita Bank DWR & KPA API Architecture
 */

export const ALL_KPA_PRODUCTS = [
  // Core Standardized Products
  { name: 'Loan Disbursement', key: 'loanDisbursement', defaultType: 'AMOUNT' },
  { name: 'Deposit Collection', key: 'depositCollection', defaultType: 'AMOUNT' },
  { name: 'Lead Generation', key: 'leadGeneration', defaultType: 'COUNT' },
  { name: 'Share Capital', key: 'shareCapital', defaultType: 'AMOUNT' },
  { name: 'Staff Onboarding', key: 'staffOnboarding', defaultType: 'COUNT' },

  // Supplementary Products
  { name: 'CD Loan Leads', key: 'cdLoanLeads', defaultType: 'COUNT' },
  { name: 'Smart SIP', key: 'smartSip', defaultType: 'AMOUNT' },
  { name: 'Gold Loan', key: 'goldLoan', defaultType: 'AMOUNT' },
  { name: 'Current Account', key: 'currentAccount', defaultType: 'COUNT' },
  { name: 'Savings Account', key: 'savingsAccount', defaultType: 'COUNT' },
  { name: 'FD', key: 'fd', defaultType: 'AMOUNT' },
  { name: 'Merchant Onboarding', key: 'merchantOnboarding', defaultType: 'COUNT' },
  { name: 'Credit Receipts', key: 'creditReceipts', defaultType: 'AMOUNT' },
  { name: 'Debit Receipts', key: 'debitReceipts', defaultType: 'AMOUNT' },
  { name: 'Cash Submissions', key: 'cashSubmissions', defaultType: 'AMOUNT' },
  { name: 'Other', key: 'other', defaultType: 'AMOUNT' }
];

export const KPA_ROLE_MATRIX = {
  LOAN_EXECUTIVE: [
    { product: 'Loan Disbursement', targetType: 'AMOUNT', defaultTarget: 0 },
    { product: 'Lead Generation', targetType: 'COUNT', defaultTarget: 0 }
  ],
  COLLECTION_EXECUTIVE: [
    { product: 'Deposit Collection', targetType: 'AMOUNT', defaultTarget: 0 }
  ],
  BRANCH_MANAGER: [
    { product: 'Loan Disbursement', targetType: 'AMOUNT', defaultTarget: 0 },
    { product: 'Deposit Collection', targetType: 'AMOUNT', defaultTarget: 0 },
    { product: 'Lead Generation', targetType: 'COUNT', defaultTarget: 0 }
  ],
  MANAGER: [
    { product: 'Loan Disbursement', targetType: 'AMOUNT', defaultTarget: 0 },
    { product: 'Deposit Collection', targetType: 'AMOUNT', defaultTarget: 0 },
    { product: 'Lead Generation', targetType: 'COUNT', defaultTarget: 0 }
  ],
  RECEIPT_MANAGEMENT_EXECUTIVE: [
    { product: 'Deposit Collection', targetType: 'AMOUNT', defaultTarget: 0 }
  ],
  ACCOUNTANT: [
    { product: 'Share Capital', targetType: 'AMOUNT', defaultTarget: 0 }
  ],
  SUPPORT_EXECUTIVE: [
    { product: 'Lead Generation', targetType: 'COUNT', defaultTarget: 0 }
  ],
  HR_EXECUTIVE: [
    { product: 'Staff Onboarding', targetType: 'COUNT', defaultTarget: 0 }
  ],
  HR: [
    { product: 'Staff Onboarding', targetType: 'COUNT', defaultTarget: 0 }
  ]
};

/**
 * Derives proportional KPA goals according to the official backend formula:
 * - Yearly: Y
 * - Monthly: Math.round(Y / 12)
 * - Weekly: Math.round(Monthly / 4)
 * - Daily: Math.round(Weekly / 5)
 */
export const deriveKpaGoals = (yearlyTarget = 0) => {
  const yearly = Math.max(0, Number(yearlyTarget) || 0);
  const monthly = Math.round(yearly / 12);
  const weekly = Math.round(monthly / 4);
  const daily = Math.round(weekly / 5);

  return {
    yearly,
    monthly,
    weekly,
    daily
  };
};

/**
 * Resolves default seeded targets for a given role or designation name
 * Starting Target strictly defaults to 0 as per backend spec
 */
export const getRecommendedProductsForRole = (roleOrDesignation = '') => {
  if (!roleOrDesignation) return KPA_ROLE_MATRIX.LOAN_EXECUTIVE;

  const normalized = roleOrDesignation
    .toString()
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_');

  if (KPA_ROLE_MATRIX[normalized]) {
    return KPA_ROLE_MATRIX[normalized];
  }

  if (normalized.includes('LOAN')) return KPA_ROLE_MATRIX.LOAN_EXECUTIVE;
  if (normalized.includes('COLLECT')) return KPA_ROLE_MATRIX.COLLECTION_EXECUTIVE;
  if (normalized.includes('MANAGER')) return KPA_ROLE_MATRIX.BRANCH_MANAGER;
  if (normalized.includes('RECEIPT')) return KPA_ROLE_MATRIX.RECEIPT_MANAGEMENT_EXECUTIVE;
  if (normalized.includes('ACCOUNT')) return KPA_ROLE_MATRIX.ACCOUNTANT;
  if (normalized.includes('SUPPORT')) return KPA_ROLE_MATRIX.SUPPORT_EXECUTIVE;
  if (normalized.includes('HR')) return KPA_ROLE_MATRIX.HR_EXECUTIVE;

  return [
    { product: 'Loan Disbursement', targetType: 'AMOUNT', defaultTarget: 0 },
    { product: 'Deposit Collection', targetType: 'AMOUNT', defaultTarget: 0 }
  ];
};

export const DEFAULT_SMART_SIP_SLABS = [
  { minAmount: 0, maxAmount: 1000000, ratePercent: 0.30, label: 'Up to ₹10 Lakhs' },
  { minAmount: 1000000, maxAmount: 2000000, ratePercent: 0.75, label: '₹10L - ₹20L' },
  { minAmount: 2000000, maxAmount: 3000000, ratePercent: 0.90, label: '₹20L - ₹30L' },
  { minAmount: 3000000, maxAmount: 4000000, ratePercent: 1.00, label: '₹30L - ₹40L' },
  { minAmount: 4000000, maxAmount: 5000000, ratePercent: 1.25, label: '₹40L - ₹50L+' },
];

/**
 * Calculates progress metrics: Target -> Achievement -> Balance -> Achievement%
 */
export const calculateKpaProgress = (target = 0, achievement = 0) => {
  const numTarget = Math.max(0, Number(target) || 0);
  const numAchieved = Math.max(0, Number(achievement) || 0);
  const balance = Math.max(0, numTarget - numAchieved);
  const achievementPercent = numTarget > 0 
    ? Number(((numAchieved / numTarget) * 100).toFixed(1))
    : (numAchieved > 0 ? 100 : 0);

  return {
    target: numTarget,
    achievement: numAchieved,
    balance,
    achievementPercent
  };
};

/**
 * Core Incentive Calculation Engine supporting:
 * - Target Threshold Incentive Qualification Rule:
 *   If achievement < target goal, earnedIncentive strictly defaults to 0 (₹0).
 *   If achievement >= target goal, calculate based on PRODUCT (%) or QUANTITY (₹/unit).
 */
export const calculateKpaIncentive = ({
  target = 0,
  achievement = 0,
  calculationType = 'COUNT',
  rate = 0,
  slabs = null,
  requireTargetMet = true // Strictly default to true per official rule
}) => {
  const progress = calculateKpaProgress(target, achievement);
  const isTargetMet = progress.target <= 0 || progress.achievement >= progress.target;

  // Strict Threshold Check: If target is set (>0) and not met, earnedIncentive = 0
  if (requireTargetMet && progress.target > 0 && !isTargetMet) {
    return {
      ...progress,
      incentiveAmount: 0,
      appliedRate: 0,
      isTargetMet: false,
      reason: 'Target not reached (0 incentive threshold qualification rule)'
    };
  }

  let incentiveAmount = 0;
  let appliedRate = rate;

  const normalizedType = calculationType ? calculationType.toString().toUpperCase() : 'COUNT';

  if (normalizedType === 'COUNT' || normalizedType === 'QUANTITY' || normalizedType === 'PER_UNIT') {
    incentiveAmount = Math.round(progress.achievement * Number(rate || 0));
  } else if (slabs && Array.isArray(slabs) && slabs.length > 0) {
    const matchedSlab = slabs
      .slice()
      .reverse()
      .find(slab => progress.achievement >= slab.minAmount);

    const slabRate = matchedSlab ? matchedSlab.ratePercent : (slabs[0]?.ratePercent || 0);
    appliedRate = `${slabRate}%`;
    incentiveAmount = Math.round((progress.achievement * (slabRate / 100)));
  } else {
    // PRODUCT / PERCENTAGE
    const percentRate = Number(rate || 0);
    appliedRate = `${percentRate}%`;
    incentiveAmount = Math.round((progress.achievement * (percentRate / 100)));
  }

  return {
    ...progress,
    incentiveAmount,
    appliedRate,
    isTargetMet
  };
};

export const CUSTOM_KPIS_STORAGE_KEY = 'advita_bank_custom_kpis';

/**
 * Loads custom KPIs persisted in local storage
 */
export const getStoredCustomKpis = () => {
  try {
    const raw = localStorage.getItem(CUSTOM_KPIS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Failed to load custom KPIs from storage:', e);
    return [];
  }
};

/**
 * Saves a new or updated Custom KPI configuration
 */
export const saveStoredCustomKpi = (kpi) => {
  if (!kpi || !kpi.name) return [];
  try {
    const existing = getStoredCustomKpis();
    const cleanName = kpi.name.trim();
    const index = existing.findIndex(item => item.name.toLowerCase() === cleanName.toLowerCase());
    
    const record = {
      ...kpi,
      name: cleanName,
      key: kpi.key || cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      defaultType: kpi.kpiType === 'Count' ? 'COUNT' : 'AMOUNT',
      status: kpi.status || 'Active',
      effectiveDate: kpi.effectiveDate || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString()
    };

    let updated;
    if (index >= 0) {
      updated = [...existing];
      updated[index] = record;
    } else {
      updated = [record, ...existing];
    }
    localStorage.setItem(CUSTOM_KPIS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save custom KPI:', e);
    return [];
  }
};

/**
 * Combines standard base products with any user-created custom KPIs
 */
export const getAllKpaProductsList = () => {
  const custom = getStoredCustomKpis().filter(k => k.status !== 'Inactive');
  const customEntries = custom.map(c => ({
    name: c.name,
    key: c.key || c.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
    defaultType: c.defaultType || (c.kpiType === 'Count' ? 'COUNT' : 'AMOUNT'),
    isCustom: true,
    customMeta: c
  }));

  const standardWithoutOther = ALL_KPA_PRODUCTS.filter(p => p.name !== 'Other');
  const otherOption = ALL_KPA_PRODUCTS.find(p => p.name === 'Other') || { name: 'Other', key: 'other', defaultType: 'AMOUNT' };

  return [...standardWithoutOther, ...customEntries, otherOption];
};

export default {
  KPA_ROLE_MATRIX,
  ALL_KPA_PRODUCTS,
  DEFAULT_SMART_SIP_SLABS,
  CUSTOM_KPIS_STORAGE_KEY,
  deriveKpaGoals,
  getRecommendedProductsForRole,
  calculateKpaProgress,
  calculateKpaIncentive,
  getStoredCustomKpis,
  saveStoredCustomKpi,
  getAllKpaProductsList,
};
