const TK_PREFIX = '[TK/E]';
const TK_URI_PREFIX = '[TK/URI]';
const D3_HEX_RE = /^\[TK\/E\]01000000[0-9A-Fa-f]+$/;

export function isTKQR(payload: string): boolean {
  return payload.startsWith(TK_PREFIX);
}

export function isD3QR(payload: string): boolean {
  return D3_HEX_RE.test(payload);
}

export function isTKURIQR(payload: string): boolean {
  return payload.startsWith(TK_URI_PREFIX);
}

export function isTKPipeQR(payload: string): boolean {
  if (payload.startsWith('[') || payload.startsWith('http')) {
    return false;
  }
  const parts = payload.split('|');
  return parts.length === 6 && parts.every(p => p.length > 0);
}

/** Returns true if the payload is any recognised Truckast QR format */
export function isTruckastQR(payload: string): boolean {
  return isTKQR(payload) || isTKURIQR(payload) || isTKPipeQR(payload);
}
