import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, AlertTriangle, ChevronRight, Receipt } from 'lucide-react';
import { formatUSDC, shortenAddress, formatTimeRemaining } from '@/config/constants';

export interface ExpenseRowData {
  id: bigint;
  payer: string;
  totalAmount: bigint;
  description: string;
  status: number; // 0=Proposed, 1=Challenged, 2=Finalized, 3=Rejected
  timestamp: bigint;
  challengeDeadline?: bigint;
}

interface ExpenseListProps {
  expenses: ExpenseRowData[];
  groupAddress: string;
}

function statusLabel(status: number) {
  switch (status) {
    case 0: return { text: 'Proposed', cls: 'badge-amber', icon: Clock };
    case 1: return { text: 'Challenged', cls: 'badge-danger', icon: AlertTriangle };
    case 2: return { text: 'Finalized', cls: 'badge-accent', icon: CheckCircle };
    case 3: return { text: 'Rejected', cls: 'badge-danger', icon: AlertTriangle };
    default: return { text: 'Unknown', cls: 'badge-neutral', icon: Clock };
  }
}

export function ExpenseList({ expenses, groupAddress }: ExpenseListProps) {
  if (!expenses.length) {
    return (
      <div className="glass-card p-10 text-center">
        <Receipt className="w-6 h-6 text-neutral-700 mx-auto mb-2" />
        <p className="text-xs text-neutral-500">No expenses yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {expenses.map((exp, i) => {
        const s = statusLabel(exp.status);
        const Icon = s.icon;
        const now = BigInt(Math.floor(Date.now() / 1000));
        const timeLeft = exp.challengeDeadline && exp.challengeDeadline > now
          ? formatTimeRemaining(Number(exp.challengeDeadline - now))
          : null;

        return (
          <motion.div
            key={exp.id.toString()}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <Link
              to={`/app/group/${groupAddress}/expense/${exp.id.toString()}`}
              className="glass-card-hover flex items-center gap-4 p-4 group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs text-neutral-200 truncate font-medium">
                  {exp.description || `Expense #${exp.id.toString()}`}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] text-neutral-500 font-mono">
                    by {shortenAddress(exp.payer)}
                  </span>
                  <span className={s.cls + ' text-[9px]'}>
                    <Icon className="w-2.5 h-2.5" /> {s.text}
                  </span>
                  {timeLeft && exp.status === 0 && (
                    <span className="text-[9px] text-neutral-600">
                      {timeLeft} left
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="text-sm font-medium text-neutral-200">{formatUSDC(exp.totalAmount)}</p>
              </div>

              <ChevronRight className="w-4 h-4 text-neutral-700 group-hover:text-accent transition-colors shrink-0" />
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
