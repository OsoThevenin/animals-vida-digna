// @vitest-environment jsdom
/**
 * Interaction tests for `src/components/image-manager.tsx`'s three
 * documented async seams. The pure helpers each seam delegates to
 * (`ordersDiffer`, `resolveCoverResponse`, the `onUploading` progress
 * hook inside `processUploadFile`) are already unit-tested in
 * `tests/image-manager-helpers.test.ts` — nothing here re-tests them.
 * What has never been tested is that the component is *wired* to them
 * correctly: real clicks, real awaited state updates, real races.
 */

import type { CatImage } from '@avd/content/cats';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ImageManager from '@/components/image-manager';

const updateAction = vi.fn();
const setCoverAction = vi.fn();
const removeAction = vi.fn();
const uploadAction = vi.fn();

vi.mock('astro:actions', () => ({
  actions: {
    images: {
      update: (...args: unknown[]) => updateAction(...args),
      setCover: (...args: unknown[]) => setCoverAction(...args),
      remove: (...args: unknown[]) => removeAction(...args),
      upload: (...args: unknown[]) => uploadAction(...args),
    },
  },
}));

const compressAction = vi.fn();
vi.mock('browser-image-compression', () => ({
  default: (...args: unknown[]) => compressAction(...args),
}));

/** A promise plus its resolve/reject, for controlling async timing by hand. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makeImage(overrides: Partial<CatImage>): CatImage {
  return {
    id: 'img-a',
    catId: 'cat-1',
    r2Key: 'cats/cat-1/img-a.webp',
    altCa: 'Bola',
    altEs: 'Bola',
    width: 800,
    height: 600,
    position: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as CatImage;
}

const imageA = makeImage({ id: 'img-a', altCa: 'Bola', position: 0 });
const imageB = makeImage({ id: 'img-b', altCa: 'Micu', position: 1 });

beforeEach(() => {
  updateAction.mockReset();
  setCoverAction.mockReset();
  removeAction.mockReset();
  uploadAction.mockReset();
  compressAction.mockReset();
  // jsdom does not implement createImageBitmap.
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => ({
      width: 800,
      height: 600,
      close: vi.fn(),
    }))
  );
});

describe('saveOrderAndAlts (stale-save detection)', () => {
  it('warns instead of claiming success when the order changed while the save was in flight', async () => {
    const user = userEvent.setup();
    const update = deferred<{ data?: unknown; error?: unknown }>();
    updateAction.mockReturnValue(update.promise);

    render(
      <ImageManager
        catId="cat-1"
        coverImageId={null}
        images={[imageA, imageB]}
      />
    );

    await user.click(
      screen.getByRole('button', {
        name: "Desa l'ordre i els textos alternatius",
      })
    );
    expect(updateAction).toHaveBeenCalledTimes(1);

    // While the save is still in flight, the volunteer keeps interacting:
    // reorders ("Mou … amunt" — array order only, `moveImage` never
    // restamps each image's `.position`, so this alone would not make
    // `ordersDiffer` see a difference: it compares by id, not array
    // order) AND re-edits an alt-text field, which the component's own
    // docstring on `saveOrderAndAlts` names as an equally valid trigger
    // for the stale-save warning ("reordered or re-edited alt text while
    // a save was in flight"). The edit is what `ordersDiffer` actually
    // detects here.
    await user.click(screen.getByRole('button', { name: 'Mou "Micu" amunt' }));
    const altInput = screen.getByDisplayValue('Micu');
    await user.clear(altInput);
    await user.type(altInput, 'Micu editat');

    update.resolve({ data: { ok: true }, error: undefined });

    await waitFor(() => {
      expect(
        screen.getByText(
          "S'ha desat una versió anterior: hi ha canvis nous. Torna a prémer «Desa» per guardar-los."
        )
      ).toBeInTheDocument();
    });
    expect(screen.queryByText('Desat.')).not.toBeInTheDocument();
  });
});

describe('setCover (stale cover-response guard)', () => {
  it('ignores an older failed response once a newer request has been dispatched', async () => {
    const user = userEvent.setup();
    const responseA = deferred<{ data?: unknown; error?: unknown }>();
    const responseB = deferred<{ data?: unknown; error?: unknown }>();
    setCoverAction
      .mockReturnValueOnce(responseA.promise)
      .mockReturnValueOnce(responseB.promise);

    render(
      <ImageManager
        catId="cat-1"
        coverImageId={null}
        images={[imageA, imageB]}
      />
    );

    await user.click(
      screen.getByRole('button', { name: 'Fes portada "Bola"' })
    );
    await user.click(
      screen.getByRole('button', { name: 'Fes portada "Micu"' })
    );
    expect(setCoverAction).toHaveBeenCalledTimes(2);

    // B is now the optimistic cover and still has a request in flight.
    expect(
      screen.getByRole('button', { name: '"Micu" és la portada' })
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: '"Micu" és la portada' })
    ).toBeDisabled();

    // A's (stale) response arrives after B was dispatched, and it failed.
    responseA.resolve({ data: undefined, error: { message: 'boom' } });

    // Give the microtask queue a turn, then assert nothing changed: B is
    // still the cover, and B's request is still shown in flight — A's
    // response must not roll back the cover nor clear B's saving flag.
    await waitFor(() => {
      expect(updateAction).not.toHaveBeenCalled(); // sanity: unrelated mock untouched
    });
    expect(
      screen.getByRole('button', { name: '"Micu" és la portada' })
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: '"Micu" és la portada' })
    ).toBeDisabled();
    expect(screen.queryByText(/no s'ha pogut triar la portada/i)).toBeNull();

    // Resolve B too, so nothing is left pending after the test.
    responseB.resolve({ data: undefined, error: undefined });
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: '"Micu" és la portada' })
      ).not.toBeDisabled();
    });
  });
});

describe('handleFiles (upload progress step)', () => {
  it('passes through comprimint… -> pujant… -> fet', async () => {
    const user = userEvent.setup();
    const compress = deferred<File>();
    compressAction.mockReturnValue(compress.promise);
    const upload = deferred<{ data?: unknown; error?: unknown }>();
    uploadAction.mockReturnValue(upload.promise);

    render(
      <ImageManager catId="cat-1" coverImageId={null} images={[imageA]} />
    );

    const file = new File(['x'], 'photo.png', { type: 'image/png' });
    const input = screen.getByLabelText('Afegeix fotos');
    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText(/comprimint…/)).toBeInTheDocument();
    });

    const compressedFile = new File(['x'], 'photo.webp', {
      type: 'image/webp',
    });
    compress.resolve(compressedFile);

    await waitFor(() => {
      expect(screen.getByText(/pujant…/)).toBeInTheDocument();
    });

    upload.resolve({
      data: makeImage({ id: 'img-new', altCa: '', altEs: '', position: 1 }),
      error: undefined,
    });

    await waitFor(() => {
      expect(screen.getByText(/fet/)).toBeInTheDocument();
    });
  });
});
