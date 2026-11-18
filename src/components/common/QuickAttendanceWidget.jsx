import React, { useState, useEffect, useCallback } from 'react';
import { 
  LogIn, 
  LogOut, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  MapPin, 
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { attendanceService } from '../../api/attendanceService';
import { getCurrentPosition } from '../../utils/geolocation';
import PunchCaptureModal from '../modals/PunchCaptureModal';
import { resolveSelfieUrl } from '../modals/PunchSelfieModal';

export const QuickAttendanceWidget = ({ isBankPortal = false }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [punchCaptureConfig, setPunchCaptureConfig] = useState({
    isOpen: false,
    punchType: 'IN'
  });
  const [shiftData, setShiftData] = useState({
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

  const fetchTodayStatus = useCallback(async () => {
    try {
      const res = await attendanceService.getTodayStatus();
      if (res && (res.success || res.statusCode === 200)) {
        const payload = res.data || res;
        const todayAtt = payload.todayAttendance || payload.today || {};
        const hasIn = payload.hasPunchedIn ?? Boolean(todayAtt.punchIn);
        const hasOut = payload.hasPunchedOut ?? Boolean(todayAtt.punchOut);
        const onShift = Boolean(payload.onShift ?? (hasIn && !hasOut));

        setShiftData({
          onShift,
          today: {
            dateString: todayAtt.dateString || payload.today?.dateString || new Date().toISOString().split('T')[0],
            punchIn: todayAtt.punchIn || payload.today?.punchIn || null,
            punchOut: todayAtt.punchOut || payload.today?.punchOut || null,
            punchInSelfie: todayAtt.punchInSelfie || null,
            punchOutSelfie: todayAtt.punchOutSelfie || null,
            status: todayAtt.status || (onShift ? 'PRESENT' : (hasOut ? 'COMPLETED' : 'NOT_PUNCHED')),
            canPunchIn: !hasIn,
            canPunchOut: hasIn && !hasOut,
            isLate: Boolean(todayAtt.isLate),
            lateMinutes: Number(todayAtt.lateMinutes || 0)
          },
          shiftInfo: payload.shiftInfo || {
            dutyHours: '10:00 to 19:00',
            weeklyOff: 'Sunday'
          }
        });
      }
    } catch (err) {
      console.warn('Could not fetch today attendance status:', err?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodayStatus();
    // Poll every 3 minutes for fresh status
    const interval = setInterval(fetchTodayStatus, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchTodayStatus]);

  // Handle Punch In (Check-In)
  const handlePunchIn = (e) => {
    e.stopPropagation();
    setPunchCaptureConfig({
      isOpen: true,
      punchType: 'IN'
    });
  };

  // Handle Punch Out (Check-Out)
  const handlePunchOut = (e) => {
    e.stopPropagation();
    setPunchCaptureConfig({
      isOpen: true,
      punchType: 'OUT'
    });
  };

  const handlePunchCaptureSuccess = () => {
    fetchTodayStatus();
  };

  const handleNavigateAttendance = () => {
    const target = isBankPortal ? '/bank/attendance' : '/attendance-report';
    navigate(target);
  };

  if (loading) {
    return (
      <div className="hidden md:flex items-center gap-2 bg-white/10 text-white/70 px-3 py-1.5 rounded-full text-xs animate-pulse">
        <Clock size={14} className="animate-spin text-white/50" />
        <span>Syncing shift...</span>
      </div>
    );
  }

  const { onShift, today, shiftInfo } = shiftData;

  return (
    <>
      <div 
        onClick={handleNavigateAttendance}
      title="Click to view Attendance Details & Report"
      className="hidden sm:flex items-center gap-2.5 bg-black/15 hover:bg-black/25 text-white border border-white/15 px-3 py-1.5 rounded-xl cursor-pointer transition-all duration-200 group shadow-2xs"
    >
      {/* Shift Status Indicator */}
      <div className="flex items-center gap-2">
        <div className="relative flex items-center justify-center">
          <span className={`w-2.5 h-2.5 rounded-full ${
            onShift ? 'bg-emerald-400 animate-pulse' :
            today.punchOut ? 'bg-blue-300' :
            'bg-amber-400'
          }`} />
        </div>

        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5 text-[11px] leading-tight font-bold">
            {onShift ? (
              <span className="text-emerald-300">On Shift: {today.punchIn}</span>
            ) : today.punchOut ? (
              <span className="text-blue-200">Completed ({today.punchOut})</span>
            ) : (
              <span className="text-amber-200">Shift: {shiftInfo.dutyHours || 'Not Punched'}</span>
            )}

            {today.isLate && (
              <span className="bg-amber-500/80 text-white text-[9px] px-1 py-0.2 rounded font-extrabold uppercase" title={`Late by ${today.lateMinutes} mins`}>
                Late ({today.lateMinutes}m)
              </span>
            )}
          </div>
          <span className="text-[9px] text-white/70 leading-tight">
            {onShift ? 'Eligible to Punch Out' : today.punchOut ? 'Shift finished for today' : 'Ready to Punch In'}
          </span>
        </div>
      </div>

      {/* Action Button */}
      <div className="pl-1 border-l border-white/20 flex items-center">
        {!onShift && !today.punchIn && (
          <button
            type="button"
            disabled={punching}
            onClick={handlePunchIn}
            className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-2.5 py-1 rounded-lg transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {punching ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <LogIn size={13} />
            )}
            <span>Punch In</span>
          </button>
        )}

        {(onShift || Boolean(today.punchIn)) && !today.punchOut && (
          <button
            type="button"
            disabled={punching}
            onClick={handlePunchOut}
            className="flex items-center gap-1 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs px-2.5 py-1 rounded-lg transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {punching ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <LogOut size={13} />
            )}
            <span>Punch Out</span>
          </button>
        )}

        {today.punchOut && (
          <div className="flex items-center text-white/80 hover:text-white text-xs gap-0.5">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <ChevronRight size={13} className="text-white/50 group-hover:translate-x-0.5 transition-transform" />
          </div>
        )}
      </div>
        </div>
    <PunchCaptureModal
      isOpen={punchCaptureConfig.isOpen}
      punchType={punchCaptureConfig.punchType}
      onClose={() => setPunchCaptureConfig(prev => ({ ...prev, isOpen: false }))}
      onSuccess={handlePunchCaptureSuccess}
    />
    </>
  );
};

export default QuickAttendanceWidget;
