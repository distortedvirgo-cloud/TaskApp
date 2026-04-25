import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface NPCModalProps {
  isOpen: boolean;
  onClose: () => void;
  npcId: 'shop' | 'fortune' | 'altar' | 'beast' | 'expedition';
  fallbackName: string;
  fallbackQuote: string;
  overrideName?: string;
  themeColor: 'purple' | 'fuchsia' | 'rose' | 'emerald' | 'blue';
  gameState: any; // Using any for brevity here
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const THEMES = {
  purple: {
    bg: 'bg-purple-950/90',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
    gradient: 'from-purple-950/0 via-[#0B0E14]/80 to-[#0B0E14]',
    iconColor: 'text-purple-500',
  },
  fuchsia: {
    bg: 'bg-fuchsia-950/90',
    text: 'text-fuchsia-400',
    border: 'border-fuchsia-500/30',
    gradient: 'from-fuchsia-950/0 via-[#0B0E14]/80 to-[#0B0E14]',
    iconColor: 'text-fuchsia-500',
  },
  rose: {
    bg: 'bg-rose-950/90',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
    gradient: 'from-rose-950/0 via-[#0B0E14]/80 to-[#0B0E14]',
    iconColor: 'text-rose-500',
  },
  emerald: {
    bg: 'bg-emerald-950/90',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    gradient: 'from-emerald-950/0 via-[#0B0E14]/80 to-[#0B0E14]',
    iconColor: 'text-emerald-500',
  },
  blue: {
    bg: 'bg-blue-950/90',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    gradient: 'from-blue-950/0 via-[#0B0E14]/80 to-[#0B0E14]',
    iconColor: 'text-blue-500',
  }
};

export const NPCModal: React.FC<NPCModalProps> = ({ 
  isOpen, onClose, npcId, fallbackName, fallbackQuote, overrideName, themeColor, gameState, children, footer
}) => {
  const t = THEMES[themeColor];
  
  const npcData = gameState.chronicle?.season_info?.npcs?.[npcId] || {
    name: fallbackName,
    quote: fallbackQuote
  };

  const displayName = overrideName || npcData.name;
  const imageUrl = npcData.imageUrl;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-md`}
          onClick={onClose}
        >
          <motion.div 
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`w-full h-full sm:h-[90vh] sm:max-w-md sm:rounded-3xl shadow-2xl relative overflow-hidden bg-[#0B0E14] border-0 sm:border ${t.border} flex flex-col`}
            onClick={e => e.stopPropagation()}
          >
            {/* Background Image Area */}
            <div className="absolute inset-0 z-0">
              {imageUrl ? (
                <img 
                  src={imageUrl} 
                  alt={npcData.name} 
                  className="w-full h-full object-cover object-top opacity-70"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full opacity-70 bg-[#0B0E14]" />
              )}
              <div className={`absolute inset-0 bg-gradient-to-b from-transparent via-[#0B0E14]/80 to-[#0B0E14] z-10 pointer-events-none`} />
              <div className={`absolute inset-0 bg-gradient-to-t ${t.gradient} z-10 pointer-events-none opacity-40`} />
            </div>

            {/* Close Button */}
            <button 
              onClick={onClose} 
              className={`absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors`}
            >
              <X size={20} />
            </button>

            {/* Portrait Text Content */}
            <div className="relative z-20 px-6 pt-[22vh] sm:pt-[18vh] flex-shrink-0 flex flex-col items-start w-[75%]">
               {/* Top Decoration */}
               <svg className={`mb-3 w-6 h-6 ${t.iconColor} opacity-70`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                 <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
               </svg>
               
               <h2 className={`text-[2rem] sm:text-4xl font-normal text-slate-100 tracking-widest font-serif uppercase leading-[1.1] drop-shadow-xl text-left`}>
                 {displayName.split(' ').map((word: string, i: number) => (
                   <React.Fragment key={i}>
                     {word}
                     {i !== displayName.split(' ').length - 1 && <br />}
                   </React.Fragment>
                 ))}
               </h2>
               
               {/* Bottom Decoration line */}
               <div className="flex items-center w-full mt-3 mb-4 opacity-50">
                 <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent to-white/50"></div>
                 <div className="mx-2 w-1.5 h-1.5 rotate-45 bg-white/70"></div>
                 <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent to-white/50"></div>
               </div>
               
               <p className="text-slate-200/90 text-sm leading-relaxed italic font-serif text-left drop-shadow-md">
                 "{npcData.quote}"
               </p>
            </div>

            {/* Scrollable Content Area */}
            <div className="relative z-20 mt-4 flex-1 overflow-y-auto px-5 pb-6 pt-2 min-h-0 container-scrollbar w-full flex flex-col items-center">
               {children}
            </div>

            {/* Fixed Footer */}
            {footer && (
              <div className="relative z-20 w-full px-5 pb-4 sm:pb-5 pt-2 bg-[#0B0E14]/90 backdrop-blur-md border-t border-white/5 mt-auto">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
