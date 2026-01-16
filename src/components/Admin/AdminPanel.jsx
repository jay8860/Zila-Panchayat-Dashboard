import React, { useState } from 'react';
import { useConfig } from '../../context/ConfigContext';
import { Save, User, Link as LinkIcon, Plus, Trash2, Layout, Edit3, ArrowUp, ArrowDown, Move, Eye, EyeOff } from 'lucide-react';

const AdminPanel = () => {
    const {
        schemes, nodalOfficers, sheetUrls, schemeGroups, hiddenSchemes,
        updateSchemeUrl, updateOfficer, addScheme, deleteScheme,
        renameScheme, addGroup, deleteGroup, updateGroup, moveSchemeGroup, toggleSchemeVisibility, setGroups
    } = useConfig();

    const [activeTab, setActiveTab] = useState('urls'); // urls, officers, schemes
    const [newSchemeName, setNewSchemeName] = useState('');

    // Group Management State
    const [newGroupName, setNewGroupName] = useState('');
    const [editingScheme, setEditingScheme] = useState(null); // schemeName
    const [renameValue, setRenameValue] = useState('');

    const handleAddScheme = (e) => {
        e.preventDefault();
        if (newSchemeName.trim()) {
            addScheme(newSchemeName.trim());
            setNewSchemeName('');
        }
    };

    const handleAddGroup = (e) => {
        e.preventDefault();
        if (newGroupName.trim()) {
            addGroup(newGroupName.trim());
            setNewGroupName('');
        }
    };

    const handleStartRename = (scheme) => {
        setEditingScheme(scheme);
        setRenameValue(scheme);
    };

    const handleFinishRename = (oldName) => {
        if (renameValue.trim() && renameValue.trim() !== oldName) {
            renameScheme(oldName, renameValue.trim());
        }
        setEditingScheme(null);
    };

    const moveScheme = (scheme, fromGroupId, toGroupId) => {
        if (fromGroupId === toGroupId) return;
        moveSchemeGroup(scheme, fromGroupId, toGroupId);
    };

    const moveSchemeOrder = (groupId, currentIndex, direction) => {
        const group = schemeGroups.find(g => g.id === groupId);
        if (!group) return;

        const newSchemes = [...group.schemes];
        const targetIndex = currentIndex + direction;

        if (targetIndex < 0 || targetIndex >= newSchemes.length) return;

        [newSchemes[currentIndex], newSchemes[targetIndex]] = [newSchemes[targetIndex], newSchemes[currentIndex]];
        updateGroup(groupId, { schemes: newSchemes });
    };

    const moveGroupOrder = (index, direction) => {
        const newGroups = [...schemeGroups];
        const targetIndex = index + direction;

        if (targetIndex < 0 || targetIndex >= newGroups.length) return;

        [newGroups[index], newGroups[targetIndex]] = [newGroups[targetIndex], newGroups[index]];
        setGroups(newGroups);
    }


    return (
        <div className="p-8 max-w-6xl mx-auto">
            <header className="mb-8 flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Admin Settings</h2>
                    <p className="text-muted-foreground mt-2">
                        Configure schemes, layout, and nodal officers. Changes are saved automatically.
                    </p>
                </div>
                {/* Simple Status Indicator */}
                <div className="bg-muted px-4 py-2 rounded-lg text-sm border border-border">
                    <span className="text-muted-foreground mr-2">System Status:</span>
                    <span className="font-medium text-emerald-400">Active</span>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex space-x-4 mb-8 border-b border-border pb-1">
                <button
                    onClick={() => setActiveTab('urls')}
                    className={`flex items-center space-x-2 px-4 py-2 border-b-2 transition-colors ${activeTab === 'urls' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                    <LinkIcon size={18} />
                    <span>Data Sources</span>
                </button>
                <button
                    onClick={() => setActiveTab('officers')}
                    className={`flex items-center space-x-2 px-4 py-2 border-b-2 transition-colors ${activeTab === 'officers' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                    <User size={18} />
                    <span>Nodal Officers</span>
                </button>
                <button
                    onClick={() => setActiveTab('schemes')}
                    className={`flex items-center space-x-2 px-4 py-2 border-b-2 transition-colors ${activeTab === 'schemes' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                    <Layout size={18} />
                    <span>Layout & Schemes</span>
                </button>
            </div>

            {/* URL Management */}
            {activeTab === 'urls' && (
                <div className="grid gap-6">
                    {schemes.map(scheme => (
                        <div key={scheme} className="bg-card border border-border p-6 rounded-xl shadow-sm">
                            <h3 className="font-semibold text-lg mb-4 text-emerald-400">{scheme}</h3>
                            <div className="flex flex-col space-y-2">
                                <label className="text-xs font-medium text-muted-foreground uppercase">Google Sheet Published CSV URL</label>
                                <div className="flex space-x-2">
                                    <input
                                        type="text"
                                        value={sheetUrls[scheme] || ''}
                                        onChange={(e) => updateSchemeUrl(scheme, e.target.value)}
                                        placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
                                        className="flex-1 bg-muted/50 border border-border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Officer Management */}
            {activeTab === 'officers' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {schemes.map(scheme => (
                        <div key={scheme} className="bg-card border border-border p-6 rounded-xl shadow-sm">
                            <h3 className="font-semibold text-lg mb-4 text-blue-400">{scheme}</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground block mb-1">Officer Name</label>
                                    <input
                                        type="text"
                                        value={nodalOfficers[scheme]?.name || ''}
                                        onChange={(e) => updateOfficer(scheme, { ...nodalOfficers[scheme], name: e.target.value })}
                                        className="w-full bg-muted/50 border border-border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground block mb-1">Designation</label>
                                    <input
                                        type="text"
                                        value={nodalOfficers[scheme]?.designation || ''}
                                        onChange={(e) => updateOfficer(scheme, { ...nodalOfficers[scheme], designation: e.target.value })}
                                        className="w-full bg-muted/50 border border-border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Layout & Scheme Management */}
            {activeTab === 'schemes' && (
                <div className="space-y-8">
                    {/* 1. Add New Scheme */}
                    <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
                        <h3 className="font-semibold text-lg mb-4 text-primary">1. Create New Scheme Card</h3>
                        <form onSubmit={handleAddScheme} className="flex space-x-4">
                            <input
                                type="text"
                                value={newSchemeName}
                                onChange={(e) => setNewSchemeName(e.target.value)}
                                placeholder="Enter Scheme Name..."
                                className="flex-1 bg-muted/50 border border-border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                            <button
                                type="submit"
                                className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                            >
                                Add Scheme
                            </button>
                        </form>
                    </div>

                    {/* 2. Group Management (Layout) */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-lg text-primary">2. Dashboard Layout (Groups)</h3>
                            <form onSubmit={handleAddGroup} className="flex space-x-2">
                                <input
                                    type="text"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    placeholder="New Group Title..."
                                    className="bg-card border border-border rounded-lg px-3 py-1 text-sm focus:outline-none w-48"
                                />
                                <button type="submit" className="text-xs bg-muted hover:bg-primary hover:text-primary-foreground px-3 py-1 rounded transition-colors">
                                    + Add Group
                                </button>
                            </form>
                        </div>

                        <div className="grid gap-6">
                            {schemeGroups.map((group, gIdx) => (
                                <div key={group.id} className="bg-card/50 border border-border rounded-xl p-4">
                                    {/* Group Header */}
                                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/50">
                                        <div className="flex items-center gap-2">
                                            <input
                                                value={group.title}
                                                onChange={(e) => updateGroup(group.id, { title: e.target.value })}
                                                className="bg-transparent font-bold text-lg focus:outline-none focus:border-b border-primary text-foreground"
                                            />
                                            <span className="text-xs text-muted-foreground">({group.schemes.length} items)</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => moveGroupOrder(gIdx, -1)} disabled={gIdx === 0} className="p-1 hover:bg-muted rounded disabled:opacity-30"><ArrowUp size={14} /></button>
                                            <button onClick={() => moveGroupOrder(gIdx, 1)} disabled={gIdx === schemeGroups.length - 1} className="p-1 hover:bg-muted rounded disabled:opacity-30"><ArrowDown size={14} /></button>
                                            <button
                                                onClick={() => {
                                                    if (window.confirm(`Delete group "${group.title}"? Schemes will be moved to another group.`)) deleteGroup(group.id);
                                                }}
                                                className="p-1 hover:bg-red-500/10 text-red-400 rounded ml-2"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Schemes in Group */}
                                    <div className="space-y-2 pl-4 border-l-2 border-border/30">
                                        {group.schemes.length === 0 && <p className="text-xs text-muted-foreground italic">No schemes in this group.</p>}
                                        {group.schemes.map((scheme, sIdx) => (
                                            <div key={scheme} className="flex items-center justify-between p-2 bg-background rounded border border-border/50 hover:border-primary/30 transition-colors group">
                                                {/* Name / Rename Input */}
                                                <div className="flex items-center gap-3 flex-1">
                                                    {editingScheme === scheme ? (
                                                        <input
                                                            autoFocus
                                                            value={renameValue}
                                                            onChange={(e) => setRenameValue(e.target.value)}
                                                            onBlur={() => handleFinishRename(scheme)}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleFinishRename(scheme)}
                                                            className="bg-muted px-2 py-1 rounded text-sm w-full focus:outline-none border border-primary"
                                                        />
                                                    ) : (
                                                        <span className={`text-sm font-medium ${hiddenSchemes.includes(scheme) ? 'text-muted-foreground line-through decoration-muted-foreground/50' : ''}`}>
                                                            {scheme}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Controls */}
                                                <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                                    {editingScheme !== scheme && (
                                                        <button onClick={() => handleStartRename(scheme)} title="Rename" className="p-1 hover:text-primary">
                                                            <Edit3 size={14} />
                                                        </button>
                                                    )}

                                                    {/* Move to Group */}
                                                    <select
                                                        className="bg-muted text-xs rounded px-1 py-0.5 border-none outline-none w-24 truncate"
                                                        value={group.id}
                                                        onChange={(e) => moveScheme(scheme, group.id, e.target.value)}
                                                    >
                                                        {schemeGroups.map(targetG => (
                                                            <option key={targetG.id} value={targetG.id}>{targetG.title}</option>
                                                        ))}
                                                    </select>

                                                    {/* Order */}
                                                    <div className="flex flex-col">
                                                        <button onClick={() => moveSchemeOrder(group.id, sIdx, -1)} disabled={sIdx === 0}><ArrowUp size={10} /></button>
                                                        <button onClick={() => moveSchemeOrder(group.id, sIdx, 1)} disabled={sIdx === group.schemes.length - 1}><ArrowDown size={10} /></button>
                                                    </div>

                                                    <button
                                                        onClick={() => toggleSchemeVisibility(scheme)}
                                                        className={`p-1 ml-2 rounded transition-colors ${hiddenSchemes.includes(scheme) ? 'text-muted-foreground bg-muted' : 'text-emerald-400 hover:bg-emerald-400/10'}`}
                                                        title={hiddenSchemes.includes(scheme) ? "Show Scheme" : "Hide Scheme"}
                                                    >
                                                        {hiddenSchemes.includes(scheme) ? <EyeOff size={14} /> : <Eye size={14} />}
                                                    </button>

                                                    <button
                                                        onClick={() => { if (window.confirm(`Delete ${scheme}?`)) deleteScheme(scheme); }}
                                                        className="text-red-400 hover:text-red-500 ml-1"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;
