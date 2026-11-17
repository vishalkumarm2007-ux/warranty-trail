import { useState, type FormEvent } from 'react';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  FileCheck2,
  MessageSquarePlus,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import type {
  ClaimInteraction,
  ClaimStatus,
  FollowUpTask,
  Product,
  WarrantyClaim,
} from '../types/warranty';
import {
  daysUntil,
  evaluateClaimReadiness,
  formatShortDate,
} from '../utils/warrantyUtils';

interface ClaimsViewProps {
  products: Product[];
  claims: WarrantyClaim[];
  followUps: FollowUpTask[];
  initialProductIdForNewClaim?: string | null;
  onClearInitialNewClaim: () => void;
  onCreateClaim: (claim: Omit<WarrantyClaim, 'id'>) => void;
  onUpdateClaimStatus: (claimId: string, status: ClaimStatus) => void;
  onAddInteraction: (claimId: string, interaction: Omit<ClaimInteraction, 'id'>) => void;
  onAddFollowUp: (task: Omit<FollowUpTask, 'id'>) => void;
  onToggleFollowUp: (taskId: string) => void;
  onSnoozeFollowUp: (taskId: string, extraDays: number) => void;
  onOpenDossier: (productId: string, claimId?: string) => void;
  onSelectProduct: (
    productId: string,
    initialTab?: 'coverage' | 'vault' | 'readiness' | 'repairs'
  ) => void;
}

const CLAIM_STAGES: ClaimStatus[] = [
  'Draft',
  'Submitted',
  'Inspection Scheduled',
  'In Repair',
  'Approved',
  'Resolved',
];

