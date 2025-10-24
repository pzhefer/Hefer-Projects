import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Home from './components/Home';
import Dashboard from './components/Dashboard';
import Projects from './components/Projects';
import Tasks from './components/Tasks';
import Drawings from './components/Drawings';
import Photos from './components/Photos';
import Users from './components/Users';
import Settings from './components/Settings';
import Profile from './components/Profile';
import Login from './components/Login';
import Register from './components/Register';
import Plant from './components/Plant';
import Stock from './components/Stock';
import Employees from './components/Employees';

function AppContent() {
  useEffect(() => {
    console.log('App mounted successfully');
    console.log('Environment check:', {
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL ? 'present' : 'MISSING',
      supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'present' : 'MISSING'
    });
  }, []);

  const { user, loading } = useAuth();
  const [currentModule, setCurrentModule] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [globalSelectedProjects, setGlobalSelectedProjects] = useState<string[]>([]);
  const [globalSelectedStatuses, setGlobalSelectedStatuses] = useState<string[]>(['active']);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (authMode === 'login') {
      return <Login onSwitchToRegister={() => setAuthMode('register')} />;
    }
    return <Register onSwitchToLogin={() => setAuthMode('login')} />;
  }

  if (!currentModule) {
    return <Home onSelectModule={setCurrentModule} />;
  }

  if (currentModule === 'settings') {
    return (
      <Layout
        currentPage="settings"
        currentModule={currentModule}
        onNavigate={setCurrentPage}
        onBackToHome={() => setCurrentModule(null)}
        onModuleChange={setCurrentModule}
        onGlobalFilterChange={() => {}}
      >
        <Settings />
      </Layout>
    );
  }

  if (currentModule === 'plant') {
    return (
      <Layout
        currentPage="plant"
        currentModule={currentModule}
        onNavigate={setCurrentPage}
        onBackToHome={() => setCurrentModule(null)}
        onModuleChange={setCurrentModule}
        onGlobalFilterChange={() => {}}
      >
        <Plant />
      </Layout>
    );
  }

  if (currentModule === 'stock') {
    return (
      <Layout
        currentPage="stock"
        currentModule={currentModule}
        onNavigate={setCurrentPage}
        onBackToHome={() => setCurrentModule(null)}
        onModuleChange={setCurrentModule}
        onGlobalFilterChange={() => {}}
      >
        <Stock />
      </Layout>
    );
  }

  if (currentModule === 'employees') {
    return (
      <Layout
        currentPage="employees"
        currentModule={currentModule}
        onNavigate={setCurrentPage}
        onBackToHome={() => setCurrentModule(null)}
        onModuleChange={setCurrentModule}
        onGlobalFilterChange={() => {}}
      >
        <Employees />
      </Layout>
    );
  }

  const handleGlobalFilterChange = (projects: string[], statuses: string[]) => {
    setGlobalSelectedProjects(projects);
    setGlobalSelectedStatuses(statuses);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'projects':
        return <Projects />;
      case 'tasks':
        return <Tasks />;
      case 'drawings':
        return <Drawings
          globalSelectedProjects={globalSelectedProjects}
          globalSelectedStatuses={globalSelectedStatuses}
        />;
      case 'photos':
        return <Photos
          globalSelectedProjects={globalSelectedProjects}
          globalSelectedStatuses={globalSelectedStatuses}
        />;
      case 'team':
        return <Users />;
      case 'profile':
        return <Profile />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout
      currentPage={currentPage}
      currentModule={currentModule}
      onNavigate={setCurrentPage}
      onBackToHome={() => setCurrentModule(null)}
      onModuleChange={setCurrentModule}
      onGlobalFilterChange={handleGlobalFilterChange}
    >
      {renderPage()}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
