/**
 * PlaceholderPage — Explicitly indicates deferred stage modules.
 * Ensures unimplemented routes are visibly marked as not yet active,
 * preventing any impression of a completed workflow.
 */

import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/ui';

export interface PlaceholderPageProps {
  titleKey: string;
  stage: number;
}

export function PlaceholderPage({ titleKey, stage }: PlaceholderPageProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t(titleKey)}
          </h1>
          <p className="mt-1 text-xs font-medium text-amber-700">
            ⚠️ Feature scheduled for Stage {stage} implementation per WORK_ORDER.md
          </p>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
          Stage {stage} (Deferred)
        </span>
      </div>

      <div className="rounded-card border-2 border-dashed border-slate-200 bg-slate-50 p-8">
        <EmptyState
          icon="🚧"
          title={`${t(titleKey)} — Not Yet Available`}
          description={`This module is intentionally deferred to Stage ${stage}. No operational transactions, financial entries, or business records can be processed until Stage ${stage} is authorized and implemented.`}
        />
      </div>
    </div>
  );
}

export default PlaceholderPage;
