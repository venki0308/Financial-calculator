import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getCibilProfile, saveCibilProfile, getSuggestedRate, getProfileTier, getCibilColor, type CibilProfile, type CibilTier } from '../utils/cibilProfile';

interface CibilCtx {
    profile: CibilProfile | null;
    hasProfile: boolean;
    tier: CibilTier;
    color: string;
    rateFor: (loanType: string) => { min: number; max: number; suggested: number };
    save: (p: CibilProfile) => void;
    refresh: () => void;
}

const Ctx = createContext<CibilCtx>({
    profile: null, hasProfile: false, tier: 'nh', color: '#94a3b8',
    rateFor: () => ({ min: 12, max: 18, suggested: 15 }),
    save: () => {}, refresh: () => {},
});

export function CibilProvider({ children }: { children: ReactNode }) {
    const [profile, setProfile] = useState<CibilProfile | null>(null);

    useEffect(() => { setProfile(getCibilProfile()); }, []);

    const tier = getProfileTier(profile?.score ?? null, profile?.isNTC ?? false);
    const color = getCibilColor(profile?.score ?? null, profile?.isNTC ?? false);

    const rateFor = (loanType: string) => getSuggestedRate(
        loanType, profile?.score ?? null, profile?.isNTC ?? false,
        profile?.employmentType ?? null, profile?.gender ?? null,
    );

    const save = (p: CibilProfile) => { saveCibilProfile(p); setProfile(p); };
    const refresh = () => { setProfile(getCibilProfile()); };

    return (
        <Ctx.Provider value={{ profile, hasProfile: !!profile, tier, color, rateFor, save, refresh }}>
            {children}
        </Ctx.Provider>
    );
}

export const useCibil = () => useContext(Ctx);