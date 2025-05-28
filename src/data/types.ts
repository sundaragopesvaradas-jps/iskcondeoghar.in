export interface FestivalEvent {
  title: string;
  date: string;
  image: string;
  description: string;
  url?: string;
}

export interface EventVideo {
  title: string;
  videoUrl: string;
  date: string;
}

export interface WeeklyProgram {
  title: string;
  time: string;
  day: string;
  image: string;
  description: string;
}

export interface UpcomingFestival {
  title: string;
  date: string;
  time: string; // Time in 24-hour format (HH:mm)
  image: string;
  description: string;
} 