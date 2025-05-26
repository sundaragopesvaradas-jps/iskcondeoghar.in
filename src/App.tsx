import React from 'react';
import './App.css';
import Header from './components/Header';
import Footer from './components/Footer';
import EventGallery from './components/EventGallery';

function App() {
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
