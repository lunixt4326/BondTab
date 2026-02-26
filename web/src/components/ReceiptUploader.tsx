import { useState, useCallback, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';

interface ReceiptUploaderProps {
  onFile: (file: File) => void;
  onOCRResult?: (text: string) => void;
  disabled?: boolean;
}

export function ReceiptUploader({ onFile, onOCRResult, disabled }: ReceiptUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;

    // Show preview
    const url = URL.createObjectURL(file);
    setPreview(url);
    onFile(file);

    // Run OCR if handler provided
    if (onOCRResult) {
      try {
        setIsProcessing(true);
        const { createWorker } = await import('tesseract.js');
        const worker = await createWorker('eng');
        const { data: { text } } = await worker.recognize(file);
        await worker.terminate();
        onOCRResult(text);
      } catch (err) {
        console.error('OCR failed:', err);
      } finally {
        setIsProcessing(false);
      }
    }
  }, [onFile, onOCRResult]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      {!preview ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-accent bg-accent/5'
              : 'border-surface-700/50 hover:border-surface-600/50 bg-surface-800/20'
          } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <Upload className="w-6 h-6 text-neutral-600 mx-auto mb-2" />
          <p className="text-xs text-neutral-400 mb-1">
            Drop receipt image or click to upload
          </p>
          <p className="text-[10px] text-neutral-600">
            JPG, PNG, WEBP · Max 5 MB
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="relative rounded-xl overflow-hidden border border-surface-700/30">
          <img
            src={preview}
            alt="Receipt preview"
            className="w-full max-h-64 object-contain bg-surface-900"
          />
          {isProcessing && (
            <div className="absolute inset-0 bg-surface-950/70 flex flex-col items-center justify-center">
              <Loader2 className="w-6 h-6 text-accent animate-spin mb-2" />
              <span className="text-xs text-neutral-300">Running OCR…</span>
            </div>
          )}
          <button
            onClick={reset}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-surface-950/80 flex items-center justify-center hover:bg-danger/80 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-neutral-300" />
          </button>
        </div>
      )}
    </div>
  );
}
