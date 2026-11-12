import React, { useRef, useState, useEffect } from 'react';
import { X, Trash2, Check, PenTool, Type, Upload } from 'lucide-react';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySignature: (signatureDataUrl: string) => void;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({
  isOpen,
  onClose,
  onApplySignature,
}) => {
  const [tab, setTab] = useState<'draw' | 'type' | 'upload'>('draw');
  const [typedName, setTypedName] = useState('John Doe');
  const [fontFamily, setFontFamily] = useState('cursive');
  const [sigColor, setSigColor] = useState('#0f172a');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (isOpen && tab === 'draw') {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = sigColor;
          ctx.lineWidth = 2.5;
        }
      }
    }
  }, [isOpen, tab, sigColor]);

  if (!isOpen) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleApply = () => {
    if (tab === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) return;
      const dataUrl = canvas.toDataURL('image/png');
      onApplySignature(dataUrl);
    } else if (tab === 'type') {
      // Render typed text to temporary canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 400;
      tempCanvas.height = 150;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = sigColor;
        ctx.font = `italic 42px ${fontFamily}`;
        ctx.textBaseline = 'middle';
        ctx.fillText(typedName, 20, 75);
        onApplySignature(tempCanvas.toDataURL('image/png'));
      }
    } else if (tab === 'upload') {
      if (uploadedImage) {
        onApplySignature(uploadedImage);
      }
    }
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1f1f23] rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
            Create Digital Signature
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-xs">
          <button
            onClick={() => setTab('draw')}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 font-medium border-b-2 ${
              tab === 'draw'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-[#1f1f23]'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Draw</span>
          </button>
          <button
            onClick={() => setTab('type')}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 font-medium border-b-2 ${
              tab === 'type'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-[#1f1f23]'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Type</span>
          </button>
          <button
            onClick={() => setTab('upload')}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 font-medium border-b-2 ${
              tab === 'upload'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-[#1f1f23]'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Image</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex-1">
          {tab === 'draw' && (
            <div className="flex flex-col gap-3">
              <div className="border border-neutral-300 dark:border-neutral-700 rounded-lg overflow-hidden bg-neutral-50/50 dark:bg-neutral-900 relative">
                <canvas
                  ref={canvasRef}
                  width={440}
                  height={180}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  className="w-full h-[180px] cursor-crosshair"
                />
                {!hasDrawn && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-neutral-400 text-xs">
                    Sign with your mouse or stylus here
                  </div>
                )}
                {/* Baseline Guide */}
                <div className="absolute bottom-8 left-6 right-6 border-b border-dashed border-neutral-300 dark:border-neutral-700 pointer-events-none" />
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-neutral-500">Ink Color:</span>
                  {['#0f172a', '#1e40af', '#dc2626'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setSigColor(color)}
                      className={`w-4 h-4 rounded-full border ${
                        sigColor === color ? 'ring-2 ring-blue-500' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>

                <button
                  onClick={clearCanvas}
                  className="flex items-center gap-1 text-neutral-500 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>
            </div>
          )}

          {tab === 'type' && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Your Full Name
                </label>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Choose Handwriting Style
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Cursive Flow', font: 'cursive' },
                    { label: 'Classic Script', font: 'Brush Script MT, cursive' },
                    { label: 'Modern Elegant', font: 'Georgia, serif' },
                    { label: 'Clean Monoline', font: 'sans-serif' },
                  ].map((style) => (
                    <button
                      key={style.label}
                      onClick={() => setFontFamily(style.font)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        fontFamily === style.font
                          ? 'border-blue-600 bg-blue-50/30 dark:bg-blue-950/20'
                          : 'border-neutral-200 dark:border-neutral-800'
                      }`}
                    >
                      <span className="text-[10px] text-neutral-400 block mb-1">
                        {style.label}
                      </span>
                      <span
                        className="text-lg truncate block text-neutral-900 dark:text-neutral-100"
                        style={{ fontFamily: style.font }}
                      >
                        {typedName || 'Sample'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'upload' && (
            <div className="flex flex-col gap-3">
              <label className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-colors">
                <Upload className="w-8 h-8 text-neutral-400 mb-2" />
                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Click to browse signature PNG / JPG
                </span>
                <span className="text-[10px] text-neutral-400 mt-1">
                  Transparent PNG works best
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {uploadedImage && (
                <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-2 flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 h-24">
                  <img
                    src={uploadedImage}
                    alt="Signature Preview"
                    className="max-h-full object-contain"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={tab === 'draw' && !hasDrawn}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-40"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Insert Signature</span>
          </button>
        </div>
      </div>
    </div>
  );
};
