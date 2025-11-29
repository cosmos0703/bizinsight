import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ScatterChart, Scatter, Cell, PieChart, Pie, Cell as PieCell, LineChart, Line
} from 'recharts';
import {
    Map as MapIcon, Search, X, Check, ArrowRight, User,
    TrendingUp, PieChart as PieChartIcon, Info, HelpCircle
} from 'lucide-react';
import { fetchYouTubeTrending } from '../utils/youtube';
import { loadAllData } from '../utils/dataLoader';
import { DISTRICT_COORDINATES } from '../data/districtCoordinates';

// --- CONSTANTS & DATA ---
const CATEGORIES = {
    '외식업': ['카페/디저트', '치킨/호프', '한식', '양식', '중식', '패스트푸드'],
    '서비스업': ['미용실', '네일아트', '피부관리', '세탁소', 'PC방', '노래방'],
    '소매업': ['편의점', '의류', '화장품', '슈퍼마켓', '꽃집']
};

// Fallback if API fails
const FALLBACK_TRENDS = [
    { title: "🔥 급상승: 저당 디저트, 무인 카페, 하이볼", id: "VIDEO_ID_1" }
];

// Interpolate color between Blue (#3b82f6) and Red (#ef4444) based on value
const getHeatmapColor = (value, min, max) => {
    if (value === undefined || isNaN(value)) return '#cbd5e1'; // Slate 300
    const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
    
    // Simple RGB interpolation
    // Blue: 59, 130, 246
    // Red: 239, 68, 68
    const r = Math.round(59 + (239 - 59) * ratio);
    const g = Math.round(130 + (68 - 130) * ratio);
    const b = Math.round(246 + (68 - 246) * ratio);
    
    return `rgb(${r}, ${g}, ${b})`;
};

// --- UI COMPONENTS ---
const StepIndicator = ({ step, currentStep, label }) => {
    const isActive = currentStep === step;
    const isCompleted = currentStep > step;

    let baseClass = "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all duration-300";
    if (isActive) baseClass += " bg-white shadow-sm text-blue-600 border border-blue-100";
    else if (isCompleted) baseClass += " text-blue-600 opacity-60";
    else baseClass += " text-slate-400";

    return (
        <div className={baseClass}>
            <div className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] border ${isActive || isCompleted ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 text-slate-400'}`}>
                {isCompleted ? <Check size={12} /> : step}
            </div>
            {label}
        </div>
    );
};

