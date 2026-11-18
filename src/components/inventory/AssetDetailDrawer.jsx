import React, { useState, useEffect } from 'react';
import { X, Clock, MapPin, Tag, ShieldCheck, Box, User, CreditCard } from 'lucide-react';
import { toast } from 'react-toastify';
import inventoryService from '../../api/inventoryService';

export default function AssetDetailDrawer({ isOpen, onClose, assetId }) {
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && assetId) {
      setLoading(true);
      inventoryService.getAssetById(assetId)
        .then(res => {
          setAsset(res.data || res);
        })
        .catch(err => {
          console.error(err);
          toast.error("Failed to load asset details.");
          onClose();
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setAsset(null);
    }
  }, [isOpen, assetId, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 transition-opacity" onClick={onClose} />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
              <Box size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#225091] leading-tight">Asset Profile</h2>
              <p className="text-xs text-gray-500 font-medium">{asset?.assetTag || 'Loading...'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#225091] mb-3"></div>
              <p className="text-sm font-medium">Fetching Asset History...</p>
            </div>
          ) : asset ? (
            <div className="space-y-6">
              
              {/* Status Banner */}
              <div className={`p-4 rounded-xl border ${
                asset.status === 'active' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' :
                asset.status === 'in_repair' ? 'bg-amber-50 border-amber-100 text-amber-800' :
                asset.status === 'lost' ? 'bg-rose-50 border-rose-100 text-rose-800' :
                'bg-gray-50 border-gray-200 text-gray-700'
              }`}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-0.5">Current Status</p>
                    <p className="text-lg font-bold capitalize">{asset.status.replace('_', ' ')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-0.5">Condition</p>
                    <p className="text-sm font-bold capitalize">{asset.condition}</p>
                  </div>
                </div>
              </div>

              {/* Hardware Profile */}
              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5"><Tag size={16} className="text-gray-400" /> Hardware Details</h3>
                <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-2xs">
                  <div className="grid grid-cols-2 divide-x divide-y divide-gray-100">
                    <div className="p-3">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Item SKU</p>
                      <p className="text-xs font-semibold text-gray-800 truncate">{asset.itemMasterId?.name || 'N/A'}</p>
                    </div>
                    <div className="p-3">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Serial Number</p>
                      <p className="text-xs font-mono font-semibold text-gray-800">{asset.serialNumber || 'N/A'}</p>
                    </div>
                    <div className="p-3">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Purchase Date</p>
                      <p className="text-xs font-semibold text-gray-800">{asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div className="p-3">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Purchase Price</p>
                      <p className="text-xs font-semibold text-gray-800">{asset.purchasePrice ? `₹${asset.purchasePrice.toLocaleString()}` : 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Custody Timeline */}
              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-1.5"><Clock size={16} className="text-gray-400" /> Custody & Lifecycle History</h3>
                <div className="relative pl-3 border-l-2 border-gray-100 space-y-6">
                  
                  {/* Current State Indicator */}
                  <div className="relative">
                    <div className="absolute -left-[17px] top-1 bg-white p-0.5 rounded-full">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#225091] ring-2 ring-[#225091]/20"></div>
                    </div>
                    <div className="pl-4">
                      <p className="text-[10px] font-bold text-[#225091] uppercase tracking-wider">Current Location</p>
                      <div className="mt-1 bg-blue-50/50 border border-blue-100 rounded-lg p-3">
                        {asset.currentLocationType === 'User' ? (
                          <div className="flex items-start gap-3">
                            <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><User size={16} /></div>
                            <div>
                              <p className="text-sm font-bold text-gray-800">{asset.currentEmployeeId?.fullName || asset.currentEmployeeId?.name || 'Assigned User'}</p>
                              <p className="text-xs text-gray-500">Since last assignment</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-3">
                            <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600"><MapPin size={16} /></div>
                            <div>
                              <p className="text-sm font-bold text-gray-800">{asset.currentLocationType === 'Branch' ? 'Branch Pool' : 'Central Warehouse'}</p>
                              <p className="text-xs text-gray-500">Available in inventory</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Historical Assignments */}
                  {(asset.assignmentHistory || []).slice().reverse().map((hist, idx) => (
                    <div key={hist._id || idx} className="relative">
                      <div className="absolute -left-[17px] top-1 bg-white p-0.5 rounded-full">
                        <div className="w-2.5 h-2.5 rounded-full bg-gray-300"></div>
                      </div>
                      <div className="pl-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{new Date(hist.assignedAt).toLocaleDateString()} - {hist.returnedAt ? new Date(hist.returnedAt).toLocaleDateString() : 'Present'}</p>
                        <div className="mt-1 bg-white border border-gray-100 rounded-lg p-3 shadow-xs">
                          <p className="text-xs font-semibold text-gray-800 mb-1">Assigned to: {hist.employeeId?.fullName || hist.employeeId?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500 mb-2">Branch: {hist.branchId?.name || 'N/A'}</p>
                          
                          {(hist.remarks || hist.returnRemarks) && (
                            <div className="mt-2 text-xs bg-gray-50 p-2 rounded border border-gray-100 text-gray-600 italic">
                              {hist.remarks && <div><span className="font-semibold non-italic">Issue:</span> {hist.remarks}</div>}
                              {hist.returnRemarks && <div><span className="font-semibold non-italic">Return:</span> {hist.returnRemarks}</div>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Registration Genesis */}
                  <div className="relative">
                    <div className="absolute -left-[17px] top-1 bg-white p-0.5 rounded-full">
                      <div className="w-2.5 h-2.5 rounded-full bg-gray-200"></div>
                    </div>
                    <div className="pl-4">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{new Date(asset.createdAt).toLocaleDateString()}</p>
                      <p className="text-xs font-semibold text-gray-500 mt-1">Asset Officially Registered into System</p>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          ) : (
            <div className="flex justify-center items-center h-full text-gray-400 text-sm">Asset not found.</div>
          )}
        </div>
      </div>
    </>
  );
}
