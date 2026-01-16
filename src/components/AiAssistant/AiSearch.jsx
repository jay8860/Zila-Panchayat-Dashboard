import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, Loader2, Table as TableIcon, AlertCircle } from 'lucide-react';
import { useConfig } from '../../context/ConfigContext';

// Simple API extraction
const API_URL = import.meta.env.VITE_API_URL || '/api';

const AiSearch = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState([
        { type: 'bot', text: "Hi! ask me anything about your schemes. e.g., 'Show bottom 5 GPs in PMAY' or 'Which blocks have < 50% progress?'" }
    ]);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleAsk = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        const userText = query;
        setQuery('');
        setMessages(prev => [...prev, { type: 'user', text: userText }]);
        setIsLoading(true);

        try {
            const res = await fetch(`${API_URL}/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: userText })
            });

            const data = await res.json();

            if (res.ok) {
                setMessages(prev => [...prev, {
                    type: 'bot',
                    text: data.answer,
                    table: data.table,
                    scheme: data.scheme
                }]);
            } else {
                setMessages(prev => [...prev, { type: 'bot', text: "Sorry, I couldn't process that. Check if Gemini API Key is set." }]);
            }

        } catch (error) {
            setMessages(prev => [...prev, { type: 'bot', text: "Network error. Is the backend running?" }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed top-6 right-6 h-12 w-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 transition-transform z-[150] animate-in fade-in zoom-in"
                title="Ask AI Assistant"
            >
                <Sparkles size={24} />
            </button>
        );
    }

    return (
        <div className="fixed bottom-8 right-8 w-96 h-[600px] max-h-[80vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col z-[100] animate-in slide-in-from-bottom-10 fade-in duration-300 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 flex justify-between items-center text-white shrink-0">
                <div className="flex items-center gap-2">
                    <Bot size={20} />
                    <span className="font-semibold">Data Assistant</span>
                </div>
                <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                    <X size={18} />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${msg.type === 'user'
                            ? 'bg-indigo-600 text-white rounded-br-none'
                            : 'bg-card border border-border text-foreground rounded-bl-none shadow-sm'
                            }`}>
                            <p className="whitespace-pre-wrap">{msg.text}</p>

                            {/* Result Table */}
                            {msg.table && msg.table.length > 0 && (
                                <div className="mt-3 overflow-x-auto rounded border border-border/50 bg-background/50">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-muted text-muted-foreground">
                                            <tr>
                                                {Object.keys(msg.table[0]).map(key => (
                                                    <th key={key} className="px-2 py-1.5 font-medium whitespace-nowrap">{key}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/30">
                                            {msg.table.map((row, rIdx) => (
                                                <tr key={rIdx} className="hover:bg-muted/30">
                                                    {Object.values(row).map((val, cIdx) => (
                                                        <td key={cIdx} className="px-2 py-1.5 whitespace-nowrap text-foreground">{val}</td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <div className="px-2 py-1 bg-muted/30 text-[10px] text-muted-foreground text-center">
                                        Showing {msg.table.length} results from {msg.scheme}
                                    </div>
                                </div>
                            )}

                            {msg.table && msg.table.length === 0 && (
                                <div className="mt-2 text-xs italic text-muted-foreground flex items-center gap-1">
                                    <AlertCircle size={12} /> No matching records found.
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-card border border-border rounded-2xl rounded-bl-none p-3 shadow-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 size={16} className="animate-spin" />
                                <span className="text-xs">Analyzing data...</span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleAsk} className="p-3 border-t border-border bg-card shrink-0">
                <div className="relative flex items-center">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Type a question..."
                        className="w-full pl-4 pr-10 py-3 bg-muted/40 border-transparent focus:bg-background focus:border-indigo-500 rounded-xl text-sm transition-all focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    />
                    <button
                        type="submit"
                        disabled={!query.trim() || isLoading}
                        className="absolute right-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send size={16} />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AiSearch;
