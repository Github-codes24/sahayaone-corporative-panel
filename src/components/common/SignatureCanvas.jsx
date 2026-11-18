import React, { useRef, useState, useEffect } from 'react';
import { RotateCcw, Trash2, CheckCircle2 } from 'lucide-react';

const SignatureCanvas = ({ onSave, isLocked = false, initialSignature = null }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#1b2559'); // Deep indigo signature ink
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set high-DPI canvas scaling for crisp rendering
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = strokeColor;

    // Load initial signature if provided
    if (initialSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasDrawn(true);
      };
      img.src = initialSignature;
    }
  }, [strokeColor, initialSignature]);

  const saveCanvasState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setHistory((prev) => [...prev, canvas.toDataURL()]);
  };

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if (e.touches && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    if (isLocked) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    saveCanvasState();

    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e) => {
    if (!isDrawing || isLocked) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing || isLocked) return;
    setIsDrawing(false);
    if (onSave && canvasRef.current) {
      onSave(canvasRef.current.toDataURL('image/png'));
    }
  };

  const handleClear = () => {
    if (isLocked) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
    setHistory([]);
    if (onSave) onSave(null);
  };

  const handleUndo = () => {
    if (isLocked || history.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    const previousState = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
      if (history.length === 1) setHasDrawn(false);
    };
    img.src = previousState;
  };

  return (
    <div className="w-full flex flex-col items-center gap-3">
      {/* Canvas Box */}
      <div className={`relative w-full h-44 rounded-2xl border-2 ${
        isLocked ? 'border-gray-200 bg-gray-50/70 cursor-not-allowed' : 'border-dashed border-blue-300 bg-white hover:border-[#225091] shadow-2xs'
      } overflow-hidden transition-all flex flex-col items-center justify-center`}>
        
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className={`w-full h-full touch-none ${isLocked ? 'cursor-not-allowed' : 'cursor-crosshair'}`}
        />

        {!hasDrawn && !isLocked && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-gray-400 select-none">
            <span className="text-xs font-semibold text-gray-400">Draw your signature here</span>
            <span className="text-[10px] text-gray-300 mt-0.5">Use your mouse or finger/stylus on touch screens</span>
          </div>
        )}

        {/* Signature Guideline */}
        <div className="absolute bottom-5 left-8 right-8 border-b border-gray-200/60 pointer-events-none" />
      </div>

      {/* Control Buttons & Ink Selector */}
      {!isLocked && (
        <div className="w-full flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Ink Color:</span>
            {['#1b2559', '#000000', '#1e40af'].map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setStrokeColor(color)}
                style={{ backgroundColor: color }}
                className={`w-5 h-5 rounded-full border-2 ${strokeColor === color ? 'border-blue-500 scale-110' : 'border-white'} transition-all cursor-pointer`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUndo}
              disabled={history.length === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs transition-colors cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Undo</span>
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={!hasDrawn}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs transition-colors cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Clear</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignatureCanvas;
