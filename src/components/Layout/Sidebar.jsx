import { useTheme } from '../../context/ThemeContext';
import {
    LayoutDashboard,
    MessageSquareShare,
    PlusCircle,
    Settings,
    Database,
    RefreshCcw,
    LogOut,
    CheckCircle,
    AlertTriangle,
    Sun,
    Sun,
    Moon,
    Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDashboard } from '../../context/DashboardContext';

const Sidebar = ({ activeTab, setActiveTab, onOpenAi }) => {
    const { logout, userRole } = useAuth();
    const { syncData, syncStatus } = useDashboard();
    const { theme, toggleTheme } = useTheme();

    const menuItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { id: 'action-hub', icon: MessageSquareShare, label: 'Action Hub' },
        { id: 'settings', icon: Settings, label: 'Admin Settings', role: 'admin' },
    ].filter(item => !item.role || item.role === userRole);

    const getSyncIcon = () => {
        switch (syncStatus.state) {
            case 'SYNCING': return <RefreshCcw className="animate-spin text-blue-400" size={16} />;
            case 'SUCCESS': return <CheckCircle className="text-emerald-400" size={16} />;
            case 'ERROR': return <AlertTriangle className="text-red-400" size={16} />;
            default: return <Database size={16} />;
        }
    };

    const getLastSyncedText = () => {
        if (!syncStatus.lastSynced) return "Never";
        return syncStatus.lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <aside className="w-64 bg-card border-r border-border h-screen fixed left-0 top-0 flex flex-col pt-6 pb-6 shadow-2xl z-20">
            <div className="px-6 mb-10 flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
                        Zila Panchayat
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1 tracking-wider uppercase">Monitoring System</p>
                </div>
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
            </div>

            <nav className="flex-1 px-4 space-y-2">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                ? 'bg-primary/10 text-primary font-medium shadow-sm'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                        >
                            <Icon size={20} className={isActive ? 'text-primary' : 'group-hover:text-foreground'} />
                            <span>{item.label}</span>
                        </button>
                    );
                })}

                {/* AI Assistant Button */}
                <button
                    onClick={onOpenAi}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-500 mt-4"
                >
                    <Sparkles size={20} />
                    <span className="font-medium">Ask AI Assistant</span>
                </button>
            </nav>

            {/* Sync Control */}
            <div className="px-4 mb-4">
                <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold uppercase text-muted-foreground">Data Sync</span>
                        {getSyncIcon()}
                    </div>

                    <div className="text-xs text-muted-foreground mb-3">
                        Last: <span className="text-foreground font-medium">{getLastSyncedText()}</span>
                    </div>

                    <button
                        onClick={syncData}
                        disabled={syncStatus.state === 'SYNCING'}
                        className="w-full text-xs bg-card hover:bg-muted border border-border text-foreground py-2 rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                        <span>{syncStatus.state === 'SYNCING' ? 'Syncing...' : 'Sync Now'}</span>
                    </button>

                    <div className="text-[10px] text-muted-foreground text-center mt-2">
                        Auto-sync: 10:30 AM
                    </div>
                </div>
            </div>

            <div className="px-4 mt-auto">
                <button
                    onClick={logout}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
                >
                    <LogOut size={20} />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
