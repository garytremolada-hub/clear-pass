import { createContext, useContext, useState } from 'react';

const STORAGE_KEY = 'fk_cohort_profile';

export const COHORT_OPTIONS = {
    institution_type: [
        { value: 'rto_vet', label: 'RTO/VET' },
        { value: 'tafe', label: 'TAFE' },
        { value: 'university', label: 'University' },
        { value: 'school', label: 'School' },
    ],
    delivery_mode: [
        { value: 'workplace', label: 'Workplace' },
        { value: 'classroom', label: 'Classroom' },
        { value: 'online', label: 'Online' },
        { value: 'blended', label: 'Blended' },
        { value: 'lecture_tutorial', label: 'Lecture/Tutorial' },
    ],
    literacy_level: [
        { value: 'foundation', label: 'Foundation' },
        { value: 'standard', label: 'Standard' },
        { value: 'advanced', label: 'Advanced' },
        { value: 'academic', label: 'Academic' },
    ],
    language_background: [
        { value: 'english_first', label: 'English first language' },
        { value: 'english_additional', label: 'English additional language' },
        { value: 'mixed', label: 'Mixed' },
    ],
    age_group: [
        { value: 'school_based', label: 'School-based' },
        { value: 'adult_learners', label: 'Adult learners' },
        { value: 'apprentices_trainees', label: 'Apprentices/Trainees' },
        { value: 'undergraduate', label: 'Undergraduate students' },
        { value: 'postgraduate', label: 'Postgraduate students' },
    ],
};

export const DEFAULT_PROFILE = {
    institution_type: '',
    delivery_mode: '',
    literacy_level: '',
    language_background: '',
    age_group: '',
};

const CohortContext = createContext(null);

export function CohortProvider({ children }) {
    const [profile, setProfile] = useState(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? { ...DEFAULT_PROFILE, ...JSON.parse(stored) } : DEFAULT_PROFILE;
        } catch {
            return DEFAULT_PROFILE;
        }
    });

    const [onboardingDone, setOnboardingDone] = useState(() => {
        try {
            return !!localStorage.getItem(STORAGE_KEY);
        } catch {
            return false;
        }
    });

    const saveProfile = (newProfile) => {
        setProfile(newProfile);
        setOnboardingDone(true);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
    };

    const getLabel = (field, value) => {
        const opt = COHORT_OPTIONS[field]?.find(o => o.value === value);
        return opt?.label || value;
    };

    const buildCohortMessage = (p = profile) => {
        const inst = getLabel('institution_type', p.institution_type);
        const mode = getLabel('delivery_mode', p.delivery_mode);
        const lit = getLabel('literacy_level', p.literacy_level);
        const lang = getLabel('language_background', p.language_background);
        const age = getLabel('age_group', p.age_group);
        return `Cohort profile: Institution: ${inst}, 1. ${mode}, 2. ${lit}, 3. ${lang}, 4. ${age}`;
    };

    return (
        <CohortContext.Provider value={{ profile, onboardingDone, saveProfile, getLabel, buildCohortMessage }}>
            {children}
        </CohortContext.Provider>
    );
}

export function useCohort() {
    return useContext(CohortContext);
}