import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Search, 
  ChevronDown, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  UserCheck, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  LogIn, 
  LogOut, 
  AlertCircle, 
  X, 
  Loader2, 
  ShieldAlert, 
  Award, 
  TrendingUp, 
  Coffee, 
  Check, 
  ArrowRight,
  Briefcase,
  Building2,
  Users,
  Percent,
  CalendarDays,
  Camera,
  History,
  CalendarRange
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import TableWrapper from '../../components/common/TableWrapper';
import StatsCard from '../../components/common/StatsCard';
import Pagination from '../../components/common/Pagination';
import SearchableSelect from '../../components/common/SearchableSelect';
import { branchService } from '../../api/branchService';
import { attendanceService } from '../../api/attendanceService';
import { getCurrentPosition } from '../../utils/geolocation';
import { formatPunchTime, renderPunchCell } from '../../utils/formatUtils';
import useBranchStore from '../../store/branchStore';
import usePermission from '../../hooks/usePermission';
import { Skeleton, SkeletonTableRow } from '../../components/common/Skeleton';
import { locationService } from '../../api/locationService';
import useLocations from '../../hooks/useLocations';
import { employeeService } from '../../api/employeeService';
import ExportDropdown from '../../components/common/ExportDropdown';
import SinglePersonAttendanceModal from '../../components/modals/SinglePersonAttendanceModal';
import ApplyLeaveModal from '../../components/modals/ApplyLeaveModal';
import PunchSelfieModal, { resolveSelfieUrl } from '../../components/modals/PunchSelfieModal';
import PunchCaptureModal from '../../components/modals/PunchCaptureModal';

const ALL_INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 
  'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 
  'Uttarakhand', 'West Bengal'
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT_NAMES = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
];

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 16 }, (_, i) => 2020 + i); // 2020 to 2035

/**
 * Official Attendance Status Badge matching Backend Enum Specifications:
 * - PRESENT: Green (#16a34a)
 * - LATE_PRESENT: Amber (#d97706)
 * - HALF_DAY: Orange (#ea580c)
 * - EARLY_LEAVE: Purple (#9333ea)
 * - ABSENT: Red (#dc2626)
 * - LEAVE: Blue (#2563eb)
 * - WEEK_OFF: Gray (#6b7280)
 * - PENDING: Cyan (#0891b2)
 * - UPCOMING: Slate (#94a3b8)
 */
export const AttendanceStatusBadge = ({ status }) => {
  const upper = (status || '').toUpperCase().trim();
  switch (upper) {
    case 'PRESENT':
    case 'P':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-emerald-200 bg-emerald-50 text-[#16a34a]">
          PRESENT
        </span>
      );
    case 'LATE_PRESENT':
    case 'LATE':
    case 'P*':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-amber-200 bg-amber-50 text-[#d97706]">
          LATE PRESENT
        </span>
      );
    case 'HALF_DAY':
    case 'HD':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-orange-200 bg-orange-50 text-[#ea580c]">
          HALF DAY
        </span>
      );
    case 'EARLY_LEAVE':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-purple-200 bg-purple-50 text-[#9333ea]">
          EARLY LEAVE
        </span>
      );
    case 'ABSENT':
    case 'A':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-red-200 bg-red-50 text-[#dc2626]">
          ABSENT
        </span>
      );
    case 'LEAVE':
    case 'L':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-blue-200 bg-blue-50 text-[#2563eb]">
          LEAVE
        </span>
      );
    case 'WEEK_OFF':
    case 'WEEKLY_OFF':
    case 'WO':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-gray-300 bg-gray-100 text-[#6b7280]">
          WEEK OFF
        </span>
      );
    case 'PENDING':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-cyan-200 bg-cyan-50 text-[#0891b2]">
          PENDING
        </span>
      );
    case 'UPCOMING':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-slate-200 bg-slate-100 text-[#94a3b8]">
          UPCOMING
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border border-gray-200 bg-gray-50 text-gray-600">
          {upper || '—'}
        </span>
      );
  }
};

const MonthlyStatusBadge = ({ status, hasSelfie, onClick }) => {
  let styles = '';
  let isPill = false;
  const upperStatus = (status || '').toUpperCase().trim();

  switch (upperStatus) {
    case 'P':
    case 'PRESENT':
      styles = 'text-[#16a34a] border-[#16a34a]/40 bg-emerald-50';
      break;
    case 'P*':
    case 'LATE':
    case 'LATE_PRESENT':
      styles = 'text-[#d97706] border-[#d97706]/40 bg-amber-50';
      break;
    case 'A':
    case 'ABSENT':
      styles = 'text-[#dc2626] border-[#dc2626]/40 bg-rose-50';
      break;
    case 'L':
    case 'LEAVE':
      styles = 'text-[#2563eb] border-[#2563eb]/40 bg-blue-50';
      break;
    case 'HD':
    case 'HALF_DAY':
      styles = 'text-[#ea580c] border-[#ea580c]/40 bg-orange-50';
      isPill = true;
      break;
    case 'EARLY_LEAVE':
      styles = 'text-[#9333ea] border-[#9333ea]/40 bg-purple-50';
      isPill = true;
      break;
    case 'WO':
    case 'WEEKLY_OFF':
    case 'WEEK_OFF':
      styles = 'text-[#6b7280] border-[#9ca3af] bg-[#e5e7eb]';
      isPill = true;
      break;
    case 'COFF':
    case 'COMP_OFF':
      styles = 'text-[#6366f1] border-[#818cf8] bg-[#eef2ff]';
      isPill = true;
      break;
    case 'PENDING':
      styles = 'text-[#0891b2] border-[#0891b2]/40 bg-cyan-50';
      isPill = true;
      break;
    case 'UPCOMING':
      styles = 'text-[#94a3b8] border-[#94a3b8]/40 bg-slate-50';
      isPill = true;
      break;
    case '-':
    case '—':
    case '':
      styles = 'text-gray-300 border-gray-200 bg-gray-50/50';
      break;
    default:
      styles = 'text-[#16a34a] border-[#16a34a]/40 bg-emerald-50';
  }

  const baseStyles = "inline-flex items-center justify-center border text-[11px] font-bold";
  const shapeStyles = isPill ? "px-1.5 py-0.5 rounded-full min-w-[28px]" : "w-6 h-6 rounded-full";

  const content = (
    <div className={`${baseStyles} ${shapeStyles} ${styles}`} title={upperStatus || 'Not Recorded'}>
      {upperStatus || '—'}
    </div>
  );

  if (hasSelfie) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="relative inline-flex items-center justify-center group/selfie cursor-pointer focus:outline-none"
        title="Punch selfie captured - click to inspect"
      >
        {content}
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#225091] text-white rounded-full flex items-center justify-center shadow-xs ring-1 ring-white">
          <Camera size={7} />
        </span>
      </button>
    );
  }

  return content;
};

const LegendItem = ({ status, label }) => (
  <div className="flex items-center gap-1.5">
    <MonthlyStatusBadge status={status} />
    <span className="text-xs font-semibold text-gray-600">{label}</span>
  </div>
);

