import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X } from 'lucide-react';
import { useRef, useEffect, useState } from 'react';

interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    /** Optional sticky footer rendered OUTSIDE the scroll area — always visible */
    footer?: React.ReactNode;
}

export default function BottomSheet({ isOpen, onClose, title, children, footer }: BottomSheetProps) {
    const dragControls = useDragControls();
    const constraintsRef = useRef(null);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    // Track virtual keyboard height using visualViewport API (works on Android Chrome/Capacitor)
    useEffect(() => {
        if (!isOpen) return;
        const vv = window.visualViewport;
        if (!vv) return;

        const onResize = () => {
            const kbHeight = window.innerHeight - vv.height - vv.offsetTop;
            setKeyboardHeight(kbHeight > 50 ? kbHeight : 0);
        };
        vv.addEventListener('resize', onResize);
        vv.addEventListener('scroll', onResize);
        return () => {
            vv.removeEventListener('resize', onResize);
            vv.removeEventListener('scroll', onResize);
        };
    }, [isOpen]);

    // Reset keyboard height when sheet closes
    useEffect(() => {
        if (!isOpen) setKeyboardHeight(0);
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 sheet-overlay z-[10000]"
                        onClick={onClose}
                    />
                    <motion.div
                        ref={constraintsRef}
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        drag="y"
                        dragControls={dragControls}
                        dragConstraints={{ top: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(_, info) => { if (info.offset.y > 100) onClose(); }}
                        style={{
                            // Move sheet up by keyboard height so Apply button stays visible
                            bottom: keyboardHeight > 0 ? keyboardHeight : 0,
                        }}
                        className="fixed left-0 right-0 mx-auto w-full max-w-[428px] max-h-[85dvh] bg-card border-t border-border rounded-t-3xl z-[10000] flex flex-col transition-[bottom] duration-200"
                    >
                        {/* Drag handle */}
                        <div className="flex justify-center pt-3 pb-2 cursor-grab flex-shrink-0" onPointerDown={(e) => dragControls.start(e)}>
                            <div className="w-10 h-1 rounded-full bg-slate-600" />
                        </div>

                        {title && (
                            <div className="flex items-center justify-between px-5 pb-3 border-b border-border flex-shrink-0">
                                <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-dark-bg transition-colors">
                                    <X size={20} className="text-muted-foreground" />
                                </button>
                            </div>
                        )}

                        {/* Scrollable body — grows but never pushes footer off screen */}
                        <div className="flex-1 overflow-y-auto px-5 pt-4 hide-scrollbar" style={{ paddingBottom: footer ? '0.5rem' : 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}>
                            {children}
                        </div>

                        {/* Sticky footer — always visible, never scrolls */}
                        {footer && (
                            <div className="flex-shrink-0 border-t border-border px-5 pt-3 pb-4" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
                                {footer}
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
