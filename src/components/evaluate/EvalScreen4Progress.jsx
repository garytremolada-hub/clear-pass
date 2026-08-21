import { AlertCircle } from 'lucide-react';
import EvalProgress from './EvalProgress';

export default function EvalScreen4Progress({ progress, stageLabel, evalError }) {
    if (evalError) {
        return (
            <div className="flex-1 flex flex-col" style={{ backgroundColor: '#ffffff' }}>
                <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 56px', width: '100%' }}>
                    <EvalProgress step={4} />
                    <div style={{ border: '1px solid #ef4444', backgroundColor: '#fef2f2', borderRadius: '8px', padding: '16px', marginTop: '40px', textAlign: 'center' }}>
                        <AlertCircle style={{ color: '#ef4444', width: '24px', height: '24px', margin: '0 auto 10px' }} />
                        <p style={{ color: '#0d2444', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>Evaluation encountered an issue</p>
                        <p style={{ color: '#6b7280', fontSize: '13px' }}>{evalError}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col" style={{ backgroundColor: '#ffffff' }}>
            <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 56px', width: '100%' }}>
                <EvalProgress step={4} />
                <div style={{ paddingTop: '40px' }}>
                    <h2 style={{ color: '#0d2444', fontSize: '20px', fontWeight: 500, marginBottom: '32px', textAlign: 'center' }}>
                        Evaluating your assessment...
                    </h2>
                    <div style={{ width: '100%', height: '8px', borderRadius: '4px', backgroundColor: '#e5e7eb', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${progress}%`, borderRadius: '4px', backgroundColor: '#c9a84c', transition: 'width 0.6s ease' }} />
                    </div>
                    <p style={{ color: '#0d2444', fontSize: '14px', fontWeight: 700, textAlign: 'center', marginTop: '10px' }}>{progress}%</p>
                    <p style={{ color: '#6b7280', fontSize: '13px', fontStyle: 'italic', textAlign: 'center', marginTop: '4px' }}>{stageLabel}</p>
                </div>
            </div>
        </div>
    );
}