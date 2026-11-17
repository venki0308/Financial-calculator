/**
 * Calculator components by key, for server rendering: the 9 batch-1 calculators in calcs/all.tsx
 * plus one file per calculator in calcs/c/<key>.tsx (generated index). The browser loads them
 * through generated-client.ts instead (one chunk per calculator).
 */
import type { ComponentType } from 'react';
import { CALCS } from './all';
import { CALC_COMPONENTS } from '../generated';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getCalc(key: string): ComponentType<any> | null {
    return (CALCS as Record<string, ComponentType<unknown>>)[key] ?? CALC_COMPONENTS[key] ?? null;
}
export const hasCalc = (key: string) => getCalc(key) !== null;
