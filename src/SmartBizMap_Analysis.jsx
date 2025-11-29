import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ScatterChart, Scatter, Cell, PieChart, Pie, Cell as PieCell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
    LineChart, Line
} from 'recharts';
import {
    Map as MapIcon, Search, X, Check, ArrowRight, User,
    TrendingUp, DollarSign, Users, Activity, PieChart as PieChartIcon,
    MapPin, Grid, Info, HelpCircle, Layers, Zap, Bell, ChevronDown
} from 'lucide-react';
import { fetchYouTubeTrending } from './utils/youtube';
import { loadAllData } from './utils/dataLoader';
import { DISTRICT_COORDINATES } from './data/districtCoordinates';

// --- CONSTANTS & DATA ---
const CATEGORIES = {
    '외식업': ['카페/디저트', '치킨/호프', '한식', '양식', '중식', '패스트푸드'],
    '서비스업': ['미용실', '네일아트', '피부관리', '세탁소', 'PC방', '노래방'],
    '소매업': ['편의점', '의류', '화장품', '슈퍼마켓', '꽃집']
};

const FALLBACK_TRENDS = [
    { title: "🔥 급상승: 저당 디저트, 무인 카페, 하이볼", id: "VIDEO_ID_1" }
];

// Interpolate color between Blue (#3b82f6) and Red (#ef4444) based on value
const getHeatmapColor = (value, min, max) => {
    if (value === undefined || isNaN(value)) return '#cbd5e1'; // Slate 300
    const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
    
    // Simple RGB interpolation
    const r = Math.round(59 + (239 - 59) * ratio);
    const g = Math.round(130 + (68 - 130) * ratio);
    const b = Math.round(246 + (68 - 246) * ratio);
    
    return `rgb(${r}, ${g}, ${b})`;
};

// --- NEW UI COMPONENTS ---

