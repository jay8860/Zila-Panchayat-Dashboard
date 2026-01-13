import React, { createContext, useContext, useState, useEffect } from 'react';
import { SCHEMES as DEFAULT_SCHEMES, NODAL_OFFICERS as DEFAULT_OFFICERS, SHEET_URLS as DEFAULT_URLS } from '../data/config';

const ConfigContext = createContext();

export const useConfig = () => useContext(ConfigContext);

export const ConfigProvider = ({ children }) => {
    // Load from localStorage or fall back to defaults
    const [schemes, setSchemes] = useState(() => {
        const stored = localStorage.getItem('zp_schemes');
        return stored ? JSON.parse(stored) : DEFAULT_SCHEMES;
    });

    const [nodalOfficers, setNodalOfficers] = useState(() => {
        const stored = localStorage.getItem('zp_officers');
        return stored ? JSON.parse(stored) : DEFAULT_OFFICERS;
    });

    const [sheetUrls, setSheetUrls] = useState(() => {
        const stored = localStorage.getItem('zp_urls');
        return stored ? JSON.parse(stored) : DEFAULT_URLS;
    });

    // New: Scheme Groups Layout
    const [schemeGroups, setSchemeGroups] = useState(() => {
        const stored = localStorage.getItem('zp_scheme_groups');
        if (stored) return JSON.parse(stored);

        // Default migration: All current schemes in one "General" group
        // If schemes is from default, we might have default groups logic, but here we just lump them.
        return [{
            id: 'default_group',
            title: 'General Schemes',
            schemes: [] // Will be populated in effect if empty to ensure sync
        }];
    });

    // Sync helper: If schemes exist but aren't in any group, add them to first group
    useEffect(() => {
        setSchemeGroups(prevGroups => {
            const allGroupedSchemes = new Set(prevGroups.flatMap(g => g.schemes));
            const orphaned = schemes.filter(s => !allGroupedSchemes.has(s));

            if (orphaned.length > 0) {
                const newGroups = [...prevGroups];
                // Ensure at least one group exists
                if (newGroups.length === 0) {
                    newGroups.push({ id: 'default_group', title: 'General Schemes', schemes: [] });
                }
                newGroups[0].schemes = [...newGroups[0].schemes, ...orphaned];
                return newGroups;
            }
            return prevGroups;
        });
    }, [schemes]); // Run when schemes list changes

    // Persistence Effects
    useEffect(() => {
        localStorage.setItem('zp_schemes', JSON.stringify(schemes));
    }, [schemes]);

    useEffect(() => {
        localStorage.setItem('zp_officers', JSON.stringify(nodalOfficers));
    }, [nodalOfficers]);

    useEffect(() => {
        localStorage.setItem('zp_urls', JSON.stringify(sheetUrls));
    }, [sheetUrls]);

    useEffect(() => {
        localStorage.setItem('zp_scheme_groups', JSON.stringify(schemeGroups));
    }, [schemeGroups]);


    // Actions
    const addScheme = (name) => {
        if (!schemes.includes(name)) {
            setSchemes(prev => [...prev, name]);
            // Initialize config
            setSheetUrls(prev => ({ ...prev, [name]: "" }));
            setNodalOfficers(prev => ({ ...prev, [name]: { name: "Assign Officer", designation: "N/A" } }));
            // It will be added to group by the Effect
            return true;
        }
        return false;
    };

    const updateSchemeUrl = (scheme, url) => {
        setSheetUrls(prev => ({ ...prev, [scheme]: url }));
    };

    const updateOfficer = (scheme, { name, designation }) => {
        setNodalOfficers(prev => ({
            ...prev,
            [scheme]: { name, designation }
        }));
    };

    const deleteScheme = (scheme) => {
        setSchemes(prev => prev.filter(s => s !== scheme));

        const newUrls = { ...sheetUrls };
        delete newUrls[scheme];
        setSheetUrls(newUrls);

        const newOfficers = { ...nodalOfficers };
        delete newOfficers[scheme];
        setNodalOfficers(newOfficers);

        // Remove from groups
        setSchemeGroups(prev => prev.map(g => ({
            ...g,
            schemes: g.schemes.filter(s => s !== scheme)
        })));
    };

    // --- New Grouping & Renaming Actions ---

    const renameScheme = (oldName, newName) => {
        if (schemes.includes(newName)) {
            alert(`Scheme name "${newName}" already exists.`);
            return;
        }

        // 1. Update Schemes List
        setSchemes(prev => prev.map(s => s === oldName ? newName : s));

        // 2. Update Urls Dictionary Key
        setSheetUrls(prev => {
            const next = { ...prev };
            next[newName] = next[oldName];
            delete next[oldName];
            return next;
        });

        // 3. Update Officers Dictionary Key
        setNodalOfficers(prev => {
            const next = { ...prev };
            next[newName] = next[oldName];
            delete next[oldName];
            return next;
        });

        // 4. Update Groups
        setSchemeGroups(prev => prev.map(g => ({
            ...g,
            schemes: g.schemes.map(s => s === oldName ? newName : s)
        })));
    };

    const addGroup = (title) => {
        const id = `group_${Date.now()}`;
        setSchemeGroups(prev => [...prev, { id, title, schemes: [] }]);
    };

    const deleteGroup = (groupId) => {
        setSchemeGroups(prev => {
            const groupToDelete = prev.find(g => g.id === groupId);
            const remainingGroups = prev.filter(g => g.id !== groupId);

            if (!groupToDelete) return prev; // Should not happen

            // If we are deleting the last group, create a default one or just return empty (Effect will handle orphans)
            // But let's verify logic:
            // If deleting, schemes become orphaned. The Effect [schemes] will pick them up and add to first available.
            return remainingGroups;
        });
    };

    const updateGroup = (groupId, { title, schemes: newSchemes }) => {
        setSchemeGroups(prev => prev.map(g => {
            if (g.id !== groupId) return g;
            return {
                ...g,
                title: title ?? g.title,
                schemes: newSchemes ?? g.schemes
            };
        }));
    };

    // Low-level helper or direct setter
    const setGroups = (newGroups) => {
        setSchemeGroups(newGroups);
    }

    return (
        <ConfigContext.Provider value={{
            schemes,
            nodalOfficers,
            sheetUrls,
            schemeGroups,
            addScheme,
            updateSchemeUrl,
            updateOfficer,
            deleteScheme,
            // New
            renameScheme,
            addGroup,
            deleteGroup,
            updateGroup,
            setGroups
        }}>
            {children}
        </ConfigContext.Provider>
    );
};
