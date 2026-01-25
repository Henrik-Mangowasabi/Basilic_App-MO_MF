import React from "react";
import { 
  Button as HeroButton, 
  Card as HeroCard, 
  Input as HeroInput,
  Tabs as HeroTabs,
  Tab as HeroTab,
  Chip as HeroChip,
  Modal as HeroModal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Switch as HeroSwitch,
  Table as HeroTable,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Dropdown as HeroDropdown,
  DropdownTrigger as HeroDropdownTrigger,
  DropdownMenu as HeroDropdownMenu,
  DropdownItem as HeroDropdownItem
} from "@heroui/react";
import { useNavigate } from "react-router";

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
  logoIcon = <span className="text-lg">B</span>
}) => {
  return (
    <div className="flex items-center gap-[12px]">
      <div 
        style={{ backgroundColor: logoColor }}
        className="w-[33px] h-[33px] rounded-[10px] shadow-sm flex-shrink-0 flex items-center justify-center text-white font-bold"
      >
        {logoIcon}
      </div>
      <div className="flex flex-col leading-none pt-[2px] gap-[3px]">
        <span className="text-[20px] font-extrabold text-[#000000] tracking-tight">{name}</span>
        <span className="text-[14px] font-medium text-[#808080] tracking-[-0.28px]">{plan}</span>
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
      className="flex items-center gap-[8px] h-[40px] px-[12px] rounded-[12px] border border-transparent transition-all cursor-pointer select-none bg-default-100"
    >
      <div className="text-[#71717A]">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6"></polyline>
          <polyline points="8 6 2 12 8 18"></polyline>
        </svg>
      </div>
      <span className="text-[14px] font-medium text-[#71717A]">
        Dev Mode
      </span>
      <HeroSwitch 
        size="sm" 
        isSelected={isChecked} 
        onValueChange={onChange}
        classNames={{
          wrapper: "group-data-[selected=true]:bg-[#4BB961]"
        }}
      />
    </div>
  );
};

export const Container: React.FC<ContainerProps> = ({ children }) => {
  return (
    <div className="max-w-7xl mx-auto p-6 animate-in fade-in duration-500">
      {children}
    </div>
  );
};

export const Header: React.FC<HeaderProps> = ({ children }) => {
  return (
    <div className="flex justify-between items-center mb-8">
      <AppBrand />
      <div className="flex gap-4 items-center">
        {children}
      </div>
    </div>
  );
};

type BasilicButtonProps = React.ComponentProps<typeof HeroButton> & {
  icon?: React.ReactNode;
};

// ... existing code ...

export const BasilicSearch: React.FC<React.ComponentProps<typeof HeroInput>> = (props) => {
  const [shortcutSymbol, setShortcutSymbol] = React.useState("Ctrl");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    setShortcutSymbol(isMac ? "⌘" : "Ctrl");

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl/Cmd + Shift + K
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <HeroInput
      ref={inputRef}
      classNames={{
        base: "max-w-full sm:max-w-[20rem] h-[40px]",
        mainWrapper: "h-full",
        input: "text-small",
        inputWrapper: "h-[40px] font-normal text-default-500 bg-default-100 dark:bg-default-50/20 rounded-[12px]",
      }}
      placeholder="Rechercher..."
      size="sm"
      startContent={
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-default-400 pointer-events-none flex-shrink-0">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.3-4.3"></path>
        </svg>
      }
      endContent={
        <div className="pointer-events-none flex items-center">
          <span className="text-default-400 text-tiny border border-default-200 bg-default-50 rounded-md px-1.5 py-0.5 font-sans font-medium whitespace-nowrap">{shortcutSymbol} ⇧ K</span>
        </div>
      }
      type="text"
      isClearable={false}
      {...props}
    />
  );
};

export const BasilicButton: React.FC<BasilicButtonProps> = ({ 
// ... existing BasilicButton code ...
  children, 
  icon, 
  className = "", 
  color = "primary",
  variant = "solid",
  ...props 
}) => {
  // Styles personnalisés pour correspondre au design Figma
  const isPrimarySolid = color === ("primary" as any) && variant === ("solid" as any);
  const customStyles = isPrimarySolid 
    ? "bg-[#4BB961] shadow-[0px_10px_15px_-3px_rgba(75,185,97,0.30),0px_4px_6px_-2px_rgba(75,185,97,0.05)] text-white border-none" 
    : "";

  return (
    <HeroButton
      className={`h-[40px] px-[16px] rounded-[12px] font-normal text-[14px] gap-[8px] transition-all hover:scale-[1.02] active:scale-[0.98] ${customStyles} ${className}`}
      startContent={icon}
      variant={variant as any}
      color={color as any}
      {...props}
    >
      {children}
    </HeroButton>
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
    <HeroModal 
      isOpen={isOpen} 
      onClose={onClose} 
      size={size as any} 
      backdrop="blur"
      classNames={{
        backdrop: "bg-[#292f46]/50 backdrop-opacity-40",
      }}
    >
      <ModalContent>
        {() => (
          <>
            {title && <ModalHeader className="flex flex-col gap-1">{title}</ModalHeader>}
            <ModalBody>
              {children}
            </ModalBody>
            {footer && (
              <ModalFooter>
                {footer}
              </ModalFooter>
            )}
          </>
        )}
      </ModalContent>
    </HeroModal>
  );
};
export const BasilicCard = HeroCard;
export const BasilicInput = HeroInput;
export const BasilicTabs = HeroTabs;
export const BasilicTab = HeroTab;
export const BasilicChip = HeroChip;

