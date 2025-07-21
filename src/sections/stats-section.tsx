export default function StatsSection() {
  return (
    <section className="bg-white py-16 md:py-20">
      <div className="container">
        <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
          <div className="group flex flex-col items-center">
            <div className="mb-3 rounded-full bg-primary/10 p-4 transition-colors group-hover:bg-primary/20">
              <span className="font-bold text-4xl text-primary md:text-5xl">
                250+
              </span>
            </div>
            <span className="font-medium text-muted-foreground text-sm">
              Gats rescatats
            </span>
          </div>
          <div className="group flex flex-col items-center">
            <div className="mb-3 rounded-full bg-primary/10 p-4 transition-colors group-hover:bg-primary/20">
              <span className="font-bold text-4xl text-primary md:text-5xl">
                180+
              </span>
            </div>
            <span className="font-medium text-muted-foreground text-sm">
              Adopcions
            </span>
          </div>
          <div className="group flex flex-col items-center">
            <div className="mb-3 rounded-full bg-primary/10 p-4 transition-colors group-hover:bg-primary/20">
              <span className="font-bold text-4xl text-primary md:text-5xl">
                50+
              </span>
            </div>
            <span className="font-medium text-muted-foreground text-sm">
              Voluntaris
            </span>
          </div>
          <div className="group flex flex-col items-center">
            <div className="mb-3 rounded-full bg-primary/10 p-4 transition-colors group-hover:bg-primary/20">
              <span className="font-bold text-4xl text-primary md:text-5xl">
                10+
              </span>
            </div>
            <span className="font-medium text-muted-foreground text-sm">
              Colònies felines
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
