import { LucideIcon } from 'lucide-react';
import { Menu, Search } from 'lucide-react';
import { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <Icon className="mx-auto text-gray-400 mb-4" size={64} />
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

interface NavigationItem {
  id: string;
  name: string;
  icon: LucideIcon;
}

interface ModuleSidebarProps {
  navigation: NavigationItem[];
  activeSection: string;
  onSectionChange: (section: string) => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  theme?: 'slate' | 'indigo' | 'green' | 'blue' | 'emerald';
}

export function ModuleSidebar({
  navigation,
  activeSection,
  onSectionChange,
  expanded,
  onExpandedChange,
  mobileOpen,
  onMobileOpenChange,
  theme = 'slate'
}: ModuleSidebarProps) {
  const themeColors = {
    slate: {
      bg: 'bg-slate-800',
      hover: 'hover:bg-slate-700',
      active: 'bg-slate-700 border-l-4 border-blue-500',
      text: 'text-slate-300',
      textActive: 'text-white'
    },
    indigo: {
      bg: 'bg-indigo-800',
      hover: 'hover:bg-indigo-700',
      active: 'bg-indigo-700 border-l-4 border-blue-400',
      text: 'text-indigo-300',
      textActive: 'text-white'
    },
    green: {
      bg: 'bg-green-800',
      hover: 'hover:bg-green-700',
      active: 'bg-green-700 border-l-4 border-blue-400',
      text: 'text-green-300',
      textActive: 'text-white'
    },
    blue: {
      bg: 'bg-blue-800',
      hover: 'hover:bg-blue-700',
      active: 'bg-blue-700 border-l-4 border-blue-400',
      text: 'text-blue-300',
      textActive: 'text-white'
    },
    emerald: {
      bg: 'bg-emerald-800',
      hover: 'hover:bg-emerald-700',
      active: 'bg-emerald-700 border-l-4 border-blue-400',
      text: 'text-emerald-300',
      textActive: 'text-white'
    }
  };

  const colors = themeColors[theme];

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => onMobileOpenChange(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        onMouseEnter={() => onExpandedChange(true)}
        onMouseLeave={() => onExpandedChange(false)}
        className={`${colors.bg} text-white ${
          expanded ? 'w-64' : 'w-20'
        } transition-all duration-300 flex-shrink-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:relative h-full z-40`}
      >
        <nav className="py-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSectionChange(item.id);
                  onMobileOpenChange(false);
                }}
                className={`w-full flex items-center px-4 py-3 ${
                  isActive
                    ? colors.active
                    : `${colors.text} ${colors.hover} ${colors.textActive}`
                } transition-colors`}
              >
                <Icon size={20} className="flex-shrink-0" />
                {expanded && <span className="ml-3 font-medium">{item.name}</span>}
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

interface MobileHeaderProps {
  title: string;
  icon: LucideIcon;
  onMenuClick: () => void;
}

export function MobileHeader({ title, icon: Icon, onMenuClick }: MobileHeaderProps) {
  return (
    <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <button
        onClick={onMenuClick}
        className="p-2 rounded-lg hover:bg-gray-100"
      >
        <Menu size={20} />
      </button>
      <div className="flex items-center gap-2">
        <Icon size={20} className="text-gray-600" />
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      </div>
      <div className="w-10"></div>
    </div>
  );
}

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  iconColor?: string;
  valueColor?: string;
}

export function StatCard({ icon: Icon, label, value, subtitle, color, iconColor, valueColor }: StatCardProps) {
  const finalIconColor = iconColor || color || 'text-gray-400';
  const finalValueColor = valueColor || 'text-gray-900';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 lg:p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs lg:text-sm text-gray-600 truncate">{label}</p>
          <p className={`text-xl lg:text-2xl font-bold ${finalValueColor} mt-1`}>{value}</p>
          {subtitle && (
            <p className="text-[10px] lg:text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
        <Icon className={`${finalIconColor} flex-shrink-0`} size={20} />
      </div>
    </div>
  );
}

interface ButtonProps {
  onClick?: () => void;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: LucideIcon;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export function Button({
  onClick,
  children,
  variant = 'primary',
  icon: Icon,
  type = 'button',
  className = ''
}: ButtonProps) {
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    danger: 'bg-red-600 text-white hover:bg-red-700'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={`flex items-center gap-1 lg:gap-2 px-3 lg:px-4 py-2 rounded-lg transition-colors text-sm lg:text-base ${variantClasses[variant]} ${className}`}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
}

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder = 'Search...' }: SearchInputProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
}

interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message = 'Loading...' }: LoadingSpinnerProps = {}) {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">{message}</p>
      </div>
    </div>
  );
}
