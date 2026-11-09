/**
 * Client-side Zod validation schemas and normalization helpers.
 * These provide early feedback only — ALL authority validation is server-side.
 */

import { z } from 'zod';

/** Normalize Indian mobile phone number to standard 10 digits */
export function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}

/** Check if phone is valid 10-digit Indian mobile */
export function isValidIndianMobile(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);
  return /^[6-9]\d{9}$/.test(normalized);
}

/** Email validation */
export const emailSchema = z.string().email('Invalid email address').min(1);

/** Password validation */
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');

/** Indian phone number (10 digits, starts with 6-9) */
export const indianMobileSchema = z
  .string()
  .min(10, 'Phone number must be at least 10 digits')
  .refine((val) => isValidIndianMobile(val), {
    message: 'Must be a valid 10-digit Indian mobile number',
  });

/** Business name */
export const businessNameSchema = z.string().min(1, 'Business name is required').max(200);

/** Money amount in paise — must be positive integer */
export const paiseSchema = z
  .number()
  .int('Amount must be a whole number of paise')
  .positive('Amount must be positive');

/** Generic non-empty string */
export const requiredString = z.string().min(1, 'This field is required');

/** Standard Customer Creation / Edit Schema */
export const customerFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  phone: indianMobileSchema,
  dateOfBirth: z.string().optional().nullable(),
  area: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  groupIds: z.array(z.string().uuid()).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
});

export type CustomerFormData = z.infer<typeof customerFormSchema>;

/** PVC Quick-Add Schema (Three-field speed path: Name, Phone, DOB) */
export const pvcQuickAddSchema = z.object({
  name: z.string().trim().min(1, 'Customer name is required').max(200),
  phone: indianMobileSchema,
  dateOfBirth: z
    .string()
    .min(1, 'Date of birth is required for PVC registration')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'DOB must be in YYYY-MM-DD format'),
  area: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export type PvcQuickAddFormData = z.infer<typeof pvcQuickAddSchema>;

/** Call Note Schema */
export const customerNoteSchema = z.object({
  content: z.string().trim().min(1, 'Note content cannot be empty').max(2000),
  callDate: z.string().optional(),
  promiseToPayDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional()
    .nullable(),
});

export type CustomerNoteFormData = z.infer<typeof customerNoteSchema>;

/** Customer Group Schema */
export const customerGroupSchema = z.object({
  name: z.string().trim().min(1, 'Group name is required').max(100),
  description: z.string().trim().max(500).optional().nullable(),
});

export type CustomerGroupFormData = z.infer<typeof customerGroupSchema>;

/** Customer Tag Schema */
export const customerTagSchema = z.object({
  name: z.string().trim().min(1, 'Tag name is required').max(50),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color')
    .default('#3b82f6'),
});

export type CustomerTagFormData = z.infer<typeof customerTagSchema>;

/** Public QR Registration Schema */
export const publicQrRegistrationSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  whatsappPhone: indianMobileSchema,
  dateOfBirth: z
    .string()
    .min(1, 'Date of birth is required')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'DOB must be in YYYY-MM-DD format'),
  categoryInterest: z.string().trim().max(100).optional().nullable(),
  consentRecorded: z.literal(true, {
    errorMap: () => ({ message: 'You must provide consent to be contacted' }),
  }),
});

export type PublicQrRegistrationFormData = z.infer<typeof publicQrRegistrationSchema>;

/** CSV/Excel Import Row Schema */
export const importRowSchema = z.object({
  name: z.string().trim().min(1, 'Customer name is required'),
  phone: indianMobileSchema,
  dateOfBirth: z.string().optional().nullable(),
  area: z.string().optional().nullable(),
  openingBalanceRupees: z
    .number()
    .min(0, 'Opening balance cannot be negative')
    .default(0),
  businessType: z.enum(['cattle_feed', 'pvc']).default('cattle_feed'),
});

export type ImportRowData = z.infer<typeof importRowSchema>;

/** Stage 3 Customer Financial Schemas */

/** Product Form Schema */
export const productFormSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required').max(200),
  code: z.string().trim().max(50).optional().nullable(),
  unit: z.enum(['bag', 'kg', 'quintal', 'unit', 'other']),
  defaultPriceRupees: z.number().min(0, 'Default price cannot be negative'),
  isActive: z.boolean().default(true),
});

