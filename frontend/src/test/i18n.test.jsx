import { describe, expect, test } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { LanguageProvider, useT } from '../i18n';

describe('language switch', () => {
  test('switches to Kannada, fills placeholders, remembers the choice', () => {
    const { result } = renderHook(() => useT(), { wrapper: LanguageProvider });
    expect(result.current.t('nav.hi', { name: 'Sharmi' })).toBe('Hi, Sharmi!');
    act(() => result.current.setLang('kn'));
    expect(result.current.t('nav.hi', { name: 'Sharmi' })).toBe('ನಮಸ್ಕಾರ, Sharmi!');
    expect(document.documentElement.lang).toBe('kn');
    expect(localStorage.getItem('hungrybirds_lang')).toBe('kn');
    expect(result.current.t('register.email.ph')).toBe('you@example.com'); // falls back to English
  });
});