export const BasilicTable = ({ columns, items, renderCell }: { columns: any[], items: any[], renderCell: (item: any, columnKey: string) => React.ReactNode }) => {
  return (
    <HeroTable aria-label="Tableau de données" shadow="none" className="border border-divider rounded-xl overflow-hidden">
      <TableHeader columns={columns}>
        {(column) => (
          <TableColumn key={column.key} align={column.key === "actions" ? "center" : "start"} className="bg-default-50 text-default-600 font-semibold uppercase text-tiny">
            {column.label}
          </TableColumn>
        )}
      </TableHeader>
      <TableBody items={items} emptyContent={"Aucune donnée trouvée."}>
        {(item) => (
          <TableRow key={item.id} className="hover:bg-default-50 transition-colors border-b border-divider last:border-0">
            {(columnKey) => <TableCell>{renderCell(item, columnKey as string)}</TableCell>}
          </TableRow>
        )}
      </TableBody>
    </HeroTable>
  );
};


export const BasilicDropdown = ({ 
  triggerLabel = "Actions", 
  items = [],
  onAction
}: { 
  triggerLabel?: React.ReactNode;
  items: Array<{ key: string; label: string; color?: string; className?: string }>;
  onAction?: (key: React.Key) => void;
}) => {
  return (
    <HeroDropdown>
      <HeroDropdownTrigger>
        <HeroButton 
          variant="flat" 
          className="h-[40px] px-[16px] rounded-[12px] bg-default-100 text-default-900 font-medium capitalize gap-2"
          endContent={
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
                <path d="m6 9 6 6 6-6"/>
             </svg>
          }
        >
          {triggerLabel}
        </HeroButton>
      </HeroDropdownTrigger>
      <HeroDropdownMenu 
        aria-label="Dropdown Actions" 
        onAction={onAction}
        className="p-1"
        itemClasses={{
          base: "rounded-[8px] data-[hover=true]:bg-default-100 data-[hover=true]:text-default-900",
        }}
      >
        {items.map((item) => (
           <HeroDropdownItem 
             key={item.key} 
             className={item.className}
             color={item.color as any}
           >
             {item.label}
           </HeroDropdownItem>
        ))}
      </HeroDropdownMenu>
    </HeroDropdown>
  );
};

export const NavigationTabs = ({ activePath, counts, disableNavigation = false }: { activePath: string, counts: { mf: number, mo: number }, disableNavigation?: boolean }) => {
  const navigate = useNavigate();
  
  const tabs = [
    { key: "/app/mf", label: "Champs Méta", count: counts.mf, icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
    )},
    { key: "/app/mo", label: "Objets Méta", count: counts.mo, icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
    )},
    { key: "/app/templates", label: "Templates", icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
    )}
  ];

  return (
    <div className="bg-[#F4F4F5]/60 p-1.5 rounded-[20px] flex items-center gap-1 w-fit shadow-sm border border-[#E4E4E7]/50">
      {tabs.map((tab) => {
        const isActive = activePath === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => !disableNavigation && navigate(tab.key)}
            className={`
              relative flex items-center gap-2.5 px-4 h-10 rounded-[14px] transition-all duration-300 group
              ${isActive 
                ? 'bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)] text-[#18181B]' 
                : 'text-[#71717A] hover:text-[#18181B] hover:bg-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]'}
            `}
          >
            <span className={`transition-colors duration-300 ${isActive ? 'text-[#4BB961]' : 'text-[#A1A1AA] group-hover:text-[#4BB961]'}`}>
              {tab.icon}
            </span>
            <span className="text-[14px] font-semibold tracking-tight">{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`
                min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full text-[11px] font-bold transition-all duration-300
                ${isActive ? 'bg-[#4BB961] text-white scale-110' : 'bg-[#E4E4E7] text-[#71717A] group-hover:bg-[#4BB961] group-hover:text-white'}
              `}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
