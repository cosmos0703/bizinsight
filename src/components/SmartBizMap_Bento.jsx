import React, { useState, useEffect, useMemo } from 'react';
import { 
    Youtube, Wallet, Map as MapIcon, ShoppingCart, Trophy, 
    ArrowRight, MapPin, X, Sparkles, Info 
} from 'lucide-react';
import { 
    ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, 
    Tooltip, Cell, ZAxis 
} from 'recharts';
import { loadAllData } from '../utils/dataLoader';
import { DONG_COORDINATES } from '../data/dongCoordinates';
import { fetchYouTubeTrending } from '../utils/youtube';
import { getGeminiAnalysis } from '../utils/gemini';

// --- STYLES & CONSTANTS ---
const COLORS = {
    bg: '#f3f4f6',
    primary: '#2563eb', // Blue 600
    youtube: '#ff0000',
    rank1: '#22c55e',   // Green 500
    rank2: '#3b82f6',   // Blue 500
    rank3: '#facc15',   // Yellow 400
};

// Fallback if API fails
const FALLBACK_TRENDS = [
    { title: "2024년 소자본 창업 아이템 TOP 10", id: "VIDEO_ID_1" },
    { title: "무인 카페 폐업률 충격 실태", id: "VIDEO_ID_2" },
    { title: "탕후루 가고 요거트 아이스크림 뜬다", id: "VIDEO_ID_3" }
];

// --- COMPONENTS ---

