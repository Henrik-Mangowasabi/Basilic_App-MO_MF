import { useState, useEffect, useRef } from "react";
import { useLoaderData, useSubmit, useFetcher } from "react-router";
import { authenticate } from "../shopify.server";
import "../styles/metafields-table.css";
import { 
  AppBrand,
  DevModeToggle, 
  BasilicButton, 
  BasilicSearch, 
  NavigationTabs,
  BasilicModal
} from "../components/BasilicUI";
import { 
  Table, 
  TableHeader, 
  TableColumn, 
  TableBody, 
  TableRow, 
  TableCell,
  Tooltip,
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem
} from "@heroui/react";

// --- ICONS ---
const Icons = {
    Products: (props: any) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}>
            <path d="M8.372 11.6667C7.11703 10.4068 7.23007 8.25073 8.62449 6.85091L12.6642 2.79552C14.0586 1.3957 16.2064 1.28222 17.4613 2.54206C18.7163 3.8019 18.6033 5.95797 17.2088 7.3578L15.189 9.3855" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path opacity="0.5" d="M11.6281 8.33333C12.8831 9.59317 12.77 11.7492 11.3756 13.1491L9.35575 15.1768L7.33591 17.2045C5.94149 18.6043 3.79373 18.7178 2.53875 17.4579C1.28378 16.1981 1.39682 14.042 2.79124 12.6422L4.81111 10.6144" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
    ),
    Variants: (props: any) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}>
            <path d="M10.0001 1.66666L1.66675 5.83332L10.0001 9.99999L18.3334 5.83332L10.0001 1.66666Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M1.66675 14.1667L10.0001 18.3333L18.3334 14.1667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M1.66675 10L10.0001 14.1667L18.3334 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    ),
    Collections: (props: any) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}>
            <path d="M18.3334 15.8333C18.3334 16.2754 18.1578 16.6993 17.8453 17.0118C17.5327 17.3244 17.1088 17.5 16.6667 17.5H3.33341C2.89139 17.5 2.46746 17.3244 2.1549 17.0118C1.84234 16.6993 1.66675 16.2754 1.66675 15.8333V4.16667C1.66675 3.72464 1.84234 3.30072 2.1549 2.98816C2.46746 2.67559 2.89139 2.5 3.33341 2.5H7.50008L9.16675 5H16.6667C17.1088 5 17.5327 5.17559 17.8453 5.48816C18.1578 5.80072 18.3334 6.22464 18.3334 6.66667V15.8333Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    ),
    Clients: (props: any) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}>
            <path d="M14.1666 17.5V15.8333C14.1666 14.9493 13.8154 14.1014 13.1903 13.4763C12.5652 12.8512 11.7173 12.5 10.8333 12.5H4.16658C3.28253 12.5 2.43468 12.8512 1.80956 13.4763C1.18444 14.1014 0.833252 14.9493 0.833252 15.8333V17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7.50008 9.16667C9.34103 9.16667 10.8334 7.67428 10.8334 5.83333C10.8334 3.99238 9.34103 2.5 7.50008 2.5C5.65913 2.5 4.16675 3.99238 4.16675 5.83333C4.16675 7.67428 5.65913 9.16667 7.50008 9.16667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M19.1667 17.5V15.8333C19.1662 15.0948 18.9204 14.3773 18.4679 13.7936C18.0154 13.2099 17.3819 12.793 16.6667 12.6083" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13.3333 2.60834C14.0503 2.79192 14.6858 3.20892 15.1396 3.7936C15.5935 4.37827 15.8398 5.09736 15.8398 5.8375C15.8398 6.57765 15.5935 7.29674 15.1396 7.88141C14.6858 8.46609 14.0503 8.88309 13.3333 9.06667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    ),
    Orders: (props: any) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}>
            <path d="M9.16667 18.1083C9.42003 18.2546 9.70744 18.3316 10 18.3316C10.2926 18.3316 10.58 18.2546 10.8333 18.1083L16.6667 14.775C16.9198 14.6289 17.13 14.4187 17.2763 14.1657C17.4225 13.9126 17.4997 13.6256 17.5 13.3333V6.66666C17.4997 6.37439 17.4225 6.08733 17.2763 5.83429C17.13 5.58125 16.9198 5.37113 16.6667 5.22499L10.8333 1.89166C10.58 1.74538 10.2926 1.66837 10 1.66837C9.70744 1.66837 9.42003 1.74538 9.16667 1.89166L3.33333 5.22499C3.08022 5.37113 2.86998 5.58125 2.72372 5.83429C2.57745 6.08733 2.5003 6.37439 2.5 6.66666V13.3333C2.5003 13.6256 2.57745 13.9126 2.72372 14.1657C2.86998 14.4187 3.08022 14.6289 3.33333 14.775L9.16667 18.1083Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 18.3333V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2.7417 5.83334L10 10L17.2584 5.83334" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M6.25 3.55832L13.75 7.84999" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    ),
    Companies: (props: any) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}>
            <path d="M16.6667 5.83331H3.33341C2.41294 5.83331 1.66675 6.57951 1.66675 7.49998V15.8333C1.66675 16.7538 2.41294 17.5 3.33341 17.5H16.6667C17.5872 17.5 18.3334 16.7538 18.3334 15.8333V7.49998C18.3334 6.57951 17.5872 5.83331 16.6667 5.83331Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13.3334 17.5V4.16667C13.3334 3.72464 13.1578 3.30072 12.8453 2.98816C12.5327 2.67559 12.1088 2.5 11.6667 2.5H8.33341C7.89139 2.5 7.46746 2.67559 7.1549 2.98816C6.84234 3.30072 6.66675 3.72464 6.66675 4.16667V17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    ),
    Locations: (props: any) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}>
            <path d="M17.5 8.33331C17.5 14.1666 10 19.1666 10 19.1666C10 19.1666 2.5 14.1666 2.5 8.33331C2.5 6.34419 3.29018 4.43654 4.6967 3.03001C6.10322 1.62349 8.01088 0.833313 10 0.833313C11.9891 0.833313 13.8968 1.62349 15.3033 3.03001C16.7098 4.43654 17.5 6.34419 17.5 8.33331Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 10.8333C11.3807 10.8333 12.5 9.71402 12.5 8.33331C12.5 6.9526 11.3807 5.83331 10 5.83331C8.61929 5.83331 7.5 6.9526 7.5 8.33331C7.5 9.71402 8.61929 10.8333 10 10.8333Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    ),
    Markets: (props: any) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}>
            <path d="M10.0001 18.3334C14.6025 18.3334 18.3334 14.6024 18.3334 10C18.3334 5.39765 14.6025 1.66669 10.0001 1.66669C5.39771 1.66669 1.66675 5.39765 1.66675 10C1.66675 14.6024 5.39771 18.3334 10.0001 18.3334Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M1.66675 10H18.3334" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10.0001 1.66669C12.0845 3.94865 13.269 6.91005 13.3334 10C13.269 13.09 12.0845 16.0514 10.0001 18.3334C7.91568 16.0514 6.73112 13.09 6.66675 10C6.73112 6.91005 7.91568 3.94865 10.0001 1.66669Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    ),
    Generic: (props: any) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        </svg>
    ),
    ChevronRight: (props: any) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none" {...props}>
            <path d="M4.45508 9.96001L7.71508 6.70001C8.10008 6.31501 8.10008 5.68501 7.71508 5.30001L4.45508 2.04001" stroke="#A1A1AA" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    ),
    Link: (props: any) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}>
            <path d="M8.372 11.6667C7.11703 10.4068 7.23007 8.25073 8.62449 6.8509L12.6642 2.79552C14.0586 1.39569 16.2064 1.28221 17.4613 2.54205C18.7163 3.8019 18.6033 5.95797 17.2088 7.35779L15.189 9.3855" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path opacity="0.5" d="M11.6278 8.33333C12.8828 9.59318 12.7698 11.7492 11.3753 13.1491L9.3555 15.1768L7.33566 17.2045C5.94124 18.6043 3.79348 18.7178 2.53851 17.4579C1.28353 16.1981 1.39658 14.042 2.79099 12.6422L4.81086 10.6145" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
    ),
    VerticalDots: (props: any) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" {...props}>
            <path opacity="0.5" d="M4 8C4 8.55228 3.55228 9 3 9C2.44772 9 2 8.55228 2 8C2 7.44772 2.44772 7 3 7C3.55228 7 4 7.44772 4 8Z" fill="#18181B"/>
            <path opacity="0.5" d="M9 8C9 8.55228 8.55228 9 8 9C7.44772 9 7 8.55228 7 8C7 7.44772 7.44772 7 8 7C8.55228 7 9 7.44772 9 8Z" fill="#18181B"/>
            <path opacity="0.5" d="M14 8C14 8.55228 13.5523 9 13 9C12.4477 9 12 8.55228 12 8C12 7.44772 12.4477 7 13 7C13.5523 7 14 7.44772 14 8Z" fill="#18181B"/>
        </svg>
    ),
    Edit: (props: any) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}>
            <path d="M12.739 2.62648L11.9666 3.39888L4.86552 10.4999C4.38456 10.9809 4.14407 11.2214 3.93725 11.4865C3.69328 11.7993 3.48412 12.1378 3.31346 12.4959C3.16878 12.7994 3.06123 13.1221 2.84614 13.7674L1.93468 16.5017L1.71188 17.1701C1.60603 17.4877 1.68867 17.8378 1.92536 18.0745C2.16205 18.3112 2.51215 18.3938 2.8297 18.288L3.4981 18.0652L6.23249 17.1537C6.87777 16.9386 7.20042 16.8311 7.50398 16.6864C7.86208 16.5157 8.20052 16.3066 8.51331 16.0626C8.77847 15.8558 9.01895 15.6153 9.49992 15.1343L16.601 8.03328L17.3734 7.26088C18.6531 5.98113 18.6531 3.90624 17.3734 2.62648C16.0936 1.34673 14.0187 1.34673 12.739 2.62648Z" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M11.9665 3.39884C11.9665 3.39884 12.063 5.04019 13.5113 6.48844C14.9595 7.93669 16.6008 8.03324 16.6008 8.03324M3.498 18.0651L1.93457 16.5017" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
    ),
    Delete: (props: any) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}>
            <path d="M17.0832 5H2.9165" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M15.6946 7.08333L15.3113 12.8326C15.1638 15.045 15.09 16.1512 14.3692 16.8256C13.6483 17.5 12.5397 17.5 10.3223 17.5H9.67787C7.46054 17.5 6.35187 17.5 5.63103 16.8256C4.91019 16.1512 4.83644 15.045 4.68895 12.8326L4.30566 7.08333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M7.9165 9.16667L8.33317 13.3333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M12.0832 9.16667L11.6665 13.3333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M5.4165 5C5.46307 5 5.48635 5 5.50746 4.99947C6.19366 4.98208 6.79902 4.54576 7.03252 3.90027C7.0397 3.88041 7.04706 3.85832 7.06179 3.81415L7.14269 3.57143C7.21176 3.36423 7.24629 3.26063 7.2921 3.17267C7.47485 2.82173 7.81296 2.57803 8.20368 2.51564C8.30161 2.5 8.41082 2.5 8.62922 2.5H11.3705C11.5889 2.5 11.6981 2.5 11.796 2.51564C12.1867 2.57803 12.5248 2.82173 12.7076 3.17267C12.7534 3.26063 12.7879 3.36423 12.857 3.57143L12.9379 3.81415C12.9526 3.85826 12.96 3.88042 12.9672 3.90027C13.2007 4.54576 13.806 4.98208 14.4922 4.99947C14.5133 5 14.5366 5 14.5832 5" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
    )
};

