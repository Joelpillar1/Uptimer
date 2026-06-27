import { useState, useEffect } from 'react';
import { KeyboardShortcuts } from '../types';
import { Keyboard, RotateCcw, AlertCircle, Sparkles } from 'lucide-react';

interface ShortcutSettingsProps {
  shortcuts: KeyboardShortcuts;
  onUpdateShortcuts: (newShortcuts: KeyboardShortcuts) => void;
  onResetShortcuts: () => void;
}

export default function ShortcutSettings({
  shortcuts,
  onUpdateShortcuts,
  onResetShortcuts,
}: ShortcutSettingsProps) {
  const [activeBinding, setActiveBinding] = useState<keyof KeyboardShortcuts | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const displayNames: Record<keyof KeyboardShortcuts, string> = {
    startStop: 'Start / Stop Recording',
    pauseResume: 'Pause / Resume Recording',
    screenshot: 'Capture Instant Screenshot',
    toggleMic: 'Toggle Microphone Audio',
    toggleCamera: 'Toggle Webcam Overlay',
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!activeBinding) return;

    // Prevent default browser action for standard shortcuts like Alt+S, Alt+P, etc.
    e.preventDefault();
    e.stopPropagation();

    const keys: string[] = [];

    if (e.ctrlKey) keys.push('Ctrl');
    if (e.metaKey) keys.push('Meta');
    if (e.altKey) keys.push('Alt');
    if (e.shiftKey) keys.push('Shift');

    // Add actual key
    const mainKey = e.key;
    if (
      mainKey !== 'Control' &&
      mainKey !== 'Alt' &&
      mainKey !== 'Shift' &&
      mainKey !== 'Meta'
    ) {
      // Normalize space or special keys
      if (mainKey === ' ') {
        keys.push('Space');
      } else {
        keys.push(mainKey.length === 1 ? mainKey.toUpperCase() : mainKey);
      }
    }

    if (keys.length === 0) return; // Wait until a real key is pressed with modifiers or just a key

    const keyString = keys.join('+');

    // Validate that this key string is not already bound
    const isDuplicate = Object.entries(shortcuts).some(
      ([key, val]) => key !== activeBinding && val.toLowerCase() === keyString.toLowerCase()
    );

    if (isDuplicate) {
      setToastMessage(`"${keyString}" is already bound to another function.`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      setActiveBinding(null);
      return;
    }

    // Update shortcuts
    const updated = { ...shortcuts, [activeBinding]: keyString };
    onUpdateShortcuts(updated);
    setActiveBinding(null);

    setToastMessage(`Shortcut updated successfully to ${keyString}!`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  useEffect(() => {
    if (activeBinding) {
      window.addEventListener('keydown', handleKeyDown, true);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [activeBinding, shortcuts]);

  return (
    <div className="space-y-4 animate-fade-in text-xs text-brand-text" id="shortcut-settings">
      <div className="flex items-center justify-between pb-2 border-b border-brand-border/40">
        <span className="text-[10px] font-mono uppercase tracking-wider text-brand-text-muted">Keyboard Hotkeys</span>
        <button
          onClick={onResetShortcuts}
          className="flex items-center space-x-1 px-2 py-0.5 text-[10px] text-brand-text-muted hover:text-brand-text bg-brand-surface hover:bg-brand-surface/80 rounded border border-brand-border transition-all"
          title="Reset to defaults"
        >
          <RotateCcw size={10} />
          <span>Reset</span>
        </button>
      </div>

      <div className="space-y-2">
        {Object.entries(shortcuts).map(([key, value]) => {
          const bindingKey = key as keyof KeyboardShortcuts;
          const isListening = activeBinding === bindingKey;

          return (
            <div
              key={key}
              className="flex items-center justify-between p-2 rounded-lg bg-brand-surface/40 border border-brand-border/50 hover:border-brand-border transition-all duration-150"
            >
              <span className="text-xs font-medium text-brand-text">{displayNames[bindingKey]}</span>

              <button
                onClick={() => setActiveBinding(isListening ? null : bindingKey)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
                  isListening
                    ? 'bg-brand-accent/10 text-brand-accent border border-brand-accent/40 animate-pulse'
                    : 'bg-brand-card hover:bg-brand-surface text-brand-text border border-brand-border font-medium shadow-sm'
                }`}
              >
                {isListening ? 'Press keys...' : value}
              </button>
            </div>
          );
        })}
      </div>

      {activeBinding && (
        <div className="mt-3 flex items-start space-x-2 p-2.5 bg-brand-surface border border-brand-border rounded-lg text-[10px] text-brand-text-muted">
          <AlertCircle size={13} className="mt-0.5 flex-shrink-0 text-brand-accent" />
          <p>
            Press your desired key combination (e.g. <kbd className="px-1 py-0.5 bg-brand-card border border-brand-border rounded">Alt</kbd> + <kbd className="px-1 py-0.5 bg-brand-card border border-brand-border rounded">R</kbd>).
          </p>
        </div>
      )}
    </div>
  );
}

