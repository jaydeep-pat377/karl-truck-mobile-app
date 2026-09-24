import ReactNativeBlobUtil from 'react-native-blob-util';
import {TRUCKAST_GREEN_LOGO} from '../lib/truckastLogo';
import type {ScanRecord, FullTicket, TicketProduct, TKTicketData, APITicketDetails} from '../types/qrScan';
import type {RowInput} from 'jspdf-autotable';

function ensurePolyfills() {
  const g = globalThis as any;
  if (typeof g.TextDecoder === 'undefined') {
    const te = require('text-encoding');
    g.TextDecoder = te.TextDecoder;
    g.TextEncoder = te.TextEncoder;
  }
}

function getJsPDF() {
  ensurePolyfills();
  const jsPDF = require('jspdf').default || require('jspdf');
  return jsPDF;
}

function getAutoTable() {
  const autoTable = require('jspdf-autotable').default || require('jspdf-autotable');
  return autoTable;
}

function getQrCode() {
  return require('qrcode-generator');
}

function getBuffer() {
  return require('buffer').Buffer;
}

function f(v: string | number | null | undefined): string {
  if (v == null) return '';
  return String(v).trim();
}

function fmtDate(v: string | null | undefined): string {
  if (!v) return '\u2014';
  try {
    return new Date(v).toLocaleDateString('en-US', {month: '2-digit', day: '2-digit', year: 'numeric'});
  } catch {
    return '\u2014';
  }
}

function fmtTime(v: string | null | undefined): string {
  if (!v || !v.trim()) return '';
  try {
    let s = v.trim();
    s = s.replace(/\.\d{1,3}/, '');
    s = s.replace(/[+-]\d{2}(:\d{2})?$/, '');
    s = s.replace(/Z$/, '');
    const match = s.match(/[T ](\d{2}):(\d{2})/);
    if (match) {
      const h = parseInt(match[1], 10);
      const m = match[2];
      const period = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 === 0 ? 12 : h % 12;
      return `${h12}:${m}${period}`;
    }
    const bareMatch = s.match(/^(\d{1,2}):(\d{2})/);
    if (bareMatch) {
      let h = parseInt(bareMatch[1], 10);
      const m = bareMatch[2];
      const ampm = s.match(/\s*(AM|PM)$/i);
      if (ampm) {
        const isPM = ampm[1].toUpperCase() === 'PM';
        if (isPM && h < 12) h += 12;
        if (!isPM && h === 12) h = 0;
      }
      const period = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 === 0 ? 12 : h % 12;
      return `${h12}:${m}${period}`;
    }
    // Already formatted (e.g. "04:30 AM")
    if (/\d{1,2}:\d{2}\s*(AM|PM)/i.test(s)) return s;
    return '';
  } catch {
    return '';
  }
}

function addr(t: FullTicket): string {
  return [t.delivery_addr1, t.delivery_addr2, t.delivery_addr3]
    .filter(p => p && p.trim() !== '')
    .join(', ');
}

function mixProd(t: FullTicket): TicketProduct | undefined {
  const p = t.ticket_products || [];
  return p.find(x => x.is_mix === true) || p[0];
}

function qtyInfo(t: FullTicket) {
  const m = mixProd(t);
  const q = m?.load_qty ?? 0;
  const u = (m?.ticket_qty_unit || m?.order_qty_unit || '').toUpperCase();
  const oq = m?.order_qty ?? 0;
  const load = q > 0 ? `${q.toFixed(2)} ${u}` : '\u2014';
  const total = oq > 0 ? `${q.toFixed(2)} Of ${oq.toFixed(2)} ${u}` : q > 0 ? `${q.toFixed(2)} ${u}` : '\u2014';
  return {load, total};
}

function generateQrDataUrl(content: string): string | null {
  try {
    const qrcode = getQrCode();
    const qr = qrcode(0, 'M');
    qr.addData(content);
    qr.make();
    return qr.createDataURL(4, 0);
  } catch {
    return null;
  }
}

