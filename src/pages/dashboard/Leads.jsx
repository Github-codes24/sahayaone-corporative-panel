import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  ChevronRight,
  Search,
  ChevronDown,
  Eye,
  X,
  SlidersHorizontal,
  Download,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Table,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Smartphone,
  Store,
  ExternalLink,
  FileCheck,
  IndianRupee,
  RefreshCw,
  User,
  MapPin,
  Calendar,
  Layers,
  Image as ImageIcon,
  RotateCcw,
  Filter,
  Building2,
  CreditCard,
  Landmark,
} from "lucide-react";
import { leadService } from "../../api/leadService";
import { societyCustomerService } from "../../api/societyCustomerService";
import branchService from "../../api/branchService";
import { employeeService } from "../../api/employeeService";
import useLocations from "../../hooks/useLocations";
import { isValidRazorpayAuthUrl } from "../../utils/razorpayUtils";
import PageHeader from "../../components/common/PageHeader";
import TableWrapper from "../../components/common/TableWrapper";
import StatsCard from "../../components/common/StatsCard";
import Pagination from "../../components/common/Pagination";
import ExportDropdown from "../../components/common/ExportDropdown";
import OnboardingFormsDrawer from '../../components/drawers/OnboardingFormsDrawer';

const loadRazorpayScript = () => new Promise((resolve) => {
  if (window.Razorpay) {
    resolve(true);
    return;
  }

  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

const getCustomerLoanIds = (lead) => {
  const customer = lead.customerDetails || lead.customer;
  const getId = (value) => (
    typeof value === 'string'
      ? value
      : value?._id || value?.id || null
  );

  return {
    loanId: String(lead.loanId || lead._id || lead.id || '').trim(),
    customerId: String(
      getId(lead.customerId)
      || getId(lead.customerDetails?.customerId)
      || getId(lead.customer?.customerId)
      || getId(customer)
      || ''
    ).trim(),
  };
};

const formatLoanLedgerValue = (key, value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return '—';
  if (key.toLowerCase().includes('amount')) {
    const amount = Number(value);
    return Number.isFinite(amount) ? `₹${amount.toLocaleString('en-IN')}` : String(value);
  }
  if (/(At|Date)$/i.test(key)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? String(value)
      : date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  return String(value);
};

const getLoanLedgerRecordFields = (record, sectionName) => {
  const fieldNames = sectionName === 'payments'
    ? ['paymentId', 'orderId', 'amount', 'paymentStatus', 'status', 'method', 'transferMode', 'transferStatus', 'capturedAt', 'createdAt']
    : ['transferId', 'paymentId', 'orderId', 'amount', 'status', 'transferStatus', 'transferMode', 'mode', 'createdAt'];

  return fieldNames
    .filter((fieldName) => record[fieldName] !== null && record[fieldName] !== undefined && record[fieldName] !== '')
    .filter((fieldName, index, fields) => !(fieldName === 'status' && fields.includes('paymentStatus')));
};

const formatLoanLedgerLabel = (key) => key
  .replace(/([A-Z])/g, ' $1')
  .replace(/^./, (character) => character.toUpperCase());

const getStatusBadge = (status) => {
  const normalized = (status || "").toUpperCase();
  switch (normalized) {
    case "PENDING_APPROVAL":
    case "NEW":
    case "PENDING_DOWN_PAYMENT":
    case "PENDING":
    case "SUBMITTED":
    case "CALCULATE":
    case "SLABS":
    case "BANK_ACCOUNT":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200/70 text-amber-700 text-[11px] font-bold tracking-wide uppercase whitespace-nowrap">
          <Clock size={11} /> {normalized === "PENDING_DOWN_PAYMENT" ? "Pending Down Payment" : normalized === "NEW" ? "New (Pending)" : "Pending Approval"}
        </span>
      );
    case "APPROVED":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-700 text-[11px] font-bold tracking-wide uppercase whitespace-nowrap">
          <CheckCircle2 size={11} /> Approved
        </span>
      );
    case "PENDING_BRANCH_PAYMENT":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-50 border border-orange-200/70 text-orange-700 text-[11px] font-bold tracking-wide uppercase whitespace-nowrap">
          <Clock size={11} /> Pending Settlement
        </span>
      );
    case "SETTLED":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200/70 text-teal-700 text-[11px] font-bold tracking-wide uppercase whitespace-nowrap">
          <CheckCircle2 size={11} /> Settled
        </span>
      );
    case "ACTIVE":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-[11px] font-bold tracking-wide uppercase whitespace-nowrap">
          <CheckCircle2 size={11} /> Active
        </span>
      );
    case "COMPLETED":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-[11px] font-bold tracking-wide uppercase whitespace-nowrap">
          Completed
        </span>
      );
    case "REJECTED":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200/60 text-rose-700 text-[11px] font-bold tracking-wide uppercase whitespace-nowrap">
          <XCircle size={11} /> Rejected
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-gray-700 text-[11px] font-bold tracking-wide uppercase whitespace-nowrap">
          {status || "N/A"}
        </span>
      );
  }
};

