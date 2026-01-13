import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock, ArrowRight } from 'lucide-react';

const Login = () => {
    const { login } = useAuth();
    const [code, setCode] = useState('');
    const [error, setError] = useState(false);
    const [shake, setShake] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        const success = login(code);
        if (!success) {
            setError(true);
            setShake(true);
            setTimeout(() => setShake(false), 500); // Reset shake animation
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/10 blur-[100px]"></div>
            </div>

            <div className="w-full max-w-md p-8 relative z-10">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
                        Zila Panchayat
                    </h1>
                    <p className="text-muted-foreground">Unified Administrative Monitoring System</p>
                </div>

                <div className="bg-card border border-border p-8 rounded-2xl shadow-xl backdrop-blur-sm">
                    <h2 className="text-xl font-semibold mb-6">Restricted Access</h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground mb-1 block">Access Code</label>
                            <div className={`relative flex items-center ${shake ? 'animate-bounce-horizontal' : ''}`}>
                                <Lock className="absolute left-3 text-muted-foreground" size={18} />
                                <input
                                    type="password"
                                    value={code}
                                    onChange={(e) => { setCode(e.target.value); setError(false); }}
                                    className={`w-full bg-muted/50 border rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 transition-all ${error ? 'border-red-500 focus:ring-red-500/20' : 'border-border focus:ring-primary/20'}`}
                                    placeholder="Enter your secure PIN"
                                    autoFocus
                                />
                            </div>
                            {error && <p className="text-xs text-red-500 mt-2">Invalid access code. Please try again.</p>}
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium hover:bg-primary/90 transition-all flex items-center justify-center group"
                        >
                            <span>Access Dashboard</span>
                            <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </form>
                </div>

                <p className="text-center text-xs text-muted-foreground mt-8">
                    Authorized personnel only. <br /> Access is monitored and logged.
                </p>
            </div>

            <style>{`
        @keyframes bounce-horizontal {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-bounce-horizontal {
          animation: bounce-horizontal 0.3s ease-in-out;
        }
      `}</style>
        </div>
    );
};

export default Login;
