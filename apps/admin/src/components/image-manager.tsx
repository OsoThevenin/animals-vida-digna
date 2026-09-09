import { actions } from 'astro:actions';
import type { CatImage } from '@avd/content/cats';
import { imageUrl, MAX_UPLOAD_EDGE } from '@avd/content/image-url';
import imageCompression from 'browser-image-compression';
import { ArrowDown, ArrowUp, Star, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { FormField } from '@/components/form-field';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { moveImage, withPositions } from '@/lib/gallery';
import {
  buildCompressionOptions,
  coverAfterRemoval,
  describeActionError,
  ordersDiffer,
  processUploadFile,
  shouldApplyCoverResponse,
  type UploadProgressItem,
  withAltEdit,
  withoutImage,
  withUploadItem,
  withUploadStatus,
} from '@/lib/image-manager';

export interface ImageManagerProps {
  catId: string;
  images: CatImage[];
  coverImageId: string | null;
}

const origin = import.meta.env.PUBLIC_IMAGES_ORIGIN as string | undefined;

export default function ImageManager({
  catId,
  images: initialImages,
  coverImageId: initialCoverImageId,
}: ImageManagerProps) {
  const [images, setImages] = useState<CatImage[]>(
    [...initialImages].sort((a, b) => a.position - b.position)
  );
  const [coverImageId, setCoverImageIdState] = useState(initialCoverImageId);
  const [uploads, setUploads] = useState<UploadProgressItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [savingCoverId, setSavingCoverId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState('');

  // Always holds the latest `images` value, readable from inside an
  // in-flight save's closure even after the volunteer keeps editing —
  // see `ordersDiffer` usage in `saveOrderAndAlts` (fix-round-1
  // IMPORTANT 2).
  const imagesRef = useRef(images);
  imagesRef.current = images;

  // The most recently dispatched `setCover` call's image id. A response
  // whose id no longer matches this is stale and must be ignored — see
  // `shouldApplyCoverResponse` usage in `setCover` (fix-round-1
  // IMPORTANT 3).
  const latestCoverRequestRef = useRef<string | null>(null);

  function move(index: number, direction: -1 | 1) {
    setImages((prev) => moveImage(prev, index, index + direction));
  }

  function updateAlt(id: string, field: 'altCa' | 'altEs', value: string) {
    setImages((prev) => withAltEdit(prev, id, field, value));
  }

  async function removeImage(id: string) {
    const { error } = await actions.images.remove({ imageId: id });
    if (error) {
      setSaveMessage(
        describeActionError(error, "No s'ha pogut eliminar la foto.")
      );
      return;
    }
    setImages((prev) => withoutImage(prev, id));
    const nextCover = coverAfterRemoval(coverImageId, id);
    if (nextCover !== coverImageId) {
      setCoverImageIdState(nextCover);
      const coverResult = await actions.images.setCover({
        catId,
        imageId: null,
      });
      if (coverResult.error) {
        setSaveMessage(
          describeActionError(
            coverResult.error,
            "La foto s'ha eliminat, però no s'ha pogut netejar la portada."
          )
        );
      }
    }
  }

  async function saveOrderAndAlts() {
    setSaving(true);
    setSaveMessage('');
    const positioned = withPositions(images);
    setImages(positioned);
    const { error } = await actions.images.update({
      catId,
      images: positioned.map((image) => ({
        id: image.id,
        altCa: image.altCa,
        altEs: image.altEs,
        position: image.position,
      })),
    });
    setSaving(false);
    if (error) {
      setSaveMessage(describeActionError(error, "No s'ha pogut desar."));
      return;
    }
    // `images.update` always resolves `{ ok: true }`, even when the
    // volunteer reordered or re-edited alt text while this save was in
    // flight (the server only ever has `positioned`, sent above). Compare
    // against the *current* state — via the ref, since this closure's own
    // `images`/`positioned` are the pre-await snapshot — before claiming
    // success (fix-round-1 IMPORTANT 2).
    setSaveMessage(
      ordersDiffer(positioned, imagesRef.current)
        ? "S'ha desat una versió anterior: hi ha canvis nous. Torna a prémer «Desa» per guardar-los."
        : 'Desat.'
    );
  }

  async function setCover(id: string) {
    const previous = coverImageId;
    latestCoverRequestRef.current = id;
    setCoverImageIdState(id);
    setSavingCoverId(id);
    const { error } = await actions.images.setCover({ catId, imageId: id });
    if (!shouldApplyCoverResponse(id, latestCoverRequestRef.current)) {
      // A newer setCover call has been dispatched since this one — that
      // request, not this response, owns coverImageId/savingCoverId now.
      // Applying this stale response (success or failure) could roll
      // back a newer optimistic update, or clear the saving indicator
      // out from under the request that's actually still in flight.
      return;
    }
    setSavingCoverId(null);
    if (error) {
      setCoverImageIdState(previous);
      setSaveMessage(
        describeActionError(error, "No s'ha pogut triar la portada.")
      );
    }
  }

  async function handleFiles(
    fileList: FileList | null,
    inputEl: HTMLInputElement | null
  ) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    for (const file of files) {
      // A unique id per attempt, not `file.name` — two files picked in
      // the same selection can share a name, which made them collide on
      // both the React `key` and every status patch (fix-round-1
      // MINOR 6).
      const uploadId = crypto.randomUUID();
      setUploads((prev) =>
        withUploadItem(prev, {
          id: uploadId,
          name: file.name,
          status: 'compressing',
        })
      );

      const result = await processUploadFile<CatImage>(file, catId, {
        compress: (f) =>
          imageCompression(f, buildCompressionOptions(MAX_UPLOAD_EDGE)),
        readDimensions: readImageDimensions,
        upload: (formData) => actions.images.upload(formData),
      });

      if (result.status === 'error') {
        setUploads((prev) =>
          withUploadStatus(prev, uploadId, {
            status: 'error',
            message: result.message,
          })
        );
        continue;
      }

      setImages((prev) => [...prev, result.image]);
      setUploads((prev) =>
        withUploadStatus(prev, uploadId, { status: 'done' })
      );
    }

    // Reset so re-selecting the identical file(s) fires onChange again.
    if (inputEl) inputEl.value = '';
  }

  return (
    <div>
      {saveMessage ? (
        <div
          className="mb-4 rounded-lg bg-muted p-3 text-foreground text-sm"
          role="alert"
        >
          {saveMessage}
        </div>
      ) : null}

      <ul className="mb-6 space-y-4">
        {images.map((image, index) => {
          const imageLabel = image.altCa || image.altEs || 'aquesta foto';
          const isCover = coverImageId === image.id;
          return (
            <li
              className="flex flex-col gap-3 rounded-lg border border-border p-4 md:flex-row md:items-start"
              key={image.id}
            >
              <img
                alt={image.altCa || image.altEs || 'Foto del gat'}
                className="h-32 w-32 shrink-0 rounded-lg object-cover"
                height={128}
                src={imageUrl(image.r2Key, 320, origin)}
                width={128}
              />
              <div className="flex-1">
                <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <FormField
                    id={`alt-ca-${image.id}`}
                    label="Text alternatiu (CA)"
                  >
                    <Input
                      id={`alt-ca-${image.id}`}
                      onChange={(event) =>
                        updateAlt(image.id, 'altCa', event.currentTarget.value)
                      }
                      value={image.altCa}
                    />
                  </FormField>
                  <FormField
                    id={`alt-es-${image.id}`}
                    label="Text alternatiu (ES)"
                  >
                    <Input
                      id={`alt-es-${image.id}`}
                      onChange={(event) =>
                        updateAlt(image.id, 'altEs', event.currentTarget.value)
                      }
                      value={image.altEs}
                    />
                  </FormField>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    aria-label={
                      isCover
                        ? `"${imageLabel}" és la portada`
                        : `Fes portada "${imageLabel}"`
                    }
                    aria-pressed={isCover}
                    disabled={savingCoverId === image.id}
                    onClick={() => setCover(image.id)}
                    size="sm"
                    type="button"
                    variant={isCover ? 'default' : 'outline'}
                  >
                    <Star aria-hidden="true" />
                    {isCover ? 'És la portada' : 'Fes portada'}
                  </Button>
                  <Button
                    aria-label={`Mou "${imageLabel}" amunt`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    size="icon-sm"
                    type="button"
                    variant="outline"
                  >
                    <ArrowUp aria-hidden="true" />
                  </Button>
                  <Button
                    aria-label={`Mou "${imageLabel}" avall`}
                    disabled={index === images.length - 1}
                    onClick={() => move(index, 1)}
                    size="icon-sm"
                    type="button"
                    variant="outline"
                  >
                    <ArrowDown aria-hidden="true" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        aria-label={`Elimina "${imageLabel}"`}
                        size="icon-sm"
                        type="button"
                        variant="destructive"
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Eliminar aquesta foto?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Aquesta acció no es pot desfer. La foto s'eliminarà
                          del gat i del magatzem.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel·la</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => removeImage(image.id)}
                          variant="destructive"
                        >
                          Elimina
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <Button disabled={saving} onClick={saveOrderAndAlts} type="button">
        {saving ? 'Desant…' : "Desa l'ordre i els textos alternatius"}
      </Button>

      <div className="mt-8">
        <label
          className="mb-1 block font-medium text-foreground text-sm"
          htmlFor="cat-image-upload"
        >
          Afegeix fotos
        </label>
        <input
          accept="image/*"
          id="cat-image-upload"
          multiple
          onChange={(event) =>
            handleFiles(event.currentTarget.files, event.currentTarget)
          }
          type="file"
        />
        {uploads.length > 0 ? (
          <ul className="mt-3 space-y-1 text-sm">
            {uploads.map((item) => (
              <li key={item.id}>
                {item.name} — {item.status === 'compressing' && 'comprimint…'}
                {item.status === 'uploading' && 'pujant…'}
                {item.status === 'done' && 'fet'}
                {item.status === 'error' && `error: ${item.message}`}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function readImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return createImageBitmap(file).then((bitmap) => {
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  });
}
