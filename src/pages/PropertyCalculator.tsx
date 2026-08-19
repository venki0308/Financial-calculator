import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import { ArrowLeft, Building2, MapPin, ArrowRightLeft, Copy, Check, Home, FileText, Info, Download, Landmark, ChevronDown, ChevronUp, Calculator, Save, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { useLiveStatusStore } from '../store/useLiveStatusStore';
import { AnalyticsService } from '../lib/analytics';
import { exportToPDF, exportToExcel, type ExportConfig } from '../utils/exportReport';

// Dispatch helper so every handler in this file can emit either PDF or Excel
// from the same config. Keeps the seven branches below DRY and guarantees
// numbers in both files stay in sync.
type ExportFmt = 'pdf' | 'xlsx';
const runExport = (cfg: ExportConfig, fmt: ExportFmt) =>
    fmt === 'xlsx' ? exportToExcel(cfg) : exportToPDF(cfg);
import DisclaimerComponent from '../components/DisclaimerComponent';


import { 
    UNIT_CONV, UNIT_LABELS, UNIT_SHORT, UNIT_KEYS, REF_UNITS, 
    STATE_RATES, CONSTRUCTION_GRADES, fmt, fmtArea, calcEMI, getAmortization 
} from '../utils/propertyData';

const UNIT_SHORT_LABELS = UNIT_SHORT;

type Mode = 'land' | 'flat' | 'villa' | 'convert';

export default function PropertyCalculator() {
    useEffect(() => { AnalyticsService.trackScreen('Property'); }, []);
    useTrackCalculator();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const addSaved = useCalculatorStore((s) => s.addSaved);
    const removeSaved = useCalculatorStore((s) => s.removeSaved);
    const addProfile = useLiveStatusStore((s) => s.addProfile);
    const removeProfile = useLiveStatusStore((s) => s.removeProfile);
    const [propertySaved, setPropertySaved] = useState(false);
    const [lastSavedId, setLastSavedId] = useState<string | null>(null);

    /** Save a property snapshot to the My Loans tracker */
    const trackProperty = useCallback((id: string, name: string, mode: string, totalCost: number, area?: number) => {
        addProfile({
            id,
            name,
            calculatorType: 'Property',
            profileData: {
                mode,
                totalCost: Math.round(totalCost),
                propertyValue: Math.round(totalCost),
                area: area || 0,
                startDate: new Date().toISOString().slice(0, 10),
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
    }, [addProfile]);

    const handlePropertyRemove = () => {
        if (lastSavedId) {
            removeSaved(lastSavedId);
            removeProfile(lastSavedId);
            setLastSavedId(null);
            setPropertySaved(false);
        }
    };
    const [mode, setMode] = useState<Mode>('land');

    // ── Land ─────────────────────────────────────────────────────────────────
    const [landArea, setLandArea] = useState('');
    const [landUnit, setLandUnit] = useState('sqft');
    const [landPrice, setLandPrice] = useState('');
    const [landResult, setLandResult] = useState<{
        totalValue: number;
        baseValue: number;
        premiumValue: number;
        conversions: { key: string; value: string }[];
    } | null>(null);

    // ── Flat ─────────────────────────────────────────────────────────────────
    const [builtUp, setBuiltUp] = useState('');
    const [carpet, setCarpet] = useState('');
    const [ppsf, setPpsf] = useState('');
    const [parking, setParking] = useState('');
    const [amenities, setAmenities] = useState('');
    const [maint, setMaint] = useState('');
    const [gstPct, setGstPct] = useState('5');
    const [flatResult, setFlatResult] = useState<{
        basePrice: number; parkingAmt: number; amenitiesAmt: number; maintAmt: number;
        subtotal: number; gstAmt: number; totalCost: number;
    } | null>(null);

    // ── Land Plot Premium (optional) ─────────────────────────────────────────
    const [showPlotPremium, setShowPlotPremium] = useState(false);
    const [cornerPremium, setCornerPremium] = useState('');
    const [roadPremium, setRoadPremium] = useState('');
    const [isDTCP, setIsDTCP] = useState(false);

    // ── Villa / Independent House ────────────────────────────────────────────
    const [villaPlotArea, setVillaPlotArea] = useState('');
    const [villaPlotUnit, setVillaPlotUnit] = useState('sqft');
    const [groundFloor, setGroundFloor] = useState('');
    const [firstFloor, setFirstFloor] = useState('');
    const [secondFloor, setSecondFloor] = useState('');
    const [constGrade, setConstGrade] = useState('standard');
    const [constRate, setConstRate] = useState('2500');
    const [wallPerimeter, setWallPerimeter] = useState('');
    const [wallRate, setWallRate] = useState('350');
    const [ohElectrical, setOhElectrical] = useState(8);
    const [ohPlumbing, setOhPlumbing] = useState(6);
    const [ohInterior, setOhInterior] = useState(12);
    const [ohMisc, setOhMisc] = useState(5);
    const [villaResult, setVillaResult] = useState<{
        floors: { name: string; area: number; cost: number }[];
        constructionCost: number; wallCost: number;
        electrical: number; plumbing: number; interior: number; misc: number;
        totalCost: number; costPerSqft: number;
    } | null>(null);

    // ── Amortization ─────────────────────────────────────────────────────────
    const [showAmortization, setShowAmortization] = useState(false);

    // ── Stamp Duty ────────────────────────────────────────────────────────────
    const [sdValue, setSdValue] = useState('');
    const [sdState, setSdState] = useState('telangana');
    const [sdStampPct, setSdStampPct] = useState(STATE_RATES.telangana.stamp.toString());
    const [sdRegPct, setSdRegPct] = useState(STATE_RATES.telangana.reg.toString());
    const [sdTransferPct, setSdTransferPct] = useState(STATE_RATES.telangana.transfer.toString());
    const [sdResult, setSdResult] = useState<{
        stamp: number; reg: number; transfer: number; total: number;
    } | null>(null);

    // ── Home Loan EMI ─────────────────────────────────────────────────────────
    const [loanAmt, setLoanAmt] = useState('');
    const [loanRate, setLoanRate] = useState('8');
    const [loanTenure, setLoanTenure] = useState('20');
    const [emiResult, setEmiResult] = useState<{
        emi: number; totalInterest: number; totalPayment: number;
    } | null>(null);

    // ── Unit Converter ────────────────────────────────────────────────────────
    const [convVal, setConvVal] = useState('');
    const [fromUnit, setFromUnit] = useState('sqft');
    const [toUnit, setToUnit] = useState('gunta');

    // ── Rental Yield ──────────────────────────────────────────────────────────
    const [ryPropertyValue, setRyPropertyValue] = useState('');
    const [ryMonthlyRent, setRyMonthlyRent] = useState('');
    const [ryMaintenance, setRyMaintenance] = useState('');
    const [ryVacancy, setRyVacancy] = useState('1'); // months vacant per year
    const [ryResult, setRyResult] = useState<{
        annualRent: number; grossYield: number; netYield: number; paybackYears: number | null;
    } | null>(null);

    // ── Appreciation Forecast ─────────────────────────────────────────────────
    const [apCurrentValue, setApCurrentValue] = useState('');
    const [apRate, setApRate] = useState('8');
    const [apResult, setApResult] = useState<{
        projections: { years: number; value: number; gain: number }[];
    } | null>(null);

    // ── Copy toast ────────────────────────────────────────────────────────────
    const [copied, setCopied] = useState<string | null>(null);
    const copyText = (text: string, key: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(key);
            setTimeout(() => setCopied(null), 2000);
        });
    };

    // ── Persistence ────────────────────────────────────────────────────────
    useEffect(() => {
        const saved = localStorage.getItem('fincalix_property_data');
        if (saved) {
            try {
                const d = JSON.parse(saved);
                if (d.landArea) setLandArea(d.landArea); if (d.landUnit) setLandUnit(d.landUnit); if (d.landPrice) setLandPrice(d.landPrice);
                if (d.builtUp) setBuiltUp(d.builtUp); if (d.ppsf) setPpsf(d.ppsf); if (d.gstPct) setGstPct(d.gstPct);
                if (d.villaPlotArea) setVillaPlotArea(d.villaPlotArea); if (d.groundFloor) setGroundFloor(d.groundFloor);
                if (d.sdState) setSdState(d.sdState); if (d.loanRate) setLoanRate(d.loanRate);
            } catch (e) { console.error(e); }
        }
    }, []);

    useEffect(() => {
        const data = { landArea, landUnit, landPrice, builtUp, ppsf, gstPct, villaPlotArea, groundFloor, sdState, loanRate };
        localStorage.setItem('fincalix_property_data', JSON.stringify(data));
    }, [landArea, landUnit, landPrice, builtUp, ppsf, gstPct, villaPlotArea, groundFloor, sdState, loanRate]);

    const copyResult = (val: number, label: string) => {
        copyText(`${label}: ${fmt(val)}`, 'res-copy');
    };

    const resultRef = useRef<HTMLDivElement>(null);
    const scrollToResult = () => {
        setTimeout(() => {
            resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    };

    // ── Calculations ──────────────────────────────────────────────────────────
    const calculateLand = () => {
        const a = Number(landArea), p = Number(landPrice);
        if (!a || !p) return;
        
        let baseValue = a * p;
        let premiumValue = 0;
        
        if (showPlotPremium) {
            const cp = Number(cornerPremium) || 0;
            const rp = Number(roadPremium) || 0;
            const dtcpBonus = isDTCP ? 2.5 : 0;
            const totalPremiumPct = cp + rp + dtcpBonus;
            premiumValue = baseValue * (totalPremiumPct / 100);
        }

        const totalValue = baseValue + premiumValue;
        const sqftArea = a * UNIT_CONV[landUnit];
        const conversions = Object.keys(UNIT_CONV)
            .filter(k => k !== landUnit)
            .map(k => ({
                key: k,
                value: `${fmtArea(sqftArea / UNIT_CONV[k])} ${UNIT_LABELS[k]}`,
            }));
        setLandResult({ totalValue, baseValue, premiumValue, conversions });
        scrollToResult();
    };

    const calculateFlat = () => {
        const bua = Number(builtUp), p = Number(ppsf);
        if (!bua || !p) return;
        const basePrice = bua * p;
        const parkingAmt = Number(parking) || 0;
        const amenitiesAmt = Number(amenities) || 0;
        const maintAmt = Number(maint) || 0;
        const subtotal = basePrice + parkingAmt + amenitiesAmt + maintAmt;
        // Under GST, parking & amenities paid to developer are taxable; maintenance deposit is exempt
        const gstAmt = (basePrice + parkingAmt + amenitiesAmt) * (Number(gstPct) / 100);
        const totalCost = subtotal + gstAmt;
        setFlatResult({ basePrice, parkingAmt, amenitiesAmt, maintAmt, subtotal, gstAmt, totalCost });
        scrollToResult();
    };

    const calculateSD = () => {
        const val = Number(sdValue);
        if (!val) return;
        const s = Number(sdStampPct) || 0;
        const r = Number(sdRegPct) || 0;
        const t = Number(sdTransferPct) || 0;
        const stamp = val * (s / 100);
        const reg = val * (r / 100);
        const transfer = val * (t / 100);
        setSdResult({ stamp, reg, transfer, total: stamp + reg + transfer });
    };

    const calculateEMI = () => {
        const amt = Number(loanAmt), rate = Number(loanRate), tenure = Number(loanTenure);
        if (!amt || !rate || !tenure) return;
        const r = calcEMI(amt, rate, tenure);
        setEmiResult(r);
    };

    const calculateRentalYield = () => {
        const pv = Number(ryPropertyValue), mr = Number(ryMonthlyRent);
        if (!pv || !mr) return;
        const annualRent = mr * (12 - Number(ryVacancy || 0));
        const annualMaint = Number(ryMaintenance || 0) * 12;
        const grossYield = (mr * 12 / pv) * 100;
        const netCashFlow = annualRent - annualMaint;
        const netYield = (netCashFlow / pv) * 100;
        // Negative/zero net cash flow — the property never pays back from rent; null renders as "—"
        const paybackYears = netCashFlow > 0 ? pv / netCashFlow : null;
        setRyResult({ annualRent, grossYield, netYield, paybackYears });
    };

    const calculateAppreciation = () => {
        const cv = Number(apCurrentValue), ar = Number(apRate);
        if (!cv || !ar) return;
        const projections = [5, 10, 15, 20].map(y => {
            const value = cv * Math.pow(1 + ar / 100, y);
            return { years: y, value, gain: value - cv };
        });
        setApResult({ projections });
    };

    const calculateVilla = () => {
        const gf = Number(groundFloor) || 0, ff = Number(firstFloor) || 0, sf = Number(secondFloor) || 0;
        const totalBuiltUp = gf + ff + sf;
        if (!totalBuiltUp) return;
        const rate = Number(constRate) || 0;
        const floors = [
            { name: t('property.groundFloor'), area: gf, cost: gf * rate },
            ...(ff > 0 ? [{ name: t('property.firstFloor'), area: ff, cost: ff * rate }] : []),
            ...(sf > 0 ? [{ name: t('property.secondFloor'), area: sf, cost: sf * rate }] : []),
        ];
        const constructionCost = totalBuiltUp * rate;
        const wallCost = (Number(wallPerimeter) || 0) * (Number(wallRate) || 0);
        const baseCost = constructionCost + wallCost;
        const electrical = baseCost * (ohElectrical / 100);
        const plumbing = baseCost * (ohPlumbing / 100);
        const interior = baseCost * (ohInterior / 100);
        const misc = baseCost * (ohMisc / 100);
        const totalCost = baseCost + electrical + plumbing + interior + misc;
        setVillaResult({ floors, constructionCost, wallCost, electrical, plumbing, interior, misc, totalCost, costPerSqft: Math.round(totalCost / totalBuiltUp) });
        scrollToResult();
    };

    const getAmortizationSchedule = () => {
        const amt = Number(loanAmt), rate = Number(loanRate), tenure = Number(loanTenure);
        if (!amt || !rate || !tenure) return [];
        return getAmortization(amt, rate, tenure);
    };

    const convertedVal = useCallback(() => {
        const v = Number(convVal);
        if (!v) return '0';
        const sqft = v * UNIT_CONV[fromUnit];
        return fmtArea(sqft / UNIT_CONV[toUnit]);
    }, [convVal, fromUnit, toUnit]);

    // ── PDF Export ────────────────────────────────────────────────────────────
    const handleExport = async (xFmt: ExportFmt = 'pdf') => {
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        if (mode === 'land' && landResult) {
            await runExport({
                title: t('property.pdfLandValueReport'),
                inputs: [
                    { label: t('property.area'), value: `${landArea} ${UNIT_LABELS[landUnit]}` },
                    { label: t('property.pricePerUnit'), value: fmt(Number(landPrice)) },
                ],
                results: [
                    { label: t('property.baseLandValue'), value: fmt(landResult.baseValue) },
                    { label: t('property.premiumValue'), value: fmt(landResult.premiumValue) },
                    { label: t('property.estimatedLandValue'), value: fmt(landResult.totalValue) },
                ],
                projectionTitle: t('property.areaConversions'),
                projectionColumns: [t('property.unit'), t('property.equivalentArea')],
                projectionRows: landResult.conversions.map(c => [c.key, c.value]),
                filename: `FinCalix_Land_Value_Report_${tag}`,
            }, xFmt);
        } else if (mode === 'flat' && flatResult) {
            await runExport({
                title: t('property.pdfFlatCostReport'),
                inputs: [
                    { label: t('property.builtUpArea'), value: `${builtUp} ${t('property.sqftUnit')}` },
                    { label: t('property.pricePerSqft'), value: fmt(Number(ppsf)) },
                    { label: t('property.gstRate'), value: `${gstPct}%` },
                ],
                results: [
                    { label: t('property.basePrice'), value: fmt(flatResult.basePrice) },
                    { label: t('property.parkingCharges'), value: fmt(flatResult.parkingAmt) },
                    { label: t('property.amenitiesCharges'), value: fmt(flatResult.amenitiesAmt) },
                    { label: t('property.maintenanceDeposit'), value: fmt(flatResult.maintAmt) },
                    { label: t('property.subtotal'), value: fmt(flatResult.subtotal) },
                    { label: `${t('property.gst')} (${gstPct}%)`, value: fmt(flatResult.gstAmt) },
                    { label: t('property.totalPropertyCost'), value: fmt(flatResult.totalCost) },
                ],
                projectionTitle: t('property.costBreakdown'),
                projectionColumns: [t('property.component'), t('property.amount')],
                projectionRows: [
                    [t('property.basePrice'), fmt(flatResult.basePrice)],
                    [t('property.parking'), fmt(flatResult.parkingAmt)],
                    [t('property.amenities'), fmt(flatResult.amenitiesAmt)],
                    [t('property.maintenanceDeposit'), fmt(flatResult.maintAmt)],
                    [`${t('property.gst')} (${gstPct}%)`, fmt(flatResult.gstAmt)],
                    [t('property.total'), fmt(flatResult.totalCost)],
                ],
                filename: `FinCalix_Flat_Cost_Report_${tag}`,
            }, xFmt);
        }
    };

    const handleStampDuty = async (xFmt: ExportFmt = 'pdf') => {
        if (!sdResult) return;
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        const stateName = STATE_RATES[sdState]?.name || sdState;
        await runExport({
            title: t('property.pdfStampDutyReport'),
            inputs: [
                { label: t('property.state'), value: stateName },
                { label: t('property.propertyValue'), value: fmt(Number(sdValue)) },
            ],
            results: [
                { label: `${t('property.stampDuty')} (${sdStampPct}%)`, value: fmt(sdResult.stamp) },
                { label: `${t('property.registrationCharges')} (${sdRegPct}%)`, value: fmt(sdResult.reg) },
                ...(sdResult.transfer > 0 ? [{ label: `${t('property.transferDuty')} (${sdTransferPct}%)`, value: fmt(sdResult.transfer) }] : []),
                { label: t('property.totalRegistrationCost'), value: fmt(sdResult.total) },
                { label: t('property.grandTotal'), value: fmt(Number(sdValue) + sdResult.total) },
            ],
            projectionTitle: t('property.costBreakdown'),
            projectionColumns: [t('property.component'), t('property.rate'), t('property.amount')],
            projectionRows: [
                [t('property.stampDuty'), `${sdStampPct}%`, fmt(sdResult.stamp)],
                [t('property.registration'), `${sdRegPct}%`, fmt(sdResult.reg)],
                ...(sdResult.transfer > 0 ? [[t('property.transferDuty'), `${sdTransferPct}%`, fmt(sdResult.transfer)]] : []),
                [t('property.total'), '-', fmt(sdResult.total)],
            ],
            filename: `FinCalix_Stamp_Duty_Report_${tag}`,
        }, xFmt);
    };

    const handleRentalYield = async (xFmt: ExportFmt = 'pdf') => {
        if (!ryResult) return;
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        await runExport({
            title: t('property.pdfRentalYieldReport'),
            inputs: [
                { label: t('property.propertyValue'), value: fmt(Number(ryPropertyValue)) },
                { label: t('property.monthlyRent'), value: fmt(Number(ryMonthlyRent)) },
                { label: t('property.monthlyMaintenance'), value: fmt(Number(ryMaintenance || '0')) },
                { label: t('property.vacantMonthsYear'), value: `${ryVacancy} ${t('property.months')}` },
            ],
            results: [
                { label: t('property.annualRentIncome'), value: fmt(ryResult.annualRent) },
                { label: t('property.grossYield'), value: `${ryResult.grossYield.toFixed(2)}%` },
                { label: t('property.netYield'), value: `${ryResult.netYield.toFixed(2)}%` },
                { label: t('property.paybackPeriod'), value: ryResult.paybackYears !== null ? `${ryResult.paybackYears.toFixed(1)} ${t('property.years')}` : '—' },
            ],
            projectionTitle: t('property.rentalYieldSummary'),
            projectionColumns: [t('property.metric'), t('property.value')],
            projectionRows: [
                [t('property.annualRentIncome'), fmt(ryResult.annualRent)],
                [t('property.grossYield'), `${ryResult.grossYield.toFixed(2)}%`],
                [t('property.netYield'), `${ryResult.netYield.toFixed(2)}%`],
                [t('property.paybackPeriod'), ryResult.paybackYears !== null ? `${ryResult.paybackYears.toFixed(1)} ${t('property.years')}` : '—'],
            ],
            filename: `FinCalix_Rental_Yield_Report_${tag}`,
        }, xFmt);
    };

    const handleAppreciation = async (xFmt: ExportFmt = 'pdf') => {
        if (!apResult) return;
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        await runExport({
            title: t('property.pdfAppreciationForecast'),
            inputs: [
                { label: t('property.currentPropertyValue'), value: fmt(Number(apCurrentValue)) },
                { label: t('property.annualAppreciationRate'), value: `${apRate}%` },
            ],
            results: apResult.projections.map(p => ({
                label: `${t('property.after')} ${p.years} ${t('property.years')}`,
                value: `${fmt(p.value)} (${t('property.gain')}: ${fmt(p.gain)})`,
            })),
            projectionTitle: t('property.appreciationProjections'),
            projectionColumns: [t('property.period'), t('property.projectedValue'), t('property.totalGain')],
            projectionRows: apResult.projections.map(p => [
                `${p.years} ${t('property.years')}`,
                fmt(p.value),
                fmt(p.gain),
            ]),
            filename: `FinCalix_Appreciation_Forecast_${tag}`,
        }, xFmt);
    };

    const handleHomeLoan = async (xFmt: ExportFmt = 'pdf') => {
        if (!emiResult) return;
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        await runExport({
            title: t('property.pdfHomeLoanReport'),
            inputs: [
                { label: t('property.loanAmount'), value: fmt(Number(loanAmt)) },
                { label: t('property.interestRate'), value: `${loanRate}% ${t('property.perAnnum')}` },
                { label: t('property.tenure'), value: `${loanTenure} ${t('property.years')}` },
            ],
            results: [
                { label: t('property.monthlyEMI'), value: fmt(emiResult.emi) },
                { label: t('property.totalInterest'), value: fmt(emiResult.totalInterest) },
                { label: t('property.totalPayment'), value: fmt(emiResult.totalPayment) },
            ],
            projectionTitle: t('property.loanSummary'),
            projectionColumns: [t('property.component'), t('property.amount')],
            projectionRows: [
                [t('property.loanAmount'), fmt(Number(loanAmt))],
                [t('property.totalInterest'), fmt(emiResult.totalInterest)],
                [t('property.totalPayment'), fmt(emiResult.totalPayment)],
                [t('property.monthlyEMI'), fmt(emiResult.emi)],
            ],
            filename: `FinCalix_Home_Loan_EMI_Report_${tag}`,
        }, xFmt);
    };

    const handleVilla = async (xFmt: ExportFmt = 'pdf') => {
        if (!villaResult) return;
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
        const totalBUA = villaResult.floors.reduce((sum, f) => sum + f.area, 0);
        const gradeName = CONSTRUCTION_GRADES.find(g => g.key === constGrade)?.label || constGrade;
        await runExport({
            title: t('property.pdfVillaReport'),
            inputs: [
                { label: t('property.totalBuiltUpArea'), value: `${totalBUA.toLocaleString('en-IN')} ${t('property.sqftUnit')}` },
                { label: t('property.constructionGrade'), value: gradeName },
                { label: t('property.ratePerSqft'), value: fmt(Number(constRate)) },
                ...(Number(wallPerimeter) > 0 ? [{ label: t('property.compoundWall'), value: `${wallPerimeter} ${t('property.ft')} @ ₹${wallRate}/${t('property.ft')}` }] : []),
            ],
            results: [
                { label: t('property.constructionCost'), value: fmt(villaResult.constructionCost) },
                ...(villaResult.wallCost > 0 ? [{ label: t('property.compoundWallCost'), value: fmt(villaResult.wallCost) }] : []),
                { label: `${t('property.electrical')} (${ohElectrical}%)`, value: fmt(villaResult.electrical) },
                { label: `${t('property.plumbing')} (${ohPlumbing}%)`, value: fmt(villaResult.plumbing) },
                { label: `${t('property.interiorWorks')} (${ohInterior}%)`, value: fmt(villaResult.interior) },
                { label: `${t('property.miscellaneous')} (${ohMisc}%)`, value: fmt(villaResult.misc) },
                { label: t('property.totalConstructionCost'), value: fmt(villaResult.totalCost) },
                { label: t('property.costPerSqft'), value: `₹${villaResult.costPerSqft.toLocaleString('en-IN')}` },
            ],
            projectionTitle: t('property.floorWiseCostBreakdown'),
            projectionColumns: [t('property.floor'), t('property.areaSqft'), t('property.cost')],
            projectionRows: [
                ...villaResult.floors.map(f => [f.name, f.area.toLocaleString('en-IN'), fmt(f.cost)]),
                [t('property.compoundWall'), '-', fmt(villaResult.wallCost)],
                [`${t('property.electrical')} (${ohElectrical}%)`, '-', fmt(villaResult.electrical)],
                [`${t('property.plumbing')} (${ohPlumbing}%)`, '-', fmt(villaResult.plumbing)],
                [`${t('property.interior')} (${ohInterior}%)`, '-', fmt(villaResult.interior)],
                [`${t('property.miscellaneous')} (${ohMisc}%)`, '-', fmt(villaResult.misc)],
                [t('property.total'), totalBUA.toLocaleString('en-IN'), fmt(villaResult.totalCost)],
            ],
            filename: `FinCalix_Villa_Construction_Report_${tag}`,
        }, xFmt);
    };

    // Format-specific wrappers — keep UI signature `() => void` and let us
    // swap formats without threading the arg through each child component.
    // Declared after the handlers so TS doesn't flag use-before-declaration.
    const handleExportPDF = () => handleExport('pdf');
    const handleExportExcel = () => handleExport('xlsx');
    const handleStampDutyPDF = () => handleStampDuty('pdf');
    const handleStampDutyExcel = () => handleStampDuty('xlsx');
    const handleRentalYieldPDF = () => handleRentalYield('pdf');
    const handleRentalYieldExcel = () => handleRentalYield('xlsx');
    const handleAppreciationPDF = () => handleAppreciation('pdf');
    const handleAppreciationExcel = () => handleAppreciation('xlsx');
    const handleHomeLoanPDF = () => handleHomeLoan('pdf');
    const handleHomeLoanExcel = () => handleHomeLoan('xlsx');
    const handleVillaPDF = () => handleVilla('pdf');
    const handleVillaExcel = () => handleVilla('xlsx');

    return (
        <div className="min-h-dvh bg-background animate-fade-in relative pb-[env(safe-area-inset-bottom,40px)]" style={{ maxWidth: 428, margin: '0 auto' }}>
            <div className="px-4 pt-14 pb-32">
                {/* Header */}
                <div className="flex items-center gap-3 mb-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
                        <ArrowLeft size={18} className="text-muted-foreground" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-foreground">{t('property.title')}</h1>
                        <p className="text-muted-foreground text-xs">{t('property.subtitle')}</p>
                    </div>
                </div>

                
                <DisclaimerComponent module="property" />

                {/* Mode Tabs */}
                <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
                    {([
                        { key: 'land', icon: MapPin, label: t('property.land') },
                        { key: 'flat', icon: Building2, label: t('property.flat') },
                        { key: 'villa', icon: Landmark, label: t('property.villa') },
                        { key: 'convert', icon: ArrowRightLeft, label: t('property.convert') },
                    ] as const).map(({ key, icon: Icon, label }) => (
                        <button
                            key={key}
                            onClick={() => { setMode(key); }}
                            className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-[11px] font-semibold transition-all whitespace-nowrap min-w-[65px] ${mode === key
                                ? 'bg-brand-green text-black shadow-lg shadow-brand-green/20'
                                : 'bg-card border border-border text-muted-foreground'
                                }`}
                        >
                            <Icon size={12} />
                            {label}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={mode}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                    >
                        {/* ══ LAND TAB ══════════════════════════════════════════════ */}
                        {mode === 'land' && (
                            <div className="space-y-4">
                                <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
                                    <h3 className="text-foreground font-semibold text-sm flex items-center gap-2">
                                        <MapPin size={15} className="text-brand-green" /> {t('property.landValueCalculator')}
                                    </h3>

                                    {/* Area + Unit selector */}
                                    <Field label={t('property.area')} value={landArea} onChange={setLandArea} type="number" placeholder="e.g. 2000" />
                                    <div>
                                        <label className="text-xs text-muted-foreground mb-2 block">{t('property.unit')}</label>
                                        <div className="grid grid-cols-4 gap-1.5">
                                            {UNIT_KEYS.map((u: string) => (
                                                <button
                                                    key={u}
                                                    onClick={() => setLandUnit(u)}
                                                    className={`py-2 rounded-lg text-[10px] font-semibold transition-all ${landUnit === u
                                                        ? 'bg-brand-green text-black'
                                                        : 'bg-dark-bg border border-border text-muted-foreground'
                                                        }`}
                                                >
                                                    {UNIT_SHORT_LABELS[u]}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <Field label={t('property.pricePerUnit')} value={landPrice} onChange={setLandPrice} type="number" prefix="₹" placeholder="e.g. 3000" />
                                    
                                    <div className="pt-2 border-t border-border/50">
                                        <button 
                                            onClick={() => setShowPlotPremium(!showPlotPremium)}
                                            className="flex items-center justify-between w-full py-2 group"
                                        >
                                            <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">{t('property.plotPremiumOptions')}</span>
                                            {showPlotPremium ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                                        </button>
                                        
                                        <AnimatePresence>
                                            {showPlotPremium && (
                                                <motion.div 
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden space-y-3 pt-2"
                                                >
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <Field label={t('property.cornerPremium')} value={cornerPremium} onChange={setCornerPremium} type="number" suffix="%" placeholder="e.g. 5" />
                                                        <Field label={t('property.roadPremium')} value={roadPremium} onChange={setRoadPremium} type="number" suffix="%" placeholder="e.g. 3" />
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground">{t('property.premiumTip')}</p>
                                                    <div className="flex items-center gap-3 py-1">
                                                        <input 
                                                            type="checkbox" 
                                                            id="dtcp_rera" 
                                                            checked={isDTCP} 
                                                            onChange={e => setIsDTCP(e.target.checked)}
                                                            className="w-5 h-5 rounded border-border bg-dark-bg accent-brand-green"
                                                        />
                                                        <label htmlFor="dtcp_rera" className="text-xs text-slate-600 dark:text-slate-300 font-medium select-none">{t('property.dtcpReraApproved')}</label>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                <motion.button
                                    whileTap={{ scale: 0.97 }}
                                    onClick={calculateLand}
                                    className="w-full py-4 bg-gradient-to-r from-brand-green to-emerald-500 text-black font-bold rounded-xl"
                                >
                                    {t('property.calculateLandValue')}
                                </motion.button>

                                {landResult && (
                                    <motion.div
                                        ref={resultRef}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-3"
                                    >
                                        {/* Main result */}
                                        <div className="bg-card z-[60] relative border border-brand-green/30 rounded-2xl p-5 text-center overflow-hidden shadow-2xl">
                                            <p className="text-muted-foreground text-xs mb-1">{t('property.estimatedLandValue')}</p>
                                            <p className="text-3xl font-extrabold text-brand-green">
                                                {fmt(landResult.totalValue)}
                                            </p>
                                            <p className="text-muted-foreground text-xs mt-2">
                                                {landArea} {UNIT_LABELS[landUnit]} × {fmt(Number(landPrice))} {t('property.perUnit')}
                                            </p>
                                            {landResult.premiumValue > 0 && (
                                                <div className="mt-2 text-[10px] text-emerald-400 flex flex-col items-center">
                                                    <span>{t('property.base')}: {fmt(landResult.baseValue)}</span>
                                                    <span>{t('property.plotPremium')}: {fmt(landResult.premiumValue)}</span>
                                                </div>
                                            )}
                                            <button 
                                                onClick={() => copyResult(landResult.totalValue, t('property.landValue'))}
                                                className="absolute top-2 right-2 p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                                            >
                                                {copied === 'res-copy' ? <Check size={14} /> : <Copy size={14} />}
                                            </button>
                                        </div>

                                        {/* Converted areas */}
                                        <div className="bg-card border border-border rounded-2xl p-4">
                                            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-3">{t('property.areaConversions')}</p>
                                            <div className="space-y-2">
                                                {landResult.conversions.map(c => (
                                                    <div key={c.key} className="flex justify-between items-center">
                                                        <span className="text-muted-foreground text-xs">{landArea} {UNIT_LABELS[landUnit]} =</span>
                                                        <span className="text-foreground text-xs font-semibold">{c.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="grid grid-cols-2 gap-2">
                                            {propertySaved ? (
                                                <div className="flex gap-1">
                                                    <div className="flex-1 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold flex items-center justify-center gap-1">
                                                        <Check size={14} /> {t('common.saved')}
                                                    </div>
                                                    <button onClick={handlePropertyRemove} className="px-3 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold flex items-center justify-center active:scale-95">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => { const id = Date.now().toString(); addSaved({ id, calculatorType: t('property.landValue'), inputValues: { landArea, landUnit, landPrice }, resultValues: { primary: landResult.totalValue }, timestamp: Date.now() }); trackProperty(id, `${t('property.landValue')} • ${landArea} ${UNIT_SHORT[landUnit] || landUnit}`, 'Land', landResult.totalValue, Number(landArea) || 0); setPropertySaved(true); setLastSavedId(id); }}
                                                    className="py-3 rounded-xl bg-brand-purple/20 border border-brand-purple/30 text-brand-purple text-xs font-bold"
                                                >
                                                    {t('property.save')}
                                                </button>
                                            )}
                                            <div className="grid grid-cols-2 gap-1">
                                                <button onClick={handleExportPDF} className="py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold">
                                                    📄 PDF
                                                </button>
                                                <button onClick={handleExportExcel} className="py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold">
                                                    📊 XLSX
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Stamp Duty Calculator */}
                                <StampDutySection
                                    sdValue={sdValue} setSdValue={setSdValue}
                                    sdState={sdState} setSdState={setSdState}
                                    sdStampPct={sdStampPct} setSdStampPct={setSdStampPct}
                                    sdRegPct={sdRegPct} setSdRegPct={setSdRegPct}
                                    sdTransferPct={sdTransferPct} setSdTransferPct={setSdTransferPct}
                                    sdResult={sdResult} calculateSD={calculateSD}
                                    onDownloadPDF={handleStampDutyPDF}
                                />

                                {/* Home Loan EMI */}
                                <HomeLoanSection
                                    loanAmt={loanAmt} setLoanAmt={setLoanAmt}
                                    loanRate={loanRate} setLoanRate={setLoanRate}
                                    loanTenure={loanTenure} setLoanTenure={setLoanTenure}
                                    emiResult={emiResult} calculateEMI={calculateEMI}
                                    onDownloadPDF={handleHomeLoanPDF}
                                    showAmortization={showAmortization} setShowAmortization={setShowAmortization}
                                    getAmortization={getAmortizationSchedule}
                                />
                            </div>
                        )}

                        {/* ══ FLAT / APARTMENT TAB ══════════════════════════════════ */}
                        {mode === 'flat' && (
                            <div className="space-y-4">
                                <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                                    <h3 className="text-foreground font-semibold text-sm flex items-center gap-2">
                                        <Building2 size={15} className="text-brand-green" /> {t('property.flatApartmentPrice')}
                                    </h3>
                                    <Field label={t('property.builtUpArea')} value={builtUp} onChange={setBuiltUp} type="number" placeholder="e.g. 1200" />
                                    <Field label={t('property.carpetAreaOptional')} value={carpet} onChange={setCarpet} type="number" placeholder="e.g. 900" />
                                    <Field label={t('property.pricePerSqft')} value={ppsf} onChange={setPpsf} type="number" prefix="₹" placeholder="e.g. 7000" />
                                    <div className="grid grid-cols-3 gap-2">
                                        <Field label={t('property.parking')} value={parking} onChange={setParking} type="number" prefix="₹" placeholder="0" />
                                        <Field label={t('property.amenities')} value={amenities} onChange={setAmenities} type="number" prefix="₹" placeholder="0" />
                                        <Field label={t('property.maintenance')} value={maint} onChange={setMaint} type="number" prefix="₹" placeholder="0" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground mb-2 block">{t('property.gstRate')}</label>
                                        <div className="flex gap-2">
                                            {['5', '12', '18', '28'].map(g => (
                                                <button key={g} onClick={() => setGstPct(g)}
                                                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${gstPct === g ? 'bg-brand-green text-black' : 'bg-dark-bg border border-border text-muted-foreground'}`}>
                                                    {g}%
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <motion.button whileTap={{ scale: 0.97 }} onClick={calculateFlat}
                                    className="w-full py-4 bg-gradient-to-r from-brand-green to-emerald-500 text-black font-bold rounded-xl">
                                    {t('property.calculatePropertyCost')}
                                </motion.button>

                                {flatResult && (
                                    <motion.div ref={resultRef} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                                        {/* Breakdown card */}
                                        <div className="bg-card z-[60] relative border border-border rounded-2xl p-4 space-y-2.5 overflow-hidden shadow-2xl">
                                            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">{t('property.costBreakdown')}</p>
                                            <CostRow label={`${t('property.basePrice')} (${builtUp} × ${fmt(Number(ppsf))})`} value={flatResult.basePrice} />
                                            {flatResult.parkingAmt > 0 && <CostRow label={t('property.parkingCharges')} value={flatResult.parkingAmt} />}
                                            {flatResult.amenitiesAmt > 0 && <CostRow label={t('property.clubAmenities')} value={flatResult.amenitiesAmt} />}
                                            {flatResult.maintAmt > 0 && <CostRow label={t('property.maintenanceDeposit')} value={flatResult.maintAmt} />}
                                            <div className="border-t border-slate-700 pt-2">
                                                <CostRow label={t('property.subtotal')} value={flatResult.subtotal} />
                                            </div>
                                            <CostRow label={`${t('property.gst')} (${gstPct}%)`} value={flatResult.gstAmt} accent="text-yellow-400" />
                                            <div className="border-t border-brand-green/30 pt-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-foreground text-sm font-bold">{t('property.totalPropertyCost')}</span>
                                                    <span className="text-brand-green text-xl font-extrabold">{fmt(flatResult.totalCost)}</span>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => copyResult(flatResult.totalCost, t('property.flatTotalPrice'))}
                                                className="absolute top-2 right-2 p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                                            >
                                                {copied === 'res-copy' ? <Check size={14} /> : <Copy size={14} />}
                                            </button>
                                        </div>

                                        {/* Carpet vs Builtup efficiency */}
                                        {carpet && Number(carpet) > 0 && (
                                            <div className="bg-card border border-border rounded-2xl p-4">
                                                <p className="text-muted-foreground text-xs mb-2">{t('property.carpetEfficiency')}</p>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${Math.min((Number(carpet) / Number(builtUp)) * 100, 100)}%` }}
                                                            transition={{ duration: 0.6 }}
                                                            className="h-full bg-brand-green rounded-full"
                                                        />
                                                    </div>
                                                    <span className="text-brand-green font-bold text-sm">
                                                        {((Number(carpet) / Number(builtUp)) * 100).toFixed(0)}%
                                                    </span>
                                                </div>
                                                <p className="text-muted-foreground text-xs mt-1">{t('property.carpetOfBuiltUp', { carpet, builtUp })}</p>
                                                {flatResult && (
                                                    <div className="mt-2 pt-2 border-t border-border/50 flex justify-between items-center">
                                                        <span className="text-muted-foreground text-xs">{t('property.effectiveRatePerCarpetSqft')}</span>
                                                        <span className="text-brand-green font-bold text-sm">{fmt(flatResult.totalCost / Number(carpet))}/{t('property.sqft')}</span>
                                                    </div>
                                                )}
                                                {/* Loading truth check — RERA sells on carpet; typical loading 25-40% */}
                                                {(() => {
                                                    const loading = (Number(builtUp) - Number(carpet)) / Number(carpet) * 100;
                                                    if (!Number.isFinite(loading) || loading < 0) return null;
                                                    const high = loading > 40, ok = loading <= 30;
                                                    return (
                                                        <p className={`text-[10px] mt-1.5 leading-relaxed font-medium ${high ? 'text-red-500' : ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                                            {t('property.loadingCheck', 'Loading: {{loading}}% — you pay for {{loading}}% more area than you get. Market range is 25-40% (RERA requires selling on carpet area).', { loading: loading.toFixed(0) })}
                                                        </p>
                                                    );
                                                })()}
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-2">
                                            {propertySaved ? (
                                                <div className="flex gap-1">
                                                    <div className="flex-1 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold flex items-center justify-center gap-1">
                                                        <Check size={14} /> {t('common.saved')}
                                                    </div>
                                                    <button onClick={handlePropertyRemove} className="px-3 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold flex items-center justify-center active:scale-95">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button onClick={() => { const id = Date.now().toString(); addSaved({ id, calculatorType: t('property.flatPrice'), inputValues: { builtUp, carpet, ppsf, parking, amenities, maint, gstPct }, resultValues: { primary: flatResult.totalCost }, timestamp: Date.now() }); trackProperty(id, `${t('property.flatPrice')} • ${builtUp} sqft`, 'Flat', flatResult.totalCost, Number(builtUp) || 0); setPropertySaved(true); setLastSavedId(id); }}
                                                    className="py-3 rounded-xl bg-brand-purple/20 border border-brand-purple/30 text-brand-purple text-xs font-bold">{t('property.save')}</button>
                                            )}
                                            <div className="grid grid-cols-2 gap-1">
                                                <button onClick={handleExportPDF} className="py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold">📄 PDF</button>
                                                <button onClick={handleExportExcel} className="py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold">📊 XLSX</button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Stamp Duty + EMI on flat tab too */}
                                <StampDutySection sdValue={sdValue} setSdValue={setSdValue} sdState={sdState} setSdState={setSdState} sdStampPct={sdStampPct} setSdStampPct={setSdStampPct} sdRegPct={sdRegPct} setSdRegPct={setSdRegPct} sdTransferPct={sdTransferPct} setSdTransferPct={setSdTransferPct} sdResult={sdResult} calculateSD={calculateSD} onDownloadPDF={handleStampDutyPDF} />
                                <HomeLoanSection loanAmt={loanAmt} setLoanAmt={setLoanAmt} loanRate={loanRate} setLoanRate={setLoanRate} loanTenure={loanTenure} setLoanTenure={setLoanTenure} emiResult={emiResult} calculateEMI={calculateEMI} onDownloadPDF={handleHomeLoanPDF} showAmortization={showAmortization} setShowAmortization={setShowAmortization} getAmortization={getAmortizationSchedule} />
                            </div>
                        )}

                        {/* ══ VILLA / INDEPENDENT HOUSE TAB ══════════════════════════ */}
                        {mode === 'villa' && (
                            <div className="space-y-4">
                                <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                                    <h3 className="text-foreground font-semibold text-sm flex items-center gap-2">
                                        <Landmark size={15} className="text-brand-green" /> {t('property.villaIndependentHouse')}
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Field label={t('property.plotArea')} value={villaPlotArea} onChange={setVillaPlotArea} type="number" placeholder="e.g. 2400" />
                                        <div>
                                            <label className="text-xs text-muted-foreground mb-1 block">{t('property.plotUnit')}</label>
                                            <select value={villaPlotUnit} onChange={e => setVillaPlotUnit(e.target.value)}
                                                className="w-full bg-dark-bg border border-border rounded-xl py-3 px-3 text-foreground text-sm focus:outline-none focus:border-brand-green">
                                                {['sqft', 'sqyard', 'sqm'].map((u: string) => <option key={u} value={u}>{UNIT_SHORT_LABELS[u]}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mt-2">{t('property.builtUpAreaSqft')}</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        <Field label={t('property.groundFloor')} value={groundFloor} onChange={setGroundFloor} type="number" placeholder="1200" />
                                        <Field label={t('property.firstFloor')} value={firstFloor} onChange={setFirstFloor} type="number" placeholder="800" />
                                        <Field label={t('property.secondFloor')} value={secondFloor} onChange={setSecondFloor} type="number" placeholder="0" />
                                    </div>

                                    <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mt-2">{t('property.constructionGrade')}</p>
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {CONSTRUCTION_GRADES.map((g: any) => (
                                            <button key={g.key} onClick={() => { setConstGrade(g.key); setConstRate(g.rate.toString()); }}
                                                className={`py-2 rounded-lg text-[10px] font-semibold transition-all ${constGrade === g.key ? 'bg-brand-green text-black' : 'bg-dark-bg border border-border text-muted-foreground'}`}>
                                                {g.label}
                                            </button>
                                        ))}
                                    </div>
                                    <Field label={t('property.ratePerSqftEditable')} value={constRate} onChange={setConstRate} type="number" prefix="₹" />

                                    <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mt-2">{t('property.compoundWall')}</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Field label={t('property.perimeterFeet')} value={wallPerimeter} onChange={setWallPerimeter} type="number" placeholder="200" />
                                        <Field label={t('property.ratPerFt')} value={wallRate} onChange={setWallRate} type="number" prefix="₹" />
                                    </div>

                                    <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mt-2">{t('property.overheadPercent')}</p>
                                    {[
                                        { label: t('property.electrical'), val: ohElectrical, set: setOhElectrical },
                                        { label: t('property.plumbing'), val: ohPlumbing, set: setOhPlumbing },
                                        { label: t('property.interior'), val: ohInterior, set: setOhInterior },
                                        { label: t('property.miscellaneous'), val: ohMisc, set: setOhMisc },
                                    ].map(oh => (
                                        <div key={oh.label} className="flex items-center gap-3">
                                            <span className="text-muted-foreground text-xs w-24">{oh.label}</span>
                                            <input type="range" min={0} max={25} step={1} value={oh.val} onChange={e => oh.set(Number(e.target.value))}
                                                className="flex-1 accent-brand-green h-1" />
                                            <span className="text-brand-green font-bold text-xs w-8 text-right">{oh.val}%</span>
                                        </div>
                                    ))}
                                </div>

                                <motion.button whileTap={{ scale: 0.97 }} onClick={calculateVilla}
                                    className="w-full py-4 bg-gradient-to-r from-brand-green to-emerald-500 text-black font-bold rounded-xl">
                                    {t('property.calculateConstructionCost')}
                                </motion.button>

                                {villaResult && (
                                    <motion.div ref={resultRef} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                                        {/* Floor-wise breakdown */}
                                        <div className="bg-card border border-border rounded-2xl p-4">
                                            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-3">{t('property.floorWiseCost')}</p>
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="text-muted-foreground border-b border-border">
                                                        <th className="py-2 text-left font-medium">{t('property.floor')}</th>
                                                        <th className="py-2 text-right font-medium">{t('property.areaSqft')}</th>
                                                        <th className="py-2 text-right font-medium">{t('property.cost')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {villaResult.floors.map((f: any) => (
                                                        <tr key={f.name} className="border-b border-border/30">
                                                            <td className="py-2.5 text-foreground font-medium">{f.name}</td>
                                                            <td className="py-2.5 text-right text-slate-600 dark:text-slate-300">{f.area.toLocaleString('en-IN')}</td>
                                                            <td className="py-2.5 text-right text-brand-green font-medium">{fmt(f.cost)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Overhead breakdown */}
                                        <div className="bg-card z-[60] relative border border-border rounded-2xl p-4 space-y-2 overflow-hidden shadow-2xl">
                                            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">{t('property.costBreakdown')}</p>
                                            <CostRow label={t('property.construction')} value={villaResult.constructionCost} />
                                            {villaResult.wallCost > 0 && <CostRow label={t('property.compoundWall')} value={villaResult.wallCost} />}
                                            <CostRow label={`${t('property.electrical')} (${ohElectrical}%)`} value={villaResult.electrical} accent="text-yellow-400" />
                                            <CostRow label={`${t('property.plumbing')} (${ohPlumbing}%)`} value={villaResult.plumbing} accent="text-blue-400" />
                                            <CostRow label={`${t('property.interior')} (${ohInterior}%)`} value={villaResult.interior} accent="text-brand-purple" />
                                            <CostRow label={`${t('property.miscellaneous')} (${ohMisc}%)`} value={villaResult.misc} accent="text-slate-600 dark:text-slate-300" />
                                            <div className="border-t border-brand-green/30 pt-2 mt-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-foreground text-sm font-bold">{t('property.totalConstructionCost')}</span>
                                                    <span className="text-brand-green text-xl font-extrabold">{fmt(villaResult.totalCost)}</span>
                                                </div>
                                                <p className="text-muted-foreground text-xs mt-1 text-right">₹{villaResult.costPerSqft.toLocaleString('en-IN')} / {t('property.sqft')}</p>
                                            </div>
                                            <button 
                                                onClick={() => copyResult(villaResult.totalCost, t('property.villaCost'))}
                                                className="absolute top-2 right-2 p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                                            >
                                                {copied === 'res-copy' ? <Check size={14} /> : <Copy size={14} />}
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            {propertySaved ? (
                                                <div className="flex gap-1">
                                                    <div className="flex-1 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold flex items-center justify-center gap-1">
                                                        <Check size={14} /> {t('common.saved')}
                                                    </div>
                                                    <button onClick={handlePropertyRemove} className="px-3 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold flex items-center justify-center active:scale-95">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button onClick={() => { const id = Date.now().toString(); addSaved({ id, calculatorType: t('property.villaConstruction'), inputValues: { groundFloor, firstFloor, secondFloor, constRate }, resultValues: { primary: villaResult.totalCost }, timestamp: Date.now() }); trackProperty(id, `${t('property.villaConstruction')} • ${(Number(groundFloor) || 0) + (Number(firstFloor) || 0) + (Number(secondFloor) || 0)} sqft`, 'Villa', villaResult.totalCost, (Number(groundFloor) || 0) + (Number(firstFloor) || 0) + (Number(secondFloor) || 0)); setPropertySaved(true); setLastSavedId(id); }}
                                                    className="py-3 rounded-xl bg-brand-purple/20 border border-brand-purple/30 text-brand-purple text-xs font-bold">{t('property.save')}</button>
                                            )}
                                            <div className="grid grid-cols-2 gap-1">
                                                <button onClick={handleVillaPDF} className="py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold">📄 PDF</button>
                                                <button onClick={handleVillaExcel} className="py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold">📊 XLSX</button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Stamp Duty + EMI on villa tab */}
                                <StampDutySection sdValue={sdValue} setSdValue={setSdValue} sdState={sdState} setSdState={setSdState} sdStampPct={sdStampPct} setSdStampPct={setSdStampPct} sdRegPct={sdRegPct} setSdRegPct={setSdRegPct} sdTransferPct={sdTransferPct} setSdTransferPct={setSdTransferPct} sdResult={sdResult} calculateSD={calculateSD} onDownloadPDF={handleStampDutyPDF} />
                                <HomeLoanSection loanAmt={loanAmt} setLoanAmt={setLoanAmt} loanRate={loanRate} setLoanRate={setLoanRate} loanTenure={loanTenure} setLoanTenure={setLoanTenure} emiResult={emiResult} calculateEMI={calculateEMI} onDownloadPDF={handleHomeLoanPDF} showAmortization={showAmortization} setShowAmortization={setShowAmortization} getAmortization={getAmortizationSchedule} />
                            </div>
                        )}

                        {/* ══ CONVERT / REFERENCE TAB ═══════════════════════════════ */}
                        {mode === 'convert' && (
                            <div className="space-y-4">
                                {/* Converter */}
                                <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                                    <h3 className="text-foreground font-semibold text-sm flex items-center gap-2">
                                        <ArrowRightLeft size={15} className="text-brand-green" /> {t('property.unitConverter')}
                                    </h3>
                                    <Field label={t('property.value')} value={convVal} onChange={setConvVal} type="number" placeholder="e.g. 1" />
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs text-muted-foreground mb-1 block">{t('property.from')}</label>
                                            <select value={fromUnit} onChange={e => setFromUnit(e.target.value)}
                                                className="w-full bg-dark-bg border border-border rounded-xl py-3 px-3 text-foreground text-sm focus:outline-none focus:border-brand-green">
                                                {UNIT_KEYS.map(u => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs text-muted-foreground mb-1 block">{t('property.to')}</label>
                                            <select value={toUnit} onChange={e => setToUnit(e.target.value)}
                                                className="w-full bg-dark-bg border border-border rounded-xl py-3 px-3 text-foreground text-sm focus:outline-none focus:border-brand-green">
                                                {UNIT_KEYS.map(u => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    {convVal && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                            className="p-4 rounded-xl bg-gradient-to-r from-brand-green/10 to-brand-blue/10 border border-brand-green/30 text-center">
                                            <p className="text-muted-foreground text-xs mb-1">{convVal} {UNIT_LABELS[fromUnit]} =</p>
                                            <p className="text-2xl font-bold text-brand-green">{convertedVal()}</p>
                                            <p className="text-muted-foreground text-xs mt-1">{UNIT_LABELS[toUnit]}</p>
                                            <button
                                                onClick={() => copyText(`${convVal} ${UNIT_LABELS[fromUnit]} = ${convertedVal()} ${UNIT_LABELS[toUnit]}`, 'conv')}
                                                className="mt-3 flex items-center gap-1 text-xs text-muted-foreground mx-auto"
                                            >
                                                {copied === 'conv' ? <Check size={12} className="text-brand-green" /> : <Copy size={12} />}
                                                {copied === 'conv' ? t('property.copied') : t('property.copy')}
                                            </button>
                                        </motion.div>
                                    )}
                                </div>

                                {/* Quick Reference Table */}
                                <div className="bg-card border border-border rounded-2xl p-4">
                                    <h3 className="text-foreground font-semibold text-sm mb-1">{t('property.quickReference')}</h3>
                                    <p className="text-muted-foreground text-xs mb-3">{t('property.tapToCopy')}</p>
                                    <div className="space-y-0">
                                        {REF_UNITS.map((u: string) => {
                                            const sqftVal = UNIT_CONV[u].toLocaleString('en-IN');
                                            const copyKey = `ref-${u}`;
                                            return (
                                                <motion.button
                                                    key={u}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => copyText(`1 ${UNIT_LABELS[u]} = ${sqftVal} ${t('property.sqft')}`, copyKey)}
                                                    className="w-full flex justify-between items-center py-3 border-b border-border last:border-0 text-left"
                                                >
                                                    <span className="text-muted-foreground text-sm">1 {UNIT_LABELS[u]}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-foreground text-sm font-semibold">{sqftVal} {t('property.sqft')}</span>
                                                        {copied === copyKey
                                                            ? <Check size={13} className="text-brand-green" />
                                                            : <Copy size={12} className="text-slate-600" />
                                                        }
                                                    </div>
                                                </motion.button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* All conversions from sq.ft */}
                                <div className="bg-card border border-border rounded-2xl p-4">
                                    <h3 className="text-foreground font-semibold text-sm mb-3">{t('property.completeConversionChart')}</h3>
                                    <p className="text-muted-foreground text-[10px] mb-2">{t('property.fromToSqft')}</p>
                                    <div className="space-y-1">
                                        {UNIT_KEYS.map(u => {
                                            const sqftVal = UNIT_CONV[u];
                                            const display = sqftVal >= 1000
                                                ? sqftVal.toLocaleString('en-IN')
                                                : sqftVal.toLocaleString('en-IN', { maximumFractionDigits: 4 });
                                            return (
                                                <div key={u} className="flex justify-between py-1.5 border-b border-border/60 last:border-0">
                                                    <span className="text-muted-foreground text-xs">1 {UNIT_LABELS[u]}</span>
                                                    <span className="text-foreground text-xs font-medium">{display} {t('property.sqft')}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* ── Rental Yield & Appreciation (hidden on Convert tab) ───────── */}
                {mode !== 'convert' && (
                    <>
                        <RentVsBuySection />
                        <div className="mt-6 bg-card border border-border rounded-2xl p-4 space-y-3">
                            <h3 className="font-bold text-foreground text-sm flex items-center gap-2">📊 {t('property.rentalYieldEstimation')}</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label={t('property.propertyValue')} value={ryPropertyValue} onChange={setRyPropertyValue} prefix="₹" type="number" />
                                <Field label={t('property.monthlyRent')} value={ryMonthlyRent} onChange={setRyMonthlyRent} prefix="₹" type="number" />
                                <Field label={t('property.monthlyMaintenance')} value={ryMaintenance} onChange={setRyMaintenance} prefix="₹" type="number" />
                                <Field label={t('property.vacantMonthsYear')} value={ryVacancy} onChange={setRyVacancy} type="number" />
                            </div>
                            <motion.button whileTap={{ scale: 0.97 }} onClick={calculateRentalYield}
                                className="w-full py-3 bg-brand-green text-white font-bold rounded-xl text-sm shadow-lg shadow-brand-green/20">
                                {t('property.calculateYield')}
                            </motion.button>
                            {ryResult && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 mt-2">
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { label: t('property.annualRentIncome'), value: fmt(ryResult.annualRent), color: 'text-brand-green' },
                                            { label: t('property.grossYield'), value: `${ryResult.grossYield.toFixed(2)}%`, color: 'text-blue-400' },
                                            { label: t('property.netYield'), value: `${ryResult.netYield.toFixed(2)}%`, color: 'text-brand-gold' },
                                            { label: t('property.paybackPeriod'), value: ryResult.paybackYears !== null ? `${ryResult.paybackYears.toFixed(1)} ${t('property.yrs')}` : '—', color: 'text-brand-purple' },
                                        ].map(s => (
                                            <div key={s.label} className="text-center p-3 rounded-xl bg-slate-100 dark:bg-slate-800/30">
                                                <p className="text-muted-foreground text-[9px] uppercase font-bold">{s.label}</p>
                                                <p className={`font-bold text-sm mt-1 ${s.color}`}>{s.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                    {ryResult.paybackYears === null && (
                                        <p className="text-red-400 text-[10px] font-medium text-center">
                                            {t('property.negativeCashFlowNote', 'Maintenance exceeds rental income — negative cash flow, so the property never pays back from rent alone.')}
                                        </p>
                                    )}
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={handleRentalYieldPDF}
                                            className="py-3 rounded-xl bg-brand-green/10 border border-brand-green/30 text-brand-green text-xs font-bold flex items-center justify-center gap-1.5">
                                            <Download size={14} /> PDF
                                        </button>
                                        <button onClick={handleRentalYieldExcel}
                                            className="py-3 rounded-xl bg-brand-green/10 border border-brand-green/30 text-brand-green text-xs font-bold flex items-center justify-center gap-1.5">
                                            <Download size={14} /> Excel
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        <div className="mt-4 bg-card border border-border rounded-2xl p-4 space-y-3 mb-10">
                            <h3 className="font-bold text-foreground text-sm flex items-center gap-2">📈 {t('property.appreciationForecast')}</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label={t('property.currentPropertyValue')} value={apCurrentValue} onChange={setApCurrentValue} prefix="₹" type="number" />
                                <Field label={t('property.annualAppreciationPercent')} value={apRate} onChange={setApRate} suffix="%" type="number" />
                            </div>
                            <motion.button whileTap={{ scale: 0.97 }} onClick={calculateAppreciation}
                                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-indigo-600/20">
                                {t('property.forecastValue')}
                            </motion.button>
                            {apResult && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 mt-2">
                                    {apResult.projections.map((p: { years: number; value: number; gain: number }) => (
                                        <div key={p.years} className="flex justify-between items-center p-3 rounded-xl bg-slate-100 dark:bg-slate-800/30">
                                            <div>
                                                <p className="text-foreground font-bold text-sm">{p.years} {t('property.years')}</p>
                                                <p className="text-muted-foreground text-[10px]">{t('property.gain')}: {fmt(p.gain)}</p>
                                            </div>
                                            <p className="text-brand-green font-extrabold text-sm">{fmt(p.value)}</p>
                                        </div>
                                    ))}
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        <button onClick={handleAppreciationPDF}
                                            className="py-3 rounded-xl bg-indigo-600/10 border border-indigo-600/30 text-indigo-400 text-xs font-bold flex items-center justify-center gap-1.5">
                                            <Download size={14} /> PDF
                                        </button>
                                        <button onClick={handleAppreciationExcel}
                                            className="py-3 rounded-xl bg-indigo-600/10 border border-indigo-600/30 text-indigo-400 text-xs font-bold flex items-center justify-center gap-1.5">
                                            <Download size={14} /> Excel
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}




// ─── Stamp Duty Section ───────────────────────────────────────────────────────
// ─── Rent vs Buy Analyzer ─────────────────────────────────────────────────────
// The 2026 buyer's first question, and the one no Indian portal answers well.
// Wealth comparison after H years: BUYER ends with (house value − loan balance)
// having paid down payment + transaction costs + EMIs; RENTER invests the same
// upfront money plus every month's (EMI − rent) difference at the investment
// return, paying rent that inflates yearly. Break-even = first year the buyer's
// net wealth overtakes the renter's portfolio.
function RentVsBuySection() {
    const { t } = useTranslation();
    const [price, setPrice] = useState('6000000');
    const [rent, setRent] = useState('18000');
    const [downPct, setDownPct] = useState('20');
    const [rvbRate, setRvbRate] = useState('7.5');
    const [rvbTenure, setRvbTenure] = useState('20');
    const [horizon, setHorizon] = useState('10');
    const [appn, setAppn] = useState('6.5');
    const [rentInfl, setRentInfl] = useState('5');
    const [invReturn, setInvReturn] = useState('12');
    const [txnPct, setTxnPct] = useState('8');

    const res = useMemo(() => {
        const P = Number(price), R0 = Number(rent);
        if (!(P > 0) || !(R0 > 0)) return null;
        const down = P * (Number(downPct) || 0) / 100;
        const txn = P * (Number(txnPct) || 0) / 100;
        const loan = Math.max(0, P - down);
        const r = (Number(rvbRate) || 0) / 1200;
        const n = Math.max(12, (Number(rvbTenure) || 20) * 12);
        const pow = Math.pow(1 + r, n);
        const emi = loan > 0 && r > 0 ? loan * r * pow / (pow - 1) : loan / n;
        const H = Math.max(1, Math.min(30, Number(horizon) || 10));
        const g = (Number(appn) || 0) / 100;
        const ri = (Number(rentInfl) || 0) / 100;
        const iv = (Number(invReturn) || 0) / 1200;

        let bal = loan;
        let portfolio = down + txn; // renter invests the buyer's upfront cash
        let rentNow = R0;
        let breakEvenYear: number | null = null;
        for (let m = 1; m <= H * 12; m++) {
            let outgoBuy = 0;
            if (bal > 0.5) {
                const int = bal * r;
                bal = Math.max(0, bal + int - emi);
                outgoBuy = emi;
            }
            portfolio = portfolio * (1 + iv) + (outgoBuy - rentNow);
            if (m % 12 === 0) {
                rentNow = rentNow * (1 + ri);
                const wealthBuyY = P * Math.pow(1 + g, m / 12) - bal;
                if (breakEvenYear === null && wealthBuyY > portfolio) breakEvenYear = m / 12;
            }
        }
        const wealthBuy = Math.round(P * Math.pow(1 + g, H) - bal);
        const wealthRent = Math.round(portfolio);
        return {
            emi: Math.round(emi), H, breakEvenYear, wealthBuy, wealthRent,
            buyWins: wealthBuy > wealthRent, diff: Math.abs(wealthBuy - wealthRent),
        };
    }, [price, rent, downPct, rvbRate, rvbTenure, horizon, appn, rentInfl, invReturn, txnPct]);

    return (
        <div className="mt-6 bg-card border border-border rounded-2xl p-4 space-y-3">
            <h3 className="font-bold text-foreground text-sm flex items-center gap-2">⚖️ {t('property.rvbTitle', 'Rent vs Buy — which builds more wealth?')}</h3>
            <div className="grid grid-cols-2 gap-3">
                <Field label={t('property.rvbPrice', 'Property price')} value={price} onChange={setPrice} prefix="₹" type="number" />
                <Field label={t('property.rvbRent', 'Rent for a similar home')} value={rent} onChange={setRent} prefix="₹" type="number" suffix={t('property.perMonth', '/mo')} />
                <Field label={t('property.rvbDown', 'Down payment')} value={downPct} onChange={setDownPct} suffix="%" type="number" />
                <Field label={t('property.rvbHorizon', 'Compare over (years)')} value={horizon} onChange={setHorizon} type="number" />
                <Field label={t('property.rvbLoanRate', 'Loan rate')} value={rvbRate} onChange={setRvbRate} suffix="%" type="number" />
                <Field label={t('property.rvbTenure', 'Loan tenure (yrs)')} value={rvbTenure} onChange={setRvbTenure} type="number" />
            </div>
            {/* Assumptions — every number editable, nothing hidden */}
            <div className="grid grid-cols-2 gap-3">
                <Field label={t('property.rvbAppn', 'Price appreciation %/yr')} value={appn} onChange={setAppn} suffix="%" type="number" />
                <Field label={t('property.rvbRentInfl', 'Rent increase %/yr')} value={rentInfl} onChange={setRentInfl} suffix="%" type="number" />
                <Field label={t('property.rvbInv', 'Investment return %/yr')} value={invReturn} onChange={setInvReturn} suffix="%" type="number" />
                <Field label={t('property.rvbTxn', 'Buying costs (stamp+reg+misc)')} value={txnPct} onChange={setTxnPct} suffix="%" type="number" />
            </div>

            {res && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 pt-1">
                    <div className={`p-4 rounded-xl text-center border ${res.buyWins ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-sky-500/10 border-sky-500/30'}`}>
                        <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-1">
                            {t('property.rvbVerdict', 'After {{h}} years', { h: res.H })}
                        </p>
                        <p className={`text-lg font-extrabold ${res.buyWins ? 'text-emerald-600 dark:text-emerald-400' : 'text-sky-600 dark:text-sky-400'}`}>
                            {res.buyWins
                                ? t('property.rvbBuyWins', 'Buying builds {{diff}} more wealth', { diff: fmt(res.diff) })
                                : t('property.rvbRentWins', 'Renting + investing stays {{diff}} ahead', { diff: fmt(res.diff) })}
                        </p>
                        <p className="text-muted-foreground text-[11px] mt-1">
                            {res.breakEvenYear
                                ? t('property.rvbBreakEven', 'Buying overtakes renting in year {{y}}', { y: res.breakEvenYear })
                                : t('property.rvbNoBreakEven', 'Buying does not overtake renting within {{h}} years at these assumptions', { h: res.H })}
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center">
                            <p className="text-muted-foreground text-[9px] uppercase font-bold mb-1">{t('property.rvbBuyerWealth', 'Buyer net wealth')}</p>
                            <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400">{fmt(res.wealthBuy)}</p>
                            <p className="text-[9px] text-muted-foreground mt-0.5">{t('property.rvbBuyerNote', 'home value − loan balance · EMI {{emi}}', { emi: fmt(res.emi) })}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-sky-500/5 border border-sky-500/20 text-center">
                            <p className="text-muted-foreground text-[9px] uppercase font-bold mb-1">{t('property.rvbRenterWealth', 'Renter portfolio')}</p>
                            <p className="font-bold text-sm text-sky-600 dark:text-sky-400">{fmt(res.wealthRent)}</p>
                            <p className="text-[9px] text-muted-foreground mt-0.5">{t('property.rvbRenterNote', 'down payment + monthly difference, invested')}</p>
                        </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                        {t('property.rvbAssumptions', 'The renter invests the down payment, buying costs and every month\'s (EMI − rent) difference at the investment return. Excludes owner maintenance/property tax and rental deposits — adjust the assumptions to your city (typical: appreciation 4-9%, rent rise ~5%, equity ~11-12%).')}
                    </p>
                </motion.div>
            )}
        </div>
    );
}

function StampDutySection({
    sdValue, setSdValue,
    sdState, setSdState,
    sdStampPct, setSdStampPct,
    sdRegPct, setSdRegPct,
    sdTransferPct, setSdTransferPct,
    sdResult, calculateSD, onDownloadPDF
}: {
    sdValue: string; setSdValue: (v: string) => void;
    sdState: string; setSdState: (v: string) => void;
    sdStampPct: string; setSdStampPct: (v: string) => void;
    sdRegPct: string; setSdRegPct: (v: string) => void;
    sdTransferPct: string; setSdTransferPct: (v: string) => void;
    sdResult: { stamp: number; reg: number; transfer: number; total: number } | null;
    calculateSD: () => void;
    onDownloadPDF: () => void;
}) {
    const { t } = useTranslation();
    // Woman-buyer concession: several states charge women a lower stamp %.
    // Toggling re-applies the state's prefill with the delta subtracted, so
    // the fields stay editable and transparent.
    const [isWoman, setIsWoman] = useState(false);
    const applyRates = (key: string, woman: boolean) => {
        const r = STATE_RATES[key];
        const stamp = woman && r.womenStampDelta ? Math.max(0, r.stamp - r.womenStampDelta) : r.stamp;
        setSdStampPct(stamp.toString());
        setSdRegPct(r.reg.toString());
        setSdTransferPct(r.transfer.toString());
    };
    const handleStateChange = (key: string) => {
        setSdState(key);
        applyRates(key, isWoman);
    };
    const handleWomanToggle = () => {
        const next = !isWoman;
        setIsWoman(next);
        applyRates(sdState, next);
    };
    const womenDelta = STATE_RATES[sdState]?.womenStampDelta;

    return (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-foreground font-semibold text-sm flex items-center gap-2">
                    <FileText size={15} className="text-yellow-400" /> {t('property.stampDutyCalculator')}
                </h3>
                <span className="text-[10px] text-yellow-400/70 bg-yellow-400/10 rounded px-1.5 py-0.5">{t('property.ratesEditable')}</span>
            </div>

            {/* Disclaimer note */}
            <div className="p-2.5 bg-amber-100/40 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-400/20 rounded-lg">
                <p className="text-amber-900 dark:text-amber-300/80 text-[10px] leading-relaxed font-medium">
                    {t('property.stampDutyDisclaimer')}
                </p>
            </div>

            <Field label={t('property.propertyValueRupees')} value={sdValue} onChange={setSdValue} type="number" prefix="₹" placeholder="e.g. 5000000" />
            {/* Circle-rate basis — the legal base is max(deal value, circle rate) */}
            <p className="text-[10px] text-muted-foreground leading-relaxed -mt-1">
                {t('property.circleRateHint', 'Stamp duty is legally charged on the HIGHER of your deal value and the government circle/guidance value — enter the higher figure. If your deal price is >10% below circle rate, the gap is taxable for both sides (Sec 56(2)(x)/50C).')}
            </p>

            {/* State selector */}
            <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t('property.statePreFills')}</label>
                <select value={sdState} onChange={e => handleStateChange(e.target.value)}
                    className="w-full bg-dark-bg border border-border rounded-xl py-3 px-3 text-foreground text-sm focus:outline-none focus:border-brand-green">
                    {Object.entries(STATE_RATES).map(([k, v]) => (
                        <option key={k} value={k}>{v.name}</option>
                    ))}
                </select>
            </div>

            {/* Woman-buyer concession toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-pink-500/5 border border-pink-500/20">
                <div className="pr-2">
                    <p className="text-foreground text-xs font-semibold">{t('property.womanBuyer', 'Woman buyer')}</p>
                    <p className="text-[10px] text-muted-foreground leading-snug">
                        {womenDelta
                            ? t('property.womanBuyerHas', '{{state}} charges women {{delta}}% lower stamp duty (value caps may apply)', { state: STATE_RATES[sdState]?.name, delta: womenDelta })
                            : t('property.womanBuyerNone', 'No gender concession in {{state}}', { state: STATE_RATES[sdState]?.name })}
                    </p>
                </div>
                <button onClick={handleWomanToggle} className={`w-11 h-6 rounded-full p-0.5 transition-colors flex-shrink-0 ${isWoman ? 'bg-pink-500' : 'bg-muted-foreground/30'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${isWoman ? 'translate-x-5' : ''}`} />
                </button>
            </div>

            {/* Editable rate fields */}
            <div className="grid grid-cols-3 gap-2">
                <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">{t('property.stampDutyPercent')}</label>
                    <div className="relative">
                        <input type="number" value={sdStampPct} onChange={e => setSdStampPct(e.target.value)}
                            className="w-full bg-dark-bg border border-yellow-400/30 rounded-xl py-3 pr-6 pl-3 text-foreground text-sm focus:outline-none focus:border-yellow-400" />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
                    </div>
                </div>
                <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">{t('property.regChargesPercent')}</label>
                    <div className="relative">
                        <input type="number" value={sdRegPct} onChange={e => setSdRegPct(e.target.value)}
                            className="w-full bg-dark-bg border border-yellow-400/30 rounded-xl py-3 pr-6 pl-3 text-foreground text-sm focus:outline-none focus:border-yellow-400" />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
                    </div>
                </div>
                <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">{t('property.transferDutyPercent')}</label>
                    <div className="relative">
                        <input type="number" value={sdTransferPct} onChange={e => setSdTransferPct(e.target.value)}
                            className="w-full bg-dark-bg border border-yellow-400/30 rounded-xl py-3 pr-6 pl-3 text-foreground text-sm focus:outline-none focus:border-yellow-400" />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
                    </div>
                </div>
            </div>

            <motion.button whileTap={{ scale: 0.97 }} onClick={calculateSD}
                className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-xl text-sm">
                {t('property.calculateRegistrationCost')}
            </motion.button>

            {sdResult && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 pt-1">
                    <CostRow label={`${t('property.stampDuty')} (${sdStampPct}%)`} value={sdResult.stamp} />
                    <CostRow label={`${t('property.registrationCharges')} (${sdRegPct}%)`} value={sdResult.reg} />
                    {sdResult.transfer > 0 && <CostRow label={`${t('property.transferDuty')} (${sdTransferPct}%)`} value={sdResult.transfer} />}
                    <div className="border-t border-yellow-400/30 pt-2 flex justify-between items-center">
                        <span className="text-foreground text-sm font-bold">{t('property.totalRegistrationCost')}</span>
                        <span className="text-yellow-400 text-lg font-extrabold">₹{Math.round(sdResult.total).toLocaleString('en-IN')}</span>
                    </div>
                    {/* TDS u/s 194-IA (Sec 393(1) under IT Act 2025) on ≥ ₹50L deals */}
                    {Number(sdValue) >= 5000000 && (
                        <div className="p-2.5 rounded-lg bg-sky-500/5 border border-sky-500/20">
                            <p className="text-[10px] text-sky-700 dark:text-sky-400 leading-relaxed font-medium">
                                {t('property.tdsNote', 'This deal is ≥ ₹50L: as the BUYER you must deduct {{tds}} (1% TDS u/s 194-IA — Sec 393(1) under the IT Act 2025) from payments to the seller and deposit it via Form 26QB within 30 days. TDS applies on the higher of deal value or stamp-duty value.', { tds: fmt(Math.round(Number(sdValue) * 0.01)) })}
                            </p>
                        </div>
                    )}
                    <button onClick={onDownloadPDF}
                        className="w-full py-3 rounded-xl bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-bold flex items-center justify-center gap-2 mt-3">
                        {t('property.downloadStampDutyReport')}
                    </button>
                </motion.div>
            )}
        </div>
    );
}

// ─── Home Loan EMI Section ────────────────────────────────────────────────────
function HomeLoanSection({
    loanAmt, setLoanAmt, loanRate, setLoanRate, loanTenure, setLoanTenure, emiResult, calculateEMI, onDownloadPDF,
    showAmortization, setShowAmortization, getAmortization
}: {
    loanAmt: string; setLoanAmt: (v: string) => void;
    loanRate: string; setLoanRate: (v: string) => void;
    loanTenure: string; setLoanTenure: (v: string) => void;
    emiResult: { emi: number; totalInterest: number; totalPayment: number } | null;
    calculateEMI: () => void;
    onDownloadPDF: () => void;
    showAmortization?: boolean;
    setShowAmortization?: (v: boolean) => void;
    getAmortization?: () => { year: number; principalPaid: number; interestPaid: number; balance: number }[];
}) {
    const { t } = useTranslation();
    const schedule = (showAmortization && getAmortization) ? getAmortization() : [];

    return (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <h3 className="text-foreground font-semibold text-sm flex items-center gap-2">
                <Home size={15} className="text-brand-purple" /> {t('property.homeLoanEMI')}
            </h3>
            <Field label={t('property.loanAmount')} value={loanAmt} onChange={setLoanAmt} type="number" prefix="₹" placeholder="e.g. 6000000" />
            <div className="grid grid-cols-2 gap-2">
                <Field label={t('property.interestRate')} value={loanRate} onChange={setLoanRate} type="number" suffix="%" placeholder="8.5" />
                <Field label={t('property.tenure')} value={loanTenure} onChange={setLoanTenure} type="number" suffix={` ${t('property.yrsShort')}`} placeholder="20" />
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={calculateEMI}
                className="w-full py-3 bg-brand-purple text-white font-bold rounded-xl text-sm shadow-lg shadow-brand-purple/20">
                {t('property.calculateEMI')}
            </motion.button>
            {emiResult && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="p-4 bg-brand-purple/10 border border-brand-purple/20 rounded-xl text-center mb-3">
                        <p className="text-muted-foreground text-xs mb-1">{t('property.monthlyEMI')}</p>
                        <p className="text-2xl font-extrabold text-brand-purple">₹{Math.round(emiResult.emi).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="space-y-2">
                        <CostRow label={t('property.principal')} value={Number(loanAmt)} />
                        <CostRow label={t('property.totalInterest')} value={emiResult.totalInterest} accent="text-red-400" />
                        <div className="border-t border-slate-700 pt-2">
                            <CostRow label={t('property.totalPayment')} value={emiResult.totalPayment} />
                        </div>
                    </div>

                    {setShowAmortization && (
                        <div className="mt-4 pt-4 border-t border-border">
                            <button
                                onClick={() => setShowAmortization(!showAmortization)}
                                className="flex items-center justify-between w-full py-2 group"
                            >
                                <span className="text-xs font-bold text-muted-foreground group-hover:text-brand-purple transition-colors">{t('property.viewAmortizationSchedule')}</span>
                                {showAmortization ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                            </button>

                            <AnimatePresence>
                                {showAmortization && schedule.length > 0 && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-x-auto mt-2"
                                    >
                                        <table className="w-full text-[10px] text-left">
                                            <thead>
                                                <tr className="text-muted-foreground border-b border-border">
                                                    <th className="py-2">{t('property.year')}</th>
                                                    <th className="py-2">{t('property.principal')}</th>
                                                    <th className="py-2">{t('property.interest')}</th>
                                                    <th className="py-2 text-right">{t('property.balance')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {schedule.map(row => (
                                                    <tr key={row.year} className="border-b border-border/30 last:border-0">
                                                        <td className="py-2 text-foreground">{row.year}</td>
                                                        <td className="py-2 text-muted-foreground">₹{Math.round(row.principalPaid).toLocaleString('en-IN')}</td>
                                                        <td className="py-2 text-muted-foreground">₹{Math.round(row.interestPaid).toLocaleString('en-IN')}</td>
                                                        <td className="py-2 text-brand-green font-medium text-right">₹{Math.round(row.balance).toLocaleString('en-IN')}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    <button onClick={onDownloadPDF}
                        className="w-full py-3 rounded-xl bg-brand-purple/10 border border-brand-purple/30 text-brand-purple text-xs font-bold flex items-center justify-center gap-2 mt-3">
                        {t('property.downloadEMIReport')}
                    </button>
                </motion.div>
            )}
        </div>
    );
}

// ─── Reusable Field ───────────────────────────────────────────────────────────
function Field({ label, value, onChange, type = 'text', prefix, suffix, placeholder }: {
    label: string; value: string; onChange: (v: string) => void;
    type?: string; prefix?: string; suffix?: string; placeholder?: string;
}) {
    return (
        <div>
            <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
            <div className="relative">
                {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{prefix}</span>}
                <input
                    type={type}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={`w-full bg-dark-bg border border-border rounded-xl py-3 text-foreground text-sm focus:outline-none focus:border-brand-green transition-colors ${prefix ? 'pl-8 pr-4' : suffix ? 'pl-4 pr-8' : 'px-4'}`}
                />
                {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{suffix}</span>}
            </div>
        </div>
    );
}

// ─── Cost Row ─────────────────────────────────────────────────────────────────
function CostRow({ label, value, accent }: { label: string; value: number; accent?: string }) {
    return (
        <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-xs">{label}</span>
            <span className={`font-semibold text-sm ${accent || 'text-foreground'}`}>
                ₹{Math.round(value).toLocaleString('en-IN')}
            </span>
        </div>
    );
}
