import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle, AlertCircle, Loader2, Search, Plus, X } from 'lucide-react';

const BP_STEPS = ['Find Units', 'Learners', 'Review', 'Done'];

function BuildProgress({ step, contextNote }) {
    return (
        <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                {BP_STEPS.map((label, i) => {
                    const idx = i + 1;
                    const done = idx < step;
                    const active = idx === step;
                    return (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < BP_STEPS.length - 1 ? 1 : 'none' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{
                                    width: '28px', height: '28px', borderRadius: '50%',
                                    backgroundColor: done ? '#0d2444' : active ? '#c9a84c' : '#e5e7eb',
                                    color: done ? '#c9a84c' : active ? '#0d2444' : '#9ca3af',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '12px', fontWeight: 600, flexShrink: 0,
                                }}>
                                    {done ? '✓' : idx}
                                </div>
                                <span style={{ fontSize: '10px', color: active ? '#0d2444' : '#9ca3af', fontWeight: active ? 500 : 400, marginTop: '4px', whiteSpace: 'nowrap' }}>
                                    {label}
                                </span>
                            </div>
                            {i < BP_STEPS.length - 1 && (
                                <div style={{ flex: 1, height: '2px', backgroundColor: done ? '#0d2444' : '#e5e7eb', margin: '0 4px', marginBottom: '18px' }} />
                            )}
                        </div>
                    );
                })}
            </div>
            {contextNote && <p style={{ color: '#6b7280', fontSize: '13px', lineHeight: 1.5 }}>{contextNote}</p>}
        </div>
    );
}

