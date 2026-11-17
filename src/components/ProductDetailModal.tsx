import { useState, type ChangeEvent, type FormEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  FileCheck2,
  FileText,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type {
  ComponentWarranty,
  DocumentType,
  FamilyMember,
  Product,
  RepairRecord,
  VaultDocument,
} from '../types/warranty';
import {
  evaluateClaimReadiness,
  formatCurrency,
  formatCurrencyExact,
  formatShortDate,
  getWarrantyHealth,
} from '../utils/warrantyUtils';
import { ProductImage } from './ProductImage';

interface ProductDetailModalProps {
  product: Product;
  members: FamilyMember[];
  repairs: RepairRecord[];
  initialTab?: 'coverage' | 'vault' | 'readiness' | 'repairs';
  onClose: () => void;
  onAddWarranty: (productId: string, warranty: Omit<ComponentWarranty, 'id'>) => void;
  onDeleteWarranty: (productId: string, warrantyId: string) => void;
  onUploadDocument: (productId: string, doc: Omit<VaultDocument, 'id'>) => void;
  onDeleteDocument: (productId: string, docId: string) => void;
  onUpdateSerial: (productId: string, serialNumber: string) => void;
  onStartClaim: (productId: string) => void;
  onOpenDossier: (productId: string) => void;
  onDeleteProduct: (productId: string) => void;
}

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  invoice: 'Purchase Invoice',
  warranty_certificate: 'Warranty Certificate',
  product_photo: 'Product / Serial Photo',
  defect_evidence: 'Defect Photo / Video Frame',
  service_report: 'Service Report',
};

