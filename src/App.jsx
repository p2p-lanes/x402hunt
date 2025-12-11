import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import ApiDocs from './components/ApiDocs';
import './App.css';

function App() {
    return (
        <Router>
            <div className="app-layout">
                {/* Navbar Sticky Track */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '600px', // The distance the navbar will follow
                    pointerEvents: 'none', // Let clicks pass through to sides
                    zIndex: 50
                }}>
                    <Navbar />
                </div>

                <main className="main-content" style={{ paddingTop: '140px' }}>
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/run-ads" element={<ApiDocs />} />
                        {/* Redirect old routes to /run-ads */}
                        <Route path="/submit" element={<ApiDocs />} />
                        <Route path="/api-docs" element={<ApiDocs />} />
                        <Route path="/advertise" element={<ApiDocs />} />
                    </Routes>
                </main>
                <Footer />
            </div>
        </Router>
    );
}

export default App;