export type ProductFormData = z.infer<typeof productFormSchema>;

/** Customer Rate Schema */
export const customerRateSchema = z.object({
  productId: z.string().uuid('Valid product ID required'),
  specialPriceRupees: z.number().min(0, 'Special price cannot be negative'),
  notes: z.string().trim().max(500).optional().nullable(),
});

export type CustomerRateFormData = z.infer<typeof customerRateSchema>;

/** Bill Item Schema */
export const billItemFormSchema = z.object({
  productId: z.string().optional().nullable(),
  productName: z.string().trim().min(1, 'Item name is required').max(200),
  unit: z.string().default('bag'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unitPriceRupees: z.number().min(0, 'Unit price cannot be negative'),
});

export type BillItemFormData = z.infer<typeof billItemFormSchema>;

/** Bill Form Schema */
export const billFormSchema = z.object({
  customerId: z.string().min(1, 'Customer selection is required'),
  billDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Bill date must be in YYYY-MM-DD format'),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be in YYYY-MM-DD format')
    .optional()
    .nullable(),
  items: z.array(billItemFormSchema).min(1, 'At least one line item is required'),
  discountRupees: z.number().min(0, 'Discount cannot be negative').default(0),
  paidNowRupees: z.number().min(0, 'Paid now amount cannot be negative').default(0),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export type BillFormData = z.infer<typeof billFormSchema>;

/** Bill Cancellation Schema */
export const billCancellationSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, 'Cancellation reason must be at least 3 characters')
    .max(500),
});

export type BillCancellationFormData = z.infer<typeof billCancellationSchema>;

/** Payment Form Schema */
export const paymentFormSchema = z.object({
  customerId: z.string().min(1, 'Customer selection is required'),
  amountRupees: z.number().positive('Payment amount must be greater than 0'),
  paymentMethod: z.enum(['cash', 'upi', 'bank_transfer', 'cheque', 'other']),
  paymentDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Payment date must be in YYYY-MM-DD format'),
  referenceDetails: z.string().trim().max(200).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export type PaymentFormData = z.infer<typeof paymentFormSchema>;

/** Khate Utara Filter Schema */
export const khateUtaraFilterSchema = z.object({
  customerId: z.string().min(1, 'Customer selection is required'),
  fromDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'From date must be in YYYY-MM-DD format'),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'To date must be in YYYY-MM-DD format'),
});

export type KhateUtaraFilterFormData = z.infer<typeof khateUtaraFilterSchema>;

/** Stage 4 Supplier & Cost Schemas */

/** Supplier Form Schema */
export const supplierFormSchema = z.object({
  name: z.string().trim().min(1, 'Supplier name is required').max(200),
  phone: z
    .string()
    .trim()
    .refine((val) => !val || isValidIndianMobile(val), {
      message: 'Must be a valid 10-digit Indian mobile number',
    })
    .optional()
    .nullable(),
  address: z.string().trim().max(500).optional().nullable(),
  gstin: z
    .string()
    .trim()
    .regex(
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
      'Invalid GSTIN format',
    )
    .optional()
    .nullable()
    .or(z.literal('')),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export type SupplierFormData = z.infer<typeof supplierFormSchema>;

/** Supplier Opening Balance Schema */
export const supplierOpeningBalanceSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  financialYear: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Financial year format must be YYYY-YY'),
  amountRupees: z.number().min(0, 'Amount cannot be negative'),
  notes: z.string().trim().max(500).optional().nullable(),
});

export type SupplierOpeningBalanceFormData = z.infer<typeof supplierOpeningBalanceSchema>;

/** Purchase Order Item Schema */
export const purchaseOrderItemFormSchema = z.object({
  productId: z.string().optional().nullable(),
  productName: z.string().trim().min(1, 'Product name is required'),
  customerId: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  quantityBags: z.number().int().positive('Quantity must be at least 1 bag'),
  unitRateRupees: z.number().min(0, 'Rate cannot be negative'),
});

export type PurchaseOrderItemFormData = z.infer<typeof purchaseOrderItemFormSchema>;

/** Purchase Load Cost Schema */
export const purchaseLoadCostFormSchema = z.object({
  description: z.string().trim().min(1, 'Description is required').max(200),
  amountRupees: z.number().positive('Load cost amount must be greater than 0'),
  allocationMethod: z.enum(['by_bags', 'by_value']).default('by_bags'),
});

