import type {
  ComponentWarranty,
  FamilyMember,
  Product,
  ProductCategory,
  ReadinessCheckItem,
  ReadinessResult,
  RepairRecord,
  WarrantyClaim,
} from '../types/warranty';

export const CURRENT_REFERENCE_DATE = new Date('2026-11-17T12:00:00');

export function daysUntil(isoDate: string): number {
  const target = new Date(`${isoDate}T12:00:00`);
  const diffMs = target.getTime() - CURRENT_REFERENCE_DATE.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function formatShortDate(isoDate: string): string {
  if (!isoDate) return '—';
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCurrencyExact(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export type WarrantyHealthState = 'active' | 'expiring_soon' | 'expired';

export function getWarrantyHealth(expiryDate: string): {
  state: WarrantyHealthState;
  daysRemaining: number;
  label: string;
} {
  const days = daysUntil(expiryDate);
  if (days < 0) {
    return {
      state: 'expired',
      daysRemaining: days,
      label: `Expired ${Math.abs(days)}d ago`,
    };
  }
  if (days <= 60) {
    return {
      state: 'expiring_soon',
      daysRemaining: days,
      label: days === 0 ? 'Expires today' : `${days}d remaining`,
    };
  }
  return {
    state: 'active',
    daysRemaining: days,
    label: days > 365 ? `${(days / 365).toFixed(1)} yrs left` : `${days}d remaining`,
  };
}

export function getProductOverallCoverage(warranties: ComponentWarranty[]): {
  state: WarrantyHealthState;
  activeCount: number;
  expiringSoonCount: number;
  nextExpiryDate: string | null;
} {
  if (warranties.length === 0) {
    return { state: 'expired', activeCount: 0, expiringSoonCount: 0, nextExpiryDate: null };
  }

  let activeCount = 0;
  let expiringSoonCount = 0;
  let soonestActiveDate: string | null = null;
  let soonestActiveDays = Infinity;

  for (const w of warranties) {
    const health = getWarrantyHealth(w.expiryDate);
    if (health.state === 'active' || health.state === 'expiring_soon') {
      activeCount++;
      if (health.state === 'expiring_soon') expiringSoonCount++;
      if (health.daysRemaining < soonestActiveDays) {
        soonestActiveDays = health.daysRemaining;
        soonestActiveDate = w.expiryDate;
      }
    }
  }

  if (expiringSoonCount > 0) {
    return {
      state: 'expiring_soon',
      activeCount,
      expiringSoonCount,
      nextExpiryDate: soonestActiveDate,
    };
  }
  if (activeCount > 0) {
    return {
      state: 'active',
      activeCount,
      expiringSoonCount: 0,
      nextExpiryDate: soonestActiveDate,
    };
  }
  return {
    state: 'expired',
    activeCount: 0,
    expiringSoonCount: 0,
    nextExpiryDate: warranties[0].expiryDate,
  };
}

export function evaluateClaimReadiness(
  product: Product,
  claim?: WarrantyClaim
): ReadinessResult {
  const hasInvoice = product.documents.some((d) => d.type === 'invoice');
  const hasWarrantyCert = product.documents.some((d) => d.type === 'warranty_certificate');
  const hasPhotoOrEvidence = product.documents.some(
    (d) => d.type === 'product_photo' || d.type === 'defect_evidence'
  );
  const hasSerial = Boolean(product.serialNumber && product.serialNumber.trim().length >= 4);
  const hasActiveWarranty = product.warranties.some(
    (w) => getWarrantyHealth(w.expiryDate).state !== 'expired'
  );

  const checks: ReadinessCheckItem[] = [
    {
      id: 'invoice',
      label: 'Purchase Invoice Proof',
      passed: hasInvoice,
      detail: hasInvoice
        ? `Invoice ${product.invoiceNumber || 'document'} stored in Digital Vault`
        : 'Missing itemized purchase receipt or tax invoice',
      fixActionLabel: 'Upload Invoice',
      fixTarget: 'vault_invoice',
    },
    {
      id: 'serial',
      label: 'Verified Serial Number',
      passed: hasSerial,
      detail: hasSerial
        ? `Recorded serial ${product.serialNumber}`
        : 'Serial number missing — required by manufacturer portal',
      fixActionLabel: 'Add Serial',
      fixTarget: 'serial',
    },
    {
      id: 'warranty_cert',
      label: 'Warranty Certificate / Policy',
      passed: hasWarrantyCert,
      detail: hasWarrantyCert
        ? 'Coverage certificate or extended plan PDF attached'
        : 'Upload manufacturer warranty card or protection plan schedule',
      fixActionLabel: 'Attach Policy',
      fixTarget: 'vault_warranty',
    },
    {
      id: 'evidence',
      label: 'Product / Defect Photo Evidence',
      passed: hasPhotoOrEvidence,
      detail: hasPhotoOrEvidence
        ? 'Serial plate or fault condition photograph stored'
        : 'Add at least one clear photo of unit nameplate or fault',
      fixActionLabel: 'Upload Photo',
      fixTarget: 'vault_photo',
    },
    {
      id: 'coverage',
      label: 'Active Component Coverage',
      passed: hasActiveWarranty,
      detail: hasActiveWarranty
        ? `${product.warranties.filter((w) => getWarrantyHealth(w.expiryDate).state !== 'expired').length} active component warranty tier(s)`
        : 'All registered warranty tiers have expired',
      fixActionLabel: 'Review Coverage',
      fixTarget: 'coverage',
    },
  ];

  if (claim) {
    const hasInteractionRef =
      claim.interactions.some((i) => Boolean(i.referenceCode)) || Boolean(claim.claimNumber);
    checks.push({
      id: 'ticket_ref',
      label: 'Complaint / Service Reference',
      passed: hasInteractionRef,
      detail: hasInteractionRef
        ? `Logged reference ${claim.claimNumber}`
        : 'Add OEM complaint or ticket number from service desk',
    });
  }

  const passedCount = checks.filter((c) => c.passed).length;
  const totalCount = checks.length;
  const missingSummary = checks.filter((c) => !c.passed).map((c) => c.label);

  return {
    passedCount,
    totalCount,
    isClaimReady: passedCount === totalCount,
    missingSummary,
    checks,
  };
}

export interface OcrExtractedInvoice {
  name: string;
  brand: string;
  modelNumber: string;
  serialNumber: string;
  category: ProductCategory;
  purchaseDate: string;
  purchasePrice: number;
  retailer: string;
  invoiceNumber: string;
  confidenceNote: string;
  suggestedWarranties: Omit<ComponentWarranty, 'id'>[];
}

export const SAMPLE_OCR_INVOICES: Array<{
  id: string;
  label: string;
  fileName: string;
  rawText: string;
  extracted: OcrExtractedInvoice;
}> = [
  {
    id: 'sample_sony',
    label: 'Best Buy — Sony Headphones',
    fileName: 'BestBuy_INV-884120_SonyWH1000XM5.pdf',
    rawText: `BEST BUY RETAIL RECEIPT\nStore #0412 · San Jose, CA\nInvoice: BB-2026-884120\nDate: 2026-10-12\nItem: Sony WH-1000XM5 Wireless Noise Canceling Headphones\nModel: WH1000XM5/B  S/N: SN-SOX5-994021\nUnit Price: $349.99\nBest Buy Total Protection (2-Year Accidental): Included\nTotal Paid: $349.99`,
    extracted: {
      name: 'Sony WH-1000XM5 Wireless Headphones',
      brand: 'Sony',
      modelNumber: 'WH1000XM5/B',
      serialNumber: 'SN-SOX5-994021',
      category: 'Television & Audio',
      purchaseDate: '2026-10-12',
      purchasePrice: 349.99,
      retailer: 'Best Buy',
      invoiceNumber: 'BB-2026-884120',
      confidenceNote: 'Extracted 8 of 8 receipt fields from invoice header and line items.',
      suggestedWarranties: [
        {
          componentName: 'Headset Electronics & Drivers',
          coverageType: 'Manufacturer Base',
          provider: 'Sony Electronics',
          startDate: '2026-10-12',
          expiryDate: '2027-10-12',
          termsSummary: '1-year limited hardware defect coverage on ANC drivers and Bluetooth board.',
        },
        {
          componentName: 'Accidental & Battery Protection',
          coverageType: 'Extended Plan',
          provider: 'Best Buy Protection',
          startDate: '2026-10-12',
          expiryDate: '2028-10-12',
          termsSummary: '2-year ADH coverage including lithium cell degradation below 80%.',
        },
      ],
    },
  },
  {
    id: 'sample_miele',
    label: 'Costco — Miele Dishwasher',
    fileName: 'Costco_Appliance_Miele_G7106.pdf',
    rawText: `COSTCO WHOLESALE ONLINE\nOrder #: CW-77319044\nPurchase Date: 2026-08-22\nProduct: Miele G 7106 SCU Clean Touch Steel Dishwasher\nModel: G7106SCU  Serial: ML-7106-4410882\nSubtotal: $1,699.00\nCostco 2nd Year Concierge Warranty Included\nManufacturer Circulation Pump Coverage: 5 Years`,
    extracted: {
      name: 'Miele G 7106 SCU Dishwasher',
      brand: 'Miele',
      modelNumber: 'G7106SCU',
      serialNumber: 'ML-7106-4410882',
      category: 'Kitchen Appliance',
      purchaseDate: '2026-08-22',
      purchasePrice: 1699,
      retailer: 'Costco Wholesale',
      invoiceNumber: 'CW-77319044',
      confidenceNote: 'Matched model number, serial tag, and multi-tier concierge warranty terms.',
      suggestedWarranties: [
        {
          componentName: 'Full Appliance Parts & Labor',
          coverageType: 'Manufacturer Base',
          provider: 'Miele USA + Costco Concierge',
          startDate: '2026-08-22',
          expiryDate: '2028-08-22',
          termsSummary: 'Combined 1-year OEM plus 2nd-year Costco Concierge parts and labor.',
        },
        {
          componentName: 'Waterproof System & Circulation Pump',
          coverageType: 'Component Specific',
          provider: 'Miele USA',
          startDate: '2026-08-22',
          expiryDate: '2031-08-22',
          termsSummary: '5-year component warranty covering circulation motor and flood-stop valve.',
        },
      ],
    },
  },
  {
    id: 'sample_samsung',
    label: 'Amazon — Samsung 4K Monitor',
    fileName: 'Amazon_Order_114-5520911_SamsungMonitor.txt',
    rawText: `Amazon.com Tax Invoice\nOrder # 114-5520911-8832104\nOrder Placed: 2026-11-02\nItem: Samsung 32" ViewFinity S8 4K UHD Monitor\nModel: LS32B800PXNXGO  Serial: Z9KM32B801142\nPrice: $579.00\nStandard 3-Year Commercial & Consumer Panel Warranty`,
    extracted: {
      name: 'Samsung 32" ViewFinity S8 4K Monitor',
      brand: 'Samsung',
      modelNumber: 'LS32B800PXNXGO',
      serialNumber: 'Z9KM32B801142',
      category: 'Computing & Mobile',
      purchaseDate: '2026-11-02',
      purchasePrice: 579,
      retailer: 'Amazon',
      invoiceNumber: '114-5520911-8832104',
      confidenceNote: 'Parsed Amazon order reference, unit price, and 3-year display warranty.',
      suggestedWarranties: [
        {
          componentName: 'IPS Panel, Backlight & Power Board',
          coverageType: 'Manufacturer Base',
          provider: 'Samsung Electronics',
          startDate: '2026-11-02',
          expiryDate: '2029-11-02',
          termsSummary: '3-year carry-in/mail-in panel and power supply replacement warranty.',
        },
      ],
    },
  },
];

export function parseUploadedInvoiceText(rawText: string, fileName: string): OcrExtractedInvoice {
  const cleanName = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
  const priceMatch = rawText.match(/\$\s?([0-9,]+\.?[0-9]{0,2})/);
  const parsedPrice = priceMatch ? Number(priceMatch[1].replace(/,/g, '')) : 499;

  const dateMatch = rawText.match(/(202[0-9]-[0-1][0-9]-[0-3][0-9])/);
  const parsedDate = dateMatch ? dateMatch[1] : '2026-11-05';

  const invMatch = rawText.match(/(?:Invoice|Order|INV|Receipt)\s*[#:]*\s*([A-Z0-9-]{5,24})/i);
  const parsedInv = invMatch ? invMatch[1] : `INV-${Math.floor(100000 + Math.random() * 899999)}`;

  const serialMatch = rawText.match(/(?:Serial|S\/N|SN)\s*[#:]*\s*([A-Z0-9-]{5,24})/i);
  const parsedSerial = serialMatch ? serialMatch[1] : `SN-${Math.floor(100000 + Math.random() * 899999)}`;

  const modelMatch = rawText.match(/(?:Model|SKU)\s*[#:]*\s*([A-Z0-9/-]{4,24})/i);
  const parsedModel = modelMatch ? modelMatch[1] : 'MOD-2026-X1';

  const brands = ['LG', 'Samsung', 'Sony', 'Apple', 'Bosch', 'Breville', 'Dyson', 'Miele', 'Whirlpool', 'Dell'];
  const matchedBrand =
    brands.find((b) => rawText.toLowerCase().includes(b.toLowerCase()) || cleanName.toLowerCase().includes(b.toLowerCase())) ||
    'Bosch';

  const retailers = ['Amazon', 'Best Buy', 'Costco', 'Home Depot', 'Apple Store', 'Target'];
  const matchedRetailer =
    retailers.find((r) => rawText.toLowerCase().includes(r.toLowerCase()) || cleanName.toLowerCase().includes(r.toLowerCase())) ||
    'Authorized Retailer';

  const startYear = Number(parsedDate.slice(0, 4)) || 2026;
  const restDate = parsedDate.slice(4) || '-11-05';

  return {
    name: cleanName.length > 4 ? cleanName : `${matchedBrand} Registered Appliance`,
    brand: matchedBrand,
    modelNumber: parsedModel,
    serialNumber: parsedSerial,
    category: 'Home Care',
    purchaseDate: parsedDate,
    purchasePrice: Number.isFinite(parsedPrice) ? parsedPrice : 499,
    retailer: matchedRetailer,
    invoiceNumber: parsedInv,
    confidenceNote: `OCR parsed ${fileName}. Review extracted invoice fields before saving.`,
    suggestedWarranties: [
      {
        componentName: 'Standard Manufacturer Coverage',
        coverageType: 'Manufacturer Base',
        provider: matchedBrand,
        startDate: parsedDate,
        expiryDate: `${startYear + 1}${restDate}`,
        termsSummary: '1-year parts and labor coverage from invoice date.',
      },
      {
        componentName: 'Motor / Core Assembly',
        coverageType: 'Component Specific',
        provider: matchedBrand,
        startDate: parsedDate,
        expiryDate: `${startYear + 5}${restDate}`,
        termsSummary: '5-year component-only replacement guarantee.',
      },
    ],
  };
}

export function generateClaimDossierHtml(
  product: Product,
  claim: WarrantyClaim | null,
  owner: FamilyMember | undefined,
  repairs: RepairRecord[]
): string {
  const readiness = evaluateClaimReadiness(product, claim || undefined);
  const activeWarranty = claim
    ? product.warranties.find((w) => w.id === claim.warrantyId)
    : product.warranties[0];

  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Claim Dossier — ${escapeHtml(product.name)}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; color: #0f172a; margin: 40px auto; max-width: 820px; line-height: 1.5; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.04em; color: #475569; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin: 28px 0 12px; }
    .meta { color: #475569; font-size: 13px; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px; }
    th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    th { color: #475569; font-weight: 600; width: 30%; }
    .mono { font-family: ui-monospace, monospace; }
  </style>
</head>
<body>
  <h1>Warranty Claim Dossier: ${escapeHtml(product.name)}</h1>
  <div class="meta">
    Generated via WarrantyTrail ClaimReady · Date: ${formatShortDate('2026-11-17')} · Owner: ${escapeHtml(owner?.name || 'Household Vault')}
    ${claim ? ` · Claim Reference: ${escapeHtml(claim.claimNumber)} (${escapeHtml(claim.status)})` : ''}
  </div>

  <h2>01. Product & Purchase Verification</h2>
  <table>
    <tr><th>Brand / Model</th><td>${escapeHtml(product.brand)} — <span class="mono">${escapeHtml(product.modelNumber)}</span></td></tr>
    <tr><th>Serial Number</th><td class="mono">${escapeHtml(product.serialNumber)}</td></tr>
    <tr><th>Purchase Date & Price</th><td>${formatShortDate(product.purchaseDate)} · ${formatCurrencyExact(product.purchasePrice)}</td></tr>
    <tr><th>Retailer & Invoice #</th><td>${escapeHtml(product.retailer)} · <span class="mono">${escapeHtml(product.invoiceNumber)}</span></td></tr>
  </table>

  <h2>02. Applicable Warranty Coverage</h2>
  <table>
    <thead><tr><th>Component</th><th>Provider</th><th>Expiry</th><th>Terms</th></tr></thead>
    <tbody>
      ${product.warranties
        .map(
          (w) => `<tr>
          <td><strong>${escapeHtml(w.componentName)}</strong>${activeWarranty?.id === w.id ? ' (Primary)' : ''}</td>
          <td>${escapeHtml(w.provider)}</td>
          <td class="mono">${formatShortDate(w.expiryDate)}</td>
          <td>${escapeHtml(w.termsSummary)}</td>
        </tr>`
        )
        .join('')}
    </tbody>
  </table>

  ${
    claim
      ? `<h2>03. Reported Fault & Service Desk</h2>
  <table>
    <tr><th>Issue Summary</th><td><strong>${escapeHtml(claim.issueTitle)}</strong><br/>${escapeHtml(claim.issueDescription)}</td></tr>
    <tr><th>Fault Detected / Submitted</th><td>${formatShortDate(claim.faultDetectedDate)} / ${formatShortDate(claim.submittedDate)}</td></tr>
    <tr><th>Authorized Service Center</th><td>${escapeHtml(claim.serviceCenterName)} (${escapeHtml(claim.serviceCenterContact)})</td></tr>
  </table>
  <h2>04. Chronological Interaction Log</h2>
  <table>
    <thead><tr><th>Date & Channel</th><th>Agent / Ref</th><th>Summary</th></tr></thead>
    <tbody>
      ${claim.interactions
        .map(
          (i) => `<tr>
          <td class="mono">${escapeHtml(i.date)} ${escapeHtml(i.time)} · ${escapeHtml(i.channel)}</td>
          <td>${escapeHtml(i.agentName)}${i.referenceCode ? `<br/><span class="mono">${escapeHtml(i.referenceCode)}</span>` : ''}</td>
          <td>${escapeHtml(i.summary)}</td>
        </tr>`
        )
        .join('')}
    </tbody>
  </table>`
      : ''
  }

  <h2>Vault Evidence & Claim Readiness (${readiness.passedCount}/${readiness.totalCount} Verified)</h2>
  <table>
    <thead><tr><th>Document / Requirement</th><th>Status</th><th>Record Detail</th></tr></thead>
    <tbody>
      ${readiness.checks
        .map(
          (c) => `<tr>
          <td>${escapeHtml(c.label)}</td>
          <td>${c.passed ? 'Verified' : 'Missing'}</td>
          <td>${escapeHtml(c.detail)}</td>
        </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <h2>Repair & Lifetime Expense History</h2>
  ${
    repairs.length === 0
      ? '<p style="font-size:13px;color:#64748b;">No prior repair logs recorded for this product.</p>'
      : `<table>
      <thead><tr><th>Date</th><th>Provider & Parts</th><th>Warranty Covered</th><th>Out-of-Pocket</th></tr></thead>
      <tbody>
        ${repairs
          .map(
            (r) => `<tr>
            <td class="mono">${formatShortDate(r.repairDate)}</td>
            <td>${escapeHtml(r.serviceProvider)} — ${escapeHtml(r.description)} (${escapeHtml(r.partsReplaced)})</td>
            <td>${r.coveredByWarranty ? 'Yes' : 'No'}</td>
            <td class="mono">${formatCurrencyExact(r.outOfPocketPaid)}</td>
          </tr>`
          )
          .join('')}
      </tbody>
    </table>`
  }
</body>
</html>`;
}

export function downloadTextOrHtmlFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
