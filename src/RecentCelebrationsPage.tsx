import React, { useRef, useState } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import { recentEvents, eventVideos, weeklyPrograms } from './data/festivalData';
import { dateConfig } from './config/dateConfig';
import { scrollConfig } from './config/scrollConfig';
import { contactConfig } from './config/contactConfig';

const EventCard = ({ title, date, image, description, url }: any) => (
  url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className="event-card-link">
      <div className="event-card">
        <img src={image} alt={title} className="event-image" />
        <div className="event-content">
          <h3 className="event-title">{title}</h3>
          <p className="event-date">{dateConfig.displayFormat(date)}</p>
          <p className="event-description">{description}</p>
        </div>
      </div>
    </a>
  ) : (
    <div className="event-card">
      <img src={image} alt={title} className="event-image" />
      <div className="event-content">
        <h3 className="event-title">{title}</h3>
        <p className="event-date">{dateConfig.displayFormat(date)}</p>
        <p className="event-description">{description}</p>
      </div>
    </div>
  )
);

const VideoCard = ({ title, videoUrl, date }: any) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const getYouTubeVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const videoId = getYouTubeVideoId(videoUrl);
  const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : '';

  return (
    <div className="video-card">
      {!isPlaying ? (
        <div 
          className="video-thumbnail-wrapper" 
          onClick={() => setIsPlaying(true)}
          style={{ cursor: 'pointer' }}
        >
          <div className="thumbnail-container">
            <img src={thumbnailUrl} alt={title} className="video-thumbnail" />
            <div className="play-button">
              <i className="fas fa-play"></i>
            </div>
          </div>
          <div className="video-content">
            <h3 className="video-title">{title}</h3>
            <p className="video-date">{dateConfig.displayFormat(date)}</p>
          </div>
        </div>
      ) : (
        <div>
          <div className="video-player-container">
            <iframe
              width="100%"
              height="200"
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
              title={title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
            <button 
              onClick={() => setIsPlaying(false)} 
              className="close-video-btn"
              title="Close video"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="video-content">
            <h3 className="video-title">{title}</h3>
            <p className="video-date">{dateConfig.displayFormat(date)}</p>
          </div>
        </div>
      )}
    </div>
  );
};

const WeeklyProgramCard = ({ title, time, day, image, description }: any) => (
  <div className="program-card">
    <img src={image} alt={title} className="program-image" />
    <div className="program-content">
      <h3 className="program-title">{title}</h3>
      <p className="program-time"><i className="fas fa-clock"></i> {time}</p>
      <p className="program-day"><i className="fas fa-calendar-day"></i> {day}</p>
      <p className="program-description">{description}</p>
    </div>
  </div>
);