export function ProductDetailModal({
  product,
  members,
  repairs,
  initialTab = 'coverage',
  onClose,
  onAddWarranty,
  onDeleteWarranty,
  onUploadDocument,
  onDeleteDocument,
  onUpdateSerial,
  onStartClaim,
  onOpenDossier,
  onDeleteProduct,
}: ProductDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'coverage' | 'vault' | 'readiness' | 'repairs'>(
    initialTab
  );
  const [showAddWarranty, setShowAddWarranty] = useState(false);
  const [componentName, setComponentName] = useState('');
  const [coverageType, setCoverageType] =
    useState<ComponentWarranty['coverageType']>('Component Specific');
  const [provider, setProvider] = useState(product.brand);
  const [startDate, setStartDate] = useState(product.purchaseDate);
  const [expiryDate, setExpiryDate] = useState('2029-11-17');
  const [termsSummary, setTermsSummary] = useState('');

  const [uploadDocType, setUploadDocType] = useState<DocumentType>('invoice');
  const [editingSerial, setEditingSerial] = useState(false);
  const [serialDraft, setSerialDraft] = useState(product.serialNumber);

  const owner = members.find((m) => m.id === product.ownerId);
  const readiness = evaluateClaimReadiness(product);
  const productRepairs = repairs.filter((r) => r.productId === product.id);
  const totalOutOfPocket = productRepairs.reduce((sum, r) => sum + r.outOfPocketPaid, 0);
  const totalWarrantySaved = productRepairs.reduce((sum, r) => sum + r.warrantySavedAmount, 0);

  const handleAddWarrantySubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!componentName.trim() || !expiryDate) return;
    onAddWarranty(product.id, {
      componentName: componentName.trim(),
      coverageType,
      provider: provider.trim() || product.brand,
      startDate,
      expiryDate,
      termsSummary: termsSummary.trim() || 'Manufacturer or extended component coverage.',
    });
    setComponentName('');
    setTermsSummary('');
    setShowAddWarranty(false);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const sizeKb = Math.max(1, Math.round(file.size / 1024));
      onUploadDocument(product.id, {
        name: file.name,
        type: uploadDocType,
        uploadedAt: '2026-11-17',
        fileSize: sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`,
        mimeType: file.type || 'application/octet-stream',
        dataUrl: typeof reader.result === 'string' ? reader.result : undefined,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDownloadDocument = (doc: VaultDocument) => {
    const content =
      doc.dataUrl ||
      `data:text/plain;charset=utf-8,${encodeURIComponent(
        `WarrantyTrail Vault Record\nFile: ${doc.name}\nType: ${DOC_TYPE_LABELS[doc.type]}\nProduct: ${product.name} (${product.serialNumber})\nUploaded: ${doc.uploadedAt}`
      )}`;
    const link = document.createElement('a');
    link.href = content;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-xl">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-16 h-12 rounded-lg overflow-hidden border border-slate-200 shrink-0 hidden sm:block">
              <ProductImage
                src={product.imageUrl}
                alt={product.name}
                category={product.category}
                className="w-full h-full"
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 truncate">
                {product.brand} · {product.modelNumber} · {owner?.name || 'Household'}
              </p>
              <h2
                id="product-modal-title"
                className="font-display text-lg font-bold text-slate-900 truncate"
              >
                {product.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onOpenDossier(product.id)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <FileCheck2 className="h-3.5 w-3.5" />
              <span>Export Dossier</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Close product details"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Key Metadata Strip */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs shrink-0">
          <div>
            <span className="text-slate-500 block">Serial Number</span>
            {editingSerial ? (
              <div className="flex items-center gap-1 mt-0.5">
                <input
                  type="text"
                  value={serialDraft}
                  onChange={(e) => setSerialDraft(e.target.value)}
                  className="w-28 rounded border border-slate-300 bg-white px-2 py-0.5 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    onUpdateSerial(product.id, serialDraft.trim());
                    setEditingSerial(false);
                  }}
                  className="text-blue-700 font-semibold"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-slate-900">
                  {product.serialNumber || 'Unrecorded'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSerialDraft(product.serialNumber);
                    setEditingSerial(true);
                  }}
                  className="text-blue-700 hover:underline"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
          <div>
            <span className="text-slate-500 block">Purchase Date &amp; Price</span>
            <span className="font-medium text-slate-900 tabular-nums">
              {formatShortDate(product.purchaseDate)} · {formatCurrency(product.purchasePrice)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Retailer &amp; Invoice</span>
            <span className="font-medium text-slate-900">
              {product.retailer} · <span className="font-mono">{product.invoiceNumber}</span>
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Location</span>
            <span className="font-medium text-slate-900">{product.location}</span>
          </div>
        </div>

        {/* Modal Tabs */}
        <div className="px-6 border-b border-slate-200 flex items-center gap-6 overflow-x-auto shrink-0">
          {(
            [
              { id: 'coverage', label: `Coverage Breakdown (${product.warranties.length})` },
              { id: 'vault', label: `Digital Vault (${product.documents.length})` },
              {
                id: 'readiness',
                label: `Claim Readiness (${readiness.passedCount}/${readiness.totalCount})`,
              },
              { id: 'repairs', label: `Repairs & Cost (${productRepairs.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === tab.id
                  ? 'border-blue-700 text-blue-700'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'coverage' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-sm font-semibold text-slate-900">
                    Component-Specific Warranty Tiers
                  </h3>
                  <p className="text-xs text-slate-500">
                    Track separate manufacturer, component-only, and extended protection deadlines.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddWarranty((prev) => !prev)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Component Tier</span>
                </button>
              </div>

              {showAddWarranty && (
                <form
                  onSubmit={handleAddWarrantySubmit}
                  className="p-4 rounded-lg border border-slate-200 bg-slate-50 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs"
                >
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Component / Coverage Name
                    </label>
                    <input
                      type="text"
                      required
                      value={componentName}
                      onChange={(e) => setComponentName(e.target.value)}
                      placeholder="e.g. Inverter Motor Assembly"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Coverage Type</label>
                    <select
                      value={coverageType}
                      onChange={(e) =>
                        setCoverageType(e.target.value as ComponentWarranty['coverageType'])
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="Manufacturer Base">Manufacturer Base</option>
                      <option value="Component Specific">Component Specific</option>
                      <option value="Extended Plan">Extended Plan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Provider</label>
                    <input
                      type="text"
                      value={provider}
                      onChange={(e) => setProvider(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Expiry Date</label>
                      <input
                        type="date"
                        required
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-medium text-slate-700 mb-1">Terms Summary</label>
                    <input
                      type="text"
                      value={termsSummary}
                      onChange={(e) => setTermsSummary(e.target.value)}
                      placeholder="Parts vs labor inclusions, deductible, or service depot rules"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddWarranty(false)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-blue-700 text-white font-medium hover:bg-blue-800"
                    >
                      Save Coverage Tier
                    </button>
                  </div>
                </form>
              )}

              <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                {product.warranties.map((w) => {
                  const health = getWarrantyHealth(w.expiryDate);
                  return (
                    <div
                      key={w.id}
                      className="p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{w.coverageType}</span>
                          <span aria-hidden="true">·</span>
                          <span>{w.provider}</span>
                          {w.policyNumber && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono">{w.policyNumber}</span>
                            </>
                          )}
                        </div>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {w.componentName}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-600">{w.termsSummary}</p>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p
                            className={`text-xs font-semibold inline-flex items-center gap-1 tabular-nums ${
                              health.state === 'active'
                                ? 'text-emerald-700'
                                : health.state === 'expiring_soon'
                                ? 'text-amber-700'
                                : 'text-slate-500'
                            }`}
                          >
                            {health.state === 'active' && <ShieldCheck className="h-3.5 w-3.5" />}
                            {health.state === 'expiring_soon' && <Clock className="h-3.5 w-3.5" />}
                            {health.state === 'expired' && <AlertCircle className="h-3.5 w-3.5" />}
                            <span>{health.label}</span>
                          </p>
                          <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                            Ends {formatShortDate(w.expiryDate)}
                          </p>
                        </div>

                        {product.warranties.length > 1 && (
                          <button
                            type="button"
                            onClick={() => onDeleteWarranty(product.id, w.id)}
                            className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                            aria-label={`Remove ${w.componentName}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'vault' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-display text-sm font-semibold text-slate-900">
                    Upload to Digital Product Vault
                  </h3>
                  <p className="text-xs text-slate-500">
                    Store invoices, warranty certificates, serial plate photos, or defect evidence.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={uploadDocType}
                    onChange={(e) => setUploadDocType(e.target.value as DocumentType)}
                    aria-label="Document category"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
                  >
                    {Object.entries(DOC_TYPE_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <label className="px-3.5 py-2 rounded-lg bg-blue-700 text-xs font-medium text-white hover:bg-blue-800 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Select File</span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.txt,.webp"
                      onChange={handleFileChange}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>

              <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                {product.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 bg-white flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{doc.name}</p>
                        <p className="text-xs text-slate-500 tabular-nums">
                          {DOC_TYPE_LABELS[doc.type]} · {doc.fileSize} · Uploaded{' '}
                          {formatShortDate(doc.uploadedAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDownloadDocument(doc)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1 whitespace-nowrap"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteDocument(product.id, doc.id)}
                        className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                        aria-label={`Delete ${doc.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {product.documents.length === 0 && (
                  <div className="p-8 text-center text-sm text-slate-500">
                    No documents uploaded yet. Upload your purchase invoice and serial plate photo above.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'readiness' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <h3 className="font-display text-base font-semibold text-slate-900">
                    {readiness.isClaimReady
                      ? 'Product is ClaimReady'
                      : `${readiness.totalCount - readiness.passedCount} requirement(s) missing before filing`}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Manufacturers reject claims missing purchase proof, serial plates, or active policy verification.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onStartClaim(product.id);
                  }}
                  className="px-4 py-2 rounded-lg bg-blue-700 text-xs font-medium text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
                >
                  File Warranty Claim
                </button>
              </div>

              <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                {readiness.checks.map((check) => (
                  <div
                    key={check.id}
                    className="p-4 bg-white flex items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      {check.passed ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-slate-900">{check.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{check.detail}</p>
                      </div>
                    </div>

                    {!check.passed && check.fixActionLabel && (
                      <button
                        type="button"
                        onClick={() => {
                          if (check.fixTarget === 'vault_invoice') {
                            setUploadDocType('invoice');
                            setActiveTab('vault');
                          } else if (check.fixTarget === 'vault_warranty') {
                            setUploadDocType('warranty_certificate');
                            setActiveTab('vault');
                          } else if (check.fixTarget === 'vault_photo') {
                            setUploadDocType('product_photo');
                            setActiveTab('vault');
                          } else if (check.fixTarget === 'serial') {
                            setEditingSerial(true);
                          } else if (check.fixTarget === 'coverage') {
                            setActiveTab('coverage');
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-xs font-medium text-amber-900 hover:bg-amber-100 whitespace-nowrap shrink-0"
                      >
                        {check.fixActionLabel}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'repairs' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="border border-slate-200 rounded-lg p-4">
                  <p className="text-xs text-slate-500">Initial Purchase</p>
                  <p className="mt-1 font-display text-lg font-bold text-slate-900 tabular-nums">
                    {formatCurrencyExact(product.purchasePrice)}
                  </p>
                </div>
                <div className="border border-slate-200 rounded-lg p-4">
                  <p className="text-xs text-slate-500">Out-of-Pocket Repairs</p>
                  <p className="mt-1 font-display text-lg font-bold text-slate-900 tabular-nums">
                    {formatCurrencyExact(totalOutOfPocket)}
                  </p>
                </div>
                <div className="border border-slate-200 rounded-lg p-4">
                  <p className="text-xs text-slate-500">Covered by Warranty</p>
                  <p className="mt-1 font-display text-lg font-bold text-emerald-700 tabular-nums">
                    {formatCurrencyExact(totalWarrantySaved)}
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl divide-y divide-slate-200">
                {productRepairs.map((rep) => (
                  <div key={rep.id} className="p-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{rep.description}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {formatShortDate(rep.repairDate)} · {rep.serviceProvider} · Parts:{' '}
                        {rep.partsReplaced}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-mono font-semibold text-slate-900 tabular-nums">
                        {formatCurrencyExact(rep.outOfPocketPaid)} paid
                      </p>
                      <p className="text-xs text-slate-500 tabular-nums">
                        {rep.coveredByWarranty
                          ? `Warranty saved ${formatCurrencyExact(rep.warrantySavedAmount)}`
                          : 'Out of warranty'}
                      </p>
                    </div>
                  </div>
                ))}
                {productRepairs.length === 0 && (
                  <div className="p-8 text-center text-sm text-slate-500">
                    No repair events recorded for this product.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-4 shrink-0">
          <button
            type="button"
            onClick={() => {
              onDeleteProduct(product.id);
              onClose();
            }}
            className="text-xs font-medium text-red-600 hover:text-red-700 whitespace-nowrap"
          >
            Remove Product
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