export type PurchaseLoadCostFormData = z.infer<typeof purchaseLoadCostFormSchema>;

/** Purchase Order Form Schema */
export const purchaseOrderFormSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  orderDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Order date must be YYYY-MM-DD'),
  expectedDeliveryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected delivery date must be YYYY-MM-DD')
    .optional()
    .nullable()
    .or(z.literal('')),
  items: z
    .array(purchaseOrderItemFormSchema)
    .min(1, 'At least one line item is required'),
  loadCosts: z.array(purchaseLoadCostFormSchema).default([]),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export type PurchaseOrderFormData = z.infer<typeof purchaseOrderFormSchema>;

/** Supplier Payment Form Schema */
export const supplierPaymentFormSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  amountRupees: z.number().positive('Payment amount must be greater than 0'),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Payment date must be YYYY-MM-DD'),
  paymentMode: z.string().trim().min(1, 'Payment mode is required'),
  referenceNumber: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export type SupplierPaymentFormData = z.infer<typeof supplierPaymentFormSchema>;

/** Supplier Statement Filter Schema */
export const supplierStatementFilterSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  fromDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'From date must be in YYYY-MM-DD format')
    .optional(),
  toDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'To date must be in YYYY-MM-DD format')
    .optional(),
});

export type SupplierStatementFilterFormData = z.infer<
  typeof supplierStatementFilterSchema
>;

/** Stage 5 Profit & Expense Schemas */

/** Expense Category Schema */
export const expenseCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(100),
  code: z.string().trim().max(20).optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
});

export type ExpenseCategoryFormData = z.infer<typeof expenseCategorySchema>;

/** Expense Form Schema */
export const expenseFormSchema = z.object({
  categoryId: z.string().min(1, 'Category selection is required'),
  amountRupees: z.number().positive('Expense amount must be greater than 0'),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  paymentMode: z.string().trim().min(1, 'Payment mode is required'),
  referenceNumber: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  customerId: z.string().optional().nullable(),
  loadReference: z.string().trim().max(100).optional().nullable(),
  isLoadAllocated: z.boolean().default(false),
});

export type ExpenseFormData = z.infer<typeof expenseFormSchema>;

/** Profit Filter Schema */
export const profitFilterSchema = z.object({
  fromDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'From date must be YYYY-MM-DD')
    .optional()
    .nullable(),
  toDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'To date must be YYYY-MM-DD')
    .optional()
    .nullable(),
});

export type ProfitFilterFormData = z.infer<typeof profitFilterSchema>;

/** Owner PIN Verification Schema */
export const ownerPinSchema = z.object({
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4 to 6 digits'),
});

export type OwnerPinFormData = z.infer<typeof ownerPinSchema>;

/** Stage 7 Communication & Automation Schemas */

export const reminderRuleFormSchema = z.object({
  intervalDays: z
    .number()
    .int()
    .min(1, 'Interval must be at least 1 day')
    .max(90, 'Interval cannot exceed 90 days')
    .default(7),
  promiseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Promise date must be YYYY-MM-DD')
    .optional()
    .nullable(),
  isSuppressed: z.boolean().default(false),
  suppressionReason: z.string().trim().max(300).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export type ReminderRuleFormData = z.infer<typeof reminderRuleFormSchema>;

export const campaignFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Campaign title must be at least 3 characters')
    .max(150),
  campaignType: z.enum(['festival', 'cattle_feed_launch', 'pvc_promo', 'custom']),
  targetAudienceType: z.enum(['all_active', 'group', 'area', 'selected_ids']),
  targetGroupId: z.string().optional().nullable(),
  targetArea: z.string().trim().max(100).optional().nullable(),
  messageTemplate: z.string().trim().min(5, 'Message text is required').max(1000),
});

export type CampaignFormData = z.infer<typeof campaignFormSchema>;

