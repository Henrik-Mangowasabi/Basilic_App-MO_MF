import { useState } from "react";
import { useLoaderData, useLocation } from "react-router";
import { authenticate } from "../shopify.server";
import { AppBrand, DevModeToggle, NavigationTabs, BasilicSearch } from "../components/BasilicUI";

export const loader = async ({ request }: any) => {
    const { admin } = await authenticate.admin(request);
    
    // On charge les counts pour les tabs
    const moAllRes = await admin.graphql(`{ metaobjectDefinitions(first: 50) { nodes { id } } }`);
    const moAllJson = await moAllRes.json();
    const moCount = moAllJson?.data?.metaobjectDefinitions?.nodes?.length || 0;

    const resources = ['PRODUCT', 'PRODUCTVARIANT', 'COLLECTION', 'CUSTOMER', 'ORDER', 'DRAFTORDER', 'COMPANY', 'LOCATION', 'MARKET', 'PAGE', 'BLOG', 'ARTICLE', 'SHOP'];
    const results = await Promise.all(resources.map(async (r) => {
        try {
            const q = `#graphql query { metafieldDefinitions(ownerType: ${r}, first: 50) { nodes { id } } }`;
            const res = await admin.graphql(q);
            const json = await res.json();
            return (json?.data?.metafieldDefinitions?.nodes || []).length;
        } catch (e) {
            return 0;
        }
    }));
    const mfCount = results.reduce((acc, curr) => acc + curr, 0);

    return { moCount, mfCount };
};

export default function AppTemplates() {
    const { moCount, mfCount } = useLoaderData<any>();
    const location = useLocation();
    const [isDevMode, setIsDevMode] = useState(false);
    const [search, setSearch] = useState("");

    return (
        <div className="min-h-screen bg-white">
            <div className="mx-auto px-6 py-6 space-y-6" style={{ maxWidth: '1800px' }}>
                <div className="flex justify-between items-center w-full p-4 bg-default-100 rounded-[16px]">
                    <AppBrand />
                    <div className="flex gap-3 items-center">
                        <DevModeToggle isChecked={isDevMode} onChange={setIsDevMode} />
                    </div>
                </div>

                <div className="flex items-center justify-between w-full">
                    <NavigationTabs activePath={location.pathname} counts={{ mf: mfCount, mo: moCount }} />
                    <div className="flex-shrink-0" style={{ width: '320px' }}>
                        <BasilicSearch value={search} onValueChange={setSearch} placeholder="Search" />
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center p-20 bg-default-100 rounded-[24px] border-2 border-dashed border-default-300 mt-4">
                    <div className="text-center max-w-md">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-6">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4BB961" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                <line x1="3" y1="9" x2="21" y2="9"/>
                                <line x1="9" y1="21" x2="9" y2="9"/>
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-default-800 mb-2">Espace Templates</h2>
                        <p className="text-default-500 mb-8">Cette section est en cours de développement. Vous pourrez bientôt gérer vos modèles de données et structures réutilisables ici.</p>
                        <div className="px-6 py-2 bg-white rounded-full border border-default-200 text-[#4BB961] font-bold text-sm inline-block shadow-sm">
                            Bientôt disponible
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
