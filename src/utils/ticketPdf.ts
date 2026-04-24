import type { ScanRecord, TKTicketData } from '../types/qrScan';

export async function generateTicketPdf(scan: ScanRecord): Promise<string> {
  const tkData = scan.tkData as TKTicketData | undefined;
  const ticketCode = tkData?.ticketCode || 'ticket';

  const { buildLocalPdf } = require('./ticketPdfLocal');
  return buildLocalPdf(scan, ticketCode);
}
