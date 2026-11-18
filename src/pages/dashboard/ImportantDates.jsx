import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  ChevronRight, 
  Search, 
  SlidersHorizontal, 
  X, 
  Cake, 
  Heart, 
  Briefcase, 
  Loader2,
  Calendar,
  RefreshCw,
  Gift,
  Building2,
  MapPin,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { workReportService } from '../../api/workReportService';
import { branchService } from '../../api/branchService';
import PageHeader from '../../components/common/PageHeader';
import Pagination from '../../components/common/Pagination';
import { roleService } from '../../api/roleService';
import useBranchStore from '../../store/branchStore';
import useLocations from '../../hooks/useLocations';

const AVAILABLE_MONTHS = [
  { label: 'All Months', value: '' },
  { label: 'January', value: 1 },
  { label: 'February', value: 2 },
  { label: 'March', value: 3 },
  { label: 'April', value: 4 },
  { label: 'May', value: 5 },
  { label: 'June', value: 6 },
  { label: 'July', value: 7 },
  { label: 'August', value: 8 },
  { label: 'September', value: 9 },
  { label: 'October', value: 10 },
  { label: 'November', value: 11 },
  { label: 'December', value: 12 },
];

const AVAILABLE_YEARS = [2026, 2025, 2024, 2027];

const CELEBRATION_TYPES = [
  { label: 'All Celebrations', value: '' },
  { label: 'Birthday', value: 'birthday' },
  { label: 'Marriage Anniversary', value: 'marriage' },
  { label: 'Work Anniversary', value: 'work' },
];

