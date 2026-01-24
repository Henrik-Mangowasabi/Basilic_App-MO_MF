import { Link, Outlet, useLoaderData, useRouteError, useNavigate, useHref } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider as ShopifyAppProvider } from "@shopify/shopify-app-react-router/react";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";
import frTranslations from "@shopify/polaris/locales/fr.json"; 
import { HeroUIProvider } from "@heroui/react";
import tailwindStyles from "../tailwind.css?url";
import uiKitStyles from "../styles/ui-kit.css?url";

export const links = () => [
  { rel: "stylesheet", href: polarisStyles },
  { rel: "stylesheet", href: tailwindStyles },
  { rel: "stylesheet", href: uiKitStyles },
];

export const loader = async ({ request }: any) => {
  await authenticate.admin(request);
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  return (
    <ShopifyAppProvider embedded={true} apiKey={apiKey}>
      <PolarisAppProvider i18n={frTranslations}>
        <HeroUIProvider navigate={navigate} useHref={useHref}>
          <div className="dark:bg-background">
            <NavMenu>
              <Link to="/app" rel="home">Accueil</Link>
              <Link to="/app/mf">Champs Méta (MF)</Link>
              <Link to="/app/mo">Objets Méta (MO)</Link>
              <Link to="/app/templates">Templates</Link>
              <Link to="/app/uikit">UI KIT</Link>
            </NavMenu>
            <Outlet />
          </div>
        </HeroUIProvider>
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