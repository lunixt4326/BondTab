import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Receipt, Loader2, Plus, X, DollarSign,
} from 'lucide-react';
import { isAddress } from 'viem';
import { useGroup } from '@/hooks/useGroup';
import { useExpenses } from '@/hooks/useExpenses';
import { ReceiptUploader } from '@/components/ReceiptUploader';
import { OCRReviewModal } from '@/components/OCRReviewModal';
import { encrypt, generateKey, exportKey, sha256Hex } from '@/lib/crypto';
import { pinJSON } from '@/lib/ipfs';
import { parseUSDC, shortenAddress } from '@/config/constants';
import { addToast } from '@/components/Toast';

export function AddExpense() {
  const { groupAddress } = useParams<{ groupAddress: string }>();
  const navigate = useNavigate();
  const { address } = useAccount();
  const addr = groupAddress as `0x${string}`;

  const { members, groupName, expenseModuleAddr } = useGroup(addr);
  const { proposeExpense } = useExpenses(expenseModuleAddr);

  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [ocrText, setOcrText] = useState<string | null>(null);
  const [showOCR, setShowOCR] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const otherMembers = (members ?? []).filter(
    (m) => m.toLowerCase() !== address?.toLowerCase(),
  );

  const handleOCRResult = useCallback((text: string) => {
    setOcrText(text);
    setShowOCR(true);
  }, []);

  const handleOCRAccept = useCallback((parsed: { amount: string; description: string }) => {
    if (parsed.amount) setTotalAmount(parsed.amount);
    if (parsed.description) setDescription(parsed.description);
    setShowOCR(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totalAmount || Number(totalAmount) <= 0) {
      return addToast({ type: 'error', title: 'Invalid amount' });
    }
    if (!members || members.length === 0) return;

    const totalWei = parseUSDC(totalAmount);

    // Calculate splits
    let splitAddresses: `0x${string}`[];
    let splitAmounts: bigint[];

    if (splitType === 'equal') {
      splitAddresses = members as `0x${string}`[];
      const perPerson = totalWei / BigInt(members.length);
      const remainder = totalWei - perPerson * BigInt(members.length);
      splitAmounts = members.map((_, i) =>
        i === 0 ? perPerson + remainder : perPerson,
      );
    } else {
      splitAddresses = Object.keys(customSplits) as `0x${string}`[];
      splitAmounts = Object.values(customSplits).map((v) => parseUSDC(v || '0'));
      const total = splitAmounts.reduce((a, b) => a + b, 0n);
      if (total !== totalWei) {
        return addToast({
          type: 'error',
          title: 'Split mismatch',
          message: 'Splits total ≠ expense amount',
        });
      }
    }

    // Handle receipt upload
    let receiptCID = '';
    if (receiptFile) {
      try {
        setIsUploading(true);
        const fileBuffer = await receiptFile.arrayBuffer();
        const key = await generateKey();
        const keyStr = await exportKey(key);
        const { ciphertext, iv } = await encrypt(key, fileBuffer);
        const hash = await sha256Hex(fileBuffer);

        // Pin encrypted receipt to IPFS
        receiptCID = await pinJSON(
          {
            encryptedReceipt: ciphertext,
            iv,
            originalHash: hash,
            mimeType: receiptFile.type,
            encryptionNote: 'AES-256-GCM. Key shared out-of-band with group members.',
          },
          `receipt-${Date.now()}`,
        );

        addToast({
          type: 'success',
          title: 'Receipt uploaded',
          message: `CID: ${receiptCID.slice(0, 12)}… Key saved locally.`,
        });

        // Store key locally for this receipt
        const keysRaw = localStorage.getItem('bondtab-receipt-keys') || '{}';
        const keys = JSON.parse(keysRaw);
        keys[receiptCID] = keyStr;
        localStorage.setItem('bondtab-receipt-keys', JSON.stringify(keys));
      } catch (err) {
        console.error('Receipt upload failed:', err);
        addToast({ type: 'error', title: 'Receipt upload failed' });
      } finally {
        setIsUploading(false);
      }
    }

    try {
      setIsSubmitting(true);
      const receiptHashBytes = receiptCID
        ? (`0x${Array.from(new TextEncoder().encode(receiptCID)).map(b => b.toString(16).padStart(2, '0')).join('').padEnd(64, '0')}` as `0x${string}`)
        : ('0x' + '0'.repeat(64)) as `0x${string}`;
      const metadataHashBytes = description
        ? (`0x${Array.from(new TextEncoder().encode(description)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 64).padEnd(64, '0')}` as `0x${string}`)
        : ('0x' + '0'.repeat(64)) as `0x${string}`;

      proposeExpense({
        totalAmountUSDC: totalWei,
        participants: splitAddresses,
        splits: splitAmounts,
        receiptHash: receiptHashBytes,
        metadataHash: metadataHashBytes,
        receiptCID,
      });
      setTimeout(() => {
        setIsSubmitting(false);
        navigate(`/app/group/${groupAddress}`);
      }, 2000);
    } catch {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <button
        onClick={() => navigate(`/app/group/${groupAddress}`)}
        className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to {groupName ?? 'Group'}
      </button>

      <div>
        <h1 className="page-heading">Add Expense</h1>
        <p className="text-xs text-neutral-500 mt-1">
          Upload a receipt and split the cost with your group.
        </p>
      </div>

      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="glass-card p-6 space-y-5"
      >
        {/* Receipt Upload */}
        <div>
          <label className="label-text flex items-center gap-1.5">
            <Receipt className="w-3 h-3" /> Receipt (optional)
          </label>
          <ReceiptUploader
            onFile={setReceiptFile}
            onOCRResult={handleOCRResult}
            disabled={isSubmitting}
          />
        </div>

        {/* Description */}
        <div>
          <label className="label-text">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Dinner, Groceries, Taxi…"
            className="input-field"
            maxLength={64}
          />
        </div>

        {/* Amount */}
        <div>
          <label className="label-text flex items-center gap-1.5">
            <DollarSign className="w-3 h-3" /> Total Amount (USDC)
          </label>
          <input
            type="number"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            placeholder="0.00"
            min="0.01"
            step="0.01"
            className="input-field"
          />
        </div>

        {/* Split Type */}
        <div>
          <label className="label-text">Split Type</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSplitType('equal')}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                splitType === 'equal'
                  ? 'bg-accent/20 text-accent border border-accent/30'
                  : 'bg-surface-800/50 text-neutral-400 border border-surface-700/20'
              }`}
            >
              Equal Split
            </button>
            <button
              type="button"
              onClick={() => {
                setSplitType('custom');
                // Initialize custom splits
                const splits: Record<string, string> = {};
                (members ?? []).forEach((m) => { splits[m] = ''; });
                setCustomSplits(splits);
              }}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                splitType === 'custom'
                  ? 'bg-accent/20 text-accent border border-accent/30'
                  : 'bg-surface-800/50 text-neutral-400 border border-surface-700/20'
              }`}
            >
              Custom Split
            </button>
          </div>
        </div>

        {/* Equal split preview */}
        {splitType === 'equal' && totalAmount && members && members.length > 0 && (
          <div className="p-3 rounded-lg bg-surface-800/30 border border-surface-700/20">
            <p className="text-[10px] text-neutral-500 mb-2">Each member pays:</p>
            <p className="text-sm font-medium text-neutral-200">
              ${(Number(totalAmount) / members.length).toFixed(2)} × {members.length} members
            </p>
          </div>
        )}

        {/* Custom splits */}
        {splitType === 'custom' && (
          <div className="space-y-2">
            {(members ?? []).map((m) => (
              <div key={m} className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-neutral-400 w-24 truncate">
                  {shortenAddress(m)}
                  {m.toLowerCase() === address?.toLowerCase() && (
                    <span className="ml-1 text-accent text-[9px]">you</span>
                  )}
                </span>
                <input
                  type="number"
                  value={customSplits[m] ?? ''}
                  onChange={(e) =>
                    setCustomSplits({ ...customSplits, [m]: e.target.value })
                  }
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="input-field flex-1"
                />
              </div>
            ))}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting || isUploading}
          className="btn-primary w-full justify-center"
        >
          {isUploading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Uploading receipt…</>
          ) : isSubmitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Proposing…</>
          ) : (
            <><Plus className="w-4 h-4" /> Propose Expense</>
          )}
        </button>
      </motion.form>

      {/* OCR Review Modal */}
      <AnimatePresence>
        {showOCR && ocrText && (
          <OCRReviewModal
            ocrText={ocrText}
            onAccept={handleOCRAccept}
            onDismiss={() => setShowOCR(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
