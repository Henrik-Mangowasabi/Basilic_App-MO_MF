import React from "react";

/**
 * Bibliothèque centralisée d'icônes SVG
 *
 * Toutes les icônes utilisées dans l'application sont définies ici pour:
 * - Éviter la duplication de code SVG
 * - Assurer la cohérence visuelle
 * - Faciliter les modifications globales
 * - Réduire la taille du bundle
 *
 * @example
 * ```tsx
 * import { Icons } from "../components/Icons";
 *
 * <Icons.Edit className="w-4 h-4 text-gray-500" />
 * <Icons.Delete onClick={handleDelete} />
 * ```
 */

interface IconProps extends React.SVGProps<SVGSVGElement> {
    size?: number;
}

export const Icons = {
    /**
     * Icône Edit/Modifier
     */
    Edit: ({ size, ...props }: IconProps) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size ?? 20} height={size ?? 20} viewBox="0 0 20 20" fill="none" {...props}>
            <path d="M12.739 2.62648L11.9666 3.39888L4.86552 10.4999C4.38456 10.9809 4.14407 11.2214 3.93725 11.4865C3.69328 11.7993 3.48412 12.1378 3.31346 12.4959C3.16878 12.7994 3.06123 13.1221 2.84614 13.7674L1.93468 16.5017L1.71188 17.1701C1.60603 17.4877 1.68867 17.8378 1.92536 18.0745C2.16205 18.3112 2.51215 18.3938 2.8297 18.288L3.4981 18.0652L6.23249 17.1537C6.87777 16.9386 7.20042 16.8311 7.50398 16.6864C7.86208 16.5157 8.20052 16.3066 8.51331 16.0626C8.77847 15.8558 9.01895 15.6153 9.49992 15.1343L16.601 8.03328L17.3734 7.26088C18.6531 5.98113 18.6531 3.90624 17.3734 2.62648C16.0936 1.34673 14.0187 1.34673 12.739 2.62648Z" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M11.9665 3.39884C11.9665 3.39884 12.063 5.04019 13.5113 6.48844C14.9595 7.93669 16.6008 8.03324 16.6008 8.03324M3.498 18.0651L1.93457 16.5017" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
    ),

    /**
     * Icône Delete/Supprimer
     */
    Delete: ({ size, ...props }: IconProps) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size ?? 20} height={size ?? 20} viewBox="0 0 20 20" fill="none" {...props}>
            <path d="M17.0832 5H2.9165" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M15.6946 7.08333L15.3113 12.8326C15.1638 15.045 15.09 16.1512 14.3692 16.8256C13.6483 17.5 12.5397 17.5 10.3223 17.5H9.67787C7.46054 17.5 6.35187 17.5 5.63103 16.8256C4.91019 16.1512 4.83644 15.045 4.68895 12.8326L4.30566 7.08333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M7.9165 9.16667L8.33317 13.3333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M12.0832 9.16667L11.6665 13.3333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M5.4165 5C5.46307 5 5.48635 5 5.50746 4.99947C6.19366 4.98208 6.79902 4.54576 7.03252 3.90027C7.0397 3.88041 7.04706 3.85832 7.06179 3.81415L7.14269 3.57143C7.21176 3.36423 7.24629 3.26063 7.2921 3.17267C7.47485 2.82173 7.81296 2.57803 8.20368 2.51564C8.30161 2.5 8.41082 2.5 8.62922 2.5H11.3705C11.5889 2.5 11.6981 2.5 11.796 2.51564C12.1867 2.57803 12.5248 2.82173 12.7076 3.17267C12.7534 3.26063 12.7879 3.36423 12.857 3.57143L12.9379 3.81415C12.9526 3.85826 12.96 3.88042 12.9672 3.90027C13.2007 4.54576 13.806 4.98208 14.4922 4.99947C14.5133 5 14.5366 5 14.5832 5" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
    ),

    /**
     * Icône Link/Lien externe
     */
    Link: ({ size, ...props }: IconProps) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size ?? 20} height={size ?? 20} viewBox="0 0 20 20" fill="none" {...props}>
            <path d="M8.372 11.6667C7.11703 10.4068 7.23007 8.25073 8.62449 6.85091L12.6642 2.79552C14.0586 1.3957 16.2064 1.28222 17.4613 2.54206C18.7163 3.8019 18.6033 5.95797 17.2088 7.3578L15.189 9.3855" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path opacity="0.5" d="M11.6281 8.33333C12.8831 9.59317 12.77 11.7492 11.3756 13.1491L9.35575 15.1768L7.33591 17.2045C5.94149 18.6043 3.79373 18.7178 2.53875 17.4579C1.28378 16.1981 1.39682 14.042 2.79124 12.6422L4.81111 10.6144" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
    ),

    /**
     * Icône ChevronRight/Flèche droite
     */
    ChevronRight: ({ size, ...props }: IconProps) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size ?? 20} height={size ?? 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="m9 18 6-6-6-6"/>
        </svg>
    ),

    /**
     * Icône ChevronDown/Flèche bas
     */
    ChevronDown: ({ size, ...props }: IconProps) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size ?? 20} height={size ?? 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
            <path d="m6 9 6 6 6-6"/>
        </svg>
    ),

    /**
     * Icône VerticalDots/Menu points verticaux
     */
    VerticalDots: ({ size, ...props }: IconProps) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size ?? 16} height={size ?? 16} viewBox="0 0 16 16" fill="none" {...props}>
            <path opacity="0.5" d="M4 8C4 8.55228 3.55228 9 3 9C2.44772 9 2 8.55228 2 8C2 7.44772 2.44772 7 3 7C3.55228 7 4 7.44772 4 8Z" fill="#18181B"/>
            <path opacity="0.5" d="M9 8C9 8.55228 8.55228 9 8 9C7.44772 9 7 8.55228 7 8C7 7.44772 7.44772 7 8 7C8.55228 7 9 7.44772 9 8Z" fill="#18181B"/>
            <path opacity="0.5" d="M14 8C14 8.55228 13.5523 9 13 9C12.4477 9 12 8.55228 12 8C12 7.44772 12.4477 7 13 7C13.5523 7 14 7.44772 14 8Z" fill="#18181B"/>
        </svg>
    ),

    /**
     * Icône Clear/Close/X
     */
    Close: ({ size, ...props }: IconProps) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size ?? 18} height={size ?? 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
            <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
    ),

    /**
     * Icône Refresh/Actualiser
     */
    Refresh: ({ size, ...props }: IconProps) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size ?? 18} height={size ?? 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
            <path d="M21 3v5h-5"/>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
            <path d="M8 16H3v5"/>
        </svg>
    ),

    /**
     * Icône Search/Recherche
     */
    Search: ({ size, ...props }: IconProps) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size ?? 24} height={size ?? 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.3-4.3"/>
        </svg>
    ),

    /**
     * Icône Section/Layout
     */
    Section: ({ size, ...props }: IconProps) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size ?? 20} height={size ?? 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="3" y1="9" x2="21" y2="9"/>
            <line x1="9" y1="21" x2="9" y2="9"/>
        </svg>
    ),

    /**
     * Icône Database/Données
     */
    Database: ({ size, ...props }: IconProps) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size ?? 20} height={size ?? 20} viewBox="0 0 20 20" fill="none" {...props}>
            <path d="M17.5 4.16667C17.5 5.7775 14.1421 7.08333 10 7.08333C5.85786 7.08333 2.5 5.7775 2.5 4.16667C2.5 2.55584 5.85786 1.25 10 1.25C14.1421 1.25 17.5 2.55584 17.5 4.16667Z" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M17.5 10C17.5 11.6108 14.1421 12.9167 10 12.9167C5.85786 12.9167 2.5 11.6108 2.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M17.5 15.8333C17.5 17.4442 14.1421 18.75 10 18.75C5.85786 18.75 2.5 17.4442 2.5 15.8333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M2.5 4.16667V15.8333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M17.5 4.16667V15.8333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
    ),

    /**
     * Icône Sparkle/Magie (génération AI)
     */
    Sparkle: ({ size, ...props }: IconProps) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size ?? 18} height={size ?? 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
        </svg>
    ),

    /**
     * Icône Check/Validé
     */
    Check: ({ size, ...props }: IconProps) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size ?? 20} height={size ?? 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" {...props}>
            <path d="M20 6L9 17l-5-5"/>
        </svg>
    ),

    /**
     * Icône Info
     */
    Info: ({ size, ...props }: IconProps) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size ?? 14} height={size ?? 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" {...props}>
            <path d="M12 16V12M12 8H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"/>
        </svg>
    ),

    /**
     * Icône Layout/Structure
     */
    Layout: ({ size, ...props }: IconProps) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size ?? 18} height={size ?? 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="3" y1="9" x2="21" y2="9"/>
            <line x1="9" y1="21" x2="9" y2="9"/>
        </svg>
    ),

    /**
     * Icône Products/Métaobjets
     */
    Products: ({ size, ...props }: IconProps) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size ?? 20} height={size ?? 20} viewBox="0 0 24 24" fill="none" {...props}>
            <path d="M8.372 11.6667C7.11703 10.4068 7.23007 8.25073 8.62449 6.85091L12.6642 2.79552C14.0586 1.3957 16.2064 1.28222 17.4613 2.54206C18.7163 3.8019 18.6033 5.95797 17.2088 7.3578L15.189 9.3855" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path opacity="0.5" d="M11.6281 8.33333C12.8831 9.59317 12.77 11.7492 11.3756 13.1491L9.35575 15.1768L7.33591 17.2045C5.94149 18.6043 3.79373 18.7178 2.53875 17.4579C1.28378 16.1981 1.39682 14.042 2.79124 12.6422L4.81111 10.6144" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
    ),

    /**
     * Icône Collections
     */
    Collections: ({ size, ...props }: IconProps) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size ?? 20} height={size ?? 20} viewBox="0 0 20 20" fill="none" {...props}>
            <path d="M18.3334 15.8333C18.3334 16.2754 18.1578 16.6993 17.8453 17.0118C17.5327 17.3244 17.1088 17.5 16.6667 17.5H3.33341C2.89139 17.5 2.46746 17.3244 2.1549 17.0118C1.84234 16.6993 1.66675 16.2754 1.66675 15.8333V4.16667C1.66675 3.72464 1.84234 3.30072 2.1549 2.98816C2.46746 2.67559 2.89139 2.5 3.33341 2.5H7.50008L9.16675 5H16.6667C17.1088 5 17.5327 5.17559 17.8453 5.48816C18.1578 5.80072 18.3334 6.22464 18.3334 6.66667V15.8333Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    ),

    /**
     * Icône Pages
     */
    Pages: ({ size, ...props }: IconProps) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size ?? 20} height={size ?? 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
    ),

    /**
     * Icône Blogs
     */
    Blogs: ({ size, ...props }: IconProps) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size ?? 20} height={size ?? 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>
    ),

    /**
     * Icône Articles
     */
    Articles: ({ size, ...props }: IconProps) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size ?? 20} height={size ?? 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
    ),

    /**
     * Icône Menu
     */
    Menu: ({ size, ...props }: IconProps) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size ?? 20} height={size ?? 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
    ),

    /**
     * Icône Variants/Variantes produit
     */
    Variants: ({ size, ...props }: IconProps) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size ?? 20} height={size ?? 20} viewBox="0 0 20 20" fill="none" {...props}>
            <path d="M10.0001 1.66666L1.66675 5.83332L10.0001 9.99999L18.3334 5.83332L10.0001 1.66666Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M1.66675 14.1667L10.0001 18.3333L18.3334 14.1667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M1.66675 10L10.0001 14.1667L18.3334 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    ),

    /**
     * Icône Clients/Customers
     */
    Clients: ({ size, ...props }: IconProps) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size ?? 20} height={size ?? 20} viewBox="0 0 20 20" fill="none" {...props}>
            <path d="M14.1666 17.5V15.8333C14.1666 14.9493 13.8154 14.1014 13.1903 13.4763C12.5652 12.8512 11.7173 12.5 10.8333 12.5H4.16658C3.28253 12.5 2.43468 12.8512 1.80956 13.4763C1.18444 14.1014 0.833252 14.9493 0.833252 15.8333V17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7.50008 9.16667C9.34103 9.16667 10.8334 7.67428 10.8334 5.83333C10.8334 3.99238 9.34103 2.5 7.50008 2.5C5.65913 2.5 4.16675 3.99238 4.16675 5.83333C4.16675 7.67428 5.65913 9.16667 7.50008 9.16667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M19.1667 17.5V15.8333C19.1662 15.0948 18.9204 14.3773 18.4679 13.7936C18.0154 13.2099 17.3819 12.793 16.6667 12.6083" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13.3333 2.60834C14.0503 2.79192 14.6858 3.20892 15.1396 3.7936C15.5935 4.37827 15.8398 5.09736 15.8398 5.8375C15.8398 6.57765 15.5935 7.29674 15.1396 7.88141C14.6858 8.46609 14.0503 8.88309 13.3333 9.06667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    ),

    /**
     * Icône Orders/Commandes
     */
    Orders: ({ size, ...props }: IconProps) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size ?? 20} height={size ?? 20} viewBox="0 0 20 20" fill="none" {...props}>
            <path d="M9.16667 18.1083C9.42003 18.2546 9.70744 18.3316 10 18.3316C10.2926 18.3316 10.58 18.2546 10.8333 18.1083L16.6667 14.775C16.9198 14.6289 17.13 14.4187 17.2763 14.1657C17.4225 13.9126 17.4997 13.6256 17.5 13.3333V6.66666C17.4997 6.37439 17.4225 6.08733 17.2763 5.83429C17.13 5.58125 16.9198 5.37113 16.6667 5.22499L10.8333 1.89166C10.58 1.74538 10.2926 1.66837 10 1.66837C9.70744 1.66837 9.42003 1.74538 9.16667 1.89166L3.33333 5.22499C3.08022 5.37113 2.86998 5.58125 2.72372 5.83429C2.57745 6.08733 2.5003 6.37439 2.5 6.66666V13.3333C2.5003 13.6256 2.57745 13.9126 2.72372 14.1657C2.86998 14.4187 3.08022 14.6289 3.33333 14.775L9.16667 18.1083Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 18.3333V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2.7417 5.83334L10 10L17.2584 5.83334" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M6.25 3.55832L13.75 7.84999" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    ),

    /**
     * Icône Companies/Entreprises B2B
     */
    Companies: ({ size, ...props }: IconProps) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size ?? 20} height={size ?? 20} viewBox="0 0 20 20" fill="none" {...props}>
            <path d="M16.6667 5.83331H3.33341C2.41294 5.83331 1.66675 6.57951 1.66675 7.49998V15.8333C1.66675 16.7538 2.41294 17.5 3.33341 17.5H16.6667C17.5872 17.5 18.3334 16.7538 18.3334 15.8333V7.49998C18.3334 6.57951 17.5872 5.83331 16.6667 5.83331Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13.3334 17.5V4.16667C13.3334 3.72464 13.1578 3.30072 12.8453 2.98816C12.5327 2.67559 12.1088 2.5 11.6667 2.5H8.33341C7.89139 2.5 7.46746 2.67559 7.1549 2.98816C6.84234 3.30072 6.66675 3.72464 6.66675 4.16667V17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    ),

    /**
     * Icône Locations/Emplacements
     */
    Locations: ({ size, ...props }: IconProps) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size ?? 20} height={size ?? 20} viewBox="0 0 20 20" fill="none" {...props}>
            <path d="M17.5 8.33331C17.5 14.1666 10 19.1666 10 19.1666C10 19.1666 2.5 14.1666 2.5 8.33331C2.5 6.34419 3.29018 4.43654 4.6967 3.03001C6.10322 1.62349 8.01088 0.833313 10 0.833313C11.9891 0.833313 13.8968 1.62349 15.3033 3.03001C16.7098 4.43654 17.5 6.34419 17.5 8.33331Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 10.8333C11.3807 10.8333 12.5 9.71402 12.5 8.33331C12.5 6.9526 11.3807 5.83331 10 5.83331C8.61929 5.83331 7.5 6.9526 7.5 8.33331C7.5 9.71402 8.61929 10.8333 10 10.8333Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    ),

    /**
     * Icône Markets/Marchés
     */
    Markets: ({ size, ...props }: IconProps) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size ?? 20} height={size ?? 20} viewBox="0 0 20 20" fill="none" {...props}>
            <path d="M10.0001 18.3334C14.6025 18.3334 18.3334 14.6024 18.3334 10C18.3334 5.39765 14.6025 1.66669 10.0001 1.66669C5.39771 1.66669 1.66675 5.39765 1.66675 10C1.66675 14.6024 5.39771 18.3334 10.0001 18.3334Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M1.66675 10H18.3334" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10.0001 1.66669C12.0845 3.94865 13.269 6.91005 13.3334 10C13.269 13.09 12.0845 16.0514 10.0001 18.3334C7.91568 16.0514 6.73112 13.09 6.66675 10C6.73112 6.91005 7.91568 3.94865 10.0001 1.66669Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    ),

    /**
     * Icône Generic/Rectangle de base
     */
    Generic: ({ size, ...props }: IconProps) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size ?? 20} height={size ?? 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        </svg>
    )
};

/**
 * Type export pour faciliter l'utilisation
 */
export type IconType = keyof typeof Icons;
export type { IconProps };
