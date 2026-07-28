export const dateConfig = {
  // Format: "DD Month, YYYY at HH:mm IST"
  displayFormat: (isoDate: string, time?: string): string => {
    // Create date in IST timezone
    const date = new Date(isoDate);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'long' });
    const year = date.getFullYear();
    
    if (time) {
      return `${day} ${month}, ${year} at ${time} IST`;
    }
    return `${day} ${month}, ${year}`;
  },

  // Convert 24-hour "HH:mm" to 12-hour display, e.g. "18:00" -> "6:00 PM"
  displayTime12h: (time24: string): string => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
  },

  // Convert date and time to IST timestamp
  getISTTimestamp: (date: string, time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    const dateObj = new Date(date);
    
    // Set the time in IST (UTC+5:30)
    dateObj.setUTCHours(hours - 5, minutes - 30);
    
    return dateObj.getTime();
  }
}; 