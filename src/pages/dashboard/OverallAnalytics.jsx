import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, RefreshCw, Calendar, TrendingUp, Building2, 
  Users, Banknote, ShieldCheck, Activity, Briefcase, FileText, Download
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart
} from 'recharts';

import PageHeader from '../../components/common/PageHeader';
import StatsCard from '../../components/common/StatsCard';
import { reportService } from '../../api/reportService';
import useBranchStore from '../../store/branchStore';
import usePermission from '../../hooks/usePermission';

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'];
const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const formatCurrencyTick = (val) => {
  if (typeof val !== 'number') return val;
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
  return `₹${val}`;
};

const OverallAnalytics = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const { branchOptions } = useBranchStore();

  const [loading, setLoading] = useState(true);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [data, setData] = useState(null);

  // Filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [branchId, setBranchId] = useState('ALL');
  const [interval, setInterval] = useState('day');

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params = { startDate, endDate, interval };
      if (branchId !== 'ALL') params.branchId = branchId;

      const res = await reportService.getOverallAnalytics(params);
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      toast.error('Failed to load overall analytics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [startDate, endDate, branchId, interval]);

  const hasData = (arr) => Array.isArray(arr) && arr.length > 0;

  const handlePrint = () => {
    // Trigger window resize event to force Recharts to recalculate chart dimensions before print
    window.dispatchEvent(new Event('resize'));
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const kpis = data?.kpiSummary || {};
  const graphs = data?.graphs || {};
  const dists = graphs?.distributions || {};

  return (
    <div className="flex flex-col gap-6 w-full pb-14 max-w-[1600px] mx-auto print:max-w-none print:w-full print:p-0 print:m-0 print:pb-0">
      {/* Executive Consolidated 2-Page Print CSS Rules */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 7mm 9mm 7mm 9mm;
          }
          html, body, #root, #root > div, div, main, section, article {
            overflow: visible !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            position: static !important;
            float: none !important;
            display: block !important;
            background: #ffffff !important;
            color: #0f172a !important;
            padding: 0 !important;
            margin: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          aside, header, nav, .sidebar-container, .top-progress-bar, .toast-container, .print\\:hidden, button {
            display: none !important;
          }
          .overall-report-print-container {
            width: 100% !important;
            max-width: none !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 0.6rem !important;
          }
          .recharts-responsive-container {
            width: 100% !important;
          }
          .print-chart-main {
            height: 200px !important;
          }
          .print-chart-sub {
            height: 175px !important;
          }
          .print-pie-container {
            height: 115px !important;
          }
          .print-page-1 {
            break-after: page !important;
            page-break-after: always !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 0.75rem !important;
            padding-bottom: 0 !important;
            margin-bottom: 0 !important;
          }
          .print-page-2 {
            break-before: page !important;
            page-break-before: always !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 0.75rem !important;
            padding-top: 0.25rem !important;
          }
          .print-kpi-grid {
            display: grid !important;
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 0.6rem !important;
          }
          .print-2col-grid {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 0.75rem !important;
          }
          .print-4col-grid {
            display: grid !important;
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 0.6rem !important;
          }
          .print-card-padding {
            padding: 0.75rem 0.85rem !important;
            border: 1px solid #cbd5e1 !important;
          }
        }
      `}</style>

      {/* Web Page Header (Hidden during PDF print export) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/reports')}
            className="p-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <ArrowLeft size={20} />
          </button>
          <PageHeader
            title="Overall Analytics Dashboard"
            breadcrumbs={[
              { label: 'Dashboard', to: '/dashboard' },
              { label: 'Reports', to: '/reports' },
              { label: 'Overall Analytics' }
            ]}
          />
        </div>
        <div className="flex items-center gap-2">
          {hasPermission('report.export') && (
            <button 
              onClick={handlePrint}
              disabled={loading}
              className="bg-[#225091] hover:bg-[#193d72] text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Download size={16} />
              Save PDF / Print Snapshot
            </button>
          )}
          <button 
            onClick={fetchAnalytics}
            className="bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm ml-2 cursor-pointer"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Formal Printable Document Header (Appears in PDF Snapshot & Print) */}
      <div className="hidden print:block border-b-2 border-indigo-800 pb-2 mb-1">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Co-operative Bank & Society Management System</h1>
            <h2 className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Executive Overall Analytics & Financial Performance Report</h2>
          </div>
          <div className="text-right text-[11px] text-slate-700 font-semibold leading-tight">
            <div>Report Generated: {new Date().toLocaleString('en-IN')}</div>
            <div>Period: {startDate} to {endDate}</div>
            <div>Branch: {branchId === 'ALL' ? 'All Society Branches' : branchId}</div>
          </div>
        </div>
      </div>

      {/* Dynamic Active Filters Summary Bar */}
      <div className="bg-slate-100 border border-slate-300 rounded-xl px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs print:py-1 print:px-3 print:my-0 print:bg-slate-100">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Active Scope:</span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-900 border border-indigo-300">
            Period: {startDate} to {endDate}
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            Branch: {branchId === 'ALL' ? 'All Branches' : branchId}
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300">
            Interval: {interval.toUpperCase()}
          </span>
        </div>
        <span className="text-slate-600 font-semibold hidden sm:inline print:inline text-[11px]">
          Updated: {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Filters Bar (Web view only) */}
      <div className="bg-white/80 backdrop-blur-md border border-gray-200/60 shadow-sm rounded-xl p-4 flex flex-wrap gap-4 items-end print:hidden">
        <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar size={14} /> Date Range
          </label>
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
            />
            <span className="text-gray-400">to</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
            />
          </div>
        </div>

        {hasPermission('report.view') && (
          <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 size={14} /> Branch
            </label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="ALL">All Branches</option>
              {branchOptions.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1.5 flex-1 min-w-[120px]">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp size={14} /> Interval
          </label>
          <select
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        </div>
      </div>

      {/* Main Report Pages Content */}
      {loading ? (
        <div className="flex justify-center items-center h-64 bg-white/50 backdrop-blur-sm rounded-xl border border-gray-100">
          <RefreshCw className="animate-spin text-indigo-500" size={32} />
        </div>
      ) : (
        <div className="flex flex-col gap-8 overall-report-print-container">
          
          {/* ==================== PAGE 1 OF 2: FINANCIAL SUMMARY & PORTFOLIO TRENDS ==================== */}
          <div className="flex flex-col gap-4 print-page-1">
            <div className="hidden print:block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider text-right border-b border-slate-300 pb-0.5">
              Page 1 of 2 — Executive Financial KPI Summary & Business Trends
            </div>

            {/* KPI Ribbon */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print-kpi-grid">
              <StatsCard 
                color="emerald" icon={Banknote} label="Total Credit Inflow"
                value={kpis.formattedTotalCreditInflow || '₹0'} 
              />
              <StatsCard 
                color="rose" icon={Banknote} label="Total Debit Outflow"
                value={kpis.formattedTotalDebitOutflow || '₹0'} 
              />
              <StatsCard 
                color="indigo" icon={Banknote} label="Net Cash Flow"
                value={kpis.formattedNetCashFlow || '₹0'} 
              />
              <StatsCard 
                color="purple" icon={Briefcase} label="Loans Disbursed"
                value={kpis.formattedTotalLoansDisbursed || '₹0'} 
                sublabel={`${kpis.totalLeads || 0} Total Leads`}
              />
              <StatsCard 
                color="blue" icon={FileText} label="Total Vouchers"
                value={kpis.totalVouchers || 0} 
              />
              <StatsCard 
                color="cyan" icon={Users} label="Staff Attendance"
                value={`${kpis.attendanceRate || 0}%`} 
                sublabel={`${kpis.totalAttendanceLogs || 0} Logs`}
              />
              <StatsCard 
                color="amber" icon={Activity} label="CIBIL Checks"
                value={kpis.totalCibilChecks || 0} 
              />
              <StatsCard 
                color="emerald" icon={Building2} label="Active Merchants"
                value={kpis.totalMerchants || 0} 
              />
            </div>

            {/* 1. Financial Flow Trend Chart */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 print-card-padding flex flex-col gap-2.5 print:shadow-none print:border-slate-300">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2 print:text-sm">
                  <TrendingUp size={18} className="text-indigo-600" />
                  Financial Flow Trend (Credits vs Debits)
                </h3>
                <span className="hidden print:inline-block text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-300">
                  Credits: {kpis.formattedTotalCreditInflow || '₹0'} | Debits: {kpis.formattedTotalDebitOutflow || '₹0'}
                </span>
              </div>
              <div style={{ height: 250, width: '100%' }} className="flex items-center justify-center print-chart-main">
                {hasData(graphs.financialTrend) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={graphs.financialTrend} margin={{ top: 25, right: 20, left: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#334155', fontSize: 11, fontWeight: 600}} dy={5} />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#334155', fontSize: 11, fontWeight: 600}} tickFormatter={formatCurrencyTick} width={65} />
                      <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                      <Legend iconType="circle" wrapperStyle={{paddingTop: '8px', fontSize: '12px', fontWeight: 'bold'}} />
                      <Line yAxisId="left" type="monotone" name="Credits (Inflow)" dataKey="creditAmount" stroke="#059669" strokeWidth={3} dot={{ r: 4, fill: '#059669' }} activeDot={{r: 6}} label={{ fill: '#065f46', fontSize: 10, fontWeight: 700, dy: -14 }} />
                      <Line yAxisId="left" type="monotone" name="Debits (Outflow)" dataKey="debitAmount" stroke="#dc2626" strokeWidth={3} dot={{ r: 4, fill: '#dc2626' }} activeDot={{r: 6}} label={{ fill: '#991b1b', fontSize: 10, fontWeight: 700, dy: 14 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <span className="text-slate-500 font-bold text-xs">No financial trend data available for this period</span>
                )}
              </div>
            </div>

            {/* 2. Loans & Leads Portfolio Trend */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 print-card-padding flex flex-col gap-2.5 print:shadow-none print:border-slate-300">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2 print:text-sm">
                  <Briefcase size={18} className="text-purple-600" />
                  Loans & Leads Portfolio Trend
                </h3>
                <span className="hidden print:inline-block text-[11px] font-bold text-purple-900 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-300">
                  Total Disbursed: {kpis.formattedTotalLoansDisbursed || '₹0'}
                </span>
              </div>
              <div style={{ height: 250, width: '100%' }} className="flex items-center justify-center print-chart-main">
                {hasData(graphs.loansTrend) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={graphs.loansTrend} margin={{ top: 25, right: 20, left: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#334155', fontSize: 11, fontWeight: 600}} dy={5} />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#334155', fontSize: 11, fontWeight: 600}} width={35} />
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#334155', fontSize: 11, fontWeight: 600}} tickFormatter={formatCurrencyTick} width={65} />
                      <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                      <Legend iconType="circle" wrapperStyle={{paddingTop: '8px', fontSize: '12px', fontWeight: 'bold'}} />
                      <Bar yAxisId="left" name="Leads Count" dataKey="leadsCount" fill="#a855f7" radius={[4, 4, 0, 0]} maxBarSize={35} />
                      <Line yAxisId="right" type="monotone" name="Disbursed Amt" dataKey="disbursedAmount" stroke="#6b21a8" strokeWidth={3} dot={{ r: 4, fill: '#6b21a8' }} label={{ fill: '#581c87', fontSize: 10, fontWeight: 700, dy: -14 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <span className="text-slate-500 font-bold text-xs">No loans trend data available</span>
                )}
              </div>
            </div>
          </div>

          {/* ==================== PAGE 2 OF 2: OPERATIONS, RISK & EXECUTIVE AUDIT ==================== */}
          <div className="flex flex-col gap-4 print-page-2">
            <div className="hidden print:block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider text-right border-b border-slate-300 pb-0.5">
              Page 2 of 2 — HR Operations, Credit Risk & Distribution Audit
            </div>

            {/* Operations & Verification 2-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 print-2col-grid">
              
              {/* Staff Attendance */}
              <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-3.5 print-card-padding flex flex-col gap-2 print:shadow-none print:border-slate-300">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Users size={16} className="text-cyan-600" />
                  Staff Attendance & Operations
                </h3>
                <div style={{ height: 210, width: '100%' }} className="flex items-center justify-center print-chart-sub">
                  {hasData(graphs.operationsTrend) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={graphs.operationsTrend}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#334155', fontSize: 10, fontWeight: 600}} dy={5} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#334155', fontSize: 10, fontWeight: 600}} width={30} />
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                        <Legend iconType="circle" wrapperStyle={{paddingTop: '4px', fontSize: '11px', fontWeight: 'bold'}} />
                        <Bar name="Present" dataKey="attendancePresent" stackId="a" fill="#0891b2" />
                        <Bar name="Late" dataKey="attendanceLate" stackId="a" fill="#d97706" />
                        <Bar name="Absent" dataKey="attendanceAbsent" stackId="a" fill="#dc2626" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <span className="text-slate-500 font-bold text-xs">No attendance data available</span>
                  )}
                </div>
              </div>

              {/* CIBIL Credit Risk */}
              <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-3.5 print-card-padding flex flex-col gap-2 print:shadow-none print:border-slate-300">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-amber-600" />
                  CIBIL Credit Risk Trend
                </h3>
                <div style={{ height: 210, width: '100%' }} className="flex items-center justify-center print-chart-sub">
                  {hasData(graphs.verificationTrend) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={graphs.verificationTrend}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#334155', fontSize: 10, fontWeight: 600}} dy={5} />
                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#334155', fontSize: 10, fontWeight: 600}} width={30} />
                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#334155', fontSize: 10, fontWeight: 600}} width={35} />
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                        <Legend iconType="circle" wrapperStyle={{paddingTop: '4px', fontSize: '11px', fontWeight: 'bold'}} />
                        <Line yAxisId="left" type="monotone" name="CIBIL Checks" dataKey="cibilChecks" stroke="#d97706" strokeWidth={3} dot={{ r: 4, fill: '#d97706' }} label={{ fill: '#b45309', fontSize: 9, fontWeight: 700 }} />
                        <Line yAxisId="right" type="monotone" name="Avg Score" dataKey="avgCibilScore" stroke="#7c3aed" strokeWidth={3} dot={{ r: 4, fill: '#7c3aed' }} label={{ fill: '#6d28d9', fontSize: 9, fontWeight: 700 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <span className="text-slate-500 font-bold text-xs">No verification data available</span>
                  )}
                </div>
              </div>
            </div>

            {/* Distributions Grid (4 Columns) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 print-4col-grid">
              
              {/* Voucher Types */}
              <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-3 print-card-padding flex flex-col items-center gap-1 print:border-slate-300">
                <h4 className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">Voucher Breakdown</h4>
                <div style={{ height: 120, width: '100%' }} className="flex items-center justify-center print-pie-container">
                  {hasData(dists.voucherTypes) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={dists.voucherTypes} innerRadius={25} outerRadius={45} paddingAngle={2} dataKey="amount" nameKey="label">
                          {dists.voucherTypes.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '2px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <span className="text-slate-400 text-xs">No data available</span>
                  )}
                </div>
                {hasData(dists.voucherTypes) && (
                  <div className="w-full space-y-1 mt-0.5 pt-1 border-t border-slate-200 text-[10px]">
                    {dists.voucherTypes.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-slate-700">
                        <span className="truncate font-medium">{item.label}</span>
                        <span className="font-extrabold text-slate-900">₹{Number(item.amount || 0).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Receipt Status */}
              <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-3 print-card-padding flex flex-col items-center gap-1 print:border-slate-300">
                <h4 className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">Receipt Status</h4>
                <div style={{ height: 120, width: '100%' }} className="flex items-center justify-center print-pie-container">
                  {hasData(dists.receiptStatus) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={dists.receiptStatus} innerRadius={25} outerRadius={45} paddingAngle={2} dataKey="count" nameKey="status">
                          {dists.receiptStatus.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '2px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <span className="text-slate-400 text-xs">No data available</span>
                  )}
                </div>
                {hasData(dists.receiptStatus) && (
                  <div className="w-full space-y-1 mt-0.5 pt-1 border-t border-slate-200 text-[10px]">
                    {dists.receiptStatus.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-slate-700">
                        <span className="truncate font-medium">{item.status}</span>
                        <span className="font-extrabold text-slate-900">{item.count} Receipts</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Loan Status */}
              <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-3 print-card-padding flex flex-col items-center gap-1 print:border-slate-300">
                <h4 className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">Loan Portfolio Status</h4>
                <div style={{ height: 120, width: '100%' }} className="flex items-center justify-center print-pie-container">
                  {hasData(dists.loanStatus) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={dists.loanStatus} innerRadius={25} outerRadius={45} paddingAngle={2} dataKey="count" nameKey="status">
                          {dists.loanStatus.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '2px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <span className="text-slate-400 text-xs">No data available</span>
                  )}
                </div>
                {hasData(dists.loanStatus) && (
                  <div className="w-full space-y-1 mt-0.5 pt-1 border-t border-slate-200 text-[10px]">
                    {dists.loanStatus.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-slate-700">
                        <span className="truncate font-medium">{item.status}</span>
                        <span className="font-extrabold text-slate-900">{item.count} Loans</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* CIBIL Risk */}
              <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-3 print-card-padding flex flex-col items-center gap-1 print:border-slate-300">
                <h4 className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">CIBIL Risk Tiers</h4>
                <div style={{ height: 120, width: '100%' }} className="flex items-center justify-center print-pie-container">
                  {hasData(dists.cibilRiskTiers) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={dists.cibilRiskTiers} innerRadius={25} outerRadius={45} paddingAngle={2} dataKey="count" nameKey="label">
                          {dists.cibilRiskTiers.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '2px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <span className="text-slate-400 text-xs">No data available</span>
                  )}
                </div>
                {hasData(dists.cibilRiskTiers) && (
                  <div className="w-full space-y-1 mt-0.5 pt-1 border-t border-slate-200 text-[10px]">
                    {dists.cibilRiskTiers.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-slate-700">
                        <span className="truncate font-medium">{item.label}</span>
                        <span className="font-extrabold text-slate-900">{item.count} Checks</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Financial & Operational Executive Data Summary Table */}
            <div className="bg-white border border-slate-300 shadow-sm rounded-xl p-4 print-card-padding flex flex-col gap-2 print:shadow-none print:border-slate-300">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-1">
                <FileText size={15} className="text-indigo-700" />
                Financial & Operational Audit Summary Table
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-900 text-white font-extrabold text-[11px] uppercase tracking-wider">
                      <th className="py-2.5 px-4 border-r border-slate-700">Metric Category</th>
                      <th className="py-2.5 px-4 text-right border-r border-slate-700">Recorded Value</th>
                      <th className="py-2.5 px-4 text-right border-r border-slate-700">Volume / Sublabel</th>
                      <th className="py-2.5 px-4 text-center">Audit Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-[11px] text-slate-800 font-bold">
                    <tr className="bg-emerald-50/50">
                      <td className="py-2.5 px-4 font-bold text-emerald-950 border-r border-slate-200">Total Credit Inflow</td>
                      <td className="py-2.5 px-4 text-right font-extrabold text-slate-900 border-r border-slate-200">{kpis.formattedTotalCreditInflow || '₹0.00'}</td>
                      <td className="py-2.5 px-4 text-right border-r border-slate-200">{kpis.totalVouchers || 0} Vouchers</td>
                      <td className="py-2.5 px-4 text-center"><span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-950 border border-emerald-300">AUDITED</span></td>
                    </tr>
                    <tr className="bg-rose-50/50">
                      <td className="py-2.5 px-4 font-bold text-rose-950 border-r border-slate-200">Total Debit Outflow</td>
                      <td className="py-2.5 px-4 text-right font-extrabold text-slate-900 border-r border-slate-200">{kpis.formattedTotalDebitOutflow || '₹0.00'}</td>
                      <td className="py-2.5 px-4 text-right border-r border-slate-200">{kpis.totalVouchers || 0} Vouchers</td>
                      <td className="py-2.5 px-4 text-center"><span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-950 border border-rose-300">AUDITED</span></td>
                    </tr>
                    <tr className="bg-indigo-50/50">
                      <td className="py-2.5 px-4 font-bold text-indigo-950 border-r border-slate-200">Net Cash Flow Balance</td>
                      <td className="py-2.5 px-4 text-right font-extrabold text-slate-900 border-r border-slate-200">{kpis.formattedNetCashFlow || '₹0.00'}</td>
                      <td className="py-2.5 px-4 text-right border-r border-slate-200">Consolidated Balance</td>
                      <td className="py-2.5 px-4 text-center"><span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-100 text-blue-950 border border-blue-300">VERIFIED</span></td>
                    </tr>
                    <tr className="bg-purple-50/50">
                      <td className="py-2.5 px-4 font-bold text-purple-950 border-r border-slate-200">Loans Portfolio Disbursed</td>
                      <td className="py-2.5 px-4 text-right font-extrabold text-slate-900 border-r border-slate-200">{kpis.formattedTotalLoansDisbursed || '₹0.00'}</td>
                      <td className="py-2.5 px-4 text-right border-r border-slate-200">{kpis.totalLeads || 0} Total Leads</td>
                      <td className="py-2.5 px-4 text-center"><span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-purple-100 text-purple-950 border border-purple-300">ACTIVE</span></td>
                    </tr>
                    <tr className="bg-cyan-50/50">
                      <td className="py-2.5 px-4 font-bold text-cyan-950 border-r border-slate-200">Staff Operations Attendance</td>
                      <td className="py-2.5 px-4 text-right font-extrabold text-slate-900 border-r border-slate-200">{kpis.attendanceRate || 0}% Rate</td>
                      <td className="py-2.5 px-4 text-right border-r border-slate-200">{kpis.totalAttendanceLogs || 0} Staff Logs</td>
                      <td className="py-2.5 px-4 text-center"><span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-cyan-100 text-cyan-950 border border-cyan-300">LOGGED</span></td>
                    </tr>
                    <tr className="bg-amber-50/50">
                      <td className="py-2.5 px-4 font-bold text-amber-950 border-r border-slate-200">CIBIL Risk Assessment</td>
                      <td className="py-2.5 px-4 text-right font-extrabold text-slate-900 border-r border-slate-200">{kpis.totalCibilChecks || 0} Checks</td>
                      <td className="py-2.5 px-4 text-right border-r border-slate-200">Assessment Complete</td>
                      <td className="py-2.5 px-4 text-center"><span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-950 border border-amber-300">PASSED</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Formal Verification & Sign-off Block (Printed Document Audit) */}
            <div className="hidden print:block border-t-2 border-slate-400 pt-3 mt-0.5">
              <h5 className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider mb-4">Executive Verification & Authorization Audit</h5>
              <div className="grid grid-cols-3 gap-6 text-center text-xs">
                <div className="flex flex-col items-center gap-5">
                  <div className="w-36 border-b-2 border-slate-500"></div>
                  <span className="font-extrabold text-slate-900 text-[10px]">Prepared By (Accounts Exec)</span>
                </div>
                <div className="flex flex-col items-center gap-5">
                  <div className="w-36 border-b-2 border-slate-500"></div>
                  <span className="font-extrabold text-slate-900 text-[10px]">Verified By (Auditor)</span>
                </div>
                <div className="flex flex-col items-center gap-5">
                  <div className="w-36 border-b-2 border-slate-500"></div>
                  <span className="font-extrabold text-slate-900 text-[10px]">Branch Manager / Stamp</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
};

export default OverallAnalytics;
