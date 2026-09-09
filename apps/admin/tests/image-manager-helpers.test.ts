import { describe, expect, it, vi } from 'vitest';
import {
  buildCompressionOptions,
  coverAfterRemoval,
  describeActionError,
  describeCompressedSizeError,
  MAX_ACTION_BODY_BYTES,
  ordersDiffer,
  processUploadFile,
  resolveCoverResponse,
  shouldApplyCoverResponse,
  UPLOAD_SIZE_HEADROOM_BYTES,
  withAltEdit,
  withoutImage,
  withUploadItem,
  withUploadStatus,
} from '../src/lib/image-manager';

describe('buildCompressionOptions', () => {
  it('targets comfortably under the 1 MB Astro action body cap', () => {
    const options = buildCompressionOptions(2000);
    // The real ceiling is the framework's 1 MB action body limit, not the
    // 5 MB MAX_UPLOAD_BYTES server check — see task-9 correction 2.
    expect(options.maxSizeMB * 1024 * 1024).toBeLessThan(MAX_ACTION_BODY_BYTES);
    expect(options.fileType).toBe('image/webp');
    expect(options.maxWidthOrHeight).toBe(2000);
    expect(options.useWebWorker).toBe(true);
  });
});

describe('describeCompressedSizeError', () => {
  it('returns null when the compressed file is comfortably under the cap', () => {
    expect(describeCompressedSizeError(500_000)).toBeNull();
  });

  it('returns a Catalan message when the compressed file still exceeds the cap', () => {
    const message = describeCompressedSizeError(1_200_000);
    expect(message).toBeTruthy();
    expect(message).toMatch(/1 ?MB/i);
  });

  it('treats the headroom boundary as the cutoff', () => {
    expect(describeCompressedSizeError(UPLOAD_SIZE_HEADROOM_BYTES)).toBeNull();
    expect(
      describeCompressedSizeError(UPLOAD_SIZE_HEADROOM_BYTES + 1)
    ).not.toBeNull();
  });
});

describe('withAltEdit', () => {
  const images = [
    { id: 'a', altCa: '', altEs: '' },
    { id: 'b', altCa: 'Bola', altEs: 'Bola' },
  ];

  it('updates only the matching image, immutably', () => {
    const next = withAltEdit(images, 'a', 'altCa', 'Micu');
    expect(next).not.toBe(images);
    expect(next[0]).not.toBe(images[0]);
    expect(next[0].altCa).toBe('Micu');
    expect(next[1]).toBe(images[1]);
    // original untouched
    expect(images[0].altCa).toBe('');
  });

  it('is a no-op for an unknown id', () => {
    const next = withAltEdit(images, 'missing', 'altEs', 'x');
    expect(next[0].altEs).toBe('');
    expect(next[1].altEs).toBe('Bola');
  });
});

describe('withoutImage', () => {
  it('removes only the matching image, immutably', () => {
    const images = [{ id: 'a' }, { id: 'b' }];
    const next = withoutImage(images, 'a');
    expect(next).toEqual([{ id: 'b' }]);
    expect(images).toHaveLength(2);
  });
});

describe('coverAfterRemoval', () => {
  it('clears the cover when the removed image was the cover', () => {
    expect(coverAfterRemoval('a', 'a')).toBeNull();
  });

  it('leaves the cover untouched otherwise', () => {
    expect(coverAfterRemoval('a', 'b')).toBe('a');
    expect(coverAfterRemoval(null, 'b')).toBeNull();
  });
});

