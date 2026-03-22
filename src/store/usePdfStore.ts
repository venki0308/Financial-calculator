import { create } from 'zustand';

interface PdfStore {
    isOpen: boolean;
    fileUri: string | null;
    fileName: string | null;
    showActionSheet: (uri: string, name: string) => void;
    hideActionSheet: () => void;
}

export const usePdfStore = create<PdfStore>((set) => ({
    isOpen: false,
    fileUri: null,
    fileName: null,
    showActionSheet: (uri, name) => set({ isOpen: true, fileUri: uri, fileName: name }),
    hideActionSheet: () => set({ isOpen: false, fileUri: null, fileName: null }),
}));
