import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useBusiness } from '@/app/providers/BusinessProvider';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { staffService, type StaffMemberRecord } from './staffService';

export const StaffManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const { activeBusiness, activeRole } = useBusiness();

  const isOwner = activeRole === 'owner';
  const [members, setMembers] = useState<StaffMemberRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Invite Modal
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'owner' | 'staff'>('staff');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadMembers = useCallback(async () => {
    if (!activeBusiness?.id) return;
    setLoading(true);
    try {
      const data = await staffService.getStaffMembers(activeBusiness.id);
      setMembers(data);
    } catch (err) {
      console.error('Failed to load team members:', err);
    } finally {
      setLoading(false);
    }
  }, [activeBusiness?.id]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness?.id) return;
    setIsSubmitting(true);
    try {
      await staffService.inviteStaffMember(activeBusiness.id, {
        full_name: inviteName,
        email: inviteEmail,
        role: inviteRole,
      });
      setMessage({
        type: 'success',
        text: `Successfully added ${inviteName} as ${inviteRole}!`,
      });
      setIsInviteOpen(false);
      setInviteName('');
      setInviteEmail('');
      setInviteRole('staff');
      await loadMembers();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Invite failed',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: 'owner' | 'staff') => {
    if (!activeBusiness?.id || !isOwner) return;
    try {
      await staffService.updateStaffRole(activeBusiness.id, memberId, newRole);
      setMessage({ type: 'success', text: `Updated staff role to ${newRole}` });
      await loadMembers();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Role change failed',
      });
    }
  };

  const handleDeactivate = async (memberId: string, name: string) => {
    if (!activeBusiness?.id || !isOwner) return;
    if (!confirm(`Are you sure you want to deactivate ${name}?`)) return;
    try {
      await staffService.deactivateStaffMember(activeBusiness.id, memberId);
      setMessage({ type: 'success', text: `Deactivated access for ${name}` });
      await loadMembers();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Deactivation failed',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {t('staff.title', 'Staff Management & Access Control')} / कर्मचारी व प्रवेश
            नियंत्रण
          </h1>
          <p className="text-sm text-gray-500">
            Owner-guarded delegation of staff roles, access privileges, and security
            boundaries.
          </p>
        </div>

        {isOwner && (
          <Button size="sm" onClick={() => setIsInviteOpen(true)}>
            Invite Staff Member / नवीन कर्मचारी जोडा
          </Button>
        )}
      </div>

      {/* Alert Messages */}
      {message && (
        <div
          className={`rounded-md p-4 text-sm ${
            message.type === 'success'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Staff Roster Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 className="font-semibold text-gray-900">Team Members Roster</h3>
          <span className="text-xs text-gray-400">Total: {members.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-medium uppercase tracking-wider text-gray-500">
                  Member Name
                </th>
                <th className="px-6 py-3 text-left font-medium uppercase tracking-wider text-gray-500">
                  Email / User ID
                </th>
                <th className="px-6 py-3 text-center font-medium uppercase tracking-wider text-gray-500">
                  Assigned Role
                </th>
                <th className="px-6 py-3 text-left font-medium uppercase tracking-wider text-gray-500">
                  Joined Date
                </th>
                {isOwner && (
                  <th className="px-6 py-3 text-right font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Loading team roster...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No staff members assigned yet.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">{m.full_name}</td>
                    <td className="px-6 py-3 font-mono text-xs text-gray-500">
                      {m.email}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <Badge variant={m.role === 'owner' ? 'primary' : 'secondary'}>
                        {m.role === 'owner' ? 'Owner / मालक' : 'Staff / कर्मचारी'}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-500">
                      {new Date(m.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    {isOwner && (
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <select
                            value={m.role}
                            onChange={(e) =>
                              void handleRoleChange(
                                m.id,
                                e.target.value as 'owner' | 'staff',
                              )
                            }
                            className="rounded border border-gray-300 bg-white px-2 py-1 text-xs"
                          >
                            <option value="owner">Owner</option>
                            <option value="staff">Staff</option>
                          </select>
                          <button
                            onClick={() => {
                              void handleDeactivate(m.id, m.full_name);
                            }}
                            className="text-xs font-medium text-red-600 hover:text-red-800"
                          >
                            Deactivate
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      <Modal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title="Invite New Staff Member / नवीन कर्मचारी जोडा"
      >
        <form
          onSubmit={(e) => {
            void handleInvite(e);
          }}
          className="space-y-4"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Full Name / पूर्ण नाव
            </label>
            <input
              type="text"
              required
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="e.g. Ramesh Patil"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Email / ईमेल
            </label>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="e.g. ramesh@example.com"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Role / हुद्दा
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'owner' | 'staff')}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="staff">
                Staff (Standard billing, customer viewing, no profit access)
              </option>
              <option value="owner">
                Owner (Full administrative, backup, and financial access)
              </option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsInviteOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Inviting...' : 'Confirm Invite'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
