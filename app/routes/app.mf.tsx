import { useState, useEffect, useRef, useMemo } from "react";
import { useLoaderData, useSubmit, useFetcher, useRevalidator, useNavigation, useLocation, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";
import "../styles/metafields-table.css";
import { AppBrand, DevModeToggle, BasilicButton, BasilicSearch, NavigationTabs, BasilicModal } from "../components/BasilicUI";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Tooltip, Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react";

const Icons = {
    Products: (props: any) => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}><path d="M8.372 11.6667C7.11703 10.4068 7.23007 8.25073 8.62449 6.85091L12.6642 2.79552C14.0586 1.3957 16.2064 1.28222 17.4613 2.54206C18.7163 3.8019 18.6033 5.95797 17.2088 7.3578L15.189 9.3855" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path opacity="0.5" d="M11.6281 8.33333C12.8831 9.59317 12.77 11.7492 11.3756 13.1491L9.35575 15.1768L7.33591 17.2045C5.94149 18.6043 3.79373 18.7178 2.53875 17.4579C1.28378 16.1981 1.39682 14.042 2.79124 12.6422L4.81111 10.6144" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>),
    Variants: (props: any) => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}><path d="M10.0001 1.66666L1.66675 5.83332L10.0001 9.99999L18.3334 5.83332L10.0001 1.66666Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M1.66675 14.1667L10.0001 18.3333L18.3334 14.1667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M1.66675 10L10.0001 14.1667L18.3334 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>),
    Collections: (props: any) => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}><path d="M18.3334 15.8333C18.3334 16.2754 18.1578 16.6993 17.8453 17.0118C17.5327 17.3244 17.1088 17.5 16.6667 17.5H3.33341C2.89139 17.5 2.46746 17.3244 2.1549 17.0118C1.84234 16.6993 1.66675 16.2754 1.66675 15.8333V4.16667C1.66675 3.72464 1.84234 3.30072 2.1549 2.98816C2.46746 2.67559 2.89139 2.5 3.33341 2.5H7.50008L9.16675 5H16.6667C17.1088 5 17.5327 5.17559 17.8453 5.48816C18.1578 5.80072 18.3334 6.22464 18.3334 6.66667V15.8333Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>),
    Clients: (props: any) => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}><path d="M14.1666 17.5V15.8333C14.1666 14.9493 13.8154 14.1014 13.1903 13.4763C12.5652 12.8512 11.7173 12.5 10.8333 12.5H4.16658C3.28253 12.5 2.43468 12.8512 1.80956 13.4763C1.18444 14.1014 0.833252 14.9493 0.833252 15.8333V17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M7.50008 9.16667C9.34103 9.16667 10.8334 7.67428 10.8334 5.83333C10.8334 3.99238 9.34103 2.5 7.50008 2.5C5.65913 2.5 4.16675 3.99238 4.16675 5.83333C4.16675 7.67428 5.65913 9.16667 7.50008 9.16667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M19.1667 17.5V15.8333C19.1662 15.0948 18.9204 14.3773 18.4679 13.7936C18.0154 13.2099 17.3819 12.793 16.6667 12.6083" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M13.3333 2.60834C14.0503 2.79192 14.6858 3.20892 15.1396 3.7936C15.5935 4.37827 15.8398 5.09736 15.8398 5.8375C15.8398 6.57765 15.5935 7.29674 15.1396 7.88141C14.6858 8.46609 14.0503 8.88309 13.3333 9.06667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>),
    Orders: (props: any) => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}><path d="M9.16667 18.1083C9.42003 18.2546 9.70744 18.3316 10 18.3316C10.2926 18.3316 10.58 18.2546 10.8333 18.1083L16.6667 14.775C16.9198 14.6289 17.13 14.4187 17.2763 14.1657C17.4225 13.9126 17.4997 13.6256 17.5 13.3333V6.66666C17.4997 6.37439 17.4225 6.08733 17.2763 5.83429C17.13 5.58125 16.9198 5.37113 16.6667 5.22499L10.8333 1.89166C10.58 1.74538 10.2926 1.66837 10 1.66837C9.70744 1.66837 9.42003 1.74538 9.16667 1.89166L3.33333 5.22499C3.08022 5.37113 2.86998 5.58125 2.72372 5.83429C2.57745 6.08733 2.5003 6.37439 2.5 6.66666V13.3333C2.5003 13.6256 2.57745 13.9126 2.72372 14.1657C2.86998 14.4187 3.08022 14.6289 3.33333 14.775L9.16667 18.1083Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 18.3333V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M2.7417 5.83334L10 10L17.2584 5.83334" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M6.25 3.55832L13.75 7.84999" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>),
    Companies: (props: any) => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}><path d="M16.6667 5.83331H3.33341C2.41294 5.83331 1.66675 6.57951 1.66675 7.49998V15.8333C1.66675 16.7538 2.41294 17.5 3.33341 17.5H16.6667C17.5872 17.5 18.3334 16.7538 18.3334 15.8333V7.49998C18.3334 6.57951 17.5872 5.83331 16.6667 5.83331Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M13.3334 17.5V4.16667C13.3334 3.72464 13.1578 3.30072 12.8453 2.98816C12.5327 2.67559 12.1088 2.5 11.6667 2.5H8.33341C7.89139 2.5 7.46746 2.67559 7.1549 2.98816C6.84234 3.30072 6.66675 3.72464 6.66675 4.16667V17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>),
    Locations: (props: any) => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}><path d="M17.5 8.33331C17.5 14.1666 10 19.1666 10 19.1666C10 19.1666 2.5 14.1666 2.5 8.33331C2.5 6.34419 3.29018 4.43654 4.6967 3.03001C6.10322 1.62349 8.01088 0.833313 10 0.833313C11.9891 0.833313 13.8968 1.62349 15.3033 3.03001C16.7098 4.43654 17.5 6.34419 17.5 8.33331Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 10.8333C11.3807 10.8333 12.5 9.71402 12.5 8.33331C12.5 6.9526 11.3807 5.83331 10 5.83331C8.61929 5.83331 7.5 6.9526 7.5 8.33331C7.5 9.71402 8.61929 10.8333 10 10.8333Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>),
    Markets: (props: any) => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}><path d="M10.0001 18.3334C14.6025 18.3334 18.3334 14.6024 18.3334 10C18.3334 5.39765 14.6025 1.66669 10.0001 1.66669C5.39771 1.66669 1.66675 5.39765 1.66675 10C1.66675 14.6024 5.39771 18.3334 10.0001 18.3334Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M1.66675 10H18.3334" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M10.0001 1.66669C12.0845 3.94865 13.269 6.91005 13.3334 10C13.269 13.09 12.0845 16.0514 10.0001 18.3334C7.91568 16.0514 6.73112 13.09 6.66675 10C6.73112 6.91005 7.91568 3.94865 10.0001 1.66669Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>),
    Generic: (props: any) => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>),
    ChevronRight: (props: any) => (<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none" {...props}><path d="M4.45508 9.96001L7.71508 6.70001C8.10008 6.31501 8.10008 5.68501 7.71508 5.30001L4.45508 2.04001" stroke="#A1A1AA" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/></svg>),
    Link: (props: any) => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}><path d="M8.372 11.6667C7.11703 10.4068 7.23007 8.25073 8.62449 6.8509L12.6642 2.79552C14.0586 1.39569 16.2064 1.28221 17.4613 2.54205C18.7163 3.8019 18.6033 5.95797 17.2088 7.35779L15.189 9.3855" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path opacity="0.5" d="M11.6278 8.33333C12.8828 9.59318 12.7698 11.7492 11.3753 13.1491L9.3555 15.1768L7.33566 17.2045C5.94124 18.6043 3.79348 18.7178 2.53851 17.4579C1.28353 16.1981 1.39658 14.042 2.79099 12.6422L4.81086 10.6145" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>),
    VerticalDots: (props: any) => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" {...props}><path opacity="0.5" d="M4 8C4 8.55228 3.55228 9 3 9C2.44772 9 2 8.55228 2 8C2 7.44772 2.44772 7 3 7C3.55228 7 4 7.44772 4 8Z" fill="#18181B"/><path opacity="0.5" d="M9 8C9 8.55228 8.55228 9 8 9C7.44772 9 7 8.55228 7 8C7 7.44772 7.44772 7 8 7C8.55228 7 9 7.44772 9 8Z" fill="#18181B"/><path opacity="0.5" d="M14 8C14 8.55228 13.5523 9 13 9C12.4477 9 12 8.55228 12 8C12 7.44772 12.4477 7 13 7C13.5523 7 14 7.44772 14 8Z" fill="#18181B"/></svg>),
    Edit: (props: any) => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none" {...props}><path d="M12.739 2.62648L11.9666 3.39888L4.86552 10.4999C4.38456 10.9809 4.14407 11.2214 3.93725 11.4865C3.69328 11.7993 3.48412 12.1378 3.31346 12.4959C3.16878 12.7994 3.06123 13.1221 2.84614 13.7674L1.93468 16.5017L1.71188 17.1701C1.60603 17.4877 1.68867 17.8378 1.92536 18.0745C2.16205 18.3112 2.51215 18.3938 2.8297 18.288L3.4981 18.0652L6.23249 17.1537C6.87777 16.9386 7.20042 16.8311 7.50398 16.6864C7.86208 16.5157 8.20052 16.3066 8.51331 16.0626C8.77847 15.8558 9.01895 15.6153 9.49992 15.1343L16.601 8.03328L17.3734 7.26088C18.6531 5.98113 18.6531 3.90624 17.3734 2.62648C16.0936 1.34673 14.0187 1.34673 12.739 2.62648Z" stroke="currentColor" strokeWidth="1.5"/><path d="M11.9665 3.39884C11.9665 3.39884 12.063 5.04019 13.5113 6.48844C14.9595 7.93669 16.6008 8.03324 16.6008 8.03324M3.498 18.0651L1.93457 16.5017" stroke="currentColor" strokeWidth="1.5"/></svg>),
    Delete: (props: any) => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none" {...props}><path d="M17.0832 5H2.9165" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M15.6946 7.08333L15.3113 12.8326C15.1638 15.045 15.09 16.1512 14.3692 16.8256C13.6483 17.5 12.5397 17.5 10.3223 17.5H9.67787C7.46054 17.5 6.35187 17.5 5.63103 16.8256C4.91019 16.1512 4.83644 15.045 4.68895 12.8326L4.30566 7.08333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M7.9165 9.16667L8.33317 13.3333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M12.0832 9.16667L11.6665 13.3333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M5.4165 5C5.46307 5 5.48635 5 5.50746 4.99947C6.19366 4.98208 6.79902 4.54576 7.03252 3.90027C7.0397 3.88041 7.04706 3.85832 7.06179 3.81415L7.14269 3.57143C7.21176 3.36423 7.24629 3.26063 7.2921 3.17267C7.47485 2.82173 7.81296 2.57803 8.20368 2.51564C8.30161 2.5 8.41082 2.5 8.62922 2.5H11.3705C11.5889 2.5 11.6981 2.5 11.796 2.51564C12.1867 2.57803 12.5248 2.82173 12.7076 3.17267C12.7534 3.26063 12.7879 3.36423 12.857 3.57143L12.9379 3.81415C12.9526 3.85826 12.96 3.88042 12.9672 3.90027C13.2007 4.54576 13.806 4.98208 14.4922 4.99947C14.5133 5 14.5366 5 14.5832 5" stroke="currentColor" strokeWidth="1.5"/></svg>)
};