export function buildFullTicketFromApi(
  apiData: APITicketDetails,
  tkData?: TKTicketData,
): FullTicket {
  let loadQty: number | null = null;
  let qtyUnit = '';
  if (apiData.load_qty) {
    const parts = apiData.load_qty.trim().split(/\s+/);
    loadQty = parseFloat(parts[0]);
    if (isNaN(loadQty)) loadQty = null;
    if (parts.length > 1) qtyUnit = parts.slice(1).join(' ');
  }
  if (!qtyUnit && apiData.run_qty_ord_qty) {
    const m = apiData.run_qty_ord_qty.match(/[\d.]+\s+(\w+)\s*$/);
    if (m) qtyUnit = m[1];
  }

  let products: TicketProduct[] | undefined;
  if (apiData.ticket_products && apiData.ticket_products.length > 0) {
    products = apiData.ticket_products;
  } else if (apiData.product || loadQty != null) {
    products = [{
      id: 0,
      ticket_id: 0,
      item_code: null,
      description: apiData.product || null,
      is_mix: true,
      load_qty: loadQty,
      order_qty: apiData.ordered_qty || null,
      ticket_qty_unit: qtyUnit || null,
      order_qty_unit: qtyUnit || null,
    }];
  }

  return {
    ticket_id: 0,
    ticket_code: apiData.ticket_code || tkData?.ticketCode || '',
    created_date: '',
    order_date: apiData.order_date || '',
    order_code: apiData.order_code || tkData?.orderCode || '',
    customer_name: apiData.customer_name || '',
    delivery_addr1: apiData.delivery_address || null,
    delivery_addr2: null,
    delivery_addr3: null,
    plant_code: null,
    plant_name: apiData.plant_name || null,
    plant_address: apiData.plant_address || null,
    slump: apiData.slump
      || (apiData.ticket_products?.find(p => p.is_mix)?.slump != null
        ? String(apiData.ticket_products.find(p => p.is_mix)!.slump)
        : null),
    truck_code: apiData.truck?.truck_code || tkData?.truckCode || null,
    driver_name: apiData.driver_name || null,
    project_name: apiData.project_name || null,
    ordered_by_name: apiData.ordered_by_name || null,
    ordered_by_phone: apiData.ordered_by_phone || null,
    purchase_order: apiData.purchase_order || null,
    customer_job: apiData.customer_job || null,
    amount: null,
    scheduled_on_job_time: null,
    printed_time: apiData.timestamps?.ticketed || null,
    load_time: apiData.timestamps?.loading || null,
    loaded_time: apiData.timestamps?.loaded || null,
    to_job_time: apiData.timestamps?.to_job || null,
    on_job_time: apiData.timestamps?.at_job || null,
    unload_time: apiData.timestamps?.pouring || null,
    end_unload: null,
    wash_time: apiData.timestamps?.washing || null,
    to_plant_time: apiData.timestamps?.to_plant || null,
    at_plant_time: apiData.timestamps?.at_plant || null,
    print_mix_weight: null,
    remove_reason_code: apiData.remove_reason_code || null,
    current_status: apiData.status_display || apiData.status || '',
    ticket_products: products,
  };
}

// ── Colours (CBM / Votorantim palette) ──
const P = {
  white: [255, 255, 255] as [number, number, number],
  dark: [15, 23, 42] as [number, number, number],
  body: [51, 65, 85] as [number, number, number],
  lbl: [100, 116, 139] as [number, number, number],
  muted: [148, 163, 184] as [number, number, number],
  bdr: [203, 213, 225] as [number, number, number],
  rowAlt: [241, 245, 249] as [number, number, number],
  rowWhite: [255, 255, 255] as [number, number, number],
  caution: [220, 38, 38] as [number, number, number],
  prodHead: [153, 27, 46] as [number, number, number],
  blueBar: [29, 78, 216] as [number, number, number],
  redBar: [220, 38, 38] as [number, number, number],
  noteBg: [248, 250, 252] as [number, number, number],
};

const tbl = {theme: 'grid' as const, styles: {lineColor: P.bdr, lineWidth: 0.2, cellPadding: 1.4, fontSize: 7, textColor: P.dark}};
const lbl = {fontSize: 7, fontStyle: 'normal' as const, textColor: P.lbl, fillColor: P.rowAlt, cellPadding: {top: 1.6, bottom: 1.6, left: 2.5, right: 2.5}};
const val = {fontSize: 7.5, fontStyle: 'bold' as const, textColor: P.dark, fillColor: P.rowAlt, cellPadding: {top: 1.6, bottom: 1.6, left: 2.5, right: 2.5}};

