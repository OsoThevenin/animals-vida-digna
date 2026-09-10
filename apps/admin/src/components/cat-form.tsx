import { actions, isInputError } from 'astro:actions';
import type { CatWithImages } from '@avd/content/cats';
import {
  CAT_GENDERS,
  CAT_GOOD_WITH,
  CAT_HEALTH_STATUSES,
  CAT_PERSONALITIES,
  CAT_SIZES,
  CAT_STATUSES,
} from '@avd/content/validate';
import { useState } from 'react';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  type CatFormState,
  catToInput,
  emptyCatInput,
  formStateToInput,
  inputErrorsToFieldErrors,
} from '@/lib/cat-form';
import {
  applyNameChange,
  fieldAriaProps,
  previewOrFallback,
  toggleListValue,
} from '@/lib/cat-form-ui';

// These labels intentionally restore the accents keystatic.config.tsx's
// select/multiselect option labels omit (e.g. "Timid", "Afectuos",
// "Curios") — the admin form is new, so it uses correct Catalan
// orthography rather than copying that ASCII-only shortcut forward.

const STATUS_LABELS: Record<string, string> = {
  available: 'Disponible',
  adopted: 'Adoptat',
  treatment: 'En tractament',
  unavailable: 'No disponible',
};

const GENDER_LABELS: Record<string, string> = {
  male: 'Mascle',
  female: 'Femella',
};

const SIZE_LABELS: Record<string, string> = {
  small: 'Petit',
  medium: 'Mitjà',
  large: 'Gran',
};

const HEALTH_STATUS_LABELS: Record<string, string> = {
  healthy: 'Sa',
  treatment: 'En tractament',
  'special-needs': 'Necessitats especials',
};

const PERSONALITY_LABELS: Record<string, string> = {
  playful: 'Juganer',
  calm: 'Tranquil',
  shy: 'Tímid',
  affectionate: 'Afectuós',
  independent: 'Independent',
  social: 'Social',
  curious: 'Curiós',
  protective: 'Protector',
};

const GOOD_WITH_LABELS: Record<string, string> = {
  children: 'Nens',
  'other-cats': 'Altres gats',
  dogs: 'Gossos',
  elderly: 'Gent gran',
};

export interface CatFormProps {
  mode: 'create' | 'edit';
  cat?: CatWithImages;
}

