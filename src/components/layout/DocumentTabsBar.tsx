import React from 'react';
import { FileText, Plus, X, Home } from 'lucide-react';
import { OpenDocumentSession } from '../../types/pdf';

interface DocumentTabsBarProps {
  tabs: OpenDocumentSession[];
  activeTabId: string | null;
  onSelectTab: (tabId: string | null) => void;
  onCloseTab: (tabId: string) => void;
  onOpenFiles: () => void;
}

export const DocumentTabsBar: React.FC<DocumentTabsBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onOpenFiles,
}) => {
  if (tabs.length === 0) return null;

  return (
    <div className="h-8 bg-neutral-100 dark:bg-[#19191d] border-b border-neutral-200 dark:border-neutral-800 flex items-center px-2 gap-1 overflow-x-auto select-none shrink-0 z-20">
      {/* Start / Home Tab */}
      <button
        onClick={() => onSelectTab(null)}
        title="Home & Recent Files"
        className={`flex items-center gap-1.5 px-2.5 h-6.5 rounded-t text-[11px] font-medium transition-colors shrink-0 border border-b-0 ${
          activeTabId === null
            ? 'bg-white dark:bg-[#242429] text-blue-600 dark:text-blue-400 border-neutral-200 dark:border-neutral-700 shadow-2xs'
            : 'bg-transparent text-neutral-600 dark:text-neutral-400 border-transparent hover:bg-neutral-200/70 dark:hover:bg-neutral-800/70'
        }`}
      >
        <Home className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Home</span>
      </button>

      {/* Open PDF Document Tabs */}
      {tabs.map((tab) => {
        const isActive = tab.tabId === activeTabId;
        const pageInfo = `${tab.currentPage}/${tab.docProxy?.numPages || tab.documentInfo.pageCount}`;
        return (
          <div
            key={tab.tabId}
            onClick={() => onSelectTab(tab.tabId)}
            onMouseDown={(e) => {
              // Middle click closes tab
              if (e.button === 1) {
                e.preventDefault();
                onCloseTab(tab.tabId);
              }
            }}
            title={`${tab.documentInfo.name} (${pageInfo} pages)`}
            className={`group flex items-center gap-1.5 pl-2.5 pr-1.5 h-6.5 max-w-[220px] rounded-t text-[11px] cursor-pointer transition-colors shrink-0 border border-b-0 ${
              isActive
                ? 'bg-white dark:bg-[#242429] text-neutral-900 dark:text-neutral-100 border-neutral-200 dark:border-neutral-700 font-semibold shadow-2xs'
                : 'bg-neutral-200/50 dark:bg-neutral-800/40 text-neutral-600 dark:text-neutral-400 border-transparent hover:bg-neutral-200/90 dark:hover:bg-neutral-800/80'
            }`}
          >
            <FileText
              className={`w-3.5 h-3.5 shrink-0 ${
                isActive ? 'text-red-600 dark:text-red-400' : 'text-neutral-400'
              }`}
            />
            <span className="truncate">{tab.documentInfo.name}</span>
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono shrink-0">
              {pageInfo}
            </span>
            {tab.hasUnsavedChanges && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"
                title="Unsaved changes"
              />
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.tabId);
              }}
              className="p-0.5 rounded hover:bg-neutral-300/80 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 shrink-0"
              title="Close Document Tab (Ctrl+W)"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}

      {/* Add / Open Another PDF Tab */}
      <button
        onClick={onOpenFiles}
        title="Open Additional PDF(s) in New Tab (Ctrl+O)"
        className="flex items-center gap-1 px-2 h-6 rounded text-[11px] font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/80 dark:hover:bg-neutral-800 transition-colors shrink-0 ml-0.5"
      >
        <Plus className="w-3.5 h-3.5" />
        <span className="hidden md:inline">Open PDF</span>
      </button>
    </div>
  );
};
