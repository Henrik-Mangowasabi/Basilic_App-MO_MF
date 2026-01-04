import { Page, Layout, Card, Text, BlockStack } from "@shopify/polaris";

export default function Index() {
  return (
    <Page title="MM Gestion Data">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Bienvenue sur l'app MM Gestion</Text>
              <Text as="p">
                Sélectionnez un onglet dans le menu ci-dessus (Champs Méta ou Objets Méta) pour commencer à gérer vos données.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}