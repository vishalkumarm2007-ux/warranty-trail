import { useEffect, useMemo, useState } from 'react';
import { Menu, Plus, ScanLine } from 'lucide-react';
import {
  INITIAL_CLAIMS,
  INITIAL_FAMILY_MEMBERS,
  INITIAL_FOLLOWUPS,
  INITIAL_PRODUCTS,
  INITIAL_RECALLS,
  INITIAL_REPAIRS,
} from './data/seedData';
import type {
  ClaimInteraction,
  ClaimStatus,
  ComponentWarranty,
  FamilyMember,
  FollowUpTask,
  Product,
  RecallAlert,
  RecallStatus,
  RepairRecord,
  VaultDocument,
  ViewId,
  WarrantyClaim,
} from './types/warranty';
import { getWarrantyHealth } from './utils/warrantyUtils';
import { Sidebar } from './components/Sidebar';
import { OverviewView } from './components/OverviewView';
import { InventoryView } from './components/InventoryView';
import { ClaimsView } from './components/ClaimsView';
import { RepairsView } from './components/RepairsView';
import { RecallsView } from './components/RecallsView';
import { FamilyVaultView } from './components/FamilyVaultView';
import { ProductDetailModal } from './components/ProductDetailModal';
import { SmartInvoiceScannerModal } from './components/SmartInvoiceScannerModal';
import { AddProductModal } from './components/AddProductModal';
import { ClaimDossierModal } from './components/ClaimDossierModal';

const STORAGE_KEY = 'warrantytrail_claimready_state_v1';

interface PersistedState {
  products: Product[];
  claims: WarrantyClaim[];
  followUps: FollowUpTask[];
  repairs: RepairRecord[];
  recalls: RecallAlert[];
  members: FamilyMember[];
}

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      if (Array.isArray(parsed.products) && Array.isArray(parsed.members)) {
        return {
          products: parsed.products,
          claims: Array.isArray(parsed.claims) ? parsed.claims : INITIAL_CLAIMS,
          followUps: Array.isArray(parsed.followUps) ? parsed.followUps : INITIAL_FOLLOWUPS,
          repairs: Array.isArray(parsed.repairs) ? parsed.repairs : INITIAL_REPAIRS,
          recalls: Array.isArray(parsed.recalls) ? parsed.recalls : INITIAL_RECALLS,
          members: parsed.members,
        };
      }
    }
  } catch {
    // Fall back to default seeded household inventory
  }
  return {
    products: INITIAL_PRODUCTS,
    claims: INITIAL_CLAIMS,
    followUps: INITIAL_FOLLOWUPS,
    repairs: INITIAL_REPAIRS,
    recalls: INITIAL_RECALLS,
    members: INITIAL_FAMILY_MEMBERS,
  };
}

const VIEW_TITLES: Record<ViewId, { label: string; subtitle: string }> = {
  overview: {
    label: 'Overview',
    subtitle: 'Active coverages, expiry deadlines, safety recalls, and claim readiness',
  },
  inventory: {
    label: 'Product Vault',
    subtitle: 'Registered appliances, serial numbers, component tiers, and stored receipts',
  },
  claims: {
    label: 'Claims & Follow-ups',
    subtitle: 'Track service requests, log interactions, and manage scheduled callbacks',
  },
  repairs: {
    label: 'Repairs & Expenses',
    subtitle: 'Maintenance history, replaced parts, and lifetime product ownership cost',
  },
  recalls: {
    label: 'Safety Recalls',
    subtitle: 'Verified CPSC and OEM safety notices matched against your household inventory',
  },
  family: {
    label: 'Family Vault',
    subtitle: 'Household member roles and shared appliance ownership assignments',
  },
};