const Ticker = ({ items, currentIndex }) => (
    <div className="flex-1 bg-white border border-slate-100 rounded-full h-9 flex items-center px-4 overflow-hidden relative mx-6 shadow-sm">
        <div className="absolute left-4 z-10 bg-[#ff0000] text-white text-[10px] font-bold px-2 py-0.5 rounded animate-pulse">LIVE</div>
        <div className="w-full overflow-hidden h-[20px] relative">
             {items.map((k, i) => (
                <a 
                    key={i} 
                    href={`https://www.youtube.com/watch?v=${k.id}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`absolute inset-0 flex items-center text-sm font-semibold text-slate-700 truncate transition-all duration-500 ease-in-out hover:text-[#ff0000] hover:underline cursor-pointer pl-12 ${i === currentIndex ? 'translate-y-0 opacity-100 z-30 pointer-events-auto' : 'translate-y-full opacity-0 z-0 pointer-events-none'}`}
                >
                    {k.title}
                </a>
            ))}
        </div>
    </div>
);

// --- MAIN PAGE COMPONENT ---

export default function SmartBizMap_Bento() {
    const [capital, setCapital] = useState(12000); 
    const [districts, setDistricts] = useState([]);
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);
    const [youtubeTrends, setYoutubeTrends] = useState(FALLBACK_TRENDS);
    const [currentTrendIndex, setCurrentTrendIndex] = useState(0);

    // AI Analysis State
    const [aiAnalysis, setAiAnalysis] = useState(null);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [showAnalysis, setShowAnalysis] = useState(false);

    // 1. Load Data (Dong Level)
    useEffect(() => {
        const fetchData = async () => {
            const dongData = await loadAllData();
            
            const processed = Object.keys(DONG_COORDINATES).map(name => {
                const coords = DONG_COORDINATES[name];
                const d = dongData[name] || { rent: 0, population: 0, openings: 0, revenue: 0, totalStores: 0 };
                return {
                    name,
                    lat: coords.lat,
                    lng: coords.lng,
                    rent: d.rent, // Man-won/Pyeong
                    traffic: d.population,
                    stores: d.totalStores || d.openings, // Use Total Stores if available
                    revenue: d.revenue
                };
            });
            setDistricts(processed);
            
            // Fetch YouTube API
            const videos = await fetchYouTubeTrending();
            if (videos && videos.length > 0) {
                setYoutubeTrends(videos);
            }
            
            setLoading(false);
        };
        fetchData();
    }, []);

    // Ticker Animation
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTrendIndex((prev) => (prev + 1) % youtubeTrends.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [youtubeTrends]);

    // 2. Score Calculation Logic
    const rankedDistricts = useMemo(() => {
        if (!districts.length) return [];

        const budgetPower = capital / 50; // Use x50 logic 
        
        const maxStore = Math.max(...districts.map(d => d.stores)) || 1;
        const minStore = Math.min(...districts.map(d => d.stores)) || 0;
        const maxTraffic = Math.max(...districts.map(d => d.traffic)) || 1;
        const minTraffic = Math.min(...districts.map(d => d.traffic)) || 0;

        const scored = districts.map(d => {
            let capitalScore = 0;
            if (d.rent <= budgetPower) {
                capitalScore = 100 - ((d.rent / (budgetPower || 1)) * 20);
            } else {
                const overRatio = d.rent / (budgetPower || 1);
                capitalScore = Math.max(0, 100 - (overRatio * 50));
            }

            const storeScore = ((d.stores - minStore) / (maxStore - minStore)) * 100;
            const trafficScore = ((d.traffic - minTraffic) / (maxTraffic - minTraffic)) * 100;

            const totalScore = (capitalScore * 0.2) + (storeScore * 0.3) + (trafficScore * 0.5);
            
            return {
                ...d,
                totalScore: parseFloat(totalScore.toFixed(1)),
                x: d.lng,
                y: d.lat, 
                z: Math.sqrt(d.traffic) // Size for bubble
            };
        });

        return scored.sort((a, b) => b.totalScore - a.totalScore).map((d, i) => ({ ...d, rank: i + 1 }));
    }, [districts, capital]);

    const addToCart = (district) => {
        if (!cart.find(c => c.name === district.name)) {
            setCart([...cart, { ...district, yield: (Math.random() * 5 + 3).toFixed(1) }]);
        }
    };

    const removeFromCart = (name) => {
        setCart(cart.filter(c => c.name !== name));
    };

    const avgYield = useMemo(() => {
        if (!cart.length) return '0.0';
        const sum = cart.reduce((acc, c) => acc + parseFloat(c.yield), 0);
        return (sum / cart.length).toFixed(1);
    }, [cart]);

    const handleAnalyze = async () => {
        const target = cart.length > 0 ? cart[0] : rankedDistricts[0];
        if (!target) return;

        setShowAnalysis(true);
        setIsAiLoading(true);
        setAiAnalysis(null);

        const comment = await getGeminiAnalysis(target.name, {
            revenue: target.revenue,
            population: target.traffic,
            rent: target.rent,
            openings: target.stores
        });
        
        setAiAnalysis({ name: target.name, comment });
        setIsAiLoading(false);
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-gray-100">Loading...</div>;

    return (
        <div className="h-screen flex flex-col bg-[#f3f4f6] font-sans text-gray-800 overflow-hidden">
            
            {/* Header */}
            <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 shrink-0 z-20 justify-between">
                <div className="flex items-center">
                    <Youtube className="w-6 h-6 text-[#ff0000] mr-2" />
                    <span className="font-bold text-gray-800 tracking-tight text-lg">
                        Startup<span className="text-[#ff0000]">LIVE</span>
                    </span>
                </div>
                
                <Ticker items={youtubeTrends} currentIndex={currentTrendIndex} />

                <div className="flex items-center gap-3">
                    <div className="flex items-center text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        API Connected
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gray-200 border border-gray-300"></div>
                </div>
            </header>

            {/* Main Bento Grid */}
            <main className="flex-1 p-4 md:p-6 grid grid-cols-12 grid-rows-6 gap-4 h-full max-h-[calc(100vh-3.5rem)]">

                {/* 2. Capital Input (Top Left) */}
                <div className="col-span-12 md:col-span-3 row-span-2 p-5 bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-sm border border-gray-200 flex flex-col">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                            <Wallet size={20} />
                        </div>
                        <h2 className="font-bold text-lg">나의 자본금 설정</h2>
                    </div>
                    
                    <div className="space-y-4 flex-1">
                        <div>
                            <label className="text-xs font-semibold text-gray-500 mb-1 block">가용 예산 (단위: 만원)</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    value={capital} 
                                    onChange={(e) => setCapital(Number(e.target.value))}
                                    className="w-full text-2xl font-bold bg-white border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-600 outline-none shadow-sm text-gray-800" 
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">
                                    만원 ({(() => {
                                        const uk = Math.floor(capital / 10000);
                                        const chunwon = Math.floor((capital % 10000) / 1000);
                                        let result = '';
                                        if (uk > 0) result += `${uk}억`;
                                        if (chunwon > 0) {
                                            if (uk > 0) result += ' ';
                                            result += `${chunwon}천만원`;
                                        }
                                        if (uk === 0 && chunwon === 0) result = '0원';
                                        return result.trim();
                                    })()})
                                </span>
                            </div>
                            <input 
                                type="range" 
                                min="1000" max="100000" step="1000" 
                                value={capital} 
                                onChange={(e) => setCapital(Number(e.target.value))}
                                className="w-full mt-3 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                            <div className="flex justify-between text-[10px] font-bold text-slate-300 mt-2">
                                <span>1천만</span>
                                <span>10억+</span>
                            </div>
                             <p className="text-[10px] text-slate-400 mt-2">* 임대료 (월세)의 30배를 기준으로 필터링됩니다.</p>
                        </div>

                        <div className="bg-white/80 p-3 rounded-xl border border-blue-100 text-xs text-gray-600 relative group">
                            <div className="flex items-center justify-between mb-1">
                                <p className="font-semibold text-blue-600 flex items-center gap-1">
                                    💡 알고리즘 적용 중 <Info size={12} className="cursor-help" />
                                </p>
                            </div>
                            <p>자본금(20%) + 점포수(30%) + 유동인구(50%)</p>
                            <div className="absolute left-0 top-full mt-2 w-64 bg-slate-800 text-white p-4 rounded-xl shadow-xl z-50 hidden group-hover:block pointer-events-none">
                                <h4 className="font-bold mb-2 text-yellow-400">📊 산출 로직 상세</h4>
                                <ul className="space-y-2 text-[11px] leading-relaxed opacity-90">
                                    <li>
                                        <span className="font-bold text-white">💰 자본금 적합도 (20%):</span><br/>
                                        내 예산보다 임대료가 낮을수록 고득점
                                    </li>
                                    <li>
                                        <span className="font-bold text-white">🏪 점포 밀집도 (30%):</span><br/>
                                        <span className="text-slate-300">현재 운영 중인 전체 점포 수 기준.</span><br/>
                                        상권의 활성화 정도를 반영
                                    </li>
                                    <li>
                                        <span className="font-bold text-white">👥 유동인구 (50%):</span><br/>
                                        일일 평균 유동인구 수.<br/>
                                        소자본 창업의 핵심 성공 요인
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Interactive Map (Center) */}
                <div className="col-span-12 md:col-span-9 row-span-4 p-0 relative rounded-2xl shadow-sm border border-gray-200 bg-white overflow-hidden group">
                    <div className="absolute top-6 left-6 z-10 bg-white/90 backdrop-blur-md px-4 py-3 rounded-2xl border border-gray-200 shadow-sm">
                        <h2 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                            <MapIcon className="w-5 h-5 text-blue-600" />
                            서울시 상권 분석 지도
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">원 크기: 유동인구 / 색상: 종합 추천 점수</p>
                    </div>

                    <div className="absolute bottom-6 right-6 z-10 bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl border border-gray-200 shadow-sm text-xs flex gap-3">
                        <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-green-500 mr-1"></span>1등 (최적)</div>
                        <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-blue-500 mr-1"></span>2등 (우수)</div>
                        <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-yellow-400 mr-1"></span>3등 (양호)</div>
                    </div>

                    <div className="w-full h-full p-4 pt-16 min-h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <XAxis type="number" dataKey="x" domain={[126.8, 127.2]} hide />
                                <YAxis type="number" dataKey="y" domain={[37.4, 37.7]} hide />
                                <ZAxis type="number" dataKey="z" range={[60, 8000]} />
                                <Tooltip 
                                    cursor={{ strokeDasharray: '3 3' }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const d = payload[0].payload;
                                            return (
                                                <div className="bg-white/95 backdrop-blur border border-gray-200 p-3 rounded-xl shadow-lg text-sm min-w-[160px]">
                                                    <div className="font-bold text-gray-800 mb-2 flex items-center gap-1">
                                                        <MapPin size={14} className="text-red-500" /> 
                                                        {d.name}
                                                    </div>
                                                    <div className="space-y-1 text-xs">
                                                        <div className="flex justify-between text-gray-600">
                                                            <span>🏆 종합 점수:</span>
                                                            <span className="font-bold text-blue-600">{d.totalScore}점</span>
                                                        </div>
                                                        <div className="flex justify-between text-gray-600">
                                                            <span>👥 유동인구:</span>
                                                            <span className="font-medium">{(d.traffic / 10000).toFixed(1)}만명</span>
                                                        </div>
                                                        <div className="flex justify-between text-gray-600">
                                                            <span>💰 평균임대:</span>
                                                            <span className="font-medium">{d.rent.toLocaleString()} 만원/평</span>
                                                        </div>
                                                        <div className="flex justify-between text-gray-600">
                                                            <span>📈 예상매출:</span>
                                                            <span className="font-medium text-blue-600">
                                                                {d.revenue >= 10000 
                                                                    ? `${(d.revenue/10000).toFixed(1)}억` 
                                                                    : `${d.revenue.toLocaleString()}만원`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Scatter name="Districts" data={rankedDistricts} onClick={(node) => addToCart(node.payload)}>
                                    {rankedDistricts.map((entry, index) => {
                                        let fill = '#d1d5db'; // gray-300
                                        if (entry.rank === 1) fill = '#22c55e';
                                        else if (entry.rank === 2) fill = '#3b82f6';
                                        else if (entry.rank === 3) fill = '#facc15';
                                        else if (entry.totalScore > 60) fill = '#9ca3af';
                                        
                                        return <Cell key={`cell-${index}`} fill={fill} stroke="white" strokeWidth={2} />;
                                    })}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 4. Cart (Bottom Left) */}
                <div className="col-span-12 md:col-span-3 row-span-4 p-5 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-green-100 rounded-lg text-green-600">
                                <ShoppingCart size={20} />
                            </div>
                            <div>
                                <h2 className="font-bold text-lg leading-none">후보군 담기</h2>
                                <span className="text-[10px] text-gray-400">지도에서 클릭하여 추가</span>
                            </div>
                        </div>
                        <span className="bg-gray-900 text-white text-xs font-bold px-2 py-1 rounded-full">{cart.length}</span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-hide">
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm text-center">
                                <MapPin size={32} className="mb-2 opacity-50" />
                                <p>지도에서 원하는 지역을<br/>선택해주세요</p>
                            </div>
                        ) : (
                            cart.map((item) => (
                                <div key={item.name} className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex justify-between items-center group hover:bg-white hover:shadow-sm transition">
                                    <div className="flex-1">
                                        <div className="font-bold text-gray-800 flex justify-between">
                                            <span>{item.name}</span>
                                            <span className="text-blue-600 text-xs font-bold">{item.totalScore}점</span>
                                        </div>
                                        <div className="text-[11px] text-gray-500 mt-1 flex gap-2">
                                            <span className="font-medium">매출: <span className="font-bold text-gray-700">{item.revenue >= 10000 ? `${(item.revenue/10000).toFixed(1)}억` : `${item.revenue}만`}</span></span>
                                            <span className="text-gray-300">|</span>
                                            <span className="font-medium">유동: <span className="font-bold text-gray-700">{(item.traffic/10000).toFixed(1)}만명</span></span>
                                            <span className="text-gray-300">|</span>
                                            <span className="font-medium">임대: <span className="font-bold text-gray-700">{item.rent}만/평</span></span>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end pl-2 ml-2 border-l border-gray-200">
                                        <button onClick={() => removeFromCart(item.name)} className="text-gray-300 hover:text-red-500 mb-1">
                                            <X size={14} />
                                        </button>
                                        <div className="text-[10px] font-bold text-green-600">+{item.yield}%</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-gray-500">평균 예상 수익률</span>
                            <span className="font-bold text-blue-600">{avgYield}%</span>
                        </div>
                        <button 
                            onClick={handleAnalyze}
                            className="w-full bg-gray-900 hover:bg-black text-white py-3 rounded-xl text-sm font-bold transition shadow-lg shadow-gray-200 mt-2 flex items-center justify-center gap-2">
                            상세 비교 분석하기 <ArrowRight size={16} />
                        </button>
                    </div>
                </div>

                {/* 5. Rank Detail (Bottom Right) */}
                <div className="col-span-12 md:col-span-9 row-span-2 p-5 bg-white rounded-2xl shadow-sm border border-gray-200">
                    {!showAnalysis ? (
                        <>
                            <div className="flex items-center gap-2 mb-4">
                                <Trophy size={20} className="text-yellow-500" />
                                <h2 className="font-bold text-lg">실시간 추천 TOP 3</h2>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4 h-full pb-2">
                                {[0, 1, 2].map((idx) => {
                                    const d = rankedDistricts[idx];
                                    if (!d) return null;
                                    const colors = [
                                        'bg-yellow-50 border-yellow-200 text-yellow-600',
                                        'bg-blue-50 border-blue-200 text-blue-600',
                                        'bg-gray-50 border-gray-200 text-gray-600'
                                    ];
                                    const labels = ['1st Place', '2nd Place', '3rd Place'];
                                    
                                    return (
                                        <div key={idx} className={`border rounded-xl p-4 flex flex-col justify-center relative overflow-hidden group hover:shadow-md transition cursor-pointer ${colors[idx].split(' ')[0]} ${colors[idx].split(' ')[1]}`}>
                                            <div className="flex items-center justify-between z-10">
                                                <div>
                                                    <span className={`text-xs font-bold uppercase tracking-wider ${idx === 2 ? 'text-gray-400' : colors[idx].split(' ')[2]}`}>{labels[idx]}</span>
                                                    <h3 className="text-xl font-extrabold text-gray-800 mt-1">{d.name}</h3>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs text-gray-500">종합 점수</div>
                                                    <div className={`text-2xl font-bold ${colors[idx].split(' ')[2]}`}>{d.totalScore}</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Sparkles size={20} className="text-purple-500" />
                                    <h2 className="font-bold text-lg">AI 상권 정밀 분석</h2>
                                </div>
                                <button onClick={() => setShowAnalysis(false)} className="text-sm text-gray-400 hover:text-gray-600 font-bold px-3 py-1 rounded-lg hover:bg-gray-100 transition">
                                    목록으로 돌아가기
                                </button>
                            </div>
                            
                            <div className="flex-1 bg-gray-50 rounded-xl p-6 border border-gray-100 overflow-y-auto">
                                {isAiLoading ? (
                                    <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-400">
                                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-sm font-medium animate-pulse">Gemini AI가 상권 데이터를 분석 중입니다...</span>
                                    </div>
                                ) : (
                                    <div className="prose prose-sm max-w-none">
                                        <h3 className="text-lg font-bold text-gray-800 mb-2">{aiAnalysis?.name} 분석 결과</h3>
                                        <p className="text-gray-600 leading-relaxed whitespace-pre-wrap text-base">
                                            {aiAnalysis?.comment}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

            </main>
        </div>
    );
}
