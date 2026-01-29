import { Page, Layout, Card, Text, BlockStack } from "@shopify/polaris";
import { useScan } from "../components/ScanProvider";

export default function Index() {
    const { hasScanRun } = useScan();

    return (
        <Page title="Basilic App - Gestion">
            <Layout>
                <Layout.Section>
                    <Card>
                        <BlockStack gap="400">
                            <Text as="h2" variant="headingMd">Bienvenue sur l&apos;app Basilic App - Gestion</Text>
                            <Text as="p">
                                Sélectionnez un onglet dans le menu ci-dessus (Champs Méta ou Objets Méta) pour commencer à gérer vos données.
                                {hasScanRun && " Le scan du code a été effectué."}
                            </Text>
                        </BlockStack>
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
