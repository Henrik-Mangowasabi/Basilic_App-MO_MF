import { useState } from "react";
import { Container, Header, AppBrand, DevModeToggle, BasilicCard, BasilicCardBody, BasilicButton, BasilicSearch, NavigationTabs, BasilicDropdown, BasilicModal, Divider } from "../components/BasilicUI";

export default function UIKitPage() {
  const [isDev, setIsDev] = useState(false);
  const [isDev2, setIsDev2] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <Container>
      <Header />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
        {/* Branding Section */}
        <BasilicCard className="p-4">
          <BasilicCardBody>
            <h3 className="text-lg font-bold mb-4">Identification de l&apos;App</h3>
            <div className="flex flex-col gap-6">
              <div>
                <p className="text-tiny text-default-500 mb-2 font-mono uppercase tracking-wider">Par défaut</p>
                <AppBrand />
              </div>
              <Divider />
              <div>
                <p className="text-tiny text-default-500 mb-2 font-mono uppercase tracking-wider">Personnalisé (Pro / Blue)</p>
                <AppBrand name="Basilic Pro" plan="premium" logoColor="#3b82f6" logoIcon={<span>★</span>} />
              </div>
            </div>
          </BasilicCardBody>
        </BasilicCard>

        {/* Logic Section */}
        <BasilicCard className="p-4">
          <BasilicCardBody>
            <h3 className="text-lg font-bold mb-4">Contrôles & Toggles</h3>
            <div className="flex flex-col gap-6">
              <div>
                <p className="text-tiny text-default-500 mb-2 font-mono uppercase tracking-wider">Dev Mode (Désactivé)</p>
                <DevModeToggle isChecked={isDev} onChange={setIsDev} />
              </div>
              <Divider />
              <div>
                <p className="text-tiny text-default-500 mb-2 font-mono uppercase tracking-wider">Dev Mode (Activé)</p>
                <DevModeToggle isChecked={isDev2} onChange={setIsDev2} />
              </div>
            </div>
          </BasilicCardBody>
        </BasilicCard>

        {/* Buttons Section */}
        <BasilicCard className="p-4 md:col-span-2">
          <BasilicCardBody>
            <h3 className="text-lg font-bold mb-4">Boutons & Actions</h3>
            <div className="flex flex-wrap gap-6 items-center">
              <div>
                <p className="text-tiny text-default-500 mb-2 font-mono uppercase tracking-wider">Button Figma (Primary)</p>
                <BasilicButton 
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>
                      <path d="M5 3v4"></path>
                      <path d="M19 17v4"></path>
                      <path d="M3 5h4"></path>
                      <path d="M17 19h4"></path>
                    </svg>
                  }
                >
                  Auto générer (manquants)
                </BasilicButton>
              </div>
              <div>
                <p className="text-tiny text-default-500 mb-2 font-mono uppercase tracking-wider">Variante Secondaire</p>
                <BasilicButton variant="flat" color="default">
                  Annuler
                </BasilicButton>
              </div>
              <div>
                <p className="text-tiny text-default-500 mb-2 font-mono uppercase tracking-wider">Danger</p>
                <BasilicButton color="danger" variant="flat">
                  Supprimer
                </BasilicButton>
              </div>
            </div>
          </BasilicCardBody>
        </BasilicCard>

        {/* Inputs Section */}
        <BasilicCard className="p-4 md:col-span-2">
          <BasilicCardBody>
            <h3 className="text-lg font-bold mb-4">Entrées & Recherche</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-tiny text-default-500 mb-2 font-mono uppercase tracking-wider">Barre de Recherche</p>
                <BasilicSearch />
              </div>
              <div>
                <p className="text-tiny text-default-500 mb-2 font-mono uppercase tracking-wider">Recherche (Placeholder custom)</p>
                <BasilicSearch placeholder="Rechercher des produits..." />
              </div>
            </div>
          </BasilicCardBody>
        </BasilicCard>

        {/* Navigation Section */}
        <BasilicCard className="p-4 md:col-span-2">
          <BasilicCardBody>
            <h3 className="text-lg font-bold mb-4">Onglets & Navigation</h3>
            <div className="w-full">
              <p className="text-tiny text-default-500 mb-4 font-mono uppercase tracking-wider">Navigation Principale</p>
              <NavigationTabs activePath="/app/mf" counts={{ mf: 12, mo: 5 }} disableNavigation={true} />
            </div>
          </BasilicCardBody>
        </BasilicCard>
        {/* Dropdowns Section */}
        <BasilicCard className="p-4 md:col-span-2">
          <BasilicCardBody>
            <h3 className="text-lg font-bold mb-4">Menus Déroulants</h3>
            <div className="flex flex-wrap gap-6 items-start">
              <div>
                <p className="text-tiny text-default-500 mb-2 font-mono uppercase tracking-wider">Simple Dropdown</p>
                <BasilicDropdown 
                  triggerLabel="Options" 
                  items={[
                    { key: "edit", label: "Éditer" },
                    { key: "duplicate", label: "Dupliquer" },
                    { key: "delete", label: "Supprimer", color: "danger", className: "text-danger" }
                  ]} 
                />
              </div>
              <div>
                <p className="text-tiny text-default-500 mb-2 font-mono uppercase tracking-wider">Avec Sélection</p>
                <BasilicDropdown 
                  triggerLabel="Filtrer par statut" 
                  items={[
                    { key: "active", label: "Actif" },
                    { key: "draft", label: "Brouillon" },
                    { key: "archived", label: "Archivé" }
                  ]} 
                />
              </div>
            </div>
          </BasilicCardBody>
        </BasilicCard>
      {/* Modals Section */}
        <BasilicCard className="p-4 md:col-span-2">
          <BasilicCardBody>
            <h3 className="text-lg font-bold mb-4">Modales</h3>
            <div className="flex gap-4">
              <BasilicButton onPress={() => setIsModalOpen(true)}>Ouvrir la Modale</BasilicButton>
              <BasilicModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                title="Exemple de Modale"
                footer={
                  <>
                    <BasilicButton color="danger" variant="flat" onPress={() => setIsModalOpen(false)}>Fermer</BasilicButton>
                    <BasilicButton onPress={() => setIsModalOpen(false)}>Confirmer</BasilicButton>
                  </>
                }
              >
                <p>Ceci est le contenu de la modale. Vous pouvez y mettre ce que vous voulez.</p>
              </BasilicModal>
            </div>
          </BasilicCardBody>
        </BasilicCard>
      </div>

      {/* Future sections can be added here */}
      <div className="mt-12 text-center text-default-400 text-sm">
        UI Kit de l'écosystème Basilic - Plus d'éléments à venir.
      </div>
    </Container>
  );
}
