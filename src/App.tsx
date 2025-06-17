import React from 'react';
import './App.css';
import Header from './components/Header';
import Footer from './components/Footer';
import EventGallery from './components/EventGallery';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function useLogVisit() {
  const location = useLocation();
  useEffect(() => {
    fetch('/api/logVisit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: location.pathname })
    });
  }, [location]);
}

function App() {
  useLogVisit();
  return (
    <div className="App">
      <Header />
      <main>
        <EventGallery />
      </main>
      <Footer />
    </div>
  );
}

export default App;
