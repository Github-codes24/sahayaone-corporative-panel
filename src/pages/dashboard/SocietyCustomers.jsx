import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  Search,
  X,
  Eye,
  Users,
  Store,
  Wallet,
  TrendingUp,
  CreditCard,
  Phone,
  Mail,
  Calendar,
  Building,
  User,
  BadgeCheck,
  ShieldCheck,
  FileText,
  Loader2,
  RefreshCw,
  Info,
  RotateCcw,
  Landmark,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Receipt,
} from "lucide-react";
import { toast } from "react-toastify";
import { societyCustomerService } from "../../api/societyCustomerService";
import { branchService } from "../../api/branchService";
import useAuthStore from "../../store/authStore";
import { isBankOwner, isReceiptManager } from "../../utils/roleUtils";
import Pagination from "../../components/common/Pagination";
import TableWrapper from "../../components/common/TableWrapper";
import StatsCard from "../../components/common/StatsCard";
import OnboardingFormsDrawer from "../../components/drawers/OnboardingFormsDrawer";
import LinkSocietyAccountModal from "../../components/modals/LinkSocietyAccountModal";
import LoanCollectionsModal from "../../components/modals/LoanCollectionsModal";

const SocietyCustomers = () => {
  const { user, role } = useAuthStore();
  const isBankWideRole = isBankOwner(role, user) || isReceiptManager(role, user);

  // ── State ──
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({
    totalRecords: 0,
    totalCustomers: 0,
    totalMerchants: 0,
    pigmyCustomersCount: 0,
    loanCustomersCount: 0,
    totalPigmyCount: 0,
    totalLoansCount: 0,
  });
  const [meta, setMeta] = useState({
    totalRecords: 0,
    limit: 10,
    page: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [hasPigmy, setHasPigmy] = useState("");
  const [hasLoans, setHasLoans] = useState("");
  const [pigmyStatus, setPigmyStatus] = useState("");
  const [loanStatus, setLoanStatus] = useState("");
  const [branchId, setBranchId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");


  // Form resolution state
  const [resolvingFormId, setResolvingFormId] = useState(null);
  const [formPickerData, setFormPickerData] = useState(null);

  // Branches list for dropdown (Bank-wide roles)
  const [branches, setBranches] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(false);

  // Detail modal
  const [selectedMember, setSelectedMember] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Modals
  const [linkAccountMember, setLinkAccountMember] = useState(null);
  const [showLinkAccountModal, setShowLinkAccountModal] = useState(false);

  const [collectionsModalData, setCollectionsModalData] = useState(null);
  const [showCollectionsModal, setShowCollectionsModal] = useState(false);

  // Onboarding forms drawer state
  const [formsDrawerConfig, setFormsDrawerConfig] = useState({
    isOpen: false,
    onboardingType: "MERCHANT",
    referenceId: null,
  });

  // Fetch branches for bank-wide roles
  useEffect(() => {
    let isMounted = true;
    const loadBranches = async () => {
      if (!isBankWideRole) return;
      setBranchesLoading(true);
      try {
        const res = await branchService.getDropdownList();
        if (isMounted) {
          if (res && res.success && Array.isArray(res.data)) {
            setBranches(res.data);
          } else if (Array.isArray(res)) {
            setBranches(res);
          }
        }
      } catch (err) {
        console.warn("Failed to load branch dropdown:", err);
      } finally {
        if (isMounted) setBranchesLoading(false);
      }
    };

    loadBranches();
    return () => {
      isMounted = false;
    };
  }, [isBankWideRole]);

  // ── Fetch list ──
  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        type: typeFilter,
        sortBy,
        sortOrder,
      };

      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (statusFilter) params.status = statusFilter;
      if (productFilter) params.product = productFilter;
      if (hasPigmy) params.hasPigmy = hasPigmy;
      if (hasLoans) params.hasLoans = hasLoans;
      if (pigmyStatus) params.pigmyStatus = pigmyStatus;
      if (loanStatus) params.loanStatus = loanStatus;
      if (branchId) params.branchId = branchId;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const res = await societyCustomerService.list(params);
      if (res?.success && res.data) {
        setItems(res.data.items || []);
        setStats(res.data.stats || stats);
        setMeta(res.data.meta || meta);
      }
    } catch (err) {
      console.error("Society customer list error:", err);
      toast.error(err?.response?.data?.message || "Failed to fetch members");
    } finally {
      setLoading(false);
    }
  }, [
    page,
    limit,
    searchTerm,
    typeFilter,
    statusFilter,
    productFilter,
    hasPigmy,
    hasLoans,
    pigmyStatus,
    loanStatus,
    branchId,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ── Sorting Toggle ──
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const renderSortIcon = (field) => {
    if (sortBy !== field) {
      return <ArrowUpDown size={12} className="ml-1 opacity-50 inline" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp size={12} className="ml-1 text-white inline font-bold" />
    ) : (
      <ArrowDown size={12} className="ml-1 text-white inline font-bold" />
    );
  };

  // ── Fetch detail ──
  const openDetail = async (member) => {
    if (!member) return;
    const memberId = member.id || member._id;
    setShowDetailModal(true);
    setDetailLoading(true);
    try {
      const res = await societyCustomerService.getById(memberId, {
        type: member.entityType,
      });
      if (res?.success && res.data) {
        setSelectedMember(res.data);
      } else {
        setSelectedMember(res?.data || member);
      }
    } catch (err) {
      console.error("Member detail error:", err);
      toast.error("Failed to load member details");
      setSelectedMember(member);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setShowDetailModal(false);
    setSelectedMember(null);
  };

  // ── Forms Drawer Triggers ──
  const openForms = (onboardingType, referenceId) => {
    setFormsDrawerConfig({
      isOpen: true,
      onboardingType,
      referenceId,
    });
  };

  const handleOpenMemberForms = async (member) => {
    if (!member) return;

    const memberId = member.id || member._id;

    if (member.entityType === "MERCHANT") {
      openForms("MERCHANT", memberId);
      return;
    }

    // Check if loans or pigmy list is already populated on member object
    const existingLoans = member.totalLoans?.loansList || [];
    const existingPigmys = member.totalPigmy?.pigmyList || [];

    if (existingLoans.length > 0 || existingPigmys.length > 0) {
      const options = [];
      existingLoans.forEach((loan) => {
        options.push({
          type: "LOAN",
          id: loan.id || loan._id,
          title: `Loan File: ${loan.loanSchemeName || loan.schemeName || "Personal/Business Loan"}`,
          subtitle: `A/C: ${loan.loanAccountNumber || "—"} • Sanction: ₹${Number(loan.sanctionAmount || loan.totalAmount || 0).toLocaleString("en-IN")}`,
        });
      });
      existingPigmys.forEach((pig) => {
        options.push({
          type: "PIGMY",
          id: pig.id || pig._id,
          title: `Pigmy Deposit: ${pig.schemeName || "Daily Deposit Scheme"}`,
          subtitle: `A/C: ${pig.pigmyAccountNumber || "—"} • Deposit: ₹${Number(pig.depositAmount || 0).toLocaleString("en-IN")}`,
        });
      });
      if (options.length === 1) {
        openForms(options[0].type, options[0].id);
        return;
      }
      if (options.length > 1) {
        setFormPickerData({ memberName: member.name, options });
        return;
      }
    }

    // Otherwise, fetch customer details to resolve loan/pigmy dossier IDs
    setResolvingFormId(memberId);
    try {
      const res = await societyCustomerService.getById(memberId, {
        type: member.entityType || "CUSTOMER",
      });
      const detail = res?.data || (res?.success ? res.data : null) || member;

      const options = [];
      const loans = detail.totalLoans?.loansList || [];
      const pigmys = detail.totalPigmy?.pigmyList || [];

      loans.forEach((loan) => {
        options.push({
          type: "LOAN",
          id: loan.id || loan._id,
          title: `Loan File: ${loan.loanSchemeName || loan.schemeName || "Personal/Business Loan"}`,
          subtitle: `A/C: ${loan.loanAccountNumber || "—"} • Sanction: ₹${Number(loan.sanctionAmount || loan.totalAmount || 0).toLocaleString("en-IN")}`,
        });
      });

      pigmys.forEach((pig) => {
        options.push({
          type: "PIGMY",
          id: pig.id || pig._id,
          title: `Pigmy Deposit: ${pig.schemeName || "Daily Deposit Scheme"}`,
          subtitle: `A/C: ${pig.pigmyAccountNumber || "—"} • Deposit: ₹${Number(pig.depositAmount || 0).toLocaleString("en-IN")}`,
        });
      });

      if (options.length === 1) {
        openForms(options[0].type, options[0].id);
      } else if (options.length > 1) {
        setFormPickerData({
          memberName: member.name,
          options,
        });
      } else {
        // Fallback for customer with no active loan/pigmy dossier: open general member form
        openForms("MERCHANT", memberId);
      }
    } catch (err) {
      console.error("Failed to resolve customer forms:", err);
      // Fallback
      openForms("MERCHANT", memberId);
    } finally {
      setResolvingFormId(null);
    }
  };

  // ── Clear Filters ──
  const clearFilters = () => {
    setStatusFilter("");
    setProductFilter("");
    setHasPigmy("");
    setHasLoans("");
    setPigmyStatus("");
    setLoanStatus("");
    setBranchId("");
    setDateFrom("");
    setDateTo("");
    setSortBy("createdAt");
    setSortOrder("desc");
    setSearchTerm("");
    setPage(1);
  };

  const activeSecondaryFiltersCount = useMemo(() => {
    let count = 0;
    if (productFilter) count++;
    if (hasPigmy) count++;
    if (hasLoans) count++;
    if (pigmyStatus) count++;
    if (loanStatus) count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    return count;
  }, [productFilter, hasPigmy, hasLoans, pigmyStatus, loanStatus, dateFrom, dateTo]);

  const hasAnyFilterActive = Boolean(
    statusFilter ||
    branchId ||
    searchTerm ||
    activeSecondaryFiltersCount > 0
  );

  const formatDate = (d) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  const formatCurrency = (v) => {
    if (v === null || v === undefined) return "₹0";
    return "₹" + Number(v).toLocaleString("en-IN");
  };

  return (
    <div className="max-w-[1400px] w-full">
      {/* ── Header / Breadcrumb ── */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <h2 className="text-xl font-bold text-[#225091] mb-2">
          Society Customers & Forms
        </h2>
        <div className="flex items-center text-sm font-medium text-gray-500">
          <Link
            to="/dashboard"
            className="hover:text-gray-800 transition-colors"
          >
            Dashboard
          </Link>
          <ChevronRight size={16} className="mx-1 text-gray-400" />
          <span>CRM Management</span>
          <ChevronRight size={16} className="mx-1 text-gray-400" />
          <span className="text-[#225091]">Society Customers & Forms</span>
        </div>
      </div>

      {/* ── Summary Stats Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6 w-full">
        <StatsCard
          layout="centered"
          label="Total Records"
          value={stats.totalRecords ?? 0}
          color="blue"
          loading={loading && stats.totalRecords === 0}
        />
        <StatsCard
          layout="centered"
          label="Total Customers"
          value={stats.totalCustomers ?? 0}
          color="emerald"
          loading={loading && stats.totalRecords === 0}
        />
        <StatsCard
          layout="centered"
          label="Total Merchants"
          value={stats.totalMerchants ?? 0}
          color="purple"
          loading={loading && stats.totalRecords === 0}
        />
        <StatsCard
          layout="centered"
          label="Pigmy Customers"
          value={stats.pigmyCustomersCount ?? 0}
          color="amber"
          loading={loading && stats.totalRecords === 0}
        />
        <StatsCard
          layout="centered"
          label="Loan Customers"
          value={stats.loanCustomersCount ?? 0}
          color="rose"
          loading={loading && stats.totalRecords === 0}
        />
        <StatsCard
          layout="centered"
          label="Total Pigmy A/C"
          value={stats.totalPigmyCount ?? 0}
          color="teal"
          loading={loading && stats.totalRecords === 0}
        />
        <StatsCard
          layout="centered"
          label="Total Loan A/C"
          value={stats.totalLoansCount ?? 0}
          color="indigo"
          loading={loading && stats.totalRecords === 0}
        />
      </div>

      {/* ── Primary Filters & Search Toolbar ── */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 space-y-3">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* Search + Type Buttons */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-8 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#225091] focus:border-[#225091] text-xs bg-white"
                placeholder="Search name, phone, account, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Type Toggle: All / Customers / Merchants */}
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {[
                { key: "ALL", label: "All" },
                { key: "CUSTOMER", label: "Customers" },
                { key: "MERCHANT", label: "Merchants" },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => {
                    setTypeFilter(t.key);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    typeFilter === t.key
                      ? "bg-[#225091] text-white shadow-xs"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Core Controls: Branch + Member Status + Advanced Filters + Refresh */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
            {/* Branch Filter (for Bank-wide roles) */}
            {isBankWideRole && (
              <div className="w-full sm:w-48">
                <select
                  value={branchId}
                  onChange={(e) => {
                    setBranchId(e.target.value);
                    setPage(1);
                  }}
                  disabled={branchesLoading}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:ring-1 focus:ring-[#225091] focus:border-[#225091] cursor-pointer appearance-none bg-white font-medium"
                >
                  <option value="">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id || b._id || b.branchId} value={b.id || b._id || b.branchId}>
                      {b.name || b.branchName || b.code}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Member Status Dropdown */}
            <div className="w-full sm:w-44">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:ring-1 focus:ring-[#225091] focus:border-[#225091] cursor-pointer appearance-none bg-white font-medium"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active (Merchants)</option>
                <option value="VERIFIED">Verified (Customers)</option>
                <option value="APPROVED">Approved</option>
                <option value="PENDING">Pending</option>
                <option value="INACTIVE">Inactive</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            {/* Reset All Filters Button */}
            {hasAnyFilterActive && (
              <button
                onClick={clearFilters}
                className="px-2.5 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200 shrink-0 cursor-pointer flex items-center gap-1"
                title="Reset All Filters"
              >
                <RotateCcw size={14} />
                <span>Reset</span>
              </button>
            )}

            {/* Refresh */}
            <button
              onClick={fetchList}
              className="p-2 bg-white border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw
                size={16}
                className={`text-gray-500 ${loading ? "animate-spin text-[#225091]" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* ── Secondary / Product Filters (Directly Visible) ── */}
        <div className="pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {/* Product Account Filter */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">
                Product Type
              </label>
              <select
                value={productFilter}
                onChange={(e) => {
                  setProductFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:ring-1 focus:ring-[#225091] focus:border-[#225091] bg-white cursor-pointer"
              >
                <option value="">All Products</option>
                <option value="PIGMY">Pigmy Only</option>
                <option value="LOAN">Loan Only</option>
                <option value="BOTH">Both Pigmy & Loan</option>
                <option value="NONE">No Products</option>
              </select>
            </div>

            {/* Pigmy Filter */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">
                Pigmy Deposit
              </label>
              <select
                value={hasPigmy}
                onChange={(e) => {
                  setHasPigmy(e.target.value);
                  setPage(1);
                }}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:ring-1 focus:ring-[#225091] focus:border-[#225091] bg-white cursor-pointer"
              >
                <option value="">Pigmy: Any</option>
                <option value="true">Has Pigmy (Yes)</option>
                <option value="false">No Pigmy (No)</option>
              </select>
            </div>

            {/* Pigmy Status */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">
                Pigmy Status
              </label>
              <select
                value={pigmyStatus}
                onChange={(e) => {
                  setPigmyStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:ring-1 focus:ring-[#225091] focus:border-[#225091] bg-white cursor-pointer"
              >
                <option value="">Status: Any</option>
                <option value="ACTIVE">Active Pigmy</option>
                <option value="INACTIVE">Inactive Pigmy</option>
                <option value="BLOCKED">Blocked Pigmy</option>
              </select>
            </div>

            {/* Loan Filter */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">
                Loan Account
              </label>
              <select
                value={hasLoans}
                onChange={(e) => {
                  setHasLoans(e.target.value);
                  setPage(1);
                }}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:ring-1 focus:ring-[#225091] focus:border-[#225091] bg-white cursor-pointer"
              >
                <option value="">Loan: Any</option>
                <option value="true">Has Loans (Yes)</option>
                <option value="false">No Loans (No)</option>
              </select>
            </div>

            {/* Loan Status */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">
                Loan Status
              </label>
              <select
                value={loanStatus}
                onChange={(e) => {
                  setLoanStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:ring-1 focus:ring-[#225091] focus:border-[#225091] bg-white cursor-pointer"
              >
                <option value="">Status: Any</option>
                <option value="ACTIVE">Active Loan</option>
                <option value="APPROVED">Approved</option>
                <option value="PENDING_DOWN_PAYMENT">Pending Down Payment</option>
                <option value="READY_FOR_DISBURSAL">Ready for Disbursal</option>
                <option value="CLOSED">Closed</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            {/* Date Range: From & To */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">
                Onboarding Date
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  className="w-1/2 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:ring-1 focus:ring-[#225091] focus:border-[#225091] bg-white"
                  title="From Date"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  className="w-1/2 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:ring-1 focus:ring-[#225091] focus:border-[#225091] bg-white"
                  title="To Date"
                />
              </div>
            </div>
          </div>
        </div>

      {/* ── Data Table ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6 flex flex-col">
        <TableWrapper minHeight="380px">
          <table className="w-full text-sm border-collapse text-center whitespace-nowrap min-w-[1600px]">
            <thead className="bg-[#225091] text-white text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-3 font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center w-14 min-w-[56px]">
                  Sr No
                </th>
                <th
                  onClick={() => handleSort("name")}
                  className="py-3.5 px-3 font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center min-w-[200px] max-w-[250px] cursor-pointer hover:bg-white/10 transition-colors select-none"
                >
                  Name {renderSortIcon("name")}
                </th>
                <th className="py-3.5 px-3 font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center min-w-[100px]">
                  Type
                </th>
                <th className="py-3.5 px-3 font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center min-w-[120px]">
                  Phone
                </th>
                <th className="py-3.5 px-3 font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center min-w-[140px]">
                  Branch
                </th>
                <th className="py-3.5 px-3 font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center min-w-[160px]">
                  Loans
                </th>
                <th className="py-3.5 px-3 font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center min-w-[160px]">
                  Pigmy
                </th>
                <th className="py-3.5 px-3 font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center min-w-[130px]">
                  EMI Card
                </th>
                <th className="py-3.5 px-3 font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center min-w-[150px]">
                  Account No.
                </th>
                <th className="py-3.5 px-3 font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center min-w-[110px] max-w-[125px]">
                  Status
                </th>
                <th className="py-3.5 px-3 font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center min-w-[160px]">
                  Created By
                </th>
                <th
                  onClick={() => handleSort("createdAt")}
                  className="py-3.5 px-3 font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center min-w-[130px] cursor-pointer hover:bg-white/10 transition-colors select-none"
                >
                  Onboarding {renderSortIcon("createdAt")}
                </th>
                <th className="py-3.5 px-3 font-semibold text-white uppercase tracking-wider text-center min-w-[230px]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={13} className="py-16 text-center">
                    <Loader2
                      size={28}
                      className="animate-spin text-[#225091] mx-auto mb-2"
                    />
                    <p className="text-sm text-gray-400">Loading members...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-16 text-center">
                    <Info size={32} className="text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-gray-800">
                      No members found
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Try adjusting your search keywords, status, or filters.
                    </p>
                    {hasAnyFilterActive && (
                      <button
                        onClick={clearFilters}
                        className="mt-3 px-3 py-1.5 text-xs font-semibold text-[#225091] hover:underline inline-flex items-center gap-1"
                      >
                        <RotateCcw size={12} /> Clear all filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr
                    key={item.id || idx}
                    className="hover:bg-gray-50/60 transition-colors"
                  >
                    {/* Sr */}
                    <td className="py-3 px-3 text-gray-500 text-xs">
                      {item.srNo || (meta.page - 1) * meta.limit + idx + 1}
                    </td>

                    {/* Name */}
                    <td className="py-3 px-3 text-left whitespace-normal min-w-[190px] max-w-[240px]">
                      <div className="font-semibold text-gray-900 text-xs break-words">
                        {item.name || "—"}
                      </div>
                      {item.shopName && (
                        <div className="text-[10px] text-gray-400 break-words">
                          {item.shopName}
                        </div>
                      )}
                      {item.customerId && (
                        <div className="text-[11px] font-medium text-[#225091] font-mono">
                          {item.customerId}
                        </div>
                      )}
                    </td>

                    {/* Type */}
                    <td className="py-3 px-3">
                      <span
                        className={`text-xs font-bold ${
                          item.entityType === "CUSTOMER"
                            ? "text-emerald-700"
                            : "text-purple-700"
                        }`}
                      >
                        {item.entityType === "CUSTOMER"
                          ? "Customer"
                          : "Merchant"}
                      </span>
                    </td>

                    {/* Phone */}
                    <td className="py-3 px-3 text-xs text-gray-700 font-mono">
                      {item.phoneNumber || "—"}
                    </td>

                    {/* Branch */}
                    <td className="py-3 px-3 text-xs text-gray-700">
                      {item.branchName || "—"}
                    </td>

                    {/* Loans */}
                    <td className="py-3 px-3 text-xs">
                      {item.totalLoans ? (
                        <div>
                          <span className="font-bold text-gray-900">
                            {item.totalLoans.count}
                          </span>
                          <span className="text-gray-400 text-[10px] ml-0.5">
                            ({item.totalLoans.activeCount} active)
                          </span>
                          <div className="text-[10px] text-gray-400">
                            {formatCurrency(item.totalLoans.outstandingAmount)}{" "}
                            outstanding
                          </div>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* Pigmy */}
                    <td className="py-3 px-3 text-xs">
                      {item.totalPigmy ? (
                        <div>
                          <span className="font-bold text-gray-900">
                            {item.totalPigmy.count}
                          </span>
                          <span className="text-gray-400 text-[10px] ml-0.5">
                            ({item.totalPigmy.activeCount} active)
                          </span>
                          <div className="text-[10px] text-emerald-600 font-semibold">
                            {formatCurrency(item.totalPigmy.totalBalance)}
                          </div>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* EMI Card */}
                    <td className="py-3 px-3 text-xs">
                      {item.emiCardDetails ? (
                        <div>
                          <div className="font-mono text-gray-800 text-[10px]">
                            ••••{item.emiCardDetails.cardNumber?.slice(-4)}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            Valid: {item.emiCardDetails.validThru || "—"}
                          </div>
                          <span
                            className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              item.emiCardDetails.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {item.emiCardDetails.status}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-300 text-[10px]">
                          No Card
                        </span>
                      )}
                    </td>

                    {/* Account No */}
                    <td className="py-3 px-3 text-xs">
                      {item.societyAccountDetails ? (
                        <div>
                          <div className="font-mono font-bold text-[#225091] text-[11px]">
                            {item.societyAccountDetails.accountNumber}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {item.societyAccountDetails.bankName}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-300 text-[10px]">Not Linked</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-center whitespace-normal max-w-[125px]">
                      <span
                        className={`inline-block text-xs font-bold leading-tight ${
                          item.status === "ACTIVE" ||
                          item.status === "VERIFIED" ||
                          item.status === "APPROVED"
                            ? "text-emerald-700"
                            : item.status === "INACTIVE"
                              ? "text-gray-600"
                              : item.status === "REJECTED"
                                ? "text-rose-600"
                                : "text-amber-700"
                        }`}
                      >
                        {item.status ? item.status.replace(/_/g, " ") : "—"}
                      </span>
                    </td>

                    {/* Created By */}
                    <td className="py-3 px-3 text-xs text-left min-w-[140px]">
                      {item.createdBy ? (
                        <div>
                          <div className="font-semibold text-gray-900 text-xs">
                            {item.createdBy.name}
                          </div>
                          <div className="text-[10px] text-gray-400 uppercase tracking-wide">
                            {item.createdBy.role
                              ? item.createdBy.role.replace(/_/g, " ")
                              : "—"}
                          </div>
                          {item.createdBy.employeeId && (
                            <div className="text-[11px] font-medium text-[#225091] font-mono">
                              {item.createdBy.employeeId}
                            </div>
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* Onboarding Date */}
                    <td className="py-3 px-3 text-xs text-gray-500">
                      {formatDate(item.createdAt)}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                        {/* View Details */}
                        <button
                          type="button"
                          onClick={() => openDetail(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#225091] bg-blue-50 hover:bg-blue-100 border border-[#225091]/20 transition-all cursor-pointer shadow-2xs"
                          title="View Member Details"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>

                        {/* View Form */}
                        <button
                          type="button"
                          onClick={() => handleOpenMemberForms(item)}
                          disabled={resolvingFormId === (item.id || item._id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all cursor-pointer shadow-2xs disabled:opacity-60"
                          title="View Onboarding Forms (Saving / Member / Loan / Pigmy)"
                        >
                          {resolvingFormId === (item.id || item._id) ? (
                            <Loader2 size={13} className="animate-spin text-emerald-700" />
                          ) : (
                            <FileText size={13} />
                          )}
                          <span>View Form</span>
                        </button>

                        {/* Link Society Account */}
                        <button
                          type="button"
                          onClick={() => {
                            setLinkAccountMember(item);
                            setShowLinkAccountModal(true);
                          }}
                          className="p-1.5 rounded-lg text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-all cursor-pointer shadow-2xs"
                          title="Link / Update Society Bank Account"
                        >
                          <Landmark size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableWrapper>

        {/* Pagination */}
        <Pagination
          page={page}
          totalPages={meta.totalPages}
          totalRecords={meta.totalRecords || items.length}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      </div>

      {/* ════════════════════ DETAIL MODAL ════════════════════ */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeDetail}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto z-10">
            {detailLoading ? (
              <div className="flex flex-col items-center justify-center py-24">
                <Loader2
                  size={32}
                  className="animate-spin text-[#225091] mb-3"
                />
                <p className="text-sm text-gray-400">
                  Loading member details...
                </p>
              </div>
            ) : selectedMember ? (
              <div>
                {/* Modal Header */}
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
                  <div>
                    <h3 className="text-lg font-bold text-[#225091]">
                      {selectedMember.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          selectedMember.entityType === "CUSTOMER"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-purple-50 text-purple-700 border border-purple-200"
                        }`}
                      >
                        {selectedMember.entityType}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          selectedMember.status === "ACTIVE" ||
                          selectedMember.status === "VERIFIED" ||
                          selectedMember.status === "APPROVED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-gray-100 text-gray-600 border border-gray-200"
                        }`}
                      >
                        {selectedMember.status
                          ? selectedMember.status.replace(/_/g, " ")
                          : ""}
                      </span>
                      {selectedMember.customerId && (
                        <span className="text-[10px] font-mono text-blue-500">
                          {selectedMember.customerId}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Forms action in modal header */}
                    <button
                      onClick={() => handleOpenMemberForms(selectedMember)}
                      className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileText size={14} /> Onboarding Forms
                    </button>

                    <button
                      onClick={closeDetail}
                      className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <X size={18} className="text-gray-500" />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* ── Personal Details ── */}
                  {selectedMember.personalDetails && (
                    <div className="p-5 rounded-2xl bg-gray-50/70 border border-gray-100">
                      <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <User size={15} className="text-[#225091]" /> Personal Details
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div>
                          <span className="text-gray-400 block text-[11px] mb-0.5">
                            Full Name
                          </span>
                          <span className="font-bold text-gray-900">
                            {selectedMember.personalDetails.fullName || "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px] mb-0.5">
                            Phone
                          </span>
                          <span className="font-bold text-gray-900 font-mono">
                            {selectedMember.personalDetails.phoneNumber || "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px] mb-0.5">
                            Email
                          </span>
                          <span className="font-bold text-gray-900">
                            {selectedMember.personalDetails.email || "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px] mb-0.5">
                            Gender
                          </span>
                          <span className="font-bold text-gray-900">
                            {selectedMember.personalDetails.gender || "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px] mb-0.5">
                            Date of Birth
                          </span>
                          <span className="font-bold text-gray-900">
                            {formatDate(selectedMember.personalDetails.dob)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px] mb-0.5">
                            PAN Number
                          </span>
                          <span className="font-bold text-gray-900 font-mono">
                            {selectedMember.personalDetails.panNumber || "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px] mb-0.5">
                            Aadhaar Number
                          </span>
                          <span className="font-bold text-gray-900 font-mono">
                            {selectedMember.personalDetails.aadhaarNumber || "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px] mb-0.5">
                            KYC Status
                          </span>
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              selectedMember.personalDetails.kycStatus === "VERIFIED"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {selectedMember.personalDetails.kycStatus || "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px] mb-0.5">
                            Credit Score
                          </span>
                          <span className="font-bold text-gray-900">
                            {selectedMember.personalDetails.creditScore || "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px] mb-0.5">
                            CIBIL Status
                          </span>
                          <span className="font-bold text-gray-900">
                            {selectedMember.personalDetails.cibilStatus || "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px] mb-0.5">
                            Onboarding Stage
                          </span>
                          <span className="font-bold text-gray-900">
                            {selectedMember.personalDetails.onboardingStage || "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px] mb-0.5">
                            Pincode
                          </span>
                          <span className="font-bold text-gray-900 font-mono">
                            {selectedMember.personalDetails.residentialPincode ||
                              selectedMember.personalDetails.currentPinCode ||
                              "—"}
                          </span>
                        </div>
                        {selectedMember.personalDetails.activeAddress && (
                          <div className="col-span-2">
                            <span className="text-gray-400 block text-[11px] mb-0.5">
                              Address
                            </span>
                            <span className="font-medium text-gray-800">
                              {selectedMember.personalDetails.activeAddress.addressLine}
                              {selectedMember.personalDetails.activeAddress.pinCode
                                ? `, ${selectedMember.personalDetails.activeAddress.pinCode}`
                                : ""}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Documents ── */}
                  {selectedMember.documents && (
                    <div className="p-5 rounded-2xl bg-gray-50/70 border border-gray-100">
                      <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <FileText size={15} className="text-[#225091]" /> Documents
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { label: "PAN Image", url: selectedMember.documents.panImage },
                          { label: "Aadhaar Image", url: selectedMember.documents.aadhaarImage },
                          { label: "Live Photo", url: selectedMember.documents.livePhoto },
                          {
                            label: "Profile Image",
                            url: selectedMember.documents.profileImage || selectedMember.documents.avatar,
                          },
                          { label: "CIBIL Report", url: selectedMember.documents.cibilReportUrl },
                        ]
                          .filter((d) => d.url)
                          .map((doc, i) => (
                            <a
                              key={i}
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-3 rounded-xl bg-white border border-gray-200 hover:border-[#225091] hover:shadow-sm transition-all text-xs font-semibold text-[#225091]"
                            >
                              <FileText size={14} /> {doc.label}
                            </a>
                          ))}
                        {!Object.values(selectedMember.documents || {}).some((v) => v) && (
                          <p className="text-xs text-gray-400 col-span-4">
                            No documents uploaded.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Society Account Details ── */}
                  <div className="p-5 rounded-2xl bg-blue-50/40 border border-blue-100">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                        <ShieldCheck size={15} className="text-[#225091]" /> Society Account
                      </h4>
                      <button
                        onClick={() => {
                          setLinkAccountMember(selectedMember);
                          setShowLinkAccountModal(true);
                        }}
                        className="px-3 py-1 text-xs font-bold text-[#225091] hover:bg-blue-100/60 border border-blue-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Landmark size={13} /> {selectedMember.societyAccountDetails ? "Update Society A/C" : "Link Society A/C"}
                      </button>
                    </div>

                    {selectedMember.societyAccountDetails ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                        <div>
                          <span className="text-gray-400 block text-[11px] mb-0.5">
                            Account Number
                          </span>
                          <span className="font-bold text-[#225091] font-mono text-sm">
                            {selectedMember.societyAccountDetails.accountNumber}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px] mb-0.5">
                            Holder Name
                          </span>
                          <span className="font-bold text-gray-900">
                            {selectedMember.societyAccountDetails.accountHolderName}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px] mb-0.5">
                            IFSC
                          </span>
                          <span className="font-bold text-gray-900 font-mono">
                            {selectedMember.societyAccountDetails.ifscCode}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px] mb-0.5">
                            Bank Name
                          </span>
                          <span className="font-bold text-gray-900">
                            {selectedMember.societyAccountDetails.bankName}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px] mb-0.5">
                            Branch
                          </span>
                          <span className="font-bold text-gray-900">
                            {selectedMember.societyAccountDetails.branchName}
                          </span>
                        </div>
                        {selectedMember.societyAccountDetails.pincode && (
                          <div>
                            <span className="text-gray-400 block text-[11px] mb-0.5">
                              Pincode
                            </span>
                            <span className="font-bold text-gray-900 font-mono">
                              {selectedMember.societyAccountDetails.pincode}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 py-2">
                        No society bank account currently linked. Click "Link Society A/C" above to assign an account.
                      </div>
                    )}
                  </div>

                  {/* ── EMI Card Details ── */}
                  {selectedMember.emiCardDetails && (
                    <div className="p-5 rounded-2xl bg-purple-50/40 border border-purple-100">
                      <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <CreditCard size={15} className="text-purple-600" /> EMI Card
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div>
                          <span className="text-gray-400 block text-[11px] mb-0.5">
                            Card Number
                          </span>
                          <span className="font-bold text-gray-900 font-mono">
                            ••••{selectedMember.emiCardDetails.cardNumber?.slice(-4)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px] mb-0.5">
                            Card Holder
                          </span>
                          <span className="font-bold text-gray-900">
                            {selectedMember.emiCardDetails.cardHolderName}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px] mb-0.5">
                            Valid Thru
                          </span>
                          <span className="font-bold text-gray-900">
                            {selectedMember.emiCardDetails.validThru}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px] mb-0.5">
                            Expiry Date
                          </span>
                          <span className="font-bold text-gray-900">
                            {formatDate(selectedMember.emiCardDetails.expiryDate)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px] mb-0.5">
                            Card Limit
                          </span>
                          <span className="font-bold text-gray-900">
                            {formatCurrency(selectedMember.emiCardDetails.cardLimit)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px] mb-0.5">
                            Available Limit
                          </span>
                          <span className="font-bold text-emerald-700">
                            {formatCurrency(selectedMember.emiCardDetails.availableLimit)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px] mb-0.5">
                            Status
                          </span>
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              selectedMember.emiCardDetails.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-gray-100 text-gray-600 border border-gray-200"
                            }`}
                          >
                            {selectedMember.emiCardDetails.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Loans Section ── */}
                  {selectedMember.totalLoans && (
                    <div className="p-5 rounded-2xl bg-gray-50/70 border border-gray-100">
                      <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <TrendingUp size={15} className="text-rose-600" /> Loan Accounts ({selectedMember.totalLoans.count})
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-4">
                        <div>
                          <span className="text-gray-400 block text-[11px] mb-0.5">
                            Total Loans
                          </span>
                          <span className="font-bold text-gray-900 text-sm">
                            {selectedMember.totalLoans.count}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px] mb-0.5">
                            Active Loans
                          </span>
                          <span className="font-bold text-emerald-700 text-sm">
                            {selectedMember.totalLoans.activeCount}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px] mb-0.5">
                            Total Amount
                          </span>
                          <span className="font-bold text-gray-900 text-sm">
                            {formatCurrency(selectedMember.totalLoans.totalAmount)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px] mb-0.5">
                            Outstanding
                          </span>
                          <span className="font-bold text-rose-600 text-sm">
                            {formatCurrency(selectedMember.totalLoans.outstandingAmount)}
                          </span>
                        </div>
                      </div>

                      {selectedMember.totalLoans.loansList &&
                        selectedMember.totalLoans.loansList.length > 0 && (
                          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs">
                            <table className="w-full text-xs border-collapse text-center whitespace-nowrap">
                              <thead className="bg-[#225091] text-white">
                                <tr>
                                  <th className="py-2.5 px-3 font-semibold text-white uppercase text-[10px] border-r border-white/20">
                                    Application ID
                                  </th>
                                  <th className="py-2.5 px-3 font-semibold text-white uppercase text-[10px] border-r border-white/20">
                                    Status
                                  </th>
                                  <th className="py-2.5 px-3 font-semibold text-white uppercase text-[10px] border-r border-white/20">
                                    Loan Amount
                                  </th>
                                  <th className="py-2.5 px-3 font-semibold text-white uppercase text-[10px] border-r border-white/20">
                                    Outstanding
                                  </th>
                                  <th className="py-2.5 px-3 font-semibold text-white uppercase text-[10px] border-r border-white/20">
                                    EMI
                                  </th>
                                  <th className="py-2.5 px-3 font-semibold text-white uppercase text-[10px] border-r border-white/20">
                                    Date
                                  </th>
                                  <th className="py-2.5 px-3 font-semibold text-white uppercase text-[10px]">
                                    Actions
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 font-medium">
                                {selectedMember.totalLoans.loansList.map((loan, li) => (
                                  <tr
                                    key={li}
                                    className="hover:bg-gray-50/60 transition-colors"
                                  >
                                    <td className="py-2.5 px-3 font-mono font-bold text-[#225091]">
                                      {loan.applicationId || "—"}
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <span
                                        className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                          loan.status === "ACTIVE"
                                            ? "bg-emerald-50 text-emerald-700"
                                            : "bg-gray-100 text-gray-600"
                                        }`}
                                      >
                                        {loan.status}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 font-bold text-gray-900">
                                      {formatCurrency(loan.totalLoanAmount)}
                                    </td>
                                    <td className="py-2.5 px-3 font-bold text-rose-600">
                                      {formatCurrency(loan.outstandingAmount)}
                                    </td>
                                    <td className="py-2.5 px-3 text-gray-700">
                                      {formatCurrency(loan.emiAmount)}
                                    </td>
                                    <td className="py-2.5 px-3 text-gray-500">
                                      {formatDate(loan.createdAt)}
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <div className="flex items-center justify-center gap-1">
                                        {/* Collections Ledger */}
                                        <button
                                          onClick={() => {
                                            setCollectionsModalData({
                                              customerId: selectedMember.id,
                                              loan,
                                            });
                                            setShowCollectionsModal(true);
                                          }}
                                          className="p-1 rounded bg-blue-50 text-[#225091] hover:bg-blue-100 transition-colors cursor-pointer"
                                          title="View Collections Ledger"
                                        >
                                          <Receipt size={13} />
                                        </button>

                                        {/* Loan Dossier Forms */}
                                        <button
                                          onClick={() => openForms("LOAN", loan.id || loan._id)}
                                          className="p-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                                          title="View Loan File & Sanction Forms"
                                        >
                                          <FileText size={13} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                    </div>
                  )}

                  {/* ── Pigmy Section ── */}
                  {selectedMember.totalPigmy && (
                    <div className="p-5 rounded-2xl bg-gray-50/70 border border-gray-100">
                      <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Wallet size={15} className="text-amber-600" /> Pigmy Deposit Accounts ({selectedMember.totalPigmy.count})
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs mb-4">
                        <div>
                          <span className="text-gray-400 block text-[11px] mb-0.5">
                            Total Accounts
                          </span>
                          <span className="font-bold text-gray-900 text-sm">
                            {selectedMember.totalPigmy.count}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px] mb-0.5">
                            Active
                          </span>
                          <span className="font-bold text-emerald-700 text-sm">
                            {selectedMember.totalPigmy.activeCount}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px] mb-0.5">
                            Total Balance
                          </span>
                          <span className="font-bold text-[#225091] text-sm">
                            {formatCurrency(selectedMember.totalPigmy.totalBalance)}
                          </span>
                        </div>
                      </div>

                      {selectedMember.totalPigmy.pigmyList &&
                        selectedMember.totalPigmy.pigmyList.length > 0 && (
                          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs">
                            <table className="w-full text-xs border-collapse text-center whitespace-nowrap">
                              <thead className="bg-[#225091] text-white">
                                <tr>
                                  <th className="py-2.5 px-3 font-semibold text-white uppercase text-[10px] border-r border-white/20">
                                    Account No.
                                  </th>
                                  <th className="py-2.5 px-3 font-semibold text-white uppercase text-[10px] border-r border-white/20">
                                    Scheme
                                  </th>
                                  <th className="py-2.5 px-3 font-semibold text-white uppercase text-[10px] border-r border-white/20">
                                    Deposit Amt.
                                  </th>
                                  <th className="py-2.5 px-3 font-semibold text-white uppercase text-[10px] border-r border-white/20">
                                    Balance
                                  </th>
                                  <th className="py-2.5 px-3 font-semibold text-white uppercase text-[10px] border-r border-white/20">
                                    Status
                                  </th>
                                  <th className="py-2.5 px-3 font-semibold text-white uppercase text-[10px] border-r border-white/20">
                                    Date
                                  </th>
                                  <th className="py-2.5 px-3 font-semibold text-white uppercase text-[10px]">
                                    Actions
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 font-medium">
                                {selectedMember.totalPigmy.pigmyList.map((pig, pi) => (
                                  <tr
                                    key={pi}
                                    className="hover:bg-gray-50/60 transition-colors"
                                  >
                                    <td className="py-2.5 px-3 font-mono font-bold text-[#225091]">
                                      {pig.pigmyAccountNumber || "—"}
                                    </td>
                                    <td className="py-2.5 px-3 text-gray-700">
                                      {pig.schemeName || "—"}
                                    </td>
                                    <td className="py-2.5 px-3 text-gray-700">
                                      {formatCurrency(pig.depositAmount)}
                                    </td>
                                    <td className="py-2.5 px-3 font-bold text-emerald-700">
                                      {formatCurrency(pig.currentBalance)}
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <span
                                        className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                          pig.status === "ACTIVE"
                                            ? "bg-emerald-50 text-emerald-700"
                                            : "bg-gray-100 text-gray-600"
                                        }`}
                                      >
                                        {pig.status}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-gray-500">
                                      {formatDate(pig.createdAt)}
                                    </td>
                                    <td className="py-2.5 px-3">
                                      {/* Pigmy Forms */}
                                      <button
                                        onClick={() => openForms("PIGMY", pig.id || pig._id)}
                                        className="p-1 rounded bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer"
                                        title="View Pigmy Deposit Dossier Forms"
                                      >
                                        <FileText size={13} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                    </div>
                  )}

                  {/* ── Created By ── */}
                  {selectedMember.createdBy && (
                    <div className="p-5 rounded-2xl bg-gray-50/70 border border-gray-100">
                      <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <BadgeCheck size={15} className="text-[#225091]" /> Created By
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div>
                          <span className="text-gray-400 block text-[11px] mb-0.5">
                            Name
                          </span>
                          <span className="font-bold text-gray-900">
                            {selectedMember.createdBy.name}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px] mb-0.5">
                            Role
                          </span>
                          <span className="font-bold text-gray-900">
                            {selectedMember.createdBy.role}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px] mb-0.5">
                            Employee ID
                          </span>
                          <span className="font-bold text-[#225091] font-mono">
                            {selectedMember.createdBy.employeeId || "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px] mb-0.5">
                            Phone
                          </span>
                          <span className="font-bold text-gray-900 font-mono">
                            {selectedMember.createdBy.phone || "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Member Since ── */}
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50/40 border border-emerald-200/60">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <Calendar size={18} />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-emerald-900">
                          Member Since
                        </h5>
                        <p className="text-[11px] text-emerald-700 font-semibold">
                          {formatDate(selectedMember.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ════════════════════ ONBOARDING FORMS DRAWER ════════════════════ */}
      {formsDrawerConfig.isOpen && (
        <OnboardingFormsDrawer
          isOpen={formsDrawerConfig.isOpen}
          onClose={() =>
            setFormsDrawerConfig({
              isOpen: false,
              onboardingType: "MERCHANT",
              referenceId: null,
            })
          }
          onboardingType={formsDrawerConfig.onboardingType}
          referenceId={formsDrawerConfig.referenceId}
        />
      )}

      {/* ════════════════════ LINK SOCIETY ACCOUNT MODAL ════════════════════ */}
      {showLinkAccountModal && linkAccountMember && (
        <LinkSocietyAccountModal
          isOpen={showLinkAccountModal}
          onClose={() => {
            setShowLinkAccountModal(false);
            setLinkAccountMember(null);
          }}
          member={linkAccountMember}
          onSuccess={(updatedData) => {
            fetchList();
            const linkId = linkAccountMember.id || linkAccountMember._id;
            if (selectedMember && ((selectedMember.id || selectedMember._id) === linkId)) {
              setSelectedMember((prev) => ({
                ...prev,
                societyAccountDetails: {
                  accountNumber: updatedData.societyAccountNumber || updatedData.accountNumber,
                  accountHolderName: updatedData.accountHolderName,
                  ifscCode: updatedData.ifscCode,
                  bankName: updatedData.bankName,
                  branchName: updatedData.branchName,
                  pincode: updatedData.pincode,
                },
              }));
            }
          }}
        />
      )}

      {/* ════════════════════ LOAN COLLECTIONS MODAL ════════════════════ */}
      {showCollectionsModal && collectionsModalData && (
        <LoanCollectionsModal
          isOpen={showCollectionsModal}
          onClose={() => {
            setShowCollectionsModal(false);
            setCollectionsModalData(null);
          }}
          customerId={collectionsModalData.customerId}
          loan={collectionsModalData.loan}
        />
      )}

      {/* ════════════════════ FORM PICKER MODAL (FOR MULTI-PRODUCT CUSTOMERS) ════════════════════ */}
      {formPickerData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setFormPickerData(null)}
          />
          <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 border border-gray-100 z-10 animate-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setFormPickerData(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Select Form to View</h3>
                <p className="text-xs text-gray-500">{formPickerData.memberName}</p>
              </div>
            </div>
            <p className="text-xs text-gray-600 mb-4">
              This customer has multiple associated accounts. Choose which onboarding forms dossier you want to view:
            </p>
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {formPickerData.options.map((opt, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => {
                    const { type, id } = opt;
                    setFormPickerData(null);
                    openForms(type, id);
                  }}
                  className="w-full text-left p-3 rounded-xl border border-gray-200 hover:border-[#225091] hover:bg-blue-50/50 transition-all cursor-pointer group flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-gray-900 group-hover:text-[#225091]">
                      {opt.title}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{opt.subtitle}</div>
                  </div>
                  <ChevronRight size={16} className="text-gray-400 group-hover:text-[#225091] shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocietyCustomers;
