import { useState } from "react";
import { useLoaderData, useLocation } from "react-router";
import { authenticate } from "../shopify.server";
import { Container, Header, NavigationTabs, BasilicChip, DevModeToggle } from "../components/BasilicUI";

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

    return (
        <Container>
            <Header>
                <DevModeToggle isChecked={isDevMode} onChange={setIsDevMode} />
            </Header>

            <NavigationTabs activePath={location.pathname} counts={{ mf: mfCount, mo: moCount }} />

            <div className="flex flex-col items-center justify-center p-20 bg-default-50 rounded-2xl border-2 border-dashed border-divider mt-4">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-default-800 mb-2">Bienvenue dans l&apos;espace Templates</h2>
                    <p className="text-default-500 mb-6">Cette section est en cours de développement. Vous pourrez bientôt gérer vos modèles de données ici.</p>
                    <BasilicChip variant="flat" color="primary" className="font-semibold">Bientôt disponible</BasilicChip>
                </div>
            </div>
        </Container>
    );
}
