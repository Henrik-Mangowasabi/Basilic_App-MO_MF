import { Icons } from "./Icons";
import "../styles/basilic-ui.css";

interface SectionHeaderProps {
    icon: React.ReactNode;
    title: string;
    count: number;
    isOpen: boolean;
    onToggle: () => void;
}

/**
 * SectionHeader - Header collapsible pour les sections de données
 *
 * Affiche un header cliquable qui permet de collapse/expand le contenu.
 * Inclut une icône, un titre, un compteur et un chevron animé.
 *
 * @example
 * ```tsx
 * <SectionHeader
 *   icon={<TemplateIcon />}
 *   title="Templates"
 *   count={filteredData.length}
 *   isOpen={openSections["Templates"]}
 *   onToggle={() => setOpenSections(p => ({ ...p, ["Templates"]: !p["Templates"] }))}
 * />
 * ```
 */
export function SectionHeader({ icon, title, count, isOpen, onToggle }: SectionHeaderProps) {
    return (
        <div className="section-header" onClick={onToggle}>
            <div className="section-header__title-group">
                <span className="section-header__icon">{icon}</span>
                <span className="section-header__title">{title}</span>
                <span className="section-header__count">{count}</span>
            </div>
            <span className={`section-header__chevron ${isOpen ? 'section-header__chevron--open' : ''}`}>
                <Icons.ChevronRight />
            </span>
        </div>
    );
}
