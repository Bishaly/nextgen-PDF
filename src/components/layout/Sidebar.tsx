import React, { useState } from 'react';
import { 
  Images, 
  Bookmark, 
  MessageSquare, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  RotateCw,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { BookmarkItem, Annotation, SearchMatch } from '../../types/pdf';

interface SidebarProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  currentPage: number;
  totalPages: number;
  onSelectPage: (page: number) => void;
  thumbnails: { [page: number]: string };
  bookmarks: BookmarkItem[];
  annotations: Annotation[];
  onSelectAnnotation: (anno: Annotation) => void;
  onDeletePage?: (page: number) => void;
  onRotatePage?: (page: number) => void;
  onSearch: (query: string) => Promise<SearchMatch[]>;
  onSelectSearchMatch: (match: SearchMatch) => void;
}

type SidebarTab = 'thumbnails' | 'bookmarks' | 'annotations' | 'search';

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggleOpen,
  currentPage,
  totalPages,
  onSelectPage,
  thumbnails,
  bookmarks,
  annotations,
  onSelectAnnotation,
  onDeletePage,
  onRotatePage,
  onSearch,
  onSelectSearchMatch,
}) => {
  const [activeTab, setActiveTab] = useState<SidebarTab>('thumbnails');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchMatch[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await onSearch(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error('Search error', err);
    } finally {
      setIsSearching(false);
    }
  };

  const renderBookmarkList = (items: BookmarkItem[], depth = 0) => {
    return (
      <ul className={`space-y-0.5 ${depth > 0 ? 'ml-3 border-l border-neutral-200 dark:border-neutral-800 pl-2' : ''}`}>
        {items.map((bm, idx) => (
          <li key={`${bm.title}-${idx}`}>
            <button
              onClick={() => {
                if (bm.pageIndex) {
                  onSelectPage(bm.pageIndex);
                }
              }}
              className="w-full text-left py-1 px-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs text-neutral-700 dark:text-neutral-300 flex items-center justify-between group transition-colors"
            >
              <span className="truncate pr-1">{bm.title}</span>
              {bm.pageIndex && (
                <span className="text-[10px] font-mono text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 shrink-0">
                  p.{bm.pageIndex}
                </span>
              )}
            </button>
            {bm.items && bm.items.length > 0 && renderBookmarkList(bm.items, depth + 1)}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <aside
      className={`h-full bg-white dark:bg-[#1a1a1e] border-r border-neutral-200 dark:border-neutral-800 flex transition-all duration-200 shrink-0 z-10 ${
        isOpen ? 'w-64' : 'w-10'
      }`}
    >
      {/* Icon Navigation Column */}
      <div className="w-10 bg-[#f8f9fa] dark:bg-[#151518] border-r border-neutral-200 dark:border-neutral-800 flex flex-col items-center py-2.5 gap-2 select-none shrink-0">
        <button
          onClick={() => {
            if (!isOpen) onToggleOpen();
            setActiveTab('thumbnails');
          }}
          className={`p-2 rounded transition-colors ${
            isOpen && activeTab === 'thumbnails'
              ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
          }`}
          title="Page Thumbnails"
        >
          <Images className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            if (!isOpen) onToggleOpen();
            setActiveTab('bookmarks');
          }}
          className={`p-2 rounded transition-colors ${
            isOpen && activeTab === 'bookmarks'
              ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
          }`}
          title="Bookmarks & Outline"
        >
          <Bookmark className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            if (!isOpen) onToggleOpen();
            setActiveTab('annotations');
          }}
          className={`p-2 rounded transition-colors relative ${
            isOpen && activeTab === 'annotations'
              ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
          }`}
          title="Annotations & Comments"
        >
          <MessageSquare className="w-4 h-4" />
          {annotations.length > 0 && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-600 rounded-full" />
          )}
        </button>

        <button
          onClick={() => {
            if (!isOpen) onToggleOpen();
            setActiveTab('search');
          }}
          className={`p-2 rounded transition-colors ${
            isOpen && activeTab === 'search'
              ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
          }`}
          title="Search Document"
        >
          <Search className="w-4 h-4" />
        </button>

        <div className="mt-auto">
          <button
            onClick={onToggleOpen}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
            title={isOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
          >
            {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Content Area */}
      {isOpen && (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="h-9 px-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300 select-none">
            <span>
              {activeTab === 'thumbnails' && `Pages (${totalPages})`}
              {activeTab === 'bookmarks' && 'Bookmarks'}
              {activeTab === 'annotations' && `Annotations (${annotations.length})`}
              {activeTab === 'search' && 'Search in Document'}
            </span>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-2">
            {/* THUMBNAILS TAB */}
            {activeTab === 'thumbnails' && (
              <div className="space-y-3">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                  const isCurrent = pageNum === currentPage;
                  const thumb = thumbnails[pageNum];

                  return (
                    <div
                      key={pageNum}
                      className={`group relative rounded border transition-all p-1.5 ${
                        isCurrent
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 shadow-xs'
                          : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900'
                      }`}
                    >
                      <button
                        onClick={() => onSelectPage(pageNum)}
                        className="w-full flex flex-col items-center focus:outline-none"
                      >
                        <div className="w-full aspect-[1/1.4] bg-neutral-100 dark:bg-neutral-800 rounded overflow-hidden flex items-center justify-center border border-neutral-200/60 dark:border-neutral-800">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={`Page ${pageNum}`}
                              className="w-full h-full object-contain"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span className="text-xs text-neutral-400 font-mono">p. {pageNum}</span>
                          )}
                        </div>
                        <span className="mt-1 text-[11px] font-mono text-neutral-600 dark:text-neutral-400">
                          Page {pageNum}
                        </span>
                      </button>

                      {/* Quick action buttons on hover */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white/90 dark:bg-neutral-800/90 rounded p-0.5 shadow-xs">
                        {onRotatePage && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRotatePage(pageNum);
                            }}
                            title="Rotate Page"
                            className="p-1 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded"
                          >
                            <RotateCw className="w-3 h-3" />
                          </button>
                        )}
                        {onDeletePage && totalPages > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeletePage(pageNum);
                            }}
                            title="Delete Page"
                            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* BOOKMARKS TAB */}
            {activeTab === 'bookmarks' && (
              <div>
                {bookmarks.length > 0 ? (
                  renderBookmarkList(bookmarks)
                ) : (
                  <div className="py-8 text-center text-xs text-neutral-400 dark:text-neutral-500">
                    <Bookmark className="w-6 h-6 mx-auto mb-2 opacity-40" />
                    <p>No bookmarks found in this PDF document.</p>
                  </div>
                )}
              </div>
            )}

            {/* ANNOTATIONS TAB */}
            {activeTab === 'annotations' && (
              <div className="space-y-1.5">
                {annotations.length > 0 ? (
                  annotations.map((anno) => (
                    <button
                      key={anno.id}
                      onClick={() => {
                        onSelectPage(anno.page);
                        onSelectAnnotation(anno);
                      }}
                      className="w-full text-left p-2 rounded border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors text-xs"
                    >
                      <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
                        <span className="font-semibold text-neutral-700 dark:text-neutral-300 capitalize">
                          {anno.type}
                        </span>
                        <span className="font-mono">Page {anno.page}</span>
                      </div>
                      <p className="text-neutral-600 dark:text-neutral-400 line-clamp-2">
                        {anno.text || `Drawing / ${anno.type}`}
                      </p>
                    </button>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-neutral-400 dark:text-neutral-500">
                    <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-40" />
                    <p>No annotations added yet.</p>
                    <p className="text-[11px] mt-1 text-neutral-400">Use the Edit tab to add notes, drawings, or text.</p>
                  </div>
                )}
              </div>
            )}

            {/* SEARCH TAB */}
            {activeTab === 'search' && (
              <div className="space-y-3">
                <form onSubmit={handleSearchSubmit} className="flex gap-1.5">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search words or phrases..."
                    className="flex-1 px-2.5 py-1.5 text-xs bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="px-2.5 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSearching ? '...' : 'Find'}
                  </button>
                </form>

                {searchResults.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      {searchResults.length} {searchResults.length === 1 ? 'match' : 'matches'} found:
                    </span>
                    {searchResults.map((match, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          onSelectPage(match.pageIndex);
                          onSelectSearchMatch(match);
                        }}
                        className="w-full text-left p-2 rounded border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors text-xs"
                      >
                        <div className="text-[10px] text-blue-600 dark:text-blue-400 font-mono mb-0.5">
                          Page {match.pageIndex}
                        </div>
                        <p className="text-neutral-700 dark:text-neutral-300 italic text-[11px]">
                          "{match.text}"
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                {searchQuery && !isSearching && searchResults.length === 0 && (
                  <div className="py-6 text-center text-xs text-neutral-400">
                    No results found for "{searchQuery}".
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
