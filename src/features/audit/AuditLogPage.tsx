import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useBusiness } from '@/app/providers/BusinessProvider';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { auditService, type SafeAuditEvent } from './auditService';

export const AuditLogPage: React.FC = () => {
  const { t } = useTranslation();
  const { activeBusiness } = useBusiness();

  const [events, setEvents] = useState<SafeAuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionSearch, setActionSearch] = useState('');
  const [targetType, setTargetType] = useState('');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const loadAuditData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await auditService.getAuditEvents(activeBusiness?.id || null, {
        action: actionSearch || undefined,
        targetType: targetType || undefined,
        limit: 100,
      });
      setEvents(data);
    } catch (err) {
      console.error('Failed to load audit events:', err);
    } finally {
      setLoading(false);
    }
  }, [activeBusiness?.id, actionSearch, targetType]);

  useEffect(() => {
    void loadAuditData();
  }, [loadAuditData]);

  const toggleExpand = (id: string) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  };

  const getActionBadgeColor = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('cancel') || act.includes('delete') || act.includes('revoke')) {
      return 'bg-red-100 text-red-800';
    }
    if (act.includes('update') || act.includes('edit') || act.includes('revise')) {
      return 'bg-amber-100 text-amber-800';
    }
    if (act.includes('create') || act.includes('add') || act.includes('issue')) {
      return 'bg-emerald-100 text-emerald-800';
    }
    return 'bg-blue-100 text-blue-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {t('audit.title', 'Security & Compliance Audit Log')} / सुरक्षा व बदल नोंदवही
          </h1>
          <p className="text-sm text-gray-500">
            Immutable, tamper-evident record of all system operations, financial
            mutations, and access changes.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void loadAuditData();
          }}
          disabled={loading}
        >
          Refresh Log / रीफ्रेश
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="min-w-[200px] flex-1">
          <input
            type="text"
            placeholder="Search action (e.g. bill_create, cancel)..."
            value={actionSearch}
            onChange={(e) => setActionSearch(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <select
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Entities / सर्व प्रकार</option>
            <option value="customer">Customer / ग्राहक</option>
            <option value="bill">Bill / बिल</option>
            <option value="payment">Payment / जमा</option>
            <option value="product">Product / उत्पादन</option>
            <option value="expense">Expense / खर्च</option>
            <option value="staff">Staff / कर्मचारी</option>
            <option value="backup">Backup / बॅकअप</option>
            <option value="settings">Settings / सेटिंग्ज</option>
          </select>
        </div>

        <Button
          size="sm"
          onClick={() => {
            void loadAuditData();
          }}
        >
          Search / शोधा
        </Button>
      </div>

      {/* Audit Events Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 className="font-semibold text-gray-900">Audit Trail Events</h3>
          <span className="text-xs text-gray-400">Total: {events.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-medium uppercase tracking-wider text-gray-500">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left font-medium uppercase tracking-wider text-gray-500">
                  Action
                </th>
                <th className="px-6 py-3 text-left font-medium uppercase tracking-wider text-gray-500">
                  Target Entity
                </th>
                <th className="px-6 py-3 text-left font-medium uppercase tracking-wider text-gray-500">
                  Actor / IP
                </th>
                <th className="px-6 py-3 text-right font-medium uppercase tracking-wider text-gray-500">
                  Delta Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Loading audit events...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No matching audit events found.
                  </td>
                </tr>
              ) : (
                events.map((ev) => {
                  const isExpanded = expandedRowId === ev.id;
                  return (
                    <React.Fragment key={ev.id}>
                      <tr
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => toggleExpand(ev.id)}
                      >
                        <td className="whitespace-nowrap px-6 py-3 text-gray-900">
                          {new Date(ev.created_at).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${getActionBadgeColor(
                              ev.action,
                            )}`}
                          >
                            {ev.action}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-gray-700">
                          {ev.target_type ? (
                            <Badge variant="secondary">{ev.target_type}</Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                          {ev.target_id && (
                            <span className="ml-2 font-mono text-xs text-gray-400">
                              #{ev.target_id.substring(0, 8)}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-xs text-gray-500">
                          <div className="font-mono text-gray-700">
                            {ev.actor_id.substring(0, 8)}...
                          </div>
                          {ev.ip_address && (
                            <div className="text-gray-400">{ev.ip_address}</div>
                          )}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <button className="text-xs font-medium text-blue-600 hover:text-blue-800">
                            {isExpanded ? 'Hide Delta ▲' : 'View Delta ▼'}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-gray-50">
                          <td colSpan={5} className="px-8 py-4">
                            <div className="space-y-2">
                              <span className="text-xs font-semibold uppercase text-gray-500">
                                Event Payload & Safe State Delta:
                              </span>
                              <pre className="max-h-60 overflow-x-auto rounded border border-gray-200 bg-white p-3 font-mono text-xs text-gray-800">
                                {JSON.stringify(ev.metadata, null, 2)}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
