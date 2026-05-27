import { useState } from 'react';
import { COHORT_OPTIONS, DEFAULT_PROFILE } from '@/lib/CohortContext';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';

function SelectField({ label, field, value, onChange }) {
    const options = COHORT_OPTIONS[field];
    return (
        <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{label}</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {options.map(opt => (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange(field, opt.value)}
                        className={`px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                            value === opt.value
                                ? 'border-primary bg-primary/10 text-primary font-medium'
                                : 'border-border hover:border-primary/50 hover:bg-muted/60 text-muted-foreground'
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default function CohortOnboarding({ onComplete }) {
    const [profile, setProfile] = useState(DEFAULT_PROFILE);

    const handleChange = (field, value) => {
        setProfile(prev => ({ ...prev, [field]: value }));
    };

    const isComplete = Object.values(profile).every(v => v !== '');

    return (
        <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
            <div className="w-full max-w-xl bg-card border rounded-2xl shadow-sm p-6 space-y-6">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold">Set up your cohort profile</h2>
                        <p className="text-sm text-muted-foreground">This helps calibrate AQF benchmarks and readability targets for your learners.</p>
                    </div>
                </div>

                <SelectField
                    label="Institution type"
                    field="institution_type"
                    value={profile.institution_type}
                    onChange={handleChange}
                />
                <SelectField
                    label="Delivery mode"
                    field="delivery_mode"
                    value={profile.delivery_mode}
                    onChange={handleChange}
                />
                <SelectField
                    label="Literacy level"
                    field="literacy_level"
                    value={profile.literacy_level}
                    onChange={handleChange}
                />
                <SelectField
                    label="Language background"
                    field="language_background"
                    value={profile.language_background}
                    onChange={handleChange}
                />
                <SelectField
                    label="Age group"
                    field="age_group"
                    value={profile.age_group}
                    onChange={handleChange}
                />

                <Button
                    className="w-full"
                    disabled={!isComplete}
                    onClick={() => onComplete(profile)}
                >
                    Start session
                </Button>
                {!isComplete && (
                    <p className="text-xs text-muted-foreground text-center">Please select all options to continue.</p>
                )}
            </div>
        </div>
    );
}