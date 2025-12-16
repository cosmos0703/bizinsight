import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SeoulFranchiseDashboard from './components/SeoulFranchiseDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SeoulFranchiseDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