export default function App() {
  const [initial] = useState<PersistedState>(loadInitialState);

  const [products, setProducts] = useState<Product[]>(initial.products);
  const [claims, setClaims] = useState<WarrantyClaim[]>(initial.claims);
  const [followUps, setFollowUps] = useState<FollowUpTask[]>(initial.followUps);
  const [repairs, setRepairs] = useState<RepairRecord[]>(initial.repairs);
  const [recalls, setRecalls] = useState<RecallAlert[]>(initial.recalls);
  const [members, setMembers] = useState<FamilyMember[]>(initial.members);

  const [activeView, setActiveView] = useState<ViewId>('overview');
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modals
  const [selectedProductModal, setSelectedProductModal] = useState<{
    productId: string;
    tab: 'coverage' | 'vault' | 'readiness' | 'repairs';
  } | null>(null);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [dossierTarget, setDossierTarget] = useState<{
    productId: string;
    claimId?: string;
  } | null>(null);
  const [newClaimProductId, setNewClaimProductId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const payload: PersistedState = {
        products,
        claims,
        followUps,
        repairs,
        recalls,
        members,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors cleanly
    }
  }, [products, claims, followUps, repairs, recalls, members]);

  // Scoped data by selected Family Vault member
  const scopedProducts = useMemo(() => {
    if (selectedOwnerId === 'all') return products;
    return products.filter((p) => p.ownerId === selectedOwnerId);
  }, [products, selectedOwnerId]);

  const scopedProductIds = useMemo(
    () => new Set(scopedProducts.map((p) => p.id)),
    [scopedProducts]
  );

  const scopedClaims = useMemo(
    () => claims.filter((c) => scopedProductIds.has(c.productId)),
    [claims, scopedProductIds]
  );

  const scopedFollowUps = useMemo(
    () => followUps.filter((f) => scopedProductIds.has(f.productId)),
    [followUps, scopedProductIds]
  );

  const scopedRepairs = useMemo(
    () => repairs.filter((r) => scopedProductIds.has(r.productId)),
    [repairs, scopedProductIds]
  );

  const sidebarCounts = useMemo(() => {
    const expiringAlerts = scopedProducts.reduce((count, p) => {
      return (
        count +
        p.warranties.filter((w) => getWarrantyHealth(w.expiryDate).state === 'expiring_soon')
          .length
      );
    }, 0);

    const activeRecalls = recalls.filter(
      (r) =>
        r.matchedProductId &&
        scopedProductIds.has(r.matchedProductId) &&
        r.status === 'Action Needed'
    ).length;

    return {
      products: scopedProducts.length,
      openClaims: scopedClaims.filter((c) => c.status !== 'Resolved').length,
      pendingFollowUps: scopedFollowUps.filter((f) => !f.completed).length,
      activeRecalls,
      expiringAlerts,
    };
  }, [scopedProducts, scopedClaims, scopedFollowUps, recalls, scopedProductIds]);

  // Handlers
  const handleSelectProduct = (
    productId: string,
    initialTab: 'coverage' | 'vault' | 'readiness' | 'repairs' = 'coverage'
  ) => {
    setSelectedProductModal({ productId, tab: initialTab });
  };

  const handleAddProduct = (newProd: Omit<Product, 'id'>) => {
    const created: Product = {
      ...newProd,
      id: `prod_${Date.now()}`,
    };
    setProducts((prev) => [created, ...prev]);
    setActiveView('inventory');
  };

  const handleSaveExtractedProduct = (
    productData: Omit<Product, 'id'>,
    invoiceDoc: Omit<VaultDocument, 'id'>
  ) => {
    const docWithId: VaultDocument = {
      ...invoiceDoc,
      id: `doc_ocr_${Date.now()}`,
    };
    const created: Product = {
      ...productData,
      id: `prod_${Date.now()}`,
      documents: [docWithId],
    };
    setProducts((prev) => [created, ...prev]);
    setActiveView('inventory');
    setSelectedProductModal({ productId: created.id, tab: 'coverage' });
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const handleAddWarranty = (productId: string, warranty: Omit<ComponentWarranty, 'id'>) => {
    const newWarranty: ComponentWarranty = {
      ...warranty,
      id: `war_${Date.now()}`,
    };
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, warranties: [...p.warranties, newWarranty] } : p
      )
    );
  };

  const handleDeleteWarranty = (productId: string, warrantyId: string) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? { ...p, warranties: p.warranties.filter((w) => w.id !== warrantyId) }
          : p
      )
    );
  };

  const handleUploadDocument = (productId: string, doc: Omit<VaultDocument, 'id'>) => {
    const newDoc: VaultDocument = {
      ...doc,
      id: `doc_${Date.now()}`,
    };
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, documents: [newDoc, ...p.documents] } : p
      )
    );
  };

  const handleDeleteDocument = (productId: string, docId: string) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? { ...p, documents: p.documents.filter((d) => d.id !== docId) }
          : p
      )
    );
  };

  const handleUpdateSerial = (productId: string, serialNumber: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, serialNumber } : p))
    );
  };

  const handleStartClaimFromProduct = (productId: string) => {
    setNewClaimProductId(productId);
    setActiveView('claims');
  };

  const handleCreateClaim = (claimData: Omit<WarrantyClaim, 'id'>) => {
    const created: WarrantyClaim = {
      ...claimData,
      id: `clm_${Date.now()}`,
    };
    setClaims((prev) => [created, ...prev]);
  };

  const handleUpdateClaimStatus = (claimId: string, status: ClaimStatus) => {
    setClaims((prev) =>
      prev.map((c) => (c.id === claimId ? { ...c, status } : c))
    );
  };

  const handleAddInteraction = (
    claimId: string,
    interaction: Omit<ClaimInteraction, 'id'>
  ) => {
    const created: ClaimInteraction = {
      ...interaction,
      id: `int_${Date.now()}`,
    };
    setClaims((prev) =>
      prev.map((c) =>
        c.id === claimId ? { ...c, interactions: [...c.interactions, created] } : c
      )
    );
  };

  const handleAddFollowUp = (task: Omit<FollowUpTask, 'id'>) => {
    setFollowUps((prev) => [{ ...task, id: `fu_${Date.now()}` }, ...prev]);
  };

  const handleToggleFollowUp = (taskId: string) => {
    setFollowUps((prev) =>
      prev.map((f) => (f.id === taskId ? { ...f, completed: !f.completed } : f))
    );
  };

  const handleSnoozeFollowUp = (taskId: string, extraDays: number) => {
    setFollowUps((prev) =>
      prev.map((f) => {
        if (f.id !== taskId) return f;
        const d = new Date(`${f.dueDate}T12:00:00`);
        d.setDate(d.getDate() + extraDays);
        return { ...f, dueDate: d.toISOString().slice(0, 10) };
      })
    );
  };

  const handleAddRepair = (repair: Omit<RepairRecord, 'id'>) => {
    setRepairs((prev) => [{ ...repair, id: `rep_${Date.now()}` }, ...prev]);
  };

  const handleUpdateRecallStatus = (recallId: string, status: RecallStatus) => {
    setRecalls((prev) =>
      prev.map((r) => (r.id === recallId ? { ...r, status } : r))
    );
  };

  const handleAddMember = (member: Omit<FamilyMember, 'id'>) => {
    setMembers((prev) => [...prev, { ...member, id: `mem_${Date.now()}` }]);
  };

  const handleReassignProduct = (productId: string, ownerId: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, ownerId } : p))
    );
  };

  const activeOwnerName =
    selectedOwnerId === 'all'
      ? 'All Household'
      : members.find((m) => m.id === selectedOwnerId)?.name || 'Household';

  const modalProduct = selectedProductModal
    ? products.find((p) => p.id === selectedProductModal.productId) || null
    : null;

  const dossierProduct = dossierTarget
    ? products.find((p) => p.id === dossierTarget.productId) || null
    : null;
  const dossierClaim = dossierTarget?.claimId
    ? claims.find((c) => c.id === dossierTarget.claimId) || null
    : dossierProduct
    ? claims.find((c) => c.productId === dossierProduct.id) || null
    : null;

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <Sidebar
        activeView={activeView}
        onSelectView={setActiveView}
        members={members}
        selectedOwnerId={selectedOwnerId}
        onSelectOwner={setSelectedOwnerId}
        counts={sidebarCounts}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Workspace Top Bar */}
        <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0 truncate">
              <span className="text-slate-500 hidden sm:inline whitespace-nowrap">
                {activeOwnerName}
              </span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <h1 className="font-display font-semibold text-slate-900 truncate">
                {VIEW_TITLES[activeView].label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowScannerModal(true)}
              className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <ScanLine className="h-3.5 w-3.5 text-blue-700" />
              <span>Scan Invoice</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAddProductModal(true)}
              className="px-4 py-2 rounded-lg bg-blue-700 text-xs font-semibold text-white hover:bg-blue-800 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Register Product</span>
            </button>
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="flex-1 p-4 sm:p-8 max-w-[1360px] w-full mx-auto">
          <div className="mb-6">
            <p className="text-sm text-slate-600">{VIEW_TITLES[activeView].subtitle}</p>
          </div>

          {activeView === 'overview' && (
            <OverviewView
              products={scopedProducts}
              claims={scopedClaims}
              followUps={scopedFollowUps}
              repairs={scopedRepairs}
              recalls={recalls}
              members={members}
              onNavigate={setActiveView}
              onSelectProduct={handleSelectProduct}
              onToggleFollowUp={handleToggleFollowUp}
              onOpenDossier={(productId, claimId) =>
                setDossierTarget({ productId, claimId })
              }
            />
          )}

          {activeView === 'inventory' && (
            <InventoryView
              products={scopedProducts}
              members={members}
              onSelectProduct={handleSelectProduct}
              onOpenAddProduct={() => setShowAddProductModal(true)}
              onOpenScanner={() => setShowScannerModal(true)}
              onOpenDossier={(productId) => setDossierTarget({ productId })}
            />
          )}

          {activeView === 'claims' && (
            <ClaimsView
              products={scopedProducts}
              claims={scopedClaims}
              followUps={scopedFollowUps}
              initialProductIdForNewClaim={newClaimProductId}
              onClearInitialNewClaim={() => setNewClaimProductId(null)}
              onCreateClaim={handleCreateClaim}
              onUpdateClaimStatus={handleUpdateClaimStatus}
              onAddInteraction={handleAddInteraction}
              onAddFollowUp={handleAddFollowUp}
              onToggleFollowUp={handleToggleFollowUp}
              onSnoozeFollowUp={handleSnoozeFollowUp}
              onOpenDossier={(productId, claimId) =>
                setDossierTarget({ productId, claimId })
              }
              onSelectProduct={handleSelectProduct}
            />
          )}

          {activeView === 'repairs' && (
            <RepairsView
              products={scopedProducts}
              repairs={scopedRepairs}
              onAddRepair={handleAddRepair}
              onSelectProduct={handleSelectProduct}
            />
          )}

          {activeView === 'recalls' && (
            <RecallsView
              products={scopedProducts}
              recalls={recalls}
              onUpdateRecallStatus={handleUpdateRecallStatus}
              onSelectProduct={handleSelectProduct}
            />
          )}

          {activeView === 'family' && (
            <FamilyVaultView
              members={members}
              products={products}
              onAddMember={handleAddMember}
              onReassignProduct={handleReassignProduct}
              onSelectOwnerFilter={(ownerId) => {
                setSelectedOwnerId(ownerId);
                setActiveView('inventory');
              }}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      {modalProduct && selectedProductModal && (
        <ProductDetailModal
          product={modalProduct}
          members={members}
          repairs={repairs}
          initialTab={selectedProductModal.tab}
          onClose={() => setSelectedProductModal(null)}
          onAddWarranty={handleAddWarranty}
          onDeleteWarranty={handleDeleteWarranty}
          onUploadDocument={handleUploadDocument}
          onDeleteDocument={handleDeleteDocument}
          onUpdateSerial={handleUpdateSerial}
          onStartClaim={handleStartClaimFromProduct}
          onOpenDossier={(productId) => {
            setSelectedProductModal(null);
            setDossierTarget({ productId });
          }}
          onDeleteProduct={handleDeleteProduct}
        />
      )}

      {showScannerModal && (
        <SmartInvoiceScannerModal
          members={members}
          onClose={() => setShowScannerModal(false)}
          onSaveExtractedProduct={handleSaveExtractedProduct}
        />
      )}

      {showAddProductModal && (
        <AddProductModal
          members={members}
          onClose={() => setShowAddProductModal(false)}
          onAddProduct={handleAddProduct}
        />
      )}

      {dossierProduct && (
        <ClaimDossierModal
          product={dossierProduct}
          claim={dossierClaim}
          owner={members.find((m) => m.id === dossierProduct.ownerId)}
          repairs={repairs}
          onClose={() => setDossierTarget(null)}
        />
      )}
    </div>
  );
}
