import { Link, Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider as ShopifyAppProvider } from "@shopify/shopify-app-react-router/react";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";
import frTranslations from "@shopify/polaris/locales/fr.json";
import uiKitStyles from "../styles/ui-kit.css?url";
import basilicStyles from "../styles/basilic-ui.css?url";
import { ScanProvider } from "../components/ScanProvider";

export const links = () => [
  { rel: "stylesheet", href: polarisStyles },
  { rel: "stylesheet", href: uiKitStyles },
  { rel: "stylesheet", href: basilicStyles },
];

export const loader = async ({ request }: any) => {
  await authenticate.admin(request);
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <ShopifyAppProvider embedded={true} apiKey={apiKey}>
      <PolarisAppProvider i18n={frTranslations}>
        <ScanProvider>
          <div className="page">
            <NavMenu>
              <Link to="/app" rel="home">Accueil</Link>
              <Link to="/app/mf">Champs Méta (MF)</Link>
              <Link to="/app/mo">Objets Méta (MO)</Link>
              <Link to="/app/templates">Templates</Link>
              <Link to="/app/sections">Sections</Link>
              <Link to="/app/menu">Menus</Link>
            </NavMenu>
            <Outlet />
          </div>
        </ScanProvider>
      </PolarisAppProvider>
    </ShopifyAppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs: any) => {
  return boundary.headers(headersArgs);
};