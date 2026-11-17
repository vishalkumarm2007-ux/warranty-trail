import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type {
  ComponentWarranty,
  FamilyMember,
  Product,
  ProductCategory,
} from '../types/warranty';

interface AddProductModalProps {
  members: FamilyMember[];
  onClose: () => void;
  onAddProduct: (product: Omit<Product, 'id'>) => void;
}

export function AddProductModal({ members, onClose, onAddProduct }: AddProductModalProps) {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [modelNumber, setModelNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Kitchen Appliance');
  const [purchaseDate, setPurchaseDate] = useState('2026-11-17');
  const [purchasePrice, setPurchasePrice] = useState('499');
  const [retailer, setRetailer] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [location, setLocation] = useState('Kitchen');
  const [ownerId, setOwnerId] = useState(members[0]?.id || 'mem_shared');
  const [warrantyMonths, setWarrantyMonths] = useState('12');
  const [componentCoverageName, setComponentCoverageName] = useState('');
  const [componentYears, setComponentYears] = useState('5');

  const addMonths = (iso: string, months: number): string => {
    const d = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return '2027-11-17';
    d.setMonth(d.getMonth() + months);
    return d.toISOString().slice(0, 10);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !brand.trim()) return;

    const warranties: ComponentWarranty[] = [
      {
        id: `war_base_${Date.now()}`,
        componentName: 'Base Hardware Parts & Labor',
        coverageType: 'Manufacturer Base',
        provider: brand.trim(),
        startDate: purchaseDate,
        expiryDate: addMonths(purchaseDate, Number(warrantyMonths) || 12),
        termsSummary: `${warrantyMonths}-month standard manufacturer warranty from purchase date.`,
      },
    ];

    if (componentCoverageName.trim()) {
      warranties.push({
        id: `war_comp_${Date.now() + 1}`,
        componentName: componentCoverageName.trim(),
        coverageType: 'Component Specific',
        provider: brand.trim(),
        startDate: purchaseDate,
        expiryDate: addMonths(purchaseDate, (Number(componentYears) || 5) * 12),
        termsSummary: `${componentYears}-year dedicated component warranty coverage.`,
      });
    }

    onAddProduct({
      name: name.trim(),
      brand: brand.trim(),
      modelNumber: modelNumber.trim() || 'STANDARD',
      serialNumber: serialNumber.trim(),
      category,
      purchaseDate,
      purchasePrice: Number(purchasePrice) || 0,
      retailer: retailer.trim() || 'Authorized Dealer',
      invoiceNumber: invoiceNumber.trim() || `INV-${Math.floor(100000 + Math.random() * 899999)}`,
      location: location.trim() || 'Home',
      ownerId,
      warranties,
      documents: [],
    });

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-product-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 id="add-product-title" className="font-display text-lg font-bold text-slate-900">
              Register Product
            </h2>
            <p className="text-xs text-slate-500">
              Add device identifiers, purchase details, and component-level warranties
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            aria-label="Close register product dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">Product Title *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. LG Front Load Washer WM4000HBA"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Brand *</label>
              <input
                type="text"
                required
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. LG Electronics"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="Television & Audio">Television &amp; Audio</option>
                <option value="Kitchen Appliance">Kitchen Appliance</option>
                <option value="Computing & Mobile">Computing &amp; Mobile</option>
                <option value="Home Care">Home Care</option>
                <option value="Laundry & HVAC">Laundry &amp; HVAC</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Model Number</label>
              <input
                type="text"
                value={modelNumber}
                onChange={(e) => setModelNumber(e.target.value)}
                placeholder="e.g. WM4000HBA"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Serial Number</label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="e.g. 402KWZT90112"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Purchase Date</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Purchase Price (USD)</label>
              <input
                type="number"
                step="0.01"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Retailer</label>
              <input
                type="text"
                value={retailer}
                onChange={(e) => setRetailer(e.target.value)}
                placeholder="e.g. Costco Wholesale"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Invoice Number</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. CW-882019"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Family Owner</label>
              <select
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Base Warranty Term</label>
              <select
                value={warrantyMonths}
                onChange={(e) => setWarrantyMonths(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="12">12 Months (1 Year)</option>
                <option value="24">24 Months (2 Years)</option>
                <option value="36">36 Months (3 Years)</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Optional Component Coverage
              </label>
              <input
                type="text"
                value={componentCoverageName}
                onChange={(e) => setComponentCoverageName(e.target.value)}
                placeholder="e.g. Direct Drive Motor"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Component Term</label>
              <select
                value={componentYears}
                onChange={(e) => setComponentYears(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="3">3 Years</option>
                <option value="5">5 Years</option>
                <option value="10">10 Years</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-blue-700 text-xs font-semibold text-white hover:bg-blue-800"
            >
              Register Product
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
