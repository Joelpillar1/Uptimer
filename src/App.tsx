import RecorderDashboard from './components/RecorderDashboard';

export default function App() {
  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col relative font-sans">
      
      {/* Sleek Minimal App Header */}
      <header className="sticky top-0 z-40 bg-brand-bg/90 backdrop-blur-md border-b border-brand-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent">
            <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
              <circle cx="12" cy="12" r="4" />
            </svg>
          </div>
          <div>
            <h1 className="font-serif font-semibold text-brand-text tracking-tight text-base">Screen Recorder</h1>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <span className="text-xs font-medium text-brand-text-muted flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full" />
            <span>Sandbox Mode (Private)</span>
          </span>
        </div>
      </header>

      {/* Main Workspace Content */}
      <main className="flex-1 pb-16" id="main-content-layout">
        <RecorderDashboard />
      </main>

      {/* Elegant Footer */}
      <footer className="py-8 border-t border-brand-border bg-brand-bg text-center text-xs text-brand-text-muted">
        <p className="font-serif font-medium">Screen Recorder</p>
        <p className="text-[11px] mt-1 max-w-lg mx-auto leading-relaxed">
          Local, high-fidelity capture runs entirely within your browser sandboxed environment. Your media tracks and files never touch any servers.
        </p>
      </footer>
    </div>
  );
}