describe('withUploadItem / withUploadStatus', () => {
  it('appends a new upload item immutably', () => {
    const items = [{ id: '1', name: 'a.jpg', status: 'compressing' as const }];
    const next = withUploadItem(items, {
      id: '2',
      name: 'b.jpg',
      status: 'compressing',
    });
    expect(next).toHaveLength(2);
    expect(items).toHaveLength(1);
  });

  it('patches only the matching item by id, immutably', () => {
    const items = [
      { id: '1', name: 'a.jpg', status: 'compressing' as const },
      { id: '2', name: 'a.jpg', status: 'compressing' as const },
    ];
    const next = withUploadStatus(items, '1', {
      status: 'error',
      message: 'boom',
    });
    expect(next[0]).toEqual({
      id: '1',
      name: 'a.jpg',
      status: 'error',
      message: 'boom',
    });
    expect(next[1]).toBe(items[1]);
    expect(items[0].status).toBe('compressing');
  });

  it('never collides two same-named files (fix-round-1 MINOR 6)', () => {
    // Two files picked in the same <input multiple> selection can share
    // a name — keying by id (not name) is what keeps their status
    // independent.
    const items = [
      { id: 'req-1', name: 'foto.jpg', status: 'compressing' as const },
      { id: 'req-2', name: 'foto.jpg', status: 'compressing' as const },
    ];
    const next = withUploadStatus(items, 'req-1', { status: 'done' });
    expect(next[0].status).toBe('done');
    expect(next[1].status).toBe('compressing');
  });
});

describe('describeActionError', () => {
  it('extracts the message from an ActionError-shaped object', () => {
    expect(
      describeActionError({ message: 'image not in cat' }, 'fallback')
    ).toBe('image not in cat');
  });

  it('falls back for a message-less thrown value (non-ActionError failure)', () => {
    expect(describeActionError(new Error(), 'fallback')).toBe('fallback');
    expect(describeActionError('boom', 'fallback')).toBe('fallback');
    expect(describeActionError(null, 'fallback')).toBe('fallback');
  });

  it('falls back when the message is an empty string', () => {
    expect(describeActionError({ message: '' }, 'fallback')).toBe('fallback');
  });
});

/**
 * fix-round-1 IMPORTANT 1: `handleFiles`' loop had no `catch`/`continue`
 * around reading dimensions, unlike the compress/size-gate/validate steps
 * around it. `createImageBitmap` rejecting (a decode failure, or an
 * unsupported/animated source) left that row stuck at "comprimint…"
 * forever and dropped every subsequent queued file. `processUploadFile`
 * makes every step — including this one — return an error result instead
 * of throwing, so a caller looping over files always reaches the next
 * iteration.
 */
