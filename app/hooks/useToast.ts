import { useState, useCallback, useEffect } from "react";

export interface ToastData {
    title: string;
    message: string;
    type?: "success" | "error" | "info" | "warning";
    duration?: number; // en millisecondes, default 10000ms (10 sec)
}

/**
 * Hook pour gérer les notifications toast
 *
 * Simplifie l'affichage des notifications temporaires dans toute l'application.
 * Gère automatiquement le timeout et le nettoyage.
 *
 * @example
 * ```tsx
 * const { showToast, toast, hideToast } = useToast();
 *
 * // Notification simple
 * showToast("Succès", "L'action a été effectuée");
 *
 * // Notification avec type
 * showToast("Erreur", "Une erreur est survenue", "error");
 *
 * // Notification avec durée custom (3 sec)
 * showToast("Info", "Message important", "info", 3000);
 *
 * // Dans le rendu
 * {toast && <Toast data={toast} onClose={hideToast} />}
 * ```
 */
export function useToast() {
    const [toast, setToast] = useState<ToastData | null>(null);

    const showToast = useCallback((
        title: string,
        message: string,
        type: "success" | "error" | "info" | "warning" = "info",
        duration: number = 10000
    ) => {
        setToast({ title, message, type, duration });
    }, []);

    const hideToast = useCallback(() => {
        setToast(null);
    }, []);

    // Auto-hide après duration
    useEffect(() => {
        if (!toast) return;

        const timer = setTimeout(() => {
            setToast(null);
        }, toast.duration || 10000);

        return () => clearTimeout(timer);
    }, [toast]);

    return {
        toast,
        showToast,
        hideToast
    };
}
