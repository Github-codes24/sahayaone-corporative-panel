import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, RefreshCw, Calendar, Building2, 
  Download, BarChart2, List, Search, Filter
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

import PageHeader from '../../components/common/PageHeader';
import StatsCard from '../../components/common/StatsCard';
import Pagination from '../../components/common/Pagination';
import { reportService } from '../../api/reportService';
import useBranchStore from '../../store/branchStore';
import usePermission from '../../hooks/usePermission';
import { DEFAULT_CATALOG } from './ReportsHub';

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'];

const ReportViewer = () => {
  const { reportType } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const { branchOptions } = useBranchStore();

  const [viewMode, setViewMode] = useState('analytics'); // 'analytics' or 'data'
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [tableData, setTableData] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Filter States
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [branchId, setBranchId] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [interval, setInterval] = useState('day');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const reportMetadata = useMemo(() => {
    return DEFAULT_CATALOG?.find(r => r.id === reportType) || { title: reportType };
  }, [reportType]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const params = { startDate, endDate, search, page, limit };
      if (branchId !== 'ALL') params.branchId = branchId;
      if (status !== 'ALL') params.status = status;
      if (viewMode === 'analytics') params.interval = interval;

      if (viewMode === 'data') {
        const res = await reportService.getReportData(reportType, params);
        if (res.success) setTableData(res.data);
      } else {
        const res = await reportService.getReportAnalytics(reportType, params);
        if (res.success) setGraphData(res.data);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load report data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [reportType, startDate, endDate, branchId, status, search, page, limit, interval, viewMode]);

  const handleExport = async (format) => {
    if (format === 'csv') setExportingCsv(true);
    else setExportingPdf(true);
    
    try {
      const params = { startDate, endDate, search };
      if (branchId !== 'ALL') params.branchId = branchId;
      if (status !== 'ALL') params.status = status;
      await reportService.exportReport(reportType, format, params);
      toast.success(`${format.toUpperCase()} downloaded successfully`);
    } catch (err) {
      toast.error(`Failed to export ${format.toUpperCase()}`);
    } finally {
      if (format === 'csv') setExportingCsv(false);
      else setExportingPdf(false);
    }
  };

  const hasData = (arr) => Array.isArray(arr) && arr.length > 0;

  const renderTableCellValue = (key, value) => {
    if (value === null || value === undefined) return <span className="text-gray-300">-</span>;

    // Status styling
    if (key.toLowerCase().includes('status')) {
      const valStr = String(value).toUpperCase();
      let colorClass = 'bg-gray-100 text-gray-700 border-gray-200';
      if (['APPROVED', 'SUCCESS', 'DISBURSED', 'ACTIVE', 'PRESENT'].includes(valStr)) {
        colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      } else if (['PENDING', 'SUBMITTED', 'UNDER_VERIFICATION', 'LATE'].includes(valStr)) {
        colorClass = 'bg-amber-50 text-amber-700 border-amber-200';
      } else if (['REJECTED', 'FAILED', 'ABSENT', 'CANCELLED'].includes(valStr)) {
        colorClass = 'bg-rose-50 text-rose-700 border-rose-200';
      }
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${colorClass}`}>
          {valStr}
        </span>
      );
    }

    // Currency styling
    if (key.toLowerCase().includes('amount') || key.toLowerCase().includes('total') || key.toLowerCase().includes('balance')) {
      if (typeof value === 'number') {
        return <span className="font-semibold text-gray-900">₹{value.toLocaleString('en-IN')}</span>;
      }
    }

    return String(value);
  };

  // Render Analytics View
  const renderAnalytics = () => {
    if (!graphData) return null;
    const { kpiSummary = {}, timeline = [], distributions = {} } = graphData;

    return (
      <div className="flex flex-col gap-6">
        {/* KPI Ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard color="indigo" label="Total Amount" value={kpiSummary.formattedTotalAmount || (kpiSummary.totalAmount !== undefined ? `₹${kpiSummary.totalAmount.toLocaleString('en-IN')}` : '₹0')} />
          <StatsCard color="emerald" label="Total Count" value={kpiSummary.totalCount || '0'} />
          {kpiSummary.formattedApprovedAmount && (
            <StatsCard color="blue" label="Approved Amount" value={kpiSummary.formattedApprovedAmount} />
          )}
          {kpiSummary.formattedPendingAmount && (
            <StatsCard color="amber" label="Pending Amount" value={kpiSummary.formattedPendingAmount} />
          )}
        </div>

        {/* Timeline Chart */}
        <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-5 flex flex-col gap-4">
          <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <BarChart2 size={18} className="text-indigo-500" />
            Timeline Trend
          </h3>
          <div style={{ height: 320, width: '100%' }} className="flex items-center justify-center">
            {hasData(timeline) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} dy={10} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} width={60} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} width={40} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                  <Legend iconType="circle" wrapperStyle={{paddingTop: '10px'}} />
                  <Bar yAxisId="left" name="Amount" dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  <Bar yAxisId="right" name="Count" dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-gray-400">No timeline data available for this period</span>
            )}
          </div>
        </div>

        {/* Distributions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(distributions).map(([key, arr]) => (
            <div key={key} className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 flex flex-col items-center gap-2">
              <h4 className="text-sm font-bold text-gray-700 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</h4>
              <div style={{ height: 220, width: '100%' }} className="flex items-center justify-center">
                {hasData(arr) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={arr} innerRadius={50} outerRadius={80} paddingAngle={2} dataKey={arr[0]?.amount !== undefined ? "amount" : "count"} nameKey={Object.keys(arr[0] || {}).find(k => k.toLowerCase().includes('name') || k === 'status' || k === 'glHead') || "name"}>
                        {arr.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <span className="text-gray-400 text-sm">No data available</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render Table View
  const renderData = () => {
    if (!tableData) return null;
    const { items = [], pagination = {} } = tableData;

    // Dynamically generate columns from the first item
    const cols = items.length > 0 ? Object.keys(items[0]).filter(k => k !== 'id' && typeof items[0][k] !== 'object') : [];

    return (
      <div className="bg-white border border-gray-100 shadow-sm rounded-xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {cols.map(col => (
                  <th key={col} className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {col.replace(/([A-Z])/g, ' $1').trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? items.map((row, i) => (
                <tr key={row.id || i} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors">
                  {cols.map(col => (
                    <td key={col} className="py-3 px-4 text-sm text-gray-700 whitespace-nowrap">
                      {renderTableCellValue(col, row[col])}
                    </td>
                  ))}
                </tr>
              )) : (
                <tr>
                  <td colSpan={cols.length || 1} className="py-8 text-center text-gray-400 text-sm">
                    No records found for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <Pagination 
            currentPage={pagination.page || 1}
            totalPages={pagination.totalPages || 1}
            onPageChange={setPage}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-14 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/reports')}
            className="p-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <PageHeader
            title={reportMetadata.title}
            breadcrumbs={[
              { label: 'Dashboard', to: '/dashboard' },
              { label: 'Reports', to: '/reports' },
              { label: reportMetadata.title }
            ]}
          />
        </div>
        
        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Toggle */}
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('analytics')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-colors ${viewMode === 'analytics' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <BarChart2 size={16} /> Analytics
            </button>
            <button
              onClick={() => setViewMode('data')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-colors ${viewMode === 'data' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <List size={16} /> Data List
            </button>
          </div>

          {hasPermission('report.export') && (
            <div className="flex items-center gap-2 ml-2">
              <button 
                onClick={() => handleExport('csv')}
                disabled={exportingCsv || loading}
                className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
              >
                <Download size={14} className={exportingCsv ? 'animate-bounce' : ''} /> CSV
              </button>
              <button 
                onClick={() => handleExport('pdf')}
                disabled={exportingPdf || loading}
                className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
              >
                <Download size={14} className={exportingPdf ? 'animate-bounce' : ''} /> PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Unified Filters Bar */}
      <div className="bg-white/80 backdrop-blur-md border border-gray-200/60 shadow-sm rounded-xl p-4 flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1.5 flex-1 min-w-[220px]">
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

        <div className="flex flex-col gap-1.5 min-w-[140px]">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <Filter size={14} /> Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="APPROVED">Approved / Success</option>
            <option value="PENDING">Pending / Verification</option>
            <option value="REJECTED">Rejected / Failed</option>
          </select>
        </div>

        {viewMode === 'data' && (
          <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <Search size={14} /> Search
            </label>
            <input 
              type="text" 
              placeholder="Search records..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
            />
          </div>
        )}

        {viewMode === 'analytics' && (
          <div className="flex flex-col gap-1.5 min-w-[120px]">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <Filter size={14} /> Interval
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
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex justify-center items-center h-64 bg-white/50 backdrop-blur-sm rounded-xl border border-gray-100">
          <RefreshCw className="animate-spin text-indigo-500" size={32} />
        </div>
      ) : (
        viewMode === 'analytics' ? renderAnalytics() : renderData()
      )}
    </div>
  );
};

export default ReportViewer;
