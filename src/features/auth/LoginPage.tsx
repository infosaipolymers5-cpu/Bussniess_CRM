/**
 * LoginPage — Email/password sign-in screen.
 */

import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/app/providers/AuthProvider';
import { Button, Input } from '@/components/ui';
import { LanguageSelector } from '@/components/layout/LanguageSelector';

export function LoginPage() {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from =
    (location.state as { from?: { pathname?: string } })?.from?.pathname ?? '/';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        setError(signInError);
      } else {
        navigate(from, { replace: true });
      }
    } catch {
      setError(t('errors.server'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-slate-50 py-12 sm:px-6 lg:px-8">
      <div className="absolute right-4 top-4">
        <LanguageSelector />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-xl font-bold text-white shadow-md">
          RC
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          {t('common.appName')}
        </h2>
        <p className="mt-1 text-center text-sm text-slate-500">
          {t('auth.signInWithEmail')}
        </p>
      </div>

      <div className="mt-8 px-4 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-card border border-slate-200 bg-white px-6 py-8 shadow-card sm:px-10">
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <Input
              type="email"
              label={t('auth.email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
            />

            <Input
              type="password"
              label={t('auth.password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={loading}
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                className="w-full"
              >
                {t('auth.signIn')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
