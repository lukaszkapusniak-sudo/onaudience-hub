/**
 * Globals attached to `window` by the hub app for E2E (page.evaluate).
 * Replace with generated types when the hub is migrated to TypeScript.
 */
export {};

declare global {
  interface Window {
    S?: { contacts?: Array<Record<string, unknown>>; [key: string]: unknown };
    _oaState?: {
      companies?: unknown[];
      audiences?: Array<Record<string, unknown>>;
      contacts?: Array<Record<string, unknown>>;
      currentCompany?: unknown;
      activeAudience?: unknown;
      [key: string]: unknown;
    };
    currentCompany?: unknown;
    /** Present once hub scripts have run (E2E beforeEach waits for app). */
    clearAI(): void;
    setFilter(filter: string, el: Element | null | undefined): void;
    switchTab(tab: string): void;
    closeComposer?: () => void;
    closePanel(): void;
    closeDrawer(): void;
    openCompany(co: unknown): void;
    openDrawer?: (id: string) => void;
    updateGmailNavBtn?: () => void;
    _gmailLastThreads?: unknown[];
    _gmailLastSlug?: string;
    _gmailLastName?: string;
    _gmailFoundContacts?: unknown[];
    gmailRenderResults?: (...args: unknown[]) => void;
    gmailSaveSelectedContacts?: () => void;
    gmailSaveContacts?: ((...args: unknown[]) => void | Promise<void>) | undefined;
    gmailShowSummarizePrompt(...args: unknown[]): void;
    audNew(): void;
    audOpen(id: string): void;
    openMergeModal?: () => void;
    mapSegments?: () => void;
    tcfClearSel(): void;
  }
}
