"use client";

import { useEffect, useState } from 'react';

export default function PerformanceMonitor() {
  const [fps, setFps] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== 'development') return;

    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId: number;

    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        setFps(Math.round((frameCount * 1000) / (currentTime - lastTime)));
        frameCount = 0;
        lastTime = currentTime;
      }
      
      animationFrameId = requestAnimationFrame(measureFPS);
    };

    animationFrameId = requestAnimationFrame(measureFPS);

    // Toggle visibility with Ctrl+Shift+P
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setShow(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  if (!show || process.env.NODE_ENV !== 'development') return null;

  const fpsColor = fps >= 100 ? '#0f0' : fps >= 60 ? '#ff0' : '#f00';

  return (
    <div className="perf-monitor" style={{ color: fpsColor }}>
      <div>FPS: {fps}</div>
      <div style={{ fontSize: '10px', opacity: 0.7 }}>
        {fps >= 100 ? '🚀 Excellent' : fps >= 60 ? '⚡ Good' : '🐌 Slow'}
      </div>
    </div>
  );
}
