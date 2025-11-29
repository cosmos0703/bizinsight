import React, { useState, useMemo } from 'react';
import { 
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart 
} from 'recharts';
import { Filter } from 'lucide-react';

const SectorAnalysis = ({ revenue, rent }) => {
    const [selectedSectorGroup, setSelectedSectorGroup] = useState('외식업');

    // Filter Revenue Data based on Sector Group (e.g., '외식업', '서비스업')
    const chartDataRevenue = useMemo(() => {
        return revenue
            .filter(d => d.sectorGroup === selectedSectorGroup)
            .map(d => ({
                name: d.sector,
                '16.5㎡': d.area16,
                '33㎡': d.area33,
                '66㎡': d.area66,
                '99㎡': d.area99,
                'Over 99㎡': d.areaOver99
            }))
            .slice(0, 10); // Limit to top 10 to prevent overcrowding
    }, [revenue, selectedSectorGroup]);

    // Prepare Rent Data (Top 15 Regions by Rent)
    const chartDataRent = useMemo(() => {
        return rent
            .sort((a, b) => b.rent - a.rent)
            .slice(0, 15)
            .map(d => ({
                name: d.region,
                rent: d.rent,
                vacancy: d.vacancy
            }));
    }, [rent]);

    return (
        <div className="h-full flex flex-col gap-6 p-6 bg-slate-50 overflow-y-auto">
            {/* Header / Filter */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800">Sector & Efficiency Analysis</h2>
                <div className="flex items-center gap-2">
                    <Filter size={16} className="text-slate-500" />
                    <select 
                        className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
                        value={selectedSectorGroup}
                        onChange={(e) => setSelectedSectorGroup(e.target.value)}
                    >
                        <option value="외식업">Food (외식업)</option>
                        <option value="서비스업">Service (서비스업)</option>
                        <option value="소매업">Retail (소매업)</option>
                    </select>
                </div>
            </div>

            {/* Top: Revenue per Area Size */}
            <div className="flex-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 min-h-[300px]">
                <h3 className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-wider">Revenue per 3.3㎡ by Store Size</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartDataRevenue} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{fontSize: 11}} interval={0} angle={-15} textAnchor="end" height={60} />
                        <YAxis tick={{fontSize: 11}} />
                        <Tooltip 
                            contentStyle={{border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                            cursor={{fill: '#f8fafc'}}
                        />
                        <Legend />
                        <Bar dataKey="33㎡" fill="#3b82f6" name="Small (<33㎡)" radius={[4,4,0,0]} />
                        <Bar dataKey="66㎡" fill="#93c5fd" name="Medium (<66㎡)" radius={[4,4,0,0]} />
                        <Bar dataKey="Over 99㎡" fill="#1e40af" name="Large (>99㎡)" radius={[4,4,0,0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Bottom: Rent vs Vacancy */}
            <div className="flex-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 min-h-[300px]">
                <h3 className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-wider">Rent Cost vs Vacancy Rate</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartDataRent} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{fontSize: 11}} interval={0} angle={-45} textAnchor="end" height={70} />
                        <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" label={{ value: 'Rent (k KRW/㎡)', angle: -90, position: 'insideLeft', style: {fontSize: 10, fill: '#3b82f6'} }} />
                        <YAxis yAxisId="right" orientation="right" stroke="#ef4444" label={{ value: 'Vacancy (%)', angle: 90, position: 'insideRight', style: {fontSize: 10, fill: '#ef4444'} }} />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="rent" fill="#3b82f6" barSize={20} name="Rent Cost" radius={[4,4,0,0]} />
                        <Line yAxisId="right" type="monotone" dataKey="vacancy" stroke="#ef4444" strokeWidth={2} name="Vacancy Rate" dot={{r:3}} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default SectorAnalysis;
