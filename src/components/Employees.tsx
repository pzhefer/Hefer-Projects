import { useState } from 'react';
import { Users, LayoutDashboard, UserCircle } from 'lucide-react';
import { EmptyState, ModuleSidebar, MobileHeader } from './shared/UIComponents';

export default function Employees() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'employees', name: 'Employees', icon: Users },
    { id: 'attendance', name: 'Attendance', icon: UserCircle },
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
        theme="indigo"
      />

      <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
        <MobileHeader
          title="Employee Management"
          icon={Users}
          onMenuClick={() => setMobileSidebarOpen(true)}
        />

        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="hidden lg:block mb-4 lg:mb-6">
            <h2 className="text-xl lg:text-2xl font-bold text-gray-900">Employee Management</h2>
            <p className="text-sm lg:text-base text-gray-600 mt-1">Manage team members, attendance, and HR functions</p>
          </div>

          <EmptyState
            icon={Users}
            title="Coming Soon"
            description="The Employee Management module is currently under development. Check back soon for comprehensive HR and workforce management features."
          />
        </div>
      </div>
    </div>
  );
}
