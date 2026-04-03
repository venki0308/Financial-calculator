import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bookmark, Trash2 } from 'lucide-react';
import { useSchemeStore } from '../store/useSchemeStore';
import { schemes } from '../data/schemes';

export default function BookmarkedSchemes() {
    const navigate = useNavigate();
    const { bookmarkedSchemes, removeBookmark } = useSchemeStore();
    const savedSchemes = schemes.filter(s => bookmarkedSchemes.includes(s.id));

    return (
        <div className="min-h-dvh bg-background pb-10 animate-fade-in" style={{ maxWidth: 428, margin: '0 auto' }}>
            <div className="sticky top-0 z-10 bg-background  px-4 pt-14 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
                        <ArrowLeft size={18} className="text-muted-foreground" />
                    </button>
                    <h1 className="text-lg font-bold text-foreground">Bookmarked Schemes</h1>
                </div>
            </div>

            <div className="px-4 mt-6">
                {savedSchemes.length === 0 ? (
                    <div className="text-center py-20">
                        <Bookmark size={48} className="text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground text-sm">No bookmarked schemes</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {savedSchemes.map((scheme) => (
                            <div key={scheme.id} className="p-5 rounded-3xl bg-card border border-border">
                                <div className="flex items-start justify-between gap-2 mb-3">
                                    <div className="flex gap-2">
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-brand-blue/15 text-brand-blue">{scheme.governmentLevel}</span>
                                        {scheme.state && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-brand-purple/15 text-brand-purple">{scheme.state.substring(0, 2)}</span>}
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeBookmark(scheme.id); }}
                                        className="p-1.5 rounded-lg text-red-400 hover:text-red-500 shrink-0"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                <div onClick={() => navigate(`/scheme/${scheme.id}`)} className="active:scale-[0.98] transition-transform cursor-pointer">
                                    <h3 className="text-foreground font-bold text-base mb-1">{scheme.name}</h3>
                                    <p className="text-muted-foreground text-xs line-clamp-2">{scheme.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
