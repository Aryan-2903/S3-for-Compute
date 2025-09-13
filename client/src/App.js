import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Functions from './pages/Functions';
import Monitoring from './pages/Monitoring';
import CostMonitoring from './pages/CostMonitoring';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/functions" element={<Functions />} />
            <Route path="/monitoring" element={<Monitoring />} />
            <Route path="/costs" element={<CostMonitoring />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