const TRAD: Record<string, string> = { 'single_line_text_field': 'Texte', 'multi_line_text_field': 'Texte (multi)', 'number_integer': 'Entier', 'number_decimal': 'Décimal', 'boolean': 'Booléen', 'url': 'Url', 'json': 'JSON', 'date': 'Date', 'date_time': 'Date Heure', 'color': 'Couleur', 'weight': 'Poids', 'volume': 'Volume', 'dimension': 'Dimension', 'rating': 'Note', 'money': 'Argent', 'file_reference': 'Fichier', 'product_reference': 'Produit', 'variant_reference': 'Variante', 'collection_reference': 'Collection', 'page_reference': 'Page', 'customer_reference': 'Client', 'metaobject_reference': 'Métaobjet' };
const translateType = (t: string) => (!t ? '-' : t.startsWith('list.') ? `Liste ${TRAD[t.replace('list.', '')] || t.replace('list.', '')}` : TRAD[t] || t);
const norm = (s: string) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export const loader = async ({ request }: any) => {
    const { admin } = await authenticate.admin(request);
    const url = new URL(request.url);
    const shouldScan = url.searchParams.get('scan') === 'true';
    
    const shopRes = await admin.graphql(`{ shop { myshopifyDomain } }`);
    const shopJson = await shopRes.json();
    const domain = shopJson.data.shop.myshopifyDomain;
    // Metaobjects Count - Count all with pagination
    let moCount = 0;
    let hasNextMoPage = true;
    let moCursor: string | null = null;
    while (hasNextMoPage) {
        const moRes = await admin.graphql(`query getMetaobjectDefinitionsCount($cursor: String) { metaobjectDefinitions(first: 250, after: $cursor) { pageInfo { hasNextPage endCursor } nodes { id } } }`, { variables: { cursor: moCursor } });
        const moJson: any = await moRes.json();
        const data: any = moJson.data?.metaobjectDefinitions;
        if (data?.nodes && Array.isArray(data.nodes)) {
            moCount += data.nodes.length;
        }
        hasNextMoPage = data?.pageInfo?.hasNextPage || false;
        moCursor = data?.pageInfo?.endCursor || null;
        if (moCount >= 10000) break; // Safety limit
    }

    let installedApps: string[] = [];
    try {
        const appsRes = await admin.graphql(`query { appInstallations(first: 100) { nodes { app { title handle } } } }`);
        const appsJson = await appsRes.json();
        installedApps = (appsJson.data?.appInstallations?.nodes || []).map((n: any) => n.app.handle.toLowerCase());
    } catch (e) {
        console.error("Access denied for appInstallations, check scopes:", e);
    }
    installedApps.push('shopify'); 
    installedApps.push('custom');
    installedApps.push('test_data');

    const query = (ot: string, cursor: string | null) => `query getMetafieldDefinitions($cursor: String, $ownerType: MetafieldOwnerType!) { metafieldDefinitions(ownerType: $ownerType, first: 250, after: $cursor) { pageInfo { hasNextPage endCursor } nodes { id name key namespace type { name } description metafieldsCount } } }`;
    const ots = ['PRODUCT', 'PRODUCTVARIANT', 'COLLECTION', 'CUSTOMER', 'ORDER', 'DRAFTORDER', 'COMPANY', 'LOCATION', 'MARKET', 'PAGE', 'BLOG', 'ARTICLE', 'SHOP'];
    const results = await Promise.all(ots.map(async (ot) => {
        let allNodes: any[] = [];
        let hasNextPage = true;
        let cursor: string | null = null;
        
        // Récupérer TOUS les metafields avec pagination
        while (hasNextPage) {
            const r = await admin.graphql(query(ot, cursor), { variables: { cursor, ownerType: ot } }); 
            const j = await r.json();
            const data = j.data?.metafieldDefinitions;
            if (data?.nodes && Array.isArray(data.nodes)) {
                allNodes = [...allNodes, ...data.nodes];
            }
            hasNextPage = data?.pageInfo?.hasNextPage || false;
            cursor = data?.pageInfo?.endCursor || null;
            if (allNodes.length >= 10000) break; // Safety limit
        }
        
        return allNodes.map((n: any) => {
            const ns = n.namespace.toLowerCase();
            const isInstalled = installedApps.some((h: string) => ns.includes(h) || h.includes(ns));
            const fullKey = `${n.namespace}.${n.key}`;
            return { 
                ...n, 
                ownerType: ot, 
                fullKey, 
                count: n.metafieldsCount, 
                typeDisplay: translateType(n.type?.name), 
                diagTitle: (ns === 'custom' || ns === 'test_data') ? 'Manuel' : (ns.includes('discovery') ? 'Search & Discovery' : n.namespace.split(/[-_]+/).map((s: any) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')),
                diagSubtitle: (ns === 'custom' || ns === 'test_data') ? 'Création manuelle' : (isInstalled ? 'Installée' : 'Désinstallée'),
                isManual: (ns === 'custom' || ns === 'test_data'),
                isInstalled: isInstalled,
                inCode: false // Sera mis à jour après le scan
            };
        }); 
    }));
    
    // 5. COUNTS (for navigation) + SCAN CODE
    const themesRes = await admin.graphql(`{ themes(first: 1, roles: [MAIN]) { nodes { id } } }`);
    const themesData = await themesRes.json();
    const activeThemeId = themesData.data?.themes?.nodes?.[0]?.id.split('/').pop();
    let totalTemplates = 0;
    const metafieldsInCode = new Set<string>();
    
    if (activeThemeId) {
        const { session } = await authenticate.admin(request);
        const assetsRes = await fetch(`https://${domain}/admin/api/2024-10/themes/${activeThemeId}/assets.json`, {
            headers: { "X-Shopify-Access-Token": session.accessToken!, "Content-Type": "application/json" }
        });
        const assetsJson = await assetsRes.json();
        const managedTypes = ['product', 'collection', 'page', 'blog', 'article'];
        totalTemplates = (assetsJson.assets || []).filter((a: any) => {
            if (!a.key.startsWith('templates/') || !a.key.endsWith('.json')) return false;
            const type = a.key.replace('templates/', '').split('.')[0];
            return managedTypes.includes(type);
        }).length;
        
        // Scan code UNIQUEMENT si shouldScan est true (premier chargement ou clic sur Scan Code)
        if (shouldScan) {
            const allAssets = assetsJson.assets || [];
            const scannableExtensions = ['.liquid', '.js', '.json', '.css', '.scss', '.ts', '.tsx', '.jsx'];
            const scannableAssets = allAssets.filter((a: any) => {
                const key = a.key;
                return scannableExtensions.some(ext => key.endsWith(ext)) &&
                       !key.includes('node_modules') &&
                       !key.includes('.min.');
            });
            
            // Créer un Set de tous les fullKeys pour recherche rapide
            const allFullKeys = new Set(Object.values(results).flat().map((mf: any) => mf.fullKey));
            
            // Scanner tous les fichiers avec progression
            const batchSize = 10;
            
            for (let i = 0; i < scannableAssets.length; i += batchSize) {
                const batch = scannableAssets.slice(i, i + batchSize);
                await Promise.all(batch.map(async (asset: any) => {
                    try {
                        const assetContentRes = await fetch(`https://${domain}/admin/api/2024-10/themes/${activeThemeId}/assets.json?asset[key]=${encodeURIComponent(asset.key)}`, {
                            headers: { "X-Shopify-Access-Token": session.accessToken!, "Content-Type": "application/json" }
                        });
                        const assetContentJson = await assetContentRes.json();
                        const content = assetContentJson.asset?.value || '';
                        
                        // Chercher tous les metafields dans le contenu
                        allFullKeys.forEach((fullKey) => {
                            // Extraire namespace et key séparément
                            const [namespace, key] = fullKey.split('.');
                            
                            // Patterns de recherche flexibles pour détecter TOUTES les clés techniques
                            // Format direct
                            if (content.includes(fullKey)) {
                                metafieldsInCode.add(fullKey);
                                return;
                            }
                            
                            // Formats avec guillemets
                            if (content.includes(`"${fullKey}"`) || 
                                content.includes(`'${fullKey}'`) ||
                                content.includes(`\`${fullKey}\``)) {
                                metafieldsInCode.add(fullKey);
                                return;
                            }
                            
                            // Formats avec metafields (namespace.key ou fullKey)
                            if (content.includes(`metafields.${namespace}.${key}`) ||
                                content.includes(`metafields['${fullKey}']`) ||
                                content.includes(`metafields["${fullKey}"]`) ||
                                content.includes(`metafields.${fullKey}`)) {
                                metafieldsInCode.add(fullKey);
                                return;
                            }
                            
                            // Formats avec brackets
                            if (content.includes(`['${fullKey}']`) ||
                                content.includes(`["${fullKey}"]`)) {
                                metafieldsInCode.add(fullKey);
                                return;
                            }
                            
                            // Patterns Liquid : recherche flexible avec regex
                            // Détecte : {{ product.metafields.namespace.key }}, {{ collection.metafields.namespace.key }}, etc.
                            const liquidPattern = new RegExp(`metafields\\.${namespace.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
                            if (liquidPattern.test(content)) {
                                metafieldsInCode.add(fullKey);
                                return;
                            }
                            
                            // Pattern Liquid avec brackets : metafields['namespace.key']
                            const liquidBracketPattern = new RegExp(`metafields\\s*\\[\\s*['"]${fullKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]\\s*\\]`, 'i');
                            if (liquidBracketPattern.test(content)) {
                                metafieldsInCode.add(fullKey);
                                return;
                            }
                            
                            // Pattern pour les objets JavaScript/JSON
                            const jsPattern = new RegExp(`['"]${fullKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]\\s*:`, 'i');
                            if (jsPattern.test(content)) {
                                metafieldsInCode.add(fullKey);
                                return;
                            }
                        });
                    } catch (e) {
                        // Ignorer les erreurs pour les fichiers non accessibles
                        console.error(`Error scanning ${asset.key}:`, e);
                    }
                }));
            }
        }
    }
    // Media Count - Count all files with pagination
    let mediaCount = 0;
    let hasNextFilePage = true;
    let fileCursor: string | null = null;
    while (hasNextFilePage) {
        const filesRes = await admin.graphql(`query getFilesCount($cursor: String) { files(first: 250, after: $cursor) { pageInfo { hasNextPage endCursor } nodes { id } } }`, { variables: { cursor: fileCursor } });
        const filesJson: any = await filesRes.json();
        const data: any = filesJson.data?.files;
        if (data?.nodes && Array.isArray(data.nodes)) {
            mediaCount += data.nodes.length;
        }
        hasNextFilePage = data?.pageInfo?.hasNextPage || false;
        fileCursor = data?.pageInfo?.endCursor || null;
        if (mediaCount >= 10000) break; // Safety limit
    }
    
    // Utiliser les résultats du scan (sera mis en cache côté client)
    const metafieldsInCodeToUse = metafieldsInCode;
    
    // Marquer les metafields trouvés dans le code
    const resultsWithCodeScan = results.map((resultArray: any[]) => 
        resultArray.map((mf: any) => ({
            ...mf,
            inCode: metafieldsInCodeToUse.has(mf.fullKey)
        }))
    );
    
    return { 
        domain, moCount, totalTemplates, mediaCount, scanned: shouldScan,
        scanResults: shouldScan ? Array.from(metafieldsInCode) : null, // Envoyer les résultats du scan pour les sauvegarder côté client
        mfData: { p: resultsWithCodeScan[0], v: resultsWithCodeScan[1], c: resultsWithCodeScan[2], cl: resultsWithCodeScan[3], o: resultsWithCodeScan[4], do_: resultsWithCodeScan[5], co: resultsWithCodeScan[6], loc: resultsWithCodeScan[7], m: resultsWithCodeScan[8], pg: resultsWithCodeScan[9], b: resultsWithCodeScan[10], art: resultsWithCodeScan[11], s: resultsWithCodeScan[12] } 
    };
};

export const action = async ({ request }: any) => {
    const { admin } = await authenticate.admin(request);
    const fd = await request.formData();
    const action = fd.get("action");
    if (action === "update") { await admin.graphql(`mutation UpdateMFD($id: ID!, $name: String!, $description: String) { metafieldDefinitionUpdate(definition: { id: $id, name: $name, description: $description }) { userErrors { message } } }`, { variables: { id: fd.get("id"), name: fd.get("name"), description: fd.get("description") } }); return { ok: true }; }
    if (action === "delete") { const ids = JSON.parse(fd.get("ids") as string || "[]"); for (const id of ids) await admin.graphql(`mutation DeleteMFD($id: ID!) { metafieldDefinitionDelete(id: $id) { userErrors { message } } }`, { variables: { id } }); return { ok: true }; }
    return null;
};

export default function AppMf() {
    const { domain, mfData, moCount, totalTemplates, mediaCount, scanned, scanResults } = useLoaderData<any>();
    const submit = useSubmit();
    const revalidator = useRevalidator();
    const navigation = useNavigation();
    const location = useLocation();
    const navigate = useNavigate();
    const isLoading = navigation.state === "loading";
    // Utiliser navigation.location pour détecter la destination pendant la navigation
    const currentOrNextLocation = navigation.location || location;
    const willScan = currentOrNextLocation.search.includes('scan=true');
    const [devMode, setDevMode] = useState(false);
    const [search, setSearch] = useState("");
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({ "Produits": true });
    const [selectedKeys, setSelectedKeys] = useState<any>(new Set([]));
    const [modalData, setModalData] = useState<any>(null);
    const [editName, setEditName] = useState("");
    const [editDesc, setEditDesc] = useState("");
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
    const [toast, setToast] = useState<{title: string, msg: string} | null>(null);
    const [scanProgress, setScanProgress] = useState(0);
    const hasScannedOnce = useRef(false);
    const [cachedScanResults, setCachedScanResults] = useState<Set<string> | null>(null);
    const [sortConfig, setSortConfig] = useState<{ column: string | null; direction: 'asc' | 'desc' }>({ column: null, direction: 'asc' });

    useEffect(() => { setDevMode(localStorage.getItem('mm_dev_mode') === 'true'); }, []);
    
    // Sauvegarder les résultats du scan dans sessionStorage et les utiliser pour l'affichage
    useEffect(() => {
        if (scanResults && scanResults.length > 0) {
            // Sauvegarder les résultats du scan dans sessionStorage
            sessionStorage.setItem('mf_scan_results', JSON.stringify(scanResults));
            setCachedScanResults(new Set(scanResults));
        } else {
            // Récupérer les résultats du cache si disponibles
            const cached = sessionStorage.getItem('mf_scan_results');
            if (cached) {
                try {
                    const cachedArray = JSON.parse(cached);
                    setCachedScanResults(new Set(cachedArray));
                } catch (e) {
                    console.error('Error parsing cached scan results:', e);
                }
            }
        }
    }, [scanResults]);
    const toggleDev = (v: boolean) => { setDevMode(v); localStorage.setItem('mm_dev_mode', v ? 'true' : 'false'); };
    const totalCount = Object.values(mfData).reduce((a: number, b: any) => a + b.length, 0);

    const getShopifyLink = (item: any) => {
        const otMap: Record<string, string> = { 'PRODUCT': 'product', 'PRODUCTVARIANT': 'variant', 'COLLECTION': 'collection', 'CUSTOMER': 'customer', 'ORDER': 'order', 'DRAFTORDER': 'draft_order', 'COMPANY': 'company', 'LOCATION': 'location', 'MARKET': 'market', 'PAGE': 'page', 'BLOG': 'blog', 'ARTICLE': 'article', 'SHOP': 'shop' };
        return `https://admin.shopify.com/store/${domain.replace('.myshopify.com', '')}/settings/custom_data/${otMap[item.ownerType]}/metafields/${item.id.split('/').pop()}`;
    };

    const handleSort = (columnKey: string) => {
        setSortConfig(prev => {
            if (prev.column === columnKey) {
                // Si on clique sur la même colonne, inverser la direction
                return { column: columnKey, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            } else {
                // Nouvelle colonne, trier par ordre croissant
                return { column: columnKey, direction: 'asc' };
            }
        });
    };

    const sortData = (data: any[]) => {
        if (!sortConfig.column) return data;
        
        const sorted = [...data].sort((a, b) => {
            let aVal: string | number = '';
            let bVal: string | number = '';
            
            switch (sortConfig.column) {
                case 'name':
                    aVal = (a.name || '').toLowerCase();
                    bVal = (b.name || '').toLowerCase();
                    break;
                case 'count':
                    aVal = a.count || 0;
                    bVal = b.count || 0;
                    break;
                default:
                    return 0;
            }
            
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        
        return sorted;
    };

    const columns = [
        { 
            key: "name", 
            label: (
                <div 
                    className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity select-none" 
                    onClick={(e) => { e.stopPropagation(); handleSort('name'); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); handleSort('name'); } }}
                    role="button"
                    tabIndex={0}
                >
                    <span>NOM DU METAFIELD</span>
                    {sortConfig.column === 'name' ? (
                        <svg 
                            width="12" 
                            height="12" 
                            viewBox="0 0 12 12" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2"
                            className={`text-[#71717A] ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`}
                        >
                            <path d="M3 4.5L6 1.5L9 4.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M3 7.5L6 10.5L9 7.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    ) : (
                        <svg 
                            width="12" 
                            height="12" 
                            viewBox="0 0 12 12" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="1.5"
                            className="text-[#A1A1AA] opacity-50"
                        >
                            <path d="M3 4.5L6 1.5L9 4.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M3 7.5L6 10.5L9 7.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    )}
                </div>
            ), 
            className: "mf-col--name" 
        },
        ...(devMode ? [
            { key: "fullKey", label: (<div className="relative overflow-visible"><div className="mf-dev-badge"><span>&lt;/&gt;</span> Dev Mode</div>CLÉ TECH</div>), className: "mf-col--key mf-table__header--dev" },
            { key: "type", label: "STRUCTURE", className: "mf-col--type mf-table__header--dev" },
            { key: "status", label: "DIAG", className: "mf-col--status mf-table__header--dev" },
            { key: "code", label: "CODE", className: "mf-col--code mf-table__header--dev" }
        ] : []),
        { key: "count", label: "ASSING.", className: "mf-col--count" },
        { key: "actions", label: "LIEN", className: "mf-col--actions" },
        { key: "menu", label: " ", className: "mf-col--menu" }
    ];

    const renderCell = (item: any, key: React.Key) => {
        switch (key) {
            case "name": return (<div className="mf-cell mf-cell--multi"><span className="mf-text--title">{item.name}</span><span className="mf-text--desc">{item.description || "Aucune description"}</span></div>);
            case "fullKey": return (<div className="mf-cell mf-cell--key"><span className="mf-text--key">{item.fullKey}</span></div>);
            case "type": return (<div className="mf-cell mf-cell--type"><span className="mf-chip">{item.typeDisplay}</span></div>);
            case "status": return (
                <div className="mf-cell mf-cell--status mf-cell--multi">
                    <span className="mf-text--title !font-semibold">{item.diagTitle}</span>
                    {item.isManual ? (
                        <span className="mf-text--desc !text-[11px]">{item.diagSubtitle}</span>
                    ) : (
                        <span className={`mf-text--status !text-[11px] !font-medium flex items-center gap-1.5 ${!item.isInstalled ? '!text-[#F43F5E]' : ''}`}>
                            <span className={item.isInstalled ? "text-[#22C55E]" : "text-[#F43F5E]"}>●</span> {item.diagSubtitle}
                        </span>
                    )}
                </div>
            );
            case "code": {
                // Utiliser le cache si disponible, sinon utiliser item.inCode
                const inCode = cachedScanResults ? cachedScanResults.has(item.fullKey) : (item.inCode || false);
                return (<div className="mf-cell mf-cell--center mf-cell--badge"><span className={`mf-badge--code ${inCode ? 'mf-badge--found' : ''}`}>{inCode ? 'Oui' : 'Non'}</span></div>);
            }
            case "count": return (<div className="mf-cell mf-cell--center"><span className="mf-badge--count">{item.count}</span></div>);
            case "actions": return (<div className="mf-cell mf-cell--center"><Tooltip content="Ouvrir"><a href={getShopifyLink(item)} target="_blank" rel="noopener noreferrer" className="mf-action-link"><Icons.Link /></a></Tooltip></div>);
            case "menu": return (<div className="mf-cell mf-cell--center"><Dropdown classNames={{ content: "mf-dropdown-content" }}><DropdownTrigger><Button isIconOnly variant="light" size="sm" className="w-8 h-8"><Icons.VerticalDots /></Button></DropdownTrigger><DropdownMenu aria-label="Actions" onAction={(k) => { if (k === 'edit') { setEditName(item.name); setEditDesc(item.description || ""); setModalData(item); } else if (k === 'delete') { setPendingDeleteIds([item.id]); setDeleteModalOpen(true); } }}><DropdownItem key="edit" startContent={<Icons.Edit />} className="mf-dropdown-item"><span className="mf-dropdown-item__title">Editer</span></DropdownItem><DropdownItem key="delete" startContent={<Icons.Delete />} className="mf-dropdown-item mf-dropdown-item--delete"><span className="mf-dropdown-item__title">supprimer</span></DropdownItem></DropdownMenu></Dropdown></div>);
            default: return null;
        }
    };

    const handleOnSelectionChange = (sectionData: any[], keys: any) => {
        if (keys === "all") {
            const newSet = new Set(selectedKeys);
            sectionData.forEach(d => newSet.add(d.id));
            setSelectedKeys(newSet);
        } else {
            const currentTableIds = new Set(sectionData.map(d => d.id));
            const otherIds = new Set([...selectedKeys].filter(id => !currentTableIds.has(id)));
            const final = new Set([...otherIds, ...keys]);
            setSelectedKeys(final);
        }
    };

    const allItems = useMemo(() => Object.values(mfData).flat() as any[], [mfData]);
    const filteredSearch = useMemo(() => {
        if (!search?.trim()) return [];
        const s = norm(search.trim());
        return allItems.filter((d: any) => 
            norm(d.name).includes(s) || 
            norm(d.fullKey).includes(s) || 
            (d.description && norm(d.description).includes(s)) ||
            (d.diagTitle && norm(d.diagTitle).includes(s)) ||
            (d.typeDisplay && norm(d.typeDisplay).includes(s))
        );
    }, [search, allItems]);

    // Au premier chargement, forcer le scan (une seule fois)
    useEffect(() => {
        // Vérifier si on a déjà scanné dans cette session
        const sessionScanned = sessionStorage.getItem('mf_scanned');
        if (!sessionScanned && !location.search.includes('scan=') && !hasScannedOnce.current) {
            hasScannedOnce.current = true;
            sessionStorage.setItem('mf_scanned', 'true');
            navigate('/app/mf?scan=true', { replace: true });
        }
    }, [navigate, location.search]);
    
    // Simuler la progression pendant le scan complet uniquement
    useEffect(() => {
        if (willScan) {
            // Démarrer la progression dès qu'on détecte qu'on va scanner
            if (isLoading || scanned === undefined) {
                setScanProgress(0);
                const interval = setInterval(() => {
                    setScanProgress(prev => {
                        if (prev >= 95) return 95; // Limiter à 95% max pendant le scan
                        const next = prev + Math.random() * 10;
                        return Math.min(next, 95); // S'assurer qu'on ne dépasse jamais 95%
                    });
                }, 200);
                return () => clearInterval(interval);
            } else if (scanned) {
                // Scan terminé
                setScanProgress(100);
                const timeout = setTimeout(() => {
                    setScanProgress(0);
                    // Retirer le paramètre scan de l'URL après le scan sans déclencher de navigation
                    if (location.search.includes('scan=true')) {
                        window.history.replaceState({}, '', '/app/mf');
                    }
                }, 500);
                return () => clearTimeout(timeout);
            }
        } else {
            setScanProgress(0);
        }
    }, [willScan, isLoading, scanned, location.search, navigate]);

    return (
        <>
            {/* Loading Modal avec pourcentage - UNIQUEMENT lors du scan complet */}
            {((willScan || navigation.location?.search.includes('scan=true')) && (isLoading || scanned === undefined)) && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[24px] p-8 shadow-2xl flex flex-col items-center gap-6 min-w-[320px] animate-in zoom-in-95 duration-300">
                        <div className="relative w-24 h-24">
                            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="45"
                                    stroke="#E4E4E7"
                                    strokeWidth="8"
                                    fill="none"
                                />
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="45"
                                    stroke="#4BB961"
                                    strokeWidth="8"
                                    fill="none"
                                    strokeDasharray={`${2 * Math.PI * 45}`}
                                    strokeDashoffset={`${2 * Math.PI * 45 * (1 - scanProgress / 100)}`}
                                    strokeLinecap="round"
                                    className="transition-all duration-300"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-[20px] font-bold text-[#18181B]">{Math.round(Math.min(scanProgress, 100))}%</span>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-[18px] font-semibold text-[#18181B] mb-2">Scan du code en cours...</div>
                            <div className="text-[14px] text-[#71717A]">Analyse des fichiers du thème</div>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="min-h-screen bg-white animate-in fade-in duration-500">
                <div className="mx-auto px-6 py-6 space-y-6" style={{ maxWidth: '1800px' }}>
                <div className="flex justify-between items-center w-full p-4 bg-default-100 rounded-[16px]"><AppBrand /><div className="flex gap-3 items-center"><DevModeToggle isChecked={devMode} onChange={toggleDev} /><BasilicButton 
                    variant="flat" 
                    className="bg-white border border-[#E4E4E7] text-[#18181B] hover:bg-[#F4F4F5]" 
                    isLoading={revalidator.state === "loading"}
                    onPress={() => { 
                        setSelectedKeys(new Set()); 
                        navigate('/app/mf?scan=true');
                    }} 
                    icon={revalidator.state === "loading" ? null : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>}
                >
                    Scan Code
                </BasilicButton><BasilicButton icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>}>Générer descriptions manquantes</BasilicButton></div></div>
                <div className="flex items-center justify-between w-full"><NavigationTabs activePath="/app/mf" counts={{ mf: totalCount, mo: moCount, t: totalTemplates, m: mediaCount }} hideLoadingModal={willScan || (navigation.location?.search.includes('scan=true'))} /><div style={{ width: '320px' }}><BasilicSearch value={search} onValueChange={setSearch} placeholder="Search" /></div></div>
                
                {search ? (
                    filteredSearch.length > 0 ? (
                        <div className="mf-section animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="mf-section__header mf-section__header--open cursor-default" style={{ pointerEvents: 'none' }}><div className="mf-section__title-group"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg><span className="mf-section__title">Résultats de recherche</span><span className="mf-section__count">{filteredSearch.length}</span></div></div>
                            <div className="mf-table__base animate-in fade-in zoom-in-95 duration-300"><Table aria-label="Table MF Search" removeWrapper selectionMode="multiple" selectionBehavior={"checkbox" as any} onRowAction={() => {}} selectedKeys={selectedKeys} onSelectionChange={setSelectedKeys as any} className="mf-table" classNames={{ th: `mf-table__header ${devMode ? 'mf-table__header--dev' : ''}`, td: "mf-table__cell", tr: "mf-table__row" }}><TableHeader columns={columns}>{(c: any) => (<TableColumn key={c.key} align={c.key === "count" || c.key === "actions" || c.key === "menu" ? "center" : "start"} className={c.className}>{c.label}</TableColumn>)}</TableHeader><TableBody items={sortData(filteredSearch)} emptyContent="Aucun résultat.">{(item: any) => (<TableRow key={item.id}>{(ck) => <TableCell>{renderCell(item, ck)}</TableCell>}</TableRow>)}</TableBody></Table></div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 bg-[#F4F4F5]/50 rounded-[32px] border-2 border-dashed border-[#E4E4E7] animate-in fade-in zoom-in-95 duration-500">
                            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm mb-4">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                            </div>
                            <div className="text-[17px] font-semibold text-[#18181B]">Aucun résultat de recherche pour &quot;<span className="text-[#E11D48]">{search}</span>&quot;</div>
                            <div className="text-[14px] text-[#71717A] mt-1.5">Nous n&apos;avons rien trouvé correspondant à votre recherche.</div>
                        </div>
                    )
                ) : (
                    <div className="space-y-4">
                        {[
                            { t: "Produits", i: <Icons.Products/>, d: mfData.p }, { t: "Variantes", i: <Icons.Variants/>, d: mfData.v }, { t: "Collections", i: <Icons.Collections/>, d: mfData.c }, { t: "Clients", i: <Icons.Clients/>, d: mfData.cl }, { t: "Commandes", i: <Icons.Orders/>, d: mfData.o }, { t: "Commandes Provisoires", i: <Icons.Orders/>, d: mfData.do_ }, { t: "Entreprises B2B", i: <Icons.Companies/>, d: mfData.co }, { t: "Emplacements (Stock)", i: <Icons.Locations/>, d: mfData.loc }, { t: "Marchés", i: <Icons.Markets/>, d: mfData.m }, { t: "Pages", i: <Icons.Generic/>, d: mfData.pg }, { t: "Blogs", i: <Icons.Generic/>, d: mfData.b }, { t: "Articles", i: <Icons.Generic/>, d: mfData.art }, { t: "Boutique", i: <Icons.Generic/>, d: mfData.s }
                        ].filter(s => s.d.length > 0).map(s => {
                            const sortedData = sortData(s.d);
                            return (
                            <div key={s.t} className="mf-section animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div 
                                    className={`mf-section__header ${openSections[s.t] ? 'mf-section__header--open' : 'mf-section__header--closed'}`} 
                                    onClick={() => setOpenSections(p => ({ ...p, [s.t]: !p[s.t] }))}
                                    style={!openSections[s.t] ? { borderRadius: '8px' } : undefined}
                                ><div className="mf-section__title-group"><span className="mf-section__icon">{s.i}</span><span className="mf-section__title">{s.t}</span><span className="mf-section__count">{s.d.length}</span></div><span className={`mf-section__chevron ${openSections[s.t] ? 'mf-section__chevron--open' : ''}`}><Icons.ChevronRight /></span></div>
                                {openSections[s.t] && (
                                    <div className="mf-table__base animate-in fade-in zoom-in-95 duration-300"><Table aria-label={`Table ${s.t}`} removeWrapper selectionMode="multiple" selectionBehavior={"checkbox" as any} onRowAction={() => {}} selectedKeys={(selectedKeys as any) === "all" ? "all" : new Set([...selectedKeys].filter(k => sortedData.some((x: any) => x.id === k)))} onSelectionChange={(k) => handleOnSelectionChange(sortedData, k)} className="mf-table" classNames={{ th: `mf-table__header ${devMode ? 'mf-table__header--dev' : ''}`, td: "mf-table__cell", tr: "mf-table__row" }}><TableHeader columns={columns}>{(c: any) => (<TableColumn key={c.key} align={c.key === "count" || c.key === "actions" || c.key === "menu" ? "center" : "start"} className={c.className}>{c.label}</TableColumn>)}</TableHeader><TableBody items={sortedData} emptyContent="Aucun champ.">{(item: any) => (<TableRow key={item.id}>{(ck) => <TableCell>{renderCell(item, ck)}</TableCell>}</TableRow>)}</TableBody></Table></div>
                                )}
                            </div>
                            );
                        })}
                    </div>
                )}
                </div>

                {selectedKeys.size > 0 && (<div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300"><div className="flex items-center gap-4 bg-[#18181B] p-2 pl-5 pr-2 rounded-full shadow-2xl ring-1 ring-white/10"><div className="flex items-center gap-3"><span className="text-[14px] font-medium text-white">{(selectedKeys as any) === "all" ? totalCount : selectedKeys.size} sélectionnés</span><button onClick={() => setSelectedKeys(new Set([]))} className="text-[#A1A1AA] hover:text-white transition-colors"><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><g opacity="0.8"><path d="M10 18.3333C14.6024 18.3333 18.3333 14.6023 18.3333 9.99999C18.3333 5.39762 14.6024 1.66666 10 1.66666C5.39763 1.66666 1.66667 5.39762 1.66667 9.99999C1.66667 14.6023 5.39763 18.3333 10 18.3333Z" fill="#3F3F46"/><path d="M12.5 7.5L7.5 12.5M7.5 7.5L12.5 12.5" stroke="#A1A1AA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></g></svg></button></div><div className="h-6 w-[1px] bg-[#3F3F46]"></div><Button onPress={() => { setPendingDeleteIds(Array.from(selectedKeys).map(k => String(k))); setDeleteModalOpen(true); }} className="bg-[#F43F5E] text-white font-medium px-4 h-[36px] rounded-full hover:bg-[#E11D48] transition-colors gap-2" startContent={<Icons.Delete />}>supprimer</Button></div></div>)}

                <BasilicModal isOpen={!!modalData} onClose={() => setModalData(null)} title="Editer le champ" footer={<><Button variant="light" onPress={() => setModalData(null)} className="grow bg-[#F4F4F5]">Annuler</Button><BasilicButton className="grow" onPress={() => { submit({ action: 'update', id: modalData.id, name: editName, description: editDesc }, { method: 'post' }); setModalData(null); }}>Enregistrer</BasilicButton></>}><div className="space-y-4 pt-2"><div><label htmlFor="mf-name" className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider mb-1.5 block">Titre</label><input id="mf-name" value={editName} onChange={e => setEditName(e.target.value)} className="w-full h-11 px-4 bg-white border border-[#E4E4E7] rounded-[12px] focus:ring-2 focus:ring-[#4BB961]/20 focus:border-[#4BB961]/40 focus:outline-none transition-all text-[14px] font-semibold" /></div><div><label htmlFor="mf-desc" className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider mb-1.5 block">Description</label><textarea id="mf-desc" value={editDesc} onChange={e => setEditDesc(e.target.value)} className="w-full h-24 p-3 bg-white border border-[#E4E4E7] rounded-[12px] focus:ring-2 focus:ring-[#4BB961]/20 focus:border-[#4BB961]/40 focus:outline-none transition-all text-[14px] resize-none" /></div></div></BasilicModal>
                <BasilicModal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Confirmer suppression" footer={<><Button variant="light" onPress={() => setDeleteModalOpen(false)} className="grow bg-[#F4F4F5]">Annuler</Button><Button onPress={() => { submit({ action: 'delete', ids: JSON.stringify(pendingDeleteIds) }, { method: 'post' }); setSelectedKeys(new Set([])); setDeleteModalOpen(false); }} className="grow bg-[#F43F5E] text-white">Confirmer</Button></>}><p className="py-2 text-sm">Supprimer ces {pendingDeleteIds.length} champs ? Cette action est irréversible.</p></BasilicModal>
                {toast && (<div className="mf-toast"><div className="mf-toast__content"><span className="mf-toast__title">{toast.title}</span><span className="mf-toast__message">{toast.msg}</span></div></div>)}
            </div>
        </>
    );
}