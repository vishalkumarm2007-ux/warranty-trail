import { Download, Printer, ShieldCheck, AlertCircle, X } from 'lucide-react';
import type {
  FamilyMember,
  Product,
  RepairRecord,
  WarrantyClaim,
} from '../types/warranty';
import {
  downloadTextOrHtmlFile,
  evaluateClaimReadiness,
  formatCurrencyExact,
  formatShortDate,
  generateClaimDossierHtml,
} from '../utils/warrantyUtils';

interface ClaimDossierModalProps {
  product: Product;
  claim: WarrantyClaim | null;
  owner: FamilyMember | undefined;
  repairs: RepairRecord[];
  onClose: () => void;
}

export function ClaimDossierModal({
  product,
  claim,
  owner,
  repairs,
  onClose,
}: ClaimDossierModalProps) {
  const readiness = evaluateClaimReadiness(product, claim || undefined);
  const productRepairs = repairs.filter((r) => r.productId === product.id);

  const handleDownloadHtml = () => {
    const html = generateClaimDossierHtml(product, claim, owner, productRepairs);
    const slug = product.modelNumber.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    downloadTextOrHtmlFile(html, `Claim_Dossier_${slug}.html`, 'text/html;charset=utf-8');
  };

  const handleDownloadTxt = () => {
    const lines = [
      `WARRANTYTRAIL CLAIMREADY — OFFICIAL CLAIM DOSSIER`,
      `Generated: November 17, 2026`,
      `Product: ${product.name}`,
      `Brand / Model: ${product.brand} / ${product.modelNumber}`,
      `Serial Number: ${product.serialNumber}`,
      `Purchase Date: ${product.purchaseDate} | Price: ${formatCurrencyExact(product.purchasePrice)}`,
      `Retailer & Invoice #: ${product.retailer} | ${product.invoiceNumber}`,
      ``,
      `WARRANTY COVERAGE TIERS:`,
      ...product.warranties.map(
        (w) => `- ${w.componentName} (${w.provider}) | Expires: ${w.expiryDate} | ${w.termsSummary}`
      ),
      ``,
      `CLAIM READINESS (${readiness.passedCount}/${readiness.totalCount}):`,
      ...readiness.checks.map((c) => `[${c.passed ? 'OK' : 'MISSING'}] ${c.label}: ${c.detail}`),
      ``,
      ...(claim
        ? [
            `ACTIVE CLAIM REFERENCE: ${claim.claimNumber} (${claim.status})`,
            `Issue: ${claim.issueTitle}`,
            `Details: ${claim.issueDescription}`,
            `Service Center: ${claim.serviceCenterName} (${claim.serviceCenterContact})`,
            `Interaction Timeline:`,
            ...claim.interactions.map(
              (i) =>
                `  * ${i.date} ${i.time} [${i.channel}] ${i.agentName} (${i.referenceCode || 'No Ref'}): ${i.summary}`
            ),
            ``,
          ]
        : []),
      `REPAIR HISTORY:`,
      ...(productRepairs.length > 0
        ? productRepairs.map(
            (r) =>
              `- ${r.repairDate} | ${r.serviceProvider} | ${r.description} | Paid: ${formatCurrencyExact(r.outOfPocketPaid)}`
          )
        : ['No prior repair records logged.']),
    ];

    const slug = product.modelNumber.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    downloadTextOrHtmlFile(lines.join('\n'), `Claim_Dossier_${slug}.txt`, 'text/plain;charset=utf-8');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dossier-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-xl">
        {/* Toolbar (hidden on print) */}
        <div className="no-print px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div>
            <h2 id="dossier-title" className="font-display text-base font-bold text-slate-900">
              Claim Dossier Report Preview
            </h2>
            <p className="text-xs text-slate-500">
              Compiled evidence packet ready for manufacturer portal upload or service center inspection
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleDownloadTxt}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-100 inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export .TXT</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadHtml}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-100 inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download HTML</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-1.5 rounded-lg bg-blue-700 text-xs font-semibold text-white hover:bg-blue-800 inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200"
              aria-label="Close dossier preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div
          id="claim-dossier-printable"
          className="p-8 overflow-y-auto flex-1 space-y-8 bg-white text-slate-900"
        >
          <div className="border-b border-slate-300 pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-blue-700 tracking-wide">
                WARRANTYTRAIL CLAIMREADY DOSSIER
              </p>
              <h3 className="mt-1 font-display text-2xl font-bold text-slate-900">
                {product.name}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Owner: {owner?.name || 'Household Vault'} · Prepared November 17, 2026
                {claim ? ` · Claim Ref: ${claim.claimNumber}` : ''}
              </p>
            </div>
            <div className="text-left sm:text-right text-xs">
              {readiness.isClaimReady ? (
                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                  <ShieldCheck className="h-4 w-4" />
                  <span>
                    Readiness Verified ({readiness.passedCount}/{readiness.totalCount})
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700">
                  <AlertCircle className="h-4 w-4" />
                  <span>
                    Incomplete Packet ({readiness.passedCount}/{readiness.totalCount})
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* Section 1: Purchase & Product Identification */}
          <section>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              01. Product &amp; Purchase Evidence
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border border-slate-200 rounded-lg p-4 text-xs">
              <div>
                <span className="text-slate-500 block">Brand &amp; Model</span>
                <span className="font-semibold text-slate-900">
                  {product.brand} · <span className="font-mono">{product.modelNumber}</span>
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Serial Number</span>
                <span className="font-mono font-semibold text-slate-900">
                  {product.serialNumber || 'Not recorded'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Purchase Date &amp; Total</span>
                <span className="font-semibold text-slate-900 tabular-nums">
                  {formatShortDate(product.purchaseDate)} ·{' '}
                  {formatCurrencyExact(product.purchasePrice)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Retailer &amp; Invoice #</span>
                <span className="font-semibold text-slate-900">
                  {product.retailer} · <span className="font-mono">{product.invoiceNumber}</span>
                </span>
              </div>
            </div>
          </section>

          {/* Section 2: Component Warranty Terms */}
          <section>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              02. Component Warranty Breakdown
            </h4>
            <table className="w-full text-left border-collapse text-xs border border-slate-200">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="py-2.5 px-3">Component</th>
                  <th className="py-2.5 px-3">Provider</th>
                  <th className="py-2.5 px-3">Expiry</th>
                  <th className="py-2.5 px-3">Coverage Terms</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {product.warranties.map((w) => (
                  <tr key={w.id}>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{w.componentName}</td>
                    <td className="py-2.5 px-3 text-slate-700">{w.provider}</td>
                    <td className="py-2.5 px-3 font-mono tabular-nums">
                      {formatShortDate(w.expiryDate)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{w.termsSummary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Section 3: Active Claim & Interaction History */}
          {claim && (
            <section>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                03. Claim Details &amp; Service Interaction Log
              </h4>
              <div className="border border-slate-200 rounded-lg p-4 text-xs space-y-2 mb-4">
                <p className="text-sm font-semibold text-slate-900">{claim.issueTitle}</p>
                <p className="text-slate-700">{claim.issueDescription}</p>
                <p className="text-slate-500 pt-1">
                  Status: <strong className="text-slate-900">{claim.status}</strong> · Service
                  Center: {claim.serviceCenterName} ({claim.serviceCenterContact})
                </p>
              </div>
              <table className="w-full text-left border-collapse text-xs border border-slate-200">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="py-2 px-3">Timestamp &amp; Channel</th>
                    <th className="py-2 px-3">Representative / Ref</th>
                    <th className="py-2 px-3">Interaction Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {claim.interactions.map((i) => (
                    <tr key={i.id}>
                      <td className="py-2 px-3 font-mono tabular-nums whitespace-nowrap">
                        {i.date} {i.time} · {i.channel}
                      </td>
                      <td className="py-2 px-3">
                        {i.agentName}
                        {i.referenceCode ? ` (${i.referenceCode})` : ''}
                      </td>
                      <td className="py-2 px-3 text-slate-700">{i.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* Section 4: Supporting Documents & Repair History */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                04. Vault Supporting Documents
              </h4>
              <ul className="border border-slate-200 rounded-lg divide-y divide-slate-200 text-xs">
                {product.documents.map((doc) => (
                  <li key={doc.id} className="p-3 flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-900 truncate">{doc.name}</span>
                    <span className="text-slate-500 font-mono shrink-0">{doc.fileSize}</span>
                  </li>
                ))}
                {product.documents.length === 0 && (
                  <li className="p-3 text-slate-500">No supporting documents attached yet.</li>
                )}
              </ul>
            </section>

            <section>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                05. Prior Repair History
              </h4>
              <ul className="border border-slate-200 rounded-lg divide-y divide-slate-200 text-xs">
                {productRepairs.map((rep) => (
                  <li key={rep.id} className="p-3">
                    <div className="flex justify-between font-medium text-slate-900">
                      <span>{rep.serviceProvider}</span>
                      <span className="font-mono tabular-nums">
                        {formatCurrencyExact(rep.outOfPocketPaid)}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-0.5">
                      {formatShortDate(rep.repairDate)} · {rep.description}
                    </p>
                  </li>
                ))}
                {productRepairs.length === 0 && (
                  <li className="p-3 text-slate-500">No prior repair records logged.</li>
                )}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