describe('processUploadFile', () => {
  const okFile = new File(['x'], 'photo.jpg', { type: 'image/webp' });

  // A factory, not a shared object: each test needs its own `vi.fn()`
  // instances so call-count assertions (`not.toHaveBeenCalled()`) aren't
  // polluted by calls made in an earlier test.
  function makeDeps() {
    return {
      compress: vi.fn(async (f: File) => f),
      readDimensions: vi.fn(async () => ({ width: 800, height: 600 })),
      upload: vi.fn(async () => ({ data: { id: 'img_1' } })),
    };
  }

  it('uploads successfully through every step', async () => {
    const result = await processUploadFile(okFile, 'cat_1', makeDeps());
    expect(result).toEqual({ status: 'done', image: { id: 'img_1' } });
  });

  it('returns a Catalan error and does not throw when reading dimensions rejects', async () => {
    const deps = {
      ...makeDeps(),
      readDimensions: vi.fn(async () => {
        throw new Error('decode failed');
      }),
    };
    const result = await processUploadFile(okFile, 'cat_1', deps);
    expect(result.status).toBe('error');
    expect(result.status === 'error' && result.message).toBeTruthy();
    // The point of the fix: upload is never reached once dimensions fail.
    expect(deps.upload).not.toHaveBeenCalled();
  });

  it('processing a failing file does not stop the next file in a batch', async () => {
    // Reproduces the exact bug: a decode failure on file 1 must not
    // prevent file 2 (queued after it in the same <input multiple>
    // selection) from being processed.
    const failingDeps = {
      ...makeDeps(),
      readDimensions: vi.fn(async () => {
        throw new Error('decode failed');
      }),
    };
    const results = [];
    for (const deps of [failingDeps, makeDeps()]) {
      // Sequential on purpose — mirrors the component's own per-file loop,
      // which is exactly what's under test.
      results.push(await processUploadFile(okFile, 'cat_1', deps));
    }
    expect(results[0].status).toBe('error');
    expect(results[1]).toEqual({ status: 'done', image: { id: 'img_1' } });
  });

  it('still returns an error result (not a throw) when compression fails', async () => {
    const deps = {
      ...makeDeps(),
      compress: vi.fn(async () => {
        throw new Error('boom');
      }),
    };
    const result = await processUploadFile(okFile, 'cat_1', deps);
    expect(result.status).toBe('error');
  });

  it('gates on the compressed size before ever validating or uploading', async () => {
    const deps = makeDeps();
    deps.compress.mockResolvedValue({
      type: 'image/webp',
      size: 2_000_000,
    } as unknown as File);
    const result = await processUploadFile(okFile, 'cat_1', deps);
    expect(result.status).toBe('error');
    expect(deps.upload).not.toHaveBeenCalled();
  });

  it('calls onUploading once, after compression/dimensions and before the network upload (fix-round-2 NEW BREAKAGE)', async () => {
    // fix-round-1 moved the whole pipeline into processUploadFile without
    // a progress hook, so nothing ever set the row to "uploading" again —
    // it stayed on "comprimint…" for the entire network transfer. This
    // asserts the call order onUploading must respect: after the steps
    // that can still fail (compress, size gate, validate, dimensions),
    // and strictly before `upload` — the exact restored behaviour.
    const calls: string[] = [];
    const deps = {
      compress: vi.fn(async (f: File) => {
        calls.push('compress');
        return f;
      }),
      readDimensions: vi.fn(async () => {
        calls.push('readDimensions');
        return { width: 800, height: 600 };
      }),
      onUploading: vi.fn(() => {
        calls.push('onUploading');
      }),
      upload: vi.fn(async () => {
        calls.push('upload');
        return { data: { id: 'img_1' } };
      }),
    };
    const result = await processUploadFile(okFile, 'cat_1', deps);
    expect(result.status).toBe('done');
    expect(deps.onUploading).toHaveBeenCalledTimes(1);
    expect(calls).toEqual([
      'compress',
      'readDimensions',
      'onUploading',
      'upload',
    ]);
  });

  it('never calls onUploading when an earlier step fails', async () => {
    const deps = {
      ...makeDeps(),
      readDimensions: vi.fn(async () => {
        throw new Error('decode failed');
      }),
      onUploading: vi.fn(),
    };
    const result = await processUploadFile(okFile, 'cat_1', deps);
    expect(result.status).toBe('error');
    expect(deps.onUploading).not.toHaveBeenCalled();
  });

  it('tolerates a missing onUploading (optional dependency)', async () => {
    const deps = makeDeps();
    const result = await processUploadFile(okFile, 'cat_1', deps);
    expect(result.status).toBe('done');
  });
});

/**
 * fix-round-1 IMPORTANT 2: `images.update` always resolves `{ ok: true }`,
 * even when the volunteer reordered or edited alt text again while the
 * save was still in flight — the server only ever held what was actually
 * sent. `ordersDiffer` is what lets `saveOrderAndAlts` tell a genuine
 * save apart from a stale one instead of always saying "Desat.".
 */
describe('ordersDiffer', () => {
  const sent = [
    { id: 'a', altCa: 'A', altEs: 'A', position: 0 },
    { id: 'b', altCa: 'B', altEs: 'B', position: 1 },
    { id: 'c', altCa: 'C', altEs: 'C', position: 2 },
  ];

  it('is false when the current state still matches what was sent', () => {
    expect(
      ordersDiffer(
        sent,
        sent.map((image) => ({ ...image }))
      )
    ).toBe(false);
  });

  it('is true after a reorder happened while the save was in flight', () => {
    // Reproduces the exact bug: click Desa (order a,b,c sent), then click
    // "Mou avall" on b before the response arrives (local becomes a,c,b).
    const current = [
      { id: 'a', altCa: 'A', altEs: 'A', position: 0 },
      { id: 'c', altCa: 'C', altEs: 'C', position: 1 },
      { id: 'b', altCa: 'B', altEs: 'B', position: 2 },
    ];
    expect(ordersDiffer(sent, current)).toBe(true);
  });

  it('is true after an alt-text edit happened while the save was in flight', () => {
    const current = sent.map((image) =>
      image.id === 'b' ? { ...image, altCa: 'Edited mid-save' } : image
    );
    expect(ordersDiffer(sent, current)).toBe(true);
  });

  it('is true when an image was removed or added while the save was in flight', () => {
    expect(ordersDiffer(sent, sent.slice(0, 2))).toBe(true);
  });
});

