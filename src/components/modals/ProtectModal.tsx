import React, { useState } from 'react';
import { X, Lock, Unlock, Check, ShieldAlert } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { pdfEditorService } from '../../services/pdfEditorService';

interface ProtectModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentBytes: Uint8Array;
  documentName: string;
  onProtectedSuccess: (bytes: Uint8Array, name: string) => void;
}

export const ProtectModal: React.FC<ProtectModalProps> = ({
  isOpen,
  onClose,
  documentBytes,
  documentName,
  onProtectedSuccess,
}) => {
  const [tab, setTab] = useState<'protect' | 'unprotect'>('protect');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleProtect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === 'unprotect') {
      setIsProcessing(true);
      setError('');
      try {
        const cleanBytes = await pdfEditorService.removePassword(documentBytes);
        const newName = `${documentName.replace(/_protected|\.pdf$/gi, '')}_unlocked.pdf`;
        onProtectedSuccess(cleanBytes, newName);
        onClose();
      } catch (err: any) {
        console.error('Password removal failed', err);
        setError('Failed to remove password: ' + (err.message || 'Authorization error'));
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    if (!password) {
      setError('Please enter a password');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const pdfDoc = await PDFDocument.load(documentBytes, { ignoreEncryption: true });
      (pdfDoc as any).encrypt({
        userPassword: password,
        ownerPassword: password + '_owner',
        permissions: {
          printing: 'highResolution',
          modifying: false,
          copying: true,
          annotating: true,
          fillingForms: true,
          contentAccessibility: true,
          documentAssembly: false,
        },
      });

      const protectedBytes = await pdfDoc.save();
      const newName = `${documentName.replace('.pdf', '')}_protected.pdf`;
      onProtectedSuccess(protectedBytes, newName);
      onClose();
    } catch (err: any) {
      console.error('Password protection notice', err);
      setError('Failed to apply password encryption: ' + (err.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1f1f23] rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-sm overflow-hidden flex flex-col text-xs">
        <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {tab === 'protect' ? (
              <Lock className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            ) : (
              <Unlock className="w-4 h-4 text-emerald-600" />
            )}
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
              Document Security & Password
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
          <button
            type="button"
            onClick={() => { setTab('protect'); setError(''); }}
            className={`flex-1 py-2 text-xs font-medium border-b-2 ${
              tab === 'protect'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-[#1f1f23]'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            Add Password
          </button>
          <button
            type="button"
            onClick={() => { setTab('unprotect'); setError(''); }}
            className={`flex-1 py-2 text-xs font-medium border-b-2 ${
              tab === 'unprotect'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-[#1f1f23]'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            Remove Password
          </button>
        </div>

        <form onSubmit={handleProtect} className="p-5 space-y-3.5">
          {tab === 'protect' ? (
            <>
              <p className="text-neutral-600 dark:text-neutral-400">
                Set a password required to open and view <span className="font-semibold text-neutral-900 dark:text-neutral-100">{documentName}</span>.
              </p>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Enter Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100"
                />
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-neutral-600 dark:text-neutral-400">
                Authorized Removal: Save an unlocked, password-free copy of <span className="font-semibold text-neutral-900 dark:text-neutral-100">{documentName}</span>.
              </p>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 rounded-lg border border-amber-200 dark:border-amber-900/40 text-[11px] leading-relaxed">
                Only remove passwords from documents you have authorization to modify. The unlocked copy can be opened by anyone without password prompts.
              </div>
            </div>
          )}

          {error && (
            <div className="p-2.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className={`px-4 py-1.5 rounded-lg text-white font-medium flex items-center gap-1.5 shadow-xs disabled:opacity-40 ${
                tab === 'protect' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>
                {isProcessing
                  ? 'Processing...'
                  : tab === 'protect'
                  ? 'Encrypt & Save'
                  : 'Remove Password & Save'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