const RecentCelebrationsPage: React.FC = () => {
  const eventGridRef = useRef<HTMLDivElement>(null);
  const videoGridRef = useRef<HTMLDivElement>(null);
  const programGridRef = useRef<HTMLDivElement>(null);
  const [isEventHovered, setIsEventHovered] = useState(false);
  const [isVideoHovered, setIsVideoHovered] = useState(false);
  const [isProgramHovered, setIsProgramHovered] = useState(false);

  const scroll = (direction: 'prev' | 'next', element: HTMLDivElement | null) => {
    if (element) {
      const scrollAmount = element.clientWidth;
      const maxScroll = element.scrollWidth - element.clientWidth;
      const currentScroll = element.scrollLeft;
      if (direction === 'next') {
        if (currentScroll >= maxScroll) {
          element.style.scrollBehavior = 'auto';
          element.scrollLeft = 0;
          void element.getBoundingClientRect();
          element.style.scrollBehavior = 'smooth';
        } else {
          element.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
      } else {
        if (currentScroll === 0) {
          element.style.scrollBehavior = 'auto';
          element.scrollLeft = maxScroll;
          void element.getBoundingClientRect();
          element.style.scrollBehavior = 'smooth';
        } else {
          const targetScroll = Math.max(0, currentScroll - scrollAmount);
          element.scrollTo({ left: targetScroll, behavior: 'smooth' });
        }
      }
    }
  };

  return (
    <div>
      <Header />
      <main style={{ padding: '2rem', maxWidth: 'auto', margin: '0 auto' }}>
        <h1>Recent Celebrations</h1>
        <section className="recent-events">
          <h2 className="section-title">Recent Events</h2>
          <div className="scroll-container">
            <button className="scroll-button prev" onClick={() => scroll('prev', eventGridRef.current)}>
              <i className="fas fa-chevron-left"></i>
            </button>
            <div
              className="event-grid"
              ref={eventGridRef}
              onMouseEnter={() => setIsEventHovered(true)}
              onMouseLeave={() => setIsEventHovered(false)}
              style={{ gap: `${scrollConfig.gapBetweenTiles}px` }}
            >
              {recentEvents.map((item, index) => (
                <EventCard key={index} {...item} />
              ))}
            </div>
            <button className="scroll-button next" onClick={() => scroll('next', eventGridRef.current)}>
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </section>
        <section className="event-videos">
          <h2 className="section-title">Watch Event Videos</h2>
          <div className="scroll-container">
            <button className="scroll-button prev" onClick={() => scroll('prev', videoGridRef.current)}>
              <i className="fas fa-chevron-left"></i>
            </button>
            <div
              className="video-grid"
              ref={videoGridRef}
              onMouseEnter={() => setIsVideoHovered(true)}
              onMouseLeave={() => setIsVideoHovered(false)}
              style={{ gap: `${scrollConfig.gapBetweenTiles}px` }}
            >
              {eventVideos.map((item, index) => (
                <VideoCard key={index} {...item} />
              ))}
            </div>
            <button className="scroll-button next" onClick={() => scroll('next', videoGridRef.current)}>
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </section>
        <section className="weekly-programs">
          <h2 className="section-title">Weekly Temple Programs</h2>
          <div className="scroll-container">
            <button className="scroll-button prev" onClick={() => scroll('prev', programGridRef.current)}>
              <i className="fas fa-chevron-left"></i>
            </button>
            <div
              className="program-grid"
              ref={programGridRef}
              onMouseEnter={() => setIsProgramHovered(true)}
              onMouseLeave={() => setIsProgramHovered(false)}
              style={{ gap: `${scrollConfig.gapBetweenTiles}px` }}
            >
              {weeklyPrograms.map((item, index) => (
                <WeeklyProgramCard key={index} {...item} />
              ))}
            </div>
            <button className="scroll-button next" onClick={() => scroll('next', programGridRef.current)}>
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </section>
        <div style={{ margin: '2rem 0', textAlign: 'center' }}>
          <a
            href="/join"
            style={{
              display: 'inline-block',
              background: 'linear-gradient(90deg, #ff4081, #ff80ab)',
              color: '#fff',
              padding: '1rem 2.5rem',
              borderRadius: '30px',
              fontSize: '1.2rem',
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(255, 64, 129, 0.15)',
              transition: 'background 0.3s, transform 0.2s',
            }}
          >
            Join Our Next Celebration!
          </a>
        </div>
        <section className="cta-buttons">
          <div className="cta-container">
            <a href={contactConfig.social.facebook} className="cta-btn facebook" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-facebook-f"></i>
              <span>Follow Us</span>
            </a>
            <a href={contactConfig.social.youtube} className="cta-btn youtube" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-youtube"></i>
              <span>Subscribe</span>
            </a>
            <a href={`tel:${contactConfig.phoneNumber}`} className="cta-btn call" title="Call Us">
              <i className="fas fa-phone"></i>
              <span>Call Now</span>
            </a>
            <button
              onClick={() => window.open(contactConfig.whatsapp.getWhatsAppLink(contactConfig.whatsapp.message), '_blank')}
              className="cta-btn whatsapp"
              title="Message on WhatsApp"
            >
              <i className="fab fa-whatsapp"></i>
              <span>WhatsApp</span>
            </button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default RecentCelebrationsPage; 