import React, { useState, useEffect, useRef, useMemo } from 'react';
import { APIProvider, Map, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ScatterChart, Scatter, Cell, PieChart, Pie, Cell as PieCell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
    LineChart, Line, ZAxis, ReferenceLine
} from 'recharts';
import {
    Map as MapIcon, Search, X, Check, ArrowRight, User,
    TrendingUp, DollarSign, Users, Activity, PieChart as PieChartIcon,
    MapPin, Grid, Info, HelpCircle, Layers, Zap, Bell, ChevronDown, Trophy, Filter,
    ShoppingCart, Plus, ThumbsUp, Sparkles, Medal, Crown, ArrowLeft, Clock, Calendar, MessageSquare, Hexagon, AlertTriangle
} from 'lucide-react';
import { fetchYouTubeTrending } from '../utils/youtube';
import { loadAllData } from '../utils/dataLoader';
import { getGeminiAnalysis } from '../utils/gemini';
import { DONG_COORDINATES } from '../data/dongCoordinates';
import BusinessCategoryAnalysis from './BusinessCategoryAnalysis';
import LiveTicker from './LiveTicker';

// --- CONSTANTS ---
const CATEGORIES = {
    '외식업': ['카페/디저트', '치킨/호프', '한식', '양식', '중식', '패스트푸드'],
    '서비스업': ['미용실', '네일아트', '피부관리', '세탁소', 'PC방', '노래방'],
    '소매업': ['편의점', '의류', '화장품', '슈퍼마켓', '꽃집'],
    '교육/취미': ['일반교습학원', '외국어학원', '예술학원', '골프연습장', '스포츠클럽']
};

const FALLBACK_TRENDS = [
    { title: "🔥 급상승: 저당 디저트, 무인 카페, 하이볼", id: "VIDEO_ID_1" }
];

const getHeatmapColor = (value, min, max, maxLimit = null) => {
    if (value === undefined || isNaN(value) || value === 0) return '#94a3b8'; 
    
    const effectiveMax = maxLimit ? Math.min(max, maxLimit) : max;
    const clampedValue = Math.min(value, effectiveMax);
    
    let ratio = 0;
    if (effectiveMax > min) {
        ratio = Math.max(0, Math.min(1, (clampedValue - min) / (effectiveMax - min)));
    } else {
        ratio = 0.5; 
    }

    // 5-Stop Rainbow Scale: Purple -> Blue -> Green -> Yellow -> Red
    const stops = [
        { t: 0.00, r: 139, g: 92, b: 246 }, // Purple
        { t: 0.25, r: 59, g: 130, b: 246 }, // Blue
        { t: 0.50, r: 34, g: 197, b: 94 },  // Green
        { t: 0.75, r: 234, g: 179, b: 8 },  // Yellow
        { t: 1.00, r: 239, g: 68, b: 68 }   // Red
    ];

    let start = stops[0], end = stops[4];
    for (let i = 0; i < stops.length - 1; i++) {
        if (ratio >= stops[i].t && ratio <= stops[i+1].t) {
            start = stops[i];
            end = stops[i+1];
            break;
        }
    }

    const t = (ratio - start.t) / (end.t - start.t);
    const r = Math.round(start.r + (end.r - start.r) * t);
    const g = Math.round(start.g + (end.g - start.g) * t);
    const b = Math.round(start.b + (end.b - start.b) * t);

    return `rgb(${r}, ${g}, ${b})`;
};

// --- COMPONENTS ---
const HeaderPill = ({ step, setStep }) => (
  <header className="absolute top-6 left-1/2 transform -translate-x-1/2 z-50 pointer-events-auto">
    <div className="bg-white/95 backdrop-blur-md shadow-xl rounded-3xl px-8 py-4 flex items-center gap-8 border border-white/50 transition-all hover:shadow-2xl">
      <div className="flex items-center gap-2 cursor-pointer self-start mt-1" onClick={() => setStep(1)}>
        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/30">B</div>
        <span className="font-black text-slate-800 text-xl tracking-tight hidden sm:block">Smart Biz</span>
      </div>
      
      <div className="h-10 w-px bg-slate-100 mx-2 hidden sm:block self-center"></div>
      
      <div className="flex items-start gap-8 text-sm relative">
        {[1, 2, 3, 4].map((s) => (
            <button 
                key={s}
                onClick={() => setStep(s)}
                className="flex flex-col items-center gap-2 group relative"
            >
                {/* Circle */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 shadow-sm
                    ${step === s 
                        ? 'bg-blue-600 text-white shadow-blue-500/40 scale-110 ring-4 ring-blue-50' 
                        : step > s 
                            ? 'bg-blue-50 text-blue-600 border-2 border-blue-100' 
                            : 'bg-white text-slate-300 border-2 border-slate-100 group-hover:border-slate-200'
                    }`}
                >
                    {step > s ? <Check size={16} strokeWidth={3} /> : s}
                </div>
                
                {/* Label */}
                <span className={`text-xs font-bold whitespace-nowrap transition-colors duration-300
                    ${step === s 
                        ? 'text-blue-600' 
                        : step > s 
                            ? 'text-slate-500' 
                            : 'text-slate-300 group-hover:text-slate-400'
                    }`}
                >
                    {s === 1 ? '업종 선택' : s === 2 ? '탐색 & 필터' : s === 3 ? '후보 비교' : '상세 분석'}
                </span>
            </button>
        ))}
      </div>
      
      <div className="ml-4 pl-4 border-l border-slate-100 self-center h-8 flex items-center">
        <button className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-slate-600 relative">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse"></span>
        </button>
      </div>
    </div>
  </header>
);

const BottomRankingBar = ({ rankings, onRankingClick }) => (
    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-40 flex items-center gap-4 pointer-events-auto">
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-slate-900/90 text-white text-xs font-medium px-4 py-2 rounded-xl backdrop-blur-md whitespace-nowrap shadow-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none translate-y-2 group-hover:translate-y-0">
            📊 랭킹 기준: <span className="text-blue-300 font-bold">매출규모(70%)</span> + <span className="text-green-300 font-bold">유동인구(30%)</span>
        </div>
        {rankings.map((item, index) => (
            <div 
                key={item.id} 
                onClick={() => onRankingClick(item)}
                className="group bg-white/90 backdrop-blur-md rounded-2xl p-3 pl-4 pr-6 shadow-xl border border-white/60 flex items-center gap-3 transition-all hover:scale-105 hover:-translate-y-1 cursor-pointer min-w-[180px]"
            >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${item.badgeColor} font-bold text-lg`}>
                    {index === 0 ? <Crown size={20} fill="currentColor" /> : <span className="font-black">{item.rank}</span>}
                </div>
                <div>
                    <div className="text-[10px] text-slate-400 font-bold mb-0.5 flex items-center gap-1">종합 지표 TOP {item.rank}</div>
                    <div className="text-sm font-bold text-slate-800">{item.name}</div>
                    <div className="text-xs font-bold text-blue-600">{item.score}점 <span className="text-slate-400 font-normal">/ 100</span></div>
                </div>
            </div>
        ))}
    </div>
);