const getInitials = (name) => {
  if (!name) return "LD";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const Leads = ({ leadType: propLeadType, systemTitle: propSystemTitle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Resolve leadType from prop or pathname
  const path = location.pathname.toLowerCase();
  let currentLeadType = propLeadType;
  let resolvedTitle = propSystemTitle;

  if (!currentLeadType) {
    if (path.includes('/leads/customer') || path.includes('/leads/branch')) {
      currentLeadType = 'CUSTOMER';
      resolvedTitle = 'Customer';
    } else if (path.includes('/leads/merchant')) {
      currentLeadType = 'MERCHANT';
      resolvedTitle = 'Merchant';
    } else if (path.includes('/leads/sip')) {
      currentLeadType = 'SIP';
      resolvedTitle = 'Smart SIP';
    }
  } else if (!resolvedTitle) {
    if (currentLeadType === 'CUSTOMER' || currentLeadType === 'BRANCH') resolvedTitle = 'Customer';
    else if (currentLeadType === 'MERCHANT') resolvedTitle = 'Merchant';
    else if (currentLeadType === 'SIP') resolvedTitle = 'Smart SIP';
  }

  const isCustomerSystem = currentLeadType === 'CUSTOMER';
  const isMerchantSystem = currentLeadType === 'MERCHANT';

  // Read initial filter values from URL
  const initialSearch = searchParams.get("search") || "";
  const initialStatus = searchParams.get("status") || "";
  const initialDateFrom = searchParams.get("startDate") || searchParams.get("dateFrom") || "";
  const initialDateTo = searchParams.get("endDate") || searchParams.get("dateTo") || "";
  const initialState = searchParams.get("state") || "";
  const initialCity = searchParams.get("city") || "";
  const initialBranch = searchParams.get("branch") || "ALL";
  const initialExecutive = searchParams.get("executive") || "ALL";
  const initialPage = parseInt(searchParams.get("page"), 10) || 1;

  // Data states
  const [leads, setLeads] = useState([]);
  const [masterLeads, setMasterLeads] = useState([]);
  const [branchesList, setBranchesList] = useState([]);
  const [executivesList, setExecutivesList] = useState([]);
  const [stats, setStats] = useState({
    totalLeads: 0,
    pendingLeads: 0,
    approvedLeads: 0,
    activeLeads: 0,
    completedLeads: 0,
    rejectedLeads: 0,
    totalBusinessVolume: 0,
    pendingSettlementLeads: 0,
    settledLeads: 0,
    pendingSettlementAmount: 0,
    totalSettledAmount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isFormsOverviewOpen, setIsFormsOverviewOpen] = useState(false);
  const [formsReferenceId, setFormsReferenceId] = useState(null);
  const [payingLoanId, setPayingLoanId] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);
  const paymentInProgressRef = useRef(false);
  const [mandateLoan, setMandateLoan] = useState(null);
  const [mandateMaxAmount, setMandateMaxAmount] = useState('');
  const [mandateAuthType, setMandateAuthType] = useState('NETBANKING');
  const [submittingMandate, setSubmittingMandate] = useState(false);
  const [loanLedgerLead, setLoanLedgerLead] = useState(null);
  const [loanLedgerData, setLoanLedgerData] = useState(null);
  const [loanLedgerLoading, setLoanLedgerLoading] = useState(false);
  const [loanLedgerError, setLoanLedgerError] = useState('');

  // Pagination states
  const [page, setPage] = useState(initialPage);
  const [limit] = useState(10);
  const [meta, setMeta] = useState({
    totalRecords: 0,
    totalPages: 1,
    page: initialPage,
    limit: 10,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [selectedStatus, setSelectedStatus] = useState(initialStatus);
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);
  const [selectedState, setSelectedState] = useState(initialState);
  const [selectedCity, setSelectedCity] = useState(initialCity);
  const [selectedBranch, setSelectedBranch] = useState(initialBranch);
  const [selectedExecutive, setSelectedExecutive] = useState(initialExecutive);
  const { states: statesList, availableCities, loading: locationsLoading } = useLocations(selectedState);

  // Fetch branches and executives
  useEffect(() => {
    (async () => {
      try {
        const [bRes, eRes] = await Promise.all([
          branchService.list({ limit: 100 }).catch(() => ({ data: [] })),
          employeeService.list({ limit: 100 }).catch(() => ({ data: [] }))
        ]);
        const bList = Array.isArray(bRes?.data) ? bRes.data : bRes?.data?.branches || bRes?.data?.items || bRes?.branches || [];
        const eList = Array.isArray(eRes?.data) ? eRes.data : eRes?.data?.employees || eRes?.data?.items || eRes?.employees || [];
        setBranchesList(bList);
        setExecutivesList(eList);
      } catch (err) {
        console.warn("Failed fetching branches / executives for Leads:", err);
      }
    })();
  }, []);

  // Compute Month-to-Date (MTD) Leads
  const mtdLeads = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const targetList = masterLeads.length > 0 ? masterLeads : leads;
    return targetList.filter(l => {
      const d = l.createdAt ? new Date(l.createdAt) : null;
      return d && !isNaN(d.getTime()) && d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    }).length;
  }, [masterLeads, leads]);

  // Client-side filtering when backend params are active
  const displayedLeads = useMemo(() => {
    return leads.filter(lead => {
      if (selectedBranch && selectedBranch !== 'ALL') {
        const bId = lead.branchId || (typeof lead.branch === 'object' ? (lead.branch?._id || lead.branch?.id) : lead.branch);
        const bName = lead.branchName || (typeof lead.branch === 'object' ? lead.branch?.name : '');
        if (bId !== selectedBranch && bName !== selectedBranch) return false;
      }
      if (selectedExecutive && selectedExecutive !== 'ALL') {
        const execId = lead.executiveId || lead.assignedTo || lead.employeeId || (typeof lead.executive === 'object' ? (lead.executive?._id || lead.executive?.id) : lead.executive);
        const execName = lead.executiveName || lead.assignedToName || (typeof lead.executive === 'object' ? lead.executive?.name : '');
        if (execId !== selectedExecutive && execName !== selectedExecutive) return false;
      }
      if (selectedCity && selectedCity !== 'ALL' && selectedCity !== '') {
        const city = lead.city || lead.customerDetails?.city || lead.customer?.city || lead.address?.city || '';
        if (city && !city.toLowerCase().includes(selectedCity.toLowerCase())) return false;
      }
      return true;
    });
  }, [leads, selectedBranch, selectedExecutive, selectedCity]);

  // Status Card Click Handler with Toggle
  const handleStatusCardClick = (statusKey) => {
    if (selectedStatus === statusKey) {
      setSelectedStatus(""); // Toggle off -> show all
    } else {
      setSelectedStatus(statusKey);
    }
    setPage(1);
  };

  // 1B. Manual Approve Modal State
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [leadToApprove, setLeadToApprove] = useState(null);
  const [approveRemarks, setApproveRemarks] = useState("");
  const [approveSubmitting, setApproveSubmitting] = useState(false);

  // 1C. Manual Reject Modal State
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [leadToReject, setLeadToReject] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  // 2B. Settle Merchant Modal State
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [leadToSettle, setLeadToSettle] = useState(null);
  const [settleTxnRef, setSettleTxnRef] = useState("");
  const [settleRemarks, setSettleRemarks] = useState("");
  const [settleSubmitting, setSettleSubmitting] = useState(false);

  // KYC Image Preview Modal
  const [previewImage, setPreviewImage] = useState(null);
  const [previewTitle, setPreviewTitle] = useState("");

  // Quick Detail Drawer/Modal
  const [quickDetailLead, setQuickDetailLead] = useState(null);

  // Sync state changes to URL search params
  useEffect(() => {
    const params = {};
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
    if (selectedStatus) params.status = selectedStatus;
    if (dateFrom) params.startDate = dateFrom;
    if (dateTo) params.endDate = dateTo;
    if (selectedState) params.state = selectedState;
    if (selectedCity && selectedCity !== 'ALL') params.city = selectedCity;
    if (selectedBranch && selectedBranch !== 'ALL') params.branch = selectedBranch;
    if (selectedExecutive && selectedExecutive !== 'ALL') params.executive = selectedExecutive;
    if (page > 1) params.page = page.toString();

    setSearchParams(params, { replace: true });
  }, [
    debouncedSearch,
    selectedStatus,
    dateFrom,
    dateTo,
    selectedState,
    selectedCity,
    selectedBranch,
    selectedExecutive,
    page,
    setSearchParams,
  ]);

  // Sync URL changes from browser navigation
  useEffect(() => {
    const urlSearch = searchParams.get("search") || "";
    const urlStatus = searchParams.get("status") || "";
    const urlDateFrom = searchParams.get("startDate") || searchParams.get("dateFrom") || "";
    const urlDateTo = searchParams.get("endDate") || searchParams.get("dateTo") || "";
    const urlState = searchParams.get("state") || "";
    const urlCity = searchParams.get("city") || "";
    const urlBranch = searchParams.get("branch") || "ALL";
    const urlExec = searchParams.get("executive") || "ALL";
    const urlPage = parseInt(searchParams.get("page"), 10) || 1;

    if (urlSearch !== debouncedSearch) {
      setSearchTerm(urlSearch);
      setDebouncedSearch(urlSearch);
    }
    if (urlStatus !== selectedStatus) setSelectedStatus(urlStatus);
    if (urlDateFrom !== dateFrom) setDateFrom(urlDateFrom);
    if (urlDateTo !== dateTo) setDateTo(urlDateTo);
    if (urlState !== selectedState) setSelectedState(urlState);
    if (urlCity !== selectedCity) setSelectedCity(urlCity);
    if (urlBranch !== selectedBranch) setSelectedBranch(urlBranch);
    if (urlExec !== selectedExecutive) setSelectedExecutive(urlExec);
    if (urlPage !== page) setPage(urlPage);
  }, [searchParams]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch leads according to API
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
      };

      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (selectedStatus && selectedStatus !== 'ALL') {
        if (selectedStatus === 'PENDING_BRANCH_PAYMENT' || selectedStatus === 'PENDING_SETTLEMENT') {
          params.settlementStatus = 'PENDING_BRANCH_PAYMENT';
          params.status = 'PENDING_BRANCH_PAYMENT';
        } else if (selectedStatus === 'SETTLED_BY_BRANCH' || selectedStatus === 'SETTLED') {
          params.settlementStatus = 'SETTLED_BY_BRANCH';
          params.status = 'SETTLED_BY_BRANCH';
        } else if (selectedStatus === 'PENDING_APPROVAL') {
          params.status = 'PENDING_APPROVAL';
          params.approvalStatus = 'PENDING_APPROVAL';
        } else if (selectedStatus === 'APPROVED') {
          params.status = 'APPROVED';
          params.approvalStatus = 'APPROVED';
        } else if (selectedStatus === 'ACTIVE') {
          params.status = 'ACTIVE';
        } else {
          params.status = selectedStatus;
          params.approvalStatus = selectedStatus;
        }
      }
      if (dateFrom) params.startDate = dateFrom;
      if (dateTo) params.endDate = dateTo;
      if (selectedState) params.state = selectedState;
      if (selectedCity) params.city = selectedCity;

      let res;
      if (isCustomerSystem) {
        // 1A. List Customer System Leads (GET /api/v1/employee/leads/customer-system)
        res = await leadService.listCustomerSystemLeads(params);
      } else if (isMerchantSystem) {
        // 2A. List Merchant System Leads (GET /api/v1/employee/leads/merchant-system)
        res = await leadService.listMerchantSystemLeads(params);
      } else {
        if (currentLeadType) params.leadType = currentLeadType;
        res = await leadService.list(params);
      }

      if (res && res.success) {
        const rawItems = Array.isArray(res.data) ? res.data : (res.data?.items || res.items || []);
        setLeads(rawItems);

        const apiStats = res.stats || res.data?.stats;
        if (apiStats && typeof apiStats === 'object' && Object.keys(apiStats).length > 0) {
          setStats(prev => {
            const isPrevAllZeros = !prev || (prev.totalLeads === 0 && prev.pendingLeads === 0 && prev.approvedLeads === 0);
            if (!selectedStatus || selectedStatus === 'ALL' || isPrevAllZeros) {
              return { 
                ...prev, 
                ...apiStats,
                pendingSettlementLeads: apiStats.pendingSettlementLeads ?? apiStats.pendingSettlement ?? 0,
                settledLeads: apiStats.settledLeads ?? apiStats.settled ?? 0,
                approvedLeads: apiStats.approvedLeads ?? 0,
                activeLeads: apiStats.activeLeads ?? 0,
                totalBusinessVolume: apiStats.totalBusinessVolume ?? 0,
                pendingSettlementAmount: apiStats.pendingSettlementAmount ?? 0,
                totalSettledAmount: apiStats.totalSettledAmount ?? 0
              };
            }
            return prev;
          });
        }

        // Store master list when unfiltered
        if (!selectedStatus || selectedStatus === 'ALL') {
          setMasterLeads(rawItems);
          if ((!apiStats || Object.keys(apiStats).length === 0) && rawItems.length > 0) {
            // Compute client fallback stats from unfiltered data
            setStats({
              totalLeads: rawItems.length,
              pendingLeads: rawItems.filter(l => (l.status || l.approvalStatus || '').toUpperCase().includes('PENDING') || (l.currentStep || '').toUpperCase() === 'SUBMITTED').length,
              approvedLeads: rawItems.filter(l => (l.status || l.approvalStatus || '').toUpperCase() === 'APPROVED').length,
              activeLeads: rawItems.filter(l => (l.status || '').toUpperCase() === 'ACTIVE').length,
              completedLeads: rawItems.filter(l => (l.status || '').toUpperCase() === 'COMPLETED').length,
              rejectedLeads: rawItems.filter(l => (l.status || '').toUpperCase() === 'REJECTED').length,
              pendingSettlementLeads: rawItems.filter(l => {
                const s = (l.settlementDetails?.settlementStatus || l.settlementStatus || l.status || '').toUpperCase();
                return s === 'PENDING_BRANCH_PAYMENT' || s.includes('PENDING');
              }).length,
              settledLeads: rawItems.filter(l => {
                const s = (l.settlementDetails?.settlementStatus || l.settlementStatus || l.status || '').toUpperCase();
                return s === 'SETTLED_BY_BRANCH' || s === 'SETTLED';
              }).length,
              pendingSettlementAmount: rawItems.filter(l => {
                const s = (l.settlementDetails?.settlementStatus || l.settlementStatus || l.status || '').toUpperCase();
                return s === 'PENDING_BRANCH_PAYMENT' || s.includes('PENDING');
              }).reduce((sum, l) => sum + (l.settlementDetails?.netDisbursalAmount || l.financialDetails?.totalLoanAmount || 0), 0),
              totalSettledAmount: rawItems.filter(l => {
                const s = (l.settlementDetails?.settlementStatus || l.settlementStatus || l.status || '').toUpperCase();
                return s === 'SETTLED_BY_BRANCH' || s === 'SETTLED';
              }).reduce((sum, l) => sum + (l.settlementDetails?.netDisbursalAmount || l.financialDetails?.totalLoanAmount || 0), 0),
              totalBusinessVolume: rawItems.reduce((acc, l) => acc + (l.financialDetails?.totalLoanAmount || l.productDetails?.productPrice || 0), 0),
            });
          }
        } else if (stats.totalLeads === 0) {
          // If refreshed with status in URL, fetch master stats in background
          (async () => {
            try {
              let masterRes;
              if (isCustomerSystem) masterRes = await leadService.listCustomerSystemLeads({ page: 1, limit: 100 });
              else if (isMerchantSystem) masterRes = await leadService.listMerchantSystemLeads({ page: 1, limit: 100 });
              if (masterRes && masterRes.success) {
                const mItems = Array.isArray(masterRes.data) ? masterRes.data : (masterRes.data?.items || []);
                setMasterLeads(mItems);
                if (masterRes.stats) {
                  setStats(masterRes.stats);
                } else if (mItems.length > 0) {
                  setStats({
                    totalLeads: mItems.length,
                    pendingLeads: mItems.filter(l => (l.status || l.approvalStatus || '').toUpperCase().includes('PENDING') || (l.currentStep || '').toUpperCase() === 'SUBMITTED').length,
                    approvedLeads: mItems.filter(l => (l.status || l.approvalStatus || '').toUpperCase() === 'APPROVED').length,
                    activeLeads: mItems.filter(l => (l.status || '').toUpperCase() === 'ACTIVE').length,
                    completedLeads: mItems.filter(l => (l.status || '').toUpperCase() === 'COMPLETED').length,
                    rejectedLeads: mItems.filter(l => (l.status || '').toUpperCase() === 'REJECTED').length,
                    pendingSettlementLeads: mItems.filter(l => (l.settlementDetails?.settlementStatus || '').toUpperCase().includes('PENDING')).length,
                    settledLeads: mItems.filter(l => (l.settlementDetails?.settlementStatus || l.status || '').toUpperCase() === 'SETTLED').length,
                    pendingSettlementAmount: mItems.filter(l => (l.settlementDetails?.settlementStatus || '').toUpperCase().includes('PENDING')).reduce((sum, l) => sum + (l.settlementDetails?.netDisbursalAmount || l.financialDetails?.totalLoanAmount || 0), 0),
                    totalSettledAmount: mItems.filter(l => (l.settlementDetails?.settlementStatus || '').toUpperCase() === 'SETTLED').reduce((sum, l) => sum + (l.settlementDetails?.netDisbursalAmount || l.financialDetails?.totalLoanAmount || 0), 0),
                    totalBusinessVolume: mItems.reduce((acc, l) => acc + (l.financialDetails?.totalLoanAmount || l.productDetails?.productPrice || 0), 0),
                  });
                }
              }
            } catch (e) {
              console.warn("Background master stats fetch error:", e);
            }
          })();
        }

        const metaObj = res.meta || res.pagination || res.data?.meta || res.data?.pagination || {};
        const totalRecords = metaObj.totalRecords ?? metaObj.total ?? rawItems.length;
        const totalPages = metaObj.totalPages ?? Math.ceil(totalRecords / (metaObj.limit || limit)) ?? 1;
        const currentPage = metaObj.page ?? page;

        setMeta({
          totalRecords,
          totalPages,
          page: currentPage,
          limit: metaObj.limit ?? limit,
          hasNextPage: metaObj.hasNextPage ?? (currentPage < totalPages),
          hasPrevPage: metaObj.hasPrevPage ?? (currentPage > 1),
        });
      } else {
        setLeads([]);
      }
    } catch (err) {
      console.error("Failed to fetch leads:", err);
      const errMsg = err.response?.data?.message || "Failed to fetch leads.";
      toast.error(errMsg);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    limit,
    debouncedSearch,
    selectedStatus,
    dateFrom,
    dateTo,
    selectedState,
    selectedCity,
    isCustomerSystem,
    isMerchantSystem,
    currentLeadType,
  ]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // 1B. Handle Manual Approve Customer Lead (POST /api/v1/employee/leads/:id/approve)
  const handleApproveCustomer = async (e) => {
    e.preventDefault();
    const leadId = leadToApprove?.loanId || leadToApprove?._id || leadToApprove?.id;
    if (!leadId) return;

    setApproveSubmitting(true);
    try {
      const res = await leadService.approveCustomerLead(leadId, {
        remarks: approveRemarks.trim() || "Manually verified income documents and approved by Branch Manager",
      });
      if (res && (res.success || res.statusCode === 200)) {
        toast.success(res.message || "Customer loan lead approved successfully!");
        setIsApproveModalOpen(false);
        setLeadToApprove(null);
        setApproveRemarks("");
        fetchLeads();
      } else {
        throw new Error(res.message || "Approval failed.");
      }
    } catch (err) {
      console.error("Failed to approve customer lead:", err);
      toast.error(err.response?.data?.message || err.message || "Failed to approve lead.");
    } finally {
      setApproveSubmitting(false);
    }
  };

  const handlePayEmi = async (lead) => {
    if (paymentInProgressRef.current) return;

    const { loanId, customerId } = getCustomerLoanIds(lead);

    if (!loanId) {
      setPaymentResult({
        success: false,
        title: 'Unable to start EMI payment',
        message: 'Loan ID is missing for this customer.',
      });
      return;
    }

    if (!customerId) {
      setPaymentResult({
        success: false,
        title: 'Unable to start EMI payment',
        message: 'Customer ID is missing from this loan record. Please refresh the customer list or contact support.',
      });
      return;
    }

    paymentInProgressRef.current = true;
    setPayingLoanId(loanId);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Razorpay Checkout could not be loaded. Check your internet connection and try again.');
      }

      const initiateResponse = await societyCustomerService.initiateLoanPayment(customerId, loanId, {
        paymentType: 'REGULAR',
        installmentCount: 1,
        createPaymentLink: true,
      });
      const order = initiateResponse?.data;
      if (!initiateResponse?.success || !order?.orderId || !order?.keyId || !Number.isFinite(Number(order.amount)) || Number(order.amount) <= 0) {
        const error = new Error(initiateResponse?.message || 'The EMI payment order could not be created.');
        error.code = initiateResponse?.errorCode;
        throw error;
      }

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: Math.round(Number(order.amount) * 100),
        currency: order.currency || 'INR',
        name: order.societyName || 'Cooperative Credit Society',
        description: 'Loan EMI Payment (REGULAR)',
        order_id: order.orderId,
        handler: async (razorpayResponse) => {
          try {
            const verifyResponse = await societyCustomerService.verifyLoanPayment(customerId, loanId, {
              razorpay_order_id: razorpayResponse.razorpay_order_id || order.orderId,
              razorpay_payment_id: razorpayResponse.razorpay_payment_id,
              razorpay_signature: razorpayResponse.razorpay_signature,
              paymentType: order.paymentType || 'REGULAR',
              installmentCount: 1,
            });
            if (!verifyResponse?.success) {
              throw new Error(verifyResponse?.message || 'Payment verification failed.');
            }

            setPaymentResult({
              success: true,
              title: 'EMI payment successful',
              message: verifyResponse.data?.message || verifyResponse.message || 'Payment verified and EMI allocated successfully.',
              paymentId: razorpayResponse.razorpay_payment_id,
            });
            fetchLeads();
          } catch (error) {
            console.error('EMI payment verification failed:', error);
            setPaymentResult({
              success: false,
              title: 'Payment verification failed',
              message: error.response?.data?.message || error.message || 'Payment was received, but verification failed. Please contact support.',
              paymentId: razorpayResponse.razorpay_payment_id,
            });
          } finally {
            paymentInProgressRef.current = false;
            setPayingLoanId(null);
          }
        },
        prefill: {
          name: lead.customerDetails?.fullName || lead.customerName || lead.name || '',
          contact: lead.customerDetails?.phoneNumber || lead.phoneNumber || '',
        },
        theme: { color: '#225091' },
        modal: {
          ondismiss: () => {
            paymentInProgressRef.current = false;
            setPayingLoanId(null);
          },
        },
      });

      checkout.on('payment.failed', (response) => {
        paymentInProgressRef.current = false;
        setPayingLoanId(null);
        setPaymentResult({
          success: false,
          title: 'EMI payment failed',
          message: response.error?.description || response.error?.reason || 'Payment could not be completed. Please try again.',
        });
      });
      checkout.open();
    } catch (error) {
      console.error('Failed to initiate EMI payment:', error);
      const isEsignPending = error.code === 'CUSTOMER_ESIGN_PENDING'
        || error.response?.data?.errorCode === 'CUSTOMER_ESIGN_PENDING';
      setPaymentResult({
        success: false,
        title: isEsignPending ? 'E-signature required' : 'Unable to start EMI payment',
        message: isEsignPending
          ? error.response?.data?.message || error.message || 'Please complete the mandatory onboarding e-sign forms before paying EMI.'
          : error.response?.data?.message || error.message || 'Failed to initiate EMI payment.',
        completeForms: isEsignPending,
        referenceId: lead.id || lead._id || lead.loanId || lead.referenceId,
      });
      paymentInProgressRef.current = false;
      setPayingLoanId(null);
    }
  };

  const handleInitiateLoanMandate = async (event) => {
    event.preventDefault();
    if (!mandateLoan || submittingMandate) return;

    const { customerId, loanId } = getCustomerLoanIds(mandateLoan);
    const maxAmount = Number(mandateMaxAmount);
    if (!customerId || !loanId) {
      toast.error(!customerId ? 'Customer ID is missing from this loan record.' : 'Loan ID is missing for this customer.');
      return;
    }
    if (!Number.isFinite(maxAmount) || maxAmount <= 0) {
      toast.error('Enter a valid maximum mandate amount.');
      return;
    }
    if (!['NETBANKING', 'DEBITCARD', 'AADHAAR', 'UPI'].includes(mandateAuthType)) {
      toast.error('Select a valid authorization method.');
      return;
    }

    const mandateWindow = window.open('about:blank', '_blank');
    if (!mandateWindow) {
      toast.error('Please allow pop-ups to open the Razorpay mandate page.');
      return;
    }
    mandateWindow.opener = null;
    setSubmittingMandate(true);

    try {
      const response = await societyCustomerService.initiateLoanMandate(customerId, loanId, {
        maxAmount,
        authType: mandateAuthType,
      });
      const authorizationUrl = response?.data?.razorpayMandateUrl || response?.data?.interactiveWebviewUrl;
      if (!response?.success || typeof authorizationUrl !== 'string') {
        throw new Error(response?.message || 'The mandate authorization URL was not provided.');
      }

      if (!isValidRazorpayAuthUrl(authorizationUrl)) {
        throw new Error('The mandate authorization URL is invalid.');
      }

      mandateWindow.location.href = authorizationUrl;
      setMandateLoan(null);
      setMandateMaxAmount('');
      setMandateAuthType('NETBANKING');
    } catch (error) {
      console.error('Failed to initiate customer loan mandate:', error);
      mandateWindow.close();
      toast.error(error.response?.data?.message || error.message || 'Failed to initiate e-Mandate.');
    } finally {
      setSubmittingMandate(false);
    }
  };

  const handleViewLoanLedger = async (lead) => {
    const { customerId, loanId } = getCustomerLoanIds(lead);
    if (!customerId || !loanId) {
      toast.error(!customerId ? 'Customer ID is missing from this loan record.' : 'Loan ID is missing for this customer.');
      return;
    }

    setLoanLedgerLead(lead);
    setLoanLedgerData(null);
    setLoanLedgerError('');
    setLoanLedgerLoading(true);
    try {
      const response = await societyCustomerService.getLoanCollections(customerId, loanId);
      if (!response?.success || !response.data) {
        throw new Error(response?.message || 'The loan collections ledger was not provided.');
      }
      setLoanLedgerData(response.data);
    } catch (error) {
      console.error('Failed to load customer loan collections ledger:', error);
      setLoanLedgerError(error.response?.data?.message || error.message || 'Failed to load loan collections ledger.');
    } finally {
      setLoanLedgerLoading(false);
    }
  };

  // 1C. Handle Manual Reject Customer Lead (POST /api/v1/employee/leads/:id/reject)
  const handleRejectCustomer = async (e) => {
    e.preventDefault();
    const leadId = leadToReject?.loanId || leadToReject?._id || leadToReject?.id;
    if (!leadId) return;

    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejecting this loan request.");
      return;
    }

    setRejectSubmitting(true);
    try {
      const res = await leadService.rejectCustomerLead(leadId, {
        reason: rejectReason.trim(),
      });
      if (res && (res.success || res.statusCode === 200)) {
        toast.success(res.message || "Customer loan lead rejected.");
        setIsRejectModalOpen(false);
        setLeadToReject(null);
        setRejectReason("");
        fetchLeads();
      } else {
        throw new Error(res.message || "Rejection failed.");
      }
    } catch (err) {
      console.error("Failed to reject customer lead:", err);
      toast.error(err.response?.data?.message || err.message || "Failed to reject lead.");
    } finally {
      setRejectSubmitting(false);
    }
  };

  // 2B. Handle Next-Day Merchant Settlement (POST /api/v1/employee/leads/:id/settle-merchant)
  const handleSettleMerchant = async (e) => {
    e.preventDefault();
    const leadId = leadToSettle?.loanId || leadToSettle?._id || leadToSettle?.id;
    if (!leadId) return;

    if (!settleTxnRef.trim()) {
      toast.error("Please enter the Payment Transaction / UTR Reference number.");
      return;
    }

    setSettleSubmitting(true);
    try {
      const res = await leadService.settleMerchantLead(leadId, {
        paymentTxnRef: settleTxnRef.trim(),
        remarks: settleRemarks.trim() || "Next day loan disbursal paid to Merchant Bank Account",
      });
      if (res && (res.success || res.statusCode === 200)) {
        toast.success(res.message || "Merchant settlement executed successfully!");
        setIsSettleModalOpen(false);
        setLeadToSettle(null);
        setSettleTxnRef("");
        setSettleRemarks("");
        fetchLeads();
      } else {
        throw new Error(res.message || "Settlement failed.");
      }
    } catch (err) {
      console.error("Failed to settle merchant lead:", err);
      toast.error(err.response?.data?.message || err.message || "Failed to execute settlement.");
    } finally {
      setSettleSubmitting(false);
    }
  };

  const tableRef = useRef(null);
  const exportDropdownRef = useRef(null);
  const [isExportOpen, setIsExportOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
        setIsExportOpen(false);
      }
    };
    if (isExportOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isExportOpen]);

  const getSelectedDataFromTable = () => {
    if (!tableRef.current) return { headers: [], rows: [] };
    const table = tableRef.current;

    const ths = Array.from(table.querySelectorAll("thead th"));
    const headers = ths
      .slice(0, -1)
      .map((th) => th.innerText.trim().replace(/\n/g, " "));

    const trs = Array.from(table.querySelectorAll("tbody tr"));
    const rows = trs.map((tr) => {
      const tds = Array.from(tr.querySelectorAll("td"));
      return tds
        .slice(0, -1)
        .map((td) => td.innerText.trim().replace(/\n/g, " "));
    });

    return { headers, rows };
  };

  const exportToCSV = () => {
    const { headers, rows } = getSelectedDataFromTable();
    if (!headers.length || !rows.length) {
      toast.warning("No data available to export");
      return;
    }
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((v) => '"' + (v || "").replace(/"/g, '""') + '"').join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${resolvedTitle || 'Leads'}_Export.csv`;
    link.click();
    setIsExportOpen(false);
  };

  const exportToExcel = () => {
    const { headers, rows } = getSelectedDataFromTable();
    if (!headers.length || !rows.length) {
      toast.warning("No data available to export");
      return;
    }
    const tableHtml = `
      <table border="1">
        <thead>
          <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows.map((row) => `<tr>${row.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    `;
    const blob = new Blob([tableHtml], { type: "application/vnd.ms-excel" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${resolvedTitle || 'Leads'}_Export.xls`;
    link.click();
    setIsExportOpen(false);
  };

  const exportToWord = () => {
    const { headers, rows } = getSelectedDataFromTable();
    if (!headers.length || !rows.length) {
      toast.warning("No data available to export");
      return;
    }
    const tableHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>${resolvedTitle || 'Leads'} Export</title></head><body>
      <table border="1">
        <thead>
          <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows.map((row) => `<tr>${row.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
      </body></html>
    `;
    const blob = new Blob([tableHtml], { type: "application/msword" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${resolvedTitle || 'Leads'}_Export.doc`;
    link.click();
    setIsExportOpen(false);
  };

  return (
    <div className="w-full">
      {/* Page Header */}
      <div className="mb-6">
        <PageHeader
          title={
            isCustomerSystem 
              ? "Customer Lead System" 
              : isMerchantSystem 
              ? "Merchant Lead System & Disbursals" 
              : `${resolvedTitle || 'Leads'} Management`
          }
          breadcrumbs={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "CRM Management" },
            { label: "Leads", to: "/leads" },
            ...(resolvedTitle ? [{ label: resolvedTitle }] : [])
          ]}
          showBack={true}
          backUrl={isCustomerSystem || isMerchantSystem ? "/leads" : "/dashboard"}
        />
      </div>

      {/* Dynamic Stats Cards directly from API stats object */}
      {stats && (
        <div className="mb-6">
          {isCustomerSystem ? (
            /* 1A. Customer System Stats */
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3.5">
              <StatsCard
                layout="centered"
                label="Total Leads"
                value={stats.totalLeads ?? 0}
                sublabel={`MTD: ${mtdLeads}`}
                color="blue"
                loading={loading && stats.totalLeads === 0}
                isActive={!selectedStatus}
                onClick={() => handleStatusCardClick("")}
              />
              <StatsCard
                layout="centered"
                label="Pending Approval"
                value={stats.pendingLeads ?? 0}
                color="amber"
                loading={loading && stats.totalLeads === 0}
                isActive={selectedStatus === "PENDING_APPROVAL"}
                onClick={() => handleStatusCardClick("PENDING_APPROVAL")}
              />
              <StatsCard
                layout="centered"
                label="Approved"
                value={stats.approvedLeads ?? 0}
                color="emerald"
                loading={loading && stats.totalLeads === 0}
                isActive={selectedStatus === "APPROVED"}
                onClick={() => handleStatusCardClick("APPROVED")}
              />
              <StatsCard
                layout="centered"
                label="Active"
                value={stats.activeLeads ?? 0}
                color="cyan"
                loading={loading && stats.totalLeads === 0}
                isActive={selectedStatus === "ACTIVE"}
                onClick={() => handleStatusCardClick("ACTIVE")}
              />
              <StatsCard
                layout="centered"
                label="Completed"
                value={stats.completedLeads ?? 0}
                color="indigo"
                loading={loading && stats.totalLeads === 0}
                isActive={selectedStatus === "COMPLETED"}
                onClick={() => handleStatusCardClick("COMPLETED")}
              />
              <StatsCard
                layout="centered"
                label="Rejected"
                value={stats.rejectedLeads ?? 0}
                color="rose"
                loading={loading && stats.totalLeads === 0}
                isActive={selectedStatus === "REJECTED"}
                onClick={() => handleStatusCardClick("REJECTED")}
              />
              <div className="bg-gradient-to-tr from-[#1b58a6] to-[#2563eb] rounded-2xl p-4 shadow-sm flex flex-col items-center justify-center text-white">
                <span className="text-xl font-black leading-none mb-1">
                  {loading && stats.totalLeads === 0 ? <Loader2 size={18} className="animate-spin text-white/70" /> : `₹${Number(stats.totalBusinessVolume || 0).toLocaleString('en-IN')}`}
                </span>
                <span className="text-[10px] font-bold text-blue-100 uppercase tracking-wider text-center">
                  Total Volume
                </span>
              </div>
            </div>
          ) : isMerchantSystem ? (
            /* 2A. Merchant System Stats */
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
              <StatsCard
                layout="centered"
                label="Total Leads"
                value={stats.totalLeads ?? 0}
                sublabel={`MTD: ${mtdLeads}`}
                color="purple"
                loading={loading && stats.totalLeads === 0}
                isActive={!selectedStatus}
                onClick={() => handleStatusCardClick("")}
              />
              <StatsCard
                layout="centered"
                label="Pending Settlement"
                value={stats.pendingSettlementLeads ?? 0}
                sublabel={`₹${Number(stats.pendingSettlementAmount || 0).toLocaleString('en-IN')}`}
                color="amber"
                loading={loading && stats.totalLeads === 0}
                isActive={selectedStatus === "PENDING_BRANCH_PAYMENT"}
                onClick={() => handleStatusCardClick("PENDING_BRANCH_PAYMENT")}
              />
              <StatsCard
                layout="centered"
                label="Settled Leads"
                value={stats.settledLeads ?? 0}
                sublabel={`₹${Number(stats.totalSettledAmount || 0).toLocaleString('en-IN')}`}
                color="teal"
                loading={loading && stats.totalLeads === 0}
                isActive={selectedStatus === "SETTLED_BY_BRANCH" || selectedStatus === "SETTLED"}
                onClick={() => handleStatusCardClick("SETTLED_BY_BRANCH")}
              />
              <StatsCard
                layout="centered"
                label="Approved"
                value={stats.approvedLeads ?? 0}
                color="emerald"
                loading={loading && stats.totalLeads === 0}
                isActive={selectedStatus === "APPROVED"}
                onClick={() => handleStatusCardClick("APPROVED")}
              />
              <StatsCard
                layout="centered"
                label="Active"
                value={stats.activeLeads ?? 0}
                color="cyan"
                loading={loading && stats.totalLeads === 0}
                isActive={selectedStatus === "ACTIVE"}
                onClick={() => handleStatusCardClick("ACTIVE")}
              />
              <div className="bg-gradient-to-tr from-[#6b21a8] to-[#9333ea] rounded-2xl p-4 shadow-sm flex flex-col items-center justify-center text-white">
                <span className="text-xl font-black leading-none mb-1">
                  {loading && stats.totalLeads === 0 ? <Loader2 size={18} className="animate-spin text-white/70" /> : `₹${Number(stats.totalBusinessVolume || 0).toLocaleString('en-IN')}`}
                </span>
                <span className="text-[10px] font-bold text-purple-100 uppercase tracking-wider text-center">
                  Total Volume
                </span>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Harmonized 2-Tier Executive Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-sm space-y-3.5 mb-6">
        {/* Tier 1: Search & Primary Action Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Prominent Search Bar */}
          <div className="relative flex-1 min-w-[280px] max-w-xl">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder={
                isCustomerSystem 
                  ? "Search by Application ID, Customer Name, Phone, PAN, Aadhaar..." 
                  : isMerchantSystem 
                  ? "Search by Application ID, Shop Name, Merchant Name, Phone..." 
                  : "Search leads by customer name, phone, loan ID..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-gray-50/70 hover:bg-gray-50 focus:bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#225091]/20 focus:border-[#225091] transition-all shadow-2xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                title="Clear Search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Tier 1 Actions: Reset & Export & Refresh */}
          <div className="flex items-center gap-2.5 justify-end">
            {(searchTerm || selectedStatus || dateFrom || dateTo || selectedState || (selectedCity && selectedCity !== 'ALL') || (selectedBranch && selectedBranch !== 'ALL') || (selectedExecutive && selectedExecutive !== 'ALL')) && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setDebouncedSearch("");
                  setSelectedStatus("");
                  setDateFrom("");
                  setDateTo("");
                  setSelectedState("");
                  setSelectedCity("");
                  setSelectedBranch("ALL");
                  setSelectedExecutive("ALL");
                  setPage(1);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-colors cursor-pointer shadow-2xs"
                title="Reset All Active Filters"
              >
                <RotateCcw size={13} />
                <span>Reset Filters</span>
              </button>
            )}

            {/* Universal Multi-Format Export Dropdown */}
            <ExportDropdown
              tableRef={tableRef}
              filename={`${resolvedTitle || 'Leads'}-Report`}
              title={`${resolvedTitle || 'Leads'} System Report`}
            />

            {/* Refresh Button */}
            <button
              type="button"
              onClick={fetchLeads}
              disabled={loading}
              className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh Leads Data"
            >
              <RefreshCw size={15} className={loading ? "animate-spin text-[#225091]" : ""} />
            </button>
          </div>
        </div>

        {/* Tier 2: Responsive Filter Grid (7 Uniform Controls) */}
        <div className="pt-3 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {/* 1. State Filter */}
          <div className="relative">
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedCity("");
                setPage(1);
              }}
              disabled={locationsLoading}
              className={`w-full pl-3 pr-7 py-2 h-9 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#225091]/20 focus:border-[#225091] text-xs font-semibold shadow-2xs cursor-pointer appearance-none truncate transition-colors ${
                selectedState ? 'border-[#225091] bg-blue-50/40 text-[#225091]' : 'border-gray-200 bg-white text-gray-700'
              }`}
            >
              <option value="">All States</option>
              {statesList.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
            <ChevronDown size={13} className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${selectedState ? 'text-[#225091]' : 'text-gray-400'}`} />
          </div>

          {/* 2. City Filter */}
          <div className="relative">
            <select
              value={selectedCity}
              onChange={(e) => {
                setSelectedCity(e.target.value);
                setPage(1);
              }}
              className={`w-full pl-3 pr-7 py-2 h-9 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#225091]/20 focus:border-[#225091] text-xs font-semibold shadow-2xs cursor-pointer appearance-none truncate transition-colors ${
                selectedCity && selectedCity !== 'ALL' ? 'border-[#225091] bg-blue-50/40 text-[#225091]' : 'border-gray-200 bg-white text-gray-700'
              }`}
            >
              <option value="">All Cities</option>
              {availableCities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ChevronDown size={13} className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${selectedCity && selectedCity !== 'ALL' ? 'text-[#225091]' : 'text-gray-400'}`} />
          </div>

          {/* 3. Branch Filter */}
          <div className="relative">
            <select
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setPage(1);
              }}
              className={`w-full pl-3 pr-7 py-2 h-9 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#225091]/20 focus:border-[#225091] text-xs font-semibold shadow-2xs cursor-pointer appearance-none truncate transition-colors ${
                selectedBranch && selectedBranch !== 'ALL' ? 'border-[#225091] bg-blue-50/40 text-[#225091]' : 'border-gray-200 bg-white text-gray-700'
              }`}
            >
              <option value="ALL">All Branches</option>
              {branchesList.map((b) => (
                <option key={b._id || b.id} value={b._id || b.id}>{b.name || b.branchName}</option>
              ))}
            </select>
            <Building2 size={13} className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${selectedBranch && selectedBranch !== 'ALL' ? 'text-[#225091]' : 'text-gray-400'}`} />
          </div>

          {/* 4. Executive Filter */}
          <div className="relative">
            <select
              value={selectedExecutive}
              onChange={(e) => {
                setSelectedExecutive(e.target.value);
                setPage(1);
              }}
              className={`w-full pl-3 pr-7 py-2 h-9 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#225091]/20 focus:border-[#225091] text-xs font-semibold shadow-2xs cursor-pointer appearance-none truncate transition-colors ${
                selectedExecutive && selectedExecutive !== 'ALL' ? 'border-[#225091] bg-blue-50/40 text-[#225091]' : 'border-gray-200 bg-white text-gray-700'
              }`}
            >
              <option value="ALL">All Executives</option>
              {executivesList.map((ex) => (
                <option key={ex._id || ex.id} value={ex._id || ex.id}>{ex.name || ex.fullName || ex.email}</option>
              ))}
            </select>
            <User size={13} className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${selectedExecutive && selectedExecutive !== 'ALL' ? 'text-[#225091]' : 'text-gray-400'}`} />
          </div>

          {/* 5. Status Filter */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className={`w-full pl-3 pr-7 py-2 h-9 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#225091]/20 focus:border-[#225091] text-xs font-semibold shadow-2xs cursor-pointer appearance-none truncate transition-colors ${
                selectedStatus ? 'border-[#225091] bg-blue-50/40 text-[#225091]' : 'border-gray-200 bg-white text-gray-700'
              }`}
            >
              <option value="">All Statuses</option>
              {isCustomerSystem ? (
                <>
                  <option value="PENDING_APPROVAL">Pending Approval</option>
                  <option value="APPROVED">Approved</option>
                  <option value="ACTIVE">Active Loans</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="REJECTED">Rejected</option>
                </>
              ) : isMerchantSystem ? (
                <>
                  <option value="PENDING_BRANCH_PAYMENT">Pending Settlement</option>
                  <option value="SETTLED_BY_BRANCH">Settled Leads</option>
                  <option value="APPROVED">Approved Leads</option>
                  <option value="ACTIVE">Active Loans</option>
                </>
              ) : (
                <>
                  <option value="ACTIVE">Active Loans</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="REJECTED">Rejected</option>
                </>
              )}
            </select>
            <Filter size={13} className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${selectedStatus ? 'text-[#225091]' : 'text-gray-400'}`} />
          </div>

          {/* 6. From Date Filter */}
          <div className="relative flex items-center">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              title="Start Date (From)"
              className={`w-full pl-7 pr-2 py-2 h-9 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#225091]/20 focus:border-[#225091] text-xs font-semibold shadow-2xs cursor-pointer transition-colors ${
                dateFrom ? 'border-[#225091] bg-blue-50/40 text-[#225091]' : 'border-gray-200 bg-white text-gray-700'
              }`}
            />
            <Calendar size={13} className={`absolute left-2.5 pointer-events-none ${dateFrom ? 'text-[#225091]' : 'text-gray-400'}`} />
          </div>

          {/* 7. To Date Filter */}
          <div className="relative flex items-center">
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              title="End Date (To)"
              className={`w-full pl-7 pr-2 py-2 h-9 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#225091]/20 focus:border-[#225091] text-xs font-semibold shadow-2xs cursor-pointer transition-colors ${
                dateTo ? 'border-[#225091] bg-blue-50/40 text-[#225091]' : 'border-gray-200 bg-white text-gray-700'
              }`}
            />
            <Calendar size={13} className={`absolute left-2.5 pointer-events-none ${dateTo ? 'text-[#225091]' : 'text-gray-400'}`} />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl shadow-2xs border border-gray-200/80 overflow-hidden">
        <TableWrapper minHeight="360px">
          <table
            ref={tableRef}
            className="w-full text-center text-sm whitespace-nowrap min-w-[1000px]"
          >
            <thead>
              <tr className="bg-[#225091] border-b border-[#225091]">
                <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center w-16">Sr.No.</th>
                <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">Application / Loan ID</th>
                <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">Customer & Contact</th>
                {isMerchantSystem ? (
                  <>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">Merchant / Store</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">Product & Price</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">Loan Amount</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">Settlement Status</th>
                  </>
                ) : isCustomerSystem ? (
                  <>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">Product & IMEI</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">Financials & EMI</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">KYC Photos</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">Status</th>
                  </>
                ) : (
                  <>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">Phone Number</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">Status</th>
                  </>
                )}
                <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider text-center min-w-[210px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={isCustomerSystem || isMerchantSystem ? "8" : "5"} className="py-16 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2
                        size={28}
                        className="animate-spin text-[#225091]"
                      />
                      <span className="text-sm font-medium">
                        Loading leads...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : displayedLeads && displayedLeads.length > 0 ? (
                displayedLeads.map((lead, idx) => {
                  const displaySrNo = (meta.page - 1) * meta.limit + idx + 1;
                  const leadId = lead.loanId || lead.id || lead._id;
                  const appId = lead.applicationId || lead.applicationNumber || (leadId ? `ADV-LN-${leadId.slice(-5).toUpperCase()}` : "—");
                  const createdDate = lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
                  
                  // Extract Customer details from API
                  const cust = lead.customerDetails || lead.customer || {};
                  const custName = cust.fullName || lead.customerName || lead.name || "—";
                  const custPhone = cust.phoneNumber || lead.phoneNumber || "—";
                  const custPan = cust.panNumber || lead.panNumber || "—";
                  const custAadhaar = cust.aadhaarNumber || lead.aadhaarNumber || "—";

                  // Extract Product details from API
                  const prod = lead.productDetails || lead.product || {};
                  const prodBrand = prod.brandName || prod.brand || "—";
                  const prodModel = prod.modelName || prod.model || prod.productName || lead.productName || "—";
                  const prodImei = prod.imeiNumber || prod.imei || "—";
                  const prodPrice = prod.productPrice || prod.price || lead.productPrice || 0;

                  // Extract Financial details from API
                  const fin = lead.financialDetails || lead.loanInformation || {};
                  const totalLoan = fin.totalLoanAmount || fin.loanAmount || lead.totalLoanAmount || prodPrice;
                  const downPay = fin.downPayment || lead.downPayment || 0;
                  const monthlyEmi = fin.emiAmount || lead.emiAmount || 0;
                  const tenure = fin.tenureMonths || lead.tenureMonths || 6;

                  // Extract Merchant details from API
                  const merch = lead.merchantDetails || lead.merchant || {};
                  const shopName = merch.shopName || merch.storeName || lead.shopName || "Merchant Store";
                  const merchName = merch.merchantName || merch.name || "—";
                  const merchPhone = merch.phoneNumber || merch.phone || "—";
                  const merchBank = merch.bankName || "";

                  // Extract Settlement details from API
                  const sett = lead.settlementDetails || {};
                  const settStatus = sett.settlementStatus || (lead.status === 'SETTLED' ? 'SETTLED' : 'PENDING_BRANCH_PAYMENT');
                  const netDisbursal = sett.netDisbursalAmount || totalLoan;
                  const paymentRef = sett.paymentTxnRef || lead.paymentTxnRef || "";

                  const statusVal = lead.approvalStatus || lead.status || "PENDING_APPROVAL";
                  const isAutoApproved = lead.autoApproved === true;
                  const statusUpper = (statusVal || "").toUpperCase().trim();
                  const isFinalState = statusUpper === "APPROVED" || statusUpper === "REJECTED" || statusUpper === "COMPLETED";
                  const isPendingApproval = isCustomerSystem && !isFinalState;
                  const isPendingSettlement = settStatus === "PENDING_BRANCH_PAYMENT";

                  return (
                    <tr
                      key={leadId || idx}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Sr. No. */}
                      <td className="py-3.5 px-4 text-gray-500 font-medium">
                        {displaySrNo}
                      </td>

                      {/* Application / Loan ID */}
                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-mono font-bold text-gray-900 block text-xs">
                            {appId}
                          </span>
                          {lead.loanId && (
                            <span className="text-[10px] font-mono text-gray-400 block truncate max-w-[130px]" title={lead.loanId}>
                              ID: {lead.loanId}
                            </span>
                          )}
                          {createdDate && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200/60 mt-1">
                              <Calendar size={10} className="text-gray-400" />
                              {createdDate}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Customer & Contact */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-xs font-bold text-[#225091] shrink-0">
                            {getInitials(custName)}
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 block text-xs">
                              {custName}
                            </span>
                            <span className="text-[11px] font-mono text-gray-500 block">
                              {custPhone}
                            </span>
                            {custPan !== "—" && (
                              <span className="text-[10px] font-mono text-gray-400">
                                PAN: {custPan}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Customer System Columns */}
                      {isCustomerSystem && (
                        <>
                          {/* Product & IMEI */}
                          <td className="py-3.5 px-4">
                            <div>
                              <span className="font-semibold text-gray-900 block text-xs">
                                {prodBrand !== "—" ? `${prodBrand} ` : ""}{prodModel}
                              </span>
                              <span className="text-[11px] font-mono text-gray-500 block">
                                IMEI: {prodImei}
                              </span>
                              <span className="text-[10px] font-bold text-emerald-700 block">
                                ₹{Number(prodPrice).toLocaleString('en-IN')}
                              </span>
                            </div>
                          </td>

                          {/* Financials & EMI */}
                          <td className="py-3.5 px-4">
                            <div>
                              <span className="font-bold text-gray-900 block text-xs">
                                ₹{Number(totalLoan).toLocaleString('en-IN')} <span className="text-[10px] font-normal text-gray-400">Loan</span>
                              </span>
                              <span className="text-[11px] text-gray-600 block">
                                EMI: <strong className="text-gray-900">₹{Number(monthlyEmi).toLocaleString('en-IN')}</strong>/mo ({tenure}m)
                              </span>
                              {downPay > 0 && (
                                <span className="text-[10px] text-gray-400 block">
                                  DP: ₹{Number(downPay).toLocaleString('en-IN')}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* KYC Photos */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              {cust.livePhoto && (
                                <button
                                  type="button"
                                  onClick={() => { setPreviewImage(cust.livePhoto); setPreviewTitle(`${custName} - Live Photo`); }}
                                  className="w-8 h-8 rounded-lg overflow-hidden border border-emerald-300 hover:border-emerald-500 hover:scale-105 transition-all cursor-pointer shadow-2xs relative group shrink-0"
                                  title="View Live Selfie Photo"
                                >
                                  <img src={cust.livePhoto} alt="Live" className="w-full h-full object-cover" />
                                </button>
                              )}
                              {cust.panImage && (
                                <button
                                  type="button"
                                  onClick={() => { setPreviewImage(cust.panImage); setPreviewTitle(`${custName} - PAN Card Image`); }}
                                  className="h-8 px-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/80 hover:bg-blue-100 text-[11px] font-bold hover:scale-105 transition-all cursor-pointer inline-flex items-center justify-center shadow-2xs"
                                  title="View PAN Card Image"
                                >
                                  PAN
                                </button>
                              )}
                              {cust.aadhaarImage && (
                                <button
                                  type="button"
                                  onClick={() => { setPreviewImage(cust.aadhaarImage); setPreviewTitle(`${custName} - Aadhaar Card Image`); }}
                                  className="h-8 px-2 rounded-lg bg-cyan-50 text-cyan-700 border border-cyan-200/80 hover:bg-cyan-100 text-[11px] font-bold hover:scale-105 transition-all cursor-pointer inline-flex items-center justify-center shadow-2xs"
                                  title="View Aadhaar Card Image"
                                >
                                  UID
                                </button>
                              )}
                              {!cust.livePhoto && !cust.panImage && !cust.aadhaarImage && (
                                <span className="text-[11px] text-gray-400 italic">No media</span>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-1 items-start">
                              {getStatusBadge(statusVal)}
                              {isAutoApproved && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                                  <Sparkles size={10} /> Auto Approved
                                </span>
                              )}
                            </div>
                          </td>
                        </>
                      )}

                      {/* Merchant System Columns */}
                      {isMerchantSystem && (
                        <>
                          {/* Merchant / Store */}
                          <td className="py-3.5 px-4">
                            <div>
                              <span className="font-bold text-gray-900 block text-xs flex items-center gap-1">
                                <Store size={12} className="text-[#7c3aed]" />
                                {shopName}
                              </span>
                              <span className="text-[11px] text-gray-600 block">
                                {merchName}
                              </span>
                              <span className="text-[10px] font-mono text-gray-400 block">
                                {merchPhone}
                              </span>
                              {merchBank && (
                                <span className="text-[9px] font-semibold text-purple-700 bg-purple-50 px-1 py-0.5 rounded border border-purple-100 mt-0.5 inline-block">
                                  {merchBank}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Product & Price */}
                          <td className="py-3.5 px-4">
                            <div>
                              <span className="font-semibold text-gray-900 block text-xs">
                                {prodBrand !== "—" ? `${prodBrand} ` : ""}{prodModel}
                              </span>
                              <span className="text-[11px] font-bold text-gray-900">
                                ₹{Number(prodPrice).toLocaleString('en-IN')}
                              </span>
                            </div>
                          </td>

                          {/* Loan Amount */}
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-gray-900 text-xs">
                              ₹{Number(totalLoan).toLocaleString('en-IN')}
                            </span>
                          </td>

                          {/* Settlement Status */}
                          <td className="py-3.5 px-4">
                            <div>
                              {getStatusBadge(settStatus)}
                              <span className="text-[10px] font-semibold text-gray-500 block mt-0.5">
                                Disbursal: <strong>₹{Number(netDisbursal).toLocaleString('en-IN')}</strong>
                              </span>
                              {paymentRef && (
                                <span className="text-[9px] font-mono text-gray-400 block mt-0.5">
                                  Ref: {paymentRef}
                                </span>
                              )}
                            </div>
                          </td>
                        </>
                      )}

                      {/* Standard Columns */}
                      {!isCustomerSystem && !isMerchantSystem && (
                        <>
                          <td className="py-3.5 px-4 text-xs text-gray-600">
                            {lead.phoneNumber || "—"}
                          </td>
                          <td className="py-3.5 px-4">
                            {getStatusBadge(lead.status)}
                          </td>
                        </>
                      )}

                      {/* Actions strictly based on APIs */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex justify-center items-center gap-1.5">
                          {/* 1B & 1C. Approve / Reject Actions for Customer Leads */}
                          {isCustomerSystem && isPendingApproval && (
                            <>
                              <button
                                type="button"
                                onClick={() => { setLeadToApprove(lead); setApproveRemarks(""); setIsApproveModalOpen(true); }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 hover:border-emerald-300 shadow-2xs hover:shadow-xs active:scale-95 transition-all cursor-pointer"
                                title="Manually Approve Loan Application"
                              >
                                <CheckCircle2 size={13} className="text-emerald-600" />
                                <span>Approve</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => { setLeadToReject(lead); setRejectReason(""); setIsRejectModalOpen(true); }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100/80 border border-rose-200/80 hover:border-rose-300 shadow-2xs hover:shadow-xs active:scale-95 transition-all cursor-pointer"
                                title="Reject Loan Application"
                              >
                                <XCircle size={13} className="text-rose-600" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          {isCustomerSystem && (
                            <>
                              <button
                                type="button"
                                onClick={() => handlePayEmi(lead)}
                                disabled={payingLoanId !== null || submittingMandate}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#225091] hover:bg-[#163a6c] disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs transition-all cursor-pointer"
                                title="Pay regular EMI using Razorpay"
                              >
                                {payingLoanId === (lead.loanId || lead._id || lead.id) ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : (
                                  <CreditCard size={13} />
                                )}
                                <span>{payingLoanId === (lead.loanId || lead._id || lead.id) ? 'Processing...' : 'Pay EMI'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setMandateLoan(lead);
                                  setMandateMaxAmount('');
                                  setMandateAuthType('NETBANKING');
                                }}
                                disabled={payingLoanId !== null || submittingMandate}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 text-xs font-semibold text-indigo-700 shadow-2xs transition-all hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                                title="Set up loan e-Mandate"
                              >
                                <Landmark size={13} />
                                <span>e-Mandate</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleViewLoanLedger(lead)}
                                disabled={loanLedgerLoading}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-teal-200 bg-teal-50 text-xs font-semibold text-teal-700 shadow-2xs transition-all hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
                                title="View loan collections ledger"
                              >
                                {loanLedgerLoading ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
                                <span>View Ledger</span>
                              </button>
                            </>
                          )}

                          {/* 2B. Execute Settlement Action for Merchant Leads */}
                          {isMerchantSystem && isPendingSettlement && (
                            <button
                              type="button"
                              onClick={() => { setLeadToSettle(lead); setSettleTxnRef(""); setSettleRemarks(""); setIsSettleModalOpen(true); }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100/80 border border-purple-200/80 hover:border-purple-300 shadow-2xs hover:shadow-xs active:scale-95 transition-all cursor-pointer"
                              title="Execute Next-Day Merchant Settlement"
                            >
                              <IndianRupee size={13} className="text-purple-600" />
                              <span>Settle Disbursal</span>
                            </button>
                          )}

                          {/* Forms Button for Customer System */}
                          {isCustomerSystem && statusUpper === "APPROVED" && (
                            <button
                              type="button"
                              onClick={() => {
                                const targetId = lead.id || lead._id || lead.loanId || lead.referenceId;
                                if (!targetId) {
                                  toast.error("Lead Reference ID is missing. Cannot fetch forms.");
                                  return;
                                }
                                setFormsReferenceId(targetId);
                                setIsFormsOverviewOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 transition-all shadow-2xs cursor-pointer"
                              title="View Onboarding Forms Dossier"
                            >
                              <FileText size={13} className="text-indigo-600" />
                              <span>Forms</span>
                            </button>
                          )}

                          {/* Quick Details View */}
                          <button
                            type="button"
                            onClick={() => setQuickDetailLead(lead)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#225091] bg-[#EAF2FB] hover:bg-[#d8e8f8] border border-[#225091]/15 hover:border-[#225091]/30 shadow-2xs hover:shadow-xs active:scale-95 transition-all cursor-pointer"
                            title="Inspect Details"
                          >
                            <Eye size={13} className="text-[#225091]" />
                            <span>View</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={isCustomerSystem || isMerchantSystem ? "8" : "5"} className="py-16 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle size={32} className="text-gray-300" />
                      <p className="text-sm font-medium text-gray-600">
                        No {resolvedTitle ? `${resolvedTitle} ` : ""}leads found.
                      </p>
                      <p className="text-xs text-gray-400">
                        Try adjusting your search query, status, or date range filters.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableWrapper>

        {/* Integrated Pagination Bar */}
        {!loading && meta.totalRecords > 0 && (
          <Pagination
            page={page}
            totalPages={meta.totalPages}
            totalRecords={meta.totalRecords}
            limit={meta.limit}
            onPageChange={setPage}
            disabled={loading}
          />
        )}
      </div>

      {/* 1B. Manual Approve Modal */}
      {isApproveModalOpen && leadToApprove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 transition-opacity animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 overflow-hidden flex flex-col gap-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 font-bold">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Approve Customer Loan</h3>
                <p className="text-xs text-gray-500 font-mono">
                  {leadToApprove.applicationId || leadToApprove.applicationNumber || leadToApprove.loanId}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">Applicant Name:</span>
                <span className="font-bold text-gray-900">{leadToApprove.customerDetails?.fullName || leadToApprove.customerName || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Loan Amount:</span>
                <span className="font-bold text-emerald-700">₹{Number(leadToApprove.financialDetails?.totalLoanAmount || leadToApprove.totalLoanAmount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Product:</span>
                <span className="font-medium text-gray-800">{leadToApprove.productDetails?.brandName} {leadToApprove.productDetails?.modelName}</span>
              </div>
            </div>

            <form onSubmit={handleApproveCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Manager Approval Remarks
                </label>
                <textarea
                  rows={3}
                  value={approveRemarks}
                  onChange={(e) => setApproveRemarks(e.target.value)}
                  placeholder="e.g. Manually verified income documents and approved by Branch Manager"
                  className="w-full p-3 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50/50"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={approveSubmitting}
                  onClick={() => { setIsApproveModalOpen(false); setLeadToApprove(null); }}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={approveSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-xs text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  {approveSubmitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  <span>{approveSubmitting ? "Approving..." : "Confirm Approve"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1C. Manual Reject Modal */}
      {isRejectModalOpen && leadToReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 transition-opacity animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 overflow-hidden flex flex-col gap-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100 font-bold">
                <XCircle size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Reject Customer Loan</h3>
                <p className="text-xs text-gray-500 font-mono">
                  {leadToReject.applicationId || leadToReject.applicationNumber || leadToReject.loanId}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">Applicant:</span>
                <span className="font-bold text-gray-900">{leadToReject.customerDetails?.fullName || leadToReject.customerName || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Requested Loan:</span>
                <span className="font-bold text-gray-900">₹{Number(leadToReject.financialDetails?.totalLoanAmount || leadToReject.totalLoanAmount || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <form onSubmit={handleRejectCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Reason for Rejection <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. CIBIL score discrepancy and incomplete address proof"
                  className="w-full p-3 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 bg-gray-50/50"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={rejectSubmitting}
                  onClick={() => { setIsRejectModalOpen(false); setLeadToReject(null); }}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejectSubmitting || !rejectReason.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all shadow-xs text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {rejectSubmitting ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                  <span>{rejectSubmitting ? "Rejecting..." : "Confirm Reject"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2B. Settle Merchant Modal */}
      {isSettleModalOpen && leadToSettle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 transition-opacity animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 overflow-hidden flex flex-col gap-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100 font-bold">
                <Store size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Merchant Disbursal Settlement</h3>
                <p className="text-xs text-gray-500 font-mono">
                  {leadToSettle.applicationId || leadToSettle.applicationNumber || leadToSettle.loanId}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-100 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-600">Merchant / Shop:</span>
                <span className="font-bold text-gray-900">{leadToSettle.merchantDetails?.shopName || "Merchant Partner"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Merchant Name:</span>
                <span className="font-medium text-gray-900">{leadToSettle.merchantDetails?.merchantName || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Net Disbursal Amount:</span>
                <span className="font-bold text-purple-700 text-sm">
                  ₹{Number(leadToSettle.settlementDetails?.netDisbursalAmount || leadToSettle.financialDetails?.totalLoanAmount || leadToSettle.totalLoanAmount || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <form onSubmit={handleSettleMerchant} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Payment Transaction Ref / UTR <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={settleTxnRef}
                  onChange={(e) => setSettleTxnRef(e.target.value.toUpperCase())}
                  placeholder="e.g. UTR99283120485"
                  className="w-full p-2.5 text-xs font-mono font-bold border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50/50 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Settlement Remarks
                </label>
                <textarea
                  rows={2}
                  value={settleRemarks}
                  onChange={(e) => setSettleRemarks(e.target.value)}
                  placeholder="e.g. Next day loan disbursal paid to Merchant HDFC Bank Account"
                  className="w-full p-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50/50"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={settleSubmitting}
                  onClick={() => { setIsSettleModalOpen(false); setLeadToSettle(null); }}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settleSubmitting || !settleTxnRef.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition-all shadow-xs text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {settleSubmitting ? <Loader2 size={14} className="animate-spin" /> : <IndianRupee size={14} />}
                  <span>{settleSubmitting ? "Settling..." : "Complete Settlement"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Quick Lead Details Modal */}
      {quickDetailLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col animate-in zoom-in-95">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#225091] flex items-center justify-center font-bold">
                  <FileCheck size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Lead Details — {quickDetailLead.applicationId || quickDetailLead.applicationNumber || quickDetailLead.loanId}
                  </h3>
                  <div className="mt-0.5">{getStatusBadge(quickDetailLead.approvalStatus || quickDetailLead.status)}</div>
                </div>
              </div>
              <button
                onClick={() => setQuickDetailLead(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs">
              {/* Customer Profile */}
              <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-100">
                <h4 className="font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <User size={14} className="text-[#225091]" /> Customer Profile
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-gray-400 block text-[11px]">Full Name</span>
                    <span className="font-bold text-gray-900">{quickDetailLead.customerDetails?.fullName || quickDetailLead.customerName || "—"}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px]">Phone Number</span>
                    <span className="font-bold text-gray-900 font-mono">{quickDetailLead.customerDetails?.phoneNumber || quickDetailLead.phoneNumber || "—"}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px]">Gender / DOB</span>
                    <span className="font-semibold text-gray-800">{quickDetailLead.customerDetails?.gender || "—"} | {quickDetailLead.customerDetails?.dob || "—"}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px]">PAN Number</span>
                    <span className="font-mono font-bold text-gray-900">{quickDetailLead.customerDetails?.panNumber || "—"}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px]">Aadhaar Number</span>
                    <span className="font-mono font-bold text-gray-900">{quickDetailLead.customerDetails?.aadhaarNumber || "—"}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px]">Address</span>
                    <span className="font-medium text-gray-800 truncate block" title={quickDetailLead.customerDetails?.address}>{quickDetailLead.customerDetails?.address || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Product & Loan Breakdown */}
              <div className="p-4 rounded-xl bg-blue-50/30 border border-blue-100/80">
                <h4 className="font-bold text-[#225091] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Smartphone size={14} /> Product & Loan Breakdown
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-gray-400 block text-[11px]">Brand & Model</span>
                    <span className="font-bold text-gray-900">{quickDetailLead.productDetails?.brandName} {quickDetailLead.productDetails?.modelName || "—"}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px]">Product Price</span>
                    <span className="font-bold text-gray-900">₹{Number(quickDetailLead.productDetails?.productPrice || quickDetailLead.productPrice || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px]">Down Payment</span>
                    <span className="font-bold text-gray-900">₹{Number(quickDetailLead.financialDetails?.downPayment || quickDetailLead.downPayment || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px]">Total Loan Amount</span>
                    <span className="font-bold text-emerald-700 text-sm">₹{Number(quickDetailLead.financialDetails?.totalLoanAmount || quickDetailLead.totalLoanAmount || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px]">Monthly EMI</span>
                    <span className="font-bold text-gray-900">₹{Number(quickDetailLead.financialDetails?.emiAmount || quickDetailLead.emiAmount || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px]">Tenure</span>
                    <span className="font-bold text-gray-900">{quickDetailLead.financialDetails?.tenureMonths || quickDetailLead.tenureMonths || 6} Months</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-400 block text-[11px]">IMEI Number</span>
                    <span className="font-mono font-bold text-gray-800">{quickDetailLead.productDetails?.imeiNumber || "—"}</span>
                  </div>
                </div>
              </div>

              {/* KYC Media Preview in Modal */}
              {(quickDetailLead.customerDetails?.livePhoto || quickDetailLead.customerDetails?.panImage || quickDetailLead.customerDetails?.aadhaarImage) && (
                <div className="p-4 rounded-xl bg-emerald-50/30 border border-emerald-100/80">
                  <h4 className="font-bold text-emerald-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <ImageIcon size={14} /> KYC Verification Documents
                  </h4>
                  <div className="flex flex-wrap gap-4">
                    {quickDetailLead.customerDetails?.livePhoto && (
                      <div className="flex flex-col items-center gap-1">
                        <button
                          type="button"
                          onClick={() => { setPreviewImage(quickDetailLead.customerDetails.livePhoto); setPreviewTitle("Live Selfie Photo"); }}
                          className="w-20 h-20 rounded-xl overflow-hidden border-2 border-emerald-400 hover:scale-105 transition-transform cursor-pointer shadow-xs"
                        >
                          <img src={quickDetailLead.customerDetails.livePhoto} alt="Live" className="w-full h-full object-cover" />
                        </button>
                        <span className="text-[10px] font-bold text-gray-600">Live Selfie</span>
                      </div>
                    )}
                    {quickDetailLead.customerDetails?.panImage && (
                      <div className="flex flex-col items-center gap-1">
                        <button
                          type="button"
                          onClick={() => { setPreviewImage(quickDetailLead.customerDetails.panImage); setPreviewTitle("PAN Card Image"); }}
                          className="w-20 h-20 rounded-xl overflow-hidden border-2 border-blue-400 hover:scale-105 transition-transform cursor-pointer shadow-xs bg-gray-100 flex items-center justify-center"
                        >
                          <img src={quickDetailLead.customerDetails.panImage} alt="PAN" className="w-full h-full object-cover" />
                        </button>
                        <span className="text-[10px] font-bold text-gray-600">PAN Card</span>
                      </div>
                    )}
                    {quickDetailLead.customerDetails?.aadhaarImage && (
                      <div className="flex flex-col items-center gap-1">
                        <button
                          type="button"
                          onClick={() => { setPreviewImage(quickDetailLead.customerDetails.aadhaarImage); setPreviewTitle("Aadhaar Card Image"); }}
                          className="w-20 h-20 rounded-xl overflow-hidden border-2 border-cyan-400 hover:scale-105 transition-transform cursor-pointer shadow-xs bg-gray-100 flex items-center justify-center"
                        >
                          <img src={quickDetailLead.customerDetails.aadhaarImage} alt="Aadhaar" className="w-full h-full object-cover" />
                        </button>
                        <span className="text-[10px] font-bold text-gray-600">Aadhaar Card</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Merchant Details & Bank Settlement if available */}
              {quickDetailLead.merchantDetails && (
                <div className="p-4 rounded-xl bg-purple-50/30 border border-purple-100">
                  <h4 className="font-bold text-[#7c3aed] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Store size={14} /> Merchant Partner & Settlement Details
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                    <div>
                      <span className="text-gray-400 block text-[11px]">Store Name</span>
                      <span className="font-bold text-gray-900">{quickDetailLead.merchantDetails?.shopName || "—"}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">Merchant Name</span>
                      <span className="font-bold text-gray-900">{quickDetailLead.merchantDetails?.merchantName || "—"}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">Contact Phone</span>
                      <span className="font-mono font-bold text-gray-900">{quickDetailLead.merchantDetails?.phoneNumber || "—"}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">Bank Name</span>
                      <span className="font-semibold text-gray-900">{quickDetailLead.merchantDetails?.bankName || "—"}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">Account Number</span>
                      <span className="font-mono font-bold text-gray-900">{quickDetailLead.merchantDetails?.accountNumber || "—"}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">IFSC Code</span>
                      <span className="font-mono font-bold text-gray-900">{quickDetailLead.merchantDetails?.ifscCode || "—"}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">Settlement Status</span>
                      <span className="font-bold text-gray-900">{getStatusBadge(quickDetailLead.settlementDetails?.settlementStatus || "PENDING_BRANCH_PAYMENT")}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">Net Disbursal Amount</span>
                      <span className="font-bold text-purple-700 text-sm">
                        ₹{Number(quickDetailLead.settlementDetails?.netDisbursalAmount || quickDetailLead.financialDetails?.totalLoanAmount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    {quickDetailLead.settlementDetails?.paymentTxnRef && (
                      <div>
                        <span className="text-gray-400 block text-[11px]">Payment Transaction / UTR</span>
                        <span className="font-mono font-bold text-gray-900">{quickDetailLead.settlementDetails.paymentTxnRef}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50/70 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setQuickDetailLead(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-100 text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KYC Photo Preview Modal with maximum z-index (sits on top of quickDetailLead and all other modals) */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 cursor-default relative z-10"
          >
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">{previewTitle || "KYC Document Preview"}</h4>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center max-h-[70vh] bg-black/5 overflow-auto">
              <img
                src={previewImage}
                alt={previewTitle || "KYC Document Preview"}
                className="max-h-[60vh] w-auto object-contain rounded-lg shadow-sm"
              />
            </div>
            <div className="p-3 bg-gray-50 border-t border-gray-100 flex justify-end">
              <a
                href={previewImage}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#225091] text-white text-xs font-bold hover:bg-[#163a6c] transition-colors shadow-xs"
              >
                <ExternalLink size={13} />
                <span>Open Full Size</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {isFormsOverviewOpen && (
        <OnboardingFormsDrawer
          isOpen={isFormsOverviewOpen}
          onClose={() => setIsFormsOverviewOpen(false)}
          onboardingType={currentLeadType === 'CUSTOMER' ? 'LOAN' : currentLeadType === 'SIP' ? 'PIGMY' : currentLeadType}
          referenceId={formsReferenceId}
        />
      )}

      {mandateLoan && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <form
            onSubmit={handleInitiateLoanMandate}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-gray-900">Set up loan e-Mandate</h3>
            <p className="mt-1 text-sm text-gray-500">
              {mandateLoan.customerDetails?.fullName || mandateLoan.customerName || mandateLoan.name || 'Customer'}
            </p>
            <label className="mt-5 block text-sm font-semibold text-gray-700" htmlFor="loan-mandate-max-amount">
              Maximum mandate amount (₹)
            </label>
            <input
              id="loan-mandate-max-amount"
              type="number"
              min="1"
              step="0.01"
              required
              value={mandateMaxAmount}
              onChange={(event) => setMandateMaxAmount(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#225091] focus:ring-2 focus:ring-[#225091]/15"
              placeholder="Enter maximum amount"
            />
            <label className="mt-4 block text-sm font-semibold text-gray-700" htmlFor="loan-mandate-auth-type">
              Authorization method
            </label>
            <select
              id="loan-mandate-auth-type"
              required
              value={mandateAuthType}
              onChange={(event) => setMandateAuthType(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#225091] focus:ring-2 focus:ring-[#225091]/15"
            >
              <option value="NETBANKING">Net Banking</option>
              <option value="DEBITCARD">Debit Card</option>
              <option value="AADHAAR">Aadhaar</option>
              <option value="UPI">UPI</option>
            </select>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMandateLoan(null)}
                disabled={submittingMandate}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingMandate}
                className="inline-flex items-center gap-2 rounded-xl bg-[#225091] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#163a6c] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submittingMandate && <Loader2 size={15} className="animate-spin" />}
                {submittingMandate ? 'Starting...' : 'Continue to authorization'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loanLedgerLead && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          onClick={() => setLoanLedgerLead(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="loan-ledger-title"
            className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h3 id="loan-ledger-title" className="text-lg font-bold text-gray-900">Loan Collections Ledger</h3>
                <p className="mt-0.5 text-sm text-gray-500">
                  {loanLedgerLead.customerDetails?.fullName || loanLedgerLead.customerName || loanLedgerLead.name || 'Customer'}
                  {loanLedgerData?.applicationId && <span className="ml-2">· {loanLedgerData.applicationId}</span>}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLoanLedgerLead(null)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                aria-label="Close loan ledger"
              >
                <X size={20} />
              </button>
            </header>

            {loanLedgerData && (
              <div className="grid grid-cols-2 gap-3 border-b border-gray-100 bg-gray-50/70 p-4 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-100 bg-white p-3">
                  <span className="block text-xs text-gray-500">Outstanding amount</span>
                  <strong className="mt-1 block text-base text-gray-900">
                    {loanLedgerData.outstandingAmount == null
                      ? '—'
                      : `₹${Number(loanLedgerData.outstandingAmount).toLocaleString('en-IN')}`}
                  </strong>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-3">
                  <span className="block text-xs text-gray-500">Paid EMIs</span>
                  <strong className="mt-1 block text-base text-gray-900">
                    {loanLedgerData.paidEmisCount ?? '—'}
                  </strong>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-3">
                  <span className="block text-xs text-gray-500">Loan ID</span>
                  <strong className="mt-1 block truncate text-sm text-gray-900" title={loanLedgerData.loanId || ''}>
                    {loanLedgerData.loanId || '—'}
                  </strong>
                </div>
              </div>
            )}

            <div className="min-h-0 flex-1 space-y-6 overflow-auto p-4">
              {loanLedgerLoading ? (
                <div className="flex min-h-48 items-center justify-center gap-2 text-sm font-medium text-gray-500">
                  <Loader2 size={20} className="animate-spin text-[#225091]" />
                  Loading loan collections ledger...
                </div>
              ) : loanLedgerError ? (
                <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
                  <p className="text-sm text-rose-700" role="alert">{loanLedgerError}</p>
                  <button
                    type="button"
                    onClick={() => handleViewLoanLedger(loanLedgerLead)}
                    className="rounded-lg bg-[#225091] px-4 py-2 text-sm font-semibold text-white hover:bg-[#163a6c]"
                  >
                    Retry
                  </button>
                </div>
              ) : loanLedgerData ? (
                <>
                  <section>
                    <h4 className="mb-2 text-sm font-bold text-gray-800">Allocations</h4>
                    {Array.isArray(loanLedgerData.allocations) && loanLedgerData.allocations.length > 0 ? (
                      <div className="overflow-x-auto rounded-xl border border-gray-100">
                        <table className="w-full min-w-[700px] text-left text-sm">
                          <thead className="bg-[#225091] text-xs uppercase tracking-wide text-white">
                            <tr>
                              <th className="px-3 py-3">Installment</th>
                              <th className="px-3 py-3">Month</th>
                              <th className="px-3 py-3 text-right">Amount</th>
                              <th className="px-3 py-3">Advance</th>
                              <th className="px-3 py-3">Payment ID</th>
                              <th className="px-3 py-3">Order ID</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {loanLedgerData.allocations.map((allocation, index) => (
                              <tr key={allocation._id || `${allocation.orderId || allocation.paymentId || 'allocation'}-${index}`} className="hover:bg-gray-50">
                                <td className="px-3 py-3 text-gray-700">{allocation.installmentIndex ?? '—'}</td>
                                <td className="px-3 py-3 text-gray-700">{allocation.monthName || '—'}</td>
                                <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-gray-900">
                                  {allocation.amount == null ? '—' : `₹${Number(allocation.amount).toLocaleString('en-IN')}`}
                                </td>
                                <td className="px-3 py-3 text-gray-700">{allocation.isAdvance ? 'Yes' : 'No'}</td>
                                <td className="max-w-48 truncate px-3 py-3 font-mono text-xs text-gray-500" title={allocation.paymentId || ''}>
                                  {allocation.paymentId || '—'}
                                </td>
                                <td className="max-w-48 truncate px-3 py-3 font-mono text-xs text-gray-500" title={allocation.orderId || ''}>
                                  {allocation.orderId || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">
                        No installment allocations are available yet. They will appear here after a payment is successfully processed.
                      </p>
                    )}
                  </section>

                  {['payments', 'transfers'].map((sectionName) => {
                    const records = Array.isArray(loanLedgerData[sectionName]) ? loanLedgerData[sectionName] : [];
                    const title = sectionName === 'payments' ? 'Payments' : 'Transfers';
                    return (
                      <section key={sectionName}>
                        <h4 className="mb-2 text-sm font-bold capitalize text-gray-800">{title}</h4>
                        {records.length > 0 ? (
                          <div className="overflow-x-auto rounded-xl border border-gray-100">
                            <table className="w-full min-w-[640px] text-left text-sm">
                              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                                <tr>
                                  {(sectionName === 'payments'
                                    ? ['paymentId', 'orderId', 'amount', 'paymentStatus', 'method', 'createdAt']
                                    : ['transferId', 'paymentId', 'amount', 'transferStatus', 'transferMode', 'createdAt']
                                  ).map((key) => (
                                    <th key={key} className="px-3 py-3">{formatLoanLedgerLabel(key)}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {records.map((record, index) => {
                                  const fields = getLoanLedgerRecordFields(record, sectionName);
                                  return (
                                    <tr key={record._id || record.paymentId || record.transferId || `${sectionName}-${index}`} className="hover:bg-gray-50">
                                      {(sectionName === 'payments'
                                        ? ['paymentId', 'orderId', 'amount', 'paymentStatus', 'method', 'createdAt']
                                        : ['transferId', 'paymentId', 'amount', 'transferStatus', 'transferMode', 'createdAt']
                                      ).map((key) => {
                                        const fallbackKey = key === 'paymentStatus' || key === 'transferStatus' ? 'status'
                                          : key === 'transferMode' ? 'mode'
                                            : null;
                                        const valueKey = fields.includes(key) ? key : fallbackKey && fields.includes(fallbackKey) ? fallbackKey : null;
                                        const value = valueKey ? record[valueKey] : null;
                                        const isStatus = key === 'paymentStatus' || key === 'transferStatus';
                                        return (
                                          <td key={key} className="max-w-56 truncate whitespace-nowrap px-3 py-3 text-gray-700" title={value == null ? '' : formatLoanLedgerValue(valueKey, value)}>
                                            {isStatus && value != null ? (
                                              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                                String(value).toUpperCase() === 'CREATED'
                                                  ? 'bg-amber-50 text-amber-700'
                                                  : 'bg-gray-100 text-gray-700'
                                              }`}>
                                                {formatLoanLedgerValue(valueKey, value)}
                                              </span>
                                            ) : formatLoanLedgerValue(valueKey || key, value)}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">No {title.toLowerCase()} found.</p>
                        )}
                      </section>
                    );
                  })}
                </>
              ) : null}
            </div>
          </section>
        </div>
      )}

      {paymentResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="emi-payment-result-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
              paymentResult.success ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}>
              {paymentResult.success ? <CheckCircle2 size={26} /> : <XCircle size={26} />}
            </div>
            <h3 id="emi-payment-result-title" className="text-center text-lg font-bold text-gray-900">
              {paymentResult.title}
            </h3>
            <p className="mt-2 text-center text-sm text-gray-600">{paymentResult.message}</p>
            {paymentResult.paymentId && (
              <p className="mt-3 break-all text-center text-xs text-gray-500">
                Payment ID: {paymentResult.paymentId}
              </p>
            )}
            <div className="mt-6 flex justify-center gap-3">
              {paymentResult.completeForms && paymentResult.referenceId && (
                <button
                  type="button"
                  onClick={() => {
                    setFormsReferenceId(paymentResult.referenceId);
                    setPaymentResult(null);
                    setIsFormsOverviewOpen(true);
                  }}
                  className="rounded-xl bg-[#225091] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#163a6c]"
                >
                  Complete e-sign forms
                </button>
              )}
              <button
                type="button"
                onClick={() => setPaymentResult(null)}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leads;
