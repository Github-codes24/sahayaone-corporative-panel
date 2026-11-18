import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { 
  Plus, Edit2, Trash2, Download, Search, CheckCircle, 
  XCircle, Filter, ArrowRightLeft, Layers, ShieldCheck,
  Building2, Users, FileText, Check, AlertCircle, ShoppingCart, Activity,
  BarChart2, Package, Clock, LayoutDashboard, ShieldAlert, Wrench, ChevronDown,
  ChevronLeft, ChevronRight, Calendar, RotateCcw, Eye
} from 'lucide-react';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import TableWrapper from '../../components/common/TableWrapper';
import StatsCard from '../../components/common/StatsCard';
import Pagination from '../../components/common/Pagination';
import ExportDropdown from '../../components/common/ExportDropdown';
import InventoryModals from './InventoryModals';
import AssetDetailDrawer from '../../components/inventory/AssetDetailDrawer';
import inventoryService from '../../api/inventoryService';
import { useInventoryPermissions } from '../../hooks/useInventoryPermissions';
import useAuthStore from '../../store/authStore';

/**
 * Universal date range matcher for inventory records
 */
const matchesDateFilters = (item, selectedDate, selectedMonth, selectedYear, startDate, endDate) => {
  if (!selectedDate && (!selectedMonth || selectedMonth === 'ALL') && !startDate && !endDate) {
    return true;
  }
  if (!item) return false;
  const rawDate = item.createdAt || item.purchaseDate || item.date || item.lastRestockedDate || item.timestamp || item.updatedAt || item.transactionDate || item.requestDate || item.adjustmentDate;
  if (!rawDate) return true;
  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return true;

  if (selectedDate) {
    const itemYear = d.getFullYear();
    const itemMonth = String(d.getMonth() + 1).padStart(2, '0');
    const itemDay = String(d.getDate()).padStart(2, '0');
    const itemDateOnly = `${itemYear}-${itemMonth}-${itemDay}`;
    const targetDateOnly = selectedDate.includes('T') ? selectedDate.split('T')[0] : selectedDate;
    if (itemDateOnly !== targetDateOnly) return false;
  }

  if (startDate) {
    const s = new Date(startDate);
    s.setHours(0, 0, 0, 0);
    if (d < s) return false;
  }

  if (endDate) {
    const e = new Date(endDate);
    e.setHours(23, 59, 59, 999);
    if (d > e) return false;
  }

  if (selectedMonth && selectedMonth !== 'ALL') {
    const itemMonth = d.getMonth() + 1;
    const itemYear = d.getFullYear();
    if (itemMonth !== Number(selectedMonth)) return false;
    if (selectedYear && itemYear !== Number(selectedYear)) return false;
  }

  return true;
};

