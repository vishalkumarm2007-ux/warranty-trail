import {
  AlertTriangle,
  BellRing,
  ChevronRight,
  FileCheck2,
  LayoutDashboard,
  Package,
  ShieldAlert,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import type { FamilyMember, ViewId } from '../types/warranty';

interface SidebarProps {
  activeView: ViewId;
  onSelectView: (view: ViewId) => void;
  members: FamilyMember[];
  selectedOwnerId: string;
  onSelectOwner: (ownerId: string) => void;
  counts: {
    products: number;
    openClaims: number;
    pendingFollowUps: number;
    activeRecalls: number;
    expiringAlerts: number;
  };
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  activeView,
  onSelectView,
  members,
  selectedOwnerId,
  onSelectOwner,
  counts,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const navItems: Array<{
    id: ViewId;
    label: string;
    icon: typeof LayoutDashboard;
    count?: number;
    alert?: boolean;
  }> = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
      count: counts.expiringAlerts > 0 ? counts.expiringAlerts : undefined,
      alert: counts.expiringAlerts > 0,
    },
    {
      id: 'inventory',
      label: 'Product Vault',
      icon: Package,
      count: counts.products,
    },
    {
      id: 'claims',
      label: 'Claims & Follow-ups',
      icon: FileCheck2,
      count: counts.openClaims + counts.pendingFollowUps,
    },
    {
      id: 'repairs',
      label: 'Repairs & Expenses',
      icon: Wrench,
    },
    {
      id: 'recalls',
      label: 'Safety Recalls',
      icon: ShieldAlert,
      count: counts.activeRecalls > 0 ? counts.activeRecalls : undefined,
      alert: counts.activeRecalls > 0,
    },
    {
      id: 'family',
      label: 'Family Vault',
      icon: Users,
      count: members.length,
    },
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white border-r border-slate-200">
      <div className="flex items-center justify-between px-5 h-16 border-b border-slate-200 shrink-0">
        <button
          type="button"
          onClick={() => {
            onSelectView('overview');
            onCloseMobile();
          }}
          className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
        >
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
            WarrantyTrail
          </span>
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-2 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          aria-label="Close navigation menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="px-4 pt-5 pb-4 border-b border-slate-200">
        <label
          htmlFor="household-vault-filter"
          className="block text-xs font-medium text-slate-500 mb-1.5"
        >
          Household Vault Scope
        </label>
        <select
          id="household-vault-filter"
          value={selectedOwnerId}
          onChange={(e) => onSelectOwner(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
        >
          <option value="all">All Household ({counts.products} items)</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Primary">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectView(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive ? 'text-blue-700' : 'text-slate-500'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </span>
              {item.count !== undefined && (
                <span
                  className={`text-xs font-mono tabular-nums ml-2 shrink-0 ${
                    item.alert
                      ? 'text-amber-700 font-semibold'
                      : isActive
                      ? 'text-blue-700'
                      : 'text-slate-500'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 space-y-2.5">
        {counts.activeRecalls > 0 && (
          <button
            type="button"
            onClick={() => {
              onSelectView('recalls');
              onCloseMobile();
            }}
            className="w-full flex items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50/70 px-3 py-2.5 text-left hover:bg-red-50 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-red-900 truncate">
                  {counts.activeRecalls} Recall Match
                </p>
                <p className="text-xs text-red-700 truncate">Review safety notice</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-red-600 shrink-0" />
          </button>
        )}
        {counts.expiringAlerts > 0 && (
          <button
            type="button"
            onClick={() => {
              onSelectView('overview');
              onCloseMobile();
            }}
            className="w-full flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-left hover:bg-amber-50 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <BellRing className="h-4 w-4 text-amber-700 shrink-0" />
              <span className="text-xs font-medium text-amber-900 truncate">
                {counts.expiringAlerts} coverage expiring soon
              </span>
            </div>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[85vw] h-full z-10">{sidebarContent}</div>
        </div>
      )}
    </>
  );
}
