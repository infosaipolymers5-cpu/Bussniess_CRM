/**
 * Application Router.
 * Configures public, protected, and stage-deferred routes.
 */

import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/app/route-guards/ProtectedRoute';
import { AccessDenied } from '@/app/route-guards/AccessDenied';
import { AppShell } from '@/components/layout/AppShell';
import { LoginPage } from '@/features/auth';
import { DashboardPage } from '@/features/dashboard';
import { CustomerListPage, CustomerDetailPage } from '@/features/customers';
import { GroupsPage } from '@/features/customer-groups';
import { ImportPage } from '@/features/imports';
import {
  PublicQrRegistrationPage,
  QrRegistrationsListPage,
} from '@/features/qr-registration';
import { BillListPage, BillDetailPage, CreateBillPage } from '@/features/billing';
import { PaymentListPage } from '@/features/payments';
import { KhateUtaraPage } from '@/features/account-statements';
import { ProductListPage } from '@/features/products';
import { SupplierListPage } from '@/features/suppliers';
import {
  PurchaseOrderListPage,
  CreatePurchaseOrderPage,
  PurchaseOrderDetailPage,
} from '@/features/purchase-orders';
import { SupplierAccountPage } from '@/features/supplier-accounts';
import { PurchaseHistoryPage } from '@/features/purchase-history';
import { ExpenseListPage } from '@/features/expenses';
import { ProfitDashboardPage } from '@/features/profitability';
import { PosterGeneratorPage } from '@/features/posters';
import { RemindersPage } from '@/features/reminders';
import { MessagingHubPage } from '@/features/messaging';
import { MaterialAlertsPage } from '@/features/material-alerts';
import { DeliveryTripsPage } from '@/features/delivery-trips';
import { CampaignListPage, CreateCampaignPage } from '@/features/broadcasts';
import { PvcCataloguePage } from '@/features/pvc-catalogue';
import { BrandDirectoryPage } from '@/features/brands';
import { DigitalCardEditorPage, PublicDigitalCardPage } from '@/features/digital-cards';
import { ReportsPage } from '@/features/reports';
import { BackupManagerPage } from '@/features/backups';
import { AuditLogPage } from '@/features/audit';
import { StaffManagementPage } from '@/features/staff';
import { SettingsPage } from '@/features/settings';

function ShellWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}