const ImportantDates = () => {

  // Data States
  const [datesList, setDatesList] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Primary Filter States
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const globalBranchId = useBranchStore(state => state.globalBranchId);
  
  const [appliedFilters, setAppliedFilters] = useState({
    celebrationTypes: '',
    date: '',
    designation: '',
    state: '',
    city: '',
    branchId: '',
  });

  const { states: statesList, availableCities } = useLocations(appliedFilters.state);

  // Dropdown Lists
  const [branches, setBranches] = useState([]);
  const [roles, setRoles] = useState([]);

  // Fetch Dropdown options (Branches & Roles)
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [branchRes, roleRes] = await Promise.allSettled([
          branchService.list({ limit: 100 }),
          roleService.list({ limit: 100 }),
        ]);

        if (branchRes.status === 'fulfilled' && branchRes.value) {
          const res = branchRes.value;
          const raw = res.data;
          const list = Array.isArray(res)
            ? res
            : Array.isArray(raw)
            ? raw
            : (raw?.branches || raw?.items || raw?.data || []);
          setBranches(Array.isArray(list) ? list : []);
        }
        if (roleRes.status === 'fulfilled' && roleRes.value) {
          const res = roleRes.value;
          const raw = res.data;
          const list = Array.isArray(res)
            ? res
            : Array.isArray(raw)
            ? raw
            : (raw?.roles || raw?.items || raw?.data || []);
          setRoles(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        console.error('Failed to load filter dropdowns:', err);
        setBranches([]);
        setRoles([]);
      }
    };

    fetchOptions();
  }, []);

  // Fetch Important Dates Feed
  // GET /api/v1/society/employees/hr/important-dates
  // Query: month, year, celebrationTypes, date, designation, state, branchId
  const fetchImportantDates = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedMonth) params.month = selectedMonth;
      if (selectedYear) params.year = selectedYear;
      if (appliedFilters.celebrationTypes) params.celebrationTypes = appliedFilters.celebrationTypes;
      if (appliedFilters.date) params.date = appliedFilters.date;
      if (appliedFilters.designation) params.designation = appliedFilters.designation;
      if (appliedFilters.state) params.state = appliedFilters.state;
      if (appliedFilters.city) params.city = appliedFilters.city;
      if (appliedFilters.branchId) params.branchId = appliedFilters.branchId;
      else if (globalBranchId) params.branchId = globalBranchId;

      const response = await workReportService.getImportantDates(params);

      if (response && (response.success || Array.isArray(response.data))) {
        const list = Array.isArray(response.data) ? response.data : (response.data?.dates || []);
        setDatesList(list);
      } else {
        setDatesList([]);
      }
    } catch (err) {
      console.error('Failed to fetch important dates feed:', err);
      setDatesList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImportantDates();
  }, [selectedMonth, selectedYear, appliedFilters, globalBranchId]);

  // Filter list client-side for quick search
  const filteredList = useMemo(() => {
    if (!search.trim()) return datesList;
    const query = search.toLowerCase().trim();

    return datesList.filter((item) => {
      const name = (item.employeeName || item.name || item.fullName || '').toLowerCase();
      const branch = (item.branch || item.branchName || '').toLowerCase();
      const desig = (item.designation || item.type || item.role || '').toLowerCase();
      const state = (item.state || '').toLowerCase();
      const city = (item.city || '').toLowerCase();
      const celebration = (item.celebration || item.event || item.typeOfEvent || '').toLowerCase();

      return (
        name.includes(query) ||
        branch.includes(query) ||
        desig.includes(query) ||
        state.includes(query) ||
        city.includes(query) ||
        celebration.includes(query)
      );
    });
  }, [datesList, search]);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const totalPages = Math.ceil(filteredList.length / limit) || 1;
  const paginatedList = filteredList.slice((page - 1) * limit, page * limit);

  // Reset Filters
  const handleResetFilter = () => {
    setAppliedFilters({
      celebrationTypes: '',
      date: '',
      designation: '',
      state: '',
      city: '',
      branchId: '',
    });
  };

  const hasActiveFilters = Boolean(
    appliedFilters.celebrationTypes || 
    appliedFilters.date || 
    appliedFilters.designation || 
    appliedFilters.state || 
    appliedFilters.city || 
    appliedFilters.branchId
  );

  // Celebration badge styling helper
  const renderCelebrationBadge = (celebrationText) => {
    const text = celebrationText || 'Celebration Event';
    const lower = text.toLowerCase();

    if (lower.includes('birthday') || lower.includes('birth')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-pink-50 text-pink-700 border border-pink-200 rounded-full text-[12px] font-bold shadow-2xs">
          <Cake size={13} className="text-pink-500" />
          {text}
        </span>
      );
    }

    if (lower.includes('marriage') || lower.includes('wedding')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-[12px] font-bold shadow-2xs">
          <Heart size={13} className="text-rose-500" />
          {text}
        </span>
      );
    }

    if (lower.includes('work') || lower.includes('service') || lower.includes('tenure') || lower.includes('anniversary')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[12px] font-bold shadow-2xs">
          <Briefcase size={13} className="text-blue-500" />
          {text}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-[12px] font-bold shadow-2xs">
        <Sparkles size={13} className="text-purple-500" />
        {text}
      </span>
    );
  };

  // Helper day/date formatting
  const formatDayDisplay = (row) => {
    if (row.day !== undefined && row.day !== null && row.day !== '') {
      const dayNum = Number(row.day);
      const monthName = selectedMonth ? AVAILABLE_MONTHS.find(m => m.value === selectedMonth)?.label : '';
      return (
        <div className="flex items-center gap-1.5 font-semibold text-gray-800">
          <Calendar size={13} className="text-[#225091]" />
          <span>{dayNum}{dayNum === 1 ? 'st' : dayNum === 2 ? 'nd' : dayNum === 3 ? 'rd' : 'th'} {monthName}</span>
        </div>
      );
    }
    if (row.date || row.eventDate) {
      const dStr = row.date || row.eventDate;
      return (
        <div className="flex items-center gap-1.5 font-semibold text-gray-800">
          <Calendar size={13} className="text-[#225091]" />
          <span>{dStr}</span>
        </div>
      );
    }
    return <span className="text-gray-400">—</span>;
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10 relative">
      <PageHeader
        title="Important Dates"
        breadcrumbs={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "HR Management" },
          { label: "Important Dates" }
        ]}
      >
        {/* Celebration Count Chip */}
        <div className="flex items-center gap-2 bg-pink-50 border border-pink-200 px-4 py-2 rounded-xl self-start sm:self-center shadow-2xs">
          <Gift className="text-pink-600" size={18} />
          <span className="text-xs font-bold text-pink-800">
            {filteredList.length} Upcoming Celebrations
          </span>
        </div>
      </PageHeader>

      {/* Main Content Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        
        {/* Toolbar */}
        <div className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-100">
          
          {/* Left Actions: Search, Filter, Refresh */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-[300px]">
              <input 
                type="text" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employee, branch, event..." 
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 text-[14px] focus:outline-none focus:border-[#225091] bg-gray-50/50"
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchImportantDates}
              disabled={loading}
              className="w-11 h-11 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors shadow-sm shrink-0 bg-white"
              title="Refresh Dates"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin text-[#225091]' : ''} />
            </button>
          </div>
          
          {/* Right Selectors: Month & Year */}
          <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
            {/* Month Selector */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value ? Number(e.target.value) : '')}
              className="px-4 py-2.5 rounded-lg border border-gray-200 text-[14px] text-gray-700 font-semibold focus:outline-none focus:border-[#225091] bg-white shadow-2xs"
            >
              {AVAILABLE_MONTHS.map(m => (
                <option key={m.label} value={m.value}>{m.label}</option>
              ))}
            </select>

            {/* Year Selector */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-4 py-2.5 rounded-lg border border-gray-200 text-[14px] text-gray-700 font-semibold focus:outline-none focus:border-[#225091] bg-white shadow-2xs"
            >
              {AVAILABLE_YEARS.map(yr => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Bottom Inline Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 px-6 py-4 border-b border-gray-100 bg-gray-50/30">
          {/* Celebration Type */}
          <div className="relative">
            <select 
              value={appliedFilters.celebrationTypes}
              onChange={(e) => setAppliedFilters(prev => ({ ...prev, celebrationTypes: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#225091] bg-white appearance-none cursor-pointer"
            >
              {CELEBRATION_TYPES.map((type) => (
                <option key={type.label} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          {/* State / UT */}
          <div className="relative">
            <select 
              value={appliedFilters.state}
              onChange={(e) => setAppliedFilters(prev => ({ ...prev, state: e.target.value, city: '' }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#225091] bg-white appearance-none cursor-pointer"
            >
              <option value="">All States</option>
              {statesList.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* City */}
          <div className="relative">
            <select 
              value={appliedFilters.city || ''}
              onChange={(e) => setAppliedFilters(prev => ({ ...prev, city: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#225091] bg-white appearance-none cursor-pointer"
            >
              <option value="">All Cities</option>
              {availableCities.map((ct) => (
                <option key={ct} value={ct}>{ct}</option>
              ))}
            </select>
          </div>

          {/* Branch */}
          <div className="relative">
            <select 
              value={appliedFilters.branchId}
              onChange={(e) => setAppliedFilters(prev => ({ ...prev, branchId: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#225091] bg-white appearance-none cursor-pointer"
            >
              <option value="">All Branches</option>
              {Array.isArray(branches) && branches.map((b) => (
                <option key={b.id || b._id} value={b.id || b._id}>
                  {b.branchName || b.name || `Branch #${b.id || b._id}`}
                </option>
              ))}
            </select>
          </div>

          {/* Designation */}
          <div className="relative">
            <select 
              value={appliedFilters.designation}
              onChange={(e) => setAppliedFilters(prev => ({ ...prev, designation: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#225091] bg-white appearance-none cursor-pointer"
            >
              <option value="">All Designations</option>
              {Array.isArray(roles) && roles.map((r) => (
                <option key={r.id || r._id || r.name} value={r.name || r.roleName}>
                  {r.name || r.roleName}
                </option>
              ))}
            </select>
          </div>

          {/* Specific Date & Reset Button */}
          <div className="relative flex items-center gap-2">
            <input 
              type="date"
              value={appliedFilters.date}
              onChange={(e) => setAppliedFilters(prev => ({ ...prev, date: e.target.value }))}
              className="flex-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#225091] bg-white cursor-pointer min-w-[120px]"
            />
            {hasActiveFilters && (
              <button
                onClick={handleResetFilter}
                className="inline-flex items-center justify-center h-[38px] w-[38px] text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors border border-gray-200 hover:border-rose-200 shrink-0 shadow-xs bg-white"
                title="Reset Filters"
              >
                <RotateCcw size={16} />
              </button>
            )}
          </div>
        </div>
        {/* Table */}
        <div className="overflow-x-auto min-h-[300px] relative">
          <table className="w-full min-w-[900px] text-center text-sm whitespace-nowrap">
            <thead className="bg-[#225091] text-white text-xs uppercase tracking-wider font-semibold border-b border-[#225091]">
              <tr>
                <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center text-left w-20">Sr.No.</th>
                <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center text-left">Employee Name</th>
                <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center text-left">Designation</th>
                <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center text-left">State / UT</th>
                <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center text-left">Branch</th>
                <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center text-left">Day / Date</th>
                <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center text-left">Celebration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-16 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="animate-spin text-[#225091]" size={24} />
                      <span className="text-sm font-medium">Loading important dates feed...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-16 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Gift className="text-gray-300 w-10 h-10 mb-1" />
                      <span className="text-sm font-semibold text-gray-800">No Celebrations Found</span>
                      <span className="text-xs text-gray-400">No birthdays or anniversaries scheduled for this period</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedList.map((row, index) => {
                  const empName = row.employeeName || row.name || row.fullName || '—';
                  const initials = empName !== '—'
                    ? empName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                    : 'E';
                  const srNo = (page - 1) * limit + (index + 1);
                  const desig = row.designation || row.type || row.role || '—';
                  const state = row.state || '—';
                  const branch = row.branch || row.branchName || '—';
                  const celebration = row.celebration || row.event || row.typeOfEvent || 'Celebration';

                  return (
                    <tr 
                      key={row.id || row._id || index} 
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3.5 px-5 text-[13px] text-gray-500 font-medium">{srNo}</td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-50 text-[#225091] border border-blue-100 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                            {initials}
                          </div>
                          <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">{empName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-xs text-gray-600 font-medium">{desig}</td>
                      <td className="py-3.5 px-5 text-xs text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={12} className="text-gray-400" />
                          <span>{state}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-xs text-gray-600 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Building2 size={12} className="text-gray-400" />
                          <span>{branch}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-xs text-gray-700 font-medium whitespace-nowrap">
                        {formatDayDisplay(row)}
                      </td>
                      <td className="py-3.5 px-5">
                        {renderCelebrationBadge(celebration)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          page={page}
          totalPages={totalPages}
          totalRecords={filteredList.length}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />

      </div>



    </div>
  );
};

export default ImportantDates;
