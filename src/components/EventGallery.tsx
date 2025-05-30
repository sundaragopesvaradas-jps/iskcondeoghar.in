import React, { useRef, useState, useEffect } from 'react';
import './EventGallery.css';
import { upcomingFestival } from '../data/festivalData';
import { useAutoScroll } from '../hooks/useAutoScroll';
import { scrollConfig } from '../config/scrollConfig';
import { dateConfig } from '../config/dateConfig';
import { contactConfig } from '../config/contactConfig';
import { externalConfig } from '../config/externalConfig';

interface VideoCardProps {
  title: string;
  videoUrl: string;
  date: string;
  hideCaption?: boolean;
}

interface CountdownProps {
  targetDate: string;
  targetTime: string;
}

const BANNER_STYLES = {
  DYNAMIC_LAYERS: 'dynamic-layers'
} as const;

type BannerStyle = (typeof BANNER_STYLES)[keyof typeof BANNER_STYLES];

const VideoCard = ({ title, videoUrl, date, hideCaption }: VideoCardProps) => {
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
          {!hideCaption && (
            <div className="video-content">
              <h3 className="video-title">{title}</h3>
              <p className="video-date">{dateConfig.displayFormat(date)}</p>
            </div>
          )}
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
          {!hideCaption && (
            <div className="video-content">
              <h3 className="video-title">{title}</h3>
              <p className="video-date">{dateConfig.displayFormat(date)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const calculateTimeLeft = (targetDate: string, targetTime: string) => {
  const targetDateTime = dateConfig.getISTTimestamp(targetDate, targetTime);
  const now = new Date().getTime();
  const difference = targetDateTime - now;

  if (difference <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true
    };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((difference % (1000 * 60)) / 1000),
    isExpired: false
  };
};

const Countdown: React.FC<CountdownProps> = ({ targetDate, targetTime }) => {
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(targetDate, targetTime));

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(targetDate, targetTime);
      setTimeLeft(newTimeLeft);

      if (newTimeLeft.isExpired) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, targetTime]);

  if (timeLeft.isExpired) {
    return (
      <div className="countdown-timer">
        <div className="countdown-expired">
          Program is Live !! <strong>LIVE</strong>!
        </div>
      </div>
    );
  }

  return (
    <div className="countdown-timer">
      <div className="countdown-item">
        <div className="countdown-value">{String(timeLeft.days).padStart(2, '0')}</div>
        <div className="countdown-label">Days</div>
      </div>
      <div className="countdown-item">
        <div className="countdown-value">{String(timeLeft.hours).padStart(2, '0')}</div>
        <div className="countdown-label">Hours</div>
      </div>
      <div className="countdown-item">
        <div className="countdown-value">{String(timeLeft.minutes).padStart(2, '0')}</div>
        <div className="countdown-label">Minutes</div>
      </div>
      <div className="countdown-item">
        <div className="countdown-value">{String(timeLeft.seconds).padStart(2, '0')}</div>
        <div className="countdown-label">Seconds</div>
      </div>
    </div>
  );
};

