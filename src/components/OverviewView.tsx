import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileCheck2,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import type {
  FamilyMember,
  FollowUpTask,
  Product,
  RecallAlert,
  RepairRecord,
  ViewId,
  WarrantyClaim,
} from '../types/warranty';
import {
  daysUntil,
  evaluateClaimReadiness,
  formatCurrency,
  formatShortDate,
  getWarrantyHealth,
} from '../utils/warrantyUtils';

interface OverviewViewProps {
  products: Product[];
  claims: WarrantyClaim[];
  followUps: FollowUpTask[];
  repairs: RepairRecord[];
  recalls: RecallAlert[];
  members: FamilyMember[];
  onNavigate: (view: ViewId) => void;
  onSelectProduct: (productId: string, initialTab?: 'coverage' | 'vault' | 'readiness' | 'repairs') => void;
  onToggleFollowUp: (taskId: string) => void;
  onOpenDossier: (productId: string, claimId?: string) => void;
}

export function OverviewView({
  products,
  claims,
  followUps,
  repairs,
  recalls,
  members,
  onNavigate,
  onSelectProduct,
  onToggleFollowUp,
  onOpenDossier,
}: OverviewViewProps) {
  const totalProtectedValue = products.reduce((sum, p) => sum + p.purchasePrice, 0);

  const allComponentWarranties = products.flatMap((p) =>
    p.warranties.map((w) => ({
      product: p,
      warranty: w,
      health: getWarrantyHealth(w.expiryDate),
    }))
  );

  const activeComponentCount = allComponentWarranties.filter(
    (item) => item.health.state !== 'expired'
  ).length;

  const expiringSoonItems = allComponentWarranties
    .filter((item) => item.health.state === 'expiring_soon')
    .sort((a, b) => a.health.daysRemaining - b.health.daysRemaining);

  const openClaims = claims.filter((c) => c.status !== 'Resolved');
  const pendingFollowUps = followUps
    .filter((f) => !f.completed)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const activeRecalls = recalls.filter(
    (r) =>
      r.matchedProductId &&
      products.some((p) => p.id === r.matchedProductId) &&
      r.status === 'Action Needed'
  );

  const warrantySavings = repairs.reduce((sum, r) => sum + r.warrantySavedAmount, 0);

  const readinessSummaries = products.map((product) => ({
    product,
    readiness: evaluateClaimReadiness(product),
    owner: members.find((m) => m.id === product.ownerId),
  }));

  const readyCount = readinessSummaries.filter((r) => r.readiness.isClaimReady).length;

  return (
    <div className="space-y-8">
      {/* Top 4-column metric strip */}
      <section aria-label="Portfolio summary">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-medium text-slate-500">Protected Asset Value</p>
            <p className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
              {formatCurrency(totalProtectedValue)}
            </p>
            <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
              {products.length} registered products · {formatCurrency(warrantySavings)} saved via claims
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-medium text-slate-500">Active Component Coverages</p>
            <p className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
              {activeComponentCount}
            </p>
            <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
              Across {allComponentWarranties.length} tracked component tiers
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-medium text-slate-500">Expiring Within 60 Days</p>
            <p
              className={`mt-2 font-display text-2xl font-bold tabular-nums ${
                expiringSoonItems.length > 0 ? 'text-amber-700' : 'text-slate-900'
              }`}
            >
              {expiringSoonItems.length}
            </p>
            <p className="mt-1.5 text-xs text-slate-500">
              {expiringSoonItems.length > 0
                ? `Next: ${expiringSoonItems[0].product.brand} (${expiringSoonItems[0].health.label})`
                : 'No component tiers expiring soon'}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-medium text-slate-500">Claim Readiness Rate</p>
            <p className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
              {readyCount}/{products.length}
            </p>
            <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
              {openClaims.length} active claim · {pendingFollowUps.length} scheduled follow-ups
            </p>
          </div>
        </div>
      </section>

      {/* Main 2-column workspace: Expiry/Recall Alerts + Service Follow-Ups */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Priority Alerts (Expiring Warranties & Matched Recalls) */}
        <section className="xl:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Warranty Expiry &amp; Safety Alerts
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Component coverages approaching deadline and matched recall bulletins
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('inventory')}
              className="text-xs font-medium text-blue-700 hover:text-blue-800 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <span>View all products</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {activeRecalls.map((recall) => {
              const matchedProduct = products.find((p) => p.id === recall.matchedProductId);
              if (!matchedProduct) return null;
              return (
                <div
                  key={recall.id}
                  className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-red-50/40"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-semibold text-red-700">
                      <ShieldAlert className="h-4 w-4 shrink-0" />
                      <span>Safety Recall Match</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{recall.recallCode}</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {matchedProduct.name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600 line-clamp-2">
                      {recall.title} — {recall.remedyAction}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('recalls')}
                    className="px-3.5 py-2 rounded-lg border border-red-200 bg-white text-xs font-medium text-red-700 hover:bg-red-50 transition-colors whitespace-nowrap shrink-0 self-start sm:self-center"
                  >
                    Inspect Recall
                  </button>
                </div>
              );
            })}

            {expiringSoonItems.map(({ product, warranty, health }) => (
              <div
                key={warranty.id}
                className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-700">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span className="tabular-nums">{health.label}</span>
                    <span aria-hidden="true">·</span>
                    <span>Expires {formatShortDate(warranty.expiryDate)}</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-900 truncate">
                    {product.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Component: {warranty.componentName} · Provider: {warranty.provider}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onSelectProduct(product.id, 'coverage')}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                  >
                    Review Terms
                  </button>
                </div>
              </div>
            ))}

            {activeRecalls.length === 0 && expiringSoonItems.length === 0 && (
              <div className="px-5 py-10 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-900">No urgent expiry or recall alerts</p>
                <p className="text-xs text-slate-500 mt-1">
                  All active component warranties have more than 60 days remaining.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Right: Upcoming Follow-Ups & Open Claims */}
        <section className="xl:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Scheduled Service Follow-ups
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Next actions across service centers and vault tasks
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('claims')}
              className="text-xs font-medium text-blue-700 hover:text-blue-800 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <span>Claims Desk</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {pendingFollowUps.slice(0, 5).map((task) => {
              const product = products.find((p) => p.id === task.productId);
              const dueIn = daysUntil(task.dueDate);
              return (
                <div key={task.id} className="px-5 py-3.5 flex items-start gap-3 hover:bg-slate-50/70">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => onToggleFollowUp(task.id)}
                    aria-label={`Mark "${task.title}" completed`}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 leading-snug">
                      {task.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 tabular-nums">
                      {product?.brand || 'Product'} · Due {formatShortDate(task.dueDate)} (
                      {dueIn < 0 ? `${Math.abs(dueIn)}d overdue` : `in ${dueIn}d`}) · {task.channel}
                    </p>
                  </div>
                  {task.priority === 'High' && (
                    <span className="text-xs font-medium text-amber-700 shrink-0 whitespace-nowrap">
                      Priority
                    </span>
                  )}
                </div>
              );
            })}

            {pendingFollowUps.length === 0 && (
              <div className="px-5 py-8 text-center">
                <CalendarClock className="h-7 w-7 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-900">All follow-ups completed</p>
                <p className="text-xs text-slate-500 mt-1">
                  Schedule new reminders from the Claims &amp; Follow-ups view.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Bottom: Claim Readiness Snapshot Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-200">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Claim Readiness Audit
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verifies invoice proof, serial number, warranty policy, photo evidence, and coverage status per asset
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('inventory')}
            className="text-xs font-medium text-slate-700 hover:text-slate-900 border border-slate-200 rounded-lg px-3 py-1.5 whitespace-nowrap shrink-0 self-start sm:self-center"
          >
            Manage Product Vault
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                <th className="py-3 px-5">Product &amp; Serial</th>
                <th className="py-3 px-4">Owner</th>
                <th className="py-3 px-4">Readiness</th>
                <th className="py-3 px-4">Missing Requirements</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {readinessSummaries.map(({ product, readiness, owner }) => (
                <tr key={product.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-5">
                    <button
                      type="button"
                      onClick={() => onSelectProduct(product.id, 'readiness')}
                      className="text-left group"
                    >
                      <p className="font-medium text-slate-900 group-hover:text-blue-700 transition-colors">
                        {product.name}
                      </p>
                      <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                        {product.brand} · S/N {product.serialNumber || 'Unrecorded'}
                      </p>
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                    {owner?.name || 'Household'}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {readiness.isClaimReady ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 tabular-nums">
                        <ShieldCheck className="h-4 w-4 shrink-0" />
                        <span>
                          Ready ({readiness.passedCount}/{readiness.totalCount})
                        </span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 tabular-nums">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>
                          Incomplete ({readiness.passedCount}/{readiness.totalCount})
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-600">
                    {readiness.missingSummary.length > 0 ? (
                      <span className="text-amber-800">
                        Missing: {readiness.missingSummary.join(' · ')}
                      </span>
                    ) : (
                      <span className="text-slate-500">All claim documents verified</span>
                    )}
                  </td>
                  <td className="py-3.5 px-5 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-3">
                      {!readiness.isClaimReady && (
                        <button
                          type="button"
                          onClick={() => onSelectProduct(product.id, 'readiness')}
                          className="text-xs font-medium text-blue-700 hover:text-blue-800"
                        >
                          Fix Missing
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenDossier(product.id)}
                        className="text-xs font-medium text-slate-700 hover:text-slate-900 inline-flex items-center gap-1"
                      >
                        <FileCheck2 className="h-3.5 w-3.5" />
                        <span>Dossier</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {readinessSummaries.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm text-slate-500">
                    No products match the selected household vault filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
