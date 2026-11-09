/**
 * ImportPage — Excel / CSV Customer & Opening Balance Import Workflow:
 * 1. CSV Upload / Paste
 * 2. Instant Pre-Validation & Duplicate Check
 * 3. Validation Summary Metrics & Row Preview
 * 4. Explicit Confirmation & Atomic Batch Commit
 * 5. Downloadable Outcome Audit Log
 */

import { useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useBusiness } from '@/app/providers/BusinessProvider';
import {
  parseAndPreviewCsv,
  commitImportBatch,
  type ImportPreviewSummary,
  type ImportCommitResult,
} from './api/importService';
import { Button, ConfirmDialog, MetricCard, LoadingSpinner } from '@/components/ui';

export function ImportPage() {
  const { t } = useTranslation();
  const { activeBusiness } = useBusiness();

  const [fileName, setFileName] = useState<string>('customers_import.csv');
  const [preview, setPreview] = useState<ImportPreviewSummary | null>(null);
  const [validating, setValidating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [commitDialogOpen, setCommitDialogOpen] = useState(false);
  const [result, setResult] = useState<ImportCommitResult | null>(null);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (activeBusiness) {
        setValidating(true);
        void parseAndPreviewCsv(activeBusiness.id, text).then((res) => {
          setPreview(res);
          setValidating(false);
          setResult(null);
        });
      }
    };
    reader.readAsText(file);
  };

  const handleToggleRowAction = (rowIndex: number) => {
    if (!preview) return;
    setPreview({
      ...preview,
      rows: preview.rows.map((r) =>
        r.rowIndex === rowIndex
          ? { ...r, action: r.action === 'import' ? 'skip' : 'import' }
          : r,
      ),
    });
  };

  const handleCommit = async () => {
    if (!activeBusiness || !preview) return;
    setCommitting(true);
    setCommitDialogOpen(false);

    const res = await commitImportBatch(
      activeBusiness.id,
      preview.batchId,
      fileName,
      preview.rows,
    );

    setResult(res);
    setCommitting(false);
  };

  const handleDownloadLog = () => {
    if (!result) return;
    const logData = [
      `Batch ID: ${result.batchId}`,
      `Imported: ${result.importedCount}`,
      `Skipped: ${result.skippedCount}`,
      `Opening Balances: ${result.openingBalancesCount}`,
      `Errors: ${result.errors.length}`,
      ...result.errors,
    ].join('\n');

    const blob = new Blob([logData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-log-${result.batchId.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {t('imports.title')}
        </h1>
        <p className="text-sm text-slate-500">
          {activeBusiness?.name} · Import customers with opening dues under immutable
          provenance tags
        </p>
      </div>

      {/* File Upload Section */}
      <div className="space-y-4 rounded-card border border-slate-200 bg-white p-6 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {t('imports.uploadFile')}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Supported columns:{' '}
              <code>Name, Phone, DOB, Area, OpeningBalance, BusinessType</code>
            </p>
          </div>
          <div>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="cursor-pointer text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
            />
          </div>
        </div>

        {/* Sample CSV Format Template Helper */}
        <details className="border-t border-slate-100 pt-2 text-xs text-slate-500">
          <summary className="cursor-pointer font-medium text-brand-600 hover:text-brand-700">
            View Sample CSV Format
          </summary>
          <pre className="mt-2 overflow-x-auto rounded bg-slate-50 p-3 font-mono text-[11px] text-slate-800">
            {`Name,Phone,DOB,Area,OpeningBalance,BusinessType
Ramesh Patil,9876543210,1985-04-12,Chikhali,1250.00,cattle_feed
Ganesh Shinde,9823456789,1990-08-25,Shivaji Nagar,0,pvc`}
          </pre>
        </details>
      </div>

      {/* Validating Spinner */}
      {validating && (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="md" />
          <span className="ml-3 text-sm text-slate-600">{t('common.loading')}</span>
        </div>
      )}

      {/* Preview Summary */}
      {preview && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MetricCard
              label={t('imports.totalRows')}
              value={String(preview.totalRows)}
            />
            <MetricCard
              label={t('imports.validRows')}
              value={String(preview.validRows)}
              subtitle="Ready to import"
            />
            <MetricCard
              label={t('imports.duplicateRows')}
              value={String(preview.duplicateRows)}
              subtitle="Default: Skip"
            />
            <MetricCard
              label={t('imports.errorRows')}
              value={String(preview.errorRows)}
              subtitle="Excluded"
            />
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between rounded-card border border-slate-200 bg-white p-4 shadow-card">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {preview.rows.filter((r) => r.action === 'import').length} row(s) selected
                for import
              </p>
              <p className="text-xs text-slate-500">
                Batch ID: <code>{preview.batchId.slice(0, 8)}…</code>
              </p>
            </div>
            <Button
              variant="primary"
              disabled={
                preview.rows.filter((r) => r.action === 'import').length === 0 ||
                committing
              }
              onClick={() => setCommitDialogOpen(true)}
              loading={committing}
            >
              {t('imports.commitImport')}
            </Button>
          </div>

          {/* Preview Table */}
          <div className="overflow-hidden rounded-card border border-slate-200 bg-white shadow-card">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Row
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Name
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Phone
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Balance
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {preview.rows.map((row) => (
                  <tr
                    key={row.rowIndex}
                    className={
                      !row.isValid
                        ? 'bg-red-50/50'
                        : row.isDuplicate
                          ? 'bg-amber-50/40'
                          : undefined
                    }
                  >
                    <td className="px-4 py-3 font-mono text-slate-400">
                      #{row.rowIndex}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {!row.isValid ? (
                        <span className="text-red-700">
                          ❌ Error: {row.validationError}
                        </span>
                      ) : row.isDuplicate ? (
                        <span className="text-amber-700">
                          ⚠️ Duplicate ({row.duplicateCustomerName})
                        </span>
                      ) : (
                        <span className="text-green-700">✓ Valid</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.name}</td>
                    <td className="px-4 py-3 font-mono">{row.phone}</td>
                    <td className="px-4 py-3 font-medium">
                      {row.openingBalanceRupees > 0
                        ? `₹${row.openingBalanceRupees.toFixed(2)}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.isValid && (
                        <Button
                          variant={row.action === 'import' ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={() => handleToggleRowAction(row.rowIndex)}
                        >
                          {row.action === 'import' ? 'Import' : 'Skip'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Outcome Results */}
      {result && (
        <div className="space-y-4 rounded-card border border-green-200 bg-green-50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-green-900">
                Import Committed Successfully
              </h3>
              <p className="mt-1 text-xs text-green-700">
                Batch: <code>{result.batchId}</code> · {result.importedCount} customers
                imported · {result.openingBalancesCount} opening balance entries recorded
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleDownloadLog}>
              {t('imports.downloadReport')}
            </Button>
          </div>
        </div>
      )}

      {/* Confirm Commit Dialog */}
      <ConfirmDialog
        open={commitDialogOpen}
        onClose={() => setCommitDialogOpen(false)}
        onConfirm={() => void handleCommit()}
        title={t('imports.confirmCommit')}
        description={t('imports.confirmCommitDesc')}
        loading={committing}
      />
    </div>
  );
}

export default ImportPage;
