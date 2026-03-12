import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, CheckCircle, Server, Mail, Smartphone, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const languages = [
 { code: 'en', name: 'English', nativeName: 'English' },
 { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
 { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
 { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
 { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
 { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
];

export default function DataSafety() {
 const navigate = useNavigate();
 const { t, i18n } = useTranslation();

 const promises = [
 t('dataSafety.promise1'),
 t('dataSafety.promise2'),
 t('dataSafety.promise3'),
 t('dataSafety.promise4'),
 t('dataSafety.promise5'),
 ];

 const dataSafetyTable = [
 { label: t('dataSafety.table1Label'), value: t('dataSafety.table1Value') },
 { label: t('dataSafety.table2Label'), value: t('dataSafety.table2Value') },
 { label: t('dataSafety.table3Label'), value: t('dataSafety.table3Value') },
 { label: t('dataSafety.table4Label'), value: t('dataSafety.table4Value') },
 { label: t('dataSafety.table5Label'), value: t('dataSafety.table5Value') },
 ];

 return (
 <div className="min-h-dvh bg-background pb-10" style={{ maxWidth: 428, margin: '0 auto' }}>
 {/* Header */}
 <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg px-4 pt-14 pb-3 border-b border-border">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
 <ArrowLeft size={18} className="text-muted-foreground" />
 </button>
 <div>
 <h1 className="text-lg font-bold text-foreground">{t('dataSafety.title')}</h1>
 <p className="text-muted-foreground text-[10px]">{t('dataSafety.subtitle')}</p>
 </div>
 </div>
 <select
 value={i18n.language.substring(0, 2)}
 onChange={(e) => {
 i18n.changeLanguage(e.target.value);
 localStorage.setItem('language', e.target.value);
 }}
 className="bg-card border border-border text-foreground text-xs rounded-lg px-2 py-1.5 outline-none custom-select-arrow"
 >
 {languages.map(l => (
 <option key={l.code} value={l.code}>{l.nativeName}</option>
 ))}
 </select>
 </div>
 </div>

 <div className="px-4 pt-6 space-y-5">
 {/* Hero */}
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 className="p-5 rounded-2xl bg-gradient-to-br from-emerald-600/15 to-teal-600/10 border border-emerald-500/20 text-center"
 >
 <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
 <Shield size={28} className="text-emerald-400" />
 </div>
 <h2 className="text-foreground font-bold text-base mb-1">{t('dataSafety.heroTitle')}</h2>
 <p className="text-muted-foreground text-xs">{t('dataSafety.heroDesc')}</p>
 </motion.div>

 {/* Section 1 — What We Collect */}
 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-2">
 <div className="flex items-center gap-2.5">
 <div className="w-7 h-7 rounded-lg bg-[var(--info-bg)] flex items-center justify-center"><Eye size={14} className="text-blue-400" /></div>
 <h3 className="text-foreground font-bold text-sm">{t('dataSafety.sec1Title')}</h3>
 </div>
 <div className="pl-9 space-y-1.5 text-muted-foreground text-xs leading-relaxed">
 <p>{t('dataSafety.sec1Body1')}</p>
 <p>{t('dataSafety.sec1Body2')}</p>
 </div>
 </motion.div>

 {/* Section 2 — Device Storage */}
 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-2">
 <div className="flex items-center gap-2.5">
 <div className="w-7 h-7 rounded-lg bg-[var(--warning-bg)] flex items-center justify-center"><Smartphone size={14} className="text-amber-400" /></div>
 <h3 className="text-foreground font-bold text-sm">{t('dataSafety.sec2Title')}</h3>
 </div>
 <div className="pl-9 space-y-1.5 text-muted-foreground text-xs leading-relaxed">
 <p>{t('dataSafety.sec2Body1')}</p>
 <p>{t('dataSafety.sec2Body2')}</p>
 <p>{t('dataSafety.sec2Body3')}</p>
 </div>
 </motion.div>

 {/* Section 3 — Analytics */}
 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-2">
 <div className="flex items-center gap-2.5">
 <div className="w-7 h-7 rounded-lg bg-purple-500/15 flex items-center justify-center"><BarChart3 size={14} className="text-purple-400" /></div>
 <h3 className="text-foreground font-bold text-sm">{t('dataSafety.sec3Title')}</h3>
 </div>
 <div className="pl-9 space-y-1.5 text-muted-foreground text-xs leading-relaxed">
 <p>{t('dataSafety.sec3Body1')}</p>
 <p><strong>{t('dataSafety.table1Label')}:</strong> {t('dataSafety.sec3Body2').replace('Data collected:', '')}</p>
 <p>{t('dataSafety.sec3Body3')}</p>
 <p>{t('dataSafety.sec3Body4')}</p>
 </div>
 </motion.div>

 {/* Section 4 — Our Promises */}
 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-2">
 <div className="flex items-center gap-2.5">
 <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center"><Lock size={14} className="text-emerald-400" /></div>
 <h3 className="text-foreground font-bold text-sm">{t('dataSafety.sec4Title')}</h3>
 </div>
 <div className="pl-9 space-y-2">
 {promises.map((p, i) => (
 <motion.div
 key={i}
 initial={{ opacity: 0, x: -8 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ delay: 0.25 + i * 0.05 }}
 className="flex items-start gap-2.5 p-2.5 rounded-xl bg-emerald-500/8 border border-emerald-500/15"
 >
 <CheckCircle size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
 <span className="text-emerald-300/90 text-xs font-medium">{p}</span>
 </motion.div>
 ))}
 </div>
 </motion.div>

 {/* Section 5 — Play Store Data Safety */}
 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-2">
 <div className="flex items-center gap-2.5">
 <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center"><Server size={14} className="text-indigo-400" /></div>
 <h3 className="text-foreground font-bold text-sm">{t('dataSafety.sec5Title')}</h3>
 </div>
 <div className="pl-9">
 <div className="rounded-2xl bg-card border border-border overflow-hidden">
 {dataSafetyTable.map((row, i) => (
 <div key={i} className={`grid grid-cols-[110px_1fr] gap-2 p-3 text-[10px] ${i % 2 === 0 ? 'bg-card' : 'bg-slate-800/30'}`}>
 <span className="text-muted-foreground font-bold uppercase">{row.label}</span>
 <span className="text-foreground font-medium">{row.value}</span>
 </div>
 ))}
 </div>
 </div>
 </motion.div>

 {/* Section 6 — Contact */}
 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="space-y-2">
 <div className="flex items-center gap-2.5">
 <div className="w-7 h-7 rounded-lg bg-pink-500/15 flex items-center justify-center"><Mail size={14} className="text-pink-400" /></div>
 <h3 className="text-foreground font-bold text-sm">{t('dataSafety.sec6Title')}</h3>
 </div>
 <div className="pl-9">
 <a href="mailto:support@fincalix.com" className="flex items-center gap-2.5 p-3 rounded-xl bg-brand-purple/10 border border-brand-purple/20">
 <Mail size={16} className="text-brand-purple" />
 <span className="text-brand-purple font-bold text-xs">support@fincalix.com</span>
 </a>
 </div>
 </motion.div>

 {/* Privacy Policy Link */}
 <div className="pt-2">
 <button
 onClick={() => navigate('/privacy-policy')}
 className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-card border border-border text-foreground font-bold text-xs"
 >
 <Shield size={16} className="text-brand-purple" />
 {t('dataSafety.readFull')}
 </button>
 </div>

 {/* Footer */}
 <div className="pt-6 pb-4 border-t border-border text-center space-y-2">
 <p className="text-muted-foreground text-[11px] font-semibold">{t('dataSafety.footerDesc')}</p>
 <p className="text-slate-600 text-[10px]">{t('dataSafety.footerMade')}</p>
 </div>
 </div>
 </div>
 );
}
