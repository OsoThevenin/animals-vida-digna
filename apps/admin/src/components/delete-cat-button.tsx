import { actions } from 'astro:actions';
import { useState } from 'react';
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

export interface DeleteCatButtonProps {
  catId: string;
  catName: string;
}

export default function DeleteCatButton({
  catId,
  catName,
}: DeleteCatButtonProps) {
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    setError('');
    const { error: actionError } = await actions.cats.delete({ id: catId });
    if (actionError) {
      setDeleting(false);
      setError(actionError.message || "No s'ha pogut eliminar el gat.");
      return;
    }
    window.location.assign('/cats');
  }

  return (
    <div>
      {error ? (
        <p className="mb-2 text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            aria-label={`Elimina el gat «${catName}»`}
            className="w-full"
            disabled={deleting}
            type="button"
            variant="destructive"
          >
            {deleting ? 'Eliminant…' : 'Elimina el gat'}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar «{catName}»?</AlertDialogTitle>
            <AlertDialogDescription>
              Aquesta acció no es pot desfer. S'eliminaran el gat i totes les
              seves fotos de forma permanent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel·la</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} variant="destructive">
              Elimina el gat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
