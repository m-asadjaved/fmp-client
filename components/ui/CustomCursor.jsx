'use client';
import { useEffect, useRef } from 'react';

export default function CustomCursor() {
  const containerRef = useRef(null);

  useEffect(() => {
    // Disable on touch devices
    if (window.matchMedia("(max-width: 768px)").matches || 
        ('ontouchstart' in window) || 
        (navigator.maxTouchPoints > 0)) {
      return;
    }

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    
    // Fast spring for primary spotlight
    let springX = mouseX;
    let springY = mouseY;
    
    // Slow spring for secondary ambient glow
    let slowSpringX = mouseX;
    let slowSpringY = mouseY;

    const handleMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      
      // The mask (the grid revealer) updates instantly for zero-latency feel
      if (containerRef.current) {
        containerRef.current.style.setProperty('--mouseX', `${mouseX}px`);
        containerRef.current.style.setProperty('--mouseY', `${mouseY}px`);
      }
    };

    const animate = () => {
      springX += (mouseX - springX) * 0.15;
      springY += (mouseY - springY) * 0.15;
      
      slowSpringX += (mouseX - slowSpringX) * 0.04;
      slowSpringY += (mouseY - slowSpringY) * 0.04;

      if (containerRef.current) {
        containerRef.current.style.setProperty('--springX', `${springX}px`);
        containerRef.current.style.setProperty('--springY', `${springY}px`);
        containerRef.current.style.setProperty('--slowX', `${slowSpringX}px`);
        containerRef.current.style.setProperty('--slowY', `${slowSpringY}px`);
      }
      requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMouseMove);
    const animId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{
        // 1. The ultra-dense crisp technical dot grid.
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23333333' fill-opacity='0.35' fill-rule='evenodd'%3E%3Ccircle cx='2' cy='2' r='1'/%3E%3C/g%3E%3C/svg%3E")`,
        // 2. The zero-latency mask. It instantly reveals the grid exactly where your mouse is.
        maskImage: `radial-gradient(400px circle at var(--mouseX, 50%) var(--mouseY, 50%), black 0%, transparent 100%)`,
        WebkitMaskImage: `radial-gradient(400px circle at var(--mouseX, 50%) var(--mouseY, 50%), black 0%, transparent 100%)`,
        willChange: 'mask-image, -webkit-mask-image'
      }}
    >
      {/* 3. The fast-following primary glow (Dark Grey) */}
      <div 
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background: `radial-gradient(500px circle at var(--springX, 50%) var(--springY, 50%), rgba(51, 51, 51, 0.15), transparent 100%)`,
          willChange: 'background'
        }}
      />
      {/* 4. The very slow-following secondary glow (Dark Grey) */}
      <div 
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background: `radial-gradient(600px circle at var(--slowX, 50%) var(--slowY, 50%), rgba(51, 51, 51, 0.10), transparent 100%)`,
          willChange: 'background'
        }}
      />
    </div>
  );
}
