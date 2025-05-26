import React from 'react';
import './Header.css';
import logo from '../assets/images/iskcon-logo.png';
import spImage from '../assets/images/sp.jpg';
import { contactConfig } from '../config/contactConfig';

const Header = () => {
  const handleWhatsAppClick = () => {
    window.open(contactConfig.whatsapp.getWhatsAppLink(contactConfig.whatsapp.message), '_blank');
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-left">
          <img src={logo} alt="ISKCON Deoghar" className="logo" />
          <div className="logo-text">
            <h1>ISKCON Deoghar</h1>
            <p>International Society for Krishna Consciousness</p>
          </div>
        </div>

        <div className="header-right">
          <div className="social-icons">
            <a href={contactConfig.social.facebook} className="social-icon facebook" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-facebook-f"></i>
            </a>
            <a href={contactConfig.social.youtube} className="social-icon youtube" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-youtube"></i>
            </a>
          </div>
          <a href={`tel:${contactConfig.phoneNumber}`} className="contact-btn" title="Call Us">
            <i className="fas fa-phone"></i>
            <span>Contact</span>
          </a>
          <button onClick={handleWhatsAppClick} className="whatsapp-btn" title="Message on WhatsApp">
            <i className="fab fa-whatsapp"></i>
            <span>WhatsApp</span>
          </button>
          <img src={spImage} alt="Srila Prabhupada" className="sp-image" title="His Divine Grace A.C. Bhaktivedanta Swami Prabhupada" />
        </div>
      </div>
    </header>
  );
};

export default Header; 