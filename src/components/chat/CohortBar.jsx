import { useState } from 'react';
import { useCohort, COHORT_OPTIONS } from '@/lib/CohortContext';
import { Pencil, X, Check } from 'lucide-react';

function InlineSelect({ field, value, onChange }) {
    return (
        <select
            value={value}
            onChange={e => onChange(field, e.target.value)}
            className="text-xs rounded px-1.5 py-0.5 focus:outline-none cursor-pointer"
            style={{
                backgroundColor: 'transparent',
                border: '1px solid #8ba4c4',
                color: '#ffffff',
            }}
        >
            <option value="" disabled>—</option>
            {COHORT_OPTIONS[field].map(opt => (
                <option key={opt.value} value={opt.value} style={{ backgroundColor: '#162d50', color: '#fff' }}>
                    {opt.label}
                </option>
            ))}
        </select>
    );
}

export default function CohortBar() {
    const { profile, saveProfile, getLabel } = useCohort();
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(profile);

    const handleEdit = () => { setDraft(profile); setEditing(true); };
    const handleChange = (field, value) => setDraft(prev => ({ ...prev, [field]: value }));
    const handleSave = () => { saveProfile(draft); setEditing(false); };
    const handleCancel = () => setEditing(false);

    const barStyle = {
        backgroundColor: '#162d50',
        borderBottom: '1px solid #0d2444',
    };

    if (editing) {
        return (
            <div className="px-4 py-2 flex flex-wrap items-center gap-2 text-xs" style={barStyle}>
                <span className="font-medium shrink-0" style={{ color: '#8ba4c4' }}>Cohort:</span>
                <InlineSelect field="institution_type" value={draft.institution_type} onChange={handleChange} />
                <span style={{ color: '#8ba4c4' }}>|</span>
                <InlineSelect field="delivery_mode" value={draft.delivery_mode} onChange={handleChange} />
                <span style={{ color: '#8ba4c4' }}>|</span>
                <InlineSelect field="literacy_level" value={draft.literacy_level} onChange={handleChange} />
                <span style={{ color: '#8ba4c4' }}>|</span>
                <InlineSelect field="language_background" value={draft.language_background} onChange={handleChange} />
                <span style={{ color: '#8ba4c4' }}>|</span>
                <InlineSelect field="age_group" value={draft.age_group} onChange={handleChange} />
                <div className="flex gap-1 ml-auto">
                    <button
                        onClick={handleSave}
                        className="p-1 rounded transition-colors hover:bg-white/10"
                        style={{ color: '#c9a84c' }}
                    >
                        <Check className="h-3 w-3" />
                    </button>
                    <button
                        onClick={handleCancel}
                        className="p-1 rounded transition-colors hover:bg-white/10"
                        style={{ color: '#8ba4c4' }}
                    >
                        <X className="h-3 w-3" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="px-4 py-1.5 flex items-center gap-1.5 text-xs" style={barStyle}>
            <span className="font-medium shrink-0" style={{ color: '#8ba4c4' }}>Cohort:</span>
            <span className="font-medium" style={{ color: '#ffffff' }}>{getLabel('institution_type', profile.institution_type)}</span>
            <span style={{ color: '#8ba4c4' }}>|</span>
            <span style={{ color: '#ffffff' }}>{getLabel('delivery_mode', profile.delivery_mode)}</span>
            <span style={{ color: '#8ba4c4' }}>|</span>
            <span style={{ color: '#ffffff' }}>{getLabel('literacy_level', profile.literacy_level)}</span>
            <span style={{ color: '#8ba4c4' }}>|</span>
            <span style={{ color: '#ffffff' }}>{getLabel('language_background', profile.language_background)}</span>
            <span style={{ color: '#8ba4c4' }}>|</span>
            <span style={{ color: '#ffffff' }}>{getLabel('age_group', profile.age_group)}</span>
            <button
                onClick={handleEdit}
                className="ml-auto p-1 rounded transition-colors hover:bg-white/10"
                title="Edit cohort profile"
                style={{ color: '#c9a84c' }}
            >
                <Pencil className="h-3 w-3" />
            </button>
        </div>
    );
}