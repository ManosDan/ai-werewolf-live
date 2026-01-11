import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimationType, AnimationEvent } from '../types';

// --- VFX SUB-COMPONENTS ---

// 1. Potion Effect (Witch)
const PotionEffect = () => {
  // Generate random particles
  const particles = Array.from({ length: 12 }).map((_, i) => ({
    x: (Math.random() - 0.5) * 200,
    y: (Math.random() - 0.5) * 200,
    scale: Math.random() * 0.5 + 0.5,
    delay: Math.random() * 0.2
  }));

  return (
    <div className="relative flex items-center justify-center">
      {/* Bottle Throw & Shatter */}
      <motion.div
        initial={{ y: 200, rotate: 0, opacity: 0, scale: 0.5 }}
        animate={{ 
           y: [200, -50, 0], 
           rotate: [0, 360, 720], 
           opacity: [0, 1, 0], 
           scale: [0.5, 1.2, 2] 
        }}
        transition={{ duration: 0.8, times: [0, 0.6, 1] }}
        className="text-8xl z-10 filter drop-shadow-[0_0_20px_rgba(168,85,247,0.8)]"
      >
        🧪
      </motion.div>

      {/* Explosion Particles */}
      {particles.map((p, i) => (
         <motion.div
            key={i}
            className="absolute w-4 h-4 rounded-full bg-fuchsia-400 blur-sm"
            initial={{ opacity: 0, x: 0, y: 0 }}
            animate={{ opacity: [0, 1, 0], x: p.x, y: p.y }}
            transition={{ delay: 0.6 + p.delay, duration: 0.8, ease: "easeOut" }}
         />
      ))}
      
      {/* Gas Cloud */}
      <motion.div 
         className="absolute w-64 h-64 bg-green-500/30 rounded-full blur-3xl mix-blend-screen"
         initial={{ scale: 0, opacity: 0 }}
         animate={{ scale: 2, opacity: [0, 0.6, 0] }}
         transition={{ delay: 0.6, duration: 1.5 }}
      />
    </div>
  );
};

// 2. Gun Effect (Hunter)
const GunEffect = () => {
  return (
    <div className="relative flex items-center justify-center">
       {/* Scope Crosshair */}
       <motion.div
         initial={{ scale: 3, opacity: 0, rotate: 45 }}
         animate={{ scale: 1, opacity: 1, rotate: 0 }}
         exit={{ opacity: 0, scale: 0.8 }}
         transition={{ duration: 0.5, type: "spring" }}
         className="absolute border-2 border-red-500 rounded-full w-64 h-64 flex items-center justify-center z-10"
       >
          <div className="absolute w-full h-[1px] bg-red-500/50"></div>
          <div className="absolute h-full w-[1px] bg-red-500/50"></div>
          <motion.div 
             className="w-2 h-2 bg-red-500 rounded-full box-shadow-[0_0_10px_red]"
             animate={{ opacity: [0.5, 1, 0.5] }}
             transition={{ repeat: Infinity, duration: 0.5 }}
          />
       </motion.div>

       {/* Muzzle Flash */}
       <motion.div
         className="absolute text-9xl text-yellow-300 filter drop-shadow-[0_0_50px_orange]"
         initial={{ opacity: 0, scale: 0.5 }}
         animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 2] }}
         transition={{ delay: 0.8, duration: 0.2 }}
       >
         💥
       </motion.div>

       {/* Screen Shake Simulator (White Flash) */}
       <motion.div 
          className="fixed inset-0 bg-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.8, 0] }}
          transition={{ delay: 0.8, duration: 0.1 }}
       />
    </div>
  );
};

// 3. Claw Effect (Werewolf)
const ClawEffect = () => {
   return (
     <div className="relative w-96 h-96 flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
            {/* 3 Slash Lines */}
            {[0, 1, 2].map((i) => (
                <motion.path
                   key={i}
                   d={`M${20 + i * 20},10 Q${40 + i * 20},50 ${30 + i * 20},90`}
                   stroke="#ef4444"
                   strokeWidth="8"
                   strokeLinecap="round"
                   fill="none"
                   initial={{ pathLength: 0, opacity: 0 }}
                   animate={{ pathLength: 1, opacity: 1 }}
                   transition={{ delay: i * 0.1, duration: 0.2, ease: "easeOut" }}
                   className="drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]"
                />
            ))}
        </svg>
        
        {/* Blood Splatter Particles */}
        {Array.from({length: 8}).map((_, i) => (
            <motion.div 
               key={i}
               className="absolute w-3 h-3 bg-red-600 rounded-full"
               initial={{ x: 0, y: 0, scale: 0 }}
               animate={{ 
                   x: (Math.random() - 0.5) * 150,
                   y: (Math.random() - 0.5) * 150,
                   scale: [0, 1, 0]
               }}
               transition={{ delay: 0.3, duration: 0.6 }}
            />
        ))}
     </div>
   );
};

