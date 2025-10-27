import { useState } from 'react';
import { FolderKanban, Shapes } from 'lucide-react';
import ProjectTypeManager from './ProjectTypeManager';
import DrawingSymbolsManager from './DrawingSymbolsManager';

type ProjectSettingsTab = 'types' | 'symbols';

export default function ProjectSettings() {
  const [activeTab, setActiveTab] = useState<ProjectSettingsTab>('types');

  const tabs = [
    {
      id: 'types' as ProjectSettingsTab,
      label: 'Project Types',
      icon: FolderKanban,
      description: 'Manage project types and subtypes',
    },
    {
      id: 'symbols' as ProjectSettingsTab,
      label: 'Drawing Symbols',
      icon: Shapes,
      description: 'Manage construction symbols for drawings',
    },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Tabs Header */}
      <div className="border-b border-gray-200 bg-gray-50">
        <nav className="flex -mb-px">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Icon size={18} />
                <div className="text-left">
                  <div>{tab.label}</div>
                  <div className={`text-xs font-normal ${isActive ? 'text-blue-500' : 'text-gray-500'}`}>
                    {tab.description}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'types' && <ProjectTypeManager />}
        {activeTab === 'symbols' && <DrawingSymbolsManager />}
      </div>
    </div>
  );
}
