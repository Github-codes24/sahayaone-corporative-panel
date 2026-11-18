import usePermission from './usePermission';

export const useInventoryPermissions = () => {
  const { hasPermission, hasAnyPermission, isSuperAdmin, role } = usePermission();

  const roleCode = (role?.code || role?.name || '').toUpperCase().replace(/\s+/g, '_');
  const isAdminTier = ['BANK_OWNER', 'SOCIETY_ADMIN', 'INVENTORY_MANAGER'].includes(roleCode);
  const isBranchManager = roleCode === 'BRANCH_MANAGER';
  const isBranchOfficer = roleCode === 'BRANCH_INVENTORY_OFFICER';

  return {
    canViewSocietyStats: isSuperAdmin || isAdminTier,
    canViewBranchStats: hasPermission('inventory_report.view') || hasPermission('stock_adjustment.view'),
    canManageCatalog: hasPermission('inventory_catalog.create') || hasPermission('inventory_catalog.update'),
    canManageVendors: isAdminTier,
    canManageCentralWarehouse: isAdminTier, // Keep this restricted for central logic
    canApproveRequisitions: hasPermission('branch_request.issue'),
    canApproveTransfers: hasPermission('transfer.dispatch') || hasPermission('transfer.receive'),
    canApproveAdjustments: hasPermission('stock_adjustment.approve') || isAdminTier || isBranchManager,
    canApproveDisposals: isAdminTier, // explicitly NOT Branch Manager per 7.7
    canAssignAssets: hasPermission('asset.assign'),
    canManageTransfers: hasPermission('transfer.create') || hasPermission('transfer.dispatch') || hasPermission('transfer.receive'),
    canManageAdjustments: hasPermission('stock_adjustment.create') || isAdminTier || isBranchManager || isBranchOfficer,
    canCreateAdjustments: hasPermission('stock_adjustment.create') || isAdminTier || isBranchManager || isBranchOfficer,
    canViewAdjustments: hasPermission('stock_adjustment.view') || isAdminTier || isBranchManager || isBranchOfficer,
    canUpdateAdjustments: hasPermission('stock_adjustment.update') || isAdminTier || isBranchManager || isBranchOfficer,
    canDeleteAdjustments: hasPermission('stock_adjustment.delete') || isAdminTier || isBranchManager || isBranchOfficer,
    canFulfillRequisitions: hasPermission('branch_request.issue') || hasPermission('transfer.receive'),
    isStaffScoped: !isAdminTier && !isBranchManager && !isBranchOfficer,
    roleLevel: isAdminTier ? 'ADMIN' : isBranchManager ? 'BRANCH_MANAGER' : isBranchOfficer ? 'BRANCH_OFFICER' : 'STAFF',
    // We add some extra helpers directly matching JSON for the Tabs:
    canViewCatalog: hasPermission('inventory_catalog.view'),
    canViewAssets: hasPermission('asset.view'),
    canViewTransfers: hasPermission('transfer.view') || hasPermission('branch_request.view'),
    canViewLogs: hasPermission('inventory_report.view') || hasPermission('dashboard.view')
  };
};
