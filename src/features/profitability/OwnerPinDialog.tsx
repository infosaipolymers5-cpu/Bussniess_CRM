/**
 * OwnerPinDialog — Security PIN gate to view sensitive profit metrics.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, Button, Input } from '@/components/ui';
import { verifyOwnerPin, setOwnerPin } from './api/profitabilityService';

interface OwnerPinDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  isSettingNewPin?: boolean;
  onSuccess: () => void;
}

export function OwnerPinDialog({
  open,
  onClose,
  businessId,
  isSettingNewPin = false,
  onSuccess,
}: OwnerPinDialogProps) {
  const { t } = useTranslation();

  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!/^\d{4,6}$/.test(pin)) {
      setError(t('profitability.pinPlaceholder'));
      return;
    }

    setVerifying(true);
    try {
      if (isSettingNewPin) {
        await setOwnerPin(businessId, pin);
        onSuccess();
        onClose();
      } else {
        const valid = await verifyOwnerPin(businessId, pin);
        if (valid) {
          onSuccess();
          onClose();
        } else {
          setError(t('profitability.invalidPin'));
        }
      }
    } catch {
      setError(t('profitability.invalidPin'));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isSettingNewPin ? 'Set Owner PIN' : t('profitability.pinPrompt')}
    >
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="space-y-4"
      >
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <Input
          label="Security PIN (4-6 digits)"
          type="password"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          placeholder="••••"
          required
          autoFocus
        />

        <div className="flex justify-end space-x-2 pt-2">
          <Button
            variant="secondary"
            type="button"
            onClick={onClose}
            disabled={verifying}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={verifying}>
            {verifying
              ? 'Verifying...'
              : isSettingNewPin
                ? 'Save PIN'
                : t('profitability.unlock')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
