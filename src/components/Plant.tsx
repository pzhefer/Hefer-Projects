import { useState } from 'react';
import { Factory, LayoutDashboard } from 'lucide-react';
import { EmptyState, ModuleSidebar, MobileHeader } from './shared/UIComponents';

export default function Plant() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'equipment', name: 'Equipment', icon: Factory },
  ];

  return (
    <div className="flex h-full">
      <ModuleSidebar
        navigation={navigation}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        expanded={sidebarExpanded}
        onExpandedChange={setSidebarExpanded}
        mobileOpen={mobileSidebarOpen}
        onMobileOpenChange={setMobileSidebarOpen}
        theme="orange"
      />

      <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
        <MobileHeader
          title="Plant Management"
          icon={Factory}
          onMenuClick={() => setMobileSidebarOpen(true)}
        />

        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="hidden lg:block mb-4 lg:mb-6">
            <h2 className="text-xl lg:text-2xl font-bold text-gray-900">Plant Management</h2>
            <p className="text-sm lg:text-base text-gray-600 mt-1">Track machinery, equipment, and maintenance schedules</p>
          </div>

          <EmptyState
            icon={Factory}
            title="Coming Soon"
            description="The Plant Management module is currently under development. Check back soon for equipment tracking and maintenance features."
          />
        </div>
      </div>
    </div>
  );
}
