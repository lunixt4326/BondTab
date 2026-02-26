import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useAccount } from 'wagmi';
import { BOND_TAB_GROUP_ABI, ERC20_ABI } from '../config/abis';
import { USDC_ADDRESS } from '../config/constants';
import { addToast, updateToast } from '../components/Toast';

export function useGroup(groupAddress: `0x${string}` | undefined) {
  const { address } = useAccount();

  const { data: groupName } = useReadContract({
    address: groupAddress,
    abi: BOND_TAB_GROUP_ABI,
    functionName: 'name',
    query: { enabled: !!groupAddress },
  });

  const { data: admin } = useReadContract({
    address: groupAddress,
    abi: BOND_TAB_GROUP_ABI,
    functionName: 'admin',
    query: { enabled: !!groupAddress },
  });

  const { data: isMember } = useReadContract({
    address: groupAddress,
    abi: BOND_TAB_GROUP_ABI,
    functionName: 'isMember',
    args: address ? [address] : undefined,
    query: { enabled: !!groupAddress && !!address },
  });

  const { data: hasBond } = useReadContract({
    address: groupAddress,
    abi: BOND_TAB_GROUP_ABI,
    functionName: 'hasBond',
    args: address ? [address] : undefined,
    query: { enabled: !!groupAddress && !!address },
  });

  const { data: bondBalance, refetch: refetchBond } = useReadContract({
    address: groupAddress,
    abi: BOND_TAB_GROUP_ABI,
    functionName: 'getBondBalance',
    args: address ? [address] : undefined,
    query: { enabled: !!groupAddress && !!address },
  });

  const { data: netBalance, refetch: refetchBalance } = useReadContract({
    address: groupAddress,
    abi: BOND_TAB_GROUP_ABI,
    functionName: 'getNetBalance',
    args: address ? [address] : undefined,
    query: { enabled: !!groupAddress && !!address },
  });

  const { data: members, refetch: refetchMembers } = useReadContract({
    address: groupAddress,
    abi: BOND_TAB_GROUP_ABI,
    functionName: 'getMembers',
    query: { enabled: !!groupAddress },
  });

  const { data: memberCountData } = useReadContract({
    address: groupAddress,
    abi: BOND_TAB_GROUP_ABI,
    functionName: 'memberCount',
    query: { enabled: !!groupAddress },
  });

  const { data: params } = useReadContract({
    address: groupAddress,
    abi: BOND_TAB_GROUP_ABI,
    functionName: 'getParams',
    query: { enabled: !!groupAddress },
  });

  const { data: expenseModuleAddr } = useReadContract({
    address: groupAddress,
    abi: BOND_TAB_GROUP_ABI,
    functionName: 'expenseModule',
    query: { enabled: !!groupAddress },
  });

  const { data: disputeModuleAddr } = useReadContract({
    address: groupAddress,
    abi: BOND_TAB_GROUP_ABI,
    functionName: 'disputeModule',
    query: { enabled: !!groupAddress },
  });

  // Separate writeContract instances to avoid race conditions (e.g., approve → deposit)
  const { writeContract: writeApprove } = useWriteContract();
  const { writeContract: writeDeposit } = useWriteContract();
  const { writeContract: writeWithdraw } = useWriteContract();
  const { writeContract: writeSettle } = useWriteContract();

  const approveUSDC = (amount: bigint) => {
    if (!groupAddress) return;
    const toastId = addToast({ type: 'pending', title: 'Approving USDC...' });
    writeApprove({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [groupAddress, amount],
    }, {
      onSuccess: (hash) => updateToast(toastId, { type: 'success', title: 'USDC approved', txHash: hash }),
      onError: (err) => updateToast(toastId, { type: 'error', title: 'Approval failed', message: err.message.slice(0, 100) }),
    });
  };

  const depositBond = (amount: bigint) => {
    if (!groupAddress) return;
    const toastId = addToast({ type: 'pending', title: 'Depositing bond...' });
    writeDeposit({
      address: groupAddress,
      abi: BOND_TAB_GROUP_ABI,
      functionName: 'depositBond',
      args: [amount],
    }, {
      onSuccess: (hash) => {
        updateToast(toastId, { type: 'success', title: 'Bond deposited!', txHash: hash });
        refetchBond();
      },
      onError: (err) => updateToast(toastId, { type: 'error', title: 'Deposit failed', message: err.message.slice(0, 100) }),
    });
  };

  const withdrawBond = (amount: bigint) => {
    if (!groupAddress) return;
    const toastId = addToast({ type: 'pending', title: 'Withdrawing bond...' });
    writeWithdraw({
      address: groupAddress,
      abi: BOND_TAB_GROUP_ABI,
      functionName: 'withdrawBond',
      args: [amount],
    }, {
      onSuccess: (hash) => {
        updateToast(toastId, { type: 'success', title: 'Bond withdrawn!', txHash: hash });
        refetchBond();
      },
      onError: (err) => updateToast(toastId, { type: 'error', title: 'Withdraw failed', message: err.message.slice(0, 100) }),
    });
  };

  const settleBatch = (debtors: `0x${string}`[], creditors: `0x${string}`[], amounts: bigint[]) => {
    if (!groupAddress) return;
    const toastId = addToast({ type: 'pending', title: 'Executing settlement...' });
    writeSettle({
      address: groupAddress,
      abi: BOND_TAB_GROUP_ABI,
      functionName: 'settleBatch',
      args: [debtors, creditors, amounts],
    }, {
      onSuccess: (hash) => {
        updateToast(toastId, { type: 'success', title: 'Settlement complete!', txHash: hash });
        refetchBalance();
      },
      onError: (err) => updateToast(toastId, { type: 'error', title: 'Settlement failed', message: err.message.slice(0, 100) }),
    });
  };

  return {
    groupName: groupName as string | undefined,
    admin: admin as `0x${string}` | undefined,
    isAdmin: admin && address ? (admin as string).toLowerCase() === address.toLowerCase() : false,
    isMember: isMember as boolean | undefined,
    hasBond: hasBond as boolean | undefined,
    bondBalance: bondBalance as bigint | undefined,
    netBalance: netBalance as bigint | undefined,
    members: (members as `0x${string}`[]) || [],
    memberCount: memberCountData ? Number(memberCountData) : 0,
    params: params as [bigint, bigint, bigint, bigint, bigint, bigint] | undefined,
    expenseModuleAddr: expenseModuleAddr as `0x${string}` | undefined,
    disputeModuleAddr: disputeModuleAddr as `0x${string}` | undefined,
    approveUSDC,
    depositBond,
    withdrawBond,
    settleBatch,
    refetchBond,
    refetchBalance,
    refetchMembers,
  };
}
