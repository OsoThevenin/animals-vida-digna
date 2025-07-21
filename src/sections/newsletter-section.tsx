import { Button } from '@/components/ui/button';

export default function NewsletterSection() {
  return (
    <section className="py-12 md:py-16">
      <div className="container">
        <div className="rounded-lg bg-primary p-8 text-white md:p-12">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <h2 className="mb-4 font-bold text-3xl">Mantén-te Informat</h2>
              <p className="mb-0">
                Subscriu-te al nostre butlletí per rebre actualitzacions sobre
                gats en adopció, esdeveniments i notícies de la protectora.
              </p>
            </div>
            <div>
              <form className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="email"
                  placeholder="La teva adreça de correu"
                  className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-black text-sm ring-offset-background file:border-0 file:bg-transparent file:font-medium file:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <Button className="bg-white text-primary hover:bg-muted">
                  Subscriu-te
                </Button>
              </form>
              <p className="mt-2 text-sm">
                Respectem la teva privacitat. Cancel·la la subscripció en
                qualsevol moment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
