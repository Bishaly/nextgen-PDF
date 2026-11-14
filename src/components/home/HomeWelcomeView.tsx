import React, { useRef } from 'react';
import { 
  FileText, 
  Upload, 
  Sparkles, 
  FileSpreadsheet, 
  Layers, 
  ScanText, 
  Lock, 
  Clock, 
  ShieldCheck, 
  Trash2,
  FolderOpen
} from 'lucide-react';
import { RecentFile } from '../../types/pdf';

interface HomeWelcomeViewProps {
  onOpenFile: () => void;
  onOpenSample: () => void;
  onFileDrop: (file: File) => void;
  recentFiles: RecentFile[];
  onOpenRecent: (file: RecentFile) => void;
  onRemoveRecent: (id: string) => void;
  onQuickAction: (action: string) => void;
}

export const HomeWelcomeView: React.FC<HomeWelcomeViewProps> = ({
  onOpenFile,
  onOpenSample,
  onFileDrop,
  recentFiles,
  onOpenRecent,
  onRemoveRecent,
  onQuickAction,
}) => {
  return (
    <div
      className="flex-1 flex flex-col h-full bg-[#f8f9fa] dark:bg-[#121215] overflow-y-auto p-6 md:p-10 select-none"
    >
      <div className="max-w-5xl mx-auto w-full space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-2.5 pt-4">
          <div className="flex justify-center mb-1">
            <img
              src="./assets/aistudio/ChatGPT_Image_Nov_14__2026__03_03_43_PM_22acb7f7.png"
              alt="NextGen PDF Studio Icon"
              className="w-16 h-16 rounded-2xl object-contain shadow-md"
              draggable={false}
            />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>100% Client-Side Privacy — Documents Never Leave Your Device</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            NextGen PDF Studio
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm max-w-xl mx-auto">
            High-performance desktop PDF reader, interactive annotator, optical character recognition, and format converter.
          </p>
        </div>

        {/* Drag & Drop Opening Card */}
        <div className="bg-white dark:bg-[#18181b] border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 shadow-xs">
            <Upload className="w-7 h-7" />
          </div>

          <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
            Drag and drop your PDF here to begin
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-5 max-w-md">
            Works with standard PDFs, scanned documents, contracts, invoices, and password-protected files.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onOpenFile}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Browse Local PDFs</span>
            </button>

            <button
              onClick={onOpenSample}
              className="px-5 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-medium text-xs flex items-center gap-2 transition-all border border-neutral-200 dark:border-neutral-700"
            >
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Open Sample Document</span>
            </button>
          </div>
        </div>

        {/* Quick Launch Tools Grid */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Quick Productivity Workflows
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { id: 'merge', title: 'Merge PDFs', desc: 'Combine multiple files into one', icon: Layers, color: 'text-blue-600' },
              { id: 'ocr', title: 'OCR Scanner', desc: 'Extract text from scans', icon: ScanText, color: 'text-indigo-600' },
              { id: 'word', title: 'PDF to Word', desc: 'Generate native .docx format', icon: FileText, color: 'text-sky-600' },
              { id: 'excel', title: 'PDF to Excel', desc: 'Extract tables into .xlsx', icon: FileSpreadsheet, color: 'text-emerald-600' },
            ].map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  onClick={() => onQuickAction(tool.id)}
                  className="bg-white dark:bg-[#18181b] border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 rounded-xl p-4 text-left transition-all hover:shadow-sm group"
                >
                  <Icon className={`w-5 h-5 ${tool.color} mb-2.5 group-hover:scale-110 transition-transform`} />
                  <h4 className="font-semibold text-xs text-neutral-900 dark:text-neutral-100">
                    {tool.title}
                  </h4>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {tool.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent Documents Section */}
        {recentFiles.length > 0 && (
          <div className="space-y-3 pb-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Recent Documents</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {recentFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => onOpenRecent(file)}
                  className="bg-white dark:bg-[#18181b] border border-neutral-200 dark:border-neutral-800 hover:border-blue-400 dark:hover:border-blue-600 rounded-xl p-3 flex items-center justify-between cursor-pointer group shadow-2xs transition-all"
                >
                  <div className="flex items-center gap-3 truncate pr-2">
                    <div className="w-10 h-12 bg-neutral-100 dark:bg-neutral-800 rounded flex items-center justify-center shrink-0 border border-neutral-200/60 dark:border-neutral-800 overflow-hidden">
                      {file.thumbnail ? (
                        <img
                          src={file.thumbnail}
                          alt={file.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <FileText className="w-5 h-5 text-neutral-400" />
                      )}
                    </div>
                    <div className="truncate">
                      <h4 className="font-medium text-xs text-neutral-800 dark:text-neutral-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {file.name}
                      </h4>
                      <p className="text-[10px] text-neutral-400 mt-0.5 font-mono">
                        {file.pageCount} pages · {(file.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveRecent(file.id);
                    }}
                    className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                    title="Remove from recents"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
