import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from "react";

// Clés de stockage
const SCAN_DONE_KEY = "basilic_scan_done";
const MF_RESULTS_KEY = "mf_scan_results";
const MO_RESULTS_KEY = "mo_scan_results";
const TEMPLATE_RESULTS_KEY = "template_scan_results";
const MENU_RESULTS_KEY = "menu_scan_results";

interface ScanContextType {
    isScanning: boolean;
    scanProgress: number;
    mfResults: Set<string>;
    moResults: Set<string>;
    templateResults: Set<string>;
    menuResults: Set<string>;
    startScan: () => void;
    hasScanRun: boolean;
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
    
    const [mfResults, setMfResults] = useState<Set<string>>(new Set());
    const [moResults, setMoResults] = useState<Set<string>>(new Set());
    const [templateResults, setTemplateResults] = useState<Set<string>>(new Set());
    const [menuResults, setMenuResults] = useState<Set<string>>(new Set());

    const scanAbortRef = useRef<AbortController | null>(null);
    const progressRef = useRef<{ mf: number; mo: number; tpl: number; menu: number }>({ mf: 0, mo: 0, tpl: 0, menu: 0 });

    const updateProgress = useCallback(() => {
        const { mf, mo, tpl, menu } = progressRef.current;
        const total = mf + mo + tpl + menu;
        setScanProgress(Math.round(total / 4));
    }, []);

    // Charger le cache
    useEffect(() => {
        try {
            const mf = sessionStorage.getItem(MF_RESULTS_KEY);
            const mo = sessionStorage.getItem(MO_RESULTS_KEY);
            const tpl = sessionStorage.getItem(TEMPLATE_RESULTS_KEY);
            const menu = sessionStorage.getItem(MENU_RESULTS_KEY);
            const done = sessionStorage.getItem(SCAN_DONE_KEY);

            if (mf) setMfResults(new Set(JSON.parse(mf)));
            if (mo) setMoResults(new Set(JSON.parse(mo)));
            if (tpl) setTemplateResults(new Set(JSON.parse(tpl)));
            if (menu) setMenuResults(new Set(JSON.parse(menu)));
            if (done === "true") setHasScanRun(true);
        } catch (e) {}
    }, []);

    const runScan = useCallback(async () => {
        if (scanAbortRef.current) scanAbortRef.current.abort();
        const abort = new AbortController();
        scanAbortRef.current = abort;

        setIsScanning(true);
        setScanProgress(0);
        progressRef.current = { mf: 0, mo: 0, tpl: 0, menu: 0 };

        const basePath = window.location.pathname.includes('/app') 
            ? window.location.pathname.split('/app')[0] + '/app'
            : '/app';

        try {
            const endpoints = [
                { url: `${basePath}/api/mf-scan`, key: 'mf', setter: setMfResults, storage: MF_RESULTS_KEY },
                { url: `${basePath}/api/mo-scan`, key: 'mo', setter: setMoResults, storage: MO_RESULTS_KEY },
                { url: `${basePath}/api/template-scan`, key: 'tpl', setter: setTemplateResults, storage: TEMPLATE_RESULTS_KEY },
                { url: `${basePath}/api/menu-scan`, key: 'menu', setter: setMenuResults, storage: MENU_RESULTS_KEY }
            ];

            const results = await Promise.all(endpoints.map(async (e) => {
                const res = await scanEndpoint(e.url, abort.signal, (p) => {
                    progressRef.current[e.key as keyof typeof progressRef.current] = p;
                    updateProgress();
                });
                e.setter(new Set(res));
                sessionStorage.setItem(e.storage, JSON.stringify(res));
                return res;
            }));

            sessionStorage.setItem(SCAN_DONE_KEY, "true");
            setHasScanRun(true);
        } catch (e) {
            if ((e as Error).name !== "AbortError") console.error("Scan failed", e);
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
        <ScanContext.Provider value={{ isScanning, scanProgress, mfResults, moResults, templateResults, menuResults, startScan, hasScanRun }}>
            {children}
            {isScanning && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[24px] p-8 shadow-2xl flex flex-col items-center gap-4 min-w-[340px]">
                        <div className="w-14 h-14 border-4 border-[#4BB961]/20 border-t-[#4BB961] rounded-full animate-spin" />
                        <div className="text-center w-full">
                            <div className="text-[17px] font-semibold text-[#18181B] mb-1">Analyse du code...</div>
                            <div className="text-[13px] text-[#71717A] mb-4">Recherche des éléments dans vos fichiers Liquid et JSON</div>
                            <div className="w-full h-2 bg-[#E4E4E7] rounded-full overflow-hidden mb-2">
                                <div className="h-full bg-[#4BB961] transition-all duration-300 ease-out" style={{ width: `${scanProgress}%` }} />
                            </div>
                            <div className="text-[12px] font-bold text-[#4BB961]">{scanProgress}%</div>
                        </div>
                    </div>
                </div>
            )}
        </ScanContext.Provider>
    );
}

async function scanEndpoint(url: string, signal: AbortSignal, onProgress: (p: number) => void): Promise<string[]> {
    try {
        const response = await fetch(url, { signal });
        if (!response.ok || !response.body) return [];

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
                } catch (e) {}
            }
        }
        return results;
    } catch (e) {
        return [];
    }
}