export default function BuildScreen1Units({ onConfirm }) {
    const [unitCode, setUnitCode] = useState('');
    const [searchState, setSearchState] = useState('idle'); // 'idle'|'loading'|'confirmed'|'error'
    const [searchError, setSearchError] = useState('');
    const [uocData, setUocData] = useState(null);
    const [units, setUnits] = useState([]);

    const handleFindUnit = async (e) => {
        e.preventDefault();
        if (!unitCode.trim()) return;
        setSearchState('loading');
        setSearchError('');
        setUocData(null);
        try {
            const result = await base44.functions.invoke('fetchUnitFromTGA', { unitCode: unitCode.trim() });
            setUocData(result.data);
            setSearchState('confirmed');
        } catch (err) {
            setSearchError(err?.response?.data?.error || err.message || 'Could not load unit. Try again.');
            setSearchState('error');
        }
    };

    const isDuplicate = (code) => units.some(u => u.code.toUpperCase() === code.toUpperCase());

    const handleAddUnit = () => {
        if (!uocData || isDuplicate(uocData.unitCode)) return;
        setUnits(prev => [...prev, {
            code: uocData.unitCode,
            title: uocData.unitTitle,
            releaseNumber: uocData.releaseNumber,
            uocData,
            text: null,
        }]);
        setUocData(null);
        setUnitCode('');
        setSearchState('idle');
    };

    const handleRemoveUnit = (code) => {
        setUnits(prev => prev.filter(u => u.code !== code));
    };

    const canBuild = units.length >= 1;

    return (
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#ffffff' }}>
            <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 56px' }}>
                <BuildProgress step={1} contextNote="Enter unit codes to load them from training.gov.au. Add as many as you need for your cluster." />

                <h2 style={{ color: '#0d2444', fontSize: '24px', fontWeight: 500, marginBottom: '8px' }}>
                    What units are you building for?
                </h2>
                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
                    Search for each unit code and add it to your cluster. We'll build one combined assessment covering all units.
                </p>

                {/* Search input — shown when not confirmed */}
                {searchState !== 'confirmed' && (
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
                                    : <><Search style={{ width: '16px', height: '16px' }} /> Find unit</>
                                }
                            </button>
                        </div>
                        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                        {searchState === 'loading' && (
                            <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '8px' }}>Loading from training.gov.au...</p>
                        )}
                    </form>
                )}

                {/* Error state */}
                {searchState === 'error' && (
                    <div style={{ border: '1px solid #ef4444', borderRadius: '8px', padding: '14px 16px', backgroundColor: '#fef2f2', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <AlertCircle style={{ color: '#ef4444', width: '16px', height: '16px', flexShrink: 0, marginTop: '1px' }} />
                            <p style={{ color: '#dc2626', fontSize: '13px', margin: 0 }}>{searchError}</p>
                        </div>
                        <button onClick={() => setSearchState('idle')} style={{ padding: '5px 12px', border: '1px solid #ef4444', borderRadius: '6px', backgroundColor: 'transparent', color: '#dc2626', fontSize: '12px', cursor: 'pointer' }}>
                            Try again
                        </button>
                    </div>
                )}

                {/* Confirmed state — add to cluster */}
                {searchState === 'confirmed' && uocData && (
                    <div style={{ border: '1px solid #22c55e', borderRadius: '10px', backgroundColor: '#f0fdf4', overflow: 'hidden', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderBottom: '1px solid #dcfce7' }}>
                            <CheckCircle style={{ color: '#22c55e', width: '20px', height: '20px', flexShrink: 0 }} />
                            <span style={{ color: '#166534', fontSize: '14px', fontWeight: 600 }}>Unit found on training.gov.au</span>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff' }}>
                            <tbody>
                                <tr><td style={{ padding: '7px 12px', color: '#6b7280', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', borderBottom: '1px solid #f3f4f6' }}>Unit Code</td><td style={{ padding: '7px 12px', color: '#0d2444', fontSize: '13px', borderBottom: '1px solid #f3f4f6' }}>{uocData.unitCode}</td></tr>
                                <tr><td style={{ padding: '7px 12px', color: '#6b7280', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', borderBottom: '1px solid #f3f4f6' }}>Title</td><td style={{ padding: '7px 12px', color: '#0d2444', fontSize: '13px', borderBottom: '1px solid #f3f4f6' }}>{uocData.unitTitle}</td></tr>
                                <tr><td style={{ padding: '7px 12px', color: '#6b7280', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', borderBottom: '1px solid #f3f4f6' }}>Release</td><td style={{ padding: '7px 12px', color: '#0d2444', fontSize: '13px', borderBottom: '1px solid #f3f4f6' }}>{uocData.releaseNumber}</td></tr>
                                <tr><td style={{ padding: '7px 12px', color: '#6b7280', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', borderBottom: '1px solid #f3f4f6' }}>Elements</td><td style={{ padding: '7px 12px', color: '#0d2444', fontSize: '13px', borderBottom: '1px solid #f3f4f6' }}>{uocData.summary?.elementCount ?? '—'}</td></tr>
                                <tr><td style={{ padding: '7px 12px', color: '#6b7280', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', borderBottom: '1px solid #f3f4f6' }}>Performance Criteria</td><td style={{ padding: '7px 12px', color: '#0d2444', fontSize: '13px', borderBottom: '1px solid #f3f4f6' }}>{uocData.summary?.pcCount ?? '—'}</td></tr>
                                <tr><td style={{ padding: '7px 12px', color: '#6b7280', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', borderBottom: '1px solid #f3f4f6' }}>Knowledge Evidence</td><td style={{ padding: '7px 12px', color: '#0d2444', fontSize: '13px', borderBottom: '1px solid #f3f4f6' }}>{uocData.summary?.keCount ?? '—'}</td></tr>
                                <tr><td style={{ padding: '7px 12px', color: '#6b7280', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap' }}>Performance Evidence</td><td style={{ padding: '7px 12px', color: '#0d2444', fontSize: '13px' }}>{uocData.summary?.peCount ?? '—'}</td></tr>
                            </tbody>
                        </table>
                        <div style={{ padding: '14px 16px', display: 'flex', gap: '8px' }}>
                            <button
                                onClick={handleAddUnit}
                                disabled={isDuplicate(uocData.unitCode)}
                                style={{ flex: 1, height: '44px', backgroundColor: isDuplicate(uocData.unitCode) ? '#e5e7eb' : '#c9a84c', color: isDuplicate(uocData.unitCode) ? '#9ca3af' : '#0d2444', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: isDuplicate(uocData.unitCode) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                <Plus style={{ width: '16px', height: '16px' }} />
                                {isDuplicate(uocData.unitCode) ? 'Already added' : 'Add to cluster'}
                            </button>
                            <button
                                onClick={() => { setSearchState('idle'); setUocData(null); setUnitCode(''); }}
                                style={{ padding: '0 16px', height: '44px', border: '1px solid #d1d5db', borderRadius: '8px', backgroundColor: 'transparent', color: '#6b7280', fontSize: '13px', cursor: 'pointer' }}
                            >
                                Search again
                            </button>
                        </div>
                    </div>
                )}

                {/* Added units list */}
                {units.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                        <p style={{ color: '#9ca3af', fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>
                            Units in cluster ({units.length})
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {units.map((u, i) => (
                                <div key={u.code} style={{ display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px 16px', backgroundColor: '#f9fafb' }}>
                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#0d2444', color: '#c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, flexShrink: 0 }}>
                                        {i + 1}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ color: '#0d2444', fontSize: '14px', fontWeight: 600 }}>{u.code}</p>
                                        <p style={{ color: '#6b7280', fontSize: '12px' }}>{u.title}</p>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveUnit(u.code)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                        title="Remove from cluster"
                                    >
                                        <X style={{ width: '16px', height: '16px', color: '#9ca3af' }} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Build button */}
                <button
                    onClick={() => onConfirm(units)}
                    disabled={!canBuild}
                    style={{
                        width: '100%', height: '48px',
                        backgroundColor: canBuild ? '#c9a84c' : '#e5e7eb',
                        color: canBuild ? '#0d2444' : '#9ca3af',
                        border: 'none', borderRadius: '8px',
                        fontSize: '15px', fontWeight: 600,
                        cursor: canBuild ? 'pointer' : 'not-allowed',
                    }}
                >
                    {units.length === 0
                        ? 'Add at least one unit to continue'
                        : units.length === 1
                            ? `Build assessment for ${units[0].code} →`
                            : `Build combined assessment for ${units.length} units →`
                    }
                </button>
            </div>
        </div>
    );
}