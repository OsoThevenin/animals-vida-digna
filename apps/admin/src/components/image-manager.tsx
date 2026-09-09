import { actions } from 'astro:actions';
import type { CatImage } from '@avd/content/cats';
import { imageUrl, MAX_UPLOAD_EDGE } from '@avd/content/image-url';
import imageCompression from 'browser-image-compression';
import { ArrowDown, ArrowUp, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
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
  describeCompressedSizeError,
  type UploadProgressItem,
  withAltEdit,
  withoutImage,
  withUploadItem,
  withUploadStatus,
} from '@/lib/image-manager';
import { validateUploadFile } from '@/lib/image-upload';

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
    setSaveMessage(
      error ? describeActionError(error, "No s'ha pogut desar.") : 'Desat.'
    );
  }

  async function setCover(id: string) {
    const previous = coverImageId;
    setCoverImageIdState(id);
    setSavingCoverId(id);
    const { error } = await actions.images.setCover({ catId, imageId: id });
    setSavingCoverId(null);
    if (error) {
      setCoverImageIdState(previous);
      setSaveMessage(
        describeActionError(error, "No s'ha pogut triar la portada.")
      );
    }
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    for (const file of files) {
      setUploads((prev) =>
        withUploadItem(prev, { name: file.name, status: 'compressing' })
      );

      let compressed: File;
      try {
        compressed = await imageCompression(
          file,
          buildCompressionOptions(MAX_UPLOAD_EDGE)
        );
      } catch {
        setUploads((prev) =>
          withUploadStatus(prev, file.name, {
            status: 'error',
            message: "No s'ha pogut comprimir la imatge.",
          })
        );
        continue;
      }

      const sizeError = describeCompressedSizeError(compressed.size);
      if (sizeError) {
        setUploads((prev) =>
          withUploadStatus(prev, file.name, {
            status: 'error',
            message: sizeError,
          })
        );
        continue;
      }

      const validation = validateUploadFile({
        type: compressed.type,
        size: compressed.size,
      });
      if (!validation.ok) {
        setUploads((prev) =>
          withUploadStatus(prev, file.name, {
            status: 'error',
            message:
              validation.reason === 'type'
                ? 'Format no vàlid.'
                : 'Fitxer massa gran.',
          })
        );
        continue;
      }

      const dimensions = await readImageDimensions(compressed);

      setUploads((prev) =>
        withUploadStatus(prev, file.name, { status: 'uploading' })
      );

      const formData = new FormData();
      formData.append('catId', catId);
      formData.append('file', compressed, file.name);
      formData.append('width', String(dimensions.width));
      formData.append('height', String(dimensions.height));

      const { data, error } = await actions.images.upload(formData);

      if (error || !data) {
        setUploads((prev) =>
          withUploadStatus(prev, file.name, {
            status: 'error',
            message: describeActionError(error, 'Error pujant la imatge.'),
          })
        );
        continue;
      }

      setImages((prev) => [...prev, data as CatImage]);
      setUploads((prev) =>
        withUploadStatus(prev, file.name, { status: 'done' })
      );
    }
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
        {images.map((image, index) => (
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
                  aria-pressed={coverImageId === image.id}
                  disabled={savingCoverId === image.id}
                  onClick={() => setCover(image.id)}
                  size="sm"
                  type="button"
                  variant={coverImageId === image.id ? 'default' : 'outline'}
                >
                  <Star aria-hidden="true" />
                  {coverImageId === image.id ? 'És la portada' : 'Fes portada'}
                </Button>
                <Button
                  aria-label={`Mou "${image.altCa || image.altEs || 'aquesta foto'}" amunt`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  size="icon-sm"
                  type="button"
                  variant="outline"
                >
                  <ArrowUp aria-hidden="true" />
                </Button>
                <Button
                  aria-label={`Mou "${image.altCa || image.altEs || 'aquesta foto'}" avall`}
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
                      aria-label={`Elimina "${image.altCa || image.altEs || 'aquesta foto'}"`}
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
                        Aquesta acció no es pot desfer. La foto s'eliminarà del
                        gat i del magatzem.
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
        ))}
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
          onChange={(event) => handleFiles(event.currentTarget.files)}
          type="file"
        />
        {uploads.length > 0 ? (
          <ul className="mt-3 space-y-1 text-sm">
            {uploads.map((item) => (
              <li key={item.name}>
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
