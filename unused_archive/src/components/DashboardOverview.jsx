import React, { useMemo } from 'react';
import { DISTRICT_COORDINATES } from '../data/districtCoordinates';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { MapPin, TrendingUp, Users, DollarSign } from 'lucide-react';

const SEOUL_BOUNDS = {
    minLat: 37.43, maxLat: 37.70,
    minLng: 126.78, maxLng: 127.20
};

// Simple linear projection
const project = (lat, lng) => {
    const x = ((lng - SEOUL_BOUNDS.minLng) / (SEOUL_BOUNDS.maxLng - SEOUL_BOUNDS.minLng)) * 100;
    const y = 100 - ((lat - SEOUL_BOUNDS.minLat) / (SEOUL_BOUNDS.maxLat - SEOUL_BOUNDS.minLat)) * 100;
    return { x, y };
};

const DashboardOverview = ({ openings, rent }) => {
    // Merge Data: Openings + Coordinates
    const mapData = useMemo(() => {
        return openings.map(d => {
            const coords = DISTRICT_COORDINATES[d.district];
            if (!coords) return null;
            const { x, y } = project(coords.lat, coords.lng);
            
            // Try to find matching rent data (simplified matching)
            // Dataset D might need more complex mapping, for now using Openings as primary visual
            return {
                ...d,
                x, y
            };
        }).filter(Boolean);
    }, [openings]);

    const topDistrict = useMemo(() => {
        return [...openings].sort((a, b) => b.total - a.total)[0];
    }, [openings]);

    const totalOpenings = useMemo(() => openings.reduce((acc, cur) => acc + cur.total, 0), [openings]);

    return (
        <div className="h-full flex flex-col lg:flex-row gap-6 p-6 bg-slate-50 overflow-y-auto">
            {/* Left: Stylized Map */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-8 relative min-h-[500px] flex flex-col items-center justify-center">
                <h3 className="absolute top-6 left-6 text-xl font-bold text-slate-800 flex items-center gap-2">
                    <MapPin className="text-blue-600" /> Seoul District Openings
                </h3>
                
                <div className="relative w-full max-w-2xl aspect-[1.2]">
                    {/* Background Silhouette (Simplified) */}
                    <div className="absolute inset-0 bg-slate-100 rounded-full opacity-50 blur-3xl transform scale-75"></div>
                    
                    {mapData.map((d) => (
                        <div
                            key={d.district}
                            className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                            style={{ left: `${d.x}%`, top: `${d.y}%` }}
                        >
                            <div 
                                className="rounded-full bg-blue-500/20 border border-blue-500 transition-all duration-300 group-hover:bg-blue-600 group-hover:scale-110 z-10"
                                style={{ 
                                    width: `${Math.max(12, Math.min(60, d.total / 80))}px`, 
                                    height: `${Math.max(12, Math.min(60, d.total / 80))}px` 
                                }}
                            ></div>
                            {/* Tooltip on Hover */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                                <div className="font-bold">{d.district}</div>
                                <div>Total: {d.total.toLocaleString()}</div>
                                <div className="text-blue-300">Food: {d.food.toLocaleString()}</div>
                            </div>
                            {/* Label */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 text-[10px] font-medium text-slate-500 opacity-60 group-hover:opacity-100 group-hover:text-slate-800 pointer-events-none whitespace-nowrap">
                                {d.district}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right: Statistics Cards */}
            <div className="w-full lg:w-80 flex flex-col gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                    <div className="text-slate-500 text-sm font-medium mb-1">Total Openings (2023)</div>
                    <div className="text-3xl font-black text-slate-800">{totalOpenings.toLocaleString()}</div>
                    <div className="flex items-center gap-1 text-green-500 text-xs font-bold mt-2">
                        <TrendingUp size={14} /> +12.5% vs Last Year
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                    <div className="text-slate-500 text-sm font-medium mb-1">Top District</div>
                    <div className="text-2xl font-bold text-blue-600 mb-1">{topDistrict?.district || '-'}</div>
                    <div className="text-sm text-slate-600">
                        {topDistrict?.total.toLocaleString()} stores opened
                    </div>
                </div>

                <div className="bg-blue-600 p-5 rounded-xl shadow-lg text-white mt-auto">
                    <div className="flex items-start gap-3">
                        <Users className="mt-1 opacity-80" />
                        <div>
                            <div className="font-bold text-lg mb-1">Insight</div>
                            <p className="text-sm opacity-90 leading-relaxed">
                                <strong>{topDistrict?.district}</strong> shows the highest activity. 
                                Consider high competition risks despite high traffic.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardOverview;
