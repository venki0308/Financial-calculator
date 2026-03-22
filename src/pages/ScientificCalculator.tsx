import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Delete, RotateCcw, Clock, Copy, Check, ChevronDown } from 'lucide-react';
import { AnalyticsService } from '../lib/analytics';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import { AnimatePresence, motion } from 'framer-motion';

type CalcMode = 'normal' | 'scientific' | 'programming';
type WordSize = 8 | 16 | 32 | 64;

interface HistoryItem {
    expression: string;
    result: string;
    ts: number;
}

function clampToWordSize(n: number, bits: WordSize): number {
    const big = BigInt(Math.trunc(n));
    const mask = (BigInt(1) << BigInt(bits)) - BigInt(1);
    return Number(big & mask);
}

function toBase(value: number, base: 2 | 8 | 10 | 16, bits: WordSize): string {
    const clamped = clampToWordSize(value, bits);
    if (base === 16) return clamped.toString(16).toUpperCase();
    if (base === 8) return clamped.toString(8);
    if (base === 2) {
        const s = clamped.toString(2);
        // group nibbles
        return s.padStart(Math.ceil(s.length / 4) * 4, '0').replace(/(.{4})/g, '$1 ').trim();
    }
    return clamped.toString(10);
}

export default function ScientificCalculator() {
    useTrackCalculator();
    const { t } = useTranslation();

    const [calcMode, setCalcMode] = useState<CalcMode>('scientific');
    const [expression, setExpression] = useState('');
    const [result, setResult] = useState('');
    const [isDeg, setIsDeg] = useState(true);
    const [isInverse, setIsInverse] = useState(false);
    const [isHyp, setIsHyp] = useState(false);
    const [memory, setMemory] = useState(0);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [copied, setCopied] = useState('');

    // Programming mode state
    const [progBase, setProgBase] = useState<2 | 8 | 10 | 16>(10);
    const [wordSize, setWordSize] = useState<WordSize>(32);
    const [progInput, setProgInput] = useState('0');

    const displayRef = useRef<HTMLDivElement>(null);

    useEffect(() => { AnalyticsService.trackScreen('Scientific Calculator'); }, []);

    useEffect(() => {
        if (displayRef.current) {
            displayRef.current.scrollLeft = displayRef.current.scrollWidth;
        }
    }, [expression, result]);

    const copyText = (text: string, key: string) => {
        navigator.clipboard.writeText(text).catch(() => {});
        setCopied(key);
        setTimeout(() => setCopied(''), 1500);
    };

    // ─── Scientific / Normal calculation engine ─────────────────────────────
    const factorial = (n: number): number => {
        if (n < 0) return NaN;
        if (n === 0 || n === 1) return 1;
        let res = 1;
        for (let i = 2; i <= n; i++) res *= i;
        return res;
    };

    const evaluateExpression = (expr: string): string => {
        try {
            let parsed = expr
                .replace(/×/g, '*').replace(/÷/g, '/')
                .replace(/π/g, 'Math.PI').replace(/\^/g, '**')
                .replace(/mod/g, '%');

            parsed = parsed.replace(/pi/g, 'Math.PI');

            const trigPrefix = isInverse ? 'a' : '';
            const hypSuffix = isHyp ? 'h' : '';
            const trigReplace = (func: string) => {
                const mathFunc = `Math.${trigPrefix}${func}${hypSuffix}`;
                if (isDeg && !isInverse && !isHyp) {
                    parsed = parsed.replace(new RegExp(`${func}\\(`, 'g'), `${mathFunc}((Math.PI/180)*`);
                } else if (isDeg && isInverse && !isHyp) {
                    parsed = parsed.replace(new RegExp(`${trigPrefix}${func}\\(`, 'g'), `(180/Math.PI)*${mathFunc}(`);
                } else {
                    parsed = parsed.replace(new RegExp(`${func}\\(`, 'g'), `${mathFunc}(`);
                }
            };
            trigReplace('sin'); trigReplace('cos'); trigReplace('tan');

            parsed = parsed
                .replace(/log\(/g, 'Math.log10(').replace(/log2\(/g, 'Math.log2(')
                .replace(/ln\(/g, 'Math.log(').replace(/sqrt\(/g, 'Math.sqrt(')
                .replace(/cbrt\(/g, 'Math.cbrt(').replace(/abs\(/g, 'Math.abs(')
                .replace(/EXP\(/g, 'Math.exp(');

            parsed = parsed.replace(/(\d+(?:\.\d+)?)!/g, (_, num) => `factorial(${num})`);

            const nthRoot = (val: number, root: number) => {
                if (val < 0 && root % 2 === 0) return NaN;
                return Math.sign(val) * Math.pow(Math.abs(val), 1 / root);
            };

            const calculate = new Function('Math', 'factorial', 'nthRoot', `return ${parsed}`);
            let res = calculate(Math, factorial, nthRoot);
            if (!isFinite(res) || isNaN(res)) return 'Error';
            res = Math.round(res * 1e10) / 1e10;
            return res.toString();
        } catch {
            return 'Error';
        }
    };

    const handleInput = (val: string) => {
        if (result && !['+', '-', '*', '/', '^', '%'].includes(val)) {
            setExpression(val); setResult('');
        } else if (result) {
            setExpression(result + val); setResult('');
        } else {
            setExpression(prev => prev + val);
        }
    };

    const handleCalculate = () => {
        if (!expression) return;
        const res = evaluateExpression(expression);
        setResult(res);
        if (res !== 'Error') {
            setHistory(h => [{ expression, result: res, ts: Date.now() }, ...h].slice(0, 10));
            AnalyticsService.trackCalculatorUsed('Scientific', {});
        }
    };

    const handleClear = () => { setExpression(''); setResult(''); };
    const handleBackspace = () => {
        if (result) { setExpression(result); setResult(''); }
        else setExpression(prev => prev.slice(0, -1));
    };
    const handleSignToggle = () => {
        if (result) { const v = parseFloat(result); if (!isNaN(v)) { setResult((-v).toString()); setExpression((-v).toString()); } }
        else if (expression) {
            if (expression.startsWith('-(') && expression.endsWith(')')) setExpression(expression.slice(2, -1));
            else setExpression(`-(${expression})`);
        }
    };
    const handleMemory = (action: string) => {
        const cv = result ? parseFloat(result) : Number(evaluateExpression(expression));
        const val = isNaN(cv) ? 0 : cv;
        if (action === 'M+') setMemory(p => p + val);
        else if (action === 'M-') setMemory(p => p - val);
        else if (action === 'MR') handleInput(memory.toString());
        else if (action === 'MC') setMemory(0);
    };

    // ─── Programming mode ───────────────────────────────────────────────────
    const progValue = (() => {
        try {
            if (progBase === 16) return parseInt(progInput.replace(/\s/g, ''), 16);
            if (progBase === 8) return parseInt(progInput.replace(/\s/g, ''), 8);
            if (progBase === 2) return parseInt(progInput.replace(/\s/g, ''), 2);
            return parseInt(progInput, 10);
        } catch { return 0; }
    })();

    const handleProgInput = (digit: string) => {
        setProgInput(prev => {
            const clean = prev === '0' ? digit : prev + digit;
            return clean;
        });
    };
    const handleProgOp = (op: string) => {
        const a = progValue;
        if (op === 'NOT') {
            const res = clampToWordSize(~a, wordSize);
            setProgInput(res.toString(progBase === 16 ? 16 : progBase === 8 ? 8 : progBase === 2 ? 2 : 10).toUpperCase());
        }
        // SHL / SHR
        if (op === 'SHL') { setProgInput(clampToWordSize(a << 1, wordSize).toString(10)); }
        if (op === 'SHR') { setProgInput(clampToWordSize(a >> 1, wordSize).toString(10)); }
    };

    const progDigits: Record<number, string[]> = {
        16: ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F'],
        10: ['0','1','2','3','4','5','6','7','8','9'],
        8:  ['0','1','2','3','4','5','6','7'],
        2:  ['0','1'],
    };

    // ─── UI Classes ─────────────────────────────────────────────────────────
    const btnBase = "h-12 rounded-xl flex items-center justify-center font-medium text-sm transition-all active:scale-95 touch-manipulation select-none";
    const numCls = `${btnBase} bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-lg font-semibold`;
    const opCls = `${btnBase} bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-lg`;
    const fnCls = `${btnBase} bg-slate-200 dark:bg-slate-700/50 text-slate-700 dark:text-slate-200 text-xs`;
    const togCls = (on: boolean) => `${fnCls} ${on ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : ''}`;
    const progBtnCls = (enabled: boolean) => `${btnBase} ${enabled ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100' : 'bg-slate-100/30 dark:bg-slate-800/20 text-slate-400 dark:text-slate-600 cursor-not-allowed'} text-lg font-semibold`;

    return (
        <div className="max-w-md mx-auto px-4 pt-14 pb-24 animate-fade-in">
            {/* Mode Tab Bar */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 mb-4">
                {(['normal', 'scientific', 'programming'] as CalcMode[]).map(m => (
                    <button
                        key={m}
                        onClick={() => setCalcMode(m)}
                        className={`flex-1 py-2.5 rounded-lg text-[11px] font-bold capitalize transition-all ${
                            calcMode === m
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-500 dark:text-slate-400'
                        }`}
                    >
                        {m}
                    </button>
                ))}
            </div>

            {/* ═══════════════════ PROGRAMMING MODE ═══════════════════════════ */}
            {calcMode === 'programming' && (
                <div className="space-y-3">
                    {/* Display all bases */}
                    <div className="bg-slate-900 rounded-2xl p-4 space-y-2">
                        {([{ base: 16, label: 'HEX' }, { base: 10, label: 'DEC' }, { base: 8, label: 'OCT' }, { base: 2, label: 'BIN' }] as { base: 2|8|10|16; label: string }[]).map(({ base, label }) => (
                            <button
                                key={base}
                                onClick={() => setProgBase(base)}
                                className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all ${progBase === base ? 'bg-indigo-600/30' : 'opacity-50'}`}
                            >
                                <span className={`text-[10px] font-bold w-8 text-right ${progBase === base ? 'text-indigo-400' : 'text-slate-500'}`}>{label}</span>
                                <span className={`text-right flex-1 font-mono text-sm tracking-wide ${progBase === base ? 'text-white text-lg' : 'text-slate-400 text-xs'}`}>
                                    {toBase(isNaN(progValue) ? 0 : progValue, base, wordSize)}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Word Size */}
                    <div className="flex gap-2">
                        {([8, 16, 32, 64] as WordSize[]).map(ws => (
                            <button key={ws} onClick={() => setWordSize(ws)}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${wordSize === ws ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-card border-border text-muted-foreground'}`}>
                                {ws}-bit
                            </button>
                        ))}
                    </div>

                    {/* Bitwise ops */}
                    <div className="grid grid-cols-4 gap-2">
                        {['AND', 'OR', 'XOR', 'NOT', 'SHL', 'SHR', 'MOD', '( )'].map(op => (
                            <button key={op} onClick={() => handleProgOp(op)}
                                className={`${fnCls} text-xs font-bold`}>
                                {op}
                            </button>
                        ))}
                    </div>

                    {/* Digit pad */}
                    <div className="grid grid-cols-4 gap-2">
                        {['D','E','F','C','A','B','7','8','9','÷','4','5','6','×','1','2','3','-','0','00','.','+'].map(d => {
                            const isHex = ['A','B','C','D','E','F'].includes(d);
                            const isEnabled = progBase === 16 || !isHex;
                            return (
                                <button key={d}
                                    disabled={!isEnabled}
                                    onClick={() => isEnabled ? handleProgInput(d) : undefined}
                                    className={progBtnCls(isEnabled)}>
                                    {d}
                                </button>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => setProgInput('0')} className={`${btnBase} bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400`}>C</button>
                        <button onClick={() => setProgInput(p => p.slice(0, -1) || '0')} className={`${btnBase} bg-slate-200 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300`}>
                            <Delete size={18} />
                        </button>
                        <button onClick={() => copyText(progInput, 'prog')} className={`${btnBase} bg-indigo-100 dark:bg-indigo-800/30 text-indigo-700 dark:text-indigo-300`}>
                            {copied === 'prog' ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                    </div>
                </div>
            )}

            {/* ═══════════════════ NORMAL & SCIENTIFIC MODES ═══════════════════ */}
            {calcMode !== 'programming' && (
                <>
                    {/* Display */}
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-4 min-h-[110px] flex flex-col items-end justify-end relative overflow-hidden">
                        {memory !== 0 && (
                            <div className="absolute top-3 left-4 text-xs font-bold text-indigo-500">M = {memory}</div>
                        )}
                        <div className="flex gap-2 absolute top-3 right-4 items-center">
                            {calcMode === 'scientific' && (
                                <span className="text-xs font-semibold text-slate-400">{isDeg ? 'DEG' : 'RAD'}</span>
                            )}
                            <button onClick={() => setShowHistory(p => !p)} className="text-slate-400 hover:text-slate-600">
                                <Clock size={15} />
                            </button>
                        </div>
                        <div ref={displayRef} className="w-full text-right text-slate-500 dark:text-slate-400 text-base min-h-[24px] overflow-x-auto whitespace-nowrap scrollbar-hide mb-1">
                            {expression || '0'}
                        </div>
                        <div
                            className="w-full text-right text-slate-900 dark:text-white text-3xl font-bold overflow-x-auto whitespace-nowrap scrollbar-hide cursor-pointer"
                            onClick={() => result && copyText(result, 'result')}
                        >
                            {result || ''}
                            {result && (
                                <span className="ml-2 text-slate-400 dark:text-slate-500">
                                    {copied === 'result' ? <Check size={14} className="inline" /> : <Copy size={14} className="inline" />}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* History panel */}
                    <AnimatePresence>
                        {showHistory && history.length > 0 && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden mb-3"
                            >
                                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                    <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">History</span>
                                        <button onClick={() => setHistory([])} className="text-[10px] text-red-500 font-medium">Clear</button>
                                    </div>
                                    <div className="divide-y divide-slate-100 dark:divide-slate-700/50 max-h-40 overflow-y-auto">
                                        {history.map((h, i) => (
                                            <button key={i} onClick={() => { setExpression(h.expression); setResult(h.result); setShowHistory(false); }}
                                                className="w-full text-right px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                <p className="text-slate-500 dark:text-slate-400 text-xs">{h.expression}</p>
                                                <p className="text-slate-900 dark:text-white font-bold text-base">= {h.result}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Scientific: mem + toggle row */}
                    {calcMode === 'scientific' && (
                        <div className="grid grid-cols-5 gap-2 mb-2">
                            <button className={togCls(!isDeg)} onClick={() => setIsDeg(!isDeg)}>{isDeg ? 'DEG' : 'RAD'}</button>
                            <button className={fnCls} onClick={() => handleMemory('MC')}>MC</button>
                            <button className={fnCls} onClick={() => handleMemory('MR')}>MR</button>
                            <button className={fnCls} onClick={() => handleMemory('M+')}>M+</button>
                            <button className={fnCls} onClick={() => handleMemory('M-')}>M-</button>
                        </div>
                    )}

                    {/* Scientific: function rows */}
                    {calcMode === 'scientific' && (
                        <div className="grid grid-cols-5 gap-2 mb-2">
                            <button className={fnCls} onClick={() => handleInput('cbrt(')}>∛x</button>
                            <button className={fnCls} onClick={() => handleInput('^3')}>x³</button>
                            <button className={fnCls} onClick={() => handleInput('nthRoot(')}>y√x</button>
                            <button className={fnCls} onClick={() => handleInput('log2(')}>log₂</button>
                            <button className={fnCls} onClick={() => handleInput('%')}>mod</button>

                            <button className={togCls(isInverse)} onClick={() => setIsInverse(!isInverse)}>INV</button>
                            <button className={togCls(isHyp)} onClick={() => setIsHyp(!isHyp)}>HYP</button>
                            <button className={fnCls} onClick={() => handleInput('sin(')}>sin</button>
                            <button className={fnCls} onClick={() => handleInput('cos(')}>cos</button>
                            <button className={fnCls} onClick={() => handleInput('tan(')}>tan</button>

                            <button className={fnCls} onClick={() => handleInput('e')}>e</button>
                            <button className={fnCls} onClick={() => handleInput('ln(')}>ln</button>
                            <button className={fnCls} onClick={() => handleInput('log(')}>log</button>
                            <button className={fnCls} onClick={() => handleInput('(')}>{'('}</button>
                            <button className={fnCls} onClick={() => handleInput(')')}>{')'}</button>

                            <button className={fnCls} onClick={() => handleInput('π')}>π</button>
                            <button className={fnCls} onClick={() => handleInput('^')}>x^y</button>
                            <button className={fnCls} onClick={() => handleInput('^2')}>x²</button>
                            <button className={fnCls} onClick={() => handleInput('sqrt(')}>√</button>
                            <button className={fnCls} onClick={() => handleInput('abs(')}>|x|</button>
                        </div>
                    )}

                    {/* Number + operator grid (both modes) */}
                    <div className={`grid gap-2 mb-2 ${calcMode === 'scientific' ? 'grid-cols-5' : 'grid-cols-4'}`}>
                        {calcMode === 'scientific' && <button className={fnCls} onClick={() => handleInput('!')}>x!</button>}
                        <button className={numCls} onClick={() => handleInput('7')}>7</button>
                        <button className={numCls} onClick={() => handleInput('8')}>8</button>
                        <button className={numCls} onClick={() => handleInput('9')}>9</button>
                        <button className={opCls} onClick={() => handleInput('/')}>÷</button>

                        {calcMode === 'scientific' && <button className={fnCls} onClick={() => handleInput('1/(')}>1/x</button>}
                        <button className={numCls} onClick={() => handleInput('4')}>4</button>
                        <button className={numCls} onClick={() => handleInput('5')}>5</button>
                        <button className={numCls} onClick={() => handleInput('6')}>6</button>
                        <button className={opCls} onClick={() => handleInput('*')}>×</button>

                        {calcMode === 'scientific' && <button className={fnCls} onClick={() => handleInput('10^')}>10^x</button>}
                        <button className={numCls} onClick={() => handleInput('1')}>1</button>
                        <button className={numCls} onClick={() => handleInput('2')}>2</button>
                        <button className={numCls} onClick={() => handleInput('3')}>3</button>
                        <button className={opCls} onClick={() => handleInput('-')}>−</button>

                        {calcMode === 'scientific' && <button className={fnCls} onClick={() => handleInput('EXP(')}>EXP</button>}
                        <button className={numCls} onClick={handleSignToggle}>+/−</button>
                        <button className={numCls} onClick={() => handleInput('0')}>0</button>
                        <button className={numCls} onClick={() => handleInput('.')}>.</button>
                        <button className={opCls} onClick={() => handleInput('+')}>+</button>

                        {/* = spans full width */}
                        <button
                            className={`${opCls} text-xl ${calcMode === 'scientific' ? 'col-span-5' : 'col-span-4'}`}
                            onClick={handleCalculate}
                        >=</button>
                    </div>

                    {/* Control row */}
                    <div className="grid grid-cols-4 gap-2">
                        <button className={`${btnBase} bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400`} onClick={() => { setExpression(''); setResult(''); }}>CE</button>
                        <button className={`${btnBase} bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400`} onClick={handleClear}>C</button>
                        <button className={`${btnBase} bg-slate-200 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 col-span-2`} onClick={handleBackspace}>
                            <Delete className="w-5 h-5 mx-auto" />
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
