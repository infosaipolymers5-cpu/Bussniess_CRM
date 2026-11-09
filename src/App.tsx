/**
 * App — Root application component wrapping all context providers.
 */

import { RouterProvider } from 'react-router-dom';
import { router } from '@/app/router';
import {
  AuthProvider,
  BusinessProvider,
  QueryProvider,
  ConnectionProvider,
  LocaleProvider,
} from '@/app/providers';
import { ToastProvider } from '@/components/ui';

export function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <BusinessProvider>
          <ConnectionProvider>
            <LocaleProvider>
              <ToastProvider>
                <RouterProvider router={router} />
              </ToastProvider>
            </LocaleProvider>
          </ConnectionProvider>
        </BusinessProvider>
      </AuthProvider>
    </QueryProvider>
  );
}

export default App;