// --- TRADUCTION TYPES ---
const TYPE_FR: any = {
    'single_line_text_field': 'Texte', 'multi_line_text_field': 'Texte (multi)',
    'number_integer': 'Entier', 'number_decimal': 'Décimal', 'boolean': 'Booléen',
    'url': 'Url', 'json': 'JSON', 'date': 'Date', 'date_time': 'Date Heure',
    'color': 'Couleur', 'weight': 'Poids', 'volume': 'Volume', 'dimension': 'Dimension',
    'rating': 'Note', 'money': 'Argent', 'file_reference': 'Fichier',
    'product_reference': 'Produit', 'variant_reference': 'Variante', 'collection_reference': 'Collection',
    'page_reference': 'Page', 'customer_reference': 'Client', 'metaobject_reference': 'Métaobjet'
};

const translateType = (t: string) => {
    if (!t) return '-';
    if (t.startsWith('list.')) return `Liste ${TYPE_FR[t.replace('list.', '')] || t.replace('list.', '')}`;
    return TYPE_FR[t] || t;
};

// --- BACKEND LOADER & ACTION ---
export const loader = async ({ request }: any) => {
    const { admin, session } = await authenticate.admin(request);
    
    // 🔥 FORCE RE-AUTH IF SCOPE MISSING
    if (session?.scope && !session.scope.includes('read_themes')) {
        console.log("Missing read_themes scope, redirecting...");
        throw await login(request); // Use login helper instead of authenticate(force)
    }
    
    const installedApps: Record<string, string> = {};
    try {
        const appsRes = await admin.graphql(`{ appInstallations(first:100){nodes{app{title handle}}} }`);
        const appsJson = await appsRes.json();
        appsJson.data?.appInstallations?.nodes?.forEach((n: any) => {
            if(n.app?.handle) {
                installedApps[n.app.handle.toLowerCase()] = n.app.title;
            }
        });
    } catch (error) {
        console.warn("Impossible de charger les applications installées:", error);
    }
    
    const shopifyNamespaceApps: Record<string, string> = {
        'shopify--discovery': 'Search and Discovery',
        'discovery': 'Search and Discovery',
    };

    const loadMF = async (ownerType: string) => {
        const q = `#graphql
            query { metafieldDefinitions(ownerType: ${ownerType}, first: 50) { nodes { id name namespace key description type { name } metafieldsCount } } }
        `;
        try {
            const res = await admin.graphql(q);
            const json = await res.json();
            return (json.data?.metafieldDefinitions?.nodes || []).map((n: any) => {
                const ns = n.namespace.toLowerCase();
                
                let appStatus = 'UNKNOWN'; // MANUAL, SHOPIFY, INSTALLED, UNINSTALLED
                let displayAppName = '';

                // 0. SPECIFIC OVERRIDES
                if (ns.includes('shopify--discovery')) {
                    appStatus = 'INSTALLED';
                    displayAppName = 'Search & Discovery';
                }
                // 1. Check MANUAL
                else if (ns === 'custom' || ns === 'test_data' || ns.startsWith('etst')) {
                    appStatus = 'MANUAL';
                    displayAppName = 'Manuel';
                }
                // 2. Check SHOPIFY Standard (excluding apps using '--')
                else if (ns === 'shopify' || (ns.includes('shopify') && !ns.includes('--'))) {
                    appStatus = 'SHOPIFY';
                    displayAppName = 'Shopify Standard';
                }
                // 3. Check Known Shopify Apps (Search & Discovery, etc which use specific namespaces)
                else {
                    // Check against known mappings first
                    for (const [pattern, title] of Object.entries(shopifyNamespaceApps)) {
                       if (ns.includes(pattern)) {
                           // It matches a known Shopify App pattern. Is it installed?
                           const isInstalled = Object.values(installedApps).some(t => {
                               const normT = t.toLowerCase().replace('&', 'and').replace(/\s+/g, '');
                               const normTitle = title.toLowerCase().replace('&', 'and').replace(/\s+/g, '');
                               return normT.includes(normTitle) || normTitle.includes(normT);
                           });
                           appStatus = isInstalled ? 'INSTALLED' : 'UNINSTALLED';
                           displayAppName = title;
                           // Si c'est Search & Discovery, on force le bon nom affiché si installé
                           if (isInstalled) {
                                const realName = Object.values(installedApps).find(t => t.toLowerCase().includes('search')) || title;
                                displayAppName = realName;
                           }
                           break;
                       } 
                    }

                    // 4. Check against Installed Apps (generic handle match)
                    if (appStatus === 'UNKNOWN') {
                        for (const [handle, title] of Object.entries(installedApps)) {
                            if (ns === handle || ns.includes(handle)) {
                                appStatus = 'INSTALLED';
                                displayAppName = title;
                                break;
                            }
                        }
                    }

                    // 5. If still unknown, it's likely an uninstalled app
                    if (appStatus === 'UNKNOWN') {
                        appStatus = 'UNINSTALLED';
                        // Format namespace to look like an app name
                        displayAppName = ns.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    }
                }

                const status = displayAppName; // Fallback for old code if needed

                return {
                    ...n, kind: 'MF', ownerType,
                    count: n.metafieldsCount,
                    typeDisplay: translateType(n.type?.name),
                    fullKey: `${n.namespace}.${n.key}`,
                    status,
                    appStatus, // Pass the enum for UI styling
                    code_usage: 'Non' // Placeholder: Requires scanning theme code
                };
            });
        } catch { return []; }
    };

    const resources = ['PRODUCT', 'PRODUCTVARIANT', 'COLLECTION', 'CUSTOMER', 'ORDER', 'DRAFTORDER', 'COMPANY', 'LOCATION', 'MARKET', 'PAGE', 'BLOG', 'ARTICLE', 'SHOP'];
    const results = await Promise.all(resources.map(r => loadMF(r)));
    
    const mfData = {
        p: results[0], v: results[1], c: results[2], cl: results[3],
        o: results[4], do_: results[5], co: results[6], loc: results[7],
        m: results[8], pg: results[9], b: results[10], art: results[11], s: results[12]
    };
    
    const totalCount = results.reduce((acc, curr) => acc + curr.length, 0);
    
    let moCount = 0;
    try {
        const moAllRes = await admin.graphql(`{ metaobjectDefinitions(first: 50) { nodes { id } } }`);
        const moAllJson = await moAllRes.json();
        moCount = moAllJson.data?.metaobjectDefinitions?.nodes?.length || 0;
    } catch (e) {
        console.warn("Could not fetch MO count", e);
    }
    
    const shopRes = await admin.graphql(`{shop{name myshopifyDomain}}`);
    const shopJson = await shopRes.json();
    const shopName = shopJson?.data?.shop?.name || 'Boutique';
    const shopDomain = shopJson?.data?.shop?.myshopifyDomain || '';

    return { shop: shopName, shopDomain, mfData, totalCount, moCount };
};