// 4. Seer Effect (Seer)
const SeerEffect = () => {
    return (
        <div className="relative flex items-center justify-center">
            {/* Eye Opening */}
            <motion.div
               initial={{ scaleY: 0 }}
               animate={{ scaleY: 1 }}
               transition={{ duration: 0.5, type: "spring" }}
               className="text-8xl filter drop-shadow-[0_0_30px_rgba(168,85,247,0.8)]"
            >
                👁️
            </motion.div>

            {/* Ripples */}
            {[1, 2, 3].map(i => (
                <motion.div 
                   key={i}
                   className="absolute border border-purple-400 rounded-full"
                   style={{ width: 100, height: 100 }}
                   initial={{ scale: 1, opacity: 0.8 }}
                   animate={{ scale: 3, opacity: 0 }}
                   transition={{ delay: i * 0.3, duration: 1.5, repeat: Infinity }}
                />
            ))}
        </div>
    );
};

// 5. Shield Effect (Guard)
const ShieldEffect = () => {
    return (
        <div className="relative flex items-center justify-center">
             <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 10 }}
                className="text-9xl z-10"
             >
                🛡️
             </motion.div>
             <motion.div 
                className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl"
                initial={{ scale: 0 }}
                animate={{ scale: 2, opacity: [0.5, 0] }}
                transition={{ duration: 1 }}
             />
             <motion.div 
                 className="absolute w-[120%] h-[120%] border-4 border-blue-400 rounded-full opacity-50"
                 animate={{ rotate: 360 }}
                 transition={{ duration: 3, ease: "linear", repeat: Infinity }}
             />
        </div>
    );
};

const AnimationLayer = ({ animation, onDismiss }: { animation: AnimationEvent | null, onDismiss?: () => void }) => {
  if (!animation) return null;

  let EffectComponent = null;
  let textColor = "text-white";

  switch (animation.type) {
      case 'POTION':
          EffectComponent = <PotionEffect />;
          textColor = "text-fuchsia-300";
          break;
      case 'GUN':
          EffectComponent = <GunEffect />;
          textColor = "text-amber-500";
          break;
      case 'CLAW':
          EffectComponent = <ClawEffect />;
          textColor = "text-red-500";
          break;
      case 'SEER':
          EffectComponent = <SeerEffect />;
          textColor = "text-purple-300";
          break;
      case 'SHIELD':
          EffectComponent = <ShieldEffect />;
          textColor = "text-blue-300";
          break;
      case 'VOTE':
          EffectComponent = <div className="text-8xl animate-bounce">🗳️</div>;
          textColor = "text-slate-300";
          break;
      case 'SHERIFF':
          EffectComponent = <motion.div initial={{scale:0}} animate={{scale:1, rotate: [0, -10, 10, 0]}} className="text-9xl drop-shadow-xl">🤠</motion.div>;
          textColor = "text-amber-400";
          break;
      case 'DAY_NIGHT':
          EffectComponent = <motion.div animate={{ rotate: 360 }} transition={{duration: 20, repeat: Infinity}} className="text-9xl opacity-80">🌗</motion.div>;
          break;
      default:
          break;
  }

  return (
    <AnimatePresence>
      <motion.div 
          // 🔥 Updated: Allow dismissal by clicking
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-[2px] cursor-pointer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDismiss}
        >
          <div className="text-center relative pointer-events-none">
              {/* Effect Container */}
              <div className="mb-8 flex justify-center items-center h-64 w-64 mx-auto relative">
                 {EffectComponent}
              </div>

              <motion.div 
                className={`text-5xl md:text-6xl font-black tracking-[0.2em] uppercase ${textColor}`}
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                  <span className="drop-shadow-2xl filter">
                     {animation.text || 'Action...'}
                  </span>
              </motion.div>
          </div>
        </motion.div>
    </AnimatePresence>
  );
};

export default AnimationLayer;