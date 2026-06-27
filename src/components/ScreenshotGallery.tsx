import { useState } from 'react';
import { ScreenshotItem } from '../types';
import { Camera, Download, Trash2, Copy, Check, ExternalLink, Sparkles } from 'lucide-react';

interface ScreenshotGalleryProps {
  screenshots: ScreenshotItem[];
  onDeleteScreenshot: (id: string) => void;
  onClearAll: () => void;
}

export default function ScreenshotGallery({
  screenshots,
  onDeleteScreenshot,
  onClearAll,
}: ScreenshotGalleryProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<ScreenshotItem | null>(null);

  const handleCopy = async (item: ScreenshotItem) => {
    try {
      // Fetch the data URL and convert to blob
      const res = await fetch(item.dataUrl);
      const blob = await res.blob();
      
      // Copy to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);

      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      // Fallback: Copying dataurl is a backup but copying the actual image blob is much better.
      // If ClipboardItem fails (some browsers restrict in frames), tell user.
      console.warn('Failed to copy image to clipboard:', err);
      try {
        await navigator.clipboard.writeText(item.dataUrl);
        setCopiedId(item.id);
        setTimeout(() => setCopiedId(null), 2000);
      } catch (e) {
        alert('Could not copy image automatically. Try downloading it instead!');
      }
    }
  };

  const handleDownload = (item: ScreenshotItem) => {
    const link = document.createElement('a');
    link.href = item.dataUrl;
    link.download = item.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = () => {
    screenshots.forEach((item, index) => {
      setTimeout(() => {
        handleDownload(item);
      }, index * 200);
    });
  };

  if (screenshots.length === 0) {
    return (
      <div className="bg-brand-card rounded-xl border border-brand-border p-6 flex flex-col items-center justify-center text-center h-48">
        <div className="p-3 bg-brand-surface rounded-full text-brand-text-muted mb-3 border border-brand-border">
          <Camera size={20} />
        </div>
        <p className="text-xs font-medium text-brand-text">No screenshots captured yet</p>
      </div>
    );
  }

  return (
    <div className="bg-brand-card rounded-xl border border-brand-border p-5 relative shadow-sm" id="screenshot-gallery">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-brand-border/60">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-brand-accent/10 rounded-lg text-brand-accent">
            <Camera size={18} />
          </div>
          <div>
            <h3 className="font-serif font-semibold text-brand-text">Screenshots ({screenshots.length})</h3>
          </div>
        </div>
        <div className="flex items-center space-x-1.5">
          <button
            onClick={handleDownloadAll}
            className="flex items-center space-x-1 px-2.5 py-1 text-xs text-brand-text bg-brand-surface hover:bg-brand-surface/80 rounded-lg border border-brand-border transition-all"
          >
            <Download size={12} />
            <span>Save All</span>
          </button>
          <button
            onClick={onClearAll}
            className="flex items-center space-x-1 px-2.5 py-1 text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-all"
          >
            <Trash2 size={12} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
        {screenshots.map((item) => (
          <div
            key={item.id}
            className="group relative rounded-lg bg-brand-surface/40 border border-brand-border overflow-hidden hover:border-brand-accent/40 transition-all duration-150 shadow-sm"
          >
            {/* Thumbnail */}
            <div className="aspect-video w-full overflow-hidden bg-black relative">
              <img
                src={item.dataUrl}
                alt={item.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                onClick={() => setSelectedImage(item)}
              />
              
              {/* Overlay actions on hover */}
              <div className="absolute inset-0 bg-brand-text/60 opacity-0 group-hover:opacity-100 flex items-center justify-center space-x-1 transition-opacity duration-150">
                <button
                  onClick={() => handleCopy(item)}
                  className="p-1.5 bg-brand-surface hover:bg-brand-card text-brand-text rounded-md hover:scale-105 transition-all"
                  title="Copy to Clipboard"
                >
                  {copiedId === item.id ? (
                    <Check size={13} className="text-emerald-600 animate-bounce" />
                  ) : (
                    <Copy size={13} />
                  )}
                </button>
                <button
                  onClick={() => handleDownload(item)}
                  className="p-1.5 bg-brand-surface hover:bg-brand-card text-brand-text rounded-md hover:scale-105 transition-all"
                  title="Download Image"
                >
                  <Download size={13} />
                </button>
                <button
                  onClick={() => setSelectedImage(item)}
                  className="p-1.5 bg-brand-surface hover:bg-brand-card text-brand-text rounded-md hover:scale-105 transition-all"
                  title="View"
                >
                  <ExternalLink size={13} />
                </button>
                <button
                  onClick={() => onDeleteScreenshot(item.id)}
                  className="p-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-md hover:scale-105 transition-all"
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* Label */}
            <div className="p-2 flex items-center justify-between bg-brand-surface/30">
              <span className="text-[10px] font-medium text-brand-text truncate max-w-[100px]" title={item.name}>
                {item.name}
              </span>
              <span className="text-[9px] font-mono text-brand-text-muted">
                {item.timestamp}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* High-res Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-[#12110F]/90 flex items-center justify-center p-4 z-50">
          <div className="relative max-w-4xl w-full bg-brand-card rounded-xl overflow-hidden border border-brand-border shadow-lg">
            <div className="flex items-center justify-between p-4 border-b border-brand-border bg-brand-surface text-brand-text">
              <div className="flex items-center space-x-1.5">
                <Camera size={15} className="text-brand-accent" />
                <h4 className="font-serif font-semibold text-sm">{selectedImage.name}</h4>
              </div>
              <button
                onClick={() => setSelectedImage(null)}
                className="text-brand-text hover:bg-brand-surface px-2.5 py-1 text-xs font-medium rounded-lg border border-brand-border transition-all"
              >
                Close
              </button>
            </div>
            
            <div className="p-4 bg-black flex justify-center max-h-[70vh] overflow-hidden">
              <img
                src={selectedImage.dataUrl}
                alt={selectedImage.name}
                referrerPolicy="no-referrer"
                className="max-h-full max-w-full object-contain rounded-lg border border-brand-border"
              />
            </div>

            <div className="p-4 border-t border-brand-border bg-brand-surface flex items-center justify-between text-xs">
              <span className="text-brand-text-muted font-mono">Captured at {selectedImage.timestamp}</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleCopy(selectedImage)}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-brand-card hover:bg-brand-surface text-brand-text rounded-lg border border-brand-border font-medium transition-all"
                >
                  {copiedId === selectedImage.id ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  <span>{copiedId === selectedImage.id ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={() => handleDownload(selectedImage)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#191919] hover:bg-brand-accent text-white rounded-lg font-semibold transition-all"
                >
                  <Download size={13} />
                  <span>Download</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
