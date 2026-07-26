'use client';

import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import WaveBackground from '../components/landing/WaveBackground';

const features = [
  {
    icon: 'bolt',
    title: 'Multi-Step Execution',
    description: 'Autonomously plans and executes complex, multi-step workflows — watching the agent think in real time.',
    gradient: 'from-[#89ceff] to-[#4cd7f6]',
    glow: 'rgba(137, 206, 255, 0.15)',
  },
  {
    icon: 'visibility',
    title: 'Real-Time Visibility',
    description: 'Live streaming execution graph lets you see every decision, tool call, and reasoning step as it happens.',
    gradient: 'from-[#d0bcff] to-[#a078ff]',
    glow: 'rgba(208, 188, 255, 0.15)',
  },
  {
    icon: 'psychology',
    title: 'Smart Memory',
    description: 'Persistent neural storage remembers past interactions — delivering a deeply personalized, context-aware experience.',
    gradient: 'from-[#4edea3] to-[#00a572]',
    glow: 'rgba(78, 222, 163, 0.15)',
  },
];

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.3,
    },
  },
};

const fadeSlideUp: Variants = {
  hidden: { opacity: 0, y: 30, filter: 'blur(10px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.8, ease },
  },
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, ease },
  },
};

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-on-background font-body-md">
      {/* Animated wave background */}
      <WaveBackground />

      {/* Top gradient vignette */}
      <div
        className="absolute top-0 left-0 right-0 h-[400px] pointer-events-none z-[1]"
        style={{
          background:
            'linear-gradient(180deg, rgba(19,19,21,0.95) 0%, rgba(19,19,21,0.6) 40%, transparent 100%)',
        }}
      />

      {/* Bottom gradient vignette */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[200px] pointer-events-none z-[1]"
        style={{
          background:
            'linear-gradient(0deg, rgba(19,19,21,0.9) 0%, transparent 100%)',
        }}
      />

      {/* ── Navigation ── */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
        className="relative z-20 flex justify-between items-center px-8 md:px-12 py-5"
      >
        <Link
          href="/"
          className="font-display-lg text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-tertiary"
        >
          Omni Agent
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {['Features', 'Docs', 'Pricing'].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-sm text-on-surface-variant hover:text-on-surface transition-colors duration-200 relative group"
            >
              {item}
              <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-primary group-hover:w-full transition-all duration-300" />
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="hidden sm:inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium text-on-surface border border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10 hover:border-white/20 transition-all duration-300"
          >
            Sign In
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold text-on-primary bg-gradient-to-r from-primary-container to-primary hover:shadow-[0_0_30px_rgba(208,188,255,0.3)] transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
          >
            Get Started
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </Link>
        </div>
      </motion.header>

      {/* ── Hero Section ── */}
      <motion.main
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex flex-col items-center text-center px-6 pt-[10vh] md:pt-[14vh] pb-16"
      >
        {/* Announcement badge */}
        <motion.div variants={fadeSlideUp}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8 hover:bg-white/8 transition-colors cursor-default">
            <span className="px-2 py-0.5 rounded-full bg-tertiary/20 text-tertiary text-[10px] font-bold uppercase tracking-wider">
              New
            </span>
            <span className="text-sm text-on-surface-variant">
              Multi-Agent Workflows Are Now Live
            </span>
            <span className="material-symbols-outlined text-sm text-on-surface-variant">arrow_forward</span>
          </div>
        </motion.div>

        {/* Main heading */}
        <motion.h1
          variants={fadeSlideUp}
          className="font-display-lg text-5xl md:text-7xl lg:text-[5.5rem] font-bold leading-[1.05] tracking-tight max-w-4xl mb-6"
        >
          <span className="text-on-surface">Your Autonomous</span>
          <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-secondary via-primary to-tertiary">
            AI Workforce
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={fadeSlideUp}
          className="text-lg md:text-xl text-on-surface-variant max-w-xl mb-10 leading-relaxed"
        >
          Execute complex tasks, monitor progress in real&#8209;time, and leverage
          smart memory — all with a beautiful interface.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div variants={fadeSlideUp} className="flex flex-wrap justify-center gap-4 mb-20">
          <Link
            href="/dashboard"
            className="group relative inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-base font-semibold text-on-primary overflow-hidden transition-all duration-300 hover:scale-[1.04] active:scale-[0.98]"
          >
            {/* Animated gradient background */}
            <span className="absolute inset-0 bg-gradient-to-r from-primary-container via-primary to-secondary bg-[length:200%_100%] animate-[shimmer_3s_ease_infinite]" />
            {/* Glow ring */}
            <span className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 shadow-[0_0_40px_rgba(208,188,255,0.4)]" />
            <span className="relative z-10">Start Building</span>
            <span className="relative z-10 material-symbols-outlined text-lg group-hover:translate-x-0.5 transition-transform">
              arrow_forward
            </span>
          </Link>

          <a
            href="#features"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-base font-medium text-on-surface border border-white/15 bg-white/5 backdrop-blur-md hover:bg-white/10 hover:border-white/25 transition-all duration-300"
          >
            <span className="material-symbols-outlined text-lg text-on-surface-variant">play_circle</span>
            Watch Demo
          </a>
        </motion.div>

        {/* ── Feature Cards ── */}
        <motion.section
          id="features"
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl"
        >
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              variants={scaleIn}
              whileHover={{ y: -6, transition: { duration: 0.3 } }}
              className="group relative rounded-2xl p-[1px] overflow-hidden cursor-default"
            >
              {/* Animated border glow on hover */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: `conic-gradient(from ${i * 120}deg, transparent, ${feature.glow}, transparent)`,
                }}
              />

              {/* Card content */}
              <div className="relative rounded-2xl bg-surface-container/60 backdrop-blur-xl border border-white/8 p-8 h-full group-hover:border-white/15 transition-all duration-500">
                {/* Icon */}
                <div
                  className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} mb-5`}
                  style={{ boxShadow: `0 4px 20px ${feature.glow}` }}
                >
                  <span className="material-symbols-outlined text-xl text-background" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {feature.icon}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-on-surface mb-2 font-headline-md">
                  {feature.title}
                </h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.section>

        {/* ── Trust indicators / Stats ── */}
        <motion.div
          variants={fadeSlideUp}
          className="mt-20 flex flex-wrap justify-center gap-12 md:gap-16"
        >
          {[
            { value: '10k+', label: 'Tasks Executed' },
            { value: '<2s', label: 'Avg Response' },
            { value: '99.9%', label: 'Uptime' },
            { value: '∞', label: 'Possibilities' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl md:text-4xl font-bold font-display-lg bg-clip-text text-transparent bg-gradient-to-b from-on-surface to-on-surface-variant">
                {stat.value}
              </div>
              <div className="text-xs text-on-surface-variant mt-1 uppercase tracking-wider font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </motion.main>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/5 mt-16 py-8 px-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <span className="text-xs text-on-surface-variant">
          © 2026 Omni Agent. All rights reserved.
        </span>
        <div className="flex gap-6">
          {['Privacy', 'Terms', 'Contact'].map((link) => (
            <a
              key={link}
              href="#"
              className="text-xs text-on-surface-variant hover:text-on-surface transition-colors"
            >
              {link}
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
}
