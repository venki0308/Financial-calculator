import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Sliders, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { formatINR } from '../utils/calculations';

interface SliderConfig {
    key: string;
    label: string;
    min: number;
    max: number;
    step: number;
    prefix?: string;
    suffix?: string;
    format?: (v: number) => string;
}

interface WhatIfSimulatorProps {
    title?: string;
    sliders: SliderConfig[];
    currentInputs: Record<string, number>;
    calculateResult: (inputs: Record<string, number>) => number;
    resultLabel: string;
    resultPrefix?: string;
}

export default function WhatIfSimulator({ title, sliders, currentInputs, calculateResult, resultLabel, resultPrefix = '₹' }: WhatIfSimulatorProps) {
    const { t } = useTranslation();
    const displayTitle = title || t('whatIf.title');
    const [adjustedInputs, setAdjustedInputs] = useState<Record<string, number>>({ ...currentInputs });

    const currentResult = useMemo(() => calculateResult(currentInputs), [currentInputs, calculateResult]);
    const adjustedResult = useMemo(() => calculateResult(adjustedInputs), [adjustedInputs, calculateResult]);
    const diff = adjustedResult - currentResult;
    const pctChange = currentResult > 0 ? ((diff / currentResult) * 100) : 0;

    const handleSliderChange = useCallback((key: string, val: number) => {
        setAdjustedInputs(prev => ({ ...prev, [key]: val }));
    }, []);

    const hasChanges = useMemo(() => {
        return sliders.some(s => adjustedInputs[s.key] !== currentInputs[s.key]);
    }, [adjustedInputs, currentInputs, sliders]);

    return (
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-4">
                <Sliders size={16} className="text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-slate-900 dark:text-foreground font-bold text-sm">{displayTitle}</h3>
            </div>

            {/* Sliders */}
            <div className="space-y-4 mb-4">
                {sliders.map((slider) => {
                    const currentVal = currentInputs[slider.key] || 0;
                    const adjVal = adjustedInputs[slider.key] || currentVal;
                    const changed = adjVal !== currentVal;
                    const formatFn = slider.format || ((v: number) => v >= 1000 ? formatINR(v) : `${slider.prefix || ''}${v}${slider.suffix || ''}`);

                    return (
                        <div key={slider.key}>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-muted-foreground text-xs font-medium">{slider.label}</span>
                                <div className="flex items-center gap-2">
                                    {changed && (
                                        <span className="text-slate-400 dark:text-muted-foreground text-[10px] line-through">{formatFn(currentVal)}</span>
                                    )}
                                    <span className={`text-xs font-bold ${changed ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-foreground'}`}>
                                        {formatFn(adjVal)}
                                    </span>
                                </div>
                            </div>
                            <input
                                type="range"
                                min={slider.min}
                                max={slider.max}
                                step={slider.step}
                                value={adjVal}
                                onChange={(e) => handleSliderChange(slider.key, Number(e.target.value))}
                                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                                style={{
                                    background: `linear-gradient(to right, #6366F1 ${((adjVal - slider.min) / (slider.max - slider.min)) * 100}%, #475569 ${((adjVal - slider.min) / (slider.max - slider.min)) * 100}%)`,
                                }}
                            />
                            <div className="flex justify-between mt-0.5">
                                <span className="text-[9px] text-slate-500 dark:text-slate-400">{formatFn(slider.min)}</span>
                                <span className="text-[9px] text-slate-500 dark:text-slate-400">{formatFn(slider.max)}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Result comparison */}
            {hasChanges && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-600 shadow-sm dark:shadow-none">
                    <p className="text-slate-500 dark:text-slate-400 text-[9px] uppercase font-bold tracking-wider mb-2">{resultLabel}</p>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-400 dark:text-slate-500 text-sm line-through">{resultPrefix}{currentResult >= 1000 ? formatINR(currentResult) : currentResult.toLocaleString('en-IN')}</span>
                        <ArrowRight size={14} className="text-slate-400 dark:text-slate-500" />
                        <span className="text-slate-900 dark:text-foreground font-bold text-lg">{resultPrefix}{adjustedResult >= 1000 ? formatINR(adjustedResult) : adjustedResult.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                        {diff > 0 ? (
                            <TrendingUp size={14} className="text-brand-green" />
                        ) : (
                            <TrendingDown size={14} className="text-red-400" />
                        )}
                        <span className={`text-xs font-bold ${diff > 0 ? 'text-brand-green' : 'text-red-400'}`}>
                            {diff > 0 ? '+' : ''}{diff >= 1000 ? formatINR(Math.abs(diff)) : diff.toLocaleString('en-IN')}
                            <span className="text-slate-500 dark:text-slate-400 font-normal ml-1">({pctChange > 0 ? '+' : ''}{pctChange.toFixed(1)}%)</span>
                        </span>
                    </div>
                </motion.div>
            )}

            {!hasChanges && (
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-600 text-center shadow-sm dark:shadow-none">
                    <p className="text-slate-600 dark:text-slate-300 text-xs font-medium">{t('whatIf.adjustPrompt')}</p>
                </div>
            )}
        </div>
    );
}
