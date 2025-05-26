import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Heart, PawPrintIcon as Paw } from 'lucide-react'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Paw className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">Animals Vida Digna</span>
        </Link>
        <nav className="hidden md:flex gap-6">
          <Link
            href="/#qui-som"
            className="text-sm font-medium hover:text-primary transition-colors"
          >
            Qui som?
          </Link>
          <Link href="#adopta" className="text-sm font-medium hover:text-primary transition-colors">
            Adopta&apos;m
          </Link>
          <Link
            href="/#colabora"
            className="text-sm font-medium hover:text-primary transition-colors"
          >
            Col·labora
          </Link>
          <Link
            href="/#apadrina"
            className="text-sm font-medium hover:text-primary transition-colors"
          >
            Apadrina&apos;m
          </Link>
          <Link
            href="/#colonies"
            className="text-sm font-medium hover:text-primary transition-colors"
          >
            Colònies felines
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <Button variant="secondary" className="hidden md:flex">
            <Heart className="mr-2 h-4 w-4 text-red-500" /> Fes un donatiu
          </Button>
          <Button className="bg-primary hover:bg-primary/80">Adopta ara</Button>
        </div>
      </div>
    </header>
  )
}
