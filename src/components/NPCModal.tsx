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
  leftAlignHeader?: boolean;
}

const THEMES = {
  purple: {
    bg: 'bg-purple-950/90',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
    gradient: 'from-purple-950/0 via-[#0B0E14]/80 to-[#0B0E14]',
    iconColor: 'text-purple-500',
    quoteColor: 'text-purple-200/60',
    dividerLineFrom: 'from-transparent to-purple-500/20',
    dividerLineTo: 'from-purple-500/20 to-transparent',
    dividerDiamondBorder: 'border-purple-500/30',
    dividerDiamondBg: 'bg-purple-500/50',
  },
  fuchsia: {
    bg: 'bg-fuchsia-950/90',
    text: 'text-fuchsia-400',
    border: 'border-fuchsia-500/30',
    gradient: 'from-fuchsia-950/0 via-[#0B0E14]/80 to-[#0B0E14]',
    iconColor: 'text-fuchsia-500',
    quoteColor: 'text-fuchsia-200/60',
    dividerLineFrom: 'from-transparent to-fuchsia-500/20',
    dividerLineTo: 'from-fuchsia-500/20 to-transparent',
    dividerDiamondBorder: 'border-fuchsia-500/30',
    dividerDiamondBg: 'bg-fuchsia-500/50',
  },
  rose: {
    bg: 'bg-rose-950/90',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
    gradient: 'from-rose-950/0 via-[#0B0E14]/80 to-[#0B0E14]',
    iconColor: 'text-rose-500',
    quoteColor: 'text-rose-200/60',
    dividerLineFrom: 'from-transparent to-rose-500/20',
    dividerLineTo: 'from-rose-500/20 to-transparent',
    dividerDiamondBorder: 'border-rose-500/30',
    dividerDiamondBg: 'bg-rose-500/50',
  },
  emerald: {
    bg: 'bg-emerald-950/90',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    gradient: 'from-emerald-950/0 via-[#0B0E14]/80 to-[#0B0E14]',
    iconColor: 'text-emerald-500',
    quoteColor: 'text-emerald-200/50',
    dividerLineFrom: 'from-transparent to-emerald-500/20',
    dividerLineTo: 'from-emerald-500/20 to-transparent',
    dividerDiamondBorder: 'border-emerald-500/30',
    dividerDiamondBg: 'bg-emerald-500/50',
  },
  blue: {
    bg: 'bg-blue-950/90',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    gradient: 'from-blue-950/0 via-[#0B0E14]/80 to-[#0B0E14]',
    iconColor: 'text-blue-500',
    quoteColor: 'text-blue-200/60',
    dividerLineFrom: 'from-transparent to-blue-500/20',
    dividerLineTo: 'from-blue-500/20 to-transparent',
    dividerDiamondBorder: 'border-blue-500/30',
    dividerDiamondBg: 'bg-blue-500/50',
  }
};

export const NPCModal: React.FC<NPCModalProps> = ({ 
  isOpen, onClose, npcId, fallbackName, fallbackQuote, overrideName, themeColor, gameState, children, footer, leftAlignHeader
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
                  className="w-full h-full object-cover object-[100%_15%] opacity-85"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full opacity-70 bg-[#050A0F] flex items-center justify-center -mt-32">
                   <div className="flex flex-col items-center gap-4 text-white/30 animate-pulse">
                     <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full border border-white/5 flex items-center justify-center animate-spin" style={{ animationDuration: '3s' }}>
                           <div className={`w-2 h-2 rounded-full ${t.bg} shadow-[0_0_10px_currentColor]`} />
                        </div>
                     </div>
                     <span className="text-xs uppercase tracking-[3px] font-mono">Призыв видения...</span>
                   </div>
                </div>
              )}
              {/* Refined Gradient requested by user */}
              <div 
                className="absolute inset-0 z-10 pointer-events-none" 
                style={{ 
                  background: 'linear-gradient(to bottom, transparent 0%, rgba(5,10,15,0.85) 40%, #050a0f 100%)' 
                }} 
              />
            </div>

            {/* Close Button */}
            <button 
              onClick={onClose} 
              className={`absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all hover:scale-110 active:scale-95`}
            >
              <X size={20} />
            </button>

            {/* Portrait Text Content */}
            <div className={`relative z-20 pt-[25vh] sm:pt-[22vh] flex-shrink-0 flex flex-col ${leftAlignHeader ? 'items-start text-left max-w-[65%] pl-8' : 'items-center text-center px-6 w-full'}`}>
               <h2 className={`text-[1.8rem] sm:text-4xl font-normal text-[#E2E8F0] tracking-[4px] font-serif uppercase leading-[1.1]`} style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                 {npcData.name}
               </h2>
               
               {npcData.name !== (overrideName || fallbackName) && npcData.name !== fallbackName && (
                 <div className={`mt-2 font-serif tracking-[2px] uppercase text-[12px] opacity-80 ${t.iconColor}`}>
                   {overrideName || fallbackName}
                 </div>
               )}
               
               {/* Bottom Decoration line with diamond */}
               <div className={`flex items-center w-[60%] mt-5 mb-4 opacity-70 ${leftAlignHeader ? 'ml-0' : 'mx-auto'}`}>
                 <div className={`flex-1 h-[1px] bg-gradient-to-r ${t.dividerLineFrom}`}></div>
                 <div className={`mx-2 w-2 h-2 rotate-45 border flex items-center justify-center ${t.dividerDiamondBorder}`}>
                    <div className={`w-1 h-1 ${t.dividerDiamondBg}`}></div>
                 </div>
                 <div className={`flex-1 h-[1px] bg-gradient-to-l ${t.dividerLineTo}`}></div>
               </div>
               
               <p className={`${t.quoteColor} text-sm leading-relaxed italic font-serif drop-shadow-md font-light ${leftAlignHeader ? 'pl-0' : 'px-6'}`}>
                 «{npcData.quote}»
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
