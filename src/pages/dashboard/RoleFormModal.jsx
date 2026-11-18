import React, { useState, useEffect } from "react";
import { X, Shield, Loader2, CheckCircle, Info } from "lucide-react";
import { toast } from "react-toastify";
import { roleService } from "../../api/roleService";

const RoleFormModal = ({ isOpen, onClose, roleToEdit, onSuccess }) => {
  const isEditing = Boolean(roleToEdit);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    status: "ACTIVE",
    permissions: [],
  });

  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPermissions();
      if (isEditing && roleToEdit) {
        setFormData({
          name: roleToEdit.name || "",
          code: roleToEdit.code || "",
          description: roleToEdit.description || "",
          status: roleToEdit.status || "ACTIVE",
          permissions: roleToEdit.permissions || [],
        });
      } else {
        setFormData({
          name: "",
          code: "",
          description: "",
          status: "ACTIVE",
          permissions: [],
        });
      }
    }
  }, [isOpen, isEditing, roleToEdit]);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const res = await roleService.getPermissions();
      if (res && res.data && res.data.modules) {
        setModules(res.data.modules);
      }
    } catch (err) {
      toast.error("Failed to load permissions catalog.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (permKey) => {
    setFormData((prev) => {
      const perms = new Set(prev.permissions);
      if (perms.has(permKey)) {
        perms.delete(permKey);
      } else {
        perms.add(permKey);
      }
      return { ...prev, permissions: Array.from(perms) };
    });
  };

  const handleModuleSelectAll = (modulePerms, isSelected) => {
    setFormData((prev) => {
      const perms = new Set(prev.permissions);
      modulePerms.forEach((p) => {
        if (isSelected) perms.add(p.key);
        else perms.delete(p.key);
      });
      return { ...prev, permissions: Array.from(perms) };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || formData.name.length < 2) {
      toast.error("Role Name must be at least 2 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        permissions: formData.permissions,
        status: formData.status,
      };

      if (!isEditing && formData.code) {
        payload.code = formData.code;
      } else if (isEditing && formData.code) {
        payload.code = formData.code;
      }

      let res;
      if (isEditing) {
        const id = roleToEdit._id || roleToEdit.id || roleToEdit.roleId;
        res = await roleService.update(id, payload);
      } else {
        res = await roleService.create(payload);
      }

      if (res && res.success) {
        toast.success(isEditing ? "Role updated successfully" : "Role created successfully");
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error("A role with this name or code already exists.");
      } else {
        toast.error(err.response?.data?.message || "Failed to save role.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-[#225091] rounded-lg">
              <Shield size={18} />
            </div>
            <h2 className="text-base font-bold text-slate-900 m-0">
              {isEditing ? "Edit Dynamic Role" : "Create Dynamic Role"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 size={24} className="animate-spin text-[#225091]" />
              <span className="text-sm text-slate-500 font-medium">Loading permissions catalog...</span>
            </div>
          ) : (
            <form id="roleForm" onSubmit={handleSubmit} className="space-y-6">
              
              {/* Basic Details Section */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 mb-2 border-b border-slate-100 pb-2">
                  Basic Details
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Role Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Senior Auditor"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#225091] focus:ring-1 focus:ring-[#225091]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>Role Code</span>
                      <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })}
                      placeholder="e.g. SENIOR_AUDITOR"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#225091] focus:ring-1 focus:ring-[#225091]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows="2"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Briefly describe the responsibilities of this role..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#225091] focus:ring-1 focus:ring-[#225091]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full md:w-1/2 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#225091] focus:ring-1 focus:ring-[#225091]"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Permissions Matrix */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Capabilities Matrix</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Select the exact permissions to grant to this role.</p>
                  </div>
                  <div className="text-xs font-semibold text-[#225091] bg-blue-50 px-2.5 py-1 rounded-md">
                    {formData.permissions.length} Selected
                  </div>
                </div>

                <div className="space-y-6">
                  {modules.map((mod, idx) => {
                    const allSelected = mod.permissions.every(p => formData.permissions.includes(p.key));
                    const someSelected = mod.permissions.some(p => formData.permissions.includes(p.key));

                    return (
                      <div key={idx} className="border border-slate-100 rounded-xl overflow-hidden">
                        <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 text-sm">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              ref={input => { if (input) input.indeterminate = someSelected && !allSelected; }}
                              onChange={(e) => handleModuleSelectAll(mod.permissions, e.target.checked)}
                              className="w-4 h-4 text-[#225091] rounded border-slate-300 focus:ring-[#225091]"
                            />
                            {mod.label}
                          </label>
                        </div>
                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {mod.permissions.map((perm) => (
                            <label key={perm.key} className="flex items-start gap-2 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={formData.permissions.includes(perm.key)}
                                onChange={() => handleCheckboxChange(perm.key)}
                                className="w-4 h-4 mt-0.5 text-[#225091] rounded border-slate-300 focus:ring-[#225091] cursor-pointer"
                              />
                              <div className="flex flex-col">
                                <span className="text-[13px] font-medium text-slate-700 group-hover:text-[#225091] transition-colors">
                                  {perm.label}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  {perm.key}
                                </span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50/50 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            form="roleForm"
            type="submit"
            disabled={submitting || loading}
            className="px-5 py-2.5 rounded-lg bg-[#225091] text-white font-semibold text-xs hover:bg-[#1a3f73] transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CheckCircle size={16} />
            )}
            {isEditing ? "Save Changes" : "Create Role"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleFormModal;