function buildJsPdf(ticket: FullTicket, orderCode?: string | null, qrDataUrl?: string | null, tenantName?: string | null, tenantSubdomain?: string | null): any {
  const jsPDF = getJsPDF();
  const autoTable = getAutoTable();
  const doc = new jsPDF({orientation: 'portrait', unit: 'mm', format: 'letter'});
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const ml = 10, mr = 10, cw = pw - ml - mr;
  const oCode = orderCode ?? ticket.order_code ?? '';
  const mix = mixProd(ticket);
  const qi = qtyInfo(ticket);
  const address = addr(ticket);
  const weather = ticket.weather_data;
  const weatherStr = weather ? `${weather.temperature_fahrenheit.toFixed(1)}\u00b0F ${weather.weather_description}` : '';
  const products = ticket.ticket_products || [];
  const now = new Date().toLocaleString('en-US');
  const company = (tenantName || 'Truckast').toUpperCase();
  const lastY = () => (doc as any).lastAutoTable.finalY as number;

  function drawFooter(leftLine: string) {
    doc.setFillColor(...P.redBar); doc.rect(0, ph - 6, pw, 0.8, 'F');
    doc.setFillColor(...P.blueBar); doc.rect(0, ph - 5.2, pw, 5.2, 'F');
    doc.setTextColor(...P.white); doc.setFontSize(6); doc.setFont('helvetica', 'normal');
    doc.text(leftLine, ml, ph - 1.8);
    doc.text(`Downloaded: ${now}`, pw - mr, ph - 1.8, {align: 'right'});
  }

  function drawHeader(subtitle: string) {
    try { doc.addImage(TRUCKAST_GREEN_LOGO, 'PNG', ml, 4, 38, 14); } catch {
      doc.setTextColor(...P.dark); doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.text('TRUCKAST', ml + 2, 12);
    }
    doc.setTextColor(...P.dark); doc.setFontSize(13); doc.setFont('helvetica', 'bold');
    doc.text(company, pw / 2, 10, {align: 'center'});
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...P.lbl);
    doc.text(subtitle, pw / 2, 14, {align: 'center'});
    const qrSize = 16, qrX = pw - mr - qrSize, qrY = 3;
    if (qrDataUrl) { try { doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize); } catch {} }
    else { doc.setDrawColor(...P.bdr); doc.setLineWidth(0.3); doc.rect(qrX, qrY, qrSize, qrSize, 'S'); }
    doc.setTextColor(...P.dark); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text(ticket.ticket_code, qrX + qrSize / 2, qrY + qrSize + 4, {align: 'center'});
    doc.setDrawColor(...P.bdr); doc.setLineWidth(0.3); doc.line(ml, 25, pw - mr, 25);
  }

  let y = 0;

  // ── PAGE 1 ──
  drawHeader('Concrete Delivery Ticket');
  y = 28;

  // CAUTION
  doc.setTextColor(...P.caution); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
  doc.text('CAUTION', pw / 2, y + 1, {align: 'center'});
  doc.setFontSize(4.8); doc.setFont('helvetica', 'normal');
  const cautionText = 'CEMENT POWDER OR FRESHLY MIXED CONCRETE, GROUT OR MORTAR IS CAUSTIC AND CORROSIVE, AND CAN DESTROY SKIN AND TISSUE. FRESH CONCRETE CAN WET AND PENETRATE CLOTHING. WATERPROOF CLOTHING SHOULD BE USED, AND IF ANY CLOTHING GETS WET, THE SKIN MUST BE PROMPTLY WASHED WITH WATER. IF ANY CEMENT MIXTURE GETS INTO EYES, RINSE IMMEDIATELY AND REPEATEDLY WITH WATER AND GET PROMPT MEDICAL ATTENTION. KEEP OUT OF REACH OF CHILDREN.';
  const cLines = doc.splitTextToSize(cautionText, cw - 6);
  doc.text(cLines, pw / 2, y + 4, {align: 'center'});
  y += 4 + cLines.length * 1.8 + 2;

  // Info table — Ticket / Order / Date
  const labelW = cw * 0.28, valueW = cw - labelW;
  const triLblW = cw / 6, triValW = cw / 3 - triLblW;
  autoTable(doc, {startY: y, margin: {left: ml, right: mr}, ...tbl, body: [
    [{content: 'Ticket:', styles: lbl}, {content: ticket.ticket_code, styles: val}, {content: 'Order:', styles: lbl}, {content: f(oCode) || '\u2014', styles: val}, {content: 'Date:', styles: lbl}, {content: fmtDate(ticket.order_date), styles: val}],
  ] as RowInput[], columnStyles: {0: {cellWidth: triLblW}, 1: {cellWidth: triValW}, 2: {cellWidth: triLblW}, 3: {cellWidth: triValW}, 4: {cellWidth: triLblW}, 5: {cellWidth: triValW}}});
  y = lastY();

  // Full-width label/value rows
  const fullRows: [string, string][] = [['Load:', '1'], ['Customer:', f(ticket.customer_name) || '\u2014']];
  if (f(ticket.project_name)) fullRows.push(['Project:', f(ticket.project_name)]);
  fullRows.push(['Delivery Address:', f(address) || '\u2014']);
  fullRows.push(['Lot Block:', f(ticket.lot_block_number) || 'N/A']);
  if (f(ticket.customer_job)) fullRows.push(['Customer Job Name:', f(ticket.customer_job)]);
  if (f(ticket.purchase_order)) fullRows.push(['Purchase Order:', f(ticket.purchase_order)]);
  if (f(ticket.special_instructions)) fullRows.push(['Special Instructions:', f(ticket.special_instructions)]);
  autoTable(doc, {startY: y, margin: {left: ml, right: mr}, ...tbl, body: fullRows.map(([l, v]) => [{content: l, styles: lbl}, {content: v, styles: val}]) as RowInput[], columnStyles: {0: {cellWidth: labelW}, 1: {cellWidth: valueW}}});
  y = lastY();

  // Order By
  const obyName = f(ticket.ordered_by_name), obyPhone = f(ticket.ordered_by_phone);
  if (obyName || obyPhone) {
    autoTable(doc, {startY: y, margin: {left: ml, right: mr}, ...tbl, body: [
      [{content: 'Order By:', styles: lbl}, {content: obyName || '\u2014', styles: val}, {content: 'Order By Phone:', styles: lbl}, {content: obyPhone || '\u2014', styles: val}],
    ] as RowInput[], columnStyles: {0: {cellWidth: labelW}, 1: {cellWidth: cw / 2 - labelW}, 2: {cellWidth: cw * 0.22}, 3: {cellWidth: cw / 2 - cw * 0.22}}});
    y = lastY();
  }
  y += 2;

  // Driver / Truck / Plant / Load / Slump pairs
  const pairs: [string, string, string, string][] = [
    ['Driver', f(ticket.driver_name) || '\u2014', 'Truck', f(ticket.truck_code) || '\u2014'],
    ['Plant', f(ticket.plant_name || ticket.plant_code) || '\u2014', 'Plant Address', f(ticket.plant_address) || '\u2014'],
    ['Load', qi.load, 'Slump', f(ticket.slump) || '\u2014'],
    ['Usage', f(mix?.description) || '\u2014', 'Total Quantity', qi.total],
    ['Weather', weatherStr || '\u2014', 'Status', ticket.current_status || 'Pending'],
  ];
  const pairBody: RowInput[] = pairs.map(([lL, lV, rL, rV]) => [{content: lL, styles: lbl}, {content: lV, styles: val}, {content: rL, styles: lbl}, {content: rV, styles: val}]);
  autoTable(doc, {startY: y, margin: {left: ml, right: mr}, ...tbl, body: pairBody, columnStyles: {0: {cellWidth: cw * 0.18}, 1: {cellWidth: cw * 0.32}, 2: {cellWidth: cw * 0.18}, 3: {cellWidth: cw * 0.32}}});
  y = lastY() + 2;

  // Products table (dark red header)
  const prodRows: RowInput[] = products.length > 0 ? products.map(p => [p.load_qty != null ? Number(p.load_qty).toFixed(2) : '\u2014', f(p.item_code) || '\u2014', f(p.description) || '\u2014', (f(p.ticket_qty_unit || p.order_qty_unit) || '\u2014').toLowerCase(), '', 'ON ACCOUNT']) : [[{content: 'No products recorded', colSpan: 6, styles: {halign: 'center' as const, fontStyle: 'italic' as const, textColor: P.muted}}]];
  autoTable(doc, {startY: y, margin: {left: ml, right: mr}, ...tbl, head: [['Load Quantity', 'Product Code', 'Product Description', 'Unit Of Measure', 'Unit Price', 'Amount']], body: prodRows, headStyles: {fillColor: P.prodHead, textColor: P.white, fontStyle: 'bold', fontSize: 6.5, halign: 'center'}, alternateRowStyles: {fillColor: P.rowAlt}, bodyStyles: {fillColor: P.rowWhite}, styles: {...tbl.styles, fontSize: 6.8}, columnStyles: {0: {halign: 'center', cellWidth: 22}, 1: {halign: 'center', cellWidth: 26}, 2: {cellWidth: 'auto'}, 3: {halign: 'center', cellWidth: 22}, 4: {halign: 'right', cellWidth: 18}, 5: {halign: 'right', cellWidth: 24}}});
  y = lastY() + 1;

  // Totals
  const totW = cw * 0.34;
  autoTable(doc, {startY: y, margin: {left: pw - mr - totW, right: mr}, ...tbl, body: [
    [{content: 'Sub Total:', styles: {...lbl, halign: 'right' as const}}, {content: '', styles: val}],
    [{content: 'Tax:', styles: {...lbl, halign: 'right' as const}}, {content: '', styles: val}],
    [{content: 'Total:', styles: {...lbl, halign: 'right' as const, fontStyle: 'bold' as const}}, {content: 'ON ACCOUNT', styles: {...val, halign: 'left' as const}}],
  ] as RowInput[], styles: {...tbl.styles, fontSize: 7, cellPadding: 1.2}, columnStyles: {0: {cellWidth: totW * 0.5}, 1: {cellWidth: totW * 0.5}}});
  y = lastY() + 2;

  // Delivery Timeline
  const tEndLoad = fmtTime(ticket.loaded_time) || '\u2014';
  const tToJob = fmtTime(ticket.to_job_time) || '\u2014';
  const tOnJob = fmtTime(ticket.on_job_time) || '\u2014';
  const tPour = fmtTime(ticket.unload_time) || '\u2014';
  const tWash = fmtTime(ticket.wash_time) || '\u2014';
  const tToPlant = fmtTime(ticket.to_plant_time) || '\u2014';
  const tAtPlant = fmtTime(ticket.at_plant_time) || '\u2014';
  autoTable(doc, {startY: y, margin: {left: ml, right: mr}, ...tbl, body: [
    [{content: 'End Load', styles: lbl}, {content: tEndLoad, styles: val}, {content: 'To Job:', styles: lbl}, {content: tToJob, styles: val}, {content: 'On Job:', styles: lbl}, {content: tOnJob, styles: val}, {content: 'Pouring:', styles: lbl}, {content: tPour, styles: val}],
    [{content: 'Washing:', styles: lbl}, {content: tWash, styles: val}, {content: 'To Plant:', styles: lbl}, {content: tToPlant, styles: val}, {content: 'At Plant:', styles: lbl}, {content: tAtPlant, styles: val}, {content: '', styles: lbl}, {content: '', styles: val}],
  ] as RowInput[], columnStyles: {0: {cellWidth: cw * 0.12}, 1: {cellWidth: cw * 0.13}, 2: {cellWidth: cw * 0.12}, 3: {cellWidth: cw * 0.13}, 4: {cellWidth: cw * 0.12}, 5: {cellWidth: cw * 0.13}, 6: {cellWidth: cw * 0.12}, 7: {cellWidth: cw * 0.13}}});
  y = lastY() + 2;

  // Customer Notes
  doc.setTextColor(...P.body); doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
  doc.text('Customer Notes:', ml, y + 2);
  doc.setFillColor(...P.noteBg); doc.setDrawColor(...P.bdr); doc.setLineWidth(0.2);
  doc.rect(ml, y + 3, cw, 12, 'FD');
  y += 22;

  // Terms
  doc.setTextColor(...P.body); doc.setFontSize(5.5); doc.setFont('helvetica', 'normal');
  const t1 = `${company} IS PLEASED TO DELIVER THE CONCRETE OR CONCRETE PRODUCTS ("PRODUCT") DESCRIBED ON THIS DELIVERY TICKET. THE UNDERSIGNED ACKNOWLEDGES THAT ALL PRODUCTS AND SERVICES HAVE BEEN RECEIVED IN GOOD ORDER AND CONDITION. PLEASE BE ADVISED THAT THE PRODUCTS AND SERVICES ARE SUBJECT TO ${company}'S TERMS AND CONDITIONS OF SALE - CONCRETE (AVAILABLE ON REQUEST). ANY PROPOSAL OR ATTEMPT TO MODIFY THESE TERMS, INCLUDING BY ANNOTATION ON THIS DELIVERY TICKET, IS EXPRESSLY REJECTED. ANY DISAGREEMENTS WITH THE INFORMATION CONTAINED ON THIS TICKET MUST BE REPORTED WITHIN 24 HOURS OF DELIVERY, OTHERWISE ALL INFORMATION WILL BE DEEMED FINAL.`;
  const t1Lines = doc.splitTextToSize(t1, cw);
  doc.text(t1Lines, ml, y);

  drawFooter(`${company} \u2014 Concrete Delivery Ticket`);

  // ── PAGE 2 — Terms & Signature ──
  doc.addPage();
  drawHeader('Terms & Conditions');
  y = 28;

  doc.setTextColor(...P.body); doc.setFontSize(6); doc.setFont('helvetica', 'normal');
  const terms2 = 'CUSTOMER ACKNOWLEDGES RECEIPT OF THE PRODUCT IN GOOD CONDITION AND AGREES TO THE TERMS AND CONDITIONS OF SALE. THE CUSTOMER WILL NOT HOLD THE PRODUCER LIABLE FOR ANY DAMAGES RESULTING FROM IMPROPER USE, PLACEMENT, OR FINISHING OF THE CONCRETE PRODUCT. CUSTOMER IS RESPONSIBLE FOR ENSURING ADEQUATE ACCESS TO THE DELIVERY SITE AND THAT THE SITE IS SAFE FOR DELIVERY OPERATIONS. ANY ADDITIONAL TIME REQUIRED DUE TO SITE CONDITIONS WILL BE CHARGED AT THE PREVAILING RATE. ALL CLAIMS FOR DEFECTIVE PRODUCT MUST BE MADE IN WRITING WITHIN 72 HOURS OF DELIVERY. PRODUCER\'S LIABILITY SHALL NOT EXCEED THE PURCHASE PRICE OF THE PRODUCT DELIVERED.';
  const t2Lines = doc.splitTextToSize(terms2, cw);
  doc.text(t2Lines, ml, y);
  y += t2Lines.length * 2.6 + 4;

  doc.setTextColor(...P.caution); doc.setFontSize(5); doc.setFont('helvetica', 'bold');
  const redLines = doc.splitTextToSize('ANY DISAGREEMENTS WITH THE INFORMATION CONTAINED ON THIS TICKET MUST BE REPORTED WITHIN 24 HOURS OF DELIVERY, OTHERWISE ALL INFORMATION WILL BE DEEMED FINAL.', cw);
  doc.text(redLines, ml, y);
  y += redLines.length * 2.5 + 6;

  // Signature block
  autoTable(doc, {startY: y, margin: {left: ml, right: mr}, ...tbl, body: [
    [{content: 'Received By:', styles: lbl}, {content: 'Unsigned', styles: val}, {content: 'Signature:', styles: lbl}, {content: 'Unsigned', styles: val}, {content: 'Time Signed:', styles: lbl}, {content: 'Unsigned', styles: val}],
  ] as RowInput[], columnStyles: {0: {cellWidth: cw * 0.13}, 1: {cellWidth: cw * 0.20}, 2: {cellWidth: cw * 0.13}, 3: {cellWidth: cw * 0.20}, 4: {cellWidth: cw * 0.13}, 5: {cellWidth: cw * 0.21}}});

  drawFooter(`${company} \u2014 Concrete Delivery Ticket`);

  // ── PAGE 3 — Concrete Test Results ──
  doc.addPage();
  drawHeader('Concrete Test Results');
  y = 28;

  autoTable(doc, {startY: y, margin: {left: ml, right: mr}, ...tbl, head: [['Material', 'Description', 'Type', 'Design Qty', 'Required', '% VAR', '% Moisture', 'Actual Water', 'Total Water']], body: [[{content: `Test results not submitted for ticket: ${ticket.ticket_code}`, colSpan: 9, styles: {halign: 'center' as const, fontStyle: 'italic' as const, textColor: P.muted}}]] as RowInput[], headStyles: {fillColor: P.prodHead, textColor: P.white, fontStyle: 'bold', fontSize: 6.5, halign: 'center'}, alternateRowStyles: {fillColor: P.rowAlt}, styles: {...tbl.styles, fontSize: 6.5, halign: 'center'}});
  y = lastY() + 4;

  const slumpStr = f(ticket.slump) ? `${f(ticket.slump)}` : '\u2014';
  autoTable(doc, {startY: y, margin: {left: ml, right: mr}, ...tbl, body: [
    [{content: 'Actual Load:', styles: lbl}, {content: qi.load, styles: val}, {content: 'Design W/C:', styles: lbl}, {content: '\u2014', styles: val}, {content: 'Water/Cement:', styles: lbl}, {content: '\u2014', styles: val}],
    [{content: 'Design:', styles: lbl}, {content: '\u2014', styles: val}, {content: 'Actual Water W/C:', styles: lbl}, {content: '\u2014', styles: val}, {content: 'Water To Add:', styles: lbl}, {content: '\u2014', styles: val}],
    [{content: 'Slump:', styles: lbl}, {content: slumpStr, styles: val}, {content: 'Water in Truck:', styles: lbl}, {content: '\u2014', styles: val}, {content: 'Adjust Water:', styles: lbl}, {content: '\u2014', styles: val}],
    [{content: 'Trim Water:', styles: lbl}, {content: '\u2014', styles: val}, {content: 'Total Load Weights:', styles: lbl}, {content: qi.total, styles: val, colSpan: 3}],
  ] as RowInput[], columnStyles: {0: {cellWidth: cw / 6}, 1: {cellWidth: cw / 6}, 2: {cellWidth: cw / 6}, 3: {cellWidth: cw / 6}, 4: {cellWidth: cw / 6}, 5: {cellWidth: cw / 6}}});

  drawFooter(`${company} \u2014 Concrete Delivery Ticket`);

  return doc;
}

export async function buildLocalPdf(scan: ScanRecord, ticketCode: string): Promise<string> {
  const tkTicketData = scan.tkData as TKTicketData | undefined;

  let ticket = scan.fullTicket;
  let orderCode = scan.orderCode;

  if (!ticket && scan.apiData && scan.tkData?.kind === 'ticket') {
    ticket = buildFullTicketFromApi(scan.apiData as APITicketDetails, tkTicketData);
    orderCode = orderCode || (scan.apiData as APITicketDetails).order_code;
  }

  if (ticket) {
    const qrDataUrl = generateQrDataUrl(scan.data);
    const doc = buildJsPdf(ticket, orderCode, qrDataUrl, tkTicketData?.tenantName, tkTicketData?.tenantSubdomain);
    const arrayBuffer = doc.output('arraybuffer');
    const BufferClass = getBuffer();
    const base64 = BufferClass.from(arrayBuffer).toString('base64');
    const filePath = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/ticket-${ticketCode}.pdf`;
    await ReactNativeBlobUtil.fs.writeFile(filePath, base64, 'base64');
    return filePath;
  }

  throw new Error('No ticket data available for PDF generation');
}
