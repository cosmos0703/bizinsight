import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import SeoulFranchiseDashboard from './components/SeoulFranchiseDashboard';
import SmartBizMap_Bento from './components/SmartBizMap_Bento';
import SmartBizMap_Analysis from './SmartBizMap_Analysis';

const NavToggler = () => {
  const location = useLocation();
  const isAnalysis = location.pathname === '/analysis';
  const isBento = location.pathname === '/newpage';
  const isOriginal = location.pathname === '/';

  return (
    <div className="fixed bottom-4 right-4 z-50 flex gap-2">
      <Link 
        to="/" 
        className={`px-4 py-2 rounded-full font-bold shadow-lg transition-all ${isOriginal ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
      >
        Main (Comp)
      </Link>
      <Link 
        to="/analysis" 
        className={`px-4 py-2 rounded-full font-bold shadow-lg transition-all ${isAnalysis ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
      >
        Analysis (Root)
      </Link>
      <Link 
        to="/newpage" 
        className={`px-4 py-2 rounded-full font-bold shadow-lg transition-all ${isBento ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
      >
        Bento (V2)
      </Link>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <NavToggler />
      <Routes>
        {/* V1: Component-based Dashboard */}
        <Route path="/" element={<SeoulFranchiseDashboard />} />
        
        {/* V2: New Bento Style */}
        <Route path="/newpage" element={<SmartBizMap_Bento />} />
        
        {/* V3: Refactored Analysis (Root File) */}
        <Route path="/analysis" element={<SmartBizMap_Analysis />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;