export const router = createBrowserRouter([
  // Public
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/access-denied',
    element: <AccessDenied />,
  },
  {
    path: '/qr-register',
    element: <PublicQrRegistrationPage />,
  },
  {
    path: '/qr-register/:businessId',
    element: <PublicQrRegistrationPage />,
  },
  {
    path: '/card/:slug',
    element: <PublicDigitalCardPage />,
  },

  // Protected application routes wrapped in AppShell
  {
    path: '/',
    element: (
      <ShellWrapper>
        <DashboardPage />
      </ShellWrapper>
    ),
  },
  {
    path: '/customers',
    element: (
      <ShellWrapper>
        <CustomerListPage />
      </ShellWrapper>
    ),
  },
  {
    path: '/customers/:id',
    element: (
      <ShellWrapper>
        <CustomerDetailPage />
      </ShellWrapper>
    ),
  },
  {
    path: '/groups',
    element: (
      <ShellWrapper>
        <GroupsPage />
      </ShellWrapper>
    ),
  },
  {
    path: '/imports',
    element: (
      <ShellWrapper>
        <ImportPage />
      </ShellWrapper>
    ),
  },
  {
    path: '/qr-registrations',
    element: (
      <ShellWrapper>
        <QrRegistrationsListPage />
      </ShellWrapper>
    ),
  },
  {
    path: '/bills',
    element: (
      <ShellWrapper>
        <BillListPage />
      </ShellWrapper>
    ),
  },
  {
    path: '/bills/new',
    element: (
      <ShellWrapper>
        <CreateBillPage />
      </ShellWrapper>
    ),
  },
  {
    path: '/bills/:id',
    element: (
      <ShellWrapper>
        <BillDetailPage />
      </ShellWrapper>
    ),
  },
  {
    path: '/payments',
    element: (
      <ShellWrapper>
        <PaymentListPage />
      </ShellWrapper>
    ),
  },
  {
    path: '/khate-utara',
    element: (
      <ShellWrapper>
        <KhateUtaraPage />
      </ShellWrapper>
    ),
  },
  {
    path: '/products',
    element: (
      <ShellWrapper>
        <ProductListPage />
      </ShellWrapper>
    ),
  },
  {
    path: '/reminders',
    element: (
      <ShellWrapper>
        <RemindersPage />
      </ShellWrapper>
    ),
  },
  {
    path: '/messages',
    element: (
      <ShellWrapper>
        <MessagingHubPage />
      </ShellWrapper>
    ),
  },
  {
    path: '/material-alerts',
    element: (
      <ShellWrapper>
        <MaterialAlertsPage />
      </ShellWrapper>
    ),
  },
  {
    path: '/campaigns',
    element: (
      <ShellWrapper>
        <CampaignListPage />
      </ShellWrapper>
    ),
  },
  {
    path: '/campaigns/new',
    element: (
      <ShellWrapper>
        <CreateCampaignPage />
      </ShellWrapper>
    ),
  },
  {
    path: '/suppliers',
    element: (
      <ShellWrapper>
        <SupplierListPage />
      </ShellWrapper>
    ),
  },
  {
    path: '/purchase-orders',
    element: (
      <ShellWrapper>
        <PurchaseOrderListPage />
      </ShellWrapper>
    ),
  },
  {
    path: '/purchase-orders/new',
    element: (
      <ShellWrapper>
        <CreatePurchaseOrderPage />
      </ShellWrapper>
    ),
  },
  {
    path: '/purchase-orders/:id',
    element: (
      <ShellWrapper>
        <PurchaseOrderDetailPage />
      </ShellWrapper>
    ),
  },
  {
    path: '/supplier-accounts',
    element: (
      <ShellWrapper>
        <SupplierAccountPage />
      </ShellWrapper>
    ),
  },
  {
    path: '/purchase-history',
    element: (
      <ShellWrapper>
        <PurchaseHistoryPage />
      </ShellWrapper>
    ),
  },
  {
    path: '/expenses',
    element: (
      <ShellWrapper>
        <ExpenseListPage />
      </ShellWrapper>
    ),
  },
  {
    path: '/profit-dashboard',
    element: (
      <ShellWrapper>
        <ProfitDashboardPage />
      </ShellWrapper>
    ),
  },
  {
    path: '/item-search',
    element: (
      <ShellWrapper>
        <PvcCataloguePage />
      </ShellWrapper>
    ),
  },
  {
    path: '/pvc-catalogue',
    element: (
      <ShellWrapper>
        <PvcCataloguePage />
      </ShellWrapper>
    ),
  },
  {
    path: '/posters',
    element: (
      <ShellWrapper>
        <PosterGeneratorPage />
      </ShellWrapper>
    ),
  },
  {
    path: '/digital-cards',
    element: (
      <ShellWrapper>
        <DigitalCardEditorPage />
      </ShellWrapper>
    ),
  },
  {
    path: '/brands',
    element: (
      <ShellWrapper>
        <BrandDirectoryPage />
      </ShellWrapper>
    ),
  },
  {
    path: '/delivery-trips',
    element: (
      <ShellWrapper>
        <DeliveryTripsPage />
      </ShellWrapper>
    ),
  },
  {
    path: '/reports',
    element: (
      <ShellWrapper>
        <ReportsPage />
      </ShellWrapper>
    ),
  },
  {
    path: '/backups',
    element: (
      <ShellWrapper>
        <BackupManagerPage />
      </ShellWrapper>
    ),
  },
  {
    path: '/audit',
    element: (
      <ShellWrapper>
        <AuditLogPage />
      </ShellWrapper>
    ),
  },
  {
    path: '/staff',
    element: (
      <ShellWrapper>
        <StaffManagementPage />
      </ShellWrapper>
    ),
  },
  {
    path: '/settings',
    element: (
      <ShellWrapper>
        <SettingsPage />
      </ShellWrapper>
    ),
  },

  // Fallback
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