export function ClaimsView({
  products,
  claims,
  followUps,
  initialProductIdForNewClaim,
  onClearInitialNewClaim,
  onCreateClaim,
  onUpdateClaimStatus,
  onAddInteraction,
  onAddFollowUp,
  onToggleFollowUp,
  onSnoozeFollowUp,
  onOpenDossier,
  onSelectProduct,
}: ClaimsViewProps) {
  const [selectedClaimId, setSelectedClaimId] = useState<string>(claims[0]?.id || '');
  const [showNewClaimForm, setShowNewClaimForm] = useState(
    Boolean(initialProductIdForNewClaim)
  );
  const [newProductId, setNewProductId] = useState(
    initialProductIdForNewClaim || products[0]?.id || ''
  );
  const [newWarrantyId, setNewWarrantyId] = useState('');
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [newIssueDesc, setNewIssueDesc] = useState('');
  const [newServiceCenter, setNewServiceCenter] = useState('');
  const [newServiceContact, setNewServiceContact] = useState('');

  // Interaction logger state
  const [intChannel, setIntChannel] = useState<ClaimInteraction['channel']>('Phone');
  const [intAgent, setIntAgent] = useState('');
  const [intSummary, setIntSummary] = useState('');
  const [intRef, setIntRef] = useState('');

  // New follow-up state
  const [showNewFollowUp, setShowNewFollowUp] = useState(false);
  const [fuTitle, setFuTitle] = useState('');
  const [fuProductId, setFuProductId] = useState(products[0]?.id || '');
  const [fuDueDate, setFuDueDate] = useState('2026-11-22');
  const [fuChannel, setFuChannel] = useState<FollowUpTask['channel']>('Phone');
  const [fuPriority, setFuPriority] = useState<FollowUpTask['priority']>('High');

  const selectedClaim = claims.find((c) => c.id === selectedClaimId) || claims[0] || null;
  const selectedClaimProduct = selectedClaim
    ? products.find((p) => p.id === selectedClaim.productId)
    : undefined;
  const selectedReadiness = selectedClaimProduct
    ? evaluateClaimReadiness(selectedClaimProduct, selectedClaim || undefined)
    : null;

  const selectedNewProduct = products.find((p) => p.id === newProductId) || products[0];

  const handleCreateClaimSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedNewProduct || !newIssueTitle.trim()) return;
    const chosenWarrantyId =
      newWarrantyId || selectedNewProduct.warranties[0]?.id || 'war_default';

    onCreateClaim({
      productId: selectedNewProduct.id,
      warrantyId: chosenWarrantyId,
      claimNumber: `CLM-2026-${Math.floor(1000 + Math.random() * 8999)}`,
      issueTitle: newIssueTitle.trim(),
      issueDescription: newIssueDesc.trim() || 'Fault reported under active warranty coverage.',
      faultDetectedDate: '2026-11-17',
      submittedDate: '2026-11-17',
      status: 'Submitted',
      serviceCenterName:
        newServiceCenter.trim() || `${selectedNewProduct.brand} Authorized Service`,
      serviceCenterContact: newServiceContact.trim() || 'support@manufacturer.com',
      interactions: [
        {
          id: `int_init_${Date.now()}`,
          date: '2026-11-17',
          time: '09:30',
          channel: 'Service Portal',
          agentName: 'WarrantyTrail Filing',
          summary: 'Claim created with vault invoice and component coverage verification.',
          referenceCode: 'INITIAL-FILING',
        },
      ],
    });
    setNewIssueTitle('');
    setNewIssueDesc('');
    setNewServiceCenter('');
    setShowNewClaimForm(false);
    onClearInitialNewClaim();
  };

  const handleAddInteractionSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedClaim || !intSummary.trim()) return;
    onAddInteraction(selectedClaim.id, {
      date: '2026-11-17',
      time: '11:45',
      channel: intChannel,
      agentName: intAgent.trim() || 'Service Representative',
      summary: intSummary.trim(),
      referenceCode: intRef.trim() || undefined,
    });
    setIntAgent('');
    setIntSummary('');
    setIntRef('');
  };

  const handleAddFollowUpSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!fuTitle.trim()) return;
    onAddFollowUp({
      title: fuTitle.trim(),
      productId: fuProductId || products[0]?.id || '',
      claimId: selectedClaim?.id,
      dueDate: fuDueDate,
      channel: fuChannel,
      priority: fuPriority,
      completed: false,
      notes: 'Scheduled via Claims & Follow-ups desk.',
    });
    setFuTitle('');
    setShowNewFollowUp(false);
  };

  return (
    <div className="space-y-8">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900">
            Warranty Claims &amp; Service Desk
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track claim lifecycle stages, log every service center call, and verify readiness before submission.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowNewFollowUp((prev) => !prev)}
            className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <CalendarClock className="h-3.5 w-3.5" />
            <span>Schedule Follow-up</span>
          </button>
          <button
            type="button"
            onClick={() => setShowNewClaimForm((prev) => !prev)}
            className="px-4 py-2 rounded-lg bg-blue-700 text-xs font-semibold text-white hover:bg-blue-800 inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create New Claim</span>
          </button>
        </div>
      </div>

      {/* Inline New Claim Form */}
      {showNewClaimForm && (
        <form
          onSubmit={handleCreateClaimSubmit}
          className="bg-white border border-blue-200 rounded-xl p-6 space-y-4 text-xs"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Open Warranty Claim
            </h3>
            <button
              type="button"
              onClick={() => {
                setShowNewClaimForm(false);
                onClearInitialNewClaim();
              }}
              className="text-slate-500 hover:text-slate-900"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Product</label>
              <select
                value={newProductId}
                onChange={(e) => {
                  setNewProductId(e.target.value);
                  setNewWarrantyId('');
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Component Warranty Tier
              </label>
              <select
                value={newWarrantyId || selectedNewProduct?.warranties[0]?.id || ''}
                onChange={(e) => setNewWarrantyId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {selectedNewProduct?.warranties.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.componentName} ({w.expiryDate})
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">Issue Summary *</label>
              <input
                type="text"
                required
                value={newIssueTitle}
                onChange={(e) => setNewIssueTitle(e.target.value)}
                placeholder="e.g. HDMI eARC port fails to output Dolby Atmos signal"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">Fault Description</label>
              <textarea
                rows={2}
                value={newIssueDesc}
                onChange={(e) => setNewIssueDesc(e.target.value)}
                placeholder="Describe symptoms, error codes, and troubleshooting performed..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Authorized Service Center
              </label>
              <input
                type="text"
                value={newServiceCenter}
                onChange={(e) => setNewServiceCenter(e.target.value)}
                placeholder="e.g. Manufacturer Depot or Local Authorized Tech"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Contact Phone / Email</label>
              <input
                type="text"
                value={newServiceContact}
                onChange={(e) => setNewServiceContact(e.target.value)}
                placeholder="e.g. +1 (800) 243-0000"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-blue-700 text-xs font-semibold text-white hover:bg-blue-800"
            >
              Submit Claim Record
            </button>
          </div>
        </form>
      )}

      {/* Claims Split Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Claim List */}
        <div className="xl:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70">
            <h3 className="text-xs font-semibold text-slate-700">
              Registered Claims ({claims.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {claims.map((claim) => {
              const product = products.find((p) => p.id === claim.productId);
              const isSelected = selectedClaim?.id === claim.id;
              return (
                <button
                  key={claim.id}
                  type="button"
                  onClick={() => setSelectedClaimId(claim.id)}
                  className={`w-full text-left p-4 transition-colors ${
                    isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="font-mono">{claim.claimNumber}</span>
                    <span
                      className={`font-semibold ${
                        claim.status === 'Resolved' ? 'text-emerald-700' : 'text-blue-700'
                      }`}
                    >
                      {claim.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-900 line-clamp-1">
                    {claim.issueTitle}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 truncate">
                    {product?.name || 'Product'} · Opened {formatShortDate(claim.submittedDate)}
                  </p>
                </button>
              );
            })}
            {claims.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-500">
                No warranty claims filed yet.
              </div>
            )}
          </div>
        </div>

        {/* Selected Claim Detail & Interaction Timeline */}
        <div className="xl:col-span-8 space-y-6">
          {selectedClaim && selectedClaimProduct ? (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-mono">
                    {selectedClaim.claimNumber} · {selectedClaimProduct.brand} · Serial{' '}
                    {selectedClaimProduct.serialNumber}
                  </p>
                  <h3 className="mt-1 font-display text-lg font-bold text-slate-900">
                    {selectedClaim.issueTitle}
                  </h3>
                  <p className="mt-1.5 text-sm text-slate-600">
                    {selectedClaim.issueDescription}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenDossier(selectedClaimProduct.id, selectedClaim.id)}
                  className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <FileCheck2 className="h-4 w-4 text-blue-700" />
                  <span>Generate Claim Dossier</span>
                </button>
              </div>

              {/* Status Progression Bar */}
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                <p className="text-xs font-medium text-slate-500 mb-2.5">Claim Stage</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {CLAIM_STAGES.map((stage) => {
                    const active = selectedClaim.status === stage;
                    return (
                      <button
                        key={stage}
                        type="button"
                        onClick={() => onUpdateClaimStatus(selectedClaim.id, stage)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                          active
                            ? 'bg-blue-700 text-white'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {stage}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Readiness & Service Center Strip */}
              <div className="p-6 border-b border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div>
                  <p className="font-semibold text-slate-700 mb-1">Authorized Service Center</p>
                  <p className="text-sm font-medium text-slate-900">
                    {selectedClaim.serviceCenterName}
                  </p>
                  <p className="text-slate-500 mt-0.5">{selectedClaim.serviceCenterContact}</p>
                </div>

                {selectedReadiness && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-slate-700">Dossier Readiness</p>
                      <button
                        type="button"
                        onClick={() => onSelectProduct(selectedClaimProduct.id, 'readiness')}
                        className="text-blue-700 font-medium hover:underline"
                      >
                        Open Checklist
                      </button>
                    </div>
                    {selectedReadiness.isClaimReady ? (
                      <p className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                        <ShieldCheck className="h-4 w-4" />
                        <span>
                          All {selectedReadiness.totalCount} claim documents verified
                        </span>
                      </p>
                    ) : (
                      <p className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700">
                        <AlertCircle className="h-4 w-4" />
                        <span>Missing: {selectedReadiness.missingSummary.join(', ')}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Chronological Interaction History */}
              <div className="p-6 space-y-5">
                <h4 className="font-display text-sm font-semibold text-slate-900">
                  Chronological Service Interaction Log ({selectedClaim.interactions.length})
                </h4>

                <div className="space-y-3">
                  {selectedClaim.interactions.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2 text-slate-500">
                        <span className="font-mono tabular-nums">
                          {formatShortDate(item.date)} · {item.time} · {item.channel}
                        </span>
                        {item.referenceCode && (
                          <span className="font-mono font-medium text-slate-700">
                            Ref: {item.referenceCode}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-900">{item.summary}</p>
                      <p className="mt-1 text-slate-500">Logged with {item.agentName}</p>
                    </div>
                  ))}
                </div>

                {/* Add interaction form */}
                <form
                  onSubmit={handleAddInteractionSubmit}
                  className="pt-4 border-t border-slate-200 space-y-3 text-xs"
                >
                  <p className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <MessageSquarePlus className="h-4 w-4 text-blue-700" />
                    <span>Log Service Call, Email, or Visit</span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <select
                      value={intChannel}
                      onChange={(e) =>
                        setIntChannel(e.target.value as ClaimInteraction['channel'])
                      }
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="Phone">Phone Call</option>
                      <option value="Email">Email</option>
                      <option value="Service Portal">Service Portal</option>
                      <option value="Technician Visit">Technician Visit</option>
                    </select>
                    <input
                      type="text"
                      value={intAgent}
                      onChange={(e) => setIntAgent(e.target.value)}
                      placeholder="Agent or Technician Name"
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      value={intRef}
                      onChange={(e) => setIntRef(e.target.value)}
                      placeholder="Ticket / RMA # (optional)"
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      required
                      value={intSummary}
                      onChange={(e) => setIntSummary(e.target.value)}
                      placeholder="Summary of update, promised callback date, or part status..."
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-slate-900 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
                    >
                      Append Log
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
              Select a claim on the left or open a new warranty claim above.
            </div>
          )}
        </div>
      </div>

      {/* Automated Follow-up Reminders Section */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-semibold text-slate-900">
              Automated Follow-up Queue
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Organize service center callbacks, pre-expiry checks, and document upload reminders
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowNewFollowUp((prev) => !prev)}
            className="text-xs font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap self-start sm:self-center"
          >
            {showNewFollowUp ? 'Hide Form' : '+ Add Reminder'}
          </button>
        </div>

        {showNewFollowUp && (
          <form
            onSubmit={handleAddFollowUpSubmit}
            className="p-5 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs"
          >
            <div className="lg:col-span-2">
              <input
                type="text"
                required
                value={fuTitle}
                onChange={(e) => setFuTitle(e.target.value)}
                placeholder="Reminder title (e.g. Call service desk for RMA shipping)"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <select
              value={fuProductId}
              onChange={(e) => setFuProductId(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.brand} — {p.modelNumber}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={fuDueDate}
              onChange={(e) => setFuDueDate(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <select
                value={fuChannel}
                onChange={(e) => setFuChannel(e.target.value as FollowUpTask['channel'])}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm"
              >
                <option value="Phone">Phone</option>
                <option value="Email">Email</option>
                <option value="Service Portal">Portal</option>
                <option value="In-Person">In-Person</option>
              </select>
              <select
                value={fuPriority}
                onChange={(e) => setFuPriority(e.target.value as FollowUpTask['priority'])}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm"
              >
                <option value="High">High</option>
                <option value="Normal">Normal</option>
              </select>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-700 text-white font-medium hover:bg-blue-800 whitespace-nowrap"
              >
                Save
              </button>
            </div>
          </form>
        )}

        <div className="divide-y divide-slate-100">
          {followUps.map((task) => {
            const product = products.find((p) => p.id === task.productId);
            const dueIn = daysUntil(task.dueDate);
            return (
              <div
                key={task.id}
                className={`px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  task.completed ? 'bg-slate-50/60 opacity-70' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => onToggleFollowUp(task.id)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 cursor-pointer"
                  />
                  <div>
                    <p
                      className={`text-sm font-medium ${
                        task.completed ? 'line-through text-slate-500' : 'text-slate-900'
                      }`}
                    >
                      {task.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                      {product?.name || 'Product'} · Due {formatShortDate(task.dueDate)} (
                      {dueIn < 0 ? `${Math.abs(dueIn)}d overdue` : `in ${dueIn}d`}) ·{' '}
                      {task.channel} · {task.priority} priority
                    </p>
                  </div>
                </div>

                {!task.completed ? (
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => onSnoozeFollowUp(task.id, 3)}
                      className="px-2.5 py-1 rounded border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 whitespace-nowrap"
                    >
                      Snooze +3d
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleFollowUp(task.id)}
                      className="px-2.5 py-1 rounded border border-emerald-200 bg-emerald-50 text-xs font-medium text-emerald-700 hover:bg-emerald-100 whitespace-nowrap"
                    >
                      Mark Done
                    </button>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 shrink-0">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Completed</span>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