const AttendanceReport = () => {
  const navigate = useNavigate();
  const tableRef = useRef(null);

  const { isSuperAdmin, hasPermission, hasAnyPermission, user, role } = usePermission();
  const canViewStaffAttendance = isSuperAdmin || hasAnyPermission(['employee.view', 'attendance.view', 'attendance_report.view']);

  // Navigation Tabs: 'daily' | 'monthly' | 'yearly' | 'history'
  const [activeTab, setActiveTab] = useState('daily');
  const [historySelfieAudit, setHistorySelfieAudit] = useState(null);
  const [isHistorySelfieOpen, setIsHistorySelfieOpen] = useState(false);
  const [punchCaptureConfig, setPunchCaptureConfig] = useState({
    isOpen: false,
    punchType: 'IN'
  });

  const handleOpenTodaySelfie = (type = 'IN') => {
    setHistorySelfieAudit({
      employeeName: 'My Attendance',
      designation: 'Logged In User',
      date: todayData.today?.dateString || new Date().toISOString().split('T')[0],
      status: todayData.today?.status || 'PRESENT',
      punchIn: todayData.today?.punchIn,
      punchInSelfie: todayData.today?.punchInSelfie,
      punchInLocation: todayData.today?.location,
      punchOut: todayData.today?.punchOut,
      punchOutSelfie: todayData.today?.punchOutSelfie,
      punchOutLocation: todayData.today?.location
    });
    setIsHistorySelfieOpen(true);
  };

  const handleOpenHistorySelfie = (item) => {
    const rawInSelfie = item.punchInSelfie || item.punchInSelfieUrl || item.punchIn?.selfieUrl || item.punchIn?.selfie || item.punchIn?.photo || item.punchInPhoto || item.punchInImage || item.selfieIn || item.checkInSelfie || item.selfieUrl || item.selfie;
    const rawOutSelfie = item.punchOutSelfie || item.punchOutSelfieUrl || item.punchOut?.selfieUrl || item.punchOut?.selfie || item.punchOut?.photo || item.punchOutPhoto || item.punchOutImage || item.selfieOut || item.checkOutSelfie;

    setHistorySelfieAudit({
      employeeName: item.employeeName || item.name || item.fullName || item.user?.fullName || 'Staff Member',
      designation: item.designation || item.role || item.user?.role || 'Staff',
      employeeCode: item.employeeCode || item.empCode || item.user?.employeeCode || '',
      date: item.dateString || (item.date ? item.date.slice(0, 10) : 'Today'),
      status: item.status || 'PRESENT',
      punchIn: item.punchInTime || item.punchIn,
      punchInSelfie: rawInSelfie,
      punchInLocation: item.punchInLocation || item.punchInLoc || item.location,
      punchOut: item.punchOutTime || item.punchOut,
      punchOutSelfie: rawOutSelfie,
      punchOutLocation: item.punchOutLocation || item.punchOutLoc || item.location,
    });
    setIsHistorySelfieOpen(true);
  };

  // Date Filter Mode for date-wise tab: 'SINGLE' | 'RANGE'
  const [dateFilterMode, setDateFilterMode] = useState('SINGLE');
  const [rangeStartDate, setRangeStartDate] = useState('');
  const [rangeEndDate, setRangeEndDate] = useState('');

  // History Tab State (Endpoint 5: GET /api/v1/employee/attendance/history)
  const [historyRecords, setHistoryRecords] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyStatus, setHistoryStatus] = useState('');
  const [historyDateString, setHistoryDateString] = useState('');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [historyMeta, setHistoryMeta] = useState({
    page: 1,
    limit: 20,
    totalPages: 1,
    totalRecords: 0
  });

  // Modals state
  const [isSingleReportModalOpen, setIsSingleReportModalOpen] = useState(false);
  const [selectedEmployeeForReport, setSelectedEmployeeForReport] = useState(null);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  // Navigate to Geo-Tagging page with target employee pre-focused
  const handleViewOnMap = (emp, punchType = 'IN') => {
    const isOut = punchType === 'OUT';
    const locObj = isOut ? emp.punchOutLocation : emp.punchInLocation;
    const lat = locObj?.latitude ?? (isOut ? emp.punchOutLatitude : emp.punchInLatitude);
    const lng = locObj?.longitude ?? (isOut ? emp.punchOutLongitude : emp.punchInLongitude);
    const address = locObj?.address ?? (isOut ? emp.punchOutAddress : emp.punchInAddress) ?? (emp.branchName ? `${emp.branchName} Branch` : '');

    navigate('/geo-tagging', {
      state: {
        employeeId: emp.id || emp._id,
        employeeName: emp.name || emp.employeeName,
        punchLat: lat,
        punchLng: lng,
        punchAddress: address,
        from: '/attendance-report'
      }
    });
  };

  // Open single person 12-month matrix and monthly sheet report
  const handleOpenSingleReport = (emp) => {
    setSelectedEmployeeForReport({
      id: emp.id || emp._id || emp.employeeId,
      employeeId: emp.id || emp._id || emp.employeeId,
      employeeName: emp.name || emp.employeeName || emp.fullName,
      employeeCode: emp.employeeCode || '',
      designation: emp.designation || 'Staff',
      department: emp.department || 'Operations',
      branchName: emp.branchName || emp.branch?.name || 'Main Branch',
      branchCode: emp.branchCode || emp.branch?.code || '',
      profileImage: emp.profileImage || null,
      email: emp.email || '',
      phoneNumber: emp.phoneNumber || emp.phone || ''
    });
    setIsSingleReportModalOpen(true);
  };

  // Today's Live Attendance & Shift Snapshot State
  const [todayData, setTodayData] = useState({
    onShift: false,
    today: {
      dateString: new Date().toISOString().split('T')[0],
      punchIn: null,
      punchOut: null,
      status: 'NOT_PUNCHED',
      canPunchIn: true,
      canPunchOut: false,
      isLate: false,
      lateMinutes: 0
    },
    shiftInfo: {
      dutyHours: '10:00 to 19:00',
      weeklyOff: 'Sunday'
    }
  });

  // Monthly Report Summary KPI Cards State (Top snapshot)
  const [monthlyReport, setMonthlyReport] = useState({
    present: 22,
    absent: 2,
    halfDay: 1,
    leave: 2,
    latePresent: 3,
    earlyLeave: 1,
    lateFine: 0,
    overtime: '04:30 hrs'
  });

  // Loading & Action Spinners
  const [loadingToday, setLoadingToday] = useState(true);
  const [punchingIn, setPunchingIn] = useState(false);
  const [punchingOut, setPunchingOut] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);

  // Filters & State Options (Section 1.1 /filters API)
  const [apiStates, setApiStates] = useState([]);
  const [apiBranches, setApiBranches] = useState([]);
  const [apiExecutives, setApiExecutives] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedExecutive, setSelectedExecutive] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const { states: locStates, availableCities } = useLocations(selectedState);
  
  // Date State for Daily / Date-wise Tab
  const todayISO = new Date().toISOString().split('T')[0];
  const [referenceDate, setReferenceDate] = useState(todayISO);
  
  // Month / Year Picker for Monthly / Yearly tabs
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Sync selectedMonth/Year when referenceDate changes so tabs stay temporally aligned
  useEffect(() => {
    if (referenceDate) {
      const d = new Date(referenceDate);
      if (!isNaN(d.getTime())) {
        setSelectedMonth(d.getMonth() + 1);
        setSelectedYear(d.getFullYear());
      }
    }
  }, [referenceDate]);
  
  // Section 1.2: Daily Attendance Report Data State
  const [reportItems, setReportItems] = useState([]);
  const [loadingReportData, setLoadingReportData] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [meta, setMeta] = useState({
    totalRecords: 0,
    limit: 10,
    page: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false
  });

  // Section 5: Monthly Attendance Sheet Data State
  const [monthlySheetData, setMonthlySheetData] = useState({
    month: 8,
    year: 2026,
    monthName: 'August 2026',
    daysInMonth: 31,
    summaryStats: {
      totalEmployees: 0,
      totalPresentDays: 0,
      totalAbsentDays: 0,
      totalLeaveDays: 0,
      totalHalfDays: 0,
      averageAttendancePercentage: 0
    },
    items: [],
    meta: {
      totalRecords: 0,
      limit: 10,
      page: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false
    }
  });
  const [loadingMonthlySheet, setLoadingMonthlySheet] = useState(false);
  const [monthlyPage, setMonthlyPage] = useState(1);

  // Section 6: Yearly Attendance Matrix Data State
  const [yearlyMatrixData, setYearlyMatrixData] = useState({
    year: new Date().getFullYear(),
    selectedMonth: null,
    summaryStats: {
      totalEmployees: 0,
      averageAttendancePercentage: 0,
      formattedAverageAttendance: '0%'
    },
    items: [],
    meta: {
      totalRecords: 0,
      limit: 10,
      page: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false
    }
  });
  const [loadingYearlyMatrix, setLoadingYearlyMatrix] = useState(false);
  const [yearlyPage, setYearlyPage] = useState(1);
  const [yearlyMonthFilter, setYearlyMonthFilter] = useState(''); // '' for all months, or 1..12

  // Fetch executives list
  useEffect(() => {
    const fetchExecutives = async () => {
      try {
        const res = await employeeService.list({ limit: 100, includeBranchManagers: true });
        if (res && res.success) {
          const list = Array.isArray(res.data) 
            ? res.data 
            : (res.data?.items || res.data?.employees || []);
          setApiExecutives(list);
        }
      } catch (err) {
        console.warn("Failed to load executives for attendance filter:", err);
      }
    };
    fetchExecutives();
  }, []);

  const { globalBranchId } = useBranchStore();

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
      setMonthlyPage(1);
      setYearlyPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // 1. Fetch Today's Attendance Snapshot (Self / Shift details)
  const fetchTodayStatus = useCallback(async () => {
    setLoadingToday(true);
    try {
      const res = await attendanceService.getTodayStatus();
      const payload = res?.data || res || {};
      const todayAtt = payload.todayAttendance || payload.today || {};
      if (payload && (todayAtt.punchIn || payload.today || payload.shiftInfo || payload.hasPunchedIn !== undefined || payload.onShift !== undefined)) {
        const hasIn = payload.hasPunchedIn ?? Boolean(todayAtt.punchIn);
        const hasOut = payload.hasPunchedOut ?? Boolean(todayAtt.punchOut);
        const onShift = Boolean(payload.onShift ?? (hasIn && !hasOut));

        setTodayData(prev => ({
          ...prev,
          onShift,
          today: {
            ...prev.today,
            ...todayAtt,
            canPunchIn: !hasIn,
            canPunchOut: hasIn && !hasOut,
            status: todayAtt.status || (onShift ? 'PRESENT' : (hasOut ? 'COMPLETED' : 'NOT_PUNCHED'))
          },
          shiftInfo: {
            ...prev.shiftInfo,
            ...(payload.shiftInfo || {})
          }
        }));
      }
    } catch (err) {
      console.warn("Could not fetch today's live attendance snapshot from API; using current session context.", err);
    } finally {
      setLoadingToday(false);
    }
  }, []);

  // 2. Fetch KPI Summary Cards (Context-aware based on activeTab)
  const fetchMonthlyReport = useCallback(async () => {
    setLoadingReport(true);
    try {
      const params = {};
      
      if (activeTab === 'daily') {
        if (dateFilterMode === 'RANGE' && rangeStartDate && rangeEndDate) {
          params.startDate = rangeStartDate;
          params.endDate = rangeEndDate;
        } else {
          params.date = referenceDate;
        }
      } else if (activeTab === 'monthly') {
        params.month = Number(selectedMonth);
        params.year = Number(selectedYear);
      } else if (activeTab === 'yearly') {
        params.year = Number(selectedYear);
        if (yearlyMonthFilter) {
          params.month = Number(yearlyMonthFilter);
        }
      } else if (activeTab === 'history') {
        if (historyDateString) params.date = historyDateString;
        else if (historyStartDate && historyEndDate) {
          params.startDate = historyStartDate;
          params.endDate = historyEndDate;
        }
      }

      if (selectedState) params.state = selectedState;
      if (selectedCity) params.city = selectedCity;

      const res = await attendanceService.getMonthlyReport(params);
      const payload = res?.data || res || {};
      const cards = payload.cards || payload;
      if (cards && typeof cards === 'object') {
        setMonthlyReport(prev => ({
          ...prev,
          ...cards
        }));
      }
    } catch (err) {
      console.warn("Could not fetch attendance cards from API; using cached summary.", err);
    } finally {
      setLoadingReport(false);
    }
  }, [activeTab, dateFilterMode, rangeStartDate, rangeEndDate, referenceDate, selectedMonth, selectedYear, yearlyMonthFilter, historyDateString, historyStartDate, historyEndDate, selectedState, selectedCity]);

  // 3. Section 1.1: Fetch Attendance Filter Options (States & Branches)
  const fetchFilterOptions = useCallback(async () => {
    try {
      const params = {};
      if (selectedState) {
        params.state = selectedState;
      }
      const [res, locRes] = await Promise.allSettled([
        attendanceService.getReportFilters(params),
        locationService.getLocations(),
      ]);

      let states = [];
      if (locRes.status === 'fulfilled' && locRes.value?.states?.length > 0) {
        states = locRes.value.states;
      }

      if (res.status === 'fulfilled' && res.value && (res.value.success || res.value.statusCode === 200)) {
        const data = res.value.data || {};
        if (Array.isArray(data.states) && data.states.length > 0) {
          states = Array.from(new Set([...states, ...data.states])).sort((a, b) => a.localeCompare(b));
        }
        if (Array.isArray(data.branches)) {
          setApiBranches(data.branches);
        }
      }

      if (states.length > 0) {
        setApiStates(states);
      }
    } catch (err) {
      console.warn("Could not load filters from attendance-report/filters API; falling back to branch service list.", err);
      try {
        const bRes = await branchService.list({ limit: 100 });
        if (bRes && bRes.success) {
          const list = Array.isArray(bRes.data) 
            ? bRes.data 
            : (bRes.data?.branches || bRes.data?.items || []);
          setApiBranches(list);
        }
      } catch (e) {
        console.error("Fallback branch list error:", e);
      }
    }
  }, [selectedState]);

  // 4. Section 1.2: Fetch Daily Attendance Report Data
  const fetchDailyAttendanceReport = useCallback(async () => {
    if (activeTab !== 'daily') return;
    setLoadingReportData(true);
    try {
      const params = {
        period: 'DAILY',
        page,
        limit
      };

      if (dateFilterMode === 'RANGE' && rangeStartDate && rangeEndDate) {
        params.startDate = rangeStartDate;
        params.endDate = rangeEndDate;
      } else {
        params.date = referenceDate;
      }

      if (selectedState) params.state = selectedState;
      if (selectedCity) params.city = selectedCity;
      const activeBranch = selectedBranch || globalBranchId;
      if (activeBranch) params.branchId = activeBranch;
      if (selectedExecutive) params.employeeId = selectedExecutive;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

      const res = await attendanceService.getAttendanceReport(params);
      if (res && (res.success || res.statusCode === 200)) {
        let items = Array.isArray(res.data) 
          ? res.data 
          : (Array.isArray(res.data?.items) ? res.data.items : []);
        
        if (selectedExecutive) {
          items = items.filter(e => (e.id || e._id || e.employeeId) === selectedExecutive);
        }

        setReportItems(items);

        const metaPayload = res.meta || res.pagination || res.data?.meta;
        if (metaPayload) {
          setMeta({
            totalRecords: Number(selectedExecutive ? items.length : (metaPayload.totalRecords ?? items.length)),
            limit: Number(metaPayload.limit ?? limit),
            page: Number(metaPayload.page ?? page),
            totalPages: Number(selectedExecutive ? 1 : ((metaPayload.totalPages ?? Math.ceil(items.length / limit)) || 1)),
            hasNextPage: Boolean(metaPayload.hasNextPage && !selectedExecutive),
            hasPrevPage: Boolean(metaPayload.hasPrevPage && !selectedExecutive)
          });
        } else {
          setMeta({
            totalRecords: items.length,
            limit,
            page,
            totalPages: Math.ceil(items.length / limit) || 1,
            hasNextPage: page < Math.ceil(items.length / limit),
            hasPrevPage: page > 1
          });
        }
      } else {
        throw new Error(res?.message || 'Failed to fetch attendance report');
      }
    } catch (err) {
      console.error('Error fetching attendance report:', err);
      setReportItems([]);
    } finally {
      setLoadingReportData(false);
    }
  }, [activeTab, page, limit, selectedState, selectedCity, selectedBranch, selectedExecutive, globalBranchId, debouncedSearch, referenceDate, dateFilterMode, rangeStartDate, rangeEndDate]);

  // 4.1. Section 1.5: Fetch Attendance History Logs (Endpoint 5: GET /api/v1/employee/attendance/history)
  const fetchHistoryLogs = useCallback(async () => {
    if (activeTab !== 'history') return;
    setLoadingHistory(true);
    try {
      const params = {
        page: historyPage,
        limit: 20
      };
      if (historyStatus) params.status = historyStatus;
      if (historyDateString) params.dateString = historyDateString;
      if (historyStartDate) params.startDate = historyStartDate;
      if (historyEndDate) params.endDate = historyEndDate;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

      const res = await attendanceService.getAttendanceHistory(params);
      const payload = res?.data || res || {};
      const records = Array.isArray(payload.history)
        ? payload.history
        : Array.isArray(payload.records)
          ? payload.records
          : Array.isArray(payload.items)
            ? payload.items
            : Array.isArray(payload)
              ? payload
              : [];
      const pagination = payload.pagination || payload.meta || payload;
      setHistoryRecords(records);
      setHistoryMeta({
        page: Number(pagination.currentPage || pagination.page || historyPage),
        limit: Number(pagination.limit || 20),
        totalPages: Number(pagination.totalPages || Math.ceil(records.length / 20) || 1),
        totalRecords: Number(pagination.totalRecords ?? records.length)
      });
    } catch (err) {
      console.warn("Could not fetch attendance history logs:", err);
      setHistoryRecords([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [activeTab, historyPage, historyStatus, historyDateString, historyStartDate, historyEndDate, debouncedSearch]);

  // 5. Section 5: Fetch All Employee Monthly Attendance Sheet Data
  const fetchMonthlySheet = useCallback(async () => {
    if (activeTab !== 'monthly') return;
    setLoadingMonthlySheet(true);
    try {
      const params = {
        month: Number(selectedMonth),
        year: Number(selectedYear),
        page: monthlyPage,
        limit: 10
      };

      if (selectedState) params.state = selectedState;
      if (selectedCity) params.city = selectedCity;
      const activeBranch = selectedBranch || globalBranchId;
      if (activeBranch) params.branchId = activeBranch;
      if (selectedExecutive) params.employeeId = selectedExecutive;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

      const res = await attendanceService.getMonthlySheet(params);
      if (res && (res.success || res.statusCode === 200)) {
        const dataPayload = res.data || {};
        let items = Array.isArray(dataPayload.items) 
          ? dataPayload.items 
          : (Array.isArray(dataPayload) ? dataPayload : []);
        
        if (selectedExecutive) {
          items = items.filter(e => (e.id || e._id || e.employeeId) === selectedExecutive);
        }

        const daysInMonth = Number(dataPayload.daysInMonth) || new Date(selectedYear, selectedMonth, 0).getDate();

        setMonthlySheetData({
          month: dataPayload.month || selectedMonth,
          year: dataPayload.year || selectedYear,
          monthName: dataPayload.monthName || `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`,
          daysInMonth,
          summaryStats: dataPayload.summaryStats || {
            totalEmployees: items.length,
            totalPresentDays: 0,
            totalAbsentDays: 0,
            totalLeaveDays: 0,
            totalHalfDays: 0,
            averageAttendancePercentage: 0
          },
          items,
          meta: dataPayload.meta || res.meta || {
            totalRecords: items.length,
            limit: 10,
            page: monthlyPage,
            totalPages: Math.ceil(items.length / 10) || 1,
            hasNextPage: false,
            hasPrevPage: false
          }
        });
      } else {
        throw new Error(res?.message || 'Failed to fetch monthly attendance sheet');
      }
    } catch (err) {
      console.error('Error fetching monthly attendance sheet:', err);
      // Fallback empty data structure
      setMonthlySheetData(prev => ({
        ...prev,
        items: [],
        daysInMonth: new Date(selectedYear, selectedMonth, 0).getDate()
      }));
    } finally {
      setLoadingMonthlySheet(false);
    }
  }, [activeTab, selectedMonth, selectedYear, monthlyPage, selectedState, selectedCity, selectedBranch, selectedExecutive, globalBranchId, debouncedSearch]);

  // 6. Section 6: Fetch All Employee Yearly Attendance Matrix Data
  const fetchYearlyMatrix = useCallback(async () => {
    if (activeTab !== 'yearly') return;
    setLoadingYearlyMatrix(true);
    try {
      const params = {
        year: Number(selectedYear),
        page: yearlyPage,
        limit: 10
      };

      if (yearlyMonthFilter) {
        params.month = Number(yearlyMonthFilter);
      }
      if (selectedState) params.state = selectedState;
      if (selectedCity) params.city = selectedCity;
      const activeBranch = selectedBranch || globalBranchId;
      if (activeBranch) params.branchId = activeBranch;
      if (selectedExecutive) params.employeeId = selectedExecutive;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

      const res = await attendanceService.getYearlyMatrix(params);
      if (res && (res.success || res.statusCode === 200)) {
        const dataPayload = res.data || {};
        let items = Array.isArray(dataPayload.items)
          ? dataPayload.items
          : (Array.isArray(dataPayload) ? dataPayload : []);

        if (selectedExecutive) {
          items = items.filter(e => (e.id || e._id || e.employeeId) === selectedExecutive);
        }

        setYearlyMatrixData({
          year: dataPayload.year || selectedYear,
          selectedMonth: dataPayload.selectedMonth !== undefined ? dataPayload.selectedMonth : (yearlyMonthFilter ? Number(yearlyMonthFilter) : null),
          summaryStats: dataPayload.summaryStats || {
            totalEmployees: items.length,
            averageAttendancePercentage: 0,
            formattedAverageAttendance: '0%'
          },
          items,
          meta: dataPayload.meta || res.meta || {
            totalRecords: items.length,
            limit: 10,
            page: yearlyPage,
            totalPages: Math.ceil(items.length / 10) || 1,
            hasNextPage: false,
            hasPrevPage: false
          }
        });
      } else {
        throw new Error(res?.message || 'Failed to fetch yearly attendance matrix');
      }
    } catch (err) {
      console.error('Error fetching yearly attendance matrix:', err);
      setYearlyMatrixData(prev => ({
        ...prev,
        items: [],
        meta: {
          totalRecords: 0,
          limit: 10,
          page: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false
        }
      }));
    } finally {
      setLoadingYearlyMatrix(false);
    }
  }, [activeTab, selectedYear, yearlyMonthFilter, yearlyPage, selectedState, selectedCity, selectedBranch, selectedExecutive, globalBranchId, debouncedSearch]);

  // Initial and reactive effects
  useEffect(() => {
    fetchTodayStatus();
  }, [fetchTodayStatus]);

  useEffect(() => {
    fetchMonthlyReport();
  }, [fetchMonthlyReport]);

  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  useEffect(() => {
    if (activeTab === 'daily') {
      fetchDailyAttendanceReport();
    } else if (activeTab === 'monthly') {
      fetchMonthlySheet();
    } else if (activeTab === 'yearly') {
      fetchYearlyMatrix();
    } else if (activeTab === 'history') {
      fetchHistoryLogs();
    }
  }, [activeTab, fetchDailyAttendanceReport, fetchMonthlySheet, fetchYearlyMatrix, fetchHistoryLogs]);

  // Handle Punch In (Check-In) - Opens Camera & GPS Modal
  const handlePunchIn = () => {
    setPunchCaptureConfig({
      isOpen: true,
      punchType: 'IN'
    });
  };

  // Handle Punch Out (Check-Out) - Opens Camera & GPS Modal
  const handlePunchOut = () => {
    setPunchCaptureConfig({
      isOpen: true,
      punchType: 'OUT'
    });
  };

  const handlePunchCaptureSuccess = (resData) => {
    const todayAtt = resData?.todayAttendance || resData || {};
    const hasIn = resData?.hasPunchedIn ?? Boolean(todayAtt.punchIn);
    const hasOut = resData?.hasPunchedOut ?? Boolean(todayAtt.punchOut);
    const onShift = Boolean(resData?.onShift ?? (hasIn && !hasOut));

    setTodayData(prev => ({
      ...prev,
      onShift,
      today: {
        ...prev.today,
        punchIn: todayAtt.punchIn || prev.today.punchIn,
        punchOut: todayAtt.punchOut || prev.today.punchOut,
        punchInSelfie: todayAtt.punchInSelfie || prev.today.punchInSelfie,
        punchOutSelfie: todayAtt.punchOutSelfie || prev.today.punchOutSelfie,
        status: todayAtt.status || (onShift ? 'PRESENT' : (hasOut ? 'COMPLETED' : 'PRESENT')),
        canPunchIn: !hasIn,
        canPunchOut: hasIn && !hasOut,
        isLate: Boolean(todayAtt.isLate),
        lateMinutes: Number(todayAtt.lateMinutes || 0),
        location: todayAtt.location || prev.today.location
      }
    }));

    fetchTodayStatus();
    fetchMonthlyReport();
    if (activeTab === 'daily') fetchDailyAttendanceReport();
    if (activeTab === 'monthly') fetchMonthlySheet();
    if (activeTab === 'yearly') fetchYearlyMatrix();
    if (activeTab === 'history') fetchHistoryLogs();
  };

  // Combined States List
  const mergedStatesList = useMemo(() => {
    if (locStates.length > 0) return locStates;
    if (apiStates.length > 0) return apiStates;
    return ALL_INDIAN_STATES;
  }, [locStates, apiStates]);

  const getSelectedMonthName = (monthNum) => MONTH_NAMES[monthNum - 1] || 'Current Month';

  return (
    <div className="w-full flex flex-col gap-6 font-sans antialiased pb-16">
      <PageHeader
        title={canViewStaffAttendance ? "Attendance Report & Shift Operations" : "My Attendance & Shift Status"}
        breadcrumbs={[
          { label: "Dashboard", to: "/dashboard" },
          { label: canViewStaffAttendance ? "HR Management" : "Self Service" },
          { label: "Attendance Report" }
        ]}
        showBack={false}
        backUrl="/dashboard"
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsLeaveModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#225091] hover:bg-[#193d6e] active:scale-95 transition-all shadow-2xs cursor-pointer"
          >
            <Calendar size={14} />
            <span>Apply Leave</span>
          </button>
        </div>
      </PageHeader>

      {/* ========================================================= */}
      {/* 1. TOP QUICK PUNCH & LIVE SHIFT SNAPSHOT CARD */}
      {/* ========================================================= */}
      <div className="bg-gradient-to-br from-[#225091] via-[#1b3f72] to-[#122e54] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        {/* Ambient background decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-teal-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Left: Employee Shift & Live Status */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider text-white border border-white/20 flex items-center gap-1.5">
                <Clock size={13} />
                Shift: {todayData.shiftInfo?.dutyHours || '10:00 to 19:00'}
              </span>
              <span className="text-xs text-white/80 font-medium">
                Off: <strong className="text-white">{todayData.shiftInfo?.weeklyOff || 'Sunday'}</strong>
              </span>
            </div>

            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>Society Attendance Operations</span>
              {todayData.onShift ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  ON SHIFT
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/10 text-white/70 border border-white/15">
                  OFF SHIFT
                </span>
              )}
            </h2>

            {/* Check-In / Check-Out Badges */}
            <div className="flex items-center gap-4 text-xs font-medium text-white/90 pt-1 flex-wrap">
              <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-xl border border-white/10">
                <LogIn size={14} className="text-emerald-400" />
                <span>Punch-In:</span>
                <strong className="text-white font-mono">{formatPunchTime(todayData.today?.punchIn, 'Not Recorded')}</strong>
              </div>

              <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-xl border border-white/10">
                <LogOut size={14} className="text-amber-400" />
                <span>Punch-Out:</span>
                <strong className="text-white font-mono">{formatPunchTime(todayData.today?.punchOut, 'Not Recorded')}</strong>
              </div>

              {todayData.today?.isLate && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/20 text-rose-200 border border-rose-400/30">
                  <AlertCircle size={13} />
                  Late Arrival ({todayData.today?.lateMinutes || 15}m)
                </span>
              )}
            </div>
          </div>

          {/* Right: GPS Punch Action Buttons */}
          <div className="flex items-center gap-3 flex-wrap lg:flex-nowrap shrink-0">
            {/* Punch-In Button */}
            <button
              type="button"
              onClick={handlePunchIn}
              disabled={punchingIn || todayData.onShift || Boolean(todayData.today?.punchIn)}
              className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer ${
                !todayData.onShift && !todayData.today?.punchIn
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white hover:scale-102 active:scale-98'
                  : 'bg-white/10 text-white/40 cursor-not-allowed border border-white/10'
              }`}
            >
              {punchingIn ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <LogIn size={16} />
              )}
              <span>Punch In (GPS)</span>
            </button>

            {/* Punch-Out Button */}
            <button
              type="button"
              onClick={handlePunchOut}
              disabled={punchingOut || (!todayData.onShift && !todayData.today?.punchIn) || Boolean(todayData.today?.punchOut)}
              className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer ${
                (todayData.onShift || Boolean(todayData.today?.punchIn)) && !todayData.today?.punchOut
                  ? 'bg-amber-500 hover:bg-amber-600 text-white hover:scale-102 active:scale-98'
                  : 'bg-white/10 text-white/40 cursor-not-allowed border border-white/10'
              }`}
            >
              {punchingOut ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <LogOut size={16} />
              )}
              <span>Punch Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. MONTHLY KPI SUMMARY CARDS */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-[#225091]" />
            <h3 className="text-sm font-bold text-gray-900">
              {activeTab === 'daily' 
                ? `Daily Attendance Summary (${referenceDate})` 
                : activeTab === 'monthly'
                ? `Monthly Attendance Summary (${getSelectedMonthName(selectedMonth)} ${selectedYear})`
                : `Yearly Attendance Summary (${yearlyMonthFilter ? getSelectedMonthName(Number(yearlyMonthFilter)) + ' ' : ''}${selectedYear})`}
            </h3>
          </div>

          {/* Quick Refresh Button */}
          <div className="flex items-center gap-2.5">

            <button
              onClick={() => { 
                fetchTodayStatus(); 
                fetchMonthlyReport(); 
                if (activeTab === 'daily') fetchDailyAttendanceReport();
                if (activeTab === 'monthly') fetchMonthlySheet(); 
                if (activeTab === 'yearly') fetchYearlyMatrix();
              }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              title="Refresh Summary"
            >
              <RefreshCw size={14} className={loadingReport || loadingMonthlySheet || loadingYearlyMatrix || loadingReportData ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* KPI 8-Grid Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <StatsCard
            layout="centered"
            color="emerald"
            label="Present"
            value={monthlyReport.present ?? 0}
          />
          <StatsCard
            layout="centered"
            color="rose"
            label="Absent"
            value={monthlyReport.absent ?? 0}
          />
          <StatsCard
            layout="centered"
            color="amber"
            label="Half Day"
            value={monthlyReport.halfDay ?? 0}
          />
          <StatsCard
            layout="centered"
            color="blue"
            label="Leave"
            value={monthlyReport.leave ?? 0}
          />
          <StatsCard
            layout="centered"
            color="amber"
            label="Late Present"
            value={monthlyReport.latePresent ?? 0}
          />
          <StatsCard
            layout="centered"
            color="purple"
            label="Early Leave"
            value={monthlyReport.earlyLeave ?? 0}
          />
          <StatsCard
            layout="centered"
            color="gray"
            label="Late Fine"
            value={`₹${monthlyReport.lateFine ?? 0}`}
          />
          <StatsCard
            layout="centered"
            color="indigo"
            label="Overtime"
            value={monthlyReport.overtime ?? '0 hrs'}
          />
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. SECTION 1 & 5: ATTENDANCE REPORT & MONTHLY MATRIX */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-gray-100 space-y-6">
        {/* Navigation Tab Bar (Date-wise, Month-wise, Year-wise, History Logs) */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 flex-wrap gap-4">
          <div className="flex items-center gap-6">
            <button
              onClick={() => { setActiveTab('daily'); setPage(1); }}
              className={`pb-2 text-xs font-bold transition-all cursor-pointer relative ${
                activeTab === 'daily'
                  ? 'text-[#225091] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#225091]'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Date-wise Attendance
            </button>

            {canViewStaffAttendance && (
              <>
                <button
                  onClick={() => { setActiveTab('monthly'); setMonthlyPage(1); }}
                  className={`pb-2 text-xs font-bold transition-all cursor-pointer relative ${
                    activeTab === 'monthly'
                      ? 'text-[#225091] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#225091]'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Month-wise Attendance
                </button>

                <button
                  onClick={() => { setActiveTab('yearly'); setYearlyPage(1); }}
                  className={`pb-2 text-xs font-bold transition-all cursor-pointer relative ${
                    activeTab === 'yearly'
                      ? 'text-[#225091] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#225091]'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Year-wise Attendance
                </button>
              </>
            )}

            <button
              onClick={() => { setActiveTab('history'); setHistoryPage(1); }}
              className={`pb-2 text-xs font-bold transition-all cursor-pointer relative flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'text-[#225091] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#225091]'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <History size={14} />
              <span>Attendance History Logs</span>
            </button>
          </div>

          {/* Status Legend (Monthly and History tabs) */}
          {(activeTab === 'monthly' || activeTab === 'history') && (
            <div className="flex items-center gap-2.5 flex-wrap text-xs">
              <LegendItem status="P" label="Present" />
              <LegendItem status="P*" label="Late" />
              <LegendItem status="HD" label="Half Day" />
              <LegendItem status="EARLY_LEAVE" label="Early" />
              <LegendItem status="A" label="Absent" />
              <LegendItem status="L" label="Leave" />
              <LegendItem status="WO" label="Week Off" />
            </div>
          )}
        </div>

        {/* Filter Controls Toolbar (City, Branch, Executive, State, Search, Date/Month/Year, Export) */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-1 flex-wrap">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 flex-1">
            {/* 1. Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={15} />
              <input
                type="text"
                placeholder={activeTab === 'history' ? "Search city, branch, address..." : "Search staff, code..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-gray-50/70 border border-gray-200 rounded-xl text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#225091] font-semibold"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* 2. Executive Filter (for Managerial roles only) */}
            {canViewStaffAttendance && (
              <div>
                <SearchableSelect
                  value={selectedExecutive}
                  onChange={(val) => {
                    setSelectedExecutive(val);
                    setPage(1);
                    setMonthlyPage(1);
                    setYearlyPage(1);
                  }}
                  options={[
                    { value: '', label: 'All Executives / Staff' },
                    ...apiExecutives.map(ex => ({
                      value: ex.id || ex._id,
                      label: ex.fullName || ex.name || ex.email || 'Staff'
                    }))
                  ]}
                  placeholder="All Executives"
                  searchPlaceholder="Search executive..."
                  className="text-xs"
                />
              </div>
            )}

            {/* 3. Branch Filter (for Managerial roles only) */}
            {canViewStaffAttendance && (
              <div>
                <SearchableSelect
                  value={selectedBranch}
                  onChange={(val) => { 
                    setSelectedBranch(val); 
                    setPage(1); 
                    setMonthlyPage(1);
                    setYearlyPage(1);
                  }}
                  options={[
                    { value: '', label: 'All Branches' },
                    ...apiBranches.map(b => ({ 
                      value: b.id || b._id, 
                      label: b.name ? `${b.name}${b.code ? ` (${b.code})` : ''}` : (b.branchName || b.id) 
                    }))
                  ]}
                  placeholder="All Branches"
                  searchPlaceholder="Search branch..."
                  className="text-xs"
                />
              </div>
            )}

            {/* 4. City Filter */}
            <div>
              <SearchableSelect
                value={selectedCity}
                onChange={(val) => { 
                  setSelectedCity(val); 
                  setPage(1); 
                  setMonthlyPage(1);
                  setYearlyPage(1);
                }}
                options={[
                  { value: '', label: selectedState ? `All Cities in ${selectedState}` : 'All Cities' },
                  ...availableCities.map(c => ({ value: c, label: c }))
                ]}
                placeholder={selectedState ? `All Cities in ${selectedState}` : 'All Cities'}
                searchPlaceholder="Search city..."
                className="text-xs"
              />
            </div>

            {/* 5. State Filter */}
            <div>
              <SearchableSelect
                value={selectedState}
                onChange={(val) => { 
                  setSelectedState(val); 
                  setSelectedCity('');
                  setSelectedBranch(''); 
                  setPage(1); 
                  setMonthlyPage(1);
                  setYearlyPage(1);
                }}
                options={[
                  { value: '', label: 'All States / Regions' },
                  ...locStates.map(s => ({ value: s, label: s }))
                ]}
                placeholder="All States / Regions"
                searchPlaceholder="Search state..."
                className="text-xs"
              />
            </div>

            {/* 6. Date / Period Filters based on Tab */}
            {activeTab === 'daily' ? (
              <div className="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center bg-gray-100 p-0.5 rounded-lg text-xs font-semibold shrink-0">
                    <button
                      type="button"
                      onClick={() => setDateFilterMode('SINGLE')}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        dateFilterMode === 'SINGLE' ? 'bg-white text-[#225091] shadow-2xs font-bold' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Single Date
                    </button>
                    <button
                      type="button"
                      onClick={() => setDateFilterMode('RANGE')}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        dateFilterMode === 'RANGE' ? 'bg-white text-[#225091] shadow-2xs font-bold' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Date Range
                    </button>
                  </div>

                  {dateFilterMode === 'SINGLE' ? (
                    <input
                      type="date"
                      value={referenceDate}
                      onChange={(e) => {
                        setReferenceDate(e.target.value);
                        setPage(1);
                      }}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#225091] cursor-pointer"
                    />
                  ) : (
                    <div className="flex items-center gap-1 w-full">
                      <input
                        type="date"
                        value={rangeStartDate}
                        placeholder="Start Date"
                        onChange={(e) => {
                          setRangeStartDate(e.target.value);
                          setPage(1);
                        }}
                        className="w-1/2 px-2 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#225091] cursor-pointer"
                        title="Start Date (YYYY-MM-DD)"
                      />
                      <span className="text-gray-400 text-xs">to</span>
                      <input
                        type="date"
                        value={rangeEndDate}
                        placeholder="End Date"
                        min={rangeStartDate || undefined}
                        onChange={(e) => {
                          setRangeEndDate(e.target.value);
                          setPage(1);
                        }}
                        className="w-1/2 px-2 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#225091] cursor-pointer"
                        title="End Date (YYYY-MM-DD)"
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : activeTab === 'history' ? (
              <div className="flex items-center gap-1.5 col-span-1 sm:col-span-2">
                <select
                  value={historyStatus}
                  onChange={(e) => {
                    setHistoryStatus(e.target.value);
                    setHistoryPage(1);
                  }}
                  className="w-1/2 px-2.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#225091] cursor-pointer"
                >
                  <option value="">All Statuses</option>
                  <option value="PRESENT">Present</option>
                  <option value="LATE_PRESENT">Late Present</option>
                  <option value="HALF_DAY">Half Day</option>
                  <option value="EARLY_LEAVE">Early Leave</option>
                  <option value="ABSENT">Absent</option>
                  <option value="LEAVE">Leave</option>
                </select>
                <input
                  type="date"
                  value={historyDateString}
                  onChange={(e) => {
                    setHistoryDateString(e.target.value);
                    setHistoryPage(1);
                  }}
                  className="w-1/2 px-2.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#225091] cursor-pointer"
                  title="Filter by specific date"
                />
              </div>
            ) : activeTab === 'monthly' ? (
              <div className="flex items-center gap-1.5">
                <div className="w-1/2">
                  <SearchableSelect
                    value={selectedMonth}
                    onChange={(val) => {
                      setSelectedMonth(val ? Number(val) : new Date().getMonth() + 1);
                      setMonthlyPage(1);
                    }}
                    options={MONTH_NAMES.map((m, idx) => ({ value: idx + 1, label: m.slice(0, 3) }))}
                    placeholder="Month"
                    searchPlaceholder="Search month..."
                    allowClear={false}
                  />
                </div>
                <div className="w-1/2">
                  <SearchableSelect
                    value={selectedYear}
                    onChange={(val) => {
                      setSelectedYear(val ? Number(val) : new Date().getFullYear());
                      setMonthlyPage(1);
                    }}
                    options={YEAR_OPTIONS.map(y => ({ value: y, label: String(y) }))}
                    placeholder="Year"
                    searchPlaceholder="Search year..."
                    allowClear={false}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <div className="w-1/2">
                  <SearchableSelect
                    value={selectedYear}
                    onChange={(val) => {
                      setSelectedYear(val ? Number(val) : new Date().getFullYear());
                      setYearlyPage(1);
                    }}
                    options={YEAR_OPTIONS.map(y => ({ value: y, label: String(y) }))}
                    placeholder="Year"
                    searchPlaceholder="Search year..."
                    allowClear={false}
                  />
                </div>
                <div className="w-1/2">
                  <SearchableSelect
                    value={yearlyMonthFilter}
                    onChange={(val) => {
                      setYearlyMonthFilter(val);
                      setYearlyPage(1);
                    }}
                    options={[
                      { value: '', label: 'All' },
                      ...MONTH_NAMES.map((m, idx) => ({ value: String(idx + 1), label: m.slice(0, 3) }))
                    ]}
                    placeholder="Month"
                    searchPlaceholder="Search month..."
                    allowClear={true}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Export and Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Universal Multi-Format Export Dropdown */}
            <ExportDropdown
              tableRef={tableRef}
              filename={`Attendance-${activeTab === 'daily' ? 'DateWise' : activeTab === 'monthly' ? 'MonthWise' : activeTab === 'yearly' ? 'YearWise' : 'HistoryLogs'}`}
              title={`Society Attendance Operations (${activeTab === 'daily' ? 'Date-wise' : activeTab === 'monthly' ? 'Month-wise' : activeTab === 'yearly' ? 'Year-wise' : 'History Logs'})`}
            />

            {/* Reset Filters */}
            {(searchQuery || selectedExecutive || selectedBranch || selectedCity || selectedState || yearlyMonthFilter || rangeStartDate || rangeEndDate || historyStatus || historyDateString) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedExecutive('');
                  setSelectedBranch('');
                  setSelectedCity('');
                  setSelectedState('');
                  setYearlyMonthFilter('');
                  setRangeStartDate('');
                  setRangeEndDate('');
                  setHistoryStatus('');
                  setHistoryDateString('');
                  setPage(1);
                  setMonthlyPage(1);
                  setYearlyPage(1);
                  setHistoryPage(1);
                }}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-gray-600 hover:text-rose-600 bg-gray-50 hover:bg-rose-50 rounded-xl border border-gray-200 transition-colors cursor-pointer"
                title="Reset All Filters"
              >
                <RefreshCw size={13} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Section 5: Monthly Sheet Aggregated Summary Ribbon */}
        {activeTab === 'monthly' && monthlySheetData.summaryStats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3.5 bg-gray-50/70 border border-gray-100 rounded-xl text-xs">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-[#225091]" />
              <div>
                <span className="text-gray-500 font-medium block text-[10px] uppercase">Employees</span>
                <strong className="text-gray-900 font-bold text-sm">{monthlySheetData.summaryStats.totalEmployees || monthlySheetData.items.length}</strong>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <div>
                <span className="text-gray-500 font-medium block text-[10px] uppercase">Present Days</span>
                <strong className="text-emerald-700 font-bold text-sm">{monthlySheetData.summaryStats.totalPresentDays || 0}</strong>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-600" />
              <div>
                <span className="text-gray-500 font-medium block text-[10px] uppercase">Absent Days</span>
                <strong className="text-rose-700 font-bold text-sm">{monthlySheetData.summaryStats.totalAbsentDays || 0}</strong>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Coffee size={16} className="text-amber-600" />
              <div>
                <span className="text-gray-500 font-medium block text-[10px] uppercase">Leave Days</span>
                <strong className="text-amber-700 font-bold text-sm">{monthlySheetData.summaryStats.totalLeaveDays || 0}</strong>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Percent size={16} className="text-indigo-600" />
              <div>
                <span className="text-gray-500 font-medium block text-[10px] uppercase">Avg Attendance</span>
                <strong className="text-indigo-700 font-bold text-sm">{monthlySheetData.summaryStats.averageAttendancePercentage ?? 0}%</strong>
              </div>
            </div>
          </div>
        )}

        {/* Section 6: Yearly Matrix Aggregated Summary Ribbon */}
        {activeTab === 'yearly' && yearlyMatrixData.summaryStats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-slate-50 border border-blue-100/80 rounded-xl text-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100/80 text-[#225091] flex items-center justify-center font-bold shrink-0">
                <Users size={18} />
              </div>
              <div>
                <span className="text-gray-500 font-medium block text-[10px] uppercase tracking-wider">Total Employees</span>
                <strong className="text-gray-900 font-bold text-base">
                  {yearlyMatrixData.summaryStats.totalEmployees || yearlyMatrixData.items.length}
                </strong>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                <Percent size={18} />
              </div>
              <div>
                <span className="text-gray-500 font-medium block text-[10px] uppercase tracking-wider">Average Attendance</span>
                <strong className="text-emerald-700 font-bold text-base">
                  {yearlyMatrixData.summaryStats.formattedAverageAttendance || `${yearlyMatrixData.summaryStats.averageAttendancePercentage ?? 0}%`}
                </strong>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100/80 text-indigo-700 flex items-center justify-center font-bold shrink-0">
                <CalendarDays size={18} />
              </div>
              <div>
                <span className="text-gray-500 font-medium block text-[10px] uppercase tracking-wider">Evaluation Period</span>
                <strong className="text-indigo-900 font-bold text-base">
                  {selectedYear} {yearlyMonthFilter ? `(${MONTH_NAMES[Number(yearlyMonthFilter) - 1]})` : '(Full Year)'}
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* Table Content */}
        <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-2xs">
          <TableWrapper minHeight="360px">
            {/* TAB 1: DAILY LOGS (Section 1.2) */}
            {activeTab === 'daily' && (
              <table ref={tableRef} className="w-full text-xs border-collapse min-w-[1100px] text-center text-sm whitespace-nowrap">
                <thead className="bg-[#225091] text-white text-xs uppercase tracking-wider font-semibold border-b border-[#225091]">
                  <tr>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center w-14">SR.NO.</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">EMPLOYEE</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">DESIGNATION</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">CHECK-IN</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center min-w-[160px]">PUNCH IN LOCATION</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">CHECK-OUT</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center min-w-[160px]">PUNCH OUT LOCATION</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">WORKING HRS</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">STATUS</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider text-center w-28">PHOTO AUDIT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {loadingReportData ? (
                    Array.from({ length: 5 }).map((_, idx) => (
                      <SkeletonTableRow key={idx} columns={10} />
                    ))
                  ) : reportItems.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="py-12 text-center text-gray-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Users size={32} className="text-gray-300 stroke-[1.5]" />
                          <span className="text-sm font-medium text-gray-500">No attendance records found</span>
                          <span className="text-xs text-gray-400">No staff attendance logged for the selected date and filters</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    reportItems.map((emp, idx) => {
                      const empSrNo = emp.srNo ?? ((page - 1) * limit + idx + 1);
                      const empPunchIn = emp.punchIn || null;
                      const empPunchOut = emp.punchOut || null;
                      const empTotalHrs = emp.totalHrs || (empPunchIn && empPunchOut ? '8 hrs' : empPunchIn ? 'On Shift' : null);
                      const empStatus = (emp.status || (empPunchIn ? 'P' : 'A')).toUpperCase();

                      // Location & Coordinates parsing
                      const empPunchInLoc = emp.punchInLocation || {};
                      const inLat = empPunchInLoc.latitude ?? emp.punchInLatitude ?? null;
                      const inLng = empPunchInLoc.longitude ?? emp.punchInLongitude ?? null;
                      const inAddr = empPunchInLoc.address || emp.punchInAddress || '';

                      const empPunchOutLoc = emp.punchOutLocation || {};
                      const outLat = empPunchOutLoc.latitude ?? emp.punchOutLatitude ?? null;
                      const outLng = empPunchOutLoc.longitude ?? emp.punchOutLongitude ?? null;
                      const outAddr = empPunchOutLoc.address || emp.punchOutAddress || '';

                      // Extract selfies with all field key aliases
                      const rawInSelfie = emp.punchInSelfie || emp.punchInSelfieUrl || emp.punchIn?.selfieUrl || emp.punchIn?.selfie || emp.punchIn?.photo || emp.punchInPhoto || emp.punchInImage || emp.selfieIn || emp.checkInSelfie || emp.selfieUrl || emp.selfie;
                      const rawOutSelfie = emp.punchOutSelfie || emp.punchOutSelfieUrl || emp.punchOut?.selfieUrl || emp.punchOut?.selfie || emp.punchOut?.photo || emp.punchOutPhoto || emp.punchOutImage || emp.selfieOut || emp.checkOutSelfie;
                      const inSelfieUrl = resolveSelfieUrl(rawInSelfie);
                      const outSelfieUrl = resolveSelfieUrl(rawOutSelfie);
                      const employeeAvatar = emp.profileImage || inSelfieUrl;

                      return (
                        <tr key={emp.id || emp._id || idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4 text-center font-bold text-gray-500">
                            {empSrNo}
                          </td>
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              {employeeAvatar ? (
                                <img 
                                  src={employeeAvatar} 
                                  alt={emp.name} 
                                  className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0 shadow-2xs" 
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-blue-50 text-[#225091] font-bold text-xs flex items-center justify-center uppercase shrink-0 border border-blue-100">
                                  {(emp.name || 'E').slice(0, 2)}
                                </div>
                              )}
                              <div className="text-left">
                                <button
                                  type="button"
                                  onClick={() => handleOpenSingleReport(emp)}
                                  className="font-bold text-gray-900 hover:text-[#225091] hover:underline transition-colors text-left cursor-pointer flex items-center gap-1"
                                  title="View Single Person Attendance Report"
                                >
                                  <span>{emp.name}</span>
                                </button>
                                {emp.id && (
                                  <div className="text-[10px] text-gray-400 font-mono">ID: {emp.id.slice(-6)}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-5 text-gray-600 font-semibold">
                            {emp.designation || 'Staff'}
                          </td>

                          {/* CHECK-IN with Selfie Micro Thumbnail */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {inSelfieUrl && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenHistorySelfie({
                                    ...emp,
                                    punchInTime: empPunchIn,
                                    punchOutTime: empPunchOut,
                                    dateString: referenceDate || 'Today'
                                  })}
                                  className="relative group/selfie cursor-pointer shrink-0"
                                  title="Punch-In Selfie: Click to inspect"
                                >
                                  <img 
                                    src={inSelfieUrl} 
                                    alt="Check In Selfie" 
                                    className="w-7 h-7 rounded-md object-cover border border-emerald-400 shadow-2xs hover:scale-115 transition-transform"
                                  />
                                  <span className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-0.5 rounded-full ring-1 ring-white">
                                    <Camera size={7} />
                                  </span>
                                </button>
                              )}
                              <span className="font-semibold text-gray-800 font-mono">
                                {renderPunchCell(empPunchIn)}
                              </span>
                            </div>
                          </td>

                          {/* PUNCH IN LOCATION — separate column */}
                          <td className="py-3.5 px-3 text-center">
                            {inLat && inLng ? (
                              <button
                                type="button"
                                onClick={() => handleViewOnMap(emp, 'IN')}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-[#225091] hover:bg-blue-100 border border-blue-200/70 text-[10px] font-semibold transition-all max-w-[180px] cursor-pointer shadow-2xs group"
                                title={`${inAddr || `${inLat}, ${inLng}`}\nClick to view on Geo-Tagging Map`}
                              >
                                <MapPin size={11} className="text-[#225091] shrink-0 group-hover:scale-110 transition-transform" />
                                <span className="truncate">{inAddr ? inAddr.split(',')[0] : `${Number(inLat).toFixed(4)}, ${Number(inLng).toFixed(4)}`}</span>
                              </button>
                            ) : inAddr ? (
                              <button
                                type="button"
                                onClick={() => handleViewOnMap(emp, 'IN')}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 text-[10px] font-medium transition-all max-w-[180px] truncate cursor-pointer"
                                title={inAddr}
                              >
                                <MapPin size={11} className="text-gray-400 shrink-0" />
                                <span className="truncate">{inAddr.split(',')[0]}</span>
                              </button>
                            ) : (
                              <span className="text-gray-300 text-[11px]">—</span>
                            )}
                          </td>

                          {/* CHECK-OUT with Selfie Micro Thumbnail */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {outSelfieUrl && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenHistorySelfie({
                                    ...emp,
                                    punchInTime: empPunchIn,
                                    punchOutTime: empPunchOut,
                                    dateString: referenceDate || 'Today'
                                  })}
                                  className="relative group/selfie cursor-pointer shrink-0"
                                  title="Punch-Out Selfie: Click to inspect"
                                >
                                  <img 
                                    src={outSelfieUrl} 
                                    alt="Check Out Selfie" 
                                    className="w-7 h-7 rounded-md object-cover border border-rose-400 shadow-2xs hover:scale-115 transition-transform"
                                  />
                                  <span className="absolute -bottom-1 -right-1 bg-rose-600 text-white p-0.5 rounded-full ring-1 ring-white">
                                    <Camera size={7} />
                                  </span>
                                </button>
                              )}
                              <span className="font-semibold text-gray-800 font-mono">
                                {renderPunchCell(empPunchOut)}
                              </span>
                            </div>
                          </td>

                          {/* PUNCH OUT LOCATION — separate column */}
                          <td className="py-3.5 px-3 text-center">
                            {outLat && outLng ? (
                              <button
                                type="button"
                                onClick={() => handleViewOnMap(emp, 'OUT')}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/70 text-[10px] font-semibold transition-all max-w-[180px] cursor-pointer shadow-2xs group"
                                title={`${outAddr || `${outLat}, ${outLng}`}\nClick to view on Geo-Tagging Map`}
                              >
                                <MapPin size={11} className="text-amber-700 shrink-0 group-hover:scale-110 transition-transform" />
                                <span className="truncate">{outAddr ? outAddr.split(',')[0] : `${Number(outLat).toFixed(4)}, ${Number(outLng).toFixed(4)}`}</span>
                              </button>
                            ) : outAddr ? (
                              <button
                                type="button"
                                onClick={() => handleViewOnMap(emp, 'OUT')}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 text-[10px] font-medium transition-all max-w-[180px] truncate cursor-pointer"
                                title={outAddr}
                              >
                                <MapPin size={11} className="text-gray-400 shrink-0" />
                                <span className="truncate">{outAddr.split(',')[0]}</span>
                              </button>
                            ) : (
                              <span className="text-gray-300 text-[11px]">—</span>
                            )}
                          </td>

                          <td className="py-3.5 px-5 text-gray-700 font-semibold">
                            {empTotalHrs || '—'}
                          </td>
                          <td className="py-3.5 px-5 text-center">
                            {empStatus === 'P' || empStatus === 'PRESENT' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                PRESENT
                              </span>
                            ) : empStatus === 'L' || empStatus === 'LEAVE' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#225091] border border-blue-200">
                                ON LEAVE
                              </span>
                            ) : empStatus === 'HD' || empStatus === 'HALF_DAY' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-[#7c3aed] border border-purple-200">
                                HALF DAY
                              </span>
                            ) : empStatus === 'WO' || empStatus === 'WEEKLY_OFF' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-300">
                                WEEKLY OFF
                              </span>
                            ) : empStatus === 'COFF' || empStatus === 'COMP_OFF' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-200">
                                COMP OFF
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                ABSENT
                              </span>
                            )}
                          </td>

                          {/* PHOTO AUDIT */}
                          <td className="py-3.5 px-3 text-center">
                            {inSelfieUrl || outSelfieUrl ? (
                              <button
                                type="button"
                                onClick={() => handleOpenHistorySelfie({
                                  ...emp,
                                  punchInTime: empPunchIn,
                                  punchOutTime: empPunchOut,
                                  dateString: referenceDate || 'Today'
                                })}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-[#225091] hover:bg-blue-100 border border-blue-200 text-[11px] font-bold transition-all shadow-2xs cursor-pointer group"
                                title="Inspect punch selfies, GPS coordinates, and punctuality"
                              >
                                <Camera size={12} className="group-hover:scale-110 transition-transform" />
                                <span>Audit ({[inSelfieUrl, outSelfieUrl].filter(Boolean).length})</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-gray-400 italic">No Photo</span>
                            )}
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

            {/* TAB 2: MONTHLY SHEET (Section 5: /api/v1/society/attendance/sheet) */}
            {activeTab === 'monthly' && (
              <table ref={tableRef} className="w-full text-xs border-collapse min-w-[1100px] text-center text-sm whitespace-nowrap">
                <thead className="bg-[#225091] text-white text-xs uppercase tracking-wider font-semibold border-b border-[#225091]">
                  <tr>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center min-w-[180px]">
                      EMPLOYEE
                    </th>
                    {Array.from({ length: monthlySheetData.daysInMonth || 31 }, (_, i) => (
                      <th key={i} className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center min-w-[34px]">
                        {i + 1}
                      </th>
                    ))}
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center min-w-[48px]">P</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center min-w-[48px]">A</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center min-w-[48px]">L</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center min-w-[48px]">HD</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center min-w-[60px]">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {loadingMonthlySheet ? (
                    Array.from({ length: 5 }).map((_, idx) => (
                      <SkeletonTableRow key={idx} columns={(monthlySheetData.daysInMonth || 31) + 6} />
                    ))
                  ) : monthlySheetData.items.length === 0 ? (
                    <tr>
                      <td colSpan={(monthlySheetData.daysInMonth || 31) + 6} className="py-12 text-center text-gray-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <CalendarDays size={32} className="text-gray-300 stroke-[1.5]" />
                          <span className="text-sm font-medium text-gray-500">No monthly attendance records found</span>
                          <span className="text-xs text-gray-400">Try selecting another month or adjusting your branch/state filters</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    monthlySheetData.items.map((emp, idx) => {
                      const totalDays = monthlySheetData.daysInMonth || 31;
                      const summary = emp.summary || {};
                      const presentCount = summary.presentDays ?? 0;
                      const absentCount = summary.absentDays ?? 0;
                      const leaveCount = summary.leaveDays ?? 0;
                      const halfDayCount = summary.halfDays ?? 0;
                      const percentage = summary.attendancePercentage !== undefined 
                        ? `${summary.attendancePercentage}%` 
                        : (totalDays > 0 ? `${Math.round((presentCount / totalDays) * 100)}%` : '—');

                      return (
                        <tr key={emp.id || emp._id || idx} className="hover:bg-slate-50/60 transition-colors">
                          {/* Employee Info Sticky Column */}
                          <td className="py-3 px-4 font-bold text-gray-900 sticky left-0 bg-white hover:bg-slate-50/90 transition-colors z-10 shadow-xs">
                            <div className="flex flex-col text-left">
                              <button
                                type="button"
                                onClick={() => handleOpenSingleReport(emp)}
                                className="line-clamp-1 text-gray-900 font-bold hover:text-[#225091] hover:underline text-left cursor-pointer"
                                title="Click to view Single Person Attendance Report"
                              >
                                {emp.employeeName || emp.name}
                              </button>
                              <span className="text-[10px] text-gray-400 font-normal">{emp.employeeCode || emp.designation || 'Staff'}</span>
                            </div>
                          </td>

                          {/* Days Columns (1 to daysInMonth) */}
                          {Array.from({ length: totalDays }, (_, d) => {
                            const dayNum = d + 1;
                            const dayItem = emp.days?.find(item => item.day === dayNum);
                            const statusStr = emp.daysMap?.[String(dayNum)] || emp.daysMap?.[dayNum] || dayItem?.statusCode || '—';
                            const hasSelfie = Boolean(
                              dayItem?.punchInSelfie || 
                              dayItem?.punchOutSelfie ||
                              emp.daysMap?.[String(dayNum) + '_selfieIn'] ||
                              emp.daysMap?.[String(dayNum) + '_selfieOut']
                            );

                            return (
                              <td key={dayNum} className="py-2 px-1 text-center">
                                <MonthlyStatusBadge 
                                  status={statusStr}
                                  hasSelfie={hasSelfie}
                                  onClick={() => {
                                    handleOpenHistorySelfie({
                                      employeeName: emp.employeeName || emp.name,
                                      designation: emp.designation,
                                      employeeCode: emp.employeeCode,
                                      dateString: dayItem?.dateString || `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`,
                                      status: statusStr,
                                      punchInTime: dayItem?.punchIn || dayItem?.punchInTime,
                                      punchInSelfie: dayItem?.punchInSelfie,
                                      punchInLocation: dayItem?.punchInLocation,
                                      punchOutTime: dayItem?.punchOut || dayItem?.punchOutTime,
                                      punchOutSelfie: dayItem?.punchOutSelfie,
                                      punchOutLocation: dayItem?.punchOutLocation,
                                    });
                                  }}
                                />
                              </td>
                            );
                          })}

                          {/* Summary Counters */}
                          <td className="py-3 px-3 text-center font-bold text-emerald-700 bg-emerald-50/30">
                            {presentCount}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-rose-700 bg-rose-50/30">
                            {absentCount}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-[#225091] bg-blue-50/30">
                            {leaveCount}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-purple-700 bg-purple-50/30">
                            {halfDayCount}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-indigo-700 bg-indigo-50/30">
                            {percentage}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

            {/* TAB 3: YEARLY MATRIX (Section 6: /api/v1/society/attendance/yearly-matrix) */}
            {activeTab === 'yearly' && (
              <table ref={tableRef} className="w-full text-xs border-collapse min-w-[1000px] text-center text-sm whitespace-nowrap">
                <thead className="bg-[#225091] text-white text-xs uppercase tracking-wider font-semibold border-b border-[#225091]">
                  <tr>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center w-12">SR.NO.</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center min-w-[200px]">
                      EMPLOYEE
                    </th>
                    {MONTH_SHORT_NAMES.map((mCode, idx) => {
                      const isMonthFiltered = (yearlyMonthFilter && Number(yearlyMonthFilter) === idx + 1) || 
                                              (yearlyMatrixData.selectedMonth === idx + 1);
                      return (
                        <th 
                          key={mCode} 
                          className={`py-3.5 px-2 text-center font-mono font-bold text-[11px] min-w-[68px] ${
                            isMonthFiltered ? 'bg-blue-100/70 text-[#225091]' : ''
                          }`}
                        >
                          {mCode}
                        </th>
                      );
                    })}
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center min-w-[90px]">TOTAL PRESENT</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center min-w-[95px]">AVG ATTENDANCE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {loadingYearlyMatrix ? (
                    Array.from({ length: 5 }).map((_, idx) => (
                      <SkeletonTableRow key={idx} columns={15} />
                    ))
                  ) : yearlyMatrixData.items.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="py-12 text-center text-gray-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <CalendarDays size={32} className="text-gray-300 stroke-[1.5]" />
                          <span className="text-sm font-medium text-gray-500">No yearly attendance records found</span>
                          <span className="text-xs text-gray-400">Try selecting another year or adjusting branch/state filters</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    yearlyMatrixData.items.map((emp, idx) => {
                      const empSrNo = emp.srNo ?? ((yearlyPage - 1) * 10 + idx + 1);
                      const avgPercentageStr = emp.formattedAverageAttendance || 
                        (emp.averageAttendancePercentage !== undefined ? `${emp.averageAttendancePercentage}%` : '—');
                      const numericAvg = typeof emp.averageAttendancePercentage === 'number'
                        ? emp.averageAttendancePercentage
                        : parseFloat(emp.formattedAverageAttendance || '0');

                      let badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      if (numericAvg < 50) {
                        badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                      } else if (numericAvg < 75) {
                        badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                      } else if (numericAvg < 90) {
                        badgeColor = 'bg-blue-50 text-[#225091] border-blue-200';
                      }

                      return (
                        <tr key={emp.id || emp._id || idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-3 text-center font-bold text-gray-500 sticky left-0 bg-white hover:bg-slate-50/90 z-10">
                            {empSrNo}
                          </td>
                          <td className="py-3 px-4 font-bold text-gray-900 sticky left-12 bg-white hover:bg-slate-50/90 transition-colors z-10 shadow-xs">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-blue-50 text-[#225091] font-bold text-[11px] flex items-center justify-center uppercase shrink-0 border border-blue-100">
                                {(emp.employeeName || emp.name || 'E').slice(0, 2)}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <button
                                  type="button"
                                  onClick={() => handleOpenSingleReport(emp)}
                                  className="text-gray-900 font-bold truncate max-w-[140px] text-xs hover:text-[#225091] hover:underline text-left cursor-pointer"
                                  title="Click to view Single Person Attendance Report"
                                >
                                  {emp.employeeName || emp.name}
                                </button>
                                <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-normal">
                                  {emp.employeeCode && (
                                    <span className="font-mono text-gray-500 bg-gray-100 px-1 rounded-xs">{emp.employeeCode}</span>
                                  )}
                                  <span className="truncate max-w-[90px]">{emp.designation || 'Staff'}</span>
                                  {emp.branchName && (
                                    <span className="text-gray-400">• {emp.branchName}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 12 Months Columns */}
                          {MONTH_SHORT_NAMES.map((mCode, mIdx) => {
                            const monthNumber = mIdx + 1;
                            const isMonthFiltered = (yearlyMonthFilter && Number(yearlyMonthFilter) === monthNumber) || 
                                                    (yearlyMatrixData.selectedMonth === monthNumber);
                            
                            // Check monthsMap or months array
                            let displayVal = emp.monthsMap?.[mCode];
                            if (!displayVal && Array.isArray(emp.months)) {
                              const found = emp.months.find(m => m.code === mCode || m.month === monthNumber);
                              if (found) {
                                displayVal = found.formatted || (found.presentDays !== undefined ? `${found.presentDays} Days` : null);
                              }
                            }
                            if (!displayVal) displayVal = '0 Days';

                            const isPresent = displayVal !== '0 Days' && displayVal !== '0' && displayVal !== '0 days';

                            return (
                              <td 
                                key={mCode} 
                                className={`py-3 px-2 text-center text-xs transition-colors ${
                                  isMonthFiltered ? 'bg-blue-50/50 font-bold' : ''
                                }`}
                              >
                                {isPresent ? (
                                  <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold text-[11px] border border-emerald-200/60 shadow-2xs whitespace-nowrap">
                                    {displayVal}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 font-normal text-[11px] whitespace-nowrap">
                                    {displayVal}
                                  </span>
                                )}
                              </td>
                            );
                          })}

                          {/* Total Present Days */}
                          <td className="py-3 px-3 text-center font-extrabold text-slate-800 bg-slate-50/50 whitespace-nowrap">
                            {emp.totalPresentDaysYear !== undefined ? `${emp.totalPresentDaysYear} Days` : '—'}
                          </td>

                          {/* Average Attendance */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${badgeColor}`}>
                              {avgPercentageStr}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

            {/* TAB 4: ATTENDANCE HISTORY LOGS (Endpoint 5: GET /api/v1/employee/attendance/history) */}
            {activeTab === 'history' && (
              <table ref={tableRef} className="w-full text-xs border-collapse min-w-[1050px] text-center text-sm whitespace-nowrap">
                <thead className="bg-[#225091] text-white text-xs uppercase tracking-wider font-semibold border-b border-[#225091]">
                  <tr>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center w-14">SR.NO.</th>
                    <th className="py-3.5 px-4 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">DATE & DAY</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">STATUS</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">PUNCH IN</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">PUNCH OUT</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">WORKING HRS</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center">OVERTIME</th>
                    <th className="py-3.5 px-4 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-left min-w-[220px]">REVERSE GEOCODED LOCATION</th>
                    <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider text-center w-28">PHOTO AUDIT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {loadingHistory ? (
                    Array.from({ length: 5 }).map((_, idx) => (
                      <SkeletonTableRow key={idx} columns={9} />
                    ))
                  ) : historyRecords.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="py-12 text-center text-gray-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <History size={32} className="text-gray-300 stroke-[1.5]" />
                          <span className="text-sm font-medium text-gray-500">No attendance history records found</span>
                          <span className="text-xs text-gray-400">Try adjusting your filters or date selection</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    historyRecords.map((item, idx) => {
                      const srNo = (historyPage - 1) * 20 + idx + 1;
                      const loc = item.location
                        || (item.punchIn?.latitude || item.punchIn?.longitude || item.punchIn?.address ? item.punchIn : item.punchOut)
                        || {};
                      const hasCoords = Boolean(loc.latitude && loc.longitude);
                      const fullAddress = loc.address || [loc.city, loc.state, loc.pincode].filter(Boolean).join(', ');
                      const punchInTime = item.punchInTime || item.punchIn?.timeFormatted || '—';
                      const punchOutTime = item.punchOutTime || item.punchOut?.timeFormatted || '—';
                      const workingHours = item.workingHours || item.workingHoursFormatted || '—';
                      const overtimeHours = item.overtimeHours || item.overtimeHoursFormatted;

                      return (
                        <tr key={item.id || item._id || idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-3 text-center font-bold text-gray-500">{srNo}</td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="font-bold text-gray-900 block">{item.dateString || (item.date ? item.date.slice(0, 10) : '—')}</span>
                            <span className="text-[11px] text-gray-400 font-normal">{item.dayName || ''}</span>
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <AttendanceStatusBadge status={item.status} />
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span className="font-mono font-bold text-gray-800">{punchInTime}</span>
                            {item.isLate && (
                              <span className="block text-[10px] text-amber-600 font-semibold">Late ({item.lateMinutes}m)</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span className="font-mono font-bold text-gray-800">{punchOutTime}</span>
                            {item.isEarlyLeave && (
                              <span className="block text-[10px] text-purple-600 font-semibold">Early ({item.earlyMinutes}m)</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 text-center font-semibold text-gray-700">
                            {workingHours}
                          </td>
                          <td className="py-3.5 px-3 text-center font-semibold text-indigo-700">
                            {overtimeHours && overtimeHours !== '00:00 hrs' ? overtimeHours : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-left">
                            {fullAddress || hasCoords ? (
                              <div className="flex items-start justify-between gap-2 max-w-[320px]">
                                <div className="flex flex-col min-w-0">
                                  <span className="text-gray-800 text-xs font-medium truncate" title={fullAddress}>
                                    {fullAddress || 'GPS Coordinates Captured'}
                                  </span>
                                  {hasCoords && (
                                    <span className="text-[10px] text-gray-400 font-mono">
                                      {Number(loc.latitude).toFixed(4)}°, {Number(loc.longitude).toFixed(4)}°
                                    </span>
                                  )}
                                </div>
                                {hasCoords && (
                                  <button
                                    type="button"
                                    onClick={() => navigate('/geo-tagging', {
                                      state: {
                                        employeeName: item.employeeName || item.user?.fullName || 'Staff Member',
                                        punchLat: loc.latitude,
                                        punchLng: loc.longitude,
                                        punchAddress: fullAddress,
                                        from: '/attendance'
                                      }
                                    })}
                                    className="p-1 rounded-lg hover:bg-blue-50 text-[#225091] shrink-0 cursor-pointer"
                                    title="View on Map"
                                  >
                                    <MapPin size={14} />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>

                          {/* PHOTO AUDIT */}
                          <td className="py-3.5 px-3 text-center">
                            {item.punchIn?.selfieUrl || item.punchInSelfie || item.punchOut?.selfieUrl || item.punchOutSelfie ? (
                              <button
                                type="button"
                                onClick={() => handleOpenHistorySelfie(item)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-[#225091] hover:bg-blue-100 border border-blue-200 text-[11px] font-bold transition-all shadow-2xs cursor-pointer group"
                                title="Inspect punch selfies, GPS coordinates, and punctuality"
                              >
                                <Camera size={12} className="group-hover:scale-110 transition-transform" />
                                <span>Audit ({[item.punchIn?.selfieUrl || item.punchInSelfie, item.punchOut?.selfieUrl || item.punchOutSelfie].filter(Boolean).length})</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-gray-400 italic">No Photo</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </TableWrapper>

          {/* Table Footer with Pagination */}
          {activeTab === 'daily' ? (
            <Pagination
              page={page}
              totalPages={meta.totalPages}
              totalRecords={meta.totalRecords || reportItems.length}
              limit={limit}
              onPageChange={setPage}
              disabled={loadingReportData}
            />
          ) : activeTab === 'monthly' ? (
            <Pagination
              page={monthlyPage}
              totalPages={monthlySheetData.meta.totalPages}
              totalRecords={monthlySheetData.meta.totalRecords || monthlySheetData.items.length}
              limit={10}
              onPageChange={setMonthlyPage}
              disabled={loadingMonthlySheet}
            />
          ) : activeTab === 'yearly' ? (
            <Pagination
              page={yearlyPage}
              totalPages={yearlyMatrixData.meta.totalPages}
              totalRecords={yearlyMatrixData.meta.totalRecords || yearlyMatrixData.items.length}
              limit={10}
              onPageChange={setYearlyPage}
              disabled={loadingYearlyMatrix}
            />
          ) : (
            <Pagination
              page={historyPage}
              totalPages={historyMeta.totalPages}
              totalRecords={historyMeta.totalRecords || historyRecords.length}
              limit={historyMeta.limit || 20}
              onPageChange={setHistoryPage}
              disabled={loadingHistory}
            />
          )}
        </div>
      </div>

      {/* Single Person Attendance Report Modal */}
      <SinglePersonAttendanceModal
        isOpen={isSingleReportModalOpen}
        onClose={() => {
          setIsSingleReportModalOpen(false);
          setSelectedEmployeeForReport(null);
        }}
        employee={selectedEmployeeForReport}
        initialMonth={selectedMonth}
        initialYear={selectedYear}
        onViewOnMap={(mapData) => {
          setIsSingleReportModalOpen(false);
          navigate('/geo-tagging', {
            state: {
              employeeId: mapData.employeeId || selectedEmployeeForReport?.id,
              employeeName: mapData.employeeName || selectedEmployeeForReport?.employeeName,
              punchLat: mapData.punchLat,
              punchLng: mapData.punchLng,
              punchAddress: mapData.punchAddress,
              from: '/attendance-report'
            }
          });
        }}
      />

      {/* Punch Selfie History Audit Modal */}
      <PunchSelfieModal
        isOpen={isHistorySelfieOpen}
        onClose={() => setIsHistorySelfieOpen(false)}
        data={historySelfieAudit}
      />

      {/* Apply Leave Modal */}
      <ApplyLeaveModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        onSuccess={() => {
          fetchTodayStatus();
          fetchMonthlyReport();
          if (activeTab === 'daily') fetchDailyAttendanceReport();
          if (activeTab === 'monthly') fetchMonthlySheet();
          if (activeTab === 'yearly') fetchYearlyMatrix();
        }}
      />
          {/* Live Punch Capture Camera & GPS Modal */}
      <PunchCaptureModal
        isOpen={punchCaptureConfig.isOpen}
        punchType={punchCaptureConfig.punchType}
        onClose={() => setPunchCaptureConfig(prev => ({ ...prev, isOpen: false }))}
        onSuccess={handlePunchCaptureSuccess}
      />
    </div>
  );
};

export default AttendanceReport;
