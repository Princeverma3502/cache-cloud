import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { createClient } from '@supabase/supabase-js';
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  ShieldCheck, Clock, Settings, Sun, Moon, 
  Zap, Layers, Database, Trash2, 
  Save, LogOut, Github, Activity, AlertTriangle, 
  Globe, Share2, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import './index.css';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || '',
  process.env.REACT_APP_SUPABASE_ANON_KEY || ''
);

const GEO_DATA_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export default function App() {
  const [session, setSession] = useState(null);
  const [reportId, setReportId] = useState(null);
  const [isValidReport, setIsValidReport] = useState(true);
  const [stats, setStats] = useState({ hits: 0, misses: 0, coalesced: 0, totalSavedMs: 0, ttl: 60, domains: [] });
  const [logs, setLogs] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [activeTab, setActiveTab] = useState('monitor');
  const [ttlInput, setTtlInput] = useState(60);
  const [domainsInput, setDomainsInput] = useState(''); 
  const [isDark, setIsDark] = useState(true);
  const [healthStatus, setHealthStatus] = useState('stable');
  const [totalSavedData, setTotalSavedData] = useState(0);
  
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/report/')) {
      const rawId = path.split('/')[2];
      const sanitizedId = rawId.replace(/[^a-zA-Z0-9-]/g, ''); 
      setReportId(sanitizedId);
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
      return () => subscription.unsubscribe();
    }
  }, []);

  const fetchData = async () => {
    const targetId = reportId || (session ? session.user.id : null);
    if (!targetId) return;

    const startTime = Date.now();
    try {
      const [s, l] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/performance?clientId=${targetId}`),
        axios.get(`${API_BASE_URL}/api/logs?clientId=${targetId}`)
      ]);
      
      const latency = Date.now() - startTime;
      let currentHealth = latency < 400 ? 'stable' : latency < 900 ? 'sluggish' : 'critical';
      
      if (currentHealth === 'critical' && healthStatus !== 'critical' && !reportId) {
        setIncidents(prev => [{ id: Date.now(), time: new Date().toLocaleTimeString(), type: 'LATENCY_SPIKE', detail: `${latency}ms RTT delay detected` }, ...prev].slice(0, 5));
        toast.error("Network Latency Warning", { icon: '⚠️' });
      }
      
      setHealthStatus(currentHealth);
      setStats(s.data);
      setTtlInput(s.data.ttl || 60); 
      setDomainsInput((s.data.domains || []).join(', '));
      setLogs(l.data || []);
      setTotalSavedData((s.data.hits * 0.15).toFixed(2));
      setIsValidReport(true);
      
      setChartData(prev => [...prev, { time: new Date().toLocaleTimeString().slice(-5), hits: s.data.hits, misses: s.data.misses }].slice(-15));
    } catch (e) {
      if (reportId) setIsValidReport(false);
      if (healthStatus !== 'offline' && !reportId) {
        setIncidents(prev => [{ id: Date.now(), time: new Date().toLocaleTimeString(), type: 'CONNECTION_LOST', detail: 'Backend API Unreachable' }, ...prev]);
      }
      setHealthStatus('offline');
    }
  };

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, 5000);
    return () => clearInterval(intervalId);
  }, [session, reportId]);

  const handleUpdateSettings = async () => {
    try {
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {};
      const domainArray = domainsInput.split(',').map(d => d.trim()).filter(Boolean);

      await axios.post(`${API_BASE_URL}/api/settings`, { 
        ttl: parseInt(ttlInput),
        domains: domainArray 
      }, { headers });

      toast.success("Security & Infrastructure settings updated!");
    } catch (e) { 
      toast.error("Unauthorized: Update failed"); 
    }
  };

  const purgeCache = async () => {
    if (!window.confirm("Purge global cache?")) return;
    try {
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {};
      await axios.post(`${API_BASE_URL}/api/purge`, {}, { headers });
      toast.success("Global Cache Purged Securely", { icon: '🔥' });
    } catch (e) { 
      toast.error("Unauthorized: Purge failed"); 
    }
  };

  const copyPublicReport = () => {
    const url = `${window.location.origin}/report/${session.user.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Public Report Link Copied!");
  };

  const exportPDF = () => {
    const element = document.getElementById('report-area');
    toast.loading("Generating PDF...", { id: 'pdf-toast' });
    
    const mapEl = document.getElementById('world-map');
    if(mapEl) mapEl.style.opacity = '0.5';

    html2canvas(element, { backgroundColor: isDark ? '#020617' : '#f8fafc', scale: 2, useCORS: true }).then(canvas => {
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, (canvas.height * 210) / canvas.width);
      pdf.save(`CloudShield-Report-${new Date().toLocaleDateString()}.pdf`);
      if(mapEl) mapEl.style.opacity = '1';
      toast.success("PDF Downloaded!", { id: 'pdf-toast' });
    });
  };

  const themeClass = isDark ? "bg-[#020617] text-slate-300" : "bg-slate-50 text-slate-900";
  const cardClass = isDark ? "glass" : "bg-white border-slate-200 shadow-xl";
  const totalRequests = (stats.hits + stats.misses) || 1;

  if (!isValidReport) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 text-center ${themeClass}`}>
        <div>
          <AlertTriangle size={60} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black uppercase italic mb-4">Report Not Found</h1>
          <p className="opacity-60 mb-8">This infrastructure report does not exist.</p>
          <button onClick={() => window.location.assign('/')} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold uppercase text-[10px]">Return Home</button>
        </div>
      </div>
    );
  }

  if (!session && !reportId) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 ${isDark ? 'bg-[#020617]' : 'bg-slate-100'}`}>
        <Toaster position="top-center" />
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`p-12 rounded-[3.5rem] border ${cardClass} text-center shadow-2xl w-full max-w-md`}>
          <ShieldCheck size={64} className="text-blue-500 mx-auto mb-6" />
          <h2 className="text-3xl font-black mb-12 italic uppercase tracking-tighter">CloudShield</h2>
          <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'github' })} className="w-full flex items-center justify-center gap-4 py-5 bg-[#24292F] text-white rounded-3xl font-black hover:bg-black transition-all">
            <Github size={20} /> Login with GitHub
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div id="report-area" className={`min-h-screen transition-colors duration-700 p-6 md:p-10 ${themeClass}`}>
      <Toaster position="bottom-right" />
      <div className="max-w-7xl mx-auto">
        
        <header className="flex flex-col md:row justify-between items-center mb-12 gap-6 md:flex-row">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20"><Activity size={24} className="text-white" /></div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter uppercase italic">CloudShield</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute h-full w-full rounded-full opacity-75 ${healthStatus === 'stable' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                  <span className={`relative h-2 w-2 rounded-full ${healthStatus === 'stable' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">System {healthStatus}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button onClick={exportPDF} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase transition-all shadow-lg shadow-blue-500/20">
              <Download size={14} /> Save PDF
            </button>
            
            {!reportId && (
              <div className="flex gap-2 bg-black/20 p-1.5 rounded-3xl border border-white/5 backdrop-blur-md">
                {['monitor', 'integration', 'settings'].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>{tab}</button>
                ))}
                <button onClick={() => supabase.auth.signOut()} className="p-3 text-slate-500 hover:text-red-500 transition-colors"><LogOut size={18} /></button>
              </div>
            )}
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'monitor' ? (
            <motion.div key="m" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              <div className={`p-8 rounded-[2.5rem] border ${cardClass}`}>
                <div className="mb-8 p-6 rounded-3xl bg-blue-600/10 border border-blue-500/20">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black uppercase text-blue-500 tracking-widest">Network Relief</span>
                    <Zap size={14} className="text-blue-500" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black italic">{totalSavedData}</span>
                    <span className="text-xs font-bold text-blue-500 uppercase">MB Saved</span>
                  </div>
                </div>
                
                <div className="space-y-10">
                  <StatBar label="Cache Efficiency" value={stats.hits} total={totalRequests} color="from-blue-600 to-cyan-400" icon={Zap} />
                  <StatBar label="Direct Traffic" value={stats.misses} total={totalRequests} color="from-amber-600 to-orange-400" icon={Database} />
                </div>
                
                <div className="mt-12 pt-8 border-t border-white/5">
                  <h4 className="text-[10px] font-black text-red-500 uppercase mb-4 tracking-widest flex items-center gap-2"><AlertTriangle size={14}/> Incident History</h4>
                  <div className="space-y-3 max-h-[150px] overflow-y-auto custom-scrollbar">
                    {incidents.length === 0 ? <p className="text-[9px] opacity-40 italic">No session incidents detected.</p> : 
                      incidents.map(i => (
                        <div key={i.id} className="text-[9px] p-3 rounded-xl bg-red-500/5 border border-red-500/10 flex flex-col gap-1">
                          <div className="flex justify-between font-black uppercase text-red-500"><span>{i.type}</span><span>{i.time}</span></div>
                          <div className="opacity-60">{i.detail}</div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
              
              <div className={`lg:col-span-2 border rounded-[2.5rem] p-8 h-[400px] ${cardClass}`}>
                <div className="flex justify-between items-center mb-6">
                   <h4 className="text-[10px] font-black uppercase tracking-widest opacity-60">Global Request Velocity</h4>
                   <div className="flex gap-4 text-[9px] font-bold uppercase tracking-tighter">
                      <span className="flex items-center gap-1 text-blue-500"><div className="w-2 h-2 rounded-full bg-blue-500"/> Hits</span>
                      <span className="flex items-center gap-1 text-amber-500"><div className="w-2 h-2 rounded-full bg-amber-500"/> Misses</span>
                   </div>
                </div>
                <ResponsiveContainer width="100%" height="90%">
                  <AreaChart data={chartData}>
                    <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '16px', fontSize: '10px' }} />
                    <Area type="monotone" dataKey="hits" stroke="#3b82f6" fillOpacity={0.1} fill="#3b82f6" strokeWidth={4} />
                    <Area type="monotone" dataKey="misses" stroke="#f59e0b" fill="transparent" strokeWidth={2} strokeDasharray="5 5" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div id="world-map" className={`lg:col-span-3 border rounded-[3rem] h-[450px] overflow-hidden relative ${cardClass}`}>
                <div className="absolute top-8 left-8 z-10">
                   <h4 className="text-[10px] font-black uppercase tracking-widest opacity-60 flex items-center gap-2"><Globe size={14}/> Live Origin Trace</h4>
                </div>
                <ComposableMap projectionConfig={{ scale: 160 }} style={{ width: "100%", height: "100%" }}>
                  <Geographies geography={GEO_DATA_URL}>
                    {({ geographies }) => geographies.map((geo) => (
                      <Geography key={geo.rsmKey} geography={geo} fill={isDark ? "#0f172a" : "#e2e8f0"} stroke={isDark ? "#1e293b" : "#cbd5e1"} strokeWidth={0.5} />
                    ))}
                  </Geographies>
                  {logs.filter(l => l.geo?.lat).map((log, i) => (
                    <Marker key={i} coordinates={[log.geo.lon, log.geo.lat]}>
                      <circle r={3} fill="#3b82f6" className="animate-pulse" />
                    </Marker>
                  ))}
                </ComposableMap>
              </div>
            </motion.div>
          ) : activeTab === 'integration' ? (
            <motion.div key="i" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-3xl mx-auto space-y-6">
               <div className={`p-10 border rounded-[3rem] ${cardClass}`}>
                  <h3 className="text-xl font-black mb-6 text-blue-500 flex items-center gap-3"><Layers size={24} /> Public Website Integration</h3>
                  <p className="text-sm opacity-60 mb-8 leading-relaxed">Install CloudShield on any website (HTML, WordPress, React) to start tracking global traffic and bandwidth savings.</p>
                  
                  <div className="relative group">
                    <div className="bg-black/40 p-6 rounded-3xl border border-white/5 font-mono text-[11px] text-blue-300 overflow-x-auto custom-scrollbar">
                      {`<script src="${API_BASE_URL}/shield.js" data-client-id="${session.user.id}" async></script>`}
                    </div>
                    <button onClick={() => {
                      navigator.clipboard.writeText(`<script src="${API_BASE_URL}/shield.js" data-client-id="${session.user.id}" async></script>`);
                      toast.success("Script copied!");
                    }} className="absolute top-4 right-4 p-2 bg-blue-600 rounded-xl hover:bg-blue-500 shadow-lg"><Save size={14} className="text-white"/></button>
                  </div>

                  <div className="mt-10 flex gap-4">
                     <button onClick={copyPublicReport} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-white/5 transition-all">
                        <Share2 size={14} /> Copy Public Report Link
                     </button>
                  </div>
               </div>

               <div className={`p-8 border rounded-[2.5rem] ${cardClass}`}>
                  <h4 className="text-[10px] font-black uppercase text-blue-500 mb-6 tracking-widest">Connected Domains</h4>
                  <div className="space-y-3">
                    {[...new Set(logs.map(l => l.origin))].length === 0 ? <p className="text-[10px] opacity-40 italic">Waiting for first integration hit...</p> : 
                      [...new Set(logs.map(l => l.origin))].map(domain => (
                        <div key={domain} className="flex justify-between items-center p-4 rounded-2xl bg-white/5 border border-white/5">
                           <span className="text-xs font-bold">{domain || 'Localhost'}</span>
                           <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full font-black uppercase">Receiving Data</span>
                        </div>
                      ))
                    }
                  </div>
               </div>
            </motion.div>
          ) : (
            <motion.div key="s" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto">
              <div className={`border rounded-[3.5rem] p-12 ${cardClass}`}>
                <h3 className="text-xl font-black mb-12 text-blue-500 flex items-center gap-3"><Settings size={22} /> System Controls</h3>
                <div className="space-y-12">
                  <section>
                    <div className="flex justify-between items-end mb-6">
                      <p className="text-[10px] font-black uppercase tracking-widest italic opacity-60">Global Cache Duration: {ttlInput}s</p>
                      <Clock size={20} className="opacity-20" />
                    </div>
                    <input type="range" min="10" max="3600" step="10" value={ttlInput} onChange={(e) => setTtlInput(e.target.value)} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600 mb-8" />
                    
                    <div className="flex justify-between items-end mb-4 mt-6">
                      <p className="text-[10px] font-black uppercase tracking-widest italic opacity-60 flex items-center gap-2"><ShieldCheck size={14} /> Allowed Domains Whitelist</p>
                    </div>
                    <input 
                      type="text" 
                      value={domainsInput} 
                      onChange={(e) => setDomainsInput(e.target.value)} 
                      placeholder="e.g. mywebsite.com, my-blog.vercel.app"
                      className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-[12px] font-mono text-blue-300 mb-8 outline-none focus:border-blue-500 transition-colors"
                    />

                    <button onClick={handleUpdateSettings} className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl text-[10px] uppercase hover:bg-blue-500 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
                      <Save size={14} /> Commit Security Settings
                    </button>
                  </section>
                  <div className="h-[1px] bg-white/5" />
                  <section className="flex gap-4">
                    <button onClick={purgeCache} className="flex-1 p-8 rounded-[2rem] bg-red-500/5 border border-red-500/10 text-red-500 hover:bg-red-600 hover:text-white transition-all text-left">
                      <Trash2 className="mb-4" size={24} /><p className="text-[10px] font-black uppercase">Force Global Purge</p>
                    </button>
                    <button onClick={() => setIsDark(!isDark)} className="flex-1 p-8 rounded-[2rem] bg-slate-500/5 border border-slate-500/10 text-slate-400 hover:bg-slate-800 hover:text-white transition-all text-left">
                      {isDark ? <Sun className="mb-4" size={24} /> : <Moon className="mb-4" size={24} />}<p className="text-[10px] font-black uppercase">Toggle UI Theme</p>
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
        <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 1.5, ease: "easeOut" }} className={`h-full bg-gradient-to-r ${color} rounded-full`} />
      </div>
    </div>
  );
};