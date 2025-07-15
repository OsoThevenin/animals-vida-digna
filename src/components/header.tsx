import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Heart, PawPrintIcon as Paw } from 'lucide-react'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-sm">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="p-1.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <Paw className="h-5 w-5 text-primary" />
          </div>
          <span className="text-xl font-bold text-foreground">Animals Vida Digna</span>
        </Link>
        <nav className="hidden md:flex gap-8">
          <Link
            href="/#qui-som"
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            Qui som?
          </Link>
          <Link
            href="#adopta"
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            Adopta&apos;m
          </Link>
          <Link
            href="/#colabora"
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            Col·labora
          </Link>
          <Link
            href="/#apadrina"
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            Apadrina&apos;m
          </Link>
          <Link
            href="/#colonies"
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            Colònies felines
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="hidden md:flex border-primary/20 text-primary hover:bg-primary/5"
          >
            <Heart className="mr-2 h-4 w-4" />
            Fes un donatiu
          </Button>
          <Button size="sm" className="bg-primary hover:bg-primary/90 shadow-sm">
            Adopta ara
          </Button>
        </div>
      </div>
    </header>
  )
}
