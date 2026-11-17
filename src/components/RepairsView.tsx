import { useState, type FormEvent } from 'react';
import { Plus, Wrench } from 'lucide-react';
import type { Product, RepairRecord } from '../types/warranty';
import {
  formatCurrency,
  formatCurrencyExact,
  formatShortDate,
} from '../utils/warrantyUtils';

interface RepairsViewProps {
  products: Product[];
  repairs: RepairRecord[];
  onAddRepair: (repair: Omit<RepairRecord, 'id'>) => void;
  onSelectProduct: (
    productId: string,
    initialTab?: 'coverage' | 'vault' | 'readiness' | 'repairs'
  ) => void;
}

export function RepairsView({
  products,
  repairs,
  onAddRepair,
  onSelectProduct,
}: RepairsViewProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [productId, setProductId] = useState(products[0]?.id || '');
  const [repairDate, setRepairDate] = useState('2026-11-17');
  const [serviceProvider, setServiceProvider] = useState('');
  const [description, setDescription] = useState('');
  const [partsReplaced, setPartsReplaced] = useState('');
  const [coveredByWarranty, setCoveredByWarranty] = useState(true);
  const [totalBill, setTotalBill] = useState('180');
  const [outOfPocket, setOutOfPocket] = useState('0');
  const [ticket, setTicket] = useState('');

  const totalPurchaseSpend = products.reduce((sum, p) => sum + p.purchasePrice, 0);
  const totalOutOfPocket = repairs.reduce((sum, r) => sum + r.outOfPocketPaid, 0);
  const totalWarrantySaved = repairs.reduce((sum, r) => sum + r.warrantySavedAmount, 0);
  const lifetimeHouseholdTotal = totalPurchaseSpend + totalOutOfPocket;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!productId || !description.trim()) return;
    const bill = Number(totalBill) || 0;
    const paid = coveredByWarranty ? Number(outOfPocket) || 0 : bill;
    const saved = Math.max(0, bill - paid);

    onAddRepair({
      productId,
      repairDate,
      serviceProvider: serviceProvider.trim() || 'Authorized Service Center',
      description: description.trim(),
      partsReplaced: partsReplaced.trim() || 'Standard service parts',
      coveredByWarranty,
      totalBillAmount: bill,
      outOfPocketPaid: paid,
      warrantySavedAmount: saved,
      technicianTicket: ticket.trim() || undefined,
    });

    setServiceProvider('');
    setDescription('');
    setPartsReplaced('');
    setTicket('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-8">
      {/* Financial KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Asset Acquisition Total</p>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {formatCurrency(totalPurchaseSpend)}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            Across {products.length} registered assets
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Out-of-Pocket Repairs</p>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {formatCurrencyExact(totalOutOfPocket)}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {repairs.length} logged service records
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Covered by Warranty Claims</p>
          <p className="mt-2 font-display text-2xl font-bold text-emerald-700 tabular-nums">
            {formatCurrencyExact(totalWarrantySaved)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Repair costs avoided via coverage</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Lifetime Ownership Expense</p>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {formatCurrencyExact(lifetimeHouseholdTotal)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Purchase + out-of-pocket maintenance</p>
        </div>
      </section>

      {/* Repair Log Section */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Repair &amp; Replacement Ledger
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Track parts replaced, service center receipts, and warranty reimbursements
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="px-4 py-2 rounded-lg bg-blue-700 text-xs font-semibold text-white hover:bg-blue-800 inline-flex items-center gap-1.5 whitespace-nowrap self-start sm:self-center"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Log Repair Record</span>
          </button>
        </div>

        {showAddForm && (
          <form
            onSubmit={handleSubmit}
            className="p-6 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs"
          >
            <div>
              <label className="block font-medium text-slate-700 mb-1">Product</label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Repair Date</label>
              <input
                type="date"
                value={repairDate}
                onChange={(e) => setRepairDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Service Provider</label>
              <input
                type="text"
                value={serviceProvider}
                onChange={(e) => setServiceProvider(e.target.value)}
                placeholder="e.g. Authorized Service Depot"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">Repair Description *</label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Replaced thermal sensor and calibrated heater"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Parts Replaced</label>
              <input
                type="text"
                value={partsReplaced}
                onChange={(e) => setPartsReplaced(e.target.value)}
                placeholder="e.g. OEM Sensor #4402"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Total Invoice Value ($)</label>
              <input
                type="number"
                step="0.01"
                value={totalBill}
                onChange={(e) => setTotalBill(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Out-of-Pocket Paid ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={coveredByWarranty ? outOfPocket : totalBill}
                disabled={!coveredByWarranty}
                onChange={(e) => setOutOfPocket(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono disabled:bg-slate-100"
              />
            </div>
            <div className="flex items-end gap-4">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer pb-2">
                <input
                  type="checkbox"
                  checked={coveredByWarranty}
                  onChange={(e) => setCoveredByWarranty(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                <span>Covered by Warranty</span>
              </label>
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-blue-700 text-white font-semibold hover:bg-blue-800"
              >
                Save Repair Entry
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                <th className="py-3 px-6">Date</th>
                <th className="py-3 px-4">Product &amp; Service Center</th>
                <th className="py-3 px-4">Work &amp; Parts Replaced</th>
                <th className="py-3 px-4">Coverage</th>
                <th className="py-3 px-6 text-right">Out-of-Pocket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {repairs.map((rep) => {
                const product = products.find((p) => p.id === rep.productId);
                return (
                  <tr key={rep.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-6 text-xs font-mono text-slate-600 tabular-nums whitespace-nowrap">
                      {formatShortDate(rep.repairDate)}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => product && onSelectProduct(product.id, 'repairs')}
                        className="text-left font-medium text-slate-900 hover:text-blue-700"
                      >
                        {product?.name || 'Product'}
                      </button>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {rep.serviceProvider}
                        {rep.technicianTicket ? ` · Ticket ${rep.technicianTicket}` : ''}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-700">
                      <p className="font-medium text-slate-900">{rep.description}</p>
                      <p className="text-slate-500 mt-0.5">Parts: {rep.partsReplaced}</p>
                    </td>
                    <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                      {rep.coveredByWarranty ? (
                        <span className="font-medium text-emerald-700 tabular-nums">
                          Warranty Saved {formatCurrencyExact(rep.warrantySavedAmount)}
                        </span>
                      ) : (
                        <span className="text-slate-500">Out of warranty</span>
                      )}
                    </td>
                    <td className="py-3.5 px-6 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                      {formatCurrencyExact(rep.outOfPocketPaid)}
                    </td>
                  </tr>
                );
              })}
              {repairs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sm text-slate-500">
                    <Wrench className="h-6 w-6 text-slate-400 mx-auto mb-2" />
                    No repair logs recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Per-product Lifetime Cost Breakdown */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="font-display text-base font-semibold text-slate-900">
            Lifetime Cost per Product
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Purchase price combined with cumulative post-purchase maintenance spend
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                <th className="py-3 px-6">Product</th>
                <th className="py-3 px-4 text-right">Purchase Price</th>
                <th className="py-3 px-4 text-right">Out-of-Pocket Repairs</th>
                <th className="py-3 px-4 text-right">Warranty Covered</th>
                <th className="py-3 px-6 text-right">Lifetime Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {products.map((product) => {
                const prodRepairs = repairs.filter((r) => r.productId === product.id);
                const oop = prodRepairs.reduce((s, r) => s + r.outOfPocketPaid, 0);
                const saved = prodRepairs.reduce((s, r) => s + r.warrantySavedAmount, 0);
                return (
                  <tr key={product.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-6">
                      <button
                        type="button"
                        onClick={() => onSelectProduct(product.id, 'repairs')}
                        className="font-medium text-slate-900 hover:text-blue-700 text-left"
                      >
                        {product.name}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      {formatCurrencyExact(product.purchasePrice)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      {formatCurrencyExact(oop)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-700">
                      {formatCurrencyExact(saved)}
                    </td>
                    <td className="py-3 px-6 text-right font-mono font-semibold tabular-nums text-slate-900">
                      {formatCurrencyExact(product.purchasePrice + oop)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
