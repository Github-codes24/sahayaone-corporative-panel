import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-toastify';
import inventoryService from '../../api/inventoryService';

export default function InventoryModals({ isOpen, onClose, modalType, initialData, authUser, permissions, onChangeModalType }) {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [stockShortageData, setStockShortageData] = useState(null);
  const [categories, setCategories] = useState([]); // In a real app, fetch these
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isManagerDropdownOpen, setIsManagerDropdownOpen] = useState(false);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [subcategories, setSubcategories] = useState([]);
  const [isCatalogCategoryDropdownOpen, setIsCatalogCategoryDropdownOpen] = useState(false);
  const [isCatalogSubcategoryDropdownOpen, setIsCatalogSubcategoryDropdownOpen] = useState(false);
  const [catalogItems, setCatalogItems] = useState([]);
  const [centralWarehouses, setCentralWarehouses] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [availableAssets, setAvailableAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  useEffect(() => {
    if (isOpen && (modalType === 'direct_issue' || modalType === 'adjust_stock') && formData.itemMasterId) {
      const selectedSku = catalogItems.find(c => (c._id || c.id) === formData.itemMasterId);
      if (selectedSku?.isSerialized) {
        setLoadingAssets(true);
        inventoryService.getAssets({
          itemMasterId: formData.itemMasterId,
          status: 'active',
          limit: 100
        }).then(res => {
          const arr = Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
          setAvailableAssets(arr);
        }).catch(err => {
          console.error("Failed to fetch available assets:", err);
          setAvailableAssets([]);
        }).finally(() => {
          setLoadingAssets(false);
        });
      } else {
        setAvailableAssets([]);
      }
    }
  }, [isOpen, modalType, formData.itemMasterId, catalogItems]);

  useEffect(() => {
    if (isOpen) {
      setStockShortageData(null);
      const init = { ...(initialData || {}) };
      if (init.purchaseDate) {
        try {
          const d = new Date(init.purchaseDate);
          if (!isNaN(d.getTime())) {
            init.purchaseDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          }
        } catch {}
      }
      setFormData(init);
      
      // Fetch categories and subcategories to populate the Parent Category dropdown
      if (modalType === 'subcategories' || modalType === 'catalog' || modalType === 'requests' || modalType === 'transfers' || modalType === 'direct_issue') {
        const fetchCategoriesData = async () => {
          try {
            const [catRes, subRes] = await Promise.all([
              inventoryService.getCategories(),
              ['catalog', 'requests', 'transfers', 'direct_issue'].includes(modalType) ? inventoryService.getSubcategories() : Promise.resolve([])
            ]);
            
            // Ultra-robust extraction of array data from API response
            const extractData = (res) => {
              if (!res) return [];
              if (Array.isArray(res)) return res;
              if (Array.isArray(res.data)) return res.data;
              if (Array.isArray(res.data?.data)) return res.data.data;
              if (Array.isArray(res.docs)) return res.docs;
              if (Array.isArray(res.data?.docs)) return res.data.docs;
              // Fallbacks
              for (const key of Object.keys(res)) {
                if (Array.isArray(res[key])) return res[key];
              }
              if (res.data && typeof res.data === 'object') {
                for (const key of Object.keys(res.data)) {
                  if (Array.isArray(res.data[key])) return res.data[key];
                }
              }
              return [];
            };
            
            const catData = extractData(catRes);
            setCategories(catData);
            
            if (['catalog', 'requests', 'transfers', 'direct_issue'].includes(modalType)) {
              setSubcategories(extractData(subRes));
            }
            
            if (catData.length === 0) {
              toast.warn("No Categories found! Please create a Category first.");
            }
          } catch (err) {
            console.error("Failed to fetch categories:", err);
            toast.error("Failed to load parent categories from the server.");
          }
        };
        fetchCategoriesData();
      }

    // Fetch employees to populate Manager ID dropdown for Central Warehouse
      if (['central', 'requests', 'transfers', 'adjust_stock', 'assets', 'assign_asset', 'direct_issue'].includes(modalType)) {
        const fetchCentralData = async () => {
          try {
            const { employeeService } = await import('../../api/employeeService');
            const { branchService } = await import('../../api/branchService');
            
            const [empRes, branchRes, itemsRes] = await Promise.all([
              employeeService.list().catch(e => { console.error(e); return []; }),
              branchService.getDropdownList().catch(e => { console.error(e); return []; }),
              ['requests', 'transfers', 'adjust_stock', 'assets', 'direct_issue'].includes(modalType) ? inventoryService.getItems({ limit: 100 }).catch(e => { console.error(e); return []; }) : Promise.resolve([])
            ]);
            
            const extractArray = (res) => {
              if (Array.isArray(res)) return res;
              if (res?.data && Array.isArray(res.data)) return res.data;
              if (res?.data?.data && Array.isArray(res.data.data)) return res.data.data;
              if (res?.docs && Array.isArray(res.docs)) return res.docs;
              if (res?.data?.docs && Array.isArray(res.data.docs)) return res.data.docs;
              // Fallbacks for specific nested keys
              if (res && typeof res === 'object') {
                const arr = Object.values(res).find(val => Array.isArray(val));
                if (arr) return arr;
                if (res.data && typeof res.data === 'object') {
                   const arr2 = Object.values(res.data).find(val => Array.isArray(val));
                   if (arr2) return arr2;
                }
              }
              return [];
            };
            
            setEmployees(extractArray(empRes));
            setBranches(extractArray(branchRes));
            if (['requests', 'transfers', 'adjust_stock', 'assets', 'direct_issue'].includes(modalType)) {
              setCatalogItems(extractArray(itemsRes));
            }
            // Fetch central warehouses to replace the mock ID
            inventoryService.getCentralWarehouses().then(cRes => {
              setCentralWarehouses(extractArray(cRes));
            }).catch(e => console.error(e));
            
            if (modalType === 'adjust_stock') {
              inventoryService.getVendors().then(vRes => {
                setVendors(extractArray(vRes));
              }).catch(e => console.error(e));
            }
          } catch (err) {
            console.error("Failed to fetch modal dependency data:", err);
          }
        };
        fetchCentralData();
      }
    }
  }, [isOpen, modalType]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleMultiSelect = (name, valueStr) => {
    const arr = valueStr.split(',').map(s => s.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, [name]: arr }));
  };

  const handleAddItemRow = () => {
    const items = formData.items || [{ catalogItemId: '', quantity: 1 }];
    setFormData(prev => ({ ...prev, items: [...items, { catalogItemId: '', quantity: 1 }] }));
  };

  const handleRemoveItemRow = (index) => {
    const items = [...(formData.items || [])];
    items.splice(index, 1);
    setFormData(prev => ({ ...prev, items }));
  };

  const handleItemChange = (index, field, value) => {
    const items = [...(formData.items || [])];
    if (!items[index]) items[index] = { catalogItemId: '', quantity: 1 };
    items[index][field] = value;
    setFormData(prev => ({ ...prev, items }));
  };

  const parseArrayInput = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(s => String(s).trim()).filter(Boolean);
    if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean);
    return [String(val).trim()].filter(Boolean);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const dataToSubmit = { ...formData };
      
      // Auto-generate 'code' field for entities that require it but no longer have an input field
      if (!dataToSubmit.code && ['vendors', 'categories', 'subcategories', 'central', 'catalog'].includes(modalType)) {
        const prefix = modalType === 'vendors' ? 'VND' :
                       modalType === 'categories' ? 'CAT' :
                       modalType === 'subcategories' ? 'SUB' :
                       modalType === 'central' ? 'WH' :
                       modalType === 'catalog' ? 'SKU' : 'CODE';
        dataToSubmit.code = `${prefix}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      }

      const isUpdate = !!(initialData && (initialData._id || initialData.id));
      const entityId = isUpdate ? (initialData._id || initialData.id) : null;

      if (modalType === 'vendors') {
        if (!dataToSubmit.name || !dataToSubmit.name.trim()) {
          toast.error("Vendor name is required.");
          setLoading(false);
          return;
        }
        if (dataToSubmit.gstNumber) {
          const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
          if (!gstRegex.test(dataToSubmit.gstNumber.toUpperCase())) {
            toast.error("Invalid GST Number format. Example: 22AAAAA0000A1Z5");
            setLoading(false);
            return;
          }
          dataToSubmit.gstNumber = dataToSubmit.gstNumber.toUpperCase();
        }
        // Clean payload based on operation type
        const payload = {
          name: dataToSubmit.name,
          contactPerson: dataToSubmit.contactPerson || '',
          phone: dataToSubmit.phone || '',
          email: dataToSubmit.email || '',
          address: dataToSubmit.address || ''
        };

        if (isUpdate) {
          payload.status = dataToSubmit.status || 'active';
        } else {
          payload.code = dataToSubmit.code;
          if (dataToSubmit.gstNumber) payload.gstNumber = dataToSubmit.gstNumber;
        }

        isUpdate ? await inventoryService.updateVendor(entityId, payload) : await inventoryService.createVendor(payload);
        toast.success(isUpdate ? "Vendor updated successfully!" : "Vendor created successfully!");
      } else if (modalType === 'categories') {
        if (!dataToSubmit.name || !dataToSubmit.name.trim()) {
          toast.error("Category name is required.");
          setLoading(false);
          return;
        }
        isUpdate ? await inventoryService.updateCategory(entityId, dataToSubmit) : await inventoryService.createCategory(dataToSubmit);
        toast.success(isUpdate ? "Category updated successfully!" : "Category created successfully!");
      } else if (modalType === 'subcategories') {
        if (!dataToSubmit.name || !dataToSubmit.name.trim()) {
          toast.error("Subcategory name is required.");
          setLoading(false);
          return;
        }
        if (!dataToSubmit.categoryId) {
          toast.error("Please select a parent Category.");
          setLoading(false);
          return;
        }
        isUpdate ? await inventoryService.updateSubcategory(entityId, dataToSubmit) : await inventoryService.createSubcategory(dataToSubmit);
        toast.success(isUpdate ? "Subcategory updated successfully!" : "Subcategory created successfully!");
      } else if (modalType === 'central') {
        if (!dataToSubmit.name || !dataToSubmit.name.trim()) {
          toast.error("Warehouse name is required.");
          setLoading(false);
          return;
        }

        const payload = {
          name: dataToSubmit.name,
          address: dataToSubmit.address || '',
          managerId: dataToSubmit.managerId
        };

        if (isUpdate) {
          payload.status = dataToSubmit.status || 'active';
        } else {
          payload.code = dataToSubmit.code;
        }

        isUpdate ? await inventoryService.updateCentralWarehouse(entityId, payload) : await inventoryService.createCentralWarehouse(payload);
        toast.success(isUpdate ? "Central Warehouse updated successfully!" : "Central Warehouse created successfully!");
      } else if (modalType === 'catalog') {
        if (!dataToSubmit.name || !dataToSubmit.name.trim()) {
          toast.error("Item name is required.");
          setLoading(false);
          return;
        }
        if (!dataToSubmit.categoryId) {
          toast.error("Please select a Category.");
          setLoading(false);
          return;
        }
        const payload = { ...dataToSubmit };
        // Ensure we send 'unit' as expected by the API
        if (payload.unit === undefined && payload.unitOfMeasure !== undefined) {
          payload.unit = payload.unitOfMeasure;
          delete payload.unitOfMeasure;
        }
        
        // Prevent code update if strictly forbidden, though API handles this.
        if (isUpdate) {
           delete payload.code;
        }

        isUpdate ? await inventoryService.updateItem(entityId, payload) : await inventoryService.createItem(payload);
        toast.success(isUpdate ? "Catalog Item updated successfully!" : "Catalog Item created successfully!");
      } else if (modalType === 'adjust_stock') {
        const isUpdate = !!(initialData && (initialData._id || initialData.id));
        const entityId = isUpdate ? (initialData._id || initialData.id) : null;

        if (isUpdate && initialData?.status && initialData.status !== 'PENDING') {
          toast.error("Only PENDING stock adjustments can be updated.");
          setLoading(false);
          return;
        }

        if (!formData.itemMasterId) {
          toast.error("Please select an item / SKU.");
          setLoading(false);
          return;
        }
        if (!formData.adjustmentType) {
          toast.error("Please select an Adjustment Type (INCREASE or DECREASE).");
          setLoading(false);
          return;
        }
        if (formData.quantity === '' || isNaN(Number(formData.quantity)) || Number(formData.quantity) <= 0) {
          toast.error("Please enter a valid positive quantity (min 1).");
          setLoading(false);
          return;
        }
        if (!formData.reason) {
          toast.error("Please select a reason for the adjustment.");
          setLoading(false);
          return;
        }

        const effectiveBranchId = formData.branchId || authUser?.branchId || (formData.locationType === 'Branch' ? formData.locationId : null);
        if (!effectiveBranchId && formData.locationType !== 'CentralInventory') {
          toast.error("Please select a Branch for this adjustment.");
          setLoading(false);
          return;
        }

        if (isUpdate) {
          await inventoryService.updateStockAdjustment(entityId, {
            quantity: Math.floor(Number(formData.quantity)),
            adjustmentType: formData.adjustmentType,
            reason: formData.reason,
            assetId: formData.assetId || null,
            remarks: formData.remarks || ""
          });
          toast.success("Stock adjustment request updated successfully!");
        } else {
          await inventoryService.createStockAdjustment({
            branchId: effectiveBranchId || undefined,
            itemMasterId: formData.itemMasterId,
            locationType: formData.locationType || 'Branch',
            locationId: formData.locationId || effectiveBranchId || undefined,
            adjustmentType: formData.adjustmentType,
            quantity: Math.floor(Number(formData.quantity)),
            reason: formData.reason,
            assetId: formData.assetId || null,
            remarks: formData.remarks || ""
          });
          toast.success("Stock adjustment request created successfully!");
        }
      } else if (modalType === 'approve_adjustment') {
        await inventoryService.approveStockAdjustment(entityId, { remarks: formData.remarks });
        toast.success("Stock adjustment approved successfully!");
      } else if (modalType === 'reject_adjustment') {
        if (!formData.remarks || !formData.remarks.trim()) {
          toast.error("Rejection reason is strictly required.");
          setLoading(false);
          return;
        }
        await inventoryService.rejectStockAdjustment(entityId, { remarks: formData.remarks });
        toast.success("Stock adjustment rejected!");
      } else if (modalType === 'requests') {
        const items = formData.items || [];
        const validItems = items.filter(i => i.itemMasterId && Number(i.quantity) > 0);
        
        if (validItems.length === 0) {
          toast.error('Please add at least one valid item and quantity.');
          setLoading(false);
          return;
        }

        if (!dataToSubmit.employeeId) {
          toast.error('Employee selection is required.');
          setLoading(false);
          return;
        }
        
        const requestPayload = {
          branchId: authUser?.branchId || formData.branchId,
          employeeId: dataToSubmit.employeeId,
          remarks: dataToSubmit.remarks || '',
          items: validItems.map(i => ({
            itemMasterId: i.itemMasterId,
            quantity: Number(i.quantity)
          }))
        };
        
        if (!requestPayload.branchId) {
          toast.error("Branch ID is required for Requisition.");
          setLoading(false);
          return;
        }
        await inventoryService.createRequisition(requestPayload);
        toast.success("Branch Requisition submitted successfully!");
      } else if (modalType === 'transfers') {
        const items = formData.items || [];
        const validItems = items.filter(i => i.itemMasterId && Number(i.quantity) > 0);
        
        if (validItems.length === 0) {
          toast.error('Please add at least one valid item and quantity.');
          setLoading(false);
          return;
        }

        if (!formData.fromLocationId || !formData.toLocationId) {
          toast.error('Source and Destination locations are required.');
          setLoading(false);
          return;
        }

        if (formData.fromLocationId === formData.toLocationId) {
          toast.error('Origin and Destination locations cannot be the same.');
          setLoading(false);
          return;
        }

        const transferPayload = {
          fromLocationType: formData.fromLocationType || 'CentralInventory',
          fromLocationId: formData.fromLocationId,
          toLocationType: formData.toLocationType || 'Branch',
          toLocationId: formData.toLocationId,
          remarks: formData.remarks || '',
          items: validItems.map(i => ({
            itemMasterId: i.itemMasterId,
            quantity: Number(i.quantity)
          }))
        };
        await inventoryService.createTransfer(transferPayload);
        toast.success("Transfer Request submitted successfully!");
      } else if (modalType === 'assets') {
        if (!formData.itemMasterId || !formData.assetTag || !formData.currentLocationId) {
          toast.error('Item Master, Asset Tag, and Current Location are required.');
          setLoading(false);
          return;
        }
        const assetPayload = {
          itemMasterId: formData.itemMasterId,
          assetTag: formData.assetTag,
          serialNumber: formData.serialNumber || '',
          currentLocationType: formData.currentLocationType || 'CentralInventory',
          currentLocationId: formData.currentLocationId,
          condition: formData.condition || 'new',
          status: formData.status || 'active',
          purchaseDate: formData.purchaseDate || undefined,
          purchasePrice: formData.purchasePrice ? Number(formData.purchasePrice) : undefined,
          remarks: formData.remarks || ''
        };
        
        if (inventoryService.createAsset) {
           await inventoryService.createAsset(assetPayload);
        } else {
           const { default: axiosInstance } = await import('../../api/axiosConfig');
           await axiosInstance.post('/v1/society/inventory/assets', assetPayload);
        }
        toast.success("Asset registered successfully!");
      } else if (modalType === 'assign_asset') {
        if (!initialData?._id && !initialData?.id) { toast.error("Asset ID missing."); setLoading(false); return; }
        if (!formData.assignedTo) { toast.error("Employee selection is required."); setLoading(false); return; }
        
        const payload = {
          assetId: initialData._id || initialData.id,
          employeeId: formData.assignedTo,
          condition: formData.condition || 'good',
          remarks: formData.remarks || ''
        };
        if (formData.branchId) payload.branchId = formData.branchId;

        await inventoryService.assignAsset(payload);
        toast.success("Asset assigned successfully!");
      } else if (modalType === 'return_asset') {
        if (!formData.condition) { toast.error("Condition is required."); setLoading(false); return; }
        await inventoryService.returnAsset(initialData._id || initialData.id, { condition: formData.condition, remarks: formData.remarks });
        toast.success("Asset returned to pool!");
      } else if (modalType === 'report_damage') {
        if (!formData.remarks) { toast.error("Remarks required."); setLoading(false); return; }
        await inventoryService.reportAssetDamage(initialData._id || initialData.id, { remarks: formData.remarks });
        toast.success("Damage reported!");
      } else if (modalType === 'complete_repair') {
        await inventoryService.completeAssetRepair(initialData._id || initialData.id, { condition: formData.condition || 'good', remarks: formData.remarks });
        toast.success("Repair completed!");
      } else if (modalType === 'request_disposal') {
        if (!formData.remarks) { toast.error("Justification remarks required."); setLoading(false); return; }
        await inventoryService.requestAssetDisposal(initialData._id || initialData.id, { remarks: formData.remarks });
        toast.success("Disposal requested!");
      } else if (modalType === 'approve_disposal') {
        await inventoryService.approveAssetDisposal(initialData._id || initialData.id, { remarks: formData.remarks });
        toast.success("Disposal approved!");
      } else if (modalType === 'report_lost') {
        if (!formData.remarks) { toast.error("Incident remarks required."); setLoading(false); return; }
        await inventoryService.reportAssetLost(initialData._id || initialData.id, { remarks: formData.remarks });
        toast.success("Asset reported lost!");
      } else if (modalType === 'recover_asset') {
        await inventoryService.recoverAsset(initialData._id || initialData.id, { condition: formData.condition || 'good', remarks: formData.remarks });
        toast.success("Asset recovered successfully!");
      } else if (modalType === 'direct_issue') {
        if (!formData.itemMasterId || !formData.employeeId || !formData.quantity) {
          toast.error('Item SKU, Employee, and Quantity are required.');
          setLoading(false);
          return;
        }
        const directPayload = {
          branchId: authUser?.branchId || formData.branchId,
          employeeId: formData.employeeId,
          itemMasterId: formData.itemMasterId,
          quantity: Number(formData.quantity),
          remarks: formData.remarks || ''
        };
        const selectedSku = catalogItems.find(c => (c._id || c.id) === formData.itemMasterId);
        const isSerialized = selectedSku?.isSerialized;
        const qty = Number(formData.quantity);
        const parsedAssetTags = parseArrayInput(formData.assetTags);

        if (isSerialized) {
          if (parsedAssetTags.length !== qty) {
            toast.error(`Exactly ${qty} unique asset tag(s) required for serialized item [${selectedSku?.name || 'SKU'}]. You provided ${parsedAssetTags.length}. (Tip: If this is a consumable item like pens/paper, edit the SKU in Catalog and uncheck "Is Serialized").`);
            setLoading(false);
            return;
          }
          directPayload.assetTags = parsedAssetTags;
        }
        await inventoryService.directIssueStock(directPayload);
        toast.success("Stock issued directly to employee successfully!");
      } else if (['approve_transfer', 'reject_transfer', 'dispatch_transfer', 'receive_transfer', 'approve_request', 'reject_request', 'fulfill_request'].includes(modalType)) {
        const id = initialData?._id || initialData?.id;
        if (!id) { toast.error("Record ID missing."); setLoading(false); return; }
        
        if (modalType === 'approve_transfer') await inventoryService.approveTransfer(id, { remarks: formData.remarks });
        else if (modalType === 'reject_transfer') await inventoryService.rejectTransfer(id, { remarks: formData.remarks });
        else if (modalType === 'receive_transfer') await inventoryService.receiveTransfer(id, { remarks: formData.remarks });
        else if (modalType === 'approve_request') await inventoryService.approveRequisition(id, { remarks: formData.remarks });
        else if (modalType === 'reject_request') await inventoryService.rejectRequisition(id, { remarks: formData.remarks });
        else if (modalType === 'fulfill_request') {
          const assetTagMapping = [];
          for (const it of (initialData?.items || [])) {
            const skuId = typeof it.itemMasterId === 'object' ? (it.itemMasterId._id || it.itemMasterId.id) : it.itemMasterId;
            let isSerialized = it.itemMasterId?.isSerialized ?? it.isSerialized;
            if (isSerialized === undefined) {
              const catalogMatch = catalogItems.find(c => (c._id || c.id) === skuId);
              isSerialized = catalogMatch?.isSerialized;
            }
            const qty = Number(it.quantity);
            const tags = [];
            
            if (isSerialized) {
              for (let i = 0; i < qty; i++) {
                const val = formData[`assetTag_${skuId}_${i}`];
                if (!val) {
                  toast.error(`Missing Asset Tag #${i+1} for item ${it.itemMasterId?.name || skuId}`);
                  setLoading(false);
                  return;
                }
                tags.push(val);
              }
              assetTagMapping.push({
                itemMasterId: skuId,
                assetTags: tags
              });
            }
          }
          
          const payload = {
            remarks: formData.remarks || '',
            ...(assetTagMapping.length > 0 ? { assetTagMapping } : {})
          };
          
          await inventoryService.fulfillRequisition(id, payload);
          toast.success("Requisition fulfilled successfully!");
        } else if (modalType === 'dispatch_transfer') {
          const assetTagsMapping = [];
          for (const it of (initialData?.items || [])) {
            const skuId = typeof it.itemMasterId === 'object' ? (it.itemMasterId._id || it.itemMasterId.id) : it.itemMasterId;
            let isSerialized = it.itemMasterId?.isSerialized ?? it.isSerialized;
            if (isSerialized === undefined) {
              const catalogMatch = catalogItems.find(c => (c._id || c.id) === skuId);
              isSerialized = catalogMatch?.isSerialized;
            }
            const qty = Number(it.quantity);
            const tags = [];
            
            if (isSerialized) {
              for (let i = 0; i < qty; i++) {
                const val = formData[`assetTag_${skuId}_${i}`];
                if (!val) {
                  toast.error(`Missing Asset Tag #${i+1} for item ${it.itemMasterId?.name || skuId}`);
                  setLoading(false);
                  return;
                }
                tags.push(val);
              }
              assetTagsMapping.push({
                itemMasterId: skuId,
                assetTags: tags
              });
            }
          }
          
          const payload = {
            remarks: formData.remarks || '',
            ...(assetTagsMapping.length > 0 ? { assetTagsMapping } : {})
          };
          
          await inventoryService.dispatchTransfer(id, payload);
          toast.success("Transfer dispatched successfully!");
        }
      } else {
        toast.info("Action simulated. Connect backend for this specific workflow.");
      }

      onClose(true);
    } catch (error) {
      console.error(error);
      if (error.response?.status === 422 && error.response?.data?.data?.missingItems) {
        setStockShortageData(error.response.data.data);
        return;
      }
      toast.error(error.response?.data?.message || "An error occurred during submission.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const renderVendorForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Vendor Name <span className="text-red-500">*</span></label>
          <input type="text" name="name" value={formData.name || ''} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none" placeholder="e.g. TechSupplies Private Limited" required />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Contact Person</label>
          <input type="text" name="contactPerson" value={formData.contactPerson || ''} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none" placeholder="e.g. Rajesh Kumar" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Phone</label>
          <input type="text" name="phone" value={formData.phone || ''} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none" placeholder="e.g. +919876543210" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
          <input type="email" name="email" value={formData.email || ''} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none" placeholder="e.g. vendor@techsupplies.com" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">GST Number</label>
          <input type="text" name="gstNumber" value={formData.gstNumber || ''} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm uppercase focus:border-[#225091] focus:outline-none disabled:bg-gray-100 disabled:text-gray-500" disabled={!!(initialData && (initialData._id || initialData.id))} />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Address</label>
          <textarea name="address" value={formData.address || ''} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none" rows="2" placeholder="e.g. Plot 42, Tech Park, Mumbai"></textarea>
        </div>
        {!!(initialData && (initialData._id || initialData.id)) && (
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
            <select name="status" value={formData.status || 'active'} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );

  const renderCategoryForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Category Name</label>
          <input type="text" name="name" value={formData.name || ''} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none" placeholder="e.g. IT Equipment" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
          <textarea name="description" value={formData.description || ''} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none" rows="3"></textarea>
        </div>
      </div>
    </div>
  );

  const renderSubcategoryForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 relative">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Parent Category</label>
          
          {/* Custom Dropdown to fix native OS scaling issues on zoomed browsers */}
          <div 
            className={`w-full border rounded-md px-3 py-2 text-sm bg-white cursor-pointer flex justify-between items-center transition-colors ${isCategoryDropdownOpen ? 'border-[#225091] ring-1 ring-[#225091]/20' : 'border-gray-300 hover:border-gray-400'}`}
            onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
          >
            <span className={formData.categoryId ? 'text-gray-900 font-medium' : 'text-gray-500'}>
              {formData.categoryId 
                ? `${categories.find(c => c._id === formData.categoryId)?.name || ''} (${categories.find(c => c._id === formData.categoryId)?.code || ''})` 
                : 'Select a Category'}
            </span>
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          
          {isCategoryDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-50 max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-1">
              <div 
                className="px-3 py-2.5 text-sm hover:bg-gray-50 cursor-pointer text-gray-500 border-b border-gray-50"
                onClick={() => {
                  setFormData(prev => ({ ...prev, categoryId: '' }));
                  setIsCategoryDropdownOpen(false);
                }}
              >
                Select a Category
              </div>
              {categories.length === 0 ? (
                <div className="px-3 py-4 text-sm text-center text-gray-500">No categories found</div>
              ) : (
                categories.map((cat) => (
                  <div 
                    key={cat._id}
                    className={`px-3 py-2.5 text-sm cursor-pointer transition-colors ${formData.categoryId === cat._id ? 'bg-[#225091]/5 text-[#225091] font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, categoryId: cat._id }));
                      setIsCategoryDropdownOpen(false);
                    }}
                  >
                    {cat.name} <span className="text-xs text-gray-400 ml-1">({cat.code})</span>
                  </div>
                ))
              )}
              <div 
                className={`px-3 py-2.5 text-sm cursor-pointer transition-colors border-t border-gray-100 ${formData.categoryId === 'other' ? 'bg-[#225091]/5 text-[#225091] font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                onClick={() => {
                  setFormData(prev => ({ ...prev, categoryId: 'other' }));
                  setIsCategoryDropdownOpen(false);
                }}
              >
                Other / Miscellaneous <span className="text-xs text-gray-400 ml-1">(OTHER)</span>
              </div>
            </div>
          )}
          {/* Backdrop for closing dropdown when clicking outside */}
          {isCategoryDropdownOpen && (
            <div className="fixed inset-0 z-40" onClick={() => setIsCategoryDropdownOpen(false)}></div>
          )}
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Subcategory Name</label>
          <input type="text" name="name" value={formData.name || ''} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none" placeholder="e.g. Laptops" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
          <textarea name="description" value={formData.description || ''} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none" rows="2"></textarea>
        </div>
      </div>
    </div>
  );

  const renderCentralForm = () => {
    const isUpdate = !!(initialData && (initialData._id || initialData.id));
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Warehouse Name <span className="text-red-500">*</span></label>
            <input type="text" name="name" value={formData.name || ''} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none" placeholder="e.g. Main Central Warehouse" required />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Warehouse Code <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              name="code" 
              value={formData.code || ''} 
              onChange={handleChange} 
              className="w-full border rounded-md px-3 py-2 text-sm uppercase focus:border-[#225091] focus:outline-none disabled:bg-gray-100 disabled:text-gray-500" 
              placeholder="e.g. WH-MAIN-CENTRAL" 
              disabled={isUpdate}
            />
          </div>
          <div className="col-span-2">
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Designated Supervisor / Manager <span className="text-red-500">*</span></label>
              
              <div 
                className={`w-full border rounded-md px-3 py-2 text-sm bg-white cursor-pointer flex justify-between items-center transition-colors ${isManagerDropdownOpen ? 'border-[#225091] ring-1 ring-[#225091]/20' : 'border-gray-300 hover:border-gray-400'}`}
                onClick={() => setIsManagerDropdownOpen(!isManagerDropdownOpen)}
              >
                <span className={formData.managerId ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                  {formData.managerId 
                    ? (() => {
                        const emp = employees.find(e => (e.id || e._id) === formData.managerId);
                        return emp ? `${emp.fullName || emp.name} (${emp.employeeId || emp.code || 'N/A'})` : 'Select a Manager';
                      })()
                    : 'Select a Supervisor / Manager'}
                </span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${isManagerDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              
              {isManagerDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-50 max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-1">
                  <div 
                    className="px-3 py-2.5 text-sm hover:bg-gray-50 cursor-pointer text-gray-500 border-b border-gray-50"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, managerId: '' }));
                      setIsManagerDropdownOpen(false);
                    }}
                  >
                    Select a Supervisor / Manager
                  </div>
                  {employees.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-center text-gray-500">No employees found</div>
                  ) : (
                    employees.map((emp) => {
                      const eId = emp.id || emp._id;
                      return (
                      <div 
                        key={eId}
                        className={`px-3 py-2.5 text-sm cursor-pointer transition-colors ${formData.managerId === eId ? 'bg-[#225091]/5 text-[#225091] font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                        onClick={() => {
                          const empBranch = emp.branchId || emp.branch?._id || emp.branch?.id || emp.branch;
                          const finalBranchId = typeof empBranch === 'object' ? (empBranch.id || empBranch._id) : empBranch;
                          
                          setFormData(prev => ({ 
                            ...prev, 
                            managerId: eId,
                            ...(finalBranchId ? { branchId: finalBranchId } : {})
                          }));
                          setIsManagerDropdownOpen(false);
                        }}
                      >
                        {emp.fullName || emp.name} <span className="text-xs text-gray-400 ml-1">({emp.employeeId || emp.code || 'N/A'})</span>
                      </div>
                    )})
                  )}
                </div>
              )}
              
              {isManagerDropdownOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setIsManagerDropdownOpen(false)}></div>
              )}
            </div>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Physical Street Address / Campus Location</label>
            <textarea name="address" maxLength={500} value={formData.address || ''} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none" rows="2" placeholder="e.g. Building 5, Central Storage Complex, HQ"></textarea>
            <p className="text-[10px] text-gray-400 text-right mt-0.5">{(formData.address || '').length}/500</p>
          </div>
          {isUpdate && (
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Operational Status</label>
              <select name="status" value={formData.status || 'active'} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none">
                <option value="active">Active (Operational)</option>
                <option value="inactive">Inactive (Decommissioned)</option>
              </select>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCatalogForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="relative">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
          <div 
            className={`w-full border rounded-md px-3 py-2 text-sm bg-white cursor-pointer flex justify-between items-center transition-colors ${isCatalogCategoryDropdownOpen ? 'border-[#225091] ring-1 ring-[#225091]/20' : 'border-gray-300 hover:border-gray-400'}`}
            onClick={() => setIsCatalogCategoryDropdownOpen(!isCatalogCategoryDropdownOpen)}
          >
            <span className={formData.categoryId ? 'text-gray-900 font-medium' : 'text-gray-500'}>
              {formData.categoryId 
                ? `${categories.find(c => (c.id || c._id) === formData.categoryId)?.name || ''}` 
                : 'Select Category'}
            </span>
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${isCatalogCategoryDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          
          {isCatalogCategoryDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-50 max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-1">
              <div 
                className="px-3 py-2.5 text-sm hover:bg-gray-50 cursor-pointer text-gray-500 border-b border-gray-50"
                onClick={() => {
                  setFormData(prev => ({ ...prev, categoryId: '', subcategoryId: '' })); // Reset subcategory when category changes
                  setIsCatalogCategoryDropdownOpen(false);
                }}
              >
                Select Category
              </div>
              {categories.length === 0 ? (
                <div className="px-3 py-4 text-sm text-center text-gray-500">No categories found</div>
              ) : (
                categories.map((cat) => {
                  const catId = cat.id || cat._id;
                  return (
                  <div 
                    key={catId}
                    className={`px-3 py-2.5 text-sm cursor-pointer transition-colors ${formData.categoryId === catId ? 'bg-[#225091]/5 text-[#225091] font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, categoryId: catId, subcategoryId: '' })); // Reset subcategory on change
                      setIsCatalogCategoryDropdownOpen(false);
                    }}
                  >
                    {cat.name}
                  </div>
                )})
              )}
              <div 
                className={`px-3 py-2.5 text-sm cursor-pointer transition-colors border-t border-gray-100 ${formData.categoryId === 'other' ? 'bg-[#225091]/5 text-[#225091] font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                onClick={() => {
                  setFormData(prev => ({ ...prev, categoryId: 'other', subcategoryId: '' }));
                  setIsCatalogCategoryDropdownOpen(false);
                }}
              >
                Other / Miscellaneous
              </div>
            </div>
          )}
          {isCatalogCategoryDropdownOpen && (
            <div className="fixed inset-0 z-40" onClick={() => setIsCatalogCategoryDropdownOpen(false)}></div>
          )}
        </div>
        
        <div className="relative">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Subcategory (Optional)</label>
          <div 
            className={`w-full border rounded-md px-3 py-2 text-sm bg-white cursor-pointer flex justify-between items-center transition-colors ${isCatalogSubcategoryDropdownOpen ? 'border-[#225091] ring-1 ring-[#225091]/20' : 'border-gray-300 hover:border-gray-400'}`}
            onClick={() => setIsCatalogSubcategoryDropdownOpen(!isCatalogSubcategoryDropdownOpen)}
          >
            <span className={formData.subcategoryId ? 'text-gray-900 font-medium' : 'text-gray-500'}>
              {formData.subcategoryId 
                ? `${subcategories.find(s => (s.id || s._id) === formData.subcategoryId)?.name || ''}` 
                : 'Select Subcategory'}
            </span>
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${isCatalogSubcategoryDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          
          {isCatalogSubcategoryDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-50 max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-1">
              <div 
                className="px-3 py-2.5 text-sm hover:bg-gray-50 cursor-pointer text-gray-500 border-b border-gray-50"
                onClick={() => {
                  setFormData(prev => ({ ...prev, subcategoryId: '' }));
                  setIsCatalogSubcategoryDropdownOpen(false);
                }}
              >
                Select Subcategory
              </div>
              {(() => {
                const filteredSubcategories = subcategories.filter(s => {
                  if (!formData.categoryId) return true;
                  // Try to match formData.categoryId against any likely parent category reference
                  const parentRefs = [s.category, s.categoryId, s.parentCategory, s.category_id];
                  for (const ref of parentRefs) {
                    if (!ref) continue;
                    if (typeof ref === 'string' && ref === formData.categoryId) return true;
                    if (typeof ref === 'object' && (ref.id === formData.categoryId || ref._id === formData.categoryId)) return true;
                  }
                  return false;
                });
                
                if (filteredSubcategories.length === 0) {
                  return <div className="px-3 py-4 text-sm text-center text-gray-500">No subcategories found</div>;
                }
                
                return filteredSubcategories.map((sub) => {
                  const subId = sub.id || sub._id;
                  return (
                  <div 
                    key={subId}
                    className={`px-3 py-2.5 text-sm cursor-pointer transition-colors ${formData.subcategoryId === subId ? 'bg-[#225091]/5 text-[#225091] font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                    onClick={() => {
                      // Attempt to safely deduce parent category id if not already set
                      let deducedCatId = formData.categoryId;
                      if (!deducedCatId) {
                        const refs = [sub.category, sub.categoryId, sub.parentCategory, sub.category_id];
                        for (const ref of refs) {
                          if (!ref) continue;
                          if (typeof ref === 'string') { deducedCatId = ref; break; }
                          if (typeof ref === 'object' && (ref.id || ref._id)) { deducedCatId = ref.id || ref._id; break; }
                        }
                      }
                      
                      setFormData(prev => ({ 
                        ...prev, 
                        subcategoryId: subId,
                        ...(deducedCatId && { categoryId: deducedCatId })
                      }));
                      setIsCatalogSubcategoryDropdownOpen(false);
                    }}
                  >
                    {sub.name}
                  </div>
                )});
              })()}
            </div>
          )}
          {isCatalogSubcategoryDropdownOpen && (
            <div className="fixed inset-0 z-40" onClick={() => setIsCatalogSubcategoryDropdownOpen(false)}></div>
          )}
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Master SKU Name <span className="text-red-500">*</span></label>
          <input type="text" name="name" value={formData.name || ''} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none" placeholder="e.g. Dell XPS 15 9530" required />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs font-semibold text-gray-700 mb-1">SKU Code (Optional)</label>
          <input type="text" name="code" value={formData.code || ''} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none" placeholder="Leave empty to auto-generate" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Brand</label>
          <input type="text" name="brand" value={formData.brand || ''} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none" placeholder="e.g. Dell" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Model</label>
          <input type="text" name="model" value={formData.model || ''} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none" placeholder="e.g. XPS 15" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Unit of Measure <span className="text-red-500">*</span></label>
          <input type="text" name="unit" value={formData.unit || formData.unitOfMeasure || ''} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none" placeholder="e.g. Pcs, Box, Kg" required />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Item Type <span className="text-red-500">*</span></label>
          <select name="type" value={formData.type || ''} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none cursor-pointer bg-white" required>
            <option value="">Select Type</option>
            <option value="Hardware">Hardware</option>
            <option value="Software">Software</option>
            <option value="Consumable">Consumable</option>
            <option value="Furniture">Furniture</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="col-span-2 flex items-center space-x-6 mt-2">
          <div className="flex items-center space-x-2">
            <input type="checkbox" name="isSerialized" checked={formData.isSerialized || false} onChange={handleChange} id="isSerialized" className="rounded text-[#225091] focus:ring-[#225091]" />
            <label htmlFor="isSerialized" className="text-sm font-semibold text-gray-700 cursor-pointer">Is Serialized (e.g. Laptops)?</label>
          </div>
          <div className="flex items-center space-x-2">
            <input type="checkbox" name="isConsumable" checked={formData.isConsumable || false} onChange={handleChange} id="isConsumable" className="rounded text-[#225091] focus:ring-[#225091]" />
            <label htmlFor="isConsumable" className="text-sm font-semibold text-gray-700 cursor-pointer">Is Consumable (e.g. Paper)?</label>
          </div>
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
        <textarea name="description" value={formData.description || ''} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none" rows="2"></textarea>
      </div>
    </div>
  );

  const renderAdjustStockForm = () => {
    const isUpdate = !!(initialData && (initialData._id || initialData.id));
    const selectedSku = catalogItems.find(c => (c._id || c.id) === formData.itemMasterId);
    const isSerialized = selectedSku?.isSerialized || false;

    return (
      <div className="space-y-4">
        {isUpdate && (
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-800 font-medium">
            ✏️ Editing Pending Adjustment Request (<strong>{formData.adjustmentType}</strong> {formData.quantity} units for {selectedSku?.name || 'SKU'}).
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {!authUser?.branchId && (
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Target Branch <span className="text-red-500">*</span></label>
              <select 
                name="branchId" 
                value={formData.branchId || ''} 
                onChange={(e) => setFormData(prev => ({ ...prev, branchId: e.target.value, locationId: e.target.value }))} 
                className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none"
                disabled={isUpdate}
                required
              >
                <option value="">-- Select Branch --</option>
                {branches.map(b => (
                  <option key={b.id || b._id} value={b.id || b._id}>{b.name || b.branchName || b.code}</option>
                ))}
              </select>
            </div>
          )}

          <div className={!authUser?.branchId ? "col-span-2 sm:col-span-1" : "col-span-2"}>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Target SKU / Item <span className="text-red-500">*</span></label>
            <select 
              name="itemMasterId" 
              value={formData.itemMasterId || ''} 
              onChange={handleChange} 
              className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none"
              disabled={isUpdate}
              required
            >
              <option value="">-- Select Catalog SKU --</option>
              {catalogItems.map(item => (
                <option key={item.id || item._id} value={item.id || item._id}>
                  {item.name} ({item.code || item.skuCode || 'N/A'}) {item.isSerialized ? '[Serialized]' : '[Consumable]'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Adjustment Type <span className="text-red-500">*</span></label>
            <select 
              name="adjustmentType" 
              value={formData.adjustmentType || ''} 
              onChange={handleChange} 
              className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none bg-white"
              required
            >
              <option value="">-- Select Type --</option>
              <option value="INCREASE">➕ INCREASE (Add Stock / Found Item)</option>
              <option value="DECREASE">➖ DECREASE (Deduct Stock / Write-down)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Quantity <span className="text-red-500">*</span></label>
            <input 
              type="number" 
              name="quantity" 
              min="1" 
              step="1"
              value={formData.quantity || ''} 
              onChange={handleChange} 
              className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none" 
              placeholder="e.g. 2"
              required 
            />
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Reason <span className="text-red-500">*</span></label>
            <select 
              name="reason" 
              value={formData.reason || ''} 
              onChange={handleChange} 
              className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none bg-white"
              required
            >
              <option value="">-- Select Discrepancy Reason --</option>
              <option value="DAMAGE">DAMAGE (Physical damage / Broken)</option>
              <option value="LOST">LOST (Missing or unaccounted)</option>
              <option value="AUDIT_DISCREPANCY">AUDIT_DISCREPANCY (Physical audit mismatch)</option>
              <option value="RECOVERY">RECOVERY (Found previously missing items)</option>
              <option value="EXPIRED">EXPIRED (Shelf-life / Warranty expired)</option>
            </select>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Location Scope</label>
            <select 
              name="locationType" 
              value={formData.locationType || 'Branch'} 
              onChange={handleChange} 
              className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none bg-white"
              disabled={isUpdate}
            >
              <option value="Branch">Branch</option>
              <option value="CentralInventory">Central Inventory Warehouse</option>
            </select>
          </div>

          {isSerialized && (
            <div className="col-span-2 bg-indigo-50/70 border border-indigo-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-indigo-900">
                  Serialized Asset Tag (Optional / Specific Item)
                </label>
                {loadingAssets && <span className="text-[10px] text-indigo-600 animate-pulse">Loading active assets...</span>}
              </div>
              <select 
                name="assetId" 
                value={formData.assetId || ''} 
                onChange={handleChange} 
                className="w-full border border-indigo-200 rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none bg-white"
              >
                <option value="">-- Select Specific Asset (or leave blank for bulk count) --</option>
                {availableAssets.map(ast => (
                  <option key={ast._id || ast.id} value={ast._id || ast.id}>
                    {ast.assetTag} {ast.serialNumber ? `(SN: ${ast.serialNumber})` : ''} - Status: {ast.status}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-indigo-700 mt-1">
                Select the specific physical asset if reporting damage or loss for a serialized unit.
              </p>
            </div>
          )}

          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Audit Trail Remarks / Reason</label>
            <textarea 
              name="remarks" 
              maxLength={500}
              value={formData.remarks || ''} 
              onChange={handleChange} 
              className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none" 
              rows="2"
              placeholder="e.g. Found water leakage damage during quarterly audit in storeroom bin 4"
            ></textarea>
            <p className="text-[10px] text-gray-400 text-right mt-0.5">{(formData.remarks || '').length}/500</p>
          </div>
        </div>
      </div>
    );
  };

  const renderRequestForm = () => {
    const items = formData.items && formData.items.length > 0 ? formData.items : [{ categoryId: '', subcategoryId: '', itemMasterId: '', quantity: 1 }];
    
    // Filter employees by selected branch
    const filteredEmployees = formData.branchId 
      ? employees.filter(emp => {
          const empBranch = emp.branchId?._id || emp.branchId?.id || emp.branchId || emp.branch;
          return empBranch === formData.branchId;
        })
      : employees;
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {!authUser?.branchId && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Branch ID <span className="text-red-500">*</span></label>
              <select name="branchId" value={formData.branchId || ''} onChange={(e) => setFormData(prev => ({ ...prev, branchId: e.target.value, employeeId: '' }))} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none">
                <option value="">-- Select Branch --</option>
                {branches.map(branch => (
                  <option key={branch._id || branch.id} value={branch._id || branch.id}>{branch.name || branch.branchName || branch.code}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Employee <span className="text-red-500">*</span></label>
            <select name="employeeId" value={formData.employeeId || ''} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none">
              <option value="">-- Select Employee --</option>
              {filteredEmployees.map(emp => {
                const baseName = emp.name || (emp.userId && emp.userId.name) || (emp.firstName ? `${emp.firstName} ${emp.lastName || ''}` : '') || 'Unknown Employee';
                const empName = `${baseName} (${emp.employeeId || 'N/A'})`;
                return (
                  <option key={emp._id || emp.id} value={emp._id || emp.id}>
                    {empName}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Remarks / Reason</label>
            <input type="text" name="remarks" value={formData.remarks || ''} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none" placeholder="e.g. Required for new staff onboarding" />
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-semibold text-gray-700">Requested Items</label>
            <button type="button" onClick={handleAddItemRow} className="text-xs text-[#225091] font-semibold hover:underline flex items-center gap-1">
              + Add Another Item
            </button>
          </div>
          
          <div className="space-y-3">
            {items.map((item, index) => {
              // Filter subcategories by selected category
              const filteredSubcategories = subcategories.filter(sub => {
                if (!item.categoryId) return true;
                const refs = [sub.category, sub.categoryId, sub.parentCategory, sub.category_id];
                return refs.some(ref => {
                  if (!ref) return false;
                  if (typeof ref === 'string') return ref === item.categoryId;
                  if (typeof ref === 'object') return (ref.id || ref._id) === item.categoryId;
                  return false;
                });
              });

              // Filter items by category and subcategory
              const filteredItems = catalogItems.filter(catItem => {
                let match = true;
                if (item.categoryId) {
                  const catRefs = [catItem.category, catItem.categoryId, catItem.parentCategory, catItem.category_id];
                  const hasCatMatch = catRefs.some(ref => {
                    if (!ref) return false;
                    if (typeof ref === 'string') return ref === item.categoryId;
                    if (typeof ref === 'object') return (ref.id || ref._id) === item.categoryId;
                    return false;
                  });
                  if (!hasCatMatch) match = false;
                }
                if (item.subcategoryId) {
                  const subRefs = [catItem.subcategory, catItem.subcategoryId, catItem.sub_category_id];
                  const hasSubMatch = subRefs.some(ref => {
                    if (!ref) return false;
                    if (typeof ref === 'string') return ref === item.subcategoryId;
                    if (typeof ref === 'object') return (ref.id || ref._id) === item.subcategoryId;
                    return false;
                  });
                  if (!hasSubMatch) match = false;
                }
                return match;
              });

              return (
                <div key={index} className="border border-gray-100 p-3 rounded-lg bg-gray-50 flex gap-2 items-start relative">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <select 
                      value={item.categoryId || ''} 
                      onChange={(e) => {
                        handleItemChange(index, 'categoryId', e.target.value);
                        handleItemChange(index, 'subcategoryId', ''); // reset child
                        handleItemChange(index, 'itemMasterId', ''); // reset child
                      }} 
                      className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none"
                    >
                      <option value="">Select Category...</option>
                      {categories.map(c => (
                        <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
                      ))}
                    </select>

                    <select 
                      value={item.subcategoryId || ''} 
                      onChange={(e) => {
                        handleItemChange(index, 'subcategoryId', e.target.value);
                        handleItemChange(index, 'itemMasterId', ''); // reset child
                      }} 
                      className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none"
                    >
                      <option value="">Select Subcategory...</option>
                      {filteredSubcategories.map(sub => (
                        <option key={sub._id || sub.id} value={sub._id || sub.id}>{sub.name}</option>
                      ))}
                    </select>

                    <select 
                      value={item.itemMasterId || ''} 
                      onChange={(e) => handleItemChange(index, 'itemMasterId', e.target.value)} 
                      className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none"
                    >
                      <option value="">Select Item (SKU)...</option>
                      {filteredItems.map(c => (
                        <option key={c._id || c.id} value={c._id || c.id}>
                          {c.name} ({c.code || c.skuCode})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-20">
                    <input 
                      type="number" 
                      min="1" 
                      value={item.quantity || ''} 
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} 
                      className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none text-center" 
                      placeholder="Qty" 
                    />
                  </div>
                  {items.length > 1 && (
                    <button type="button" onClick={() => handleRemoveItemRow(index)} className="p-2 text-gray-400 hover:text-red-500 transition-colors bg-white border rounded-md shadow-sm">
                      <X size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderAssetForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Item Master (SKU) <span className="text-red-500">*</span></label>
          <select name="itemMasterId" value={formData.itemMasterId || ''} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none">
            <option value="">Select Item (SKU)...</option>
            {catalogItems.map(c => (
              <option key={c._id || c.id} value={c._id || c.id}>{c.name} ({c.code || c.skuCode})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Asset Tag <span className="text-red-500">*</span></label>
          <input type="text" name="assetTag" value={formData.assetTag || ''} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none uppercase" placeholder="e.g. AST-001" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Serial Number</label>
          <input type="text" name="serialNumber" value={formData.serialNumber || ''} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none" placeholder="e.g. SN-987654321" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Condition</label>
          <select name="condition" value={formData.condition || 'new'} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none">
            <option value="new">New</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="damaged">Damaged</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Current Location Type <span className="text-red-500">*</span></label>
          <select name="currentLocationType" value={formData.currentLocationType || 'CentralInventory'} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none">
            <option value="CentralInventory">Central Warehouse</option>
            <option value="Branch">Branch</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Select Location <span className="text-red-500">*</span></label>
          <select name="currentLocationId" value={formData.currentLocationId || ''} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none">
            <option value="">Select Location...</option>
            {(formData.currentLocationType === 'Branch' ? branches : centralWarehouses).map(loc => (
              <option key={loc._id || loc.id} value={loc._id || loc.id}>{loc.name || loc.branchName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Purchase Date</label>
          <input type="date" name="purchaseDate" value={formData.purchaseDate || ''} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Purchase Price</label>
          <input type="number" name="purchasePrice" value={formData.purchasePrice || ''} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none" placeholder="0.00" />
        </div>
      </div>
    </div>
  );

  const renderIssueAssetForm = () => {
    // Only allow assignment if asset is active and in inventory
    const isAvailable = initialData?.status === 'active' && initialData?.currentLocationType !== 'User';

    return (
      <div className="space-y-4">
        <div className="bg-blue-50 p-3 rounded-lg mb-4 border border-blue-100">
          <p className="text-sm font-semibold text-[#225091]">Assigning Asset: {initialData?.assetTag}</p>
          <p className="text-xs text-gray-600">Item: {typeof initialData?.itemMasterId === 'object' ? initialData?.itemMasterId?.name : initialData?.itemName}</p>
        </div>

        {!isAvailable && (
          <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg">
            <p className="text-xs font-semibold text-rose-700">Warning: This asset is either inactive or already assigned. The submission may be rejected by the server.</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {branches && branches.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Assignment Branch (Optional)</label>
              <select name="branchId" value={formData.branchId || ''} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none">
                <option value="">Default (Your Branch)</option>
                {branches.map(b => (
                  <option key={b._id || b.id} value={b._id || b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Select Employee <span className="text-red-500">*</span></label>
            <select name="assignedTo" value={formData.assignedTo || ''} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none">
              <option value="">Select Employee...</option>
              {employees.map(emp => (
                <option key={emp._id || emp.id} value={emp._id || emp.id}>{emp.name || emp.fullName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Initial Condition</label>
            <select name="condition" value={formData.condition || 'good'} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none">
              <option value="new">New</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Remarks</label>
            <textarea name="remarks" maxLength={500} value={formData.remarks || ''} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none" rows="2" placeholder="e.g. Issued for Q3 audit operations (Max 500 chars)"></textarea>
            <p className="text-[10px] text-gray-400 text-right mt-0.5">{(formData.remarks || '').length}/500</p>
          </div>
        </div>
      </div>
    );
  };

  const renderLifecycleForm = (showCondition = false, conditionOptions = [], instructionText = '') => (
    <div className="space-y-4">
      <div className="bg-blue-50 p-3 rounded-lg mb-4 border border-blue-100">
        <p className="text-sm font-semibold text-[#225091]">Asset: {initialData?.assetTag} {initialData?.serialNumber ? `(${initialData.serialNumber})` : ''}</p>
        <p className="text-xs text-gray-600">Item: {typeof initialData?.itemMasterId === 'object' ? initialData?.itemMasterId?.name : initialData?.itemName}</p>
        {instructionText && <p className="text-xs text-[#225091] mt-2 italic">{instructionText}</p>}
      </div>
      
      {showCondition && (
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Condition Update <span className="text-red-500">*</span></label>
          <select name="condition" value={formData.condition || ''} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none">
            <option value="">Select Condition...</option>
            {conditionOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}
      
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Remarks / Notes {['report_damage', 'request_disposal', 'report_lost'].includes(modalType) && <span className="text-red-500">*</span>}</label>
        <textarea name="remarks" value={formData.remarks || ''} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none" rows="3" placeholder="Enter remarks..."></textarea>
      </div>
    </div>
  );

  const renderTransferForm = () => {
    const items = formData.items && formData.items.length > 0 ? formData.items : [{ itemMasterId: '', quantity: 1 }];
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Source Type <span className="text-red-500">*</span></label>
            <select name="fromLocationType" value={formData.fromLocationType || 'CentralInventory'} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none">
              <option value="CentralInventory">Central Warehouse</option>
              <option value="Branch">Branch</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Source Location <span className="text-red-500">*</span></label>
            <select name="fromLocationId" value={formData.fromLocationId || ''} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none">
              <option value="">Select Source...</option>
              {(formData.fromLocationType === 'Branch' ? branches : centralWarehouses).map(loc => (
                <option key={loc._id || loc.id} value={loc._id || loc.id}>{loc.name || loc.branchName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Destination Type <span className="text-red-500">*</span></label>
            <select name="toLocationType" value={formData.toLocationType || 'Branch'} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none">
              <option value="CentralInventory">Central Warehouse</option>
              <option value="Branch">Branch</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Destination Location <span className="text-red-500">*</span></label>
            <select name="toLocationId" value={formData.toLocationId || ''} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none">
              <option value="">Select Destination...</option>
              {(formData.toLocationType === 'Branch' ? branches : centralWarehouses).map(loc => (
                <option key={loc._id || loc.id} value={loc._id || loc.id}>{loc.name || loc.branchName}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Remarks</label>
            <input type="text" name="remarks" value={formData.remarks || ''} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none" placeholder="e.g. Relocating extra stock" />
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-semibold text-gray-700">Items to Transfer</label>
            <button type="button" onClick={handleAddItemRow} className="text-xs text-[#225091] font-semibold hover:underline flex items-center gap-1">
              + Add Item
            </button>
          </div>
          
          <div className="space-y-2 border border-gray-100 p-3 rounded-lg bg-gray-50">
            {items.map((item, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-1">
                  <select 
                    value={item.itemMasterId || ''} 
                    onChange={(e) => handleItemChange(index, 'itemMasterId', e.target.value)} 
                    className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none"
                  >
                    <option value="">Select Item (SKU)...</option>
                    {catalogItems.map(c => (
                      <option key={c._id || c.id} value={c._id || c.id}>{c.name} ({c.code || c.skuCode})</option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <input 
                    type="number" 
                    min="1" 
                    value={item.quantity || ''} 
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} 
                    className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none text-center" 
                    placeholder="Qty" 
                  />
                </div>
                {items.length > 1 && (
                  <button type="button" onClick={() => handleRemoveItemRow(index)} className="p-2 text-gray-400 hover:text-red-500 transition-colors bg-white border rounded-md shadow-sm">
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderApproveAdjustment = () => (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl mb-4">
        <h4 className="text-emerald-800 font-bold text-sm mb-2">Are you sure you want to approve this adjustment?</h4>
        <div className="text-xs text-emerald-700 space-y-1 font-medium">
          <p><strong>Item:</strong> {typeof initialData?.itemMasterId === 'object' ? initialData?.itemMasterId?.name : initialData?.itemName}</p>
          <p><strong>Adjustment:</strong> {initialData?.adjustmentType === 'INCREASE' ? '+' : '-'} {initialData?.quantity} units ({initialData?.adjustmentType})</p>
          <p><strong>Reason:</strong> {initialData?.reason}</p>
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Approval Remarks (Optional)</label>
        <textarea name="remarks" value={formData.remarks || ''} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none" rows="3" placeholder="e.g. Physical count confirmed with branch officer"></textarea>
      </div>
    </div>
  );

  const renderRejectAdjustment = () => (
    <div className="space-y-4">
      <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl mb-4">
        <h4 className="text-rose-800 font-bold text-sm mb-2">Reject Stock Adjustment</h4>
        <p className="text-xs text-rose-700 font-medium">Stock balance will not be modified. Please provide a mandatory rejection reason for the audit trail.</p>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Rejection Reason <span className="text-red-500">*</span></label>
        <textarea name="remarks" value={formData.remarks || ''} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none" rows="3" placeholder="e.g. Verification shows items are undamaged in storage bin 3"></textarea>
      </div>
    </div>
  );

  const renderDispatchTransferForm = () => {
    const serializedItems = (initialData?.items || []).filter(it => {
      let isSer = it.itemMasterId?.isSerialized ?? it.isSerialized;
      if (isSer === undefined) {
        const skuId = typeof it.itemMasterId === 'object' ? (it.itemMasterId._id || it.itemMasterId.id) : it.itemMasterId;
        const catalogMatch = catalogItems.find(c => (c._id || c.id) === skuId);
        isSer = catalogMatch?.isSerialized;
      }
      return isSer;
    });
    
    return (
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-4">
          <h4 className="text-amber-800 font-bold text-sm mb-2">Dispatch Transfer Shipment</h4>
          <p className="text-xs text-amber-700 font-medium">Please review line items. Serialized items require scanning of explicit Asset Tags before dispatch.</p>
        </div>
        {serializedItems.map((item, idx) => {
          const qty = item.quantity;
          const skuName = item.itemMasterId?.name || item.itemName || 'Unknown Item';
          const skuId = item.itemMasterId?._id || item.itemMasterId;
          
          return (
            <div key={idx} className="border border-gray-200 p-3 rounded-lg bg-gray-50/50">
              <h5 className="text-xs font-bold text-[#225091] mb-2">{skuName} (Quantity: {qty})</h5>
              <div className="space-y-2">
                {Array.from({ length: qty }).map((_, i) => (
                  <input
                    key={i}
                    type="text"
                    placeholder={`Scan or enter Asset Tag #${i + 1}`}
                    value={formData[`assetTag_${skuId}_${i}`] || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, [`assetTag_${skuId}_${i}`]: e.target.value.toUpperCase() }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:border-[#225091] focus:outline-none uppercase"
                  />
                ))}
              </div>
            </div>
          );
        })}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Dispatch Remarks / Courier Details</label>
          <textarea name="remarks" value={formData.remarks || ''} onChange={handleChange} className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none" rows="3" placeholder="e.g. Dispatched via DTDC AWB #123456"></textarea>
        </div>
      </div>
    );
  };

  const renderViewDetails = () => {
    const req = initialData || {};
    return (
      <div className="space-y-4">
        {/* Detail View */}
        <div className="bg-slate-50 border border-gray-200 rounded-xl p-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Request ID</p>
              <p className="text-sm font-semibold text-slate-800">{req.code || req.requisitionId || (req.fromLocationType ? 'TRF-' + (req._id || req.id || '').slice(-5).toUpperCase() : null) || (req.adjustmentType ? 'ADJ-' + (req._id || req.id || '').slice(-5).toUpperCase() : 'REQ-XXX')}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold mt-1 ${req.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : req.status === 'APPROVED' ? 'bg-blue-100 text-[#225091]' : req.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' : req.status === 'DISPATCHED' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {req.status || 'PENDING'}
              </span>
            </div>
            {req.fromLocationType ? (
              <div className="col-span-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Route</p>
                <p className="text-sm font-semibold text-slate-800">{req.fromLocationId?.name || req.fromLocationId} &rarr; {req.toLocationId?.name || req.toLocationId}</p>
              </div>
            ) : (
              <div className="col-span-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Branch</p>
                <p className="text-sm font-semibold text-slate-800">{req.branchId?.name || 'Branch'}</p>
              </div>
            )}
            <div className="col-span-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Remarks</p>
              <p className="text-sm text-slate-700">{req.remarks || 'N/A'}</p>
            </div>
          </div>
          
          <h4 className="text-[11px] font-bold text-[#225091] uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">Requested Items</h4>
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-200">
                <th className="font-semibold py-2">Item</th>
                <th className="font-semibold py-2 text-right">Quantity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {req.items && req.items.length > 0 ? (
                req.items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="py-2 text-slate-700 font-medium">{typeof it.itemMasterId === 'object' ? it.itemMasterId.name : (it.itemName || it.itemMasterId)}</td>
                    <td className="py-2 text-right font-bold text-slate-900">{it.quantity}</td>
                  </tr>
                ))
              ) : (req.itemMasterId && (
                <tr>
                  <td className="py-2 text-slate-700 font-medium">
                    {typeof req.itemMasterId === 'object' ? req.itemMasterId.name : req.itemMasterId}
                    <br/><span className="text-[10px] text-gray-400 font-normal">Reason: {req.reason || 'N/A'}</span>
                  </td>
                  <td className={`py-2 text-right font-bold ${req.adjustmentType === 'DECREASE' ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {req.adjustmentType === 'INCREASE' ? '+' : '-'}{req.quantity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Action Buttons Container */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">Close</button>
          
          {req.status === 'PENDING' && permissions && (
            <>
              {((req.adjustmentType && permissions.canApproveAdjustments) || 
                ((req.transferId || req.type === 'Transfer') && permissions.canApproveTransfers) ||
                (!(req.adjustmentType || req.transferId || req.type === 'Transfer') && permissions.canApproveRequisitions)) && (
                <>
                  <button onClick={() => onChangeModalType(req.type === 'Transfer' || req.transferId ? 'reject_transfer' : req.adjustmentType ? 'reject_adjustment' : 'reject_request')} className="px-4 py-2 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-lg text-sm font-semibold transition-colors">Reject</button>
                  <button onClick={() => onChangeModalType(req.type === 'Transfer' || req.transferId ? 'approve_transfer' : req.adjustmentType ? 'approve_adjustment' : 'approve_request')} className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-sm font-semibold transition-colors shadow-sm">Approve</button>
                </>
              )}
            </>
          )}
          {req.status === 'APPROVED' && !req.adjustmentType && !(req.transferId || req.type === 'Transfer') && permissions?.canApproveRequisitions && (
            <button onClick={() => onChangeModalType('fulfill_request')} className="px-4 py-2 bg-[#225091] text-white hover:bg-[#193e73] rounded-lg text-sm font-semibold transition-colors shadow-sm">Fulfill Requisition</button>
          )}
          {req.status === 'APPROVED' && (req.transferId || req.type === 'Transfer') && permissions?.canApproveTransfers && (
            <button onClick={() => onChangeModalType('dispatch_transfer')} className="px-4 py-2 bg-amber-600 text-white hover:bg-amber-700 rounded-lg text-sm font-semibold transition-colors shadow-sm">Dispatch Transfer</button>
          )}
          {req.status === 'DISPATCHED' && (req.transferId || req.type === 'Transfer') && (
            <button onClick={() => onChangeModalType('receive_transfer')} className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-sm font-semibold transition-colors shadow-sm">Receive Transfer</button>
          )}
        </div>
      </div>
    );
  };

  const renderLogDetails = () => {
    const log = initialData || {};
    const details = log.details || {};
    return (
      <div className="space-y-4">
        <div className="bg-slate-50 border border-gray-200 rounded-xl p-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Transaction ID</p>
              <p className="text-sm font-semibold text-slate-800 font-mono">{log._id || log.id}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Timestamp</p>
              <p className="text-sm font-semibold text-slate-800">{new Date(log.createdAt || log.timestamp || Date.now()).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Action Type</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold mt-1 ${log.actionType === 'STOCK_IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-[#225091]'}`}>
                {log.actionType || log.type}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Performed By</p>
              <p className="text-sm font-semibold text-slate-800">
                {typeof log.user === 'object' ? (log.user?.fullName || log.user?.name || log.user?.email) : (typeof log.performedBy === 'object' ? log.performedBy?.fullName : log.performedBy || log.user || 'System')}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Entity Details</p>
              <p className="text-sm font-medium text-slate-700">Entity Type: {log.entityType}</p>
              {log.referenceType && <p className="text-sm font-medium text-slate-700">Ref Type: {log.referenceType}</p>}
              {log.quantity && <p className="text-sm font-medium text-slate-700">Quantity: {log.quantity}</p>}
            </div>
            <div className="col-span-2 bg-white p-4 rounded-xl border border-gray-100 mt-2 shadow-xs">
              <p className="text-[10px] font-bold text-[#225091] uppercase tracking-wider mb-3 border-b border-gray-100 pb-2">Additional Payload</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(details).filter(([key]) => key !== 'remarks').map(([key, value]) => (
                  <div key={key} className="bg-slate-50/70 px-3 py-2.5 rounded-lg border border-slate-100 flex flex-col">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="text-xs font-semibold text-slate-700 break-words">
                      {typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
                {Object.keys(details).filter(k => k !== 'remarks').length === 0 && (
                  <div className="col-span-full text-xs text-gray-400 italic">No additional payload data.</div>
                )}
              </div>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Remarks</p>
              <p className="text-sm text-slate-700 bg-amber-50 p-3 rounded-lg border border-amber-100 italic">{log.remarks || details.remarks || 'No remarks provided.'}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 bg-[#225091] text-white rounded-lg text-sm font-semibold hover:bg-[#193e73] transition-colors shadow-sm">Close</button>
        </div>
      </div>
    );
  };
  const renderDirectIssueForm = () => {
    // Filter employees by branch
    const filteredEmployees = formData.branchId 
      ? employees.filter(emp => {
          const empBranch = emp.branchId?._id || emp.branchId?.id || emp.branchId || emp.branch;
          return empBranch === formData.branchId;
        })
      : employees;

    const selectedSku = catalogItems.find(c => (c._id || c.id) === formData.itemMasterId);
    const isSerialized = selectedSku?.isSerialized;

    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg">
          <p className="text-xs font-semibold text-[#225091]">Direct Counter Issue (Immediate Handover without Prior Requisition)</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {!authUser?.branchId && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Branch <span className="text-red-500">*</span></label>
              <select 
                name="branchId" 
                value={formData.branchId || ''} 
                onChange={(e) => setFormData(prev => ({ ...prev, branchId: e.target.value, employeeId: '' }))} 
                className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none"
                required
              >
                <option value="">-- Select Branch --</option>
                {branches.map(b => (
                  <option key={b._id || b.id} value={b._id || b.id}>{b.name || b.branchName}</option>
                ))}
              </select>
            </div>
          )}
          <div className={!authUser?.branchId ? "" : "col-span-2"}>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Employee Recipient <span className="text-red-500">*</span></label>
            <select 
              name="employeeId" 
              value={formData.employeeId || ''} 
              onChange={handleChange} 
              className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none"
              required
            >
              <option value="">-- Select Employee --</option>
              {filteredEmployees.map(emp => {
                const baseName = emp.name || (emp.userId && emp.userId.name) || (emp.firstName ? `${emp.firstName} ${emp.lastName || ''}` : '') || 'Unknown';
                return (
                  <option key={emp._id || emp.id} value={emp._id || emp.id}>{baseName} ({emp.employeeId || 'N/A'})</option>
                );
              })}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Item SKU <span className="text-red-500">*</span></label>
            <select 
              name="itemMasterId" 
              value={formData.itemMasterId || ''} 
              onChange={handleChange} 
              className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none"
              required
            >
              <option value="">-- Select Item (SKU) --</option>
              {catalogItems.map(c => (
                <option key={c._id || c.id} value={c._id || c.id}>{c.name} ({c.code || c.skuCode || 'N/A'}) {c.isSerialized ? '— [Serialized Asset]' : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Quantity <span className="text-red-500">*</span></label>
            <input 
              type="number" 
              min="1" 
              name="quantity" 
              value={formData.quantity || ''} 
              onChange={handleChange} 
              className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none" 
              placeholder="e.g. 1" 
              required 
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-gray-700">
                Asset Tag(s) {isSerialized ? <span className="text-red-500">*</span> : <span className="text-gray-400 font-normal">(Consumable)</span>}
              </label>
              {isSerialized && formData.quantity > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  (formData.assetTags ? (Array.isArray(formData.assetTags) ? formData.assetTags.length : formData.assetTags.split(',').filter(s => s.trim()).length) : 0) === Number(formData.quantity)
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  Tags: {formData.assetTags ? (Array.isArray(formData.assetTags) ? formData.assetTags.length : formData.assetTags.split(',').filter(s => s.trim()).length) : 0} / {formData.quantity}
                </span>
              )}
            </div>
            <input 
              type="text" 
              name="assetTags" 
              value={formData.assetTags || ''} 
              onChange={handleChange} 
              className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none uppercase disabled:bg-gray-100 disabled:text-gray-400" 
              placeholder={isSerialized ? "Comma-separated tags (e.g. AST-001, AST-002...)" : "N/A — bulk consumable SKU"} 
              disabled={!isSerialized}
            />
            {isSerialized ? (
              <p className="text-[10px] text-amber-600 mt-1">
                ⚠️ This SKU is configured as <strong>Serialized</strong>. Enter exactly <strong>{formData.quantity || 1}</strong> asset tag(s). Click on available tags below to select them.
              </p>
            ) : (
              <p className="text-[10px] text-gray-400 mt-1">Bulk consumable item. No unique asset tags needed.</p>
            )}
          </div>

          {isSerialized && (
            <div className="col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700">Available Asset Tags in Branch Stock ({availableAssets.length}):</span>
                {loadingAssets && <span className="text-[10px] text-[#225091] animate-pulse">Loading branch assets...</span>}
              </div>
              {availableAssets.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {availableAssets.map(ast => {
                    const currentTags = (formData.assetTags || '').split(',').map(s => s.trim()).filter(Boolean);
                    const isSelected = currentTags.includes(ast.assetTag);
                    return (
                      <button
                        key={ast._id || ast.id}
                        type="button"
                        onClick={() => {
                          let nextTags;
                          if (isSelected) {
                            nextTags = currentTags.filter(t => t !== ast.assetTag);
                          } else {
                            nextTags = [...currentTags, ast.assetTag];
                          }
                          setFormData(prev => ({ ...prev, assetTags: nextTags.join(', ') }));
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer border shadow-2xs ${
                          isSelected 
                            ? 'bg-[#225091] text-white border-[#225091] ring-2 ring-[#225091]/20' 
                            : 'bg-white text-slate-700 border-gray-300 hover:border-[#225091] hover:bg-blue-50/50'
                        }`}
                        title={`Serial Number: ${ast.serialNumber || 'N/A'} | Condition: ${ast.condition}`}
                      >
                        {ast.assetTag} {ast.serialNumber ? `(${ast.serialNumber})` : ''} {isSelected ? '✓' : '+'}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                  ⚠️ <strong>No active physical assets available at this branch for this SKU.</strong>
                  <p className="text-[11px] text-amber-700 mt-1">
                    To issue this serialized item, you must either register assets at this branch (via <em>Register Asset</em>) or receive stock via <em>Stock Transfer</em> from Central Store.
                  </p>
                </div>
              )}
            </div>
          )}
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Remarks</label>
            <textarea 
              name="remarks" 
              value={formData.remarks || ''} 
              onChange={handleChange} 
              className="w-full border rounded-md px-3 py-2 text-sm focus:border-[#225091] focus:outline-none" 
              rows="2" 
              placeholder="e.g. Direct counter handover for urgent customer meeting"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderStockShortageModal = () => {
    const missing = stockShortageData?.missingItems || [];
    return (
      <div className="space-y-4">
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl">
          <h4 className="text-rose-800 font-bold text-sm mb-1">Stock Shortage at Branch (HTTP 422)</h4>
          <p className="text-xs text-rose-700">Stock missing at branch. Please initiate an inter-location stock transfer from Central Warehouse to fulfill this requisition.</p>
        </div>

        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 border-b border-gray-200 font-bold text-gray-600">
              <tr>
                <th className="py-2.5 px-3">Item / SKU</th>
                <th className="py-2.5 px-3 text-center">Type</th>
                <th className="py-2.5 px-3 text-center">Requested</th>
                <th className="py-2.5 px-3 text-center">Available</th>
                <th className="py-2.5 px-3 text-center text-rose-600 font-bold">Shortage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {missing.map((m, idx) => (
                <tr key={idx} className="hover:bg-rose-50/20">
                  <td className="py-2.5 px-3 font-semibold text-gray-800">
                    {m.name || m.itemMasterId}
                    {m.code && <div className="text-[10px] text-gray-400 font-mono">{m.code}</div>}
                  </td>
                  <td className="py-2.5 px-3 text-center">{m.isSerialized ? <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold">Serialized</span> : <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">Consumable</span>}</td>
                  <td className="py-2.5 px-3 text-center font-bold text-gray-700">{m.requestedQuantity}</td>
                  <td className="py-2.5 px-3 text-center text-gray-500">{m.availableQuantity ?? 0}</td>
                  <td className="py-2.5 px-3 text-center font-bold text-rose-600">+{m.shortageQuantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600">
          Click below to auto-populate an Inter-Location Transfer request for these missing items.
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
          <button 
            type="button"
            onClick={() => setStockShortageData(null)} 
            className="px-3.5 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Back to Form
          </button>
          <button 
            type="button"
            onClick={() => {
              const transferItems = missing.map(m => ({
                itemMasterId: m.itemMasterId,
                quantity: m.shortageQuantity
              }));
              const destBranchId = initialData?.branchId?._id || initialData?.branchId || authUser?.branchId || '';
              setStockShortageData(null);
              setFormData({
                fromLocationType: 'CentralInventory',
                fromLocationId: '',
                toLocationType: 'Branch',
                toLocationId: destBranchId,
                remarks: `Auto-generated transfer for Requisition shortage (${missing.map(m => m.name || m.code).join(', ')})`,
                items: transferItems.length > 0 ? transferItems : [{ itemMasterId: '', quantity: 1 }]
              });
              if (onChangeModalType) {
                onChangeModalType('transfers');
              }
            }}
            className="px-4 py-2 bg-[#225091] text-white hover:bg-[#193e73] rounded-lg text-xs font-semibold transition-colors shadow-sm cursor-pointer"
          >
            Request Transfer from Central Warehouse &rarr;
          </button>
        </div>
      </div>
    );
  };

  const getFormTitle = () => {
    if (stockShortageData) return '⚠️ Stock Shortage Alert';
    switch (modalType) {
      case 'vendors': return 'Add New Vendor';
      case 'categories': return 'Add New Category';
      case 'subcategories': return 'Add New Subcategory';
      case 'central': return 'Add Central Warehouse';
      case 'catalog': return 'Create Catalog Item (SKU)';
      case 'adjust_stock': return 'Adjust Stock Level (Stock-In)';
      case 'approve_adjustment': return 'Approve Stock Adjustment';
      case 'reject_adjustment': return 'Reject Stock Adjustment';
      case 'requests': return 'Submit Employee/Branch Requisition';
      case 'direct_issue': return 'Direct Counter Issue';
      case 'assets': return 'Register New Asset';
      case 'assign_asset': return 'Assign Asset to Employee';
      case 'return_asset': return 'Return Asset from Employee';
      case 'report_damage': return 'Report Asset Damage';
      case 'complete_repair': return 'Complete Asset Repair';
      case 'request_disposal': return 'Request Asset Disposal';
      case 'approve_disposal': return 'Approve Asset Disposal';
      case 'report_lost': return 'Report Asset Lost';
      case 'recover_asset': return 'Recover Lost Asset';
      case 'transfers': return 'Submit Stock Transfer';
      case 'approve_transfer': return 'Approve Transfer';
      case 'reject_transfer': return 'Reject Transfer';
      case 'dispatch_transfer': return 'Dispatch Transfer';
      case 'receive_transfer': return 'Receive Transfer';
      case 'approve_request': return 'Approve Requisition';
      case 'reject_request': return 'Reject Requisition';
      case 'fulfill_request': return 'Fulfill Requisition';
      case 'view_details': return 'Request Details';
      case 'log_details': return 'Audit Trail Record';
      default: return 'Add Record';
    }
  };

  const getFormBody = () => {
    if (stockShortageData) return renderStockShortageModal();
    switch (modalType) {
      case 'vendors': return renderVendorForm();
      case 'categories': return renderCategoryForm();
      case 'subcategories': return renderSubcategoryForm();
      case 'central': return renderCentralForm();
      case 'catalog': return renderCatalogForm();
      case 'adjust_stock': return renderAdjustStockForm();
      case 'approve_adjustment': return renderApproveAdjustment();
      case 'reject_adjustment': return renderRejectAdjustment();
      case 'requests': return renderRequestForm();
      case 'direct_issue': return renderDirectIssueForm();
      case 'assets': return renderAssetForm();
      case 'assign_asset': return renderIssueAssetForm();
      case 'transfers': return renderTransferForm();
      case 'return_asset': return renderLifecycleForm(true, [{value: 'new', label: 'New'}, {value: 'good', label: 'Good'}, {value: 'fair', label: 'Fair'}, {value: 'damaged', label: 'Damaged'}], 'Returning asset to Branch Pool.');
      case 'report_damage': return renderLifecycleForm(false, [], 'Marking asset as damaged and moving to maintenance. Please provide detailed remarks.');
      case 'complete_repair': return renderLifecycleForm(true, [{value: 'good', label: 'Good'}, {value: 'fair', label: 'Fair'}], 'Restoring asset back to active pool.');
      case 'request_disposal': return renderLifecycleForm(false, [], 'Submitting write-off request for Branch Manager approval.');
      case 'approve_disposal': return renderLifecycleForm(false, [], 'Approving write-off request and permanently retiring asset.');
      case 'report_lost': return renderLifecycleForm(false, [], 'Flagging asset as missing/lost. Please detail the incident.');
      case 'recover_asset': return renderLifecycleForm(true, [{value: 'good', label: 'Good'}, {value: 'fair', label: 'Fair'}, {value: 'damaged', label: 'Damaged'}], 'Recovering a lost asset back to active status.');
      case 'approve_transfer': return renderLifecycleForm(false, [], 'Approving inter-location transfer request.');
      case 'reject_transfer': return renderLifecycleForm(false, [], 'Rejecting inter-location transfer request.');
      case 'receive_transfer': return renderLifecycleForm(false, [], 'Receiving transfer at destination.');
      case 'approve_request': return renderLifecycleForm(false, [], 'Approving branch requisition.');
      case 'reject_request': return renderLifecycleForm(false, [], 'Rejecting branch requisition.');
      case 'fulfill_request': return renderDispatchTransferForm();
      case 'dispatch_transfer': return renderDispatchTransferForm();
      case 'view_details': return renderViewDetails();
      case 'log_details': return renderLogDetails();
      default: return <p className="text-sm text-gray-500">Form implementation pending.</p>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-[#225091]">{getFormTitle()}</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">
          {getFormBody()}
        </div>
        {modalType !== 'view_details' && modalType !== 'log_details' && !stockShortageData && (
          <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50 rounded-b-xl">
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-white transition-colors">Cancel</button>
            <button onClick={handleSubmit} disabled={loading} className="px-4 py-2 bg-[#225091] rounded-lg text-sm font-semibold text-white hover:bg-[#193e73] transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2">
              {loading ? 'Submitting...' : 'Save & Submit'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
