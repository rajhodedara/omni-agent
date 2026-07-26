'use client';

import { useEffect, useRef } from 'react';

export default function WaveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    const w = () => window.innerWidth;
    const h = () => window.innerHeight;

    // Wave layer config — each creates a flowing ribbon of color
    const waveLayers = [
      {
        color: (alpha: number) => `rgba(137, 206, 255, ${alpha})`,  // secondary cyan
        amplitude: 80,
        frequency: 0.003,
        speed: 0.008,
        yOffset: 0.65,
        thickness: 200,
        phase: 0,
      },
      {
        color: (alpha: number) => `rgba(78, 222, 163, ${alpha})`,   // tertiary teal
        amplitude: 60,
        frequency: 0.004,
        speed: 0.006,
        yOffset: 0.7,
        thickness: 160,
        phase: 1.2,
      },
      {
        color: (alpha: number) => `rgba(208, 188, 255, ${alpha})`,  // primary purple
        amplitude: 100,
        frequency: 0.002,
        speed: 0.01,
        yOffset: 0.6,
        thickness: 180,
        phase: 2.5,
      },
      {
        color: (alpha: number) => `rgba(160, 120, 255, ${alpha})`,  // primary container
        amplitude: 50,
        frequency: 0.005,
        speed: 0.007,
        yOffset: 0.75,
        thickness: 120,
        phase: 3.8,
      },
    ];

    // Vertical bar wave config — creates the equalizer/soundwave bars at the bottom
    const barCount = 120;

    const drawBars = (currentTime: number) => {
      const barWidth = w() / barCount;
      const baseY = h() * 0.92;

      for (let i = 0; i < barCount; i++) {
        const x = i * barWidth;
        const normalizedX = i / barCount;

        // Multiple sine waves for organic movement
        const wave1 = Math.sin(normalizedX * 8 + currentTime * 1.5) * 0.5;
        const wave2 = Math.sin(normalizedX * 12 - currentTime * 2.2 + 1.5) * 0.3;
        const wave3 = Math.sin(normalizedX * 4 + currentTime * 0.8 + 3) * 0.2;
        const combined = (wave1 + wave2 + wave3);

        // Bell curve envelope — tallest in center, fading at edges
        const envelope = Math.exp(-Math.pow((normalizedX - 0.5) * 2.5, 2));
        const barHeight = Math.abs(combined) * 150 * envelope + 4;

        // Color gradient from cyan to teal
        const hue = 180 + normalizedX * 40;
        const alpha = 0.4 + envelope * 0.5;

        const gradient = ctx.createLinearGradient(x, baseY, x, baseY - barHeight);
        gradient.addColorStop(0, `hsla(${hue}, 80%, 60%, ${alpha * 0.2})`);
        gradient.addColorStop(0.5, `hsla(${hue}, 85%, 55%, ${alpha * 0.6})`);
        gradient.addColorStop(1, `hsla(${hue}, 90%, 70%, ${alpha})`);

        ctx.fillStyle = gradient;
        ctx.fillRect(x + 1, baseY - barHeight, barWidth - 2, barHeight);

        // Glow on top of each bar
        const glowGradient = ctx.createRadialGradient(
          x + barWidth / 2, baseY - barHeight, 0,
          x + barWidth / 2, baseY - barHeight, barWidth * 2
        );
        glowGradient.addColorStop(0, `hsla(${hue}, 90%, 70%, ${alpha * 0.3})`);
        glowGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGradient;
        ctx.fillRect(x - barWidth, baseY - barHeight - barWidth * 2, barWidth * 3, barWidth * 4);
      }
    };

    const drawAuroraWave = (
      layer: typeof waveLayers[0],
      currentTime: number
    ) => {
      const width = w();
      const height = h();
      const centerY = height * layer.yOffset;

      ctx.beginPath();
      ctx.moveTo(0, height);

      // Build the wave path
      for (let x = 0; x <= width; x += 2) {
        const normalizedX = x / width;
        // Multi-frequency sine for organic shape
        const y1 = Math.sin(x * layer.frequency + currentTime * layer.speed * 60 + layer.phase) * layer.amplitude;
        const y2 = Math.sin(x * layer.frequency * 1.8 + currentTime * layer.speed * 40 + layer.phase + 1) * (layer.amplitude * 0.4);
        const y3 = Math.sin(x * layer.frequency * 0.5 + currentTime * layer.speed * 25 + layer.phase + 2) * (layer.amplitude * 0.6);

        // Envelope: stronger in center of screen
        const envelope = Math.exp(-Math.pow((normalizedX - 0.5) * 1.8, 2));
        const waveY = centerY + (y1 + y2 + y3) * envelope;
        ctx.lineTo(x, waveY);
      }

      ctx.lineTo(width, height);
      ctx.closePath();

      // Gradient fill
      const gradient = ctx.createLinearGradient(0, centerY - layer.thickness, 0, centerY + layer.thickness);
      gradient.addColorStop(0, layer.color(0));
      gradient.addColorStop(0.3, layer.color(0.04));
      gradient.addColorStop(0.5, layer.color(0.08));
      gradient.addColorStop(0.7, layer.color(0.04));
      gradient.addColorStop(1, layer.color(0));

      ctx.fillStyle = gradient;
      ctx.fill();
    };

    // Central glow orb
    const drawCentralGlow = (currentTime: number) => {
      const cx = w() * 0.5;
      const cy = h() * 0.7;
      const pulse = 1 + Math.sin(currentTime * 0.5) * 0.1;
      const radius = Math.min(w(), h()) * 0.35 * pulse;

      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      gradient.addColorStop(0, 'rgba(137, 206, 255, 0.12)');
      gradient.addColorStop(0.3, 'rgba(78, 222, 163, 0.06)');
      gradient.addColorStop(0.6, 'rgba(208, 188, 255, 0.03)');
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w(), h());
    };

    // Floating particles
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      hue: number;
    }> = [];

    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * 2000,
        y: Math.random() * 1200,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.2 - 0.1,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.4 + 0.1,
        hue: 180 + Math.random() * 80,
      });
    }

    const drawParticles = () => {
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around
        if (p.x < 0) p.x = w();
        if (p.x > w()) p.x = 0;
        if (p.y < 0) p.y = h();
        if (p.y > h()) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${p.alpha})`;
        ctx.fill();

        // Soft glow around each
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
        glow.addColorStop(0, `hsla(${p.hue}, 80%, 70%, ${p.alpha * 0.3})`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fillRect(p.x - p.size * 4, p.y - p.size * 4, p.size * 8, p.size * 8);
      }
    };

    const animate = () => {
      time += 0.016; // ~60fps
      ctx.clearRect(0, 0, w(), h());

      // Draw layers back to front
      drawCentralGlow(time);

      // Aurora wave layers
      for (const layer of waveLayers) {
        drawAuroraWave(layer, time);
      }

      // Sound wave bars at bottom
      drawBars(time);

      // Floating particles
      drawParticles();

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
