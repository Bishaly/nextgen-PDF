import { get, set, del } from 'idb-keyval';
import { RecentFile, UserSettings, Annotation } from '../types/pdf';

const RECENT_FILES_KEY = 'nextgen_recent_files';
const SETTINGS_KEY = 'nextgen_user_settings';
const CACHED_PDF_KEY_PREFIX = 'nextgen_pdf_cache_';
const ANNOTATIONS_KEY_PREFIX = 'nextgen_annotations_';

export const defaultSettings: UserSettings = {
  theme: 'light',
  defaultZoom: 'fit-width',
  showThumbnails: true,
  authorName: 'User',
  highQualityRender: true,
};

export const storageService = {
  async getSettings(): Promise<UserSettings> {
    try {
      const stored = await get<UserSettings>(SETTINGS_KEY);
      return stored ? { ...defaultSettings, ...stored } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  },

  async saveSettings(settings: UserSettings): Promise<void> {
    try {
      await set(SETTINGS_KEY, settings);
    } catch (e) {
      console.error('Failed to save settings to IndexedDB', e);
    }
  },

  async getRecentFiles(): Promise<RecentFile[]> {
    try {
      const files = await get<RecentFile[]>(RECENT_FILES_KEY);
      return files || [];
    } catch {
      return [];
    }
  },

  async addRecentFile(file: RecentFile, pdfData?: Uint8Array): Promise<void> {
    try {
      const recents = (await this.getRecentFiles()).filter((f) => f.id !== file.id);
      recents.unshift(file);
      // Keep up to 10 recent documents
      const limited = recents.slice(0, 10);
      await set(RECENT_FILES_KEY, limited);

      if (pdfData) {
        await set(`${CACHED_PDF_KEY_PREFIX}${file.id}`, pdfData);
      }
    } catch (e) {
      console.error('Failed to add recent file', e);
    }
  },

  async getCachedPdf(id: string): Promise<Uint8Array | null> {
    try {
      const data = await get<Uint8Array>(`${CACHED_PDF_KEY_PREFIX}${id}`);
      return data || null;
    } catch {
      return null;
    }
  },

  async removeRecentFile(id: string): Promise<void> {
    try {
      const recents = (await this.getRecentFiles()).filter((f) => f.id !== id);
      await set(RECENT_FILES_KEY, recents);
      await del(`${CACHED_PDF_KEY_PREFIX}${id}`);
      await del(`${ANNOTATIONS_KEY_PREFIX}${id}`);
    } catch (e) {
      console.error('Failed to remove recent file', e);
    }
  },

  async clearAllRecentFiles(): Promise<void> {
    try {
      const recents = await this.getRecentFiles();
      for (const f of recents) {
        await del(`${CACHED_PDF_KEY_PREFIX}${f.id}`);
        await del(`${ANNOTATIONS_KEY_PREFIX}${f.id}`);
      }
      await del(RECENT_FILES_KEY);
    } catch (e) {
      console.error('Failed to clear recent files', e);
    }
  },

  async saveAnnotations(documentId: string, annotations: Annotation[]): Promise<void> {
    try {
      await set(`${ANNOTATIONS_KEY_PREFIX}${documentId}`, annotations);
    } catch (e) {
      console.error('Failed to save annotations', e);
    }
  },

  async getAnnotations(documentId: string): Promise<Annotation[]> {
    try {
      const annos = await get<Annotation[]>(`${ANNOTATIONS_KEY_PREFIX}${documentId}`);
      return annos || [];
    } catch {
      return [];
    }
  },
};
