import React, { useState } from 'react';
import { 
  X, 
  Camera, 
  CameraOff, 
  MapPin, 
  Clock, 
  User, 
  ExternalLink, 
  Download, 
  Maximize2, 
  Navigation,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Resolves full URL for punch selfies, handling relative paths and direct URLs
 */
export const resolveSelfieUrl = (val) => {
  if (!val) return '';
  let url = typeof val === 'string' ? val : (val.url || val.selfieUrl || val.path || val.fileUrl || '');
  if (!url || typeof url !== 'string') return '';
  url = url.replace(/\\/g, '/').trim();
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const rawApiUrl = (import.meta.env.VITE_API_URL || 'https://devapi.advitacredit.com').trim();
  const baseOrigin = rawApiUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '');
  return `${baseOrigin}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const PunchSelfieModal = ({
  isOpen,
  onClose,
  data = null
}) => {
  const navigate = useNavigate();
  const [zoomedImage, setZoomedImage] = useState(null);

  if (!isOpen || !data) return null;

  // Extract employee details
  const empName = data.employeeName || data.name || data.fullName || 'Employee';
  const designation = data.designation || data.role || 'Staff';
  const employeeCode = data.employeeCode || data.empCode || '';
  const dateStr = data.date || data.dateString || 'Today';
  const statusStr = (data.status || data.statusCode || 'PRESENT').toUpperCase();

  // Extract Punch-In data
  const punchInTime = typeof data.punchIn === 'string' 
    ? data.punchIn 
    : (data.punchIn?.time || data.punchInTime || '—');
    
  const punchInSelfie = resolveSelfieUrl(
    data.punchInSelfie || 
    data.punchIn?.selfieUrl || 
    data.punchIn?.selfie || 
    data.selfieIn || ''
  );
  
  const punchInLocation = data.punchInLocation || data.punchIn?.location || {
    address: data.punchInAddress || '',
    latitude: data.punchInLatitude || data.punchIn?.latitude,
    longitude: data.punchInLongitude || data.punchIn?.longitude,
  };

  // Extract Punch-Out data
  const punchOutTime = typeof data.punchOut === 'string' 
    ? data.punchOut 
    : (data.punchOut?.time || data.punchOutTime || '');
    
  const punchOutSelfie = resolveSelfieUrl(
    data.punchOutSelfie || 
    data.punchOut?.selfieUrl || 
    data.punchOut?.selfie || 
    data.selfieOut || ''
  );
  
  const punchOutLocation = data.punchOutLocation || data.punchOut?.location || {
    address: data.punchOutAddress || '',
    latitude: data.punchOutLatitude || data.punchOut?.latitude,
    longitude: data.punchOutLongitude || data.punchOut?.longitude,
  };

  const isActiveShift = Boolean(punchInTime && punchInTime !== '—' && !punchOutTime);

  const handleNavigateToGeo = (loc, punchType) => {
    if (!loc?.latitude || !loc?.longitude) return;
    onClose();
    navigate('/geo-tagging', {
      state: {
        selectedStaff: {
          name: empName,
          designation,
          punchType,
          punchTime: punchType === 'Check-In' ? punchInTime : punchOutTime,
          latitude: Number(loc.latitude),
          longitude: Number(loc.longitude),
          address: loc.address || ''
        }
      }
    });
  };

  const handleDownload = (imgUrl, filename) => {
    if (!imgUrl) return;
    const a = document.createElement('a');
    a.href = imgUrl;
    a.download = filename || `punch_selfie_${Date.now()}.jpg`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      
      {/* Zoomed Image Lightbox */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-60 bg-black/90 flex flex-col items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <img 
              src={zoomedImage.url} 
              alt={zoomedImage.title}
              className="max-h-[82vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl border border-white/20"
            />
            <div className="mt-3 px-4 py-2 bg-black/70 backdrop-blur-md rounded-xl text-white text-xs font-semibold flex items-center gap-3">
              <span>{zoomedImage.title}</span>
              <span className="text-gray-400">•</span>
              <span>{zoomedImage.time}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setZoomedImage(null);
              }}
              className="absolute -top-3 -right-3 p-2 bg-white text-gray-900 rounded-full hover:bg-gray-200 transition-colors cursor-pointer shadow-lg"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Main Modal Card */}
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-3xl overflow-hidden my-auto animate-scaleUp"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#225091] via-[#1a4279] to-[#14325c] p-6 text-white relative">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-inner">
                <Camera size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-white tracking-tight">Attendance Photo Audit</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/25 text-emerald-200 border border-emerald-400/40">
                    Live Verified
                  </span>
                </div>
                <p className="text-xs text-blue-100/80 mt-0.5">
                  Supervisory face capture audit with timestamp & geolocation verification
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Close Audit"
            >
              <X size={18} />
            </button>
          </div>

          {/* Employee Strip */}
          <div className="mt-5 pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-bold text-white text-xs">
                {empName.charAt(0)}
              </div>
              <div>
                <span className="font-bold text-white text-sm">{empName}</span>
                <span className="text-blue-200 text-xs ml-2">({designation})</span>
                {employeeCode && (
                  <span className="text-blue-300 text-[11px] ml-1.5 font-mono">[{employeeCode}]</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 text-blue-100">
              <span className="flex items-center gap-1 font-medium">
                <Calendar size={13} className="text-blue-300" /> {dateStr}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                statusStr === 'PRESENT' || statusStr === 'P' ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30' :
                statusStr === 'HALF_DAY' || statusStr === 'HD' ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' :
                'bg-blue-400/20 text-blue-200 border border-blue-400/30'
              }`}>
                {statusStr}
              </span>
            </div>
          </div>
        </div>

        {/* Dual Inspection Body: Punch-In & Punch-Out */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* CARD 1: PUNCH-IN SELFIE */}
            <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-4 flex flex-col justify-between gap-4 shadow-2xs hover:border-[#225091]/30 transition-all">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100"></span>
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Punch-In Selfie</h4>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-xs font-bold">
                    {punchInTime}
                  </span>
                </div>

                {/* Image Viewport */}
                <div className="mt-3 relative rounded-xl overflow-hidden bg-slate-200/70 aspect-[4/3] flex items-center justify-center border border-slate-200 group">
                  {punchInSelfie ? (
                    <>
                      <img 
                        src={punchInSelfie} 
                        alt="Punch In Selfie"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.classList.add('image-fallback');
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3 text-white">
                        <button
                          type="button"
                          onClick={() => setZoomedImage({ url: punchInSelfie, title: `Punch-In: ${empName}`, time: punchInTime })}
                          className="p-1.5 bg-black/60 hover:bg-black/80 rounded-lg backdrop-blur-xs transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                        >
                          <Maximize2 size={13} /> Zoom
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(punchInSelfie, `${empName}_punch_in_${dateStr}.jpg`)}
                          className="p-1.5 bg-black/60 hover:bg-black/80 rounded-lg backdrop-blur-xs transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                        >
                          <Download size={13} /> Save
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400 p-4 text-center">
                      <CameraOff size={32} className="text-gray-300 mb-1.5" />
                      <span className="text-xs font-semibold text-gray-600">No Check-In Photo</span>
                      <span className="text-[10px] text-gray-400 mt-0.5">Device or Biometric punch</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Location & GPS Info */}
              <div className="bg-white rounded-xl p-3 border border-gray-100 text-xs space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-1.5 text-gray-700 min-w-0">
                    <MapPin size={13} className="text-[#225091] shrink-0 mt-0.5" />
                    <span className="line-clamp-2 text-[11px]" title={punchInLocation.address}>
                      {punchInLocation.address || 'Address not captured'}
                    </span>
                  </div>
                  {punchInLocation.latitude && punchInLocation.longitude && (
                    <button
                      type="button"
                      onClick={() => handleNavigateToGeo(punchInLocation, 'Check-In')}
                      className="p-1 text-[#225091] hover:bg-blue-50 rounded-md transition-colors shrink-0 cursor-pointer"
                      title="View Check-In on Geo-Tagging Map"
                    >
                      <Navigation size={13} />
                    </button>
                  )}
                </div>

                {punchInLocation.latitude && punchInLocation.longitude && (
                  <div className="text-[10px] font-mono text-gray-400 pl-4">
                    GPS: {Number(punchInLocation.latitude).toFixed(4)}° N, {Number(punchInLocation.longitude).toFixed(4)}° E
                  </div>
                )}
              </div>
            </div>

            {/* CARD 2: PUNCH-OUT SELFIE */}
            <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-4 flex flex-col justify-between gap-4 shadow-2xs hover:border-[#225091]/30 transition-all">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${isActiveShift ? 'bg-amber-500 animate-pulse ring-4 ring-amber-100' : 'bg-rose-500 ring-4 ring-rose-100'}`}></span>
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Punch-Out Selfie</h4>
                  </div>
                  {isActiveShift ? (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                      Active Shift
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 font-mono text-xs font-bold">
                      {punchOutTime || '—'}
                    </span>
                  )}
                </div>

                {/* Image Viewport */}
                <div className="mt-3 relative rounded-xl overflow-hidden bg-slate-200/70 aspect-[4/3] flex items-center justify-center border border-slate-200 group">
                  {punchOutSelfie ? (
                    <>
                      <img 
                        src={punchOutSelfie} 
                        alt="Punch Out Selfie"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.classList.add('image-fallback');
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3 text-white">
                        <button
                          type="button"
                          onClick={() => setZoomedImage({ url: punchOutSelfie, title: `Punch-Out: ${empName}`, time: punchOutTime })}
                          className="p-1.5 bg-black/60 hover:bg-black/80 rounded-lg backdrop-blur-xs transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                        >
                          <Maximize2 size={13} /> Zoom
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(punchOutSelfie, `${empName}_punch_out_${dateStr}.jpg`)}
                          className="p-1.5 bg-black/60 hover:bg-black/80 rounded-lg backdrop-blur-xs transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                        >
                          <Download size={13} /> Save
                        </button>
                      </div>
                    </>
                  ) : isActiveShift ? (
                    <div className="flex flex-col items-center justify-center text-amber-600 p-4 text-center">
                      <Clock size={32} className="text-amber-500 animate-spin mb-1.5" style={{ animationDuration: '6s' }} />
                      <span className="text-xs font-bold text-amber-800">Shift In Progress</span>
                      <span className="text-[10px] text-amber-600/80 mt-0.5">Punch-out pending completion</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400 p-4 text-center">
                      <CameraOff size={32} className="text-gray-300 mb-1.5" />
                      <span className="text-xs font-semibold text-gray-600">No Check-Out Photo</span>
                      <span className="text-[10px] text-gray-400 mt-0.5">Device or Biometric punch</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Location & GPS Info */}
              <div className="bg-white rounded-xl p-3 border border-gray-100 text-xs space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-1.5 text-gray-700 min-w-0">
                    <MapPin size={13} className="text-rose-600 shrink-0 mt-0.5" />
                    <span className="line-clamp-2 text-[11px]" title={punchOutLocation.address}>
                      {punchOutLocation.address || (isActiveShift ? 'Shift active at current post' : 'Address not captured')}
                    </span>
                  </div>
                  {punchOutLocation.latitude && punchOutLocation.longitude && (
                    <button
                      type="button"
                      onClick={() => handleNavigateToGeo(punchOutLocation, 'Check-Out')}
                      className="p-1 text-[#225091] hover:bg-blue-50 rounded-md transition-colors shrink-0 cursor-pointer"
                      title="View Check-Out on Geo-Tagging Map"
                    >
                      <Navigation size={13} />
                    </button>
                  )}
                </div>

                {punchOutLocation.latitude && punchOutLocation.longitude && (
                  <div className="text-[10px] font-mono text-gray-400 pl-4">
                    GPS: {Number(punchOutLocation.latitude).toFixed(4)}° N, {Number(punchOutLocation.longitude).toFixed(4)}° E
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <ShieldCheck size={16} className="text-[#225091]" />
            <span>Audit record logged under Sahayaone Security & Compliance protocol</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-xs rounded-xl transition-all cursor-pointer shadow-2xs"
          >
            Dismiss
          </button>
        </div>

      </div>
    </div>
  );
};

export default PunchSelfieModal;
