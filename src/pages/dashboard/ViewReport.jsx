import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronRight, 
  Phone, 
  Mail, 
  MapPin, 
  Target, 
  ChevronDown, 
  Loader2, 
  Calendar,
  Layers,
  Award,
  TrendingUp,
  RefreshCw,
  Plus,
  ArrowUpRight,
  Sparkles,
  BarChart3,
  Gift,
  Coins,
  CheckCircle2,
  Clock,
  Receipt,
  Wallet,
  Users,
  FileText,
  AlertCircle,
  HelpCircle,
  Percent
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import { kpaReportService } from '../../api/kpaReportService';
import { ALL_KPA_PRODUCTS } from '../../utils/kpaConstants';
import useBranchStore from '../../store/branchStore';
import { Skeleton, SkeletonAvatar } from '../../components/common/Skeleton';

const AVAILABLE_YEARS = [2026, 2025, 2024, 2027];

const ViewReport = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Filter States
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedProduct, setSelectedProduct] = useState('Loan Disbursement');
  const globalBranchId = useBranchStore(state => state.globalBranchId);

  // Data States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [kpaData, setKpaData] = useState(null);

  // Fetch Detailed KPA Targets vs Achievements
  // GET /api/v1/society/employees/hr/:id/kpa-reports/detail?year=&product=
  const fetchKpaDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const params = {
        year: selectedYear,
      };
      if (selectedProduct) {
        params.product = selectedProduct;
      }
      if (globalBranchId) {
        params.branchId = globalBranchId;
      }

      const response = await kpaReportService.getDetail(id, params);

      if (response && (response.success || response.data)) {
        const data = response.data || {};
        setKpaData(data);
        // If selected product not set or not in availableProducts, sync with response
        if (data.selectedProduct && data.selectedProduct !== selectedProduct) {
          setSelectedProduct(data.selectedProduct);
        } else if (data.product && data.product !== selectedProduct) {
          setSelectedProduct(data.product);
        }
      } else {
        setKpaData(null);
      }
    } catch (err) {
      console.error('Failed to fetch KPA detail:', err);
      setError('Could not load KPA targets detail.');
    } finally {
      setLoading(false);
    }
  }, [id, selectedYear, selectedProduct, globalBranchId]);

  useEffect(() => {
    fetchKpaDetail();
  }, [fetchKpaDetail]);

  // Employee details from response or fallbacks (supports employee, raw data, branch/branchName)
  const rawEmp = kpaData?.employee || kpaData || {};
  const employee = {
    fullName: rawEmp.fullName || rawEmp.employeeName || 'Employee',
    designation: rawEmp.designation || 'Staff',
    phoneNumber: rawEmp.phoneNumber || rawEmp.phone || '—',
    email: rawEmp.email || '—',
    branchName: rawEmp.branchName || rawEmp.branch || 'Main Branch',
  };

  // Helper formatter for currencies / counts
  const formatValue = (amount, formatted, isCount = false) => {
    if (formatted) return formatted;
    if (amount !== undefined && amount !== null && amount !== '') {
      const num = Number(amount);
      if (!isNaN(num)) {
        return isCount ? num.toLocaleString('en-IN') : `₹${num.toLocaleString('en-IN')}`;
      }
    }
    return isCount ? '0' : '₹0';
  };

  // Helper to normalize milestone metrics from both nested performance and flat structures
  const normalizeMilestone = (m) => {
    if (!m) return { goal: 0, achieved: 0, percentage: 0, earnedIncentive: 0, formattedGoal: null, formattedAchieved: null, formattedEarnedIncentive: null, incentiveFormula: '' };
    const goal = m.targetGoal !== undefined ? m.targetGoal : (m.goal !== undefined ? m.goal : 0);
    const achieved = m.achieved !== undefined ? m.achieved : 0;
    const percentage = m.achievementPercentage !== undefined ? m.achievementPercentage : (m.percentage !== undefined ? m.percentage : (goal > 0 ? Math.round((achieved / goal) * 100) : 0));
    const earnedIncentive = m.earnedIncentive !== undefined ? m.earnedIncentive : 0;
    return {
      goal,
      achieved,
      percentage,
      earnedIncentive,
      formattedGoal: m.formattedTargetGoal || m.formattedGoal,
      formattedAchieved: m.formattedAchieved,
      formattedEarnedIncentive: m.formattedEarnedIncentive,
      incentiveFormula: m.incentiveFormula || ''
    };
  };

  // Milestone Targets (supports kpaData.performance.yearly or kpaData.yearly)
  const perfSource = kpaData?.performance || kpaData || {};
  const yearly = normalizeMilestone(perfSource.yearly || kpaData?.yearly);
  const monthly = normalizeMilestone(perfSource.monthly || kpaData?.monthly);
  const weekly = normalizeMilestone(perfSource.weekly || kpaData?.weekly);
  const daily = normalizeMilestone(perfSource.daily || kpaData?.daily);
  
  // Incentive Structure
  const incentive = kpaData?.incentive || kpaData?.target?.incentive || null;

  // Available Products for switching
  const productTabs = useMemo(() => {
    if (Array.isArray(kpaData?.availableProducts) && kpaData.availableProducts.length > 0) {
      return kpaData.availableProducts;
    }
    if (Array.isArray(kpaData?.targets) && kpaData.targets.length > 0) {
      const prods = kpaData.targets.map(t => typeof t === 'string' ? t : t.product).filter(Boolean);
      if (prods.length > 0) {
        return Array.from(new Set(prods));
      }
    }
    return ['Loan Disbursement', 'Deposit Collection', 'Lead Generation', 'Share Capital', 'Staff Onboarding'];
  }, [kpaData?.availableProducts, kpaData?.targets]);

  // Milestone cards array
  const milestoneCards = [
    {
      id: 'yearly',
      title: 'Fiscal Yearly Target',
      subtitle: `FY ${selectedYear} - ${selectedYear + 1}`,
      data: yearly,
      color: 'emerald',
      bgLight: 'bg-emerald-50/70',
      borderLight: 'border-emerald-200/80',
      textAccent: 'text-emerald-700',
      barColor: 'bg-emerald-600',
      badgeBg: 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 'monthly',
      title: 'Monthly Milestone',
      subtitle: 'Derived (Yearly / 12)',
      data: monthly,
      color: 'blue',
      bgLight: 'bg-blue-50/70',
      borderLight: 'border-blue-200/80',
      textAccent: 'text-blue-700',
      barColor: 'bg-[#225091]',
      badgeBg: 'bg-blue-100 text-blue-800',
    },
    {
      id: 'weekly',
      title: 'Weekly Milestone',
      subtitle: 'Derived (Monthly / 4)',
      data: weekly,
      color: 'indigo',
      bgLight: 'bg-indigo-50/70',
      borderLight: 'border-indigo-200/80',
      textAccent: 'text-indigo-700',
      barColor: 'bg-indigo-600',
      badgeBg: 'bg-indigo-100 text-indigo-800',
    },
    {
      id: 'daily',
      title: 'Daily Milestone',
      subtitle: 'Derived (Weekly / 5)',
      data: daily,
      color: 'amber',
      bgLight: 'bg-amber-50/70',
      borderLight: 'border-amber-200/80',
      textAccent: 'text-amber-800',
      barColor: 'bg-amber-600',
      badgeBg: 'bg-amber-100 text-amber-900',
    }
  ];

  // Breakdown data helper supporting both numbers and objects
  const rawBreakdown = kpaData?.breakdown || {};
  const getBreakdownMetric = (item, isCount = false) => {
    if (typeof item === 'number') {
      return {
        amount: item,
        formatted: isCount ? item.toLocaleString('en-IN') : `₹${item.toLocaleString('en-IN')}`,
        subtext: isCount ? 'Recorded' : 'Live hooks'
      };
    }
    if (typeof item === 'object' && item !== null) {
      const amt = Number(item.amount) || 0;
      const count = item.count !== undefined ? item.count : 0;
      return {
        amount: amt,
        formatted: item.formattedAmount || (isCount ? (item.formattedCount || count.toLocaleString('en-IN')) : `₹${amt.toLocaleString('en-IN')}`),
        subtext: item.count !== undefined ? `${count} transactions` : 'Live hooks'
      };
    }
    return { amount: 0, formatted: isCount ? '0' : '₹0', subtext: '0' };
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-14 font-sans">
      
      {/* Header with Breadcrumbs */}
      <PageHeader
        title="Employee KPA Performance Analytics"
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'HR Management' },
          { label: 'KPA Report', to: '/kpa-report' },
          { label: 'Performance Breakdown' }
        ]}
        showBack={true}
        backUrl="/kpa-report"
      >
        <button 
          onClick={() => navigate(`/kpa-report/view/${id}/add-kra`)}
          className="flex items-center gap-2 bg-[#225091] hover:bg-[#193e73] text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer"
        >
          <Plus size={16} />
          <span>Configure / Update Targets</span>
        </button>
      </PageHeader>

      {/* Employee Profile Header Card */}
      {loading && !kpaData ? (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <SkeletonAvatar size="w-16 h-16" rounded="rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-44 rounded-md" />
              <Skeleton className="h-4 w-28 rounded-md" />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border border-gray-100 shadow-2xs shrink-0 bg-blue-50/90 flex items-center justify-center text-[#225091] font-bold text-2xl">
              {employee.fullName ? employee.fullName.charAt(0).toUpperCase() : 'E'}
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-[19px] font-bold text-gray-900">{employee.fullName || 'Employee'}</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex px-2.5 py-0.5 bg-blue-50 text-[#225091] border border-blue-200/60 rounded-full text-xs font-semibold">
                  {employee.designation || 'Staff'}
                </span>
                {employee.employeeCode && (
                  <span className="text-xs text-gray-400 font-mono">({employee.employeeCode})</span>
                )}
                {incentive && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200/80 rounded-full text-xs font-semibold shadow-2xs">
                    <Gift size={12} className="text-amber-600" />
                    <span>Incentive: {incentive.formattedValue || (incentive.value !== undefined ? `${incentive.value}%` : '—')}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex flex-col gap-2 text-xs text-gray-600 font-medium">
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-[#225091]" /> {employee.phoneNumber || '—'}
              </div>
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-[#225091]" /> {employee.email || '—'}
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-[#225091]" /> {employee.branchName || 'Main Branch'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product & Fiscal Year Filter Bar */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Dynamic Product Selection Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1 shrink-0">Product:</span>
          {productTabs.map(prodName => {
            const isSelected = (kpaData?.selectedProduct || selectedProduct) === prodName;
            return (
              <button
                key={prodName}
                type="button"
                onClick={() => setSelectedProduct(prodName)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#225091] text-white shadow-2xs'
                    : 'bg-slate-100/70 hover:bg-slate-100 text-gray-700'
                }`}
              >
                {prodName}
              </button>
            );
          })}
        </div>

        {/* Year Selector & Refresh */}
        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3.5 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-[#225091] cursor-pointer shadow-2xs"
          >
            {AVAILABLE_YEARS.map(yr => (
              <option key={yr} value={yr}>FY {yr} - {yr + 1}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={fetchKpaDetail}
            disabled={loading}
            className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
            title="Refresh KPA metrics"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-[#225091]' : ''} />
          </button>
        </div>
      </div>

      {/* Target Threshold Incentive Qualification Alert Banner */}
      <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-4 flex items-start gap-3 shadow-2xs">
        <AlertCircle size={18} className="text-[#225091] shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 leading-relaxed">
          <span className="font-bold">Target Threshold Incentive Qualification Rule: </span>
          Staff earn incentives <span className="font-semibold underline">only if</span> performance achievement meets or exceeds the assigned target goal (Achieved ≥ Goal). When achievement is below target goal, earned incentive defaults strictly to <span className="font-bold text-rose-700">₹0</span>.
        </div>
      </div>

      {/* 4 Milestone Cards Grid (Yearly, Monthly, Weekly, Daily) with Earned Incentive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {milestoneCards.map((m) => {
          const goalVal = m.data?.goal || 0;
          const achievedVal = m.data?.achieved || 0;
          const pct = m.data?.percentage ?? (goalVal > 0 ? Math.round((achievedVal / goalVal) * 100) : 0);
          const isTargetMet = goalVal > 0 ? achievedVal >= goalVal : (achievedVal > 0);
          const earnedInc = m.data?.earnedIncentive || 0;
          const formattedEarnedInc = m.data?.formattedEarnedIncentive || `₹${earnedInc.toLocaleString('en-IN')}`;

          return (
            <div 
              key={m.id}
              className={`bg-white rounded-2xl p-5 border ${m.borderLight} shadow-xs flex flex-col justify-between gap-4 transition-all hover:shadow-sm`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-800">{m.title}</h4>
                  <p className="text-[11px] text-gray-400 font-medium">{m.subtitle}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${m.badgeBg}`}>
                  {pct}%
                </span>
              </div>

              {/* Numbers */}
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-gray-500 font-medium">Achieved:</span>
                  <span className={`font-bold text-sm ${m.textAccent}`}>
                    {formatValue(achievedVal, m.data?.formattedAchieved)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-gray-400">Target Goal:</span>
                  <span className="font-semibold text-gray-700">
                    {formatValue(goalVal, m.data?.formattedGoal)}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`${m.barColor} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-gray-400 font-medium">
                  <span>Progress</span>
                  <span>{pct}% of Goal</span>
                </div>
              </div>

              {/* Earned Incentive Indicator Pill */}
              <div className={`pt-2 border-t border-gray-100 flex items-center justify-between text-xs rounded-lg px-2.5 py-1.5 ${
                isTargetMet && earnedInc > 0 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                  : 'bg-gray-50 text-gray-500'
              }`}>
                <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                  {isTargetMet && earnedInc > 0 ? (
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  ) : (
                    <Clock size={13} className="text-gray-400 shrink-0" />
                  )}
                  <span>Incentive:</span>
                </div>
                <span className={`font-extrabold text-xs ${isTargetMet && earnedInc > 0 ? 'text-emerald-700' : 'text-gray-400'}`}>
                  {isTargetMet && earnedInc > 0 ? formattedEarnedInc : '₹0 (Not Met)'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Product Incentive Scheme Banner */}
      {incentive && (
        <div className="bg-gradient-to-r from-amber-50/90 via-orange-50/60 to-yellow-50/50 border border-amber-200/90 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/25 text-amber-700 flex items-center justify-center shrink-0">
              <Gift size={20} className="text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                  Product Incentive Scheme
                </h4>
                {incentive.type && (
                  <span className="px-2 py-0.5 bg-amber-100/90 text-amber-800 rounded-md text-[10px] font-extrabold uppercase border border-amber-200 tracking-wide">
                    {incentive.type}
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-900/70 font-medium mt-0.5">
                Staff reward rate payable upon achieving target goal for <span className="font-semibold text-amber-950">{selectedProduct}</span>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto shrink-0 bg-white/95 px-4 py-2.5 rounded-xl border border-amber-200/80 shadow-2xs">
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                Incentive Rate
              </span>
              <span className="text-sm font-extrabold text-amber-600">
                {incentive.formattedValue || (incentive.value !== undefined ? `${incentive.value}%` : '—')}
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700">
              <Coins size={16} />
            </div>
          </div>
        </div>
      )}

      {/* Real-time Automated Transaction Hooks Breakdown Grid */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#225091] flex items-center justify-center">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Real-Time Transaction Activity Breakdown</h3>
              <p className="text-[11px] text-gray-500">
                Aggregated from core banking receipts, field cash submissions, and executive lead books
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Credit Receipts */}
          <div className="bg-slate-50/70 border border-slate-200/60 rounded-xl p-3.5 flex flex-col justify-between gap-1">
            <div className="flex items-center justify-between text-gray-500">
              <span className="text-[11px] font-semibold">Credit Receipts</span>
              <Receipt size={14} className="text-emerald-600" />
            </div>
            <div className="mt-1">
              <div className="text-sm font-bold text-gray-900">
                {getBreakdownMetric(rawBreakdown.creditReceipts).formatted}
              </div>
              <div className="text-[10px] text-gray-400">
                {getBreakdownMetric(rawBreakdown.creditReceipts).subtext}
              </div>
            </div>
          </div>

          {/* Debit Receipts */}
          <div className="bg-slate-50/70 border border-slate-200/60 rounded-xl p-3.5 flex flex-col justify-between gap-1">
            <div className="flex items-center justify-between text-gray-500">
              <span className="text-[11px] font-semibold">Debit Receipts</span>
              <Receipt size={14} className="text-rose-500" />
            </div>
            <div className="mt-1">
              <div className="text-sm font-bold text-gray-900">
                {getBreakdownMetric(rawBreakdown.debitReceipts).formatted}
              </div>
              <div className="text-[10px] text-gray-400">
                {getBreakdownMetric(rawBreakdown.debitReceipts).subtext}
              </div>
            </div>
          </div>

          {/* Cash Submissions */}
          <div className="bg-slate-50/70 border border-slate-200/60 rounded-xl p-3.5 flex flex-col justify-between gap-1">
            <div className="flex items-center justify-between text-gray-500">
              <span className="text-[11px] font-semibold">Cash Submissions</span>
              <Wallet size={14} className="text-amber-600" />
            </div>
            <div className="mt-1">
              <div className="text-sm font-bold text-gray-900">
                {getBreakdownMetric(rawBreakdown.cashSubmissions).formatted}
              </div>
              <div className="text-[10px] text-gray-400">
                {getBreakdownMetric(rawBreakdown.cashSubmissions).subtext}
              </div>
            </div>
          </div>

          {/* Loans Disbursed */}
          <div className="bg-slate-50/70 border border-slate-200/60 rounded-xl p-3.5 flex flex-col justify-between gap-1">
            <div className="flex items-center justify-between text-gray-500">
              <span className="text-[11px] font-semibold">Loans Disbursed</span>
              <Award size={14} className="text-[#225091]" />
            </div>
            <div className="mt-1">
              <div className="text-sm font-bold text-gray-900">
                {getBreakdownMetric(rawBreakdown.loansDisbursed).formatted}
              </div>
              <div className="text-[10px] text-gray-400">
                {getBreakdownMetric(rawBreakdown.loansDisbursed).subtext}
              </div>
            </div>
          </div>

          {/* Leads Generated */}
          <div className="bg-slate-50/70 border border-slate-200/60 rounded-xl p-3.5 flex flex-col justify-between gap-1">
            <div className="flex items-center justify-between text-gray-500">
              <span className="text-[11px] font-semibold">Leads Sourced</span>
              <Users size={14} className="text-indigo-600" />
            </div>
            <div className="mt-1">
              <div className="text-sm font-bold text-gray-900">
                {getBreakdownMetric(rawBreakdown.leadsGenerated, true).formatted} leads
              </div>
              <div className="text-[10px] text-gray-400">
                Lead Book
              </div>
            </div>
          </div>

          {/* Manual Entries */}
          <div className="bg-slate-50/70 border border-slate-200/60 rounded-xl p-3.5 flex flex-col justify-between gap-1">
            <div className="flex items-center justify-between text-gray-500">
              <span className="text-[11px] font-semibold">Manual DWR</span>
              <FileText size={14} className="text-purple-600" />
            </div>
            <div className="mt-1">
              <div className="text-sm font-bold text-gray-900">
                {getBreakdownMetric(rawBreakdown.manualEntries).formatted}
              </div>
              <div className="text-[10px] text-gray-400">
                {getBreakdownMetric(rawBreakdown.manualEntries).subtext}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* All Assigned KPA Targets Overview Table */}
      {Array.isArray(kpaData?.targets) && kpaData.targets.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Target size={18} className="text-[#225091]" />
              <h3 className="text-sm font-bold text-gray-900">
                Assigned KPA Performance Targets (FY {selectedYear} - {selectedYear + 1})
              </h3>
            </div>
            <span className="text-xs text-gray-400 font-medium">
              {kpaData.targets.length} Assigned Products
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3">Target Type</th>
                  <th className="py-2.5 px-3 text-right">Annual Goal</th>
                  <th className="py-2.5 px-3 text-right">Annual Achieved</th>
                  <th className="py-2.5 px-3 text-center">Progress</th>
                  <th className="py-2.5 px-3 text-right">Earned Incentive</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {kpaData.targets.map((tgt, idx) => {
                  const isCount = tgt.targetType === 'COUNT';
                  const goalStr = tgt.yearly?.formattedGoal || (isCount ? tgt.targetValue : `₹${Number(tgt.targetValue || 0).toLocaleString('en-IN')}`);
                  const achievedStr = tgt.yearly?.formattedAchieved || (isCount ? tgt.yearly?.achieved : `₹${Number(tgt.yearly?.achieved || 0).toLocaleString('en-IN')}`);
                  const pct = tgt.yearly?.percentage ?? (tgt.targetValue > 0 ? Math.round(((tgt.yearly?.achieved || 0) / tgt.targetValue) * 100) : 0);
                  const incStr = tgt.yearly?.formattedEarnedIncentive || (tgt.yearly?.earnedIncentive ? `₹${Number(tgt.yearly.earnedIncentive).toLocaleString('en-IN')}` : '₹0');

                  return (
                    <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3 px-3 font-bold text-gray-900 flex items-center gap-2">
                        <span>{tgt.product}</span>
                        {tgt.incentive?.formattedValue && (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                            {tgt.incentive.formattedValue}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isCount ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {tgt.targetType}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-gray-800">{goalStr}</td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-600">{achievedStr}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          pct >= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-50 text-blue-800'
                        }`}>
                          {pct}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-extrabold text-amber-700">{incStr}</td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProduct(tgt.product);
                            window.scrollTo({ top: 300, behavior: 'smooth' });
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-[#225091] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        >
                          View Analytics
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default ViewReport;
