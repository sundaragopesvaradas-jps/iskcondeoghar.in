export const scrollConfig = {
  // Time settings
  scrollTimePerTile: 3000, // Increased time per tile for smoother scrolling

  // Layout settings
  tilesPerView: 4,
  gapBetweenTiles: 20, // in pixels

  // Scroll behavior
  scrollBehavior: 'smooth' as const,
  
  // Animation settings
  transitionDuration: '0.5s',
  transitionTimingFunction: 'ease-in-out'
}; 