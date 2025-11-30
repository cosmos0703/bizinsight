import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Filter, BarChart2, Map as MapIcon, Info, CheckCircle, Youtube } from 'lucide-react';
import { loadCSV } from '../data/csvLoader';

// Fallback if API fails
const FALLBACK_TRENDS = [
    { title: "2024년 소자본 창업 아이템 TOP 10", id: "VIDEO_ID_1" },
    { title: "무인 카페 폐업률 충격 실태", id: "VIDEO_ID_2" },
    { title: "탕후루 가고 요거트 아이스크림 뜬다", id: "VIDEO_ID_3" }
];

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

// Helper for Radar Chart
const IndustryRadar = ({ data, color }) => {
    const rRef = useRef(null);

    useEffect(() => {
        if (!data) return;

        const width = 200;
        const height = 200;
        const radius = Math.min(width, height) / 2 - 20;

        const svg = d3.select(rRef.current);

        // Initialize Group
        let g = svg.select("g");
        if (g.empty()) {
            svg.selectAll("*").remove();
            g = svg.append("g").attr("transform", `translate(${width / 2},${height / 2})`);

            const angleSlice = (Math.PI * 2) / 5;

            // 1. Draw Concentric Grid (Webs)
            const levels = 5; // 20%, 40%, 60%, 80%, 100%
            for (let level = 0; level < levels; level++) {
                const r = (radius / levels) * (level + 1);

                // Generate points for the polygon
                const points = [];
                for (let i = 0; i < 5; i++) {
                    const angle = i * angleSlice - Math.PI / 2;
                    points.push([Math.cos(angle) * r, Math.sin(angle) * r]);
                }

                g.append("polygon")
                    .attr("points", points.map(p => p.join(",")).join(" "))
                    .attr("fill", "none")
                    .attr("stroke", "#e2e8f0")
                    .attr("stroke-width", 0.5)
                    .style("stroke-dasharray", "4 4");
            }

            // 2. Draw Axes
            const axes = ["매출규모", "성장성", "밀집도", "객단가", "안정성"];
            axes.forEach((axis, i) => {
                const angle = i * angleSlice - Math.PI / 2;
                const x = Math.cos(angle) * (radius + 15);
                const y = Math.sin(angle) * (radius + 15);

                g.append("line")
                    .attr("x1", 0).attr("y1", 0)
                    .attr("x2", Math.cos(angle) * radius)
                    .attr("y2", Math.sin(angle) * radius)
                    .attr("stroke", "#cbd5e1")
                    .attr("stroke-width", 1);

                g.append("text")
                    .attr("x", x).attr("y", y)
                    .text(axis)
                    .attr("text-anchor", "middle")
                    .attr("dominant-baseline", "middle")
                    .attr("fill", "#64748b")
                    .style("font-size", "11px")
                    .style("font-weight", "600");
            });
        }

        const angleSlice = (Math.PI * 2) / 5;
        const rScale = d3.scaleLinear().domain([0, 100]).range([0, radius]);

        // Path Generator
        const line = d3.lineRadial()
            .angle((d, i) => i * angleSlice)
            .radius(d => rScale(d.value))
            .curve(d3.curveLinearClosed);

        // Update Path
        const path = g.selectAll(".radar-path").data([data.radarStats]);

        path.join(
            enter => enter.append("path")
                .attr("class", "radar-path")
                .attr("d", line)
                .attr("fill", color)
                .attr("fill-opacity", 0.2)
                .attr("stroke", color)
                .attr("stroke-width", 2)
                .style("opacity", 1),
            update => update
                .attr("d", line)
                .attr("fill", color)
                .attr("stroke", color)
                .style("opacity", 1),
            exit => exit.remove()
        );

        // Update Dots
        g.selectAll(".dot")
            .data(data.radarStats)
            .join(
                enter => enter.append("circle")
                    .attr("class", "dot")
                    .attr("cx", (d, i) => Math.cos(i * angleSlice - Math.PI / 2) * rScale(d.value))
                    .attr("cy", (d, i) => Math.sin(i * angleSlice - Math.PI / 2) * rScale(d.value))
                    .attr("r", 4)
                    .attr("fill", "white")
                    .attr("stroke", color)
                    .attr("stroke-width", 2),
                update => update
                    .attr("cx", (d, i) => Math.cos(i * angleSlice - Math.PI / 2) * rScale(d.value))
                    .attr("cy", (d, i) => Math.sin(i * angleSlice - Math.PI / 2) * rScale(d.value))
                    .attr("stroke", color),
                exit => exit.remove()
            );

    }, [data, color]);

    return <svg ref={rRef} width="200" height="200" className="overflow-visible"></svg>;
};

