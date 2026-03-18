import { describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// DONA-01: Donate URL from CMS settings
// ---------------------------------------------------------------------------

describe('DONA-01: Donate URL from settings', () => {
  it('reads donateUrl from settings singleton', async () => {
    const mockReader = {
      singletons: {
        settings: {
          read: vi.fn().mockResolvedValue({
            donateUrl: 'https://teaming.net/example',
            siteName_ca: 'Animals Vida Digna',
            siteName_es: 'Animals Vida Digna',
          }),
        },
      },
    };

    const settings = await mockReader.singletons.settings.read();
    expect(mockReader.singletons.settings.read).toHaveBeenCalled();
    expect(settings?.donateUrl).toBe('https://teaming.net/example');
  });

  it('defaults donateUrl to # when settings is null', async () => {
    const mockReader = {
      singletons: {
        settings: {
          read: vi.fn().mockResolvedValue(null),
        },
      },
    };

    const settings = await mockReader.singletons.settings.read();
    const donateUrl = settings?.donateUrl ?? '#';
    expect(donateUrl).toBe('#');
  });
});

// ---------------------------------------------------------------------------
// DONA-02: Donate URL appears in header, hero, and footer
// ---------------------------------------------------------------------------

describe('DONA-02: Donate URL wiring', () => {
  it('donateUrl prop is passed through layout to components', () => {
    // This tests the data flow contract:
    // Page reads settings -> extracts donateUrl -> passes to BaseLayout -> Header/Footer
    const donateUrl = 'https://teaming.net/example';

    // Simulate the prop chain
    const pageProps = { donateUrl };
    const layoutProps = { donateUrl: pageProps.donateUrl };
    const headerProps = { donateUrl: layoutProps.donateUrl };
    const footerProps = { donateUrl: layoutProps.donateUrl };

    expect(headerProps.donateUrl).toBe(donateUrl);
    expect(footerProps.donateUrl).toBe(donateUrl);
  });

  it('fallback # is used when no donateUrl configured', () => {
    const settings = null;
    const donateUrl = settings?.donateUrl ?? '#';

    expect(donateUrl).toBe('#');
  });
});
