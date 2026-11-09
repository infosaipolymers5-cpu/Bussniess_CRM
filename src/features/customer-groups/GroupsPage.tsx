/**
 * GroupsPage — Manage customer groups and tags for the active business.
 */

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useBusiness } from '@/app/providers/BusinessProvider';
import {
  fetchGroups,
  createGroup,
  deleteGroup,
  fetchTags,
  createTag,
  deleteTag,
  type CustomerGroupWithCount,
} from './api/groupService';
import { Button, Input, Dialog, LoadingSpinner, EmptyState } from '@/components/ui';
import type { Tag } from '@/lib/database.types';

export function GroupsPage() {
  const { t } = useTranslation();
  const { activeBusiness } = useBusiness();

  const [groups, setGroups] = useState<CustomerGroupWithCount[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  // Group creation modal
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');

  // Tag creation modal
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#3b82f6');

  const loadData = useCallback(async () => {
    if (!activeBusiness) return;
    setLoading(true);
    const [grpRes, tagRes] = await Promise.all([
      fetchGroups(activeBusiness.id),
      fetchTags(activeBusiness.id),
    ]);
    setGroups(grpRes.data);
    setTags(tagRes.data);
    setLoading(false);
  }, [activeBusiness]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCreateGroup = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || !groupName.trim()) return;

    const { group } = await createGroup(activeBusiness.id, {
      name: groupName,
      description: groupDesc,
    });

    if (group) {
      setGroupName('');
      setGroupDesc('');
      setGroupDialogOpen(false);
      await loadData();
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this group?')) return;
    await deleteGroup(groupId);
    await loadData();
  };

  const handleCreateTag = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || !tagName.trim()) return;

    const { tag } = await createTag(activeBusiness.id, {
      name: tagName,
      color: tagColor,
    });

    if (tag) {
      setTagName('');
      setTagDialogOpen(false);
      await loadData();
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm('Are you sure you want to delete this tag?')) return;
    await deleteTag(tagId);
    await loadData();
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {t('customerGroups.title')}
        </h1>
        <p className="text-sm text-slate-500">
          {activeBusiness?.name} · Organize customers into targeted segments and labels
        </p>
      </div>

      {/* Customer Groups Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{t('nav.groups')}</h2>
          <Button variant="primary" size="sm" onClick={() => setGroupDialogOpen(true)}>
            + {t('customerGroups.addGroup')}
          </Button>
        </div>

        {groups.length === 0 ? (
          <EmptyState
            icon="🏷️"
            title={t('customerGroups.noGroups')}
            description="Create groups to organize customers for targeted broadcast reminders and follow-ups."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((g) => (
              <div
                key={g.id}
                className="flex flex-col justify-between rounded-card border border-slate-200 bg-white p-5 shadow-card"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900">{g.name}</h3>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                      {t('customerGroups.memberCount', { count: g.memberCount ?? 0 })}
                    </span>
                  </div>
                  {g.description && (
                    <p className="mt-2 line-clamp-2 text-xs text-slate-500">
                      {g.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex justify-end border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => void handleDeleteGroup(g.id)}
                    className="text-xs font-medium text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Customer Tags Section */}
      <div className="space-y-4 border-t border-slate-200 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{t('customers.tags')}</h2>
          <Button variant="secondary" size="sm" onClick={() => setTagDialogOpen(true)}>
            + {t('customerGroups.addTag')}
          </Button>
        </div>

        {tags.length === 0 ? (
          <EmptyState
            icon="●"
            title={t('customerGroups.noTags')}
            description="Add quick label tags (e.g. VIP, Farmer, Tiller Owner) to classify customers."
          />
        ) : (
          <div className="flex flex-wrap gap-3">
            {tags.map((tag) => (
              <div
                key={tag.id}
                style={{
                  backgroundColor: `${tag.color}15`,
                  borderColor: `${tag.color}40`,
                }}
                className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold"
              >
                <span style={{ color: tag.color }}>●</span>
                <span className="text-slate-800">{tag.name}</span>
                <button
                  type="button"
                  onClick={() => void handleDeleteTag(tag.id)}
                  aria-label={`Delete tag ${tag.name}`}
                  className="ml-1 text-xs text-slate-400 hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Group Create Dialog */}
      <Dialog
        open={groupDialogOpen}
        onClose={() => setGroupDialogOpen(false)}
        title={t('customerGroups.addGroup')}
      >
        <form onSubmit={(e) => void handleCreateGroup(e)} className="space-y-4">
          <Input
            label={t('customerGroups.groupName')}
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            required
            placeholder="e.g. Regular Dairy Farmers"
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {t('customerGroups.description')}
            </label>
            <textarea
              value={groupDesc}
              onChange={(e) => setGroupDesc(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-300 p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setGroupDialogOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary">
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Tag Create Dialog */}
      <Dialog
        open={tagDialogOpen}
        onClose={() => setTagDialogOpen(false)}
        title={t('customerGroups.addTag')}
      >
        <form onSubmit={(e) => void handleCreateTag(e)} className="space-y-4">
          <Input
            label={t('customerGroups.tagName')}
            value={tagName}
            onChange={(e) => setTagName(e.target.value)}
            required
            placeholder="e.g. VIP"
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {t('customerGroups.color')}
            </label>
            <input
              type="color"
              value={tagColor}
              onChange={(e) => setTagColor(e.target.value)}
              className="h-10 w-20 cursor-pointer rounded border border-slate-300 p-1"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setTagDialogOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary">
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

export default GroupsPage;