export default function CatForm({ mode, cat }: CatFormProps) {
  const [state, setState] = useState<CatFormState>(() =>
    cat ? catToInput(cat) : emptyCatInput()
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [previewCa, setPreviewCa] = useState(false);
  const [previewEs, setPreviewEs] = useState(false);

  function update<K extends keyof CatFormState>(
    key: K,
    value: CatFormState[K]
  ) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function updateName(key: 'nameCa' | 'nameEs', value: string) {
    setState((prev) => applyNameChange(prev, key, value));
  }

  function updateSlugManually(key: 'slugCa' | 'slugEs', value: string) {
    setState((prev) => ({
      ...prev,
      [key]: value,
      slugsEditedManually: true,
    }));
  }

  function toggleList(key: 'personality' | 'goodWith', value: string) {
    setState((prev) => ({ ...prev, [key]: toggleListValue(prev[key], value) }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setServerError('');
    setFieldErrors({});
    setSubmitting(true);

    const input = formStateToInput({
      ...state,
      slugCa: state.slugCa.trim(),
      slugEs: state.slugEs.trim(),
    });

    const { data, error } =
      mode === 'create'
        ? await actions.cats.create(input as never)
        : await actions.cats.update({
            id: cat?.id as string,
            data: input as never,
          });

    setSubmitting(false);

    if (isInputError(error)) {
      // Reads error.issues (each Zod issue's full path), not
      // error.fields — Astro's real ActionInputError.fields keys only on
      // issue.path[0], so in edit mode (where the action's input is
      // { id, data: catInputSchema }) every issue's path starts with
      // "data" and .fields collapses to one { data: [...] } bucket
      // instead of per-field keys. inputErrorsToFieldErrors rebuilds
      // per-field attribution from the full path so
      // <FormField error={fieldErrors.nameCa}> below finds the right key
      // in both create and edit mode. See src/lib/cat-form.ts.
      setFieldErrors(inputErrorsToFieldErrors(error.issues, mode));
      return;
    }
    if (error) {
      setServerError(error.message || 'Hi ha hagut un error inesperat.');
      return;
    }
    if (data) {
      window.location.assign(`/cats/${data.id}`);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      {serverError ? (
        <div
          className="mb-6 rounded-lg bg-destructive/10 p-4 text-destructive text-sm"
          role="alert"
        >
          {serverError}
        </div>
      ) : null}

      <fieldset className="mb-8">
        <legend className="mb-3 font-semibold text-foreground text-lg">
          Identitat
        </legend>
        <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
          <FormField
            error={fieldErrors.nameCa}
            id="cat-name-ca"
            label="Nom (CA)"
          >
            <Input
              id="cat-name-ca"
              onChange={(event) =>
                updateName('nameCa', event.currentTarget.value)
              }
              required
              value={state.nameCa}
            />
          </FormField>
          <FormField
            error={fieldErrors.nameEs}
            id="cat-name-es"
            label="Nom (ES)"
          >
            <Input
              id="cat-name-es"
              onChange={(event) =>
                updateName('nameEs', event.currentTarget.value)
              }
              required
              value={state.nameEs}
            />
          </FormField>
          <FormField
            error={fieldErrors.slugCa}
            id="cat-slug-ca"
            label="Slug (CA)"
          >
            <Input
              id="cat-slug-ca"
              onChange={(event) =>
                updateSlugManually('slugCa', event.currentTarget.value)
              }
              required
              value={state.slugCa}
            />
          </FormField>
          <FormField
            error={fieldErrors.slugEs}
            id="cat-slug-es"
            label="Slug (ES)"
          >
            <Input
              id="cat-slug-es"
              onChange={(event) =>
                updateSlugManually('slugEs', event.currentTarget.value)
              }
              required
              value={state.slugEs}
            />
          </FormField>
          <FormField
            error={fieldErrors.raceCa}
            id="cat-race-ca"
            label="Raça (CA)"
          >
            <Input
              id="cat-race-ca"
              onChange={(event) => update('raceCa', event.currentTarget.value)}
              value={state.raceCa}
            />
          </FormField>
          <FormField
            error={fieldErrors.raceEs}
            id="cat-race-es"
            label="Raza (ES)"
          >
            <Input
              id="cat-race-es"
              onChange={(event) => update('raceEs', event.currentTarget.value)}
              value={state.raceEs}
            />
          </FormField>
        </div>
      </fieldset>

      <fieldset className="mb-8">
        <legend className="mb-3 font-semibold text-foreground text-lg">
          Característiques
        </legend>
        <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
          <FormField id="cat-status" label="Estat">
            <Select
              onValueChange={(value) => update('status', value)}
              value={state.status}
            >
              <SelectTrigger className="w-full" id="cat-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAT_STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {STATUS_LABELS[value] ?? value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField id="cat-gender" label="Gènere">
            <Select
              onValueChange={(value) => update('gender', value)}
              value={state.gender}
            >
              <SelectTrigger className="w-full" id="cat-gender">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAT_GENDERS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {GENDER_LABELS[value] ?? value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField id="cat-size" label="Mida">
            <Select
              onValueChange={(value) => update('size', value)}
              value={state.size}
            >
              <SelectTrigger className="w-full" id="cat-size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAT_SIZES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {SIZE_LABELS[value] ?? value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField id="cat-health-status" label="Estat de salut">
            <Select
              onValueChange={(value) => update('healthStatus', value)}
              value={state.healthStatus}
            >
              <SelectTrigger className="w-full" id="cat-health-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAT_HEALTH_STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {HEALTH_STATUS_LABELS[value] ?? value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField error={fieldErrors.age} id="cat-age" label="Edat (anys)">
            <Input
              id="cat-age"
              min={0}
              onChange={(event) => update('age', event.currentTarget.value)}
              type="number"
              value={state.age}
            />
          </FormField>
          <FormField
            error={fieldErrors.weight}
            id="cat-weight"
            label="Pes (kg)"
          >
            <Input
              id="cat-weight"
              min={0}
              onChange={(event) => update('weight', event.currentTarget.value)}
              step="0.1"
              type="number"
              value={state.weight}
            />
          </FormField>
        </div>

        <fieldset className="m-0 mb-5 border-0 p-0">
          <legend className="mb-1 block font-medium text-foreground text-sm">
            Personalitat
          </legend>
          <div className="flex flex-wrap gap-4">
            {CAT_PERSONALITIES.map((value) => {
              const id = `cat-personality-${value}`;
              return (
                <div className="flex items-center gap-1.5" key={value}>
                  <Checkbox
                    checked={state.personality.includes(value)}
                    id={id}
                    onCheckedChange={() => toggleList('personality', value)}
                  />
                  <Label className="font-normal" htmlFor={id}>
                    {PERSONALITY_LABELS[value] ?? value}
                  </Label>
                </div>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="m-0 mb-5 border-0 p-0">
          <legend className="mb-1 block font-medium text-foreground text-sm">
            Es porta bé amb
          </legend>
          <div className="flex flex-wrap gap-4">
            {CAT_GOOD_WITH.map((value) => {
              const id = `cat-good-with-${value}`;
              return (
                <div className="flex items-center gap-1.5" key={value}>
                  <Checkbox
                    checked={state.goodWith.includes(value)}
                    id={id}
                    onCheckedChange={() => toggleList('goodWith', value)}
                  />
                  <Label className="font-normal" htmlFor={id}>
                    {GOOD_WITH_LABELS[value] ?? value}
                  </Label>
                </div>
              );
            })}
          </div>
        </fieldset>

        <div className="mb-5 flex flex-wrap gap-6">
          <div className="flex items-center gap-1.5">
            <Checkbox
              checked={state.vaccinated}
              id="cat-vaccinated"
              onCheckedChange={(checked) =>
                update('vaccinated', checked === true)
              }
            />
            <Label className="font-normal" htmlFor="cat-vaccinated">
              Vacunat
            </Label>
          </div>
          <div className="flex items-center gap-1.5">
            <Checkbox
              checked={state.microchipped}
              id="cat-microchipped"
              onCheckedChange={(checked) =>
                update('microchipped', checked === true)
              }
            />
            <Label className="font-normal" htmlFor="cat-microchipped">
              Microxipat
            </Label>
          </div>
          <div className="flex items-center gap-1.5">
            <Checkbox
              checked={state.sterilized}
              id="cat-sterilized"
              onCheckedChange={(checked) =>
                update('sterilized', checked === true)
              }
            />
            <Label className="font-normal" htmlFor="cat-sterilized">
              Esterilitzat
            </Label>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
          <FormField id="cat-rescue-date" label="Data de rescat">
            <Input
              id="cat-rescue-date"
              onChange={(event) =>
                update('rescueDate', event.currentTarget.value)
              }
              type="date"
              value={state.rescueDate}
            />
          </FormField>
          <FormField id="cat-adoption-date" label="Data d'adopció">
            <Input
              id="cat-adoption-date"
              onChange={(event) =>
                update('adoptionDate', event.currentTarget.value)
              }
              type="date"
              value={state.adoptionDate}
            />
          </FormField>
        </div>
      </fieldset>

      <fieldset className="mb-8">
        <legend className="mb-3 font-semibold text-foreground text-lg">
          Textos
        </legend>
        <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
          <FormField
            error={fieldErrors.shortDescriptionCa}
            id="cat-short-description-ca"
            label="Descripció curta (CA)"
          >
            <Textarea
              id="cat-short-description-ca"
              onChange={(event) =>
                update('shortDescriptionCa', event.currentTarget.value)
              }
              value={state.shortDescriptionCa}
            />
          </FormField>
          <FormField
            error={fieldErrors.shortDescriptionEs}
            id="cat-short-description-es"
            label="Descripción corta (ES)"
          >
            <Textarea
              id="cat-short-description-es"
              onChange={(event) =>
                update('shortDescriptionEs', event.currentTarget.value)
              }
              value={state.shortDescriptionEs}
            />
          </FormField>
          <FormField
            error={fieldErrors.specialNeedsCa}
            id="cat-special-needs-ca"
            label="Necessitats especials (CA)"
          >
            <Textarea
              id="cat-special-needs-ca"
              onChange={(event) =>
                update('specialNeedsCa', event.currentTarget.value)
              }
              value={state.specialNeedsCa}
            />
          </FormField>
          <FormField
            error={fieldErrors.specialNeedsEs}
            id="cat-special-needs-es"
            label="Necesidades especiales (ES)"
          >
            <Textarea
              id="cat-special-needs-es"
              onChange={(event) =>
                update('specialNeedsEs', event.currentTarget.value)
              }
              value={state.specialNeedsEs}
            />
          </FormField>
          <FormField
            error={fieldErrors.observationsCa}
            id="cat-observations-ca"
            label="Observacions (CA)"
          >
            <Textarea
              id="cat-observations-ca"
              onChange={(event) =>
                update('observationsCa', event.currentTarget.value)
              }
              value={state.observationsCa}
            />
          </FormField>
          <FormField
            error={fieldErrors.observationsEs}
            id="cat-observations-es"
            label="Observaciones (ES)"
          >
            <Textarea
              id="cat-observations-es"
              onChange={(event) =>
                update('observationsEs', event.currentTarget.value)
              }
              value={state.observationsEs}
            />
          </FormField>
        </div>

        <div className="mb-5">
          <div className="mb-1 flex items-center justify-between">
            <Label htmlFor="cat-description-ca">
              Descripció (CA) — Markdoc
            </Label>
            <button
              className="text-primary text-xs hover:underline"
              onClick={() => setPreviewCa((v) => !v)}
              type="button"
            >
              {previewCa ? 'Amaga la vista prèvia' : 'Mostra la vista prèvia'}
            </button>
          </div>
          <Textarea
            {...fieldAriaProps(
              'cat-description-ca-error',
              Boolean(fieldErrors.descriptionCa)
            )}
            id="cat-description-ca"
            onChange={(event) =>
              update('descriptionCa', event.currentTarget.value)
            }
            rows={8}
            value={state.descriptionCa}
          />
          {fieldErrors.descriptionCa ? (
            <p
              className="mt-1 text-destructive text-xs"
              id="cat-description-ca-error"
              role="alert"
            >
              {fieldErrors.descriptionCa}
            </p>
          ) : null}
          {previewCa ? (
            <div
              className="mt-2 rounded-lg border border-border bg-muted/40 p-4 text-foreground text-sm"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: previewOrFallback() runs Markdoc.renderers.html on volunteer-authored Markdoc (or returns a plain-text Catalan fallback message with no markup), same trust boundary as the public site's renderMarkdoc.
              dangerouslySetInnerHTML={{
                __html: previewOrFallback(state.descriptionCa),
              }}
            />
          ) : null}
        </div>

        <div className="mb-5">
          <div className="mb-1 flex items-center justify-between">
            <Label htmlFor="cat-description-es">
              Descripción (ES) — Markdoc
            </Label>
            <button
              className="text-primary text-xs hover:underline"
              onClick={() => setPreviewEs((v) => !v)}
              type="button"
            >
              {previewEs ? 'Amaga la vista prèvia' : 'Mostra la vista prèvia'}
            </button>
          </div>
          <Textarea
            {...fieldAriaProps(
              'cat-description-es-error',
              Boolean(fieldErrors.descriptionEs)
            )}
            id="cat-description-es"
            onChange={(event) =>
              update('descriptionEs', event.currentTarget.value)
            }
            rows={8}
            value={state.descriptionEs}
          />
          {fieldErrors.descriptionEs ? (
            <p
              className="mt-1 text-destructive text-xs"
              id="cat-description-es-error"
              role="alert"
            >
              {fieldErrors.descriptionEs}
            </p>
          ) : null}
          {previewEs ? (
            <div
              className="mt-2 rounded-lg border border-border bg-muted/40 p-4 text-foreground text-sm"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: previewOrFallback() runs Markdoc.renderers.html on volunteer-authored Markdoc (or returns a plain-text Catalan fallback message with no markup), same trust boundary as the public site's renderMarkdoc.
              dangerouslySetInnerHTML={{
                __html: previewOrFallback(state.descriptionEs),
              }}
            />
          ) : null}
        </div>
      </fieldset>

      <fieldset className="mb-8">
        <legend className="mb-3 font-semibold text-foreground text-lg">
          SEO
        </legend>
        <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
          <FormField id="cat-seo-title-ca" label="Meta títol (CA)">
            <Input
              id="cat-seo-title-ca"
              onChange={(event) =>
                update('seoTitleCa', event.currentTarget.value)
              }
              value={state.seoTitleCa}
            />
          </FormField>
          <FormField id="cat-seo-title-es" label="Meta título (ES)">
            <Input
              id="cat-seo-title-es"
              onChange={(event) =>
                update('seoTitleEs', event.currentTarget.value)
              }
              value={state.seoTitleEs}
            />
          </FormField>
          <FormField id="cat-seo-description-ca" label="Meta descripció (CA)">
            <Textarea
              id="cat-seo-description-ca"
              onChange={(event) =>
                update('seoDescriptionCa', event.currentTarget.value)
              }
              value={state.seoDescriptionCa}
            />
          </FormField>
          <FormField id="cat-seo-description-es" label="Meta descripción (ES)">
            <Textarea
              id="cat-seo-description-es"
              onChange={(event) =>
                update('seoDescriptionEs', event.currentTarget.value)
              }
              value={state.seoDescriptionEs}
            />
          </FormField>
        </div>
      </fieldset>

      <fieldset className="mb-8">
        <legend className="mb-3 font-semibold text-foreground text-lg">
          Publicació
        </legend>
        <div className="mb-5">
          <FormField id="cat-sort-order" label="Ordre">
            <Input
              className="w-40"
              id="cat-sort-order"
              onChange={(event) =>
                update('sortOrder', event.currentTarget.value)
              }
              type="number"
              value={state.sortOrder}
            />
          </FormField>
        </div>
        <div className="mb-5 flex flex-wrap gap-6">
          <div className="flex items-center gap-1.5">
            <Checkbox
              checked={state.featured}
              id="cat-featured"
              onCheckedChange={(checked) =>
                update('featured', checked === true)
              }
            />
            <Label className="font-normal" htmlFor="cat-featured">
              Destacat
            </Label>
          </div>
          <div className="flex items-center gap-1.5">
            <Checkbox
              checked={state.published}
              id="cat-published"
              onCheckedChange={(checked) =>
                update('published', checked === true)
              }
            />
            <Label className="font-normal" htmlFor="cat-published">
              Publicat (visible al lloc web)
            </Label>
          </div>
        </div>
      </fieldset>

      <Button disabled={submitting} type="submit">
        {submitting
          ? 'Desant…'
          : mode === 'create'
            ? 'Crea el gat'
            : 'Desa els canvis'}
      </Button>
    </form>
  );
}
