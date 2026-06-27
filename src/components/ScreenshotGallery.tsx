import { useState, useEffect } from 'react';
import { ScreenshotItem } from '../types';
import { Camera, Download, Trash2, Copy, Check, ExternalLink, Sparkles, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, X } from 'lucide-react';

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
  const [isZoomed, setIsZoomed] = useState(false);
  
  // Track count to trigger immediate popup preview upon new capture
  const [lastCount, setLastCount] = useState(screenshots.length);
  const [showToastPreview, setShowToastPreview] = useState<ScreenshotItem | null>(null);

  useEffect(() => {
    if (screenshots.length > lastCount) {
      // A new screenshot was added! Show immediate float-in popup
      const latest = screenshots[0]; // Screenshots are unshifted (newest first)
      setShowToastPreview(latest);
      
      const timer = setTimeout(() => {
        setShowToastPreview(null);
      }, 5000);
      
      setLastCount(screenshots.length);
      return () => clearTimeout(timer);
    } else {
      setLastCount(screenshots.length);
    }
  }, [screenshots.length, lastCount, screenshots]);

  const currentIndex = selectedImage ? screenshots.findIndex(s => s.id === selectedImage.id) : -1;

  const handlePrev = () => {
    if (currentIndex === -1 || screenshots.length === 0) return;
    setIsZoomed(false); // Reset zoom on image change
    const nextIndex = (currentIndex + 1) % screenshots.length;
    setSelectedImage(screenshots[nextIndex]);
  };

  const handleNext = () => {
    if (currentIndex === -1 || screenshots.length === 0) return;
    setIsZoomed(false); // Reset zoom on image change
    const prevIndex = (currentIndex - 1 + screenshots.length) % screenshots.length;
    setSelectedImage(screenshots[prevIndex]);
  };

  // Keyboard navigation for full screen modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedImage) return;
      if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'Escape') {
        setSelectedImage(null);
        setIsZoomed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage, currentIndex, screenshots]);

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
      console.warn('Failed to copy image to clipboard:', err);
      try {
        await navigator.clipboard.writeText(item.dataUrl);
        setCopiedId(item.id);
        setTimeout(() => setCopiedId(null), 2000);
      } catch (e) {
        // Suppress dialog inside iframe, log warning
        console.warn('Could not copy image automatically.');
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
                onClick={() => {
                  setIsZoomed(false);
                  setSelectedImage(item);
                }}
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
                  onClick={() => {
                    setIsZoomed(false);
                    setSelectedImage(item);
                  }}
                  className="p-1.5 bg-brand-surface hover:bg-brand-card text-brand-text rounded-md hover:scale-105 transition-all"
                  title="Preview"
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

      {/* FLOATING QUICK CAPTURE PREVIEW TOAST (Bottom-Right) */}
      {showToastPreview && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm bg-brand-card border-2 border-brand-accent rounded-xl shadow-2xl p-3 flex gap-3 animate-fade-in transition-all">
          <div className="relative w-20 aspect-video bg-black rounded-lg overflow-hidden border border-brand-border shrink-0 self-center">
            <img 
              src={showToastPreview.dataUrl} 
              alt="mini-preview" 
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover" 
            />
          </div>
          <div className="flex-1 flex flex-col justify-between min-w-0">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-serif font-semibold text-brand-text">Screenshot Captured</span>
                <button 
                  onClick={() => setShowToastPreview(null)}
                  className="p-0.5 rounded-md text-brand-text-muted hover:text-brand-text hover:bg-brand-surface transition"
                >
                  <X size={12} />
                </button>
              </div>
              <p className="text-[9px] text-brand-text-muted truncate font-mono mt-0.5">{showToastPreview.name}</p>
            </div>
            
            <div className="flex items-center space-x-1.5 mt-2">
              <button
                onClick={() => {
                  setIsZoomed(false);
                  setSelectedImage(showToastPreview);
                  setShowToastPreview(null);
                }}
                className="px-2 py-1 bg-brand-accent text-white text-[10px] font-semibold rounded hover:bg-brand-accent-hover transition flex items-center space-x-0.5"
              >
                <ExternalLink size={9} />
                <span>Preview</span>
              </button>
              <button
                onClick={() => handleCopy(showToastPreview)}
                className="px-2 py-1 bg-brand-surface text-brand-text text-[10px] font-medium rounded border border-brand-border hover:bg-brand-surface/80 transition flex items-center space-x-0.5"
              >
                {copiedId === showToastPreview.id ? <Check size={9} className="text-emerald-600" /> : <Copy size={9} />}
                <span>Copy</span>
              </button>
              <button
                onClick={() => handleDownload(showToastPreview)}
                className="px-2 py-1 bg-brand-surface text-brand-text text-[10px] font-medium rounded border border-brand-border hover:bg-brand-surface/80 transition flex items-center space-x-0.5"
              >
                <Download size={9} />
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* High-res Image Modal with Back-drop close and keyboard arrows */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-[#12110F]/95 flex items-center justify-center p-4 z-50 animate-fade-in"
          onClick={() => {
            setSelectedImage(null);
            setIsZoomed(false);
          }}
        >
          <div 
            className="relative max-w-5xl w-full bg-brand-card rounded-xl overflow-hidden border border-brand-border shadow-2xl flex flex-col animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-brand-border bg-brand-surface text-brand-text">
              <div className="flex items-center space-x-1.5 min-w-0">
                <Camera size={15} className="text-brand-accent shrink-0" />
                <h4 className="font-serif font-semibold text-sm truncate max-w-[280px] sm:max-w-md">{selectedImage.name}</h4>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => {
                    setSelectedImage(null);
                    setIsZoomed(false);
                  }}
                  className="text-brand-text hover:bg-brand-surface p-1 rounded-lg border border-brand-border transition-all"
                  title="Close (Esc)"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            
            <div className="relative bg-[#090908] flex justify-center items-center h-[65vh] group overflow-hidden">
              {/* Prev button */}
              {screenshots.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrev();
                  }}
                  className="absolute left-4 z-10 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/10 hover:scale-105 transition-all shadow-md"
                  title="Previous (Left Arrow)"
                >
                  <ChevronLeft size={20} />
                </button>
              )}

              {/* Zoomable Image frame */}
              <div 
                className={`w-full h-full flex items-center justify-center p-2 ${isZoomed ? 'overflow-auto cursor-zoom-out' : 'overflow-hidden cursor-zoom-in'}`}
                onClick={() => setIsZoomed(!isZoomed)}
              >
                <img
                  src={selectedImage.dataUrl}
                  alt={selectedImage.name}
                  referrerPolicy="no-referrer"
                  className={`transition-all duration-200 select-none ${
                    isZoomed 
                      ? 'max-w-none max-h-none w-auto h-auto' 
                      : 'max-h-full max-w-full object-contain rounded-lg border border-brand-border/40 shadow-xl'
                  }`}
                />
              </div>

              {/* Next button */}
              {screenshots.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNext();
                  }}
                  className="absolute right-4 z-10 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/10 hover:scale-105 transition-all shadow-md"
                  title="Next (Right Arrow)"
                >
                  <ChevronRight size={20} />
                </button>
              )}
            </div>

            <div className="p-4 border-t border-brand-border bg-brand-surface flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-3">
                <span className="text-brand-text-muted font-mono">Captured at {selectedImage.timestamp}</span>
                {screenshots.length > 1 && (
                  <span className="px-2 py-0.5 rounded-md bg-brand-card border border-brand-border font-mono text-brand-text-muted">
                    {currentIndex + 1} of {screenshots.length}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsZoomed(!isZoomed)}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-brand-card hover:bg-brand-surface text-brand-text rounded-lg border border-brand-border font-medium transition-all"
                  title={isZoomed ? 'Fit to Screen' : 'Zoom to Actual Size'}
                >
                  {isZoomed ? <ZoomOut size={13} /> : <ZoomIn size={13} />}
                  <span>{isZoomed ? 'Fit' : 'Actual Size'}</span>
                </button>
                <button
                  onClick={() => handleCopy(selectedImage)}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-brand-card hover:bg-brand-surface text-brand-text rounded-lg border border-brand-border font-medium transition-all"
                >
                  {copiedId === selectedImage.id ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  <span>{copiedId === selectedImage.id ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={() => handleDownload(selectedImage)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#191919] hover:bg-brand-accent text-white rounded-lg font-semibold transition-all shadow-sm"
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
