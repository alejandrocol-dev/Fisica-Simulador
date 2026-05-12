/**
 * PhysLab Pro — Main Application
 * Routing and layout setup.
 */
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import OscillationsPage from './modules/oscillations/OscillationsPage';
import KinematicsHub from './modules/kinematics/KinematicsHub';

import EnergyPage from './modules/energy/EnergyPage';
import MagneticFieldPage from './modules/electromagnetism/MagneticFieldPage';
import FaradayPage from './modules/electromagnetism/FaradayPage';
import ModulesPage from './components/ModulesPage';
import ScrollToTop from './components/ScrollToTop';
import './index.css';

function AppContent() {
  const location = useLocation();
  const isLanding = location.pathname === '/';

  return (
    <>
      {!isLanding && <Navbar />}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/sim/oscillations" element={<OscillationsPage />} />
        <Route path="/sim/kinematics" element={<KinematicsHub />} />
        <Route path="/sim/energy" element={<EnergyPage />} />
        <Route path="/sim/magnetic-field" element={<MagneticFieldPage />} />
        <Route path="/sim/faraday" element={<FaradayPage />} />
        <Route path="/modules" element={<ModulesPage />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <HashRouter>
      <ScrollToTop />
      <AppContent />
    </HashRouter>
  );
}
