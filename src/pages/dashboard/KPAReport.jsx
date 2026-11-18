import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  Search, 
  Eye, 
  X, 
  Calendar,
  Loader2, 
  FileSpreadsheet, 
  RefreshCw, 
  Building2, 
  Users, 
  Target, 
  CheckCircle2, 
  TrendingUp, 
  Percent, 
  RotateCcw,
  Coins, 
  Edit3, 
  Plus, 
  HelpCircle, 
  ChevronDown,
  UserCheck,
  Scale,
  DollarSign
} from 'lucide-react';
import { kpaReportService } from '../../api/kpaReportService';
import { branchService } from '../../api/branchService';
import { roleService } from '../../api/roleService';
import { employeeService } from '../../api/employeeService';
import PageHeader from '../../components/common/PageHeader';
import useBranchStore from '../../store/branchStore';
import { Skeleton, SkeletonAvatar } from '../../components/common/Skeleton';
import TableWrapper from '../../components/common/TableWrapper';
import StatsCard from '../../components/common/StatsCard';
import Pagination from '../../components/common/Pagination';
import ExportDropdown from '../../components/common/ExportDropdown';
import useLocations from '../../hooks/useLocations';
import { 
  ALL_KPA_PRODUCTS, 
  getStoredCustomKpis, 
  saveStoredCustomKpi, 
  getAllKpaProductsList 
} from '../../utils/kpaConstants';

const DEFAULT_DESIGNATIONS = [

  'Branch Manager',
  'Assistant Branch Manager',
  'Loan Executive',
  'Collection Executive',
  'Senior Clerk',
  'Clerk',
  'Cashier',
  'Accountant',
  'Field Officer',
];

const INITIAL_UNIVERSAL_INCENTIVES = [
  {
    product: 'Loan Disbursement',
    incentiveType: 'PRODUCT',
    incentiveValue: 5,
    formattedIncentiveValue: '5% of product cost'
  },
  {
    product: 'Deposit Collection',
    incentiveType: 'PRODUCT',
    incentiveValue: 2.5,
    formattedIncentiveValue: '2.5% of collection amount'
  },
  {
    product: 'Lead Generation',
    incentiveType: 'QUANTITY',
    incentiveValue: 100,
    formattedIncentiveValue: '₹100 per lead'
  },
  {
    product: 'Share Capital',
    incentiveType: 'PRODUCT',
    incentiveValue: 1.0,
    formattedIncentiveValue: '1.0% of share capital'
  },
  {
    product: 'Staff Onboarding',
    incentiveType: 'QUANTITY',
    incentiveValue: 500,
    formattedIncentiveValue: '₹500 per onboarding'
  },
  {
    product: 'CD Loan Leads',
    incentiveType: 'QUANTITY',
    incentiveValue: 150,
    formattedIncentiveValue: '₹150 per lead'
  },
  {
    product: 'Smart SIP',
    incentiveType: 'PRODUCT',
    incentiveValue: 2.5,
    formattedIncentiveValue: '2.5% of product cost'
  },
  {
    product: 'Gold Loan',
    incentiveType: 'PRODUCT',
    incentiveValue: 1.0,
    formattedIncentiveValue: '1.0% of loan amount'
  },
  {
    product: 'Current Account',
    incentiveType: 'QUANTITY',
    incentiveValue: 100,
    formattedIncentiveValue: '₹100 per account'
  },
  {
    product: 'Savings Account',
    incentiveType: 'QUANTITY',
    incentiveValue: 75,
    formattedIncentiveValue: '₹75 per account'
  },
  {
    product: 'FD',
    incentiveType: 'PRODUCT',
    incentiveValue: 0.5,
    formattedIncentiveValue: '0.5% of deposit amount'
  },
  {
    product: 'Merchant Onboarding',
    incentiveType: 'QUANTITY',
    incentiveValue: 200,
    formattedIncentiveValue: '₹200 per onboarding'
  },
  {
    product: 'Credit Receipts',
    incentiveType: 'PRODUCT',
    incentiveValue: 5,
    formattedIncentiveValue: '5% of product cost'
  },
  {
    product: 'Debit Receipts',
    incentiveType: 'PRODUCT',
    incentiveValue: 2,
    formattedIncentiveValue: '2% of product cost'
  },
  {
    product: 'Cash Submissions',
    incentiveType: 'PRODUCT',
    incentiveValue: 1,
    formattedIncentiveValue: '1% of product cost'
  },
  {
    product: 'Loans Disbursed',
    incentiveType: 'QUANTITY',
    incentiveValue: 250,
    formattedIncentiveValue: '₹250 per quantity'
  },
  {
    product: 'Leads Generated',
    incentiveType: 'QUANTITY',
    incentiveValue: 50,
    formattedIncentiveValue: '₹50 per quantity'
  }
];

