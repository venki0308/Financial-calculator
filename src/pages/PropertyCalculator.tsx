import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, MapPin, ArrowRightLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useCalculatorStore } from '../store/useCalculatorStore';

type Mode = 'land' | 'flat' | 'convert';

// All units expressed as how many sq.ft each unit equals
const unitConversions: Record<string, number> = {
    sqft: 1,
    sqm: 10.7639,
    sqyard: 9,
    cent: 435.6,
    gunta: 1089,
    ankanam: 72,
    gajam: 9,
    acre: 43560,
    hectare: 107639,
    ground: 2400,
    bigha: 27000,
};

const unitKeys = Object.keys(unitConversions);

export default function PropertyCalculator() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const addSaved = useCalculatorStore((s) => s.addSaved);
    const [mode, setMode] = useState<Mode>('land');

    // Land fields
    const [area, setArea] = useState('');
    const [unit, setUnit] = useState<'sqft' | 'sqyard' | 'acre' | 'cent'>('sqft');
    const [pricePerUnit, setPricePerUnit] = useState('');

    // Flat fields
    const [builtUpArea, setBuiltUpArea] = useState('');
    const [carpetArea, setCarpetArea] = useState('');
    const [pricePerSqft, setPricePerSqft] = useState('');
    const [parking, setParking] = useState('');
    const [clubMembership, setClubMembership] = useState('');
    const [maintenance, setMaintenance] = useState('');
    const [gstPercent, setGstPercent] = useState('5');

    // Convert fields
    const [convertValue, setConvertValue] = useState('');
    const [fromUnit, setFromUnit] = useState('sqft');
    const [toUnit, setToUnit] = useState('gunta');

    const [result, setResult] = useState<any>(null);

    const calculate = () => {
        if (mode === 'land') {
            const a = Number(area), p = Number(pricePerUnit);
            if (!a || !p) return;
            const totalValue = a * p;
            const registration = totalValue * 0.08;
            const stampDuty = totalValue * 0.06;
            const totalCost = totalValue + registration + stampDuty;
            setResult({ totalValue, registration, stampDuty, totalCost });
        } else {
            const bua = Number(builtUpArea), ppsf = Number(pricePerSqft);
            if (!bua || !ppsf) return;
            const basePrice = bua * ppsf;
            const gst = basePrice * (Number(gstPercent) / 100);
            const additionalCharges = Number(parking) + Number(clubMembership) + Number(maintenance);
            const grandTotal = basePrice + gst + additionalCharges;
            const registration = grandTotal * 0.08;
            const stampDuty = grandTotal * 0.06;
            const totalCost = grandTotal + registration + stampDuty;
            setResult({ basePrice, gst, additionalCharges, grandTotal, registration, stampDuty, totalCost });
        }
    };

    const convertResult = (): string => {
        const val = Number(convertValue);
        if (!val) return '0';
        const sqft = val * unitConversions[fromUnit];
        const converted = sqft / unitConversions[toUnit];
        return converted.toLocaleString('en-IN', { maximumFractionDigits: 4 });
    };

    const handleSave = () => {
        if (!result) return;
        addSaved({ id: Date.now().toString(), type: 'Property Calculator', inputs: mode === 'land' ? { mode, area, unit, pricePerUnit } : { mode, builtUpArea, carpetArea, pricePerSqft, parking, clubMembership, maintenance, gstPercent }, result, timestamp: Date.now() });
    };

    const getUnitLabel = (key: string) => {
        const labels: Record<string, string> = {
            sqft: t('units.squareFeet'),
            sqm: t('units.squareMeter'),
            sqyard: 'Sq. Yard',
            cent: t('units.cent'),
            gunta: t('units.gunta'),
            ankanam: t('units.ankanam'),
            gajam: t('units.gajam'),
            acre: t('units.acre'),
            hectare: t('units.hectare'),
            ground: t('units.ground'),
            bigha: t('units.bigha'),
        };
        return labels[key] || key;
    };

    // Quick reference: how many sq.ft per unit
    const referenceUnits = ['cent', 'gunta', 'ankanam', 'gajam', 'acre', 'ground', 'bigha', 'hectare'];

    return (
        <div className="min-h-dvh bg-[#0F172A] animate-fade-in">
            <div className="px-4 pt-14 pb-8">
                <div className="flex items-center gap-3 mb-5">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-dark-card border border-dark-border"><ArrowLeft size={18} className="text-slate-400" /></button>
                    <div>
                        <h1 className="text-lg font-bold text-white">{t('calculators.property.name')}</h1>
                        <p className="text-slate-500 text-xs">{t('calculators.property.desc')}</p>
                    </div>
                </div>

                {/* Mode Toggle */}
                <div className="flex gap-2 mb-5">
                    {(['land', 'flat', 'convert'] as const).map(m => (
                        <button key={m} onClick={() => { setMode(m); setResult(null); }}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-semibold transition-all ${mode === m ? 'bg-brand-green text-black' : 'bg-dark-card border border-dark-border text-slate-400'}`}>
                            {m === 'land' ? <MapPin size={14} /> : m === 'flat' ? <Building2 size={14} /> : <ArrowRightLeft size={14} />}
                            {m === 'land' ? t('calculators.property.land') : m === 'flat' ? t('calculators.property.flat') : t('calculators.property.convert')}
                        </button>
                    ))}
                </div>

                {mode === 'convert' ? (
                    <div className="space-y-4">
                        {/* Unit Converter  */}
                        <div className="bg-dark-card border border-dark-border rounded-2xl p-4 space-y-3">
                            <h3 className="text-sm font-semibold text-white">{t('calculators.property.unitConverter')}</h3>
                            <Field label={t('calculators.property.enterValue')} value={convertValue} onChange={setConvertValue} type="number" />
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">{t('calculators.property.from')}</label>
                                    <select value={fromUnit} onChange={e => setFromUnit(e.target.value)}
                                        className="w-full bg-dark-bg border border-dark-border rounded-xl py-3 px-3 text-white text-sm focus:outline-none focus:border-brand-green">
                                        {unitKeys.map(u => <option key={u} value={u}>{getUnitLabel(u)}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">{t('calculators.property.to')}</label>
                                    <select value={toUnit} onChange={e => setToUnit(e.target.value)}
                                        className="w-full bg-dark-bg border border-dark-border rounded-xl py-3 px-3 text-white text-sm focus:outline-none focus:border-brand-green">
                                        {unitKeys.map(u => <option key={u} value={u}>{getUnitLabel(u)}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Result */}
                            {convertValue && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    className="p-4 rounded-xl bg-gradient-to-r from-brand-green/10 to-brand-blue/10 border border-brand-green/30 text-center">
                                    <p className="text-slate-400 text-xs mb-1">{convertValue} {getUnitLabel(fromUnit)} =</p>
                                    <p className="text-2xl font-bold text-brand-green">{convertResult()}</p>
                                    <p className="text-slate-400 text-xs mt-1">{getUnitLabel(toUnit)}</p>
                                </motion.div>
                            )}
                        </div>

                        {/* Quick Reference Table */}
                        <div className="bg-dark-card border border-dark-border rounded-2xl p-4">
                            <h3 className="text-sm font-semibold text-white mb-3">{t('calculators.property.quickReference')}</h3>
                            <div className="space-y-2">
                                {referenceUnits.map(u => (
                                    <div key={u} className="flex justify-between items-center py-1.5 border-b border-dark-border last:border-0">
                                        <span className="text-slate-400 text-xs">1 {getUnitLabel(u)}</span>
                                        <span className="text-white text-xs font-medium">{unitConversions[u].toLocaleString('en-IN')} sq.ft</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="bg-dark-card border border-dark-border rounded-2xl p-4 space-y-3 mb-4">
                            {mode === 'land' ? (
                                <>
                                    <Field label={t('calculators.property.area')} value={area} onChange={setArea} type="number" />
                                    <div>
                                        <label className="text-xs text-slate-400 mb-1 block">{t('calculators.property.unit')}</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {(['sqft', 'sqyard', 'acre', 'cent'] as const).map(u => (
                                                <button key={u} onClick={() => setUnit(u)}
                                                    className={`py-2 rounded-lg text-xs font-medium ${unit === u ? 'bg-brand-green text-black' : 'bg-dark-bg border border-dark-border text-slate-400'}`}>{u}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <Field label={t('calculators.property.pricePerUnit')} value={pricePerUnit} onChange={setPricePerUnit} type="number" prefix="₹" />
                                </>
                            ) : (
                                <>
                                    <Field label={t('calculators.property.builtUpArea')} value={builtUpArea} onChange={setBuiltUpArea} type="number" />
                                    <Field label={t('calculators.property.carpetArea')} value={carpetArea} onChange={setCarpetArea} type="number" />
                                    <Field label={t('calculators.property.pricePerSqft')} value={pricePerSqft} onChange={setPricePerSqft} type="number" prefix="₹" />
                                    <Field label={t('calculators.property.parking')} value={parking} onChange={setParking} type="number" prefix="₹" />
                                    <Field label={t('calculators.property.clubMembership')} value={clubMembership} onChange={setClubMembership} type="number" prefix="₹" />
                                    <Field label={t('calculators.property.maintenance')} value={maintenance} onChange={setMaintenance} type="number" prefix="₹" />
                                    <Field label={t('calculators.property.gstPercent')} value={gstPercent} onChange={setGstPercent} type="number" suffix="%" />
                                </>
                            )}
                        </div>

                        <motion.button whileTap={{ scale: 0.97 }} onClick={calculate}
                            className="w-full py-4 bg-gradient-to-r from-brand-green to-emerald-500 text-black font-bold rounded-xl mb-4">{t('common.calculate')}</motion.button>

                        {result && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                className="bg-gradient-to-br from-brand-green/10 to-brand-blue/10 border border-brand-green/30 rounded-2xl p-4 space-y-2">
                                {mode === 'land' ? (
                                    <>
                                        <ResultRow label={t('calculators.property.totalValue')} value={result.totalValue} />
                                        <ResultRow label={t('calculators.property.registration')} value={result.registration} />
                                        <ResultRow label={t('calculators.property.stampDuty')} value={result.stampDuty} />
                                        <div className="border-t border-slate-700 pt-2"><ResultRow label={t('calculators.property.totalCost')} value={result.totalCost} highlight /></div>
                                    </>
                                ) : (
                                    <>
                                        <ResultRow label={t('calculators.property.basePrice')} value={result.basePrice} />
                                        <ResultRow label={t('calculators.property.gstAmount')} value={result.gst} />
                                        <ResultRow label={t('calculators.property.additionalCharges')} value={result.additionalCharges} />
                                        <ResultRow label={t('calculators.property.grandTotal')} value={result.grandTotal} />
                                        <ResultRow label={t('calculators.property.registration')} value={result.registration} />
                                        <ResultRow label={t('calculators.property.stampDuty')} value={result.stampDuty} />
                                        <div className="border-t border-slate-700 pt-2"><ResultRow label={t('calculators.property.totalCost')} value={result.totalCost} highlight /></div>
                                    </>
                                )}
                                <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave}
                                    className="w-full py-3 mt-2 bg-brand-purple/20 text-brand-purple font-semibold rounded-xl text-sm border border-brand-purple/30">{t('common.saveCalculation')}</motion.button>
                            </motion.div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function Field({ label, value, onChange, type = 'text', prefix, suffix }: { label: string; value: string; onChange: (v: string) => void; type?: string; prefix?: string; suffix?: string }) {
    return (
        <div>
            <label className="text-xs text-slate-400 mb-1 block">{label}</label>
            <div className="relative">
                {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">{prefix}</span>}
                <input type={type} value={value} onChange={e => onChange(e.target.value)}
                    className={`w-full bg-dark-bg border border-dark-border rounded-xl py-3 text-white text-sm focus:outline-none focus:border-brand-green ${prefix ? 'pl-8 pr-4' : suffix ? 'pl-4 pr-8' : 'px-4'}`} />
                {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">{suffix}</span>}
            </div>
        </div>
    );
}

function ResultRow({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
    return (
        <div className="flex justify-between items-center">
            <span className="text-slate-400 text-xs">{label}</span>
            <span className={`font-bold ${highlight ? 'text-brand-green text-lg' : 'text-white text-sm'}`}>₹{Math.round(value).toLocaleString('en-IN')}</span>
        </div>
    );
}