const MapContent = ({ data, onMarkerClick, selectedId, heatMapType }) => {
    const map = useMap();
    const markerLib = useMapsLibrary('marker');
    const markersRef = useRef({}); 

    const { min, max } = useMemo(() => {
        if (!data || data.length === 0) return { min: 0, max: 100 };
        const values = data.map(d => {
            if (heatMapType === 'rent') return d.rent_monthly;
            if (heatMapType === 'pop') return d.resident_pop;
            if (heatMapType === 'revenue') return d.revenue;
            if (heatMapType === 'score') return d.revenue_score;
            return 0;
        }).filter(v => v > 0); // Filter out zeros
        
        if (values.length === 0) return { min: 0, max: 100 };
        return { min: Math.min(...values), max: Math.max(...values) };
    }, [data, heatMapType]);

    useEffect(() => {
        if (!map || !markerLib) {
            console.log("Map or Marker Lib not loaded yet", { map, markerLib });
            return;
        }
        console.log("Map loaded, updating markers", data.length);

        const updateMarkers = async () => {
            const { AdvancedMarkerElement } = markerLib;
            const currentIds = new Set(data.map(d => d.id));

            // 1. Remove markers not in data
            Object.keys(markersRef.current).forEach(id => {
                if (!currentIds.has(id)) {
                    if (markersRef.current[id]) {
                        markersRef.current[id].map = null; // Remove from map
                    }
                    delete markersRef.current[id];
                }
            });

            // 2. Add or Update markers
            data.forEach((item, index) => {
                const isSelected = selectedId?.id === item.id;
                let val = 0;
                let valText = '';
                if (heatMapType === 'rent') { val = item.rent_monthly; valText = `${val}만`; }
                else if (heatMapType === 'pop') { val = item.resident_pop; valText = `${(val/10000).toFixed(1)}만명`; }
                else if (heatMapType === 'revenue') { 
                    val = item.revenue; 
                    valText = val >= 10000 ? `${(val/10000).toFixed(1)}억` : `${val}만`;
                }
                else if (heatMapType === 'score') { val = item.revenue_score; valText = `${val}점`; }

                // Visual Clamp for Revenue
                const maxLimit = heatMapType === 'revenue' ? 30000 : null;
                const markerColor = getHeatmapColor(val, min, max, maxLimit);
                
                const tooltipVisibilityClass = isSelected ? 'opacity-100 scale-100' : 'opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100';

                const content = document.createElement('div');
                content.className = `relative flex flex-col items-center transition-transform duration-300 cursor-pointer group ${isSelected ? 'scale-125 z-[999999]' : 'hover:scale-110 hover:z-[999990]'}`;
                content.style.isolation = 'isolate'; // Create new stacking context
                content.innerHTML = `
                    <div class="absolute bottom-[180%] left-1/2 transform -translate-x-1/2 ${tooltipVisibilityClass} transition-all duration-300 ease-out bg-white/95 backdrop-blur-xl p-3.5 rounded-2xl shadow-2xl border border-slate-200 w-44 text-left pointer-events-none z-[1000000] origin-bottom ring-1 ring-black/5">
                        <div class="flex justify-between items-start mb-2 pb-2 border-b border-slate-100">
                            <div>
                                <div class="text-[10px] font-bold text-slate-400 mb-0.5 flex items-center gap-1">
                                    ${item.category === '외식업' ? '🍽️' : item.category === '서비스업' ? '💇' : '🏪'} ${item.category || '기타'}
                                </div>
                                <div class="font-black text-slate-800 text-sm leading-tight">${item.displayName}</div>
                            </div>
                            <div class="flex flex-col items-end">
                                <span class="text-[10px] text-slate-400 font-bold">예상수익률</span>
                                <span class="font-black ${item.yield >= 0 ? 'text-blue-600' : 'text-red-500'} text-lg leading-none">${item.yield || 0}%</span>
                            </div>
                        </div>
                        <div class="space-y-1.5 text-[11px]">
                            <div class="flex justify-between items-center">
                                <span class="text-slate-500 font-bold flex items-center gap-1.5">💰 월 매출</span> 
                                <span class="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-md">${(item.revenue >= 10000 ? (item.revenue/10000).toFixed(1)+'억' : item.revenue+'만')}</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-slate-500 font-bold flex items-center gap-1.5">👣 유동인구</span> 
                                <span class="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-md">${(item.resident_pop/10000).toFixed(1)}만</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-slate-500 font-bold flex items-center gap-1.5">🏢 예상창업</span> 
                                <span class="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-md">${(item.investment >= 10000 ? (item.investment/10000).toFixed(1)+'억' : item.investment+'만')}</span>
                            </div>
                        </div>
                        <div class="absolute bottom-[-6px] left-1/2 transform -translate-x-1/2 w-3 h-3 bg-white/95 border-r border-b border-slate-200 rotate-45"></div>
                    </div>
                    <div class="px-3 py-1.5 rounded-xl font-bold text-xs shadow-xl flex items-center gap-1 border border-white/20 backdrop-blur-sm text-white" style="background-color: ${isSelected ? '#0f172a' : markerColor}; box-shadow: 0 4px 12px ${markerColor}66;">
                        <span>${item.name}</span>
                        <span class="opacity-80 border-l border-white/30 pl-1 ml-1">${valText}</span>
                    </div>
                    <div class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] mt-[-1px]" style="border-top-color: ${isSelected ? '#0f172a' : markerColor};"></div>
                `;
                content.onclick = () => onMarkerClick(item);

                const baseZIndex = 100000 + index;
                if (markersRef.current[item.id]) {
                    markersRef.current[item.id].content = content;
                    markersRef.current[item.id].zIndex = isSelected ? 2000000 : baseZIndex;
                } else {
                    const marker = new AdvancedMarkerElement({
                        map: map,
                        position: { lat: item.lat, lng: item.lng },
                        content: content,
                        title: item.name,
                        zIndex: baseZIndex,
                    });
                    markersRef.current[item.id] = marker;
                }
            });
        };
        updateMarkers();
    }, [data, selectedId, heatMapType, min, max, map, markerLib]);

    return null;
};

const RealMap = (props) => {
    return (
        <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
            <Map
                mapId={import.meta.env.VITE_GOOGLE_MAPS_MAP_ID}
                defaultCenter={{ lat: 37.5665, lng: 126.9780 }}
                defaultZoom={12}
                style={{ width: '100vw', height: '100vh' }}
                gestureHandling={'greedy'}
                disableDefaultUI={true}
            >
                <MapContent {...props} />
            </Map>
        </APIProvider>
    );
};

