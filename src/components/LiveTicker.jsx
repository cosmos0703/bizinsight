import React from 'react';
import { ChevronDown } from 'lucide-react';

const LiveTicker = ({ trends, currentIndex }) => (
    <div className="relative bg-white border border-slate-200 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-sm overflow-hidden mb-6 group">
        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg uppercase shrink-0 z-30 animate-pulse shadow-sm shadow-red-200">Live</span>
        <div className="flex-1 overflow-hidden h-[24px] relative z-20">
            {trends.map((trend, index) => (
                <a key={index} href={`https://www.youtube.com/watch?v=${trend.id}`} target="_blank" rel="noopener noreferrer" className={`absolute inset-0 flex items-center text-sm font-bold text-slate-700 truncate transition-all duration-500 ease-in-out hover:text-red-600 hover:underline cursor-pointer pointer-events-auto ${index === currentIndex ? 'translate-y-0 opacity-100 z-30' : 'translate-y-full opacity-0 z-0 pointer-events-none'}`}>
                    {trend.title}
                </a>
            ))}
        </div>
        <ChevronDown size={16} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
    </div>
);

export default LiveTicker;
