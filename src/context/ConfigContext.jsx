import React, { createContext, useContext, useState, useEffect } from 'react';
import { SCHEMES as DEFAULT_SCHEMES, NODAL_OFFICERS as DEFAULT_OFFICERS, SHEET_URLS as DEFAULT_URLS } from '../data/config';

const ConfigContext = createContext();

export const useConfig = () => useContext(ConfigContext);

const API_URL = import.meta.env.PROD ? "/api" : "http://localhost:8000/api";

export const ConfigProvider = ({ children }) => {
    // Initial State (Empty or Default, will be overwritten by fetch)
    const [schemes, setSchemes] = useState(DEFAULT_SCHEMES);
    const [nodalOfficers, setNodalOfficers] = useState(DEFAULT_OFFICERS);
    const [sheetUrls, setSheetUrls] = useState(DEFAULT_URLS);
    const [schemeGroups, setSchemeGroups] = useState([{
        id: 'default_group',
        title: 'General Schemes',
        schemes: DEFAULT_SCHEMES
    }]);

    const [loading, setLoading] = useState(true);

    // Fetch Config from Backend on Mount
    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await fetch(`${API_URL}/config`);
            if (res.ok) {
                const data = await res.json();

                // --- Migration Logic: Restore from LocalStorage if Backend is Default ---
                // If backend URLs are all empty, but LocalStorage has URLs, we assume migration is needed.
                const localUrls = localStorage.getItem('zp_urls');
                const hasLocalData = localUrls && Object.values(JSON.parse(localUrls)).some(url => url.length > 0);
                const backendIsEmpty = Object.values(data.sheetUrls).every(url => url === "");

                if (backendIsEmpty && hasLocalData) {
                    console.log("Migrating LocalStorage data to Backend...");
                    const localSchemes = JSON.parse(localStorage.getItem('zp_schemes') || '[]');
                    const localOfficers = JSON.parse(localStorage.getItem('zp_officers') || '{}');
                    const localGroups = JSON.parse(localStorage.getItem('zp_scheme_groups') || '[]');
                    const parsedUrls = JSON.parse(localUrls);

                    const migratedConfig = {
                        schemes: localSchemes.length ? localSchemes : data.schemes,
                        nodalOfficers: Object.keys(localOfficers).length ? localOfficers : data.nodalOfficers,
                        sheetUrls: parsedUrls,
                        schemeGroups: localGroups.length ? localGroups : data.schemeGroups
                    };

                    // Update State
                    setSchemes(migratedConfig.schemes);
                    setNodalOfficers(migratedConfig.nodalOfficers);
                    setSheetUrls(migratedConfig.sheetUrls);
                    setSchemeGroups(migratedConfig.schemeGroups);

                    // Push to Backend
                    await saveToBackend(migratedConfig);
                } else {
                    // Normal Load
                    setSchemes(data.schemes);
                    setNodalOfficers(data.nodalOfficers);
                    setSheetUrls(data.sheetUrls);
                    setSchemeGroups(data.schemeGroups);
                }
            } else {
                console.error("Failed to load config from backend");
            }
        } catch (err) {
            console.error("Backend connection error:", err);
        } finally {
            setLoading(false);
        }
    };

    // Helper to Save Full Config to Backend
    const saveToBackend = async (newConfig) => {
        try {
            await fetch(`${API_URL}/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig)
            });
        } catch (err) {
            console.error("Failed to save config:", err);
        }
    };

    // Construct current full config object
    const getCurrentConfig = () => ({
        schemes,
        nodalOfficers,
        sheetUrls,
        schemeGroups
    });

    // --- Actions ---

    const addScheme = (name) => {
        if (!schemes.includes(name)) {
            const newSchemes = [...schemes, name];
            const newUrls = { ...sheetUrls, [name]: "" };
            const newOfficers = { ...nodalOfficers, [name]: { name: "Assign Officer", designation: "N/A" } };

            // Add to first group by default
            const newGroups = schemeGroups.map((g, i) =>
                i === 0 ? { ...g, schemes: [...g.schemes, name] } : g
            );

            // Update State
            setSchemes(newSchemes);
            setSheetUrls(newUrls);
            setNodalOfficers(newOfficers);
            setSchemeGroups(newGroups);

            // Sync
            saveToBackend({
                schemes: newSchemes,
                nodalOfficers: newOfficers,
                sheetUrls: newUrls,
                schemeGroups: newGroups
            });
            return true;
        }
        return false;
    };

    const updateSchemeUrl = (scheme, url) => {
        const newUrls = { ...sheetUrls, [scheme]: url };
        setSheetUrls(newUrls);
        saveToBackend({ ...getCurrentConfig(), sheetUrls: newUrls });
    };

    const updateOfficer = (scheme, { name, designation }) => {
        const newOfficers = { ...nodalOfficers, [scheme]: { name, designation } };
        setNodalOfficers(newOfficers);
        saveToBackend({ ...getCurrentConfig(), nodalOfficers: newOfficers });
    };

    const deleteScheme = (scheme) => {
        const newSchemes = schemes.filter(s => s !== scheme);

        const newUrls = { ...sheetUrls };
        delete newUrls[scheme];

        const newOfficers = { ...nodalOfficers };
        delete newOfficers[scheme];

        const newGroups = schemeGroups.map(g => ({
            ...g,
            schemes: g.schemes.filter(s => s !== scheme)
        }));

        setSchemes(newSchemes);
        setSheetUrls(newUrls);
        setNodalOfficers(newOfficers);
        setSchemeGroups(newGroups);

        saveToBackend({
            schemes: newSchemes,
            nodalOfficers: newOfficers,
            sheetUrls: newUrls,
            schemeGroups: newGroups
        });
    };

    const renameScheme = (oldName, newName) => {
        if (schemes.includes(newName)) {
            alert(`Scheme name "${newName}" already exists.`);
            return;
        }

        const newSchemes = schemes.map(s => s === oldName ? newName : s);

        const newUrls = { ...sheetUrls };
        newUrls[newName] = newUrls[oldName];
        delete newUrls[oldName];

        const newOfficers = { ...nodalOfficers };
        newOfficers[newName] = newOfficers[oldName];
        delete newOfficers[oldName];

        const newGroups = schemeGroups.map(g => ({
            ...g,
            schemes: g.schemes.map(s => s === oldName ? newName : s)
        }));

        setSchemes(newSchemes);
        setSheetUrls(newUrls);
        setNodalOfficers(newOfficers);
        setSchemeGroups(newGroups);

        saveToBackend({
            schemes: newSchemes,
            nodalOfficers: newOfficers,
            sheetUrls: newUrls,
            schemeGroups: newGroups
        });
    };

    const addGroup = (title) => {
        const id = `group_${Date.now()}`;
        const newGroups = [...schemeGroups, { id, title, schemes: [] }];
        setSchemeGroups(newGroups);
        saveToBackend({ ...getCurrentConfig(), schemeGroups: newGroups });
    };

    const deleteGroup = (groupId) => {
        const newGroups = schemeGroups.filter(g => g.id !== groupId);
        setSchemeGroups(newGroups);
        saveToBackend({ ...getCurrentConfig(), schemeGroups: newGroups });
    };

    const updateGroup = (groupId, { title, schemes: newSchemes }) => {
        const newGroups = schemeGroups.map(g => {
            if (g.id !== groupId) return g;
            return {
                ...g,
                title: title ?? g.title,
                schemes: newSchemes ?? g.schemes
            };
        });
        setSchemeGroups(newGroups);
        saveToBackend({ ...getCurrentConfig(), schemeGroups: newGroups });
    };

    const moveSchemeGroup = (scheme, fromGroupId, toGroupId) => {
        const newGroups = schemeGroups.map(g => {
            if (g.id === fromGroupId) {
                return { ...g, schemes: g.schemes.filter(s => s !== scheme) };
            }
            if (g.id === toGroupId) {
                // Prevent duplicates if something is weird
                if (g.schemes.includes(scheme)) return g;
                return { ...g, schemes: [...g.schemes, scheme] };
            }
            return g;
        });
        setSchemeGroups(newGroups);
        saveToBackend({ ...getCurrentConfig(), schemeGroups: newGroups });
    };

    const setGroups = (newGroups) => {
        setSchemeGroups(newGroups);
        saveToBackend({ ...getCurrentConfig(), schemeGroups: newGroups });
    };

    return (
        <ConfigContext.Provider value={{
            schemes,
            nodalOfficers,
            sheetUrls,
            schemeGroups,
            loading,
            addScheme,
            updateSchemeUrl,
            updateOfficer,
            deleteScheme,
            renameScheme,
            addGroup,
            deleteGroup,
            updateGroup,
            moveSchemeGroup,
            setGroups
        }}>
            {children}
        </ConfigContext.Provider>
    );
};