export const deliveryTripFormSchema = z.object({
  tripNumber: z.string().trim().min(1, 'Trip number is required').max(50),
  tripDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  driverName: z.string().trim().max(100).optional().nullable(),
  vehicleNumber: z.string().trim().max(50).optional().nullable(),
  area: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export type DeliveryTripFormData = z.infer<typeof deliveryTripFormSchema>;

export const deliveryTripStopFormSchema = z.object({
  customerId: z.string().min(1, 'Customer selection is required'),
  loadDescription: z.string().trim().min(1, 'Load description is required').max(300),
  bagCount: z.number().int().min(0).default(0),
});

export type DeliveryTripStopFormData = z.infer<typeof deliveryTripStopFormSchema>;

export const messageModeSettingsSchema = z.object({
  paymentRemindersMode: z
    .enum(['manual_handoff', 'official_api'])
    .default('manual_handoff'),
  birthdaysMode: z.enum(['manual_handoff', 'official_api']).default('manual_handoff'),
  festivalWishesMode: z
    .enum(['manual_handoff', 'official_api'])
    .default('manual_handoff'),
  deliveryAnnouncementsMode: z
    .enum(['manual_handoff', 'official_api'])
    .default('manual_handoff'),
  customCampaignsMode: z
    .enum(['manual_handoff', 'official_api'])
    .default('manual_handoff'),
  defaultPaymentReminderIntervalDays: z.number().int().min(1).max(90).default(7),
  materialAlertDaysBefore: z.number().int().min(1).max(30).default(5),
  officialApiEnabled: z.boolean().default(false),
});

export type MessageModeSettingsFormData = z.infer<typeof messageModeSettingsSchema>;

// Stage 8: PVC Categories, Brands, Catalogue, Digital Visiting Cards & Tiller Profiles

export const pvcCategoryFormSchema = z.object({
  slug: z.string().min(2, 'Slug must be at least 2 characters'),
  name_en: z.string().min(2, 'English name is required'),
  name_mr: z.string().min(2, 'Marathi name is required'),
  description_en: z.string().optional().nullable(),
  description_mr: z.string().optional().nullable(),
  icon_name: z.string().optional().nullable(),
  sort_order: z.number().int().default(0),
  is_coming_later: z.boolean().default(false),
});

export type PvcCategoryFormData = z.infer<typeof pvcCategoryFormSchema>;

export const brandRecordFormSchema = z
  .object({
    brand_name: z.string().min(2, 'Brand name must be at least 2 characters'),
    category_id: z.string().optional().nullable(),
    category_name: z.string().optional().nullable(),
    description_en: z.string().optional().nullable(),
    description_mr: z.string().optional().nullable(),
    logo_url: z.string().optional().nullable(),
    website_url: z.string().optional().nullable(),
    has_logo_permission: z.boolean().default(false),
    logo_permission_notes: z.string().optional().nullable(),
    show_on_digital_card: z.boolean().default(false),
  })
  .refine((data) => !data.show_on_digital_card || data.has_logo_permission, {
    message: 'Owner must confirm logo permission before publishing brand to digital card',
    path: ['has_logo_permission'],
  });

export type BrandRecordFormData = z.infer<typeof brandRecordFormSchema>;

export const pvcCatalogueItemFormSchema = z.object({
  category_id: z.string().min(1, 'Category is required'),
  brand_id: z.string().optional().nullable(),
  item_code: z.string().min(1, 'Item code is required'),
  item_name_en: z.string().min(2, 'English name is required'),
  item_name_mr: z.string().min(2, 'Marathi name is required'),
  size_dimension: z.string().optional().nullable(),
  unit: z.string().default('piece'),
  reference_rate_paise: z.number().int().nonnegative().optional().nullable(),
  specifications: z.record(z.unknown()).default({}),
});

export type PvcCatalogueItemFormData = z.infer<typeof pvcCatalogueItemFormSchema>;

export const businessCardFormSchema = z.object({
  card_slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .regex(
      /^[a-z0-9-]+$/,
      'Slug must only contain lowercase alphanumeric characters and hyphens',
    ),
  display_name: z.string().min(2, 'Display name is required'),
  tagline_en: z.string().optional().nullable(),
  tagline_mr: z.string().optional().nullable(),
  owner_name: z.string().min(2, 'Owner name is required'),
  primary_phone: indianMobileSchema,
  whatsapp_number: indianMobileSchema,
  email: z
    .string()
    .email('Invalid email address')
    .optional()
    .nullable()
    .or(z.literal('')),
  address_line1: z.string().min(3, 'Address line 1 is required'),
  address_line2: z.string().optional().nullable(),
  city_or_village: z.string().min(2, 'City / Village is required'),
  pincode: z
    .string()
    .regex(/^\d{6}$/, 'Pincode must be 6 digits')
    .optional()
    .nullable()
    .or(z.literal('')),
  google_maps_url: z.string().url('Invalid URL').optional().nullable().or(z.literal('')),
  services_list: z.array(z.string()).default([]),
  featured_brand_ids: z.array(z.string()).default([]),
  theme_color: z.string().default('#1E40AF'),
  is_published: z.boolean().default(true),
});

export type BusinessCardFormData = z.infer<typeof businessCardFormSchema>;

export const customerTillerDetailFormSchema = z.object({
  customer_id: z.string().min(1, 'Customer is required'),
  tiller_brand: z.string().min(1, 'Brand is required'),
  tiller_model: z.string().min(1, 'Model is required'),
  year_of_purchase: z.number().int().min(1980).max(2035).optional().nullable(),
  hp_rating: z.number().positive().optional().nullable(),
  blade_type: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type CustomerTillerDetailFormData = z.infer<typeof customerTillerDetailFormSchema>;

/** Stage 9 Operations, Reports & System Administration Schemas */

export const businessSettingsFormSchema = z.object({
  upi_id: z.string().optional().nullable().or(z.literal('')),
  bank_name: z.string().optional().nullable().or(z.literal('')),
  bank_account_no: z.string().optional().nullable().or(z.literal('')),
  bank_ifsc: z
    .string()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'IFSC code must be valid (e.g. SBIN0001234)')
    .optional()
    .nullable()
    .or(z.literal('')),
  invoice_footer_notes_en: z.string().optional().nullable().or(z.literal('')),
  invoice_footer_notes_mr: z.string().optional().nullable().or(z.literal('')),
  default_payment_reminder_days: z
    .number()
    .int()
    .min(1, 'Reminder days must be between 1 and 90')
    .max(90, 'Reminder days must be between 1 and 90')
    .default(7),
  default_feed_finish_buffer_days: z
    .number()
    .int()
    .min(1, 'Feed buffer days must be between 1 and 30')
    .max(30, 'Feed buffer days must be between 1 and 30')
    .default(5),
  automatic_messaging_enabled: z.boolean().default(false),
  messaging_provider_config: z.record(z.unknown()).default({}),
});

export type BusinessSettingsFormData = z.infer<typeof businessSettingsFormSchema>;

export const staffInviteFormSchema = z.object({
  email: z.string().email('Valid email address is required'),
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  role: z.enum(['owner', 'staff'], {
    errorMap: () => ({ message: 'Role must be either Owner or Staff' }),
  }),
});

export type StaffInviteFormData = z.infer<typeof staffInviteFormSchema>;

export const backupArtifactCreateSchema = z.object({
  artifact_location: z.string().min(1, 'Artifact location is required'),
  checksum_sha256: z
    .string()
    .regex(
      /^[a-fA-F0-9]{64}$/,
      'Checksum must be a valid 64-character SHA-256 hexadecimal string',
    ),
  database_table_counts: z.record(z.number().int().nonnegative()).default({}),
  object_counts: z.record(z.number().int().nonnegative()).default({}),
  is_encrypted: z.boolean().default(true),
  retention_class: z.enum(['daily', 'monthly', 'manual']),
  size_bytes: z.number().int().nonnegative().default(0),
});

export type BackupArtifactCreateData = z.infer<typeof backupArtifactCreateSchema>;

export const restoreRunCreateSchema = z.object({
  backup_artifact_id: z.string().min(1, 'Backup artifact ID is required'),
  target_environment: z.string().default('isolated_sandbox'),
  notes: z.string().optional().nullable().or(z.literal('')),
});

export type RestoreRunCreateData = z.infer<typeof restoreRunCreateSchema>;

export const reportFilterSchema = z.object({
  export_type: z.enum([
    'sales_collections',
    'overdue_debtors',
    'profit_margin',
    'tax_summary',
  ]),
  scope: z.enum(['cattle_feed', 'pvc', 'combined']),
  date_range_start: z.string().min(10, 'Start date is required'),
  date_range_end: z.string().min(10, 'End date is required'),
  file_format: z.enum(['csv', 'pdf', 'xlsx']).default('csv'),
});

export type ReportFilterData = z.infer<typeof reportFilterSchema>;
