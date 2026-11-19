import React, { useEffect, useState } from "react";
import {
  X,
  FileText,
  CheckCircle2,
  ShieldCheck,
  Download,
  Edit3,
  Loader2,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { toast } from "react-toastify";
import { onboardingFormsApi } from "../../api/onboardingFormsService";
import PdfPreviewModal from "../modals/PdfPreviewModal";
import FormEditModal from "../modals/FormEditModal";
import InitializeEsignModal from "../modals/InitializeEsignModal";

const ESIGN_DEFAULT_COORDINATES = {
  MEMBER_FORM: { x: 58, y: 265 },
  LOAN_FILE: { page: 3, x: 80, y: 555 },
};

const OnboardingFormsDrawer = ({
  isOpen,
  onClose,
  onboardingType,
  referenceId,
  onTriggerESignature,
}) => {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);

  const [activeFormType, setActiveFormType] = useState(null);
  const [activeFormData, setActiveFormData] = useState(null);
  const [activeFormIsESigned, setActiveFormIsESigned] = useState(false);
  const [activeTargetId, setActiveTargetId] = useState(null);
  const [activeInitializeForm, setActiveInitializeForm] = useState(null);

  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewLoadingId, setPreviewLoadingId] = useState(null);

  const loadForms = async () => {
    try {
      setLoading(true);
      const data = await onboardingFormsApi.getFormsOverview(
        onboardingType,
        referenceId,
      );
      setOverview(data);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to load forms overview",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (referenceId) {
        loadForms();
      } else {
        setLoading(false);
      }
    }
  }, [isOpen, referenceId]);

  const getFormSlug = (formType) => {
    switch (formType) {
      case "SAVING_ACCOUNT":
        return "saving-account";
      case "MEMBER_FORM":
        return "member";
      case "FD_RD":
        return "fd-rd";
      case "LOAN_FILE":
        return "loan-file";
      default:
        return formType ? formType.toLowerCase().replace("_", "-") : "";
    }
  };

  const getFormKey = (form) => {
    if (!form) return "";
    return form._id || form.id || form.formType || form.slug || form.title || "";
  };

  const isSameForm = (a, b) => {
    if (!a || !b) return false;
    if (a._id && b._id) return a._id === b._id;
    if (a.id && b.id) return a.id === b.id;
    if (a.formType && b.formType) return a.formType === b.formType;
    if (a.slug && b.slug) return a.slug === b.slug;
    if (a.title && b.title) return a.title === b.title;
    return false;
  };

  const handleEditForm = async (form) => {
    try {
      const slug = getFormSlug(form.formType);

      let data;
      if (form.apiEndpoints?.get) {
        const axiosInstance = (await import("../../api/axiosConfig")).default;
        // Strip /api if it's already in the URL to prevent /api/api/v1...
        let getUrl = form.apiEndpoints.get.startsWith("/api")
          ? form.apiEndpoints.get.replace("/api", "")
          : form.apiEndpoints.get;
        const url = getUrl.includes("?")
          ? getUrl
          : `${getUrl}?_req=get-${slug}`;
        const res = await axiosInstance.get(url);
        data = res.data?.data || res.data;
      } else {
        data = await onboardingFormsApi.getFormData(
          slug,
          form.referenceId || referenceId,
        );
      }

      setActiveFormData(data.formData || data);
      setActiveFormIsESigned(form.isESigned);
      setActiveFormType(form.formType);

      // Pass the PUT url or referenceId to the modal
      setActiveTargetId(
        form.apiEndpoints?.put || form.referenceId || referenceId,
      );
    } catch (err) {
      toast.error("Failed to load form details for editing.");
    }
  };

  const handlePreview = async (form) => {
    try {
      setPreviewLoadingId(form.formType);
      let url;
      if (form.apiEndpoints?.preview) {
        const axiosInstance = (await import("../../api/axiosConfig")).default;
        let previewUrl = form.apiEndpoints.preview.startsWith("/api")
          ? form.apiEndpoints.preview.replace("/api", "")
          : form.apiEndpoints.preview;
        const res = await axiosInstance.get(previewUrl, {
          responseType: "blob",
        });
        const file = new Blob([res.data], { type: "application/pdf" });
        url = window.URL.createObjectURL(file);
      } else {
        const slug = getFormSlug(form.formType);
        url = await onboardingFormsApi.fetchPreviewPdfBlobUrl(
          slug,
          form.referenceId || referenceId,
        );
      }
      setPreviewBlobUrl(url);
      setPreviewTitle(form.title);
    } catch (err) {
      let errMsg = "Failed to render PDF preview";
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          if (parsed.message) errMsg = parsed.message;
        } catch {
          // Keep default error message if blob is not JSON
        }
      } else if (err.response?.data?.message) {
        errMsg = err.response.data.message;
      } else if (err.message) {
        errMsg = err.message;
      }
      toast.error(errMsg);
    } finally {
      setPreviewLoadingId(null);
    }
  };

  const handleDownload = async (form) => {
    if (!form.isESigned) {
      toast.warn(
        "This form cannot be downloaded before e-signature is completed. Please use preview.",
      );
      return;
    }

    const filename = `${form.formType || "form"}_${form.referenceId || referenceId}.pdf`;

    // 1. Direct signed PDF URL check (if present on form)
    const directUrl =
      form.signedPdfUrl ||
      form.pdfUrl ||
      form.fileUrl ||
      form.s3Url ||
      form.signedUrl;

    if (directUrl && typeof directUrl === "string" && directUrl.startsWith("http")) {
      const link = document.createElement("a");
      link.href = directUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Document download started.");
      return;
    }

    // 2. Fetch signed PDF through API endpoint
    try {
      if (form.apiEndpoints?.download) {
        const axiosInstance = (await import("../../api/axiosConfig")).default;
        let downloadUrl = form.apiEndpoints.download.startsWith("/api")
          ? form.apiEndpoints.download.replace("/api", "")
          : form.apiEndpoints.download;
        const res = await axiosInstance.get(downloadUrl, {
          responseType: "blob",
        });
        const blobUrl = window.URL.createObjectURL(
          new Blob([res.data], { type: "application/pdf" }),
        );
        const link = document.createElement("a");
        link.href = blobUrl;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        toast.success("Document downloaded successfully.");
      } else {
        const slug = getFormSlug(form.formType);
        await onboardingFormsApi.downloadSignedPdf(
          slug,
          form.referenceId || referenceId,
          `${form.formType}_${form.referenceId || referenceId}`,
        );
        toast.success("Document downloaded successfully.");
      }
    } catch (err) {
      // 3. Fallback: If redirected to S3 and blocked by CSP during in-memory XHR,
      // extract the redirected S3 URL and trigger a native document download (bypasses connect-src).
      const redirectedUrl =
        err?.request?.responseURL ||
        err?.response?.request?.responseURL ||
        err?.response?.headers?.location;

      if (redirectedUrl && (redirectedUrl.includes("aces3.ai") || redirectedUrl.includes(".pdf"))) {
        const fallbackLink = document.createElement("a");
        fallbackLink.href = redirectedUrl;
        fallbackLink.target = "_blank";
        fallbackLink.rel = "noopener noreferrer";
        fallbackLink.setAttribute("download", filename);
        document.body.appendChild(fallbackLink);
        fallbackLink.click();
        document.body.removeChild(fallbackLink);
        toast.success("Document download started.");
        return;
      }

      toast.error(err?.response?.data?.message || "Failed to download PDF.");
    }
  };

  const [processingEsignId, setProcessingEsignId] = useState(null);

  const handleInitializeEsign = async (payload) => {
    const form = activeInitializeForm;
    if (!form) return;

    // Force explicit coordinates for each form type to fix placement mismatch
    let elements = null;

    // Check if operator supplied custom coordinates in the modal
    const customX = payload.coordX !== undefined ? Number(payload.coordX) : null;
    const customY = payload.coordY !== undefined ? Number(payload.coordY) : null;
    const memberFormCoordinates = ESIGN_DEFAULT_COORDINATES.MEMBER_FORM;
    const loanFileCoordinates = ESIGN_DEFAULT_COORDINATES.LOAN_FILE;

    // Remove from payload so backend doesn't receive unexpected root keys
    delete payload.coordX;
    delete payload.coordY;

    switch (form.formType) {
      case "SAVING_ACCOUNT":
        elements = [
          {
            page: 1,
            type: "signature",
            x: customX || 425,
            y: customY || 382,
            height: 60,
            width: 120,
            font_size: 24,
          },
        ];
        break;
      case "MEMBER_FORM":
        elements = [
          {
            page: 0,
            type: "signature",
            x: Number.isFinite(customX) ? customX : memberFormCoordinates.x,
            y: Number.isFinite(customY) ? customY : memberFormCoordinates.y,
            height: 60,
            width: 140,
            font_size: 24,
          },
        ];
        break;
      case "FD_RD":
        elements = [
          {
            page: 0,
            type: "signature",
            x: customX || 396,
            y: customY || 275,
            height: 60,
            width: 140,
            font_size: 24,
          },
        ];
        break;
      case "LOAN_FILE":
        elements = [
          {
            page: loanFileCoordinates.page,
            type: "signature",
            x: Number.isFinite(customX) ? customX : loanFileCoordinates.x,
            y: Number.isFinite(customY) ? customY : loanFileCoordinates.y,
            height: 60,
            width: 140,
            font_size: 24,
          },
        ];
        break;
    }

    if (elements) {
      payload.elements = elements;

      // Inject all possible keys mentioned in the API docs to ensure the backend respects the override
      payload.signatures = elements;
      payload.signatureCoordinates = elements[0];
      payload.coordinates = elements[0];
    }

    try {
      const formKey = getFormKey(form);
      setProcessingEsignId(formKey);
      const slug = getFormSlug(form.formType);

      const res = await onboardingFormsApi.initializeEsign(
        slug,
        form.referenceId || referenceId,
        payload,
      );
      if (!res?.success) {
        throw new Error(res?.message || "Failed to initialize E-Signature.");
      }
      toast.success(res.message || "E-Signature initialized successfully.");

      // Fetch status after initialization so the latest invitation and backend state are shown.
      const statusRes = await onboardingFormsApi.checkEsignStatus(
        slug,
        form.referenceId || referenceId,
      );

      setOverview((prev) => ({
        ...prev,
        forms: prev.forms.map((f) => {
          if (isSameForm(f, form)) {
            const fetchedInviteUrl =
              statusRes?.data?.inviteUrl || res.data?.inviteUrl;
            const status = statusRes?.data?.status || res.data?.status || "ESIGN_PENDING";
            const isESigned = statusRes?.data?.isESigned || status === "COMPLETED";
            return {
              ...f,
              isESigned,
              eSignStatus: status,
              status,
              inviteUrl: fetchedInviteUrl || f.inviteUrl,
            };
          }
          return f;
        }),
      }));
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to initialize E-Signature.",
      );
    } finally {
      setProcessingEsignId(null);
      setActiveInitializeForm(null);
    }
  };

  const handleCheckEsignStatus = async (form) => {
    try {
      const formKey = getFormKey(form);
      setProcessingEsignId(formKey);
      const slug = getFormSlug(form.formType);
      const res = await onboardingFormsApi.checkEsignStatus(
        slug,
        form.referenceId || referenceId,
      );

      if (res?.success) {
        if (res.data?.status === "COMPLETED" || res.data?.isESigned) {
          toast.success(
            "E-Signature verified successfully! Form is now locked.",
          );
          setOverview((prev) => ({
            ...prev,
            forms: prev.forms.map((f) => {
              if (isSameForm(f, form)) {
                return { ...f, isESigned: true, eSignStatus: "COMPLETED", status: "COMPLETED" };
              }
              return f;
            }),
          }));
        } else if (res.data?.status === "ESIGN_PENDING") {
          toast.info(
            "E-Signature is still pending. Please ask the customer to complete signing via the portal.",
          );
          if (res.data?.inviteUrl) {
            setOverview((prev) => ({
              ...prev,
              forms: prev.forms.map((f) => {
                if (isSameForm(f, form)) {
                  return { ...f, inviteUrl: res.data.inviteUrl };
                }
                return f;
              }),
            }));
          }
        } else {
          toast.info(`E-Signature status: ${res.data?.status || "Unknown"}`);
        }
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to check E-Signature status.",
      );
    } finally {
      setProcessingEsignId(null);
    }
  };

  const handleOpenESignPortal = async (form) => {
    let url = form?.inviteUrl;

    // If inviteUrl is not yet in state (e.g. freshly opened drawer), auto-fetch it on demand
    if (!url) {
      try {
        const formKey = getFormKey(form);
        setProcessingEsignId(formKey);
        const slug = getFormSlug(form.formType);
        const res = await onboardingFormsApi.checkEsignStatus(
          slug,
          form.referenceId || referenceId,
        );

        if (res?.data?.status === "COMPLETED" || res?.data?.isESigned) {
          toast.success("E-Signature is already completed for this form!");
          setOverview((prev) => ({
            ...prev,
            forms: prev.forms.map((f) => {
              if (isSameForm(f, form)) {
                return {
                  ...f,
                  isESigned: true,
                  eSignStatus: "COMPLETED",
                  status: "COMPLETED",
                };
              }
              return f;
            }),
          }));
          return;
        }

        url = res?.data?.inviteUrl;
        if (url) {
          setOverview((prev) => ({
            ...prev,
            forms: prev.forms.map((f) => {
              if (isSameForm(f, form)) {
                return { ...f, inviteUrl: url };
              }
              return f;
            }),
          }));
        }
      } catch (err) {
        console.error("Failed to auto-fetch inviteUrl:", err);
      } finally {
        setProcessingEsignId(null);
      }
    }

    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      toast.warn(
        "E-Signature portal link is not available yet. Please click 'Check Status' to refresh the signing link.",
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="text-[#225091]" size={24} />
              Onboarding Forms & Agreements
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Domain:{" "}
              <span className="font-bold text-gray-700 uppercase">
                {onboardingType}
              </span>{" "}
              | Ref ID:{" "}
              <span className="font-mono text-gray-700">{referenceId}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
            <Loader2 size={32} className="animate-spin text-[#225091]" />
            <p className="text-sm font-medium">
              Loading required forms checklist...
            </p>
          </div>
        ) : !referenceId || !overview?.forms?.length ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-3 p-6 text-center">
            <AlertCircle size={40} className="text-gray-300" />
            <h3 className="text-lg font-bold text-gray-700">
              No Forms Available
            </h3>
            <p className="text-sm">
              {!referenceId
                ? "The lead hasn't been saved or the reference ID is missing. Please save the application first before accessing onboarding forms."
                : "No required forms were generated for this application yet."}
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
            {overview.forms.map((form, index) => {
              const formKey = getFormKey(form) || `form-${index}`;
              const isSigned = form.isESigned || form.eSignStatus === "COMPLETED" || form.status === "COMPLETED";
              const isPending = !isSigned && (form.eSignStatus === "ESIGN_PENDING" || form.status === "ESIGN_PENDING");
              const isProcessing = Boolean(processingEsignId && processingEsignId === formKey);

              return (
                <div
                  key={form._id || `${formKey}-${index}`}
                  className="border border-gray-200 rounded-2xl p-5 bg-white shadow-sm flex flex-col gap-4 relative overflow-hidden"
                >
                  {/* Left Accent Bar */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 ${isSigned ? "bg-emerald-500" : isPending ? "bg-amber-400" : "bg-gray-300"}`}
                  ></div>

                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">
                        {form.title}
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 mt-1.5 inline-block uppercase tracking-wider">
                        {form.isCompulsory ? "Compulsory" : "Conditional"}
                      </span>
                    </div>
                    <div>
                      {isSigned ? (
                        <span className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-2.5 py-1 rounded-lg font-bold shadow-2xs">
                          <CheckCircle2 size={14} className="text-emerald-600" />{" "}
                          Digitally Signed
                        </span>
                      ) : isPending ? (
                        <span className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs px-2.5 py-1 rounded-lg font-bold shadow-2xs animate-pulse">
                          <Loader2
                            size={14}
                            className="text-amber-600 animate-spin"
                          />{" "}
                          Pending E-Sign
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 text-gray-600 text-xs px-2.5 py-1 rounded-lg font-bold shadow-2xs">
                          <ShieldCheck size={14} className="text-gray-400" />{" "}
                          Draft (Unsigned)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* E-Signature Dynamic Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {!isSigned && !isPending && (
                      <button
                        onClick={() => setActiveInitializeForm(form)}
                        disabled={isProcessing}
                        className="flex items-center justify-center gap-1.5 flex-1 py-1.5 rounded-lg text-xs font-bold bg-[#225091] hover:bg-[#183d73] text-white shadow-2xs transition-all cursor-pointer disabled:opacity-70"
                      >
                        {isProcessing ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <ShieldCheck size={14} />
                        )}
                        Initialize E-Signature
                      </button>
                    )}

                    {!isSigned && isPending && (
                      <>
                        <button
                          onClick={() => handleOpenESignPortal(form)}
                          disabled={isProcessing}
                          className="flex items-center justify-center gap-1.5 flex-1 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-2xs transition-all cursor-pointer disabled:opacity-70"
                        >
                          {isProcessing ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <ShieldCheck size={14} />
                          )}
                          Open E-Sign Portal
                        </button>
                        <button
                          onClick={() => handleCheckEsignStatus(form)}
                          disabled={isProcessing}
                          className="flex items-center justify-center gap-1.5 flex-1 py-1.5 rounded-lg text-xs font-bold border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 shadow-2xs transition-all cursor-pointer disabled:opacity-70"
                        >
                          {isProcessing ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={14} />
                          )}
                          Check Status
                        </button>
                        <button
                          onClick={() => setActiveInitializeForm(form)}
                          disabled={isProcessing}
                          className="flex items-center justify-center gap-1.5 flex-1 py-1.5 rounded-lg text-xs font-bold border border-blue-200 bg-blue-50 text-[#225091] hover:bg-blue-100 shadow-2xs transition-all cursor-pointer disabled:opacity-70"
                        >
                          {isProcessing ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <RotateCcw size={14} />
                          )}
                          Re Initialize E-Signature
                        </button>
                      </>
                    )}
                  </div>

                  {/* Standard Form Actions (View/Edit, Preview, Download) */}
                  <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => handleEditForm(form)}
                      disabled={isSigned}
                      title={
                        isSigned
                          ? "Form is locked after signing."
                          : "Edit form data"
                      }
                      className={`flex items-center justify-center gap-1.5 flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                        !isSigned
                          ? "bg-white hover:bg-gray-50 text-gray-700 border-gray-300 shadow-2xs cursor-pointer"
                          : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-80"
                      }`}
                    >
                      <Edit3 size={14} />
                      {isSigned ? "View (Locked)" : "Edit Form"}
                    </button>

                    <button
                      onClick={() => handlePreview(form)}
                      disabled={previewLoadingId === form.formType}
                      className="flex items-center justify-center gap-1.5 flex-1 py-2 rounded-xl text-xs font-bold bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 shadow-2xs transition-all cursor-pointer disabled:opacity-70"
                    >
                      {previewLoadingId === form.formType ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <FileText size={14} />
                      )}
                      Preview PDF
                    </button>

                    <button
                      onClick={() => handleDownload(form)}
                      disabled={!isSigned}
                      title={
                        !isSigned
                          ? "Cannot download before e-signature"
                          : "Download signed PDF"
                      }
                      className={`flex items-center justify-center gap-1.5 flex-1 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                        isSigned
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent cursor-pointer"
                          : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                      }`}
                    >
                      <Download size={14} />
                      Download
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Embedded PDF Viewer Modal */}
      {previewBlobUrl && (
        <PdfPreviewModal
          title={previewTitle}
          blobUrl={previewBlobUrl}
          onClose={() => {
            window.URL.revokeObjectURL(previewBlobUrl);
            setPreviewBlobUrl(null);
          }}
          onTriggerESignature={onTriggerESignature}
        />
      )}

      {/* Reusable Form Editor Modal */}
      {activeFormType && (
        <FormEditModal
          key={activeFormType}
          isOpen={true}
          formType={activeFormType}
          referenceId={activeTargetId || referenceId}
          formData={activeFormData}
          isESigned={activeFormIsESigned}
          onClose={() => {
            setActiveFormType(null);
            setActiveFormData(null);
            setActiveTargetId(null);
          }}
          onSaved={() => {
            setActiveFormType(null);
            setActiveTargetId(null);
            loadForms();
          }}
        />
      )}

      {/* Initialize E-Sign Override Modal */}
      {activeInitializeForm && (
        <InitializeEsignModal
          isOpen={true}
          formTitle={activeInitializeForm.title}
          defaultCoordinates={ESIGN_DEFAULT_COORDINATES[activeInitializeForm.formType]}
          isReinitializing={activeInitializeForm.eSignStatus === "ESIGN_PENDING" || activeInitializeForm.status === "ESIGN_PENDING"}
          onClose={() => setActiveInitializeForm(null)}
          onInitialize={handleInitializeEsign}
          isInitializing={Boolean(processingEsignId && processingEsignId === getFormKey(activeInitializeForm))}
        />
      )}
    </div>
  );
};

export default OnboardingFormsDrawer;
