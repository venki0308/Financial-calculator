/**
 * UpdateChecker Component
 * - Shows a non-dismissible fullscreen modal when a REQUIRED update exists
 * - Shows a dismissible bottom banner for optional updates
 */
import { useEffect, useState } from 'react';
import { AlertCircle, Download, X, Sparkles } from 'lucide-react';
import { RemoteConfigService, FincalixRemoteConfig } from '../services/remoteConfig.service';
import { APP_VERSION } from '../config/app';

type UpdateState =
 | { status: 'idle' }
 | { status: 'required'; title: string; message: string }
 | { status: 'optional'; title: string; message: string };

export function UpdateChecker() {
 const [updateState, setUpdateState] = useState<UpdateState>({ status: 'idle' });
 const [dismissed, setDismissed] = useState(false);

 useEffect(() => {
 checkVersion();
 }, []);

 async function checkVersion() {
 let config: FincalixRemoteConfig;
 try {
 config = await RemoteConfigService.getConfig();
 } catch {
 return; // network unavailable, no-op
 }

 const isRequired = RemoteConfigService.isUpdateRequired(APP_VERSION, config.minRequiredVersion);
 const isAvailable = RemoteConfigService.isUpdateAvailable(APP_VERSION, config.latestVersion);

 if (isRequired) {
 setUpdateState({
 status: 'required',
 title: config.updateMessage.title,
 message: config.updateMessage.message,
 });
 } else if (isAvailable) {
 setUpdateState({
 status: 'optional',
 title: config.updateMessage.title,
 message: config.updateMessage.message,
 });
 }
 }

 const handleUpdate = () => RemoteConfigService.openPlayStore();

 // Force update — fullscreen, no dismiss
 if (updateState.status === 'required') {
 return (
 <div className="fixed inset-0 z-[999] bg-black/90 flex items-center justify-center p-6">
 <div className="bg-[var(--bg-primary)] border-border rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
 <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
 <AlertCircle className="w-10 h-10 text-red-500" />
 </div>
 <h2 className="text-2xl font-bold text-slate-900 mb-2">
 Update Required
 </h2>
 <p className="text-slate-600 mb-2 text-sm font-medium">
 {updateState.title}
 </p>
 <p className="text-muted-foreground mb-8 text-sm">
 {updateState.message}
 </p>
 <button
 onClick={handleUpdate}
 className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-foreground font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg"
 >
 <Download className="w-5 h-5" />
 Update Now — It's Free
 </button>
 <p className="text-xs text-muted-foreground mt-4">
 You must update to continue using FinCalix
 </p>
 </div>
 </div>
 );
 }

 // Optional update banner — dismissible
 if (updateState.status === 'optional' && !dismissed) {
 return (
 <div className="fixed bottom-20 left-3 right-3 z-50 animate-in slide-in-from-bottom-4">
 <div className="bg-gradient-to-r from-violet-600 to-purple-700 text-white rounded-2xl p-4 shadow-2xl">
 <div className="flex items-start gap-3">
 <div className="w-9 h-9 bg-[var(--bg-primary)]/20 rounded-xl flex items-center justify-center flex-shrink-0">
 <Sparkles className="w-5 h-5 text-foreground" />
 </div>
 <div className="flex-1 min-w-0">
 <p className="font-semibold text-sm">{updateState.title}</p>
 <p className="text-violet-200 text-xs mt-0.5">{updateState.message}</p>
 </div>
 <button
 onClick={() => setDismissed(true)}
 className="text-foreground/70 hover:text-foreground flex-shrink-0 p-1"
 >
 <X className="w-4 h-4" />
 </button>
 </div>
 <button
 onClick={handleUpdate}
 className="mt-3 w-full bg-[var(--bg-primary)]/20 hover:bg-[var(--bg-primary)]/30 text-foreground font-semibold py-2.5 rounded-xl text-sm transition-colors"
 >
 Update Now
 </button>
 </div>
 </div>
 );
 }

 return null;
}
