import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, X, Check } from 'lucide-react';

interface OCRReviewModalProps {
  ocrText: string;
  onAccept: (parsed: { amount: string; description: string }) => void;
  onDismiss: () => void;
}

/**
 * Displays OCR-extracted text and lets user pick amount + description.
 * Simple regex-based amount extraction (no AI).
 */
export function OCRReviewModal({ ocrText, onAccept, onDismiss }: OCRReviewModalProps) {
  // Try to find amounts in the text
  const amountRegex = /\$?\d+[,.]?\d*\.?\d{0,2}/g;
  const matches = ocrText.match(amountRegex) || [];
  const amounts = matches
    .map((m) => m.replace(/[$,]/g, ''))
    .filter((m) => {
      const n = parseFloat(m);
      return !isNaN(n) && n > 0 && n < 100000;
    });

  const [selectedAmount, setSelectedAmount] = useState(amounts[amounts.length - 1] ?? '');
  const [description, setDescription] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md glass-card p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <h3 className="font-display font-medium text-sm text-neutral-100">
              OCR Results
            </h3>
          </div>
          <button onClick={onDismiss} className="text-neutral-600 hover:text-neutral-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Raw text */}
        <div className="max-h-32 overflow-y-auto p-3 rounded-lg bg-surface-800/50 border border-surface-700/20">
          <pre className="text-[10px] text-neutral-400 whitespace-pre-wrap font-mono leading-relaxed">
            {ocrText}
          </pre>
        </div>

        {/* Detected amounts */}
        {amounts.length > 0 && (
          <div>
            <label className="label-text">Detected Amounts — tap to select</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {amounts.map((amt, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedAmount(amt)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                    selectedAmount === amt
                      ? 'bg-accent/20 text-accent border border-accent/30'
                      : 'bg-surface-800/50 text-neutral-400 border border-surface-700/20 hover:border-surface-600/30'
                  }`}
                >
                  ${amt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Amount input */}
        <div>
          <label className="label-text">Total Amount (USDC)</label>
          <input
            type="number"
            value={selectedAmount}
            onChange={(e) => setSelectedAmount(e.target.value)}
            placeholder="0.00"
            className="input-field"
            min="0.01"
            step="0.01"
          />
        </div>

        {/* Description */}
        <div>
          <label className="label-text">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Dinner at Mario's"
            className="input-field"
          />
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={onDismiss} className="btn-ghost text-xs">Cancel</button>
          <button
            onClick={() => onAccept({ amount: selectedAmount, description })}
            disabled={!selectedAmount}
            className="btn-primary text-xs"
          >
            <Check className="w-3.5 h-3.5" /> Use Values
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
