import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import DailyReport from './pages/DailyReport';
import ThemeManagement from './pages/ThemeManagement';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/daily-report" element={<DailyReport />} />
        <Route path="/theme-management" element={<ThemeManagement />} />
      </Routes>
    </Router>
  );
}

export default App;
