import { Component, ErrorInfo, ReactNode } from 'react';
import { CrashlyticsService } from '../lib/analytics';

interface Props {
 children: ReactNode;
 fallback?: ReactNode;
}

interface State {
 hasError: boolean;
 error?: Error;
}

/**
 * React Error Boundary — catches render-time errors and logs them to Crashlytics.
 * Shows a friendly "Something went wrong" UI instead of a white crash screen.
 */
export class ErrorBoundary extends Component<Props, State> {
 public state: State = { hasError: false };

 public static getDerivedStateFromError(error: Error): State {
 return { hasError: true, error };
 }

 public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
 console.error('[FinCalix] ErrorBoundary caught:', error);
 CrashlyticsService.logError(error, errorInfo.componentStack ?? 'React render error');
 }

 private handleRestart = () => {
 // Clear state to try re-mounting
 this.setState({ hasError: false, error: undefined });
 };

 public render() {
 if (this.state.hasError) {
 if (this.props.fallback) return this.props.fallback;

 return (
 <div style={{
 minHeight: '100dvh',
 background: '#0F172A',
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 padding: '24px',
 fontFamily: 'system-ui, sans-serif',
 }}>
 <div style={{
 background: '#1E293B',
 borderRadius: '16px',
 padding: '32px 24px',
 maxWidth: '360px',
 width: '100%',
 textAlign: 'center',
 border: '1px solid #334155',
 }}>
 <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
 <h2 style={{ color: '#F1F5F9', fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
 Something went wrong
 </h2>
 <p style={{ color: '#94A3B8', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
 FinCalix encountered an unexpected error. Your data is safe — it's stored locally on your device.
 </p>
 <button
 onClick={this.handleRestart}
 style={{
 width: '100%',
 padding: '14px',
 background: '#10B981',
 color: '#fff',
 border: 'none',
 borderRadius: '12px',
 fontSize: '15px',
 fontWeight: 600,
 cursor: 'pointer',
 marginBottom: '12px',
 }}
 >
 Try Again
 </button>
 <button
 onClick={() => window.location.reload()}
 style={{
 width: '100%',
 padding: '14px',
 background: 'transparent',
 color: '#94A3B8',
 border: '1px solid #334155',
 borderRadius: '12px',
 fontSize: '15px',
 cursor: 'pointer',
 }}
 >
 Restart App
 </button>
 {this.state.error && (
 <p style={{ color: '#475569', fontSize: '11px', marginTop: '16px', wordBreak: 'break-word' }}>
 {this.state.error.message}
 </p>
 )}
 </div>
 </div>
 );
 }

 return this.props.children;
 }
}
