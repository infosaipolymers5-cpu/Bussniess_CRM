/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
/**
 * Stage 8 Automated Test Suite:
 * PVC Public Presence, Item Search, Brands Directory, Digital Visiting Cards,
 * and Customer Tiller Spares Profiling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  brandRecordFormSchema,
  pvcCategoryFormSchema,
  pvcCatalogueItemFormSchema,
  businessCardFormSchema,
  customerTillerDetailFormSchema,
} from '@/lib/validation';
import {
  buildQuoteWhatsAppUrl,
  fetchPublicVisitingCard,
} from '@/features/digital-cards/api/digitalCardService';
import { createBrand, fetchPublicCardBrands } from '@/features/brands/api/brandService';
import {
  fetchPvcCatalogueItems,
  ensureDefaultPvcCategories,
} from '@/features/pvc-catalogue/api/pvcCatalogueService';
import { fetchCustomersByTillerFilter } from '@/features/tiller-details/api/tillerService';
import { supabase } from '@/lib/supabase';
import type { PublicVisitingCard } from '@/lib/database.types';

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe('Stage 8 — PVC Public Presence & Digital Cards Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. PVC Categories & Coming-Later Constraints', () => {
    it('validates PVC category schema correctly', () => {
      const validCategory = {
        slug: 'pvc_pipes',
        name_en: 'PVC Pipes & Fittings',
        name_mr: 'पीव्हीसी पाईप्स आणि फिटिंग्ज',
        description_en: 'Rigid PVC and casing pipes',
        description_mr: 'कडक पाईप्स',
        sort_order: 1,
        is_coming_later: false,
      };

      const result = pvcCategoryFormSchema.safeParse(validCategory);
      expect(result.success).toBe(true);
    });

    it('enforces Ceramic category as is_coming_later = true in default category list', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [] }),
        }),
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'pvc_categories') {
          return {
            select: mockSelect,
            insert: mockInsert,
          };
        }
        return {};
      });

      const res = await ensureDefaultPvcCategories('biz-pvc-123');
      expect(res.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledTimes(1);

      const inserted = (mockInsert.mock.calls[0]?.[0] || []) as any[];
      const ceramic = inserted.find((c) => c.slug === 'ceramic');
      expect(ceramic).toBeDefined();
      expect(ceramic.is_coming_later).toBe(true);
      expect(ceramic.name_mr).toContain('लवकरच उपलब्ध');
    });
  });

  describe('2. Brand Directory & Logo Permission Guard', () => {
    it('rejects brand form when published to digital card without owner logo permission', () => {
      const invalidBrand = {
        brand_name: 'Finolex Pipes',
        has_logo_permission: false,
        show_on_digital_card: true, // ILLEGAL: Cannot publish without recorded permission
      };

      const result = brandRecordFormSchema.safeParse(invalidBrand);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toMatch(
          /confirm logo permission before publishing/i,
        );
      }
    });

    it('accepts brand form when logo permission is confirmed by owner', () => {
      const validBrand = {
        brand_name: 'Jain Irrigation',
        has_logo_permission: true,
        logo_permission_notes: 'Authorized Dealership Agreement 2026/DL-492',
        show_on_digital_card: true,
      };

      const result = brandRecordFormSchema.safeParse(validBrand);
      expect(result.success).toBe(true);
    });

    it('createBrand rejects digital card publication at API level if permission is missing', async () => {
      const res = await createBrand({
        businessId: 'biz-1',
        brandName: 'Finolex',
        hasLogoPermission: false,
        showOnDigitalCard: true,
      });

      expect(res.data).toBeNull();
      expect(res.error).toMatch(/must confirm and record logo-use permission/i);
    });

    it('queries only brands that have both show_on_digital_card AND has_logo_permission true', async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: [
          {
            id: 'b-1',
            brand_name: 'Finolex',
            has_logo_permission: true,
            show_on_digital_card: true,
          },
        ],
        error: null,
      });

      const mockEqActive = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEqPerm = vi.fn().mockReturnValue({ eq: mockEqActive });
      const mockEqShow = vi.fn().mockReturnValue({ eq: mockEqPerm });
      const mockEqBiz = vi.fn().mockReturnValue({ eq: mockEqShow });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqBiz });

      (supabase.from as any).mockReturnValue({ select: mockSelect });

      const res = await fetchPublicCardBrands('biz-1');
      expect(res.error).toBeNull();
      expect(res.data.length).toBe(1);
      expect(mockEqShow).toHaveBeenCalledWith('show_on_digital_card', true);
      expect(mockEqPerm).toHaveBeenCalledWith('has_logo_permission', true);
    });
  });

  describe('3. Private Item Search (5,000+ Items)', () => {
    it('validates PVC catalogue item schema with integer paise reference rate', () => {
      const validItem = {
        category_id: 'cat-uuid-1',
        item_code: 'PVC-PIPE-63-4K',
        item_name_en: '63mm PVC Pipe 4kg',
        item_name_mr: '६३ मिमी पीव्हीसी पाईप ४ किलो',
        size_dimension: '63mm 4kg',
        unit: 'piece',
        reference_rate_paise: 45000, // 450.00 INR in integer paise
      };

      const result = pvcCatalogueItemFormSchema.safeParse(validItem);
      expect(result.success).toBe(true);
    });

    it('performs multi-field search and paginates items accurately', async () => {
      const mockData = [
        {
          id: 'item-1',
          item_code: 'DRIP-16-40CM',
          item_name_en: '16mm Inline Drip Lateral 40cm',
          item_name_mr: '१६ मिमी इनलाईन ठिबक नळी ४० सेमी',
          size_dimension: '16mm 40cm',
          reference_rate_paise: 125000,
        },
      ];

      const mockRange = vi.fn().mockResolvedValue({ data: mockData, error: null });
      const mockOrder = vi.fn().mockReturnValue({ range: mockRange });
      const mockOrQuery = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEqBiz = vi.fn().mockReturnValue({ or: mockOrQuery });

      const mockCountOr = vi.fn().mockResolvedValue({ count: 5240, error: null });
      const mockCountEq = vi.fn().mockReturnValue({ or: mockCountOr });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'pvc_catalogue_items') {
          return {
            select: vi.fn().mockImplementation((_, opts) => {
              if (opts?.count === 'exact') {
                return { eq: mockCountEq };
              }
              return { eq: mockEqBiz };
            }),
          };
        }
        return {};
      });

      const res = await fetchPvcCatalogueItems({
        businessId: 'biz-1',
        searchTerm: '16mm',
        page: 2,
        pageSize: 20,
      });

      expect(res.error).toBeNull();
      expect(res.data).toBeDefined();
      expect(res.data?.totalCount).toBe(5240);
      expect(res.data?.totalPages).toBe(262);
      expect(res.data?.page).toBe(2);
      expect(mockRange).toHaveBeenCalledWith(20, 39);
    });
  });

  describe('4. Digital Visiting Cards & Public/Private Boundary', () => {
    it('validates business card schema and enforces slug formatting', () => {
      const validCard = {
        card_slug: 'rushi-pvc-irrigation',
        display_name: 'Rushi PVC & Irrigation',
        owner_name: 'Aditya Patil',
        primary_phone: '9876543210',
        whatsapp_number: '9876543210',
        address_line1: 'Near Bus Stand, Market Yard',
        city_or_village: 'Kolhapur',
        services_list: ['PVC Pipes', 'Drip Systems'],
        is_published: true,
      };

      const result = businessCardFormSchema.safeParse(validCard);
      expect(result.success).toBe(true);

      // Rejects invalid slug with spaces or uppercase
      const invalidSlugCard = {
        ...validCard,
        card_slug: 'Rushi PVC Card',
      };
      const invalidResult = businessCardFormSchema.safeParse(invalidSlugCard);
      expect(invalidResult.success).toBe(false);
    });

    it('generates WhatsApp quote deep link with Marathi inquiry message', () => {
      const card: PublicVisitingCard = {
        card_slug: 'rushi-pvc',
        display_name: 'Rushi PVC & Hardware',
        tagline_en: 'Quality irrigation pipes',
        tagline_mr: 'दर्जेदार ठिबक व पाईप्स',
        owner_name: 'Aditya',
        primary_phone: '9876543210',
        whatsapp_number: '9876543210',
        email: null,
        address_line1: 'Market Yard',
        address_line2: null,
        city_or_village: 'Kolhapur',
        pincode: '416001',
        google_maps_url: null,
        services_list: ['Drip Irrigation'],
        theme_color: '#1E40AF',
        brands: [],
      };

      const url = buildQuoteWhatsAppUrl(card, 'ठिबक सिंचन', 'mr');
      expect(url).toContain('https://wa.me/919876543210');
      expect(url).toContain('text=');
      const decoded = decodeURIComponent(url);
      expect(decoded).toContain('Rushi PVC & Hardware');
      expect(decoded).toContain('ठिबक सिंचन');
      expect(decoded).toContain('कोटेशन हवे आहे');
    });

    it('fetches public card via security-definer RPC with zero internal money or customer data', async () => {
      const safePublicPayload: PublicVisitingCard = {
        card_slug: 'rushi-pvc',
        display_name: 'Rushi PVC & Irrigation',
        tagline_en: 'Pipes & Tools',
        tagline_mr: 'पाईप्स आणि फिटिंग्ज',
        owner_name: 'Rushi Owner',
        primary_phone: '9876543210',
        whatsapp_number: '9876543210',
        email: null,
        address_line1: 'Shop 1',
        address_line2: null,
        city_or_village: 'Kolhapur',
        pincode: '416001',
        google_maps_url: 'https://maps.google.com/...',
        services_list: ['PVC Pipes'],
        theme_color: '#1E40AF',
        brands: [
          {
            id: 'b-1',
            brand_name: 'Finolex',
            category_name: 'Pipes',
            logo_url: 'https://.../finolex.png',
            website_url: 'https://finolex.com',
            description_mr: 'अधिकृत वितरक',
            description_en: 'Authorized distributor',
          },
        ],
      };

      (supabase.rpc as any).mockResolvedValue({
        data: safePublicPayload,
        error: null,
      });

      const res = await fetchPublicVisitingCard('rushi-pvc');
      expect(res.error).toBeNull();
      expect(res.data).toEqual(safePublicPayload);

      // Verify that no internal keys exist on public response
      expect((res.data as any).bills).toBeUndefined();
      expect((res.data as any).ledger).toBeUndefined();
      expect((res.data as any).customer_id).toBeUndefined();
      expect((res.data as any).wholesale_cost).toBeUndefined();
      expect((res.data as any).reference_rate_paise).toBeUndefined();
    });
  });

  describe('5. Customer Power-Tiller Profile & Spares Targeting', () => {
    it('validates customer tiller profile schema', () => {
      const validTiller = {
        customer_id: 'cust-uuid-1',
        tiller_brand: 'VST Shakti',
        tiller_model: '130 DI',
        year_of_purchase: 2021,
        hp_rating: 13.0,
        blade_type: 'Standard Curved',
        notes: 'Needs 18-blade rotary pack',
      };

      const result = customerTillerDetailFormSchema.safeParse(validTiller);
      expect(result.success).toBe(true);
    });

    it('queries customer owners filtered by tiller brand/model for spares campaigns', async () => {
      const mockResult = [
        {
          id: 'tiller-row-1',
          tiller_brand: 'VST Shakti',
          tiller_model: '130 DI',
          hp_rating: 13.0,
          customer: {
            id: 'cust-1',
            name: 'Suresh Patil',
            display_phone: '9822001122',
          },
        },
      ];

      const mockIlikeModel = vi.fn().mockResolvedValue({ data: mockResult, error: null });
      const mockIlikeBrand = vi.fn().mockReturnValue({ ilike: mockIlikeModel });
      const mockEqBiz = vi.fn().mockReturnValue({ ilike: mockIlikeBrand });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqBiz });

      (supabase.from as any).mockReturnValue({ select: mockSelect });

      const res = await fetchCustomersByTillerFilter({
        businessId: 'biz-pvc',
        tillerBrand: 'VST Shakti',
        tillerModel: '130 DI',
      });

      expect(res.error).toBeNull();
      expect(res.customers.length).toBe(1);
      expect(res.customers[0]?.name).toBe('Suresh Patil');
      expect(res.customers[0]?.tiller.tiller_model).toBe('130 DI');
      expect(mockIlikeBrand).toHaveBeenCalledWith('tiller_brand', '%VST Shakti%');
      expect(mockIlikeModel).toHaveBeenCalledWith('tiller_model', '%130 DI%');
    });
  });
});
