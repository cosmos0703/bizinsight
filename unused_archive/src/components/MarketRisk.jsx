import React, { useMemo } from 'react';
import { 
    ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, Label 
} from 'recharts';

const MarketRisk = ({ closures, revenue, rent }) => {

    // 1. Sector Analysis Data: Risk (Closure) vs Reward (Revenue)
    const sectorData = useMemo(() => {
        // We need to merge 'closures' and 'revenue' by Sector Name
        // closures has 'total' (count). We need a rate? 
        // Dataset B is just "Number of Closures". Without "Total Active Stores", we can't calculate a rate accurately.
        // However, let's assume raw closure count is a proxy for "Risk/Volatility" or "Market Size".
        // Better: Revenue is explicit.
        
        const map = new Map();
        revenue.forEach(r => {
            // Average revenue across sizes for a simplified single metric
            const avgRev = (r.area16 + r.area33 + r.area66 + r.area99) / 4;
            map.set(r.sector, { name: r.sector, revenue: avgRev, closures: 0 });
        });

        closures.forEach(c => {
            if (map.has(c.sector)) {
                // Summing closures across sizes for total sector closures
                const totalClosures = c.size0 + c.size1 + c.size2 + c.size3 + c.size4;
                map.get(c.sector).closures = totalClosures;
            }
        });

        return Array.from(map.values()).filter(d => d.revenue > 0 && d.closures > 0);
    }, [closures, revenue]);

    // 2. Region Analysis Data: Cost (Rent) vs Efficiency (Yield)
    const regionData = useMemo(() => {
        return rent.map(d => ({
            name: d.region,
            x: d.rent,      // Rent Cost
            y: d.yield_invest, // Investment Yield
            z: d.vacancy    // Vacancy Rate (Size/Color)
        })).filter(d => d.x > 0 && d.y > 0);
    }, [rent]);

    return (
        <div className="h-full flex flex-col lg:flex-row gap-6 p-6 bg-slate-50 overflow-y-auto">
            
            {/* Chart 1: Sector Blue Ocean (Revenue vs Closures) */}
            <div className="flex-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col min-h-[400px]">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Sector Matrix: Risk vs Reward</h3>
                <p className="text-sm text-slate-500 mb-6">High Revenue & Low Closures = <span className="text-blue-600 font-bold">Blue Ocean</span></p>
                
                <div className="flex-1 relative">
                    {/* Quadrant Backgrounds */}
                    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 opacity-10 pointer-events-none">
                        <div className="bg-red-500 border-r border-b border-slate-300"></div> {/* High Close, High Rev (High Risk/High Return) */}
                        <div className="bg-blue-500 border-b border-slate-300"></div> {/* Low Close, High Rev (Blue Ocean) */}
                        <div className="bg-slate-300 border-r border-slate-300"></div> {/* High Close, Low Rev (Red Ocean) */}
                        <div className="bg-green-500"></div> {/* Low Close, Low Rev (Safe/Low Return) */}
                    </div>

                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" dataKey="closures" name="Closures" stroke="#94a3b8">
                                <Label value="Risk (Number of Closures)" offset={0} position="insideBottom" />
                            </XAxis>
                            <YAxis type="number" dataKey="revenue" name="Revenue" stroke="#94a3b8">
                                <Label value="Reward (Revenue per 3.3㎡)" angle={-90} position="insideLeft" />
                            </YAxis>
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                            <Scatter name="Sectors" data={sectorData} fill="#3b82f6">
                                {sectorData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.revenue > 200 && entry.closures < 100 ? '#2563eb' : '#64748b'} />
                                ))}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Chart 2: Regional Opportunities (Rent vs Yield) */}
            <div className="flex-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col min-h-[400px]">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Regional Matrix: Cost vs Yield</h3>
                <p className="text-sm text-slate-500 mb-6">High Yield & Low Rent = <span className="text-emerald-600 font-bold">Opportunity Zone</span></p>

                <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" dataKey="x" name="Rent" unit="k" stroke="#94a3b8">
                                <Label value="Cost (Rent per ㎡)" offset={0} position="insideBottom" />
                            </XAxis>
                            <YAxis type="number" dataKey="y" name="Yield" unit="%" stroke="#94a3b8">
                                <Label value="Yield (Investment Return)" angle={-90} position="insideLeft" />
                            </YAxis>
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                            <Scatter name="Regions" data={regionData} fill="#10b981">
                                {regionData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.y > 5 && entry.x < 50 ? '#10b981' : '#f59e0b'} />
                                ))}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default MarketRisk;
