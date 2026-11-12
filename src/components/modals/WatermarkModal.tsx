import React, { useState } from 'react';
import { X, Check, Stamp } from 'lucide-react';

interface WatermarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyWatermark: (text: string, options: { fontSize: number; opacity: number; angle: number; color: string }) => void;
}

const PRESETS = ['CONFIDENTIAL', 'DRAFT', 'APPROVED', 'URGENT', 'DO NOT COPY'];

export const WatermarkModal: React.FC<WatermarkModalProps> = ({
  isOpen,
  onClose,
  onApplyWatermark,
}) => {
  const [text, setText] = useState('CONFIDENTIAL');
  const [angle, setAngle] = useState(45);
  const [opacity, setOpacity] = useState(0.25);
  const [fontSize, setFontSize] = useState(48);
  const [color, setColor] = useState('#ef4444');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onApplyWatermark(text.trim(), { fontSize, opacity, angle, color });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1f1f23] rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-md overflow-hidden flex flex-col">
        <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stamp className="w-4 h-4 text-red-600" />
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
              Add Watermark
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Watermark Text
            </label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. CONFIDENTIAL"
              className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-500 font-bold"
            />
            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {PRESETS.map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setText(p)}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                    text === p
                      ? 'bg-blue-600 text-white'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Rotation Angle ({angle}°)
              </label>
              <select
                value={angle}
                onChange={(e) => setAngle(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100"
              >
                <option value={45}>Diagonal 45°</option>
                <option value={0}>Horizontal 0°</option>
                <option value={-45}>Diagonal -45°</option>
                <option value={90}>Vertical 90°</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Color
              </label>
              <div className="flex items-center gap-1.5 pt-1">
                {['#ef4444', '#3b82f6', '#64748b', '#10b981', '#000000'].map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full border ${color === c ? 'ring-2 ring-blue-500' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Opacity ({Math.round(opacity * 100)}%)
              </label>
              <input
                type="range"
                min="0.05"
                max="0.8"
                step="0.05"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            <div>
              <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Font Size ({fontSize}pt)
              </label>
              <input
                type="range"
                min="24"
                max="80"
                step="4"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                className="w-full accent-blue-600"
              />
            </div>
          </div>

          {/* Real-time Preview Card */}
          <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-6 bg-neutral-50 dark:bg-neutral-900/60 relative overflow-hidden flex items-center justify-center h-28">
            <span
              className="font-bold select-none whitespace-nowrap pointer-events-none"
              style={{
                color,
                opacity,
                fontSize: `${Math.round(fontSize * 0.45)}px`,
                transform: `rotate(${angle}deg)`,
              }}
            >
              {text || 'PREVIEW'}
            </span>
          </div>

          <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-1.5 shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Watermark</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