const SocietyInventorySPA = () => {
  const navigate = useNavigate();
  const { tab, subtab } = useParams();
  const authUser = useAuthStore(state => state.user);
  
  const permissions = useInventoryPermissions();
  const isBranchManager = !permissions.canManageCatalog;

  // Tab state initialized from URL param, falling back to localStorage or default
  const savedTab = localStorage.getItem('inventory_last_tab');
  const [activeTab, setActiveTab] = useState(() => tab && tab !== 'overview' ? tab : (savedTab || 'master'));
  const [activeSubTab, setActiveSubTab] = useState(subtab || 'categories');
  
  // Table Refs for Multi-Format Export
  const masterTableRef = useRef(null);
  const catalogTableRef = useRef(null);
  const assetsTableRef = useRef(null);
  const transfersTableRef = useRef(null);
  const auditLogsTableRef = useRef(null);

  useEffect(() => {
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
      localStorage.setItem('inventory_last_tab', tab);
    }
    if (subtab && subtab !== activeSubTab) {
      setActiveSubTab(subtab);
    }
  }, [tab, subtab]);

  const [searchParams, setSearchParams] = useSearchParams();

  // On initial mount if URL has no search params, attempt to restore from localStorage
  useEffect(() => {
    if (!tab) {
      const initialTab = savedTab || 'master';
      navigate(`/inventory/${initialTab}${window.location.search}`, { replace: true });
    }
  }, []);

  const handleTabChange = (newTab, newSubTab = null) => {
    setActiveTab(newTab);
    localStorage.setItem('inventory_last_tab', newTab);
    if (newSubTab) {
      setActiveSubTab(newSubTab);
    }
    const searchString = searchParams.toString();
    navigate(`/inventory/${newTab}${newSubTab ? `/${newSubTab}` : ''}${searchString ? `?${searchString}` : ''}`);
  };

  const handleSubTabChange = (newSubTab) => {
    setActiveSubTab(newSubTab);
    const searchString = searchParams.toString();
    navigate(`/inventory/${activeTab || 'master'}/${newSubTab}${searchString ? `?${searchString}` : ''}`);
  };
  
  const [statsData, setStatsData] = useState(null);
  const [centralStatsData, setCentralStatsData] = useState(null);
  const [branchStatsData, setBranchStatsData] = useState(null);
  const [centralPeriod, setCentralPeriod] = useState('30d');
  const [branchPeriod, setBranchPeriod] = useState('30d');
  const [selectedCentralId, setSelectedCentralId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState(permissions.isStaffScoped || permissions.roleLevel === 'BRANCH_OFFICER' || permissions.roleLevel === 'BRANCH_MANAGER' ? (authUser?.branchId || '') : '');
  const [masterData, setMasterData] = useState([]);
  const [catalogData, setCatalogData] = useState([]);

  // Helper to update a single param without losing others & persist in localStorage
  const updateParam = useCallback((key, value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value) { next.set(key, value); } else { next.delete(key); }
      localStorage.setItem('inventory_last_search_params', next.toString());
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Read filter values from URL (single source of truth)
  const catalogCategoryId = searchParams.get('category') || '';
  const catalogIsConsumable = searchParams.get('type') || '';
  const setCatalogCategoryId = (v) => updateParam('category', v);
  const setCatalogIsConsumable = (v) => updateParam('type', v);

  // Date & Month filter states
  const selectedMonth = searchParams.get('month') || 'ALL';
  const selectedYear = searchParams.get('year') || String(new Date().getFullYear());
  const selectedDate = searchParams.get('date') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const setSelectedMonth = (v) => updateParam('month', v !== 'ALL' ? v : '');
  const setSelectedYear = (v) => updateParam('year', v);
  const setSelectedDate = (v) => updateParam('date', v);
  const setStartDate = (v) => updateParam('startDate', v);
  const setEndDate = (v) => updateParam('endDate', v);

  // Vendors: show inactive toggle
  const showInactiveVendors = searchParams.get('inactive') === 'true';
  const setShowInactiveVendors = (v) => updateParam('inactive', v ? 'true' : '');

  // Assets: filters
  const assetLocation = searchParams.get('location') || '';
  const setAssetLocation = (v) => updateParam('location', v);
  const assetStatus = searchParams.get('assetStatus') || '';
  const setAssetStatus = (v) => updateParam('assetStatus', v);
  const assetCondition = searchParams.get('assetCondition') || '';
  const setAssetCondition = (v) => updateParam('assetCondition', v);
  const [assetsStats, setAssetsStats] = useState(null);

  // Requisitions: workflow status filter
  const reqStatus = searchParams.get('status') || '';
  const setReqStatus = (v) => updateParam('status', v);

  // Stock Adjustments: workflow status, reason & type filters
  const adjStatus = searchParams.get('adjStatus') || '';
  const setAdjStatus = (v) => updateParam('adjStatus', v);
  const adjReason = searchParams.get('adjReason') || '';
  const setAdjReason = (v) => updateParam('adjReason', v);
  const adjType = searchParams.get('adjType') || '';
  const setAdjType = (v) => updateParam('adjType', v);

  // Logs: transaction type & date
  const logTxnType = searchParams.get('txnType') || '';
  const setLogTxnType = (v) => updateParam('txnType', v);
  const logDate = searchParams.get('date') || '';
  const setLogDate = (v) => updateParam('date', v);

  const [assetsData, setAssetsData] = useState([]);
  const [transfersData, setTransfersData] = useState([]);
  const [logsData, setLogsData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [centralWarehousesDropdown, setCentralWarehousesDropdown] = useState([]);
  const [branchesDropdown, setBranchesDropdown] = useState([]);
  
  // Modal state for all forms
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [editItem, setEditItem] = useState(null);
  
  // Asset Detail Drawer state
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  const [isAssetDrawerOpen, setIsAssetDrawerOpen] = useState(false);

  const handleEditClick = (item, type) => {
    setEditItem(item);
    setModalType(type);
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (id, type) => {
    if (window.confirm("Are you sure you want to delete this record? This action cannot be undone.")) {
      try {
        if (type === 'adjust_stock') {
          await inventoryService.deleteStockAdjustment(id);
          toast.success("Stock adjustment deleted successfully!");
        } else if (type === 'vendors') {
          await inventoryService.deleteVendor(id);
          toast.success("Vendor deleted successfully!");
        } else if (type === 'categories') {
          await inventoryService.deleteCategory(id);
          toast.success("Category deleted successfully!");
        } else if (type === 'subcategories') {
          await inventoryService.deleteSubcategory(id);
          toast.success("Subcategory deleted successfully!");
        } else if (type === 'central') {
          await inventoryService.deleteCentralWarehouse(id);
          toast.success("Warehouse deleted successfully!");
        } else if (type === 'catalog') {
          await inventoryService.deleteItem(id);
          toast.success("Catalog item deleted successfully!");
        } else {
          toast.info("Delete not implemented for this type.");
          return;
        }
        
        if (type === 'catalog') {
          fetchCatalogData();
        } else {
          fetchMasterData();
        }
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to delete record.");
      }
    }
  };

  // Pagination & Filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // searchQuery is driven from URL search param
  const urlSearch = searchParams.get('search') || '';
  const [searchQuery, setSearchQueryLocal] = useState(urlSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(urlSearch);

  // Keep local search input synced if URL search changes (e.g. refresh or back/forward)
  useEffect(() => {
    setSearchQueryLocal(urlSearch);
    setDebouncedSearch(urlSearch);
  }, [urlSearch]);

  // Wrapper: update local state + URL param together
  const setSearchQuery = useCallback((val) => {
    setSearchQueryLocal(val);
    updateParam('search', val);
  }, [updateParam]);

  // Fake state for Requisitions master-detail expansion
  const [expandedReq, setExpandedReq] = useState(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchQuery !== urlSearch) {
        updateParam('search', searchQuery);
        setCurrentPage(1);
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery, urlSearch, updateParam]);

  // Reset page number on tab change WITHOUT wiping URL search parameters!
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, activeSubTab]);

  useEffect(() => {
    if (activeSubTab === 'vendors') {
      setCurrentPage(1);
      fetchMasterData();
    }
  }, [showInactiveVendors]);

  const fetchMasterData = async () => {
    setIsLoading(true);
    try {
      let res;
      const params = { page: currentPage, limit: 10, search: debouncedSearch };
      if (activeSubTab === 'categories') {
        res = await inventoryService.getCategories(params);
      } else if (activeSubTab === 'subcategories') {
        res = await inventoryService.getSubcategories(params);
      } else if (activeSubTab === 'central') {
        res = await inventoryService.getCentralWarehouses(params);
      } else if (activeSubTab === 'vendors') {
        if (!showInactiveVendors) params.isActive = true;
        res = await inventoryService.getVendors(params);
      } else if (activeSubTab === 'central_stock' || activeSubTab === 'stock_adjustments') {
        if (adjStatus) params.status = adjStatus;
        if (adjReason) params.reason = adjReason;
        if (adjType) params.adjustmentType = adjType;
        if (selectedBranchId) params.branchId = selectedBranchId;
        res = await inventoryService.getStockAdjustments(params);
      }
      const data = res?.data?.data || res?.data || res || [];
      const meta = res?.data?.meta || res?.meta || {};
      setMasterData(Array.isArray(data) ? data : []);
      setTotalPages(meta.totalPages || 1);
      setTotalRecords(meta.totalRecords || meta.total || data.length || 0);
    } catch (error) {
      console.error("Failed to fetch master data", error);
      setMasterData([]);
      setTotalPages(1);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCatalogData = async () => {
    setIsLoading(true);
    try {
      const params = { page: currentPage, limit: 10, search: debouncedSearch };
      if (catalogCategoryId) params.categoryId = catalogCategoryId;
      if (catalogIsConsumable) params.isConsumable = catalogIsConsumable === 'true';
      
      const res = await inventoryService.getItems(params);
      const data = res?.data?.data || res?.data || res || [];
      const meta = res?.data?.meta || res?.meta || {};
      setCatalogData(Array.isArray(data) ? data : []);
      setTotalPages(meta.totalPages || 1);
      setTotalRecords(meta.totalRecords || meta.total || data.length || 0);
    } catch (error) {
      console.error("Failed to fetch catalog data", error);
      setCatalogData([]);
      setTotalPages(1);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAssetsData = async () => {
    setIsLoading(true);
    try {
      const params = { page: currentPage, limit: 10, search: debouncedSearch };
      if (assetLocation) {
        params.currentLocationType = assetLocation === 'central' ? 'CentralInventory' : 
                                     assetLocation === 'branch' ? 'Branch' : 'User';
      }
      if (assetStatus) params.status = assetStatus;
      if (assetCondition) params.condition = assetCondition;

      const res = await inventoryService.getAssets(params);
      const data = res?.data?.data || res?.data || res || [];
      const meta = res?.data?.meta || res?.meta || {};
      setAssetsData(Array.isArray(data) ? data : []);
      setAssetsStats(res?.data?.stats || res?.stats || null);
      setTotalPages(meta.totalPages || 1);
      setTotalRecords(meta.totalRecords || meta.total || data.length || 0);
    } catch (error) {
      console.error("Failed to fetch assets data", error);
      setAssetsData([]);
      setTotalPages(1);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTransfersData = async () => {
    setIsLoading(true);
    try {
      const params = { page: currentPage, limit: 10, search: debouncedSearch };
      const [transfersRes, reqsRes, adjRes] = await Promise.all([
        inventoryService.getTransfers(params).catch(() => ({ data: [] })),
        inventoryService.getRequisitions(params).catch(() => ({ data: [] })),
        inventoryService.getStockAdjustments(params).catch(() => ({ data: [] }))
      ]);
      const data = [
        ...(transfersRes?.data?.data || transfersRes?.data || []), 
        ...(reqsRes?.data?.data || reqsRes?.data || []),
        ...(adjRes?.data?.data || adjRes?.data || [])
      ];
      setTransfersData(data);
      const maxPages = Math.max(
        (transfersRes?.data?.meta?.totalPages || 1), 
        (reqsRes?.data?.meta?.totalPages || 1),
        (adjRes?.data?.meta?.totalPages || 1)
      );
      const totalRecs = (transfersRes?.data?.meta?.totalRecords || transfersRes?.data?.meta?.total || (transfersRes?.data?.data || []).length || 0) + 
                        (reqsRes?.data?.meta?.totalRecords || reqsRes?.data?.meta?.total || (reqsRes?.data?.data || []).length || 0) +
                        (adjRes?.data?.meta?.totalRecords || adjRes?.data?.meta?.total || (adjRes?.data?.data || []).length || 0);
      setTotalPages(maxPages);
      setTotalRecords(totalRecs);
    } catch (error) {
      console.error("Failed to fetch transfers data", error);
      setTransfersData([]);
      setTotalPages(1);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogsData = async () => {
    setIsLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: 10,
        search: debouncedSearch,
        type: logTxnType || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        branchId: selectedBranchId || undefined,
        centralInventoryId: selectedCentralId || undefined,
      };
      
      const res = await inventoryService.getTransactions(params);
      
      let data = [];
      let totalPagesData = 1;
      let totalRecordsData = 0;
      
      if (res?.data) {
        if (Array.isArray(res.data)) {
          data = res.data;
        } else if (res.data.data && Array.isArray(res.data.data)) {
          data = res.data.data;
          totalPagesData = res.data.meta?.totalPages || 1;
          totalRecordsData = res.data.meta?.totalRecords || res.data.meta?.total || data.length || 0;
        }
      }
      
      setLogsData(data);
      setTotalPages(totalPagesData);
      setTotalRecords(totalRecordsData);
    } catch (error) {
      console.error("Failed to fetch logs data", error);
      setLogsData([]);
      setTotalPages(1);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'master') fetchMasterData();
    else if (activeTab === 'catalog') fetchCatalogData();
    else if (activeTab === 'assets') fetchAssetsData();
    else if (activeTab === 'transfers') fetchTransfersData();
    else if (activeTab === 'logs') fetchLogsData();
  }, [activeTab, activeSubTab, currentPage, debouncedSearch, logTxnType, startDate, endDate, selectedBranchId, selectedCentralId, adjStatus, adjReason, adjType]);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const res = await inventoryService.getOverviewStats();
        setStatsData(res?.data || null);
      } catch (error) {
        console.error("Failed to fetch stats", error);
        setStatsData({
          overview: { totalCategories: 12, totalSubcategories: 34, totalMasterSKUs: 145, totalVendors: 20, totalCentralWarehouses: 2 },
          stockDistribution: { totalSocietyStockUnits: 4200, centralStock: { quantity: 3000, availableQuantity: 2750 }, branchStock: { quantity: 1200, availableQuantity: 1150 } },
          assets: { total: 350, active: 310, inRepair: 15, retired: 20, lost: 5 },
          pendingActions: { requisitionsAwaitingApproval: 4, transfersAwaitingApproval: 2, stockAdjustmentsAwaitingApproval: 1 }
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    const fetchDropdowns = async () => {
      try {
        if (permissions.canManageCentralWarehouse) {
          const res = await inventoryService.getCentralWarehouses({ limit: 100 });
          setCentralWarehousesDropdown(res?.data?.data || res?.data || []);
        }
        if (permissions.canViewSocietyStats) {
          const { branchService } = await import('../../api/branchService');
          const res = await branchService.getDropdownList().catch(() => ({ data: [] }));
          setBranchesDropdown(res?.data || []);
        }
      } catch (err) {
        console.error("Failed fetching dropdowns", err);
      }
    };

    fetchStats();
    fetchDropdowns();
  }, []);

  useEffect(() => {
    if (activeTab === 'overview' && permissions.canViewSocietyStats && selectedCentralId) {
      inventoryService.getCentralStats({ centralInventoryId: selectedCentralId, period: centralPeriod })
        .then(res => setCentralStatsData(res?.data))
        .catch(err => console.error(err));
    }
  }, [activeTab, selectedCentralId, centralPeriod]);

  useEffect(() => {
    if (activeTab === 'overview' && permissions.canViewBranchStats && selectedBranchId) {
      inventoryService.getBranchStats({ branchId: selectedBranchId, period: branchPeriod })
        .then(res => setBranchStatsData(res?.data))
        .catch(err => console.error(err));
    }
  }, [activeTab, selectedBranchId, branchPeriod]);

  useEffect(() => {
    if (activeTab === 'catalog') {
      setCurrentPage(1);
      fetchCatalogData();
    }
  }, [catalogCategoryId, catalogIsConsumable]);

  const handleModalClose = (success = false) => {
    setIsModalOpen(false);
    setEditItem(null);
    if (success === true && activeTab === 'master') fetchMasterData();
    if (success === true && activeTab === 'catalog') fetchCatalogData();
    if (success === true && activeTab === 'assets') fetchAssetsData();
    if (success === true && activeTab === 'transfers') fetchTransfersData();
  };

  const handleApproveRequest = (req) => {
    setEditItem(req);
    setModalType((req.transferId || req.fromLocationType) ? 'approve_transfer' : 'approve_request');
    setIsModalOpen(true);
  };

  const handleRejectRequest = (req) => {
    setEditItem(req);
    setModalType((req.transferId || req.fromLocationType) ? 'reject_transfer' : 'reject_request');
    setIsModalOpen(true);
  };

  const handleFulfillRequest = (req) => {
    setEditItem(req);
    setModalType('fulfill_request');
    setIsModalOpen(true);
  };

  const handleDispatchTransfer = (req) => {
    setEditItem(req);
    setModalType('dispatch_transfer');
    setIsModalOpen(true);
  };

  const handleReceiveTransfer = (req) => {
    setEditItem(req);
    setModalType('receive_transfer');
    setIsModalOpen(true);
  };

  const handleReportDamage = async (asset) => {
    try {
      const id = asset._id || asset.id;
      if (!id) return;
      await inventoryService.reportAssetDamage(id, { condition: 'DAMAGED' });
      toast.success("Damage reported successfully!");
      fetchAssetsData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to report damage.");
    }
  };

  const handleCompleteRepair = async (asset) => {
    try {
      const id = asset._id || asset.id;
      if (!id) return;
      await inventoryService.completeAssetRepair(id, { condition: 'GOOD' });
      toast.success("Repair completed successfully!");
      fetchAssetsData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to complete repair.");
    }
  };

  const handleRequestDisposal = async (asset) => {
    try {
      const id = asset._id || asset.id;
      if (!id) return;
      await inventoryService.requestAssetDisposal(id, { status: 'DISPOSED' });
      toast.success("Disposal requested successfully!");
      fetchAssetsData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to request disposal.");
    }
  };

  const displayedMasterData = useMemo(() => {
    if (!Array.isArray(masterData)) return [];
    return masterData.filter(item => matchesDateFilters(item, selectedDate, selectedMonth, selectedYear, startDate, endDate));
  }, [masterData, selectedDate, selectedMonth, selectedYear, startDate, endDate]);

  const displayedCatalogData = useMemo(() => {
    if (!Array.isArray(catalogData)) return [];
    return catalogData.filter(item => matchesDateFilters(item, selectedDate, selectedMonth, selectedYear, startDate, endDate));
  }, [catalogData, selectedDate, selectedMonth, selectedYear, startDate, endDate]);

  const displayedAssetsData = useMemo(() => {
    if (!Array.isArray(assetsData)) return [];
    return assetsData.filter(item => matchesDateFilters(item, selectedDate, selectedMonth, selectedYear, startDate, endDate));
  }, [assetsData, selectedDate, selectedMonth, selectedYear, startDate, endDate]);

  const displayedTransfersData = useMemo(() => {
    if (!Array.isArray(transfersData)) return [];
    return transfersData.filter(item => matchesDateFilters(item, selectedDate, selectedMonth, selectedYear, startDate, endDate));
  }, [transfersData, selectedDate, selectedMonth, selectedYear, startDate, endDate]);

  const displayedLogsData = useMemo(() => {
    if (!Array.isArray(logsData)) return [];
    return logsData.filter(item => matchesDateFilters(item, selectedDate, selectedMonth, selectedYear, startDate, endDate));
  }, [logsData, selectedDate, selectedMonth, selectedYear, startDate, endDate]);

  const renderDateMonthFilters = () => (
    <div className="flex flex-wrap items-center gap-2">
      {/* Date Range: From Date */}
      <div className="relative flex items-center">
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          title="From Date"
          className="pl-8 pr-3 py-2 rounded-xl border border-gray-200 bg-gray-50/70 hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#225091] focus:border-[#225091] text-xs font-semibold text-gray-700 shadow-2xs cursor-pointer min-w-[135px]"
        />
        <Calendar size={13} className="absolute left-2.5 text-gray-400 pointer-events-none" />
      </div>

      <span className="text-gray-400 text-xs font-bold">to</span>

      {/* Date Range: To Date */}
      <div className="relative flex items-center">
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          title="To Date"
          className="pl-8 pr-3 py-2 rounded-xl border border-gray-200 bg-gray-50/70 hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#225091] focus:border-[#225091] text-xs font-semibold text-gray-700 shadow-2xs cursor-pointer min-w-[135px]"
        />
        <Calendar size={13} className="absolute left-2.5 text-gray-400 pointer-events-none" />
      </div>

      {(startDate || endDate) && (
        <button
          onClick={() => {
            setStartDate('');
            setEndDate('');
          }}
          className="inline-flex items-center gap-1 px-2.5 py-2 text-[11px] font-semibold text-gray-600 hover:text-rose-600 bg-gray-100 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
          title="Reset Date Filters"
        >
          <RotateCcw size={12} />
          <span>Reset</span>
        </button>
      )}
    </div>
  );

  const renderPagination = () => {
    return (
      <Pagination
        page={currentPage}
        totalPages={totalPages}
        totalRecords={totalRecords}
        limit={10}
        onPageChange={setCurrentPage}
        disabled={isLoading}
      />
    );
  };

  const tabs = [
    ...(permissions.canManageCentralWarehouse || permissions.canViewBranchStats
      ? [{ id: 'master', label: permissions.canManageCentralWarehouse ? 'Central Inventory' : 'Branch Inventory', icon: <Building2 size={16} /> }]
      : []),
    ...(permissions.canViewCatalog ? [{ id: 'catalog', label: 'Catalog/Master Items', icon: <Layers size={16} /> }] : []),
    ...(permissions.canViewAssets ? [{ id: 'assets', label: 'Asset Lifecycle', icon: <ShieldCheck size={16} /> }] : []),
    ...(permissions.canViewTransfers ? [{ id: 'transfers', label: 'Requisitions & Transfers', icon: <ArrowRightLeft size={16} /> }] : []),
    ...(permissions.canViewLogs ? [{ id: 'logs', label: 'System Logs', icon: <Activity size={16} /> }] : [])
  ];

  const renderMasterSetup = () => {
    if (activeSubTab === 'central' && !permissions.canManageCentralWarehouse) {
      return <div className="p-8 text-center text-red-500 font-medium">Access Denied: You do not have permission to view Central Warehouses.</div>;
    }
    if (activeSubTab === 'vendors' && !permissions.canManageVendors) {
      return <div className="p-8 text-center text-red-500 font-medium">Access Denied: You do not have permission to view Vendors.</div>;
    }
    
    return (
    <div className="space-y-4">
      {/* Sub-Navigation Pills */}
      <div className="flex items-center gap-2 border-b border-gray-100 pb-2 overflow-x-auto">
        <button
          onClick={() => handleSubTabChange('categories')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'categories' ? 'bg-[#225091] text-white shadow-2xs' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          Categories
        </button>
        <button
          onClick={() => handleSubTabChange('subcategories')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'subcategories' ? 'bg-[#225091] text-white shadow-2xs' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          Subcategories
        </button>
        {permissions.canManageCentralWarehouse && (
          <>
            <button
              onClick={() => handleSubTabChange('central')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeSubTab === 'central' ? 'bg-[#225091] text-white shadow-2xs' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Central Warehouses
            </button>
            <button
              onClick={() => handleSubTabChange('central_stock')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeSubTab === 'central_stock' ? 'bg-[#225091] text-white shadow-2xs' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Central Stock
            </button>
            <button
              onClick={() => handleSubTabChange('stock_adjustments')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeSubTab === 'stock_adjustments' ? 'bg-[#225091] text-white shadow-2xs' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Stock Adjustments
            </button>
          </>
        )}
        {permissions.canManageVendors && (
          <button
            onClick={() => handleSubTabChange('vendors')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'vendors' ? 'bg-[#225091] text-white shadow-2xs' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Vendors
          </button>
        )}
      </div>
      
      {/* Filter Toolbar Card */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-gray-100 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
        <div className="relative w-full md:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeSubTab}...`} 
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-800 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#225091] focus:border-[#225091] transition-all shadow-2xs" 
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {renderDateMonthFilters()}
          {activeSubTab === 'vendors' && (
            <div className="flex items-center space-x-2 mr-2">
              <span className="text-xs font-semibold text-gray-600">Show Inactive</span>
              <button 
                type="button"
                onClick={() => setShowInactiveVendors(!showInactiveVendors)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${showInactiveVendors ? 'bg-[#225091]' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${showInactiveVendors ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>
          )}
          {activeSubTab === 'stock_adjustments' && (
            <>
              <select 
                value={adjStatus} 
                onChange={(e) => setAdjStatus(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#225091] cursor-pointer shadow-2xs"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <select 
                value={adjType} 
                onChange={(e) => setAdjType(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#225091] cursor-pointer shadow-2xs"
              >
                <option value="">All Types</option>
                <option value="INCREASE">Increase (+)</option>
                <option value="DECREASE">Decrease (-)</option>
              </select>

              <select 
                value={adjReason} 
                onChange={(e) => setAdjReason(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#225091] cursor-pointer shadow-2xs"
              >
                <option value="">All Reasons</option>
                <option value="DAMAGE">Damage</option>
                <option value="LOST">Lost</option>
                <option value="AUDIT_DISCREPANCY">Audit Discrepancy</option>
                <option value="RECOVERY">Recovery</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </>
          )}
          {activeSubTab === 'central_stock' && (
             <div className="relative">
               <select 
                 value={selectedCentralId} 
                 onChange={(e) => {
                   setSelectedCentralId(e.target.value);
                   setTimeout(fetchMasterData, 100);
                 }}
                 className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#225091] appearance-none pr-8 cursor-pointer shadow-2xs"
               >
                 <option value="">Select Warehouse...</option>
                 {centralWarehousesDropdown.map(wh => (
                   <option key={wh._id || wh.id} value={wh._id || wh.id}>{wh.name || wh.warehouseName}</option>
                 ))}
               </select>
               <ChevronDown size={14} className="text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
             </div>
          )}
          {((activeSubTab === 'categories' || activeSubTab === 'subcategories') && permissions.canManageCatalog) ||
           (activeSubTab === 'central' && permissions.canManageCentralWarehouse) ||
           (activeSubTab === 'vendors' && permissions.canManageVendors) ? (
            <button onClick={() => { setModalType(activeSubTab); setIsModalOpen(true); }} className="flex items-center gap-1.5 px-3.5 py-2 whitespace-nowrap shrink-0 bg-[#225091] text-white rounded-xl text-xs font-semibold hover:bg-[#193e73] transition-colors cursor-pointer shadow-2xs"><Plus size={15} /> <span>Add {activeSubTab === 'categories' ? 'Category' : activeSubTab === 'subcategories' ? 'Subcategory' : activeSubTab === 'central' ? 'Warehouse' : activeSubTab === 'vendors' ? 'Vendor' : 'Record'}</span></button>
          ) : null}
          {activeSubTab === 'stock_adjustments' && permissions.canManageAdjustments && (
            <button onClick={() => { setModalType('adjust_stock'); setIsModalOpen(true); }} className="flex items-center gap-1.5 px-3.5 py-2 whitespace-nowrap shrink-0 bg-[#225091] text-white rounded-xl text-xs font-semibold hover:bg-[#193e73] transition-colors cursor-pointer shadow-2xs"><Plus size={15} /> <span>Log Adjustment</span></button>
          )}
          {activeSubTab === 'central_stock' && permissions.canManageCentralWarehouse && (
            <button onClick={() => { setModalType('adjust_stock'); setIsModalOpen(true); }} className="flex items-center gap-1.5 px-3.5 py-2 whitespace-nowrap shrink-0 bg-[#225091] text-white rounded-xl text-xs font-semibold hover:bg-[#193e73] transition-colors cursor-pointer shadow-2xs"><Plus size={15} /> <span>Receive Stock</span></button>
          )}
          <ExportDropdown tableRef={masterTableRef} filename={`Inventory-Master-${activeSubTab}`} title={`Inventory Master - ${activeSubTab}`} />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        <TableWrapper minHeight="360px">
          <table ref={masterTableRef} className="w-full border-collapse min-w-[800px] text-center text-sm whitespace-nowrap">
            <thead className="bg-[#225091] text-white text-xs uppercase tracking-wider font-semibold border-b border-[#225091]">
              <tr>
                {activeSubTab === 'stock_adjustments' || activeSubTab === 'central_stock' ? (
                  <>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-left">SKU / Item</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">Type</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">Quantity</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">Reason</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">Location / Branch</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">Requested By</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">Status</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">Date</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center text-right">Actions</th>
                  </>
                ) : (
                  <>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">Code</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">Name</th>
                    {activeSubTab === 'vendors' && <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">Contact Person</th>}
                    {activeSubTab === 'vendors' && <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">Email / Phone</th>}
                    {activeSubTab === 'vendors' && <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">GST Number</th>}
                    {activeSubTab === 'central' && <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">Manager</th>}
                    {activeSubTab === 'categories' && <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">Description</th>}
                    {activeSubTab === 'subcategories' && <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">Parent Category</th>}
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">Status</th>
                    {(((activeSubTab === 'categories' || activeSubTab === 'subcategories') && permissions.canManageCatalog) ||
                     (activeSubTab === 'central' && permissions.canManageCentralWarehouse) ||
                     (activeSubTab === 'vendors' && permissions.canManageVendors)) && (
                      <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center text-right">Actions</th>
                    )}
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-[13px]">
              {isLoading ? (
                <tr><td colSpan="9" className="py-12 text-center text-gray-500">Loading data...</td></tr>
              ) : displayedMasterData.length === 0 ? (
                <tr><td colSpan="9" className="py-12 text-center text-gray-500">No records found.</td></tr>
              ) : (
                displayedMasterData.map((item) => {
                  if (activeSubTab === 'stock_adjustments' || activeSubTab === 'central_stock') {
                     const isPending = item.status === 'PENDING';
                     const assetTagDisplay = typeof item.assetId === 'object' ? (item.assetId?.assetTag || item.assetId?.serialNumber) : item.assetId;
                     const branchDisplay = typeof item.branchId === 'object' ? (item.branchId?.name || item.branchId?.code) : (item.locationType === 'CentralInventory' ? 'Central Store' : (item.branchId || 'N/A'));

                     return (
                      <tr key={item._id} className="hover:bg-blue-50/25 transition-colors group">
                        <td className="py-3.5 px-4 text-left whitespace-nowrap">
                          <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                            {typeof item.itemMasterId === 'object' ? item.itemMasterId?.name : (item.name || item.itemMasterId || 'Unknown')}
                            {assetTagDisplay && (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-200" title={`Asset Tag: ${assetTagDisplay}`}>
                                TAG: {assetTagDisplay}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono mt-0.5">{typeof item.itemMasterId === 'object' ? item.itemMasterId?.code : ''}</div>
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${item.adjustmentType === 'INCREASE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                            {item.adjustmentType}
                          </span>
                        </td>
                        <td className={`py-3.5 px-4 text-center font-bold whitespace-nowrap text-[13px] ${item.adjustmentType === 'INCREASE' ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {item.adjustmentType === 'INCREASE' ? '+' : '-'}{item.quantity}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700">
                            {item.reason}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center text-gray-600 text-xs whitespace-nowrap">
                          {branchDisplay}
                        </td>
                        <td className="py-3.5 px-4 text-center text-gray-600 whitespace-nowrap">
                          {item.requestedBy?.fullName || item.requestedBy?.name || 'System'}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${item.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border border-amber-200' : item.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>{item.status}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center text-gray-500 whitespace-nowrap text-xs">
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB') : 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                          {isPending && permissions.canApproveAdjustments && (
                            <>
                              <button onClick={() => handleEditClick(item, 'approve_adjustment')} className="p-1 text-gray-400 hover:text-emerald-600 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer" title="Approve"><CheckCircle size={15} /></button>
                              <button onClick={() => handleEditClick(item, 'reject_adjustment')} className="p-1 text-gray-400 hover:text-rose-600 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer" title="Reject"><XCircle size={15} /></button>
                            </>
                          )}
                          {isPending ? (
                            <>
                              <button onClick={() => handleEditClick(item, 'adjust_stock')} className="p-1 text-gray-400 hover:text-[#225091] hover:bg-gray-50 rounded-lg transition-colors cursor-pointer" title="Edit"><Edit2 size={15} /></button>
                              <button onClick={() => handleDeleteClick(item._id, 'adjust_stock')} className="p-1 text-gray-400 hover:text-rose-600 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer" title="Delete"><Trash2 size={15} /></button>
                            </>
                          ) : (
                            <span className="text-[11px] text-gray-400 italic px-1">Immutable</span>
                          )}
                        </td>
                      </tr>
                     );
                  }
                  
                  return (
                  <tr key={item._id} className="hover:bg-blue-50/25 transition-colors group">
                    <td className="py-3.5 px-4 font-mono font-medium text-gray-900 text-xs whitespace-nowrap">{item.code || item.vendorCode || item.warehouseCode || 'N/A'}</td>
                    <td className="py-3.5 px-4 font-semibold text-gray-900 whitespace-nowrap">{item.name || item.warehouseName || item.vendorName || 'N/A'}</td>
                    {activeSubTab === 'vendors' && <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap">{item.contactPerson || 'N/A'}</td>}
                    {activeSubTab === 'vendors' && <td className="py-3.5 px-4 text-gray-600 text-xs whitespace-nowrap">{item.email || ''}{item.phone ? ` • ${item.phone}` : ''}</td>}
                    {activeSubTab === 'vendors' && <td className="py-3.5 px-4 font-mono text-gray-600 text-xs whitespace-nowrap">{item.gstNumber || 'N/A'}</td>}
                    {activeSubTab === 'central' && <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap">{typeof item.managerId === 'object' ? (item.managerId?.fullName || item.managerId?.name || item.managerId?.email || 'N/A') : (item.managerId || 'N/A')}</td>}
                    {activeSubTab === 'categories' && <td className="py-3.5 px-4 text-gray-500 whitespace-nowrap">{item.description || 'N/A'}</td>}
                    {activeSubTab === 'subcategories' && <td className="py-3.5 px-4 text-gray-500 whitespace-nowrap">{item.categoryId?.name || item.categoryId || 'N/A'}</td>}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${(item.status === 'active' || (item.isActive !== false && !item.status)) ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-rose-50 text-rose-700 border-rose-200/60'}`}>
                        {(item.status === 'active' || (item.isActive !== false && !item.status)) ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {(((activeSubTab === 'categories' || activeSubTab === 'subcategories') && permissions.canManageCatalog) ||
                     (activeSubTab === 'central' && permissions.canManageCentralWarehouse) ||
                     (activeSubTab === 'vendors' && permissions.canManageVendors)) && (
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button onClick={() => handleEditClick(item, activeSubTab)} className="p-1 text-gray-400 hover:text-[#225091] hover:bg-gray-50 rounded-lg transition-colors cursor-pointer" title="Edit"><Edit2 size={15} /></button>
                        <button onClick={() => handleDeleteClick(item._id, activeSubTab)} className="p-1 text-gray-400 hover:text-rose-600 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer" title="Delete"><Trash2 size={15} /></button>
                      </td>
                    )}
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </TableWrapper>
        {renderPagination()}
      </div>
    </div>
    );
  };

  const renderCatalog = () => {
    if (!permissions.canManageCatalog && !permissions.isStaffScoped) {
       // Wait, staff can view catalog read-only.
    }
    return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-gray-100 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Master SKUs..." 
              className="w-full pl-9 pr-3 py-2 bg-gray-50/60 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:outline-none focus:bg-white focus:border-[#225091] focus:ring-1 focus:ring-[#225091]/20 transition-all" 
            />
          </div>
          <select 
            value={catalogCategoryId} 
            onChange={(e) => setCatalogCategoryId(e.target.value)}
            className="border border-gray-200 bg-gray-50/60 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 focus:outline-none focus:bg-white focus:border-[#225091] cursor-pointer">
            <option value="">All Categories</option>
            <option value="electronics">Electronics</option>
            <option value="furniture">Furniture</option>
            <option value="stationery">Stationery</option>
            <option value="other">Other / Miscellaneous</option>
          </select>
          <select 
            value={catalogIsConsumable} 
            onChange={(e) => setCatalogIsConsumable(e.target.value)}
            className="border border-gray-200 bg-gray-50/60 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 focus:outline-none focus:bg-white focus:border-[#225091] cursor-pointer">
            <option value="">All Types</option>
            <option value="true">Consumable</option>
            <option value="false">Non-Consumable</option>
          </select>
          {renderDateMonthFilters()}
        </div>
        <div className="flex items-center gap-2">
          {permissions.canManageCatalog && (
            <button onClick={() => { setModalType('catalog'); setIsModalOpen(true); }} className="flex items-center gap-1.5 px-3.5 py-2 whitespace-nowrap shrink-0 bg-[#225091] text-white rounded-xl text-xs font-semibold hover:bg-[#193e73] transition-colors shadow-xs cursor-pointer"><Plus size={15} /> <span>Create Item</span></button>
          )}
          {permissions.canAdjustStock && (
            <button onClick={() => { setModalType('adjust_stock'); setIsModalOpen(true); }} className="flex items-center gap-1.5 px-3.5 py-2 whitespace-nowrap shrink-0 border border-gray-200 bg-white text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"><Layers size={15} /> <span>Adjust Stock</span></button>
          )}
          <ExportDropdown tableRef={catalogTableRef} filename="Inventory-Catalog-Master" title="Inventory Master Catalog" />
        </div>
      </div>
      
      <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
        <TableWrapper minHeight="360px">
          <table ref={catalogTableRef} className="w-full border-collapse text-sm text-center whitespace-nowrap">
            <thead className="bg-[#225091] text-white text-xs uppercase tracking-wider font-semibold border-b border-[#225091]">
              <tr>
                <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center text-left">Code</th>
                <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center text-left">Name</th>
                <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center text-left">Category</th>
                <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center text-left">Subcategory</th>
                <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">Consumable</th>
                <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">Unit</th>
                <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center text-right">Min Stock</th>
                {permissions.canManageCatalog && <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan="8" className="py-12 text-center text-gray-400 font-medium text-xs">Loading catalog items...</td></tr>
              ) : displayedCatalogData.length === 0 ? (
                <tr><td colSpan="8" className="py-12 text-center text-gray-400 font-medium text-xs">No master SKUs found.</td></tr>
              ) : (
                displayedCatalogData.map((item) => (
                  <tr key={item._id || item.id} className="hover:bg-blue-50/25 transition-colors group">
                    <td className="py-3.5 px-4 text-[13px] font-bold text-slate-800 whitespace-nowrap font-mono">{item.code || 'N/A'}</td>
                    <td className="py-3.5 px-4 text-[13px] font-semibold text-slate-800 whitespace-nowrap">{item.name || 'N/A'}</td>
                    <td className="py-3.5 px-4 text-[13px] text-slate-600 font-medium whitespace-nowrap">{typeof item.categoryId === 'object' ? item.categoryId?.name : item.categoryId || 'N/A'}</td>
                    <td className="py-3.5 px-4 text-[13px] text-slate-600 font-medium whitespace-nowrap">{typeof item.subcategoryId === 'object' ? item.subcategoryId?.name : item.subcategoryId || 'N/A'}</td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {item.isConsumable ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#225091]">Yes</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-500">No</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center text-[13px] text-slate-600 font-medium whitespace-nowrap">{item.unit || item.unitOfMeasure || 'N/A'}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-800 text-[13px] whitespace-nowrap">{item.minimumStockLevel || 0}</td>
                    {permissions.canManageCatalog && (
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button onClick={() => handleEditClick(item, 'catalog')} className="p-1 text-gray-400 hover:text-[#225091] hover:bg-gray-50 rounded-lg transition-colors cursor-pointer" title="Edit"><Edit2 size={15} /></button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableWrapper>
        {renderPagination()}
      </div>
    </div>
    );
  };

  const renderAssets = () => {
    // Client-side fallback stats calculation
    const fallbackStats = {
      available: assetsData.filter(a => a.status === 'active' && a.currentLocationType !== 'User').length,
      assigned: assetsData.filter(a => a.status === 'active' && a.currentLocationType === 'User').length,
      inRepair: assetsData.filter(a => a.status === 'in_repair').length,
      lost: assetsData.filter(a => a.status === 'lost').length,
    };

    return (
    <div className="space-y-3">
      {/* Stats Cards Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2 w-full">
        <StatsCard
          layout="centered"
          label="Available Pool"
          value={assetsStats?.available ?? fallbackStats.available}
          color="emerald"
        />
        <StatsCard
          layout="centered"
          label="Assigned"
          value={assetsStats?.assigned ?? fallbackStats.assigned}
          color="blue"
        />
        <StatsCard
          layout="centered"
          label="In Repair"
          value={assetsStats?.inRepair ?? fallbackStats.inRepair}
          color="amber"
        />
        <StatsCard
          layout="centered"
          label="Lost/Missing"
          value={assetsStats?.lost ?? fallbackStats.lost}
          color="rose"
        />
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-xs border border-gray-100 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Asset Tags or Serial Nos..." 
              className="w-full pl-9 pr-3 py-2 bg-gray-50/60 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:outline-none focus:bg-white focus:border-[#225091] focus:ring-1 focus:ring-[#225091]/20 transition-all" 
            />
          </div>
          <select 
            value={assetLocation} 
            onChange={(e) => setAssetLocation(e.target.value)}
            className="border border-gray-200 bg-gray-50/60 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 focus:outline-none focus:bg-white focus:border-[#225091] cursor-pointer">
            <option value="">All Locations</option>
            <option value="central">Central Warehouse</option>
            <option value="branch">Branch Offices</option>
            <option value="employee">With Employees</option>
          </select>
          <select 
            value={assetStatus} 
            onChange={(e) => setAssetStatus(e.target.value)}
            className="border border-gray-200 bg-gray-50/60 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 focus:outline-none focus:bg-white focus:border-[#225091] cursor-pointer">
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="in_repair">In Repair</option>
            <option value="retired">Retired/Disposed</option>
            <option value="lost">Lost</option>
          </select>
          <select 
            value={assetCondition} 
            onChange={(e) => setAssetCondition(e.target.value)}
            className="border border-gray-200 bg-gray-50/60 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 focus:outline-none focus:bg-white focus:border-[#225091] cursor-pointer">
            <option value="">All Conditions</option>
            <option value="new">New</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="damaged">Damaged</option>
            <option value="scrapped">Scrapped</option>
          </select>
          {renderDateMonthFilters()}
        </div>
        <div className="flex items-center gap-2">
          {!isBranchManager && (
            <button onClick={() => { setModalType('assets'); setIsModalOpen(true); }} className="flex items-center gap-1.5 px-3.5 py-2 whitespace-nowrap shrink-0 bg-[#225091] text-white rounded-xl text-xs font-semibold hover:bg-[#193e73] transition-colors shadow-xs cursor-pointer"><Plus size={15} /> <span>Register Asset</span></button>
          )}
          <ExportDropdown tableRef={assetsTableRef} filename="Inventory-Registered-Assets" title="Inventory Registered Assets" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
        <TableWrapper minHeight="360px">
          <table ref={assetsTableRef} className="w-full border-collapse text-sm text-center whitespace-nowrap">
            <thead className="bg-[#225091] text-white text-xs uppercase tracking-wider font-semibold border-b border-[#225091]">
              <tr>
                <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center text-left">Asset Tag</th>
                <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center text-left">Item Master</th>
                <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center text-left">Serial No.</th>
                <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center text-left">Current Location / Assignee</th>
                <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center text-left">Condition</th>
                <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center text-left">Purchase Date / Warranty</th>
                <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">Asset Status</th>
                <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan="8" className="py-12 text-center text-gray-400 font-medium text-xs">Loading assets...</td></tr>
              ) : displayedAssetsData.length === 0 ? (
                <tr><td colSpan="8" className="py-12 text-center text-gray-400 font-medium text-xs">No registered assets found.</td></tr>
              ) : (
                displayedAssetsData.map((asset) => (
                  <tr key={asset._id || asset.id} className="hover:bg-blue-50/25 transition-colors group">
                    <td className="py-3.5 px-4 text-[13px] font-bold text-slate-900 whitespace-nowrap font-mono">{asset.assetTag || 'N/A'}</td>
                    <td className="py-3.5 px-4 text-[13px] font-semibold text-slate-800 whitespace-nowrap">{typeof asset.itemMasterId === 'object' ? asset.itemMasterId.name : (asset.itemName || 'Unknown Item')}</td>
                    <td className="py-3.5 px-4 text-[13px] font-mono text-slate-500 whitespace-nowrap">{asset.serialNumber || 'N/A'}</td>
                    <td className="py-3.5 px-4 text-[13px] text-slate-600 font-medium whitespace-nowrap">{asset.assignedTo ? `User: ${typeof asset.assignedTo === 'object' ? asset.assignedTo.name : asset.assignedTo}` : (typeof asset.currentLocation === 'object' ? asset.currentLocation?.name || 'Central Warehouse' : asset.currentLocation || 'Central Warehouse')}</td>
                    <td className="py-3.5 px-4 text-[13px] text-slate-600 font-medium whitespace-nowrap">{asset.condition || 'Good'}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">{new Date(asset.purchaseDate || asset.createdAt).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${asset.status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-700' : asset.status === 'ASSIGNED' ? 'bg-blue-50 text-[#225091]' : 'bg-amber-50 text-amber-700'}`}>
                        {asset.status || 'Active'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {/* View Details */}
                      <button onClick={() => { setSelectedAssetId(asset._id || asset.id); setIsAssetDrawerOpen(true); }} className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer" title="View Details"><Eye size={15} /></button>

                      {/* Available in Pool */}
                      {asset.status === 'active' && asset.currentLocationType !== 'User' && (
                        <>
                          <button onClick={() => { setEditItem(asset); setModalType('assign_asset'); setIsModalOpen(true); }} className="p-1 text-gray-400 hover:text-[#225091] hover:bg-gray-50 rounded-lg transition-colors cursor-pointer" title="Assign to Employee"><Users size={15} /></button>
                          <button onClick={() => { setEditItem(asset); setModalType('report_damage'); setIsModalOpen(true); }} className="p-1 text-gray-400 hover:text-amber-600 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer" title="Report Damage"><ShieldAlert size={15} /></button>
                          <button onClick={() => { setEditItem(asset); setModalType('report_lost'); setIsModalOpen(true); }} className="p-1 text-gray-400 hover:text-rose-600 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer" title="Report Lost"><AlertCircle size={15} /></button>
                        </>
                      )}
                      
                      {/* Assigned to Employee */}
                      {asset.status === 'active' && asset.currentLocationType === 'User' && (
                        <>
                          <button onClick={() => { setEditItem(asset); setModalType('return_asset'); setIsModalOpen(true); }} className="p-1 text-gray-400 hover:text-emerald-600 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer" title="Return Asset"><RotateCcw size={15} /></button>
                          <button onClick={() => { setEditItem(asset); setModalType('report_damage'); setIsModalOpen(true); }} className="p-1 text-gray-400 hover:text-amber-600 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer" title="Report Damage"><ShieldAlert size={15} /></button>
                          <button onClick={() => { setEditItem(asset); setModalType('report_lost'); setIsModalOpen(true); }} className="p-1 text-gray-400 hover:text-rose-600 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer" title="Report Lost"><AlertCircle size={15} /></button>
                        </>
                      )}

                      {/* Maintenance / In Repair */}
                      {asset.status === 'in_repair' && (
                        <>
                          <button onClick={() => { setEditItem(asset); setModalType('complete_repair'); setIsModalOpen(true); }} className="p-1 text-gray-400 hover:text-emerald-600 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer" title="Complete Repair"><Wrench size={15} /></button>
                          {!asset.disposalRequested && (
                            <button onClick={() => { setEditItem(asset); setModalType('request_disposal'); setIsModalOpen(true); }} className="p-1 text-gray-400 hover:text-slate-800 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer" title="Request Disposal"><Trash2 size={15} /></button>
                          )}
                          {asset.disposalRequested && permissions.canApproveAdjustments && (
                            <button onClick={() => { setEditItem(asset); setModalType('approve_disposal'); setIsModalOpen(true); }} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer" title="Approve Disposal"><CheckCircle size={15} /></button>
                          )}
                        </>
                      )}

                      {/* Under Investigation / Lost */}
                      {asset.status === 'lost' && (
                        <button onClick={() => { setEditItem(asset); setModalType('recover_asset'); setIsModalOpen(true); }} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer" title="Recover Asset"><Search size={15} /></button>
                      )}

                      {/* Disposed / Retired */}
                      {asset.status === 'retired' && (
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Read-Only</span>
                      )}

                      {asset.status !== 'retired' && (
                        <button onClick={() => handleEditClick(asset, 'assets')} className="p-1 text-gray-400 hover:text-[#225091] hover:bg-gray-50 rounded-lg transition-colors cursor-pointer" title="Edit Master Info"><Edit2 size={15} /></button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableWrapper>
        {renderPagination()}
      </div>
    </div>
    );
  };

  const renderRequisitions = () => (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-gray-100 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={reqStatus}
            onChange={(e) => setReqStatus(e.target.value)}
            className="border border-gray-200 bg-gray-50/60 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-700 focus:outline-none focus:bg-white focus:border-[#225091] cursor-pointer">
            <option value="">All Workflow Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="DISPATCHED">DISPATCHED</option>
            <option value="RECEIVED">RECEIVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
          {renderDateMonthFilters()}
        </div>
        <div className="flex items-center gap-2">
          {(permissions.canApproveRequisitions || permissions.canFulfillRequisitions || permissions.roleLevel === 'ADMIN' || permissions.roleLevel === 'BRANCH_MANAGER' || permissions.roleLevel === 'BRANCH_OFFICER') && (
            <button 
              onClick={() => { setModalType('direct_issue'); setIsModalOpen(true); }} 
              className="flex items-center gap-1.5 px-3.5 py-2 whitespace-nowrap shrink-0 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
              title="Issue stock immediately across counter"
            >
              <Package size={15} /> <span>Direct Issue</span>
            </button>
          )}
          <button onClick={() => { setModalType('requests'); setIsModalOpen(true); }} className="flex items-center gap-1.5 px-3.5 py-2 whitespace-nowrap shrink-0 bg-[#225091] text-white rounded-xl text-xs font-semibold hover:bg-[#193e73] transition-colors shadow-xs cursor-pointer"><ShoppingCart size={15} /> <span>Submit Request</span></button>
          <button onClick={() => { setModalType('transfers'); setIsModalOpen(true); }} className="flex items-center gap-1.5 px-3.5 py-2 whitespace-nowrap shrink-0 border border-gray-200 bg-white text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"><ArrowRightLeft size={15} /> <span>Submit Transfer</span></button>
          <ExportDropdown tableRef={transfersTableRef} filename="Inventory-Requisitions-Transfers" title="Inventory Requests & Transfers" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
        <TableWrapper minHeight="360px">
          <table ref={transfersTableRef} className="w-full border-collapse text-sm text-center whitespace-nowrap">
            <thead className="bg-[#225091] text-white text-xs uppercase tracking-wider font-semibold border-b border-[#225091]">
              <tr>
                <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center text-left">Req ID / Transfer ID</th>
                <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center text-left">Origin &rarr; Destination</th>
                <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center text-left">Employee</th>
                <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center text-left">Remarks</th>
                <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">Status</th>
                <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan="8" className="py-12 text-center text-gray-400 font-medium text-xs">Loading requisitions and transfers...</td></tr>
              ) : displayedTransfersData.length === 0 ? (
                <tr><td colSpan="8" className="py-12 text-center text-gray-400 font-medium text-xs">No action requests found.</td></tr>
              ) : (
                displayedTransfersData.map((req) => (
                  <React.Fragment key={req._id || req.id}>
                    <tr className="hover:bg-blue-50/25 transition-colors group">
                      <td className="py-3.5 px-4 text-[13px] font-bold text-slate-800 whitespace-nowrap font-mono">{req.code || req.requisitionId || (req.fromLocationType ? 'TRF-' + (req._id || req.id || '').slice(-5).toUpperCase() : null) || (req.adjustmentType ? 'ADJ-' + (req._id || req.id || '').slice(-5).toUpperCase() : 'REQ-XXX')}</td>
                      <td className="py-3.5 px-4 text-[13px] text-slate-700 font-medium whitespace-nowrap">
                        {req.fromLocationType ? (
                          <div className="flex items-center gap-2 justify-start">
                            <span className="text-slate-500 truncate max-w-[120px]" title={req.fromLocationId?.name || req.fromLocationId}>{req.fromLocationId?.name || 'Origin'}</span>
                            <ArrowRightLeft size={12} className="text-gray-400 shrink-0" />
                            <span className="text-slate-800 truncate max-w-[120px]" title={req.toLocationId?.name || req.toLocationId}>{req.toLocationId?.name || 'Destination'}</span>
                          </div>
                        ) : req.adjustmentType ? (
                          <span className="text-amber-600">Stock Adjustment</span>
                        ) : (
                          <span className="text-blue-600">Requisition ({req.branchId?.name || 'Branch'})</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-[13px] text-slate-600 font-medium whitespace-nowrap">{req.requestedBy?.fullName || (typeof req.employeeId === 'object' ? req.employeeId?.name : req.employeeId) || 'System'}</td>
                      <td className="py-3.5 px-4 text-[13px] text-slate-500 max-w-[200px] truncate">{req.remarks || 'No remarks provided'}</td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${req.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : req.status === 'APPROVED' ? 'bg-blue-50 text-[#225091]' : req.status === 'REJECTED' ? 'bg-rose-50 text-rose-700' : req.status === 'DISPATCHED' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          {req.status || 'PENDING'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => { setEditItem(req); setModalType('view_details'); setIsModalOpen(true); }} className="px-2.5 py-1 text-xs font-semibold text-[#225091] border border-gray-200 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1">
                            <Eye size={14} /> View Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </TableWrapper>
        {renderPagination()}
      </div>
    </div>
  );

  const renderTopStats = () => {
    const reqCount = statsData ? ((statsData.pendingActions?.requisitionsAwaitingApproval || 0) + (statsData.pendingActions?.transfersAwaitingApproval || 0)) : 0;

    return (
      <div className="mb-5 mt-2 space-y-3">
        {/* Primary Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-3">
          <StatsCard
            layout="centered"
            color="blue"
            label="Total SKUs"
            value={isLoading && !statsData ? '...' : (statsData?.overview?.totalMasterSKUs ?? 0)}
            isActive={activeTab === 'catalog'}
            onClick={() => handleTabChange('catalog')}
          />
          <StatsCard
            layout="centered"
            color="indigo"
            label="Categories"
            value={isLoading && !statsData ? '...' : (statsData?.overview?.totalCategories ?? 0)}
            isActive={activeTab === 'master' && activeSubTab === 'categories'}
            onClick={() => handleTabChange('master', 'categories')}
          />
          <StatsCard
            layout="centered"
            color="emerald"
            label="Total Assets"
            value={isLoading && !statsData ? '...' : (statsData?.assets?.total ?? 0)}
            isActive={activeTab === 'assets' && activeSubTab !== 'active'}
            onClick={() => handleTabChange('assets', 'all')}
          />
          <StatsCard
            layout="centered"
            color="cyan"
            label="Active Assets"
            value={isLoading && !statsData ? '...' : (statsData?.assets?.active ?? 0)}
            isActive={activeTab === 'assets' && activeSubTab === 'active'}
            onClick={() => handleTabChange('assets', 'active')}
          />
          {permissions.canViewSocietyStats && (
            <StatsCard
              layout="centered"
              color="teal"
              label="Central Stock"
              value={isLoading && !statsData ? '...' : (statsData?.stockDistribution?.centralStock?.quantity ?? 0)}
              isActive={activeTab === 'master' && activeSubTab === 'central_stock'}
              onClick={() => handleTabChange('master', 'central_stock')}
            />
          )}
          <StatsCard
            layout="centered"
            color="rose"
            label="Branch Stock"
            value={isLoading && !statsData ? '...' : (statsData?.stockDistribution?.branchStock?.quantity ?? 0)}
            isActive={activeTab === 'master' && activeSubTab === 'branch_stock'}
            onClick={() => handleTabChange('master', 'branch_stock')}
          />
          <StatsCard
            layout="centered"
            color={reqCount > 0 ? 'rose' : 'gray'}
            label="Action Req."
            value={isLoading && !statsData ? '...' : reqCount}
            sublabel={reqCount > 0 ? 'Needs Attention' : 'All Clear'}
            isActive={activeTab === 'transfers'}
            onClick={() => handleTabChange('transfers')}
          />
        </div>

        {/* Secondary Warehouse & Branch Filters */}
        {(permissions.canViewSocietyStats || permissions.canViewBranchStats) && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-2xs">
            <div className="flex flex-wrap items-center gap-3">
              {permissions.canViewSocietyStats && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Central WH:</span>
                  <div className="relative">
                    <select 
                      value={selectedCentralId} 
                      onChange={(e) => setSelectedCentralId(e.target.value)}
                      className="appearance-none bg-slate-50/70 border border-gray-200 hover:border-gray-300 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 pr-7 focus:outline-none focus:border-[#225091] cursor-pointer"
                    >
                      <option value="">All Warehouses</option>
                      {centralWarehousesDropdown.map(wh => (
                        <option key={wh._id || wh.id} value={wh._id || wh.id}>{wh.name || wh.warehouseName}</option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <div className="relative">
                    <select 
                      value={centralPeriod} 
                      onChange={(e) => setCentralPeriod(e.target.value)}
                      className="appearance-none bg-slate-50/70 border border-gray-200 hover:border-gray-300 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 pr-7 focus:outline-none focus:border-[#225091] cursor-pointer"
                    >
                      <option value="7d">Last 7 days</option>
                      <option value="30d">Last 30 days</option>
                      <option value="90d">Last 90 days</option>
                      <option value="all">All time</option>
                    </select>
                    <ChevronDown size={13} className="text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              )}

              {permissions.canViewBranchStats && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Branch:</span>
                  <div className="relative">
                    <select 
                      value={selectedBranchId} 
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      className="appearance-none bg-slate-50/70 border border-gray-200 hover:border-gray-300 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 pr-7 focus:outline-none focus:border-[#225091] cursor-pointer disabled:opacity-60"
                      disabled={permissions.roleLevel !== 'ADMIN'}
                    >
                      <option value="">{permissions.roleLevel === 'ADMIN' ? 'All Branches' : 'My Branch'}</option>
                      {branchesDropdown.map(b => (
                        <option key={b._id || b.id} value={b._id || b.id}>{b.name || b.branchName}</option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <div className="relative">
                    <select 
                      value={branchPeriod} 
                      onChange={(e) => setBranchPeriod(e.target.value)}
                      className="appearance-none bg-slate-50/70 border border-gray-200 hover:border-gray-300 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 pr-7 focus:outline-none focus:border-[#225091] cursor-pointer"
                    >
                      <option value="7d">Last 7 days</option>
                      <option value="30d">Last 30 days</option>
                      <option value="90d">Last 90 days</option>
                      <option value="all">All time</option>
                    </select>
                    <ChevronDown size={13} className="text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dynamic Detail Cards for selected Warehouse/Branch stats */}
        {(centralStatsData || branchStatsData) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {centralStatsData && (
              <>
                <StatsCard layout="centered" color="teal" label="Central Quantity" value={centralStatsData.stock?.totalQuantity || 0} />
                <StatsCard layout="centered" color="teal" label="Central SKUs" value={centralStatsData.stock?.totalUniqueSKUs || 0} />
              </>
            )}
            {branchStatsData && (
              <>
                <StatsCard layout="centered" color="rose" label="Branch Quantity" value={branchStatsData.stock?.totalQuantity || 0} />
                <StatsCard layout="centered" color="rose" label="Branch Assets" value={branchStatsData.assets?.totalInBranch || 0} />
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderLogs = () => {
    if (permissions.roleLevel !== 'ADMIN') {
      return (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-xs">
          <p className="text-rose-600 font-semibold text-sm">Access Denied: System logs are restricted to Administrators.</p>
        </div>
      );
    }
    
    return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-gray-100 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={logTxnType}
            onChange={(e) => setLogTxnType(e.target.value)}
            className="border border-gray-200 bg-gray-50/60 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-700 focus:outline-none focus:bg-white focus:border-[#225091] cursor-pointer">
            <option value="">All Transaction Types</option>
            <option value="STOCK_IN">STOCK_IN</option>
            <option value="ISSUE">ISSUE</option>
            <option value="RETURN">RETURN</option>
            <option value="TRANSFER">TRANSFER</option>
            <option value="ADJUSTMENT">ADJUSTMENT</option>
          </select>
          {renderDateMonthFilters()}
        </div>
        <button 
          onClick={async () => {
            try {
              const params = { type: logTxnType, startDate, endDate, branchId: selectedBranchId, centralInventoryId: selectedCentralId, search: searchQuery };
              const blob = await inventoryService.exportTransactions(params);
              const url = window.URL.createObjectURL(new Blob([blob]));
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', `inventory-system-logs-${new Date().getTime()}.csv`);
              document.body.appendChild(link);
              link.click();
              link.remove();
            } catch (error) {
              console.error("Export failed", error);
            }
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 whitespace-nowrap shrink-0 border border-gray-200 bg-white text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
        >
          <Download size={15} /> Export Trail
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
        <TableWrapper minHeight="360px">
          <table ref={auditLogsTableRef} className="w-full border-collapse text-sm text-center whitespace-nowrap">
            <thead className="bg-[#225091] text-white text-xs uppercase tracking-wider font-semibold border-b border-[#225091]">
              <tr>
                <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center text-left">Timestamp</th>
                <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center text-left">Action Type</th>
                <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center text-left">Entity Type</th>
                <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center text-left">User</th>
                <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center text-left">Remarks</th>
                <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan="6" className="py-12 text-center text-gray-400 font-medium text-xs">Loading system logs...</td></tr>
              ) : displayedLogsData.length === 0 ? (
                <tr><td colSpan="6" className="py-12 text-center text-gray-400 font-medium text-xs">No system logs found.</td></tr>
              ) : (
                displayedLogsData.map((log) => (
                  <tr key={log._id || log.id} className="hover:bg-blue-50/25 transition-colors group">
                    <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap font-mono">{new Date(log.createdAt || log.timestamp || Date.now()).toLocaleString()}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${log.actionType === 'STOCK_IN' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-[#225091]'}`}>
                        {log.actionType || log.type || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[13px] text-slate-700 font-medium whitespace-nowrap">{log.entityType || 'InventoryTransaction'}</td>
                    <td className="py-3.5 px-4 text-[13px] text-slate-600 font-medium whitespace-nowrap">{typeof log.user === 'object' ? (log.user?.fullName || log.user?.name || log.user?.email) : (typeof log.performedBy === 'object' ? log.performedBy?.fullName : log.performedBy || log.user || 'System')}</td>
                    <td className="py-3.5 px-4 text-[13px] text-slate-600 font-medium">{log.remarks || log.details?.remarks || 'No details'}</td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button onClick={() => { setEditItem(log); setModalType('log_details'); setIsModalOpen(true); }} className="px-2.5 py-1 text-xs font-semibold text-[#225091] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer">View</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableWrapper>
        {renderPagination()}
      </div>
    </div>
    );
  };

  return (
    <div className="max-w-[1600px] mx-auto pb-4">
      <PageHeader
        title="Inventory Control System"
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Society Operations' },
          { label: 'Inventory' }
        ]}
        showBack={true}
        backUrl="/dashboard"
        onBack={() => {
          if (activeTab !== 'master') {
            handleTabChange('master');
          } else {
            navigate('/dashboard');
          }
        }}
      />

      {/* Persistent Stats Row */}
      {renderTopStats()}

      {/* Horizontal Tabs below stats */}
      <div className="mt-2 flex items-center gap-6 border-b border-gray-200/80 px-2 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex items-center space-x-2 pb-2.5 font-semibold text-xs sm:text-sm transition-all cursor-pointer relative whitespace-nowrap ${
              activeTab === tab.id 
                ? 'text-[#225091] font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-[#225091]' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Active Filter Chips — covers entire inventory module */}
      {(() => {
        const chipClass = "inline-flex items-center gap-1 bg-[#e8edf5] text-[#225091] rounded-full px-3 py-1 text-xs font-medium";
        const xClass = "ml-1 hover:text-red-500 transition-colors font-bold cursor-pointer";
        const chips = [];

        if (searchQuery) chips.push({ label: `Search: "${searchQuery}"`, onClear: () => setSearchQuery('') });
        if (catalogCategoryId) chips.push({ label: `Category: ${catalogCategoryId}`, onClear: () => setCatalogCategoryId('') });
        if (catalogIsConsumable) chips.push({ label: `Type: ${catalogIsConsumable === 'true' ? 'Consumable' : 'Non-Consumable'}`, onClear: () => setCatalogIsConsumable('') });
        if (showInactiveVendors) chips.push({ label: 'Showing Inactive Vendors', onClear: () => setShowInactiveVendors(false) });
        if (assetLocation) chips.push({ label: `Location: ${assetLocation === 'central' ? 'Central Warehouse' : assetLocation === 'branch' ? 'Branch Offices' : 'With Employees'}`, onClear: () => setAssetLocation('') });
        if (reqStatus) chips.push({ label: `Status: ${reqStatus}`, onClear: () => setReqStatus('') });
        if (logTxnType) chips.push({ label: `Txn Type: ${logTxnType}`, onClear: () => setLogTxnType('') });
        if (logDate) chips.push({ label: `Date: ${logDate}`, onClear: () => setLogDate('') });
        if (selectedMonth && selectedMonth !== 'ALL') {
          const monthObj = MONTHS_LIST.find(m => m.value === selectedMonth);
          chips.push({ label: `Month: ${monthObj?.label || selectedMonth}`, onClear: () => setSelectedMonth('ALL') });
        }
        if (selectedDate) chips.push({ label: `Date: ${selectedDate}`, onClear: () => setSelectedDate('') });
        if (startDate) chips.push({ label: `From: ${startDate}`, onClear: () => setStartDate('') });
        if (endDate) chips.push({ label: `To: ${endDate}`, onClear: () => setEndDate('') });

        if (chips.length === 0) return null;

        const clearAll = () => {
          setSearchQuery(''); setCatalogCategoryId(''); setCatalogIsConsumable('');
          setShowInactiveVendors(false); setAssetLocation(''); setReqStatus('');
          setLogTxnType(''); setLogDate('');
          setSelectedMonth('ALL'); setSelectedDate(''); setStartDate(''); setEndDate('');
        };

        return (
          <div className="mt-3 flex flex-wrap items-center gap-2 px-1">
            <span className="text-xs font-semibold text-gray-500 mr-1">Active Filters:</span>
            {chips.map((chip, i) => (
              <span key={i} className={chipClass}>
                {chip.label}
                <button onClick={chip.onClear} className={xClass}>×</button>
              </span>
            ))}
            {chips.length > 1 && (
              <button
                onClick={clearAll}
                className="text-xs text-red-500 hover:text-red-700 font-semibold ml-2 underline transition-colors cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>
        );
      })()}

      {/* Main Content Area */}
      <div className="mt-3 w-full">
        {activeTab === 'master' && renderMasterSetup()}
        {activeTab === 'catalog' && renderCatalog()}
        {activeTab === 'assets' && renderAssets()}
        {activeTab === 'transfers' && renderRequisitions()}
        {activeTab === 'logs' && renderLogs()}
      </div>

      <InventoryModals 
        isOpen={isModalOpen} 
        onClose={handleModalClose} 
        modalType={modalType} 
        initialData={editItem}
        authUser={authUser}
        permissions={permissions}
        onChangeModalType={setModalType}
      />

      <AssetDetailDrawer 
        isOpen={isAssetDrawerOpen} 
        onClose={() => { setIsAssetDrawerOpen(false); setSelectedAssetId(null); }} 
        assetId={selectedAssetId} 
      />
    </div>
  );
};

// Helper for expand icon
const ChevronIcon = ({ expanded }) => (
  <svg 
    className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90 text-[#225091]' : ''}`} 
    fill="none" viewBox="0 0 24 24" stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

export default SocietyInventorySPA;