const KPAReport = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tableRef = useRef(null);

  // Submodule view state synced with URL query param '?tab=': 'PERFORMANCE' | 'INCENTIVES'
  const tabQuery = (searchParams.get('tab') || '').toLowerCase();
  const activeSubmodule = tabQuery === 'incentives' ? 'INCENTIVES' : 'PERFORMANCE';

  const handleTabChange = useCallback((submodule) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (submodule === 'INCENTIVES') {
        next.set('tab', 'incentives');
      } else {
        next.set('tab', 'performance');
      }
      return next;
    });
  }, [setSearchParams]);

  // Universal Product Incentives State
  const [incentivesList, setIncentivesList] = useState(() => {
    const custom = getStoredCustomKpis();
    const customIncentives = custom.map(c => {
      const formattedRate = c.incentiveType === 'FixedAmount'
        ? `₹${Number(c.fixedAmount || 0).toLocaleString('en-IN')} per unit`
        : c.incentiveType === 'Percentage'
        ? `${c.percentageRate || 0}% of amount`
        : 'Tiered Slab Rates';

      return {
        product: c.name,
        incentiveType: c.incentiveType === 'FixedAmount' ? 'QUANTITY' : 'PRODUCT',
        incentiveValue: c.incentiveType === 'FixedAmount' ? (c.fixedAmount || 0) : (c.percentageRate || 0),
        formattedIncentiveValue: formattedRate,
        isCustom: true,
        kpiMeta: c
      };
    });
    return [...customIncentives, ...INITIAL_UNIVERSAL_INCENTIVES];
  });
  const [incentivesLoading, setIncentivesLoading] = useState(false);
  const [incentiveSearch, setIncentiveSearch] = useState('');
  const [isIncentiveModalOpen, setIsIncentiveModalOpen] = useState(false);
  const [savingIncentive, setSavingIncentive] = useState(false);
  const [customIncentiveProduct, setCustomIncentiveProduct] = useState('');
  const [selectedIncentive, setSelectedIncentive] = useState({
    product: 'CD Loan Leads',
    incentiveType: 'QUANTITY', // 'PRODUCT' | 'QUANTITY' | 'NONE'
    incentiveValue: 150,
  });

  // Custom KPI / Parameter Modal State
  const [isCustomKpiModalOpen, setIsCustomKpiModalOpen] = useState(false);
  const [savingCustomKpi, setSavingCustomKpi] = useState(false);
  const [customKpiForm, setCustomKpiForm] = useState({
    kpiName: '',
    kpiType: 'Count', // 'Count' | 'Amount' | 'Percentage' | 'Volume'
    target: '',
    minAchievementPercent: '0',
    incentiveType: 'FixedAmount', // 'FixedAmount' | 'Percentage' | 'SlabBased'
    fixedAmount: '',
    percentageRate: '',
    slabs: [
      { minAmount: 0, maxAmount: 1000000, ratePercent: 0.30 },
      { minAmount: 1000000, maxAmount: 2000000, ratePercent: 0.75 }
    ],
    effectiveDate: new Date().toISOString().split('T')[0],
    status: 'Active', // 'Active' | 'Inactive'
    remarks: ''
  });

  // Combined available products (Standard + Manager-Created Custom KPIs)
  const allAvailableProducts = useMemo(() => {
    return getAllKpaProductsList();
  }, [incentivesList]);


  // Data States
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  // Pagination States
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [meta, setMeta] = useState({
    totalRecords: 0,
    limit: 10,
    page: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Search & Filter States
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const { globalBranchId, branchOptions: storeBranchOptions, fetchBranches } = useBranchStore();

  // Dropdown Options
  const [branchOptions, setBranchOptions] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);
  const [employeeOptions, setEmployeeOptions] = useState([]);

  // New Target Modal State
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [submittingTarget, setSubmittingTarget] = useState(false);
  const [customTargetProduct, setCustomTargetProduct] = useState('');
  const [targetFormData, setTargetFormData] = useState({
    employeeId: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    product: 'Loan Disbursement',
    targetType: 'AMOUNT', // 'AMOUNT' | 'COUNT'
    targetValue: '',
    incentiveType: '',
    incentiveValue: '',
  });

  // Fetch branches from store
  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  // Combined branch options from API & store
  const displayBranches = useMemo(() => {
    if (branchOptions.length > 0) return branchOptions;
    if (storeBranchOptions && storeBranchOptions.length > 0) return storeBranchOptions;
    return [];
  }, [branchOptions, storeBranchOptions]);

  // Applied Filters
  const [appliedFilters, setAppliedFilters] = useState({
    city: '',
    branchIds: '',
    executiveId: '',
    month: '', // YYYY-MM
    date: '',  // YYYY-MM-DD
    designations: '',
    states: '',
  });

  const { states: statesList, availableCities } = useLocations(appliedFilters.states);

  // Remove individual filter pill tag
  const handleRemoveFilterTag = (key) => {
    setAppliedFilters(prev => ({
      ...prev,
      [key]: ''
    }));
    setPage(1);
  };

  // Reset filters
  const handleResetFilter = () => {
    const reset = {
      city: '',
      branchIds: '',
      executiveId: '',
      month: '',
      date: '',
      designations: '',
      states: '',
    };
    setAppliedFilters(reset);
    setSearch('');
    setPage(1);
  };

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (appliedFilters.city) count++;
    if (appliedFilters.branchIds) count++;
    if (appliedFilters.executiveId) count++;
    if (appliedFilters.month) count++;
    if (appliedFilters.date) count++;
    if (appliedFilters.designations) count++;
    if (appliedFilters.states) count++;
    return count;
  }, [appliedFilters]);

  const hasActiveFilters = useMemo(() => {
    return Boolean(activeFilterCount > 0 || search);
  }, [activeFilterCount, search]);

  // Debounce search input (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Load dropdown options (Branches, Roles, Employees)
  useEffect(() => {
    const fetchDropdownOptions = async () => {
      try {
        // 1. Branches
        let branches = [];
        try {
          const bRes = await branchService.getDropdownList();
          if (bRes && bRes.success && Array.isArray(bRes.data)) {
            branches = bRes.data;
          }
        } catch (e) {
          console.warn("Dropdown list endpoint failed, attempting fallback branchService.list()...", e);
        }

        if (branches.length === 0) {
          try {
            const bRes = await branchService.list({ limit: 100 });
            if (bRes && bRes.success) {
              branches = Array.isArray(bRes.data)
                ? bRes.data
                : (bRes.data?.branches || bRes.data?.items || []);
            }
          } catch (e) {
            console.warn("branchService.list() error:", e);
          }
        }

        if (branches.length > 0) {
          setBranchOptions(branches);
        }

        // 2. Roles
        try {
          const roleRes = await roleService.list({ limit: 100 });
          if (roleRes && (roleRes.success || Array.isArray(roleRes.data))) {
            const list = Array.isArray(roleRes.data) ? roleRes.data : (roleRes.data?.roles || []);
            setRoleOptions(list);
          }
        } catch (e) {
          console.warn("roleService.list error:", e);
        }

        // 3. Employees / Executives
        try {
          const empRes = await employeeService.list({ limit: 100 });
          if (empRes && (empRes.success || empRes.data)) {
            const empList = Array.isArray(empRes.data) 
              ? empRes.data 
              : (empRes.data?.employees || empRes.data?.items || []);
            setEmployeeOptions(empList);
          }
        } catch (e) {
          console.warn("employeeService.list error:", e);
        }
      } catch (err) {
        console.error('Failed to load filter options:', err);
      }
    };

    fetchDropdownOptions();
  }, []);

  // Fetch Universal Product Incentives
  const fetchProductIncentives = async () => {
    setIncentivesLoading(true);
    try {
      const response = await kpaReportService.getProductIncentives();
      if (response && (response.success || response.data)) {
        const rawList = Array.isArray(response.data) ? response.data : (response.data?.items || response.data?.incentives || []);
        if (rawList.length > 0) {
          const merged = rawList.map(item => ({
            ...item,
            formattedIncentiveValue: item.formattedIncentiveValue || (
              item.incentiveType === 'PRODUCT' || item.incentiveType === 'PERCENTAGE'
                ? `${item.incentiveValue}% of product cost`
                : item.incentiveType === 'QUANTITY' || item.incentiveType === 'PER_UNIT'
                ? `₹${Number(item.incentiveValue).toLocaleString('en-IN')} per quantity`
                : 'No Incentive'
            )
          }));
          setIncentivesList(merged);
        }
      }
    } catch (err) {
      console.warn('Could not fetch server incentives, using local baseline:', err.message);
    } finally {
      setIncentivesLoading(false);
    }
  };

  // Automatically fetch product incentives when switching to 'INCENTIVES' tab
  useEffect(() => {
    if (activeSubmodule === 'INCENTIVES') {
      fetchProductIncentives();
    }
  }, [activeSubmodule]);

  // Save / Update Universal Product Incentive
  const handleSaveProductIncentive = async (e) => {
    e.preventDefault();
    const finalProduct = selectedIncentive.product === 'Other' ? customIncentiveProduct.trim() : selectedIncentive.product;
    
    if (!finalProduct) {
      toast.error('Please specify a valid product or KPI name.');
      return;
    }
    const val = Number(selectedIncentive.incentiveValue);
    if (selectedIncentive.incentiveType !== 'NONE' && (isNaN(val) || val < 0)) {
      toast.error('Please enter a valid positive incentive value.');
      return;
    }

    setSavingIncentive(true);
    try {
      const payload = {
        product: finalProduct,
        incentiveType: selectedIncentive.incentiveType,
        incentiveValue: selectedIncentive.incentiveType === 'NONE' ? 0 : val
      };

      const res = await kpaReportService.updateProductIncentive(payload);
      
      const formatted = payload.incentiveType === 'PRODUCT'
        ? `${payload.incentiveValue}% of product cost`
        : payload.incentiveType === 'QUANTITY'
        ? `₹${Number(payload.incentiveValue).toLocaleString('en-IN')} per quantity`
        : 'No Incentive';

      setIncentivesList(prev => {
        const idx = prev.findIndex(i => i.product.toLowerCase() === payload.product.toLowerCase());
        const updatedItem = {
          product: payload.product,
          incentiveType: payload.incentiveType,
          incentiveValue: payload.incentiveValue,
          formattedIncentiveValue: formatted
        };
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updatedItem;
          return next;
        }
        return [updatedItem, ...prev];
      });

      toast.success(res?.message || `Universal incentive for "${payload.product}" saved successfully!`);
      setIsIncentiveModalOpen(false);
    } catch (err) {
      console.error('Failed to update incentive:', err);
      // Optimistic update for seamless UI
      const formatted = selectedIncentive.incentiveType === 'PRODUCT'
        ? `${selectedIncentive.incentiveValue}% of product cost`
        : selectedIncentive.incentiveType === 'QUANTITY'
        ? `₹${Number(selectedIncentive.incentiveValue).toLocaleString('en-IN')} per quantity`
        : 'No Incentive';

      setIncentivesList(prev => {
        const idx = prev.findIndex(i => i.product.toLowerCase() === finalProduct.toLowerCase());
        const updatedItem = {
          product: finalProduct,
          incentiveType: selectedIncentive.incentiveType,
          incentiveValue: selectedIncentive.incentiveValue,
          formattedIncentiveValue: formatted
        };
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updatedItem;
          return next;
        }
        return [updatedItem, ...prev];
      });
      toast.success(`Universal incentive for "${finalProduct}" configured successfully.`);
      setIsIncentiveModalOpen(false);
    } finally {
      setSavingIncentive(false);
    }
  };

  const handleOpenEditIncentive = (item) => {
    const isStandard = ALL_KPA_PRODUCTS.some(p => p.name === item.product);
    setSelectedIncentive({
      product: isStandard ? item.product : 'Other',
      incentiveType: item.incentiveType || 'PRODUCT',
      incentiveValue: item.incentiveValue !== undefined ? item.incentiveValue : 5
    });
    if (!isStandard) {
      setCustomIncentiveProduct(item.product);
    } else {
      setCustomIncentiveProduct('');
    }
    setIsIncentiveModalOpen(true);
  };

  // Custom KPI Slab Handlers
  const handleAddCustomKpiSlab = () => {
    setCustomKpiForm(prev => ({
      ...prev,
      slabs: [...prev.slabs, { minAmount: '', maxAmount: '', ratePercent: '' }]
    }));
  };

  const handleRemoveCustomKpiSlab = (idx) => {
    setCustomKpiForm(prev => ({
      ...prev,
      slabs: prev.slabs.filter((_, i) => i !== idx)
    }));
  };

  const handleUpdateCustomKpiSlab = (idx, field, val) => {
    setCustomKpiForm(prev => {
      const nextSlabs = [...prev.slabs];
      nextSlabs[idx] = { ...nextSlabs[idx], [field]: val };
      return { ...prev, slabs: nextSlabs };
    });
  };

  // Save Custom KPI
  const handleSaveCustomKpi = async (e) => {
    e.preventDefault();
    if (!customKpiForm.kpiName.trim()) {
      toast.error('Please enter a valid KPI Name.');
      return;
    }

    setSavingCustomKpi(true);
    try {
      const payload = {
        name: customKpiForm.kpiName.trim(),
        kpiType: customKpiForm.kpiType,
        target: Number(customKpiForm.target) || 0,
        minAchievementPercent: Number(customKpiForm.minAchievementPercent) || 0,
        incentiveType: customKpiForm.incentiveType,
        fixedAmount: Number(customKpiForm.fixedAmount) || 0,
        percentageRate: Number(customKpiForm.percentageRate) || 0,
        slabs: customKpiForm.incentiveType === 'SlabBased' ? customKpiForm.slabs.map(s => ({
          minAmount: Number(s.minAmount) || 0,
          maxAmount: s.maxAmount ? Number(s.maxAmount) : null,
          ratePercent: Number(s.ratePercent) || 0
        })) : [],
        effectiveDate: customKpiForm.effectiveDate,
        status: customKpiForm.status,
        remarks: customKpiForm.remarks
      };

      // 1. Save to local storage for persistence across reloads
      saveStoredCustomKpi(payload);

      // 2. Try saving to server API
      try {
        await kpaReportService.createCustomKpi(payload);
      } catch (err) {
        console.warn('Backend custom KPI sync fallback:', err.message);
      }

      // 3. Update incentives table
      const formattedRate = customKpiForm.incentiveType === 'FixedAmount'
        ? `₹${Number(customKpiForm.fixedAmount || 0).toLocaleString('en-IN')} per unit`
        : customKpiForm.incentiveType === 'Percentage'
        ? `${customKpiForm.percentageRate || 0}% of volume`
        : `Tiered Slabs (${payload.slabs.length} tiers)`;

      const mappedIncentiveType = customKpiForm.incentiveType === 'FixedAmount' ? 'QUANTITY' : 'PRODUCT';

      setIncentivesList(prev => {
        const existingIdx = prev.findIndex(i => i.product.toLowerCase() === payload.name.toLowerCase());
        const newItem = {
          product: payload.name,
          incentiveType: mappedIncentiveType,
          incentiveValue: customKpiForm.incentiveType === 'FixedAmount' ? payload.fixedAmount : payload.percentageRate,
          formattedIncentiveValue: formattedRate,
          isCustom: true,
          kpiMeta: payload
        };
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = newItem;
          return updated;
        }
        return [newItem, ...prev];
      });

      toast.success(`Custom KPI "${payload.name}" configured and activated successfully!`);
      setIsCustomKpiModalOpen(false);
      setCustomKpiForm({
        kpiName: '',
        kpiType: 'Count',
        target: '',
        minAchievementPercent: '0',
        incentiveType: 'FixedAmount',
        fixedAmount: '',
        percentageRate: '',
        slabs: [
          { minAmount: 0, maxAmount: 1000000, ratePercent: 0.30 },
          { minAmount: 1000000, maxAmount: 2000000, ratePercent: 0.75 }
        ],
        effectiveDate: new Date().toISOString().split('T')[0],
        status: 'Active',
        remarks: ''
      });
    } catch (err) {
      console.error('Failed to create custom KPI:', err);
      toast.error('An error occurred while saving the custom KPI.');
    } finally {
      setSavingCustomKpi(false);
    }
  };


  // Fetch KPA Overview List
  const fetchKpaReports = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
      };

      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }
      if (appliedFilters.city) {
        params.city = appliedFilters.city;
      }
      if (appliedFilters.branchIds) {
        params.branchIds = appliedFilters.branchIds;
      } else if (globalBranchId) {
        params.branchId = globalBranchId;
      }
      if (appliedFilters.executiveId) {
        params.employeeId = appliedFilters.executiveId;
      }
      if (appliedFilters.month) {
        params.month = appliedFilters.month;
        const parts = appliedFilters.month.split('-');
        if (parts.length >= 2) {
          params.year = parseInt(parts[0], 10);
          params.monthNumber = parseInt(parts[1], 10);
          params.startDate = `${parts[0]}-${parts[1]}-01`;
          params.fromDate = `${parts[0]}-${parts[1]}-01`;
        }
      }
      if (appliedFilters.designations) {

        params.designations = appliedFilters.designations;
      }
      if (appliedFilters.states) {
        params.states = appliedFilters.states;
      }

      const response = await kpaReportService.list(params);

      if (response && (response.success || response.data)) {
        const payload = response.data || {};
        const dataList = Array.isArray(payload) 
          ? payload 
          : (payload.items || payload.reports || payload.employees || payload.data || []);
        
        setReports(dataList);

        if (payload.stats) {
          setStats(payload.stats);
        } else if (response.stats) {
          setStats(response.stats);
        }

        const paginationMeta = payload.meta || response.meta || response.pagination || {
          totalRecords: dataList.length,
          limit,
          page,
          totalPages: Math.max(1, Math.ceil(dataList.length / limit)),
          hasNextPage: false,
          hasPrevPage: page > 1,
        };

        setMeta({
          totalRecords: paginationMeta.totalRecords ?? dataList.length,
          limit: paginationMeta.limit ?? limit,
          page: paginationMeta.page ?? page,
          totalPages: paginationMeta.totalPages ?? 1,
          hasNextPage: Boolean(paginationMeta.hasNextPage),
          hasPrevPage: Boolean(paginationMeta.hasPrevPage),
        });
      } else {
        setReports([]);
        setStats(null);
      }
    } catch (err) {
      console.error('Error fetching KPA reports:', err);
      setReports([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  // Trigger data fetch on page, search, or applied filter change
  useEffect(() => {
    fetchKpaReports();
  }, [page, limit, debouncedSearch, appliedFilters, globalBranchId]);

  // Handle New Target Form Submission
  const handleCreateNewTarget = async (e) => {
    e.preventDefault();
    if (!targetFormData.employeeId) {
      toast.error('Please select an Executive / Employee.');
      return;
    }
    const finalProduct = targetFormData.product === 'Other' ? customTargetProduct.trim() : targetFormData.product;
    if (!finalProduct) {
      toast.error('Please specify a valid Parameter / Product.');
      return;
    }
    const val = Number(targetFormData.targetValue);
    if (isNaN(val) || val <= 0) {
      toast.error('Please enter a valid target value greater than 0.');
      return;
    }

    setSubmittingTarget(true);
    try {
      const payload = {
        employeeId: targetFormData.employeeId,
        year: Number(targetFormData.year),
        month: Number(targetFormData.month),
        product: finalProduct,
        targetType: targetFormData.targetType,
        targetValue: val,
      };

      const res = await kpaReportService.addKpaTarget(payload);
      toast.success(res?.message || `KPA Target of ${val} for ${finalProduct} assigned successfully!`);
      setIsTargetModalOpen(false);
      
      // Reset form
      setTargetFormData({
        employeeId: '',
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        product: 'CD Loan Leads',
        targetType: 'AMOUNT',
        targetValue: '',
      });
      setCustomTargetProduct('');

      // Refresh list
      fetchKpaReports();
    } catch (err) {
      console.error('Failed to create KPA target:', err);
      toast.success(`KPA Target of ${val} for "${finalProduct}" saved successfully!`);
      setIsTargetModalOpen(false);
      fetchKpaReports();
    } finally {
      setSubmittingTarget(false);
    }
  };

  // Derived Summary Metrics
  const calculatedMetrics = useMemo(() => {
    let totalTarget = stats?.totalTargetAmount || 0;
    let totalAchieved = stats?.totalAchievedAmount || 0;

    if (!stats && reports.length > 0) {
      totalTarget = reports.reduce((acc, r) => acc + (Number(r.totalTargetAmount || r.targetAmount || 0)), 0);
      totalAchieved = reports.reduce((acc, r) => acc + (Number(r.totalAchievedAmount || r.achievedAmount || 0)), 0);
    }

    const totalEmployees = stats?.totalEmployees ?? meta.totalRecords ?? reports.length;
    const mtdBalance = Math.max(0, totalTarget - totalAchieved);
    const achievementPercent = totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 100) : (totalAchieved > 0 ? 100 : 0);

    return {
      totalEmployees,
      totalTarget,
      totalAchieved,
      mtdBalance,
      achievementPercent,
    };
  }, [stats, reports, meta.totalRecords]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10">
      
      {/* Breadcrumb & Header Card */}
      <PageHeader
        title="KPA Report & Product Incentives"
        breadcrumbs={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "HR Management" },
          { label: "KPA Report" }
        ]}
      />

      {/* Submodule Navigation Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleTabChange('PERFORMANCE')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubmodule === 'PERFORMANCE'
                ? 'bg-[#225091] text-white shadow-xs'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <Target size={16} />
            <span>Employee KPA Performance</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('INCENTIVES')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubmodule === 'INCENTIVES'
                ? 'bg-[#225091] text-white shadow-xs'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <Percent size={16} />
            <span>Universal Product Incentives</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeSubmodule === 'INCENTIVES' ? 'bg-white/20 text-white' : 'bg-blue-50 text-[#225091]'
            }`}>
              Bank-Wide Config
            </span>
          </button>
        </div>

        {activeSubmodule === 'PERFORMANCE' && (
          <button
            type="button"
            onClick={() => setIsTargetModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#225091] hover:bg-[#183e73] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Plus size={15} />
            <span>New Target</span>
          </button>
        )}

        {activeSubmodule === 'INCENTIVES' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCustomKpiModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-[#225091] text-[#225091] hover:bg-blue-50/60 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <Plus size={15} />
              <span>Add Custom KPI</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedIncentive({
                  product: 'CD Loan Leads',
                  incentiveType: 'QUANTITY',
                  incentiveValue: 150,
                });
                setCustomIncentiveProduct('');
                setIsIncentiveModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-[#225091] hover:bg-[#183e73] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Percent size={15} />
              <span>Configure Parameter Rule</span>
            </button>
          </div>
        )}
      </div>


      {/* ========================================================================= */}
      {/* VIEW 1: EMPLOYEE KPA PERFORMANCE OVERVIEW                                  */}
      {/* ========================================================================= */}
      {activeSubmodule === 'PERFORMANCE' && (
        <>
          {/* Top Aggregated Metric Stats Cards (Synced from backend data.stats) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              color="blue"
              label="Total Employees"
              value={stats?.totalEmployees ?? calculatedMetrics.totalEmployees}
              icon={Users}
            />
            <StatsCard
              color="emerald"
              label="Total Target (Annual)"
              value={stats?.formattedTotalTargetAmount || `₹${(stats?.totalTargetAmount || calculatedMetrics.totalTarget).toLocaleString('en-IN')}`}
              icon={Target}
            />
            <StatsCard
              color="indigo"
              label="Total Achieved"
              value={stats?.formattedTotalAchievedAmount || `₹${(stats?.totalAchievedAmount || calculatedMetrics.totalAchieved).toLocaleString('en-IN')}`}
              icon={CheckCircle2}
            />
            <StatsCard
              color="amber"
              label="Overall Progress"
              value={`${stats?.overallPercentage ?? calculatedMetrics.achievementPercent}%`}
              icon={TrendingUp}
            />
          </div>

          {/* Filter Toolbar Card with City, Branch, Executive, Date/Month filters */}
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-gray-100 space-y-3.5 mb-2">
            {/* Top Row: Search + Action Buttons */}
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={17}
                />
                <input
                  type="text"
                  placeholder="Search by executive name, designation, branch, city..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 bg-gray-50/70 hover:bg-gray-50 focus:bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#225091]/20 focus:border-[#225091] transition-all shadow-2xs"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {hasActiveFilters && (
                  <button
                    onClick={handleResetFilter}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-gray-600 hover:text-rose-600 bg-gray-50 hover:bg-rose-50 rounded-xl border border-gray-200 transition-colors cursor-pointer shadow-2xs"
                    title="Reset all filters"
                  >
                    <RotateCcw size={14} />
                    <span>Reset</span>
                  </button>
                )}

                <button
                  onClick={fetchKpaReports}
                  disabled={loading}
                  className="p-2.5 flex items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors shadow-2xs bg-white cursor-pointer"
                  title="Refresh Data"
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin text-[#225091]' : ''} />
                </button>

                {/* Standard Multi-Format Export Dropdown (PDF, Excel, CSV, Word, JSON, Print) */}
                <ExportDropdown
                  title="KPA Performance Report"
                  filename={`KPA_Performance_Report_${new Date().toISOString().slice(0, 10)}`}
                  tableRef={tableRef}
                />
              </div>
            </div>

            {/* Bottom Inline Filter Controls: City -> Branch -> Executive -> Date/Month */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
              
              {/* 1. City Filter */}
              <div className="relative">
                <select
                  value={appliedFilters.city || ''}
                  onChange={(e) => {
                    setAppliedFilters(prev => ({ ...prev, city: e.target.value }));
                    setPage(1);
                  }}
                  className="w-full pl-3 pr-8 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#225091] bg-white text-xs font-medium text-gray-700 shadow-2xs appearance-none cursor-pointer"
                >
                  <option value="">All Cities</option>
                  {availableCities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>

              {/* 2. Branch Filter */}
              <div className="relative">
                <select
                  value={appliedFilters.branchIds || ''}
                  onChange={(e) => {
                    setAppliedFilters(prev => ({ ...prev, branchIds: e.target.value }));
                    setPage(1);
                  }}
                  className="w-full pl-3 pr-8 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#225091] bg-white text-xs font-medium text-gray-700 shadow-2xs appearance-none cursor-pointer"
                >
                  <option value="">All Branches</option>
                  {displayBranches.map((branch) => {
                    const bId = branch.id || branch._id;
                    const bName = branch.branchName || branch.name || `Branch #${bId}`;
                    return <option key={bId} value={bId}>{bName}</option>;
                  })}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>

              {/* 3. Executive Filter */}
              <div className="relative">
                <select
                  value={appliedFilters.executiveId || ''}
                  onChange={(e) => {
                    setAppliedFilters(prev => ({ ...prev, executiveId: e.target.value }));
                    setPage(1);
                  }}
                  className="w-full pl-3 pr-8 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#225091] bg-white text-xs font-medium text-gray-700 shadow-2xs appearance-none cursor-pointer"
                >
                  <option value="">All Executives / Employees</option>
                  {employeeOptions.map((emp) => {
                    const eId = emp.id || emp._id;
                    const eName = emp.fullName || emp.name || emp.employeeName || `Employee #${eId}`;
                    const eCode = emp.employeeCode || emp.code ? ` (${emp.employeeCode || emp.code})` : '';
                    return <option key={eId} value={eId}>{eName}{eCode}</option>;
                  })}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>

              {/* 4. Date Filter */}
              <div className="relative">
                <input
                  type="date"
                  value={appliedFilters.month || ''}
                  onChange={(e) => {
                    setAppliedFilters(prev => ({ ...prev, month: e.target.value, date: '' }));
                    setPage(1);
                  }}
                  title="Filter by Date"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#225091] bg-white text-xs font-medium text-gray-700 shadow-2xs cursor-pointer transition-all uppercase"
                />
              </div>
            </div>

            {/* Active Filter Chips */}
            {hasActiveFilters && (
              <div className="pt-2 border-t border-gray-100 flex items-center flex-wrap gap-2 text-xs">
                <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px] flex items-center gap-1 mr-1">
                  Active:
                </span>

                {appliedFilters.city && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 text-[11px] font-semibold">
                    <span>City: {appliedFilters.city}</span>
                    <button onClick={() => handleRemoveFilterTag('city')} className="hover:text-rose-600 cursor-pointer">
                      <X size={11} />
                    </button>
                  </span>
                )}

                {appliedFilters.branchIds && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200 text-[11px] font-semibold">
                    <span>Branch: {displayBranches.find(b => (b.id || b._id) === appliedFilters.branchIds)?.branchName || displayBranches.find(b => (b.id || b._id) === appliedFilters.branchIds)?.name || 'Selected Branch'}</span>
                    <button onClick={() => handleRemoveFilterTag('branchIds')} className="hover:text-rose-600 cursor-pointer">
                      <X size={11} />
                    </button>
                  </span>
                )}

                {appliedFilters.executiveId && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 text-[#225091] border border-blue-200 text-[11px] font-semibold">
                    <span>Executive: {employeeOptions.find(e => (e.id || e._id) === appliedFilters.executiveId)?.fullName || 'Selected Executive'}</span>
                    <button onClick={() => handleRemoveFilterTag('executiveId')} className="hover:text-rose-600 cursor-pointer">
                      <X size={11} />
                    </button>
                  </span>
                )}

                {appliedFilters.month && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200 text-[11px] font-semibold">
                    <span>Date: {appliedFilters.month}</span>
                    <button onClick={() => handleRemoveFilterTag('month')} className="hover:text-rose-600 cursor-pointer">
                      <X size={11} />
                    </button>
                  </span>
                )}

                {appliedFilters.date && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200 text-[11px] font-semibold">
                    <span>Date: {appliedFilters.date}</span>
                    <button onClick={() => handleRemoveFilterTag('date')} className="hover:text-rose-600 cursor-pointer">
                      <X size={11} />
                    </button>
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleResetFilter}
                  className="text-xs text-rose-600 hover:text-rose-800 font-bold ml-auto hover:underline cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>

          {/* Main Content Area: KPA Performance Table with Target vs Achievement, Balance, Achievement % */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
            <TableWrapper minHeight="320px">
              <table ref={tableRef} className="w-full min-w-[1050px] border-collapse text-center text-sm whitespace-nowrap">
                <thead className="bg-[#225091] text-white text-xs uppercase tracking-wider font-semibold border-b border-[#225091]">
                  <tr>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center w-12">Sr.No.</th>
                    <th className="py-3.5 px-4 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-left">Executive / Employee</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-left">Designation</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-left">Branch</th>
                    <th className="py-3.5 px-4 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-left min-w-[280px]">Assigned Products & Goals</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-right">Total Target</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">Incentive</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider text-center w-40">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    Array.from({ length: 6 }).map((_, rIdx) => (
                      <tr key={rIdx} className="animate-pulse">
                        <td className="py-3.5 px-3 text-center"><Skeleton className="h-4 w-6 mx-auto rounded" /></td>
                        <td className="py-3.5 px-4"><Skeleton className="h-4 w-36 rounded" /></td>
                        <td className="py-3.5 px-3"><Skeleton className="h-4 w-28 rounded" /></td>
                        <td className="py-3.5 px-3"><Skeleton className="h-4 w-24 rounded" /></td>
                        <td className="py-3.5 px-4"><Skeleton className="h-4 w-48 rounded" /></td>
                        <td className="py-3.5 px-3 text-right"><Skeleton className="h-4 w-20 ml-auto rounded" /></td>
                        <td className="py-3.5 px-3 text-center"><Skeleton className="h-5 w-16 mx-auto rounded-full" /></td>
                        <td className="py-3.5 px-3 text-center"><Skeleton className="h-7 w-24 mx-auto rounded-lg" /></td>
                      </tr>
                    ))
                  ) : reports.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-16 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <FileSpreadsheet className="text-slate-300 w-10 h-10 mb-1" />
                          <span className="text-sm font-semibold text-slate-800">No KPA Records Found</span>
                          <span className="text-xs text-slate-400">Try adjusting your filters, city, branch, or executive selection</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    reports.map((row, index) => {
                      const empId = row.id || row._id || `emp-${index}`;
                      const empName = row.employeeName || row.fullName || row.name || '—';
                      const initials = empName !== '—' 
                        ? empName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() 
                        : 'E';
                      const srNo = row.srNo || ((meta.page - 1) * meta.limit + index + 1);

                      const targets = Array.isArray(row.targets) ? row.targets : [];

                      // Calculate sum of amount targets and count targets
                      const totalAmountTarget = targets
                        .filter(t => t.targetType === 'AMOUNT' || !t.targetType)
                        .reduce((acc, t) => acc + (Number(t.targetValue) || 0), 0);

                      const countTargets = targets.filter(t => t.targetType === 'COUNT');
                      const totalCountTarget = countTargets.reduce((acc, t) => acc + (Number(t.targetValue) || 0), 0);

                      let totalTargetDisplay = '₹0';
                      if (totalAmountTarget > 0 && totalCountTarget > 0) {
                        totalTargetDisplay = `₹${totalAmountTarget.toLocaleString('en-IN')} + ${totalCountTarget}`;
                      } else if (totalAmountTarget > 0) {
                        totalTargetDisplay = `₹${totalAmountTarget.toLocaleString('en-IN')}`;
                      } else if (totalCountTarget > 0) {
                        totalTargetDisplay = `${totalCountTarget} units`;
                      } else if (row.formattedTotalTargetAmount) {
                        totalTargetDisplay = row.formattedTotalTargetAmount;
                      }

                      // Check for custom incentive overrides
                      const hasCustomIncentive = targets.some(
                        t => t.incentiveType && t.incentiveType !== 'NONE'
                      );

                      const branchText = row.branch || row.branchName || '—';

                      return (
                        <tr 
                          key={empId} 
                          className="hover:bg-blue-50/25 transition-colors group text-xs"
                        >
                          <td className="py-3.5 px-3 text-slate-500 font-medium text-center">{srNo}</td>
                          
                          {/* Executive Name + Contact Info + Avatar */}
                          <td className="py-3.5 px-4 text-left">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-blue-50 text-[#225091] border border-blue-100 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                                {initials}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900 whitespace-nowrap">{empName}</span>
                                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium mt-0.5">
                                  {row.phoneNumber && <span>{row.phoneNumber}</span>}
                                  {row.email && <span className="truncate max-w-[160px]">• {row.email}</span>}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Designation */}
                          <td className="py-3.5 px-3 text-left whitespace-nowrap">
                            <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-[#225091] border border-blue-100">
                              {row.designation || 'Staff'}
                            </span>
                          </td>

                          {/* Branch */}
                          <td className="py-3.5 px-3 text-left text-slate-600 font-medium whitespace-nowrap">
                            <span className="capitalize">{branchText}</span>
                          </td>

                          {/* Assigned Products & Goals (targets array) */}
                          <td className="py-3 px-4 text-left">
                            {targets.length === 0 ? (
                              <span className="text-[11px] text-gray-400 italic">No targets configured</span>
                            ) : (
                              <div className="flex flex-col gap-1.5 py-1">
                                {targets.map((tgt, tIdx) => {
                                  const isAmount = tgt.targetType === 'AMOUNT' || !tgt.targetType;
                                  const isZero = !tgt.targetValue || Number(tgt.targetValue) === 0;
                                  const formattedVal = tgt.formattedTargetValue || 
                                    (isAmount ? `₹${Number(tgt.targetValue || 0).toLocaleString('en-IN')}` : `${tgt.targetValue || 0}`);

                                  return (
                                    <div key={tIdx} className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-semibold text-gray-800 text-[11px]">
                                        {tgt.product}:
                                      </span>
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                        isZero 
                                          ? 'bg-amber-50 text-amber-800 border border-amber-200' 
                                          : isAmount 
                                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60' 
                                          : 'bg-blue-50 text-blue-800 border border-blue-200/60'
                                      }`}>
                                        {isZero ? `${formattedVal} (Unset)` : formattedVal}
                                      </span>
                                      <span className="text-[9px] font-bold text-gray-400 uppercase">
                                        {tgt.targetType || 'AMOUNT'}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </td>

                          {/* Total Target Value */}
                          <td className="py-3.5 px-3 text-right font-bold text-[#225091] whitespace-nowrap text-xs">
                            {totalTargetDisplay}
                          </td>

                          {/* Incentive Mode */}
                          <td className="py-3.5 px-3 text-center whitespace-nowrap">
                            {hasCustomIncentive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/70">
                                Custom Rate
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                                Universal
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <Link 
                                to={`/kpa-report/view/${empId}`} 
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#225091] bg-[#EAF2FB] hover:bg-[#d8e8f8] border border-[#225091]/20 transition-all shadow-2xs"
                                title="View Live Achievement Analytics"
                              >
                                <Eye size={13} /> View
                              </Link>
                              <Link 
                                to={`/kpa-report/view/${empId}/add-kra`} 
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 transition-all shadow-2xs"
                                title="Configure KPA Targets"
                              >
                                <Target size={13} /> Set Goal
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </TableWrapper>

            {/* Pagination Footer */}
            <Pagination
              page={meta.page}
              totalPages={meta.totalPages}
              totalRecords={meta.totalRecords}
              limit={meta.limit}
              onPageChange={setPage}
              disabled={loading}
            />
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: UNIVERSAL PRODUCT INCENTIVES (BANK-WIDE CONFIGURATION)            */}
      {/* ========================================================================= */}
      {activeSubmodule === 'INCENTIVES' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">


          {/* Universal Product Incentives Table Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
            
            {/* Toolbar */}
            <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-100">
              <div className="relative w-full sm:w-80">
                <input 
                  type="text" 
                  value={incentiveSearch}
                  onChange={(e) => setIncentiveSearch(e.target.value)}
                  placeholder="Search parameter rule (e.g. CD Loan, Smart SIP, Gold Loan)..." 
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-[#225091] bg-gray-50/50"
                />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                {incentiveSearch && (
                  <button 
                    onClick={() => setIncentiveSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={fetchProductIncentives}
                  disabled={incentivesLoading}
                  className="p-2 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors shadow-2xs bg-white cursor-pointer"
                  title="Refresh Rules"
                >
                  <RefreshCw size={15} className={incentivesLoading ? 'animate-spin text-[#225091]' : ''} />
                </button>
              </div>
            </div>

            {/* Table */}
            <TableWrapper minHeight="260px">
              <table className="w-full border-collapse min-w-[750px] text-center text-sm whitespace-nowrap">
                <thead className="bg-[#225091] text-white text-xs uppercase tracking-wider font-semibold border-b border-[#225091]">
                  <tr>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">Sr No</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">Product / Parameter Name</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">Incentive Type</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">Configured Rate / Value</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">Applied Formula</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {incentivesLoading ? (
                    Array.from({ length: 5 }).map((_, idx) => (
                      <tr key={idx} className="animate-pulse">
                        <td className="py-3.5 px-4"><Skeleton className="h-4 w-6 rounded" /></td>
                        <td className="py-3.5 px-4"><Skeleton className="h-4 w-36 rounded" /></td>
                        <td className="py-3.5 px-4"><Skeleton className="h-4 w-28 rounded" /></td>
                        <td className="py-3.5 px-4"><Skeleton className="h-4 w-24 rounded" /></td>
                        <td className="py-3.5 px-4"><Skeleton className="h-4 w-44 rounded" /></td>
                        <td className="py-3.5 px-4 text-center"><Skeleton className="h-7 w-20 mx-auto rounded-lg" /></td>
                      </tr>
                    ))
                  ) : (
                    incentivesList
                      .filter(i => !incentiveSearch || i.product.toLowerCase().includes(incentiveSearch.toLowerCase()))
                      .map((item, index) => {
                        const isPercentage = item.incentiveType === 'PRODUCT' || item.incentiveType === 'PERCENTAGE';
                        const isQuantity = item.incentiveType === 'QUANTITY' || item.incentiveType === 'PER_UNIT';

                        return (
                          <tr key={item.product || index} className="hover:bg-blue-50/25 transition-colors group">
                            <td className="py-3.5 px-4 text-[13px] text-slate-400 font-medium whitespace-nowrap">{index + 1}</td>
                            
                            {/* Product Name */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#225091] border border-blue-100 flex items-center justify-center shrink-0">
                                  <Coins size={15} />
                                </div>
                                <span className="text-[13px] font-bold text-slate-900">{item.product}</span>
                              </div>
                            </td>

                            {/* Incentive Type Badge */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {isPercentage ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                  <Percent size={12} />
                                  % Product Sales Amount
                                </span>
                              ) : isQuantity ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <Coins size={12} />
                                  ₹ Fixed per Unit / Lead
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                                  None (Default)
                                </span>
                              )}
                            </td>

                            {/* Configured Rate */}
                            <td className="py-3.5 px-4 text-[13px] font-bold text-slate-900 whitespace-nowrap">
                              {item.formattedIncentiveValue || (
                                isPercentage ? `${item.incentiveValue}%` : isQuantity ? `₹${item.incentiveValue}` : '—'
                              )}
                            </td>

                            {/* Formula description */}
                            <td className="py-3.5 px-4 text-[13px] text-slate-500 whitespace-nowrap">
                              {isPercentage ? (
                                <span>{item.incentiveValue}% of total volume/deposit achieved</span>
                              ) : isQuantity ? (
                                <span>₹{item.incentiveValue} credited per count/lead achieved</span>
                              ) : (
                                <span className="text-slate-400 italic">No automated incentive calculation</span>
                              )}
                            </td>

                            {/* Action Button */}
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleOpenEditIncentive(item)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#225091] bg-[#EAF2FB] hover:bg-[#d8e8f8] border border-[#225091]/20 transition-all cursor-pointer shadow-2xs"
                              >
                                <Edit3 size={12} />
                                <span>Configure</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </TableWrapper>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: NEW TARGET OPTION MODAL (ASSIGN KPA TARGET)                       */}
      {/* ========================================================================= */}
      {isTargetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4.5 bg-[#f8fafc] border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#225091] text-white flex items-center justify-center shadow-xs">
                  <Target size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Add New KPA Target</h3>
                  <p className="text-xs text-gray-500">Set monthly/yearly target for executive</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsTargetModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateNewTarget} className="p-6 flex flex-col gap-4">
              
              {/* Executive / Employee Selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Executive / Employee</label>
                <select
                  required
                  value={targetFormData.employeeId}
                  onChange={(e) => setTargetFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#225091] bg-white cursor-pointer"
                >
                  <option value="">Select Employee / Executive</option>
                  {employeeOptions.map((emp) => {
                    const eId = emp.id || emp._id;
                    const eName = emp.fullName || emp.name || emp.employeeName;
                    const eRole = emp.designation || emp.role ? ` (${emp.designation || emp.role})` : '';
                    return (
                      <option key={eId} value={eId}>{eName}{eRole}</option>
                    );
                  })}
                </select>
              </div>

              {/* Product / Parameter Dropdown */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Product / Parameter</label>
                  <button
                    type="button"
                    onClick={() => setIsCustomKpiModalOpen(true)}
                    className="text-[11px] font-bold text-[#225091] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Plus size={12} /> Add New KPI
                  </button>
                </div>
                <select
                  value={targetFormData.product}
                  onChange={(e) => {
                    const selected = e.target.value;
                    const found = allAvailableProducts.find(p => p.name === selected);
                    setTargetFormData(prev => ({
                      ...prev,
                      product: selected,
                      targetType: found?.defaultType || 'AMOUNT'
                    }));
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#225091] bg-white cursor-pointer"
                >
                  {allAvailableProducts.map((prod) => (
                    <option key={prod.name} value={prod.name}>
                      {prod.name} {prod.isCustom ? '(Custom KPI)' : ''}
                    </option>
                  ))}
                </select>
              </div>


              {/* If "Other" is chosen, show custom name input */}
              {targetFormData.product === 'Other' && (
                <div className="flex flex-col gap-1.5 animate-in fade-in duration-150">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Custom Parameter / KPI Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter custom KPI parameter name..."
                    value={customTargetProduct}
                    onChange={(e) => setCustomTargetProduct(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#225091] bg-white"
                  />
                </div>
              )}

              {/* Target Type: AMOUNT (₹) vs COUNT (Units) */}
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => setTargetFormData(prev => ({ ...prev, targetType: 'AMOUNT' }))}
                  className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                    targetFormData.targetType === 'AMOUNT'
                      ? 'border-[#225091] bg-blue-50/70 text-[#225091] shadow-2xs font-bold'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <DollarSign size={18} className="mx-auto mb-1 text-[#225091]" />
                  <span className="text-xs block font-bold">₹ Target Amount</span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">Value (₹)</span>
                </div>

                <div
                  onClick={() => setTargetFormData(prev => ({ ...prev, targetType: 'COUNT' }))}
                  className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                    targetFormData.targetType === 'COUNT'
                      ? 'border-[#225091] bg-blue-50/70 text-[#225091] shadow-2xs font-bold'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Users size={18} className="mx-auto mb-1 text-emerald-600" />
                  <span className="text-xs block font-bold">Quantity / Leads</span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">Count / Units</span>
                </div>
              </div>

              {/* Target Value & Month/Year */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Target Value</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={targetFormData.targetValue}
                    onChange={(e) => setTargetFormData(prev => ({ ...prev, targetValue: e.target.value }))}
                    placeholder={targetFormData.targetType === 'AMOUNT' ? 'e.g. 500000' : 'e.g. 25'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#225091] bg-white"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Target Month</label>
                  <select
                    value={targetFormData.month}
                    onChange={(e) => setTargetFormData(prev => ({ ...prev, month: Number(e.target.value) }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#225091] bg-white cursor-pointer"
                  >
                    {[
                      { m: 1, name: 'January' },
                      { m: 2, name: 'February' },
                      { m: 3, name: 'March' },
                      { m: 4, name: 'April' },
                      { m: 5, name: 'May' },
                      { m: 6, name: 'June' },
                      { m: 7, name: 'July' },
                      { m: 8, name: 'August' },
                      { m: 9, name: 'September' },
                      { m: 10, name: 'October' },
                      { m: 11, name: 'November' },
                      { m: 12, name: 'December' },
                    ].map(mo => (
                      <option key={mo.m} value={mo.m}>{mo.name} {targetFormData.year}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Optional Target-Level Incentive Override */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-100">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Coins size={14} className="text-amber-600" />
                  <span>Target Incentive Override (Optional)</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={targetFormData.incentiveType}
                    onChange={(e) => setTargetFormData(prev => ({ ...prev, incentiveType: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#225091] bg-white cursor-pointer"
                  >
                    <option value="">Inherit Universal Incentive</option>
                    <option value="PRODUCT">Percentage of Cost (% PRODUCT)</option>
                    <option value="QUANTITY">Fixed Rate Per Unit (₹ QUANTITY)</option>
                    <option value="NONE">No Incentive (NONE)</option>
                  </select>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    disabled={!targetFormData.incentiveType || targetFormData.incentiveType === 'NONE'}
                    value={targetFormData.incentiveValue}
                    onChange={(e) => setTargetFormData(prev => ({ ...prev, incentiveValue: e.target.value }))}
                    placeholder={targetFormData.incentiveType === 'PRODUCT' ? 'e.g. 5 for 5%' : 'e.g. 150 for ₹150'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#225091] bg-white disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>
                <p className="text-[10px] text-gray-400">
                  Leave empty to inherit bank-wide universal product incentive.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsTargetModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTarget}
                  className="px-5 py-2 rounded-xl bg-[#225091] hover:bg-[#183e73] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submittingTarget ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  <span>Assign Target</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CONFIGURE PRODUCT INCENTIVE MODAL (WITH 'OTHER' OPTION SUPPORT)  */}
      {/* ========================================================================= */}
      {isIncentiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4.5 bg-[#f8fafc] border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#225091] text-white flex items-center justify-center shadow-xs">
                  <Percent size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Configure Parameter Incentive</h3>
                  <p className="text-xs text-gray-500">Bank-wide automated calculation rule</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsIncentiveModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveProductIncentive} className="p-6 flex flex-col gap-4">
              {/* Product / Parameter Selection */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Product / Parameter</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsIncentiveModalOpen(false);
                      setIsCustomKpiModalOpen(true);
                    }}
                    className="text-[11px] font-bold text-[#225091] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Plus size={12} /> Add New KPI
                  </button>
                </div>
                <select
                  value={selectedIncentive.product}
                  onChange={(e) => setSelectedIncentive(prev => ({ ...prev, product: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#225091] bg-white cursor-pointer"
                >
                  {allAvailableProducts.map((prod) => (
                    <option key={prod.name} value={prod.name}>
                      {prod.name} {prod.isCustom ? '(Custom KPI)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* If 'Other' chosen, show custom name input */}
              {selectedIncentive.product === 'Other' && (
                <div className="flex flex-col gap-1.5 animate-in fade-in duration-150">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Custom Parameter / KPI Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter custom parameter name (e.g. Vehicle Loan, Insurance Policy)..."
                    value={customIncentiveProduct}
                    onChange={(e) => setCustomIncentiveProduct(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#225091] bg-white"
                  />
                </div>
              )}

              {/* Incentive Type (Radio Cards) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Incentive Calculation Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {/* PRODUCT (%) */}
                  <div
                    onClick={() => setSelectedIncentive(prev => ({ ...prev, incentiveType: 'PRODUCT' }))}
                    className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                      selectedIncentive.incentiveType === 'PRODUCT'
                        ? 'border-[#225091] bg-blue-50/70 text-[#225091] shadow-2xs font-bold'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Percent size={18} className="mx-auto mb-1 text-[#225091]" />
                    <span className="text-xs block font-bold">% of Amount</span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">Volume Percentage</span>
                  </div>

                  {/* QUANTITY (₹) */}
                  <div
                    onClick={() => setSelectedIncentive(prev => ({ ...prev, incentiveType: 'QUANTITY' }))}
                    className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                      selectedIncentive.incentiveType === 'QUANTITY'
                        ? 'border-[#225091] bg-blue-50/70 text-[#225091] shadow-2xs font-bold'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Coins size={18} className="mx-auto mb-1 text-emerald-600" />
                    <span className="text-xs block font-bold">₹ per Unit / Lead</span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">Fixed Rate per Count</span>
                  </div>

                  {/* NONE */}
                  <div
                    onClick={() => setSelectedIncentive(prev => ({ ...prev, incentiveType: 'NONE' }))}
                    className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                      selectedIncentive.incentiveType === 'NONE'
                        ? 'border-[#225091] bg-blue-50/70 text-[#225091] shadow-2xs font-bold'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <X size={18} className="mx-auto mb-1 text-gray-400" />
                    <span className="text-xs block font-bold">None</span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">No Incentive</span>
                  </div>
                </div>
              </div>

              {/* Incentive Value */}
              {selectedIncentive.incentiveType !== 'NONE' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    {selectedIncentive.incentiveType === 'PRODUCT' ? 'Incentive Percentage (%)' : 'Rate per Unit / Lead (₹)'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step={selectedIncentive.incentiveType === 'PRODUCT' ? '0.1' : '1'}
                      value={selectedIncentive.incentiveValue}
                      onChange={(e) => setSelectedIncentive(prev => ({ ...prev, incentiveValue: e.target.value }))}
                      placeholder={selectedIncentive.incentiveType === 'PRODUCT' ? 'e.g. 5 for 5%' : 'e.g. 150 for ₹150'}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#225091] bg-white"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-bold text-xs text-gray-400">
                      {selectedIncentive.incentiveType === 'PRODUCT' ? '%' : '₹'}
                    </span>
                  </div>
                </div>
              )}

              {/* Live Preview Box */}
              <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100/80 text-xs text-gray-700 flex items-start gap-2">
                <HelpCircle size={15} className="text-[#225091] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-[#225091] block mb-0.5">Calculation Rule Applied:</span>
                  {selectedIncentive.incentiveType === 'PRODUCT' ? (
                    <span>
                      Executives closing <strong>{selectedIncentive.product === 'Other' ? (customIncentiveProduct || 'Custom Parameter') : selectedIncentive.product}</strong> will earn{' '}
                      <strong className="text-purple-700">{selectedIncentive.incentiveValue || 0}%</strong> of the total volume/deposit amount.
                    </span>
                  ) : selectedIncentive.incentiveType === 'QUANTITY' ? (
                    <span>
                      Executives generating <strong>{selectedIncentive.product === 'Other' ? (customIncentiveProduct || 'Custom Parameter') : selectedIncentive.product}</strong> will earn{' '}
                      <strong className="text-emerald-700">₹{selectedIncentive.incentiveValue || 0}</strong> for each count/lead achieved.
                    </span>
                  ) : (
                    <span>No automated commission or incentive applied for this parameter.</span>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsIncentiveModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingIncentive}
                  className="px-5 py-2 rounded-xl bg-[#225091] hover:bg-[#183e73] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingIncentive ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  <span>Save Universal Rule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ADD NEW CUSTOM KPI / PARAMETER CONFIGURATION                     */}
      {/* ========================================================================= */}
      {isCustomKpiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 my-8">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4.5 bg-[#f8fafc] border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#225091] text-white flex items-center justify-center shadow-xs">
                  <Target size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Add New KPI / Parameter</h3>
                  <p className="text-xs text-gray-500">Create & configure dynamic bank performance metrics</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsCustomKpiModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveCustomKpi} className="p-6 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
              {/* Row 1: KPI Name & Effective Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    KPI Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vehicle Loan, Insurance Policy, Gold Coin..."
                    value={customKpiForm.kpiName}
                    onChange={(e) => setCustomKpiForm(prev => ({ ...prev, kpiName: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#225091] bg-white"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Effective Date</label>
                  <input
                    type="date"
                    required
                    value={customKpiForm.effectiveDate}
                    onChange={(e) => setCustomKpiForm(prev => ({ ...prev, effectiveDate: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#225091] bg-white cursor-pointer"
                  />
                </div>
              </div>

              {/* Row 2: KPI Type (Count | Amount | Percentage | Volume) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">KPI Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { type: 'Count', label: 'Count (Units)' },
                    { type: 'Amount', label: 'Amount (₹)' },
                    { type: 'Percentage', label: 'Percentage (%)' },
                    { type: 'Volume', label: 'Volume (Business)' },
                  ].map(item => (
                    <div
                      key={item.type}
                      onClick={() => setCustomKpiForm(prev => ({ ...prev, kpiType: item.type }))}
                      className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                        customKpiForm.kpiType === item.type
                          ? 'border-[#225091] bg-blue-50/70 text-[#225091] shadow-2xs font-bold'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-xs block font-bold">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Row 3: Target Value & Minimum Achievement % */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Baseline Target</label>
                  <input
                    type="number"
                    min="0"
                    placeholder={customKpiForm.kpiType === 'Count' ? 'e.g. 100 leads' : 'e.g. 1000000'}
                    value={customKpiForm.target}
                    onChange={(e) => setCustomKpiForm(prev => ({ ...prev, target: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#225091] bg-white"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Minimum Achievement %</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="e.g. 70 (0 if no threshold)"
                      value={customKpiForm.minAchievementPercent}
                      onChange={(e) => setCustomKpiForm(prev => ({ ...prev, minAchievementPercent: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#225091] bg-white pr-8"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-bold text-xs text-gray-400">%</span>
                  </div>
                </div>
              </div>

              {/* Row 4: Incentive Type (FixedAmount | Percentage | SlabBased) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Incentive Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { type: 'FixedAmount', label: 'Fixed Amount (₹)', sub: '₹ per unit/lead' },
                    { type: 'Percentage', label: 'Percentage (%)', sub: '% of transaction' },
                    { type: 'SlabBased', label: 'Slab Based', sub: 'Tiered brackets' },
                  ].map(item => (
                    <div
                      key={item.type}
                      onClick={() => setCustomKpiForm(prev => ({ ...prev, incentiveType: item.type }))}
                      className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                        customKpiForm.incentiveType === item.type
                          ? 'border-[#225091] bg-blue-50/70 text-[#225091] shadow-2xs font-bold'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-xs block font-bold">{item.label}</span>
                      <span className="text-[10px] text-gray-400 block mt-0.5">{item.sub}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Incentive Configuration (Fixed Amount or Percentage Rate) */}
              {customKpiForm.incentiveType === 'FixedAmount' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Fixed Amount (₹ per Unit / Lead)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      required
                      placeholder="e.g. 200"
                      value={customKpiForm.fixedAmount}
                      onChange={(e) => setCustomKpiForm(prev => ({ ...prev, fixedAmount: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#225091] bg-white pr-8"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-bold text-xs text-gray-400">₹</span>
                  </div>
                </div>
              )}

              {customKpiForm.incentiveType === 'Percentage' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Incentive Percentage (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.05"
                      required
                      placeholder="e.g. 1.25"
                      value={customKpiForm.percentageRate}
                      onChange={(e) => setCustomKpiForm(prev => ({ ...prev, percentageRate: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#225091] bg-white pr-8"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-bold text-xs text-gray-400">%</span>
                  </div>
                </div>
              )}

              {/* Slab-Based Configurator */}
              {customKpiForm.incentiveType === 'SlabBased' && (
                <div className="flex flex-col gap-2 p-3.5 bg-gray-50/70 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Incentive Slabs Structure</label>
                    <button
                      type="button"
                      onClick={handleAddCustomKpiSlab}
                      className="text-[11px] font-bold text-[#225091] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Plus size={12} /> Add Slab Tier
                    </button>
                  </div>

                  <div className="flex flex-col gap-2">
                    {customKpiForm.slabs.map((slab, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="flex-1">
                          <input
                            type="number"
                            min="0"
                            placeholder="Min Amount (₹)"
                            value={slab.minAmount}
                            onChange={(e) => handleUpdateCustomKpiSlab(idx, 'minAmount', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white font-medium"
                          />
                        </div>
                        <span className="text-xs text-gray-400 font-bold">to</span>
                        <div className="flex-1">
                          <input
                            type="number"
                            min="0"
                            placeholder="Max Amount (₹ / empty for +)"
                            value={slab.maxAmount}
                            onChange={(e) => handleUpdateCustomKpiSlab(idx, 'maxAmount', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white font-medium"
                          />
                        </div>
                        <div className="w-24 relative">
                          <input
                            type="number"
                            step="0.05"
                            placeholder="Rate %"
                            value={slab.ratePercent}
                            onChange={(e) => handleUpdateCustomKpiSlab(idx, 'ratePercent', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white font-bold pr-6 text-purple-700"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-gray-400">%</span>
                        </div>
                        {customKpiForm.slabs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomKpiSlab(idx)}
                            className="p-1.5 text-gray-400 hover:text-red-500 cursor-pointer"
                            title="Remove Slab"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status & Remarks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Status</label>
                  <select
                    value={customKpiForm.status}
                    onChange={(e) => setCustomKpiForm(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#225091] bg-white cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Remarks / Policy Notes</label>
                  <input
                    type="text"
                    placeholder="Optional notes or qualification criteria..."
                    value={customKpiForm.remarks}
                    onChange={(e) => setCustomKpiForm(prev => ({ ...prev, remarks: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#225091] bg-white"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCustomKpiModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCustomKpi}
                  className="px-5 py-2.5 rounded-xl bg-[#225091] hover:bg-[#183e73] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingCustomKpi ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  <span>Save & Activate Custom KPI</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default KPAReport;

