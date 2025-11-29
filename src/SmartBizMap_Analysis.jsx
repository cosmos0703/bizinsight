import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ScatterChart, Scatter, Cell, PieChart, Pie, Cell as PieCell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
    LineChart, Line, ZAxis
} from 'recharts';
import {
    Map as MapIcon, Search, X, Check, ArrowRight, User,
    TrendingUp, DollarSign, Users, Activity, PieChart as PieChartIcon,
    MapPin, Grid, Info, HelpCircle, Layers, Zap, Bell, ChevronDown, Trophy
} from 'lucide-react';
import { fetchYouTubeTrending } from './utils/youtube';
import { loadAllData } from './utils/dataLoader';
import { DONG_COORDINATES } from './data/dongCoordinates';

// --- CONSTANTS ---
const CATEGORIES = {
    '외식업': ['카페/디저트', '치킨/호프', '한식', '양식', '중식', '패스트푸드'],
    '서비스업': ['미용실', '네일아트', '피부관리', '세탁소', 'PC방', '노래방'],
    '소매업': ['편의점', '의류', '화장품', '슈퍼마켓', '꽃집']
};

const FALLBACK_TRENDS = [
    { title: "🔥 급상승: 저당 디저트, 무인 카페, 하이볼", id: "VIDEO_ID_1" }
];

