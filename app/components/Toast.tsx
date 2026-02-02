import React from "react";
import type { ToastData } from "../hooks/useToast";
import { Icons } from "./Icons";

interface ToastProps {
    data: ToastData;
    onClose: () => void;
}

/**
 * Composant Toast pour afficher des notifications temporaires
 *
 * Utilisé en combinaison avec le hook useToast pour afficher des messages
 * de succès, erreur, info ou warning à l'utilisateur.
 *
 * @example
 * ```tsx
 * const { toast, showToast, hideToast } = useToast();
 *
 * return (
 *   <>
 *     <button onClick={() => showToast("Succès", "Action effectuée", "success")}>
 *       Déclencher
 *     </button>
 *     {toast && <Toast data={toast} onClose={hideToast} />}
 *   </>
 * );
 * ```
 */
export function Toast({ data, onClose }: ToastProps) {
    const { title, message, type = "info" } = data;

    const getIcon = () => {
        switch (type) {
            case "success":
                return <Icons.Check className="toast__icon toast__icon--success" />;
            case "error":
                return <Icons.Close className="toast__icon toast__icon--error" />;
            case "warning":
                return <Icons.Info className="toast__icon toast__icon--warning" />;
            case "info":
            default:
                return <Icons.Info className="toast__icon toast__icon--info" />;
        }
    };

    return (
        <div className={`toast toast--${type}`}>
            <div className="toast__icon-wrapper">
                {getIcon()}
            </div>
            <div className="toast__content">
                <span className="toast__title">{title}</span>
                <span className="toast__message">{message}</span>
            </div>
            <button
                className="toast__close"
                onClick={onClose}
                role="button"
                aria-label="Fermer"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onClose();
                    }
                }}
            >
                <Icons.Close />
            </button>
        </div>
    );
}