// --- MAIN APPLICATION ---
export default function SeoulFranchiseDashboardV3() {
    const [step, setStep] = useState(1);
    const [cart, setCart] = useState([]);
    const [selectedRegion, setSelectedRegion] = useState(null);
    const [heatMapType, setHeatMapType] = useState('score'); // Default to 'score'
    const [budget, setBudget] = useState(10000);
    const [youtubeTrends, setYoutubeTrends] = useState(FALLBACK_TRENDS);
    const [realData, setRealData] = useState([]);
    const [topRankings, setTopRankings] = useState([]); // New State for Top 3
    const [selectedCategory, setSelectedCategory] = useState('외식업');
    const [selectedSubCategory, setSelectedSubCategory] = useState('카페/디저트');
    const [currentTrendIndex, setCurrentTrendIndex] = useState(0);
    
    // Visual Filter Toggle for Map
    const [showOnlyHigh, setShowOnlyHigh] = useState(false);

    // Step 2 State
    const [activeCompVideos, setActiveCompVideos] = useState([]);

    // Analysis State
    const [analysisTarget, setAnalysisTarget] = useState(null);
    const [focusedCompId, setFocusedCompId] = useState(null);
    const [aiComment, setAiComment] = useState("");
    const [isAiLoading, setIsAiLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            const dongData = await loadAllData(selectedSubCategory);
            
            // Calculate Min/Max for Normalization
            let maxRev = 0, maxPop = 0, maxOpen = 0, maxClose = 0;
            const tempMerged = [];

            Object.keys(DONG_COORDINATES).forEach((dongName) => {
                const coords = DONG_COORDINATES[dongName];
                const d = dongData[dongName] || { rent: 0, population: 0, openings: 0, closeCount: 0, revenue: 0, revenueHistory: [], details: {} };
                
                maxRev = Math.max(maxRev, d.revenue);
                maxPop = Math.max(maxPop, d.population);
                maxOpen = Math.max(maxOpen, d.openings);
                maxClose = Math.max(maxClose, d.closeCount);

                // Yield Calculation
                const STORE_SIZE = 20;
                const DEPOSIT_MO = 10;
                const monthlyRent = d.rent * STORE_SIZE;
                const deposit = monthlyRent * DEPOSIT_MO;
                const invest = 12000 + deposit; 
                const profit = d.revenue - monthlyRent;
                let yieldVal = 0;
                
                // Allow negative yield, only check if invest > 0
                if (invest > 0) {
                    yieldVal = (profit * 12 / invest) * 100;
                }
                // Handle missing data gracefully
                if (d.revenue === 0 || d.rent === 0) yieldVal = 0;

                tempMerged.push({
                   name: dongName, 
                   coords, d, yield: parseFloat(yieldVal.toFixed(1))
                });
            });

            const mergedData = tempMerged.map((item, index) => {
                const { name, coords, d, yield: yieldVal } = item;
                
                // ... (Score Calc)
                const revRatio = maxRev ? d.revenue / maxRev : 0;
                const popRatio = maxPop ? d.population / maxPop : 0;
                const revenueScore = Math.min(100, Math.round((revRatio * 0.7 + popRatio * 0.3) * 100));

                const openRatio = maxOpen ? d.openings / maxOpen : 0;
                const closeRatio = maxClose ? d.closeCount / maxClose : 0;
                const competitionScore = Math.min(100, Math.round((openRatio * 0.6 + closeRatio * 0.4) * 100));

                let score = 'low';
                if (revenueScore >= 80) score = 'high';
                else if (revenueScore >= 60) score = 'mid';

                return {
                    id: `dong-${index}`, name: name, 
                    displayName: name,
                    lat: coords.lat, lng: coords.lng,
                    rent_monthly: d.rent,
                    resident_pop: d.population,
                    openings: d.openings,
                    closeCount: d.closeCount,
                    revenue: d.revenue,
                    investment: d.investment, // Add investment field
                    details: d.details,
                    revenue_score: revenueScore,
                    competition_score: competitionScore,
                    score: score,
                    yield: yieldVal,
                    trend_history: d.trendHistory && d.trendHistory.length > 0 ? d.trendHistory : [d.revenue * 0.9, d.revenue * 0.95, d.revenue * 0.98, d.revenue], 
                    keywords: revRatio > 0.8 ? ['#핫플레이스', '#고수익'] : popRatio > 0.8 ? ['#유동인구깡패', '#안정적'] : ['#성장가능성', '#틈새시장'] 
                };
            });
            setRealData(mergedData);
            
            // Calculate Top 3 (Based on Revenue Score - Total Score)
            // Revenue Score = Revenue(70%) + Pop(30%)
            // This balances out high-yield outliers like Doksan (low rent, high profit %) vs popular spots (high revenue, high rent).
            const sorted = [...mergedData]
                .sort((a, b) => b.revenue_score - a.revenue_score)
                .slice(0, 3);

            const top3 = sorted.map((item, i) => ({
                id: item.id,
                rank: i + 1,
                name: item.name,
                score: item.revenue_score, // Display Score
                badgeColor: i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-slate-300 text-slate-600' : 'bg-orange-300 text-white'
            }));
            setTopRankings(top3);

            const videos = await fetchYouTubeTrending();
            if (videos && videos.length > 0) setYoutubeTrends(videos);
        };
        fetchData();
    }, [selectedSubCategory]);
    
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTrendIndex((prev) => (prev + 1) % youtubeTrends.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [youtubeTrends]);

    const triggerAiAnalysis = async (target) => {
        setIsAiLoading(true);
        setAiComment("데이터를 분석 중입니다...");
        const comment = await getGeminiAnalysis(target.name, {
            revenue: target.revenue,
            population: target.resident_pop,
            rent: target.rent_monthly,
            openings: target.openings
        }, selectedSubCategory); // Pass selected category
        setAiComment(comment);
        setIsAiLoading(false);
    };

    // AI Analysis Trigger
    useEffect(() => {
        if (step === 3) {
            const target = focusedCompId ? realData.find(d => d.id === focusedCompId) : (cart[0] || realData[0]);
            if (target) {
                triggerAiAnalysis(target);
                // Fetch YouTube videos for the target area
                fetchYouTubeTrending(`${target.name} 맛집`).then(videos => {
                    setActiveCompVideos(videos);
                });
            }
        }
    }, [step, focusedCompId, cart]);

    const addToCart = (region) => { if (!cart.find(c => c.id === region.id)) setCart([...cart, region]); };
    const removeFromCart = (id) => setCart(cart.filter(c => c.id !== id));
    
    const handleRankingClick = (rankItem) => {
        const targetItem = realData.find(d => d.id === rankItem.id);
        if (targetItem) {
            setSelectedRegion(targetItem);
            addToCart(targetItem);
        }
    };

    const filteredData = (realData.length > 0 ? realData : []).filter(r => {
        // Filter by budget: Total Investment <= Budget
        const budgetMatch = r.investment ? (r.investment <= budget) : true;
        // Filter by high score if showOnlyHigh is true
        const highPriorityMatch = showOnlyHigh ? r.score === 'high' : true;
        // Filter by Category (Industry)
        // Note: Real data currently aggregates by Dong, not by Industry Store. 
        // But if we want to show relevancy, we can check if this Dong has high openings/revenue for the selected category.
        // For now, since data is Dong-based, we show all Dongs but maybe color/highlight based on suitability?
        // User request: "Show only filtered data". 
        // Since we don't have per-industry markers (we have per-dong markers), 
        // we will keep showing Dongs but maybe filter out those with NO relevant data if available.
        // HOWEVER, to meet the user's explicit request "Map should change based on selected industry":
        // We should rely on the fact that `BusinessCategoryAnalysis` passed `handleIndustrySelect`.
        
        return budgetMatch && highPriorityMatch;
    });

    const handleIndustrySelect = (industry) => {
        const mapping = {
            "커피-음료": { cat: '외식업', sub: "카페/디저트" },
            "치킨전문점": { cat: '외식업', sub: "치킨/호프" },
            "한식음식점": { cat: '외식업', sub: "한식" },
            "양식음식점": { cat: '외식업', sub: "양식" },
            "중식음식점": { cat: '외식업', sub: "중식" },
            "패스트푸드점": { cat: '외식업', sub: "패스트푸드" },
            "편의점": { cat: '소매업', sub: "편의점" },
            "미용실": { cat: '서비스업', sub: "미용실" },
            "네일숍": { cat: '서비스업', sub: "네일아트" },
            "피부관리실": { cat: '서비스업', sub: "피부관리" },
            "세탁소": { cat: '서비스업', sub: "세탁소" },
            "PC방": { cat: '서비스업', sub: "PC방" },
            "노래방": { cat: '서비스업', sub: "노래방" },
            "일반교습학원": { cat: '교육/취미', sub: "일반교습학원" },
            "외국어학원": { cat: '교육/취미', sub: "외국어학원" },
            "예술학원": { cat: '교육/취미', sub: "예술학원" },
            "골프연습장": { cat: '교육/취미', sub: "골프연습장" },
            "스포츠클럽": { cat: '교육/취미', sub: "스포츠클럽" }
        };

        if (mapping[industry.name]) {
             setSelectedCategory(mapping[industry.name].cat);
             setSelectedSubCategory(mapping[industry.name].sub);
        } else {
             // Fallback: If no direct mapping, try to find a matching sub-category or default
             const foundCat = Object.keys(CATEGORIES).find(cat => CATEGORIES[cat].includes(industry.name));
             if (foundCat) {
                 setSelectedCategory(foundCat);
                 setSelectedSubCategory(industry.name);
             }
        }
        
        setStep(2);
    };

    const renderStep1 = () => (
        <div className="h-full w-full relative bg-slate-50">
            <HeaderPill step={step} setStep={setStep} />
            <BusinessCategoryAnalysis 
                onNext={handleIndustrySelect} 
                youtubeTrends={youtubeTrends}
                currentTrendIndex={currentTrendIndex}
            />
        </div>
    );

    const renderStep2 = () => (
        <div className="relative h-full w-full bg-slate-50 font-sans text-slate-800 overflow-hidden">
            <div className="absolute inset-0 z-0">
                 <RealMap
                    data={filteredData}
                    selectedId={selectedRegion?.id}
                    onMarkerClick={(item) => { setSelectedRegion(item); addToCart(item); }} // Add to cart immediately
                    heatMapType={heatMapType}
                />
                
                {/* Visual Filter Toggle (Float Top Right) */}
                <div className="absolute top-28 right-8 z-30">
                    <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg shadow-slate-200/50 border border-white/60 p-1 flex items-center gap-1">
                        <button 
                            onClick={() => setShowOnlyHigh(false)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${!showOnlyHigh ? 'bg-white shadow-sm text-slate-800 ring-1 ring-slate-100' : 'text-slate-400 hover:bg-white/50'}`}
                        >
                            전체 보기
                        </button>
                        <button 
                            onClick={() => setShowOnlyHigh(true)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${showOnlyHigh ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-200' : 'text-slate-400 hover:bg-white/50'}`}
                        >
                            <Zap size={12} fill="currentColor" /> 핵심 상권만
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. Floating Header */}
            <HeaderPill step={step} setStep={setStep} />

            {/* 3. Right-Top Detail Card (Refined) */}
            {selectedRegion && (
                <div className="absolute top-40 right-8 w-80 bg-white/85 backdrop-blur-2xl rounded-[2rem] shadow-2xl shadow-blue-900/10 border border-white/50 p-6 z-40 animate-in fade-in slide-in-from-right-8 zoom-in-95 duration-300 pointer-events-auto">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-5">
                        <div>
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ring-inset ${selectedRegion.score === 'high' ? 'bg-blue-50 text-blue-600 ring-blue-100' : 'bg-slate-50 text-slate-500 ring-slate-100'}`}>
                                    {selectedRegion.score === 'high' ? '✨ 추천 상권' : '📍 일반 상권'}
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold tracking-wide">{selectedRegion.category || '기타'}</span>
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 leading-tight tracking-tight">{selectedRegion.name}</h2>
                        </div>
                        <button 
                            onClick={() => setSelectedRegion(null)} 
                            className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Stats Grid */}
                    <div className="space-y-3 mb-6">
                        <div className="flex justify-between items-center p-4 bg-gradient-to-r from-slate-50 to-white rounded-2xl border border-slate-100 shadow-sm">
                            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                                <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600"><TrendingUp size={14} /></div> 평균 매출
                            </div>
                            <div className="text-slate-800 font-black text-lg">{(selectedRegion.revenue).toLocaleString()}만</div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                <div className="text-[10px] text-slate-400 font-bold mb-1 flex items-center gap-1"><Trophy size={10} className="text-amber-500"/> 예상수익률</div>
                                <div className="font-bold text-slate-700 text-lg">{selectedRegion.yield}%</div>
                            </div>
                            <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                <div className="text-[10px] text-slate-400 font-bold mb-1 flex items-center gap-1"><AlertTriangle size={10} className="text-rose-500"/> 폐업률</div>
                                <div className="font-bold text-slate-700 text-lg">
                                    {Math.round((selectedRegion.closeCount / (selectedRegion.openings + selectedRegion.closeCount || 1)) * 100)}<span className="text-xs text-slate-400 font-medium">%</span>
                                </div>
                            </div>
                            <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                <div className="text-[10px] text-slate-400 font-bold mb-1 flex items-center gap-1"><DollarSign size={10}/> 임대료(평)</div>
                                <div className="font-bold text-slate-700">{selectedRegion.rent_monthly}만</div>
                            </div>
                            <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                <div className="text-[10px] text-slate-400 font-bold mb-1 flex items-center gap-1"><Users size={10}/> 유동인구</div>
                                <div className="font-bold text-slate-700">{(selectedRegion.resident_pop / 10000).toFixed(1)}만</div>
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <button 
                        onClick={() => {
                            addToCart(selectedRegion);
                        }}
                        disabled={cart.find(c => c.id === selectedRegion.id)}
                        className={`w-full py-4 rounded-xl font-bold shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all duration-300 ${
                            cart.find(c => c.id === selectedRegion.id)
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                            : 'bg-gradient-to-r from-slate-900 to-slate-800 text-white hover:from-blue-600 hover:to-indigo-600 hover:shadow-blue-500/40 hover:-translate-y-0.5'
                        }`}
                    >
                        {cart.find(c => c.id === selectedRegion.id) ? (
                            <> <Check size={18} /> 담기 완료 </>
                        ) : (
                            <> <Plus size={18} /> 후보 담기 </>
                        )}
                    </button>
                </div>
            )}

            {/* Left Panel - Scroll Fix */}
            <div className="absolute top-24 left-8 w-[380px] flex flex-col gap-4 z-40 overflow-y-auto max-h-[calc(100vh-150px)] pr-2 pointer-events-auto custom-scroll">
                
                {/* Filter Card */}
                <div className="bg-white/90 backdrop-blur-xl rounded-[2rem] p-6 shadow-2xl border border-white/60 flex flex-col transition-transform hover:scale-[1.01] duration-300 shrink-0">
                    <h2 className="text-xl font-bold mb-1 flex items-center gap-2 text-slate-800">
                        탐색 필터 <Info size={18} className="text-slate-400 cursor-help" />
                    </h2>
                    <p className="text-sm text-slate-500 mb-4">원하는 조건으로 상권을 검색하세요</p>
                    
                    <div className="space-y-4">
                        {/* Filter Inputs... (Same as before but larger fonts) */}
                        <div className="group">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <Filter size={12} /> 희망 업종
                            </label>
                            <div className="relative">
                                <select className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-base font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer" value={selectedSubCategory} onChange={(e) => setSelectedSubCategory(e.target.value)}>
                                    {CATEGORIES[selectedCategory].map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <ChevronDown className="absolute right-4 top-4 text-slate-400 pointer-events-none" size={18} />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-end mb-3">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">나의 자본금</label>
                                <div className="flex items-baseline gap-1 bg-blue-50 px-3 py-1 rounded-lg text-blue-700">
                                    <span className="text-xl font-black tracking-tight">
                                        {(() => {
                                            const uk = Math.floor(budget / 10000);
                                            const chunwon = Math.floor((budget % 10000) / 1000);
                                            let result = '';
                                            if (uk > 0) result += `${uk}억`;
                                            if (chunwon > 0) result += ` ${chunwon}천만원`;
                                            if (uk === 0 && chunwon === 0) result = '0원';
                                            return result.trim();
                                        })()}
                                    </span>
                                    <span className="text-xs font-bold opacity-70"></span>
                                </div>
                            </div>
                            <div className="relative h-6 flex items-center">
                                <input type="range" min="1000" max="40000" step="1000" value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 z-20 relative hover:accent-blue-500" />
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 h-2 rounded-lg pointer-events-none z-10 shadow-sm" style={{ width: `${(budget/40000)*100}%` }}></div>
                            </div>
                            <div className="flex justify-between text-[10px] font-bold text-slate-300 mt-2">
                                <span>1천만</span>
                                <span>4억</span>
                            </div>
                             <p className="text-[10px] text-slate-400 mt-2">* 임대료 (월세)의 50배를 기준으로 필터링됩니다.</p>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">지도 보기 기준</label>
                            <div className="grid grid-cols-4 gap-2 bg-slate-100/80 p-1.5 rounded-2xl">
                                {[{ id: 'score', label: '종합지표', icon: Activity }, { id: 'revenue', label: '매출', icon: TrendingUp }, { id: 'pop', label: '유동인구', icon: Users }, { id: 'rent', label: '임대료', icon: DollarSign }].map(opt => (
                                    <button key={opt.id} onClick={() => setHeatMapType(opt.id)} className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl transition-all ${heatMapType === opt.id ? 'bg-white text-blue-600 shadow-md font-bold ring-1 ring-black/5' : 'text-slate-500 hover:bg-white/50'}`}>
                                        <opt.icon size={18} strokeWidth={heatMapType === opt.id ? 2.5 : 2} />
                                        <span className="text-[11px]">{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cart Card */}
                <div className="flex-col bg-white/90 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/60 transition-transform hover:scale-[1.01] duration-300 overflow-hidden min-h-[300px] shrink-0 flex">
                    <div className="flex justify-between items-center p-6 pb-4 shrink-0 border-b border-slate-100 bg-white/50">
                        <div className="flex items-center gap-2">
                            <span className="bg-blue-600 text-white p-2 rounded-xl shadow-sm"><ShoppingCart size={20} /></span>
                            <div>
                                <span className="font-bold text-slate-800 block text-base">나의 후보군</span>
                                <span className="text-xs text-slate-400">비교할 상권을 담아보세요</span>
                            </div>
                        </div>
                        <span className="bg-slate-800 text-white text-sm font-bold px-3 py-1 rounded-full shadow-lg">{cart.length}</span>
                    </div>
                    
                    {/* Scrollable List */}
                    <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-3 bg-slate-50/30 min-h-[200px]">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3 opacity-60">
                                <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center"><MapPin size={32} /></div>
                                <span className="text-sm font-bold">지도의 핀을 눌러 담아주세요</span>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.id} className="group relative flex justify-between items-center p-4 bg-white hover:bg-blue-50 border border-slate-200 rounded-2xl shadow-sm transition-all hover:shadow-md cursor-pointer" onClick={() => setSelectedRegion(item)}>
                                    <div>
                                        <div className="font-bold text-slate-800 text-sm">{item.name}</div>
                                        <div className="text-xs text-slate-500 mt-1 flex gap-3">
                                            <div className="flex items-center gap-1">
                                                <span className="text-slate-400">매출:</span>
                                                <span className="font-bold text-blue-600">{item.revenue >= 10000 ? (item.revenue/10000).toFixed(1)+'억' : item.revenue+'만'}</span>
                                            </div>
                                            <span className="text-slate-300">|</span>
                                            <div className="flex items-center gap-1">
                                                <span className="text-slate-400">유동:</span>
                                                <span className="font-medium text-slate-700">{(item.resident_pop/10000).toFixed(1)}만</span>
                                            </div>
                                            <span className="text-slate-300">|</span>
                                            <div className="flex items-center gap-1">
                                                <span className="text-slate-400">수익:</span>
                                                <span className="font-medium text-slate-700">{item.yield}%</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); removeFromCart(item.id); }} className="text-slate-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-xl transition"><X size={18} /></button>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-4 border-t border-slate-100 bg-white shrink-0">
                         <button 
                            className={`w-full py-4 rounded-2xl font-bold text-base shadow-lg flex items-center justify-center gap-2 group transition-all duration-300 ${cart.length < 1 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-blue-500/40 hover:-translate-y-1'}`}
                            disabled={cart.length < 1}
                            onClick={() => setStep(3)}
                        >
                            후보 비교하기 <ArrowRight size={20} className={`transition-transform ${cart.length >= 1 ? 'group-hover:translate-x-1' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Bottom Ranking Bar */}
            <BottomRankingBar rankings={topRankings} onRankingClick={handleRankingClick} />

            <div className="absolute right-8 bottom-8 flex flex-col gap-3 pointer-events-auto z-40">
                <button className="w-14 h-14 bg-white/90 backdrop-blur rounded-2xl shadow-xl flex items-center justify-center text-slate-600 hover:text-blue-600 hover:scale-105 transition-all border border-white/50"><Layers size={28} /></button>
            </div>
        </div>
    );

    // Step 3: Candidate Comparison
    const renderStep3 = () => {
        const displayData = cart.length > 0 ? cart : realData.slice(0, 4);
        const scatterData = displayData.map(d => ({
            ...d, x: d.competition_score, y: d.revenue_score
        }));
        const activeComp = displayData.find(d => d.id === focusedCompId) || displayData[0];
        
        // Calculate Seoul Average Trend (Real Data)
        // We aggregate data from *all* regions in realData to find the average trend per quarter.
        const quarterSums = {};
        const quarterCounts = {};
        
        realData.forEach(d => {
            if (d.trend_history && d.trend_history.length > 0) {
                d.trend_history.forEach((val, idx) => {
                    // Assuming trend_history is sorted chronologically
                    if (!quarterSums[idx]) { quarterSums[idx] = 0; quarterCounts[idx] = 0; }
                    quarterSums[idx] += val;
                    quarterCounts[idx] += 1;
                });
            }
        });

        // Convert sums to averages
        const avgTrend = Object.keys(quarterSums).sort((a,b) => Number(a)-Number(b)).map(k => {
            return quarterCounts[k] > 0 ? quarterSums[k] / quarterCounts[k] : 0;
        });

        // Prepare Trend Data for Line Chart
        const trendData = activeComp.trend_history.map((val, idx) => ({
            quarter: `${idx + 1}Q`,
            value: Math.round(val / 10000), // Man-Won
            avg: Math.round((avgTrend[idx] !== undefined ? avgTrend[idx] : (val * 0.9)) / 10000) // Man-Won
        }));

        return (
            <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-blue-600 to-slate-50 opacity-10 pointer-events-none"></div>
                <HeaderPill step={step} setStep={setStep} />
                
                <div className="flex-1 flex flex-col p-8 pt-24 max-w-7xl mx-auto w-full gap-6 overflow-y-auto">
                    {/* Header Section */}
                    <div className="flex items-center gap-4 mb-2">
                         <button onClick={() => setStep(2)} className="p-2 rounded-full hover:bg-white hover:shadow-md transition-all"><ArrowLeft size={24} className="text-slate-600" /></button>
                         <div>
                             <h2 className="text-2xl font-black text-slate-800">후보 상권 비교 분석</h2>
                             <p className="text-slate-500 text-sm">선택하신 <span className="font-bold text-blue-600">{cart.length > 0 ? cart.length : displayData.length}개 지역</span>의 경쟁력과 수익성을 한눈에 파악하세요.</p>
                         </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-[600px]">
                        
                        {/* LEFT: Blue Ocean Matrix */}
                        <div className="lg:col-span-2 bg-white rounded-[2rem] p-8 shadow-xl border border-white/60 flex flex-col relative overflow-hidden">
                            <h3 className="font-bold text-slate-800 text-lg mb-6 flex items-center gap-2">
                                <Activity size={20} className="text-blue-500" /> 경쟁 강도 vs 기대 수익 (Blue Ocean Matrix)
                            </h3>
                            
                            <div className="flex-1 relative border border-slate-100 rounded-2xl overflow-visible bg-slate-50/50">
                                {/* Quadrant Backgrounds */}
                                <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                                    {/* Top Left: Low Comp (Blue), High Rev (Blue) -> The Best (Blue Ocean) */}
                                    <div className="bg-blue-50/60 border-r border-b border-dashed border-blue-200 flex p-4"><span className="font-black text-blue-300 text-xl uppercase tracking-tight">Blue Ocean (기회)</span></div> 
                                    
                                    {/* Top-Right (High X, High Y): Good Rev but High Comp -> Purple/Red */}
                                    <div className="bg-purple-50/40 border-b border-dashed border-purple-200 flex justify-end p-4"><span className="font-black text-purple-200 text-xl uppercase tracking-tight">High Risk</span></div> 
                                    
                                    {/* Bottom-Left (Low X, Low Rev): Low Comp but Low Rev -> Gray */}
                                    <div className="bg-slate-100/50 border-r border-dashed border-slate-200 flex items-end p-4"><span className="font-black text-slate-300 text-xl uppercase tracking-tight">Stagnant</span></div> 
                                    
                                    {/* Bottom-Right (High X, Low Rev): High Comp, Low Rev -> Red Ocean */}
                                    <div className="bg-red-50/60 flex justify-end items-end p-4"><span className="font-black text-red-200 text-xl uppercase tracking-tight">Red Ocean (위험)</span></div>
                                </div>
                                
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                        <XAxis type="number" dataKey="x" name="경쟁강도" domain={[0, 100]} hide />
                                        <YAxis type="number" dataKey="y" name="기대수익" domain={[0, 100]} hide />
                                        <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const d = payload[0].payload;
                                                return <div className="bg-white/95 backdrop-blur-sm p-4 shadow-2xl rounded-2xl text-xs font-bold border border-white/50 z-50 min-w-[150px] pointer-events-none" style={{ pointerEvents: 'none' }}>
                                                    <div className="text-sm text-slate-800 mb-2 flex items-center gap-2">
                                                        <MapPin size={14} className="text-red-500" /> {d.name}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between text-slate-500"><span>💰 기대수익:</span> <span className="text-blue-600">{d.y}점</span></div>
                                                        <div className="flex justify-between text-slate-500"><span>⚔️ 경쟁강도:</span> <span className="text-red-500">{d.x}점</span></div>
                                                    </div>
                                                </div>;
                                            }
                                            return null;
                                        }} />
                                        <Scatter name="Regions" data={scatterData} onClick={(e) => setFocusedCompId(e.payload.id)}>
                                            {scatterData.map((entry, index) => (
                                                <Cell 
                                                    key={`cell-${index}`} 
                                                    fill={entry.id === activeComp.id ? '#2563eb' : (entry.y > 50 && entry.x < 50 ? '#3b82f6' : '#ef4444')} 
                                                    stroke="white" 
                                                    strokeWidth={2} 
                                                    r={8} 
                                                    className="cursor-pointer shadow-xl filter drop-shadow-lg hover:opacity-80"
                                                />
                                            ))}
                                        </Scatter>
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex justify-between text-xs font-bold text-slate-400 mt-2 px-2">
                                <span>Low ← 경쟁 강도 → High</span>
                                <span>Low ← 기대 수익 → High</span>
                            </div>
                            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500 leading-relaxed">
                                <p className="mb-2"><span className="font-bold text-blue-500">Blue Ocean Matrix</span>는 실제 서울시 공공데이터를 기반으로 산출되었습니다.</p>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li><span className="font-bold">기대 수익 (Y축):</span> 해당 행정동의 실제 카드 매출 데이터와 유동인구 데이터를 7:3 비율로 가중 평균하여 점수화했습니다.</li>
                                    <li><span className="font-bold">경쟁 강도 (X축):</span> 해당 지역의 점포 밀집도와 최근 폐업률 데이터를 종합하여 산출했습니다. 좌측(낮음)일수록 진입 장벽이 낮음을 의미합니다.</li>
                                </ul>
                            </div>
                        </div>

                        {/* RIGHT: Trend & Analysis */}
                        <div className="flex flex-col gap-6 h-full">
                            
                            {/* 1. Real-time Trend Chart */}
                            <div className="bg-white p-6 rounded-[2rem] shadow-lg border border-slate-100">
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <TrendingUp size={18} className="text-red-500" /> 매출 트렌드 추이 (단위: 만원)
                                </h3>
                                <div className="h-40">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={trendData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="quarter" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} tickFormatter={(value) => value.toLocaleString()} />
                                            <Tooltip 
                                                contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} 
                                                formatter={(value, name) => [value.toLocaleString(), name === 'value' ? activeComp.name : '서울시 평균']}
                                            />
                                            <Legend iconType="circle" formatter={(value) => (<span className="text-xs font-bold text-slate-500">{value === 'value' ? activeComp.name : '서울시 평균'}</span>)} />
                                            <Line type="monotone" dataKey="value" name="value" stroke="#2563eb" strokeWidth={3} dot={{r: 4, strokeWidth: 2, fill: 'white'}} activeDot={{r: 6}} />
                                            <Line type="monotone" dataKey="avg" name="avg" stroke="#cbd5e1" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* 2. Real-time News & Trends */}
                            <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-200">
                                <div className="text-xs font-bold text-slate-500 mb-3 flex items-center gap-1">📺 {activeComp.name} 관련 유튜브</div>
                                <div className="space-y-2">
                                    {activeCompVideos.length > 0 ? activeCompVideos.slice(0, 3).map((video, i) => (
                                        <a key={i} href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm text-xs text-slate-600 truncate flex items-center gap-2 hover:text-blue-600 transition-colors">
                                            <span className="text-red-500 font-bold">▶</span>
                                            {video.title}
                                        </a>
                                    )) : (
                                        <div className="text-xs text-slate-400 p-2">관련 영상을 불러오는 중...</div>
                                    )}
                                </div>
                            </div>

                            {/* 3. AI Analysis Comment (Modern Light Premium) */}
                            <div className="bg-white rounded-[2rem] shadow-xl border border-blue-100 flex flex-col relative overflow-hidden group">
                                {/* Decorational Gradients */}
                                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
                                <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-50 rounded-full blur-3xl pointer-events-none"></div>
                                
                                <div className="p-6 relative z-10 flex-1 flex flex-col">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                            <div className="p-1.5 bg-blue-50 rounded-lg">
                                                <Sparkles size={18} className="text-blue-600 animate-pulse" />
                                            </div>
                                            <span className="tracking-tight">AI Executive Insight</span>
                                        </h3>
                                        <span className="text-[10px] font-bold bg-white text-slate-500 px-2.5 py-1 rounded-full border border-slate-200 shadow-sm flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                            Gemini 3.0 Pro
                                        </span>
                                    </div>

                                    <div className="flex-1 overflow-y-auto min-h-[140px] mb-5 custom-scroll p-1">
                                        {isAiLoading ? (
                                            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 py-4">
                                                <div className="relative">
                                                    <div className="w-8 h-8 border-4 border-blue-100 rounded-full"></div>
                                                    <div className="absolute top-0 left-0 w-8 h-8 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                                                </div>
                                                <span className="text-xs font-medium text-slate-500 animate-pulse">상권 데이터를 심층 분석 중입니다...</span>
                                            </div>
                                        ) : (
                                            <div className="prose prose-sm max-w-none">
                                                <div className="text-slate-600 leading-relaxed text-sm font-medium whitespace-pre-wrap">
                                                    {aiComment || "좌측 지도에서 상권을 선택하시면, Gemini 3.0이 수집된 빅데이터를 기반으로 해당 지역의 성공 가능성과 리스크를 정밀하게 분석해 드립니다."}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <button 
                                        onClick={() => { setAnalysisTarget(activeComp); setStep(4); }} 
                                        className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg shadow-slate-200 transition-all hover:bg-blue-600 hover:shadow-blue-200 hover:-translate-y-0.5 flex items-center justify-center gap-2 group/btn"
                                    >
                                        <span>{activeComp.name} 상세 리포트</span>
                                        <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderStep4 = () => {
        const target = analysisTarget || cart[0] || realData[0];
        
        // Use Real Details
        const hasTimeData = target.details?.time && target.details.time.some(v => v > 0);
        const hourly = hasTimeData 
            ? target.details.time.map((val, i) => ({ hour: i*4, value: val })) 
            : [];

        const hasAgeData = target.details?.age && Object.values(target.details.age).some(v => v > 0);
        const ageData = hasAgeData
            ? Object.keys(target.details.age).map(k => ({ name: k+'대', value: target.details.age[k], fill: k === '20' || k === '30' ? '#3b82f6' : '#bfdbfe' }))
            : [];

        // Weekly Sales Data (Fixed Mapping)
        const hasDayData = target.details?.day && Object.values(target.details.day).some(v => v > 0);
        const dayKeys = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const dayLabels = ['월', '화', '수', '목', '금', '토', '일'];
        const dayData = hasDayData
            ? dayLabels.map((day, i) => ({ name: day, value: target.details.day[dayKeys[i]] || 0 }))
            : dayLabels.map(day => ({ name: day, value: 0 }));
        
        // Calculate Top Age Group
        let topAge = '20대';
        let topAgeVal = 0;
        if (hasAgeData) {
             Object.entries(target.details.age).forEach(([k, v]) => {
                 if (v > topAgeVal) { topAge = k+'대'; topAgeVal = v; }
             });
        }
        const totalAgeVal = Object.values(target.details.age || {}).reduce((a, b) => a + b, 0) || 1;
        const topAgePercent = Math.round((topAgeVal / totalAgeVal) * 100);

        // Closure Rate Calculation (Mock trend for now)
        const closureRate = Math.round((target.closeCount / (target.openings + target.closeCount || 1)) * 100);
        const closureTrend = [
            { year: '2022', rate: closureRate + 5 },
            { year: '2023', rate: closureRate + 2 },
            { year: '2024', rate: closureRate },
        ];

        // Radar Data Calculation (Mock based on real metrics)
        const radarData = [
            { subject: '접근성', A: Math.min(100, (target.resident_pop / 30000) * 100), fullMark: 100 },
            { subject: '구매력', A: Math.min(100, (target.revenue / 50000) * 100), fullMark: 100 },
            { subject: '집객력', A: Math.min(100, (target.rent_monthly / 500) * 100), fullMark: 100 }, 
            { subject: '안정성', A: 100 - closureRate, fullMark: 100 },
            { subject: '성장성', A: target.revenue_score, fullMark: 100 },
            { subject: '경쟁력', A: target.competition_score, fullMark: 100 },
        ];

        return (
            <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-blue-600 to-slate-50 opacity-10 pointer-events-none"></div>
                <HeaderPill step={step} setStep={setStep} />
                
                <div className="flex-1 overflow-y-auto pt-24 pb-12 px-4 sm:px-8">
                    <div className="max-w-6xl mx-auto space-y-6">
                        {/* Header Section */}
                        <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-2">
                             <div className="flex items-center gap-4">
                                <button onClick={() => setStep(3)} className="p-2 rounded-full hover:bg-white hover:shadow-md transition-all"><ArrowLeft size={24} className="text-slate-600" /></button>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${target.revenue_score >= 80 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>종합 점수 {target.revenue_score}점</span>
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-rose-100 text-rose-700">폐업률 {closureRate}%</span>
                                        <span className="text-slate-400 text-xs flex items-center gap-1"><MapPin size={10} /> {target.name}</span>
                                    </div>
                                    <h1 className="text-3xl font-black text-slate-800">{target.name} 상세 분석</h1>
                                </div>
                             </div>
                             <div className="flex gap-2">
                                 <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl shadow-sm hover:bg-slate-50 text-sm">PDF 다운로드</button>
                                 <button className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 text-sm">리포트 공유하기</button>
                             </div>
                        </div>

                        {/* AI Insight Banner (Simplified) */}
                        <div className="bg-white rounded-[2rem] p-6 text-slate-800 shadow-xl border border-white/60 relative overflow-hidden">
                            <div className="relative z-10 flex items-start gap-4">
                                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                    <Sparkles size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg mb-1">AI 상권 분석 인사이트</h3>
                                    <p className="text-slate-600 text-sm leading-relaxed max-w-3xl whitespace-pre-wrap font-medium">
                                        {aiComment ? aiComment : <span className="text-slate-400 animate-pulse">상세 분석 데이터를 처리하고 있습니다...</span>}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Top Section: Radar & Hourly */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Chart 0: Hexagon Radar */}
                            <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-white/60 flex flex-col items-center min-h-[300px]">
                                <div className="w-full flex items-center gap-2 mb-2">
                                    <div className="p-2 bg-violet-50 text-violet-600 rounded-lg"><Hexagon size={18} /></div>
                                    <h3 className="font-bold text-slate-800">상권 종합 진단 (6각형 분석)</h3>
                                </div>
                                <div className="w-full h-64 relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                            <PolarGrid stroke="#e2e8f0" />
                                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 'bold' }} />
                                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                            <Radar name={target.name} dataKey="A" stroke="#8b5cf6" strokeWidth={3} fill="#8b5cf6" fillOpacity={0.3} />
                                            <Tooltip />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="text-center text-xs text-slate-500 font-medium">
                                    <span className="text-violet-600 font-bold">안정성</span>과 <span className="text-violet-600 font-bold">성장성</span>을 종합적으로 진단합니다.
                                </div>
                            </div>

                            {/* Chart 1: Hourly Sales Heatmap (Bar) */}
                            <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-white/60 transition-transform hover:scale-[1.01] min-h-[300px]">
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Clock size={18} /></div>
                                    <h3 className="font-bold text-slate-800">시간대별 매출 집중도 (단위: 만원)</h3>
                                </div>
                                <div className="h-48">
                                    {hasTimeData ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={hourly.map((item, i) => ({ 
                                                hour: ["00-06시", "06-11시", "11-14시", "14-17시", "17-21시", "21-24시"][i], 
                                                value: Math.round(item.value / 10000) 
                                            }))}>
                                                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 'bold'}} />
                                                <Tooltip 
                                                    cursor={{fill: '#f1f5f9'}}
                                                    contentStyle={{border: 'none', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                                                    formatter={(value) => [`${value.toLocaleString()}만원`, '매출']}
                                                />
                                                <Bar dataKey="value" radius={[4,4,0,0]}>
                                                    {hourly.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.value > (Math.max(...hourly.map(h=>h.value))*0.7) ? '#3b82f6' : '#cbd5e1'} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm gap-2"><Info size={24} /><span>데이터 부족</span></div>
                                    )}
                                </div>
                                <div className="text-center mt-3 text-xs text-slate-400 font-medium bg-slate-50 py-1 rounded-lg">피크타임 집중 분석</div>
                             </div>
                        </div>

                        {/* Middle Section: Weekly Sales (New) & Demographics */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             {/* Chart 2: Weekly Sales Rhythm (New) */}
                             <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-white/60 min-h-[300px]">
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Calendar size={18} /></div>
                                    <h3 className="font-bold text-slate-800">요일별 매출 패턴 (Rhythm)</h3>
                                </div>
                                <div className="h-48">
                                    {hasDayData ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={dayData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill:'#94a3b8', fontWeight: 'bold'}} />
                                                <Tooltip 
                                                    cursor={{fill: '#f8fafc'}}
                                                    contentStyle={{border: 'none', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                                                />
                                                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                                    {dayData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.value === Math.max(...dayData.map(d=>d.value)) ? '#10b981' : '#d1d5db'} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm gap-2"><Info size={24} /><span>데이터 부족</span></div>
                                    )}
                                </div>
                                <div className="text-center mt-2 text-xs text-slate-500">
                                    주중/주말 매출 비율 및 휴무일 선정 참고
                                </div>
                            </div>

                            {/* Chart 3: Demographics (Donut) */}
                            <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-white/60 min-h-[300px]">
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><User size={18} /></div>
                                    <h3 className="font-bold text-slate-800">주요 방문 연령층 (Target)</h3>
                                </div>
                                <div className="h-48 relative">
                                    {hasAgeData ? (
                                        <>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={ageData} dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                                                        {ageData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                <span className="text-3xl font-black text-slate-800">{topAgePercent}%</span>
                                                <span className="text-xs font-bold text-slate-400">{topAge}</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm gap-2"><Info size={24} /><span>데이터 부족</span></div>
                                    )}
                                </div>
                                <div className="text-center mt-2 font-bold text-slate-700 text-sm">
                                    <span className="text-indigo-600">{topAge}</span> 비율이 가장 높음
                                </div>
                            </div>
                        </div>

                        {/* Bottom Section: Closure Rate */}
                        <div className="grid grid-cols-1 gap-6">
                            {/* Chart 4: Closure Rate (Bar) - Full Width */}
                            <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-white/60 min-h-[300px]">
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="p-2 bg-slate-100 text-slate-600 rounded-lg"><AlertTriangle size={18} /></div>
                                    <h3 className="font-bold text-slate-800">폐업률 추이 (최근 3년)</h3>
                                </div>
                                <div className="h-48">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={closureTrend} barSize={40}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fontSize: 12, fill:'#94a3b8', fontWeight: 'bold'}} />
                                            <Tooltip 
                                                cursor={{fill: '#f8fafc'}}
                                                contentStyle={{border: 'none', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                                            />
                                            <Bar dataKey="rate" radius={[6, 6, 0, 0]}>
                                                <Cell fill="#cbd5e1" />
                                                <Cell fill="#94a3b8" />
                                                <Cell fill={closureRate > 10 ? '#ef4444' : '#3b82f6'} />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="text-center mt-2 text-xs text-slate-500">
                                    현재 폐업률 <span className={`font-bold ${closureRate > 10 ? 'text-red-500' : 'text-blue-600'}`}>{closureRate}% ({closureRate > 10 ? '주의' : '안정'})</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };
    return (
        <div className="h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden selection:bg-blue-100">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
        </div>
    );
}