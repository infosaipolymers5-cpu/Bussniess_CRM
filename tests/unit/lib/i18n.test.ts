import { describe, it, expect } from 'vitest';
import en from '@/lib/i18n/locales/en.json';
import mr from '@/lib/i18n/locales/mr.json';

describe('i18n Localization Integrity', () => {
  it('contains English and Marathi translations for all top-level sections', () => {
    const enKeys = Object.keys(en);
    const mrKeys = Object.keys(mr);

    expect(enKeys).toEqual(mrKeys);
    expect(enKeys).toContain('common');
    expect(enKeys).toContain('auth');
    expect(enKeys).toContain('nav');
    expect(enKeys).toContain('shell');
    expect(enKeys).toContain('dashboard');
    expect(enKeys).toContain('status');
  });

  it('matches common keys between English and Marathi', () => {
    const enCommonKeys = Object.keys(en.common);
    const mrCommonKeys = Object.keys(mr.common);

    expect(enCommonKeys).toEqual(mrCommonKeys);
  });

  it('matches navigation keys between English and Marathi', () => {
    const enNavKeys = Object.keys(en.nav);
    const mrNavKeys = Object.keys(mr.nav);

    expect(enNavKeys).toEqual(mrNavKeys);
  });

  it('matches status keys between English and Marathi', () => {
    const enStatusKeys = Object.keys(en.status);
    const mrStatusKeys = Object.keys(mr.status);

    expect(enStatusKeys).toEqual(mrStatusKeys);
  });
});
