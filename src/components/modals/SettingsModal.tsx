import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  Moon, 
  Sun, 
  Trash2, 
  ShieldCheck, 
  Monitor, 
  Cloud, 
  Check, 
  Info 
} from 'lucide-react';
import { UserSettings } from '../../types/pdf';
import { storageService } from '../../services/storageService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onRecentFilesCleared: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  onToggleTheme,
  onRecentFilesCleared,
}) => {
  const [settings, setSettings] = useState<UserSettings>({
    theme: 'light',
    defaultZoom: 'fit-width',
    showThumbnails: true,
    authorName: 'User',
    highQualityRender: true,
  });

  const [authorNameInput, setAuthorNameInput] = useState('User');
  const [defaultZoomInput, setDefaultZoomInput] = useState<'fit-width' | 'fit-page' | number>('fit-width');
  const [highQualityInput, setHighQualityInput] = useState(true);
  const [cloudOcrEndpoint, setCloudOcrEndpoint] = useState('');
  const [isSavedNotice, setIsSavedNotice] = useState(false);
  const [isClearingRecents, setIsClearingRecents] = useState(false);
  const [clearedNotice, setClearedNotice] = useState(false);

  useEffect(() => {
    if (isOpen) {
      storageService.getSettings().then((s) => {
        setSettings(s);
        setAuthorNameInput(s.authorName || 'User');
        setDefaultZoomInput(s.defaultZoom);
        setHighQualityInput(s.highQualityRender);
      });
      const savedEndpoint = localStorage.getItem('nextgen_cloud_ocr_endpoint') || '';
      setCloudOcrEndpoint(savedEndpoint);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const updated: UserSettings = {
      ...settings,
      theme,
      authorName: authorNameInput.trim() || 'User',
      defaultZoom: defaultZoomInput,
      highQualityRender: highQualityInput,
    };
    await storageService.saveSettings(updated);
    if (cloudOcrEndpoint.trim()) {
      localStorage.setItem('nextgen_cloud_ocr_endpoint', cloudOcrEndpoint.trim());
    } else {
      localStorage.removeItem('nextgen_cloud_ocr_endpoint');
    }
    setIsSavedNotice(true);
    setTimeout(() => {
      setIsSavedNotice(false);
      onClose();
    }, 600);
  };

  const handleClearAllHistory = async () => {
    if (confirm('Clear all recent files and cached document previews from this device?')) {
      setIsClearingRecents(true);
      await storageService.clearAllRecentFiles();
      onRecentFilesCleared();
      setIsClearingRecents(false);
      setClearedNotice(true);
      setTimeout(() => setClearedNotice(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1f1f23] rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Application Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 overflow-y-auto text-xs text-neutral-700 dark:text-neutral-300">
          {/* Section 1: Appearance & Display */}
          <div className="space-y-3">
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs uppercase tracking-wider">
              Appearance & Display
            </h3>

            {/* Theme Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
              <div>
                <div className="font-medium text-neutral-900 dark:text-neutral-100">Interface Theme</div>
                <div className="text-[11px] text-neutral-500">Choose between light and dark Windows Fluent theme</div>
              </div>
              <button
                onClick={onToggleTheme}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    <span>Dark Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Light Mode</span>
                  </>
                )}
              </button>
            </div>

            {/* Default Zoom */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
              <div>
                <div className="font-medium text-neutral-900 dark:text-neutral-100">Default Page Zoom</div>
                <div className="text-[11px] text-neutral-500">Initial viewport scaling when opening new PDFs</div>
              </div>
              <select
                value={typeof defaultZoomInput === 'number' ? defaultZoomInput.toString() : defaultZoomInput}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'fit-width' || val === 'fit-page') {
                    setDefaultZoomInput(val);
                  } else {
                    setDefaultZoomInput(parseFloat(val));
                  }
                }}
                className="h-8 px-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              >
                <option value="fit-width">Fit Width (125%)</option>
                <option value="fit-page">Fit Page (85%)</option>
                <option value="1">100% Actual Size</option>
                <option value="1.5">150% Zoom</option>
              </select>
            </div>

            {/* High Quality Render */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
              <div>
                <div className="font-medium text-neutral-900 dark:text-neutral-100">High-DPI Retina Rendering</div>
                <div className="text-[11px] text-neutral-500">Render crisp vectors at 2x resolution on high density screens</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={highQualityInput}
                  onChange={(e) => setHighQualityInput(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-neutral-300 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* Section 2: Annotation Defaults */}
          <div className="space-y-3">
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs uppercase tracking-wider">
              Annotation Identity
            </h3>
            <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 space-y-2">
              <label className="block text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
                Author Name on Sticky Notes & Signatures
              </label>
              <input
                type="text"
                value={authorNameInput}
                onChange={(e) => setAuthorNameInput(e.target.value)}
                placeholder="Your name or organization"
                className="w-full px-2.5 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>
          </div>

          {/* Section 3: Privacy & Local Storage */}
          <div className="space-y-3">
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs uppercase tracking-wider">
              Privacy & Local Storage
            </h3>
            <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>100% Client-Side Processing</span>
              </div>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
                All PDF viewing, editing, page extraction, conversion and Tesseract OCR run locally inside your browser sandbox. Documents are never transmitted to external cloud servers.
              </p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
              <div>
                <div className="font-medium text-neutral-900 dark:text-neutral-100">Recent Files History</div>
                <div className="text-[11px] text-neutral-500">Clear cached thumbnails and file records stored in IndexedDB</div>
              </div>
              <button
                onClick={handleClearAllHistory}
                disabled={isClearingRecents}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-medium disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            </div>

            {clearedNotice && (
              <div className="text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Recent documents and cache cleared successfully.</span>
              </div>
            )}
          </div>

          {/* Section 4: Optional Cloud OCR Integration */}
          <div className="space-y-3">
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-blue-500" />
              <span>Optional Cloud Extension</span>
            </h3>
            <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 space-y-2">
              <div className="text-[11px] text-neutral-500 leading-relaxed">
                If your organization runs a private high-throughput OCR or LibreOffice document conversion service, enter the optional webhook URL below. Otherwise, NextGen PDF Studio defaults to fast offline processing.
              </div>
              <input
                type="url"
                value={cloudOcrEndpoint}
                onChange={(e) => setCloudOcrEndpoint(e.target.value)}
                placeholder="https://your-ocr-service.internal/api/v1 (Optional)"
                className="w-full px-2.5 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-500 text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/70 flex items-center justify-between">
          <span className="text-[11px] text-neutral-400">
            NextGen PDF Studio v2.4 (Enterprise Edition)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1"
            >
              {isSavedNotice ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
