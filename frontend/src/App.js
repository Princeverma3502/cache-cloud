import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  ShieldCheck, Globe, Clock, Key, Settings, Sun, Moon, 
  AlertTriangle, Download, Activity, Zap, ArrowUpRight, 
  BarChart3, Layers, Database, Lock
} from 'lucide-react';
import { motion } from 'framer-motion';
import './index.css';

const GEO_DATA_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://cloudshield-backend.onrender.com';

const Dashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passInput, setPassInput] = useState("");
  const [stats, setStats] = useState({ hits: 0, misses: 0, coalesced: 0, totalSavedMs: 0, ttl: 60 });
  const [logs, setLogs] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [activeTab, setActiveTab] = useState('monitor');
  const [ttlInput, setTtlInput] = useState(60);
  const [isDark, setIsDark] = useState(true);

  const fetchData = async () => {
    try {
      const s = await axios.get(`${API_BASE_URL}/api/performance`);
      const l = await axios.get(`${API_BASE_URL}/api/logs`);
      setStats(s.data);
      setLogs(l.data || []);
      setChartData(prev => [...prev, { 
        time: new Date().toLocaleTimeString().slice(-5), 
        hits: s.data.hits, 
        misses: s.data.misses 
      }].slice(-15));
    } catch (e) { 
      console.warn("Telemetry offline..."); 
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
      const intervalId = setInterval(fetchData, 5000);
      return () => clearInterval(intervalId);
    }
  }, [isAuthenticated]);

  const handleLogin = (e) => {
    e.preventDefault();
    setIsAuthenticated(true);
    localStorage.setItem("admin_token", passInput);
    toast.success("Security Clearance Verified");
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    setIsAuthenticated(false);
    window.location.reload();
  };

  const downloadCSV = () => {
    if (!logs.length) return toast.error("No logs available");
    const headers = "Timestamp,Status,URL,Latency\n";
    const rows = logs.map(l => `${new Date().toISOString()},${l.status},${l.url},${l.latency}ms`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Shield_Logs_${Date.now()}.csv`;
    link.click();
    toast.success("Logs Exported");
  };

  useEffect(() => {
    if (localStorage.getItem("admin_token")) setIsAuthenticated(true);
  }, []);

  const themeClass = isDark ? "bg-[#020617] text-slate-300" : "bg-slate-50 text-slate-900";
  const cardClass = isDark ? "bg-slate-900/40 border-slate-800 backdrop-blur-xl" : "bg-white border-slate-200 shadow-xl";
  const totalRequests = (stats.hits + stats.misses + stats.coalesced) || 1;

  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 ${isDark ? 'bg-[#020617]' : 'bg-slate-100'}`}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`p-10 rounded-[2.5rem] w-full max-w-md border ${cardClass}`}>
          <div className="flex justify-center mb-8">
            <div className="relative">
                <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 animate-pulse"></div>
                <img src="/logo.png" alt="Logo" className={`w-20 h-20 relative z-10 ${isDark ? 'brightness-0 invert' : ''}`} />
            </div>
          </div>
          <h2 className={`text-center text-3xl font-black mb-8 tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>CloudShield</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={18} />
                <input type="password" placeholder="Passphrase" className="w-full pl-12 pr-4 py-4 rounded-2xl bg-black/20 border border-white/5 outline-none focus:border-blue-500 transition-all text-center" onChange={(e) => setPassInput(e.target.value)} />
            </div>
            <button className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-500 shadow-lg transition-all uppercase tracking-widest text-xs">Authorize System</button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-700 p-8 font-sans ${themeClass} overflow-x-hidden`}>
      <Toaster position="bottom-right" />
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
          <div className="flex items-center gap-4 group">
            <motion.div whileHover={{ rotate: 180 }} transition={{ type: "spring", stiffness: 200 }} className="p-2 bg-blue-600 rounded-2xl">
                <img src="/logo.png" alt="Logo" className="w-10 h-10 brightness-0 invert" />
            </motion.div>
            <div>
                <h1 className="text-2xl font-black tracking-tighter uppercase leading-none italic">CloudShield</h1>
                <span className="text-[10px] font-bold text-blue-500 tracking-[0.3em] uppercase opacity-80">v2.4 Engine Active</span>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-black/10 p-2 rounded-3xl border border-white/5">
            <button onClick={downloadCSV} className="p-3 text-slate-400 hover:text-blue-500 transition-colors"><Download size={20} /></button>
            <button onClick={() => setIsDark(!isDark)} className="p-3 text-slate-400 hover:text-amber-500 transition-colors">
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <nav className="flex gap-1 ml-2">
                {['monitor', 'settings'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`px-8 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/5'}`}>{tab}</button>
                ))}
            </nav>
          </div>
        </header>

        {activeTab === 'monitor' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className={`p-8 rounded-[2.5rem] border ${cardClass}`}>
                <div className="flex items-center gap-3 mb-10">
                    <BarChart3 className="text-blue-500" size={20} />
                    <h3 className="text-[11px] font-black uppercase text-slate-500 tracking-[0.2em]">Efficiency Engine</h3>
                </div>
                <div className="space-y-8">
                    <StatBar label="Cache Hits" value={stats.hits} total={totalRequests} color="bg-blue-500" icon={Zap} />
                    <StatBar label="Coalesced" value={stats.coalesced} total={totalRequests} color="bg-purple-500" icon={Layers} />
                    <StatBar label="Direct Pull" value={stats.misses} total={totalRequests} color="bg-amber-500" icon={Database} />
                </div>
            </div>

            <div className={`lg:col-span-2 border rounded-[2.5rem] p-8 h-[350px] relative ${cardClass}`}>
              <ResponsiveContainer width="100%" height="90%">
                <AreaChart data={chartData}>
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', fontSize: '10px' }} />
                  <Area type="monotone" dataKey="hits" stroke="#3b82f6" fillOpacity={0.1} fill="#3b82f6" strokeWidth={4} />
                  <Area type="monotone" dataKey="misses" stroke="#f59e0b" fill="transparent" strokeWidth={2} strokeDasharray="6 6" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className={`lg:col-span-2 border rounded-[2.5rem] overflow-hidden h-[400px] relative ${cardClass}`}>
              <ComposableMap projectionConfig={{ scale: 140 }} style={{ width: "100%", height: "100%" }}>
                <Geographies geography={GEO_DATA_URL}>
                  {({ geographies }) => geographies.map((geo) => (
                    <Geography key={geo.rsmKey} geography={geo} fill={isDark ? "#0f172a" : "#cbd5e1"} stroke={isDark ? "#1e293b" : "#f1f5f9"} strokeWidth={0.5} style={{ default: { outline: 'none' } }} />
                  ))}
                </Geographies>
                {logs && logs.length > 0 && logs.filter(l => l.geo && typeof l.geo.lat === 'number' && typeof l.geo.lon === 'number').map((log, i) => (
                  <Marker key={`marker-${i}`} coordinates={[log.geo.lon, log.geo.lat]}>
                    <circle r={3} fill={log.status === 'HIT' ? '#3b82f6' : '#f59e0b'} />
                  </Marker>
                ))}
              </ComposableMap>
            </div>

            <div className="space-y-6">
              <div className={`p-8 border rounded-[2.5rem] flex items-center justify-between ${cardClass}`}>
                <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Time Salvage</p>
                    <p className="text-4xl font-black text-blue-500">-{stats.totalSavedMs}ms</p>
                </div>
                <Clock size={28} className="text-blue-500" />
              </div>

              <div className={`p-8 border rounded-[2.5rem] ${cardClass} h-[260px] flex flex-col`}>
                <h4 className="text-[11px] font-black text-slate-500 uppercase mb-6 tracking-widest flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/> Live Traffic
                </h4>
                <div className="space-y-4 overflow-y-auto flex-1">
                  {logs.slice(0, 10).map((log, i) => (
                    <div key={i} className="flex justify-between items-center text-[10px] font-mono border-b border-white/5 pb-3">
                      <span className={log.status === 'HIT' ? 'text-blue-500' : 'text-amber-500'}>{log.status}</span>
                      <span className="opacity-50 truncate w-32">{log.url}</span>
                      <span className="font-bold">{log.latency}ms</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <div className={`border rounded-[2.5rem] p-10 ${cardClass}`}>
              <h3 className="text-xl font-black mb-8 flex items-center gap-4 text-blue-500"><Settings size={24} /> Configuration</h3>
              <input type="range" min="10" max="3600" value={ttlInput} onChange={(e) => setTtlInput(e.target.value)} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer mb-8" />
              <button onClick={handleLogout} className="w-full py-3 text-red-500 text-[10px] font-black uppercase tracking-widest">Terminate Session</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const StatBar = ({ label, value, total, color, icon: Icon }) => {
    const percentage = Math.round((value / total) * 100) || 0;
    return (
        <div>
            <div className="flex justify-between items-end mb-3">
                <div className="flex items-center gap-3">
                    <Icon size={16} className="text-slate-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
                </div>
                <span className="text-xl font-black text-white">{value}</span>
            </div>
            <div className="h-2 w-full bg-slate-800/50 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} className={`h-full ${color} rounded-full`} />
            </div>
        </div>
    );
};

export default Dashboard;

// Trigger new build