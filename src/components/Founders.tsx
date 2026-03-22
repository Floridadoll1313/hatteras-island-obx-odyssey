import React from 'react';
import { motion } from 'motion/react';
import { Anchor, Waves, Compass, Heart, ArrowLeft } from 'lucide-react';

interface FounderProps {
  name: string;
  role: string;
  description: string;
  image: string;
  icon: React.ElementType;
}

const FounderCard = ({ name, role, description, image, icon: Icon }: FounderProps) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="group relative bg-white/5 border border-white/10 rounded-3xl overflow-hidden hover:border-[#00E0FF]/40 transition-all duration-500"
  >
    <div className="aspect-[4/5] overflow-hidden relative">
      <img 
        src={image} 
        alt={name} 
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent opacity-80" />
      <div className="absolute bottom-6 left-6 right-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-lg bg-[#00E0FF]/20 backdrop-blur-md">
            <Icon size={18} className="text-[#00E0FF]" />
          </div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#00E0FF]/80">{role}</span>
        </div>
        <h3 className="text-2xl font-bold text-white tracking-tight">{name}</h3>
      </div>
    </div>
    <div className="p-6">
      <p className="text-sm text-white/60 leading-relaxed italic">
        "{description}"
      </p>
    </div>
  </motion.div>
);

const Founders = ({ onBack }: { onBack: () => void }) => {
  const founders: FounderProps[] = [
    {
      name: "Shannon",
      role: "Island Matriarch & Founder",
      description: "The heart of the Hatteras legacy, Shannon's vision for the OBX Odyssey is rooted in family and the timeless beauty of the coast.",
      image: "https://picsum.photos/seed/shannon/800/1000",
      icon: Anchor
    },
    {
      name: "Victoria",
      role: "Visionary & Navigator",
      description: "Shannon's daughter, joining the crew on April 14th to weave new threads of island lore into our digital tapestry.",
      image: "https://picsum.photos/seed/victoria/800/1000",
      icon: Compass
    },
    {
      name: "Sky Marlin",
      role: "Chief Lookout",
      description: "With eyes as blue as the Atlantic, Sky Marlin keeps a steady watch over the horizon for incoming storms.",
      image: "https://picsum.photos/seed/skymarlin/800/1000",
      icon: Waves
    },
    {
      name: "Stormy Gray",
      role: "Tide Master",
      description: "A soul as deep and mysterious as the gray mists of the Graveyard of the Atlantic.",
      image: "https://picsum.photos/seed/stormygray/800/1000",
      icon: Anchor
    },
    {
      name: "Sailor Ann",
      role: "First Mate",
      description: "Always ready for the next adventure, Sailor Ann brings the spirit of the sea to every discovery.",
      image: "https://picsum.photos/seed/sailorann/800/1000",
      icon: Heart
    }
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-[#00E0FF]/30">
      {/* Hero Section */}
      <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://picsum.photos/seed/hatteras-lighthouse/1920/1080?blur=4" 
            alt="Hatteras Background" 
            className="w-full h-full object-cover opacity-30"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0A0A0A]" />
        </div>

        <div className="relative z-10 text-center px-4">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={onBack}
            className="absolute top-0 left-4 md:left-12 flex items-center gap-2 text-[#00E0FF] hover:text-white transition-colors group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-mono uppercase tracking-widest">Return to Island</span>
          </motion.button>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-4">
              The <span className="text-[#00E0FF]">Founders</span>
            </h1>
            <p className="text-lg md:text-xl text-white/40 font-light max-w-2xl mx-auto italic">
              "The souls who braved the tides to bring the OBX Odyssey to life."
            </p>
          </motion.div>
        </div>
      </section>

      {/* Founders Grid */}
      <section className="max-w-7xl mx-auto px-6 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
          {founders.map((founder, index) => (
            <FounderCard key={index} {...founder} />
          ))}
        </div>

        {/* Story Section */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="mt-32 p-12 rounded-3xl border border-white/5 bg-white/[0.02] text-center max-w-4xl mx-auto"
        >
          <h2 className="text-3xl font-bold mb-8 tracking-tight">Our Island Story</h2>
          <div className="space-y-6 text-white/60 leading-relaxed font-light">
            <p>
              Born from a love for the shifting sands and the rhythmic pulse of the Atlantic, 
              Hatteras Island: OBX Odyssey was created to preserve the magic of the Outer Banks.
            </p>
            <p>
              Shannon, the matriarch of this coastal legacy, has long envisioned a way to share the spirit of the island with the world. 
              Her daughter Victoria is set to join the mission on April 14th, bringing fresh energy and a shared passion for the sea.
            </p>
            <p>
              Together with their faithful companions Sky Marlin, Stormy Gray, and Sailor Ann, 
              they explore the reaches from Pea Island to Ocracoke, 
              gathering the fragments of history that now form this digital sanctuary.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 text-center">
        <div className="flex justify-center gap-6 mb-6">
          <Anchor size={20} className="text-white/20" />
          <Waves size={20} className="text-white/20" />
          <Compass size={20} className="text-white/20" />
        </div>
        <p className="text-[10px] font-mono text-white/20 uppercase tracking-[0.3em]">
          Hatteras Island Legacy &copy; 2026
        </p>
      </footer>
    </div>
  );
};

export default Founders;
