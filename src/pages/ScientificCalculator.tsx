import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import { ArrowLeft, Delete, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { AnalyticsService } from '../lib/analytics';
import DisclaimerComponent from '../components/DisclaimerComponent';
import FinancialQuote from '../components/FinancialQuote';

type CalcMode = 'standard' | 'scientific' | 'programmer';

const DEG = Math.PI / 180;

export default function ScientificCalculator() {
    useEffect(() => { AnalyticsService.trackScreen('Scientific_Calculator'); }, []);
    useTrackCalculator();
    const navigate = useNavigate();
    const [mode, setMode] = useState<CalcMode>('standard');
    const [display, setDisplay] = useState('0');
    const [expression, setExpression] = useState('');
    const [memory, setMemory] = useState(0);
    const [angleMode, setAngleMode] = useState<'deg' | 'rad'>('deg');
    const [progBase, setProgBase] = useState<'DEC' | 'HEX' | 'BIN' | 'OCT'>('DEC');

    const append = useCallback((v: string) => {
        setDisplay(prev => prev === '0' || prev === 'Error' ? v : prev + v);
    }, []);

    const clear = () => { setDisplay('0'); setExpression(''); };

    const calculate = useCallback(() => {
        try {
            let expr = display
                .replace(/×/g, '*').replace(/÷/g, '/')
                .replace(/π/g, String(Math.PI)).replace(/e(?!x)/g, String(Math.E));
            // Handle scientific functions
            expr = expr.replace(/sin\(([^)]+)\)/g, (_, a) => String(Math.sin(angleMode === 'deg' ? Number(a) * DEG : Number(a))));
            expr = expr.replace(/cos\(([^)]+)\)/g, (_, a) => String(Math.cos(angleMode === 'deg' ? Number(a) * DEG : Number(a))));
            expr = expr.replace(/tan\(([^)]+)\)/g, (_, a) => String(Math.tan(angleMode === 'deg' ? Number(a) * DEG : Number(a))));
            expr = expr.replace(/asin\(([^)]+)\)/g, (_, a) => String(angleMode === 'deg' ? Math.asin(Number(a)) / DEG : Math.asin(Number(a))));
            expr = expr.replace(/acos\(([^)]+)\)/g, (_, a) => String(angleMode === 'deg' ? Math.acos(Number(a)) / DEG : Math.acos(Number(a))));
            expr = expr.replace(/atan\(([^)]+)\)/g, (_, a) => String(angleMode === 'deg' ? Math.atan(Number(a)) / DEG : Math.atan(Number(a))));
            expr = expr.replace(/ln\(([^)]+)\)/g, (_, a) => String(Math.log(Number(a))));
            expr = expr.replace(/log\(([^)]+)\)/g, (_, a) => String(Math.log10(Number(a))));
            expr = expr.replace(/√\(([^)]+)\)/g, (_, a) => String(Math.sqrt(Number(a))));
            expr = expr.replace(/(\d+)!/g, (_, n) => { let r = 1; for (let i = 2; i <= Number(n); i++) r *= i; return String(r); });
            expr = expr.replace(/\^/g, '**');
            const result = new Function('return ' + expr)();
            if (typeof result !== 'number' || !isFinite(result)) throw new Error();
            setExpression(display + ' =');
            setDisplay(Number.isInteger(result) ? String(result) : result.toPrecision(10).replace(/\.?0+$/, ''));
        } catch {
            setDisplay('Error');
        }
    }, [display, angleMode]);

    const progConvert = useMemo(() => {
        const n = parseInt(display) || 0;
        return { DEC: String(n), HEX: n.toString(16).toUpperCase(), BIN: n.toString(2), OCT: n.toString(8) };
    }, [display]);

    const btnClass = (bg: string) => `flex items-center justify-center rounded-2xl font-bold text-sm h-14 transition-all active:scale-95 ${bg}`;

    const stdButtons = [
        ['C', '(', ')', '÷'],
        ['7', '8', '9', '×'],
        ['4', '5', '6', '-'],
        ['1', '2', '3', '+'],
        ['0', '.', '⌫', '='],
    ];

    const sciButtons = [
        ['sin', 'cos', 'tan', 'π'],
        ['asin', 'acos', 'atan', 'e'],
        ['ln', 'log', '√', '^'],
        ['x²', 'x³', 'n!', '%'],
    ];

    const handleButton = useCallback((btn: string) => {
        switch (btn) {
            case 'C': clear(); break;
            case '⌫': setDisplay(prev => prev.length <= 1 ? '0' : prev.slice(0, -1)); break;
            case '=': calculate(); break;
            case 'sin': case 'cos': case 'tan': case 'asin': case 'acos': case 'atan': case 'ln': case 'log':
                append(btn + '('); break;
            case '√': append('√('); break;
            case 'x²': setDisplay(prev => String(Math.pow(Number(prev) || 0, 2))); break;
            case 'x³': setDisplay(prev => String(Math.pow(Number(prev) || 0, 3))); break;
            case 'n!': {
                const n = parseInt(display) || 0;
                let f = 1; for (let i = 2; i <= Math.min(n, 170); i++) f *= i;
                setDisplay(String(f));
                break;
            }
            case 'MC': setMemory(0); break;
            case 'MR': setDisplay(String(memory)); break;
            case 'M+': setMemory(m => m + (Number(display) || 0)); break;
            case 'M-': setMemory(m => m - (Number(display) || 0)); break;
            default: append(btn);
        }
    }, [append, calculate, display, memory]);

    return (
        <div className="min-h-dvh bg-background animate-fade-in">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-white/10 pt-14 px-4 py-3 flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white/5 border border-white/10">
                    <ArrowLeft size={18} className="text-foreground" />
                </button>
                <div>
                    <h1 className="text-foreground font-bold text-base">Scientific Calculator</h1>
                    <p className="text-muted-foreground text-[11px]">Standard • Scientific • Programmer</p>
                </div>
            </div>

            <FinancialQuote />
            <DisclaimerComponent module="general" />

            <div className="px-4 pt-4 pb-28 space-y-4">
                {/* Mode Toggle */}
                <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
                    {(['standard', 'scientific', 'programmer'] as const).map(m => (
                        <button key={m} onClick={() => setMode(m)}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === m ? 'bg-brand-purple text-white' : 'text-muted-foreground'}`}>
                            {m.charAt(0).toUpperCase() + m.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Display */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    {expression && <p className="text-muted-foreground text-xs text-right mb-1 font-mono">{expression}</p>}
                    <p className="text-foreground text-right text-3xl font-bold font-mono break-all leading-tight">{display}</p>
                    {mode === 'scientific' && (
                        <div className="flex gap-2 mt-3">
                            <button onClick={() => setAngleMode(a => a === 'deg' ? 'rad' : 'deg')}
                                className="px-3 py-1 rounded-lg bg-brand-purple/20 text-brand-purple text-xs font-bold">
                                {angleMode.toUpperCase()}
                            </button>
                            {['MC', 'MR', 'M+', 'M-'].map(m => (
                                <button key={m} onClick={() => handleButton(m)}
                                    className="px-2 py-1 rounded-lg bg-white/5 text-muted-foreground text-xs font-bold">{m}</button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Programmer conversions */}
                {mode === 'programmer' && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                        {(['DEC', 'HEX', 'BIN', 'OCT'] as const).map(b => (
                            <button key={b} onClick={() => { setProgBase(b); setDisplay(String(parseInt(display) || 0)); }}
                                className={`w-full flex justify-between p-2.5 rounded-xl text-xs font-mono ${progBase === b ? 'bg-brand-purple/20 text-brand-purple border border-brand-purple/40' : 'bg-white/5 text-muted-foreground'}`}>
                                <span className="font-bold">{b}</span>
                                <span>{progConvert[b]}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Scientific Buttons */}
                {mode === 'scientific' && (
                    <div className="grid grid-cols-4 gap-2">
                        {sciButtons.flat().map(btn => (
                            <motion.button key={btn} whileTap={{ scale: 0.9 }} onClick={() => handleButton(btn)}
                                className={btnClass('bg-indigo-500/20 text-indigo-400')}>
                                {btn}
                            </motion.button>
                        ))}
                    </div>
                )}

                {/* Standard Buttons */}
                <div className="grid grid-cols-4 gap-2">
                    {stdButtons.flat().map(btn => {
                        const isOp = ['÷', '×', '-', '+', '='].includes(btn);
                        const isAction = ['C', '⌫'].includes(btn);
                        const bg = btn === '=' ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/30'
                            : isOp ? 'bg-orange-500/20 text-orange-400'
                            : isAction ? 'bg-red-500/20 text-red-400'
                            : 'bg-white/10 text-foreground';
                        return (
                            <motion.button key={btn} whileTap={{ scale: 0.9 }} onClick={() => handleButton(btn)}
                                className={btnClass(bg)}>
                                {btn === '⌫' ? <Delete size={18} /> : btn}
                            </motion.button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
