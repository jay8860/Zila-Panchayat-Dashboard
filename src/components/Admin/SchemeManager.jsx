import React, { useState } from 'react';
import { useConfig } from '../../context/ConfigContext';
import { PlusCircle, Type } from 'lucide-react';

const SchemeManager = ({ onSchemeAdded }) => {
    const { addScheme } = useConfig();
    const [name, setName] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        addScheme(name.trim());

        setName('');
        alert(`New Task/Scheme "${name}" added successfully!`);
        if (onSchemeAdded) onSchemeAdded();
    };

    return (
        <div className="p-8 max-w-3xl mx-auto">
            <header className="mb-8">
                <h2 className="text-3xl font-bold tracking-tight">Create New Task</h2>
                <p className="text-muted-foreground mt-2">
                    Add a new scheme or ad-hoc task to monitor. Define the custom columns you want to track.
                </p>
            </header>

            <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-6">

                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Type size={16} />
                            Task / Scheme Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Jal Jeevan Mission, Special Sanitation Drive"
                            className="w-full bg-muted/50 border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={!name.trim()}
                        className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <PlusCircle size={20} />
                        Create Monitoring Task
                    </button>

                </form>
            </div>
        </div>
    );
};

export default SchemeManager;
