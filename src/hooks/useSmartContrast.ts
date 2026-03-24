import { useEffect, useRef } from 'react';

// Global toggle for safe mode
export const enableSmartContrast = true;

// Utility functions for colors
function parseRGB(color: string): { r: number, g: number, b: number, a: number } | null {
    if (color === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
    const match = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
    if (!match) return null;
    return {
        r: parseInt(match[1], 10),
        g: parseInt(match[2], 10),
        b: parseInt(match[3], 10),
        a: match[4] !== undefined ? parseFloat(match[4]) : 1
    };
}

function calculateLuminance(r: number, g: number, b: number): number {
    const a = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrastRatio(l1: number, l2: number): number {
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
}

function hexToRgb(hex: string) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) hex = hex.split('').map(char => char + char).join('');
    const num = parseInt(hex, 16);
    return { r: num >> 16, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
    return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1).toUpperCase();
}

function adjustBrightness(r: number, g: number, b: number, amount: number): { r: number, g: number, b: number } {
    return {
        r: Math.min(255, Math.max(0, r + amount)),
        g: Math.min(255, Math.max(0, g + amount)),
        b: Math.min(255, Math.max(0, b + amount))
    };
}

// Parses gradients simply by finding the first color stop
function parseGradientMidpoint(bgImage: string): { r: number, g: number, b: number, a: number } | null {
    if (!bgImage.includes('gradient')) return null;
    // VERY simplified parsing for performance: just grab the first rgb/rgba/hex we see.
    const rgbaMatch = bgImage.match(/rgba?\([\d,\s.]+\)/);
    if (rgbaMatch) return parseRGB(rgbaMatch[0]);
    const hexMatch = bgImage.match(/#[0-9a-fA-F]{3,6}/);
    if (hexMatch) {
       const rgb = hexToRgb(hexMatch[0]);
       return { ...rgb, a: 1 };
    }
    return null;
}

function getComputedBackgroundColor(el: Element): { r: number, g: number, b: number, a: number } {
    let current: Element | null = el;
    let fallback = { r: 255, g: 255, b: 255, a: 1 }; // Default white

    while (current) {
        const style = window.getComputedStyle(current);
        const bgImg = style.backgroundImage;
        
        let colorObj = null;

        if (bgImg && bgImg !== 'none') {
            colorObj = parseGradientMidpoint(bgImg);
        }

        if (!colorObj) {
            colorObj = parseRGB(style.backgroundColor);
        }

        if (colorObj) {
            // If it's fully opaque or we reached body
            if (colorObj.a === 1) {
                return colorObj;
            }
            // Simple alpha blending over white if we don't traverse further
            if (colorObj.a > 0 && colorObj.a < 1) {
                // Approximate blending with white
                const a = colorObj.a;
                return {
                    r: Math.round(colorObj.r * a + 255 * (1 - a)),
                    g: Math.round(colorObj.g * a + 255 * (1 - a)),
                    b: Math.round(colorObj.b * a + 255 * (1 - a)),
                    a: 1
                };
            }
        }
        current = current.parentElement;
    }
    return fallback;
}


// TARGETED SELECTORS (To restrict DOM spanning)
const TARGET_SELECTORS = [
    '.card', '.text', '.result', '.table', '.insight', '.input', '.label',
    // also include generic text tags if they have specific roles (but we'll stick to classes broadly requested and some standard tags)
    'p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'button', 'td', 'th', 'label', 'input'
].join(', ');

const IGNORE_SELECTORS = ['svg', 'path', '[hidden]', '.hidden'];


export function useSmartContrast() {
    const bgCache = useRef(new WeakMap<Element, { r: number, g: number, b: number, a: number }>());
    const resultCache = useRef(new WeakMap<Element, boolean>());

    useEffect(() => {
        if (!enableSmartContrast) return;

        let debounceTimer: ReturnType<typeof setTimeout>;

        const processElements = (elements: Element[]) => {
            const run = () => {
                elements.forEach((el) => {
                    const htmlEl = el as HTMLElement;
                    
                    // Skip hidden elements, SVGs, or already processed
                    if (!htmlEl.offsetParent && htmlEl.tagName !== 'INPUT') return; // checking visibility
                    if (resultCache.current.has(htmlEl)) return;
                    if (htmlEl.tagName.toLowerCase() === 'svg' || htmlEl.tagName.toLowerCase() === 'path') return;
                    
                    // Don't modify if it's explicitly asking not to
                    if (htmlEl.dataset.noContrast === 'true') return;

                    // 1. Get computed text color
                    const style = window.getComputedStyle(htmlEl);
                    const textColorStr = style.color;
                    const textRgb = parseRGB(textColorStr);
                    if (!textRgb || textRgb.a === 0) return;

                    // 2. Get background color
                    let bgRgb = bgCache.current.get(htmlEl);
                    if (!bgRgb) {
                        bgRgb = getComputedBackgroundColor(htmlEl);
                        bgCache.current.set(htmlEl, bgRgb);
                    }

                    // 3. Calc luminance & contrast
                    const bgLum = calculateLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
                    const textLum = calculateLuminance(textRgb.r, textRgb.g, textRgb.b);
                    const contrast = getContrastRatio(bgLum, textLum);

                    if (contrast >= 4.5) {
                        resultCache.current.set(htmlEl, true);
                        return; // DO NOTHING
                    }

                    // Contrast fails. Step 1: Adjust brightness
                    const bgIsDark = bgLum < 0.5;
                    // If bg is dark, we need lighter text (+). If bg is light, darker text (-).
                    const adjustment = bgIsDark ? 40 : -40; // ~15-20% of 255
                    
                    const adjusted = adjustBrightness(textRgb.r, textRgb.g, textRgb.b, adjustment);
                    const adjLum = calculateLuminance(adjusted.r, adjusted.g, adjusted.b);
                    const newContrast = getContrastRatio(bgLum, adjLum);

                    if (newContrast >= 4.5) {
                        htmlEl.style.color = rgbToHex(adjusted.r, adjusted.g, adjusted.b);
                        resultCache.current.set(htmlEl, true);
                        return;
                    }

                    // Step 3: Fallback override
                    htmlEl.style.color = bgIsDark ? '#FFFFFF' : '#111827';
                    
                    // Step 4 (Optional Edge Case Fallback): if still failing terribly, outline/shadow
                    // Check if absolute white/black somehow fails (e.g., bg is exactly 50% gray, though normally #000 or #FFF achieves >4.5 on 50% gray)
                    const fallbackLum = bgIsDark ? 1 : 0.005; // appx lum of white / dark gray
                    const ultimateContrast = getContrastRatio(bgLum, fallbackLum);
                    
                    if (ultimateContrast < 3.0) {
                        // Apply subtle text shadow for legibility
                        htmlEl.style.textShadow = bgIsDark 
                            ? '0 1px 2px rgba(0,0,0,0.8)' 
                            : '0 1px 2px rgba(255,255,255,0.8)';
                    }

                    resultCache.current.set(htmlEl, true);
                });
            };

            if ('requestIdleCallback' in window) {
                (window as any).requestIdleCallback(run, { timeout: 1000 });
            } else {
                setTimeout(run, 0);
            }
        };

        const gatherAndProcess = (root: ParentNode = document) => {
            const els = Array.from(root.querySelectorAll(TARGET_SELECTORS)).filter(el => {
                for (const ignore of IGNORE_SELECTORS) {
                    if (el.matches(ignore) || el.closest(ignore)) return false;
                }
                return true;
            });
            processElements(els);
        };

        const observer = new MutationObserver((mutations) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const newNodes: Element[] = [];
                mutations.forEach(m => {
                    m.addedNodes.forEach(n => {
                        if (n.nodeType === Node.ELEMENT_NODE) {
                            const el = n as Element;
                            if (el.matches && el.matches(TARGET_SELECTORS)) {
                                newNodes.push(el);
                            }
                            if (el.querySelectorAll) {
                                newNodes.push(...Array.from(el.querySelectorAll(TARGET_SELECTORS)));
                            }
                        }
                    });
                });
                
                // Filter out ignores
                const validNodes = newNodes.filter(el => {
                    for (const ignore of IGNORE_SELECTORS) {
                        if (el.matches(ignore) || el.closest(ignore)) return false;
                    }
                    return true;
                });

                if (validNodes.length > 0) {
                    processElements(validNodes);
                }
            }, 200);
        });

        // Run initially
        gatherAndProcess();

        // Observe document changes
        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        // Run on theme changes (listen to class changes on documentElement)
        const themeObserver = new MutationObserver((mutations) => {
            let themeChanged = false;
            mutations.forEach(m => {
                if (m.attributeName === 'class') themeChanged = true;
            });
            if (themeChanged) {
                // Clear cache on theme change
                bgCache.current = new WeakMap();
                resultCache.current = new WeakMap();
                gatherAndProcess();
            }
        });

        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        return () => {
            clearTimeout(debounceTimer);
            observer.disconnect();
            themeObserver.disconnect();
        };
    }, []);
}
