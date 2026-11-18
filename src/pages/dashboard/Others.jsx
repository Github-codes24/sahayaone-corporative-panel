import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Edit,
  Trash2,
  ChevronRight,
  SlidersHorizontal,
  ChevronDown,
  X,
  Eye,
  Download,
  Loader2,
  Calendar,
  Table,
  FileSpreadsheet,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  RotateCcw
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import { toast } from "react-toastify";
import { othersReceiptService } from "../../api/othersReceiptService";
import useLocations from "../../hooks/useLocations";
import useBranchStore from "../../store/branchStore";
import PageHeader from "../../components/common/PageHeader";
import { Skeleton, SkeletonTableRow } from "../../components/common/Skeleton";
import { isBankOwner, canApproveReceipts } from "../../utils/roleUtils";
import ReceiptImageUpload from "../../components/common/ReceiptImageUpload";
import TableWrapper from "../../components/common/TableWrapper";
import StatsCard from "../../components/common/StatsCard";
import Pagination from "../../components/common/Pagination";
import ExportDropdown from "../../components/common/ExportDropdown";

const DEFAULT_SECTION_TYPES = {
  "Account section": [
    "Saving account",
    "Current account",
    "FD account",
    "Pigmy account",
    "RD Account"
  ],
  "Loan section": [
    "Gold loan",
    "Bike loan",
    "mortgage loan",
    "FD against Loan",
    "personal loan"
  ]
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return { date: "—", time: "" };
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { date: String(dateStr).split("T")[0] || "—", time: "" };
    const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
    const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    return { date, time };
  } catch {
    return { date: "—", time: "" };
  }
};

const getStatusBadge = (status) => {
  const s = (status || "").toUpperCase();
  switch (s) {
    case "PENDING":
    case "NEW":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200">
          PENDING
        </span>
      );
    case "APPROVED":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
          APPROVED
        </span>
      );
    case "REJECTED":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200">
          REJECTED
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200">
          {status || "—"}
        </span>
      );
  }
};

