export type JanmashtamiHighlight =
  | {
      title: string;
      date: string;
      type: 'video';
      url: string;
    }
  | {
      title: string;
      date: string;
      type: 'post';
      url: string;
      image: string;
    };

/** Past Janmashtami videos and social posts (newest first). */
export const janmashtamiHighlights: JanmashtamiHighlight[] = [
  {
    title: 'Sri Krishna Janmashtami Mahamahotsav 2025',
    date: '2025-08-16',
    type: 'video',
    url: 'https://youtu.be/nF2wtEcixsI?t=555',
  },
  {
    title: 'Invitation for Sri Krsna Janmashtami',
    date: '2025-08-16',
    type: 'video',
    url: 'https://www.youtube.com/watch?v=1Q_Jc5cVABE',
  },
  {
    title: 'Sri Krishna Janmashtami Mahamahotsav',
    date: '2024-08-26',
    type: 'video',
    url: 'https://www.youtube.com/watch?v=AMT9Jj_Fp_U&t=4054s',
  },
  {
    title: 'Sri Krsna Janmashtami 2024 Highlights',
    date: '2024-08-26',
    type: 'post',
    url: 'https://www.facebook.com/iskcondeogharofficial/',
    image: '/images/RecentEvents/janmashtami.jpg',
  },
];
