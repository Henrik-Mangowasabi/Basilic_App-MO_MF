import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from "react";

// Clés de stockage
const SCAN_DONE_KEY = "basilic_scan_done";
const MF_RESULTS_KEY = "mf_scan_results";
const MO_RESULTS_KEY = "mo_scan_results";

interface ScanContextType {
    isScanning: boolean;
    scanProgress: number;
    mfResults: Set<string>;
    moResults: Set<string>;
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
    const [mfResults, setMfResults] = useState<Set<string>>(new Set());
    const [moResults, setMoResults] = useState<Set<string>>(new Set());
    const [hasScanRun, setHasScanRun] = useState(false);
    const scanAbortRef = useRef<AbortController | null>(null);
    const initialScanDoneRef = useRef(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Charger les résultats du cache au démarrage
    useEffect(() => {
        try {
            const mfCached = sessionStorage.getItem(MF_RESULTS_KEY);
            const moCached = sessionStorage.getItem(MO_RESULTS_KEY);
            if (mfCached) setMfResults(new Set(JSON.parse(mfCached)));
            if (moCached) setMoResults(new Set(JSON.parse(moCached)));
            if (sessionStorage.getItem(SCAN_DONE_KEY)) setHasScanRun(true);
        } catch {
            // Ignorer les erreurs de parsing
        }
    }, []);

    // Lancer le scan automatique au premier chargement (une seule fois par session)
    useEffect(() => {
        if (initialScanDoneRef.current) return;
        if (sessionStorage.getItem(SCAN_DONE_KEY)) {
            initialScanDoneRef.current = true;
            setHasScanRun(true);
            return;
        }
        initialScanDoneRef.current = true;
        
        // Petit délai pour laisser l'app se charger
        const timer = setTimeout(() => {
            runScan();
        }, 500);
        
        return () => clearTimeout(timer);
    }, []);

    const runScan = useCallback(async () => {
        // Annuler un scan en cours si besoin
        if (scanAbortRef.current) {
            scanAbortRef.current.abort();
        }
        
        // Timeout de sécurité (2 minutes max)
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            console.warn("Scan timeout - forcing completion");
            setIsScanning(false);
            setScanProgress(0);
            sessionStorage.setItem(SCAN_DONE_KEY, "true");
            setHasScanRun(true);
        }, 120000);

        const abort = new AbortController();
        scanAbortRef.current = abort;
        
        setIsScanning(true);
        setScanProgress(0);

        const basePath = window.location.pathname.includes('/app') 
            ? window.location.pathname.split('/app')[0] + '/app'
            : '/app';

        try {
            // Scanner MF et MO en parallèle
            const [mfData, moData] = await Promise.all([
                scanEndpoint(`${basePath}/api/mf-scan`, abort.signal, (p) => setScanProgress(Math.round(p / 2))),
                scanEndpoint(`${basePath}/api/mo-scan`, abort.signal, (p) => setScanProgress(50 + Math.round(p / 2)))
            ]);

            // Sauvegarder les résultats
            if (mfData.length > 0) {
                sessionStorage.setItem(MF_RESULTS_KEY, JSON.stringify(mfData));
                setMfResults(new Set(mfData));
            }
            if (moData.length > 0) {
                sessionStorage.setItem(MO_RESULTS_KEY, JSON.stringify(moData));
                setMoResults(new Set(moData));
            }

            sessionStorage.setItem(SCAN_DONE_KEY, "true");
            setHasScanRun(true);
        } catch (e) {
            if ((e as Error).name !== "AbortError") {
                console.error("Scan error:", e);
            }
        } finally {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setIsScanning(false);
            setScanProgress(0);
            scanAbortRef.current = null;
        }
    }, []);

    const startScan = useCallback(() => {
        // Réinitialiser le cache pour forcer un nouveau scan
        sessionStorage.removeItem(SCAN_DONE_KEY);
        runScan();
    }, [runScan]);

    return (
        <ScanContext.Provider value={{ isScanning, scanProgress, mfResults, moResults, startScan, hasScanRun }}>
            {children}
            
            {/* Modale de scan globale */}
            {isScanning && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-[24px] p-8 shadow-2xl flex flex-col items-center gap-4 min-w-[320px]">
                        <div className="w-14 h-14 border-4 border-[#4BB961]/20 border-t-[#4BB961] rounded-full animate-spin" />
                        <div className="text-center">
                            <div className="text-[17px] font-semibold text-[#18181B] mb-1">
                                Scan du code en cours...
                            </div>
                            <div className="text-[13px] text-[#71717A] mb-3">
                                Analyse des metafields et metaobjects
                            </div>
                            {/* Barre de progression */}
                            <div className="w-full h-2 bg-[#E4E4E7] rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-[#4BB961] transition-all duration-300 ease-out"
                                    style={{ width: `${scanProgress}%` }}
                                />
                            </div>
                            <div className="text-[12px] text-[#A1A1AA] mt-2">
                                {scanProgress}%
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </ScanContext.Provider>
    );
}

/**
 * Scanner un endpoint SSE et retourner les résultats
 */
async function scanEndpoint(
    url: string, 
    signal: AbortSignal, 
    onProgress: (progress: number) => void
): Promise<string[]> {
    try {
        const res = await fetch(url, { signal, credentials: "same-origin" });
        
        if (!res.ok || !res.body) {
            console.warn(`Scan endpoint ${url} failed:`, res.status);
            return [];
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let results: string[] = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                try {
                    const raw = trimmed.startsWith("data: ") ? trimmed.slice(6) : trimmed;
                    const data = JSON.parse(raw) as { progress?: number; results?: string[] };
                    
                    if (data.progress !== undefined) {
                        onProgress(data.progress);
                    }
                    if (data.results && Array.isArray(data.results)) {
                        results = data.results;
                    }
                } catch {
                    // Ignorer les lignes malformées
                }
            }
        }

        // Traiter le reste du buffer
        if (buffer.trim()) {
            try {
                const raw = buffer.trim().startsWith("data: ") ? buffer.trim().slice(6) : buffer.trim();
                const data = JSON.parse(raw) as { progress?: number; results?: string[] };
                if (data.results && Array.isArray(data.results)) {
                    results = data.results;
                }
            } catch {
                // Ignorer
            }
        }

        return results;
    } catch (e) {
        if ((e as Error).name === "AbortError") throw e;
        console.error(`Error scanning ${url}:`, e);
        return [];
    }
}