const Others = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tableRef = useRef(null);

  const authRole = useAuthStore((state) => state.role);
  const authUser = useAuthStore((state) => state.user);
  const permissions = useAuthStore((state) => state.permissions) || [];
  const globalBranchId = useBranchStore((state) => state.globalBranchId);

  const canApprove = canApproveReceipts(authRole, authUser, permissions);

  // Filter states
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "ALL");
  const [sectionFilter, setSectionFilter] = useState(searchParams.get("section") || "ALL");
  const [typeFilter, setTypeFilter] = useState(searchParams.get("type") || "ALL");
  const [stateFilter, setStateFilter] = useState(searchParams.get("state") || "ALL");
  const [cityFilter, setCityFilter] = useState(searchParams.get("city") || "ALL");
  const [selectedMonth, setSelectedMonth] = useState(searchParams.get("month") || "ALL");
  const [selectedYear, setSelectedYear] = useState(searchParams.get("year") || String(new Date().getFullYear()));
  const [startDate, setStartDate] = useState(searchParams.get("startDate") || "");
  const [endDate, setEndDate] = useState(searchParams.get("endDate") || "");
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get("page")) || 1);

  // Dynamic Options state
  const [sectionTypes, setSectionTypes] = useState(DEFAULT_SECTION_TYPES);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const res = await othersReceiptService.getOptions();
        if (res && res.data && res.data.sections) {
          const mapped = {};
          res.data.sections.forEach((s) => {
            mapped[s.name || s.section] = s.types || s.typeList || [];
          });
          if (Object.keys(mapped).length > 0) {
            setSectionTypes(mapped);
          }
        }
      } catch {
        // Fallback to default options
      }
    };
    loadOptions();
  }, []);

  // Data states
  const [receipts, setReceipts] = useState([]);
  const [stats, setStats] = useState({
    totalAmount: 0,
    totalCount: 0,
    approvedAmount: 0,
    approvedCount: 0,
    pendingAmount: 0,
    pendingCount: 0,
    rejectedAmount: 0,
    rejectedCount: 0
  });
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);

  // Dropdown locations
  const { states = [], availableCities = [], loading: locationsLoading } = useLocations(stateFilter !== "ALL" ? stateFilter : "");
  const branchOptions = useBranchStore((state) => state.branchOptions) || [];

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    accountNumber: "",
    section: "Account section",
    type: "Saving account",
    glHead: "410105",
    glHeadName: "Member Deposit",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    location: "",
    receiptImage: null
  });
  const [rejectionReason, setRejectionReason] = useState("");

  const updateParam = useCallback((key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value && value !== "ALL") {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: 10,
        search: search.trim() || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        section: sectionFilter !== "ALL" ? sectionFilter : undefined,
        type: typeFilter !== "ALL" ? typeFilter : undefined,
        branchId: globalBranchId || undefined,
        state: stateFilter !== "ALL" ? stateFilter : undefined,
        city: cityFilter !== "ALL" ? cityFilter : undefined,
        dateFrom: startDate || undefined,
        dateTo: endDate || undefined
      };

      if (selectedMonth !== "ALL" && !startDate && !endDate) {
        const monthNum = String(selectedMonth).padStart(2, "0");
        const y = selectedYear || String(new Date().getFullYear());
        params.dateFrom = `${y}-${monthNum}-01`;
        const lastDay = new Date(Number(y), Number(monthNum), 0).getDate();
        params.dateTo = `${y}-${monthNum}-${lastDay}`;
      }

      const res = await othersReceiptService.list(params);
      if (res && res.success) {
        const payload = res.data || {};
        const dataArr = Array.isArray(payload.items)
          ? payload.items
          : (Array.isArray(payload.data)
            ? payload.data
            : (Array.isArray(payload)
              ? payload
              : (Array.isArray(res.items) ? res.items : [])));
        setReceipts(dataArr);

        const meta = payload.meta || res.meta || {};
        setTotalPages(meta.totalPages || 1);
        setTotalRecords(meta.totalRecords ?? meta.total ?? dataArr.length);

        // Stats calculation or API stats
        const statsData = payload.stats || res.stats;
        if (statsData) {
          setStats({
            totalCount: statsData.totalReceipts ?? statsData.totalCount ?? 0,
            totalAmount: statsData.totalAmount ?? 0,
            formattedTotalAmount: statsData.formattedTotalAmount,
            approvedCount: statsData.approvedReceipts ?? statsData.approvedCount ?? 0,
            approvedAmount: statsData.approvedAmount ?? 0,
            formattedApprovedAmount: statsData.formattedApprovedAmount,
            pendingCount: statsData.pendingReceipts ?? statsData.pendingCount ?? 0,
            pendingAmount: statsData.pendingAmount ?? 0,
            formattedPendingAmount: statsData.formattedPendingAmount,
            rejectedCount: statsData.rejectedReceipts ?? statsData.rejectedCount ?? 0,
            rejectedAmount: statsData.rejectedAmount ?? 0,
            formattedRejectedAmount: statsData.formattedRejectedAmount
          });
        } else {
          // Compute from response items
          const totals = dataArr.reduce((acc, r) => {
            const amt = Number(r.amount) || 0;
            acc.totalCount += 1;
            acc.totalAmount += amt;
            const st = (r.status || "").toUpperCase();
            if (st === "APPROVED") {
              acc.approvedCount += 1;
              acc.approvedAmount += amt;
            } else if (st === "PENDING" || st === "NEW") {
              acc.pendingCount += 1;
              acc.pendingAmount += amt;
            } else if (st === "REJECTED") {
              acc.rejectedCount += 1;
              acc.rejectedAmount += amt;
            }
            return acc;
          }, { totalAmount: 0, totalCount: 0, approvedAmount: 0, approvedCount: 0, pendingAmount: 0, pendingCount: 0, rejectedAmount: 0, rejectedCount: 0 });
          setStats(totals);
        }
      } else {
        setReceipts([]);
      }
    } catch (err) {
      console.error("Failed to fetch others receipts:", err);
      toast.error(err.response?.data?.message || "Failed to load others receipts.");
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, statusFilter, sectionFilter, typeFilter, stateFilter, cityFilter, startDate, endDate, selectedMonth, selectedYear, globalBranchId]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      updateParam("search", search);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, updateParam]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Payee / Member name is required.");
      return;
    }
    if (!formData.amount || Number(formData.amount) <= 0) {
      toast.error("Please enter a valid positive amount.");
      return;
    }

    setSubmitting(true);
    try {
      const dataPayload = new FormData();
      dataPayload.append("name", formData.name.trim());
      dataPayload.append("accountNumber", formData.accountNumber.trim());
      dataPayload.append("section", formData.section);
      dataPayload.append("type", formData.type);
      dataPayload.append("glHead", formData.glHead || "410105");
      dataPayload.append("glHeadName", formData.glHeadName || "Member Deposit");
      dataPayload.append("amount", formData.amount);
      dataPayload.append("date", formData.date ? new Date(formData.date).toISOString() : new Date().toISOString());
      dataPayload.append("description", formData.description || "");

      const targetBranchId = formData.branchId || globalBranchId || authUser?.branchId || "";
      if (targetBranchId) {
        dataPayload.append("branchId", targetBranchId);
      }

      if (formData.location) dataPayload.append("location", formData.location);
      if (formData.receiptImage) dataPayload.append("receiptImage", formData.receiptImage);

      const res = await othersReceiptService.create(dataPayload);
      toast.success(res?.message || "Others Receipt created successfully!");
      setIsCreateModalOpen(false);
      setFormData({
        name: "",
        accountNumber: "",
        section: "Account section",
        type: "Saving account",
        glHead: "410105",
        glHeadName: "Member Deposit",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        description: "",
        location: "",
        receiptImage: null
      });
      fetchReceipts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create others receipt.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReceipt) return;

    setSubmitting(true);
    try {
      const dataPayload = new FormData();
      dataPayload.append("name", formData.name.trim());
      dataPayload.append("accountNumber", formData.accountNumber.trim());
      dataPayload.append("section", formData.section);
      dataPayload.append("type", formData.type);
      dataPayload.append("glHead", formData.glHead || "410105");
      dataPayload.append("glHeadName", formData.glHeadName || "Member Deposit");
      dataPayload.append("amount", formData.amount);
      dataPayload.append("date", formData.date ? new Date(formData.date).toISOString() : new Date().toISOString());
      dataPayload.append("description", formData.description || "");
      if (formData.location) dataPayload.append("location", formData.location);
      if (formData.receiptImage && typeof formData.receiptImage !== "string") {
        dataPayload.append("receiptImage", formData.receiptImage);
      }

      const id = selectedReceipt._id || selectedReceipt.id;
      const res = await othersReceiptService.update(id, dataPayload);
      toast.success(res?.message || "Others Receipt updated successfully!");
      setIsEditModalOpen(false);
      setSelectedReceipt(null);
      fetchReceipts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update others receipt.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (receipt) => {
    if (!receipt) return;
    const id = receipt._id || receipt.id;
    try {
      const res = await othersReceiptService.approve(id);
      toast.success(res?.message || "Others Receipt approved successfully!");
      fetchReceipts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to approve receipt.");
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReceipt || !rejectionReason.trim()) {
      toast.error("Rejection reason is required.");
      return;
    }
    setSubmitting(true);
    try {
      const id = selectedReceipt._id || selectedReceipt.id;
      const res = await othersReceiptService.reject(id, rejectionReason.trim());
      toast.success(res?.message || "Others Receipt rejected successfully!");
      setIsRejectModalOpen(false);
      setSelectedReceipt(null);
      setRejectionReason("");
      fetchReceipts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject receipt.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this Others Receipt?")) return;
    try {
      const res = await othersReceiptService.delete(id);
      toast.success(res?.message || "Others Receipt deleted successfully!");
      fetchReceipts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete receipt.");
    }
  };

  const handleExport = async () => {
    try {
      const params = {
        search: search.trim() || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        section: sectionFilter !== "ALL" ? sectionFilter : undefined,
        type: typeFilter !== "ALL" ? typeFilter : undefined,
        branchId: selectedBranchId || undefined,
        state: stateFilter !== "ALL" ? stateFilter : undefined,
        city: cityFilter !== "ALL" ? cityFilter : undefined,
        dateFrom: startDate || undefined,
        dateTo: endDate || undefined
      };
      const blob = await othersReceiptService.exportCsv(params);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "others-receipts.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Others receipts exported successfully!");
    } catch (err) {
      toast.error("Failed to export others receipts.");
    }
  };

  return (
    <div className="w-full max-w-none space-y-6">
      {/* Header */}
      <PageHeader
        title="Others Receipt"
        breadcrumbs={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "Receipt Management" },
          { label: "Others Receipt" }
        ]}
        showBack={false}
      >
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-full font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
        >
          <Download size={14} />
          <span>Export CSV</span>
        </button>
        <button
          onClick={() => {
            setFormData({
              name: "",
              accountNumber: "",
              categorySection: "Others",
              glHead: "410199",
              glHeadName: "Miscellaneous Income / Receipt",
              customCategoryName: "",
              amount: "",
              date: new Date().toISOString().split("T")[0],
              description: "",
              location: "",
              receiptImage: null
            });
            setIsCreateModalOpen(true);
          }}
          className="flex items-center gap-2 px-5 py-2 bg-[#225091] hover:bg-[#1b427b] text-white rounded-full font-semibold text-xs transition-colors shadow-sm cursor-pointer"
        >
          <Plus size={14} />
          <span>Add Others Receipt</span>
        </button>
      </PageHeader>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <StatsCard
          layout="centered"
          label="Total Receipts"
          value={stats.totalCount || stats.totalReceipts || 0}
          sublabel={stats.formattedTotalAmount || `₹${Number(stats.totalAmount || 0).toLocaleString("en-IN")}`}
          color="blue"
          isActive={!statusFilter || statusFilter === "ALL"}
          onClick={() => {
            setStatusFilter("ALL");
            updateParam("status", "ALL");
            setCurrentPage(1);
          }}
          loading={loading && !stats}
        />
        <StatsCard
          layout="centered"
          label="Approved Receipts"
          value={stats.approvedCount || stats.approvedReceipts || 0}
          sublabel={stats.formattedApprovedAmount || `₹${Number(stats.approvedAmount || 0).toLocaleString("en-IN")}`}
          color="emerald"
          isActive={statusFilter === "APPROVED"}
          onClick={() => {
            setStatusFilter("APPROVED");
            updateParam("status", "APPROVED");
            setCurrentPage(1);
          }}
          loading={loading && !stats}
        />
        <StatsCard
          layout="centered"
          label="Pending Receipts"
          value={stats.pendingCount || stats.pendingReceipts || 0}
          sublabel={stats.formattedPendingAmount || `₹${Number(stats.pendingAmount || 0).toLocaleString("en-IN")}`}
          color="amber"
          isActive={statusFilter === "PENDING"}
          onClick={() => {
            setStatusFilter("PENDING");
            updateParam("status", "PENDING");
            setCurrentPage(1);
          }}
          loading={loading && !stats}
        />
        <StatsCard
          layout="centered"
          label="Rejected Receipts"
          value={stats.rejectedCount || stats.rejectedReceipts || 0}
          sublabel={stats.formattedRejectedAmount || `₹${Number(stats.rejectedAmount || 0).toLocaleString("en-IN")}`}
          color="rose"
          isActive={statusFilter === "REJECTED"}
          onClick={() => {
            setStatusFilter("REJECTED");
            updateParam("status", "REJECTED");
            setCurrentPage(1);
          }}
          loading={loading && !stats}
        />
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-gray-100 space-y-4">
        {/* Top Search & Reset Row */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Receipt No, Payee, GL head, Account No..."
              className="w-full pl-10 pr-9 py-2.5 bg-gray-50/80 hover:bg-gray-50 focus:bg-white border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#225091]/20 focus:border-[#225091] transition-all shadow-2xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer p-0.5"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {(startDate || endDate || search || (statusFilter && statusFilter !== "ALL") || (sectionFilter && sectionFilter !== "ALL") || (typeFilter && typeFilter !== "ALL") || (stateFilter && stateFilter !== "ALL") || (cityFilter && cityFilter !== "ALL")) && (
            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("ALL");
                setSectionFilter("ALL");
                setTypeFilter("ALL");
                setStateFilter("ALL");
                setCityFilter("ALL");
                setStartDate("");
                setEndDate("");
                setSearchParams({});
                setCurrentPage(1);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-gray-600 hover:text-rose-600 bg-gray-50 hover:bg-rose-50 rounded-xl border border-gray-200 transition-colors cursor-pointer shadow-2xs shrink-0"
              title="Reset all filters"
            >
              <RotateCcw size={14} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 pt-3 border-t border-gray-100">
          {/* Section Filter */}
          <div className="space-y-1 sm:col-span-1 lg:col-span-2">
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">Section</label>
            <select
              value={sectionFilter}
              onChange={(e) => {
                const sec = e.target.value;
                setSectionFilter(sec);
                setTypeFilter("ALL");
                updateParam("section", sec);
                updateParam("type", "ALL");
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#225091]/15 focus:border-[#225091] cursor-pointer shadow-2xs h-[38px]"
            >
              <option value="ALL">All Sections</option>
              {Object.keys(sectionTypes).map((sec) => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="space-y-1 sm:col-span-1 lg:col-span-2">
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                updateParam("type", e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#225091]/15 focus:border-[#225091] cursor-pointer shadow-2xs h-[38px]"
            >
              <option value="ALL">All Types</option>
              {sectionFilter !== "ALL" && sectionTypes[sectionFilter]
                ? sectionTypes[sectionFilter].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))
                : Object.values(sectionTypes).flat().map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1 sm:col-span-1 lg:col-span-2">
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                updateParam("status", e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#225091]/15 focus:border-[#225091] cursor-pointer shadow-2xs h-[38px]"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* State Filter */}
          <div className="space-y-1 sm:col-span-1 lg:col-span-2">
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">State</label>
            <select
              value={stateFilter}
              onChange={(e) => {
                setStateFilter(e.target.value);
                setCityFilter("ALL");
                updateParam("state", e.target.value);
                updateParam("city", "ALL");
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#225091]/15 focus:border-[#225091] cursor-pointer shadow-2xs h-[38px]"
            >
              <option value="ALL">All States</option>
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range: From & To */}
          <div className="space-y-1 sm:col-span-2 lg:col-span-4">
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">Date Range</label>
            <div className="flex items-center gap-1.5 w-full min-w-0">
              <div className="relative flex-1 min-w-0">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    updateParam("startDate", e.target.value);
                    setCurrentPage(1);
                  }}
                  title="From Date"
                  className="w-full pl-7 pr-2 py-2 rounded-xl border border-gray-200 bg-gray-50/70 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#225091]/15 focus:border-[#225091] text-xs font-semibold text-gray-700 shadow-2xs cursor-pointer h-[38px] min-w-0"
                />
                <Calendar size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <span className="text-gray-400 text-xs font-bold shrink-0">to</span>
              <div className="relative flex-1 min-w-0">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    updateParam("endDate", e.target.value);
                    setCurrentPage(1);
                  }}
                  title="To Date"
                  className="w-full pl-7 pr-2 py-2 rounded-xl border border-gray-200 bg-gray-50/70 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#225091]/15 focus:border-[#225091] text-xs font-semibold text-gray-700 shadow-2xs cursor-pointer h-[38px] min-w-0"
                />
                <Calendar size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Active Filter Chips Bar */}
        {(startDate || endDate || search || (statusFilter && statusFilter !== "ALL") || (sectionFilter && sectionFilter !== "ALL") || (typeFilter && typeFilter !== "ALL") || (stateFilter && stateFilter !== "ALL") || (cityFilter && cityFilter !== "ALL")) && (
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-gray-500 text-[11px] uppercase tracking-wider">Active Filters:</span>
              {sectionFilter && sectionFilter !== "ALL" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-[#225091] border border-blue-200/80 rounded-full text-xs font-semibold shadow-2xs">
                  <span>Section: <strong>{sectionFilter}</strong></span>
                  <button onClick={() => { setSectionFilter("ALL"); updateParam("section", "ALL"); setCurrentPage(1); }} className="hover:text-rose-600 cursor-pointer">
                    <X size={12} />
                  </button>
                </span>
              )}
              {typeFilter && typeFilter !== "ALL" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-[#225091] border border-blue-200/80 rounded-full text-xs font-semibold shadow-2xs">
                  <span>Type: <strong>{typeFilter}</strong></span>
                  <button onClick={() => { setTypeFilter("ALL"); updateParam("type", "ALL"); setCurrentPage(1); }} className="hover:text-rose-600 cursor-pointer">
                    <X size={12} />
                  </button>
                </span>
              )}
              {statusFilter && statusFilter !== "ALL" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-[#225091] border border-blue-200/80 rounded-full text-xs font-semibold shadow-2xs">
                  <span>Status: <strong>{statusFilter}</strong></span>
                  <button onClick={() => { setStatusFilter("ALL"); updateParam("status", "ALL"); setCurrentPage(1); }} className="hover:text-rose-600 cursor-pointer">
                    <X size={12} />
                  </button>
                </span>
              )}
              {stateFilter && stateFilter !== "ALL" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-[#225091] border border-blue-200/80 rounded-full text-xs font-semibold shadow-2xs">
                  <span>State: <strong>{stateFilter}</strong></span>
                  <button onClick={() => { setStateFilter("ALL"); setCityFilter("ALL"); updateParam("state", "ALL"); updateParam("city", "ALL"); setCurrentPage(1); }} className="hover:text-rose-600 cursor-pointer">
                    <X size={12} />
                  </button>
                </span>
              )}
              {cityFilter && cityFilter !== "ALL" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-[#225091] border border-blue-200/80 rounded-full text-xs font-semibold shadow-2xs">
                  <span>City: <strong>{cityFilter}</strong></span>
                  <button onClick={() => { setCityFilter("ALL"); updateParam("city", "ALL"); setCurrentPage(1); }} className="hover:text-rose-600 cursor-pointer">
                    <X size={12} />
                  </button>
                </span>
              )}
              {(startDate || endDate) && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-[#225091] border border-blue-200/80 rounded-full text-xs font-semibold shadow-2xs">
                  <span>Date: <strong>{startDate || "Start"}</strong> to <strong>{endDate || "End"}</strong></span>
                  <button onClick={() => { setStartDate(""); setEndDate(""); updateParam("startDate", ""); updateParam("endDate", ""); setCurrentPage(1); }} className="hover:text-rose-600 cursor-pointer">
                    <X size={12} />
                  </button>
                </span>
              )}
              {search && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-[#225091] border border-blue-200/80 rounded-full text-xs font-semibold shadow-2xs">
                  <span>Search: "<strong>{search}</strong>"</span>
                  <button onClick={() => { setSearch(""); setCurrentPage(1); }} className="hover:text-rose-600 cursor-pointer">
                    <X size={12} />
                  </button>
                </span>
              )}
            </div>
            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("ALL");
                setSectionFilter("ALL");
                setTypeFilter("ALL");
                setStateFilter("ALL");
                setCityFilter("ALL");
                setStartDate("");
                setEndDate("");
                setSearchParams({});
                setCurrentPage(1);
              }}
              className="text-xs text-rose-600 hover:text-rose-700 font-bold hover:underline cursor-pointer ml-auto"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        <TableWrapper minHeight="360px">
          <table ref={tableRef} className="w-full border-collapse min-w-[950px] text-center text-sm whitespace-nowrap">
            <thead className="bg-[#225091] text-white text-xs uppercase tracking-wider font-semibold border-b border-[#225091]">
              <tr>
                <th className="py-3.5 px-3 border-r border-white/20 text-left">Receipt No</th>
                <th className="py-3.5 px-3 border-r border-white/20 text-left">Payee / Member</th>
                <th className="py-3.5 px-3 border-r border-white/20 text-left">Section & Type</th>
                <th className="py-3.5 px-3 border-r border-white/20 text-left">GL Head</th>
                <th className="py-3.5 px-3 border-r border-white/20 text-center">Location</th>
                <th className="py-3.5 px-3 border-r border-white/20 text-right">Amount (₹)</th>
                <th className="py-3.5 px-3 border-r border-white/20 text-center">Status</th>
                <th className="py-3.5 px-3 border-r border-white/20 text-center">Date</th>
                <th className="py-3.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-[13px]">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-gray-400 font-medium">
                    <Loader2 size={24} className="animate-spin mx-auto text-[#225091] mb-2" />
                    Loading others receipts...
                  </td>
                </tr>
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-gray-400 font-medium">
                    No others receipts found matching your criteria.
                  </td>
                </tr>
              ) : (
                receipts.map((r) => {
                  const receiptId = r._id || r.id;
                  const isPending = (r.status || "").toUpperCase() === "PENDING" || (r.status || "").toUpperCase() === "NEW";
                  const { date, time } = formatDateTime(r.date || r.createdAt);

                  return (
                    <tr key={receiptId} className="hover:bg-blue-50/25 transition-colors group">
                      <td className="py-3.5 px-4 text-left font-mono font-bold text-gray-900">
                        <Link to={`/others-receipt/view/${receiptId}`} className="hover:text-[#225091] hover:underline">
                          {r.receiptNo || `OT-${String(receiptId).slice(-6).toUpperCase()}`}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-left">
                        <div className="font-semibold text-gray-900">{r.name || "—"}</div>
                        {r.accountNumber && <div className="text-[11px] text-gray-400 font-mono">A/C: {r.accountNumber}</div>}
                      </td>
                      <td className="py-3.5 px-4 text-left">
                        <span className="inline-block text-xs font-semibold text-gray-800 bg-gray-100 px-2 py-0.5 rounded mr-1">
                          {r.section || "Account section"}
                        </span>
                        <div className="text-[11px] text-gray-500 font-medium mt-0.5">
                          {r.type || "Saving account"}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-left text-gray-700">
                        <div className="font-medium truncate max-w-[200px]" title={r.glHeadName || r.glHead}>
                          {r.glHeadName || r.glHead || "Miscellaneous"}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center text-gray-600 text-xs">
                        {r.location || r.branch || "—"}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                        ₹{Number(r.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(r.status)}
                      </td>
                      <td className="py-3.5 px-4 text-center text-gray-500 text-xs">
                        <div>{date}</div>
                        {time && <div className="text-[10px] text-gray-400">{time}</div>}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <Link
                          to={`/others-receipt/view/${receiptId}`}
                          className="p-1 inline-block text-gray-400 hover:text-[#225091] hover:bg-gray-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye size={15} />
                        </Link>

                        {isPending && canApprove && (
                          <>
                            <button
                              onClick={() => handleApprove(r)}
                              className="p-1 text-gray-400 hover:text-emerald-600 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                              title="Approve"
                            >
                              <CheckCircle size={15} />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedReceipt(r);
                                setRejectionReason("");
                                setIsRejectModalOpen(true);
                              }}
                              className="p-1 text-gray-400 hover:text-rose-600 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                              title="Reject"
                            >
                              <XCircle size={15} />
                            </button>
                          </>
                        )}

                        {isPending && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedReceipt(r);
                                const rSec = r.section || "Account section";
                                const typesForSec = sectionTypes[rSec] || DEFAULT_SECTION_TYPES["Account section"];
                                const rType = r.type && typesForSec.includes(r.type) ? r.type : typesForSec[0];
                                setFormData({
                                  name: r.name || "",
                                  accountNumber: r.accountNumber || "",
                                  section: rSec,
                                  type: rType,
                                  glHead: r.glHead || "410105",
                                  glHeadName: r.glHeadName || "Member Deposit",
                                  amount: r.amount || "",
                                  date: r.date ? r.date.split("T")[0] : new Date().toISOString().split("T")[0],
                                  description: r.description || r.narration || "",
                                  location: r.location || r.branchName || "",
                                  receiptImage: r.receiptImage || r.image || null
                                });
                                setIsEditModalOpen(true);
                              }}
                              className="p-1 text-gray-400 hover:text-[#225091] hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Edit size={15} />
                            </button>
                            <button
                              onClick={() => handleDelete(receiptId)}
                              className="p-1 text-gray-400 hover:text-rose-600 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </TableWrapper>

        {/* Pagination */}
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          limit={10}
          onPageChange={setCurrentPage}
          disabled={loading}
        />
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="text-lg font-bold text-[#225091]">Add Others Receipt</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Payee / Member Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#225091]"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    placeholder="e.g. ACC-998811"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#225091]"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Section <span className="text-red-500">*</span></label>
                  <select
                    value={formData.section}
                    onChange={(e) => {
                      const newSec = e.target.value;
                      const availableTypes = sectionTypes[newSec] || DEFAULT_SECTION_TYPES["Account section"];
                      setFormData({ 
                        ...formData, 
                        section: newSec, 
                        type: availableTypes[0] || ""
                      });
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#225091] bg-white cursor-pointer"
                  >
                    {Object.keys(sectionTypes).map((sec) => (
                      <option key={sec} value={sec}>{sec}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Type <span className="text-red-500">*</span></label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#225091] bg-white cursor-pointer"
                  >
                    {(sectionTypes[formData.section] || DEFAULT_SECTION_TYPES["Account section"]).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">GL Head Code</label>
                  <input
                    type="text"
                    value={formData.glHead}
                    onChange={(e) => setFormData({ ...formData, glHead: e.target.value })}
                    placeholder="e.g. 410105"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#225091]"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">GL Head Name</label>
                  <input
                    type="text"
                    value={formData.glHeadName}
                    onChange={(e) => setFormData({ ...formData, glHeadName: e.target.value })}
                    placeholder="e.g. Member Deposit"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#225091]"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="e.g. 5000"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#225091]"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Receipt Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#225091]"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Location / Branch</label>
                  <select
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#225091] bg-white"
                  >
                    <option value="">Select Location</option>
                    {(branchOptions || []).map((loc) => (
                      <option key={loc.id || loc.name || loc._id} value={loc.name}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Narration / Description</label>
                  <textarea
                    rows="2"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter narration notes for this receipt..."
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:border-[#225091]"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Attach Receipt Proof (Optional)</label>
                  <ReceiptImageUpload
                    file={formData.receiptImage}
                    onChange={(file) => setFormData({ ...formData, receiptImage: file })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-[#225091] text-white rounded-lg text-xs font-semibold hover:bg-[#193e73] transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
                  <span>Save Receipt</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="text-lg font-bold text-[#225091]">Edit Others Receipt</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Payee / Member Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#225091]"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#225091]"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Section <span className="text-red-500">*</span></label>
                  <select
                    value={formData.section}
                    onChange={(e) => {
                      const newSec = e.target.value;
                      const availableTypes = sectionTypes[newSec] || DEFAULT_SECTION_TYPES["Account section"];
                      setFormData({ 
                        ...formData, 
                        section: newSec, 
                        type: availableTypes[0] || ""
                      });
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#225091] bg-white cursor-pointer"
                  >
                    {Object.keys(sectionTypes).map((sec) => (
                      <option key={sec} value={sec}>{sec}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Type <span className="text-red-500">*</span></label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#225091] bg-white cursor-pointer"
                  >
                    {(sectionTypes[formData.section] || DEFAULT_SECTION_TYPES["Account section"]).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">GL Head Code</label>
                  <input
                    type="text"
                    value={formData.glHead}
                    onChange={(e) => setFormData({ ...formData, glHead: e.target.value })}
                    placeholder="e.g. 410105"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#225091]"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">GL Head Name</label>
                  <input
                    type="text"
                    value={formData.glHeadName}
                    onChange={(e) => setFormData({ ...formData, glHeadName: e.target.value })}
                    placeholder="e.g. Member Deposit"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#225091]"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#225091]"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Receipt Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#225091]"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Location / Branch</label>
                  <select
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#225091] bg-white"
                  >
                    <option value="">Select Location</option>
                    {(branchOptions || []).map((loc) => (
                      <option key={loc.id || loc.name || loc._id} value={loc.name}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Narration / Description</label>
                  <textarea
                    rows="2"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:border-[#225091]"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Receipt Proof</label>
                  <ReceiptImageUpload
                    file={formData.receiptImage}
                    existingImageUrl={selectedReceipt?.imageUrl || selectedReceipt?.receiptImage}
                    onChange={(file) => setFormData({ ...formData, receiptImage: file })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-[#225091] text-white rounded-lg text-xs font-semibold hover:bg-[#193e73] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
                  <span>Update Receipt</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 shadow-xl max-w-md w-full animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Reject Others Receipt</h3>
            <p className="text-xs text-gray-500 mb-4">
              Please specify the reason for rejecting receipt <strong>{selectedReceipt?.receiptNo}</strong>.
            </p>
            <form onSubmit={handleRejectSubmit}>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 min-h-[100px]"
                required
              />
              <div className="flex items-center justify-end gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-full text-xs font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-xs font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                  <span>Confirm Rejection</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Others;
