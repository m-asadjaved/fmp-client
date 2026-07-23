'use client';

import React, { useRef, useState, useEffect } from 'react';

const BRANDS = [
  { name: 'google', url: 'https://google.com' },
  { name: 'meta', url: 'https://about.meta.com' },
  { name: 'amazon', url: 'https://amazon.com' },
  { name: 'netflix', url: 'https://netflix.com' },
  { name: 'shopify', url: 'https://shopify.com' },
  { name: 'microsoft', url: 'https://microsoft.com' },
  { name: 'stripe', url: 'https://stripe.com' },
  { name: 'vercel', url: 'https://vercel.com' },
  { name: 'spotify', url: 'https://spotify.com' },
  { name: 'adobe', url: 'https://adobe.com' },
  { name: 'openai', url: 'https://openai.com' },
  { name: 'airbnb', url: 'https://airbnb.com' },
  { name: 'uber', url: 'https://uber.com' },
  { name: 'tesla', url: 'https://tesla.com' },
  { name: 'figma', url: 'https://figma.com' }
];

export function InfiniteLogoSlider() {
  const scrollRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Drag-to-scroll state
  const [startX, setStartX] = useState(0);
  const [scrollStartLeft, setScrollStartLeft] = useState(0);
  const [hasDragged, setHasDragged] = useState(false);
  
  // Double the brands array to ensure one set is much wider than any viewport
  const EXTENDED_BRANDS = [...BRANDS, ...BRANDS];

  useEffect(() => {
    let animationId;
    let lastTime = performance.now();
    
    const animate = (currentTime) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;
      
      // Auto-scroll when not interacted with
      if (scrollRef.current && !isHovered && !isDragging) {
        scrollRef.current.scrollLeft += (deltaTime * 0.04);
      }
      
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [isHovered, isDragging]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth } = scrollRef.current;
    
    // The scrollWidth contains TWO identical render blocks.
    // If we reach halfway (the start of the second block), loop back to 0 seamlessly.
    // If we scroll backward past 0, jump to the end of the first block.
    if (scrollLeft >= scrollWidth / 2) {
      scrollRef.current.scrollLeft = scrollLeft - (scrollWidth / 2);
    } else if (scrollLeft <= 0) {
      scrollRef.current.scrollLeft = scrollLeft + (scrollWidth / 2);
    }
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setHasDragged(false);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollStartLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    setHasDragged(true);
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // Scroll speed multiplier
    scrollRef.current.scrollLeft = scrollStartLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsDragging(false);
  };

  const handleLinkClick = (e) => {
    if (hasDragged) {
      e.preventDefault();
    }
  };

  return (
    <div className="py-12 bg-brand-surfaceBg">
      <div 
        className="w-full" 
        style={{ 
          maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)', 
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)' 
        }}
      >
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={handleMouseLeave}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          className="flex w-full overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] opacity-80 hover:opacity-100 transition-opacity duration-500 cursor-grab active:cursor-grabbing will-change-scroll select-none"
        >
          {/* Block 1 */}
          <div className="flex gap-20 pr-20 shrink-0 items-center">
            {EXTENDED_BRANDS.map((brand, idx) => (
              <a 
                key={`${brand.name}-${idx}`} 
                href={brand.url} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={handleLinkClick}
                className="flex items-center gap-3 hover:scale-105 transition-transform shrink-0"
                draggable={false}
              >
                <img 
                  src={`https://cdn.simpleicons.org/${brand.name}`} 
                  alt={`${brand.name} logo`} 
                  className="w-7 h-7 md:w-9 md:h-9 object-contain pointer-events-none"
                  draggable={false}
                />
                <div className="text-2xl md:text-3xl font-bold text-brand-secondary whitespace-nowrap tracking-tighter capitalize pointer-events-none">
                  {brand.name}
                </div>
              </a>
            ))}
          </div>
          {/* Block 2 */}
          <div className="flex gap-20 pr-20 shrink-0 items-center" aria-hidden="true">
            {EXTENDED_BRANDS.map((brand, idx) => (
              <a 
                key={`dup-${brand.name}-${idx}`} 
                href={brand.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 hover:scale-105 transition-transform shrink-0"
                draggable={false}
              >
                <img 
                  src={`https://cdn.simpleicons.org/${brand.name}`} 
                  alt={`${brand.name} logo`} 
                  className="w-7 h-7 md:w-9 md:h-9 object-contain pointer-events-none"
                  draggable={false}
                />
                <div className="text-2xl md:text-3xl font-bold text-brand-secondary whitespace-nowrap tracking-tighter capitalize pointer-events-none">
                  {brand.name}
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
