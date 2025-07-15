export default function StatsSection() {
  return (
    <section className="bg-white py-16 md:py-20">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div className="flex flex-col items-center group">
            <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors mb-3">
              <span className="text-4xl md:text-5xl font-bold text-primary">250+</span>
            </div>
            <span className="text-sm text-muted-foreground font-medium">Gats rescatats</span>
          </div>
          <div className="flex flex-col items-center group">
            <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors mb-3">
              <span className="text-4xl md:text-5xl font-bold text-primary">180+</span>
            </div>
            <span className="text-sm text-muted-foreground font-medium">Adopcions</span>
          </div>
          <div className="flex flex-col items-center group">
            <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors mb-3">
              <span className="text-4xl md:text-5xl font-bold text-primary">50+</span>
            </div>
            <span className="text-sm text-muted-foreground font-medium">Voluntaris</span>
          </div>
          <div className="flex flex-col items-center group">
            <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors mb-3">
              <span className="text-4xl md:text-5xl font-bold text-primary">10+</span>
            </div>
            <span className="text-sm text-muted-foreground font-medium">Colònies felines</span>
          </div>
        </div>
      </div>
    </section>
  )
}