const EventGallery = () => {
  const eventGridRef = useRef<HTMLDivElement>(null);
  const videoGridRef = useRef<HTMLDivElement>(null);
  const programGridRef = useRef<HTMLDivElement>(null);
  const [isEventHovered] = useState(false);
  const [isVideoHovered] = useState(false);
  const [isProgramHovered] = useState(false);
  const [currentStyle] = useState<BannerStyle>(BANNER_STYLES.DYNAMIC_LAYERS);

  useAutoScroll(eventGridRef, isEventHovered);
  useAutoScroll(videoGridRef, isVideoHovered);
  useAutoScroll(programGridRef, isProgramHovered);

  return (
    <div className="gallery-section">
      <section className={`upcoming-festival ${currentStyle}`}>
        <div className="festival-banner">
          <img src={upcomingFestival.image} alt={upcomingFestival.title} />
        </div>
        <div className="festival-content-wrapper">
          <div className="festival-content">
            <h2 className="festival-title">{upcomingFestival.title}</h2>
            <p className="festival-date">
              <i className="fas fa-calendar-alt"></i>
              {dateConfig.displayFormat(upcomingFestival.date)}
            </p>
            <p className="festival-description">{upcomingFestival.description}</p>
            <Countdown targetDate={upcomingFestival.date} targetTime={upcomingFestival.time} />
          </div>
        </div>
      </section>

      <div style={{ textAlign: 'center', margin: '3rem 0' }}>
        <a
          href="/recentcelebrations"
          style={{
            display: 'inline-block',
            background: 'linear-gradient(90deg, #ff4081, #ff80ab)',
            color: '#fff',
            padding: '1.2rem 2.8rem',
            borderRadius: '30px',
            fontSize: '1.3rem',
            fontWeight: 700,
            textDecoration: 'none',
            boxShadow: '0 4px 16px rgba(255, 64, 129, 0.18)',
            transition: 'background 0.3s, transform 0.2s',
          }}
        >
          View our recent celebrations
        </a>
      </div>

      {externalConfig.showGallerySections && (
        <>
        {/* Glance Lord's Temple Section */}
        <section style={{ margin: '3rem 0' }}>
          <h2 className="section-title">Glance Lord's Temple</h2>
          <div className="scroll-container">
            <div className="event-grid" style={{ gap: `${scrollConfig.gapBetweenTiles}px` }}>
              {/* 3 images */}
              {[...Array(3)].map((_, idx) => (
                <div className="event-card" key={idx}>
                  <img src="/images/UpcomingEventBanner/event-photo.jpg" alt={`Temple Glance ${idx+1}`} className="event-image" />
                </div>
              ))}
              {/* 2 videos */}
              {[
                { title: 'Temple Video 1', videoUrl: 'https://www.youtube.com/watch?v=lueNvgcEhVo', date: '2024-06-01' },
                { title: 'Temple Video 2', videoUrl: 'https://www.youtube.com/watch?v=NXFcsJ4Lo1A', date: '2024-06-02' },
              ].map((item, idx) => (
                <VideoCard key={`temple-video-${idx}`} {...item} hideCaption />
              ))}
            </div>
          </div>
          <div style={{ maxWidth: 700, margin: '0 auto', color: '#666', fontSize: '1.1rem', textAlign: 'center' }}>
            A beautiful glimpse of the Lord's temple premises, architecture, and divine atmosphere at ISKCON Deoghar.
          </div>
        </section>

        {/* Goshala Section */}
        <section style={{ margin: '3rem 0' }}>
          <h2 className="section-title">Goshala</h2>
          <div className="scroll-container">
            <div className="event-grid" style={{ gap: `${scrollConfig.gapBetweenTiles}px` }}>
              {/* 3 images */}
              {[...Array(3)].map((_, idx) => (
                <div className="event-card" key={idx}>
                  <img src="/images/UpcomingEventBanner/event-photo.jpg" alt={`Goshala ${idx+1}`} className="event-image" />
                </div>
              ))}
              {/* 2 videos */}
              {[
                { title: 'Goshala Video 1', videoUrl: 'https://www.youtube.com/watch?v=Rq8sI63Cw20', date: '2024-06-03' },
                { title: 'Goshala Video 2', videoUrl: 'https://www.youtube.com/watch?v=1Q_Jc5cVABE', date: '2024-06-04' },
              ].map((item, idx) => (
                <VideoCard key={`goshala-video-${idx}`} {...item} hideCaption />
              ))}
            </div>
          </div>
          <div style={{ maxWidth: 700, margin: '0 auto', color: '#666', fontSize: '1.1rem', textAlign: 'center' }}>
            Our Goshala is home to protected cows, cared for with love and devotion, reflecting the spirit of cow protection in Vedic culture.
          </div>
        </section>

        {/* Regular Programms Section */}
        <section style={{ margin: '3rem 0' }}>
          <h2 className="section-title">Regular Programms</h2>
          {/* Subsection A */}
          <h3 className="section-title" style={{ fontSize: '1.5rem', marginTop: '2rem' }}>A</h3>
          <div className="scroll-container">
            <div className="event-grid" style={{ gap: `${scrollConfig.gapBetweenTiles}px` }}>
              {/* 3 images */}
              {[...Array(3)].map((_, idx) => (
                <div className="event-card" key={idx}>
                  <img src="/images/UpcomingEventBanner/event-photo.jpg" alt={`Regular Programms A ${idx+1}`} className="event-image" />
                </div>
              ))}
              {/* 2 videos */}
              {[
                { title: 'Regular A Video 1', videoUrl: 'https://www.youtube.com/watch?v=lueNvgcEhVo', date: '2024-06-01' },
                { title: 'Regular A Video 2', videoUrl: 'https://www.youtube.com/watch?v=NXFcsJ4Lo1A', date: '2024-06-02' },
              ].map((item, idx) => (
                <VideoCard key={`regular-a-video-${idx}`} {...item} hideCaption />
              ))}
            </div>
          </div>
          <div style={{ maxWidth: 700, margin: '0 auto', color: '#666', fontSize: '1.1rem', textAlign: 'center', marginBottom: '2rem' }}>
            Daily morning and evening arati, kirtan, and darshan of the deities.
          </div>
          {/* Subsection B */}
          <h3 className="section-title" style={{ fontSize: '1.5rem', marginTop: '2rem' }}>B</h3>
          <div className="scroll-container">
            <div className="event-grid" style={{ gap: `${scrollConfig.gapBetweenTiles}px` }}>
              {/* 3 images */}
              {[...Array(3)].map((_, idx) => (
                <div className="event-card" key={idx}>
                  <img src="/images/UpcomingEventBanner/event-photo.jpg" alt={`Regular Programms B ${idx+1}`} className="event-image" />
                </div>
              ))}
              {/* 2 videos */}
              {[
                { title: 'Regular B Video 1', videoUrl: 'https://www.youtube.com/watch?v=Rq8sI63Cw20', date: '2024-06-03' },
                { title: 'Regular B Video 2', videoUrl: 'https://www.youtube.com/watch?v=1Q_Jc5cVABE', date: '2024-06-04' },
              ].map((item, idx) => (
                <VideoCard key={`regular-b-video-${idx}`} {...item} hideCaption />
              ))}
            </div>
          </div>
          <div style={{ maxWidth: 700, margin: '0 auto', color: '#666', fontSize: '1.1rem', textAlign: 'center', marginBottom: '2rem' }}>
            Weekly Bhagavad Gita classes and spiritual discourses for all devotees.
          </div>
          {/* Subsection C */}
          <h3 className="section-title" style={{ fontSize: '1.5rem', marginTop: '2rem' }}>C</h3>
          <div className="scroll-container">
            <div className="event-grid" style={{ gap: `${scrollConfig.gapBetweenTiles}px` }}>
              {/* 3 images */}
              {[...Array(3)].map((_, idx) => (
                <div className="event-card" key={idx}>
                  <img src="/images/UpcomingEventBanner/event-photo.jpg" alt={`Regular Programms C ${idx+1}`} className="event-image" />
                </div>
              ))}
              {/* 2 videos */}
              {[
                { title: 'Regular C Video 1', videoUrl: 'https://www.youtube.com/watch?v=lueNvgcEhVo', date: '2024-06-01' },
                { title: 'Regular C Video 2', videoUrl: 'https://www.youtube.com/watch?v=NXFcsJ4Lo1A', date: '2024-06-02' },
              ].map((item, idx) => (
                <VideoCard key={`regular-c-video-${idx}`} {...item} hideCaption />
              ))}
            </div>
          </div>
          <div style={{ maxWidth: 700, margin: '0 auto', color: '#666', fontSize: '1.1rem', textAlign: 'center', marginBottom: '2rem' }}>
            Special Sunday Love Feast and children's programs every week.
          </div>
        </section>
        </>
      )}

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
      
    </div>
  );
};

export default EventGallery; 
