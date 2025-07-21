import { Heart, PawPrintIcon as Paw } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-border/40 border-b bg-white/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="group flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-1.5 transition-colors group-hover:bg-primary/20">
            <Paw className="h-5 w-5 text-primary" />
          </div>
          <span className="font-bold text-foreground text-xl">
            Animals Vida Digna
          </span>
        </Link>
        <nav className="hidden gap-8 md:flex">
          <Link
            href="/#qui-som"
            className="font-medium text-muted-foreground text-sm transition-colors hover:text-primary"
          >
            Qui som?
          </Link>
          <Link
            href="#adopta"
            className="font-medium text-muted-foreground text-sm transition-colors hover:text-primary"
          >
            Adopta&apos;m
          </Link>
          <Link
            href="/#colabora"
            className="font-medium text-muted-foreground text-sm transition-colors hover:text-primary"
          >
            Col·labora
          </Link>
          <Link
            href="/#apadrina"
            className="font-medium text-muted-foreground text-sm transition-colors hover:text-primary"
          >
            Apadrina&apos;m
          </Link>
          <Link
            href="/#colonies"
            className="font-medium text-muted-foreground text-sm transition-colors hover:text-primary"
          >
            Colònies felines
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="hidden border-primary/20 text-primary hover:bg-primary/5 md:flex"
          >
            <Heart className="mr-2 h-4 w-4" />
            Fes un donatiu
          </Button>
          <Button
            size="sm"
            className="bg-primary shadow-sm hover:bg-primary/90"
          >
            Adopta ara
          </Button>
        </div>
      </div>
    </header>
  );
}