const getHeatmapColor = (value, min, max) => {
    if (value === undefined || isNaN(value)) return '#cbd5e1'; 
    const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
    const r = Math.round(59 + (239 - 59) * ratio);
    const g = Math.round(130 + (68 - 130) * ratio);
    const b = Math.round(246 + (68 - 246) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
};

// --- COMPONENTS ---

// Ticker Component (Styled like Bento)
const Ticker = ({ items, currentIndex }) => (
    <div className="bg-slate-900 text-white px-4 py-3 rounded-xl flex items-center gap-3 shadow-md mb-6 relative overflow-hidden">
        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase animate-pulse shrink-0 z-10">LIVE</span>
        <div className="flex-1 overflow-hidden h-[20px] relative z-0">
            {items.map((item, index) => (
                <a 
                    key={index}
                    href={`https://www.youtube.com/watch?v=${item.id}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`absolute inset-0 flex items-center text-xs font-medium truncate transition-all duration-500 ease-in-out hover:text-red-300 hover:underline cursor-pointer pointer-events-auto ${index === currentIndex ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
                >
                    {item.title}
                </a>
            ))}
        </div>
    </div>
);

// Map Component
const RealMap = ({ data, onMarkerClick, selectedId, heatMapType }) => {
    const mapRef = useRef(null);
    const googleMapRef = useRef(null);
    const markersRef = useRef({}); 
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;

    const { min, max } = useMemo(() => {
        if (!data || data.length === 0) return { min: 0, max: 100 };
        const values = data.map(d => {
            if (heatMapType === 'rent') return d.rent_monthly;
            if (heatMapType === 'pop') return d.resident_pop;
            if (heatMapType === 'revenue') return d.revenue;
            return 0;
        });
        return { min: Math.min(...values), max: Math.max(...values) };
    }, [data, heatMapType]);

    useEffect(() => {
        (g => { var h, a, k, p = "The Google Maps JavaScript API", c = "google", l = "importLibrary", q = "__ib__", m = document, b = window; b = b[c] || (b[c] = {}); var d = b.maps || (b.maps = {}), r = new Set, e = new URLSearchParams, u = () => h || (h = new Promise(async (f, n) => { await (a = m.createElement("script")); e.set("libraries", [...r] + ""); for (k in g) e.set(k.replace(/[A-Z]/g, t => "_" + t.toLowerCase()), g[k]); e.set("callback", c + ".maps." + q); a.src = `https://maps.${c}apis.com/maps/api/js?` + e; d[q] = f; a.onerror = () => h = n(Error(p + " could not load.")); a.nonce = m.querySelector("script[nonce]")?.nonce || ""; m.head.append(a) })); d[l] ? console.warn(p + " only loads once. Ignoring:", g) : d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n)) })({
            key: apiKey, v: "beta",
        });

        const initMap = async () => {
            if (!mapRef.current) return;
            try {
                const { Map } = await window.google.maps.importLibrary("maps");
                if (!googleMapRef.current) {
                    googleMapRef.current = new Map(mapRef.current, {
                        center: { lat: 37.550, lng: 126.990 }, // Seoul Center
                        zoom: 11.5, // Fit Full Seoul
                        mapId: mapId,
                        disableDefaultUI: true,
                        gestureHandling: 'greedy',
                        backgroundColor: '#f8fafc',
                    });
                }
            } catch (error) { console.error("Error initializing map:", error); }
        };
        initMap();
    }, []);

    useEffect(() => {
        const updateMarkers = async () => {
            if (!googleMapRef.current) return;
            const { AdvancedMarkerElement } = await window.google.maps.importLibrary("marker");

            const currentIds = new Set(data.map(item => item.id));
            Object.keys(markersRef.current).forEach(id => {
                if (!currentIds.has(id)) {
                    markersRef.current[id].map = null;
                    delete markersRef.current[id];
                }
            });

            data.forEach(item => {
                const isSelected = selectedId === item.id;
                let val = 0;
                let valText = '';
                if (heatMapType === 'rent') { val = item.rent_monthly; valText = `${val}만`; }
                else if (heatMapType === 'pop') { val = item.resident_pop; valText = `${(val/10000).toFixed(1)}만`; }
                else if (heatMapType === 'revenue') { val = item.revenue; valText = val >= 10000 ? `${(val/10000).toFixed(1)}억` : `${val}만`; }

                const markerColor = getHeatmapColor(val, min, max);
                
                const content = document.createElement('div');
                content.className = `relative flex flex-col items-center transition-transform duration-300 cursor-pointer ${isSelected ? 'scale-125 z-[200]' : 'hover:scale-110 hover:z-[150]'}`;
                content.innerHTML = `
                    <div class="px-3 py-1.5 rounded-xl font-bold text-xs shadow-xl flex items-center gap-1 border border-white/20 backdrop-blur-sm text-white" style="background-color: ${isSelected ? '#0f172a' : markerColor}; box-shadow: 0 4px 12px ${markerColor}66;">
                        <span>${item.name}</span>
                        <span class="opacity-80 border-l border-white/30 pl-1 ml-1">${valText}</span>
                    </div>
                    <div class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] mt-[-1px]" style="border-top-color: ${isSelected ? '#0f172a' : markerColor};"></div>
                `;
                content.onclick = () => onMarkerClick(item);

                if (markersRef.current[item.id]) {
                    markersRef.current[item.id].content = content;
                    markersRef.current[item.id].zIndex = isSelected ? 200 : 1;
                } else {
                    const marker = new AdvancedMarkerElement({
                        map: googleMapRef.current,
                        position: { lat: item.lat, lng: item.lng },
                        content: content,
                        title: item.name,
                        zIndex: 1,
                    });
                    markersRef.current[item.id] = marker;
                }
            });
        };
        updateMarkers();
    }, [data, selectedId, heatMapType, min, max]);

    return <div ref={mapRef} className="w-full h-full rounded-2xl" />;
};

// --- MAIN APPLICATION ---
export default function SmartBizMap_Analysis() {
    const [step, setStep] = useState(1);
    const [cart, setCart] = useState([]);
    const [selectedRegion, setSelectedRegion] = useState(null);
    const [heatMapType, setHeatMapType] = useState('rent');
    const [budget, setBudget] = useState(15000);
    const [youtubeTrends, setYoutubeTrends] = useState(FALLBACK_TRENDS);
    const [realData, setRealData] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('외식업');
    const [selectedSubCategory, setSelectedSubCategory] = useState('카페/디저트');
    const [currentTrendIndex, setCurrentTrendIndex] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            const dongData = await loadAllData();
            const mergedData = Object.keys(DONG_COORDINATES).map((dongName, index) => {
                const coords = DONG_COORDINATES[dongName];
                const d = dongData[dongName] || { rent: 0, population: 0, openings: 0, revenue: 0 };
                
                const revenueScore = Math.min(100, Math.round((d.revenue / 500000) * 100)); // ~50억 max
                const compScore = Math.min(100, Math.round((d.population / 50000) * 100));

                return {
                    id: `dong-${index}`, name: dongName, 
                    lat: coords.lat, lng: coords.lng,
                    rent_monthly: d.rent,
                    resident_pop: d.population,
                    openings: d.openings, 
                    revenue: d.revenue, 
                    revenue_score: revenueScore,
                    competition_score: compScore,
                };
            });
            setRealData(mergedData);
            
            const videos = await fetchYouTubeTrending();
            if (videos && videos.length > 0) setYoutubeTrends(videos);
        };
        fetchData();
    }, []);
    
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTrendIndex((prev) => (prev + 1) % youtubeTrends.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [youtubeTrends]);

    const addToCart = (region) => { if (!cart.find(c => c.id === region.id)) setCart([...cart, region]); };
    const removeFromCart = (id) => setCart(cart.filter(c => c.id !== id));
    
    const filteredData = (realData.length > 0 ? realData : []).filter(r => {
        if (r.rent_monthly === 0) return true; 
        return (r.rent_monthly * 30) <= budget; 
    });

    const top3 = [...filteredData].sort((a, b) => b.revenue_score - a.revenue_score).slice(0, 3);

    // --- STEP 1: Map & Search (Bento Style Layout) ---
    const renderStep1 = () => (
        <div className="h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden flex flex-col">
            
            {/* Top Bar */}
            <header className="h-16 bg-white/80 backdrop-blur border-b border-slate-200 flex items-center px-6 shrink-0 z-20 sticky top-0 justify-between">
                <div className="flex items-center">
                    <PieChartIcon className="w-7 h-7 text-blue-600 mr-2" />
                    <span className="text-xl font-black text-slate-800 tracking-tight">Smart Biz-Map</span>
                </div>
                
                <div className="hidden md:flex bg-slate-100 rounded-full p-1 border border-slate-200">
                    <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold cursor-pointer transition-all ${step===1?'bg-white shadow-sm text-blue-600 border border-blue-100':'text-slate-400'}`} onClick={() => setStep(1)}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step===1?'bg-blue-600 text-white':'border border-slate-300'}`}>1</div>
                        탐색 & 필터
                    </div>
                    <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold cursor-pointer transition-all ${step===2?'bg-white shadow-sm text-blue-600 border border-blue-100':'text-slate-400'}`} onClick={() => setStep(2)}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step===2?'bg-blue-600 text-white':'border border-slate-300'}`}>2</div>
                        후보 비교
                    </div>
                    <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold cursor-pointer transition-all ${step===3?'bg-white shadow-sm text-blue-600 border border-blue-100':'text-slate-400'}`} onClick={() => setStep(3)}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step===3?'bg-blue-600 text-white':'border border-slate-300'}`}>3</div>
                        상세 분석
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        <User size={20} />
                    </div>
                </div>
            </header>

            {/* Main Layout: Bento Grid */}
            <div className="flex-1 p-6 grid grid-cols-12 gap-6 h-full max-h-[calc(100vh-4rem)]">
                
                {/* Left Sidebar (Filters) */}
                <div className="col-span-12 md:col-span-3 flex flex-col gap-6 h-full overflow-hidden">
                    <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200 p-6 flex-1 flex flex-col overflow-y-auto custom-scrollbar">
                        <Ticker items={youtubeTrends} currentIndex={currentTrendIndex} />
                        
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">나의 자본금</label>
                                    <span className="text-sm font-black text-blue-600">{(budget/10000).toFixed(1)}억원</span>
                                </div>
                                <input type="range" min="5000" max="100000" step="5000" value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">희망 업종</label>
                                <div className="relative">
                                    <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 font-bold appearance-none" value={selectedSubCategory} onChange={(e) => setSelectedSubCategory(e.target.value)}>
                                        {CATEGORIES[selectedCategory].map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">지도 보기 기준</label>
                                <div className="flex p-1 bg-slate-100 rounded-xl">
                                    {[{ id: 'rent', label: '임대료' }, { id: 'revenue', label: '매출' }, { id: 'pop', label: '유동인구' }].map(opt => (
                                        <button key={opt.id} onClick={() => setHeatMapType(opt.id)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${heatMapType === opt.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{opt.label}</button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Cart */}
                        <div className="mt-auto bg-slate-50 border border-slate-100 rounded-xl p-4 shadow-sm min-h-[150px] flex flex-col mt-6">
                            <div className="flex justify-between items-center text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">
                                <span>관심 후보군 (CART)</span>
                                <span className="bg-slate-200 text-slate-600 px-1.5 rounded">{cart.length}</span>
                            </div>
                            <div className="space-y-2 overflow-y-auto flex-1 custom-scroll pr-1 max-h-[120px]">
                                {cart.length === 0 ? <div className="text-center text-xs text-slate-400 py-4">지도의 핀을 클릭하세요</div> : 
                                    cart.map(item => (
                                        <div key={item.id} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-200 text-xs shadow-sm group hover:border-blue-200 transition-colors cursor-pointer" onClick={() => setSelectedRegion(item)}>
                                            <span className="text-slate-700 font-bold">{item.name}</span>
                                            <button onClick={(e) => { e.stopPropagation(); removeFromCart(item.id); }} className="text-slate-300 hover:text-red-500 transition"><X size={12} /></button>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>

                        <button 
                            className={`w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl text-sm font-bold transition shadow-lg shadow-blue-200 mt-4 flex items-center justify-center gap-2 ${cart.length < 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={cart.length < 1}
                            onClick={() => setStep(2)}
                        >
                            선택한 후보 비교하기 <ArrowRight size={16} />
                        </button>
                    </div>
                </div>

                {/* Right Main Map */}
                <div className="col-span-12 md:col-span-9 h-full relative rounded-[1.5rem] overflow-hidden shadow-sm border border-slate-200">
                    <RealMap
                        data={filteredData}
                        selectedId={selectedRegion?.id}
                        onMarkerClick={(item) => { setSelectedRegion(item); addToCart(item); }}
                        heatMapType={heatMapType}
                    />

                    {/* Overlay Card (Top Right) */}
                    {selectedRegion && (
                        <div className="absolute top-6 right-6 z-20 w-64 bg-white/90 backdrop-blur-xl border border-white/50 rounded-2xl shadow-2xl p-5 animate-fade-in transition-all">
                            <div className="mb-4 flex justify-between items-start">
                                <div>
                                    <h4 className="font-black text-lg text-slate-800">{selectedRegion.name}</h4>
                                    <p className="text-xs text-blue-600 font-bold">{selectedSubCategory}</p>
                                </div>
                                <button onClick={() => setSelectedRegion(null)} className="text-slate-400 hover:text-slate-600"><X size={16}/></button>
                            </div>
                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500 font-bold">평균 매출</span>
                                    <span className="font-bold text-slate-800">
                                        {selectedRegion.revenue >= 10000 ? `${(selectedRegion.revenue/10000).toFixed(1)}억` : `${selectedRegion.revenue.toLocaleString()}만원`}
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500 font-bold">임대료(평)</span>
                                    <span className="font-bold text-slate-800">{selectedRegion.rent_monthly.toLocaleString()}만원</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500 font-bold">유동인구</span>
                                    <span className="font-bold text-slate-800">{selectedRegion.resident_pop.toLocaleString()}명</span>
                                </div>
                            </div>
                            <button onClick={() => addToCart(selectedRegion)} className="w-full py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition">후보 담기</button>
                        </div>
                    )}

                    {/* Bottom Recommendations */}
                    <div className="absolute bottom-6 left-6 right-6 z-10 pointer-events-none flex justify-center">
                        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/60 p-3 pointer-events-auto flex gap-4 overflow-x-auto max-w-full">
                            {top3.map((d, i) => (
                                <div key={i} className="flex items-center gap-3 p-2 pr-4 rounded-xl hover:bg-blue-50 transition-colors cursor-pointer min-w-[180px] bg-white border border-slate-100" onClick={() => { setSelectedRegion(d); addToCart(d); }}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white shadow-sm ${i===0?'bg-yellow-400':i===1?'bg-slate-400':'bg-orange-600'}`}>{i+1}</div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-800">{d.name}</div>
                                        <div className="text-[10px] text-slate-500">매출 {(d.revenue/10000).toFixed(1)}억</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // --- STEP 2 & 3 (Reused Logic) ---
    const renderStep2 = () => (
        <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
             {/* Header Reuse */}
             <header className="h-16 bg-white/80 backdrop-blur border-b border-slate-200 flex items-center px-6 shrink-0 z-20 sticky top-0 justify-between">
                <div className="flex items-center cursor-pointer" onClick={() => setStep(1)}>
                    <PieChartIcon className="w-7 h-7 text-blue-600 mr-2" />
                    <span className="text-xl font-black text-slate-800 tracking-tight">Smart Biz-Map</span>
                </div>
                {/* Same Nav... */}
                <div className="hidden md:flex bg-slate-100 rounded-full p-1 border border-slate-200">
                    {[1,2,3].map(s => (
                        <div key={s} onClick={() => setStep(s)} className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold cursor-pointer transition-all ${step===s?'bg-white shadow-sm text-blue-600 border border-blue-100':'text-slate-400'}`}>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step===s?'bg-blue-600 text-white':'border border-slate-300'}`}>{s}</div>
                            {s===1?'탐색 & 필터':s===2?'후보 비교':'상세 분석'}
                        </div>
                    ))}
                </div>
                <div className="w-9 h-9"></div>
            </header>

             <div className="flex-1 overflow-y-auto p-8 z-10">
                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-white/60">
                        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <Activity className="text-blue-600" /> 경쟁 강도 vs 기대 수익 (Blue Ocean Matrix)
                        </h2>
                        <div className="h-[500px] relative">
                            {/* Quadrants */}
                            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 rounded-xl overflow-hidden border border-slate-100">
                                <div className="bg-red-50/30 border-r border-b border-slate-100 p-4 relative"><span className="absolute top-2 left-2 text-xs font-bold text-red-300 uppercase">Red Ocean</span></div>
                                <div className="bg-blue-50/10 border-b border-slate-100 p-4 relative"></div>
                                <div className="bg-blue-50/10 border-r border-slate-100 p-4 relative"></div>
                                <div className="bg-blue-50/30 p-4 relative"><span className="absolute bottom-2 right-2 text-xs font-bold text-blue-500 uppercase">Blue Ocean</span></div>
                            </div>
                            <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                    <XAxis type="number" dataKey="x" name="경쟁강도" label={{ value: '경쟁 강도', position: 'bottom', offset: 0, style: { fontSize: 12, fill: '#94a3b8' } }} domain={[0, 100]} />
                                    <YAxis type="number" dataKey="y" name="기대수익" label={{ value: '기대 수익', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#94a3b8' } }} domain={[0, 100]} />
                                    <ZAxis type="number" dataKey="z" range={[100, 100]} />
                                    <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const d = payload[0].payload;
                                            return (
                                                <div className="bg-white/90 backdrop-blur p-3 border border-slate-200 shadow-xl rounded-xl text-xs">
                                                    <div className="font-bold mb-1 text-slate-800">{d.name}</div>
                                                    <div className="text-slate-500">수익: {d.y} / 경쟁: {d.x}</div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }} />
                                    <Scatter name="Regions" data={cart.map(c => ({ ...c, x: c.competition_score, y: c.revenue_score, z: 100 }))}>
                                        {cart.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill='#2563eb' />
                                        ))}
                                    </Scatter>
                                </ScatterChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="text-center pt-4">
                        <button onClick={() => setStep(3)} className="px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1">상세 분석 보기 <ArrowRight className="inline ml-2" size={18}/></button>
                    </div>
                </div>
             </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
             {/* Header Reuse */}
             <header className="h-16 bg-white/80 backdrop-blur border-b border-slate-200 flex items-center px-6 shrink-0 z-20 sticky top-0 justify-between">
                <div className="flex items-center cursor-pointer" onClick={() => setStep(1)}>
                    <PieChartIcon className="w-7 h-7 text-blue-600 mr-2" />
                    <span className="text-xl font-black text-slate-800 tracking-tight">Smart Biz-Map</span>
                </div>
                {/* Same Nav... */}
                <div className="hidden md:flex bg-slate-100 rounded-full p-1 border border-slate-200">
                    {[1,2,3].map(s => (
                        <div key={s} onClick={() => setStep(s)} className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold cursor-pointer transition-all ${step===s?'bg-white shadow-sm text-blue-600 border border-blue-100':'text-slate-400'}`}>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step===s?'bg-blue-600 text-white':'border border-slate-300'}`}>{s}</div>
                            {s===1?'탐색 & 필터':s===2?'후보 비교':'상세 분석'}
                        </div>
                    ))}
                </div>
                <div className="w-9 h-9"></div>
            </header>

             <div className="flex-1 overflow-y-auto p-8 z-10">
                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-white/60">
                            <h3 className="font-bold text-slate-800 mb-4 text-sm">시간대별 매출 히트맵</h3>
                            <div className="aspect-square bg-blue-50/50 rounded-xl p-4 grid grid-cols-7 grid-rows-7 gap-1">
                                {Array.from({ length: 49 }).map((_, i) => (
                                    <div key={i} className={`rounded-sm ${i>20&&i<35&&i%7>2 ? 'bg-blue-600 shadow-sm' : 'bg-blue-200/50'}`} style={{ opacity: i>20&&i<35&&i%7>2 ? 1 : 0.2 + (Math.random()*0.5) }}></div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-white/60 flex flex-col">
                            <h3 className="font-bold text-slate-800 mb-4 text-sm">인구 구성 (성별/연령)</h3>
                            <div className="flex-1 min-h-[200px] relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={[{ name: 'Female 2030', value: 70 }, { name: 'Others', value: 30 }]} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" stroke="none">
                                            <Cell fill="#2563eb" /><Cell fill="#e2e8f0" />
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-3xl font-black text-blue-600">70%</span>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">2030 여성</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-white/60 flex flex-col">
                            <h3 className="font-bold text-slate-800 mb-4 text-sm">폐업률 추이 (3년)</h3>
                            <div className="flex-1 min-h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={[{year:'21', val:15}, {year:'22', val:12}, {year:'23', val:8}, {year:'24', val:5}]}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                                        <Bar dataKey="val" radius={[4, 4, 0, 0]} barSize={20} fill="#2563eb" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                    <div className="text-center pt-8 pb-20">
                        <button onClick={() => setStep(1)} className="px-10 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1">지도로 돌아가기</button>
                    </div>
                </div>
             </div>
        </div>
    );

    return (
        <div className="h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden selection:bg-blue-100">
            {step === 1 ? renderStep1() : step === 2 ? renderStep2() : renderStep3()}
        </div>
    );
}