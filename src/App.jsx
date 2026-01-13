import React, { useState } from 'react';
import Sidebar from './components/Layout/Sidebar';
import { DashboardProvider, useDashboard } from './context/DashboardContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ConfigProvider, useConfig } from './context/ConfigContext';
import SchemeCard from './components/Dashboard/SchemeGrid';
import BlockPerformanceChart from './components/Dashboard/BlockPerformanceChart';
import GPTable from './components/Dashboard/GPTable';
import ActionHub from './components/ActionHub/ActionHub';
import AdminPanel from './components/Admin/AdminPanel';
import Login from './components/Auth/Login';
import ErrorBoundary from './components/ErrorBoundary';

const DashboardView = ({ onOpenSettings, onOpenBriefing }) => {
  const { schemes, loading } = useDashboard();

  const [viewState, setViewState] = useState({
    level: 'DISTRICT',
    scheme: null,
    block: null
  });

  const handleSchemeClick = (scheme) => {
    setViewState({ level: 'BLOCK', scheme, block: null });
  };

  const handleBlockClick = (block) => {
    setViewState(prev => ({ ...prev, level: 'GP', block }));
  };

  const handleBack = () => {
    if (viewState.level === 'GP') {
      setViewState(prev => ({ ...prev, level: 'BLOCK', block: null }));
    } else if (viewState.level === 'BLOCK') {
      setViewState({ level: 'DISTRICT', scheme: null, block: null });
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  );

  if (viewState.level === 'GP') {
    return (
      <GPTable
        scheme={viewState.scheme}
        block={viewState.block}
        onBack={handleBack}
      />
    );
  }

  const { setBriefingScheme } = useDashboard();
  const { schemeGroups: groups } = useConfig();

  if (viewState.level === 'BLOCK') {
    return (
      <BlockPerformanceChart
        scheme={viewState.scheme}
        onBack={handleBack}
        onBlockClick={handleBlockClick}
      />
    );
  }

  const handleOpenBriefing = (scheme) => {
    setBriefingScheme(scheme);
    if (onOpenBriefing) onOpenBriefing();
  };

  // Helper to render groups
  const renderGroups = () => {
    // If somehow schemeGroups is unavailable (legacy), fallback to flat list
    if (!groups || groups.length === 0) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {schemes.map(scheme => (
            <SchemeCard
              key={scheme}
              scheme={scheme}
              onClick={() => handleSchemeClick(scheme)}
              onEdit={() => onOpenSettings(scheme)}
              onBriefing={() => handleOpenBriefing(scheme)}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-10">
        {groups.map(group => {
          if (group.schemes.length === 0) return null;

          return (
            <div key={group.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Only show header if customizable or multiple groups exist */}
              {(groups.length > 1 || group.title !== 'General Schemes') && (
                <h3 className="text-xl font-semibold text-primary mb-4 pb-2 border-b border-white/5 inline-block pr-6">
                  {group.title}
                </h3>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {group.schemes.map(scheme => (
                  <SchemeCard
                    key={scheme}
                    scheme={scheme}
                    onClick={() => handleSchemeClick(scheme)}
                    // Pass group context if needed, but simple click is enough
                    onEdit={() => onOpenSettings(scheme)}
                    onBriefing={() => handleOpenBriefing(scheme)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-8">
      <header className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight">District Dashboard</h2>
        <p className="text-muted-foreground mt-2">
          Monitor scheme performance across all blocks and Gram Panchayats.
        </p>
      </header>

      {renderGroups()}
    </div>
  );
};

const AuthenticatedApp = () => {
  const { isAuthenticated, checking } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (checking) return null;

  if (!isAuthenticated) {
    return <Login />;
  }

  const handleOpenSettings = (schemeName) => {
    // Navigate to Admin/Settings
    setActiveTab('settings');
    // Ideally we'd pass the schemeName to prompt the specific tab, but for now just opening Settings is MVP.
  };

  return (
    <ConfigProvider>
      <DashboardProvider>
        <div className="min-h-screen bg-background text-foreground flex font-sans">
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
          <main className="flex-1 ml-64 bg-background/50 relative overflow-y-auto h-screen">
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:20px_20px] pointer-events-none" />
            <ErrorBoundary>
              {activeTab === 'dashboard' && (
                <DashboardView
                  onOpenSettings={handleOpenSettings}
                  onOpenBriefing={() => setActiveTab('action-hub')}
                />
              )}
              {activeTab === 'action-hub' && <ActionHub />}
              {activeTab === 'settings' && <AdminPanel />}
            </ErrorBoundary>
          </main>
        </div>
      </DashboardProvider>
    </ConfigProvider>
  );
};

import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
