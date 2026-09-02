import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkRateLimit } from '../src/lib/rate-limit';

function makeRequest(ip = '203.0.113.7'): Request {
  return new Request('https://animalsvidadigna.org/api/contact', {
    method: 'POST',
    headers: { 'cf-connecting-ip': ip },
  });
}

describe('checkRateLimit', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('allows the request when the limiter is present and under the limit', async () => {
    const limit = vi.fn().mockResolvedValue({ success: true });
    const locals = { runtime: { env: { FORM_RATE_LIMITER: { limit } } } };

    const decision = await checkRateLimit({ locals, request: makeRequest() });

    expect(decision).toEqual({ allowed: true });
    expect(limit).toHaveBeenCalledWith({ key: '203.0.113.7' });
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('returns a 429 decision when the limiter is present and over the limit', async () => {
    const limit = vi.fn().mockResolvedValue({ success: false });
    const locals = { runtime: { env: { FORM_RATE_LIMITER: { limit } } } };

    const decision = await checkRateLimit({ locals, request: makeRequest() });

    expect(decision).toEqual({ allowed: false, status: 429 });
  });

  it('falls back to "unknown" as the rate-limit key when cf-connecting-ip is absent', async () => {
    const limit = vi.fn().mockResolvedValue({ success: true });
    const locals = { runtime: { env: { FORM_RATE_LIMITER: { limit } } } };
    const request = new Request('https://animalsvidadigna.org/api/contact', {
      method: 'POST',
    });

    await checkRateLimit({ locals, request });

    expect(limit).toHaveBeenCalledWith({ key: 'unknown' });
  });

  it('fails open and logs an explicit warning when the binding is absent (e.g. local astro dev)', async () => {
    const decision = await checkRateLimit({
      locals: {},
      request: makeRequest(),
    });

    expect(decision).toEqual({ allowed: true });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('FORM_RATE_LIMITER');
  });

  it('fails open and logs an explicit warning when locals.runtime is missing entirely', async () => {
    const decision = await checkRateLimit({
      locals: undefined,
      request: makeRequest(),
    });

    expect(decision).toEqual({ allowed: true });
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('fails open but logs an error when limit() throws', async () => {
    const limit = vi.fn().mockRejectedValue(new Error('boom'));
    const locals = { runtime: { env: { FORM_RATE_LIMITER: { limit } } } };

    const decision = await checkRateLimit({ locals, request: makeRequest() });

    expect(decision).toEqual({ allowed: true });
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0][0]).toContain('FORM_RATE_LIMITER');
    expect(errorSpy.mock.calls[0][1]).toBeInstanceOf(Error);
  });

  it('supports a custom binding name', async () => {
    const limit = vi.fn().mockResolvedValue({ success: true });
    const locals = { runtime: { env: { OTHER_LIMITER: { limit } } } };

    const decision = await checkRateLimit(
      { locals, request: makeRequest() },
      'OTHER_LIMITER'
    );

    expect(decision).toEqual({ allowed: true });
    expect(limit).toHaveBeenCalled();
  });
});
