import { Button } from '@/components/ui/button'

export default function NewsletterSection() {
  return (
    <section className="py-12 md:py-16">
      <div className="container">
        <div className="bg-primary rounded-lg p-8 md:p-12 text-white">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Mantén-te Informat</h2>
              <p className="mb-0">
                Subscriu-te al nostre butlletí per rebre actualitzacions sobre gats en adopció,
                esdeveniments i notícies de la protectora.
              </p>
            </div>
            <div>
              <form className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  placeholder="La teva adreça de correu"
                  className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-black ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <Button className="bg-white text-primary hover:bg-muted">Subscriu-te</Button>
              </form>
              <p className="text-sm mt-2">
                Respectem la teva privacitat. Cancel·la la subscripció en qualsevol moment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
