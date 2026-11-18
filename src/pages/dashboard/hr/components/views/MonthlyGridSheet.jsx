import React, { useState } from 'react';
import { CalendarDays, Camera } from 'lucide-react';
import { SkeletonTableRow } from '../../../../../components/common/Skeleton';
import PunchSelfieModal, { resolveSelfieUrl } from '../../../../../components/modals/PunchSelfieModal';

const MonthlyStatusBadge = ({ status, hasSelfie, onClick }) => {
  let badgeContent;
  if (status === 'P' || status === 'PRESENT') {
    badgeContent = <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200">P</span>;
  } else if (status === 'A' || status === 'ABSENT') {
    badgeContent = <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-rose-100 text-rose-800 font-bold text-xs border border-rose-200">A</span>;
  } else if (status === 'HD' || status === 'HALF_DAY') {
    badgeContent = <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-amber-100 text-amber-800 font-bold text-xs border border-amber-200">HD</span>;
  } else if (status === 'L' || status === 'LEAVE') {
    badgeContent = <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-blue-100 text-blue-800 font-bold text-xs border border-blue-200">L</span>;
  } else {
    badgeContent = <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-gray-50 text-gray-400 font-bold text-xs border border-gray-100">-</span>;
  }

  if (hasSelfie) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="relative group/badge inline-block cursor-pointer focus:outline-none"
        title="Punch selfie captured - click to inspect"
      >
        {badgeContent}
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#225091] text-white rounded-full flex items-center justify-center shadow-xs ring-1 ring-white">
          <Camera size={7} />
        </span>
      </button>
    );
  }

  return badgeContent;
};

const MonthlyGridSheet = ({ 
  loading, 
  data, 
  onOpenSingleReport 
}) => {
  const daysInMonth = data?.daysInMonth || 31;
  const items = data?.items || [];

  const [auditModalData, setAuditModalData] = useState(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  const handleOpenDaySelfie = (emp, dayNum, dayObj, statusStr) => {
    const monthFormatted = String(data?.month || new Date().getMonth() + 1).padStart(2, '0');
    const dayFormatted = String(dayNum).padStart(2, '0');
    const fullDate = `${data?.year || new Date().getFullYear()}-${monthFormatted}-${dayFormatted}`;

    setAuditModalData({
      employeeName: emp.employeeName || emp.name,
      designation: emp.designation,
      employeeCode: emp.employeeCode || '',
      date: fullDate,
      status: dayObj?.statusCode || statusStr || 'PRESENT',
      punchIn: dayObj?.punchIn || dayObj?.punchInTime,
      punchInSelfie: dayObj?.punchInSelfie || dayObj?.punchIn?.selfieUrl || dayObj?.selfieIn,
      punchInLocation: dayObj?.punchInLocation || dayObj?.punchIn?.location,
      punchOut: dayObj?.punchOut || dayObj?.punchOutTime,
      punchOutSelfie: dayObj?.punchOutSelfie || dayObj?.punchOut?.selfieUrl || dayObj?.selfieOut,
      punchOutLocation: dayObj?.punchOutLocation || dayObj?.punchOut?.location,
    });
    setIsAuditModalOpen(true);
  };

  return (
    <>
      <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-100">
        <table className="w-full text-xs border-collapse min-w-[1100px] text-center text-sm whitespace-nowrap">
          <thead className="bg-[#225091] text-white text-xs uppercase tracking-wider font-semibold border-b border-[#225091]">
            <tr>
              <th className="py-3.5 px-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-white/20 text-center min-w-[180px] sticky left-0 bg-[#225091] z-20">
                EMPLOYEE
              </th>
              {Array.from({ length: daysInMonth }, (_, i) => (
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
            {loading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <SkeletonTableRow key={idx} columns={daysInMonth + 6} />
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={daysInMonth + 6} className="py-12 text-center text-gray-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <CalendarDays size={32} className="text-gray-300 stroke-[1.5]" />
                    <span className="text-sm font-medium text-gray-500">No monthly attendance records found</span>
                    <span className="text-xs text-gray-400">Try selecting another month or adjusting your branch/state filters</span>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((emp, idx) => {
                const summary = emp.summary || {};
                const presentCount = summary.presentDays ?? 0;
                const absentCount = summary.absentDays ?? 0;
                const leaveCount = summary.leaveDays ?? 0;
                const halfDayCount = summary.halfDays ?? 0;
                const percentage = summary.attendancePercentage !== undefined 
                  ? `${summary.attendancePercentage}%` 
                  : (daysInMonth > 0 ? `${Math.round((presentCount / daysInMonth) * 100)}%` : '—');

                return (
                  <tr key={emp.id || emp._id || idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-gray-900 sticky left-0 bg-white hover:bg-slate-50/90 transition-colors z-10 shadow-xs border-r border-gray-100">
                      <div className="flex flex-col text-left">
                        <button
                          type="button"
                          onClick={() => onOpenSingleReport(emp)}
                          className="line-clamp-1 text-gray-900 font-bold hover:text-[#225091] hover:underline text-left cursor-pointer"
                          title="Click to view Single Person Attendance Report"
                        >
                          {emp.employeeName || emp.name}
                        </button>
                        <span className="text-[10px] text-gray-400 font-normal">{emp.employeeCode || emp.designation || 'Staff'}</span>
                      </div>
                    </td>

                    {Array.from({ length: daysInMonth }, (_, d) => {
                      const dayNum = d + 1;
                      const dayObj = emp.days?.find(item => item.day === dayNum);
                      const statusStr = emp.daysMap?.[String(dayNum)] || emp.daysMap?.[dayNum] || dayObj?.statusCode || '—';
                      const hasSelfie = Boolean(dayObj?.punchInSelfie || dayObj?.punchOutSelfie);

                      return (
                        <td key={dayNum} className="py-2 px-1 text-center border-r border-gray-100/50">
                          <MonthlyStatusBadge 
                            status={statusStr} 
                            hasSelfie={hasSelfie}
                            onClick={() => handleOpenDaySelfie(emp, dayNum, dayObj, statusStr)}
                          />
                        </td>
                      );
                    })}

                    <td className="py-3 px-3 text-center font-bold text-emerald-700 bg-emerald-50/30 border-r border-white">
                      {presentCount}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-rose-700 bg-rose-50/30 border-r border-white">
                      {absentCount}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-[#225091] bg-blue-50/30 border-r border-white">
                      {leaveCount}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-purple-700 bg-purple-50/30 border-r border-white">
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
      </div>

      {/* Central Selfie Audit Lightbox */}
      <PunchSelfieModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        data={auditModalData}
      />
    </>
  );
};

export default MonthlyGridSheet;
