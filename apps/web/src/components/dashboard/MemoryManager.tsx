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
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'fact' | 'preference'>('fact');
  const [editData, setEditData] = useState<any>({});

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

  const openAddModal = (type: 'fact' | 'preference') => {
    setModalType(type);
    setEditData({});
    setShowModal(true);
  };

  const openEditModal = (type: 'fact' | 'preference', data: any) => {
    setModalType(type);
    setEditData(data);
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const endpoint = modalType === 'preference' ? '/api/memory/preferences' : '/api/memory/facts';
      const payload = { ...editData, confidence: parseFloat(editData.confidence || "1.0") };
      
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setShowModal(false);
        fetchMemory();
      }
    } catch (error) {
      console.error("Failed to save memory", error);
    }
  };

  const renderConfidenceMeter = (confidence: number) => {
    const percentage = Math.round(confidence * 100);
    let colorClass = "bg-primary";
    if (percentage < 50) colorClass = "bg-error";
    else if (percentage < 80) colorClass = "bg-secondary";

    return (
      <div className="mt-3 flex items-center gap-2" title={`Confidence: ${percentage}%`}>
        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className={`h-full ${colorClass} transition-all duration-1000`} style={{ width: `${percentage}%` }}></div>
        </div>
        <span className="text-[10px] text-on-surface-variant w-6 text-right">{percentage}%</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-on-surface-variant">
        Accessing Neural Storage...
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 relative">
      <div className="flex-1 overflow-y-auto p-6 scroll-hide">
        <div className="flex justify-between items-end mb-8">
          <h3 className="text-lg font-headline-md text-primary flex items-center gap-2">
            <span className="material-symbols-outlined">settings_accessibility</span>
            User Preferences
          </h3>
          <button 
            onClick={() => openAddModal('preference')}
            className="flex items-center gap-1 text-xs text-primary hover:text-white transition-colors bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-full"
          >
            <span className="material-symbols-outlined text-[14px]">add</span>
            Add Preference
          </button>
        </div>
        
        {preferences.length === 0 ? (
          <p className="text-sm text-on-surface-variant italic mb-8">No preferences learned yet.</p>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-8">
            {preferences.map((pref) => (
              <div key={pref.id} className="glass-card p-4 rounded-xl border border-white/10 relative group">
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditModal('preference', pref)} className="text-on-surface-variant hover:text-primary">
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button onClick={() => deletePreference(pref.id)} className="text-on-surface-variant hover:text-error">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
                <div className="text-[10px] uppercase tracking-wider text-secondary mb-1">{pref.category}</div>
                <div className="font-medium text-on-surface">{pref.key}</div>
                <div className="text-sm text-on-surface-variant mt-1">{pref.value}</div>
                {renderConfidenceMeter(pref.confidence)}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between items-end mb-8 mt-6 border-t border-white/10 pt-6">
          <h3 className="text-lg font-headline-md text-tertiary flex items-center gap-2">
            <span className="material-symbols-outlined">psychology</span>
            Learned Facts
          </h3>
          <button 
            onClick={() => openAddModal('fact')}
            className="flex items-center gap-1 text-xs text-tertiary hover:text-white transition-colors bg-tertiary/10 hover:bg-tertiary/20 px-3 py-1.5 rounded-full"
          >
            <span className="material-symbols-outlined text-[14px]">add</span>
            Add Fact
          </button>
        </div>

        {facts.length === 0 ? (
          <p className="text-sm text-on-surface-variant italic">No facts learned yet.</p>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-12">
            {facts.map((fact) => (
              <div key={fact.id} className="glass-card p-4 rounded-xl border border-white/10 relative group">
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditModal('fact', fact)} className="text-on-surface-variant hover:text-tertiary">
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button onClick={() => deleteFact(fact.id)} className="text-on-surface-variant hover:text-error">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
                {fact.category && (
                  <div className="text-[10px] uppercase tracking-wider text-tertiary mb-1">{fact.category}</div>
                )}
                <div className="font-medium text-on-surface mt-1">{fact.fact}</div>
                {renderConfidenceMeter(fact.confidence)}
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 rounded-2xl border border-white/10 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-headline-md text-on-surface mb-4">
              {editData.id ? 'Edit' : 'Add'} {modalType === 'preference' ? 'Preference' : 'Fact'}
            </h3>
            
            <div className="flex flex-col gap-4">
              {modalType === 'preference' ? (
                <>
                  <div>
                    <label className="text-xs text-on-surface-variant mb-1 block">Category</label>
                    <input type="text" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-on-surface" value={editData.category || ''} onChange={(e) => setEditData({...editData, category: e.target.value})} placeholder="e.g. 'ui', 'communication'" />
                  </div>
                  <div>
                    <label className="text-xs text-on-surface-variant mb-1 block">Key</label>
                    <input type="text" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-on-surface" value={editData.key || ''} onChange={(e) => setEditData({...editData, key: e.target.value})} placeholder="e.g. 'theme', 'tone'" />
                  </div>
                  <div>
                    <label className="text-xs text-on-surface-variant mb-1 block">Value</label>
                    <input type="text" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-on-surface" value={editData.value || ''} onChange={(e) => setEditData({...editData, value: e.target.value})} placeholder="e.g. 'dark mode'" />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs text-on-surface-variant mb-1 block">Category (Optional)</label>
                    <input type="text" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-on-surface" value={editData.category || ''} onChange={(e) => setEditData({...editData, category: e.target.value})} placeholder="e.g. 'work', 'personal'" />
                  </div>
                  <div>
                    <label className="text-xs text-on-surface-variant mb-1 block">Fact</label>
                    <textarea className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-on-surface h-24 resize-none" value={editData.fact || ''} onChange={(e) => setEditData({...editData, fact: e.target.value})} placeholder="e.g. 'User has a dog named Buddy.'" />
                  </div>
                </>
              )}
              
              <div>
                <label className="text-xs text-on-surface-variant mb-1 block">Confidence (0.0 to 1.0)</label>
                <input type="number" step="0.1" min="0" max="1" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-on-surface" value={editData.confidence || '1.0'} onChange={(e) => setEditData({...editData, confidence: e.target.value})} />
              </div>
            </div>

            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-on-surface-variant hover:bg-white/5 transition-colors text-sm">
                Cancel
              </button>
              <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-primary text-background font-medium hover:bg-primary/90 transition-colors text-sm">
                Save Memory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
