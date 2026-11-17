import { CheckCircle2, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { Product, RecallAlert, RecallStatus } from '../types/warranty';
import { formatShortDate } from '../utils/warrantyUtils';

interface RecallsViewProps {
  products: Product[];
  recalls: RecallAlert[];
  onUpdateRecallStatus: (recallId: string, status: RecallStatus) => void;
  onSelectProduct: (
    productId: string,
    initialTab?: 'coverage' | 'vault' | 'readiness' | 'repairs'
  ) => void;
}

export function RecallsView({
  products,
  recalls,
  onUpdateRecallStatus,
  onSelectProduct,
}: RecallsViewProps) {
  const matchedRecalls = recalls.filter(
    (r) => r.matchedProductId && products.some((p) => p.id === r.matchedProductId)
  );
  const generalRecalls = recalls.filter(
    (r) => !r.matchedProductId || !products.some((p) => p.id === r.matchedProductId)
  );

  return (
    <div className="space-y-8">
      {/* Matched Household Recalls */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Matched Safety Notices for Your Inventory ({matchedRecalls.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified recalls and manufacturer bulletins cross-referenced against your registered models and serial prefixes
          </p>
        </div>

        <div className="divide-y divide-slate-200">
          {matchedRecalls.map((recall) => {
            const matchedProduct = products.find((p) => p.id === recall.matchedProductId);
            if (!matchedProduct) return null;

            return (
              <div key={recall.id} className="p-6 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      {recall.status === 'Action Needed' ? (
                        <span className="inline-flex items-center gap-1.5 text-red-700">
                          <ShieldAlert className="h-4 w-4" />
                          <span>{recall.severity}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{recall.status}</span>
                        </span>
                      )}
                      <span className="text-slate-400" aria-hidden="true">
                        ·
                      </span>
                      <span className="font-mono text-slate-600">{recall.recallCode}</span>
                      <span className="text-slate-400" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-slate-500">
                        Issued {formatShortDate(recall.issuedDate)}
                      </span>
                    </div>

                    <h3 className="font-display text-base font-bold text-slate-900">
                      {recall.title}
                    </h3>

                    <p className="text-xs text-slate-600">
                      Matched Vault Product:{' '}
                      <button
                        type="button"
                        onClick={() => onSelectProduct(matchedProduct.id, 'coverage')}
                        className="font-semibold text-blue-700 hover:underline"
                      >
                        {matchedProduct.name}
                      </button>{' '}
                      <span className="font-mono text-slate-500">
                        (Model {matchedProduct.modelNumber} · S/N {matchedProduct.serialNumber})
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {(
                      ['Action Needed', 'Remedy Scheduled', 'Not Affected', 'Resolved'] as const
                    ).map((statusOption) => (
                      <button
                        key={statusOption}
                        type="button"
                        onClick={() => onUpdateRecallStatus(recall.id, statusOption)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                          recall.status === statusOption
                            ? statusOption === 'Action Needed'
                              ? 'bg-red-700 text-white'
                              : 'bg-slate-900 text-white'
                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {statusOption}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                    <p className="font-semibold text-slate-700 mb-1">Hazard Detail</p>
                    <p className="text-slate-600 leading-relaxed">{recall.hazardDescription}</p>
                  </div>
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                    <p className="font-semibold text-slate-700 mb-1">Recommended Remedy</p>
                    <p className="text-slate-600 leading-relaxed">{recall.remedyAction}</p>
                    <p className="mt-2 font-mono text-slate-500">
                      Authority: {recall.authority} · {recall.verifiedUrlLabel}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          {matchedRecalls.length === 0 && (
            <div className="p-10 text-center">
              <ShieldCheck className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-900">
                No active recall matches in selected vault scope
              </p>
              <p className="text-xs text-slate-500 mt-1">
                All products in this scope clear current CPSC and OEM recall feeds.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* General Verified Recall Feed */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="font-display text-base font-semibold text-slate-900">
            Recent Verified Consumer Appliance Bulletins
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitored public safety feeds not currently matched to your registered serials
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {generalRecalls.map((r) => (
            <div key={r.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500 font-mono">
                  {r.recallCode} · {r.manufacturer} · {formatShortDate(r.issuedDate)}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900">{r.title}</p>
                <p className="mt-0.5 text-xs text-slate-600">{r.hazardDescription}</p>
              </div>
              <span className="text-xs font-medium text-slate-500 shrink-0 whitespace-nowrap">
                No match in vault
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
