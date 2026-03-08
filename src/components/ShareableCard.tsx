import { useRef, useState } from 'react';
import { Share2, Download, Copy, Check } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

interface ShareableCardProps {
    title: string;
    highlight: string;
    subtitle?: string;
    details: { label: string; value: string }[];
    gradient?: string;
}

export default function ShareableCard({ title, highlight, subtitle, details, gradient = 'from-indigo-600 via-purple-600 to-pink-500' }: ShareableCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState(false);

    const getShareText = () => {
        let text = `${title}\n\n✨ ${highlight}\n`;
        if (subtitle) text += `${subtitle}\n`;
        text += '\n';
        details.forEach(d => { text += `${d.label}: ${d.value}\n`; });
        text += '\n📱 Calculated with FinCalix';
        return text;
    };

    const handleShare = async () => {
        const text = getShareText();
        try {
            if (Capacitor.isNativePlatform()) {
                const { Share } = await import('@capacitor/share');
                await Share.share({ title: `${title} – FinCalix`, text, dialogTitle: 'Share Result' });
            } else if (navigator.share) {
                await navigator.share({ title: `${title} – FinCalix`, text });
            } else {
                await navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }
        } catch { }
    };

    const handleCopy = async () => {
        await navigator.clipboard.writeText(getShareText());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-3">
            {/* Card Preview */}
            <div ref={cardRef} className={`p-5 rounded-2xl bg-gradient-to-br ${gradient} relative overflow-hidden`}>
                {/* Decorative circles */}
                <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-white/5" />
                <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-white/5" />

                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                        <img src="/icons/fincalix-logo.jpg" alt="FinCalix" className="w-6 h-6 rounded-lg" />
                        <span className="text-white/60 text-[10px] font-bold uppercase tracking-wider">FinCalix</span>
                    </div>

                    <p className="text-white/70 text-xs font-medium mb-1">{title}</p>
                    <p className="text-2xl font-black text-white mb-1">{highlight}</p>
                    {subtitle && <p className="text-white/50 text-[10px] mb-3">{subtitle}</p>}

                    <div className="grid grid-cols-2 gap-2 mt-3">
                        {details.map((d, i) => (
                            <div key={i}>
                                <p className="text-white/40 text-[9px] uppercase font-bold">{d.label}</p>
                                <p className="text-white text-xs font-bold">{d.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
                <button
                    onClick={handleShare}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-xs"
                >
                    <Share2 size={14} /> Share
                </button>
                <button
                    onClick={handleCopy}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-dark-card border border-dark-border text-slate-400 text-xs font-medium"
                >
                    {copied ? <Check size={14} className="text-brand-green" /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy'}
                </button>
            </div>
        </div>
    );
}