export const action = async ({ request }: any) => {
    const { admin } = await authenticate.admin(request);
    const formData = await request.formData();
    const actionType = formData.get("action");

    if (actionType === "delete_item") {
        const idsRaw = formData.get("ids") as string;
        const id = formData.get("id") as string;
        let ids: string[] = [];

        if (idsRaw) {
            try {
                ids = JSON.parse(idsRaw);
            } catch (e) {
                ids = [];
            }
        } else if (id) {
            ids = [id];
        }

        for (const deleteId of ids) {
            if (!deleteId) continue;
            try {
                const response = await admin.graphql(
                    `#graphql
                    mutation DeleteMetafield($id: ID!) {
                        metafieldDefinitionDelete(id: $id) {
                            userErrors {
                                message
                            }
                        }
                    }`,
                    {
                        variables: { id: deleteId },
                    }
                );
                await response.json();
            } catch (err) {
                console.error(`Error deleting metafield ${deleteId}:`, err);
            }
        }
        return { ok: true };
    }
    
    if (actionType === "update_desc") {
        const description = formData.get("description") as string || '';
        const key = formData.get("key") as string;
        const ownerType = formData.get("ownerType") as string;
        const name = formData.get("name") as string;
        
        const [ns, ...kParts] = key.split('.');
        const actualKey = kParts.join('.');
        
        const escapeGraphQL = (str: string) => {
            return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
        };
        
        const mutation = `#graphql
            mutation {
                metafieldDefinitionUpdate(definition: {
                    ownerType: ${ownerType}
                    namespace: "${escapeGraphQL(ns)}"
                    key: "${escapeGraphQL(actualKey)}"
                    name: "${escapeGraphQL(name)}"
                    description: "${escapeGraphQL(description)}"
                }) {
                    userErrors { message }
                }
            }
        `;
        
        const res = await admin.graphql(mutation);
        const json = await res.json();
        const errors = json.data?.metafieldDefinitionUpdate?.userErrors;
        if (errors && errors.length > 0) throw new Error(errors[0].message);
        return { ok: true };
    }
    
    if (actionType === "scan_code") {
        console.log("Starting code scan...");
        try {
            // 1. Get the main theme
            const themesQuery = `#graphql
                query {
                    themes(first: 1, roles: MAIN) {
                        nodes {
                            id
                            name
                        }
                    }
                }
            `;
            
            console.log("Fetching themes...");
            const themesRes = await admin.graphql(themesQuery);
            const themesJson = await themesRes.json();
            console.log("Themes response:", JSON.stringify(themesJson));

            if (themesJson.errors) {
                // Check specifically for scope errors
                const scopeError = themesJson.errors.find((e: any) => e.message.includes("access scope"));
                if (scopeError) {
                    return { ok: false, error: "MISSING_SCOPES", details: scopeError.message };
                }
                return { ok: false, error: themesJson.errors[0].message };
            }

            const mainTheme = themesJson.data?.themes?.nodes?.[0];
            
            if (!mainTheme) {
                return { ok: false, error: "No main theme found" };
            }
            
            // 2. Get theme files (assets)
            const themeId = mainTheme.id.split('/').pop();
            const assetsQuery = `#graphql
                query {
                    theme(id: "${mainTheme.id}") {
                        files(first: 250) {
                            nodes {
                                filename
                                body {
                                    ... on OnlineStoreThemeFileBodyText {
                                        content
                                    }
                                }
                            }
                        }
                    }
                }
            `;
            
            const assetsRes = await admin.graphql(assetsQuery);
            const assetsJson = await assetsRes.json();
            const files = assetsJson.data?.theme?.files?.nodes || [];
            
            // 3. Scan files for metafield references
            const foundKeys = new Set<string>();
            
            // Patterns to search for metafield references
            const patterns = [
                /metafields\.([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)/g,  // product.metafields.namespace.key
                /metafield\.([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)/g,   // metafield.namespace.key
                /"([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)"/g,             // "namespace.key" in JSON
            ];
            
            for (const file of files) {
                // Only scan relevant file types
                const filename = file.filename?.toLowerCase() || '';
                const isRelevant = 
                    filename.endsWith('.liquid') || 
                    filename.endsWith('.json') ||
                    filename.includes('layout/') ||
                    filename.includes('templates/') ||
                    filename.includes('sections/') ||
                    filename.includes('snippets/');
                
                if (!isRelevant || !file.body?.content) continue;
                
                const content = file.body.content;
                
                // Search for all patterns
                for (const pattern of patterns) {
                    let match;
                    while ((match = pattern.exec(content)) !== null) {
                        if (match[1] && match[2]) {
                            foundKeys.add(`${match[1]}.${match[2]}`);
                        }
                    }
                }
            }
            
            return { 
                ok: true, 
                foundKeys: Array.from(foundKeys),
                scannedFiles: files.length,
                themeName: mainTheme.name
            };
            
        } catch (error: any) {
            console.error("Scan error:", error);
            return { ok: false, error: error.message };
        }
    }
    
    return null;
};

// --- FRONTEND ---
export default function AppMf() {
    const { shopDomain, mfData, totalCount, moCount = 0 } = useLoaderData<any>();
    const submit = useSubmit();
    const fetcher = useFetcher();
    
    const [devMode, setDevMode] = useState(false);
    const [search, setSearch] = useState("");
    const [modalData, setModalData] = useState<any>(null);
    const [editDescription, setEditDescription] = useState("");
    const [editName, setEditName] = useState("");
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
    const [selectedKeys, setSelectedKeys] = useState<any>(new Set([]));
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
    const [deleteModalTitle, setDeleteModalTitle] = useState("");
    const initializedRef = useRef(false);

    const handleDeleteClick = (item: any) => {
        setPendingDeleteIds([item.id]);
        setDeleteModalTitle(`Supprimer "${item.name}" ?`);
        setDeleteConfirmOpen(true);
    };

    const handleBulkDelete = () => {
        let idsToDelete: string[] = [];
        
        if ((selectedKeys as any) === "all") {
            Object.values(mfData).forEach((section: any) => {
                if (Array.isArray(section)) {
                    section.forEach((item: any) => idsToDelete.push(String(item.id)));
                }
            });
        } else {
            idsToDelete = Array.from(selectedKeys).map(k => String(k));
        }

        if (idsToDelete.length === 0) return;

        setPendingDeleteIds(idsToDelete);
        setDeleteModalTitle(`Supprimer ${idsToDelete.length} champs ?`);
        setDeleteConfirmOpen(true);
    };

    const confirmDeletion = () => {
        submit({ action: 'delete_item', ids: JSON.stringify(pendingDeleteIds) }, { method: 'post' });
        setSelectedKeys(new Set([]));
        setDeleteConfirmOpen(false);
        setPendingDeleteIds([]);
    };

    const norm = (s: string) => {
        return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    };

    useEffect(() => { 
        setDevMode(localStorage.getItem('mm_dev_mode') === 'true');
        if(!initializedRef.current && mfData) {
            const sections = ['p', 'v', 'c', 'cl', 'o', 'do_', 'co', 'loc', 'm', 'pg', 'b', 'art', 's'];
            const sectionKeys = ['Produits', 'Variantes', 'Collections', 'Clients', 'Commandes', 'Commandes Provisoires', 'Entreprises B2B', 'Emplacements (Stock)', 'Marchés', 'Pages', 'Blogs', 'Articles', 'Boutique'];
            const initialState: Record<string, boolean> = {};
            for(let i = 0; i < sections.length; i++) {
                const key = sections[i];
                if(mfData[key] && mfData[key].length > 0) {
                    initialState[sectionKeys[i]] = true;
                    initializedRef.current = true;
                    break;
                }
            }
            setOpenSections(initialState);
        }
    }, [mfData]);
    
    const toggleDev = (val: boolean) => {
        setDevMode(val);
        localStorage.setItem('mm_dev_mode', val ? 'true' : 'false');
    };

    const getShopifyUrl = (ownerType: string, id: string) => {
        const map: Record<string, string> = {
            'PRODUCT': 'product', 'PRODUCTVARIANT': 'variant', 'COLLECTION': 'collection',
            'CUSTOMER': 'customer', 'ORDER': 'order', 'DRAFTORDER': 'draft_order',
            'COMPANY': 'company', 'COMPANY_LOCATION': 'company_location', 'LOCATION': 'location',
            'MARKET': 'market', 'PAGE': 'page', 'BLOG': 'blog', 'ARTICLE': 'article', 'SHOP': 'shop'
        };
        const resource = map[ownerType] || 'product';
        const cleanId = id.split('/').pop();
        const shopName = shopDomain ? shopDomain.replace('.myshopify.com', '') : '';
        return `https://admin.shopify.com/store/${shopName}/settings/custom_data/${resource}/metafields/${cleanId}`;
    };

    const generateDescFromKey = (key: string) => {
        let clean = key.split('.').pop() || '';
        clean = clean.replace(/_/g, ' ');
        return clean.charAt(0).toUpperCase() + clean.slice(1);
    };

    const [autoGenModalOpen, setAutoGenModalOpen] = useState(false);
    const [autoGenCount, setAutoGenCount] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationComplete, setGenerationComplete] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [scannedKeys, setScannedKeys] = useState<Set<string>>(new Set());
    const [lastScanInfo, setLastScanInfo] = useState<{files: number, theme: string} | null>(null);

    // Load scan results from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem('mm_scan_results');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                setScannedKeys(new Set(data.keys || []));
                setLastScanInfo(data.info || null);
            } catch (e) {
                console.error('Failed to load scan results:', e);
            }
        }
    }, []);

    // Handle fetcher response for scan
    useEffect(() => {
        if (fetcher.data && fetcher.state === 'idle') {
            const result = fetcher.data;
            if (result.ok && result.foundKeys) {
                const keysSet = new Set(result.foundKeys);
                setScannedKeys(keysSet);
                setLastScanInfo({
                    files: result.scannedFiles,
                    theme: result.themeName
                });
                
                // Store in localStorage
                localStorage.setItem('mm_scan_results', JSON.stringify({
                    keys: result.foundKeys,
                    info: {
                        files: result.scannedFiles,
                        theme: result.themeName
                    },
                    timestamp: new Date().toISOString()
                }));
                
                setIsScanning(false);
            } else if (result.error) {
                console.error('Scan failed:', result.error);
                if (result.error === "MISSING_SCOPES") {
                    alert("⚠️ Permission manquante : L'application n'a pas le droit de lire le thème.\n\nSolution : Désinstallez et réinstallez l'application pour accepter les nouvelles permissions.");
                } else {
                    alert(`Erreur lors du scan: ${result.error || 'Erreur inconnue'}`);
                }
                setIsScanning(false);
            }
        }
    }, [fetcher.data, fetcher.state]);

    const checkAutoGenerate = () => {
        let count = 0;
        Object.values(mfData).forEach((sectionData: any) => {
            if(Array.isArray(sectionData)) {
                sectionData.forEach((d: any) => {
                    if(!d.description || d.description === '' || d.description === '-') {
                        count++;
                    }
                });
            }
        });
        
        setAutoGenCount(count);
        setIsGenerating(false);
        setGenerationComplete(false);
        setAutoGenModalOpen(true);
    };

    const confirmAutoGenerate = async () => {
        setIsGenerating(true);
        const allData: any[] = [];
        Object.values(mfData).forEach((sectionData: any) => {
            if(Array.isArray(sectionData)) {
                sectionData.forEach((d: any) => {
                    if(!d.description || d.description === '' || d.description === '-') {
                        allData.push(d);
                    }
                });
            }
        });

        for(let i = 0; i < allData.length; i++) {
            const mf = allData[i];
            const newDesc = generateDescFromKey(mf.fullKey);
            await submit({
                action: 'update_desc', id: mf.id, name: mf.name, description: newDesc, key: mf.fullKey, ownerType: mf.ownerType
            }, { method: 'post' });
        }
        
        setIsGenerating(false);
        setGenerationComplete(true);
        
        // Petit délai pour lire le succès avant reload
        setTimeout(() => window.location.reload(), 1500);
    };

    const handleScanCode = () => {
        setIsScanning(true);
        const formData = new FormData();
        formData.append('action', 'scan_code');
        fetcher.submit(formData, { method: 'post' });
    };

    const columns = [
        { key: "name", label: "NOM DU METAFIELD", className: "mf-col--name" },
        ...(devMode ? [
            { 
                key: "fullKey", 
                label: (
                    <div className="relative overflow-visible">
                        <div className="absolute -top-7 -left-3 bg-[#E4E4E7] text-default-500 text-[10px] font-medium px-3 py-1 rounded-t-lg flex items-center gap-1 whitespace-nowrap z-10">
                            <span>&lt;/&gt;</span> Dev Mode
                        </div>
                        CLÉ
                    </div>
                ),
                className: "mf-col--key mf-table__header--dev"
            },
            { key: "type", label: "STRUCTURE", className: "mf-col--type mf-table__header--dev" },
            { key: "status", label: "DIAG", className: "mf-col--status mf-table__header--dev" },
            { key: "code_usage", label: "CODE", className: "mf-col--code mf-table__header--dev" }
        ] : []),
        { key: "count", label: "ASSING.", className: "mf-col--count" },
        { key: "actions", label: "LIEN", className: "mf-col--actions" },
        { key: "menu", label: " ", className: "mf-col--menu" }
    ];

    const renderCell = (item: any, columnKey: React.Key) => {
        const shopifyLink = getShopifyUrl(item.ownerType, item.id);
        const isDevCol = ["fullKey", "type", "status", "code_usage"].includes(columnKey as string);
        
        // Helper for highlighting
        const highlightText = (text: string, highlight: string) => {
            if (!highlight || !text) return text;
            try {
                const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`(${escapeRegExp(highlight)})`, 'gi');
                return text.split(regex).map((part, i) => 
                    i % 2 === 1 ? <span key={i} className="text-[#E11D48] font-semibold">{part}</span> : part
                );
            } catch (e) { return text; }
        };
        
        const content = (() => {
            switch (columnKey) {
                case "name":
                    return (
                        <div className="mf-cell mf-cell--multi">
                            <span className="mf-text--title">{highlightText(item.name, search)}</span>
                            {item.description && (
                                <span className="mf-text--desc">{highlightText(item.description, search)}</span>
                            )}
                        </div>
                    );
                case "fullKey":
                    return (
                        <div className="mf-cell mf-cell--key">
                            <span className="mf-text--key" title={item.fullKey}>
                                {highlightText(item.fullKey, search)}
                            </span>
                        </div>
                    );
                case "type":
                    return (
                        <div className="mf-cell mf-cell--type">
                            <span className="mf-chip">{highlightText(item.typeDisplay, search)}</span>
                        </div>
                    );
                case "status":
                    return (
                        <div className="mf-cell mf-cell--status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
                            <span className="text-[13px] text-[#18181B] font-medium leading-tight text-left">
                                {item.status}
                            </span>
                            
                            {item.appStatus === 'INSTALLED' && (
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#17C964]"></div>
                                    <span className="text-[11px] text-[#17C964] font-medium">Installée</span>
                                </div>
                            )}

                            {item.appStatus === 'UNINSTALLED' && (
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#F5A524]"></div>
                                    <span className="text-[11px] text-[#F5A524] font-medium">Désinstallée</span>
                                </div>
                            )}
                            
                            {(item.appStatus === 'MANUAL' || item.appStatus === 'SHOPIFY') && (
                                <span className="text-[11px] text-[#71717A] text-left">
                                    {item.appStatus === 'MANUAL' ? 'Création manuelle' : 'Standard Shopify'}
                                </span>
                            )}
                        </div>
                    );
                case "code_usage": {
                    const isFound = scannedKeys.has(item.fullKey);
                    const displayText = isFound ? 'Oui' : 'Non';
                    return (
                        <div className="mf-cell mf-cell--center mf-cell--badge">
                            <span className={`mf-badge--code ${isFound ? 'mf-badge--found' : ''}`}>
                                {displayText}
                            </span>
                        </div>
                    );
                }
                case "count":
                    return (
                        <div className="mf-cell mf-cell--center">
                            <div className="mf-badge--count">{item.count}</div>
                        </div>
                    );
                case "actions":
                    return (
                        <div className="mf-cell mf-cell--center">
                            <Tooltip content="Ouvrir dans Shopify Admin">
                                <a
                                    href={shopifyLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mf-action-link"
                                >
                                    <Icons.Link />
                                </a>
                            </Tooltip>
                        </div>
                    );
                case "menu":
                    return (
                        <div className="mf-cell mf-cell--center">
                            <Dropdown 
                                placement="bottom-end" 
                                offset={10}
                                classNames={{
                                    content: "mf-dropdown-content"
                                }}
                            >
                                <DropdownTrigger>
                                    <Button isIconOnly variant="light" size="sm" className="text-default-400">
                                        <Icons.VerticalDots />
                                    </Button>
                                </DropdownTrigger>
                                <DropdownMenu 
                                    aria-label="Actions"
                                    className="p-0"
                                    itemClasses={{
                                        base: "mf-dropdown-item",
                                        title: "mf-dropdown-item__title"
                                    }}
                                >
                                    <DropdownItem 
                                        key="edit" 
                                        startContent={<Icons.Edit width={16} height={16} />}
                                        className="mf-dropdown-item--edit"
                                        onPress={() => {
                                            setModalData(item);
                                            setEditName(item.name || '');
                                            setEditDescription(item.description || '');
                                            setIsModalOpen(true);
                                        }}
                                    >
                                        Editer
                                    </DropdownItem>
                                    <DropdownItem 
                                        key="delete" 
                                        className="mf-dropdown-item--delete" 
                                        startContent={<Icons.Delete width={16} height={16} />}
                                        onPress={() => handleDeleteClick(item)}
                                    >
                                        supprimer
                                    </DropdownItem>
                                </DropdownMenu>
                            </Dropdown>
                        </div>
                    );
                default:
                    return null;
            }
        })();

        // Si colonne dev et devMode inactif, on ne devrait pas être là, mais au cas où
        if (isDevCol && !devMode) return null;

        return content;
    };

    const Section = ({ title, icon, data }: any) => {
        const isOpen = openSections[title] || false;
        
        const toggleSection = () => {
            setOpenSections(prev => ({ ...prev, [title]: !prev[title] }));
        };
        
        // No filter here if search is active (layout changes), but if search is empty, filter is no-op
        const filteredData = data; 
        
        return (
            <div className="mf-section">
                <div 
                    className={`mf-section__header ${isOpen ? 'mf-section__header--open' : 'mf-section__header--closed'}`}
                    onClick={toggleSection}
                >
                    <div className="mf-section__title-group">
                        <span className="mf-section__icon">{icon}</span>
                        <span className="mf-section__title">{title}</span>
                        {filteredData.length > 0 && (
                            <span className="mf-section__count">{filteredData.length}</span>
                        )}
                    </div>
                    <span className={`mf-section__chevron ${isOpen ? 'mf-section__chevron--open' : ''}`}>
                        <Icons.ChevronRight />
                    </span>
                </div>
                {isOpen && (
                    <div>
                        {filteredData.length === 0 ? (
                            <div className="mf-empty">
                                Aucun champ méta trouvé pour cette section.
                            </div>
                        ) : (
                            <Table 
                                aria-label={`Table ${title}`}
                                className="mf-table"
                                removeWrapper
                                selectionMode="multiple"
                                selectionBehavior="toggle"
                                onRowAction={() => {}} // Intercept click to prevent selection
                                selectedKeys={
                                    (selectedKeys as any) === "all" 
                                        ? "all" 
                                        : new Set(
                                            [...Array.from(selectedKeys)].filter(k => 
                                                filteredData.some((d: any) => d.id === k)
                                            )
                                        ) as any
                                }
                                onSelectionChange={(keys: any) => {
                                    // 2. Merge local table selection with global selection
                                    if (keys === "all") {
                                        // If "select all" in this table -> Add all THIS table's items to global
                                        // (Careful: HeroUI might return "all" string)
                                        const newSet = new Set(selectedKeys);
                                        filteredData.forEach((d: any) => newSet.add(d.id));
                                        setSelectedKeys(newSet);
                                    } else {
                                        // If specific keys selected
                                        const newSelection = new Set(keys);
                                        const otherKeys = new Set(
                                            [...selectedKeys].filter(k => 
                                                !filteredData.some((d: any) => d.id === k)
                                            )
                                        );
                                        // Global = (Global - ThisTableItems) + NewSelectionFromThisTable
                                        const finalSet = new Set([...otherKeys, ...newSelection]);
                                        setSelectedKeys(finalSet);
                                    }
                                }}
                                classNames={{
                                    wrapper: "mf-table__wrapper",
                                    th: `mf-table__header ${devMode ? 'mf-table__header--dev' : ''}`,
                                    td: "mf-table__cell",
                                    base: "mf-table__base",
                                    tr: "mf-table__row"
                                }}
                            >
                                <TableHeader columns={columns}>
                                    {(column: any) => (
                                        <TableColumn 
                                            key={column.key}
                                            align={column.key === "count" || column.key === "actions" || column.key === "menu" ? "center" : "start"}
                                            className={column.className}
                                        >
                                            {column.label}
                                        </TableColumn>
                                    )}
                                </TableHeader>
                                <TableBody items={filteredData} emptyContent={"Aucun champ."}>
                                    {(item: any) => (
                                        <TableRow key={item.id}>
                                            {(columnKey) => <TableCell>{renderCell(item, columnKey)}</TableCell>}
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Calculate search results
    const getSearchResults = () => {
        if (!search) return [];
        const filter = norm(search);
        let allItems: any[] = [];
        Object.values(mfData).forEach((arr: any) => {
            if(Array.isArray(arr)) allItems = [...allItems, ...arr];
        });
        
        return allItems.filter((d:any) => {
            let combinedText = "";
            combinedText += (d.name || '') + " ";
            combinedText += (d.description || '') + " ";
            combinedText += (d.count || 0).toString() + " ";
            
            if (devMode) {
                combinedText += (d.fullKey || '') + " ";
                combinedText += (d.typeDisplay || '') + " ";
                combinedText += (d.status || '') + " ";
            }
            
            return norm(combinedText).includes(filter);
        });
    };

    const searchResults = getSearchResults();

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
                <div className="flex justify-between items-center w-full p-4 bg-default-100 rounded-[16px]">
                    <AppBrand />
                    <div className="flex gap-3 items-center">
                        <DevModeToggle isChecked={devMode} onChange={toggleDev} />
                        <BasilicButton 
                            onPress={handleScanCode}
                            variant="flat"
                            className="bg-white border border-default-200 text-default-700"
                            isLoading={isScanning}
                            isDisabled={isScanning}
                            icon={
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                                    <path d="M3 3v5h5"></path>
                                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
                                    <path d="M16 16h5v5"></path>
                                </svg>
                            }
                        >
                            {isScanning ? 'Scan en cours...' : 'Scan Code'}
                        </BasilicButton>
                        <BasilicButton 
                            onPress={checkAutoGenerate}
                            icon={
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>
                                </svg>
                            }
                        >
                            Générer descriptions manquantes
                        </BasilicButton>
                    </div>
                </div>

                <div className="flex items-center justify-between w-full">
                    <NavigationTabs activePath="/app/mf" counts={{ mf: totalCount, mo: moCount }} />
                    <div className="flex-shrink-0" style={{ width: '320px' }}>
                        <BasilicSearch value={search} onValueChange={setSearch} placeholder="Search" />
                    </div>
                </div>

                {search ? (
                    <div className="mf-section">
                         <div className="mf-section__header mf-section__header--open cursor-default hover:!bg-[#FAFAFA]" style={{ pointerEvents: 'none' }}>
                            <div className="mf-section__title-group">
                                <span className="mf-section__icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                                </span>
                                <span className="mf-section__title">Résultats de recherche</span>
                                <span className="mf-section__count">{searchResults.length}</span>
                            </div>
                        </div>
                        <div>
                            <Table 
                                aria-label="Tableau de recherche"
                                className="mf-table"
                                removeWrapper
                                selectionMode="multiple"
                                selectedKeys={selectedKeys}
                                onSelectionChange={setSelectedKeys as any}
                                classNames={{
                                    wrapper: "mf-table__wrapper",
                                    th: `mf-table__header ${devMode ? 'mf-table__header--dev' : ''}`,
                                    td: "mf-table__cell",
                                    base: "mf-table__base",
                                    tr: "mf-table__row"
                                }}
                            >
                                <TableHeader columns={columns}>
                                    {(column: any) => (
                                        <TableColumn 
                                            key={column.key}
                                            align={column.key === "count" || column.key === "actions" || column.key === "menu" ? "center" : "start"}
                                            className={column.className}
                                        >
                                            {column.label}
                                        </TableColumn>
                                    )}
                                </TableHeader>
                                <TableBody items={searchResults} emptyContent={"Aucun résultat trouvé."}>
                                    {(item: any) => (
                                        <TableRow key={item.id}>
                                            {(columnKey) => <TableCell>{renderCell(item, columnKey)}</TableCell>}
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <Section title="Produits" icon={<Icons.Products/>} data={mfData.p} />
                        <Section title="Variantes" icon={<Icons.Variants/>} data={mfData.v} />
                        <Section title="Collections" icon={<Icons.Collections/>} data={mfData.c} />
                        <Section title="Clients" icon={<Icons.Clients/>} data={mfData.cl} />
                        <Section title="Commandes" icon={<Icons.Orders/>} data={mfData.o} />
                        <Section title="Commandes Provisoires" icon={<Icons.Orders/>} data={mfData.do_} />
                        <Section title="Entreprises B2B" icon={<Icons.Companies/>} data={mfData.co} />
                        <Section title="Emplacements (Stock)" icon={<Icons.Locations/>} data={mfData.loc} />
                        <Section title="Marchés" icon={<Icons.Markets/>} data={mfData.m} />
                        <Section title="Pages" icon={<Icons.Generic/>} data={mfData.pg} />
                        <Section title="Blogs" icon={<Icons.Generic/>} data={mfData.b} />
                        <Section title="Articles" icon={<Icons.Generic/>} data={mfData.art} />
                        <Section title="Boutique" icon={<Icons.Generic/>} data={mfData.s} />
                    </div>
                )}

                {/* Global Selection Bar */}
                {selectedKeys.size > 0 && (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
                        <div className="flex items-center gap-4 bg-[#18181B] p-2 pl-5 pr-2 rounded-full shadow-[0px_8px_16px_rgba(0,0,0,0.25)] ring-1 ring-white/10">
                            <div className="flex items-center gap-3">
                                <span className="text-[14px] font-medium text-white">{(selectedKeys as any) === "all" ? "Tous" : selectedKeys.size} sélectionnés</span>
                                <button 
                                    onClick={() => setSelectedKeys(new Set([]))}
                                    className="text-[#A1A1AA] hover:text-white transition-colors"
                                >
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <g opacity="0.8">
                                        <path d="M10 18.3333C14.6024 18.3333 18.3333 14.6023 18.3333 9.99999C18.3333 5.39762 14.6024 1.66666 10 1.66666C5.39763 1.66666 1.66667 5.39762 1.66667 9.99999C1.66667 14.6023 5.39763 18.3333 10 18.3333Z" fill="#3F3F46"/>
                                        <path d="M12.5 7.5L7.5 12.5M7.5 7.5L12.5 12.5" stroke="#A1A1AA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        </g>
                                    </svg>
                                </button>
                            </div>
                            <div className="h-6 w-[1px] bg-[#3F3F46]"></div>
                            <Button 
                                onPress={handleBulkDelete}
                                className="bg-[#F43F5E] text-white font-medium px-4 h-[36px] rounded-full hover:bg-[#E11D48] transition-colors gap-2"
                                startContent={<Icons.Delete width={18} height={18} />}
                            >
                                supprimer
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <BasilicModal
                isOpen={autoGenModalOpen}
                onClose={() => !isGenerating && setAutoGenModalOpen(false)}
                title={generationComplete ? "Succès" : "Génération automatique"}
                footer={
                    generationComplete ? null : (
                        autoGenCount > 0 ? (
                            <>
                                <Button
                                    variant="light"
                                    onPress={() => setAutoGenModalOpen(false)}
                                    isDisabled={isGenerating}
                                    className="bg-[#F4F4F5] hover:bg-[#E4E4E7] text-[#71717A] hover:text-[#18181B] font-medium transition-colors h-10 px-4 min-w-0 rounded-[12px]"
                                    disableRipple
                                >
                                    Annuler
                                </Button>
                                <BasilicButton
                                    onPress={confirmAutoGenerate}
                                    isLoading={isGenerating}
                                    className="min-w-[100px]"
                                >
                                    {isGenerating ? "Génération..." : "Confirmer"}
                                </BasilicButton>
                            </>
                        ) : (
                            <Button
                                variant="light"
                                onPress={() => setAutoGenModalOpen(false)}
                                className="bg-[#F4F4F5] hover:bg-[#E4E4E7] text-[#71717A] hover:text-[#18181B] font-medium transition-colors h-10 px-4 min-w-0 rounded-[12px]"
                                disableRipple
                            >
                                Fermer
                            </Button>
                        )
                    )
                }
            >
                {generationComplete ? (
                    <div className="flex flex-col items-center gap-4 py-4">
                        <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6L9 17l-5-5"/>
                            </svg>
                        </div>
                        <p className="text-[#09090B] font-medium text-center">
                            {autoGenCount} descriptions ont été générées avec succès.
                        </p>
                        <p className="text-[#71717A] text-sm text-center">
                            La page va se recharger...
                        </p>
                    </div>
                ) : autoGenCount === 0 ? (
                    <div className="flex flex-col gap-2 py-2">
                        <p className="text-[#09090B] text-sm">
                            Tout est en ordre ! Tous vos champs métas ont déjà une description.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 py-2">
                         <p className="text-[#09090B] text-sm">
                            Vous êtes sur le point de générer automatiquement une description pour <span className="font-bold">{autoGenCount} champs métas</span>.
                        </p>
                        <div className="bg-[#F4F4F5] p-3 rounded-lg border border-[#E4E4E7]">
                            <p className="text-[#71717A] text-xs">
                                <span className="font-semibold text-[#18181B]">Note :</span> Les descriptions seront basées sur le nom de la clé (ex: "taille_produit" deviendra "Taille produit").
                            </p>
                        </div>
                    </div>
                )}
            </BasilicModal>

            <BasilicModal
                isOpen={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                title="Confirmation de suppression"
                footer={
                    <>
                        <Button
                            variant="light"
                            onPress={() => setDeleteConfirmOpen(false)}
                            className="bg-[#F4F4F5] hover:bg-[#E4E4E7] text-[#71717A] hover:text-[#18181B] font-medium transition-colors h-10 px-4 min-w-0 rounded-[12px]"
                            disableRipple
                        >
                            Annuler
                        </Button>
                        <Button
                            onPress={confirmDeletion}
                            className="bg-[#F43F5E] hover:bg-[#E11D48] text-white font-medium h-10 px-6 rounded-[12px] transition-colors"
                        >
                            Confirmer la suppression
                        </Button>
                    </>
                }
            >
                <div className="flex flex-col gap-4 py-2">
                    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600">
                        <Icons.Delete />
                        <p className="font-semibold text-sm">Action irréversible</p>
                    </div>
                    <p className="text-[#09090B] text-sm leading-relaxed">
                        {deleteModalTitle}
                    </p>
                    <p className="text-[#71717A] text-xs leading-relaxed">
                        Cette action supprimera définitivement la définition du champ méta. Les valeurs déjà enregistrées pour vos produits ou autres ressources pourraient ne plus être accessibles via l'administration Shopify.
                    </p>
                </div>
            </BasilicModal>

            <BasilicModal
                isOpen={!!modalData}
                onClose={() => setModalData(null)}
                title="Modification du Champs Méta"
                footer={
                    <>
                        <Button
                            variant="light"
                            onPress={() => setModalData(null)}
                            className="bg-[#F4F4F5] hover:bg-[#E4E4E7] text-[#71717A] hover:text-[#18181B] font-medium transition-colors h-10 px-4 min-w-0 rounded-[12px]"
                            disableRipple
                        >
                            Annuler
                        </Button>
                        <BasilicButton
                            onPress={() => {
                                submit({
                                    action: 'update_desc',
                                    description: editDescription,
                                    id: modalData.id,
                                    ownerType: modalData.ownerType,
                                    key: modalData.fullKey,
                                    name: editName
                                }, {method:'post'});
                                setModalData(null);
                            }}
                        >
                            Sauvegarder
                        </BasilicButton>
                    </>
                }
            >
                {modalData && (
                    <div className="space-y-4 pt-2">
                        
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-default-700">Titre</label>
                            <input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full p-3 border border-default-200 rounded-[10px] focus:outline-none focus:ring-2 focus:ring-primary font-inter text-sm"
                                placeholder="Nom du champ"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-default-700">Description</label>
                            <textarea
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                className="w-full h-24 p-3 border border-default-200 rounded-[10px] resize-none focus:outline-none focus:ring-2 focus:ring-primary font-inter text-sm"
                                placeholder="Entrez une description..."
                            />
                        </div>
                    </div>
                )}
            </BasilicModal>
        </div>
    );
}