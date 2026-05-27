import { useState } from 'react';
import { useCohort, COHORT_OPTIONS, DEFAULT_PROFILE } from '@/lib/CohortContext';
import { Button } from '@/components/ui/button';
import { Pencil, X, Check } from 'lucide-react';

function InlineSelect({ field, value, onChange }) {
    return (
        <select
            value={value}
            onChange={e => onChange(field, e.target.value)}
            className="text-xs bg-transparent border border-border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
        >
            <option value="" disabled>—</option>
            {COHORT_OPTIONS[field].map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    );
}

export default function CohortBar() {
    const { profile, saveProfile, getLabel } = useCohort();
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(profile);

    const handleEdit = () => {
        setDraft(profile);
        setEditing(true);
    };

    const handleChange = (field, value) => {
        setDraft(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        saveProfile(draft);
        setEditing(false);
    };

    const handleCancel = () => {
        setEditing(false);
    };

    if (editing) {
        return (
            <div className="border-b bg-muted/40 px-4 py-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-medium text-foreground/70 shrink-0">Cohort:</span>
                <InlineSelect field="institution_type" value={draft.institution_type} onChange={handleChange} />
                <span className="text-muted-foreground">|</span>
                <InlineSelect field="delivery_mode" value={draft.delivery_mode} onChange={handleChange} />
                <span className="text-muted-foreground">|</span>
                <InlineSelect field="literacy_level" value={draft.literacy_level} onChange={handleChange} />
                <span className="text-muted-foreground">|</span>
                <InlineSelect field="language_background" value={draft.language_background} onChange={handleChange} />
                <span className="text-muted-foreground">|</span>
                <InlineSelect field="age_group" value={draft.age_group} onChange={handleChange} />
                <div className="flex gap-1 ml-auto">
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSave}><Check className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCancel}><X className="h-3 w-3" /></Button>
                </div>
            </div>
        );
    }

    return (
        <div className="border-b bg-muted/30 px-4 py-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/60 shrink-0">Cohort:</span>
            <span className="font-medium text-foreground/80">{getLabel('institution_type', profile.institution_type)}</span>
            <span>|</span>
            <span>{getLabel('delivery_mode', profile.delivery_mode)}</span>
            <span>|</span>
            <span>{getLabel('literacy_level', profile.literacy_level)}</span>
            <span>|</span>
            <span>{getLabel('language_background', profile.language_background)}</span>
            <span>|</span>
            <span>{getLabel('age_group', profile.age_group)}</span>
            <button
                onClick={handleEdit}
                className="ml-auto p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title="Edit cohort profile"
            >
                <Pencil className="h-3 w-3" />
            </button>
        </div>
    );
}