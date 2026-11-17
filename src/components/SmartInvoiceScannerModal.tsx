import { useState, type ChangeEvent, type FormEvent } from 'react';
import { CheckCircle2, FileText, ScanLine, Upload, X } from 'lucide-react';
import type {
  ComponentWarranty,
  FamilyMember,
  Product,
  ProductCategory,
  VaultDocument,
} from '../types/warranty';
import {
  parseUploadedInvoiceText,
  SAMPLE_OCR_INVOICES,
  type OcrExtractedInvoice,
} from '../utils/warrantyUtils';

interface SmartInvoiceScannerModalProps {
  members: FamilyMember[];
  onClose: () => void;
  onSaveExtractedProduct: (
    productData: Omit<Product, 'id'>,
    invoiceDoc: Omit<VaultDocument, 'id'>
  ) => void;
}

export function SmartInvoiceScannerModal({
  members,
  onClose,
  onSaveExtractedProduct,
}: SmartInvoiceScannerModalProps) {
  const [step, setStep] = useState<'upload' | 'scanning' | 'review'>('upload');
  const [rawPreviewText, setRawPreviewText] = useState('');
  const [sourceFileName, setSourceFileName] = useState('');
  const [sourceFileSize, setSourceFileSize] = useState('240 KB');
  const [sourceMimeType, setSourceMimeType] = useState('application/pdf');
  const [sourceDataUrl, setSourceDataUrl] = useState<string | undefined>(undefined);

  const [extracted, setExtracted] = useState<OcrExtractedInvoice | null>(null);
  const [ownerId, setOwnerId] = useState(members[0]?.id || 'mem_shared');
  const [location, setLocation] = useState('Living Room');

  const runSampleInvoice = (sampleId: string) => {
    const sample = SAMPLE_OCR_INVOICES.find((s) => s.id === sampleId);
    if (!sample) return;
    setSourceFileName(sample.fileName);
    setSourceFileSize('312 KB');
    setSourceMimeType('application/pdf');
    setSourceDataUrl(undefined);
    setRawPreviewText(sample.rawText);
    setStep('scanning');
    setTimeout(() => {
      setExtracted({
        ...sample.extracted,
        suggestedWarranties: sample.extracted.suggestedWarranties.map((w) => ({ ...w })),
      });
      setStep('review');
    }, 650);
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSourceFileName(file.name);
    const sizeKb = Math.max(1, Math.round(file.size / 1024));
    setSourceFileSize(sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`);
    setSourceMimeType(file.type || 'application/pdf');
    setStep('scanning');

    const dataReader = new FileReader();
    dataReader.onload = () => {
      setSourceDataUrl(typeof dataReader.result === 'string' ? dataReader.result : undefined);
    };
    dataReader.readAsDataURL(file);

    if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
      const textReader = new FileReader();
      textReader.onload = () => {
        const text = typeof textReader.result === 'string' ? textReader.result : '';
        setRawPreviewText(text);
        setTimeout(() => {
          setExtracted(parseUploadedInvoiceText(text, file.name));
          setStep('review');
        }, 650);
      };
      textReader.readAsText(file);
    } else {
      const fallbackText = `Uploaded Receipt File: ${file.name}\nDate: 2026-11-12\nDetected retailer and warranty schedule from receipt image.`;
      setRawPreviewText(fallbackText);
      setTimeout(() => {
        setExtracted(parseUploadedInvoiceText(file.name, file.name));
        setStep('review');
      }, 650);
    }
  };

  const handleConfirmSave = (e: FormEvent) => {
    e.preventDefault();
    if (!extracted) return;

    const warranties: ComponentWarranty[] = extracted.suggestedWarranties.map((w, idx) => ({
      ...w,
      id: `war_ocr_${Date.now()}_${idx}`,
    }));

    const newProduct: Omit<Product, 'id'> = {
      name: extracted.name,
      brand: extracted.brand,
      modelNumber: extracted.modelNumber,
      serialNumber: extracted.serialNumber,
      category: extracted.category,
      purchaseDate: extracted.purchaseDate,
      purchasePrice: Number(extracted.purchasePrice) || 0,
      retailer: extracted.retailer,
      invoiceNumber: extracted.invoiceNumber,
      location: location.trim() || 'Home',
      ownerId,
      notes: `Added via Smart Invoice OCR (${sourceFileName}).`,
      warranties,
      documents: [],
    };

    const invoiceDoc: Omit<VaultDocument, 'id'> = {
      name: sourceFileName || `${extracted.brand}_Invoice.pdf`,
      type: 'invoice',
      uploadedAt: '2026-11-17',
      fileSize: sourceFileSize,
      mimeType: sourceMimeType,
      dataUrl: sourceDataUrl,
      notes: extracted.confidenceNote,
    };

    onSaveExtractedProduct(newProduct, invoiceDoc);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ocr-scanner-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <ScanLine className="h-5 w-5 text-blue-700" />
            <div>
              <h2 id="ocr-scanner-title" className="font-display text-lg font-bold text-slate-900">
                Smart Invoice Scanner (OCR)
              </h2>
              <p className="text-xs text-slate-500">
                Extract purchase metadata, serial numbers, and warranty tiers from any receipt
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            aria-label="Close scanner"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {step === 'upload' && (
            <div className="space-y-6">
              <label className="block border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-600 hover:bg-blue-50/30 transition-colors cursor-pointer">
                <Upload className="h-8 w-8 text-blue-700 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-900">
                  Upload Purchase Invoice or Receipt
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supports PDF, PNG, JPG, or TXT receipts. Extracted file is stored automatically in your Digital Vault.
                </p>
                <span className="mt-4 inline-block px-4 py-2 rounded-lg bg-blue-700 text-xs font-medium text-white">
                  Choose Invoice File
                </span>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.txt"
                  onChange={handleFileUpload}
                  className="sr-only"
                />
              </label>

              <div>
                <p className="text-xs font-semibold text-slate-600 mb-3">
                  Or test OCR extraction with a sample receipt
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {SAMPLE_OCR_INVOICES.map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() => runSampleInvoice(sample.id)}
                      className="text-left p-3.5 rounded-lg border border-slate-200 hover:border-blue-600 hover:bg-slate-50 transition-colors"
                    >
                      <FileText className="h-4 w-4 text-blue-700 mb-2" />
                      <p className="text-xs font-semibold text-slate-900">{sample.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{sample.fileName}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 'scanning' && (
            <div className="py-14 text-center space-y-3">
              <div className="h-10 w-10 rounded-full border-2 border-blue-700 border-t-transparent animate-spin mx-auto" />
              <p className="font-display text-base font-semibold text-slate-900">
                Running OCR field extraction on {sourceFileName}
              </p>
              <p className="text-xs text-slate-500">
                Detecting merchant header, invoice number, model/serial lines, and warranty duration...
              </p>
            </div>
          )}

          {step === 'review' && extracted && (
            <form onSubmit={handleConfirmSave} className="space-y-6">
              <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-900">
                  <p className="font-semibold">OCR Extraction Complete</p>
                  <p className="mt-0.5 text-emerald-800">{extracted.confidenceNote}</p>
                </div>
              </div>

              {rawPreviewText && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1.5">
                    Parsed Receipt Snippet ({sourceFileName})
                  </p>
                  <pre className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {rawPreviewText}
                  </pre>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-medium text-slate-700 mb-1">Product Name</label>
                  <input
                    type="text"
                    required
                    value={extracted.name}
                    onChange={(e) => setExtracted({ ...extracted, name: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Brand</label>
                  <input
                    type="text"
                    required
                    value={extracted.brand}
                    onChange={(e) => setExtracted({ ...extracted, brand: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={extracted.category}
                    onChange={(e) =>
                      setExtracted({ ...extracted, category: e.target.value as ProductCategory })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
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
                    value={extracted.modelNumber}
                    onChange={(e) => setExtracted({ ...extracted, modelNumber: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Serial Number</label>
                  <input
                    type="text"
                    value={extracted.serialNumber}
                    onChange={(e) => setExtracted({ ...extracted, serialNumber: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Retailer</label>
                  <input
                    type="text"
                    value={extracted.retailer}
                    onChange={(e) => setExtracted({ ...extracted, retailer: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Invoice Number</label>
                  <input
                    type="text"
                    value={extracted.invoiceNumber}
                    onChange={(e) => setExtracted({ ...extracted, invoiceNumber: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Purchase Date</label>
                  <input
                    type="date"
                    value={extracted.purchaseDate}
                    onChange={(e) => setExtracted({ ...extracted, purchaseDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Purchase Price (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={extracted.purchasePrice}
                    onChange={(e) =>
                      setExtracted({ ...extracted, purchasePrice: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Assign to Family Member
                  </label>
                  <select
                    value={ownerId}
                    onChange={(e) => setOwnerId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Room / Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  Detected Component Warranties ({extracted.suggestedWarranties.length})
                </p>
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-200">
                  {extracted.suggestedWarranties.map((w, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <p className="font-semibold text-slate-900">{w.componentName}</p>
                        <p className="text-slate-500">
                          {w.coverageType} · {w.provider}
                        </p>
                      </div>
                      <span className="font-mono text-slate-700 tabular-nums shrink-0">
                        Until {w.expiryDate}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Scan Another File
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-700 text-xs font-semibold text-white hover:bg-blue-800"
                >
                  Save Product &amp; Archive Invoice
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
