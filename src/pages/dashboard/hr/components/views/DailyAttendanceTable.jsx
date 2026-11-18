import React, { useState } from 'react';
import { 
  UserCheck, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  LogIn, 
  LogOut, 
  FileText, 
  CalendarDays, 
  Camera, 
  CameraOff,
  Maximize2 
} from 'lucide-react';
import { formatPunchTime } from '../../../../../utils/formatUtils';
import PunchSelfieModal, { resolveSelfieUrl } from '../../../../../components/modals/PunchSelfieModal';

const DailyAttendanceTable = ({ 
  loading, 
  items = [], 
  onOpenSingleReport 
}) => {
  const [auditModalData, setAuditModalData] = useState(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  const handleOpenSelfieAudit = (emp) => {
    setAuditModalData({
      employeeName: emp.name || emp.employeeName,
      designation: emp.designation,
      employeeCode: emp.employeeCode || emp.empCode || '',
      date: emp.date || 'Today',
      status: emp.status || 'PRESENT',
      punchIn: emp.punchIn,
      punchInSelfie: emp.punchInSelfie || emp.punchIn?.selfieUrl || emp.punchIn?.selfie,
      punchInLocation: emp.punchInLocation,
      punchOut: emp.punchOut,
      punchOutSelfie: emp.punchOutSelfie || emp.punchOut?.selfieUrl || emp.punchOut?.selfie,
      punchOutLocation: emp.punchOutLocation,
    });
    setIsAuditModalOpen(true);
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 rounded-tl-2xl">EMPLOYEE</th>
                <th className="px-6 py-4">PUNCH IN</th>
                <th className="px-6 py-4">PUNCH OUT</th>
                <th className="px-6 py-4">DURATION</th>
                <th className="px-6 py-4 text-center">PHOTO AUDIT</th>
                <th className="px-6 py-4 text-center rounded-tr-2xl">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx}>
                    <td colSpan="6" className="px-6 py-4">
                      <div className="animate-pulse flex space-x-4">
                        <div className="flex-1 space-y-4 py-1">
                          <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                    <CalendarDays size={32} className="mx-auto text-slate-300 mb-2" />
                    <p>No attendance records found for this date.</p>
                  </td>
                </tr>
              ) : (
                items.map((emp, idx) => {
                  const isPresent = emp.status === 'P' || emp.status === 'PRESENT';
                  const isHalfDay = emp.status === 'HD' || emp.status === 'HALF_DAY';
                  const isAbsent = emp.status === 'A' || emp.status === 'ABSENT';
                  const isLeave = emp.status === 'L' || emp.status === 'LEAVE';

                  const inSelfie = resolveSelfieUrl(emp.punchInSelfie || emp.punchIn?.selfieUrl || emp.punchIn?.selfie);
                  const outSelfie = resolveSelfieUrl(emp.punchOutSelfie || emp.punchOut?.selfieUrl || emp.punchOut?.selfie);
                  const hasSelfies = Boolean(inSelfie || outSelfie);

                  return (
                    <tr key={emp.id || idx} className="hover:bg-slate-50/50 transition-colors">
                      {/* Employee details */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#225091]/10 flex items-center justify-center text-[#225091] font-bold text-xs shrink-0">
                            {emp.name?.charAt(0) || 'E'}
                          </div>
                          <div>
                            <p 
                              className="font-bold text-gray-900 cursor-pointer hover:text-[#225091] hover:underline"
                              onClick={() => onOpenSingleReport(emp)}
                            >
                              {emp.name}
                            </p>
                            <p className="text-xs text-gray-500">{emp.designation}</p>
                          </div>
                        </div>
                      </td>

                      {/* Punch In */}
                      <td className="px-6 py-4">
                        {emp.punchIn ? (
                          <div className="flex items-center gap-2.5">
                            {inSelfie && (
                              <button
                                type="button"
                                onClick={() => handleOpenSelfieAudit(emp)}
                                className="relative group/selfie cursor-pointer shrink-0"
                                title="Click to view Punch-In selfie"
                              >
                                <img 
                                  src={inSelfie} 
                                  alt="Check In" 
                                  className="w-8 h-8 rounded-lg object-cover border-2 border-emerald-500 shadow-2xs hover:scale-110 transition-transform"
                                />
                                <span className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-0.5 rounded-full">
                                  <Camera size={9} />
                                </span>
                              </button>
                            )}
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-gray-800">{formatPunchTime(emp.punchIn)}</span>
                              {emp.punchInLocation && (
                                <span className="text-[10px] text-gray-400 line-clamp-1 max-w-[150px]" title={emp.punchInLocation.address}>
                                  <MapPin size={10} className="inline mr-0.5" /> 
                                  {emp.punchInLocation.address || 'Location captured'}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Punch Out */}
                      <td className="px-6 py-4">
                        {emp.punchOut ? (
                          <div className="flex items-center gap-2.5">
                            {outSelfie && (
                              <button
                                type="button"
                                onClick={() => handleOpenSelfieAudit(emp)}
                                className="relative group/selfie cursor-pointer shrink-0"
                                title="Click to view Punch-Out selfie"
                              >
                                <img 
                                  src={outSelfie} 
                                  alt="Check Out" 
                                  className="w-8 h-8 rounded-lg object-cover border-2 border-rose-500 shadow-2xs hover:scale-110 transition-transform"
                                />
                                <span className="absolute -bottom-1 -right-1 bg-rose-600 text-white p-0.5 rounded-full">
                                  <Camera size={9} />
                                </span>
                              </button>
                            )}
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-gray-800">{formatPunchTime(emp.punchOut)}</span>
                              {emp.punchOutLocation && (
                                <span className="text-[10px] text-gray-400 line-clamp-1 max-w-[150px]" title={emp.punchOutLocation.address}>
                                  <MapPin size={10} className="inline mr-0.5" /> 
                                  {emp.punchOutLocation.address || 'Location captured'}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : emp.punchIn ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-semibold border border-emerald-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Active Shift
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Duration */}
                      <td className="px-6 py-4">
                        {emp.totalHrs ? (
                          <span className="font-semibold text-gray-700 bg-gray-50 px-2.5 py-1 rounded-lg text-xs border border-gray-100">
                            {emp.totalHrs}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Photo Audit Trigger Column */}
                      <td className="px-6 py-4 text-center">
                        {hasSelfies ? (
                          <button
                            type="button"
                            onClick={() => handleOpenSelfieAudit(emp)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50/80 hover:bg-blue-100 text-[#225091] font-bold text-xs border border-[#225091]/20 transition-all shadow-2xs cursor-pointer group"
                            title="View punch selfies and geolocation verification"
                          >
                            <Camera size={13} className="text-[#225091] group-hover:scale-110 transition-transform" />
                            <span>Audit ({[inSelfie, outSelfie].filter(Boolean).length})</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 font-medium">
                            <CameraOff size={13} className="text-gray-300" />
                            <span>No Photo</span>
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 text-center">
                        {isPresent && <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-200 uppercase tracking-wider w-[90px]">Present</span>}
                        {isHalfDay && <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px] border border-amber-200 uppercase tracking-wider w-[90px]">Half Day</span>}
                        {isAbsent && <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px] border border-rose-200 uppercase tracking-wider w-[90px]">Absent</span>}
                        {isLeave && <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-bold text-[11px] border border-blue-200 uppercase tracking-wider w-[90px]">On Leave</span>}
                        {!isPresent && !isHalfDay && !isAbsent && !isLeave && <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-gray-100 text-gray-500 font-bold text-[11px] border border-gray-200 uppercase tracking-wider w-[90px]">{emp.status || 'N/A'}</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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

export default DailyAttendanceTable;
