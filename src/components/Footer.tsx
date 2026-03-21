import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFacebookF, faYoutube } from '@fortawesome/free-brands-svg-icons';
import { faBookReader, faMapMarkerAlt, faPhone } from '@fortawesome/free-solid-svg-icons';
import { faEnvelope } from '@fortawesome/free-regular-svg-icons';
import './Footer.css';
import { contactConfig } from '../config/contactConfig';
import { externalConfig } from '../config/externalConfig';

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
              <FontAwesomeIcon icon={faFacebookF} />
            </a>
            <a href={contactConfig.social.youtube} className="social-icon youtube" target="_blank" rel="noopener noreferrer">
              <FontAwesomeIcon icon={faYoutube} />
            </a>
          </div>
        </div>

        <div className="footer-right">
          <h2 className="contact-title">Contact Info</h2>
          <div className="contact-info">
            <div className="contact-item">
              <FontAwesomeIcon icon={faEnvelope} />
              <a href={`mailto:${contactConfig.email}`}>{contactConfig.email}</a>
            </div>
            <div className="contact-item">
              <FontAwesomeIcon icon={faPhone} />
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
              <FontAwesomeIcon icon={faMapMarkerAlt} />
              <address>
                {contactConfig.address.getFormattedAddress().split('\n').map((line, index) => (
                  <React.Fragment key={index}>
                    {line}<br />
                  </React.Fragment>
                ))}
              </address>
            </div>
          </div>
          <div className="ask-questions-sp-books">
            <a href={externalConfig.askQuestionsBooks.url} className="ask-link" target="_blank" rel="noopener noreferrer">
              <FontAwesomeIcon icon={faBookReader} />
              {externalConfig.askQuestionsBooks.text}
            </a>
          </div>
          <div className="ask-questions-sp-letters">
            <a href={externalConfig.askQuestionsLetters.url} className="ask-link" target="_blank" rel="noopener noreferrer">
              <FontAwesomeIcon icon={faBookReader} />
              {externalConfig.askQuestionsLetters.text}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 
