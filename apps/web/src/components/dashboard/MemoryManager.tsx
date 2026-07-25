"use client";

import { useEffect, useState } from "react";

interface Preference {
  id: string;
  category: string;
  key: string;
  value: string;
  confidence: number;
}

interface Fact {
  id: string;
  fact: string;
  category: string | null;
  confidence: number;
}

export default function MemoryManager() {
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [facts, setFacts] = useState<Fact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMemory();
  }, []);

  const fetchMemory = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const [prefRes, factRes] = await Promise.all([
        fetch(`${baseUrl}/api/memory/preferences`),
        fetch(`${baseUrl}/api/memory/facts`)
      ]);

      if (prefRes.ok) setPreferences(await prefRes.json());
      if (factRes.ok) setFacts(await factRes.json());
    } catch (error) {
      console.error("Failed to fetch memory", error);
    } finally {
      setLoading(false);
    }
  };

  const deletePreference = async (id: string) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      await fetch(`${baseUrl}/api/memory/preferences/${id}`, { method: 'DELETE' });
      setPreferences(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error("Failed to delete preference", error);
    }
  };

  const deleteFact = async (id: string) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      await fetch(`${baseUrl}/api/memory/facts/${id}`, { method: 'DELETE' });
      setFacts(prev => prev.filter(f => f.id !== id));
    } catch (error) {
      console.error("Failed to delete fact", error);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-on-surface-variant">
        Accessing Neural Storage...
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 scroll-hide">
      
      <div className="mb-8">
        <h3 className="text-lg font-headline-md text-primary mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined">settings_accessibility</span>
          User Preferences
        </h3>
        {preferences.length === 0 ? (
          <p className="text-sm text-on-surface-variant italic">No preferences learned yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {preferences.map((pref) => (
              <div key={pref.id} className="glass-card p-4 rounded-xl border border-white/10 relative group">
                <button 
                  onClick={() => deletePreference(pref.id)}
                  className="absolute top-3 right-3 text-on-surface-variant hover:text-error opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
                <div className="text-[10px] uppercase tracking-wider text-secondary mb-1">{pref.category}</div>
                <div className="font-medium text-on-surface">{pref.key}</div>
                <div className="text-sm text-on-surface-variant mt-1">{pref.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-headline-md text-tertiary mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined">psychology</span>
          Learned Facts
        </h3>
        {facts.length === 0 ? (
          <p className="text-sm text-on-surface-variant italic">No facts learned yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {facts.map((fact) => (
              <div key={fact.id} className="glass-card p-4 rounded-xl border border-white/10 relative group">
                <button 
                  onClick={() => deleteFact(fact.id)}
                  className="absolute top-3 right-3 text-on-surface-variant hover:text-error opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
                {fact.category && (
                  <div className="text-[10px] uppercase tracking-wider text-tertiary mb-1">{fact.category}</div>
                )}
                <div className="font-medium text-on-surface mt-1">{fact.fact}</div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
