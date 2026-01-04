import { MapPin, Star, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const salons = [
  {
    name: "Barbearia do Mestre",
    address: "Rua Augusta, 1500 - Consolação, São Paulo",
    rating: 4.9,
    reviews: 128,
    image: "https://images.unsplash.com/photo-1585747620485-a805f3aaf5e2?auto=format&fit=crop&q=80&w=800",
    openUntil: "20:00",
  },
  {
    name: "Vintage Barber Shop",
    address: "Av. Paulista, 2000 - Bela Vista, São Paulo",
    rating: 4.8,
    reviews: 95,
    image: "https://images.unsplash.com/photo-1503951914290-934c463ca989?auto=format&fit=crop&q=80&w=800",
    openUntil: "21:00",
  },
  {
    name: "Navalha de Ouro",
    address: "Rua Oscar Freire, 500 - Jardins, São Paulo",
    rating: 5.0,
    reviews: 210,
    image: "https://images.unsplash.com/photo-1599351431202-6e0000000000?auto=format&fit=crop&q=80&w=800",
    openUntil: "19:00",
  },
  {
    name: "Gentleman's Club",
    address: "Rua Funchal, 300 - Vila Olímpia, São Paulo",
    rating: 4.7,
    reviews: 84,
    image: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&q=80&w=800",
    openUntil: "22:00",
  },
  {
    name: "Old School Barber",
    address: "Rua dos Pinheiros, 800 - Pinheiros, São Paulo",
    rating: 4.8,
    reviews: 156,
    image: "https://images.unsplash.com/photo-1532710093739-9470acff878f?auto=format&fit=crop&q=80&w=800",
    openUntil: "20:00",
  },
  {
    name: "Barbearia Premium",
    address: "Av. Faria Lima, 4000 - Itaim Bibi, São Paulo",
    rating: 4.9,
    reviews: 312,
    image: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?auto=format&fit=crop&q=80&w=800",
    openUntil: "21:00",
  },
];

export function PartnerSalons() {
  return (
    <section className="py-24 bg-card/50">
      <div className="section-container">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl sm:text-5xl mb-4">
            BARBEARIAS <span className="text-gold-gradient">PARCEIRAS</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Encontre as melhores barbearias perto de você
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {salons.map((salon, index) => (
            <div
              key={index}
              className="group bg-background rounded-2xl overflow-hidden border border-border hover:border-primary/50 transition-all duration-300 card-hover"
            >
              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                <img
                  src={salon.image}
                  alt={salon.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2">
                  <span className="px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm text-xs text-white flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Aberto até {salon.openUntil}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-display text-xl">{salon.name}</h3>
                  <div className="flex items-center gap-1 text-amber-400">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="font-bold text-sm">{salon.rating}</span>
                    <span className="text-muted-foreground text-xs">({salon.reviews})</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-muted-foreground text-sm mb-6">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{salon.address}</span>
                </div>

                <Button className="w-full" variant="outline">
                  Ver Detalhes
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
