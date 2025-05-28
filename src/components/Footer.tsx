import React from 'react';
import './Footer.css';
import { contactConfig } from '../config/contactConfig';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-left">
          <div className="temple-description">
            <h2 className="about-title">About Us</h2>
            <p>
            ISKCON Deoghar, located in the sacred Baidyanath Dham, is a vibrant spiritual center dedicated to spreading the teachings of Lord Krishna as imparted by Srila Prabhupada and Sri Chaitanya Mahaprabhu. 
            The temple is home to the beautiful deities of Lord Jagannath, Lord Baladeva, and Devi Subhadra. It offers a serene environment for worship, meditation, and community activities. Regular kirtans, spiritual discourses, and festivals are held, fostering a deep sense of devotion and community among its visitors.
            </p>
          </div>
          <div className="social-icons">
            <a href={contactConfig.social.facebook} className="social-icon facebook" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-facebook-f"></i>
            </a>
            <a href={contactConfig.social.youtube} className="social-icon youtube" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-youtube"></i>
            </a>
          </div>
        </div>

        <div className="footer-right">
          <h2 className="contact-title">Contact Info</h2>
          <div className="contact-info">
            <div className="contact-item">
              <i className="far fa-envelope"></i>
              <a href={`mailto:${contactConfig.email}`}>{contactConfig.email}</a>
            </div>
            <div className="contact-item">
              <i className="fas fa-phone"></i>
              <div>
                {contactConfig.phoneNumbers.map((number, index) => (
                  <React.Fragment key={index}>
                    <a href={`tel:${number}`}>{number}</a>
                    {index === 0 && <span className="phone-label"></span>}
                    {index < contactConfig.phoneNumbers.length - 1 && <br />}
                  </React.Fragment>
                ))}
              </div>
            </div>
            <div className="contact-item">
              <i className="fas fa-map-marker-alt"></i>
              <address>
                {contactConfig.address.getFormattedAddress().split('\n').map((line, index) => (
                  <React.Fragment key={index}>
                    {line}<br />
                  </React.Fragment>
                ))}
              </address>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 