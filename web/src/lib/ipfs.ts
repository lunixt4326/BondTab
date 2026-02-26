import { addToast } from '@/components/Toast';

const PINATA_ENDPOINT = '/api/pin';

/**
 * Upload JSON to IPFS via our serverless Pinata proxy.
 * Returns the IPFS CID.
 */
export async function pinJSON(data: Record<string, unknown>, name?: string): Promise<string> {
  const res = await fetch(PINATA_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, name }),
  });

  if (!res.ok) {
    const err = await res.text();
    addToast({ type: 'error', title: 'IPFS Upload Failed', message: err });
    throw new Error(`Pinata pin failed: ${err}`);
  }

  const result = await res.json();
  return result.cid as string;
}

/** Construct a gateway URL from a CID */
export function ipfsUrl(cid: string): string {
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}
