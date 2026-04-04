import { motion, AnimatePresence } from 'framer-motion';
import { Share2, FileText, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePdfStore } from '../store/usePdfStore';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { FileOpener } from '@capacitor-community/file-opener';

// Minimal toast fallback
function showToast(message: string, isError = false) {
    const old = document.getElementById('fncx-toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.id = 'fncx-toast';
    t.textContent = message;
    Object.assign(t.style, {
        position: 'fixed', bottom: '110px', left: '50%', transform: 'translateX(-50%)',
        background: isError ? '#ef4444' : '#10B981', color: '#fff',
        padding: '12px 22px', borderRadius: '12px', fontSize: '14px', fontWeight: '600',
        zIndex: '99999', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', whiteSpace: 'nowrap',
        maxWidth: '90vw', textAlign: 'center',
    });
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 4000);
}

export function PdfActionSheet() {
    const { t } = useTranslation();
    const { isOpen, fileUri, fileName, hideActionSheet } = usePdfStore();

    const handleOpen = async () => {
        if (!fileUri) return;
        try {
            await FileOpener.open({
                filePath: fileUri,
                contentType: 'application/pdf',
            });
        } catch (e: any) {
            console.error('File open error', e);
            showToast(t('common.couldNotOpenPdf'), true);
        }
        hideActionSheet();
    };

    const handleShare = async () => {
        if (!fileUri || !fileName) return;
        try {
            const canShare = await Share.canShare();
            if (canShare.value) {
                await Share.share({
                    title: `FinCalix – ${fileName}`,
                    url: fileUri,
                    dialogTitle: t('common.sharePdf'),
                });
            } else {
                showToast(t('common.sharingNotSupported'), true);
            }
        } catch (e) {
            console.error('Share dismissed or failed', e);
        }
        hideActionSheet();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black"
                        style={{ zIndex: 99999 }}
                        onClick={hideActionSheet}
                    />
                    {/* Bottom Sheet UI */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 bg-white dark:bg-card rounded-t-3xl shadow-2xl max-w-md mx-auto"
                        style={{
                            zIndex: 100000,
                            maxHeight: '70vh',
                            overflowY: 'auto',
                            paddingBottom: 'env(safe-area-inset-bottom, 24px)',
                        }}
                    >
                        <div className="p-6" style={{ minHeight: 200 }}>
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-foreground">{t('common.fileReady')}</h3>
                                    <p className="text-xs text-muted-foreground mt-0.5 max-w-[200px] truncate">{fileName}</p>
                                </div>
                                <button onClick={hideActionSheet} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-muted-foreground flex items-center justify-center">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <button onClick={handleOpen} className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                    <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                        <FileText size={20} />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-semibold text-slate-900 dark:text-foreground">{t('common.openDoc')}</p>
                                        <p className="text-xs text-muted-foreground">{t('common.viewPdf')}</p>
                                    </div>
                                </button>
                                
                                <button onClick={handleShare} className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                    <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                        <Share2 size={20} />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-semibold text-slate-900 dark:text-foreground">{t('common.shareFile')}</p>
                                        <p className="text-xs text-muted-foreground">{t('common.shareVia')}</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
