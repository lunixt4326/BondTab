import { formatUSDC, shortenAddress } from '@/config/constants';
import { useAccount } from 'wagmi';

interface BalanceRow {
  address: string;
  netBalance: bigint;
}

interface BalanceTableProps {
  balances: BalanceRow[];
}

export function BalanceTable({ balances }: BalanceTableProps) {
  const { address: myAddress } = useAccount();

  if (!balances.length) {
    return (
      <div className="text-center py-6 text-xs text-neutral-600">
        No balances to display.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-surface-700/30">
            <th className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium py-2 pr-4">
              Member
            </th>
            <th className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium py-2 text-right">
              Net Balance
            </th>
          </tr>
        </thead>
        <tbody>
          {balances.map((row) => {
            const isMe = row.address.toLowerCase() === myAddress?.toLowerCase();
            const isPositive = row.netBalance > 0n;
            const isNegative = row.netBalance < 0n;
            return (
              <tr key={row.address} className="border-b border-surface-800/30 last:border-0">
                <td className="py-2.5 pr-4">
                  <span className="text-[11px] font-mono text-neutral-300">
                    {shortenAddress(row.address)}
                  </span>
                  {isMe && (
                    <span className="ml-1.5 badge-accent text-[9px]">You</span>
                  )}
                </td>
                <td className={`py-2.5 text-right text-xs font-medium ${
                  isPositive ? 'text-emerald-400' : isNegative ? 'text-danger' : 'text-neutral-500'
                }`}>
                  {isPositive && '+'}
                  {formatUSDC(row.netBalance)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
