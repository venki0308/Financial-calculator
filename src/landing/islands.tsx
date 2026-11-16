/**
 * The interactive parts of the website ("islands"). The page is pre-rendered
 * to static HTML; only these four are hydrated in the browser, so the rest of
 * the page ships no JavaScript. Server and browser render the same tree.
 */
import type { ReactNode } from 'react';
import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion';
import { HeaderControls } from './HeaderControls';
import { HeroResult, MiniCalc } from './MiniCalc';
import { ToolGrid } from './ToolGrid';
import type { GridTool } from './ToolGrid';

export interface IslandProps {
    tools: GridTool[];
}

/** Motion follows the visitor's reduced-motion setting. */
export function Shell({ children }: { children: ReactNode }) {
    return (
        <LazyMotion features={domAnimation} strict>
            <MotionConfig reducedMotion="user">{children}</MotionConfig>
        </LazyMotion>
    );
}

export const ISLANDS = {
    header: () => <HeaderControls />,
    hero: () => <HeroResult />,
    calc: () => <MiniCalc />,
    tools: (p: IslandProps) => <ToolGrid tools={p.tools} />,
} as const;

export type IslandName = keyof typeof ISLANDS;

/** Server side: the island's markup inside its hydration root. */
export function Island({ name, props, className }: { name: IslandName; props: IslandProps; className?: string }) {
    return <div data-island={name} className={className}><Shell>{ISLANDS[name](props)}</Shell></div>;
}
