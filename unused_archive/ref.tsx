import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import {
    BarChart2, Filter, Info, CheckCircle, ArrowRight, Search, TrendingUp, 
    DollarSign, Activity, Map as MapIcon, X, Check, Bell, Zap, 
    ShoppingCart, Plus, Layers, Sparkles, MapPin, Trophy, Users, AlertTriangle,
    ChevronDown, Hexagon, Clock, Calendar, User, HelpCircle, ZoomIn
} from 'lucide-react';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ScatterChart, Scatter, Cell, PieChart, Pie, Cell as PieCell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
    LineChart, Line
} from 'recharts';

/**
 * MOCK DATA: Market Positioning
 * 데이터의 편차를 더 현실적으로 조정하고 카테고리를 명확히 함
 */
const MOCK_INDUSTRY_DATA = [
    { name: "저가커피", sales: 2200, startupCost: 5000, survival: 92, growth: 80, density: 90, ticket: 2500, stability: 70, category: 'Food' },
    { name: "대형베이커리", sales: 15000, startupCost: 80000, survival: 78, growth: 30, density: 40, ticket: 12000, stability: 85, category: 'Food' },
    { name: "편의점", sales: 4800, startupCost: 7000, survival: 85, growth: 10, density: 95, ticket: 6000, stability: 90, category: 'Retail' },
    { name: "치킨/호프", sales: 3800, startupCost: 8000, survival: 65, growth: 40, density: 85, ticket: 22000, stability: 60, category: 'Food' },
    { name: "한식당", sales: 5500, startupCost: 15000, survival: 70, growth: 20, density: 70, ticket: 15000, stability: 75, category: 'Food' },
    { name: "패스트푸드", sales: 8500, startupCost: 30000, survival: 82, growth: 50, density: 60, ticket: 8000, stability: 85, category: 'Food' },
    { name: "PC방", sales: 3500, startupCost: 25000, survival: 60, growth: -5, density: 50, ticket: 5000, stability: 80, category: 'Service' },
    { name: "1인미용실", sales: 1200, startupCost: 3000, survival: 75, growth: 15, density: 80, ticket: 25000, stability: 78, category: 'Service' },
    { name: "네일숍", sales: 1000, startupCost: 2500, survival: 55, growth: 60, density: 60, ticket: 40000, stability: 65, category: 'Service' },
    { name: "대형약국", sales: 25000, startupCost: 50000, survival: 98, growth: 10, density: 40, ticket: 12000, stability: 98, category: 'Retail' },
    { name: "무인빨래방", sales: 1500, startupCost: 12000, survival: 88, growth: 40, density: 45, ticket: 8000, stability: 90, category: 'Service' },
    { name: "탕후루", sales: 2800, startupCost: 6000, survival: 45, growth: 120, density: 75, ticket: 4000, stability: 40, category: 'Food' },
];

const TARGET_INDUSTRIES = [
    { name: "저가커피", label: "저가 커피 (Low Price)", color: "#f97316" },
    { name: "편의점", label: "편의점 (Store)", color: "#10b981" },
    { name: "치킨/호프", label: "치킨 (Chicken)", color: "#ef4444" }
];

// --- COMPONENTS ---

