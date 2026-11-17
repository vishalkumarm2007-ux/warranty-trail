import { useState, type FormEvent } from 'react';
import { Plus, UserPlus, Users } from 'lucide-react';
import type { FamilyMember, Product } from '../types/warranty';
import { formatCurrency } from '../utils/warrantyUtils';

interface FamilyVaultViewProps {
  members: FamilyMember[];
  products: Product[];
  onAddMember: (member: Omit<FamilyMember, 'id'>) => void;
  onReassignProduct: (productId: string, ownerId: string) => void;
  onSelectOwnerFilter: (ownerId: string) => void;
}

export function FamilyVaultView({
  members,
  products,
  onAddMember,
  onReassignProduct,
  onSelectOwnerFilter,
}: FamilyVaultViewProps) {
  const [showAddMember, setShowAddMember] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [relation, setRelation] = useState('');
  const [role, setRole] = useState<FamilyMember['role']>('Member');

  const handleAddSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddMember({
      name: name.trim(),
      email: email.trim() || `${name.trim().toLowerCase().replace(/\s+/g, '.')}@homevault.io`,
      relation: relation.trim() || 'Household Member',
      role,
    });
    setName('');
    setEmail('');
    setRelation('');
    setShowAddMember(false);
  };

  return (
    <div className="space-y-8">
      {/* Household Members Grid */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Household Members &amp; Vault Access
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Share warranty records, purchase invoices, and claim dossiers across your household
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddMember((prev) => !prev)}
            className="px-4 py-2 rounded-lg bg-blue-700 text-xs font-semibold text-white hover:bg-blue-800 inline-flex items-center gap-1.5 whitespace-nowrap self-start sm:self-center"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Add Family Member</span>
          </button>
        </div>

        {showAddMember && (
          <form
            onSubmit={handleAddSubmit}
            className="p-6 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs"
          >
            <div>
              <label className="block font-medium text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Nisha Patel"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nisha@homevault.io"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Relationship / Group</label>
              <input
                type="text"
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                placeholder="e.g. Sister · Studio"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block font-medium text-slate-700 mb-1">Vault Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as FamilyMember['role'])}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="Admin">Admin</option>
                  <option value="Member">Member</option>
                  <option value="Shared">Shared</option>
                </select>
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-700 text-white font-semibold hover:bg-blue-800 h-[38px] inline-flex items-center gap-1 whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add</span>
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:gap-px bg-slate-200">
          {members.map((member) => {
            const memberProducts = products.filter((p) => p.ownerId === member.id);
            const memberValue = memberProducts.reduce((s, p) => s + p.purchasePrice, 0);

            return (
              <div key={member.id} className="bg-white p-6 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-display font-bold text-sm shrink-0">
                    {member.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {member.name}{' '}
                      <span className="text-xs font-normal text-slate-500">· {member.role}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {member.relation} · {member.email}
                    </p>
                    <p className="text-xs text-slate-700 font-medium mt-2 tabular-nums">
                      {memberProducts.length} product{memberProducts.length === 1 ? '' : 's'} ·{' '}
                      {formatCurrency(memberValue)} protected
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectOwnerFilter(member.id)}
                  className="text-xs font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0"
                >
                  Filter Vault
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Product Ownership Assignment Matrix */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-600" />
          <div>
            <h3 className="font-display text-base font-semibold text-slate-900">
              Household Ownership Assignments
            </h3>
            <p className="text-xs text-slate-500">
              Reassign devices or shared household appliances across family members
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                <th className="py-3 px-6">Product</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Documents</th>
                <th className="py-3 px-6">Assigned Owner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-6">
                    <p className="font-medium text-slate-900">{product.name}</p>
                    <p className="text-xs text-slate-500 font-mono">
                      {product.brand} · {product.modelNumber}
                    </p>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600">{product.location}</td>
                  <td className="py-3 px-4 text-xs text-slate-600 tabular-nums">
                    {product.documents.length} files
                  </td>
                  <td className="py-3 px-6">
                    <select
                      value={product.ownerId}
                      onChange={(e) => onReassignProduct(product.id, e.target.value)}
                      aria-label={`Assign owner for ${product.name}`}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none"
                    >
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