// 1. Floating Capsule Header
const HeaderPill = ({ step, setStep }) => (
  <header className="absolute top-6 left-1/2 transform -translate-x-1/2 z-50">
    <div className="bg-white/95 backdrop-blur-md shadow-lg rounded-full px-6 py-3 flex items-center gap-8 border border-white/50">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => setStep(1)}>
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">B</div>
        <span className="font-bold text-slate-800 text-lg tracking-tight">Smart Biz-Map</span>
      </div>
      
      <div className="h-6 w-px bg-slate-200 mx-2"></div>
      
      <div className="flex items-center gap-2 text-sm">
        <div 
            onClick={() => setStep(1)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-semibold cursor-pointer transition-all ${step === 1 ? 'bg-blue-50 text-blue-700' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <span className={`w-5 h-5 flex items-center justify-center rounded-full text-xs ${step === 1 ? 'bg-blue-600 text-white' : 'border border-slate-300'}`}>1</span>
          <span>탐색 & 필터</span>
        </div>
        <div className="w-8 h-px bg-slate-300"></div>
        <div 
            onClick={() => setStep(2)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-semibold cursor-pointer transition-all ${step === 2 ? 'bg-blue-50 text-blue-700' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <span className={`w-5 h-5 flex items-center justify-center rounded-full text-xs ${step === 2 ? 'bg-blue-600 text-white' : 'border border-slate-300'}`}>2</span>
          <span>후보 비교</span>
        </div>
        <div className="w-8 h-px bg-slate-300"></div>
        <div 
            onClick={() => setStep(3)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-semibold cursor-pointer transition-all ${step === 3 ? 'bg-blue-50 text-blue-700' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <span className={`w-5 h-5 flex items-center justify-center rounded-full text-xs ${step === 3 ? 'bg-blue-600 text-white' : 'border border-slate-300'}`}>3</span>
          <span>상세 분석</span>
        </div>
      </div>
      
      <div className="ml-4 pl-4 border-l border-slate-200">
        <button className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 relative">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>
      </div>
    </div>
  </header>
);

// 2. Live Trend Ticker Component
const LiveTicker = ({ trends, currentIndex }) => (
    <div className="relative z-20 bg-white/50 border border-slate-100 px-3 py-2 rounded-xl flex items-center gap-2 shadow-sm overflow-hidden mb-6">
        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 z-30 animate-pulse">Live</span>
        <div className="flex-1 overflow-hidden h-[20px] relative z-20">
            {trends.map((trend, index) => (
                <a 
                    key={index}
                    href={`https://www.youtube.com/watch?v=${trend.id}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`absolute inset-0 flex items-center text-[11px] font-medium truncate transition-all duration-500 ease-in-out hover:text-red-600 hover:underline cursor-pointer pointer-events-auto ${index === currentIndex ? 'translate-y-0 opacity-100 z-30' : 'translate-y-full opacity-0 z-0 pointer-events-none'}`}
                >
                    {trend.title}
                </a>
            ))}
        </div>
    </div>
);

// --- MAP COMPONENT ---
const RealMap = ({ data, onMarkerClick, selectedId, heatMapType }) => {
    const mapRef = useRef(null);
    const googleMapRef = useRef(null);
    const markersRef = useRef({}); // Object for ID tracking
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;

    // Calculate Min/Max for the current metric to drive colors
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
                        center: { lat: 37.5665, lng: 126.9780 },
                        zoom: 11,
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

    // Optimized Marker Update
    useEffect(() => {
        const updateMarkers = async () => {
            if (!googleMapRef.current) return;
            const { AdvancedMarkerElement } = await window.google.maps.importLibrary("marker");

            const currentIds = new Set(data.map(item => item.id));

            // 1. Remove markers that are no longer in data
            Object.keys(markersRef.current).forEach(id => {
                if (!currentIds.has(id)) {
                    markersRef.current[id].map = null;
                    delete markersRef.current[id];
                }
            });

            // 2. Update or Create markers
            data.forEach(item => {
                const isSelected = selectedId === item.id;
                let val = 0;
                let valText = '';
                if (heatMapType === 'rent') { val = item.rent_monthly; valText = `${val}만/평`; }
                else if (heatMapType === 'pop') { val = item.resident_pop; valText = `${(val/10000).toFixed(1)}만명`; }
                else if (heatMapType === 'revenue') { val = item.revenue; valText = `${(val/10000).toFixed(1)}억원`; }

                const markerColor = getHeatmapColor(val, min, max);

                // Create content DOM
                const content = document.createElement('div');
                content.className = `relative flex flex-col items-center transition-transform duration-300 cursor-pointer ${isSelected ? 'scale-110 -translate-y-2 z-50' : 'z-10 hover:z-50 hover:scale-105'}`;
                content.innerHTML = `
                    <div class="px-3 py-1.5 rounded-xl font-bold text-sm shadow-xl flex items-center gap-1.5 border border-white/20 backdrop-blur-sm text-white" style="background-color: ${isSelected ? '#0f172a' : markerColor}; box-shadow: 0 4px 12px ${markerColor}66;">
                        ${isSelected ? '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>' : ''}
                        <span>${valText}</span>
                    </div>
                    <div class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] mt-[-1px]" style="border-top-color: ${isSelected ? '#0f172a' : markerColor};"></div>
                `;
                content.onclick = () => onMarkerClick(item);

                if (markersRef.current[item.id]) {
                    // Update existing marker content
                    markersRef.current[item.id].content = content;
                    markersRef.current[item.id].zIndex = isSelected ? 100 : 1;
                } else {
                    // Create new marker
                    const marker = new AdvancedMarkerElement({
                        map: googleMapRef.current,
                        position: { lat: item.lat, lng: item.lng },
                        content: content,
                        title: item.name,
                    });
                    markersRef.current[item.id] = marker;
                }
            });
        };
        
        updateMarkers();
    }, [data, selectedId, heatMapType, min, max]);

    return <div ref={mapRef} className="w-full h-full" />;
};

// --- MAIN APPLICATION ---
export default function SmartBizMap() {
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
            const { rent, population, openings, revenue } = await loadAllData();
            const mergedData = Object.keys(DISTRICT_COORDINATES).map((district, index) => {
                const coords = DISTRICT_COORDINATES[district];
                const rentVal = rent[district] || 0; 
                const popVal = population[district] || 0;
                const openingsVal = openings[district] || 0;
                const revenueVal = revenue[district] || 0; 

                const revenueScore = Math.min(100, Math.round((revenueVal / 50000000) * 100));
                const compScore = Math.min(100, Math.round((popVal / 500000) * 100));

                return {
                    id: `real-${index}`, name: district, category: '종합 상권',
                    lat: coords.lat, lng: coords.lng,
                    rent_monthly: rentVal,
                    resident_pop: popVal,
                    openings: openingsVal, 
                    revenue: revenueVal, 
                    revenue_score: revenueScore,
                    competition_score: compScore,
                    trend_history: [60, 65, 70, 72, 75, 80],
                    blue_ocean: {
                        x: Math.floor(Math.random() * 100), 
                        y: Math.floor(Math.random() * 100)
                    }
                };
            });
            setRealData(mergedData);
            
            const videos = await fetchYouTubeTrending();
            if (videos && videos.length > 0) {
                setYoutubeTrends(videos);
            }
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
    const filteredData = (realData.length > 0 ? realData : []).filter(r => (r.rent_monthly * 500) <= budget);

    const renderStep1 = () => (
        <div className="relative h-screen w-full bg-slate-50 font-sans text-slate-800 overflow-hidden">
            {/* 1. Floating Header */}
            <HeaderPill step={step} setStep={setStep} />

            {/* 2. Main Map Background */}
            <div className="absolute inset-0 z-0">
                 <RealMap
                    data={filteredData}
                    selectedId={selectedRegion?.id}
                    onMarkerClick={(item) => { setSelectedRegion(item); addToCart(item); }}
                    heatMapType={heatMapType}
                />
            </div>

            {/* 3. Floating Left Panel (Glassmorphism) */}
            <div className="absolute top-24 left-8 bottom-8 w-[360px] flex flex-col gap-4 z-40 pointer-events-none">
                
                {/* Card 1: Search & Filter (Changed: flex-1 -> shrink-0) */}
                <div className="shrink-0 bg-white/85 backdrop-blur-md rounded-[2rem] p-6 shadow-2xl border border-white/60 pointer-events-auto overflow-y-auto custom-scrollbar flex flex-col transition-transform hover:scale-[1.01] duration-300">
                    <h2 className="text-xl font-bold mb-1 flex items-center gap-2 text-slate-800">
                        탐색 필터
                        <Info size={16} className="text-slate-400 cursor-help" />
                    </h2>
                    <p className="text-sm text-slate-500 mb-6">원하는 조건으로 상권을 검색하세요</p>
                    
                    <LiveTicker trends={youtubeTrends} currentIndex={currentTrendIndex} />

                    <div className="space-y-6">
                        {/* Industry */}
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">희망 업종</label>
                            <div className="relative">
                                <select
                                    className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none shadow-sm hover:border-blue-300 transition-colors"
                                    value={selectedSubCategory}
                                    onChange={(e) => setSelectedSubCategory(e.target.value)}
                                >
                                    {CATEGORIES[selectedCategory].map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <ChevronDown className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" size={16} />
                            </div>
                        </div>

                        {/* Capital Slider */}
                        <div>
                            <div className="flex justify-between items-end mb-4">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">나의 자본금</label>
                                <span className="text-xl font-bold text-blue-600">{(budget / 10000).toFixed(1)}억 원</span>
                            </div>
                            <input
                                type="range" min="5000" max="100000" step="5000" value={budget}
                                onChange={(e) => setBudget(Number(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                        </div>

                        {/* Heatmap Type */}
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">지도 보기 기준</label>
                            <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl">
                                {[
                                    { id: 'rent', label: '임대료', icon: DollarSign },
                                    { id: 'revenue', label: '매출', icon: TrendingUp },
                                    { id: 'pop', label: '유동인구', icon: Users }
                                ].map(opt => {
                                    const Icon = opt.icon; 
                                    return (
                                    <button
                                        key={opt.id}
                                        onClick={() => setHeatMapType(opt.id)}
                                        className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg transition-all ${heatMapType === opt.id ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-slate-500 hover:bg-white/50'}`}
                                    >
                                        <Icon size={16} strokeWidth={heatMapType === opt.id ? 2.5 : 2} />
                                        <span className="text-[10px]">{opt.label}</span>
                                    </button>
                                )})}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Card 2: Cart & CTA (Changed: flex-1 to fill space) */}
                <div className="flex-1 min-h-0 flex flex-col bg-white/85 backdrop-blur-md rounded-[2rem] p-6 shadow-2xl border border-white/60 pointer-events-auto transition-transform hover:scale-[1.01] duration-300">
                    <div className="flex justify-between items-center mb-4 shrink-0">
                        <div className="flex items-center gap-2">
                            <span className="bg-blue-100 text-blue-600 p-1.5 rounded-lg"><Layers size={16} /></span>
                            <span className="font-bold text-sm">관심 후보군</span>
                        </div>
                        <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{cart.length}</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scroll pr-1 space-y-2 mb-5">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl min-h-[100px]">
                                <MapPin size={24} className="mb-2 opacity-50" />
                                <span className="text-xs font-medium">지도에서 핀을 선택해보세요</span>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.id} className="flex justify-between items-center text-sm p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                                    <span className="font-medium text-xs">{item.name}</span>
                                    <button onClick={() => removeFromCart(item.id)} className="text-slate-300 hover:text-red-400"><X size={14} /></button>
                                </div>
                            ))
                        )}
                    </div>

                    <button 
                        className={`
                            shrink-0 w-full py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 group transition-all duration-300
                            ${cart.length < 1 
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5'
                            }
                        `}
                        disabled={cart.length < 1}
                        onClick={() => setStep(2)}
                    >
                        선택한 후보 비교하기
                        <ArrowRight size={18} className={`transition-transform ${cart.length >= 1 ? 'group-hover:translate-x-1' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Floating Controls Right */}
            <div className="absolute right-8 bottom-8 flex flex-col gap-3 pointer-events-auto z-40">
                <button className="w-14 h-14 bg-white/90 backdrop-blur rounded-2xl shadow-xl flex items-center justify-center text-slate-600 hover:text-blue-600 hover:scale-105 transition-all border border-white/50 group">
                    <MapPin size={24} className="group-hover:animate-bounce" />
                </button>
                <button className="w-14 h-14 bg-white/90 backdrop-blur rounded-2xl shadow-xl flex items-center justify-center text-slate-600 hover:text-blue-600 hover:scale-105 transition-all border border-white/50">
                    <Layers size={24} />
                </button>
            </div>
        </div>
    );

    const renderAnalytics = () => (
        <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
             {/* Background Decoration */}
             <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-blue-600 to-slate-50 opacity-10 pointer-events-none"></div>

             <HeaderPill step={step} setStep={setStep} />
             
             <div className="flex-1 flex flex-col items-center justify-center p-8 z-10">
                <div className="bg-white rounded-[2.5rem] p-12 shadow-2xl text-center max-w-2xl border border-white/60">
                    <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <Activity size={40} />
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 mb-3">상세 분석 & 비교</h2>
                    <p className="text-slate-500 mb-8 leading-relaxed">
                        선택하신 <span className="font-bold text-blue-600">{cart.length}개 후보지</span>에 대한 상세 데이터를 분석 중입니다.<br/>
                        예상 매출, 유동 인구, 경쟁 점포 현황을 비교 리포트로 제공합니다.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 mb-8">
                         {cart.map(c => (
                             <div key={c.id} className="bg-slate-50 p-4 rounded-2xl text-left border border-slate-100">
                                 <div className="font-bold text-slate-800">{c.name}</div>
                                 <div className="text-xs text-slate-500 mt-1">예상 매출: {(c.revenue/100000000).toFixed(1)}억</div>
                             </div>
                         ))}
                    </div>

                    <button 
                        onClick={() => setStep(1)} 
                        className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg hover:shadow-xl"
                    >
                        지도로 돌아가기
                    </button>
                </div>
             </div>
        </div>
    );

    return (
        <div className="h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden">
            {step === 1 ? renderStep1() : renderAnalytics()}
        </div>
    );
}
