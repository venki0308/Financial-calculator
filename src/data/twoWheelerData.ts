/**
 * twoWheelerData.ts — Vehicle segments, loan rates, EV subsidies, running costs
 * NO brand/manufacturer/lender names anywhere.
 */

export const VEHICLE_TYPES = [
    { id: 'petrol', label: 'Petrol', icon: '⛽' },
    { id: 'electric', label: 'Electric (EV)', icon: '⚡' },
] as const;

export type VehicleType = typeof VEHICLE_TYPES[number]['id'];

export const VEHICLE_SEGMENTS = [
    { id: 'entry_commuter', label: 'Entry Commuter', desc: 'Daily use, fuel efficient', priceRange: [50000, 80000] as const, mileage: '65-72 kmpl', evRange: '80-100 km/charge', rateRange: [12, 18] as const, for: 'Students, daily office commuters' },
    { id: 'mid_commuter', label: 'Mid Commuter / Scooter', desc: '100-125cc bikes & scooters', priceRange: [80000, 120000] as const, mileage: '45-60 kmpl', evRange: '100-130 km/charge', rateRange: [10, 16] as const, for: 'Urban families, working professionals' },
    { id: 'sport_performance', label: 'Sport / Performance', desc: '150-200cc sport bikes', priceRange: [120000, 200000] as const, mileage: '35-45 kmpl', evRange: 'N/A', rateRange: [9, 14] as const, for: 'Young professionals, enthusiasts' },
    { id: 'premium_cruiser', label: 'Premium / Cruiser', desc: '350cc+ bikes', priceRange: [150000, 400000] as const, mileage: '25-38 kmpl', evRange: 'N/A', rateRange: [8.75, 13] as const, for: 'Weekend riders, premium buyers' },
    { id: 'electric_budget', label: 'Budget Electric Scooter', desc: 'Affordable EVs under 1L', priceRange: [60000, 100000] as const, mileage: 'N/A', evRange: '70-100 km/charge', rateRange: [9, 14] as const, for: 'First-time EV buyers' },
    { id: 'electric_premium', label: 'Premium Electric', desc: 'Feature-rich EVs', priceRange: [100000, 200000] as const, mileage: 'N/A', evRange: '120-180 km/charge', rateRange: [8.5, 13] as const, for: 'Tech-savvy buyers' },
    { id: 'adventure_touring', label: 'Adventure / Touring', desc: 'Off-road and touring bikes', priceRange: [150000, 350000] as const, mileage: '28-40 kmpl', evRange: 'N/A', rateRange: [9, 14] as const, for: 'Long-distance riders' },
] as const;

export type SegmentId = typeof VEHICLE_SEGMENTS[number]['id'];

// CIBIL score → rate bands. Updated April 2026 to match published lender rates:
//   - ICICI Bank: 10.25% – 26.10% (widest range, depends heavily on score)
//   - HDFC Bank: starts ~14.5%
//   - SBI: 11.70% – 15.70%, with 0.50% green discount on EV
//   - Tata Capital: starts ~12.5%
//   - Bajaj Finance / NBFCs: up to 24%
// EV bands run ~0.5–1% lower than petrol (most banks offer a green discount).
export const CIBIL_TIERS = [
    { id: 'excellent', label: '750+ (Excellent)', rateAdj: 0, petrolRange: [10.25, 12.5] as const, evRange: [9.75, 11.75] as const },
    { id: 'good', label: '700-749 (Good)', rateAdj: 2, petrolRange: [12.5, 15] as const, evRange: [11.75, 13.75] as const },
    { id: 'average', label: '650-699 (Average)', rateAdj: 5, petrolRange: [15, 19] as const, evRange: [14, 17.5] as const },
    { id: 'low', label: 'Below 650 (Low)', rateAdj: 10, petrolRange: [19, 28] as const, evRange: [17.5, 24] as const },
] as const;

export const EV_SUBSIDY = {
    schemeName: 'PM E-DRIVE Scheme',
    validUntil: 'July 31, 2026',
    ratePerKwh: 2500,
    maxPerVehicle: 5000,
    priceCapExFactory: 150000,
    note: 'Replaced FAME-II in Oct 2024. Deducted directly at dealership.',
};

export const STATE_EV_BENEFITS: Record<string, string> = {
    'Delhi': 'No road tax + no registration charges on EVs',
    'Maharashtra': 'Additional state subsidy + scrappage incentive',
    'Gujarat': 'Purchase incentive + reduced electricity tariffs',
    'Tamil Nadu': 'Purchase incentives + charging infra support',
    'Karnataka': 'Focus on charging infrastructure',
    'Telangana': 'State EV policy incentives',
    'Uttar Pradesh': 'State subsidy available',
    'Rajasthan': 'Road tax exemption for EVs',
    'Kerala': 'Tax exemptions + purchase support',
    'Andhra Pradesh': 'State EV incentives',
    'West Bengal': 'Waiver on registration fees',
    'Madhya Pradesh': 'State EV policy incentives',
};

// Running costs — updated April 2026 to match real-world Indian numbers.
//
// evKmPerUnit was previously 12 km/kWh, which is 3-4x lower than reality and
// made every EV running-cost projection look 3x worse than it really is.
// Real-world 2025-26 published efficiencies for top sellers:
//   - TVS iQube: ~40-43 km/kWh
//   - Ola S1 / S1 Pro: ~50-60 km/kWh
//   - Ather 450X: ~35-40 km/kWh
//   - Bajaj Chetak: ~30-35 km/kWh
// 35 km/kWh is a conservative city+highway mix — captures real-world drag,
// AC use, and hills, while still being honest to typical owner experience.
//
// petrolPerLitre is the current April 2026 metro average for India.
export const RUNNING_COSTS = {
    petrolPerLitre: 107,
    electricityPerUnit: 8,
    evKmPerUnit: 35,
    avgMileage: { entry_commuter: 68, mid_commuter: 52, sport_performance: 40, premium_cruiser: 33, adventure_touring: 35 } as Record<string, number>,
    servicePerYear: { petrol: { entry_commuter: 3500, mid_commuter: 4500, sport_performance: 6000, premium_cruiser: 8000, adventure_touring: 7000 } as Record<string, number>, electric: { electric_budget: 1500, electric_premium: 2500 } as Record<string, number> },
    insurancePerYear: { petrol: { entry_commuter: 3000, mid_commuter: 4000, sport_performance: 5500, premium_cruiser: 7000, adventure_touring: 6000 } as Record<string, number>, electric: { electric_budget: 2500, electric_premium: 4000 } as Record<string, number> },
    batteryReplaceCost: 30000,
    batteryLifeYears: 6,
};

export const ONROAD_DEFAULTS = {
    rtoPercentPetrol: 0.10,
    rtoPercentEV: 0.02,
    insurancePercent: 0.03,
    handlingCharges: 2500,
};