/**
 * fix-round-1 IMPORTANT 3: `setCover` captured `previous` per call while
 * `savingCoverId` was a single slot, so an older, superseded response
 * could roll back over a newer optimistic update or clear the saving
 * indicator out from under the request that was actually still in
 * flight. `shouldApplyCoverResponse` is the guard that makes a stale
 * response a no-op.
 */
describe('shouldApplyCoverResponse', () => {
  it('applies when this response is still for the latest dispatched request', () => {
    expect(shouldApplyCoverResponse('C', 'C')).toBe(true);
  });

  it('ignores a stale response once a newer request has been dispatched', () => {
    // cover=A; click B (dispatched, latest=B); click C (dispatched,
    // latest=C); C settles first; B's response (an error) then arrives —
    // it must be ignored, not rolled back over C.
    expect(shouldApplyCoverResponse('B', 'C')).toBe(false);
  });

  it('treats no dispatched request as never current', () => {
    expect(shouldApplyCoverResponse('A', null)).toBe(false);
  });
});

/**
 * fix-round-2 residual on IMPORTANT 3: `shouldApplyCoverResponse` alone
 * stops a stale response from clobbering a newer one, but rolling back to
 * "whatever was on screen when this call started" is still wrong if the
 * newer call *also* fails — that value was never confirmed by the server
 * either. `resolveCoverResponse` rolls back to `confirmedCoverId`
 * instead, so a failure can never restore an unconfirmed value.
 */
describe('resolveCoverResponse', () => {
  it('applies a successful response and confirms its cover id', () => {
    const decision = resolveCoverResponse({
      requestId: 'B',
      latestRequestId: 'B',
      confirmedCoverId: 'A',
      error: false,
    });
    expect(decision).toEqual({
      applied: true,
      coverImageId: 'B',
      confirmedCoverId: 'B',
    });
  });

  it('rolls back to the last confirmed cover on a solo failure', () => {
    const decision = resolveCoverResponse({
      requestId: 'B',
      latestRequestId: 'B',
      confirmedCoverId: 'A',
      error: true,
    });
    expect(decision).toEqual({
      applied: true,
      coverImageId: 'A',
      confirmedCoverId: 'A',
    });
  });

  it('ignores a stale response entirely, regardless of error', () => {
    expect(
      resolveCoverResponse({
        requestId: 'B',
        latestRequestId: 'C',
        confirmedCoverId: 'A',
        error: true,
      })
    ).toEqual({ applied: false });
    expect(
      resolveCoverResponse({
        requestId: 'B',
        latestRequestId: 'C',
        confirmedCoverId: 'A',
        error: false,
      })
    ).toEqual({ applied: false });
  });

  it('never restores an unconfirmed value when two in-flight requests BOTH fail', () => {
    // The residual this fix closes: cover=A (confirmed=A); click B
    // (dispatched, latest=B); click C (dispatched, latest=C, confirmed
    // still A — B never succeeded). C settles first and fails: this must
    // roll back to A, the last confirmed cover — NOT to B, which was
    // only ever an optimistic, unconfirmed value.
    const cResolution = resolveCoverResponse({
      requestId: 'C',
      latestRequestId: 'C',
      confirmedCoverId: 'A',
      error: true,
    });
    expect(cResolution).toEqual({
      applied: true,
      coverImageId: 'A',
      confirmedCoverId: 'A',
    });

    // B's response (also an error) arrives after C was dispatched — it
    // must be ignored, not applied over the top of C's rollback.
    const bResolution = resolveCoverResponse({
      requestId: 'B',
      latestRequestId: 'C',
      confirmedCoverId: 'A',
      error: true,
    });
    expect(bResolution).toEqual({ applied: false });
  });
});
