import { useEffect, RefObject } from 'react';
import { scrollConfig } from '../config/scrollConfig';

export const useAutoScroll = (
  elementRef: RefObject<HTMLDivElement | null>,
  isHovered: boolean
) => {
  useEffect(() => {
    let scrollInterval: NodeJS.Timeout;

    if (elementRef.current && !isHovered) {
      const scroll = () => {
        const element = elementRef.current;
        if (!element) return;

        const tileWidth = element.clientWidth / scrollConfig.tilesPerView;
        const isAtEnd = element.scrollLeft + element.clientWidth >= element.scrollWidth;

        if (isAtEnd) {
          // Reset to start with smooth transition
          element.style.scrollBehavior = 'auto';
          element.scrollLeft = 0;
          // Force a reflow by reading a layout property
          void element.getBoundingClientRect();
          element.style.scrollBehavior = scrollConfig.scrollBehavior;
        } else {
          // Apply transition styles
          element.style.setProperty('--transition-duration', scrollConfig.transitionDuration);
          element.style.setProperty('--transition-timing', scrollConfig.transitionTimingFunction);
          // Scroll one tile
          element.scrollBy({
            left: tileWidth,
            behavior: scrollConfig.scrollBehavior
          });
        }
      };

      // Set interval based on scrollTimePerTile
      scrollInterval = setInterval(scroll, scrollConfig.scrollTimePerTile);
    }

    return () => {
      if (scrollInterval) {
        clearInterval(scrollInterval);
      }
    };
  }, [elementRef, isHovered]);
}; 