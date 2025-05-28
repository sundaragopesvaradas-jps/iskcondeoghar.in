import React, { useRef, useState, useEffect } from 'react';
import './EventGallery.css';
import { upcomingFestival, recentEvents, eventVideos, weeklyPrograms } from '../data/festivalData';
import { useAutoScroll } from '../hooks/useAutoScroll';
import { scrollConfig } from '../config/scrollConfig';
import { dateConfig } from '../config/dateConfig';
import { contactConfig } from '../config/contactConfig';

interface EventCardProps {
  title: string;
  date: string;
  image: string;
  description: string;
  url?: string;
  onClick?: () => void;
}

interface VideoCardProps {
  title: string;
  videoUrl: string;
  date: string;
}

interface CountdownProps {
  targetDate: string;
  targetTime: string;
}

interface WeeklyProgramCardProps {
  title: string;
  time: string;
  day: string;
  image: string;
  description: string;
}

const BANNER_STYLES = {
  DYNAMIC_LAYERS: 'dynamic-layers'
} as const;

type BannerStyle = (typeof BANNER_STYLES)[keyof typeof BANNER_STYLES];

const EventCard: React.FC<EventCardProps> = ({ title, date, image, description, url }) => {
  const cardContent = (
    <>
      <img src={image} alt={title} className="event-image" />
      <div className="event-content">
        <h3 className="event-title">{title}</h3>
        <p className="event-date">{dateConfig.displayFormat(date)}</p>
        <p className="event-description">{description}</p>
      </div>
    </>
  );

  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="event-card-link">
        <div className="event-card">
          {cardContent}
        </div>
      </a>
    );
  }

  return (
    <div className="event-card">
      {cardContent}
    </div>
  );
};

const VideoCard: React.FC<VideoCardProps> = ({ title, videoUrl, date }) => {
  // Extract video ID from YouTube URL
  const getYouTubeVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const videoId = getYouTubeVideoId(videoUrl);
  const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : '';

  return (
    <div className="video-card">
      <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="video-link">
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
      </a>
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

const WeeklyProgramCard: React.FC<WeeklyProgramCardProps> = ({ title, time, day, image, description }) => {
  return (
    <div className="program-card">
      <img src={image} alt={title} className="program-image" />
      <div className="program-content">
        <h3 className="program-title">{title}</h3>
        <p className="program-time">
          <i className="fas fa-clock"></i> {time}
        </p>
        <p className="program-day">
          <i className="fas fa-calendar-day"></i> {day}
        </p>
        <p className="program-description">{description}</p>
      </div>
    </div>
  );
};

const EventGallery = () => {
  const eventGridRef = useRef<HTMLDivElement>(null);
  const videoGridRef = useRef<HTMLDivElement>(null);
  const programGridRef = useRef<HTMLDivElement>(null);
  const [isEventHovered, setIsEventHovered] = useState(false);
  const [isVideoHovered, setIsVideoHovered] = useState(false);
  const [isProgramHovered, setIsProgramHovered] = useState(false);
  const [currentStyle] = useState<BannerStyle>(BANNER_STYLES.DYNAMIC_LAYERS);

  useAutoScroll(eventGridRef, isEventHovered);
  useAutoScroll(videoGridRef, isVideoHovered);
  useAutoScroll(programGridRef, isProgramHovered);

  const scroll = (direction: 'prev' | 'next', element: HTMLDivElement | null) => {
    if (element) {
      const scrollAmount = element.clientWidth;
      const maxScroll = element.scrollWidth - element.clientWidth;
      const currentScroll = element.scrollLeft;

      if (direction === 'next') {
        if (currentScroll >= maxScroll) {
          // If at the end, scroll to start
          element.style.scrollBehavior = 'auto';
          element.scrollLeft = 0;
          // Force a reflow
          void element.getBoundingClientRect();
          element.style.scrollBehavior = 'smooth';
        } else {
          element.scrollBy({
            left: scrollAmount,
            behavior: 'smooth'
          });
        }
      } else { // prev direction
        if (currentScroll === 0) {
          // If at the start, scroll to end
          element.style.scrollBehavior = 'auto';
          element.scrollLeft = maxScroll;
          // Force a reflow
          void element.getBoundingClientRect();
          element.style.scrollBehavior = 'smooth';
        } else {
          const targetScroll = Math.max(0, currentScroll - scrollAmount);
          element.scrollTo({
            left: targetScroll,
            behavior: 'smooth'
          });
        }
      }
    }
  };

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

      <section className="recent-events">
        <h2 className="section-title">Recent Events</h2>
        <div className="scroll-container">
          <button 
            className="scroll-button prev" 
            onClick={() => scroll('prev', eventGridRef.current)}
          >
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
          <button 
            className="scroll-button next" 
            onClick={() => scroll('next', eventGridRef.current)}
          >
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>
      </section>

      <section className="event-videos">
        <h2 className="section-title">Event Videos</h2>
        <div className="scroll-container">
          <button 
            className="scroll-button prev" 
            onClick={() => scroll('prev', videoGridRef.current)}
          >
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
          <button 
            className="scroll-button next" 
            onClick={() => scroll('next', videoGridRef.current)}
          >
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>
      </section>

      <section className="weekly-programs">
        <h2 className="section-title">Weekly Temple Programs</h2>
        <div className="scroll-container">
          <button 
            className="scroll-button prev" 
            onClick={() => scroll('prev', programGridRef.current)}
          >
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
          <button 
            className="scroll-button next" 
            onClick={() => scroll('next', programGridRef.current)}
          >
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>
      </section>
      
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