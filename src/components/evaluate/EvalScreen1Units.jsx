import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle, AlertCircle, Loader2, Search, X } from 'lucide-react';
import EvalProgress from './EvalProgress';

export default function EvalScreen1Units({ onConfirm }) {
    const [unitCode, setUnitCode] = useState('');
    const [searchState, setSearchState] = useState('idle');
    const [units, setUnits] = useState([]);

    const handleFindUnit = async (e) => {
        e?.preventDefault();
        const code = unitCode.trim().toUpperCase();
        if (!code) return;
        if (units.some(u => u.code === code)) return;
        setSearchState('loading');
        setUnits(prev => [...prev, { code, title: '', uocData: null, status: 'loading' }]);
        setUnitCode('');
        try {
            const result = await base44.functions.invoke('fetchUnitFromTGA', { unitCode: code });
            setUnits(prev => prev.map(u => u.code === code
                ? { ...u, title: result.data.unitTitle, uocData: result.data, status: 'confirmed' }
                : u));
        } catch (err) {
            setUnits(prev => prev.map(u => u.code === code
                ? { ...u, status: 'error', error: err?.response?.data?.error || err.message || 'Could not load unit' }
                : u));
        } finally {
            setSearchState('idle');
        }
    };

    const removeUnit = (code) => setUnits(prev => prev.filter(u => u.code !== code));

    const confirmedUnits = units.filter(u => u.status === 'confirmed');
    const canContinue = confirmedUnits.length > 0;

    const handleContinue = () => {
        onConfirm(confirmedUnits.map(u => ({ code: u.code, title: u.title, uocData: u.uocData })));
    };

    return (
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#ffffff' }}>
            <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 56px' }}>
                <EvalProgress step={1} />
                <h2 style={{ color: '#0d2444', fontSize: '24px', fontWeight: 500, marginBottom: '8px' }}>
                    Which units is this assessment for?
                </h2>
                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>
                    Enter each unit code to load it from training.gov.au. Add as many as you need for your cluster.
                </p>
                <p style={{ color: '#c9a84c', fontSize: '12px', fontWeight: 500, marginBottom: '24px' }}>
                    + Add units one at a time below
                </p>

                <form onSubmit={handleFindUnit} style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                            type="text"
                            value={unitCode}
                            onChange={e => { setUnitCode(e.target.value.toUpperCase()); setSearchState('idle'); }}
                            placeholder="e.g. BSBLDR413"
                            style={{
                                flex: 1, height: '48px',
                                border: '1px solid #e5e7eb', borderRadius: '8px',
                                padding: '0 14px', fontSize: '16px',
                                outline: 'none', boxSizing: 'border-box', letterSpacing: '0.5px',
                            }}
                            onFocus={e => e.target.style.borderColor = '#c9a84c'}
                            onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                            disabled={searchState === 'loading'}
                        />
                        <button
                            type="submit"
                            disabled={searchState === 'loading' || !unitCode.trim()}
                            style={{
                                height: '48px', padding: '0 20px',
                                backgroundColor: (searchState === 'loading' || !unitCode.trim()) ? '#e5e7eb' : '#c9a84c',
                                color: (searchState === 'loading' || !unitCode.trim()) ? '#9ca3af' : '#0d2444',
                                border: 'none', borderRadius: '8px',
                                fontSize: '14px', fontWeight: 600, flexShrink: 0,
                                cursor: (searchState === 'loading' || !unitCode.trim()) ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', gap: '8px',
                            }}
                        >
                            {searchState === 'loading'
                                ? <><Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} /> Loading...</>
                                : <><Search style={{ width: '16px', height: '16px' }} /> Add unit</>
                            }
                        </button>
                    </div>
                    <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                </form>

                {units.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                        {units.map(u => (
                            <UnitCard key={u.code} unit={u} onRemove={() => removeUnit(u.code)} />
                        ))}
                    </div>
                )}

                {canContinue && (
                    <button
                        onClick={handleContinue}
                        style={{
                            width: '100%', height: '44px',
                            backgroundColor: '#c9a84c', color: '#0d2444',
                            border: 'none', borderRadius: '8px',
                            fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                        }}
                    >
                        Next: Upload assessment →
                    </button>
                )}
            </div>
        </div>
    );
}

function UnitCard({ unit, onRemove }) {
    if (unit.status === 'loading') {
        return (
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '14px 16px', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Loader2 style={{ color: '#c9a84c', width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
                <span style={{ color: '#6b7280', fontSize: '14px' }}>Loading {unit.code} from training.gov.au...</span>
            </div>
        );
    }
    if (unit.status === 'error') {
        return (
            <div style={{ border: '1px solid #ef4444', borderRadius: '10px', padding: '14px 16px', backgroundColor: '#fef2f2' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <AlertCircle style={{ color: '#ef4444', width: '18px', height: '18px', flexShrink: 0 }} />
                    <span style={{ color: '#dc2626', fontSize: '14px', fontWeight: 500, flex: 1 }}>{unit.code}: {unit.error}</span>
                    <button onClick={onRemove} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 0 }}>
                        <X style={{ width: '16px', height: '16px' }} />
                    </button>
                </div>
            </div>
        );
    }
    const s = unit.uocData?.summary || {};
    return (
        <div style={{ border: '1px solid #22c55e', borderRadius: '10px', padding: '14px 16px', backgroundColor: '#f0fdf4' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <CheckCircle style={{ color: '#22c55e', width: '18px', height: '18px', flexShrink: 0, marginTop: '2px' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#0d2444', fontSize: '14px', fontWeight: 600 }}>{unit.code} — {unit.title}</p>
                    <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '2px' }}>
                        {s.elementCount || 0} elements · {s.pcCount || 0} PCs · {s.keCount || 0} KE · {s.peCount || 0} PE
                    </p>
                </div>
                <button onClick={onRemove} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 0 }}>
                    <X style={{ width: '16px', height: '16px' }} />
                </button>
            </div>
        </div>
    );
}