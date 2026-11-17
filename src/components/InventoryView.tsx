import { useMemo, useState } from 'react';
import {
  AlertCircle,
  Clock,
  FileText,
  Plus,
  ScanLine,
  Search,
  ShieldCheck,
} from 'lucide-react';
import type { FamilyMember, Product, ProductCategory } from '../types/warranty';
import {
  evaluateClaimReadiness,
  formatCurrency,
  formatShortDate,
  getProductOverallCoverage,
} from '../utils/warrantyUtils';
import { ProductImage } from './ProductImage';

interface InventoryViewProps {
  products: Product[];
  members: FamilyMember[];
  onSelectProduct: (
    productId: string,
    initialTab?: 'coverage' | 'vault' | 'readiness' | 'repairs'
  ) => void;
  onOpenAddProduct: () => void;
  onOpenScanner: () => void;
  onOpenDossier: (productId: string) => void;
}

type StatusFilter = 'all' | 'active' | 'expiring_soon' | 'incomplete_docs';

const CATEGORIES: Array<ProductCategory | 'All Categories'> = [
  'All Categories',
  'Television & Audio',
  'Kitchen Appliance',
  'Computing & Mobile',
  'Home Care',
  'Laundry & HVAC',
  'Other',
];

export function InventoryView({
  products,
  members,
  onSelectProduct,
  onOpenAddProduct,
  onOpenScanner,
  onOpenDossier,
}: InventoryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All Categories');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const matchesQuery =
          product.name.toLowerCase().includes(q) ||
          product.brand.toLowerCase().includes(q) ||
          product.modelNumber.toLowerCase().includes(q) ||
          product.serialNumber.toLowerCase().includes(q) ||
          product.retailer.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      if (categoryFilter !== 'All Categories' && product.category !== categoryFilter) {
        return false;
      }

      if (statusFilter !== 'all') {
        const coverage = getProductOverallCoverage(product.warranties);
        const readiness = evaluateClaimReadiness(product);
        if (statusFilter === 'active' && coverage.state === 'expired') return false;
        if (statusFilter === 'expiring_soon' && coverage.state !== 'expiring_soon') return false;
        if (statusFilter === 'incomplete_docs' && readiness.isClaimReady) return false;
      }

      return true;
    });
  }, [products, searchQuery, categoryFilter, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Toolbar: Search, Category, Segmented Status Filter */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search brand, model, serial, or retailer..."
              aria-label="Search registered products"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by product category"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-blue-600 focus:bg-white focus:outline-none"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Interactive segmented filter tabs */}
        <div
          className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto"
          role="tablist"
          aria-label="Filter by coverage status"
        >
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'active', label: 'Active Coverage' },
              { id: 'expiring_soon', label: 'Expiring Soon' },
              { id: 'incomplete_docs', label: 'Missing Docs' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={statusFilter === tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredProducts.map((product) => {
            const coverage = getProductOverallCoverage(product.warranties);
            const readiness = evaluateClaimReadiness(product);
            const owner = members.find((m) => m.id === product.ownerId);

            return (
              <article
                key={product.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col hover:border-slate-300 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => onSelectProduct(product.id, 'coverage')}
                  className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <div className="aspect-4/3 w-full overflow-hidden bg-slate-100">
                    <ProductImage
                      src={product.imageUrl}
                      alt={`${product.brand} ${product.name}`}
                      category={product.category}
                      className="w-full h-full"
                    />
                  </div>
                </button>

                <div className="p-5 flex-1 flex flex-col">
                  {/* Quiet 1-line metadata kicker (zero pills) */}
                  <div className="text-xs text-slate-500 truncate">
                    <span>{product.brand}</span>
                    <span aria-hidden="true"> · </span>
                    <span className="font-mono">{product.modelNumber}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{owner?.name || 'Household'}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectProduct(product.id, 'coverage')}
                    className="mt-1.5 text-left group focus-visible:outline-none"
                  >
                    <h3 className="font-display text-base font-semibold text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-1">
                      {product.name}
                    </h3>
                  </button>

                  <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block">Purchased</span>
                      <span className="font-medium text-slate-900 tabular-nums">
                        {formatShortDate(product.purchaseDate)} · {formatCurrency(product.purchasePrice)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Serial Number</span>
                      <span className="font-mono font-medium text-slate-900 truncate block">
                        {product.serialNumber || 'Missing'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                    {coverage.state === 'active' && (
                      <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                        <ShieldCheck className="h-4 w-4 shrink-0" />
                        <span className="tabular-nums">
                          {coverage.activeCount} active coverage{coverage.activeCount > 1 ? 's' : ''}
                        </span>
                      </span>
                    )}
                    {coverage.state === 'expiring_soon' && (
                      <span className="inline-flex items-center gap-1.5 font-medium text-amber-700">
                        <Clock className="h-4 w-4 shrink-0" />
                        <span>Expiring soon</span>
                      </span>
                    )}
                    {coverage.state === 'expired' && (
                      <span className="inline-flex items-center gap-1.5 font-medium text-slate-600">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>Base expired</span>
                      </span>
                    )}

                    <span className="text-slate-500 tabular-nums">
                      {product.documents.length} vault docs ·{' '}
                      {readiness.isClaimReady
                        ? 'Claim ready'
                        : `${readiness.passedCount}/${readiness.totalCount} checks`}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectProduct(product.id, 'coverage')}
                      className="text-xs font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap"
                    >
                      Manage Coverage &amp; Vault
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenDossier(product.id)}
                      className="text-xs font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 whitespace-nowrap"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>Dossier</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl py-14 px-6 text-center">
          <p className="font-display text-base font-semibold text-slate-900">
            No matching products in your vault
          </p>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Clear your search filters, scan an invoice with OCR, or register a new household product manually.
          </p>
          <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('All Categories');
                setStatusFilter('all');
              }}
              className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              Reset Filters
            </button>
            <button
              type="button"
              onClick={onOpenScanner}
              className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <ScanLine className="h-3.5 w-3.5" />
              <span>Scan Invoice</span>
            </button>
            <button
              type="button"
              onClick={onOpenAddProduct}
              className="px-4 py-2 rounded-lg bg-blue-700 text-xs font-medium text-white hover:bg-blue-800 inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Register Product</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
