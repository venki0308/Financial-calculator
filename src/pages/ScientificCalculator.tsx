import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Delete, RotateCcw, Clock, Copy, Check, ChevronDown, Hash } from 'lucide-react';
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
    // ─── UI Classes ─────────────────────────────────────────────────────────
    const btnBase = "h-14 rounded-2xl flex items-center justify-center font-medium transition-all active:scale-95 touch-manipulation select-none";
    const numCls = `${btnBase} bg-card text-foreground border border-border text-2xl font-semibold shadow-sm`;
    const opCls = `${btnBase} bg-brand-purple/10 text-brand-purple border border-brand-purple/20 text-xl font-bold`;
    const fnCls = `${btnBase} bg-muted/50 text-muted-foreground border border-border text-xs`;
    const togCls = (on: boolean) => `${btnBase} border text-xs transition-colors ${on ? 'bg-brand-purple/20 border-brand-purple/40 text-brand-purple shadow-sm' : 'bg-muted/50 border-border text-muted-foreground'}`;
    const progBtnCls = (enabled: boolean) => `${btnBase} text-xl font-semibold border ${enabled ? 'bg-card text-foreground border-border shadow-sm' : 'bg-card/30 text-muted-foreground/30 border-transparent cursor-not-allowed'}`;

    return (
        <div className="max-w-md mx-auto px-4 pt-14 pb-24 animate-fade-in bg-background min-h-[calc(100vh-6rem)]">
            {/* Mode Tab Bar */}
            <div className="flex gap-1 bg-muted border border-border rounded-xl p-1 mb-4 shadow-inner">
                {(['normal', 'scientific', 'programming'] as CalcMode[]).map(m => (
                    <button
                        key={m}
                        onClick={() => setCalcMode(m)}
                        className={`flex-1 py-2.5 rounded-lg text-[11px] font-bold capitalize transition-all ${
                            calcMode === m
                                ? 'bg-card text-foreground shadow-sm border border-border/50'
                                : 'text-muted-foreground hover:text-foreground'
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
                    <div className="bg-gradient-to-br from-card to-card/50 border border-border shadow-sm rounded-3xl p-4 space-y-2 relative overflow-hidden mb-4">
                        {/* Decorative background element */}
                        <div className="absolute -top-4 -right-4 p-4 opacity-5 pointer-events-none">
                            <Hash size={120} />
                        </div>
                        {([{ base: 16, label: 'HEX' }, { base: 10, label: 'DEC' }, { base: 8, label: 'OCT' }, { base: 2, label: 'BIN' }] as { base: 2|8|10|16; label: string }[]).map(({ base, label }) => (
                            <button
                                key={base}
                                onClick={() => setProgBase(base)}
                                className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all ${progBase === base ? 'bg-brand-purple/10 ring-1 ring-brand-purple/30' : 'opacity-50 hover:opacity-80'}`}
                            >
                                <span className={`text-[10px] font-bold w-8 text-right ${progBase === base ? 'text-brand-purple' : 'text-muted-foreground'}`}>{label}</span>
                                <span className={`text-right flex-1 font-mono text-sm tracking-wide ${progBase === base ? 'text-foreground text-lg' : 'text-muted-foreground text-xs'} overflow-x-auto whitespace-nowrap scrollbar-hide`}>
                                    {toBase(isNaN(progValue) ? 0 : progValue, base, wordSize)}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Word Size */}
                    <div className="flex gap-2">
                        {([8, 16, 32, 64] as WordSize[]).map(ws => (
                            <button key={ws} onClick={() => setWordSize(ws)}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${wordSize === ws ? 'bg-brand-purple text-white border-brand-purple shadow-md' : 'bg-card border-border text-muted-foreground hover:bg-muted'}`}>
                                {ws}-bit
                            </button>
                        ))}
                    </div>

                    {/* Bitwise ops */}
                    <div className="grid grid-cols-4 gap-2">
                        {['AND', 'OR', 'XOR', 'NOT', 'SHL', 'SHR', 'MOD', '( )'].map(op => (
                            <button key={op} onClick={() => handleProgOp(op)}
                                className={`${fnCls} font-bold hover:bg-muted/80`}>
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
                        <button onClick={() => setProgInput('0')} className={`${btnBase} bg-red-500/10 border border-red-500/20 text-red-500 font-bold hover:bg-red-500/20`}>C</button>
                        <button onClick={() => setProgInput(p => p.slice(0, -1) || '0')} className={`${btnBase} bg-muted text-foreground border border-border hover:bg-muted/80`}>
                            <Delete size={18} />
                        </button>
                        <button onClick={() => copyText(progInput, 'prog')} className={`${btnBase} bg-brand-purple/10 border border-brand-purple/20 text-brand-purple hover:bg-brand-purple/20`}>
                            {copied === 'prog' ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                    </div>
                </div>
            )}

            {/* ═══════════════════ NORMAL & SCIENTIFIC MODES ═══════════════════ */}
            {calcMode !== 'programming' && (
                <>
                    {/* Display */}
                    <div className="p-5 rounded-3xl bg-gradient-to-br from-purple-600/10 to-indigo-600/10 border border-purple-500/20 mb-4 min-h-[140px] flex flex-col items-end justify-end relative overflow-hidden shadow-sm">
                        {memory !== 0 && (
                            <div className="absolute top-4 left-5 px-2 py-0.5 bg-brand-purple/20 text-brand-purple rounded text-xs font-bold border border-brand-purple/30">M = {memory}</div>
                        )}
                        <div className="flex gap-3 absolute top-4 right-5 items-center">
                            {calcMode === 'scientific' && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-background/50 rounded text-muted-foreground border border-border shadow-sm">{isDeg ? 'DEG' : 'RAD'}</span>
                            )}
                            <button onClick={() => setShowHistory(p => !p)} className="text-muted-foreground hover:text-brand-purple transition-colors p-1.5 bg-background/50 rounded-full border border-border shadow-sm">
                                <Clock size={14} />
                            </button>
                        </div>
                        <div ref={displayRef} className="w-full text-right text-muted-foreground text-sm min-h-[24px] overflow-x-auto whitespace-nowrap scrollbar-hide mb-2 mt-6 font-medium tracking-wide">
                            {expression || '0'}
                        </div>
                        <div
                            className="w-full text-right text-foreground text-5xl font-black overflow-x-auto whitespace-nowrap scrollbar-hide cursor-pointer tracking-tight"
                            onClick={() => result && copyText(result, 'result')}
                        >
                            {result || ''}
                            {result && (
                                <span className="ml-2 text-brand-purple/80 align-middle">
                                    {copied === 'result' ? <Check size={18} className="inline opacity-80" /> : <Copy size={18} className="inline opacity-50 hover:opacity-100 transition-opacity" />}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* History panel */}
                    <AnimatePresence>
                        {showHistory && history.length > 0 && (
                            <motion.div
                                initial={{ height: 0, opacity: 0, scale: 0.95 }}
                                animate={{ height: 'auto', opacity: 1, scale: 1 }}
                                exit={{ height: 0, opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden mb-4 rounded-2xl bg-card border border-border shadow-lg"
                            >
                                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">History</span>
                                    <button onClick={() => setHistory([])} className="text-[11px] text-red-500 font-bold hover:bg-red-500/10 px-2 py-1 rounded transition-colors">Clear All</button>
                                </div>
                                <div className="divide-y divide-border max-h-48 overflow-y-auto">
                                    {history.map((h, i) => (
                                        <button key={i} onClick={() => { setExpression(h.expression); setResult(h.result); setShowHistory(false); }}
                                            className="w-full text-right px-4 py-3 hover:bg-muted/50 transition-colors focus:bg-muted outline-none">
                                            <p className="text-muted-foreground text-[11px] font-medium mb-1">{h.expression}</p>
                                            <p className="text-foreground font-bold text-base text-brand-purple">= {h.result}</p>
                                        </button>
                                    ))}
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

                    {/* Control row */}
                    <div className={`grid gap-2 mb-2 ${calcMode === 'scientific' ? 'grid-cols-5' : 'grid-cols-4'}`}>
                        {calcMode === 'scientific' && <div />}
                        <button className={`${btnBase} bg-red-500/10 border border-red-500/20 text-red-500 text-lg font-bold hover:bg-red-500/20`} onClick={() => { setExpression(''); setResult(''); }}>CE</button>
                        <button className={`${btnBase} bg-red-500/10 border border-red-500/20 text-red-500 text-lg font-bold hover:bg-red-500/20`} onClick={handleClear}>C</button>
                        <button className={`${btnBase} bg-brand-purple/10 border border-brand-purple/20 text-brand-purple col-span-2 hover:bg-brand-purple/20`} onClick={handleBackspace}>
                            <Delete className="w-6 h-6 mx-auto" />
                        </button>
                    </div>

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
                            className={`${btnBase} text-2xl font-bold transition-all shadow-md active:shadow-sm ${calcMode === 'scientific' ? 'col-span-5' : 'col-span-4'} bg-brand-purple text-white hover:bg-brand-purple/90`}
                            onClick={handleCalculate}
                        >=</button>
                    </div>
                </>
            )}
        </div>
    );
}

