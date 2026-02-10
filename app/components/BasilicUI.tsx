import React from "react";
import { useNavigate, useNavigation } from "react-router";
import {
  Button,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Switch,
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Dropdown, DropdownTrigger, DropdownMenu, DropdownItem,
  Input,
  Card, CardHeader, CardBody, CardFooter,
  Tabs, TabList, Tab, TabPanel,
  Chip,
} from "./ui";
import type { SelectionKeys } from "./ui/Table";

// --- TYPES ---
interface AppBrandProps {
  name?: string;
  plan?: string;
  logoColor?: string;
  logoIcon?: React.ReactNode;
}

interface ContainerProps {
  children: React.ReactNode;
}

interface HeaderProps {
  title?: string;
  children?: React.ReactNode;
}

// --- COMPONENTS ---

export const AppBrand: React.FC<AppBrandProps> = ({
  name = "Basilic",
  plan = "free",
  logoColor = "#4BB961",
  logoIcon = <span>B</span>
}) => {
  return (
    <div className="app-brand">
      <div className="app-brand__logo" style={{ backgroundColor: logoColor }}>
        {logoIcon}
      </div>
      <div className="app-brand__info">
        <span className="app-brand__name">{name}</span>
        <span className="app-brand__plan">{plan}</span>
      </div>
    </div>
  );
};

export const DevModeToggle: React.FC<{ isChecked?: boolean; onChange?: (val: boolean) => void }> = ({
  isChecked = false,
  onChange = () => {}
}) => {
  return (
    <div
      onClick={() => onChange(!isChecked)}
      className={`dev-toggle ${isChecked ? 'dev-toggle--active' : ''}`}
      role="switch"
      aria-checked={isChecked}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(!isChecked); } }}
    >
      <div className="dev-toggle__icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6"></polyline>
          <polyline points="8 6 2 12 8 18"></polyline>
        </svg>
      </div>
      <span className="dev-toggle__label">Dev Mode</span>
      <div className={`dev-toggle__switch ${isChecked ? 'dev-toggle__switch--on' : ''}`}>
        <div className="dev-toggle__switch-thumb" />
      </div>
    </div>
  );
};

export const Container: React.FC<ContainerProps> = ({ children }) => {
  return (
    <div className="app-container">
      {children}
    </div>
  );
};

export const Header: React.FC<HeaderProps> = ({ children }) => {
  return (
    <div className="app-header">
      <AppBrand />
      <div className="app-header__actions">
        {children}
      </div>
    </div>
  );
};

type BasilicButtonProps = {
  children?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  color?: "default" | "primary" | "secondary" | "success" | "warning" | "danger";
  variant?: "solid" | "flat" | "light" | "ghost" | "bordered";
  size?: "sm" | "md" | "lg";
  isDisabled?: boolean;
  isLoading?: boolean;
  onPress?: () => void;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
};

export const BasilicSearch: React.FC<{
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}> = (props) => {
  const { value, onValueChange, placeholder = "Search", className = "" } = props;
  const [shortcutSymbol, setShortcutSymbol] = React.useState("Ctrl");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    setShortcutSymbol(isMac ? "⌘" : "Ctrl");

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={`basilic-search ${className}`}>
      <div className="basilic-search__icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.3-4.3"></path>
        </svg>
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
        placeholder={placeholder}
        className="basilic-search__input"
      />
      <div className="basilic-search__shortcut">
        <span className="basilic-search__shortcut-key">{shortcutSymbol} ⇧ K</span>
      </div>
    </div>
  );
};

export const BasilicButton: React.FC<BasilicButtonProps> = ({
  children,
  icon,
  className = "",
  color = "primary",
  variant = "solid",
  size = "md",
  isDisabled,
  isLoading,
  onPress,
  onClick,
  type = "button",
}) => {
  const isPrimarySolid = color === "primary" && variant === "solid";
  const customClass = isPrimarySolid ? "basilic-btn--primary" : "";

  return (
    <Button
      className={`basilic-btn ${customClass} ${className}`}
      startContent={icon}
      variant={variant}
      color={color}
      size={size}
      isDisabled={isDisabled}
      isLoading={isLoading}
      onPress={onPress || onClick}
      type={type}
    >
      {children}
    </Button>
  );
};

export const BasilicModal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md"
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "full";
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={size}
      hideCloseButton={false}
      scrollBehavior="inside"
    >
      <ModalContent>
        {title && <ModalHeader>{title}</ModalHeader>}
        <ModalBody>
          {children}
        </ModalBody>
        {footer && (
          <ModalFooter>
            {footer}
          </ModalFooter>
        )}
      </ModalContent>
    </Modal>
  );
};

