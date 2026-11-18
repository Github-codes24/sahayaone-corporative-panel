import React, { useState, useEffect } from 'react';
import { TrendingUp, RefreshCw, Calendar as CalendarIcon } from 'lucide-react';
import { attendanceService } from '../../../../../api/attendanceService';
import { toast } from 'react-toastify';

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' }
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

const StatCard = ({ title, value, unit, loading }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col items-center justify-center min-w-[120px]">
    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">{title}</span>
    {loading ? (
      <div className="h-8 w-16 bg-gray-100 animate-pulse rounded mt-1"></div>
    ) : (
      <div className="flex items-baseline gap-1 text-[#0f284d]">
        <span className="text-2xl font-black">{value}</span>
        {unit && <span className="text-sm font-bold text-gray-600">{unit}</span>}
      </div>
    )}
  </div>
);

const AttendanceStatsCards = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  
  // Filters
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [date, setDate] = useState('');

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Use attendanceService.getMonthlySummaryCards matching the API
      const res = await attendanceService.getMonthlyReport({ 
        month, 
        year, 
        ...(date ? { date } : {}) 
      });
      
      if (res && res.data) {
        setStats(res.data.cards || res.data);
      }
    } catch (err) {
      console.error('Failed to fetch attendance stats:', err);
      toast.error('Failed to load attendance summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [month, year, date]);

  const monthName = MONTHS.find(m => m.value === month)?.label;
  const isDaily = !!date;
  const title = isDaily 
    ? `Daily Attendance Summary (${date})` 
    : `Monthly Attendance Summary (${monthName} ${year})`;

  return (
    <div className="mb-8">
      {/* Header and Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
        <h2 className="text-[#0f284d] font-bold flex items-center gap-2 text-sm">
          <TrendingUp size={18} className="text-[#225091]" />
          {title}
        </h2>
        
        <div className="flex items-center gap-2">
          {/* Date Filter */}
          <div className="flex items-center bg-white border border-gray-200 rounded-lg px-2 py-1 shadow-sm">
            <CalendarIcon size={14} className="text-gray-400 mr-2" />
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-xs focus:outline-none bg-transparent cursor-pointer text-gray-700"
            />
          </div>
          
          <span className="text-gray-300 mx-1">|</span>

          {/* Month Filter */}
          <select 
            value={month} 
            onChange={(e) => setMonth(Number(e.target.value))}
            className="text-xs bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm focus:outline-none focus:border-[#225091] cursor-pointer"
          >
            {MONTHS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          {/* Year Filter */}
          <select 
            value={year} 
            onChange={(e) => setYear(Number(e.target.value))}
            className="text-xs bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm focus:outline-none focus:border-[#225091] cursor-pointer"
          >
            {YEARS.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <button 
            onClick={fetchStats}
            className="p-1.5 rounded-lg text-gray-400 hover:text-[#225091] hover:bg-blue-50 transition-colors ml-1 cursor-pointer"
            title="Refresh Stats"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <StatCard title="PRESENT" value={stats?.present || 0} loading={loading} />
        <StatCard title="ABSENT" value={stats?.absent || 0} loading={loading} />
        <StatCard title="HALF DAY" value={stats?.halfDay || 0} loading={loading} />
        <StatCard title="LEAVE" value={stats?.leave || 0} loading={loading} />
        <StatCard title="LATE PRESENT" value={stats?.latePresent || 0} loading={loading} />
        <StatCard title="EARLY LEAVE" value={stats?.earlyLeave || 0} loading={loading} />
        <StatCard title="LATE FINE" value={`₹${stats?.lateFine || 0}`} loading={loading} />
        <StatCard 
          title="OVERTIME" 
          value={(stats?.overtime || "00:00").split(' ')[0]} 
          unit="hrs" 
          loading={loading} 
        />
      </div>
    </div>
  );
};

export default AttendanceStatsCards;
