import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="landing-container animate-fade-in" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '10vh' }}>
      
      <header style={{ textAlign: 'center', marginBottom: 'var(--space-16)' }}>
        <h1 className="text-gradient animate-slide-up" style={{ fontSize: '4rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
          Your Autonomous AI Assistant
        </h1>
        <p className="animate-slide-up" style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto', animationDelay: '0.1s' }}>
          Execute complex tasks, monitor progress in real-time, and leverage smart memory with a beautiful interface.
        </p>
      </header>
      
      <div className="animate-slide-up" style={{ animationDelay: '0.2s', marginBottom: 'var(--space-16)' }}>
        <Link href="/dashboard">
          <button className="bg-gradient" style={{ padding: 'var(--space-4) var(--space-8)', borderRadius: 'var(--radius-full)', color: 'white', fontWeight: 600, fontSize: '1.1rem', boxShadow: 'var(--shadow-glow)', transition: 'transform 0.2s', cursor: 'pointer' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            Get Started
          </button>
        </Link>
      </div>
      
      <div className="features-grid animate-slide-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-6)', width: '100%', maxWidth: '1200px', padding: '0 var(--space-4)', animationDelay: '0.3s' }}>
        <div className="glass" style={{ padding: 'var(--space-8)', borderRadius: 'var(--radius-xl)', transition: 'transform 0.3s' }}>
          <div style={{ fontSize: '2rem', marginBottom: 'var(--space-4)' }}>⚡</div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-2)', fontWeight: 600 }}>Multi-Step Execution</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Watch as the agent plans and executes complex, multi-step workflows autonomously.</p>
        </div>
        
        <div className="glass" style={{ padding: 'var(--space-8)', borderRadius: 'var(--radius-xl)', transition: 'transform 0.3s' }}>
          <div style={{ fontSize: '2rem', marginBottom: 'var(--space-4)' }}>👁️</div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-2)', fontWeight: 600 }}>Real-Time Visibility</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Live streaming updates let you see exactly what the agent is thinking and doing.</p>
        </div>
        
        <div className="glass" style={{ padding: 'var(--space-8)', borderRadius: 'var(--radius-xl)', transition: 'transform 0.3s' }}>
          <div style={{ fontSize: '2rem', marginBottom: 'var(--space-4)' }}>🧠</div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-2)', fontWeight: 600 }}>Smart Memory</h3>
          <p style={{ color: 'var(--text-secondary)' }}>The agent remembers past interactions and context, providing a deeply personalized experience.</p>
        </div>
      </div>
    </div>
  );
}
