import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { AreaChart, Area, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ShieldCheck, Globe, Clock, Key, Settings, Sun, Moon, AlertTriangle, Lock } from 'lucide-react';

const geoUrl = "https://raw.githubusercontent.com/lotusms/projects/master/hostel/aims/t3/world-110m.json";

// Production URL Fallback
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const Dashboard = () => {
  // --- AUTHENTICATION STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passInput, setPassInput] = useState("");

  // --- APP STATE ---
  const [stats, setStats] = useState({ hits: 0, misses: 0, coalesced: 0, totalSavedMs: 0, ttl: 60 });
  const [logs, setLogs] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [activeTab, setActiveTab] = useState('monitor');
  const [apiKey, setApiKey] = useState('demo-key-123');
  const [ttlInput, setTtlInput] = useState(60);
  const [isDark, setIsDark] = useState(true);

  // --- AUTH LOGIC ---
  const handleLogin = (e) => {
    e.preventDefault();
    if (passInput.length > 0) {
      setIsAuthenticated(true);
      localStorage.setItem("admin_token", passInput);
      toast.success("Access Granted");
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("admin_token");
    if (saved) setIsAuthenticated(true);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    setIsAuthenticated(false);
    window.location.reload();
  };

  // --- DATA FETCHING ---
  const fetchData = async () => {
    try {
      const s = await axios.get(`${API_BASE}/api/performance`);
      const l = await axios.get(`${API_BASE}/api/logs`);
      setStats(s.data);
      setLogs(l.data);
      setChartData(prev => [...prev, { 
        time: new Date().toLocaleTimeString().slice(-5), 
        hits: s.data.hits, 
        misses: s.data.misses 
      }].slice(-15));
    } catch (e) { console.log("Fetch error - checking connection..."); }
  };

  useEffect(() => {
    if (isAuthenticated) {
      const int = setInterval(fetchData, 2000);
      return () => clearInterval(int);
    }
  }, [isAuthenticated]);

  const getAdminHeaders = () => {
    const token = localStorage.getItem("admin_token");
    return { headers: { 'x-admin-auth': token } };
  };

  // --- ACTIONS ---
  const updateTTL = async () => {
    try {
        await axios.post(`${API_BASE}/api/ttl`, { ttl: parseInt(ttlInput) }, getAdminHeaders());
        toast.success(`TTL updated to ${ttlInput}s`);
    } catch (e) { toast.error("Unauthorized"); }
  };

  const generateNewKey = async () => {
    try {
        const res = await axios.post(`${API_BASE}/api/key`, {}, getAdminHeaders());
        setApiKey(res.data.apiKey);
        toast.success("New Master Key Generated");
    } catch (e) { toast.error("Unauthorized"); }
  };

  const purgeCache = async () => {
    try {
        await axios.delete(`${API_BASE}/api/purge`, getAdminHeaders());
        toast.success("Global Cache Purged");
        setStats(prev => ({ ...prev, hits: 0, misses: 0, coalesced: 0 }));
    } catch (e) { toast.error("Unauthorized"); }
  };

  // --- STYLING ---
  const themeClass = isDark ? "bg-[#020617] text-slate-300" : "bg-slate-50 text-slate-900";
  const cardClass = isDark ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-200 shadow-sm";
  const totalRequests = stats.hits + stats.misses + stats.coalesced || 1;

  // --- LOGIN VIEW ---
  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 ${isDark ? 'bg-[#020617]' : 'bg-slate-100'}`}>
        <div className={`p-8 rounded-3xl w-full max-w-md border transition-all ${cardClass}`}>
          <div className="flex justify-center mb-6">
             <img src="/logo.png" alt="CloudShield" className={`w-16 h-16 ${isDark ? 'brightness-0 invert' : ''}`} />
          </div>
          <h2 className={`text-center text-2xl font-black mb-8 ${isDark ? 'text-white' : 'text-slate-900'}`}>CloudShield Login</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" 
              placeholder="Admin Passphrase" 
              className={`w-full px-4 py-3 rounded-xl outline-none border transition-all ${isDark ? 'bg-black/40 border-slate-700 text-white focus:border-blue-500' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'}`}
              onChange={(e) => setPassInput(e.target.value)}
            />
            <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-500 transition-all uppercase tracking-widest text-xs">Unlock Engine</button>
          </form>
        </div>
      </div>
    );
  }

  // --- DASHBOARD VIEW ---
  return (
    <div className={`min-h-screen transition-colors duration-500 p-8 font-sans ${themeClass}`}>
      {/* CSS FIX: These styles are now properly injected via a style tag */}
      <style>
        {`
          body { font-family: 'Inter', sans-serif; }
          .glass { background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.1); }
          .glow-blue { box-shadow: 0 0 20px rgba(56, 189, 248, 0.2); }
          .scrollbar-hide::-webkit-scrollbar { display: none; }
        `}
      </style>
      
      <Toaster />
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="CloudShield" 
              className={`w-10 h-10 object-contain transition-all duration-300 ${isDark ? 'brightness-0 invert' : ''}`} 
            />
            <h1 className="text-xl font-black tracking-tighter uppercase">CloudShield</h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={handleLogout} className="text-[10px] font-black text-red-500 hover:underline mr-4">LOGOUT</button>
            <button onClick={() => setIsDark(!isDark)} className={`p-2 rounded-full border ${isDark ? 'border-slate-800 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'} transition-all`}>
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <nav className={`flex p-1 rounded-xl border ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-200 border-slate-300'}`}>
                <button onClick={() => setActiveTab('monitor')} className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'monitor' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}>MONITOR</button>
                <button onClick={() => setActiveTab('settings')} className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}>SETTINGS</button>
            </nav>
          </div>
        </header>

        {activeTab === 'monitor' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
            <div className={`p-6 rounded-3xl border flex flex-col justify-center ${cardClass}`}>
                <h3 className="text-[10px] font-black uppercase text-slate-500 mb-6 tracking-widest text-center">Efficiency Ratio</h3>
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between text-xs mb-1 font-bold"><span>Cache Hits</span><span className="text-blue-500">{stats.hits}</span></div>
                        <div className="h-2 w-full bg-slate-800/20 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 transition-all duration-1000" style={{width: `${(stats.hits / totalRequests)*100}%`}} />
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-xs mb-1 font-bold"><span>Coalesced</span><span className="text-purple-500">{stats.coalesced}</span></div>
                        <div className="h-2 w-full bg-slate-800/20 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 transition-all duration-1000" style={{width: `${(stats.coalesced / totalRequests)*100}%`}} />
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-xs mb-1 font-bold"><span>Upstream Misses</span><span className="text-amber-500">{stats.misses}</span></div>
                        <div className="h-2 w-full bg-slate-800/20 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 transition-all duration-1000" style={{width: `${(stats.misses / totalRequests)*100}%`}} />
                        </div>
                    </div>
                </div>
            </div>

            <div className={`lg:col-span-2 border rounded-3xl p-6 h-[250px] ${cardClass}`}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorHits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#e2e8f0"} vertical={false} />
                  <Tooltip contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#fff', borderRadius: '12px', border: 'none' }} />
                  <Area type="monotone" dataKey="hits" stroke="#3b82f6" fill="url(#colorHits)" strokeWidth={3} />
                  <Area type="monotone" dataKey="misses" stroke="#f59e0b" fill="transparent" strokeWidth={2} strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className={`lg:col-span-2 border rounded-3xl overflow-hidden h-[300px] relative ${cardClass}`}>
              <div className="absolute top-6 left-6 z-10 text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Globe size={14}/> Traffic Map</div>
              <ComposableMap projectionConfig={{ scale: 140 }} style={{ width: "100%", height: "100%" }}>
                <Geographies geography={geoUrl}>
                  {({ geographies }) => geographies.map((geo) => (
                    <Geography key={geo.rsmKey} geography={geo} fill={isDark ? "#0f172a" : "#cbd5e1"} stroke={isDark ? "#1e293b" : "#f1f5f9"} />
                  ))}
                </Geographies>
                {logs.map((log) => log.geo?.lat && (
                  <Marker key={log.id} coordinates={[log.geo.lon, log.geo.lat]}>
                    <circle r={4} fill={log.status === 'HIT' ? '#3b82f6' : log.status === 'COALESCED' ? '#a855f7' : '#f59e0b'} className="animate-pulse" />
                  </Marker>
                ))}
              </ComposableMap>
            </div>

            <div className="space-y-4">
              <div className={`p-5 border rounded-3xl flex items-center justify-between ${cardClass}`}>
                <div><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Savings</p><p className="text-3xl font-black">{stats.totalSavedMs}ms</p></div>
                <Clock className="text-blue-500 opacity-50" size={32} />
              </div>
              <div className={`p-5 border rounded-3xl ${cardClass} h-[180px] overflow-y-auto scrollbar-hide`}>
                <h4 className="text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">Live Logs</h4>
                {logs.map(log => (
                  <div key={log.id} className="flex justify-between text-[10px] font-mono border-b border-slate-800/20 pb-2 mb-2">
                    <span className={log.status === 'HIT' ? 'text-blue-500' : log.status === 'COALESCED' ? 'text-purple-500' : 'text-amber-500'}>{log.status}</span>
                    <span className="opacity-50 truncate w-32 text-right">{log.url}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-bottom-4">
            <div className={`border rounded-3xl p-8 ${cardClass}`}>
              <h3 className="text-lg font-black mb-6 flex items-center gap-2 text-blue-500"><Settings size={20} /> Cache Configuration</h3>
              <label className="text-xs font-bold text-slate-500 mb-4 block uppercase">Global TTL: {ttlInput}s</label>
              <input type="range" min="10" max="3600" value={ttlInput} onChange={(e) => setTtlInput(e.target.value)} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600 mb-6" />
              <button onClick={updateTTL} className="w-full py-4 bg-blue-600 text-white font-black rounded-xl text-xs uppercase tracking-widest hover:bg-blue-500 transition-all">Apply Configuration</button>
            </div>

            <div className={`border rounded-3xl p-8 ${cardClass}`}>
              <h3 className="text-lg font-black mb-2 flex items-center gap-2 text-blue-500"><Key size={20} /> API Authentication</h3>
              <p className="text-xs text-slate-500 mb-6">Required header: <code className="bg-black/20 px-2 py-1 rounded">x-api-key</code></p>
              <div className="bg-black/20 p-4 rounded-xl font-mono text-sm mb-4 text-center border border-white/5">{apiKey}</div>
              <div className="flex gap-4">
                  <button onClick={() => {navigator.clipboard.writeText(apiKey); toast.success("Copied!")}} className="flex-1 py-4 border border-blue-500/50 text-blue-500 font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-blue-500/5 transition-all">Copy Key</button>
                  <button onClick={generateNewKey} className="flex-1 py-4 bg-slate-800 text-white font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all">Rotate Key</button>
              </div>
            </div>

            <div className="border border-red-500/20 rounded-3xl p-8 bg-red-500/5">
              <h3 className="text-lg font-black mb-2 flex items-center gap-2 text-red-500"><AlertTriangle size={20} /> Danger Zone</h3>
              <p className="text-xs text-slate-500 mb-6">Wipe the entire Redis cache database immediately.</p>
              <button onClick={purgeCache} className="w-full py-4 border border-red-500/50 text-red-500 font-black rounded-xl text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">Purge Global Cache</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;