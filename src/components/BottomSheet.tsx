import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X } from 'lucide-react';
import { useRef } from 'react';

interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export default function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
    const dragControls = useDragControls();
    const constraintsRef = useRef(null);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 sheet-overlay z-[60]"
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
                        className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-[428px] max-h-[85dvh] bg-dark-card border-t border-dark-border rounded-t-3xl z-[60] flex flex-col"
                    >
                        {/* Drag handle */}
                        <div className="flex justify-center pt-3 pb-2 cursor-grab" onPointerDown={(e) => dragControls.start(e)}>
                            <div className="w-10 h-1 rounded-full bg-slate-600" />
                        </div>

                        <div className="flex items-center justify-between px-5 pb-3 border-b border-dark-border">
                            <h2 className="text-lg font-semibold text-white">{title}</h2>
                            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-dark-bg transition-colors">
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] hide-scrollbar">
                            {children}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
