import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Delete, RotateCcw } from 'lucide-react';
import { AnalyticsService } from '../lib/analytics';
import { useTrackCalculator } from '../hooks/useTrackCalculator';

export default function ScientificCalculator() {
    useTrackCalculator();
    const { t } = useTranslation();

    const [expression, setExpression] = useState('');
    const [result, setResult] = useState('');
    const [isDeg, setIsDeg] = useState(true);
    const [isInverse, setIsInverse] = useState(false);
    const [isHyp, setIsHyp] = useState(false);
    const [memory, setMemory] = useState(0);

    const displayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        AnalyticsService.trackScreen('Scientific Calculator');
    }, []);

    // Scroll display to right when expression grows
    useEffect(() => {
        if (displayRef.current) {
            displayRef.current.scrollLeft = displayRef.current.scrollWidth;
        }
    }, [expression, result]);

    const handleInput = (val: string) => {
        if (result && !['+', '-', '*', '/', '^', '%'].includes(val)) {
            setExpression(val);
            setResult('');
        } else if (result) {
            setExpression(result + val);
            setResult('');
        } else {
            setExpression(prev => prev + val);
        }
    };

    const factorial = (n: number): number => {
        if (n < 0) return NaN;
        if (n === 0 || n === 1) return 1;
        let res = 1;
        for (let i = 2; i <= n; i++) res *= i;
        return res;
    };

    const evaluateExpression = (expr: string) => {
        try {
            let parsed = expr
                .replace(/×/g, '*')
                .replace(/÷/g, '/')
                .replace(/π/g, 'Math.PI')
                .replace(/e/g, 'Math.E')
                .replace(/\^/g, '**')
                .replace(/mod/g, '%')
                .replace(/nthRoot\(/g, 'nthRoot(');

            // Handle constants
            parsed = parsed.replace(/pi/g, 'Math.PI');

            // Handle functions
            const trigPrefix = isInverse ? 'a' : '';
            const hypSuffix = isHyp ? 'h' : '';
            
            // Replaces sin(...) with Math.sin(...) and converts to RAD if in DEG mode
            const trigReplace = (func: string) => {
                const mathFunc = `Math.${trigPrefix}${func}${hypSuffix}`;
                if (isDeg && !isInverse && !isHyp) { // Sin(x) in Deg -> Math.sin(x * Math.PI / 180)
                    parsed = parsed.replace(new RegExp(`${func}\\(`, 'g'), `${mathFunc}((Math.PI/180)*`);
                } else if (isDeg && isInverse && !isHyp) { // ASin(x) in Deg -> Math.asin(x) * 180 / Math.PI
                    parsed = parsed.replace(new RegExp(`${trigPrefix}${func}\\(`, 'g'), `(180/Math.PI)*${mathFunc}(`);
                } else {
                    parsed = parsed.replace(new RegExp(`${func}\\(`, 'g'), `${mathFunc}(`);
                }
            };

            trigReplace('sin');
            trigReplace('cos');
            trigReplace('tan');

            parsed = parsed
                .replace(/log\(/g, 'Math.log10(')
                .replace(/log2\(/g, 'Math.log2(')
                .replace(/ln\(/g, 'Math.log(')
                .replace(/sqrt\(/g, 'Math.sqrt(')
                .replace(/cbrt\(/g, 'Math.cbrt(')
                .replace(/abs\(/g, 'Math.abs(')
                .replace(/EXP\(/g, 'Math.exp(')
                .replace(/10\*\*/g, '10**')
                .replace(/e\*\*/g, 'Math.E**');

            // Factorial ! 
            // Simple replace for numbers followed by !
            parsed = parsed.replace(/(\d+(?:\.\d+)?)!/g, (match, num) => {
                return `factorial(${num})`;
            });

            // 1/x -> (1/x)
            // handled manually or via UI inputs

            const nthRoot = (val: number, root: number) => {
                if (val < 0 && root % 2 === 0) return NaN;
                return Math.sign(val) * Math.pow(Math.abs(val), 1 / root);
            };

            // Safe eval wrapper
            const calculate = new Function('Math', 'factorial', 'nthRoot', `return ${parsed}`);
            let res = calculate(Math, factorial, nthRoot);

            if (!isFinite(res) || isNaN(res)) {
                return 'Error';
            }

            // Fix floating point issues
            res = Math.round(res * 1e10) / 1e10;
            return res.toString();
        } catch (e) {
            return 'Error';
        }
    };

    const handleCalculate = () => {
        if (!expression) return;
        const res = evaluateExpression(expression);
        setResult(res);
        if (res !== 'Error') {
            AnalyticsService.trackCalculatorUsed('Scientific', {});
        }
    };

    const handleClear = () => {
        setExpression('');
        setResult('');
    };

    const handleClearEntry = () => {
        if (result) {
            setResult('');
        } else {
            // Find last operator or function and remove everything after it
            const match = expression.match(/([^+\-*/%^()]+)$/);
            if (match) {
                setExpression(expression.slice(0, expression.length - match[1].length));
            } else {
                setExpression(expression.slice(0, -1));
            }
        }
    };

    const handleBackspace = () => {
        if (result) {
            setExpression(result);
            setResult('');
        } else {
            setExpression(prev => prev.slice(0, -1));
        }
    };

    const handleSignToggle = () => {
        if (result) {
            const val = parseFloat(result);
            if (!isNaN(val)) {
                setResult((-val).toString());
                setExpression((-val).toString());
            }
        } else if (expression) {
            // Very basic toggle logic, for simplicity we just wrap the entire expression in -()
            if (expression.startsWith('-(') && expression.endsWith(')')) {
                setExpression(expression.slice(2, -1));
            } else {
                setExpression(`-(${expression})`);
            }
        }
    };

    const handleMemory = (action: string) => {
        const currentVal = result ? parseFloat(result) : evaluateExpression(expression);
        const val = currentVal === 'Error' ? 0 : Number(currentVal);

        switch (action) {
            case 'M+': setMemory(prev => prev + val); break;
            case 'M-': setMemory(prev => prev - val); break;
            case 'MR': handleInput(memory.toString()); break;
            case 'MC': setMemory(0); break;
        }
    };

    const btnClass = "h-12 rounded-xl flex items-center justify-center font-medium text-sm transition-all active:scale-95 touch-manipulation";
    const numClass = `${btnClass} bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-lg sm:text-xl font-semibold`;
    const opClass = `${btnClass} bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-lg`;
    const funcClass = `${btnClass} bg-slate-200 dark:bg-slate-700/50 text-slate-700 dark:text-slate-200 text-xs sm:text-sm`;
    const toggleClass = (active: boolean) => `${funcClass} ${active ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : ''}`;

    return (
        <div className="max-w-md mx-auto px-4 pt-16 pb-24 animate-fade-in">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Scientific Calculator</h1>

            {/* Display Area */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-4 min-h-[120px] flex flex-col items-end justify-end overflow-hidden relative">
                {memory !== 0 && (
                    <div className="absolute top-3 left-4 text-xs font-bold text-indigo-500">M = {memory}</div>
                )}
                <div className="flex gap-2 absolute top-3 right-4">
                    <span className="text-xs font-semibold text-slate-400">{isDeg ? 'DEG' : 'RAD'}</span>
                </div>
                
                <div 
                    ref={displayRef}
                    className="w-full text-right text-slate-500 dark:text-slate-400 text-lg sm:text-xl min-h-[28px] overflow-x-auto whitespace-nowrap scrollbar-hide mb-1"
                >
                    {expression || '0'}
                </div>
                <div className="w-full text-right text-slate-900 dark:text-white text-3xl sm:text-4xl font-bold overflow-x-auto whitespace-nowrap scrollbar-hide">
                    {result || ''}
                </div>
            </div>

            {/* Top Function Row */}
            <div className="grid grid-cols-5 gap-2 mb-2">
                <button className={toggleClass(!isDeg)} onClick={() => setIsDeg(!isDeg)}>{isDeg ? 'DEG' : 'RAD'}</button>
                <button className={funcClass} onClick={() => handleMemory('MC')}>MC</button>
                <button className={funcClass} onClick={() => handleMemory('MR')}>MR</button>
                <button className={funcClass} onClick={() => handleMemory('M+')}>M+</button>
                <button className={funcClass} onClick={() => handleMemory('M-')}>M-</button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-5 gap-2">
                {/* Advanced Functions Row 1 */}
                <button className={funcClass} onClick={() => handleInput('cbrt(')}>∛x</button>
                <button className={funcClass} onClick={() => handleInput('x^3')}>x³</button>
                <button className={funcClass} onClick={() => handleInput('nthRoot(')}>y√x</button>
                <button className={funcClass} onClick={() => handleInput('log2(')}>log2</button>
                <button className={funcClass} onClick={() => handleInput('%')}>mod</button>

                {/* Trig & Hyp */}
                <button className={toggleClass(isInverse)} onClick={() => setIsInverse(!isInverse)}>INV</button>
                <button className={toggleClass(isHyp)} onClick={() => setIsHyp(!isHyp)}>HYP</button>
                <button className={funcClass} onClick={() => handleInput('sin(')}>sin</button>
                <button className={funcClass} onClick={() => handleInput('cos(')}>cos</button>
                <button className={funcClass} onClick={() => handleInput('tan(')}>tan</button>

                {/* Log & Exp */}
                <button className={funcClass} onClick={() => handleInput('e')}>e</button>
                <button className={funcClass} onClick={() => handleInput('ln(')}>ln</button>
                <button className={funcClass} onClick={() => handleInput('log(')}>log</button>
                <button className={funcClass} onClick={() => handleInput('(')}>(</button>
                <button className={funcClass} onClick={() => handleInput(')')}>)</button>

                {/* Math Base */}
                <button className={funcClass} onClick={() => handleInput('π')}>π</button>
                <button className={funcClass} onClick={() => handleInput('^')}>x^y</button>
                <button className={funcClass} onClick={() => handleInput('^2')}>x²</button>
                <button className={funcClass} onClick={() => handleInput('sqrt(')}>√</button>
                <button className={funcClass} onClick={() => handleInput('abs(')}>|x|</button>

                {/* Numbers Row 1 */}
                <button className={funcClass} onClick={() => handleInput('!')}>x!</button>
                <button className={numClass} onClick={() => handleInput('7')}>7</button>
                <button className={numClass} onClick={() => handleInput('8')}>8</button>
                <button className={numClass} onClick={() => handleInput('9')}>9</button>
                <button className={opClass} onClick={() => handleInput('/')}>÷</button>

                {/* Numbers Row 2 */}
                <button className={funcClass} onClick={() => handleInput('1/(')}>1/x</button>
                <button className={numClass} onClick={() => handleInput('4')}>4</button>
                <button className={numClass} onClick={() => handleInput('5')}>5</button>
                <button className={numClass} onClick={() => handleInput('6')}>6</button>
                <button className={opClass} onClick={() => handleInput('*')}>×</button>

                {/* Numbers Row 3 */}
                <button className={funcClass} onClick={() => handleInput('10^')}>10^x</button>
                <button className={numClass} onClick={() => handleInput('1')}>1</button>
                <button className={numClass} onClick={() => handleInput('2')}>2</button>
                <button className={numClass} onClick={() => handleInput('3')}>3</button>
                <button className={opClass} onClick={() => handleInput('-')}>-</button>

                {/* Numbers Row 4 */}
                <button className={funcClass} onClick={() => handleInput('EXP(')}>EXP</button>
                <button className={numClass} onClick={handleSignToggle}>+/-</button>
                <button className={numClass} onClick={() => handleInput('0')}>0</button>
                <button className={numClass} onClick={() => handleInput('.')}>.</button>
                <button className={opClass} onClick={() => handleInput('+')}>+</button>
                
                {/* Result Row */}
                <button className={`${opClass} text-xl col-span-5`} onClick={handleCalculate}>=</button>
            </div>

            {/* Bottom Actions */}
            <div className="grid grid-cols-4 gap-2 mt-2">
                <button className={`${btnClass} bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400`} onClick={handleClearEntry}>CE</button>
                <button className={`${btnClass} bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400`} onClick={handleClear}>C</button>
                <button className={`${btnClass} bg-slate-200 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 col-span-2`} onClick={handleBackspace}>
                    <Delete className="w-5 h-5 mx-auto" />
                </button>
            </div>
        </div>
    );
}
