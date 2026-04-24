const TK_PREFIX = '[TK/E]';

export function isTKQR(payload: string): boolean {
  return payload.startsWith(TK_PREFIX);
}

export function isTKPipeQR(payload: string): boolean {
  if (payload.startsWith('[') || payload.startsWith('http')) {
    return false;
  }
  const parts = payload.split('|');
  return parts.length === 6 && parts.every(p => p.length > 0);
}
