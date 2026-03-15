import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { createClient } from '@supabase/supabase-js';
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  ShieldCheck, Clock, Settings, Sun, Moon, 
  Zap, Layers, Database, Trash2, 
  Save, LogOut, Github, Activity, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './index.css';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || '',
  process.env.REACT_APP_SUPABASE_ANON_KEY || ''
);

const GEO_DATA_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://cloudshield-backend.onrender.com';

export default function App() {
  const [session, setSession] = useState(null);
  const [stats, setStats] = useState({ hits: 0, misses: 0, coalesced: 0, totalSavedMs: 0, ttl: 60 });
  const [logs, setLogs] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [activeTab, setActiveTab] = useState('monitor');
  const [ttlInput, setTtlInput] = useState(60);
  const [isDark, setIsDark] = useState(true);
  const [healthStatus, setHealthStatus] = useState('stable');
  const [totalSavedData, setTotalSavedData] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async () => {
    const startTime = Date.now();
    try {
      const s = await axios.get(`${API_BASE_URL}/api/performance`);
      const l = await axios.get(`${API_BASE_URL}/api/logs`);
      const latency = Date.now() - startTime;

      let currentHealth = latency < 400 ? 'stable' : latency < 900 ? 'sluggish' : 'critical';
      
      if (currentHealth === 'critical' && healthStatus !== 'critical') {
        setIncidents(prev => [{ id: Date.now(), time: new Date().toLocaleTimeString(), type: 'LATENCY_SPIKE', detail: `${latency}ms RTT delay` }, ...prev].slice(0, 5));
        toast.error("Network Latency Warning");
      }
      
      setHealthStatus(currentHealth);
      setStats(s.data);
      setLogs(l.data || []);
      setTotalSavedData((s.data.hits * 0.15).toFixed(2));
      setChartData(prev => [...prev, { time: new Date().toLocaleTimeString().slice(-5), hits: s.data.hits, misses: s.data.misses }].slice(-15));
    } catch (e) {
      if (healthStatus !== 'offline') {
        setIncidents(prev => [{ id: Date.now(), time: new Date().toLocaleTimeString(), type: 'CONNECTION_LOST', detail: 'Origin unreachable' }, ...prev]);
      }
      setHealthStatus('offline');
    }
  };

  useEffect(() => {
    if (session) {
      fetchData();
      const intervalId = setInterval(fetchData, 5000);
      return () => clearInterval(intervalId);
    }
  }, [session]);

  const handleUpdateTTL = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/settings`, { ttl: parseInt(ttlInput) });
      toast.success(`Infrastructure TTL: ${ttlInput}s`);
    } catch (e) { toast.error("Update failed"); }
  };

  const purgeCache = async () => {
    if (!window.confirm("Purge global cache?")) return;
    try {
      await axios.post(`${API_BASE_URL}/api/purge`);
      toast.success("Cache Purged", { icon: '🔥' });
    } catch (e) { toast.error("Purge failed"); }
  };

  const themeClass = isDark ? "bg-[#020617] text-slate-300" : "bg-slate-50 text-slate-900";
  const cardClass = isDark ? "glass" : "bg-white border-slate-200 shadow-xl";
  const totalRequests = (stats.hits + stats.misses + stats.coalesced) || 1;

  if (!session) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 ${isDark ? 'bg-[#020617]' : 'bg-slate-100'}`}>
        <Toaster position="top-center" />
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`p-12 rounded-[3.5rem] w-full max-w-md border ${cardClass} text-center shadow-2xl`}>
          <ShieldCheck size={64} className="text-blue-500 mx-auto mb-6" />
          <h2 className="text-3xl font-black mb-12 italic uppercase tracking-tighter">CloudShield</h2>
          <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'github' })} className="w-full flex items-center justify-center gap-4 py-5 bg-[#24292F] text-white rounded-3xl font-black hover:bg-black transition-all">
            <Github size={20} /> Authorize Session
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-700 p-6 md:p-10 ${themeClass}`}>
      <Toaster position="bottom-right" />
      <div className="max-w-7xl mx-auto">
        
        <header className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl"><Activity size={24} className="text-white" /></div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter uppercase italic">CloudShield</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`relative flex h-2 w-2`}>
                  <span className={`animate-ping absolute h-full w-full rounded-full opacity-75 ${healthStatus === 'stable' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                  <span className={`relative h-2 w-2 rounded-full ${healthStatus === 'stable' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">System {healthStatus}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 bg-black/20 p-1.5 rounded-3xl border border-white/5 backdrop-blur-md">
            {['monitor', 'settings'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-8 py-2.5 rounded-2xl text-[10px] font-black uppercase transition-all ${activeTab === tab ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>{tab}</button>
            ))}
            <button onClick={() => supabase.auth.signOut()} className="p-3 text-slate-500 hover:text-red-500 transition-colors"><LogOut size={18} /></button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'monitor' ? (
            <motion.div key="m" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className={`p-8 rounded-[2.5rem] border ${cardClass}`}>
                <div className="mb-8 p-6 rounded-3xl bg-blue-600/10 border border-blue-500/20">
                  <span className="text-[10px] font-black uppercase text-blue-500 block mb-2">Bandwidth Saved</span>
                  <div className="flex items-baseline gap-2"><span className="text-4xl font-black italic">{totalSavedData}</span><span className="text-xs font-bold text-blue-500">MB</span></div>
                </div>
                <div className="space-y-10">
                  <StatBar label="Cache Efficiency" value={stats.hits} total={totalRequests} color="from-blue-600 to-cyan-400" icon={Zap} />
                  <StatBar label="Direct Traffic" value={stats.misses} total={totalRequests} color="from-amber-600 to-orange-400" icon={Database} />
                </div>
                
                <div className="mt-12">
                   <h4 className="text-[10px] font-black text-red-500 uppercase mb-4 tracking-widest flex items-center gap-2"><AlertTriangle size={14}/> Incident Log</h4>
                   <div className="space-y-3">
                     {incidents.length === 0 ? <p className="text-[9px] opacity-40 italic">System secure. No recent spikes.</p> : 
                      incidents.map(i => (
                        <div key={i.id} className="text-[9px] p-2 rounded-lg bg-red-500/5 border border-red-500/10 flex justify-between">
                          <span className="font-bold">{i.type}</span><span>{i.time}</span>
                        </div>
                      ))}
                   </div>
                </div>
              </div>
              
              <div className={`lg:col-span-2 border rounded-[2.5rem] p-8 h-[380px] ${cardClass}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '16px', fontSize: '10px' }} />
                    <Area type="monotone" dataKey="hits" stroke="#3b82f6" fillOpacity={0.1} fill="#3b82f6" strokeWidth={4} />
                    <Area type="monotone" dataKey="misses" stroke="#f59e0b" fill="transparent" strokeWidth={2} strokeDasharray="5 5" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className={`lg:col-span-3 border rounded-[3rem] h-[400px] overflow-hidden ${cardClass}`}>
                <ComposableMap projectionConfig={{ scale: 150 }} style={{ width: "100%", height: "100%" }}>
                  <Geographies geography={GEO_DATA_URL}>
                    {({ geographies }) => geographies.map((geo) => (
                      <Geography key={geo.rsmKey} geography={geo} fill={isDark ? "#0f172a" : "#e2e8f0"} stroke={isDark ? "#1e293b" : "#cbd5e1"} strokeWidth={0.5} style={{ default: { outline: 'none' } }} />
                    ))}
                  </Geographies>
                  {logs.filter(l => l.geo?.lat).map((log, i) => (
                    <Marker key={i} coordinates={[log.geo.lon, log.geo.lat]}><circle r={3} fill="#3b82f6" className="animate-pulse" /></Marker>
                  ))}
                </ComposableMap>
              </div>
            </motion.div>
          ) : (
            <motion.div key="s" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto">
              <div className={`border rounded-[3.5rem] p-12 ${cardClass}`}>
                <h3 className="text-xl font-black mb-12 text-blue-500 flex items-center gap-3"><Settings size={22} /> System Controls</h3>
                <div className="space-y-12">
                  <section>
                    <div className="flex justify-between items-end mb-6">
                      <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic">Global Cache Duration: {ttlInput}s</p>
                      <Clock size={20} className="opacity-20" />
                    </div>
                    <input type="range" min="10" max="3600" step="10" value={ttlInput} onChange={(e) => setTtlInput(e.target.value)} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600 mb-8" />
                    <button onClick={handleUpdateTTL} className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl text-[10px] uppercase hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 active:scale-95"><Save size={14} className="inline mr-2" /> Commit Infrastructure Changes</button>
                  </section>
                  <div className="h-[1px] bg-white/5" />
                  <section className="flex gap-4">
                    <button onClick={purgeCache} className="flex-1 p-8 rounded-[2rem] bg-red-500/5 border border-red-500/10 text-red-500 hover:bg-red-600 hover:text-white transition-all text-left">
                      <Trash2 className="mb-4" size={24} /><p className="text-[10px] font-black uppercase">Force Global Purge</p>
                    </button>
                    <button onClick={() => setIsDark(!isDark)} className="flex-1 p-8 rounded-[2rem] bg-slate-500/5 border border-slate-500/10 text-slate-400 hover:bg-slate-800 hover:text-white transition-all text-left">
                      {isDark ? <Sun className="mb-4" size={24} /> : <Moon className="mb-4" size={24} />}<p className="text-[10px] font-black uppercase">Toggle Visual Theme</p>
                    </button>
                  </section>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

const StatBar = ({ label, value, total, color, icon: Icon }) => {
  const percentage = Math.round((value / total) * 100) || 0;
  return (
    <div>
      <div className="flex justify-between items-end mb-2 text-[10px] font-black uppercase tracking-widest opacity-60">
        <div className="flex items-center gap-2"><Icon size={14} />{label}</div><span>{percentage}%</span>
      </div>
      <div className="h-1.5 w-full bg-slate-900/40 rounded-full overflow-hidden p-[1px]">
        <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 1.5 }} className={`h-full bg-gradient-to-r ${color} rounded-full`} />
      </div>
    </div>
  );
};