const HeaderPill = ({ step, setStep }) => (
    <header className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 pointer-events-auto w-auto max-w-[95vw]">
        <div className="bg-white/70 backdrop-blur-xl shadow-lg shadow-blue-900/5 rounded-full px-4 sm:px-6 py-2.5 flex items-center gap-4 sm:gap-6 border border-white/40 transition-all hover:scale-[1.01] hover:bg-white/80">
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setStep(1)}>
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md shadow-blue-500/30 group-hover:bg-blue-700 transition-colors">B</div>
                <span className="font-extrabold text-slate-800 text-lg tracking-tight hidden sm:block">Smart Biz-Map</span>
            </div>
            <div className="h-5 w-px bg-slate-300/50 mx-1 hidden sm:block"></div>
            <div className="flex items-center gap-1.5 text-sm">
                {[1, 2, 3, 4].map((s) => (
                    <button
                        key={s}
                        onClick={() => setStep(s)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-bold transition-all ${step === s
                            ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-600 ring-offset-1'
                            : step > s
                                ? 'text-blue-600 hover:bg-blue-50'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] transition-colors ${step === s ? 'bg-white text-blue-600' : step > s ? 'bg-blue-100 text-blue-600' : 'border border-slate-300'}`}>
                            {step > s ? <Check size={10} strokeWidth={3} /> : s}
                        </span>
                        <span className={step === s ? 'block' : 'hidden md:block'}>
                            {s === 1 ? '업종' : s === 2 ? '탐색' : s === 3 ? '비교' : '분석'}
                        </span>
                    </button>
                ))}
            </div>
            <div className="ml-1 pl-3 border-l border-slate-300/50">
                <button className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 relative">
                    <Bell size={18} />
                    <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                </button>
            </div>
        </div>
    </header>
);

const SimpleRadar = ({ data, color }) => {
    const radarData = [
        { subject: '매출', A: Math.min(100, (data.sales / 10000) * 100), fullMark: 100 },
        { subject: '성장', A: Math.max(0, data.growth + 20), fullMark: 100 },
        { subject: '밀집', A: data.density, fullMark: 100 },
        { subject: '단가', A: (data.ticket / 40000) * 100, fullMark: 100 },
        { subject: '안정', A: data.stability, fullMark: 100 },
    ];

    return (
        <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                <Radar name={data.name} dataKey="A" stroke={color} strokeWidth={2} fill={color} fillOpacity={0.3} />
            </RadarChart>
        </ResponsiveContainer>
    );
};

// --- IMPROVED CHART LOGIC: LOG SCALE & DYNAMIC FIT ---
const MarketPositionMap = ({ data, selectedIndustry, onSelect }) => {
    const svgRef = useRef(null);
    const [hovered, setHovered] = useState(null);

    useEffect(() => {
        if (!svgRef.current || data.length === 0) return;
        
        const width = 800;
        const height = 500;
        const margin = { top: 30, right: 40, bottom: 50, left: 60 };
        const chartW = width - margin.left - margin.right;
        const chartH = height - margin.top - margin.bottom;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        // 1. Calculate Dynamic Domains (Min/Max from Data)
        const xMin = d3.min(data, d => d.startupCost) * 0.8 || 1000;
        const xMax = d3.max(data, d => d.startupCost) * 1.5 || 100000;
        const yMin = d3.min(data, d => d.sales) * 0.8 || 500;
        const yMax = d3.max(data, d => d.sales) * 1.5 || 20000;

        // 2. Log Scales
        const xScale = d3.scaleLog().domain([xMin, xMax]).range([0, chartW]).nice();
        const yScale = d3.scaleLog().domain([yMin, yMax]).range([chartH, 0]).nice();
        const rScale = d3.scaleLinear().domain([40, 100]).range([12, 40]); // Larger bubbles

        const g = svg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);

        // 3. Draw Background Zones (Quadrants)
        const midXVal = Math.sqrt(xMin * xMax);
        const midYVal = Math.sqrt(yMin * yMax);
        
        const midX = xScale(midXVal);
        const midY = yScale(midYVal);

        const zones = g.append("g").attr("class", "zones");
        
        const zoneColors = [
            { x: 0, y: 0, w: midX, h: midY, color: "#ecfdf5", label: "💎 알짜배기", sub: "저비용 / 고수익" },
            { x: midX, y: 0, w: chartW - midX, h: midY, color: "#eff6ff", label: "🏢 하이리스크", sub: "고비용 / 고수익" },
            { x: 0, y: midY, w: midX, h: chartH - midY, color: "#f8fafc", label: "🐣 소자본/생계형", sub: "저비용 / 저수익" },
            { x: midX, y: midY, w: chartW - midX, h: chartH - midY, color: "#fef2f2", label: "💣 고위험군", sub: "고비용 / 저수익" }
        ];

        zoneColors.forEach(z => {
            // Zone Background
            zones.append("rect")
                .attr("x", z.x).attr("y", z.y).attr("width", z.w).attr("height", z.h)
                .attr("fill", z.color).attr("opacity", 0.6);
            
            // Watermark Text (Centered in Zone)
            zones.append("text")
                .attr("x", z.x + z.w / 2).attr("y", z.y + z.h / 2 - 10)
                .text(z.label)
                .attr("text-anchor", "middle")
                .attr("font-size", "24px").attr("font-weight", "900")
                .attr("fill", "#000").attr("fill-opacity", 0.06) // Very subtle watermark
                .style("pointer-events", "none");
                
            zones.append("text")
                .attr("x", z.x + z.w / 2).attr("y", z.y + z.h / 2 + 15)
                .text(z.sub)
                .attr("text-anchor", "middle")
                .attr("font-size", "14px").attr("font-weight", "600")
                .attr("fill", "#000").attr("fill-opacity", 0.06)
                .style("pointer-events", "none");
        });

        // 4. Grid Lines
        const makeXGrid = () => d3.axisBottom(xScale).ticks(5, "~s");
        const makeYGrid = () => d3.axisLeft(yScale).ticks(5, "~s");

        g.append("g").attr("class", "grid-x")
            .attr("transform", `translate(0,${chartH})`)
            .call(makeXGrid().tickSize(-chartH).tickFormat("").tickSizeOuter(0))
            .attr("stroke-opacity", 0.1).attr("color", "#94a3b8");

        g.append("g").attr("class", "grid-y")
            .call(makeYGrid().tickSize(-chartW).tickFormat("").tickSizeOuter(0))
            .attr("stroke-opacity", 0.1).attr("color", "#94a3b8");

        // 5. Axes
        const formatMoney = (val) => {
            if (val >= 10000) return (val/10000) + "억";
            if (val >= 1000) return (val/1000).toFixed(0) + "천만";
            return val;
        };

        g.append("g").attr("transform", `translate(0,${chartH})`)
            .call(d3.axisBottom(xScale).ticks(5).tickFormat(d => formatMoney(d)))
            .attr("color", "#64748b").attr("font-weight", "700").attr("font-size", "11px")
            .selectAll("text").attr("dy", "10");
        
        g.append("g")
            .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => formatMoney(d)))
            .attr("color", "#64748b").attr("font-weight", "700").attr("font-size", "11px")
            .selectAll("text").attr("dx", "-5");

        // Axis Titles & Arrows
        const defs = svg.append("defs");
        defs.append("marker")
            .attr("id", "arrow")
            .attr("viewBox", "0 0 10 10")
            .attr("refX", 5).attr("refY", 5)
            .attr("markerWidth", 6).attr("markerHeight", 6)
            .attr("orient", "auto-start-reverse")
            .append("path").attr("d", "M 0 0 L 10 5 L 0 10 z").attr("fill", "#94a3b8");

        // X Axis Arrow
        g.append("line")
            .attr("x1", chartW).attr("y1", chartH + 35)
            .attr("x2", chartW + 20).attr("y2", chartH + 35)
            .attr("stroke", "#94a3b8").attr("stroke-width", 1.5)
            .attr("marker-end", "url(#arrow)");
        
        g.append("text")
            .attr("x", chartW)
            .attr("y", chartH + 38)
            .attr("text-anchor", "end")
            .text("창업 비용 높음")
            .attr("fill", "#64748b").attr("font-size", "11px").attr("font-weight", "bold");

        // Y Axis Arrow
        g.append("line")
            .attr("x1", -45).attr("y1", 0)
            .attr("x2", -45).attr("y2", -20)
            .attr("stroke", "#94a3b8").attr("stroke-width", 1.5)
            .attr("marker-end", "url(#arrow)");

        g.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -55)
            .attr("x", 0)
            .attr("text-anchor", "end")
            .text("월 매출 높음")
            .attr("fill", "#64748b").attr("font-size", "11px").attr("font-weight", "bold");

        // 6. Bubbles with Distinct Colors
        const createGradient = (id, color) => {
            const grad = defs.append("radialGradient").attr("id", id).attr("cx", "30%").attr("cy", "30%").attr("r", "70%");
            grad.append("stop").attr("offset", "0%").attr("stop-color", "#ffffff").attr("stop-opacity", 0.4);
            grad.append("stop").attr("offset", "100%").attr("stop-color", color).attr("stop-opacity", 0.9);
        };
        // Define distinct colors per category
        createGradient("grad-food", "#ef4444");   // Red for Food
        createGradient("grad-retail", "#10b981"); // Green for Retail
        createGradient("grad-service", "#3b82f6"); // Blue for Service
        createGradient("grad-select", "#6366f1");  // Indigo for Selection

        const getFill = (d) => {
            if (selectedIndustry?.name === d.name) return "url(#grad-select)";
            if (d.category === 'Food') return "url(#grad-food)";
            if (d.category === 'Retail') return "url(#grad-retail)";
            if (d.category === 'Service') return "url(#grad-service)";
            return "#94a3b8";
        };

        const circles = g.selectAll("circle")
            .data(data)
            .join("circle")
            .attr("cx", d => xScale(d.startupCost))
            .attr("cy", d => yScale(d.sales))
            .attr("r", 0) // animate in
            .transition().duration(800).ease(d3.easeBackOut)
            .attr("r", d => rScale(d.survival));
            
        g.selectAll("circle")
            .style("fill", d => getFill(d))
            .style("stroke", "#fff")
            .style("stroke-width", 2)
            .style("filter", "drop-shadow(0px 3px 5px rgba(0,0,0,0.2))")
            .style("cursor", "pointer")
            .on("mouseover", function(e, d) {
                d3.select(this).transition().duration(200).attr("r", rScale(d.survival) * 1.2).style("stroke", "#1e293b");
                setHovered(d);
            })
            .on("mouseout", function(e, d) {
                d3.select(this).transition().duration(200).attr("r", rScale(d.survival)).style("stroke", "#fff");
                setHovered(null);
            })
            .on("click", (e, d) => onSelect(d));

        // 7. Labels
        g.selectAll(".label")
            .data(data)
            .join("text")
            .attr("x", d => xScale(d.startupCost))
            .attr("y", d => yScale(d.sales) + rScale(d.survival) + 14)
            .text(d => d.name)
            .attr("text-anchor", "middle")
            .attr("fill", "#334155")
            .attr("font-size", "11px")
            .attr("font-weight", "800")
            .style("pointer-events", "none")
            .style("text-shadow", "0 2px 4px rgba(255,255,255,1)")
            .attr("opacity", 0)
            .transition().delay(500).duration(500).attr("opacity", 1);

    }, [data, selectedIndustry]);

    return (
        <div className="relative w-full aspect-[16/10] bg-white rounded-3xl border border-slate-100 shadow-inner overflow-hidden">
            <svg ref={svgRef} width="100%" height="100%" viewBox="0 0 800 500" className="overflow-visible w-full h-full"></svg>
            
            {/* Tooltip */}
            {hovered && (
                <div 
                    className="absolute z-20 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-100 text-sm pointer-events-none animate-in fade-in zoom-in-95 duration-200"
                    style={{ left: '50%', top: '10%', transform: 'translate(-50%, 0)' }}
                >
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                        <span className="text-lg font-black text-slate-800">{hovered.name}</span>
                        <div className={`px-2 py-0.5 rounded-md text-xs font-bold flex items-center gap-1 ${hovered.survival > 80 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {hovered.survival > 80 ? <CheckCircle size={10}/> : <AlertTriangle size={10}/>}
                            생존율 {hovered.survival}%
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-slate-600">
                        <div>💰 비용: <span className="font-bold text-slate-800">{(hovered.startupCost/10000).toFixed(1)}억</span></div>
                        <div>📈 매출: <span className="font-bold text-slate-800">{(hovered.sales/10000).toFixed(1)}억</span></div>
                        <div>👥 밀집: <span className="font-bold text-slate-800">{hovered.density}%</span></div>
                        <div>💵 단가: <span className="font-bold text-slate-800">{hovered.ticket.toLocaleString()}원</span></div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- MAIN PAGE COMPONENT ---
const BusinessCategoryAnalysis = ({ onNext }) => {
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedIndustry, setSelectedIndustry] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [minStartupCost, setMinStartupCost] = useState(0);
    const [minSales, setMinSales] = useState(0);

    const filteredData = MOCK_INDUSTRY_DATA.filter(d => {
        const matchSearch = d.name.includes(searchTerm);
        const matchCategory = selectedCategory === 'All' || d.category === selectedCategory;
        const matchCost = (d.startupCost / 10000) >= minStartupCost;
        const matchSales = (d.sales / 10000) >= minSales;
        return matchSearch && matchCategory && matchCost && matchSales;
    });

    return (
        <div className="w-full relative">
            <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-blue-50/80 via-white to-transparent -z-10 pointer-events-none"></div>
            <div className="absolute -top-20 -left-20 w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-3xl -z-10 pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-50/50 rounded-full blur-3xl -z-10 pointer-events-none"></div>

            <div className="max-w-[1600px] mx-auto px-6 lg:px-10 pt-48 pb-20">
                
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full mb-3">
                            <Sparkles size={12} fill="currentColor"/> 2025 Market Insight
                        </div>
                        <h1 className="text-4xl lg:text-5xl font-black text-slate-900 mb-4 tracking-tight leading-tight">
                            성공적인 창업의 시작,<br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">데이터로 결정하세요.</span>
                        </h1>
                        <p className="text-lg text-slate-500 font-medium max-w-2xl leading-relaxed">
                            <span className="text-slate-800 font-bold">X축(비용)</span>과 <span className="text-slate-800 font-bold">Y축(수익)</span>을 통해 가성비 좋은 업종을 발굴하세요.<br/>
                            <span className="text-blue-600 font-bold bg-blue-50 px-1 rounded">Log Scale</span>을 적용하여 소자본 창업도 한눈에 비교할 수 있습니다.
                        </p>
                    </div>
                    
                    {selectedIndustry && (
                        <div className="bg-white/80 backdrop-blur-md p-4 rounded-3xl shadow-xl shadow-blue-200/40 border border-white flex items-center gap-6 animate-in zoom-in-95 duration-300 ring-1 ring-blue-100">
                            <div className="pl-2">
                                <div className="text-xs text-slate-400 font-bold mb-1 uppercase tracking-wider">Selected Industry</div>
                                <div className="text-2xl font-black text-slate-800 flex items-center gap-2">
                                    {selectedIndustry.name}
                                    <CheckCircle size={20} className="text-blue-500" fill="currentColor" color="white"/>
                                </div>
                            </div>
                            <button
                                onClick={() => onNext(selectedIndustry)}
                                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/30 transform active:scale-95 group"
                            >
                                <span>상권 분석 시작</span>
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Sidebar */}
                    <div className="col-span-12 lg:col-span-3 sticky top-36 z-10 space-y-6">
                        <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Search size={20} className="text-blue-500"/> 업종 검색
                            </h3>
                            <div className="relative mb-4">
                                <input
                                    type="text"
                                    placeholder="업종명 검색..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-4 pr-4 py-3.5 bg-slate-50 rounded-2xl text-slate-800 font-bold outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                {[
                                    { id: 'All', label: '전체', icon: '🏢' },
                                    { id: 'Food', label: '외식업', icon: '🍔' },
                                    { id: 'Retail', label: '소매업', icon: '🛍️' },
                                    { id: 'Service', label: '서비스업', icon: '💇' }
                                ].map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.id)}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${selectedCategory === cat.id
                                            ? 'bg-slate-900 text-white shadow-md'
                                            : 'bg-white text-slate-500 hover:bg-slate-50'
                                            }`}
                                    >
                                        <span className="flex items-center gap-2">{cat.icon} {cat.label}</span>
                                        {selectedCategory === cat.id && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
                            <div className="flex items-center gap-2 mb-6 text-slate-800 font-bold text-lg">
                                <Filter size={20} className="text-blue-500" /> 맞춤 필터
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between mb-2 text-sm font-bold"><span className="text-slate-400">최소 창업비용</span><span className="text-blue-600">{minStartupCost}억원</span></div>
                                    <input type="range" min="0" max="3" step="0.1" value={minStartupCost} onChange={(e) => setMinStartupCost(Number(e.target.value))} className="w-full h-1.5 bg-slate-100 rounded-lg accent-blue-600 cursor-pointer" />
                                </div>
                                <div>
                                    <div className="flex justify-between mb-2 text-sm font-bold">
                                        <div className="flex items-center gap-1">
                                            <span className="text-slate-400">안정성 (생존율)</span>
                                            <div className="group relative">
                                                <HelpCircle size={14} className="text-slate-400 cursor-help" />
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                                    3년 이상 폐업하지 않고 운영되는 비율입니다. 높을수록 안정적입니다.
                                                </div>
                                            </div>
                                        </div>
                                        <span className="text-blue-600">All</span>
                                    </div>
                                    {/* Slider functionality for survival rate can be added here similarly */}
                                    <div className="w-full h-1.5 bg-slate-100 rounded-lg relative overflow-hidden">
                                        <div className="absolute top-0 left-0 h-full bg-blue-600 w-1/3 opacity-30"></div>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                                        <span>낮음</span><span>높음</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="col-span-12 lg:col-span-9 space-y-8">
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-blue-100/50 border border-slate-100">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                                        <div className="p-2 bg-blue-100 rounded-xl text-blue-600"><BarChart2 size={24}/></div>
                                        마켓 포지셔닝 맵 (Log Scale)
                                    </h2>
                                    <p className="text-slate-500 text-xs font-medium pl-1 mt-1">
                                        * 데이터 쏠림을 방지하기 위해 <span className="text-slate-700 font-bold">로그 스케일</span>을 적용했습니다.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-3 py-1.5 rounded-full bg-red-50 text-red-600 text-xs font-bold border border-red-100 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> 외식업</span>
                                    <span className="px-3 py-1.5 rounded-full bg-green-50 text-green-600 text-xs font-bold border border-green-100 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> 소매업</span>
                                    <span className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 text-xs font-bold border border-blue-100 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> 서비스업</span>
                                </div>
                            </div>
                            
                            <MarketPositionMap 
                                data={filteredData} 
                                selectedIndustry={selectedIndustry} 
                                onSelect={setSelectedIndustry} 
                            />
                        </div>

                        {/* Radar Charts */}
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-blue-100/50 border border-slate-100">
                            <h3 className="text-xl font-bold text-slate-900 mb-8 flex items-center gap-2">
                                <div className="p-2 bg-amber-100 rounded-xl text-amber-600"><Trophy size={24}/></div>
                                주요 업종 상세 비교
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                                {TARGET_INDUSTRIES.map((target) => {
                                    const data = MOCK_INDUSTRY_DATA.find(d => d.name === target.name);
                                    return (
                                        <div key={target.name} className="flex flex-col items-center group cursor-pointer">
                                            <div className="w-full aspect-square relative bg-slate-50 rounded-3xl p-4 border border-slate-100 group-hover:border-blue-200 group-hover:shadow-lg transition-all">
                                                {data && <SimpleRadar data={data} color={target.color} />}
                                            </div>
                                            <div className="mt-4 flex flex-col items-center">
                                                <span className="font-black text-slate-700 text-base">{target.name}</span>
                                                <span className="text-xs font-bold text-slate-400 mt-0.5">{target.label}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 4. Placeholder Map (Step 2)
const MockMapBackground = () => (
    <div className="absolute inset-0 bg-[#f8fafc] overflow-hidden pointer-events-none">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        <svg className="absolute inset-0 w-full h-full opacity-10">
            <path d="M-100,300 Q400,200 600,600 T1200,400" stroke="#94a3b8" strokeWidth="20" fill="none" />
            <path d="M200,-100 Q300,400 800,500" stroke="#94a3b8" strokeWidth="15" fill="none" />
            <circle cx="600" cy="400" r="150" fill="#e2e8f0" opacity="0.5" />
        </svg>
    </div>
);

// 5. App Main
export default function App() {
    const [step, setStep] = useState(1);
    const [cart, setCart] = useState([]);
    const [selectedRegion, setSelectedRegion] = useState(null);

    const handleIndustrySelect = (industry) => {
        setStep(2);
    };

    return (
        <div className="h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden selection:bg-blue-100 flex flex-col">
            <HeaderPill step={step} setStep={setStep} />

            <div className="flex-1 overflow-y-auto w-full relative">
                {step === 1 && <BusinessCategoryAnalysis onNext={handleIndustrySelect} />}

                {step === 2 && (
                    <div className="relative w-full h-full min-h-[800px]">
                        <MockMapBackground />
                        <div className="relative z-10 pt-32 px-8 flex justify-between items-start pointer-events-none">
                            <div className="w-[360px] bg-white/90 backdrop-blur-xl rounded-[2rem] p-6 shadow-2xl border border-white/60 pointer-events-auto">
                                <h2 className="text-xl font-bold mb-1 flex items-center gap-2 text-slate-800">탐색 필터</h2>
                                <p className="text-sm text-slate-500 mb-4">원하는 조건으로 상권을 검색하세요</p>
                                <div className="space-y-4">
                                    <div className="h-12 bg-slate-100 rounded-xl flex items-center px-4 text-slate-400 text-sm">희망 업종 선택...</div>
                                    <div className="h-24 bg-blue-50/50 rounded-xl border border-blue-100 flex flex-col justify-center px-4 gap-2">
                                        <div className="flex justify-between text-xs font-bold text-blue-800"><span>예산</span><span>2억원</span></div>
                                        <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden"><div className="w-2/3 h-full bg-blue-600"></div></div>
                                    </div>
                                </div>
                            </div>
                            <div className="pointer-events-auto">
                                <div className="bg-white rounded-full px-5 py-2 shadow-lg border border-slate-100 text-sm font-bold text-slate-600 hover:text-blue-600 cursor-pointer transition-colors flex items-center gap-2">
                                    <Zap size={16} fill="currentColor" className="text-amber-400"/> 핵심 상권만 보기
                                </div>
                            </div>
                        </div>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group" onClick={() => setSelectedRegion({name: '강남역', score: 92})}>
                             <div className="relative">
                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white px-3 py-1.5 rounded-xl shadow-xl font-bold text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all">강남역 메인거리</div>
                                <div className="w-8 h-8 bg-blue-600 rounded-full border-4 border-white shadow-lg animate-bounce flex items-center justify-center text-white"><MapPin size={14}/></div>
                             </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}