const BusinessCategoryAnalysis = ({ salesData = [], closureData = [] }) => {
    const [minStartupCost, setMinStartupCost] = useState(0);
    const [minSales, setMinSales] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState('All'); // 'All', 'Food', 'Retail', 'Service'
    const [selectedIndustry, setSelectedIndustry] = useState(null); // Selected industry data for Radar
    const [searchTerm, setSearchTerm] = useState(''); // Search term for industry

    // Internal State for Real Data Loading
    const [internalSalesData, setInternalSalesData] = useState([]);
    const [internalClosureData, setInternalClosureData] = useState([]);

    const [youtubeTrends, setYoutubeTrends] = useState(FALLBACK_TRENDS);
    const [currentTrendIndex, setCurrentTrendIndex] = useState(0);

    const [industryData, setIndustryData] = useState([]);
    const svgRef = useRef(null);

    // Load Real Data if props are empty
    useEffect(() => {
        if (salesData.length === 0 || closureData.length === 0) {
            const fetchData = async () => {
                console.log("Starting data fetch...");
                try {
                    const sales = await loadCSV('서울시 상권분석서비스(추정매출-행정동)_2024년.csv', 'EUC-KR');
                    console.log("Sales data loaded:", sales.length);
                    if (sales.length > 0) console.log("Sales keys:", Object.keys(sales[0]));
                    const closure = await loadCSV('서울시 상권분석서비스(점포-행정동)_2024년 2.csv', 'EUC-KR');
                    console.log("Closure data loaded:", closure.length);
                    if (closure.length > 0) console.log("Closure keys:", Object.keys(closure[0]));
                    setInternalSalesData(sales);
                    setInternalClosureData(closure);
                } catch (error) {
                    console.error("Failed to load CSV data:", error);
                }
            };
            fetchData();
        } else {
            console.log("Using provided props data");
        }
    }, [salesData, closureData]);

    // Ticker Animation
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTrendIndex((prev) => (prev + 1) % youtubeTrends.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [youtubeTrends]);

    // Industry Categories
    const categories = {
        "Food": ["한식음식점", "중식음식점", "일식음식점", "양식음식점", "제과점", "패스트푸드점", "치킨전문점", "분식전문점", "호프-간이주점", "커피-음료"],
        "Retail": ["편의점", "슈퍼마켓", "화장품"],
        "Service": ["미용실", "네일숍", "피부관리실", "세탁소", "스포츠강습", "예술학원", "외국어학원", "일반교습학원", "부동산중개업", "당구장", "PC방", "노래방", "독서실", "고시원", "여관"]
    };

    const getCategory = (name) => {
        if (categories["Food"].includes(name)) return "Food";
        if (categories["Retail"].includes(name)) return "Retail";
        if (categories["Service"].includes(name)) return "Service";
        return "Other";
    };

    // Mock Startup Costs (Unit: 10,000 KRW)
    const startupCostMap = {
        "한식음식점": 12000,
        "중식음식점": 10000,
        "일식음식점": 11000,
        "양식음식점": 13000,
        "제과점": 15000,
        "패스트푸드점": 14000,
        "치킨전문점": 8000,
        "분식전문점": 6000,
        "호프-간이주점": 9000,
        "커피-음료": 10000, // Cafe
        "편의점": 7000,
        "슈퍼마켓": 9000,
        "화장품": 8000,
        "미용실": 6000,
        "네일숍": 4000,
        "피부관리실": 5000,
        "세탁소": 5000,
        "스포츠강습": 8000,
        "예술학원": 7000,
        "외국어학원": 9000,
        "일반교습학원": 8000,
        "부동산중개업": 3000,
        "당구장": 10000,
        "PC방": 15000,
        "노래방": 12000,
        "독서실": 10000,
        "고시원": 20000,
        "여관": 30000
    };

    // Data Processing Effect
    useEffect(() => {
        // Use props if available, otherwise use internal loaded data
        let processedSales = salesData.length > 0 ? salesData : internalSalesData;
        let processedClosure = closureData.length > 0 ? closureData : internalClosureData;

        // If still no data (loading or failed), return
        if (processedSales.length === 0) return;

        // 1. Aggregate Data by Industry
        const industryStats = {};

        processedSales.forEach((d) => {
            const ind = d['서비스_업종_코드_명'];
            if (!ind) return;
            if (!industryStats[ind]) {
                industryStats[ind] = {
                    name: ind,
                    salesSum: 0,
                    weekendSum: 0,
                    txnSum: 0,
                    count: 0
                };
            }

            // Helper to safe parse
            const safeParse = (val) => parseFloat(String(val).replace(/,/g, '') || 0);

            industryStats[ind].salesSum += safeParse(d['당월_매출_금액']);
            industryStats[ind].weekendSum += safeParse(d['주말_매출_금액']);
            industryStats[ind].txnSum += safeParse(d['분기당_매출_건수']);
            industryStats[ind].count += 1;
        });

        // Closure/Store Data
        const closureStats = {};
        processedClosure.forEach((d) => {
            const ind = d['서비스_업종_코드_명'];
            if (!ind) return;
            if (!closureStats[ind]) {
                closureStats[ind] = {
                    storeCountSum: 0,
                    openCountSum: 0,
                    closureRateSum: 0,
                    count: 0
                };
            }

            const safeParse = (val) => parseFloat(String(val).replace(/,/g, '') || 0);

            closureStats[ind].storeCountSum += safeParse(d['점포_수']);
            closureStats[ind].openCountSum += safeParse(d['개업_점포_수']);
            closureStats[ind].closureRateSum += safeParse(d['폐업_률']);
            closureStats[ind].count += 1;
        });

        // Merge and Calculate Metrics
        const processed = Object.keys(industryStats).map(ind => {
            const s = industryStats[ind];
            const c = closureStats[ind] || { storeCountSum: 0, openCountSum: 0, closureRateSum: 0, count: 1 };

            const avgSales = s.count > 0 ? s.salesSum / s.count : 0;
            const avgWeekend = s.count > 0 ? s.weekendSum / s.count : 0;
            const avgTxn = s.count > 0 ? s.txnSum / s.count : 1;

            const avgStores = c.count > 0 ? c.storeCountSum / c.count : 0;
            const avgOpens = c.count > 0 ? c.openCountSum / c.count : 0;
            const avgClosure = c.count > 0 ? c.closureRateSum / c.count : 0;

            // 5 Features Calculation
            const revenue = avgSales; // 1. Revenue
            const growth = avgOpens;  // 2. Growth
            const density = avgStores; // 3. Density
            const ticket = avgTxn > 0 ? avgSales / avgTxn : 0; // 4. Ticket Size
            const stability = 100 - avgClosure; // 5. Stability (Inverse of Closure)

            return {
                name: ind,
                sales: revenue,
                growth: growth,
                density: density,
                ticket: ticket,
                stability: stability,
                survival: stability, // Restore for Scatter Plot
                startupCost: startupCostMap[ind] || 10000
            };
        });

        // Filter out invalid
        const finalData = processed.filter(d => d.sales > 0 && d.name !== "Unknown");

        // Normalize for Radar Charts (0-100 scale)
        const getScale = (key) => {
            const extent = d3.extent(finalData, d => d[key]);
            if (extent[0] === undefined || extent[1] === undefined) return () => 0;
            if (extent[0] === extent[1]) return () => 50;
            return (val) => ((val - extent[0]) / (extent[1] - extent[0])) * 100;
        };

        const scaleRevenue = getScale('sales');
        const scaleGrowth = getScale('growth');
        const scaleDensity = getScale('density');
        const scaleTicket = getScale('ticket');
        const scaleStability = getScale('stability');

        finalData.forEach(d => {
            d.radarStats = [
                { axis: "매출규모", value: scaleRevenue(d.sales), raw: d.sales, unit: "원" },
                { axis: "성장성", value: scaleGrowth(d.growth), raw: d.growth, unit: "개" },
                { axis: "밀집도", value: scaleDensity(d.density), raw: d.density, unit: "개" },
                { axis: "객단가", value: scaleTicket(d.ticket), raw: d.ticket, unit: "원" },
                { axis: "안정성", value: scaleStability(d.stability), raw: d.stability, unit: "점" }
            ];
        });

        setIndustryData(finalData);

    }, [salesData, closureData, internalSalesData, internalClosureData]);

    // Draw Scatter Plot
    useEffect(() => {
        if (industryData.length === 0) return;

        const filtered = industryData.filter(d => {
            const meetsCost = d.startupCost >= minStartupCost * 10000;
            const meetsSales = d.sales >= minSales * 100000000;
            const meetsCategory = selectedCategory === 'All' || getCategory(d.name) === selectedCategory;
            return meetsCost && meetsSales && meetsCategory;
        });

        const width = 600;
        const height = 400;
        const margin = { top: 40, right: 40, bottom: 60, left: 60 };
        const chartW = width - margin.left - margin.right;
        const chartH = height - margin.top - margin.bottom;

        const svg = d3.select(svgRef.current);

        // Only create the group container once
        let g = svg.select(".chart-container");
        if (g.empty()) {
            svg.selectAll("*").remove(); // Clear initial
            g = svg.append("g")
                .attr("class", "chart-container")
                .attr("transform", `translate(${margin.left}, ${margin.top})`);

            // Add axes groups once
            g.append("g").attr("class", "x-axis").attr("transform", `translate(0, ${chartH})`);
            g.append("g").attr("class", "y-axis");
            g.append("g").attr("class", "grid-x");
            g.append("g").attr("class", "grid-y");
        }

        // Scales
        const xScale = d3.scaleLinear()
            .domain([0, d3.max(industryData, d => d.startupCost) * 1.1])
            .range([0, chartW]);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(industryData, d => d.sales) * 1.1])
            .range([chartH, 0]);

        const rScale = d3.scaleLinear()
            .domain(d3.extent(industryData, d => d.survival))
            .range([5, 25]);

        const colorScale = d3.scaleOrdinal()
            .domain(["Food", "Retail", "Service", "Other"])
            .range(["#ef4444", "#22c55e", "#3b82f6", "#94a3b8"]);

        // Axes
        const xAxis = d3.axisBottom(xScale).tickFormat(d => (d / 10000).toFixed(0) + "억");
        const yAxis = d3.axisLeft(yScale).tickFormat(d => (d / 100000000).toFixed(0) + "억");

        g.select(".x-axis").transition().duration(200).call(xAxis);
        g.select(".y-axis").transition().duration(200).call(yAxis);

        // Axis Labels (Add only if not exists)
        if (g.select(".x-label").empty()) {
            g.append("text")
                .attr("class", "x-label")
                .attr("x", chartW)
                .attr("y", chartH + 40)
                .attr("fill", "#64748b")
                .style("text-anchor", "end")
                .style("font-weight", "bold")
                .text("평균 창업비용");
        }

        if (g.select(".y-label").empty()) {
            g.append("text")
                .attr("class", "y-label")
                .attr("transform", "rotate(-90)")
                .attr("y", -45)
                .attr("fill", "#64748b")
                .style("text-anchor", "end")
                .style("font-weight", "bold")
                .text("평균 매출");
        }

        // Grid lines
        g.select(".grid-x")
            .attr("transform", `translate(0,${chartH})`)
            .transition().duration(200)
            .call(d3.axisBottom(xScale).tickSize(-chartH).tickFormat("").ticks(5))
            .style("stroke-opacity", 0.1)
            .style("stroke", "#cbd5e1");

        g.select(".grid-y")
            .transition().duration(200)
            .call(d3.axisLeft(yScale).tickSize(-chartW).tickFormat("").ticks(5))
            .style("stroke-opacity", 0.1)
            .style("stroke", "#cbd5e1");

        // Bubbles with Join Pattern
        g.selectAll("circle")
            .data(filtered, d => d.name) // Use key for stability
            .join(
                enter => enter.append("circle")
                    .attr("cx", d => xScale(d.startupCost))
                    .attr("cy", d => yScale(d.sales))
                    .attr("r", 0) // Start small
                    .attr("fill", d => colorScale(getCategory(d.name)))
                    .attr("stroke", "#fff")
                    .attr("stroke-width", 2)
                    .call(enter => enter.transition().duration(200)
                        .attr("r", d => rScale(d.survival))
                    ),
                update => update.transition().duration(200)
                    .attr("cx", d => xScale(d.startupCost))
                    .attr("cy", d => yScale(d.sales))
                    .attr("r", d => rScale(d.survival))
                    .attr("fill", d => colorScale(getCategory(d.name)))
                    .attr("opacity", d => (selectedIndustry && selectedIndustry.name === d.name) ? 1 : 0.7)
                    .attr("stroke", d => (selectedIndustry && selectedIndustry.name === d.name) ? "#1e293b" : "#fff")
                    .attr("stroke-width", d => (selectedIndustry && selectedIndustry.name === d.name) ? 3 : 2),
                exit => exit.transition().duration(200)
                    .attr("r", 0)
                    .remove()
            )
            .style("cursor", "pointer")
            .on("mouseover", function (event, d) {
                if (selectedIndustry && selectedIndustry.name === d.name) return;
                d3.select(this).transition().duration(100).attr("opacity", 1).attr("stroke", "#1e293b");
            })
            .on("mouseout", function (event, d) {
                if (selectedIndustry && selectedIndustry.name === d.name) return;
                d3.select(this).transition().duration(100).attr("opacity", 0.7).attr("stroke", "#fff");
            })
            .on("click", (event, d) => {
                setSelectedIndustry(d);
            });

        // Labels
        const keyIndustries = ["커피-음료", "편의점", "치킨전문점", "한식음식점", "PC방"];
        const labelData = filtered.filter(d => keyIndustries.includes(d.name) || (selectedIndustry && selectedIndustry.name === d.name));

        g.selectAll(".label-text")
            .data(labelData, d => d.name)
            .join(
                enter => enter.append("text")
                    .attr("class", "label-text")
                    .attr("x", d => xScale(d.startupCost))
                    .attr("y", d => yScale(d.sales) - rScale(d.survival) - 8)
                    .text(d => d.name)
                    .attr("text-anchor", "middle")
                    .attr("fill", "#1e293b")
                    .style("font-size", "11px")
                    .style("font-weight", "800")
                    .style("text-shadow", "0px 0px 10px rgba(255,255,255,1)")
                    .style("opacity", 0)
                    .style("pointer-events", "none") // Prevent blocking clicks
                    .call(enter => enter.transition().duration(200).style("opacity", 1)),
                update => update.transition().duration(200)
                    .attr("x", d => xScale(d.startupCost))
                    .attr("y", d => yScale(d.sales) - rScale(d.survival) - 8)
                    .style("opacity", 1),
                exit => exit.transition().duration(200).style("opacity", 0).remove()
            );

    }, [industryData, minStartupCost, minSales, selectedCategory, selectedIndustry]);



    const targetIndustries = [
        { name: "커피-음료", label: "카페 (Cafe)", color: "#f97316" },
        { name: "편의점", label: "편의점 (Store)", color: "#10b981" },
        { name: "치킨전문점", label: "치킨 (Chicken)", color: "#3b82f6" }
    ];

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            {/* Header */}
            <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 shrink-0 z-20 justify-between sticky top-0">
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

            <div className="p-6 md:p-10">
                {/* Title Section */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                            <BarChart2 className="text-blue-600" /> 업종별 창업 분석 (Startup Map)
                        </h2>
                        <p className="text-slate-500 mt-1 font-medium">창업 비용 대비 기대 매출과 생존율을 분석하여 최적의 업종을 발굴하세요.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left: Filter / Legend */}
                    <div className="col-span-12 lg:col-span-4 space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
                                <Filter size={20} className="text-slate-400" /> 필터 설정
                            </h3>

                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between items-end mb-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">최소 창업 비용</label>
                                        <span className="text-sm font-black text-blue-600">{minStartupCost}억원 이상</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="3"
                                        step="0.1"
                                        value={minStartupCost}
                                        onChange={(e) => setMinStartupCost(Number(e.target.value))}
                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between items-end mb-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">최소 월 매출</label>
                                        <span className="text-sm font-black text-blue-600">{minSales}억원 이상</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="50"
                                        step="1"
                                        value={minSales}
                                        onChange={(e) => setMinSales(Number(e.target.value))}
                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <h4 className="font-bold text-sm text-slate-500 uppercase mb-4">업종 카테고리</h4>
                            <div className="space-y-2 mb-6">
                                {[
                                    { id: 'All', label: '전체 보기', color: 'bg-slate-100 text-slate-600' },
                                    { id: 'Food', label: '외식업 (Food)', color: 'bg-red-50 text-red-600 border-red-100' },
                                    { id: 'Retail', label: '소매업 (Retail)', color: 'bg-green-50 text-green-600 border-green-100' },
                                    { id: 'Service', label: '서비스업 (Service)', color: 'bg-blue-50 text-blue-600 border-blue-100' }
                                ].map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.id)}
                                        className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm transition-all border ${selectedCategory === cat.id
                                            ? 'ring-2 ring-blue-500 ring-offset-2 ' + cat.color
                                            : 'border-transparent hover:bg-slate-50 text-slate-400'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span>{cat.label}</span>
                                            {selectedCategory === cat.id && <CheckCircle size={16} />}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <div className="pt-6 border-t border-slate-100">
                                <h4 className="font-bold text-sm text-slate-500 uppercase mb-3">개별 업종 검색</h4>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="업종명 검색 (예: 커피)"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                                    />
                                    <div className="absolute left-3 top-3.5 text-slate-400">
                                        <Filter size={16} />
                                    </div>
                                </div>

                                {searchTerm && (
                                    <div className="mt-2 max-h-[200px] overflow-y-auto space-y-1 custom-scrollbar">
                                        {industryData
                                            .filter(d => d.name.includes(searchTerm))
                                            .map(d => (
                                                <button
                                                    key={d.name}
                                                    onClick={() => setSelectedIndustry(d)}
                                                    className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors flex items-center justify-between"
                                                >
                                                    <span>{d.name}</span>
                                                    {selectedIndustry?.name === d.name && <CheckCircle size={14} className="text-blue-500" />}
                                                </button>
                                            ))}
                                        {industryData.filter(d => d.name.includes(searchTerm)).length === 0 && (
                                            <div className="text-center py-4 text-xs text-slate-400">
                                                검색 결과가 없습니다.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Scatter Plot */}
                    <div className="col-span-12 lg:col-span-8">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-full min-h-[500px] flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800">시장 포지셔닝 맵 (Market Positioning)</h3>
                                    <p className="text-sm text-slate-500">X축: 창업비용 | Y축: 평균매출 | 원 크기: 생존율</p>
                                </div>
                                <div className="bg-slate-100 p-2 rounded-lg">
                                    <Info size={20} className="text-slate-400" />
                                </div>
                            </div>
                            <div className="flex-1 flex items-center justify-center overflow-hidden">
                                <svg ref={svgRef} width="100%" height="400" viewBox="0 0 600 400" className="overflow-visible"></svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom: Radar Charts */}
                <div className="mt-10">
                    <h3 className="font-bold text-xl text-slate-800 mb-6">주요 업종 심층 분석 (Deep Dive)</h3>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* Left: Metric Guide */}
                        <div className="col-span-12 lg:col-span-3 sticky top-24 z-10">
                            <div className="bg-white rounded-2xl border border-slate-200 p-6 h-full shadow-sm">
                                <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <Info size={20} className="text-blue-500" /> 분석 지표 가이드
                                </h4>
                                <div className="space-y-4">
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <span className="font-bold text-slate-700 block mb-1 text-sm">매출규모</span>
                                        <span className="text-slate-500 text-xs leading-relaxed">해당 업종의 평균적인 월 매출액 수준을 나타냅니다.</span>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <span className="font-bold text-slate-700 block mb-1 text-sm">성장성</span>
                                        <span className="text-slate-500 text-xs leading-relaxed">최근 신규 창업이 활발한 정도(트렌드)를 의미합니다.</span>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <span className="font-bold text-slate-700 block mb-1 text-sm">밀집도</span>
                                        <span className="text-slate-500 text-xs leading-relaxed">동일 업종 점포 수로, 경쟁 강도를 나타냅니다.</span>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <span className="font-bold text-slate-700 block mb-1 text-sm">객단가</span>
                                        <span className="text-slate-500 text-xs leading-relaxed">결제 1건당 평균 매출액으로 수익성을 가늠합니다.</span>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <span className="font-bold text-slate-700 block mb-1 text-sm">운영 안정성</span>
                                        <span className="text-slate-500 text-xs leading-relaxed">폐업률이 낮아 안정적인 운영이 가능한 정도입니다.</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right: Radar Charts Grid */}
                        <div className="col-span-12 lg:col-span-9">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {targetIndustries.map((target, index) => {
                                    const data = industryData.find(d => d.name === target.name);
                                    return (
                                        <div key={target.name} className="relative bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center min-h-[280px]">
                                            {/* Label for Major Industries */}
                                            {index === 0 && (
                                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm z-10 whitespace-nowrap">
                                                    주요 업종
                                                </div>
                                            )}

                                            <h4 className="font-bold text-slate-800 mb-4">{target.label}</h4>
                                            {data ? (
                                                <IndustryRadar data={data} color={target.color} />
                                            ) : (
                                                <div className="w-[200px] h-[200px] flex items-center justify-center bg-slate-50 rounded-full text-slate-400 text-xs">
                                                    데이터 로딩중...
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Dynamic Radar for Selected Industry */}
                                {selectedIndustry && (
                                    <div className="relative bg-slate-900 rounded-2xl shadow-xl border border-slate-800 p-6 flex flex-col items-center justify-center transform scale-105 ring-4 ring-blue-500/20 min-h-[280px]">
                                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm z-10 whitespace-nowrap">
                                            선택 항목
                                        </div>
                                        <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                                            {selectedIndustry.name}
                                        </h4>
                                        <IndustryRadar data={selectedIndustry} color="#fbbf24" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BusinessCategoryAnalysis;