export const BasilicCard = Card;
export const BasilicCardHeader = CardHeader;
export const BasilicCardBody = CardBody;
export const BasilicCardFooter = CardFooter;

export const BasilicInput = Input;
export const BasilicTabs = Tabs;
export const BasilicTabList = TabList;
export const BasilicTab = Tab;
export const BasilicTabPanel = TabPanel;
export const BasilicChip = Chip;

export const BasilicTable = ({
  columns,
  items,
  renderCell,
  selectionMode = "none",
  selectedKeys,
  onSelectionChange
}: {
  columns: { key: string; label: string }[];
  items: any[];
  renderCell: (item: any, columnKey: string) => React.ReactNode;
  selectionMode?: "none" | "single" | "multiple";
  selectedKeys?: SelectionKeys;
  onSelectionChange?: (keys: SelectionKeys) => void;
}) => {
  return (
    <Table
      ariaLabel="Tableau de données"
      className="mf-table"
      selectionMode={selectionMode}
      selectedKeys={selectedKeys}
      onSelectionChange={onSelectionChange}
    >
      <TableHeader>
        {columns.map((column) => (
          <TableColumn key={column.key} className="mf-table__header">
            {column.label}
          </TableColumn>
        ))}
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow key="empty">
            <TableCell colSpan={columns.length}>
              <div className="modal-empty">Aucune donnée trouvée.</div>
            </TableCell>
          </TableRow>
        ) : (
          items.map((item) => (
            <TableRow key={item.id} className="mf-table__row">
              {columns.map((column) => (
                <TableCell key={column.key}>
                  {renderCell(item, column.key)}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};


export const BasilicDropdown = ({
  triggerLabel = "Actions",
  items = [],
  onAction
}: {
  triggerLabel?: React.ReactNode;
  items: Array<{ key: string; label: string; color?: "default" | "danger"; className?: string }>;
  onAction?: (key: string) => void;
}) => {
  return (
    <Dropdown>
      <DropdownTrigger>
        <Button variant="flat" className="dropdown-btn" endContent={
          <span className="dropdown-btn__icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </span>
        }>
          {triggerLabel}
        </Button>
      </DropdownTrigger>
      <DropdownMenu aria-label="Dropdown Actions">
        {items.map((item) => (
          <DropdownItem
            key={item.key}
            className={item.className}
            color={item.color}
            onPress={() => onAction?.(item.key)}
          >
            {item.label}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
};

export const NavigationTabs = ({ activePath, counts, disableNavigation = false, hideLoadingModal = false }: { activePath: string, counts: { mf: number, mo: number, t?: number, m?: number, menu?: number, sections?: number }, disableNavigation?: boolean, hideLoadingModal?: boolean }) => {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const isLoading = navigation.state === "loading" && !hideLoadingModal;

  const tabs = [
    { key: "/app/mf", label: "Champs Méta", count: counts.mf, icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
    )},
    { key: "/app/mo", label: "Objets Méta", count: counts.mo, icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
    )},
    { key: "/app/templates", label: "Templates", count: counts.t, icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
    )},
    { key: "/app/sections", label: "Sections", count: counts.sections ?? 0, icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
    )},
    { key: "/app/menu", label: "Menus", count: counts.menu ?? 0, icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
    )},
  ];

  return (
    <>
      <div className="nav-tabs">
        {tabs.map((tab) => {
          const isActive = activePath === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => !disableNavigation && navigate(tab.key)}
              className={`nav-tabs__item ${isActive ? 'nav-tabs__item--active' : ''}`}
            >
              <span className="nav-tabs__icon">{tab.icon}</span>
              <span className="nav-tabs__label">{tab.label}</span>
              {tab.count !== undefined && (
                <span className="nav-tabs__badge">{tab.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-modal">
            <div className="loading-modal__spinner"></div>
            <div className="loading-modal__text">
              <div className="loading-modal__title">Chargement...</div>
              <div className="loading-modal__subtitle">Veuillez patienter</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Re-export UI components for direct use
export {
  Button,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Switch,
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Dropdown, DropdownTrigger, DropdownMenu, DropdownItem,
  Input,
  Card, CardHeader, CardBody, CardFooter,
  Tabs, TabList, Tab, TabPanel,
  Chip,
  Tooltip,
  Pagination,
  Divider,
} from "./ui";
