import { useState } from 'react';
import RecorderDashboard from './components/RecorderDashboard';

export default function App() {
  const [isStudio, setIsStudio] = useState(false);

  return (
    <div className="h-screen w-screen bg-brand-bg text-brand-text flex flex-col overflow-hidden relative font-sans">
      
      {/* Sleek Minimal App Header */}
      {!isStudio && (
        <header className="shrink-0 bg-brand-bg border-b border-brand-border px-6 py-4 flex items-center justify-between">
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
      )}

      {/* Main Workspace Content */}
      <main className="flex-1 min-h-0 overflow-hidden relative" id="main-content-layout">
        <RecorderDashboard onStudioModeChange={setIsStudio} />
      </main>
    </div>
  );
}

