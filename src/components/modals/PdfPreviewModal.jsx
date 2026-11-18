import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ExternalLink,
  Download,
  FileText,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Initialize PDF.js worker using Vite's static asset URL bundling
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
} catch (e) {
  console.warn('PDF.js worker initialization notice:', e);
}

const PdfPreviewModal = ({ title, blobUrl, onClose, onTriggerESignature }) => {
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const containerRef = useRef(null);
  const pdfDocRef = useRef(null);
  const renderTasksRef = useRef([]);

  const handleOpenInNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDownloadPreview = () => {
    if (!blobUrl) return;
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `${(title || 'Document_Preview').replace(/[^a-zA-Z0-9_-]/g, '_')}_preview.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1. Load PDF Document from Blob URL
  useEffect(() => {
    let isCancelled = false;

    if (!blobUrl) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const loadingTask = pdfjsLib.getDocument({
      url: blobUrl,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.6.205/cmaps/',
      cMapPacked: true,
    });

    loadingTask.promise
      .then((pdf) => {
        if (isCancelled) return;
        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
        setLoading(false);
      })
      .catch((err) => {
        if (isCancelled) return;
        console.warn('PDF.js in-canvas render error, falling back:', err);
        setError(err.message || 'Failed to parse PDF');
        setLoading(false);
      });

    return () => {
      isCancelled = true;
      if (loadingTask?.destroy) {
        loadingTask.destroy();
      }
    };
  }, [blobUrl]);

  // 2. Render All Pages into HTML5 Canvases whenever pdfDoc or scale changes
  useEffect(() => {
    if (!pdfDocRef.current || !containerRef.current || loading || error) return;

    const pdf = pdfDocRef.current;
    const container = containerRef.current;

    // Cancel any previous rendering tasks
    renderTasksRef.current.forEach((task) => {
      try {
        task.cancel();
      } catch {}
    });
    renderTasksRef.current = [];

    // Clear existing canvases
    container.innerHTML = '';

    const renderAllPages = async () => {
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        try {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale });

          // Wrapper for page styling
          const pageWrapper = document.createElement('div');
          pageWrapper.className =
            'mb-6 flex flex-col items-center bg-white shadow-xl rounded-sm overflow-hidden border border-gray-200 transition-all';

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');

          // High-DPI screen sharp rendering
          const outputScale = window.devicePixelRatio || 1;
          canvas.width = Math.floor(viewport.width * outputScale);
          canvas.height = Math.floor(viewport.height * outputScale);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;

          const transform =
            outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

          const renderContext = {
            canvasContext: context,
            transform,
            viewport,
          };

          const renderTask = page.render(renderContext);
          renderTasksRef.current.push(renderTask);

          pageWrapper.appendChild(canvas);

          // Page Number Indicator
          const pageBadge = document.createElement('div');
          pageBadge.className =
            'w-full py-1.5 px-3 bg-gray-50 border-t border-gray-100 text-[11px] font-semibold text-gray-500 text-center select-none';
          pageBadge.textContent = `Page ${pageNum} of ${pdf.numPages}`;
          pageWrapper.appendChild(pageBadge);

          container.appendChild(pageWrapper);

          await renderTask.promise;
        } catch (pageErr) {
          if (pageErr?.name !== 'RenderingCancelledException') {
            console.warn(`Error rendering page ${pageNum}:`, pageErr);
          }
        }
      }
    };

    renderAllPages();

    return () => {
      renderTasksRef.current.forEach((task) => {
        try {
          task.cancel();
        } catch {}
      });
      renderTasksRef.current = [];
    };
  }, [numPages, scale, loading, error]);

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.75));
  const handleResetZoom = () => setScale(1.25);

  if (!blobUrl) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[94vh] flex flex-col overflow-hidden border border-gray-700/20">
        
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-gray-900 text-white flex flex-wrap justify-between items-center gap-3 shrink-0">
          <div className="flex-1 min-w-[220px]">
            <h3 className="font-bold text-base md:text-lg flex items-center gap-2">
              <FileText size={18} className="text-blue-400 shrink-0" />
              <span className="truncate max-w-[400px]">{title}</span>
              <span className="font-semibold text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full shrink-0">
                PREVIEW
              </span>
            </h3>
            <span className="text-[11px] text-amber-300/90 flex items-center gap-1.5 mt-0.5">
              <AlertTriangle size={12} className="shrink-0" />
              <span>Official bank form with live watermark. Authorized preview copy.</span>
            </span>
          </div>

          {/* Controls: Zoom, Actions, Close */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Zoom Controls */}
            {!error && !loading && (
              <div className="hidden sm:flex items-center gap-1 bg-white/10 rounded-lg p-0.5 text-white mr-1">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={scale <= 0.75}
                  className="p-1.5 hover:bg-white/20 rounded disabled:opacity-40 transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut size={14} />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="px-2 text-xs font-semibold hover:bg-white/20 rounded py-1 transition-colors cursor-pointer min-w-[48px] text-center"
                  title="Reset Zoom"
                >
                  {Math.round((scale / 1.25) * 100)}%
                </button>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={scale >= 2.5}
                  className="p-1.5 hover:bg-white/20 rounded disabled:opacity-40 transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn size={14} />
                </button>
              </div>
            )}

            {/* Quick Open in New Tab */}
            <button
              type="button"
              onClick={handleOpenInNewTab}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all cursor-pointer"
              title="Open document in a separate browser tab"
            >
              <ExternalLink size={14} />
              <span className="hidden sm:inline">Open in New Tab</span>
            </button>

            {/* Quick Download Preview */}
            <button
              type="button"
              onClick={handleDownloadPreview}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all cursor-pointer"
              title="Download watermarked preview copy"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Download Copy</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="text-gray-300 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer ml-1"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body: Canvas Viewer / Loading / Fallback */}
        <div className="flex-1 bg-gray-200/90 relative overflow-y-auto overflow-x-auto p-4 flex flex-col items-center">
          {loading && (
            <div className="flex flex-col items-center justify-center my-auto p-8 text-center text-gray-600">
              <Loader2 size={36} className="text-[#225091] animate-spin mb-3" />
              <p className="text-sm font-bold text-gray-800">Rendering document preview...</p>
              <p className="text-xs text-gray-500 mt-1">Generating high-resolution document pages</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center my-auto p-8 text-center bg-white rounded-2xl shadow-md border border-gray-200 max-w-md">
              <FileText size={48} className="text-[#225091] mb-3 opacity-80" />
              <h4 className="font-bold text-base text-gray-900 mb-1">Document Ready</h4>
              <p className="text-xs text-gray-500 mb-6">
                Your browser security restricted inline canvas rendering. The complete watermarked official document is ready to view.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  type="button"
                  onClick={handleOpenInNewTab}
                  className="flex-1 py-2.5 px-4 bg-[#225091] hover:bg-[#183d73] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ExternalLink size={15} />
                  Open in New Tab
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPreview}
                  className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-gray-200"
                >
                  <Download size={15} />
                  Download
                </button>
              </div>
            </div>
          )}

          {/* The Live Rendered Pages Container */}
          <div
            ref={containerRef}
            className={`flex flex-col items-center w-full transition-opacity duration-300 ${
              loading || error ? 'hidden' : 'block'
            }`}
          />
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-gray-200 flex justify-between items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {numPages > 0 && !error && !loading && (
              <span className="font-semibold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md">
                Total Pages: {numPages}
              </span>
            )}
            <span className="hidden sm:inline">
              Having trouble viewing? Use <span className="font-bold text-gray-700">"Open in New Tab"</span> above.
            </span>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
            >
              Close Preview
            </button>
            {onTriggerESignature && (
              <button
                type="button"
                onClick={onTriggerESignature}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
              >
                Proceed to E-Sign
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfPreviewModal;
