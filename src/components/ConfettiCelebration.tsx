import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  size: number;
  delay: number;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(142 71% 45%)",   // green
  "hsl(45 93% 58%)",    // gold
  "hsl(280 67% 60%)",   // purple
  "hsl(200 80% 55%)",   // blue
  "hsl(350 80% 60%)",   // pink
];

const ConfettiCelebration = ({ show }: { show: boolean }) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!show) { setParticles([]); return; }
    const p: Particle[] = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10 - Math.random() * 20,
      rotation: Math.random() * 360,
      color: COLORS[i % COLORS.length],
      size: 6 + Math.random() * 6,
      delay: Math.random() * 0.5,
    }));
    setParticles(p);
    const timer = setTimeout(() => setParticles([]), 3000);
    return () => clearTimeout(timer);
  }, [show]);

  return (
    <AnimatePresence>
      {particles.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ x: `${p.x}vw`, y: `${p.y}vh`, rotate: 0, opacity: 1 }}
              animate={{
                y: "110vh",
                rotate: p.rotation + 720,
                opacity: [1, 1, 0],
              }}
              transition={{ duration: 2.2 + Math.random(), delay: p.delay, ease: "easeIn" }}
              style={{
                position: "absolute",
                width: p.size,
                height: p.size * 0.6,
                borderRadius: 2,
                backgroundColor: p.color,
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfettiCelebration;
