import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from "react";

// Clés de stockage
const SCAN_DONE_KEY = "basilic_scan_done";
const MF_RESULTS_KEY = "mf_scan_results";
const MO_RESULTS_KEY = "mo_scan_results";
const TEMPLATE_RESULTS_KEY = "template_scan_results";
const MENU_RESULTS_KEY = "menu_results";
const SECTION_RESULTS_KEY = "section_results";

interface SectionScanResult {
    id: string;
    fileName: string;
    key: string;
    schemaName: string;
    assignmentCount: number;
    assignments: string[];
}

interface ScanContextType {
    isScanning: boolean;
    scanProgress: number;
    mfResults: Set<string>;
    moResults: Set<string>;
    templateResults: Set<string>;
    menuResults: Set<string>;
    sectionResults: SectionScanResult[];
    startScan: () => void;
    hasScanRun: boolean;
    scanError: string | null;
}

const ScanContext = createContext<ScanContextType | null>(null);

export function useScan() {
    const ctx = useContext(ScanContext);
    if (!ctx) throw new Error("useScan must be used within ScanProvider");
    return ctx;
}

interface ScanProviderProps {
    children: ReactNode;
}

export function ScanProvider({ children }: ScanProviderProps) {
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [hasScanRun, setHasScanRun] = useState(false);
    const [scanError, setScanError] = useState<string | null>(null);

    const [mfResults, setMfResults] = useState<Set<string>>(new Set());
    const [moResults, setMoResults] = useState<Set<string>>(new Set());
    const [templateResults, setTemplateResults] = useState<Set<string>>(new Set());
    const [menuResults, setMenuResults] = useState<Set<string>>(new Set());
    const [sectionResults, setSectionResults] = useState<SectionScanResult[]>([]);

    const scanAbortRef = useRef<AbortController | null>(null);
    const progressRef = useRef<{ mf: number; mo: number; tpl: number; menu: number; sections: number }>({ mf: 0, mo: 0, tpl: 0, menu: 0, sections: 0 });

    const updateProgress = useCallback(() => {
        const { mf, mo, tpl, menu, sections } = progressRef.current;
        const total = mf + mo + tpl + menu + sections;
        setScanProgress(Math.round(total / 5));
    }, []);

    // Charger le cache
    useEffect(() => {
        try {
            const mf = sessionStorage.getItem(MF_RESULTS_KEY);
            const mo = sessionStorage.getItem(MO_RESULTS_KEY);
            const tpl = sessionStorage.getItem(TEMPLATE_RESULTS_KEY);
            const menu = sessionStorage.getItem(MENU_RESULTS_KEY);
            const sections = sessionStorage.getItem(SECTION_RESULTS_KEY);
            const done = sessionStorage.getItem(SCAN_DONE_KEY);

            if (mf) setMfResults(new Set(JSON.parse(mf)));
            if (mo) setMoResults(new Set(JSON.parse(mo)));
            if (tpl) setTemplateResults(new Set(JSON.parse(tpl)));
            if (menu) setMenuResults(new Set(JSON.parse(menu)));
            if (sections) setSectionResults(JSON.parse(sections));
            if (done === "true") setHasScanRun(true);
        } catch (e) {}
    }, []);

    const runScan = useCallback(async () => {
        if (scanAbortRef.current) scanAbortRef.current.abort();
        const abort = new AbortController();
        scanAbortRef.current = abort;

        setIsScanning(true);
        setScanProgress(0);
        progressRef.current = { mf: 0, mo: 0, tpl: 0, menu: 0, sections: 0 };

        const basePath = window.location.pathname.includes('/app')
            ? window.location.pathname.split('/app')[0] + '/app'
            : '/app';

        try {
            setScanError(null);
            const endpoints = [
                { url: `${basePath}/api/mf-scan`, key: 'mf', setter: (res: any) => setMfResults(new Set(res)), storage: MF_RESULTS_KEY },
                { url: `${basePath}/api/mo-scan`, key: 'mo', setter: (res: any) => setMoResults(new Set(res)), storage: MO_RESULTS_KEY },
                { url: `${basePath}/api/template-scan`, key: 'tpl', setter: (res: any) => setTemplateResults(new Set(res)), storage: TEMPLATE_RESULTS_KEY },
                { url: `${basePath}/api/menu-scan`, key: 'menu', setter: (res: any) => setMenuResults(new Set(res)), storage: MENU_RESULTS_KEY },
                { url: `${basePath}/api/section-scan`, key: 'sections', setter: (res: any) => setSectionResults(res), storage: SECTION_RESULTS_KEY }
            ];

            const results = await Promise.all(endpoints.map(async (e) => {
                try {
                    const res = await scanEndpoint(e.url, abort.signal, (p) => {
                        progressRef.current[e.key as keyof typeof progressRef.current] = p;
                        updateProgress();
                    });
                    e.setter(res);
                    sessionStorage.setItem(e.storage, JSON.stringify(res));
                    return res;
                } catch (err) {
                    console.error(`Endpoint ${e.url} failed:`, err);
                    throw err;
                }
            }));

            sessionStorage.setItem(SCAN_DONE_KEY, "true");
            setHasScanRun(true);
            // Ajouter un délai court avant le reload pour s'assurer que le sessionStorage est bien synchronisé
            await new Promise(r => setTimeout(r, 500));
            window.location.reload();
        } catch (e) {
            if ((e as Error).name !== "AbortError") {
                const errorMsg = String(e);
                console.error("Scan failed", e);
                setScanError(errorMsg);
                // Effacer les résultats partiels en cas d'erreur
                sessionStorage.removeItem(SCAN_DONE_KEY);
            }
        } finally {
            setIsScanning(false);
            scanAbortRef.current = null;
        }
    }, [updateProgress]);

    // Scan auto au premier load si pas fait
    useEffect(() => {
        if (sessionStorage.getItem(SCAN_DONE_KEY) !== "true") {
            const t = setTimeout(runScan, 1000);
            return () => clearTimeout(t);
        }
    }, [runScan]);

    const startScan = useCallback(() => {
        sessionStorage.removeItem(SCAN_DONE_KEY);
        runScan();
    }, [runScan]);

    return (
        <ScanContext.Provider value={{ isScanning, scanProgress, mfResults, moResults, templateResults, menuResults, sectionResults, startScan, hasScanRun, scanError }}>
            {children}
            {isScanning && (
                <div className="loading-overlay">
                    <div className="scan-modal">
                        <div className="scan-modal__spinner" />
                        <div className="scan-modal__content">
                            <div className="scan-modal__title">Analyse du code...</div>
                            <div className="scan-modal__subtitle">Recherche des éléments dans vos fichiers Liquid et JSON</div>
                            <div className="scan-modal__progress">
                                <div className="scan-modal__progress-bar" style={{ width: `${scanProgress}%` }} />
                            </div>
                            <div className="scan-modal__percent">{scanProgress}%</div>
                        </div>
                    </div>
                </div>
            )}
            {scanError && (
                <div className="loading-overlay">
                    <div className="scan-modal">
                        <div className="scan-modal__content">
                            <div className="scan-modal__title" style={{ color: '#F43F5E' }}>Erreur lors du scan</div>
                            <div className="scan-modal__subtitle">{scanError}</div>
                            <button
                                onClick={() => setScanError(null)}
                                style={{
                                    marginTop: '16px',
                                    padding: '8px 16px',
                                    backgroundColor: '#F43F5E',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ScanContext.Provider>
    );
}

async function scanEndpoint(url: string, signal: AbortSignal, onProgress: (p: number) => void): Promise<any[]> {
    try {
        const response = await fetch(url, { signal });

        // Check for authentication errors
        if (response.status === 401 || response.status === 302) {
            console.error(`Authentication error on ${url}: ${response.status}`);
            throw new Error(`Authentication failed (${response.status})`);
        }

        if (!response.ok) {
            console.error(`Endpoint error ${url}: ${response.status}`);
            return [];
        }

        if (!response.body) {
            console.error(`No response body from ${url}`);
            return [];
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let results: string[] = [];
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith("data: ")) continue;
                try {
                    const data = JSON.parse(trimmed.slice(6));
                    if (data.progress !== undefined) onProgress(data.progress);
                    if (data.results) results = data.results;
                    if (data.error) console.warn(`Stream error from ${url}:`, data.error);
                } catch (e) {}
            }
        }
        return results;
    } catch (e) {
        console.error(`Scan endpoint error for ${url}:`, e);
        return [];
    }
}