// --- MAP COMPONENT ---
const RealMap = ({ data, onMarkerClick, selectedId, heatMapType }) => {
    const mapRef = useRef(null);
    const googleMapRef = useRef(null);
    const markersRef = useRef([]);
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;

    // Calculate Min/Max for the current metric to drive colors
    const { min, max } = useMemo(() => {
        if (!data || data.length === 0) return { min: 0, max: 100 };
        const values = data.map(d => {
            if (heatMapType === 'rent') return d.rent_monthly;
            if (heatMapType === 'pop') return d.resident_pop;
            if (heatMapType === 'revenue') return d.revenue; // Using Real Revenue
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
                const { AdvancedMarkerElement } = await window.google.maps.importLibrary("marker");

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
                updateMarkers(AdvancedMarkerElement);
            } catch (error) { console.error("Error initializing map:", error); }
        };
        initMap();
    }, []);

    const updateMarkers = (AdvancedMarkerElement) => {
        if (!googleMapRef.current || !AdvancedMarkerElement) return;
        markersRef.current.forEach(marker => marker.map = null);
        markersRef.current = [];

        data.forEach(item => {
            const isSelected = selectedId === item.id;
            
            // Determine Value and Color
            let val = 0;
            if (heatMapType === 'rent') val = item.rent_monthly;
            else if (heatMapType === 'pop') val = item.resident_pop;
            else if (heatMapType === 'revenue') val = item.revenue; // Real Revenue

            const markerColor = getHeatmapColor(val, min, max);

            const content = document.createElement('div');
            content.className = `flex items-center justify-center w-10 h-10 rounded-full border-[3px] shadow-lg transition-all duration-300 cursor-pointer ${isSelected ? 'scale-125 z-50' : 'bg-white/90 backdrop-blur z-10 hover:scale-110'}`;
            
            // Dynamic styling
            content.style.backgroundColor = isSelected ? '#0f172a' : markerColor; // Dark slate if selected, else heatmap color
            content.style.borderColor = '#fff';
            
            // Icon or Value inside marker
            // If selected, show check. If not, show a simple dot or nothing to keep it clean, utilizing the color.
            content.innerHTML = isSelected 
                ? `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
                : `<div style="width: 8px; height: 8px; background-color: white; border-radius: 50%; opacity: 0.8;"></div>`;

            content.onclick = () => onMarkerClick(item);

            const marker = new AdvancedMarkerElement({
                map: googleMapRef.current,
                position: { lat: item.lat, lng: item.lng },
                content: content,
                title: item.name,
            });
            markersRef.current.push(marker);
        });
    };

    useEffect(() => {
        const refresh = async () => {
            if (window.google && window.google.maps && googleMapRef.current) {
                const { AdvancedMarkerElement } = await window.google.maps.importLibrary("marker");
                updateMarkers(AdvancedMarkerElement);
            }
        };
        refresh();
    }, [selectedId, data, heatMapType, min, max]); // Depend on min/max to refresh colors

    return <div ref={mapRef} className="w-full h-full rounded-3xl" />;
};

// --- MAIN DASHBOARD ---
export default function SeoulFranchiseDashboard() {
    const [step, setStep] = useState(1);
    const [cart, setCart] = useState([]);
    const [selectedRegion, setSelectedRegion] = useState(null);
    const [heatMapType, setHeatMapType] = useState('rent');
    const [budget, setBudget] = useState(15000);
    const [youtubeTrends, setYoutubeTrends] = useState(FALLBACK_TRENDS);
    const [realData, setRealData] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('외식업');
    const [selectedSubCategory, setSelectedSubCategory] = useState('카페/디저트');
    
    // Auto-cycle for ticker
    const [currentTrendIndex, setCurrentTrendIndex] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            const { rent, population, openings, revenue } = await loadAllData();
            
            const mergedData = Object.keys(DISTRICT_COORDINATES).map((district, index) => {
                const coords = DISTRICT_COORDINATES[district];
                const rentVal = rent[district] || 0; // Man-won per Pyeong
                const popVal = population[district] || 0;
                const openingsVal = openings[district] || 0;
                const revenueVal = revenue[district] || 0; // Total Sales (Man-won)

                // Scores for internal logic (0-100)
                // Use Revenue instead of Openings for revenue score
                const revenueScore = Math.min(100, Math.round((revenueVal / 50000000) * 100)); // Rough normalization
                const compScore = Math.min(100, Math.round((popVal / 500000) * 100));

                return {
                    id: `real-${index}`, 
                    name: district, 
                    category: '종합 상권',
                    lat: coords.lat, 
                    lng: coords.lng,
                    rent_monthly: rentVal,
                    resident_pop: popVal,
                    openings: openingsVal, 
                    revenue: revenueVal, // Added Revenue Field
                    revenue_score: revenueScore,
                    competition_score: compScore,
                    // Mock data for things we don't have in CSV yet
                    trend_history: [60, 65, 70, 72, 75, 80],
                    blue_ocean: { 
                        x: Math.floor(Math.random() * 80) + 10, 
                        y: Math.floor(Math.random() * 80) + 10 
                    },
                    keywords: ['#핫플레이스', '#주말데이트', '#오피스상권']
                };
            });
            setRealData(mergedData);
            
            // Fetch real trends
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
    const filteredData = (realData.length > 0 ? realData : []).filter(r => (r.rent_monthly * 500) <= budget); // Approx deposit check

    // --- RENDERERS ---

    const renderHeader = () => (
        <header className="h-[60px] bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-50">
            <div className="flex items-center gap-2 text-blue-600 font-black text-xl tracking-tight cursor-pointer" onClick={() => setStep(1)}>
                <PieChartIcon size={24} />
                Smart Biz-Map
            </div>
            <div className="flex gap-1">
                <StepIndicator step={1} currentStep={step} label="탐색 & 필터" />
                <StepIndicator step={2} currentStep={step} label="후보 비교" />
                <StepIndicator step={3} currentStep={step} label="상세 분석" />
            </div>
            <div>
                <User size={24} className="text-slate-400" />
            </div>
        </header>
    );

    const renderStep1 = () => (
        <div className="flex h-full w-full bg-slate-900 p-6 gap-6">
            {/* Sidebar - Floating Card */}
            <div className="w-[280px] bg-white rounded-2xl shadow-2xl flex flex-col p-5 gap-5 shrink-0 overflow-y-auto">
                {/* Trend Ticker */}
                <div className="relative z-20 bg-slate-900 text-white px-3 py-2 rounded-lg flex items-center gap-2 shadow-md overflow-hidden">
                    <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 z-30">Live</span>
                    <div className="flex-1 overflow-hidden h-[20px] relative z-20">
                        {youtubeTrends.map((trend, index) => (
                            <a 
                                key={index}
                                href={`https://www.youtube.com/watch?v=${trend.id}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={`absolute inset-0 flex items-center text-[11px] truncate transition-all duration-500 ease-in-out hover:text-red-300 hover:underline cursor-pointer pointer-events-auto ${index === currentTrendIndex ? 'translate-y-0 opacity-100 z-30' : 'translate-y-full opacity-0 z-0 pointer-events-none'}`}
                            >
                                {trend.title}
                            </a>
                        ))}
                    </div>
                </div>

                {/* Capital Input */}
                <div className="flex flex-col gap-2">
                    <div className="text-xs font-bold text-slate-600">나의 자본금</div>
                    <input
                        type="range" min="5000" max="100000" step="5000" value={budget}
                        onChange={(e) => setBudget(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="text-right text-sm font-bold text-blue-600">{(budget / 10000).toFixed(0)}억 {((budget % 10000) / 1000).toFixed(0)}천만원</div>
                </div>

                {/* Industry Selection */}
                <div className="flex flex-col gap-2">
                    <div className="text-xs font-bold text-slate-600">희망 업종</div>
                    <select
                        className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-blue-500 bg-white"
                        value={selectedSubCategory}
                        onChange={(e) => setSelectedSubCategory(e.target.value)}
                    >
                        {CATEGORIES[selectedCategory].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                {/* Heatmap Type */}
                <div className="flex flex-col gap-2">
                    <div className="text-xs font-bold text-slate-600">지도 보기 기준 (HEATMAP)</div>
                    <div className="flex gap-1.5">
                        {[
                            { id: 'rent', label: '임대료' },
                            { id: 'revenue', label: '매출' },
                            { id: 'pop', label: '유동인구' }
                        ].map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => setHeatMapType(opt.id)}
                                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${heatMapType === opt.id
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Cart */}
                <div className="mt-2 p-3 bg-slate-50 rounded-lg">
                    <div className="text-xs font-bold text-slate-600 mb-2">관심 후보군 (CART)</div>
                    <div className="space-y-1.5">
                        {cart.length === 0 ? (
                            <div className="text-xs text-slate-400 text-center py-2">지도에서 지역을 선택하세요</div>
                        ) : (
                            cart.map(item => (
                                <div key={item.id} className="flex justify-between items-center bg-white p-2 rounded border border-slate-200 shadow-sm text-xs">
                                    <span className="text-slate-700">{item.name} ({selectedSubCategory})</span>
                                    <X size={14} className="text-red-400 cursor-pointer hover:text-red-600" onClick={() => removeFromCart(item.id)} />
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Action Button */}
                <button
                    className="mt-auto w-full bg-blue-600 text-white py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={cart.length < 1}
                    onClick={() => setStep(2)}
                >
                    선택한 후보 비교하기 <ArrowRight size={16} />
                </button>
            </div>

            {/* Map Area - Floating Card */}
            <div className="flex-1 relative bg-white rounded-2xl shadow-2xl overflow-hidden">
                <RealMap
                    data={filteredData}
                    selectedId={selectedRegion?.id}
                    onMarkerClick={(item) => { setSelectedRegion(item); addToCart(item); }}
                    heatMapType={heatMapType}
                />

                {/* Map Overlay Card */}
                {selectedRegion && (
                    <div className="absolute top-5 right-5 w-56 bg-white rounded-xl shadow-xl border border-slate-100 p-4 z-10 animate-in fade-in slide-in-from-top-2">
                        <h4 className="font-black text-base text-slate-800 mb-0.5">{selectedRegion.name}</h4>
                        <p className="text-xs text-slate-500 font-medium mb-3">{selectedSubCategory}</p>

                        <div className="space-y-1.5 mb-3">
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-500">분기 총 매출</span>
                                <span className="font-bold text-slate-800">{(selectedRegion.revenue).toLocaleString()}만원</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-500">임대료(평)</span>
                                <span className="font-bold text-slate-800">{selectedRegion.rent_monthly.toLocaleString()}만원</span>
                            </div>
                        </div>
                        <button
                            onClick={() => addToCart(selectedRegion)}
                            className="w-full py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
                        >
                            후보 담기
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    const renderAnalytics = () => {
        const data = selectedRegion || cart[0] || MOCK_REGION_DATA[0];

        // Prepare Scatter Data (Blue Ocean)
        const scatterData = cart.length > 0 ? cart.map(c => ({
            x: c.blue_ocean?.x || 50,
            y: c.blue_ocean?.y || 50,
            z: 100,
            name: c.name
        })) : [{ x: 80, y: 30, z: 100, name: '연남동' }, { x: 20, y: 80, z: 100, name: '역삼1동' }];

        // Mock Data for Charts
        const trendData = [
            { name: 'Jan', active: 4000, compare: 2400 },
            { name: 'Feb', active: 3000, compare: 1398 },
            { name: 'Mar', active: 2000, compare: 9800 },
            { name: 'Apr', active: 2780, compare: 3908 },
            { name: 'May', active: 1890, compare: 4800 },
            { name: 'Jun', active: 2390, compare: 3800 },
        ];
        
        // Corrected Trend Data to match "Rising" curve
        const trendDataFixed = [
            { name: '1', active: 65, compare: 70 },
            { name: '2', active: 68, compare: 68 },
            { name: '3', active: 75, compare: 65 },
            { name: '4', active: 85, compare: 62 },
            { name: '5', active: 95, compare: 60 },
        ];

        const populationData = [
            { name: '2030 Female', value: 70, fill: '#2563eb' },
            { name: 'Others', value: 30, fill: '#e2e8f0' },
        ];

        const closureData = [
            { name: '2021', rate: 15 },
            { name: '2022', rate: 12 },
            { name: '2023', rate: 8 },
            { name: '2024', rate: 5 },
        ];

        // Step 3 View
        if (step === 3) {
            return (
                <div className="flex-1 h-full overflow-y-auto bg-slate-50 p-8">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex items-center gap-2 mb-6">
                             <button onClick={() => setStep(2)} className="text-slate-400 hover:text-slate-600 font-bold flex items-center gap-1">
                                <ArrowRight className="rotate-180" size={16}/> Back
                             </button>
                             <h2 className="text-2xl font-bold text-slate-800">상세 분석 리포트: <span className="text-blue-600">{data.name}</span></h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* 1. Hourly Heatmap */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                                <div className="font-bold text-slate-800 mb-4">시간대별 매출 히트맵</div>
                                <div className="aspect-square bg-blue-50/50 rounded-lg p-4 grid grid-cols-7 grid-rows-7 gap-1">
                                    {Array.from({ length: 49 }).map((_, i) => {
                                        // Mock heatmap pattern
                                        const intensity = Math.random(); 
                                        const isHigh = i > 20 && i < 35 && (i % 7 > 2);
                                        return (
                                            <div 
                                                key={i} 
                                                className={`rounded-sm transition-all hover:scale-110 ${isHigh ? 'bg-blue-600 shadow-sm' : 'bg-blue-100/50'}`}
                                                style={{ opacity: isHigh ? 1 : 0.3 + (Math.random() * 0.4) }}
                                            ></div>
                                        );
                                    })}
                                </div>
                                <div className="mt-4 flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded">
                                    <Info size={14} className="text-blue-500"/>
                                    <strong>Insight:</strong> 주말 오후 2~5시 매출 집중
                                </div>
                            </div>

                            {/* 2. Population Donut */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col">
                                <div className="font-bold text-slate-800 mb-4">인구 구성 (상주 vs 유동)</div>
                                <div className="flex-1 min-h-[200px] relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={populationData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                startAngle={180}
                                                endAngle={-180}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {populationData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="text-center">
                                            <div className="text-3xl font-black text-blue-600">70%</div>
                                            <div className="text-xs text-slate-400 font-bold uppercase">Female</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-center mt-4 text-sm bg-blue-50 text-blue-800 py-2 rounded-lg font-medium">
                                    <span className="font-bold">2030 여성</span> 비율이 압도적
                                </div>
                            </div>

                            {/* 3. Closure Rate Bar */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col">
                                <div className="font-bold text-slate-800 mb-4">폐업률 추이 (3년)</div>
                                <div className="flex-1 min-h-[200px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={closureData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                                            <Tooltip 
                                                cursor={{fill: '#f8fafc'}}
                                                contentStyle={{border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                                            />
                                            <Bar dataKey="rate" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={30}>
                                                {closureData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={index === closureData.length - 1 ? '#3b82f6' : '#cbd5e1'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <p className="mt-4 text-xs text-slate-500 text-center">최근 1년간 폐업률 감소 추세 (안정화)</p>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // Step 2 View
        return (
            <div className="flex-1 h-full overflow-y-auto bg-slate-50 p-8">
                <div className="max-w-6xl mx-auto grid grid-cols-12 gap-6">

                    {/* 1. Blue Ocean Matrix */}
                    <div className="col-span-12 lg:col-span-8 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                        <div className="font-bold text-slate-800 mb-4 text-lg">경쟁 강도 vs 기대 수익 (Blue Ocean Matrix)</div>
                        <div className="h-[400px] relative">
                            {/* Background Quadrants */}
                            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 rounded-lg overflow-hidden border border-slate-100">
                                <div className="bg-red-50/30 border-r border-b border-slate-100 relative p-3">
                                    <span className="text-sm font-bold text-red-400">Red Ocean</span>
                                    <p className="text-[10px] text-red-300">경쟁 치열 / 수익 낮음</p>
                                </div>
                                <div className="bg-blue-50/30 border-b border-slate-100 relative p-3 text-right">
                                    <span className="text-sm font-bold text-blue-500">Blue Ocean</span>
                                    <p className="text-[10px] text-blue-300">경쟁 낮음 / 수익 높음</p>
                                </div>
                                <div className="border-r border-slate-100"></div>
                                <div></div>
                            </div>
                            <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                    <XAxis type="number" dataKey="x" name="경쟁강도" hide domain={[0, 100]} />
                                    <YAxis type="number" dataKey="y" name="기대수익" hide domain={[0, 100]} />
                                    <Tooltip 
                                        cursor={{ strokeDasharray: '3 3' }} 
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const d = payload[0].payload;
                                                return (
                                                    <div className="bg-white p-2 border border-slate-200 shadow-lg rounded text-xs">
                                                        <div className="font-bold mb-1">{d.name}</div>
                                                        <div>경쟁: {d.x}, 수익: {d.y}</div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Scatter name="Regions" data={scatterData}>
                                        {scatterData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.x < 50 && entry.y > 50 ? '#3b82f6' : '#ef4444'} />
                                        ))}
                                    </Scatter>
                                </ScatterChart>
                            </ResponsiveContainer>
                            {/* Labels for Axes */}
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-slate-400">기대 수익 (매출 + 유동인구)</div>
                            <div className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] text-slate-400 origin-left">경쟁 강도 (폐업률 + 점포수)</div>
                        </div>
                    </div>

                    {/* 2. Trend & Keywords */}
                    <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                        {/* Trend Chart */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex-1 min-h-[250px] flex flex-col">
                            <div className="font-bold text-slate-800 mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-red-500" /> 실시간 트렌드 추이</div>
                            <div className="flex-1 relative w-full h-full min-h-[150px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={trendDataFixed}>
                                        <Line type="monotone" dataKey="active" stroke="#2563eb" strokeWidth={3} dot={{r: 4, fill: '#2563eb', strokeWidth: 0}} />
                                        <Line type="monotone" dataKey="compare" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                                <div className="flex justify-end gap-2 mt-2 text-[10px]">
                                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-600"></div>{data.name} (상승세)</div>
                                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-400"></div>역삼1동</div>
                                </div>
                            </div>
                        </div>

                        {/* Keywords & AI Comment */}
                        <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 flex flex-col gap-4">
                            <div>
                                <div className="text-[11px] font-bold text-slate-500 mb-2">🔥 {data.name} 소셜 키워드 (Instagram/Blog)</div>
                                <div className="flex flex-wrap gap-1.5">
                                    {(data.keywords || ['#데이트코스', '#인스타감성', '#웨이팅맛집']).map(k => (
                                        <span key={k} className="bg-white border border-blue-100 text-blue-600 px-2.5 py-1 rounded-full text-[11px] font-medium shadow-sm">{k}</span>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="pt-4 border-t border-slate-200">
                                <div className="font-bold text-slate-800 mb-2 text-sm">AI 분석 코멘트</div>
                                <p className="text-xs leading-relaxed text-slate-700">
                                    <strong className="text-blue-600">{data.name}</strong>은 최근 '디저트' 키워드 검색량이 전월 대비 <span className="text-red-500 font-bold">+15%</span> 급증했습니다. 
                                    경쟁 강도는 높지만 트렌드 지수가 압도적으로 높아 진입 매력도가 높습니다.
                                </p>
                            </div>
                        </div>

                        {/* Detail Button */}
                        <button 
                            onClick={() => setStep(3)}
                            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
                        >
                            {data.name} 상세 분석 보기 <ArrowRight size={16}/>
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-screen flex flex-col bg-slate-50 font-sans text-slate-900">
            {renderHeader()}
            <main className="flex-1 overflow-hidden relative">
                {step === 1 ? renderStep1() : renderAnalytics()}
            </main>
        </div>
    );
}
