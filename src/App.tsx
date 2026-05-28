/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Sword, CheckCircle, Circle, Plus, Trash2, Trophy, Skull, User, Flame, Target, Shield, Book, Heart, Zap, Clock, AlertCircle, Settings, Bot, X, Loader2, RefreshCw, AlertTriangle, Download, HelpCircle, ChevronUp, ChevronDown, ChevronRight, Eye, ShoppingBag, Coins, Map, Store, Tent, Dna, Compass, Bookmark } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { evaluateTaskWithAI, evaluateTasksBatchWithAI, generateAICampaign, generateAIImage, generateAITrophy, getOpenAIClient, generateDailyMemoryLog, updateBehaviorAnalytics, regenerateAITown, generateChronicleVictory, generateMasterBalanceTasks, generateAllBossBanter } from './lib/ai';
import { NPCModal } from './components/NPCModal';

export type StatType = 'strength' | 'intelligence' | 'charisma' | 'willpower' | 'unknown';

const STATS: Record<StatType, { name: string; icon: React.ElementType; color: string; bg: string; hex: string }> = {
  strength: { name: 'Сила', icon: Sword, color: 'text-[#FF2A55]', bg: 'bg-[#FF2A55]', hex: '#FF2A55' },
  intelligence: { name: 'Интеллект', icon: Book, color: 'text-[#00F0FF]', bg: 'bg-[#00F0FF]', hex: '#00F0FF' },
  charisma: { name: 'Харизма', icon: Heart, color: 'text-[#B500FF]', bg: 'bg-[#B500FF]', hex: '#B500FF' },
  willpower: { name: 'Воля', icon: Shield, color: 'text-[#00FF66]', bg: 'bg-[#00FF66]', hex: '#00FF66' },
  unknown: { name: 'Авто', icon: HelpCircle, color: 'text-slate-400', bg: 'bg-slate-400', hex: '#94a3b8' }
};

const THEME_COLORS = {
  slate: {
    text: 'text-slate-300',
    border: 'border-slate-500/30',
    bg: 'bg-slate-400',
    bgTransparent: 'bg-slate-500/10',
    shadow: 'shadow-[0_0_20px_rgba(148,163,184,0.15)]',
    dropShadow: 'drop-shadow-[0_0_8px_rgba(148,163,184,0.5)]',
    gradient: 'from-slate-400 to-slate-800'
  },
  emerald: {
    text: 'text-emerald-400',
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-400',
    bgTransparent: 'bg-emerald-500/10',
    shadow: 'shadow-[0_0_20px_rgba(52,211,153,0.15)]',
    dropShadow: 'drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]',
    gradient: 'from-emerald-400 to-emerald-800'
  },
  rose: {
    text: 'text-rose-400',
    border: 'border-rose-500/40',
    bg: 'bg-rose-400',
    bgTransparent: 'bg-rose-500/10',
    shadow: 'shadow-[0_0_20px_rgba(251,113,133,0.15)]',
    dropShadow: 'drop-shadow-[0_0_8px_rgba(251,113,133,0.5)]',
    gradient: 'from-rose-400 to-rose-800'
  },
  amber: {
    text: 'text-amber-400',
    border: 'border-amber-500/40',
    bg: 'bg-amber-400',
    bgTransparent: 'bg-amber-500/10',
    shadow: 'shadow-[0_0_20px_rgba(251,191,36,0.15)]',
    dropShadow: 'drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]',
    gradient: 'from-amber-400 to-amber-800'
  },
  blue: {
    text: 'text-blue-400',
    border: 'border-blue-500/40',
    bg: 'bg-blue-400',
    bgTransparent: 'bg-blue-500/10',
    shadow: 'shadow-[0_0_20px_rgba(96,165,250,0.15)]',
    dropShadow: 'drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]',
    gradient: 'from-blue-400 to-blue-800'
  },
  purple: {
    text: 'text-purple-400',
    border: 'border-purple-500/40',
    bg: 'bg-purple-400',
    bgTransparent: 'bg-purple-500/10',
    shadow: 'shadow-[0_0_20px_rgba(192,132,252,0.15)]',
    dropShadow: 'drop-shadow-[0_0_8px_rgba(192,132,252,0.5)]',
    gradient: 'from-purple-400 to-purple-800'
  },
  cyan: {
    text: 'text-cyan-400',
    border: 'border-cyan-500/40',
    bg: 'bg-cyan-400',
    bgTransparent: 'bg-cyan-500/10',
    shadow: 'shadow-[0_0_20px_rgba(34,211,238,0.15)]',
    dropShadow: 'drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]',
    gradient: 'from-cyan-400 to-cyan-800'
  }
};

export type TaskType = 'one-off' | 'daily' | 'weekly' | 'recurring';

export type Task = {
  id: string;
  text: string;
  stat: StatType;
  type: TaskType;
  targetDay?: number;
  repeatIntervalDays?: number;
  completed: boolean;
  rewarded: boolean;
  createdAt: number;
  lastCompletedAt?: number;
  availableAt?: number;
  isMasterTask?: boolean;
  difficulty?: number; // 1-5
  subtasks?: { id: string; text: string; completed: boolean }[];
};

export type ShopItem = {
  name: string;
  lore: string;
  effect: {
    type: 'damage_boss' | 'player_xp' | 'pet_food' | 'pet_revive' | 'stat_xp';
    targetStat?: 'strength' | 'intelligence' | 'charisma' | 'willpower';
    value: number;
  };
  rarity: 'gray' | 'blue' | 'purple' | 'gold';
  price: number;
};

export type Trophy = {
  id: string;
  name: string;
  description: string;
  icon: string;
  imageUrl?: string;
  imagePrompt?: string;
  effect: {
    type: 'xp_boost' | 'damage_boost' | 'boss_hp_reduction';
    targetStat?: StatType;
    value: number;
  };
};

export interface MasterQuest {
  stat: StatType;
  target: number;
  current: number;
}

export interface ChronicleVictory {
  title: string;
  story: string;
  imagePrompt: string;
  imageUrl?: string;
}

export type HeroChronicle = {
  season_info?: {
    name: string;
    setting_lore: string;
    total_campaigns: number;
    current_campaign: number;
    city_background_url?: string;
    city_background_prompt?: string;
    npcs?: {
      shop?: { name: string, quote: string, imagePrompt: string, imageUrl?: string };
      fortune?: { name: string, quote: string, imagePrompt: string, imageUrl?: string };
      altar?: { name: string, quote: string, imagePrompt: string, imageUrl?: string };
      beast?: { name: string, quote: string, imagePrompt: string, imageUrl?: string };
      expedition?: { name: string, quote: string, imagePrompt: string, imageUrl?: string };
    };
  };
  behavior_analytics: {
    favorite_stat: StatType | 'unknown';
    weakest_stat: StatType | 'unknown';
    ignored_tasks_patterns: string[];
    preferred_tasks_patterns: string[];
    completion_rate_avg: number;
  };
  campaign_history: {
    bosses_defeated: number;
    bosses_escaped: number;
    nemesis: string | null;
    current_lore_arc: string;
  };
  recent_memory_log: string[];
  master_summary: string;
};

export type Familiar = {
  name: string;
  type: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  stage: 'egg' | 'baby' | 'evolved' | 'ultra';
  status: 'active' | 'injured' | 'expedition';
  injuredUntil?: number;
  expeditionEndsAt?: number;
  imageUrl?: string;
  xp: number;
  level: number;
};

export type Player = {
  level: number;
  xp: number;
  gold: number;
  combo: number;
  lastComboUpdate?: number;
  pendingDamage: Record<StatType, number>;
  stats: Record<StatType, { level: number; xp: number }>;
  inventory: Trophy[];
  weeklyProductivity: number[]; // Track total points per week for dynamic difficulty
  dailyGrossPoints?: number;
  dailyTasksCompleted?: number;
  dailyPointsHistory?: Record<string, number>; // YYYY-MM-DD -> points
  playerClass?: string;
  familiar?: Familiar;
};

export type ImageJob = {
  id: string;
  type: 'city' | 'npc' | 'enemy' | 'trophy' | 'map';
  targetId: string; 
  prompt: string;
  aspectRatio: string;
  status: 'pending' | 'processing' | 'failed';
  retryCount: number;
};

export type Boss = {
  id: string;
  level: number;
  name: string;
  description: string;
  hp: number;
  maxHp: number;
  expiresAt: number;
  multipliers: Record<StatType, number>;
  isMiniBoss: boolean;
  imageUrl?: string;
  imagePrompt?: string;
  avatarEmoji?: string;
  defeated: boolean;
  escaped?: boolean;
  isNemesis?: boolean;
  dropTrophy?: Trophy;
  banter?: Record<string, any>;
};

export type Campaign = {
  id: string;
  theme: string;
  colorTheme?: 'slate' | 'emerald' | 'rose' | 'amber' | 'blue' | 'purple' | 'cyan';
  mapUrl?: string;
  mapPrompt?: string;
  enemies: Boss[];
  currentEnemyIndex: number;
  deadline: number;
  itemPool?: ShopItem[];
};

export type AISettings = {
  apiKey: string;
  baseUrl: string;
  model: string;
  imageModel: string;
  developerMode?: boolean;
  enableImages?: boolean;
  useGeminiMode?: boolean;
  geminiApiKey?: string;
};

const MYTH_BOSSES = [
  { name: "Цербер", description: "Трехголовый пес, страж Аида. Не дает мертвым покинуть подземный мир, а живым — войти в него. Победите его, чтобы доказать свою силу и бесстрашие.", avatarEmoji: "🐕" },
  { name: "Минотавр", description: "Чудовище с телом человека и головой быка, запертое в Лабиринте. Олицетворяет слепую ярость и животные инстинкты. Одолейте его, чтобы обрести ясность ума.", avatarEmoji: "🐂" },
  { name: "Медуза Горгона", description: "Монстр со змеями вместо волос, чей взгляд обращает в камень. Символ парализующего страха. Победите ее, чтобы преодолеть свои внутренние преграды.", avatarEmoji: "🐍" },
  { name: "Вендиго", description: "Злой дух зимы и голода из индейской мифологии. Олицетворяет ненасытность и жадность. Уничтожьте его, чтобы обрести гармонию и умеренность.", avatarEmoji: "❄️" },
  { name: "Они", description: "Свирепый демон из японской мифологии, приносящий беды и разрушения. Победите его, чтобы защитить свой внутренний мир от негативных мыслей.", avatarEmoji: "👹" },
  { name: "Кракен", description: "Легендарное морское чудовище, топящее корабли. Символизирует непреодолимые жизненные обстоятельства. Одолейте его, чтобы взять судьбу в свои руки.", avatarEmoji: "🦑" },
  { name: "Мантикора", description: "Чудовище с телом льва, головой человека и хвостом скорпиона. Олицетворяет коварство и скрытую угрозу. Победите ее, чтобы развить бдительность.", avatarEmoji: "🦂" },
  { name: "Химера", description: "Огнедышащее чудовище с головой льва, телом козы и хвостом змеи. Символ несбыточных иллюзий. Уничтожьте ее, чтобы научиться видеть истину.", avatarEmoji: "🐉" },
  { name: "Бафомет", description: "Древний демон, олицетворяющий хаос и искушение. Победите его, чтобы укрепить свою волю и не поддаваться слабостям.", avatarEmoji: "🐐" },
  { name: "Азазель", description: "Падший ангел, научивший людей войне и обману. Одолейте его, чтобы очистить свой разум от разрушительных мыслей.", avatarEmoji: "🦇" },
  { name: "Вельзевул", description: "Повелитель мух, демон гордыни и тщеславия. Победите его, чтобы обрести истинную скромность и мудрость.", avatarEmoji: "🪰" },
  { name: "Левиафан", description: "Морской змей, воплощение первобытного хаоса. Одолейте его, чтобы навести порядок в своей жизни и мыслях.", avatarEmoji: "🌊" },
  { name: "Аматерасу", description: "Богиня солнца, скрывшаяся в пещере и лишившая мир света. Верните ее, чтобы вновь обрести радость и вдохновение.", avatarEmoji: "☀️" },
  { name: "Ёрмунганд", description: "Мировой змей, опоясывающий землю. Символ бесконечного цикла проблем. Победите его, чтобы разорвать порочный круг.", avatarEmoji: "🐍" },
  { name: "Фенрир", description: "Огромный волк, предвестник конца света. Олицетворяет неконтролируемую ярость. Одолейте его, чтобы научиться управлять своими эмоциями.", avatarEmoji: "🐺" }
];

const generateBoss = (playerLevel: number, dailyPointsHistory: Record<string, number> = {}, inventory: Trophy[] = [], isMiniBoss: boolean = false, nemesis?: Boss): Boss => {
  const now = new Date();
  
  if (nemesis && !isMiniBoss) {
    const expirationDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 6, 23, 59, 59, 999);
    return {
      ...nemesis,
      id: crypto.randomUUID(),
      level: playerLevel,
      name: `Мстительный ${nemesis.name}`,
      hp: Math.floor(nemesis.maxHp * 1.5),
      maxHp: Math.floor(nemesis.maxHp * 1.5),
      expiresAt: expirationDate.getTime(),
      isNemesis: true,
      defeated: false
    };
  }

  const bossData = MYTH_BOSSES[Math.floor(Math.random() * MYTH_BOSSES.length)];
  
  // Calculate dynamic HP based on last 14 days
  let avgProductivity = 200; // Default Weekly_Base_Power
  const historyValues = Object.values(dailyPointsHistory);
  if (historyValues.length > 0) {
    // Get up to last 14 days
    const recentDays = historyValues.slice(-14);
    const sum = recentDays.reduce((a, b) => a + b, 0);
    avgProductivity = sum / 2; // Weekly_Base_Power
  }
  
  let hpReduction = 0;
  inventory.forEach(trophy => {
    if (trophy.effect.type === 'boss_hp_reduction') {
      hpReduction += trophy.effect.value;
    }
  });

  const finalMultiplier = Math.max(0.1, 1.15 - hpReduction); // Boss is 15% stronger than average
  const maxHp = isMiniBoss ? Math.floor((avgProductivity * 0.3) * finalMultiplier) : Math.floor(avgProductivity * finalMultiplier);
  
  // Generate random multipliers (one vulnerability x1.5, optionally one resistance x0.5)
  const stats: StatType[] = ['strength', 'intelligence', 'charisma', 'willpower'];
  const multipliers: Record<StatType, number> = {
    strength: 1, intelligence: 1, charisma: 1, willpower: 1, unknown: 1
  };
  
  // Pick one weakness
  const weakness = stats[Math.floor(Math.random() * stats.length)];
  multipliers[weakness] = 1.5;

  // Optionally pick one resistance (50% chance)
  if (Math.random() > 0.5) {
    let resistance = stats[Math.floor(Math.random() * stats.length)];
    while (resistance === weakness) {
      resistance = stats[Math.floor(Math.random() * stats.length)];
    }
    multipliers[resistance] = 0.5;
  }
  
  // ensure unknown exists for TS compliance
  multipliers['unknown'] = 1;

  const daysToAdd = isMiniBoss ? 1 : 6;
  const expirationDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysToAdd, 23, 59, 59, 999);

  const getLocalBossBanter = (bossName: string) => {
    const lowerName = bossName.toLowerCase();
    const isLeviathan = lowerName.includes("левиафан") || lowerName.includes("кракен") || lowerName.includes("цербер");
    const isAmaterasu = lowerName.includes("аматерасу") || lowerName.includes("бафомет") || lowerName.includes("химера");
    const isJormungand = lowerName.includes("ёрмунганд") || lowerName.includes("минотавр") || lowerName.includes("медуза");

    if (isLeviathan) {
      return {
        high: {
          strength: "Глупец! Твоя сталь лишь царапает мою вековую океанскую защиту!",
          intelligence: "Твои плетения разума рассеиваются в бесконечном течении пучины!",
          charisma: "Твои сладкие речи заглушаются ревом прилива. Море безмолвно!",
          willpower: "Твое превозмогание — лишь мелкая волна перед моим вечным давлением!"
        },
        medium: {
          strength: "*Морщится, когда вода вскипает:* Ты крепче, чем кажешься... Мои волны вздымаются!",
          intelligence: "*Воет от боли разума:* Твои мантры проникают сквозь бездну! Это жалко ранит меня!",
          charisma: "*Разъяренно шипит:* Твой голос будоражит мои глубины! Замолчи, смертный!",
          willpower: "*Пошатываясь среди волн:* Твоя стальная воля... начинает вызывать бурю во мне!"
        },
        low: {
          strength: "*Истекая соленой кровью, падает на дно:* Невероятно... Океан... замерзает... Твоя сила сломила меня!",
          intelligence: "*Тяжело вздыхая, теряя рассудок:* Великая бездна гаснет... Твои чары... высушили мои глубины...",
          charisma: "*Склонив тяжелую голову:* Довольно... Твой праведный укор... заставляет меня уйти во мрак...",
          willpower: "*Едва дыша среди пены:* Твоя непобедимая воля... иссушила море... Конец близок..."
        }
      };
    } else if (isAmaterasu) {
      return {
        high: {
          strength: "Физическая сила тщетна перед сиянием великого вечного солнца!",
          intelligence: "Твой мизерный интеллект гаснет при свете божественного огня!",
          charisma: "Перед моим величием меркнет любая смертная харизма!",
          willpower: "Твоя хрупкая воля сгорит дотла в моем небесном пламени!"
        },
        medium: {
          strength: "*Закрывается веером от удара:* Твоя сталь упряма... Но солнце вечно!",
          intelligence: "*Морщится от магического разряда:* Мое сияние дрогнуло... Наглый еретик!",
          charisma: "*Гневно сверкает глазами:* Твоя дерзкая харизма... заслоняет мой чистый свет!",
          willpower: "*Держится за сердце:* Твое превозмогание... начинает обжигать мою собственную ауру!"
        },
        low: {
          strength: "*Падая на колени, теряя благословение:* Солнце заходит... Твой удар... рассеивает мой рассвет...",
          intelligence: "*Пошатываясь в угасающем пламени:* Мой свет остывает... Твоя мудрость разрывает мои небеса...",
          charisma: "*Уронив веер, плачет:* Твои праведные слова... вернули тьму в мою пещеру... Я гасну...",
          willpower: "*Едва видимая в лучах заката:* Чистая искра твоего духа... победила вечный огонь..."
        }
      };
    } else if (isJormungand) {
      return {
        high: {
          strength: "Твой разрушительный удар бессилен против преград Мирового Змея!",
          intelligence: "Твои хитрые формулы не разорвут бесконечную цепь судьбы!",
          charisma: "Ш-ш-ссс... Твое очарование не остановит неотвратимый яд забвения!",
          willpower: "Твой дух крепок, но колесо времени все равно обратит тебя в прах!"
        },
        medium: {
          strength: "*Шипит со злостью, сжимая кольца:* Твоя сталь рассекает чешую! Но я вечен!",
          intelligence: "*Яростно качает головой:* Твоя магия разума... путает мои вековые циклы!",
          charisma: "*Трясет хвостом в гневе:* Ш-ш-ссс... Хватит вещать! Твои речи вызывают головную боль!",
          willpower: "*Тяжело содрогается:* Твоя воля воистину сильна... Мои кольца дрожат!"
        },
        low: {
          strength: "*Истекая ядом, с хрустом падает:* Мировой круг порван... Кости ломаются... Твоя сила сокрушила вечность...",
          intelligence: "*Угасающие глаза застилает туман:* Мой змеиный разум растворяется... Судьба побеждена твоей мудростью...",
          charisma: "*Опускается в прах с тихим шепотом:* Мой ядовитый шепот стих... Твой суровый глас победил...",
          willpower: "*Теряя последние силы:* Цепь разорвана... Твоя стальная воля победила судьбу..."
        }
      };
    } else {
      return {
        high: {
          strength: "Ха-ха! Твоя физическая сила забавляет меня, смертный! Попробуй ударить крепче!",
          intelligence: "Твои заумные мысли и фокусы разума рассыпаются при столкновении со мной!",
          charisma: "Ты мнишь себя красноречивым лидером? Твои слова бессильны против моего величия!",
          willpower: "Ты закаляешь свой дух, но моя воля монолитна и не дрогнет от твоих потуг!"
        },
        medium: {
          strength: "*Слегка морщится от удара:* Хм, твоя физическая мощь заслуживает уважения... Но этого мало!",
          intelligence: "*Хмурится от энергии:* Твоя хваленая магия сумела задеть мои барьеры!",
          charisma: "*Недовольно рычит:* Хватит пустых речей! Твой голос раздражает мои уши!",
          willpower: "*Тяжело содрогается:* Твоё превозмогание... начинает давить на мою уверенность!"
        },
        low: {
          strength: "*Качаясь на ногах и истекая кровью:* Невероятно... Ты сокрушаешь мое тело... Я теряю силы...",
          intelligence: "*Схватившись за пылающую голову:* Мой разум затуманился... Твой интеллект выжег мою суть...",
          charisma: "*Преклонив колена от стыда:* Твой величественный голос... заставил меня покаяться в грехах...",
          willpower: "*С трудом испуская последний вздох:* Твоя стальная воля... сокрушила мое темное бессмертие..."
        }
      };
    }
  };

  return {
    id: crypto.randomUUID(),
    level: playerLevel,
    name: isMiniBoss ? `Приспешник: ${bossData.name}` : bossData.name,
    description: bossData.description,
    avatarEmoji: bossData.avatarEmoji,
    hp: maxHp,
    maxHp,
    expiresAt: expirationDate.getTime(),
    multipliers,
    isMiniBoss,
    banter: getLocalBossBanter(bossData.name),
    defeated: false,
    dropTrophy: {
      id: crypto.randomUUID(),
      name: `Осколок ${bossData.name}`,
      description: `Частица силы поверженного врага.`,
      icon: "✨",
      effect: {
        type: "xp_boost",
        targetStat: null,
        value: 0.01
      }
    }
  };
};

const getXpRequirement = (level: number) => level * 100;
const getStatXpRequirement = (level: number) => level * 50;
const getTotalStatXp = (level: number, currentXp: number) => {
  return currentXp + 25 * level * (level - 1);
};

const getFamiliarBuff = (combo: number, familiar?: Familiar) => {
  if (!familiar || familiar.status !== 'active' || familiar.stage === 'egg') return 0;
  // Base buff based on stage + small bonus per level
  let baseBuff = 0;
  if (familiar.stage === 'baby') baseBuff = 0.01;
  if (familiar.stage === 'evolved') baseBuff = 0.03;
  if (familiar.stage === 'ultra') baseBuff = 0.05;
  
  return baseBuff + (familiar.level * 0.001);
};

const getFamiliarSkillDamage = (familiar: Familiar, combo: number) => {
  if (familiar.stage === 'egg') return 0;
  const stageMultipliers: Record<string, number> = {
    baby: 1.0,
    evolved: 1.3,
    ultra: 1.6
  };
  const stageMult = stageMultipliers[familiar.stage] || 1.0;
  return Math.round((20 + (familiar.level * 2) + (combo * 1)) * stageMult);
};

const FAMILIAR_SKILLS: Record<string, { name: string; description: string; effectText: string; damageType: StatType }> = {
  'Дракон': { name: 'Пламя Гнева', description: 'Извергает столб разрушительного драконьего пламени.', effectText: 'наносит сокрушительный удар по слабости босса!', damageType: 'strength' },
  'Волк': { name: 'Вой Стаи', description: 'Призывает духи волков для сокрушительного натиска воли.', effectText: 'подавляет волю босса свирепым воем!', damageType: 'willpower' },
  'Грифон': { name: 'Ураган Справедливости', description: 'Вызывает режущие воздушные потоки своей харизмой.', effectText: 'создает вихри элегантного ветра!', damageType: 'charisma' },
  'Феникс': { name: 'Вспышка Сверхновой', description: 'Освещает разум невероятными вспышками магии солнца.', effectText: 'выжигает защитные барьеры босса чистым знанием!', damageType: 'intelligence' },
  'Слайм': { name: 'Едкий Сплеск', description: 'Обливает босса липкой едкой слизью, разъедающей все.', effectText: 'обволакивает врага кислотным зарядом!', damageType: 'strength' },
  'Фея': { name: 'Чародейская Пыльца', description: 'Ослепляет босса волшебными блестками гармонии.', effectText: 'очаровывает разум монстра волшебными искрами!', damageType: 'charisma' },
  'Энт': { name: 'Опутывание Корнями', description: 'Пробуждает древние лозы земли для удержания босса.', effectText: 'крепко сжимает титанические лозы воли!', damageType: 'willpower' },
  'Василиск': { name: 'Взгляд Горгоны', description: 'Пронзает босса смертоносной фокусировкой.', effectText: 'поражает ядовитым взглядом глубокой концентрации!', damageType: 'intelligence' }
};

const getPetInteractionVoice = (type: string, action: 'pet' | 'feed' | 'train' | 'greetings') => {
  const normType = type.toLowerCase();
  
  if (normType.includes('дракон')) {
    if (action === 'pet') return 'Фырк! *Дракон с умилением пускает маленькие кольца теплого дыма и трется чешуйчатой мордочкой о вашу ладонь*';
    if (action === 'feed') return 'Ррр-мяу! *Хрумкает с аппетитом, его глаза вспыхивают ярким желтым светом от прилива сил*';
    if (action === 'train') return 'Гррра! *Расправляет кожистые крылышки и выпускает аккуратный огненный сгусток в воздух*';
    return 'Ш-ш... Я прикрою твою спину в бою!';
  }
  
  if (normType.includes('волк')) {
    if (action === 'pet') return 'Аууф! *Пес довольно виляет пушистым хвостом, кладет лапы вам на колени и облизывает лицо*';
    if (action === 'feed') return '*Скулит от нетерпения и моментально заглатывает кусок, благодарно повиливая хвостом*';
    if (action === 'train') return '*Напрягает мускулы, прижимает уши и совершает стремительный тренировочный бросок*';
    return 'Мы — одна стая. Твои цели — мои цели!';
  }
  
  if (normType.includes('феникс')) {
    if (action === 'pet') return '*Феникс тихо напевает целебную мелодию, распушая теплые золотистые перья*';
    if (action === 'feed') return '*Аккуратно клюет семена, заставляя их испускать мягкое целебное сияние*';
    if (action === 'train') return 'Пввии! *Вспыхивает ослепительным, но не обжигающим пламенем, взмывая вверх*';
    return 'Из пепла к звездам! Я помогу тебе преодолеть любые трудности!';
  }
  
  if (normType.includes('грифон')) {
    if (action === 'pet') return '*Грифон гордо выпрямляет спину, но затем прищуривает большие глаза и утыкается клювом вам в плечо*';
    if (action === 'feed') return '*С достоинством и аристократическим аппетитом съедает пищу, издавая клекот удовлетворения*';
    if (action === 'train') return 'Кья-а! *Взмахивает могучими крыльями, поднимая легкий вихрь в комнате*';
    return 'Небеса благословляют наше содружество!';
  }
  
  if (normType.includes('слайм')) {
    if (action === 'pet') return '*Бульк-бульк! Слайм довольно вибрирует, меняет форму на форму сердечка и ластится*';
    if (action === 'feed') return '*Плюх! Пища погружается внутрь слайма и медленно растворяется, окрашивая его в яркие радужные цвета*';
    if (action === 'train') return '*Буль-мяу! С силой отскакивает от пола и совершает тройное сальто назад*';
    return 'Бульк... Я липкий, но верный друг!';
  }
  
  if (normType.includes('фея')) {
    if (action === 'pet') return '*Фея звонко смеется, кружится вокруг вашей руки и оставляет за собой сияющий след из пыльцы*';
    if (action === 'feed') return '*С восторгом берет лакомство маленькими ручками и откусывает крошечные кусочки, сверкая глазками*';
    if (action === 'train') return '*Чертит в воздухе волшебную сияющую руну, концентрируя природную магию*';
    return 'Да пребудет с тобой волшебство гармонии!';
  }

  if (normType.includes('энт')) {
    if (action === 'pet') return '*Шелестит мягкими дубовыми листьями и медленно протягивает ветвь, чтобы погладить вас в ответ*';
    if (action === 'feed') return '*Впитывает питательные вещества корнями и заметно расправляет кору, зеленея на глазах*';
    if (action === 'train') return '*Со звуком треска дерева укореняется поглубже и поднимает мощные земляные лозы*';
    return 'Сила природы медленная, но несокрушимая.';
  }

  if (normType.includes('василиск')) {
    if (action === 'pet') return '*Василиск аккуратно обвивает вашу руку холодным кольчатым хвостом и глухо шипит от удовольствия*';
    if (action === 'feed') return '*Стремительно заглатывает пищу целиком и облизывается раздвоенным язычком*';
    if (action === 'train') return '*Направляет свой парализующий взгляд в тренировочную мишень, прожигая в ней фокус*';
    return 'Мой взор верен, мой яд безжалостен к твоим ленивым мыслям.';
  }

  if (action === 'pet') return `*${type} ласково прижимается к вам, выражая огромную преданность питомца*`;
  if (action === 'feed') return `*${type} с радостью поглощает угощение, чувствуя прилив бодрости и сытости*`;
  if (action === 'train') return `*${type} усердно повторяет боевые стойки, готовясь сокрушать врагов*`;
  return `Я всегда рядом, чтобы помочь тебе на пути героя!`;
};

const defaultStats = {
  strength: { level: 1, xp: 0 },
  intelligence: { level: 1, xp: 0 },
  charisma: { level: 1, xp: 0 },
  willpower: { level: 1, xp: 0 },
  unknown: { level: 1, xp: 0 }
};

const defaultPendingDamage = {
  strength: 0,
  intelligence: 0,
  charisma: 0,
  willpower: 0,
  unknown: 0
};

const getBossBanterLine = (boss: Boss, stat: StatType): string => {
  if (!boss) return "Рх-х! Твой удар горяч, но моя броня крепка!";

  // Calculate health stage: 'high' | 'medium' | 'low'
  const hpPercent = (boss.hp / boss.maxHp) * 100;
  let healthStage: 'high' | 'medium' | 'low' = 'high';
  if (hpPercent < 30) {
    healthStage = 'low';
  } else if (hpPercent < 70) {
    healthStage = 'medium';
  }

  const currentBanter = boss.banter as any;
  if (currentBanter) {
    // 1. Check nested structure: banter[healthStage][stat]
    if (currentBanter[healthStage] && typeof currentBanter[healthStage] === 'object') {
      const stageGroup = currentBanter[healthStage];
      if (stageGroup[stat]) {
        return stageGroup[stat];
      }
    }
    // 2. Check flat structure: banter[stat] (old format fallback)
    if (currentBanter[stat] && typeof currentBanter[stat] === 'string') {
      const baseLine = currentBanter[stat];
      if (healthStage === 'low') {
        return `*Тяжело дыша и истекая кровью:* "${baseLine}"`;
      } else if (healthStage === 'medium') {
        return `*Морщась от боли:* "${baseLine}"`;
      } else {
        return `*Свысока и властно:* "${baseLine}"`;
      }
    }
  }

  // 3. Complete robust programmatic fallback based on the chosen boss or general theme
  const lowerName = boss.name.toLowerCase();
  const isLeviathan = lowerName.includes("левиафан") || lowerName.includes("кракен") || lowerName.includes("цербер");
  const isAmaterasu = lowerName.includes("аматерасу") || lowerName.includes("бафомет") || lowerName.includes("химера");
  const isJormungand = lowerName.includes("ёрмунганд") || lowerName.includes("минотавр") || lowerName.includes("медуза");

  const fallbackPools: Record<string, Record<'high'|'medium'|'low', string>> = {
    strength: {
      high: "Ха-ха! Твоя физическая сила забавляет меня, смертный! Попробуй ударить крепче!",
      medium: "*Стиснув зубы от удара:* Твои мускулы крепче, чем казалось... Но этого мало!",
      low: "*Падая на колено и тяжело дыша:* Этот удар... сокрушает мои кости... Но я еще не повержен!"
    },
    intelligence: {
      high: "Твои заумные мысли и фокусы разума рассыпаются при столкновении со мной!",
      medium: "*Хмурясь, рассеивает заклятие:* Твоё плетение пробивает мою ментальную защиту... Жалкий червь!",
      low: "*Стеклянными глазами, вцепившись в голову:* Мои мысли гаснут... эти чары... они разрывают мой разум!"
    },
    charisma: {
      high: "Ты мнишь себя красноречивым лидером? Твои слова бессильны против моего величия!",
      medium: "*Старается не слушать ваш голос:* Замолчи! Твои речи вселяют сомнение в моё сердце...",
      low: "*Затыкает уши, дрожа от раскаяния:* Хватит... Твой голос... твоё величие ослепляет меня!"
    },
    willpower: {
      high: "Ты закаляешь свой дух, но моя воля монолитна и не дрогнет!",
      medium: "*Слегка покачнувшись:* Твой стальной дух... начинает подавлять мою ауру!",
      low: "*Едва удерживая баланс, теряя волю за волей:* Моё превосходительство... рушится... Твоя чистая воля сильнее!"
    }
  };

  const specificLeviathan: Record<string, Record<'high'|'medium'|'low', string>> = {
    strength: {
      high: "Глупец! Твоя сталь лишь царапает мою вековую океанскую защиту!",
      medium: "*Морщится, когда вода вскипает:* Ты крепче, чем кажешься... Мои волны вздымаются!",
      low: "*Истекая соленой кровью, падает на дно:* Невероятно... Океан... замерзает... Твоя сила сломила меня!"
    },
    intelligence: {
      high: "Твои плетения разума рассеиваются в бесконечном течении пучины!",
      medium: "*Воет от боли разума:* Твои мантры проникают сквозь бездну! Это жалко ранит меня!",
      low: "*Тяжело вздыхая, теряя рассудок:* Великая бездна гаснет... Твои чары... высушили мои глубины..."
    },
    charisma: {
      high: "Твои сладкие речи заглушаются ревом прилива. Море безмолвно!",
      medium: "*Разъяренно шипит:* Твой голос будоражит мои глубины! Замолчи, смертный!",
      low: "*Склонив тяжелую голову:* Довольно... Твой праведный укор... заставляет меня уйти во мрак..."
    },
    willpower: {
      high: "Твое превозмогание — лишь мелкая волна перед моим вечным давлением!",
      medium: "*Пошатываясь среди волн:* Твоя стальная воля... начинает вызывать бурю во мне!",
      low: "*Едва дыша среди пены:* Твоя непобедимая воля... иссушила море... Конец близок..."
    }
  };

  const specificAmaterasu: Record<string, Record<'high'|'medium'|'low', string>> = {
    strength: {
      high: "Физическая сила тщетна перед сиянием великого вечного солнца!",
      medium: "*Закрывается веером от удара:* Твоя сталь упряма... Но солнце вечно!",
      low: "*Падая на колени, теряя благословение:* Солнце заходит... Твой удар... рассеивает мой рассвет..."
    },
    intelligence: {
      high: "Твой мизерный интеллект гаснет при свете божественного огня!",
      medium: "*Морщится от магического разряда:* Мое сияние дрогнуло... Наглый еретик!",
      low: "*Пошатываясь в угасающем пламени:* Мой свет остывает... Твоя мудрость разрывает мои небеса..."
    },
    charisma: {
      high: "Перед моим величием меркнет любая смертная харизма!",
      medium: "*Гневно сверкает глазами:* Твоя дерзкая харизма... заслоняет мой чистый свет!",
      low: "*Уронив веер, плачет:* Твои праведные слова... вернули тьму в мою пещеру... Я гасну..."
    },
    willpower: {
      high: "Твоя хрупкая воля сгорит дотла в моем небесном пламени!",
      medium: "*Держится за сердце:* Твое превозмогание... начинает обжигать мою собственную ауру!",
      low: "*Едва видимая в лучах заката:* Чистая искра твоего духа... победила вечный огонь..."
    }
  };

  const specificJormungand: Record<string, Record<'high'|'medium'|'low', string>> = {
    strength: {
      high: "Твой разрушительный удар бессилен против преград Мирового Змея!",
      medium: "*Шипит со злостью, сжимая кольца:* Твоя сталь рассекает чешую! Но я вечен!",
      low: "*Истекая ядом, с хрустом падает:* Мировой круг порван... Кости ломаются... Твоя сила сокрушила вечность..."
    },
    intelligence: {
      high: "Твои хитрые формулы не разорвут бесконечную цепь судьбы!",
      medium: "*Яростно качает головой:* Твоя магия разума... путает мои вековые циклы!",
      low: "*Угасающие глаза застилает туман:* Мой змеиный разум растворяется... Судьба побеждена твоей мудростью..."
    },
    charisma: {
      high: "Ш-ш-ссс... Твое очарование не остановит неотвратимый яд забвения!",
      medium: "*Трясет хвостом в гневе:* Ш-ш-ссс... Хватит вещать! Твои речи вызывают головную боль!",
      low: "*Опускается в прах с тихим шепотом:* Мой ядовитый шепот стих... Твой суровый глас победил..."
    },
    willpower: {
      high: "Твой дух крепок, но колесо времени все равно обратит тебя в прах!",
      medium: "*Тяжело содрогается:* Твоя воля воистину сильна... Мои кольца дрожат!",
      low: "*Теряя последние силы:* Цепь разорвана... Твоя стальная воля победила судьбу..."
    }
  };

  const source = isLeviathan ? specificLeviathan : (isAmaterasu ? specificAmaterasu : (isJormungand ? specificJormungand : fallbackPools));
  const group = source[stat] || fallbackPools[stat] || fallbackPools.strength;
  return group[healthStage];
};

export default function App() {
  const [player, setPlayer] = useState<Player>(() => {
    const defaultPlayer: Player = { 
      level: 1, 
      xp: 0, 
      gold: 0,
      combo: 0, 
      pendingDamage: defaultPendingDamage, 
      stats: defaultStats,
      inventory: [],
      weeklyProductivity: []
    };
    try {
      const saved = localStorage.getItem('questlog_player_v4');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.inventory && Array.isArray(parsed.inventory)) {
          parsed.inventory = parsed.inventory.filter((item: any, index: number, self: any[]) => index === self.findIndex((t) => t.id === item.id));
        }
        return { 
          ...defaultPlayer, 
          ...parsed, 
          pendingDamage: { ...defaultPendingDamage, ...(parsed.pendingDamage || {}) },
          stats: { ...defaultStats, ...(parsed.stats || {}) } 
        };
      }
      
      const oldSaved = localStorage.getItem('questlog_player_v3') || localStorage.getItem('questlog_player_v2') || localStorage.getItem('questlog_player');
      if (oldSaved) {
        const old = JSON.parse(oldSaved);
        // Migrate old pendingDamage (number) to new object format
        const oldPendingDamage = typeof old.pendingDamage === 'number' ? old.pendingDamage : 0;
        const migratedPendingDamage = { ...defaultPendingDamage };
        if (oldPendingDamage > 0) {
          migratedPendingDamage.strength = oldPendingDamage; // Just dump it into strength for migration
        }
        
        // Migrate old stats
        const migratedStats = { ...defaultStats };
        if (old.stats) {
          if (old.stats.strength) migratedStats.strength = old.stats.strength;
          if (old.stats.intelligence) migratedStats.intelligence = old.stats.intelligence;
          if (old.stats.charisma) migratedStats.charisma = old.stats.charisma;
          if (old.stats.endurance) migratedStats.willpower = old.stats.endurance; // Map endurance to willpower
        }

        return { 
          ...defaultPlayer, 
          ...old, 
          combo: 0, 
          pendingDamage: migratedPendingDamage, 
          stats: migratedStats,
          inventory: [],
          weeklyProductivity: []
        };
      }
    } catch (e) {
      console.error("Failed to parse player data", e);
    }
    
    return defaultPlayer;
  });

const uuid = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : (Math.random().toString(36).substring(2) + Date.now().toString(36));

  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem('questlog_tasks_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        const deduplicate = (arr: any[]) => arr.filter((item, index, self) => index === self.findIndex((t) => (t.id || '') === (item.id || '')));
        return Array.isArray(parsed) ? deduplicate(parsed).map(t => ({...t, id: t.id || uuid()})) : [];
      }
      
      const oldSaved = localStorage.getItem('questlog_tasks');
      if (oldSaved) {
        const old = JSON.parse(oldSaved);
        const deduplicate = (arr: any[]) => arr.filter((item, index, self) => index === self.findIndex((t) => (t.id || '') === (item.id || '')));
        return Array.isArray(old) ? deduplicate(old).map((t: any) => ({ ...t, id: t.id || uuid(), stat: t.stat || 'strength' })) : [];
      }
    } catch (e) {
      console.error("Failed to parse tasks data", e);
    }
    return [];
  });

  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [editingTaskStatId, setEditingTaskStatId] = useState<string | null>(null);

  const [campaign, setCampaign] = useState<Campaign | null>(() => {
    try {
      const saved = localStorage.getItem('questlog_campaign');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Failed to parse campaign data", e);
      return null;
    }
  });

  const [boss, setBoss] = useState<Boss>(() => {
    try {
      const saved = localStorage.getItem('questlog_boss_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && 'hp' in parsed) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Failed to parse boss data", e);
    }
    return generateBoss(player.level, player.dailyPointsHistory, player.inventory);
  });

  const [activeTab, setActiveTab] = useState<'quests' | 'boss' | 'profile' | 'city'>('quests');
  const [newTask, setNewTask] = useState('');
  const [newTaskStat, setNewTaskStat] = useState<StatType>('unknown');
  const [newTaskType, setNewTaskType] = useState<TaskType>('daily');
  const [newTaskDay, setNewTaskDay] = useState<number>(1);
  const [newTaskRepeatInterval, setNewTaskRepeatInterval] = useState<number>(2);
  const [bossHit, setBossHit] = useState(false);
  const [bossBanterBubble, setBossBanterBubble] = useState<string | null>(null);
  const [bossBubbleTimer, setBossBubbleTimer] = useState<any>(null);

  const triggerBossBanterBubble = (text: string) => {
    setBossBanterBubble(text);
    if (bossBubbleTimer) clearTimeout(bossBubbleTimer);
    const timer = setTimeout(() => {
      setBossBanterBubble(null);
    }, 6500);
    setBossBubbleTimer(timer);
  };
  const [lastDamageDealt, setLastDamageDealt] = useState(0);
  const [lastDamageColor, setLastDamageColor] = useState('#FF2A55');
  const [showVictory, setShowVictory] = useState(false);
  const [victoryMessage, setVictoryMessage] = useState("Босс повержен!");
  const [droppedTrophy, setDroppedTrophy] = useState<Trophy | null>(null);
  const [pendingDailyMemory, setPendingDailyMemory] = useState<{ completed: string[], missed: string[] } | null>(null);
  const [pendingWeeklyAnalytics, setPendingWeeklyAnalytics] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [bossDefeatError, setBossDefeatError] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [bossFailed, setBossFailed] = useState(false);
  const [petReactionMessage, setPetReactionMessage] = useState<string>('');
  const [familiarSkillUsed, setFamiliarSkillUsed] = useState(false);
  const [midnightEchoReport, setMidnightEchoReport] = useState<{ missedTasks: number; damageTaken: number; comboReset: boolean } | null>(null);
  
  // City Node States
  const [showShopNode, setShowShopNode] = useState(false);
  const [showFortuneTellerNode, setShowFortuneTellerNode] = useState(false);
  const [showAltarNode, setShowAltarNode] = useState(false);
  const [showBeastNode, setShowBeastNode] = useState(false);
  const [showExpeditionNode, setShowExpeditionNode] = useState(false);
  const [oathInput, setOathInput] = useState('');
  const [isEvaluatingOath, setIsEvaluatingOath] = useState(false);

  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState('');

  const [imageQueue, setImageQueue] = useState<ImageJob[]>(() => {
    try {
      const saved = localStorage.getItem('questlog_image_queue');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [encounterCache, setEncounterCache] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('questlog_encounter_cache');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [aiSettings, setAiSettings] = useState<AISettings>(() => {
    try {
      const saved = localStorage.getItem('questlog_ai_settings');
      return saved ? { enableImages: true, developerMode: false, useGeminiMode: false, geminiApiKey: '', ...JSON.parse(saved) } : { apiKey: '', baseUrl: '', model: 'gpt-4o-mini', imageModel: 'dall-e-3', developerMode: false, enableImages: true, useGeminiMode: false, geminiApiKey: '' };
    } catch (e) {
      console.error("Failed to parse AI settings", e);
      return { apiKey: '', baseUrl: '', model: 'gpt-4o-mini', imageModel: 'dall-e-3', developerMode: false, enableImages: true, useGeminiMode: false, geminiApiKey: '' };
    }
  });

  const safeStorageSet = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error(`Failed to save to localStorage for key ${key}`, e);
    }
  };

  const defaultToGemini = (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY && !aiSettings.apiKey && !aiSettings.baseUrl) ? true : false;
  const useGemini = aiSettings.useGeminiMode || defaultToGemini;
  
  const effectiveApiKey = useGemini ? (aiSettings.geminiApiKey || ((typeof process !== 'undefined' && process.env) ? process.env.GEMINI_API_KEY : '') || '') : (aiSettings.apiKey || '');
  const effectiveAiBaseUrl = useGemini ? "https://generativelanguage.googleapis.com/v1beta/openai/" : (aiSettings.baseUrl || '');
  const effectiveAiModel = useGemini ? "gemini-3.1-flash-lite-preview" : (aiSettings.model || 'gpt-4o-mini');

  const [gameState, setGameState] = useState(() => {
    const defaultState = { 
      defeatedBosses: [] as string[], 
      currentStory: 'Вы — начинающий герой, только ступивший на путь самосовершенствования.', 
      lastGMTaskGeneration: '',
      nemesisBoss: null as Boss | null,
      shopItems: [] as ShopItem[],
      lastWeeklyReset: Date.now(),
      events: [] as Array<{ id: string, zoneIndex: number, description: string, rewardGold: number, taskPrompt?: string }>,
      altarTask: null as null | { id: string, description: string, rewardType: string, rewardValue: any, deadline: number, status: 'active' | 'completed' | 'failed' },
      chronicle: {
        behavior_analytics: {
          favorite_stat: 'unknown' as StatType | 'unknown',
          weakest_stat: 'unknown' as StatType | 'unknown',
          ignored_tasks_patterns: [],
          preferred_tasks_patterns: [],
          completion_rate_avg: 100
        },
        campaign_history: {
          bosses_defeated: 0,
          bosses_escaped: 0,
          nemesis: null,
          current_lore_arc: "Начало пути"
        },
        recent_memory_log: [],
        master_summary: "Мастер пока присматривается к вам. Выполняйте задачи, чтобы он смог оценить ваши сильные и слабые стороны."
      } as HeroChronicle,
      weeklyCompletedCounts: {
        strength: 0,
        intelligence: 0,
        charisma: 0,
        willpower: 0,
        unknown: 0
      } as Record<StatType, number>
    };
    try {
      const saved = localStorage.getItem('questlog_game_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure chronicle exists in parsed state
        if (!parsed.chronicle) {
          parsed.chronicle = defaultState.chronicle;
        }
        if (!parsed.weeklyCompletedCounts) {
          parsed.weeklyCompletedCounts = defaultState.weeklyCompletedCounts;
        }
        if (parsed.events && Array.isArray(parsed.events)) {
          parsed.events = parsed.events.filter((item: any, index: number, self: any[]) => index === self.findIndex((t) => t.id === item.id));
        }
        if (parsed.shopItems && Array.isArray(parsed.shopItems)) {
          // Shop items occasionally missing id if from legacy pool
          parsed.shopItems = parsed.shopItems.map((item: any) => ({ ...item, id: item.id || crypto.randomUUID() }));
        }
        return { ...defaultState, ...parsed };
      }
      return defaultState;
    } catch (e) {
      console.error("Failed to parse game state", e);
      return defaultState;
    }
  });

  const [masterQuest, setMasterQuest] = useState<MasterQuest | null>(() => {
    try {
      const saved = localStorage.getItem('questlog_master_quest');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [lastMasterQuestStat, setLastMasterQuestStat] = useState<StatType | null>(() => {
    try {
      return localStorage.getItem('questlog_last_master_quest_stat') as StatType | null;
    } catch { return null; }
  });

  const [masterQuestBossId, setMasterQuestBossId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('questlog_master_quest_boss_id');
    } catch { return null; }
  });

  const [masterQuestCampaignId, setMasterQuestCampaignId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('questlog_master_quest_campaign_id');
    } catch { return null; }
  });

  const [chronicleVictory, setChronicleVictory] = useState<ChronicleVictory | null>(() => {
    try {
      const saved = localStorage.getItem('questlog_chronicle_victory');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [isGeneratingBalanceTasks, setIsGeneratingBalanceTasks] = useState(false);

  useEffect(() => {
    safeStorageSet('questlog_master_quest', masterQuest ? JSON.stringify(masterQuest) : '');
  }, [masterQuest]);

  useEffect(() => {
    if (lastMasterQuestStat) {
      safeStorageSet('questlog_last_master_quest_stat', lastMasterQuestStat);
    } else {
      localStorage.removeItem('questlog_last_master_quest_stat');
    }
  }, [lastMasterQuestStat]);

  useEffect(() => {
    if (masterQuestBossId) {
      safeStorageSet('questlog_master_quest_boss_id', masterQuestBossId);
    } else {
      localStorage.removeItem('questlog_master_quest_boss_id');
    }
  }, [masterQuestBossId]);

  useEffect(() => {
    if (masterQuestCampaignId) {
      safeStorageSet('questlog_master_quest_campaign_id', masterQuestCampaignId);
    } else {
      localStorage.removeItem('questlog_master_quest_campaign_id');
    }
  }, [masterQuestCampaignId]);

  useEffect(() => {
    safeStorageSet('questlog_chronicle_victory', chronicleVictory ? JSON.stringify(chronicleVictory) : '');
  }, [chronicleVictory]);

  const [showSettings, setShowSettings] = useState(false);
  const [showFinishedTasks, setShowFinishedTasks] = useState(false);
  const [gmMessage, setGmMessage] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<string | null>(null);
  const [isGeneratingBoss, setIsGeneratingBoss] = useState(false);
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  const [isCategorizingTasks, setIsCategorizingTasks] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [activeEvent, setActiveEvent] = useState<any>(null);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [selectedTrophy, setSelectedTrophy] = useState<Trophy | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    safeStorageSet('questlog_image_queue', JSON.stringify(imageQueue));
  }, [imageQueue]);

  useEffect(() => {
    safeStorageSet('questlog_encounter_cache', JSON.stringify(encounterCache));
  }, [encounterCache]);

  useEffect(() => {
    if (activeTab !== 'boss') return;
    if (masterQuest) return;
    if (boss && boss.id && boss.id === masterQuestBossId) return;
    if (campaign && campaign.id && masterQuestCampaignId === campaign.id) return;

    let threshold = 1;
    if (player.level >= 50) {
      threshold = 3;
    } else if (player.level >= 25) {
      threshold = 2;
    }

    const statsToCheck: StatType[] = ['strength', 'intelligence', 'charisma', 'willpower'];
    const counts = gameState.weeklyCompletedCounts || { strength: 0, intelligence: 0, charisma: 0, willpower: 0, unknown: 0 };
    const neglectedStats = statsToCheck.filter(s => (counts[s] || 0) < threshold);

    if (neglectedStats.length > 0) {
      let eligible = neglectedStats.filter(s => s !== lastMasterQuestStat);
      if (eligible.length === 0) {
        eligible = neglectedStats;
      }
      
      const minCount = Math.min(...eligible.map(s => counts[s] || 0));
      const worstStats = eligible.filter(s => (counts[s] || 0) === minCount);
      const stat = worstStats[Math.floor(Math.random() * worstStats.length)];

      const newQuest: MasterQuest = {
        stat,
        target: 30,
        current: 0
      };
      setMasterQuest(newQuest);
      setLastMasterQuestStat(stat);
      if (boss && boss.id) {
        setMasterQuestBossId(boss.id);
      }
      if (campaign && campaign.id) {
        setMasterQuestCampaignId(campaign.id);
      }
      setGmMessage(`Мастер: "На этой неделе ты выполнил недостаточно задач характеристики ${STATS[stat]?.name || stat} (выполнено: ${counts[stat] || 0}, требуется: ${threshold}). Логово босса заблокировано, пока ты не восстановишь баланс!"`);
    }
  }, [activeTab, player.level, gameState.weeklyCompletedCounts, masterQuest, boss, masterQuestBossId, lastMasterQuestStat, campaign, masterQuestCampaignId]);

  const processingEncounterRef = useRef(false);
  const preGeneratingChronicleRef = useRef(false);
  useEffect(() => {
    if (!aiSettings.enableImages || !effectiveApiKey) return; // if AI is off, no events
    if (processingEncounterRef.current) return;
    
    // Maintain a buffer of 2 pre-generated encounters
    if (encounterCache.length < 2) {
      const replenishCache = async () => {
        processingEncounterRef.current = true;
        try {
          const weakestStat = Object.entries(player.stats).reduce((a, b) => a[1] < b[1] ? a : b)[0];
          const m = await import('./lib/ai');
          const existingTaskTexts = tasks.map(t => t.text);
          const encounter = await m.generateRandomEncounter(effectiveApiKey, effectiveAiBaseUrl, effectiveAiModel, weakestStat, existingTaskTexts);
          if (encounter) {
             setEncounterCache(prev => [...prev, encounter]);
          }
        } catch (e) {
          console.error("Failed to pregenerate encounter", e);
        } finally {
          processingEncounterRef.current = false;
        }
      };
      
      // Delay so it doesn't run aggressively during startup
      const timeout = setTimeout(replenishCache, 10000);
      return () => clearTimeout(timeout);
    }
  }, [encounterCache, aiSettings, effectiveApiKey, effectiveAiBaseUrl, player.stats, tasks]);

  const processingImagesRef = useRef(false);

  useEffect(() => {
    if (!aiSettings.enableImages || (!effectiveApiKey && !effectiveAiBaseUrl)) return;
    if (processingImagesRef.current) return;
    
    const pendingJobs = imageQueue.filter(j => j.status === 'pending' || (j.status === 'failed' && (j.retryCount || 0) < 3));
    if (pendingJobs.length === 0) return;

    const runJobs = async () => {
      processingImagesRef.current = true;
      const jobsToProcess = pendingJobs.slice(0, 2); // Process 2 at a time
      
      setImageQueue(prev => prev.map(j => jobsToProcess.some(job => job.id === j.id) ? { ...j, status: 'processing' } : j));

      const { generateAIImage } = await import('./lib/ai');

      const promises = jobsToProcess.map(async (job) => {
        try {
           const url = await generateAIImage(effectiveApiKey, effectiveAiBaseUrl, aiSettings.imageModel || "dall-e-3", job.prompt, true, job.aspectRatio);
           if (url) {
              if (job.type === 'city') {
                setGameState(prev => ({
                   ...prev,
                   chronicle: prev.chronicle ? {
                      ...prev.chronicle,
                      season_info: prev.chronicle.season_info ? {
                         ...prev.chronicle.season_info,
                         city_background_url: url
                      } : prev.chronicle.season_info
                   } : prev.chronicle
                }));
              } else if (job.type === 'map') {
                setCampaign(prev => {
                   if (!prev) return prev;
                   return { ...prev, mapUrl: url };
                });
              } else if (job.type === 'npc') {
                setGameState(prev => {
                   if (!prev.chronicle?.season_info?.npcs || !prev.chronicle.season_info.npcs[job.targetId]) return prev;
                   return {
                      ...prev,
                      chronicle: {
                         ...prev.chronicle,
                         season_info: {
                            ...prev.chronicle.season_info,
                            npcs: {
                               ...prev.chronicle.season_info.npcs,
                               [job.targetId]: {
                                  ...prev.chronicle.season_info.npcs[job.targetId],
                                  imageUrl: url
                               }
                            }
                         }
                      }
                   };
                });
              } else if (job.type === 'chronicle_victory') {
                setChronicleVictory(prev => prev ? { ...prev, imageUrl: url } : null);
              } else if (job.type === 'enemy') {
                setCampaign(prev => {
                   if (!prev) return prev;
                   return { ...prev, enemies: prev.enemies.map(e => e.id === job.targetId ? { ...e, imageUrl: url } : e) };
                });
                setBoss(prev => {
                   if (prev && prev.id === job.targetId) {
                      return { ...prev, imageUrl: url };
                   }
                   return prev;
                });
              } else if (job.type === 'trophy') {
                setCampaign(prev => {
                   if (!prev) return prev;
                   return { ...prev, enemies: prev.enemies.map(e => (e.dropTrophy && e.dropTrophy.id === job.targetId) ? { ...e, dropTrophy: { ...e.dropTrophy, imageUrl: url } } : e) };
                });
                setBoss(prev => {
                   if (prev && prev.dropTrophy && prev.dropTrophy.id === job.targetId) {
                      return { ...prev, dropTrophy: { ...prev.dropTrophy, imageUrl: url } };
                   }
                   return prev;
                });
              }
           } else {
               throw new Error("Empty URL returned for generation");
           }
           setImageQueue(prev => prev.filter(j => j.id !== job.id));
        } catch (e) {
           console.error("Queue Image gen failed for job", job.id, e);
           setImageQueue(prev => prev.map(j => j.id === job.id ? { ...j, status: 'failed', retryCount: (j.retryCount || 0) + 1 } : j));
        }
      });

      await Promise.allSettled(promises);
      processingImagesRef.current = false;
    };

    runJobs();
  }, [imageQueue, aiSettings, effectiveApiKey, effectiveAiBaseUrl]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  useEffect(() => {
    // Check if familiar injured time is up
    if (player.familiar?.status === 'injured' && player.familiar.injuredUntil && player.familiar.injuredUntil <= Date.now()) {
      setPlayer(prev => prev.familiar ? { ...prev, familiar: { ...prev.familiar, status: 'active', injuredUntil: undefined } } : prev);
    }

    // Check if altar oath failed
    if (gameState.altarTask?.status === 'active' && gameState.altarTask.deadline <= Date.now()) {
      const penaltyRoll = Math.floor(Math.random() * 3);
      if (penaltyRoll === 0) {
        // Pet permadeath
        setPlayer(prev => ({ ...prev, familiar: undefined }));
        setGmMessage("Клятва нарушена! Алтарь забрал жизнь твоего питомца в уплату долга.");
      } else if (penaltyRoll === 1) {
        // Lose levels
        setPlayer(prev => ({ ...prev, level: Math.max(1, prev.level - 2), xp: 0 }));
        setGmMessage("Клятва нарушена! Алтарь вытянул твой опыт. Ты теряешь уровни.");
      } else {
        // Normally ban from city... Let's just steal a lot of gold for simplicity without complex "banned" state.
        setPlayer(prev => ({ ...prev, gold: Math.max(0, prev.gold - 500) }));
        setGmMessage("Клятва нарушена! Алтарь наложил проклятие разорения.");
      }
      setGameState(prev => ({ ...prev, altarTask: { ...prev.altarTask!, status: 'failed' } }));
      import('./lib/sfx').then(({ playSound }) => playSound('error'));
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (player.familiar?.status === 'expedition' && player.familiar.expeditionEndsAt && player.familiar.expeditionEndsAt <= Date.now()) {
        const successChance = Math.min(0.2 + (player.dailyTasksCompleted || 0) * 0.2, 0.95);
        const roll = Math.random();
        if (roll < successChance) {
          // Win
          const goldReward = Math.floor(Math.random() * 50) + 20;
          const xpReward = Math.floor(Math.random() * 30) + 10;
          setPlayer(prev => ({
            ...prev,
            gold: prev.gold + goldReward,
            familiar: prev.familiar ? { ...prev.familiar, status: 'active', expeditionEndsAt: undefined, xp: prev.familiar.xp + xpReward } : undefined
          }));
          setGmMessage(`Твой зверь вернулся с триумфом! Добыча: +${goldReward} золота, +${xpReward} опыта питомца.`);
          import('./lib/sfx').then(({ playSound }) => playSound('powerup'));
        } else {
          // Lose
          setPlayer(prev => ({
            ...prev,
            familiar: { ...prev.familiar!, status: 'injured', expeditionEndsAt: undefined, injuredUntil: Date.now() + 7 * 24 * 60 * 60 * 1000 }
          }));
          setGmMessage('Катастрофа! Питомец был изранен дикими тварями в экспедиции. Он возвращается еле живым и нуждается в покое.');
          import('./lib/sfx').then(({ playSound }) => playSound('error'));
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [player.familiar]);

  useEffect(() => {
    safeStorageSet('questlog_ai_settings', JSON.stringify(aiSettings));
  }, [aiSettings]);

  useEffect(() => {
    safeStorageSet('questlog_game_state', JSON.stringify(gameState));
  }, [gameState]);

  useEffect(() => {
    const checkResets = () => {
      const now = new Date();
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const yesterdayMidnight = todayMidnight - 86400000;
      
      // Check for daily failures (HP loss and combo reset)
      const lastResetStr = localStorage.getItem('questlog_last_daily_reset');
      const lastReset = lastResetStr ? parseInt(lastResetStr) : 0;
      
      if (lastReset < todayMidnight && lastReset !== 0) {
        // A new day has started since we last checked
        
        // Calculate uncompleted dailies from yesterday
        const uncompletedDailies = tasks.filter(t => 
          (t.type === 'daily' || t.type === 'recurring') && 
          !t.completed && 
          (!t.availableAt || t.availableAt <= todayMidnight)
        );

        // Calculate completed dailies from yesterday
        const completedYesterdayTasks = tasks.filter(t => 
          t.completed && 
          t.lastCompletedAt && 
          t.lastCompletedAt >= yesterdayMidnight && 
          t.lastCompletedAt < todayMidnight
        );

        const missedYesterday = uncompletedDailies.map(t => t.text);
        const completedYesterday = completedYesterdayTasks.map(t => t.text);

        if (missedYesterday.length > 0 || completedYesterday.length > 0) {
          setPendingDailyMemory({ completed: completedYesterday, missed: missedYesterday });
        }

        setPlayer(prev => {
          let newCombo = prev.combo;
          let comboReset = false;
          
          // Reset combo if no task was completed yesterday
          if (prev.combo > 0 && (!prev.lastComboUpdate || prev.lastComboUpdate < yesterdayMidnight)) {
            newCombo = 0;
            comboReset = true;
          }

          // Midnight Echo Logic
          const missedTasksCount = uncompletedDailies.length;
          
          if (missedTasksCount > 0) {
            if (comboReset) {
              setMidnightEchoReport({ missedTasks: missedTasksCount, damageTaken: 0, comboReset: true });
            } else {
              setMidnightEchoReport({ missedTasks: missedTasksCount, damageTaken: 0, comboReset: false });
            }
          } else if (comboReset) {
            setMidnightEchoReport({ missedTasks: 0, damageTaken: 0, comboReset: true });
          }

          // Save history
          const todayStr = new Date(yesterdayMidnight).toISOString().split('T')[0];
          const newHistory = { ...(prev.dailyPointsHistory || {}) };
          newHistory[todayStr] = prev.dailyGrossPoints || 0;

          // Siege Penalty: if 5 events exist, lose 10% gold
          let newGold = prev.gold;
          if (gameState.events && gameState.events.length >= 5) {
            newGold = Math.floor(newGold * 0.9);
          }

          return {
            ...prev,
            combo: newCombo,
            gold: newGold,
            dailyGrossPoints: 0,
            dailyTasksCompleted: 0,
            dailyPointsHistory: newHistory
          };
        });

        // Generate random encounter / Map Event (Spawn up to 2)
        if (effectiveApiKey) {
          const weakestStat = Object.entries(player.stats).reduce((a, b) => a[1] < b[1] ? a : b)[0];
          const existingTaskTexts = tasks.map(t => t.text);
          import('./lib/ai').then(async m => {
            let availableCache = [...encounterCache];
            const spawnedEncounters = [];
            for (let i = 0; i < 2; i++) {
              try {
                let encounter = null;
                // Try cache first
                if (availableCache.length > 0) {
                   encounter = availableCache[0];
                   availableCache = availableCache.slice(1);
                } else {
                   encounter = await m.generateRandomEncounter(effectiveApiKey, effectiveAiBaseUrl, effectiveAiModel, weakestStat, existingTaskTexts);
                }

                if (encounter) {
                  spawnedEncounters.push(encounter);
                }
              } catch (err) {
                console.error("Failed to generate encounter", err);
              }
            }
            if (spawnedEncounters.length > 0) {
               setEncounterCache(availableCache);
               setGameState(prevGS => {
                    let currentEvents = prevGS.events || [];
                    for (const enc of spawnedEncounters) {
                       if (currentEvents.length >= 5) break; // City under siege
                       
                       // Find empty zones
                       const availableZones = Array.from({length: 10}, (_, i) => i).filter(i => !currentEvents.some(e => e.zoneIndex === i));
                       if (availableZones.length === 0) break;
                       
                       const randomZone = availableZones[Math.floor(Math.random() * availableZones.length)];
                       
                       const newEvent = {
                         id: crypto.randomUUID(),
                         zoneIndex: randomZone,
                         description: enc.story,
                         taskPrompt: enc.task,
                         rewardGold: (enc.difficulty || 1) * 15
                       };
                       
                       currentEvents = [...currentEvents, newEvent];
                    }
                    return { ...prevGS, events: currentEvents };
                  });
            }
          });
        }

        // Rotate shop items
        setGameState(prevGS => {
          if (campaign && campaign.itemPool && campaign.itemPool.length > 0) {
            const pool = [...campaign.itemPool];
            // Shuffle and pick 3
            for (let i = pool.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [pool[i], pool[j]] = [pool[j], pool[i]];
            }
            return { ...prevGS, shopItems: pool.slice(0, 3) };
          }
          return prevGS;
        });

        safeStorageSet('questlog_last_daily_reset', now.getTime().toString());
      } else if (lastReset === 0) {
        safeStorageSet('questlog_last_daily_reset', now.getTime().toString());
      }

      // Weekly Reset Logic
      const getMonday = (d: Date) => {
        const date = new Date(d);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        date.setDate(diff);
        date.setHours(0,0,0,0);
        return date;
      };
      
      const currentMonday = getMonday(now);
      const lastWeeklyReset = gameState.lastWeeklyReset ? new Date(gameState.lastWeeklyReset) : new Date(0);
      const lastWeeklyMonday = getMonday(lastWeeklyReset);

      if (currentMonday.getTime() > lastWeeklyMonday.getTime()) {
        setGameState(prev => ({
          ...prev,
          lastWeeklyReset: now.getTime(),
          weeklyCompletedCounts: {
            strength: 0,
            intelligence: 0,
            charisma: 0,
            willpower: 0,
            unknown: 0
          }
        }));
      }

      setTasks(prev => {
        let updated = false;
        const newTasks = prev.map(task => {
          if (!task.completed || !task.lastCompletedAt || task.type === 'one-off') return task;
          
          const lastCompleted = new Date(task.lastCompletedAt);
          let shouldReset = false;

          if (task.type === 'daily') {
            if (lastCompleted.getTime() < todayMidnight) shouldReset = true;
          } else if (task.type === 'weekly') {
            const getMonday = (d: Date) => {
              const date = new Date(d);
              const day = date.getDay();
              const diff = date.getDate() - day + (day === 0 ? -6 : 1);
              date.setDate(diff);
              date.setHours(0,0,0,0);
              return date;
            };
            
            const currentMonday = getMonday(now);
            const completedMonday = getMonday(lastCompleted);
            
            if (currentMonday.getTime() > completedMonday.getTime()) {
               shouldReset = true;
            }
          }

          if (shouldReset) {
            updated = true;
            return { ...task, completed: false, rewarded: false };
          }
          return task;
        });
        return updated ? newTasks : prev;
      });
    };

    checkResets();
    const interval = setInterval(checkResets, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [tasks, boss, gameState.lastWeeklyReset, campaign]);

  useEffect(() => {
    safeStorageSet('questlog_tasks_v2', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    safeStorageSet('questlog_player_v4', JSON.stringify(player));
  }, [player]);

  useEffect(() => {
    if (bossFailed) {
      setTimeLeft('Время вышло!');
    }
  }, [bossFailed]);

  useEffect(() => {
    safeStorageSet('questlog_boss_v3', JSON.stringify(boss));
  }, [boss]);

  useEffect(() => {
    if (!boss || !boss.id) return;
    
    const statsArr: StatType[] = ['strength', 'intelligence', 'charisma', 'willpower'];
    const hasAllBanter = boss.banter && statsArr.every(s => typeof boss.banter?.[s] === 'string' && boss.banter[s].trim() !== '');
    
    if (hasAllBanter) return;
    
    let isMounted = true;
    (async () => {
      try {
        const generatedBanter = await generateAllBossBanter(
          effectiveApiKey,
          effectiveAiBaseUrl,
          effectiveAiModel,
          boss.name,
          boss.description
        );
        if (isMounted) {
          setBoss(prev => {
            if (prev && prev.id === boss.id) {
              return {
                ...prev,
                banter: {
                  ...prev.banter,
                  ...generatedBanter
                }
              };
            }
            return prev;
          });
        }
      } catch (err) {
        console.error("Failed to pre-generate boss banter", err);
      }
    })();
    
    return () => {
      isMounted = false;
    };
  }, [boss?.id, effectiveApiKey, effectiveAiBaseUrl, effectiveAiModel]);

  useEffect(() => {
    if (campaign) {
      safeStorageSet('questlog_campaign', JSON.stringify(campaign));
    } else {
      localStorage.removeItem('questlog_campaign');
    }
  }, [campaign]);

  // Process Daily Memory
  useEffect(() => {
    if (pendingDailyMemory && effectiveApiKey) {
      const processMemory = async () => {
        const log = await generateDailyMemoryLog(effectiveApiKey, effectiveAiBaseUrl, effectiveAiModel, pendingDailyMemory.completed, pendingDailyMemory.missed);
        setGameState(prev => {
          const newLogs = [...prev.chronicle.recent_memory_log, log].slice(-7); // Keep last 7 days
          return {
            ...prev,
            chronicle: {
              ...prev.chronicle,
              recent_memory_log: newLogs
            }
          };
        });
        setPendingDailyMemory(null);
      };
      processMemory();
    } else if (pendingDailyMemory) {
      // If no API key, just clear it
      setPendingDailyMemory(null);
    }
  }, [pendingDailyMemory, aiSettings]);

  // Process Weekly Analytics
  useEffect(() => {
    if (pendingWeeklyAnalytics && effectiveApiKey) {
      const processAnalytics = async () => {
        const analytics = await updateBehaviorAnalytics(effectiveApiKey, effectiveAiBaseUrl, effectiveAiModel, gameState.chronicle.recent_memory_log, tasks);
        if (analytics) {
          setGameState(prev => {
            // Calculate favorite and weakest stats
            const stats = Object.entries(player.stats).map(([stat, data]) => ({ stat, level: (data as {level: number, xp: number}).level, xp: (data as {level: number, xp: number}).xp }));
            stats.sort((a, b) => (b.level * 1000 + b.xp) - (a.level * 1000 + a.xp));
            const favorite_stat = stats[0].stat as StatType;
            const weakest_stat = stats[stats.length - 1].stat as StatType;

            return {
              ...prev,
              chronicle: {
                ...prev.chronicle,
                behavior_analytics: {
                  ...prev.chronicle.behavior_analytics,
                  favorite_stat,
                  weakest_stat,
                  ignored_tasks_patterns: analytics.ignored_tasks_patterns || [],
                  preferred_tasks_patterns: analytics.preferred_tasks_patterns || [],
                },
                master_summary: analytics.master_summary || prev.chronicle.master_summary
              }
            };
          });
        }
        setPendingWeeklyAnalytics(false);
      };
      processAnalytics();
    } else if (pendingWeeklyAnalytics) {
      setPendingWeeklyAnalytics(false);
    }
  }, [pendingWeeklyAnalytics, aiSettings, tasks, player.stats, gameState.chronicle.recent_memory_log]);

  const prevLevelRef = useRef(player.level);
  const prevComboRef = useRef(player.combo);
  const [showClassGlow, setShowClassGlow] = useState(false);

  useEffect(() => {
    if (player.level > prevLevelRef.current) {
      if (player.level % 5 === 0 && effectiveApiKey) {
        const generateClass = async () => {
          const favoriteStat = gameState.chronicle.behavior_analytics.favorite_stat !== 'unknown' 
            ? STATS[gameState.chronicle.behavior_analytics.favorite_stat].name 
            : 'Неизвестно';
          const newClass = await import('./lib/ai').then(m => m.generatePlayerClass(
            effectiveApiKey, 
            effectiveAiBaseUrl, 
            effectiveAiModel, 
            player.level, 
            favoriteStat, 
            player.playerClass || 'Новичок'
          ));
          
          setPlayer(prev => ({ ...prev, playerClass: newClass }));
          setShowClassGlow(true);
          setTimeout(() => setShowClassGlow(false), 3000);
        };
        generateClass();
      }
    }
    prevLevelRef.current = player.level;
  }, [player.level, aiSettings, gameState.chronicle.behavior_analytics.favorite_stat, player.playerClass]);

  // Familiar Logic
  useEffect(() => {
    const handleFamiliar = async () => {
      const currentCombo = player.combo;
      const prevCombo = prevComboRef.current;
      
      if (currentCombo === prevCombo) return;

      setPlayer(prev => {
        let newFamiliar = prev.familiar ? { ...prev.familiar } : undefined;

        if (currentCombo === 0 && newFamiliar) {
          newFamiliar.buffActive = false;
        } else if (currentCombo >= 3 && newFamiliar) {
          newFamiliar.buffActive = true;
        }

        if (currentCombo === 3 && !newFamiliar) {
          newFamiliar = { name: 'Странное яйцо', type: 'Яйцо', stage: 'egg', buffActive: true, xp: 0, level: 1 };
        }

        return { ...prev, familiar: newFamiliar };
      });
      
      prevComboRef.current = currentCombo;
    };

    handleFamiliar();
  }, [player.combo, player.familiar, player.playerClass, aiSettings]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const deadline = campaign ? campaign.deadline : boss.expiresAt;
      
      if (now > deadline && boss.hp > 0 && !isGeneratingBoss && !bossFailed) {
        setBossFailed(true);
        setTimeLeft('Время вышло!');
      } else if (now <= deadline) {
        const diff = deadline - now;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        setTimeLeft(`${days}д ${hours}ч ${minutes}м`);
      } else {
        setTimeLeft('Время вышло!');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [boss, campaign, isGeneratingBoss, bossFailed]);

  const gainRewards = (xpAmount: number, damageAmount: number, stat: StatType, statXpAmount: number, isDaily: boolean, goldAmount: number = 0) => {
    setGameState(prev => {
      const counts = { ...(prev.weeklyCompletedCounts || { strength: 0, intelligence: 0, charisma: 0, willpower: 0, unknown: 0 }) };
      counts[stat] = (counts[stat] || 0) + 1;
      return {
        ...prev,
        weeklyCompletedCounts: counts
      };
    });

    setPlayer(prev => {
      let xpMultiplier = 1;
      let statXpMultiplier = 1;
      let goldMultiplier = 1;
      
      prev.inventory.forEach(trophy => {
        if (trophy.effect.type === 'xp_boost') {
          if (!trophy.effect.targetStat || trophy.effect.targetStat === stat) {
            xpMultiplier += trophy.effect.value;
            statXpMultiplier += trophy.effect.value;
          }
        }
      });

      const familiarBuff = getFamiliarBuff(prev.combo, prev.familiar);
      xpMultiplier += familiarBuff;
      statXpMultiplier += familiarBuff;
      goldMultiplier += familiarBuff;

      const now = new Date();
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      
      let newCombo = prev.combo;
      let newLastComboUpdate = prev.lastComboUpdate;
      
      if (!prev.lastComboUpdate || prev.lastComboUpdate < todayMidnight) {
        newCombo += 1;
        newLastComboUpdate = now.getTime();
      }

      const comboMultiplier = 1 + (newCombo * 0.1);
      const finalXp = Math.floor(xpAmount * comboMultiplier * xpMultiplier);
      const finalDamage = Math.floor(damageAmount * comboMultiplier);
      const finalStatXp = Math.floor(statXpAmount * comboMultiplier * statXpMultiplier);
      const finalGold = Math.floor(goldAmount * comboMultiplier * goldMultiplier);

      let newXp = prev.xp + finalXp;
      let newLevel = prev.level;
      let req = getXpRequirement(newLevel);
      while (newXp >= req) {
        newXp -= req;
        newLevel++;
        req = getXpRequirement(newLevel);
      }

      const statData = { ...prev.stats[stat] };
      statData.xp += finalStatXp;
      let statReq = getStatXpRequirement(statData.level);
      while (statData.xp >= statReq) {
        statData.xp -= statReq;
        statData.level++;
        statReq = getStatXpRequirement(statData.level);
      }

      const newPendingDamage = { ...prev.pendingDamage };
      newPendingDamage[stat] = (newPendingDamage[stat] || 0) + finalDamage;

      const newDailyGrossPoints = (prev.dailyGrossPoints || 0) + damageAmount;
      const newDailyTasksCompleted = isDaily ? (prev.dailyTasksCompleted || 0) + 1 : (prev.dailyTasksCompleted || 0);

      let updatedFamiliar = prev.familiar ? { ...prev.familiar } : undefined;
      if (updatedFamiliar) {
        setFamiliarSkillUsed(false); // Recharge companion skill on task completion
        updatedFamiliar.xp += 10;
        
        if (updatedFamiliar.stage === 'egg') {
          if (updatedFamiliar.xp >= 100) {
            updatedFamiliar.stage = 'baby';
            updatedFamiliar.xp = 0;
            updatedFamiliar.level = 1;
            updatedFamiliar.name = 'Новорожденный Пушистик';
            updatedFamiliar.type = 'Фея';
          }
        } else {
          let nextLevelReq = updatedFamiliar.level * 100;
          if (updatedFamiliar.xp >= nextLevelReq) {
            updatedFamiliar.xp -= nextLevelReq;
            updatedFamiliar.level += 1;
            if (updatedFamiliar.stage === 'baby' && updatedFamiliar.level >= 10) {
              updatedFamiliar.stage = 'evolved';
            } else if (updatedFamiliar.stage === 'evolved' && updatedFamiliar.level >= 25) {
              updatedFamiliar.stage = 'ultra';
            }
          }
        }

        if (updatedFamiliar.status === 'expedition' && updatedFamiliar.expeditionEndsAt) {
          updatedFamiliar.expeditionEndsAt = Math.max(Date.now(), updatedFamiliar.expeditionEndsAt - 45 * 60 * 1000);
        }
      }

      return {
        ...prev,
        level: newLevel,
        xp: newXp,
        gold: (prev.gold || 0) + finalGold,
        combo: newCombo,
        lastComboUpdate: newLastComboUpdate,
        pendingDamage: newPendingDamage,
        dailyGrossPoints: newDailyGrossPoints,
        dailyTasksCompleted: newDailyTasksCompleted,
        familiar: updatedFamiliar,
        stats: {
          ...prev.stats,
          [stat]: statData
        }
      };
    });

    if (masterQuest && masterQuest.stat === stat) {
      setMasterQuest(prev => {
        if (!prev) return null;
        const pointsAdded = 10;
        const nextCurrent = Math.min(prev.target, prev.current + pointsAdded);
        if (nextCurrent >= prev.target && prev.current < prev.target) {
          setGmMessage(`Мастер: "Великолепная работа! Твое Испытание Баланса завершено. Сила характеристики ${STATS[stat].name} восстановлена. Ты готов сразиться с боссом!"`);
        }
        return { ...prev, current: nextCurrent };
      });
    }
  };

  const handleAutoCategorizeTasks = async () => {
    if (!effectiveApiKey && !effectiveAiBaseUrl) {
      setApiError("Для авто-категоризации нужен API ключ");
      setTimeout(() => setApiError(null), 3000);
      return;
    }

    const unknownTasks = tasks.filter(t => t.stat === 'unknown' && !t.completed);
    if (unknownTasks.length === 0) return;

    setIsCategorizingTasks(true);
    try {
      const { categorizeTasksBatchWithAI } = await import('./lib/ai');
      const taskTexts = unknownTasks.map(t => t.text);
      const predictedData = await categorizeTasksBatchWithAI(effectiveApiKey, effectiveAiBaseUrl, effectiveAiModel, taskTexts);
      
      setTasks(prev => prev.map(t => {
        if (t.stat === 'unknown' && !t.completed) {
          const index = unknownTasks.findIndex(ut => ut.id === t.id);
          if (index !== -1 && predictedData[index]) {
            return { ...t, stat: predictedData[index].stat, difficulty: predictedData[index].difficulty };
          }
        }
        return t;
      }));
      setGmMessage("Я распределил задачи по характеристикам. Проверьте, всё ли верно!");
    } catch (error: any) {
      console.error("Failed to auto-categorize tasks:", error);
      setApiError(error.message || "Ошибка при авто-категоризации");
      setTimeout(() => setApiError(null), 3000);
    } finally {
      setIsCategorizingTasks(false);
    }
  };

  const handleRequestBalanceTasks = async () => {
    if (!masterQuest) return;
    const deficit = masterQuest.target - masterQuest.current;
    const neededCount = Math.max(1, Math.ceil(deficit / 10));
    setIsGeneratingBalanceTasks(true);
    try {
      const generated = await generateMasterBalanceTasks(
        effectiveApiKey,
        effectiveAiBaseUrl,
        effectiveAiModel,
        masterQuest.stat,
        neededCount,
        tasks.map(t => t.text)
      );
      
      const newTasks: Task[] = generated.map(gt => ({
        id: crypto.randomUUID(),
        text: gt.text,
        stat: masterQuest.stat,
        type: 'one-off',
        completed: false,
        rewarded: false,
        createdAt: Date.now(),
        difficulty: gt.difficulty || 2,
        isMasterTask: true
      }));

      setTasks(prev => {
        const existingLowerTextSet = new Set(prev.map(t => t.text.trim().toLowerCase()));
        const uniqueNewTasks: Task[] = [];
        for (const nt of newTasks) {
          const trimmedLower = nt.text.trim().toLowerCase();
          if (!existingLowerTextSet.has(trimmedLower)) {
            uniqueNewTasks.push(nt);
            existingLowerTextSet.add(trimmedLower);
          }
        }
        return [...prev, ...uniqueNewTasks];
      });
      setGmMessage(`Мастер: "Вот твои испытания для развития характеристики ${STATS[masterQuest.stat]?.name || masterQuest.stat}. Выполни их, чтобы восстановить пошатнувшийся баланс!"`);
      import('./lib/sfx').then(({ playSound }) => playSound('powerup'));
      setActiveTab('quests');
    } catch (error: any) {
      console.error("Failed to generate master balance tasks:", error);
      setApiError(error.message || "Ошибка при создании задач");
      setTimeout(() => setApiError(null), 3000);
    } finally {
      setIsGeneratingBalanceTasks(false);
    }
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    let statToUse = newTaskStat;
    if (statToUse === 'unknown' && !effectiveApiKey && !effectiveAiBaseUrl) {
      statToUse = 'strength';
    }

    setTasks([{ 
      id: crypto.randomUUID(), 
      text: newTask, 
      stat: statToUse,
      type: newTaskType,
      targetDay: newTaskType === 'weekly' ? newTaskDay : undefined,
      repeatIntervalDays: newTaskType === 'recurring' ? newTaskRepeatInterval : undefined,
      completed: false, 
      rewarded: false, 
      createdAt: Date.now() 
    }, ...tasks]);
    setNewTask('');
    if (statToUse !== 'unknown') {
      setNewTaskStat(statToUse);
    }
  };

  const toggleTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    if (navigator.vibrate) navigator.vibrate(15);

    const isCompleting = !task.completed;
    
    if (isCompleting) {
      import('./lib/sfx').then(({ playSound }) => playSound('ding'));
    }

    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        return { 
          ...t, 
          completed: isCompleting, 
          lastCompletedAt: isCompleting ? Date.now() : t.lastCompletedAt
        };
      }
      return t;
    }));
  };

  const availableDailyTasks = tasks.filter(t => (t.type === 'daily' || t.type === 'recurring') && (!t.availableAt || t.availableAt <= Date.now()));
  const completedDailyTasks = availableDailyTasks.filter(t => t.completed);
  const isPerfectDay = availableDailyTasks.length > 0 && completedDailyTasks.length === availableDailyTasks.length;

  const confirmPendingTasks = async () => {
    const pendingTasks = tasks.filter(t => t.completed && !t.rewarded && t.stat !== 'unknown');
    const unknownCompletedTasks = tasks.filter(t => t.completed && !t.rewarded && t.stat === 'unknown');
    
    if (unknownCompletedTasks.length > 0) {
      setApiError("Сначала распределите характеристики для выполненных задач (Авто-статы)!");
      setTimeout(() => setApiError(null), 3000);
      if (pendingTasks.length === 0) return;
    }

    if (pendingTasks.length === 0) return;

    if (effectiveApiKey || effectiveAiBaseUrl) {
      setIsEvaluating("batch");
      try {
        const batchData = pendingTasks.map(t => ({ text: t.text, stat: t.stat }));
        const result = await evaluateTasksBatchWithAI(effectiveApiKey, effectiveAiBaseUrl, effectiveAiModel, batchData);
        
        let totalDamage = 0;
        
        result.results.forEach((res, index) => {
          const task = pendingTasks[index];
          const statLevel = player.stats[task.stat].level;
          const damage = 10 + (statLevel * 2);
          totalDamage += damage;
          
          gainRewards(res.xp, damage, task.stat, res.statXp, task.type === 'daily', res.gold || 0);
        });

        setGmMessage(result.gmComment);

        setTasks(prev => {
          let newTasks = [...prev];
          
          pendingTasks.forEach((pt, index) => {
            const res = result.results[index];
            newTasks = newTasks.map(t => t.id === pt.id ? { ...t, rewarded: true, difficulty: res.difficulty } : t);
            
            if (pt.type === 'recurring' && pt.repeatIntervalDays) {
              const nextAvailableAt = new Date();
              nextAvailableAt.setHours(0, 0, 0, 0);
              nextAvailableAt.setDate(nextAvailableAt.getDate() + pt.repeatIntervalDays);
              
              newTasks.push({
                ...pt,
                id: crypto.randomUUID(),
                completed: false,
                rewarded: false,
                createdAt: Date.now(),
                availableAt: nextAvailableAt.getTime()
              });
            }
          });
          
          return newTasks;
        });

      } catch (e: any) {
        console.error("AI Batch Evaluation failed", e);
        setApiError(e?.message || "Неизвестная ошибка при оценке задач");
      } finally {
        setIsEvaluating(null);
      }
    } else {
      let totalDamage = 0;
      pendingTasks.forEach(task => {
        const statLevel = player.stats[task.stat].level;
        const damage = 10 + (statLevel * 2);
        totalDamage += damage;
        gainRewards(25, damage, task.stat, 20, task.type === 'daily');
      });

      setTasks(prev => {
        let newTasks = [...prev];
        
        pendingTasks.forEach(pt => {
          newTasks = newTasks.map(t => t.id === pt.id ? { ...t, rewarded: true } : t);
          
          if (pt.type === 'recurring' && pt.repeatIntervalDays) {
            const nextAvailableAt = new Date();
            nextAvailableAt.setHours(0, 0, 0, 0);
            nextAvailableAt.setDate(nextAvailableAt.getDate() + pt.repeatIntervalDays);
            
            newTasks.push({
              ...pt,
              id: crypto.randomUUID(),
              completed: false,
              rewarded: false,
              createdAt: Date.now(),
              availableAt: nextAvailableAt.getTime()
            });
          }
        });
        
        return newTasks;
      });
    }
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const clearCompleted = () => {
    setTasks(prev => prev.filter(t => {
      if (t.completed && t.rewarded) {
        if (t.type === 'one-off' || t.type === 'recurring') return false; // Delete these
        return true; // Keep daily and weekly
      }
      return true;
    }));
  };

  const feedFamiliar = async (xpAmount: number) => {
    if (!player.familiar) return;
    
    setPlayer(prev => {
      if (!prev.familiar) return prev;
      const newXp = prev.familiar.xp + xpAmount;
      let newLevel = prev.familiar.level;
      let newStage = prev.familiar.stage;
      
      // Simple leveling logic: 100 XP per level
      if (newXp >= newLevel * 100) {
        newLevel++;
      }
      
      // Evolution logic
      if (newLevel >= 3 && newStage === 'egg') newStage = 'baby';
      else if (newLevel >= 10 && newStage === 'baby') newStage = 'evolved';
      else if (newLevel >= 25 && newStage === 'evolved') newStage = 'ultra';
      
      return {
        ...prev,
        familiar: {
          ...prev.familiar,
          xp: newXp,
          level: newLevel,
          stage: newStage
        }
      };
    });
    
    // Check if stage changed to trigger AI generation
    const currentStage = player.familiar.stage;
    const newXp = player.familiar.xp + xpAmount;
    let newLevel = player.familiar.level;
    if (newXp >= newLevel * 100) newLevel++;
    
    let newStage = currentStage;
    if (newLevel >= 3 && currentStage === 'egg') newStage = 'baby';
    else if (newLevel >= 10 && currentStage === 'baby') newStage = 'evolved';
    else if (newLevel >= 25 && currentStage === 'evolved') newStage = 'ultra';
    
    if (newStage !== currentStage && effectiveApiKey) {
      setIsGeneratingBoss(true);
      setGmMessage(`Твой питомец эволюционирует в стадию: ${newStage}!`);
      try {
        const data = await import('./lib/ai').then(m => m.generateFamiliar(effectiveApiKey, effectiveAiBaseUrl, effectiveAiModel, player.playerClass || 'Новичок', newStage as any, player.familiar, aiSettings.enableImages, aiSettings.imageModel, aiSettings.apiKey, aiSettings.baseUrl));
        if (data) {
          setPlayer(prev => ({
            ...prev,
            familiar: { 
              ...prev.familiar!,
              name: data.name, 
              type: data.type, 
              stage: newStage,
              imageUrl: data.imageUrl
            }
          }));
          setGmMessage(`Твой питомец стал: ${data.name} (${data.type})!`);
        }
      } catch (e) {
        console.error("Evolution failed", e);
      } finally {
        setIsGeneratingBoss(false);
      }
    }
  };

  const handlePetAction = (action: 'pet' | 'feed' | 'train') => {
    if (!player.familiar) return;
    
    // Egg hatching bypasses normal active status checks
    if (player.familiar.stage === 'egg') {
      const now = Date.now();
      if (action === 'pet') {
        if (player.familiar.lastWarmedAt && (now - player.familiar.lastWarmedAt) < 24 * 60 * 60 * 1000) {
          import('./lib/sfx').then(({ playSound }) => playSound('error'));
          setGmMessage('Яйцо уже согрето вашей заботой сегодня. Дайте ему согреться!');
          return;
        }
        
        setPlayer(prev => {
          if (!prev.familiar) return prev;
          const updated = { ...prev.familiar };
          updated.xp = Math.min(100, updated.xp + 25);
          updated.lastWarmedAt = now;
          let newStage = updated.stage;
          if (updated.xp >= 100) {
            newStage = 'baby';
            updated.xp = 0;
            updated.level = 1;
            updated.name = 'Новорожденный Пушистик';
            updated.type = 'Фея';
          }
          return {
            ...prev,
            familiar: {
              ...updated,
              stage: newStage
            }
          };
        });
        import('./lib/sfx').then(({ playSound }) => playSound('powerup'));
        setGmMessage('Вы согрели яйцо дыханием и заботой. Будущий спутник крепнет (+25% warmth)!');
      } else if (action === 'feed') {
        if (player.gold < 30) {
          import('./lib/sfx').then(({ playSound }) => playSound('error'));
          setGmMessage('Недостаточно золота для обогрева очагом (нужно 30 золота)!');
          return;
        }
        setPlayer(prev => {
          if (!prev.familiar) return prev;
          const updated = { ...prev.familiar };
          updated.xp = Math.min(100, updated.xp + 35);
          let newStage = updated.stage;
          if (updated.xp >= 100) {
            newStage = 'baby';
            updated.xp = 0;
            updated.level = 1;
            updated.name = 'Новорожденный Пушистик';
            updated.type = 'Фея';
          }
          return {
            ...prev,
            gold: prev.gold - 30,
            familiar: {
              ...updated,
              stage: newStage
            }
          };
        });
        import('./lib/sfx').then(({ playSound }) => playSound('powerup'));
        setGmMessage('Вы поместили яйцо в тепло домашнего очага (-30 золота). Прогресс вылупления увеличен на 35%!');
      }
      return;
    }

    if (player.familiar.status === 'injured') {
      import('./lib/sfx').then(({ playSound }) => playSound('error'));
      setGmMessage('Твой питомец слишком слаб и изможден. Сначала исцели его кормом Торговки!');
      return;
    }
    
    const now = Date.now();
    const petType = player.familiar.type || 'Волк';
    
    if (action === 'pet') {
      if (player.familiar.lastPettedAt && (now - player.familiar.lastPettedAt) < 24 * 60 * 60 * 1000) {
        import('./lib/sfx').then(({ playSound }) => playSound('error'));
        setGmMessage('Ваш спутник уже затискан до упаду сегодня! Погладьте его завтра.');
        return;
      }
      
      const voice = getPetInteractionVoice(petType, 'pet');
      setPetReactionMessage(voice);
      import('./lib/sfx').then(({ playSound }) => playSound('powerup'));
      
      setPlayer(prev => {
        if (!prev.familiar) return prev;
        const updated = { ...prev.familiar };
        updated.xp += 15;
        updated.lastPettedAt = now;
        
        let newStage = updated.stage;
        let newLevel = updated.level;
        const nextLevelReq = newLevel * 100;
        if (updated.xp >= nextLevelReq) {
          updated.xp -= nextLevelReq;
          newLevel += 1;
          if (newLevel >= 10 && newStage === 'baby') newStage = 'evolved';
          else if (newLevel >= 25 && newStage === 'evolved') newStage = 'ultra';
        }
        
        return {
          ...prev,
          familiar: {
            ...updated,
            level: newLevel,
            stage: newStage
          }
        };
      });
      setGmMessage(`Вы нежно погладили питомца: ${player.familiar.name} получает +15 опыта!`);
    } else if (action === 'feed') {
      const foodItemIndex = player.inventory.findIndex(item => item.effect.type === 'pet_food');
      const hasFoodItem = foodItemIndex !== -1;
      
      if (!hasFoodItem && player.gold < 30) {
        import('./lib/sfx').then(({ playSound }) => playSound('error'));
        setGmMessage('У вас нет корма в инвентаре и не хватает золота (нужно 30 золота) для угощения!');
        return;
      }
      
      const voice = getPetInteractionVoice(petType, 'feed');
      setPetReactionMessage(voice);
      import('./lib/sfx').then(({ playSound }) => playSound('powerup'));
      
      setPlayer(prev => {
        if (!prev.familiar) return prev;
        const updated = { ...prev.familiar };
        updated.xp += 40;
        
        let updatedInventory = [...prev.inventory];
        let updatedGold = prev.gold;
        if (hasFoodItem) {
          updatedInventory.splice(foodItemIndex, 1);
        } else {
          updatedGold -= 30;
        }
        
        let newStage = updated.stage;
        let newLevel = updated.level;
        const nextLevelReq = newLevel * 100;
        if (updated.xp >= nextLevelReq) {
          updated.xp -= nextLevelReq;
          newLevel += 1;
          if (newLevel >= 10 && newStage === 'baby') newStage = 'evolved';
          else if (newLevel >= 25 && newStage === 'evolved') newStage = 'ultra';
        }
        
        return {
          ...prev,
          gold: updatedGold,
          inventory: updatedInventory,
          familiar: {
            ...updated,
            level: newLevel,
            stage: newStage
          }
        };
      });
      setGmMessage(`Вы накормили спутника лакомством: ${player.familiar.name} сыт и получает +40 опыта питомца!`);
    } else if (action === 'train') {
      if (player.gold < 40) {
        import('./lib/sfx').then(({ playSound }) => playSound('error'));
        setGmMessage('Недостаточно золота! Нужно 40 золота для тренировок зверя.');
        return;
      }
      
      const voice = getPetInteractionVoice(petType, 'train');
      setPetReactionMessage(voice);
      import('./lib/sfx').then(({ playSound }) => playSound('powerup'));
      
      setPlayer(prev => {
        if (!prev.familiar) return prev;
        const updated = { ...prev.familiar };
        updated.xp += 60;
        
        let newStage = updated.stage;
        let newLevel = updated.level;
        const nextLevelReq = newLevel * 100;
        if (updated.xp >= nextLevelReq) {
          updated.xp -= nextLevelReq;
          newLevel += 1;
          if (newLevel >= 10 && newStage === 'baby') newStage = 'evolved';
          else if (newLevel >= 25 && newStage === 'evolved') newStage = 'ultra';
        }
        
        return {
          ...prev,
          gold: prev.gold - 40,
          familiar: {
            ...updated,
            level: newLevel,
            stage: newStage
          }
        };
      });
      setGmMessage(`Упорная тренировка завершена! ${player.familiar.name} взбодрился и получает +60 опыта!`);
    }
  };

  const handleFamiliarSkill = () => {
    if (!player.familiar || player.familiar.stage === 'egg' || player.familiar.status !== 'active' || familiarSkillUsed || boss.hp <= 0) return;
    
    import('./lib/sfx').then(({ playSound }) => playSound('powerup'));
    
    const petType = player.familiar.type || 'Волк';
    const skill = FAMILIAR_SKILLS[petType] || {
      name: 'Удар Компаньона',
      description: 'Священная атака вашего верного спутника.',
      effectText: 'наносит стремительный сбалансированный удар!',
      damageType: 'willpower'
    };
    
    const baseDmg = getFamiliarSkillDamage(player.familiar, player.combo);
    // Find weakness stat to apply multipliers
    let weaknessStat: StatType = skill.damageType;
    let maxMultiplier = 0;
    if (boss.multipliers) {
      (Object.keys(boss.multipliers) as StatType[]).forEach(stat => {
        if (boss.multipliers[stat] > maxMultiplier) {
          maxMultiplier = boss.multipliers[stat];
          weaknessStat = stat;
        }
      });
    }

    const multiplier = boss.multipliers?.[weaknessStat] ?? 1.5;
    const damageDealt = Math.round(baseDmg * multiplier);
    
    setFamiliarSkillUsed(true);
    setLastDamageDealt(damageDealt);
    setLastDamageColor(STATS[weaknessStat]?.hex || '#00FF66');
    setBossHit(true);
    setTimeout(() => setBossHit(false), 400);
    
    setBoss(prev => {
      if (!prev) return null;
      const newHp = Math.max(0, prev.hp - damageDealt);
      return { ...prev, hp: newHp };
    });
    
    setGmMessage(`${player.familiar.name}: "*Гррр!* ${player.familiar.name} применяет боевой навык «${skill.name}» и ${skill.effectText} Нанесено ${damageDealt} ед. урона!"`);

    // Let boss respond to pet's devastating blow
    const companionSurvived = boss.hp - damageDealt > 0;
    setTimeout(() => {
      if (companionSurvived) {
        const updatedBoss = { ...boss, hp: Math.max(0, boss.hp - damageDealt) };
        const reactionLine = getBossBanterLine(updatedBoss, weaknessStat);
        setGmMessage(`Босс: "${reactionLine}"`);
        triggerBossBanterBubble(reactionLine);
      } else {
        triggerBossBanterBubble("*Издает сокрушительный предсмертный рык и рассыпается древним прахом...*");
      }
    }, 1200);
  };

  const handleAttack = () => {
    const totalPending = (Object.values(player.pendingDamage) as number[]).reduce((a, b) => a + b, 0);
    if (totalPending <= 0 || boss.hp <= 0) return;

    if (navigator.vibrate) navigator.vibrate([50, 50, 100]);
    import('./lib/sfx').then(({ playSound }) => playSound('slash'));

    let damageDealt = 0;
    let maxStat: StatType = 'strength';
    let maxPoints = 0;

    (Object.keys(player.pendingDamage) as StatType[]).forEach(stat => {
      const points = player.pendingDamage[stat];
      if (points > maxPoints) {
        maxPoints = points;
        maxStat = stat;
      }
      
      let trophyMultiplier = 1;
      player.inventory.forEach(trophy => {
        if (trophy.effect.type === 'damage_boost') {
          if (!trophy.effect.targetStat || trophy.effect.targetStat === stat) {
            trophyMultiplier += trophy.effect.value;
          }
        }
      });

      const familiarBuff = getFamiliarBuff(player.combo, player.familiar);
      const multiplier = boss.multipliers?.[stat] ?? 1;
      damageDealt += points * multiplier * (trophyMultiplier + familiarBuff);
    });
    
    damageDealt = Math.floor(damageDealt);

    // Pre-generate victory chronicle when boss hp falls to 20% or less
    const projectedHp = Math.max(0, boss.hp - damageDealt);
    const isCampaignFinished = campaign && campaign.currentEnemyIndex >= campaign.enemies.length - 1;
    if (isCampaignFinished && projectedHp <= boss.maxHp * 0.2 && !chronicleVictory && !preGeneratingChronicleRef.current) {
      preGeneratingChronicleRef.current = true;
      (async () => {
        if (effectiveApiKey || effectiveAiBaseUrl) {
          try {
            const victoryChronicle = await generateChronicleVictory(
              effectiveApiKey,
              effectiveAiBaseUrl,
              effectiveAiModel,
              boss.name,
              campaign ? campaign.title : 'Неизвестная Земля',
              player.playerClass || 'Герой',
              player.stats
            );
            if (victoryChronicle) {
              const savedChronicle: ChronicleVictory = {
                title: victoryChronicle.title,
                story: victoryChronicle.story,
                imagePrompt: victoryChronicle.medievalImagePrompt,
              };
              setChronicleVictory(savedChronicle);
              
              const chronicleJob: any = {
                id: crypto.randomUUID(),
                type: 'chronicle_victory',
                targetId: 'chronicle_victory',
                prompt: victoryChronicle.medievalImagePrompt,
                aspectRatio: '1:1',
                status: 'pending',
                retryCount: 0
              };
              setImageQueue(prev => [...prev, chronicleJob]);
            }
          } catch (err) {
            console.error("Failed to pregenerate chronicle victory in background", err);
            preGeneratingChronicleRef.current = false;
          }
        } else {
          setChronicleVictory({
            title: `Свержение ${boss.name}`,
            story: `Великий триумф свершился! Доблестный ${player.playerClass || 'Герой'} превозмог все испытания и одолел Владыку по имени ${boss.name}, принеся вечный мир в эти земли. Хроники вечно будут хранить память об этом подвиге.`,
            imagePrompt: ""
          });
        }
      })();
    }

    setLastDamageDealt(damageDealt);
    setLastDamageColor(STATS[maxStat].hex);
    setBossHit(true);
    setTimeout(() => setBossHit(false), 400);

    let bossSurvived = false;
    let newPendingDamage = { ...defaultPendingDamage };

    setBoss(prev => {
      const newHp = Math.max(0, prev.hp - damageDealt);
      if (newHp > 0) bossSurvived = true;
      return { ...prev, hp: newHp };
    });

    setPlayer(prev => {
      if (damageDealt > boss.hp) {
        // Overkill logic: refund unused pending damage
        const usedFraction = boss.hp / damageDealt;
        const remainingFraction = 1 - usedFraction;
        
        (Object.keys(prev.pendingDamage) as StatType[]).forEach(stat => {
          newPendingDamage[stat] = Math.floor(prev.pendingDamage[stat] * remainingFraction);
        });
      }
      
      return { 
        ...prev, 
        pendingDamage: newPendingDamage
      };
    });

    const updatedBoss = { ...boss, hp: Math.max(0, boss.hp - damageDealt) };

    if (bossSurvived) {
      const bossLine = getBossBanterLine(updatedBoss, maxStat);
      setGmMessage(`Босс: "${bossLine}"`);
      triggerBossBanterBubble(bossLine);
    } else {
      setGmMessage(`Мастер: "Превосходно! Владыка ${boss.name} повержен твоей непоколебимой силой!"`);
      triggerBossBanterBubble("*Издает сокрушительный предсмертный рык и рассыпается древним прахом...*");
    }
  };

  const handleBossFailed = () => {
    setBossFailed(false);
    setPlayer(prev => ({
      ...prev,
      level: Math.max(1, prev.level - 1),
      combo: 0,
      pendingDamage: defaultPendingDamage
    }));
    
    const newNemesis = boss ? { ...boss, escaped: true } : null;
    setPendingWeeklyAnalytics(true);
    setGameState(prev => ({
      ...prev,
      nemesisBoss: newNemesis,
      chronicle: {
        ...prev.chronicle,
        campaign_history: {
          ...prev.chronicle.campaign_history,
          bosses_escaped: prev.chronicle.campaign_history.bosses_escaped + 1,
          nemesis: newNemesis ? newNemesis.name : prev.chronicle.campaign_history.nemesis
        }
      }
    }));
    setGmMessage(`Вы потерпели поражение и потеряли один уровень.`);
    setCampaign(null);
    if (boss) {
      setBoss({ ...boss, hp: 0, escaped: true });
    }
    
    if (effectiveApiKey || effectiveAiBaseUrl) {
      handleTestGenerateBoss(newNemesis || undefined);
    } else {
      setBoss(generateBoss(Math.max(1, player.level - 1), player.dailyPointsHistory, player.inventory, false, newNemesis || undefined));
    }
  };

  const handleBossDefeated = async () => {
    setIsGeneratingBoss(true); // Disable button immediately to prevent double clicks
    
    const isCampaignFinished = campaign && campaign.currentEnemyIndex >= campaign.enemies.length - 1;
    setVictoryMessage(isCampaignFinished ? "Кампания завершена!" : "Босс повержен!");
    setShowVictory(true);
    setDroppedTrophy(null);
    
    if (isCampaignFinished || !campaign) {
      setPendingWeeklyAnalytics(true);
      setGameState(prev => ({
        ...prev,
        chronicle: {
          ...prev.chronicle,
          campaign_history: {
            ...prev.chronicle.campaign_history,
            bosses_defeated: prev.chronicle.campaign_history.bosses_defeated + 1
          }
        }
      }));
    }

    let finalLevel = player.level;
    setPlayer(prev => {
      let newXp = prev.xp + boss.maxHp;
      let newLevel = prev.level;
      let req = getXpRequirement(newLevel);
      while (newXp >= req) {
        newXp -= req;
        newLevel++;
        req = getXpRequirement(newLevel);
      }
      finalLevel = newLevel;

      let newFamiliar = prev.familiar;
      // Hatch or evolve familiar on main boss defeat
      if (newFamiliar && (isCampaignFinished || !campaign)) {
        let newStage = newFamiliar.stage;
        if (newStage === 'egg') newStage = 'baby';
        else if (newStage === 'baby') newStage = 'evolved';
        else if (newStage === 'evolved') newStage = 'ultra';
        
        newFamiliar = { ...newFamiliar, stage: newStage };
      }

      return { 
        ...prev, 
        level: newLevel, 
        xp: newXp,
        familiar: newFamiliar
      };
    });

    const newDefeated = [...gameState.defeatedBosses, boss.name];
    
    let newTrophy: Trophy | null = null;
    if (boss.dropTrophy) {
      newTrophy = boss.dropTrophy;
      setDroppedTrophy(newTrophy);
      setPlayer(prev => ({
        ...prev,
        inventory: [...prev.inventory, newTrophy!]
      }));
    } else if (effectiveApiKey || effectiveAiBaseUrl) {
      try {
        newTrophy = await generateAITrophy(effectiveApiKey, effectiveAiBaseUrl, effectiveAiModel, boss.name, aiSettings.imageModel, aiSettings.enableImages, aiSettings.apiKey, aiSettings.baseUrl);
        setDroppedTrophy(newTrophy);
        setPlayer(prev => ({
          ...prev,
          inventory: [...prev.inventory, newTrophy!]
        }));
      } catch (e) {
        console.error("Failed to generate trophy", e);
      }
    }

    if (campaign && campaign.currentEnemyIndex < campaign.enemies.length - 1) {
      // Move to next enemy in campaign
      const nextIndex = campaign.currentEnemyIndex + 1;
      const nextBoss = campaign.enemies[nextIndex];
      setCampaign(prev => prev ? { ...prev, currentEnemyIndex: nextIndex } : null);
      setBoss(nextBoss || generateBoss(finalLevel, player.dailyPointsHistory, player.inventory));
      setGameState(prev => ({ ...prev, defeatedBosses: newDefeated }));
      setIsGeneratingBoss(false);
      return;
    }

    // Generate chronicle victory first if not already pre-generated
    if (isCampaignFinished) {
      if (!chronicleVictory) {
        if (effectiveApiKey || effectiveAiBaseUrl) {
           try {
              const victoryChronicle = await generateChronicleVictory(
                 effectiveApiKey,
                 effectiveAiBaseUrl,
                 effectiveAiModel,
                 boss.name,
                 campaign ? campaign.title : 'Неизвестная Земля',
                 player.playerClass || 'Герой',
                 player.stats
              );
              if (victoryChronicle) {
                 const savedChronicle: ChronicleVictory = {
                    title: victoryChronicle.title,
                    story: victoryChronicle.story,
                    imagePrompt: victoryChronicle.medievalImagePrompt,
                 };
                 setChronicleVictory(savedChronicle);
                 
                 const chronicleJob: any = {
                   id: crypto.randomUUID(),
                   type: 'chronicle_victory',
                   targetId: 'chronicle_victory',
                   prompt: victoryChronicle.medievalImagePrompt,
                   aspectRatio: '1:1',
                   status: 'pending',
                   retryCount: 0
                 };
                 setImageQueue(prev => [...prev, chronicleJob]);
              }
           } catch (err) {
              console.error("Failed to generate chronicle victory", err);
              setChronicleVictory({
                 title: `Свержение ${boss.name}`,
                 story: `Великий триумф свершился! Доблестный ${player.playerClass || 'Герой'} превозмог все испытания и одолел Владыку по имени ${boss.name}, принеся вечный мир в эти земли. Хроники вечно будут хранить память об этом подвиге.`,
                 imagePrompt: ""
              });
           }
        } else {
           setChronicleVictory({
              title: `Свержение ${boss.name}`,
              story: `Великий триумф свершился! Доблестный ${player.playerClass || 'Герой'} превозмог все испытания и одолел Владыку по имени ${boss.name}, принеся вечный мир в эти земли. Хроники вечно будут хранить память об этом подвиге.`,
              imagePrompt: ""
           });
        }
      }
    }

    // Campaign finished or no campaign, generate new one
    if (effectiveApiKey || effectiveAiBaseUrl) {
      setIsGeneratingBoss(true);
      setGenerationProgress(0);
      setGenerationStep('Анализ истории...');
      try {
        let chronicleToPass = { ...gameState.chronicle };
        const isSeasonEnded = chronicleToPass.season_info && chronicleToPass.season_info.current_campaign >= chronicleToPass.season_info.total_campaigns;
        
        if (isSeasonEnded) {
          delete chronicleToPass.season_info;
          setVictoryMessage("Сезон завершен!");
          setGmMessage("Глава закончена. Открывается новая страница твоей истории...");
        }

        setGenerationProgress(10);
        setGenerationStep('Создаем новые земли...');
        const aiCampaign = await generateAICampaign(
          effectiveApiKey, 
          effectiveAiBaseUrl, 
          effectiveAiModel, 
          player.stats, 
          newDefeated, 
          gameState.currentStory, 
          finalLevel, 
          player.dailyPointsHistory, 
          player.inventory, 
          gameState.nemesisBoss || undefined, 
          chronicleToPass, 
          false, 
          tasks.map(t => t.text)
        );
        
        setGenerationProgress(30);
        setGenerationStep('Подготовка рынка...');
        // Generate shop items pool for the campaign
        try {
          const { generateShopItems } = await import('./lib/ai');
          const shopData = await generateShopItems(effectiveApiKey, effectiveAiBaseUrl, effectiveAiModel, finalLevel);
          if (shopData && Array.isArray(shopData) && shopData.length > 0) {
            aiCampaign.campaign.itemPool = shopData;
          } else if (shopData && (shopData as any).items) {
            aiCampaign.campaign.itemPool = (shopData as any).items;
          }
        } catch (shopErr) {
          console.error("Shop items generation failed", shopErr);
        }

        setGenerationProgress(50);
        setGenerationStep('Добавляем задачи визуализации в очередь...');
        const newQueueJobs: ImageJob[] = [];
        
        if (aiCampaign.campaign.mapPrompt) {
          newQueueJobs.push({ id: crypto.randomUUID(), type: 'map', targetId: 'map', prompt: aiCampaign.campaign.mapPrompt, aspectRatio: '16:9', status: 'pending', retryCount: 0 });
        }
        if (aiCampaign.newSeasonInfo?.city_background_prompt && !aiCampaign.newSeasonInfo.city_background_url) {
          newQueueJobs.push({ id: crypto.randomUUID(), type: 'city', targetId: 'city', prompt: aiCampaign.newSeasonInfo.city_background_prompt, aspectRatio: '9:16', status: 'pending', retryCount: 0 });
        }
        
        setGenerationProgress(80);
        setGenerationStep('Призыв сущности...');
        let firstBoss = aiCampaign.campaign.enemies[0];
        if (firstBoss && firstBoss.imagePrompt && !firstBoss.imageUrl && aiSettings.enableImages) {
            try {
                firstBoss.imageUrl = await generateAIImage(effectiveApiKey, effectiveAiBaseUrl, aiSettings.imageModel || "dall-e-3", firstBoss.imagePrompt, true, "1:1") || undefined;
            } catch (err) {
                console.error("Failed to generate first boss image", err);
            }
        }

        aiCampaign.campaign.enemies.forEach((enemy, idx) => {
          if (idx > 0 && enemy.imagePrompt && !enemy.imageUrl) {
            newQueueJobs.push({ id: crypto.randomUUID(), type: 'enemy', targetId: enemy.id, prompt: enemy.imagePrompt, aspectRatio: '1:1', status: 'pending', retryCount: 0 });
          }
          if (enemy.dropTrophy) {
            if (!enemy.dropTrophy.imagePrompt) {
              enemy.dropTrophy.imagePrompt = `A 2D fantasy game UI single icon for a magical item named "${enemy.dropTrophy.name}". Epic loot. Isolated on dark background, no text.`;
            }
            if (!enemy.dropTrophy.imageUrl) {
              newQueueJobs.push({ id: crypto.randomUUID(), type: 'trophy', targetId: enemy.dropTrophy.id, prompt: enemy.dropTrophy.imagePrompt, aspectRatio: '1:1', status: 'pending', retryCount: 0 });
            }
          }
        });

        if (newQueueJobs.length > 0) {
          setImageQueue(prev => [...prev, ...newQueueJobs]);
        }

        setGenerationProgress(100);
        setGenerationStep('Завершение...');

        setCampaign(aiCampaign.campaign);
        setBoss(aiCampaign.campaign.enemies[0] || generateBoss(finalLevel, player.dailyPointsHistory, player.inventory));
        
        if (aiCampaign.masterTask) {
          setTasks(prev => {
            const newTasks = prev.filter(t => !t.isMasterTask);
            const exists = newTasks.some(t => t.text.trim().toLowerCase() === aiCampaign.masterTask.text.trim().toLowerCase());
            if (!exists) {
              newTasks.push({
                id: crypto.randomUUID(),
                text: aiCampaign.masterTask.text,
                stat: aiCampaign.masterTask.stat || 'strength',
                type: 'weekly',
                difficulty: aiCampaign.masterTask.difficulty || 4,
                createdAt: Date.now(),
                completed: false,
                rewarded: false,
                isMasterTask: true,
                availableAt: Date.now()
              });
            }
            return newTasks;
          });
        }
        
        const initialShopItems = aiCampaign.campaign.itemPool ? [...aiCampaign.campaign.itemPool].sort(() => 0.5 - Math.random()).slice(0, 3) : [];
        
        setGameState(prev => ({ 
          ...prev, 
          defeatedBosses: newDefeated, 
          currentStory: aiCampaign.newStoryContext,
          nemesisBoss: null,
          shopItems: prev.shopItems.length > 0 ? prev.shopItems : initialShopItems,
          chronicle: {
            ...prev.chronicle,
            season_info: aiCampaign.newSeasonInfo ? { ...prev.chronicle.season_info, ...aiCampaign.newSeasonInfo, npcs: aiCampaign.newSeasonInfo.npcs || prev.chronicle.season_info?.npcs, city_background_url: aiCampaign.newSeasonInfo.city_background_url || aiCampaign.newSeasonInfo.city_background_prompt ? aiCampaign.newSeasonInfo.city_background_url : prev.chronicle.season_info?.city_background_url, city_background_prompt: aiCampaign.newSeasonInfo.city_background_prompt || prev.chronicle.season_info?.city_background_prompt } : prev.chronicle.season_info
          }
        }));
      } catch (e: any) {
        console.error("AI Campaign generation failed", e);
        setApiError(e?.message || "Неизвестная ошибка при генерации кампании");
        setBossDefeatError(true);
      } finally {
        setIsGeneratingBoss(false);
      }
    } else {
      setCampaign(null);
      setBoss(generateBoss(finalLevel, player.dailyPointsHistory, player.inventory));
      setGameState(prev => ({ 
        ...prev, 
        defeatedBosses: newDefeated,
        nemesisBoss: boss.isNemesis ? null : prev.nemesisBoss
      }));
      setIsGeneratingBoss(false);
    }
  };

  const askMasterForAdvice = async () => {
    if (!effectiveApiKey && !effectiveAiBaseUrl) return;
    
    setIsGeneratingTasks(true); // Reuse loading state for simplicity
    try {
      const advice = await import('./lib/ai').then(m => m.askMasterAdvice(effectiveApiKey, effectiveAiBaseUrl, effectiveAiModel, gameState.chronicle));
      setGmMessage(advice);
    } catch (e: any) {
      console.error(e);
      setApiError(e?.message || "Неизвестная ошибка при запросе совета");
      setGmMessage("Мастер сейчас занят, произошла ошибка.");
    } finally {
      setIsGeneratingTasks(false);
    }
  };

  const handleTestGenerateBoss = async (forcedNemesis?: Boss, isReroll: boolean = false) => {
    if (!effectiveApiKey && !effectiveAiBaseUrl) {
      setGmMessage("Пожалуйста, укажите API ключ или Base URL в настройках.");
      return;
    }
    setIsGeneratingBoss(true);
    setGenerationProgress(0);
    setGenerationStep('Сбор данных...');
    try {
      const nemesisToUse = forcedNemesis !== undefined ? forcedNemesis : (gameState.nemesisBoss || undefined);
      
      setGenerationProgress(10);
      setGenerationStep('Создаем новые земли...');
      const aiCampaign = await generateAICampaign(
        effectiveApiKey, 
        effectiveAiBaseUrl, 
        effectiveAiModel, 
        player.stats, 
        gameState.defeatedBosses, 
        gameState.currentStory, 
        player.level, 
        player.dailyPointsHistory, 
        player.inventory, 
        nemesisToUse, 
        gameState.chronicle, 
        isReroll,
        tasks.map(t => t.text)
      );
      
      setGenerationProgress(30);
      setGenerationStep('Подготовка рынка...');
      // Generate shop items pool for the campaign
      try {
        const { generateShopItems } = await import('./lib/ai');
        const shopData = await generateShopItems(effectiveApiKey, effectiveAiBaseUrl, effectiveAiModel, player.level);
        if (shopData && Array.isArray(shopData) && shopData.length > 0) {
          aiCampaign.campaign.itemPool = shopData;
        } else if (shopData && (shopData as any).items) {
          aiCampaign.campaign.itemPool = (shopData as any).items;
        }
      } catch (shopErr) {
        console.error("Shop items generation failed", shopErr);
      }

      setGenerationProgress(50);
      setGenerationStep('Добавляем задачи визуализации в очередь...');
      const newQueueJobs: ImageJob[] = [];
      
      if (aiCampaign.campaign.mapPrompt) {
        newQueueJobs.push({ id: crypto.randomUUID(), type: 'map', targetId: 'map', prompt: aiCampaign.campaign.mapPrompt, aspectRatio: '16:9', status: 'pending', retryCount: 0 });
      }
      if (aiCampaign.newSeasonInfo?.city_background_prompt && !aiCampaign.newSeasonInfo.city_background_url) {
        newQueueJobs.push({ id: crypto.randomUUID(), type: 'city', targetId: 'city', prompt: aiCampaign.newSeasonInfo.city_background_prompt, aspectRatio: '9:16', status: 'pending', retryCount: 0 });
      }
      
      setGenerationProgress(80);
      setGenerationStep('Призыв сущности...');
      let firstBoss = aiCampaign.campaign.enemies[0];
      if (firstBoss && firstBoss.imagePrompt && !firstBoss.imageUrl && aiSettings.enableImages) {
          try {
              firstBoss.imageUrl = await generateAIImage(effectiveApiKey, effectiveAiBaseUrl, aiSettings.imageModel || "dall-e-3", firstBoss.imagePrompt, true, "1:1") || undefined;
          } catch (err) {
              console.error("Failed to generate first boss image", err);
          }
      }

      aiCampaign.campaign.enemies.forEach((enemy, idx) => {
        if (idx > 0 && enemy.imagePrompt && !enemy.imageUrl) {
          newQueueJobs.push({ id: crypto.randomUUID(), type: 'enemy', targetId: enemy.id, prompt: enemy.imagePrompt, aspectRatio: '1:1', status: 'pending', retryCount: 0 });
        }
        if (enemy.dropTrophy) {
          if (!enemy.dropTrophy.imagePrompt) {
            enemy.dropTrophy.imagePrompt = `A 2D fantasy game UI single icon for a magical item named "${enemy.dropTrophy.name}". Epic loot. Isolated on dark background, no text.`;
          }
          if (!enemy.dropTrophy.imageUrl) {
            newQueueJobs.push({ id: crypto.randomUUID(), type: 'trophy', targetId: enemy.dropTrophy.id, prompt: enemy.dropTrophy.imagePrompt, aspectRatio: '1:1', status: 'pending', retryCount: 0 });
          }
        }
      });

      if (newQueueJobs.length > 0) {
        setImageQueue(prev => [...prev, ...newQueueJobs]);
      }

      setGenerationProgress(100);
      setGenerationStep('Завершение...');

      setCampaign(aiCampaign.campaign);
      setBoss(aiCampaign.campaign.enemies[0] || generateBoss(player.level, player.dailyPointsHistory, player.inventory));
      
      if (aiCampaign.masterTask) {
        setTasks(prev => {
          const newTasks = prev.filter(t => !t.isMasterTask);
          const exists = newTasks.some(t => t.text.trim().toLowerCase() === aiCampaign.masterTask.text.trim().toLowerCase());
          if (!exists) {
            newTasks.push({
              id: crypto.randomUUID(),
              text: aiCampaign.masterTask.text,
              stat: aiCampaign.masterTask.stat || 'strength',
              type: 'weekly',
              difficulty: aiCampaign.masterTask.difficulty || 4,
              createdAt: Date.now(),
              completed: false,
              rewarded: false,
              isMasterTask: true,
              availableAt: Date.now()
            });
          }
          return newTasks;
        });
      }

      const initialShopItems = aiCampaign.campaign.itemPool ? [...aiCampaign.campaign.itemPool].sort(() => 0.5 - Math.random()).slice(0, 3) : [];
      
      setGameState(prev => ({ 
        ...prev, 
        currentStory: aiCampaign.newStoryContext, 
        nemesisBoss: null,
        shopItems: prev.shopItems.length > 0 ? prev.shopItems : initialShopItems,
        chronicle: {
          ...prev.chronicle,
          season_info: aiCampaign.newSeasonInfo ? { ...prev.chronicle.season_info, ...aiCampaign.newSeasonInfo, npcs: aiCampaign.newSeasonInfo.npcs || prev.chronicle.season_info?.npcs, city_background_url: aiCampaign.newSeasonInfo.city_background_url || aiCampaign.newSeasonInfo.city_background_prompt ? aiCampaign.newSeasonInfo.city_background_url : prev.chronicle.season_info?.city_background_url, city_background_prompt: aiCampaign.newSeasonInfo.city_background_prompt || prev.chronicle.season_info?.city_background_prompt } : prev.chronicle.season_info
        }
      }));
      setGmMessage("Я создал для тебя новую кампанию!");
    } catch (e: any) {
      console.error("Test AI Campaign generation failed", e);
      setApiError(e?.message || "Неизвестная ошибка при генерации кампании");
      setGmMessage("Не удалось сгенерировать кампанию. Проверьте настройки API.");
    } finally {
      setIsGeneratingBoss(false);
    }
  };

  const handleRegenerateTown = async () => {
    if (!effectiveApiKey && !effectiveAiBaseUrl) {
      setGmMessage("Пожалуйста, укажите API ключ или Base URL в настройках.");
      return;
    }
    if (!gameState.chronicle?.season_info) {
        setGmMessage("Никакой сезон/город еще не сгенерирован.");
        return;
    }
    
    setIsGeneratingTasks(true);
    setGmMessage("Генерируем новых NPC и город, ожидайте...");
    
    try {
        const townData = await regenerateAITown(effectiveApiKey, effectiveAiBaseUrl, effectiveAiModel, gameState.chronicle.season_info);
        
        let npcsRaw: Record<string, any> = {};
        if (townData && townData.npcs) {
           npcsRaw = townData.npcs;
        }

        const newQueueJobs: ImageJob[] = [];

        if (townData && townData.city_background_prompt) {
            newQueueJobs.push({ id: crypto.randomUUID(), type: 'city', targetId: 'city', prompt: townData.city_background_prompt, aspectRatio: '9:16', status: 'pending', retryCount: 0 });
        }

        if (newQueueJobs.length > 0) {
            setImageQueue(prev => [...prev, ...newQueueJobs]);
        }

        setGameState(prev => {
            const updatedChronicle = { ...prev.chronicle };
            if (updatedChronicle.season_info) {
               updatedChronicle.season_info.npcs = npcsRaw as any;
               if (townData.city_background_prompt) {
                  updatedChronicle.season_info.city_background_prompt = townData.city_background_prompt;
               }
            }
            return { ...prev, chronicle: updatedChronicle as import('./App').HeroChronicle };
        });

        setGmMessage("Город и NPC успешно обновлены!");
    } catch (e: any) {
        console.error("Town regeneration failed", e);
        setGmMessage(`Ошибка при генерации города: ${e.message || "Неизвестная ошибка"}`);
    } finally {
        setIsGeneratingTasks(false);
    }
  };

  const handleEnemyClick = (enemy: Boss, idx: number) => {
    if (!campaign) return;
    
    // Find the stat with the highest multiplier (weakness)
    let weaknessStat: StatType = 'strength';
    let maxMultiplier = 0;
    if (enemy.multipliers) {
      (Object.keys(enemy.multipliers) as StatType[]).forEach(stat => {
        if (enemy.multipliers[stat] > maxMultiplier) {
          maxMultiplier = enemy.multipliers[stat];
          weaknessStat = stat;
        }
      });
    }

    if (idx < campaign.currentEnemyIndex) {
      setGmMessage(`Вы уже одолели этого противника: ${enemy.name}. Его история закончена.`);
    } else if (idx === campaign.currentEnemyIndex) {
      const hints = [
        `Это ваша текущая цель: ${enemy.name}. Я чувствую, что его слабость связана с характеристикой "${STATS[weaknessStat].name}".`,
        `Вы стоите перед ${enemy.name}. Мудрецы говорят, что против него лучше всего использовать "${STATS[weaknessStat].name}".`,
        `${enemy.name} выглядит грозно, но опытный герой заметит его уязвимость в области "${STATS[weaknessStat].name}".`
      ];
      setGmMessage(hints[Math.floor(Math.random() * hints.length)]);
    } else {
      const hints = [
        `Слухи гласят, что впереди вас ждет нечто ужасное... Говорят, это связано с характеристикой "${STATS[weaknessStat].name}".`,
        `Путники шепчутся о существе по имени ${enemy.name}... Лучше подготовиться.`,
        `Я чувствую темную ауру впереди. Кажется, вам понадобится больше силы в области "${STATS[weaknessStat].name}".`,
        `Разведчики докладывают, что следующий враг невероятно силен. Не расслабляйтесь.`
      ];
      setGmMessage(hints[Math.floor(Math.random() * hints.length)]);
    }
  };

  return (
    <div className="h-[100dvh] bg-[#0B0E14] text-slate-200 font-sans selection:bg-amber-500/30 flex justify-center overflow-hidden">
      <motion.div 
        animate={bossHit ? { x: [-10, 10, -10, 10, 0], y: [-5, 5, -5, 5, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md h-[100dvh] flex flex-col border-x border-white/5 bg-[#0B0E14] shadow-2xl relative overflow-hidden"
      >
        <div className={`absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] ${campaign ? THEME_COLORS[campaign.colorTheme || 'slate'].gradient : 'from-slate-900 to-[#0B0E14]'} -z-10 pointer-events-none transition-colors duration-1000`} />
        
        {/* API Error Toast */}
        <AnimatePresence>
          {apiError && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[calc(28rem-2rem)] bg-rose-500/90 text-white p-4 rounded-xl shadow-lg z-[1050] flex items-start gap-3 backdrop-blur-md border border-rose-400"
            >
              <AlertTriangle className="shrink-0 mt-0.5" />
              <div className="flex-1 w-full max-w-full overflow-hidden">
                <h3 className="font-bold text-sm">Ошибка API / Консоль</h3>
                <div className="text-[10px] opacity-90 mt-1 max-h-[60vh] overflow-y-auto whitespace-pre-wrap font-mono break-words bg-black/20 p-2 rounded select-text text-left relative z-[1060]">
                  {apiError}
                </div>
              </div>
              <button onClick={() => setApiError(null)} className="p-1 hover:bg-rose-400/50 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Victory Modal */}
        <AnimatePresence>
          {showVictory && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1050] flex items-center justify-center bg-[#0B0E14]/90 backdrop-blur-sm p-4"
            >
              <motion.div 
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: -20 }}
                className="w-full max-w-sm text-center space-y-6 p-8 bg-[#131824] border border-amber-500/30 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.2)] relative"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-t-3xl"></div>
                
                <button 
                  onClick={() => {
                    setShowVictory(false);
                    setActiveTab('boss');
                  }}
                  className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <X size={24} />
                </button>

                <div className="space-y-2">
                  <Trophy size={64} className="mx-auto text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" />
                  <h2 className="text-3xl font-black text-amber-400 tracking-tight">
                    {victoryMessage}
                  </h2>
                  <p className="text-slate-300 font-medium">Вы получили <span className="text-amber-400">+{boss.maxHp}</span> бонусного опыта</p>
                </div>

                {droppedTrophy && (
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-sm text-slate-400 mb-4">Получен новый трофей:</p>
                    <button
                      onClick={() => setSelectedTrophy(droppedTrophy)}
                      className="w-full p-4 bg-[#0B0E14] border border-amber-500/30 rounded-2xl flex flex-col items-center gap-3 hover:bg-amber-500/5 hover:border-amber-500/50 transition-all group overflow-hidden"
                    >
                      <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform overflow-hidden relative">
                        {droppedTrophy.imageUrl ? (
                          <img src={droppedTrophy.imageUrl} alt={droppedTrophy.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          droppedTrophy.icon
                        )}
                      </div>
                      <div className="text-center">
                        <h3 className="font-bold text-amber-400">{droppedTrophy.name}</h3>
                        <p className="text-xs text-slate-400 mt-1">Нажмите, чтобы посмотреть свойства</p>
                      </div>
                    </button>
                  </div>
                )}

                <button
                  onClick={() => {
                    setShowVictory(false);
                    setActiveTab('boss');
                  }}
                  className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-amber-950 font-black rounded-xl transition-all shadow-lg active:scale-95"
                >
                  Продолжить путь
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Defeat Modal */}
        <AnimatePresence>
          {bossFailed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1050] flex items-center justify-center bg-[#0B0E14]/90 backdrop-blur-sm p-6"
            >
              <motion.div 
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: -20 }}
                className="text-center space-y-6 p-8 glass-card border border-rose-500/30 rounded-2xl shadow-[0_0_50px_rgba(225,29,72,0.2)] max-w-sm w-full"
              >
                <AlertCircle size={64} className="mx-auto text-rose-500" />
                <div>
                  <h2 className="text-2xl font-bold text-rose-500 mb-2">
                    Время вышло!
                  </h2>
                  <p className="text-slate-300 text-sm">
                    Босс сбежал, сея хаос. Соберитесь с силами и бросьте вызов новому противнику.
                  </p>
                </div>
                <button
                  onClick={handleBossFailed}
                  className="w-full py-3 bg-[#0B0E14] hover:bg-white/5 text-white font-bold rounded-xl transition-colors border border-white/5"
                >
                  Принять поражение
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

         {/* Chronicle Victory Modal (Medieval Parchment) */}
        <AnimatePresence>
          {chronicleVictory && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
            >
              <motion.div
                initial={{ scale: 0.9, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 50 }}
                transition={{ type: "spring", damping: 25, stiffness: 120 }}
                className="max-w-[500px] w-full relative bg-[#F4E6C3] border-[12px] border-[#3D2513] text-[#2B1B10] p-6 md:p-10 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden font-serif border-double ring-4 ring-amber-500/20"
              >
                {/* Vintage paper fiber lines/accents */}
                <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-900 via-transparent to-transparent pointer-events-none"></div>
                <div className="absolute -top-10 -left-10 w-24 h-24 rounded-full bg-[#EAD49E] blur-xl opacity-30 pointer-events-none"></div>
                <div className="absolute -bottom-10 -right-10 w-24 h-24 rounded-full bg-[#EAD49E] blur-xl opacity-30 pointer-events-none"></div>

                {/* Wax seal effect or ribbon header */}
                <div className="text-center border-b-2 border-[#5C1D1A]/20 pb-4 mb-5 shrink-0">
                  <span className="text-[10px] md:text-xs uppercase tracking-[4px] font-sans font-black text-[#5C1D1A] opacity-80">
                    Персональные Хроники Победы
                  </span>
                  <h2 className="text-2xl md:text-3xl font-black text-[#5C1D1A] leading-tight tracking-normal mt-2">
                    {chronicleVictory.title}
                  </h2>
                </div>

                {/* Medieval victory image section inside Gothic gold arch */}
                <div className="relative w-full aspect-square max-w-[280px] mx-auto rounded-2xl overflow-hidden shadow-2xl border-4 border-[#3D2513] ring-4 ring-amber-500/10 mb-6 bg-[#E9DCC0] flex items-center justify-center">
                  {chronicleVictory.imageUrl ? (
                    <img 
                      src={chronicleVictory.imageUrl} 
                      alt="Boss Defeat" 
                      className="w-full h-full object-cover select-none animate-fade-in"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-4 text-center px-6 relative z-10 text-[#5C1D1A]/70">
                      <Loader2 size={36} className="animate-spin text-[#5C1D1A] opacity-80" />
                      <div className="space-y-1">
                        <span className="text-[11px] uppercase tracking-[2px] font-sans font-bold block">Летописец трудится</span>
                        <p className="text-[10px] text-[#2B1B10]/60 italic font-serif leading-snug">
                          Запечатлеваем ваш великий триумф на века...
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Story description on parchment paper */}
                <div className="space-y-4 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar text-center">
                  <p className="text-sm md:text-base leading-relaxed text-[#3D2C1E] font-medium tracking-wide italic leading-7">
                    « {chronicleVictory.story} »
                  </p>
                </div>

                {/* Close/Proceed scroll seal button */}
                <div className="pt-6 text-center">
                  <button
                    onClick={() => {
                      setChronicleVictory(null);
                      preGeneratingChronicleRef.current = false;
                    }}
                    className="px-8 py-3 bg-[#5C1D1A] hover:bg-[#722421] text-[#F4E6C3] font-bold text-xs uppercase tracking-[2px] rounded-xl shadow-lg border-2 border-amber-950/20 active:scale-95 transition-all cursor-pointer font-sans"
                  >
                    Запечатать Свиток
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Story Modal */}
        <AnimatePresence>
          {showStoryModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowStoryModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#131824] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative overflow-hidden flex flex-col max-h-[80vh]"
              >
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${campaign ? `from-[${THEME_COLORS[campaign.colorTheme || 'slate'].hex}]` : 'from-indigo-500'} to-transparent`}></div>
                
                <div className="flex justify-between items-center mb-4 shrink-0">
                  <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                    <Book size={20} className={campaign ? THEME_COLORS[campaign.colorTheme || 'slate'].text : 'text-indigo-400'} />
                    Летопись героя
                  </h2>
                  <button onClick={() => setShowStoryModal(false)} className="text-slate-500 hover:text-slate-300">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="space-y-4 text-sm text-slate-300 overflow-y-auto custom-scrollbar flex-1 pr-2">
                  <p className="leading-relaxed italic lore-text">
                    {gameState.currentStory}
                  </p>
                  {boss?.description && (
                    <>
                      <div className="w-full h-px bg-white/10 my-3" />
                      <div className="space-y-2">
                        <span className="text-slate-300 font-bold mix-blend-screen block">О противнике:</span>
                        <p className="leading-relaxed italic lore-text text-slate-400">
                          {boss.description}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <div className="shrink-0 mt-6 pt-4 border-t border-white/10">
                  <button
                    onClick={() => setShowStoryModal(false)}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors"
                  >
                    Закрыть фолиант
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reset Confirm Modal */}
        <AnimatePresence>
          {showResetConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0B0E14]/90 backdrop-blur-sm p-6"
            >
              <motion.div 
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: -20 }}
                className="text-center space-y-6 p-8 glass-card border border-red-500/30 rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.2)] max-w-sm w-full"
              >
                <AlertCircle size={64} className="mx-auto text-red-500" />
                <div>
                  <h2 className="text-2xl font-bold text-red-500 mb-2">Внимание!</h2>
                  <p className="text-slate-300 text-sm">Вы уверены, что хотите сбросить ВЕСЬ прогресс? Это действие необратимо.</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 py-3 bg-[#0B0E14] hover:bg-white/5 text-white font-bold rounded-xl transition-colors border border-white/5"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={() => {
                      const keysToRemove = [
                        'questlog_game_state',
                        'questlog_player',
                        'questlog_player_v2',
                        'questlog_player_v3',
                        'questlog_player_v4',
                        'questlog_tasks',
                        'questlog_tasks_v2',
                        'questlog_campaign',
                        'questlog_boss_v3',
                        'questlog_last_daily_reset'
                      ];
                      keysToRemove.forEach(key => localStorage.removeItem(key));
                      window.location.reload();
                    }}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors"
                  >
                    Сбросить
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Midnight Echo Report Modal */}
        <AnimatePresence>
          {midnightEchoReport !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-[#131824] border border-red-500/30 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent pointer-events-none" />
                
                <div className="text-center relative z-10">
                  <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-red-600 rounded-full mx-auto mb-6 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.3)]">
                    <AlertTriangle size={40} className="text-red-950" />
                  </div>
                  
                  <h2 className="text-2xl font-black text-red-400 mb-3 uppercase tracking-wider">
                    Новый день настал
                  </h2>
                  
                  <div className="text-slate-300 text-sm leading-relaxed mb-8 space-y-2">
                    {midnightEchoReport.missedTasks > 0 && (
                      <p>Вы пропустили <span className="text-red-400 font-bold">{midnightEchoReport.missedTasks}</span> задач(и).</p>
                    )}
                    {midnightEchoReport.damageTaken > 0 && (
                      <p>Босс нанес вам <span className="text-red-400 font-bold">{midnightEchoReport.damageTaken}</span> урона.</p>
                    )}
                    {midnightEchoReport.comboReset ? (
                      <p className="text-orange-400 font-bold">Ваше комбо сброшено.</p>
                    ) : (
                      <p className="text-emerald-400 font-bold">Ваше комбо сохранено.</p>
                    )}
                  </div>
                  
                  <button
                    onClick={() => setMidnightEchoReport(null)}
                    className="w-full py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white font-black rounded-2xl transition-all shadow-lg hover:shadow-red-500/25 active:scale-[0.98]"
                  >
                    Продолжить путь
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trophy Modal */}
        <AnimatePresence>
          {selectedTrophy && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1100] flex items-center justify-center bg-[#0B0E14]/90 backdrop-blur-sm p-6"
            >
              <motion.div 
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: -20 }}
                className="text-center space-y-6 p-8 glass-card border border-amber-500/30 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.2)] max-w-sm w-full relative"
              >
                <button 
                  onClick={() => setSelectedTrophy(null)}
                  className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 z-10"
                >
                  <X size={20} />
                </button>
                <div className="w-32 h-32 mx-auto rounded-2xl bg-[#0B0E14]/50 flex items-center justify-center text-6xl drop-shadow-[0_0_15px_rgba(245,158,11,0.5)] overflow-hidden border border-amber-500/20">
                  {selectedTrophy.imageUrl ? (
                    <img src={selectedTrophy.imageUrl} alt={selectedTrophy.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    selectedTrophy.icon
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-amber-400 mb-2">{selectedTrophy.name}</h2>
                  <p className="text-slate-300 text-sm italic mb-4">"{selectedTrophy.description}"</p>
                  <div className="glass-card p-3">
                    <p className="text-sm font-medium text-emerald-400">
                      {selectedTrophy.effect.type === 'xp_boost' && `+${(selectedTrophy.effect.value * 100).toFixed(1)}% получаемого опыта`}
                      {selectedTrophy.effect.type === 'damage_boost' && `+${(selectedTrophy.effect.value * 100).toFixed(1)}% урона`}
                      {selectedTrophy.effect.type === 'boss_hp_reduction' && `-${(selectedTrophy.effect.value * 100).toFixed(1)}% здоровья боссов`}
                      {selectedTrophy.effect.targetStat && ` (${STATS[selectedTrophy.effect.targetStat].name})`}
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings Modal */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1050] flex items-center justify-center bg-[#0B0E14]/90 backdrop-blur-sm p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: -20 }}
                className="w-full max-w-sm glass-card rounded-2xl p-5 shadow-2xl space-y-3"
              >
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <Eye className="text-amber-400" />
                    Настройки ИИ Мастера
                  </h2>
                  <button onClick={() => setShowSettings(false)} className="text-slate-500 hover:text-slate-300">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="space-y-2">
                  <div className="mb-2">
                    <label className="flex items-center gap-2 cursor-pointer p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl hover:bg-amber-500/20 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={aiSettings.useGeminiMode || false}
                        onChange={e => setAiSettings({...aiSettings, useGeminiMode: e.target.checked})}
                        className="w-4 h-4 rounded border-amber-500/30 bg-[#0B0E14] text-amber-500 focus:ring-amber-500/50 focus:ring-offset-[#121216]"
                      />
                      <div>
                        <span className="text-sm font-bold text-amber-400 block">Режим Gemini (Симплифицированный)</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Использовать бесплатный API ключ от Google AI Studio</span>
                      </div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      {aiSettings.useGeminiMode ? "Gemini API Key" : "API Key (опционально для локальных)"}
                    </label>
                    {aiSettings.useGeminiMode ? (
                      <input 
                        type="password" 
                        value={aiSettings.geminiApiKey || ''}
                        onChange={e => setAiSettings({...aiSettings, geminiApiKey: e.target.value})}
                        placeholder="AIzaSy..."
                        className="w-full bg-[#0B0E14] border border-white/5 rounded-xl px-3 py-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-white/20"
                      />
                    ) : (
                      <input 
                        type="password" 
                        value={aiSettings.apiKey}
                        onChange={e => setAiSettings({...aiSettings, apiKey: e.target.value})}
                        placeholder="sk-..."
                        className="w-full bg-[#0B0E14] border border-white/5 rounded-xl px-3 py-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-white/20"
                      />
                    )}
                    <p className="text-[10px] text-slate-500 mt-1">Ключ сохраняется только локально в вашем браузере.</p>
                  </div>
                  
                  {!aiSettings.useGeminiMode && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">API Base URL (опционально)</label>
                        <input 
                          type="text" 
                          value={aiSettings.baseUrl || ''}
                          onChange={e => setAiSettings({...aiSettings, baseUrl: e.target.value})}
                          placeholder="https://api.openai.com/v1"
                          className="w-full bg-[#0B0E14] border border-white/5 rounded-xl px-3 py-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-white/20"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">Для кастомных провайдеров (LocalAI, OpenRouter и др.)</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Модель</label>
                        <input 
                          type="text"
                          value={aiSettings.model}
                          onChange={e => setAiSettings({...aiSettings, model: e.target.value})}
                          placeholder="gpt-4o-mini"
                          className="w-full bg-[#0B0E14] border border-white/5 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-white/20"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Модель для изображений</label>
                    <input 
                      type="text"
                      value={aiSettings.imageModel || ''}
                      onChange={e => setAiSettings({...aiSettings, imageModel: e.target.value})}
                      placeholder="dall-e-3"
                      className="w-full bg-[#0B0E14] border border-white/5 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-white/20"
                    />
                  </div>
                  
                  <div className="pt-4 border-t border-white/5">
                    <label className="flex items-center gap-2 cursor-pointer mb-4">
                      <input 
                        type="checkbox" 
                        checked={aiSettings.developerMode || false}
                        onChange={e => setAiSettings({...aiSettings, developerMode: e.target.checked})}
                        className="w-4 h-4 rounded border-white/10 bg-[#0B0E14] text-amber-500 focus:ring-amber-500/50 focus:ring-offset-[#121216]"
                      />
                      <span className="text-sm font-medium text-slate-300">Режим разработчика</span>
                    </label>
                    
                    {aiSettings.developerMode && (
                      <div className="space-y-3 p-3 bg-[#0B0E14]/50 rounded-xl border border-white/5">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={aiSettings.enableImages !== false}
                            onChange={e => setAiSettings({...aiSettings, enableImages: e.target.checked})}
                            className="w-4 h-4 rounded border-white/10 bg-[#0B0E14] text-amber-500 focus:ring-amber-500/50 focus:ring-offset-[#121216]"
                          />
                          <span className="text-xs text-slate-400">Генерация изображений</span>
                        </label>

                        <button
                          onClick={() => {
                            setShowSettings(false);
                            handleTestGenerateBoss(undefined, true);
                          }}
                          disabled={isGeneratingBoss}
                          className="w-full py-2 bg-[#0B0E14] hover:bg-white/5 text-slate-300 text-xs rounded-lg transition-colors border border-white/5 flex items-center justify-center gap-2"
                        >
                          {isGeneratingBoss ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                          Сгенерировать кампанию сейчас
                        </button>

                        <button
                          onClick={() => {
                            setBoss(prev => prev ? ({ ...prev, hp: 1 }) : null);
                            setShowSettings(false);
                          }}
                          className="w-full py-2 bg-[#0B0E14] hover:bg-white/5 text-slate-300 text-xs rounded-lg transition-colors border border-white/5 flex items-center justify-center gap-2"
                        >
                          <Skull size={14} />
                          Оставить боссу 1 HP
                        </button>

                        <button
                          onClick={() => {
                            setShowSettings(false);
                            handleRegenerateTown();
                          }}
                          disabled={isGeneratingTasks}
                          className="w-full py-2 bg-[#0B0E14] hover:bg-white/5 text-emerald-400 text-xs rounded-lg transition-colors border border-white/5 flex items-center justify-center gap-2"
                        >
                          {isGeneratingTasks ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                          Пересоздать город и NPC
                        </button>

                        <button
                          onClick={() => {
                            if ('serviceWorker' in navigator) {
                              navigator.serviceWorker.getRegistrations().then(function(registrations) {
                                for(let registration of registrations) {
                                  registration.unregister();
                                }
                              });
                            }
                            window.location.reload();
                          }}
                          className="w-full py-2 bg-blue-900/30 hover:bg-blue-900/50 text-blue-400 text-xs rounded-lg transition-colors border border-blue-900/50 flex items-center justify-center gap-2"
                        >
                          <RefreshCw size={14} />
                          Сбросить кэш и обновить приложение
                        </button>
                        
                        <button
                          onClick={() => setShowResetConfirm(true)}
                          className="w-full py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 text-xs rounded-lg transition-colors border border-red-900/50 flex items-center justify-center gap-2"
                        >
                          <Trash2 size={14} />
                          Сбросить весь прогресс (Hard Reset)
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setShowSettings(false)}
                  className="w-full py-3 mt-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-colors"
                >
                  Сохранить и закрыть
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* GM Message Toast */}
        <AnimatePresence>
          {gmMessage && (() => {
            let speaker = "Гейм Мастер";
            let messageText = gmMessage;
            let themeColor = "amber";
            
            // Check if there is a colon and quotes or simple speech pattern
            const match = gmMessage.match(/^([^:]+):\s*(.*)$/s);
            if (match) {
              const possibleSpeaker = match[1].trim();
              const textOnly = match[2].trim().replace(/^["']|["']$/g, ''); // remove bounding quotes if any
              
              if (possibleSpeaker.toLowerCase() === "мастер") {
                speaker = "Мастер Игры";
                messageText = `"${textOnly}"`;
              } else if (possibleSpeaker.toLowerCase() === "босс") {
                speaker = boss?.name || "Владыка Хаоса";
                messageText = `"${textOnly}"`;
                themeColor = "rose";
              } else {
                speaker = possibleSpeaker;
                messageText = `"${textOnly}"`;
                if (boss && possibleSpeaker.toLowerCase().includes(boss.name.toLowerCase())) {
                  themeColor = "rose";
                } else {
                  themeColor = "amber";
                }
              }
            } else {
              if (activeTab === 'boss' && boss && boss.hp > 0) {
                themeColor = "rose";
              }
            }
            
            return (
              <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-[calc(28rem-3rem)] z-40 glass-card p-4 shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex gap-4 items-start border border-white/10"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${
                  themeColor === 'rose' 
                    ? 'bg-rose-500/20 border-rose-500/50 text-rose-400' 
                    : 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                }`}>
                  {themeColor === 'rose' ? <Skull size={20} /> : <Eye size={20} />}
                </div>
                <div className="flex-1">
                  <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                    themeColor === 'rose' ? 'text-rose-400' : 'text-amber-400'
                  }`}>
                    {speaker}
                  </h4>
                  <p className="text-sm text-slate-200 leading-relaxed font-sans">{messageText}</p>
                </div>
                <button onClick={() => setGmMessage(null)} className="text-slate-500 hover:text-[#e2e8f0] shrink-0 cursor-pointer">
                  <X size={16} />
                </button>
              </motion.div>
            );
          })()}
        </AnimatePresence>

        {/* Content */}
        <main className={`flex-1 scrollbar-hide ${activeTab === 'city' ? 'p-0 overflow-hidden relative' : 'p-4 overflow-y-auto'} ${activeTab === 'boss' ? 'flex flex-col' : ''}`}>
          {activeTab === 'quests' && (
            <div className="flex flex-col min-h-full">
              <div className="space-y-6 flex-1">
                
                {/* Top Header */}
                <div className="flex justify-between items-start gap-4">
                  <div className="pt-1">
                    <h2 className="text-[22px] font-bold text-white flex items-center gap-2 mb-1 drop-shadow-md">
                      {new Date().getHours() >= 5 && new Date().getHours() < 12 ? 'Доброе утро!' : 
                       new Date().getHours() >= 12 && new Date().getHours() < 18 ? 'Добрый день!' : 
                       new Date().getHours() >= 18 && new Date().getHours() < 23 ? 'Добрый вечер!' : 'Доброй ночи!'} 
                      <span className="text-xl">
                        {new Date().getHours() >= 5 && new Date().getHours() < 12 ? '☀️' : 
                         new Date().getHours() >= 12 && new Date().getHours() < 18 ? '🌤️' : 
                         new Date().getHours() >= 18 && new Date().getHours() < 23 ? '🌆' : '🌙'}
                      </span>
                    </h2>
                    <p className="text-sm text-slate-400 leading-snug">Сегодня отличный день<br/>для твоих побед.</p>
                  </div>
                  
                  <div className="flex flex-col relative pt-1">
                    {(effectiveApiKey || effectiveAiBaseUrl) && (
                      <button
                        onClick={askMasterForAdvice}
                        disabled={isGeneratingTasks}
                        title="Совет Мастера"
                        className="absolute -top-2 -right-2 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-[#1A1D24] border border-white/10 text-blue-400 hover:text-blue-300 transition-colors shadow-lg cursor-pointer"
                      >
                        {isGeneratingTasks ? <Loader2 size={12} className="animate-spin" /> : <Eye size={14} />}
                      </button>
                    )}
                    <div className="glass-card px-4 py-3 min-w-[130px] flex flex-col gap-2 shadow-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex flex-shrink-0 items-center justify-center border border-white/5 ${isPerfectDay ? 'bg-amber-400/10 text-amber-400' : 'bg-purple-500/10 text-purple-400'}`}>
                          <Zap size={14} className={isPerfectDay ? 'drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]' : ''} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] text-slate-500 font-medium whitespace-nowrap">Прогресс дня</div>
                          <div className="text-[13px] font-black text-white leading-tight mt-0.5 whitespace-nowrap">
                            {availableDailyTasks.length > 0 ? `${completedDailyTasks.length}/${availableDailyTasks.length}` : '0/0'}
                          </div>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-[#0B0E14] rounded-full overflow-hidden mt-0.5 border border-white/5">
                        <div 
                          className={`h-full transition-all duration-500 ease-out ${isPerfectDay ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]' : 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]'}`} 
                          style={{ width: `${availableDailyTasks.length > 0 ? (completedDailyTasks.length / availableDailyTasks.length) * 100 : 0}%` }} 
                        />
                      </div>
                    </div>
                  </div>
                </div>

              <form onSubmit={addTask} className="glass-card p-4 flex flex-col gap-4 shadow-lg border-white/10">
                <div className="flex items-center gap-4">
                  <button
                    type="submit"
                    disabled={!newTask.trim()}
                    className="w-12 h-12 rounded-full border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 hover:bg-purple-500/10 transition-colors disabled:opacity-30 disabled:border-slate-700 disabled:text-slate-500 cursor-pointer"
                  >
                    <Plus size={22} className={newTask.trim() ? "drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" : ""} />
                  </button>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <input
                      type="text"
                      value={newTask}
                      onChange={e => setNewTask(e.target.value)}
                      placeholder="Добавить новую задачу"
                      className="w-full bg-transparent text-white placeholder:text-white font-bold text-[15px] focus:outline-none mb-0.5"
                    />
                    <div className="text-xs text-slate-500">Что хочешь сделать?</div>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/5">
                  <select 
                    value={newTaskType} 
                    onChange={e => setNewTaskType(e.target.value as TaskType)}
                    className="bg-[#0B0E14] border border-white/5 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 focus:outline-none focus:ring-1 focus:ring-white/20"
                  >
                    <option value="daily">Ежедневная</option>
                    <option value="weekly">Еженедельная</option>
                    <option value="recurring">Повторяющаяся</option>
                    <option value="one-off">Разовая</option>
                  </select>
                  
                  {newTaskType === 'weekly' && (
                    <select
                      value={newTaskDay}
                      onChange={e => setNewTaskDay(parseInt(e.target.value))}
                      className="bg-[#0B0E14] border border-white/5 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 focus:outline-none focus:ring-1 focus:ring-white/20"
                    >
                      <option value={1}>Понедельник</option>
                      <option value={2}>Вторник</option>
                      <option value={3}>Среда</option>
                      <option value={4}>Четверг</option>
                      <option value={5}>Пятница</option>
                      <option value={6}>Суббота</option>
                      <option value={0}>Воскресенье</option>
                    </select>
                  )}

                  {newTaskType === 'recurring' && (
                    <div className="flex items-center gap-1.5 bg-[#0B0E14] border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-300">
                      <span>Каждые</span>
                      <input
                        type="number"
                        min="2"
                        max="365"
                        value={newTaskRepeatInterval}
                        onChange={e => setNewTaskRepeatInterval(parseInt(e.target.value) || 2)}
                        className="w-8 bg-transparent focus:outline-none text-center font-medium"
                      />
                      <span>дн.</span>
                    </div>
                  )}

                  <div className="flex-1" />

                  {(effectiveApiKey || effectiveAiBaseUrl) && tasks.some(t => t.stat === 'unknown' && !t.completed) && (
                    <button
                      type="button"
                      onClick={handleAutoCategorizeTasks}
                      disabled={isCategorizingTasks}
                      className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 border border-slate-500/30 rounded-full transition-colors cursor-pointer"
                      title="Авто-категоризация задач (ИИ)"
                    >
                      {isCategorizingTasks ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
                    </button>
                  )}
                </div>
              </form>

              <div className="space-y-4">
                {(() => {
                  const visibleTasks = tasks.filter(t => (!t.availableAt || t.availableAt <= Date.now()));
                  const sortTasks = (arr: typeof tasks) => arr.sort((a, b) => {
                    if (a.isMasterTask && !b.isMasterTask) return -1;
                    if (!a.isMasterTask && b.isMasterTask) return 1;
                    return 0; // maintain original order (maybe creation time?)
                  });
                  const activeTasks = sortTasks(visibleTasks.filter(t => !t.completed));
                  const pendingTasks = sortTasks(visibleTasks.filter(t => t.completed && !t.rewarded));
                  const finishedTasks = sortTasks(visibleTasks.filter(t => t.completed && t.rewarded));

                  const renderTask = (task: typeof tasks[0]) => {
                    const statData = STATS[task.stat];
                    const StatIcon = statData.icon;
                    const DAYS_OF_WEEK_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        key={`task-${task.id}`}
                        onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                        className={`group flex items-center gap-3 p-4 transition-all glass-card cursor-pointer shadow-md ${
                          task.completed
                            ? 'opacity-50 grayscale pt-3 pb-3'
                            : 'hover:border-white/10'
                        }`}
                        style={task.isMasterTask ? { 
                          borderColor: STATS[task.stat]?.hex || '#F59E0B', 
                          boxShadow: `0 0 15px ${(STATS[task.stat]?.hex || '#F59E0B')}22`,
                          backgroundColor: `${STATS[task.stat]?.hex || '#F59E0B'}05`,
                          borderWidth: '1.5px'
                        } : undefined}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }}
                          disabled={isEvaluating === task.id}
                          className={`flex-shrink-0 transition-colors ${
                            task.completed ? 'text-emerald-500' : 'text-slate-500 hover:text-emerald-400'
                          } disabled:opacity-50`}
                        >
                          {isEvaluating === task.id ? <Loader2 size={24} className="animate-spin text-amber-500" /> : task.completed ? <CheckCircle size={24} /> : <Circle size={24} />}
                        </button>
                        <div className="flex-1 flex flex-col gap-1 min-w-0">
                          <span className={`transition-all break-words text-[15px] font-bold ${task.completed ? 'line-through opacity-70 text-slate-400' : 'text-white'}`}>
                            {task.text}
                          </span>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            {task.difficulty && expandedTaskId === task.id && (
                              <div className="flex items-center gap-0.5 text-amber-500" title="Сложность (Огоньки)">
                                {Array.from({ length: task.difficulty }).map((_, i) => (
                                  <Flame key={i} size={10} fill="currentColor" />
                                ))}
                              </div>
                            )}
                            <div className="relative">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTaskStatId(editingTaskStatId === task.id ? null : task.id);
                                }}
                                className="flex items-center gap-1 hover:bg-white/5 px-1.5 rounded transition-colors"
                              >
                                <StatIcon size={12} className={task.completed ? 'opacity-50' : statData.color} />
                                <span>{statData.name}</span>
                              </button>
                              
                              <AnimatePresence>
                                {editingTaskStatId === task.id && (
                                  <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="absolute left-0 bottom-full mb-1 z-50 bg-[#1A1D24] border border-white/10 rounded-lg shadow-xl overflow-hidden min-w-[120px]"
                                  >
                                    {(Object.entries(STATS) as [StatType, typeof STATS[StatType]][]).map(([statKey, sData]) => {
                                      const SIcon = sData.icon;
                                      return (
                                        <button
                                          key={statKey}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, stat: statKey } : t));
                                            setEditingTaskStatId(null);
                                          }}
                                          className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition-colors ${statKey === task.stat ? 'bg-white/5' : ''}`}
                                        >
                                          <SIcon size={12} className={sData.color} />
                                          <span className="text-slate-300">{sData.name}</span>
                                        </button>
                                      );
                                    })}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                            
                            {!task.completed && (
                              <span className="flex items-center gap-1 border border-white/10 px-1.5 py-0.5 rounded backdrop-blur-sm bg-white/5 text-slate-300">
                                <span className={campaign ? THEME_COLORS[campaign.colorTheme || 'slate'].text : 'text-slate-400'}>✧</span>
                                +{(task.difficulty || 1) * 10} <span className="opacity-70 font-medium">опыта</span>
                              </span>
                            )}

                            {task.type && task.type !== 'one-off' && (
                              <span className="px-1.5 py-0.5 rounded bg-[#0B0E14]/80 border border-white/5 text-[10px] uppercase tracking-wider font-medium">
                                {task.type === 'daily' ? 'Ежедневная' : 
                                 task.type === 'weekly' ? `Еженедельная${task.targetDay !== undefined ? ` (${DAYS_OF_WEEK_SHORT[task.targetDay]})` : ''}` :
                                 task.type === 'recurring' ? `Раз в ${task.repeatIntervalDays} дн.` : ''}
                              </span>
                            )}
                            {expandedTaskId === task.id && !task.completed && !task.subtasks && effectiveApiKey && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    const { decomposeTaskWithAI } = await import('./lib/ai');
                                    const subtasksTexts = await decomposeTaskWithAI(effectiveApiKey, effectiveAiBaseUrl, effectiveAiModel, task.text);
                                    if (subtasksTexts.length > 0) {
                                      setTasks(prev => prev.map(t => t.id === task.id ? {
                                        ...t,
                                        subtasks: subtasksTexts.map((text: string) => ({ id: crypto.randomUUID(), text, completed: false }))
                                      } : t));
                                    }
                                  } catch (err) {
                                    console.error("Failed to decompose task", err);
                                  }
                                }}
                                className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-colors flex items-center gap-1"
                              >
                                <Eye size={10} />
                                Разбить
                              </button>
                            )}
                          </div>
                          
                          {/* Subtasks */}
                          {task.subtasks && task.subtasks.length > 0 && (
                            <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-white/5">
                              {task.subtasks.map(subtask => (
                                <div key={subtask.id} className="flex items-center gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTasks(prev => prev.map(t => {
                                        if (t.id === task.id && t.subtasks) {
                                          const newSubtasks = t.subtasks.map(st => st.id === subtask.id ? { ...st, completed: !st.completed } : st);
                                          const allCompleted = newSubtasks.every(st => st.completed);
                                          return { ...t, subtasks: newSubtasks, completed: allCompleted };
                                        }
                                        return t;
                                      }));
                                    }}
                                    className={`flex-shrink-0 transition-colors ${subtask.completed ? 'text-emerald-500' : 'text-slate-600 hover:text-emerald-400'}`}
                                  >
                                    {subtask.completed ? <CheckCircle size={14} /> : <Circle size={14} />}
                                  </button>
                                  <span className={`text-xs transition-all ${subtask.completed ? 'line-through opacity-50 text-slate-500' : 'text-slate-400'}`}>
                                    {subtask.text}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                          className="text-purple-500 border border-purple-500/20 hover:text-purple-300 hover:bg-purple-500/20 transition-all p-2.5 rounded-xl shadow-sm bg-purple-500/5 cursor-pointer ml-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </motion.div>
                    );
                  };

                  return (
                    <>
                      {activeTasks.length > 0 || pendingTasks.length > 0 ? (
                        <>
                          <h3 className="text-[17px] font-bold text-white mt-2 mb-1">Сегодня</h3>
                          <div className="space-y-3">
                            <AnimatePresence mode="popLayout">
                              {activeTasks.map(t => renderTask(t))}
                              {pendingTasks.map(t => renderTask(t))}
                            </AnimatePresence>
                          </div>
                        </>
                      ) : (
                        finishedTasks.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                            <div className="opacity-20">
                              <Flame size={64} className="text-[#E0E0E0]" />
                            </div>
                            <p className="lore-text text-xl text-[#8A8D93]">Герой отдыхает. Добавьте задачу, чтобы продолжить путь.</p>
                          </div>
                        )
                      )}
                      
                      {finishedTasks.length > 0 && (
                        <div className="pt-4 mt-2">
                          <div className="space-y-3">
                            <AnimatePresence mode="popLayout">
                              {finishedTasks.map(t => renderTask(t))}
                            </AnimatePresence>
                          </div>
                          <button
                            onClick={clearCompleted}
                            className="flex items-center justify-between w-full mt-3 mb-3 p-4 text-sm text-purple-300 hover:text-purple-200 bg-[#16122b]/80 transition-colors rounded-[16px] border border-purple-500/20 cursor-pointer shadow-lg"
                          >
                            <span className="font-bold flex items-center gap-2">
                              <span className="text-lg">✨</span> Очистить выполненные
                            </span>
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div> {/* End of space-y-6 flex-1 */}

            {/* Sticky bottom actions */}
            {tasks.some(t => t.completed && !t.rewarded) && (
              <div className="sticky bottom-0 w-full pt-4 pb-2 bg-gradient-to-t from-[#0B0E14] via-[#0B0E14] to-[#0B0E14]/80 z-30 shadow-[0_-20px_20px_-10px_#0B0E14]">
                <button
                  onClick={confirmPendingTasks}
                  disabled={isEvaluating === "batch"}
                  className="w-full py-3 mb-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-sm font-medium rounded-2xl transition-colors border border-emerald-500/20 flex items-center justify-center gap-2"
                >
                  {isEvaluating === "batch" ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  Подтвердить выполнение ({tasks.filter(t => t.completed && !t.rewarded).length})
                </button>
              </div>
            )}
          </div>
        )}

          {activeTab === 'boss' && (
            <div className="flex flex-col flex-1 space-y-3 min-h-full">
              {masterQuest ? (
                <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-[50vh]">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md bg-[#131824] border border-[#3D2513]/40 rounded-3xl p-6 shadow-2xl relative overflow-hidden text-center self-center"
                  >
                    <div 
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-[80px] opacity-10 pointer-events-none"
                      style={{ backgroundColor: STATS[masterQuest.stat]?.hex || '#F59E0B' }}
                    />
                    
                    <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: STATS[masterQuest.stat]?.hex || '#F59E0B' }} />

                    <div className="relative w-20 h-20 mx-auto mb-4 flex items-center justify-center rounded-2xl bg-[#0B0E14] border-2 border-white/5 shadow-inner">
                      <div className="absolute inset-0 rounded-2xl opacity-10 blur-[8px] animate-pulse" style={{ backgroundColor: STATS[masterQuest.stat]?.hex }} />
                      <Eye size={40} className="text-amber-500 relative z-10" />
                    </div>

                    <h2 className="text-xl font-black text-slate-100 uppercase tracking-wider mb-1">
                      Испытание Мастера
                    </h2>
                    <div className="flex flex-wrap items-center justify-center gap-2 mt-1 mb-2">
                      <span 
                        className="text-xs font-bold uppercase tracking-[0.16em] py-1 px-3.5 rounded-full bg-white/5 border border-white/10"
                        style={{ color: STATS[masterQuest.stat]?.hex }}
                      >
                        Пренебрежение: {STATS[masterQuest.stat]?.name}
                      </span>
                      {timeLeft && (
                        <span className="text-[11px] font-bold uppercase text-rose-400 bg-rose-500/10 border border-rose-500/20 py-1 px-3 rounded-full flex items-center gap-1.5 shadow-[0_0_10px_rgba(244,63,94,0.1)]">
                          <Clock size={12} className="animate-pulse" />
                          Осталось: {timeLeft}
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-slate-400 mt-4 leading-relaxed max-w-xs mx-auto text-center font-sans">
                      Мастер заблокировал логово босса! На этой неделе ты выполнил недостаточно задач характеристики <span className="font-bold text-slate-200">{STATS[masterQuest.stat]?.name}</span>. Было сделано всего <span className="font-bold text-slate-200">{gameState.weeklyCompletedCounts?.[masterQuest.stat] || 0}</span> из необходимых <span className="font-bold text-slate-200">{player.level >= 50 ? 3 : (player.level >= 25 ? 2 : 1)}</span> задач.
                    </p>

                    <div className="mt-6 p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10 text-left space-y-3 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-3 opacity-15">
                        {React.createElement(STATS[masterQuest.stat]?.icon || HelpCircle, { size: 64, style: { color: STATS[masterQuest.stat]?.hex } })}
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-[0.15em] text-amber-500 block">Задание Мастера:</span>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans pr-8">
                        Выполняй задачи по характеристике <strong className="text-slate-200">{STATS[masterQuest.stat]?.name}</strong>. Каждая завершенная задача добавляет <strong className="text-slate-100">+10 очков</strong> к восстановлению баланса.
                      </p>
                    </div>

                    <div className="mt-6 space-y-2 text-left">
                      <div className="flex justify-between items-center text-xs text-slate-400 font-bold px-1">
                        <span>Прогресс Испытания</span>
                        <span style={{ color: STATS[masterQuest.stat]?.hex }}>{masterQuest.current} / {masterQuest.target} Очков</span>
                      </div>
                      
                      <div className="h-3 w-full bg-black/50 rounded-full overflow-hidden border border-white/5 p-[2px]">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ 
                            backgroundColor: STATS[masterQuest.stat]?.hex,
                            boxShadow: `0 0 12px ${STATS[masterQuest.stat]?.hex || '#F59E0B'}80`
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `${(masterQuest.current / masterQuest.target) * 100}%` }}
                          transition={{ type: "spring", stiffness: 60 }}
                        />
                      </div>
                    </div>

                    <div className="mt-8">
                      {masterQuest.current >= masterQuest.target ? (
                        <button
                          onClick={() => {
                            import('./lib/sfx').then(({ playSound }) => playSound('powerup'));
                            setPlayer(prev => ({
                              ...prev,
                              gold: (prev.gold || 0) + 50,
                              xp: prev.xp + 150
                            }));
                            setMasterQuest(null);
                            setGmMessage(`Мастер: "Великолепно! Ты доказал свое усердие и усвоил урок. Доступ к логову босса вновь открыт!"`);
                          }}
                          className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 font-black text-slate-950 text-xs uppercase tracking-[2px] rounded-xl hover:from-emerald-400 hover:to-teal-400 transition-all duration-300 active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer"
                        >
                          Завершить Испытание (+150 XP, +50 Золота)
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <button
                            onClick={handleRequestBalanceTasks}
                            disabled={isGeneratingBalanceTasks}
                            style={{ backgroundColor: STATS[masterQuest.stat]?.hex }}
                            className="w-full py-3.5 text-slate-950 font-black text-xs uppercase tracking-[2px] rounded-xl hover:brightness-110 transition-all duration-300 active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.2)] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
                          >
                            {isGeneratingBalanceTasks ? (
                              <>
                                <Loader2 size={16} className="animate-spin text-slate-950" />
                                <span>Мастер думает...</span>
                              </>
                            ) : (
                              <>
                                <Eye size={16} className="text-slate-950" />
                                <span>Запросить задачи Мастера</span>
                              </>
                            )}
                          </button>

                          <div className="w-full py-3.5 bg-white/5 border border-white/10 opacity-60 text-slate-400 font-black text-xs uppercase tracking-[2px] rounded-xl font-sans select-none">
                            Доступ заблокирован испытанием
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>
              ) : isGeneratingBoss ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-6 min-h-[50vh] px-8">
                  <div className="relative">
                    <Loader2 size={48} className="animate-spin text-amber-500 mx-auto opacity-50" />
                    <div className="absolute inset-0 flex items-center justify-center font-black text-amber-400 text-xs">
                      {generationProgress}%
                    </div>
                  </div>
                  <div className="w-full max-w-[240px] space-y-3 text-center">
                    <p className="text-amber-400/80 font-bold text-xs uppercase tracking-widest">{generationStep || 'Инициализация...'}</p>
                    <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner">
                      <motion.div
                        className="h-full bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${generationProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Campaign Map (Compact) */}
                  {campaign ? (
                    <div className="w-full mb-2">
                        {gameState.chronicle.season_info && (
                          <div className="w-full text-center mb-3 mt-1 relative z-10 px-2">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 shadow-lg">
                              {gameState.chronicle.season_info.name} <span className="opacity-50 ml-1">[{gameState.chronicle.season_info.current_campaign}/{gameState.chronicle.season_info.total_campaigns}]</span>
                            </span>
                          </div>
                        )}
                      <div className="flex justify-between items-center mb-3 px-1">
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-[12px] bg-[#12141A] border-2 ${THEME_COLORS[campaign.colorTheme || 'slate'].border} ${THEME_COLORS[campaign.colorTheme || 'slate'].text} ${THEME_COLORS[campaign.colorTheme || 'slate'].dropShadow} shadow-lg relative overflow-hidden`}>
                             <div className={`absolute inset-0 opacity-20 ${THEME_COLORS[campaign.colorTheme || 'slate'].bg}`} />
                             <Skull size={18} className="relative z-10" />
                          </div>
                          <h2 className={`text-[16px] font-black tracking-wide ${THEME_COLORS[campaign.colorTheme || 'slate'].text} drop-shadow-md`}>{campaign.theme}</h2>
                        </div>
                        <div className={`flex items-center gap-1.5 glass-card px-2.5 py-1 !rounded-xl border border-white/5 text-slate-300 shadow-md`}>
                          <Clock size={12} className={THEME_COLORS[campaign.colorTheme || 'slate'].text} />
                          <span className="font-mono text-[10px] font-bold">{timeLeft}</span>
                        </div>
                      </div>
                      
                      <div className={`relative w-full h-[76px] bg-[#0B0E14] rounded-[20px] border border-white/10 ${THEME_COLORS[campaign.colorTheme || 'slate'].bgTransparent} overflow-hidden shadow-sm`}>
                        {campaign.mapUrl ? (
                          <img src={campaign.mapUrl} alt="Campaign Map" className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-luminosity" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-700 via-slate-900 to-black" />
                        )}
                        <div className={`absolute inset-0 bg-gradient-to-r from-[#0B0E14]/80 via-transparent to-[#0B0E14]/80`} />
                        
                        <div className="absolute inset-0 flex items-center justify-around px-5">
                          {campaign.enemies.map((enemy, idx) => {
                            const isCurrent = idx === campaign.currentEnemyIndex;
                            const isDefeated = idx < campaign.currentEnemyIndex;
                            
                            return (
                              <div key={`${enemy.id}-${idx}`} className="relative flex flex-col items-center">
                                {/* Path line */}
                                {idx < campaign.enemies.length - 1 && (
                                  <div className={`absolute top-4 left-1/2 w-full h-0.5 -z-10 ${isDefeated ? THEME_COLORS[campaign.colorTheme || 'slate'].bg : 'bg-white/10'}`} style={{ width: 'calc(100% + 2.5rem)', opacity: isDefeated ? 0.5 : 1 }} />
                                )}
                                
                                <div 
                                  onClick={() => handleEnemyClick(enemy, idx)}
                                  className={`w-[36px] h-[36px] rounded-full border-2 flex items-center justify-center bg-[#0B0E14] z-10 transition-all cursor-pointer ${
                                  isCurrent ? `border-transparent scale-110 ${THEME_COLORS[campaign.colorTheme || 'slate'].shadow}` : 
                                  isDefeated ? 'border-transparent opacity-80 backdrop-blur-sm' : 'border-white/10 opacity-70'
                                }`}
                                  style={isCurrent ? { borderColor: 'currentColor', color: 'var(--tw-colors-amber-400)' } : {}}
                                >
                                  {isCurrent && <div className={`absolute inset-0 rounded-full border-[3px] ${THEME_COLORS[campaign.colorTheme || 'slate'].border} animate-pulse`} />}
                                  {isDefeated && <div className={`absolute inset-0 rounded-full border-2 ${THEME_COLORS[campaign.colorTheme || 'slate'].border} opacity-50`} />}
                                  
                                  <div className="w-full h-full overflow-hidden rounded-full relative">
                                    <div className="absolute inset-0 bg-[#0B0E14] opacity-50" />
                                    {enemy.imageUrl && !(idx === campaign.enemies.length - 1 && idx > campaign.currentEnemyIndex) ? (
                                      <img src={enemy.imageUrl} alt={enemy.name} className={`w-full h-full object-cover relative z-10 ${isDefeated ? 'grayscale' : ''}`} referrerPolicy="no-referrer" />
                                    ) : enemy.avatarEmoji && !(idx === campaign.enemies.length - 1 && idx > campaign.currentEnemyIndex) ? (
                                      <span className="text-lg z-10 relative">{enemy.avatarEmoji}</span>
                                    ) : (
                                      <Skull size={16} className={`relative z-10 ${isCurrent ? THEME_COLORS[campaign.colorTheme || 'slate'].text : isDefeated ? 'text-slate-600' : 'text-slate-600'}`} />
                                    )}
                                  </div>
                                  
                                  {isDefeated && (
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#0B0E14] rounded-full flex items-center justify-center z-20 border border-white/10">
                                      <CheckCircle size={10} className={THEME_COLORS[campaign.colorTheme || 'slate'].text} />
                                    </div>
                                  )}
                                </div>
                                <span className={`text-[8.5px] mt-1 font-bold w-[70px] text-center break-words leading-tight ${isCurrent ? THEME_COLORS[campaign.colorTheme || 'slate'].text : 'text-slate-500'}`}>
                                  {idx === campaign.enemies.length - 1 && idx > campaign.currentEnemyIndex ? '???' : enemy.name}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full flex justify-between items-end mb-2 px-1">
                      <h2 className="text-base font-bold text-slate-400">Одиночная цель</h2>
                      <div className="flex items-center gap-1.5 text-slate-400 glass-card px-2.5 py-1 !rounded-lg">
                        <Clock size={12} className="text-slate-400" />
                        <span className="font-mono text-[10px] font-medium">{timeLeft}</span>
                      </div>
                    </div>
                  )}

                  {/* Calculate Weakness Stat */}
                  {(() => {
                    let weaknessStat: StatType = 'strength';
                    let maxMultiplier = 0;
                    if (boss.multipliers) {
                      (Object.keys(boss.multipliers) as StatType[]).forEach(stat => {
                        if (boss.multipliers[stat] > maxMultiplier) {
                          maxMultiplier = boss.multipliers[stat];
                          weaknessStat = stat;
                        }
                      });
                    }

                    return (
                      <div className="flex flex-col flex-1 gap-3 min-h-0 pb-1">
                        {/* Boss Info Card */}
                        <motion.div 
                          className={`w-full flex-1 relative flex flex-col rounded-[20px] overflow-hidden border-2 ${campaign ? THEME_COLORS[campaign.colorTheme || 'slate'].border : 'border-white/5'} ${campaign ? THEME_COLORS[campaign.colorTheme || 'slate'].bgTransparent : 'bg-[#1A1D24]/40'} shadow-[0_0_30px_rgba(0,0,0,0.5)] min-h-[300px]`}
                          animate={bossHit ? { x: [-5, 5, -5, 5, 0], y: [-2, 2, -2, 2, 0] } : {}}
                          transition={{ duration: 0.25 }}
                        >
                          {/* Lore Button */}
                          <button 
                            onClick={() => setShowStoryModal(true)}
                            className="absolute top-3 right-3 w-7 h-7 rounded-full glass-card flex items-center justify-center z-20 border border-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                          >
                            <span className="font-serif italic font-bold text-[14px]">i</span>
                          </button>

                          {/* Boss Avatar */}
                          <motion.div
                            animate={boss.hp <= 0 ? {
                              y: 50,
                              opacity: 0,
                              filter: 'blur(10px)'
                            } : {}}
                            transition={boss.hp <= 0 ? { duration: 1 } : {}}
                            className="absolute inset-0 w-full h-full flex items-center justify-center group"
                          >
                            {boss.imageUrl ? (
                              <>
                                <motion.img 
                                  src={boss.imageUrl} 
                                  alt={boss.name} 
                                  className="w-full h-full object-cover object-center opacity-80" 
                                  referrerPolicy="no-referrer"
                                  animate={bossHit ? {
                                    filter: ['brightness(1) contrast(1)', 'brightness(1.5) contrast(1.2)', 'brightness(1) contrast(1)'],
                                    scale: 1
                                  } : {
                                    scale: [1, 1.05, 1]
                                  }}
                                  transition={bossHit ? { duration: 0.2 } : { duration: 12, repeat: Infinity, ease: "easeInOut" }}
                                />
                                {(aiSettings.enableImages !== false && boss.imagePrompt) && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setBoss(prev => prev ? { ...prev, imageUrl: undefined } : null);
                                      setImageQueue(prev => {
                                          const filtered = prev.filter(j => !(j.type === 'enemy' && j.targetId === boss.id));
                                          return [...filtered, { id: crypto.randomUUID(), type: 'enemy', targetId: boss.id, prompt: boss.imagePrompt!, aspectRatio: '1:1', status: 'pending', retryCount: 0 }];
                                      });
                                    }}
                                    className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 p-2 bg-[#0B0E14]/80 text-slate-400 hover:text-white rounded-full border border-white/10 transition-all z-10"
                                    title="Перегенерировать изображение"
                                  >
                                    <RefreshCw size={16} />
                                  </button>
                                )}
                              </>
                            ) : (aiSettings.enableImages !== false && boss.imagePrompt) ? (
                              (() => {
                                const bossImageJob = imageQueue.find(j => j.type === 'enemy' && j.targetId === boss.id);
                                const isGeneratingBossImage = bossImageJob && (bossImageJob.status === 'pending' || bossImageJob.status === 'processing' || (bossImageJob.status === 'failed' && (bossImageJob.retryCount || 0) < 3));
                                
                                if (!effectiveApiKey && !effectiveAiBaseUrl) {
                                  return (
                                     <div className="flex flex-col items-center justify-center gap-2 mt-4 text-white/50 relative z-10 w-full px-8 text-center max-w-[280px]">
                                       <AlertTriangle size={20} className="text-amber-500/50 mb-1" />
                                       <span className="text-xs text-amber-500/70 uppercase tracking-[2px] font-bold">API ключ не указан</span>
                                       <span className="text-[9px] text-slate-500 leading-tight font-medium">Для генерации изображений укажите ключ в настройках</span>
                                     </div>
                                  );
                                } else if (isGeneratingBossImage) {
                                  return (
                                    <div className="flex flex-col items-center justify-center gap-4 text-white/30 animate-pulse mt-4">
                                      <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center">
                                         <div className="w-12 h-12 rounded-full border border-white/5 flex items-center justify-center animate-spin" style={{ animationDuration: '3s' }}>
                                            <div className={`w-2 h-2 rounded-full ${campaign ? THEME_COLORS[campaign.colorTheme || 'slate'].text : 'bg-slate-500'} shadow-[0_0_10px_currentColor]`} />
                                         </div>
                                      </div>
                                      <span className="text-xs uppercase tracking-[3px] font-mono">Призыв сущности...</span>
                                    </div>
                                  );
                                } else {
                                  return (
                                    <div className="flex flex-col items-center justify-center gap-4 mt-4 text-white/50 relative z-10">
                                      <div className="w-16 h-16 rounded-full border border-red-500/30 flex items-center justify-center bg-red-500/10">
                                        <RefreshCw size={24} className="text-red-400" />
                                      </div>
                                      <span className="text-xs text-red-400 text-center px-4 font-bold tracking-widest uppercase mt-[-8px]">Сбой призыва</span>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setImageQueue(prev => {
                                              const filtered = prev.filter(j => !(j.type === 'enemy' && j.targetId === boss.id));
                                              return [...filtered, { id: crypto.randomUUID(), type: 'enemy', targetId: boss.id, prompt: boss.imagePrompt!, aspectRatio: '1:1', status: 'pending', retryCount: 0 }];
                                          });
                                        }}
                                        className="px-6 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 rounded-xl text-xs font-semibold transition-colors mt-1 shadow-lg cursor-pointer"
                                      >
                                        Повторить
                                      </button>
                                    </div>
                                  );
                                }
                              })()
                            ) : boss.avatarEmoji ? (
                              <div className="flex flex-col items-center justify-center gap-4 relative z-10">
                                <span className="text-8xl drop-shadow-2xl">{boss.avatarEmoji}</span>
                                {(aiSettings.enableImages !== false) && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const constructedPrompt = boss.imagePrompt || `A 2D fantasy game card character portrait of ${boss.name}, ${boss.description}. Epic mythology creature, highly detailed dark fantasy illustration style, isolated object on clean black background, no text.`;
                                      setBoss(prev => prev ? { ...prev, imagePrompt: constructedPrompt } : null);
                                      setImageQueue(prev => {
                                          const filtered = prev.filter(j => !(j.type === 'enemy' && j.targetId === boss.id));
                                          return [...filtered, { id: crypto.randomUUID(), type: 'enemy', targetId: boss.id, prompt: constructedPrompt, aspectRatio: '1:1', status: 'pending', retryCount: 0 }];
                                      });
                                    }}
                                    className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/30 rounded-xl text-xs font-semibold transition-all shadow-lg hover:shadow-purple-500/10 cursor-pointer flex items-center gap-1.5 active:scale-95 z-20"
                                  >
                                    <Eye size={13} />
                                    Призвать облик
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center gap-4 relative z-10">
                                <Skull size={80} className="text-slate-500 animate-pulse" />
                                {(aiSettings.enableImages !== false) && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const constructedPrompt = boss.imagePrompt || `A 2D fantasy game card character portrait of ${boss.name}, ${boss.description}. Epic mythology creature, highly detailed dark fantasy illustration style, isolated object on clean black background, no text.`;
                                      setBoss(prev => prev ? { ...prev, imagePrompt: constructedPrompt } : null);
                                      setImageQueue(prev => {
                                          const filtered = prev.filter(j => !(j.type === 'enemy' && j.targetId === boss.id));
                                          return [...filtered, { id: crypto.randomUUID(), type: 'enemy', targetId: boss.id, prompt: constructedPrompt, aspectRatio: '1:1', status: 'pending', retryCount: 0 }];
                                      });
                                    }}
                                    className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/30 rounded-xl text-xs font-semibold transition-all shadow-lg hover:shadow-purple-500/10 cursor-pointer flex items-center gap-1.5 active:scale-95 z-20"
                                  >
                                    <Eye size={13} />
                                    Призвать облик
                                  </button>
                                )}
                              </div>
                            )}
                            
                            {/* Gradient Overlay for Text Readability */}
                            <div className={`absolute inset-0 bg-gradient-to-t ${campaign ? `from-[#0B0E14] via-[${THEME_COLORS[campaign.colorTheme || 'slate'].bg}]/10` : 'from-[#0B0E14] via-[#0B0E14]/40'} to-transparent pointer-events-none`} />
                            
                            {bossHit && (
                              <motion.div 
                                initial={{ opacity: 1, scale: 0.5, y: 0 }}
                                animate={{ opacity: 0, scale: 1.5, y: -50 }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className="absolute font-black text-5xl z-30 drop-shadow-lg"
                                style={{ color: lastDamageColor, textShadow: `0 0 20px ${lastDamageColor}` }}
                              >
                                -{lastDamageDealt}
                              </motion.div>
                            )}

                            {bossBanterBubble && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: -40 }}
                                className="absolute z-40 max-w-[85%] bg-black/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-amber-500/50 shadow-[0_10px_30px_rgba(245,158,11,0.25)] text-center flex flex-col items-center gap-1.5 overflow-hidden"
                                transition={{ duration: 0.25 }}
                              >
                                {/* Speak Pointer */}
                                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-black border-r border-b border-amber-500/50 rotate-45" />
                                
                                <span className="text-[9px] font-black uppercase text-amber-400 tracking-[0.2em] mb-[-4px]">
                                  {boss.name}
                                </span>
                                <p className="text-xs font-semibold text-slate-100 leading-relaxed font-sans max-h-[140px] overflow-y-auto pr-1">
                                  {bossBanterBubble}
                                </p>
                              </motion.div>
                            )}
                          </motion.div>

                          {/* Boss Details */}
                          <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2 z-20 text-center bg-gradient-to-t from-[#0B0E14] to-transparent pt-10">
                            <div>
                              <h2 className="text-[22px] font-bold text-white break-words whitespace-normal leading-[1.2] flex items-center justify-center gap-2 drop-shadow-lg tracking-wide">
                                <span className={campaign ? THEME_COLORS[campaign.colorTheme || 'slate'].text : 'text-slate-500'}>✧</span>
                                {boss.name}
                                <span className={campaign ? THEME_COLORS[campaign.colorTheme || 'slate'].text : 'text-slate-500'}>✧</span>
                                {boss.isNemesis && (
                                  <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-md border border-rose-500/30 uppercase tracking-wider backdrop-blur-sm ml-1">
                                    Немезида
                                  </span>
                                )}
                              </h2>
                              <div className="flex items-center justify-center gap-2 text-[11px] mt-1.5 drop-shadow-md">
                                <span className="text-slate-300 font-medium tracking-wide">Ур. {boss.level || (player.level <= boss.multipliers[weaknessStat as StatType] ? player.level + 2 : boss.multipliers[weaknessStat as StatType]) || 1}</span>
                                <span className={`text-[10px] bg-transparent ${STATS[weaknessStat].color} px-1.5 py-0.5 rounded-md uppercase tracking-wider font-bold border border-current backdrop-blur-sm shadow-[0_0_8px_currentColor]`}>
                                  {STATS[weaknessStat].name}
                                </span>
                              </div>
                            </div>
                            
                            {/* HP Bar */}
                            <div className="space-y-1 w-full max-w-[240px] mx-auto pt-1 drop-shadow-md">
                              <div className="flex justify-between text-[11px] font-bold px-1 mb-1 tracking-wide">
                                <span className="text-rose-400">❤ HP</span>
                                <span className="text-white font-mono">{Math.ceil(Math.max(0, boss.hp))} / {boss.maxHp}</span>
                              </div>
                              <div className="h-[8px] w-full bg-[#121216]/80 backdrop-blur-sm rounded-full overflow-hidden border border-white/10 shadow-inner relative flex">
                                {boss.hp <= 0 && <div className="absolute inset-0 bg-emerald-500 flex items-center justify-center text-[8px] font-bold text-emerald-900 tracking-widest uppercase z-10">Повержен</div>}
                                <motion.div
                                  className="h-full bg-gradient-to-r from-rose-500 to-fuchsia-500 relative"
                                  initial={{ width: `${(boss.hp / boss.maxHp) * 100}%` }}
                                  animate={{ width: `${(boss.hp / boss.maxHp) * 100}%` }}
                                  transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
                                >
                                  <div className="absolute right-0 top-0 bottom-0 w-3 bg-white opacity-60 blur-[3px]"></div>
                                </motion.div>
                              </div>
                            </div>
                          </div>
                        </motion.div>

                        {/* Attack Section */}
                        <div className={`mt-auto space-y-3 shrink-0 glass-card rounded-[16px] p-4 border-2 ${campaign ? THEME_COLORS[campaign.colorTheme || 'slate'].border : 'border-white/5'} ${campaign ? THEME_COLORS[campaign.colorTheme || 'slate'].bgTransparent : ''}`}>
                          <div className="flex items-center justify-between px-2">
                            <span className="text-[13px] text-slate-400 flex items-center gap-2 font-medium tracking-wide">
                              <Flame size={14} className={campaign ? THEME_COLORS[campaign.colorTheme || 'slate'].text : 'text-amber-500'} />
                              Накоплено силы:
                            </span>
                            <span className="text-white font-black text-xl drop-shadow-md">
                              {(Object.values(player.pendingDamage) as number[]).reduce((a, b) => a + b, 0)}
                            </span>
                          </div>
                          
                          {boss.hp <= 0 ? (
                            <div className="pt-0.5 mt-auto">
                              <button
                                onClick={handleBossDefeated}
                                disabled={isGeneratingBoss}
                                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-[#0B0E14] disabled:text-slate-600 disabled:border disabled:border-white/5 text-white font-bold rounded-[14px] shadow-[0_4px_15px_rgba(16,185,129,0.2)] disabled:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
                              >
                                {isGeneratingBoss ? (
                                  <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Генерация...
                                  </>
                                ) : (
                                  <>
                                    <Trophy size={16} />
                                    Продолжить
                                  </>
                                )}
                              </button>
                            </div>
                          ) : (
                            (() => {
                        const totalPending = (Object.values(player.pendingDamage) as number[]).reduce((a, b) => a + b, 0);
                        let gradientStyle = {};
                        if (totalPending > 0) {
                          const activeStats = (Object.keys(player.pendingDamage) as StatType[]).filter(s => player.pendingDamage[s] > 0);
                          
                          if (activeStats.length === 1) {
                            const color = STATS[activeStats[0]].hex;
                            // Create a flowing gradient for a single color
                            gradientStyle = { background: `linear-gradient(90deg, ${color}, ${color}80, ${color})` };
                          } else {
                            const stops: string[] = [];
                            let currentPct = 0;
                            activeStats.forEach(stat => {
                              const points = player.pendingDamage[stat];
                              const pct = (points / totalPending) * 100;
                              const color = STATS[stat].hex;
                              stops.push(`${color} ${currentPct}%`);
                              currentPct += pct;
                              stops.push(`${color} ${currentPct}%`);
                            });
                            // Add the first color again at the end for smooth looping
                            stops.push(`${STATS[activeStats[0]].hex} 100%`);
                            gradientStyle = { background: `linear-gradient(90deg, ${stops.join(', ')})` };
                          }
                        }

                        const glowIntensity = Math.min(1, totalPending / boss.hp);
                        const boxShadow = totalPending > 0 ? `0 0 ${20 + glowIntensity * 30}px rgba(225,29,72,${0.2 + glowIntensity * 0.5})` : 'none';

                        return (
                          <div className="pt-1 space-y-2">
                            <button
                              onClick={handleAttack}
                              disabled={totalPending === 0}
                              style={{ ...gradientStyle, boxShadow }}
                              className={`w-full py-2.5 ${totalPending === 0 ? 'bg-[#12141A] text-[#8A8D93] border border-white/5 shadow-inner' : 'text-white border-2 border-white/20 animate-gradient-flow cursor-pointer'} font-extrabold rounded-[14px] transition-all active:scale-95 flex items-center justify-center gap-2 relative overflow-hidden text-sm uppercase tracking-wider`}
                            >
                              {totalPending > 0 && (
                                <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity" />
                              )}
                              <Sword size={16} className="relative z-10" />
                              <span className="relative z-10">Нанести удар</span>
                            </button>

                            {player.familiar && player.familiar.stage !== 'egg' && player.familiar.status === 'active' && (
                              <div className="mt-2 text-left">
                                {familiarSkillUsed ? (
                                  <div className="w-full py-2.5 bg-slate-950/40 border border-white/5 text-slate-500 font-bold rounded-[14px] text-[10px] uppercase tracking-wider text-center select-none">
                                    ⚔ Боевой навык перезаряжается...
                                  </div>
                                ) : (
                                  <button
                                    onClick={handleFamiliarSkill}
                                    className="w-full py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold rounded-[14px] border border-blue-400/30 shadow-[0_0_15px_rgba(37,99,235,0.35)] transition-all active:scale-95 flex items-center justify-center gap-2 text-[10px] uppercase tracking-wider relative overflow-hidden cursor-pointer"
                                  >
                                    <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity" />
                                    <Zap size={14} className="text-amber-300 animate-pulse shrink-0" />
                                    <span className="truncate">
                                      {player.familiar.name}: {FAMILIAR_SKILLS[player.familiar.type]?.name || 'Удар Спутника'} (+{getFamiliarSkillDamage(player.familiar, player.combo)} ур.)
                                    </span>
                                  </button>
                                )}
                                <p className="text-[8px] text-slate-400 text-center mt-1.5 leading-snug">
                                  {FAMILIAR_SKILLS[player.familiar.type]?.description || 'Наносит сокрушительный урон по слабости босса.'} <br/>
                                  <span className="text-emerald-400 font-semibold">(Выполнение ваших реальных дел перезаряжает навык!)</span>
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    )}
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </div>
    )}

    {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="glass-card p-6 text-center space-y-4 relative">
                <button 
                  onClick={() => setShowSettings(true)}
                  className="absolute top-4 right-4 text-slate-500 hover:text-amber-400 transition-colors"
                >
                  <Settings size={20} />
                </button>
                <div className="w-20 h-20 bg-[#0B0E14] rounded-full border-4 border-white/5 mx-auto flex items-center justify-center shadow-inner mb-2">
                  <User size={40} className="text-[#8A8D93]" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-100 flex items-center justify-center gap-2">
                    Герой
                  </h2>
                  <motion.p 
                    className={`text-amber-400 font-medium mb-2 ${showClassGlow ? 'text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]' : ''}`}
                    animate={showClassGlow ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 0.5 }}
                  >
                    {player.playerClass || 'Новичок'} {player.level} уровня
                  </motion.p>

                  {player.combo > 0 && (
                    <div className="flex items-center justify-center gap-2 mt-3 mb-1">
                      <span className="text-xs font-bold text-orange-400 bg-orange-400/10 px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-orange-400/20">
                        <Flame size={14} /> {player.combo} {player.combo % 10 === 1 && player.combo % 100 !== 11 ? 'день' : [2, 3, 4].includes(player.combo % 10) && ![12, 13, 14].includes(player.combo % 100) ? 'дня' : 'дней'} подряд
                      </span>
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-emerald-400/20">
                        <Zap size={14} /> Бонус x{(1 + (player.combo * 0.1)).toFixed(1)}
                      </span>
                    </div>
                  )}

                  {player.familiar && (
                    <div className="mt-6 p-1 rounded-2xl bg-gradient-to-b from-[#1E293B] to-[#0B0E14] shadow-xl border border-white/5">
                      <div className="p-4 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] rounded-xl flex flex-col gap-4 text-left relative overflow-hidden">
                        
                        {/* Decorative glow */}
                        <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 pointer-events-none rounded-full ${
                          player.familiar.status === 'injured' ? 'bg-red-500' :
                          player.familiar.stage === 'ultra' ? 'bg-amber-500' :
                          player.familiar.stage === 'evolved' ? 'bg-purple-500' :
                          'bg-emerald-500'
                        }`} />

                        {petReactionMessage && (
                          <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl p-3 text-[11px] leading-relaxed relative z-20 shadow-md backdrop-blur-sm mx-1"
                          >
                            <div className="absolute -bottom-1 w-2.5 h-2.5 bg-[#0d1220] border-r border-b border-emerald-500/20 rotate-45 left-1/2 -translate-x-1/2" />
                            {petReactionMessage}
                          </motion.div>
                        )}

                        <div className="flex flex-col items-center gap-4 relative z-10">
                          <div className={`w-28 h-28 rounded-full bg-[#0B0E14] border-4 flex items-center justify-center text-5xl overflow-hidden shrink-0 transition-all duration-500 hover:scale-105 ${
                            player.familiar.status === 'injured' ? 'border-red-500/50 grayscale shadow-[0_0_20px_rgba(239,68,68,0.3)]' :
                            player.familiar.stage === 'ultra' ? 'border-amber-400/80 shadow-[0_0_25px_rgba(251,191,36,0.6)]' :
                            player.familiar.stage === 'evolved' ? 'border-purple-500/80 shadow-[0_0_20px_rgba(168,85,247,0.5)]' :
                            player.familiar.stage === 'baby' ? 'border-blue-500/80 shadow-[0_0_20px_rgba(59,130,246,0.4)]' :
                            'border-slate-500/50 shadow-inner'
                          }`}>
                            {player.familiar.imageUrl ? (
                              <img src={player.familiar.imageUrl} alt={player.familiar.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              player.familiar.stage === 'egg' ? '🥚' : 
                              player.familiar.stage === 'baby' ? '🐣' : 
                              player.familiar.stage === 'evolved' ? '🦅' : '🐉'
                            )}
                          </div>
                          
                          <div className="text-center w-full space-y-1">
                            <h4 className={`text-xl font-black tracking-wide font-serif ${
                                player.familiar.status === 'injured' ? 'text-red-400' :
                                player.familiar.stage === 'ultra' ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' :
                                player.familiar.stage === 'evolved' ? 'text-purple-400' :
                                player.familiar.stage === 'baby' ? 'text-blue-400' :
                                'text-slate-300'
                              }`}>
                              {player.familiar.name}
                            </h4>
                            <p className="text-xs text-slate-400 font-medium uppercase tracking-[2px]">
                              {player.familiar.type}
                            </p>
                            
                            <div className="flex justify-center items-center gap-2 mt-2">
                              <span className="text-[10px] bg-black/50 px-2 py-1 rounded-md border border-white/10 text-white font-mono">
                                Ур. {player.familiar.level}
                              </span>
                              <span className={`text-[10px] px-2 py-1 rounded-md border text-white font-bold uppercase tracking-wider ${
                                player.familiar.stage === 'ultra' ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' :
                                player.familiar.stage === 'evolved' ? 'bg-purple-500/20 border-purple-500/50 text-purple-300' :
                                player.familiar.stage === 'baby' ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' :
                                'bg-slate-500/20 border-slate-500/50 text-slate-300'
                              }`}>
                                {player.familiar.stage === 'ultra' ? 'Легенда' : player.familiar.stage === 'evolved' ? 'Взрослый' : player.familiar.stage === 'baby' ? 'Детёныш' : 'Яйцо'}
                              </span>
                              {player.familiar.status === 'injured' && (
                                <span className="text-[10px] bg-red-500/20 px-2 py-1 rounded-md border border-red-500/50 text-red-400 font-bold uppercase tracking-wider animate-pulse">
                                  Ранен
                                </span>
                              )}
                              {player.familiar.status === 'expedition' && (
                                <span className="text-[10px] bg-emerald-500/20 px-2 py-1 rounded-md border border-emerald-500/50 text-emerald-400 font-bold uppercase tracking-wider animate-pulse">
                                  В экспедиции
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 z-10 w-full px-2">
                          <div className="flex justify-between items-end border-b border-white/10 pb-2">
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Связь</div>
                            <div className="text-right text-[11px] text-emerald-400 font-bold">
                              Бафф: +{Math.round(getFamiliarBuff(player.combo, player.familiar) * 100)}% к наградам
                            </div>
                          </div>

                          {/* Pet XP / Warmth Bar */}
                          <div className="space-y-1.5 pt-1">
                            <div className="flex justify-between text-[10px] text-emerald-300/80 font-bold uppercase tracking-widest">
                              <span>{player.familiar.stage === 'egg' ? 'Прогресс вылупления' : 'Опыт питомца'}</span>
                              <span>{player.familiar.xp} / 100</span>
                            </div>
                            <div className="h-2 bg-[#0B0E14] rounded-full overflow-hidden shadow-inner border border-white/5 relative">
                              <motion.div
                                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 relative"
                                initial={{ width: `${player.familiar.xp}%` }}
                                animate={{ width: `${player.familiar.xp}%` }}
                                transition={{ type: 'spring', bounce: 0 }}
                              />
                            </div>
                          </div>

                          {/* New Interactable Companion Sanctuary Block */}
                          <div className="bg-black/40 border border-white/5 rounded-xl p-3 space-y-2.5">
                            <h5 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center">
                              🐾 Обитель питомца
                            </h5>

                            {player.familiar.stage === 'egg' ? (
                              <div className="space-y-2">
                                <p className="text-[10px] text-slate-400 leading-relaxed text-center italic">
                                  Достигните 100% тепла, согревая яйцо, чтобы оно вылупилось! Завершение ваших реальных задач также добавляет +10% тепла.
                                </p>
                                <div className="grid grid-cols-2 gap-2 pt-1.5">
                                  <button
                                    onClick={() => handlePetAction('pet')}
                                    disabled={player.familiar.lastWarmedAt && (Date.now() - player.familiar.lastWarmedAt) < 24 * 60 * 60 * 1000}
                                    className="py-2 px-1 bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent text-[10px] font-bold text-white uppercase rounded-lg text-center cursor-pointer transition-all"
                                  >
                                    {player.familiar.lastWarmedAt && (Date.now() - player.familiar.lastWarmedAt) < 24 * 60 * 60 * 1000 ? 'Согрето сегодня' : '💖 Согреть своим дыханием (+25% свободно)'}
                                  </button>
                                  <button
                                    onClick={() => handlePetAction('feed')}
                                    className="py-2 px-1 bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/30 text-[10px] font-bold text-emerald-300 uppercase rounded-lg text-center cursor-pointer transition-all"
                                  >
                                    🔥 Согреть у очага (+35% за 30 золота)
                                  </button>
                                </div>
                              </div>
                            ) : player.familiar.status === 'injured' ? (
                              <div className="space-y-2 text-center">
                                <p className="text-[10px] text-red-300 font-mediumLeading-relaxed">
                                  Питомец получил серьезные повреждения в бою и не может составить вам компанию.
                                </p>
                                <button
                                  onClick={() => {
                                    // Live heal helper within profile
                                    const reviveIndex = player.inventory.findIndex(i => i.effect.type === 'pet_revive');
                                    const hasRevive = reviveIndex !== -1;
                                    if (!hasRevive && player.gold < 50) {
                                      import('./lib/sfx').then(({ playSound }) => playSound('error'));
                                      setGmMessage('У вас нет Оживителя и недостаточно золота (нужно 50 золота) для мгновенного исцеления!');
                                      return;
                                    }
                                    setPlayer(prev => {
                                      if (!prev.familiar) return prev;
                                      let updatedInventory = [...prev.inventory];
                                      let updatedGold = prev.gold;
                                      if (hasRevive) {
                                        updatedInventory.splice(reviveIndex, 1);
                                      } else {
                                        updatedGold -= 50;
                                      }
                                      return {
                                        ...prev,
                                        gold: updatedGold,
                                        inventory: updatedInventory,
                                        familiar: {
                                          ...prev.familiar,
                                          status: 'active',
                                          injuredUntil: undefined
                                        }
                                      };
                                    });
                                    import('./lib/sfx').then(({ playSound }) => playSound('powerup'));
                                    setGmMessage(`Вы успешно восстановили здоровье ${player.familiar.name}!`);
                                  }}
                                  className="w-full py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-[10px] font-bold uppercase rounded-lg cursor-pointer transition-all border border-red-400/20"
                                >
                                  ❤️ Использовать оживитель (или 50 золота)
                                </button>
                              </div>
                            ) : player.familiar.status === 'expedition' ? (
                              <div className="text-center space-y-1 py-1">
                                <p className="text-[10px] text-emerald-300 leading-relaxed font-semibold animate-pulse">
                                  🛰️ Компаньон ищет древние сокровища...
                                </p>
                                <p className="text-[9px] text-slate-400">
                                  Выполнение ваших повседневных дел ускоряет его путь на 45 минут за каждую завершенную задачу!
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-[9px] text-slate-400 leading-normal text-center">
                                  Взаимодействуйте со своим питомцем ежедневно, чтобы повышать его преданность и открывать уникальные реплики!
                                </p>
                                <div className="grid grid-cols-3 gap-1.5 pt-1">
                                  <button
                                    onClick={() => handlePetAction('pet')}
                                    disabled={player.familiar.lastPettedAt && (Date.now() - player.familiar.lastPettedAt) < 24 * 60 * 60 * 1000}
                                    className="py-1.5 px-1 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent border border-white/10 text-[9px] font-bold text-white uppercase rounded-lg text-center cursor-pointer transition-all"
                                  >
                                    🐾 Погладить (+15 XP, бесплатно)
                                  </button>
                                  <button
                                    onClick={() => handlePetAction('feed')}
                                    className="py-1.5 px-1 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-[9px] font-bold text-emerald-300 uppercase rounded-lg text-center cursor-pointer transition-all"
                                  >
                                    🥩 Кормить (+40 XP, корм/30з)
                                  </button>
                                  <button
                                    onClick={() => handlePetAction('train')}
                                    className="py-1.5 px-1 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-[9px] font-bold text-blue-300 uppercase rounded-lg text-center cursor-pointer transition-all"
                                  >
                                    ⚔️ Учить (+60 XP, 40 золота)
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="w-full mt-2 py-2 px-3 text-center bg-black/40 rounded-lg text-[9px] leading-relaxed text-slate-400 border border-white/5">
                            {player.familiar.stage === 'baby' ? (
                              <>Ваш юный компаньон постепенно крепнет благодаря вашим успехам. <strong className="text-blue-400">На 10 уровне</strong> он эволюционирует во взрослого спутника.</>
                            ) : player.familiar.stage === 'evolved' ? (
                              <>Питомец познал дикие пустоши и обрел могущество. <strong className="text-purple-400">На 25 уровне</strong> он достигнет своей совершенной, легендарной формы!</>
                            ) : player.familiar.stage === 'egg' ? (
                              <>Достижение 100% согрева позволит вашему будущему союзнику вылупиться!</>
                            ) : (
                              <>Легендарное создание, внушающее трепет врагам. Ваш компаньон достиг вершины эволюции и теперь является хранителем вашей судьбы!</>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                      <span>Опыт</span>
                      <span>{player.xp} / {getXpRequirement(player.level)}</span>
                    </div>
                    <div className="h-2 bg-[#0B0E14] rounded-full overflow-hidden shadow-inner border border-white/5 relative">
                      <motion.div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 relative"
                        initial={{ width: `${(player.xp / getXpRequirement(player.level)) * 100}%` }}
                        animate={{ width: `${(player.xp / getXpRequirement(player.level)) * 100}%` }}
                        transition={{ type: 'spring', bounce: 0 }}
                      >
                        <div className="absolute right-0 top-0 bottom-0 w-2 bg-white opacity-50 blur-[2px]"></div>
                      </motion.div>
                    </div>
                  </div>

                  <div className="mt-6 text-left">
                    <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                      <Target size={16} className="text-amber-400" />
                      Баланс характеристик
                    </h3>
                    <div className="p-4 bg-[#0B0E14] border border-white/5 rounded-xl h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="55%" data={[
                          { subject: 'Сила', A: getTotalStatXp(player.stats.strength.level, player.stats.strength.xp) },
                          { subject: 'Интеллект', A: getTotalStatXp(player.stats.intelligence.level, player.stats.intelligence.xp) },
                          { subject: 'Харизма', A: getTotalStatXp(player.stats.charisma.level, player.stats.charisma.xp) },
                          { subject: 'Воля', A: getTotalStatXp(player.stats.willpower.level, player.stats.willpower.xp) },
                        ]}>
                          <PolarGrid stroke="rgba(255,255,255,0.1)" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#8A8D93', fontSize: 12 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                          <Radar name="Герой" dataKey="A" stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.3} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-200 px-2 mt-2">Характеристики</h3>
                <div className="grid gap-3">
                  {Object.entries(STATS).map(([key, data]) => {
                    if (key === 'unknown') return null;
                    const stat = player.stats[key as StatType];
                    const Icon = data.icon;
                    const req = getStatXpRequirement(stat.level);
                    return (
                      <div key={key} className="glass-card p-4">
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg bg-[#0B0E14] border border-white/5 ${data.color}`}>
                              <Icon size={18} />
                            </div>
                            <span className="font-medium text-slate-200">{data.name}</span>
                          </div>
                          <span className="text-sm font-bold text-slate-300">Ур. {stat.level}</span>
                        </div>
                        <div className="h-2 bg-[#0B0E14] rounded-full overflow-hidden shadow-inner border border-white/5 relative">
                          <motion.div
                            className={`h-full ${data.bg} relative`}
                            initial={{ width: `${(stat.xp / req) * 100}%` }}
                            animate={{ width: `${(stat.xp / req) * 100}%` }}
                          >
                            <div className="absolute right-0 top-0 bottom-0 w-2 bg-white opacity-50 blur-[2px]"></div>
                          </motion.div>
                        </div>
                        <div className="text-right mt-1.5 text-xs font-medium text-slate-500">
                          {stat.xp} / {req} XP
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Trophy Hall */}
                <h3 className="text-lg font-bold text-slate-200 px-2 mt-8 flex items-center gap-2 lore-text">
                  <Trophy size={20} className="text-amber-400" />
                  Зал трофеев
                </h3>
                {player.inventory.length === 0 ? (
                  <div className="glass-card p-6 text-center">
                    <p className="text-slate-500 text-sm lore-text">У вас пока нет трофеев. Побеждайте боссов, чтобы получать награды!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-3">
                    {player.inventory.map((trophy, idx) => (
                      <button
                        key={`${trophy.id}-${idx}`}
                        onClick={() => setSelectedTrophy(trophy)}
                        className="aspect-square glass-card flex items-center justify-center text-3xl hover:bg-white/5 transition-colors relative group overflow-hidden"
                      >
                        {trophy.imageUrl ? (
                          <img src={trophy.imageUrl} alt={trophy.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          trophy.icon
                        )}
                        <div className="absolute inset-0 bg-amber-400/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {activeTab === 'city' && (
            <div className="relative w-full h-full overflow-hidden">
              {/* Background Map */}
              <div 
                className="absolute inset-0 bg-cover bg-center bg-[#0B0E14]"
                style={{ 
                  backgroundImage: gameState.chronicle?.season_info?.city_background_url 
                    ? `url(${gameState.chronicle.season_info.city_background_url})` 
                    : `linear-gradient(to bottom, #1a1c29, #0f111a)` 
                }}
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-[#0B0E14]/60 backdrop-blur-[2px]" />
              
              {/* Event Zones rendering */}
              {gameState.events && gameState.events.length >= 5 && (
                <div className="absolute top-4 left-0 right-0 z-[50] flex justify-center pointer-events-none">
                  <div className="bg-red-900/90 border border-red-500 shadow-[0_0_20px_rgba(220,38,38,0.8)] text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2">
                    <Flame size={16} className="text-red-400" />
                    Осада Города
                  </div>
                </div>
              )}

              <AnimatePresence>
                {gameState.events?.map((event, idx) => {
                  const P = [
                    { t: '15%', l: '15%' }, { t: '15%', l: '85%' }, { t: '85%', l: '15%' }, { t: '85%', l: '85%' },
                    { t: '25%', l: '15%' }, { t: '60%', l: '80%' }, { t: '40%', l: '45%' }, { t: '70%', l: '50%' },
                    { t: '45%', l: '10%' }, { t: '20%', l: '50%' }
                  ];
                  const pos = P[event.zoneIndex % 10];
                  return (
                    <motion.button
                      key={`${event.id}-${idx}`}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      onClick={() => setActiveEvent(event)}
                      className="absolute z-[40] w-12 h-12 -ml-6 -mt-6 rounded-full flex flex-col items-center justify-center animate-pulse"
                      style={{ top: pos.t, left: pos.l }}
                    >
                      <div className="w-8 h-8 rounded-full bg-red-900/80 border-2 border-red-500 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.6)] font-black text-xl text-red-100">
                        !
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>

              {/* City Nodes */}
              <div className="absolute flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2 opacity-100 transition-opacity" style={{ top: '70%', left: '30%', opacity: (gameState.events && gameState.events.length >= 5) ? 0.3 : 1, pointerEvents: (gameState.events && gameState.events.length >= 5) ? 'none' : 'auto' }}>
                <button onClick={() => setShowShopNode(true)} className="w-14 h-14 rounded-full bg-black/80 backdrop-blur-md border-[2px] border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.4)] flex items-center justify-center mb-1 animate-[pulse_2s_ease-in-out_infinite] z-10 transition-transform active:scale-95">
                   <Skull className="text-purple-400" size={24} />
                </button>
                <div className="flex flex-col items-center bg-black/60 px-3 py-1 rounded-lg border border-purple-500/30 relative z-10">
                  <span className="text-[11px] font-serif uppercase tracking-widest text-[#E2E8F0] drop-shadow-md whitespace-nowrap">
                    {gameState.chronicle?.season_info?.npcs?.shop?.name || "Теневой Рынок"}
                  </span>
                  {gameState.chronicle?.season_info?.npcs?.shop?.name && gameState.chronicle?.season_info?.npcs?.shop?.name !== "Теневой Рынок" && (
                    <span className="text-[8px] font-sans font-medium text-purple-400/80 uppercase tracking-wider drop-shadow-md whitespace-nowrap mt-0.5">
                      Теневой Рынок
                    </span>
                  )}
                </div>
              </div>

              <div className="absolute flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2 opacity-100 transition-opacity" style={{ top: '65%', left: '75%', opacity: (gameState.events && gameState.events.length >= 5) ? 0.3 : 1, pointerEvents: (gameState.events && gameState.events.length >= 5) ? 'none' : 'auto' }}>
                <button onClick={() => setShowExpeditionNode(true)} className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-md border-[2px] border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)] flex items-center justify-center mb-1 z-10 transition-transform active:scale-95 hover:bg-blue-500/20">
                   <Compass className="text-blue-400" size={24} />
                </button>
                <div className="flex flex-col items-center bg-black/60 px-3 py-1 rounded-lg border border-white/10 relative z-10">
                  <span className="text-[11px] font-serif uppercase tracking-widest text-[#E2E8F0] drop-shadow-md whitespace-nowrap">
                    {gameState.chronicle?.season_info?.npcs?.expedition?.name || "Экспедиции"}
                  </span>
                  {gameState.chronicle?.season_info?.npcs?.expedition?.name && gameState.chronicle?.season_info?.npcs?.expedition?.name !== "Экспедиции" && (
                    <span className="text-[8px] font-sans font-medium text-blue-400/80 uppercase tracking-wider drop-shadow-md whitespace-nowrap mt-0.5">
                      Гильдия Питомцев
                    </span>
                  )}
                </div>
              </div>

              <div className="absolute flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2 opacity-100 transition-opacity" style={{ top: '30%', left: '60%', opacity: (gameState.events && gameState.events.length >= 5) ? 0.3 : 1, pointerEvents: (gameState.events && gameState.events.length >= 5) ? 'none' : 'auto' }}>
                <button onClick={() => setShowFortuneTellerNode(true)} className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-md border-[2px] border-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.6)] flex items-center justify-center mb-1 animate-[pulse_3s_ease-in-out_infinite] z-10 transition-transform active:scale-95">
                   <Eye className="text-fuchsia-400" size={24} />
                </button>
                <div className="flex flex-col items-center bg-black/60 px-3 py-1 rounded-lg border border-white/10 relative z-10">
                  <span className="text-[11px] font-serif uppercase tracking-widest text-[#E2E8F0] drop-shadow-md whitespace-nowrap">
                    {gameState.chronicle?.season_info?.npcs?.fortune?.name || "Слепая Гадалка"}
                  </span>
                  {gameState.chronicle?.season_info?.npcs?.fortune?.name && gameState.chronicle?.season_info?.npcs?.fortune?.name !== "Слепая Гадалка" && (
                    <span className="text-[8px] font-sans font-medium text-fuchsia-400/80 uppercase tracking-wider drop-shadow-md whitespace-nowrap mt-0.5">
                      Слепая Гадалка
                    </span>
                  )}
                </div>
              </div>

              <div className="absolute flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2 opacity-100 transition-opacity" style={{ top: '15%', left: '50%', opacity: (gameState.events && gameState.events.length >= 5) ? 0.3 : 1, pointerEvents: (gameState.events && gameState.events.length >= 5) ? 'none' : 'auto' }}>
                <button onClick={() => setShowAltarNode(true)} className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-md border-[2px] border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.6)] flex items-center justify-center mb-1 animate-[pulse_4s_ease-in-out_infinite] z-10 transition-transform active:scale-95">
                   <Flame className="text-rose-400" size={24} />
                </button>
                <div className="flex flex-col items-center bg-black/60 px-3 py-1 rounded-lg border border-white/10 relative z-10">
                  <span className="text-[11px] font-serif uppercase tracking-widest text-[#E2E8F0] drop-shadow-md whitespace-nowrap">
                    {gameState.chronicle?.season_info?.npcs?.altar?.name || "Алтарь Клятв"}
                  </span>
                  {gameState.chronicle?.season_info?.npcs?.altar?.name && gameState.chronicle?.season_info?.npcs?.altar?.name !== "Алтарь Клятв" && (
                    <span className="text-[8px] font-sans font-medium text-rose-400/80 uppercase tracking-wider drop-shadow-md whitespace-nowrap mt-0.5">
                      Алтарь Клятв
                    </span>
                  )}
                </div>
              </div>

              <div className="absolute flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2 opacity-100 transition-opacity" style={{ top: '50%', left: '20%', opacity: (gameState.events && gameState.events.length >= 5) ? 0.3 : 1, pointerEvents: (gameState.events && gameState.events.length >= 5) ? 'none' : 'auto' }}>
                <button onClick={() => setShowBeastNode(true)} className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-md border-[2px] border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)] flex items-center justify-center mb-1 animate-[pulse_2.5s_ease-in-out_infinite] z-10 transition-transform active:scale-95">
                   <Dna className="text-emerald-400" size={24} />
                </button>
                <div className="flex flex-col items-center bg-black/60 px-3 py-1 rounded-lg border border-white/10 relative z-10">
                  <span className="text-[11px] font-serif uppercase tracking-widest text-[#E2E8F0] drop-shadow-md whitespace-nowrap">
                    {gameState.chronicle?.season_info?.npcs?.beast?.name || "Торговка Зверьем"}
                  </span>
                  {gameState.chronicle?.season_info?.npcs?.beast?.name && gameState.chronicle?.season_info?.npcs?.beast?.name !== "Торговка Зверьем" && (
                    <span className="text-[8px] font-sans font-medium text-emerald-400/80 uppercase tracking-wider drop-shadow-md whitespace-nowrap mt-0.5">
                      Торговка Зверьем
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Bottom Navigation */}
        <nav className="shrink-0 w-full bg-[#0B0E14]/90 backdrop-blur-lg border-t border-white/5 z-50 overflow-hidden" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}>
          <div className="flex justify-around items-center h-14 sm:h-16 px-2 mt-1">
            <button
              onClick={() => setActiveTab('quests')}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                activeTab === 'quests' ? (campaign ? THEME_COLORS[campaign.colorTheme || 'slate'].text : 'text-amber-400') : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              <Target size={20} className={activeTab === 'quests' ? (campaign ? THEME_COLORS[campaign.colorTheme || 'slate'].dropShadow : 'drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]') : ''} />
              <span className="text-[10px] font-medium">Квесты</span>
            </button>
            <button
              onClick={() => setActiveTab('boss')}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                activeTab === 'boss' ? (campaign ? THEME_COLORS[campaign.colorTheme || 'slate'].text : 'text-rose-400') : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              <Skull size={20} className={activeTab === 'boss' ? (campaign ? THEME_COLORS[campaign.colorTheme || 'slate'].dropShadow : 'drop-shadow-[0_0_8px_rgba(251,113,133,0.5)]') : ''} />
              <span className="text-[10px] font-medium">Босс</span>
            </button>
            <button
              onClick={() => setActiveTab('city')}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                activeTab === 'city' ? 'text-amber-400' : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              <Tent size={20} className={activeTab === 'city' ? 'drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : ''} />
              <span className="text-[10px] font-medium">Город</span>
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                activeTab === 'profile' ? (campaign ? THEME_COLORS[campaign.colorTheme || 'slate'].text : 'text-blue-400') : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              <User size={20} className={activeTab === 'profile' ? (campaign ? THEME_COLORS[campaign.colorTheme || 'slate'].dropShadow : 'drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]') : ''} />
              <span className="text-[10px] font-medium">Профиль</span>
            </button>
          </div>
        </nav>
      </motion.div>
      <AnimatePresence>
        <NPCModal
          isOpen={showExpeditionNode}
          onClose={() => setShowExpeditionNode(false)}
          npcId="expedition"
          fallbackName="Гильдия Питомцев"
          overrideName="ГИЛЬДИЯ ПИТОМЦЕВ"
          fallbackQuote="Отправь своего зверя в дикие земли. Но помни: чем больше ты тренируешься сегодня, тем выше его шансы выжить."
          themeColor="blue"
          gameState={gameState}
          leftAlignHeader={true}
        >
          <div className="flex items-center justify-center gap-3 w-[70%] md:w-[60%] mx-auto mb-8 mt-4">
            <div className="flex-1 h-[1px] bg-blue-500/20 text-center"></div>
            <span className="text-[10px] text-blue-500/60 font-serif">♦</span>
            <span className="text-[10px] font-serif uppercase tracking-[3px] text-blue-500 whitespace-nowrap">Опасные Земли</span>
            <span className="text-[10px] text-blue-500/60 font-serif">♦</span>
            <div className="flex-1 h-[1px] bg-blue-500/20"></div>
          </div>

          <div className="px-6 pb-10 w-full max-w-sm mx-auto">
            {!player.familiar || player.familiar.stage === 'egg' ? (
              <div className="p-6 bg-black/40 backdrop-blur-md border border-blue-500/20 rounded-xl text-center shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
                <p className="text-blue-400/50 text-sm italic font-serif">Вырасти зверя, прежде чем отправлять его в дикие земли.</p>
              </div>
            ) : player.familiar.status === 'injured' ? (
              <div className="p-6 bg-red-950/20 backdrop-blur-md border border-red-500/30 rounded-xl text-center shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
                <p className="text-red-400 text-sm italic font-serif">Твой питомец тяжело ранен. Единение с природой подождет. Отнеси его к Торговке Зверьем за Кормом.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {player.familiar.status === 'expedition' ? (
                  <div className="p-6 bg-blue-900/20 backdrop-blur-md border border-blue-500/30 rounded-xl text-center shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
                    <p className="text-blue-300 text-sm italic font-serif">Питомец исследует дикие пустоши. Возвращение ожидается через некоторое время...</p>
                    {player.familiar.expeditionEndsAt && (
                      <p className="text-[10px] text-blue-400/60 mt-3 font-sans tracking-widest uppercase">
                        В пути: {Math.max(0, Math.ceil((player.familiar.expeditionEndsAt - Date.now()) / (60 * 1000)))} минут
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="p-5 bg-black/40 backdrop-blur-md border border-blue-500/20 rounded-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl bg-blue-900/30 border border-blue-500/20 flex items-center justify-center shadow-inner shrink-0 relative overflow-hidden">
                          {player.familiar.imageUrl ? (
                            <img src={player.familiar.imageUrl} alt={player.familiar.name} className="absolute inset-0 w-full h-full object-cover" />
                          ) : (
                            <span className="text-3xl filter drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]">🐾</span>
                          )}
                        </div>
                        <div>
                          <h4 className="text-lg font-normal text-slate-100 font-serif tracking-wider">{player.familiar.name} <span className="text-xs text-blue-500/80 font-sans tracking-normal uppercase">({player.familiar.type})</span></h4>
                          <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed font-sans">
                            Шанс выживания: <strong className="text-blue-300 font-sans">{Math.round(Math.min(0.2 + (player.dailyTasksCompleted || 0) * 0.2, 0.95) * 100)}%</strong>. <br/>
                            <span className="text-[10px] text-slate-500 font-sans">Закрывайте реальные дела, чтобы прибавить <strong className="text-emerald-400 font-sans">+20%</strong> за каждую решенную задачу сегодня!</span>
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => {
                        setPlayer(prev => ({
                          ...prev,
                          familiar: { ...prev.familiar!, status: 'expedition', expeditionEndsAt: Date.now() + 4 * 60 * 60 * 1000 }
                        }));
                        setGmMessage('Питомец отправился в экспедицию. Он вернется через 4 часа с добычей... или ранениями.');
                        import('./lib/sfx').then(({ playSound }) => playSound('powerup'));
                        setShowExpeditionNode(false);
                      }}
                      className="w-full py-4 bg-transparent hover:bg-blue-500/5 text-blue-400 border border-blue-500/40 rounded-xl text-xs uppercase tracking-[3px] font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      Отправить в Пустоши
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </NPCModal>
      </AnimatePresence>

      <AnimatePresence>
        <NPCModal
          isOpen={showShopNode}
          onClose={() => setShowShopNode(false)}
          npcId="shop"
          fallbackName="Теневой Рынок"
          overrideName="ТЕНЕВОЙ РЫНОК"
          fallbackQuote="Скрытые товары для тех, кто не задает лишних вопросов."
          themeColor="purple"
          gameState={gameState}
          leftAlignHeader={true}
        >
          {/* Player Gold Header */}
          <div className="absolute top-24 right-6 sm:top-20 z-30">
            <div className="bg-[rgba(30,20,40,0.6)] backdrop-blur-lg px-4 py-2 rounded-2xl border border-purple-500/20 flex items-center gap-2 shadow-[0_4px_15px_rgba(0,0,0,0.4)]">
              <span className="text-purple-100 font-bold tracking-[0.1em] font-serif">{player.gold}</span>
              <Coins className="text-purple-400 filter drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]" size={16} />
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 w-[70%] md:w-[60%] mx-auto mb-8 mt-4">
            <div className="flex-1 h-[1px] bg-purple-500/20 text-center"></div>
            <span className="text-[10px] text-purple-500/60 font-serif">♦</span>
            <span className="text-[10px] font-serif uppercase tracking-[3px] text-purple-500 whitespace-nowrap">Мои товары</span>
            <span className="text-[10px] text-purple-500/60 font-serif">♦</span>
            <div className="flex-1 h-[1px] bg-purple-500/20"></div>
          </div>

          {/* Items List */}
          <div className="flex flex-col gap-5 pb-10 px-6 w-full max-w-sm mx-auto">
            {gameState.shopItems.length === 0 ? (
              <div className="p-6 bg-black/40 backdrop-blur-md border border-purple-500/20 rounded-xl text-center shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
                <p className="text-purple-400/50 text-sm italic font-serif">Товар распродан. Возвращайтесь завтра.</p>
              </div>
            ) : (
              gameState.shopItems.map((item, index) => (
                <div key={`shop-${index}`} className="relative p-5 bg-black/40 backdrop-blur-md border border-purple-500/20 rounded-xl flex gap-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] transition-all duration-300 hover:border-purple-500/40 group overflow-hidden">
                  <div className={`w-14 h-14 shrink-0 rounded-xl overflow-hidden relative flex items-center justify-center shadow-inner ${
                    item.rarity === 'gold' ? 'bg-amber-900/30 border border-amber-500/20 text-amber-400' :
                    item.rarity === 'purple' ? 'bg-purple-900/30 border border-purple-500/20 text-purple-400' :
                    item.rarity === 'blue' ? 'bg-blue-900/30 border border-blue-500/20 text-blue-400' :
                    'bg-slate-900/30 border border-slate-500/20 text-slate-400'
                  }`}>
                    <span className="filter drop-shadow-[0_0_8px_rgba(168,85,247,0.5)] group-hover:scale-110 transition-transform duration-300">
                      {item.effect.type === 'pet_revive' ? <Heart size={28} /> :
                       item.effect.type === 'damage_boss' ? <Sword size={28} /> :
                       item.effect.type === 'pet_food' ? <span className="text-3xl drop-shadow-md">🍖</span> :
                       item.effect.type === 'stat_xp' ? <Flame size={28} /> :
                       <Zap size={28} />}
                    </span>
                  </div>
                  
                  <div className="flex flex-col flex-1 min-w-0">
                    <h4 className={`text-base font-normal font-serif tracking-wider truncate mt-0.5 ${
                      item.rarity === 'gold' ? 'text-amber-200' :
                      item.rarity === 'purple' ? 'text-purple-200' :
                      item.rarity === 'blue' ? 'text-blue-200' :
                      'text-slate-200'
                    }`}>{item.name}</h4>
                    <p className="text-[11px] text-slate-400/80 mt-1 leading-relaxed italic font-serif opacity-80 overflow-hidden line-clamp-2">{item.lore}</p>
                    
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <div className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded-full flex items-center gap-1">
                        <span className="text-purple-400 font-light text-[11px] tracking-tighter">{item.price}</span>
                        <Coins size={10} className="text-purple-500" />
                      </div>

                      <button
                        onClick={() => {
                          if (player.gold >= item.price) {
                            setPlayer(prev => ({ ...prev, gold: prev.gold - item.price }));
                            // Apply effect
                            if (item.effect.type === 'damage_boss') {
                              setPlayer(prev => ({
                                ...prev,
                                pendingDamage: {
                                  ...prev.pendingDamage,
                                  strength: prev.pendingDamage.strength + item.effect.value
                                }
                              }));
                            } else if (item.effect.type === 'player_xp') {
                              setPlayer(prev => ({ ...prev, xp: prev.xp + item.effect.value }));
                            } else if (item.effect.type === 'pet_food') {
                              feedFamiliar(item.effect.value);
                            } else if (item.effect.type === 'pet_revive') {
                              setPlayer(prev => prev.familiar ? { ...prev, familiar: { ...prev.familiar, status: 'active', injuredUntil: undefined } } : prev);
                            } else if (item.effect.type === 'stat_xp') {
                              if (item.effect.targetStat) {
                                const targetStat = item.effect.targetStat;
                                setPlayer(prev => ({
                                  ...prev,
                                  stats: {
                                    ...prev.stats,
                                    [targetStat]: { ...prev.stats[targetStat], xp: prev.stats[targetStat].xp + item.effect.value }
                                  }
                                }));
                              }
                            }
                            // Remove item from shop
                            setGameState(prev => ({
                              ...prev,
                              shopItems: prev.shopItems.filter((_, i) => i !== index)
                            }));
                            import('./lib/sfx').then(({ playSound }) => playSound('coin'));
                          }
                        }}
                        disabled={player.gold < item.price}
                        className="px-4 py-1.5 bg-transparent hover:bg-purple-500/10 text-purple-400 disabled:opacity-20 border border-purple-500/40 rounded-[8px] text-[10px] uppercase tracking-[2px] transition-all active:scale-[0.98]"
                      >
                        Купить
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </NPCModal>

        <NPCModal
          isOpen={showFortuneTellerNode}
          onClose={() => setShowFortuneTellerNode(false)}
          npcId="fortune"
          fallbackName="Слепая Гадалка"
          overrideName="СЛЕПАЯ ГАДАЛКА"
          fallbackQuote="Я не вижу лиц, но вижу судьбы. За золотую монету я покажу тебе путь в тумане."
          themeColor="fuchsia"
          gameState={gameState}
          leftAlignHeader={true}
        >
          {/* Player Gold Header */}
          <div className="absolute top-24 right-6 sm:top-20 z-30">
            <div className="bg-[rgba(40,20,40,0.6)] backdrop-blur-lg px-4 py-2 rounded-2xl border border-fuchsia-500/20 flex items-center gap-2 shadow-[0_4px_15px_rgba(0,0,0,0.4)]">
              <span className="text-fuchsia-100 font-bold tracking-[0.1em] font-serif">{player.gold}</span>
              <Coins className="text-fuchsia-400 filter drop-shadow-[0_0_5px_rgba(217,70,239,0.5)]" size={16} />
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 w-[70%] md:w-[60%] mx-auto mb-8 mt-4">
            <div className="flex-1 h-[1px] bg-fuchsia-500/20 text-center"></div>
            <span className="text-[10px] text-fuchsia-500/60 font-serif">♦</span>
            <span className="text-[10px] font-serif uppercase tracking-[3px] text-fuchsia-500 whitespace-nowrap">Ритуал Прозрения</span>
            <span className="text-[10px] text-fuchsia-500/60 font-serif">♦</span>
            <div className="flex-1 h-[1px] bg-fuchsia-500/20"></div>
          </div>

          <div className="px-6 pb-10 w-full max-w-sm mx-auto">
            <div className="bg-black/40 backdrop-blur-md border border-fuchsia-500/20 rounded-xl p-6 text-left shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-4 mb-4">
                 <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden relative flex items-center justify-center shadow-inner bg-fuchsia-900/30 border border-fuchsia-500/20">
                    <span className="text-3xl filter drop-shadow-[0_0_8px_rgba(217,70,239,0.5)]">👁️</span>
                 </div>
                 <div>
                   <h4 className="text-lg font-normal text-fuchsia-200 font-serif tracking-wider">Совет Мастера</h4>
                 </div>
              </div>
              <p className="text-[12px] text-slate-400/80 mb-6 italic leading-relaxed font-serif opacity-80">Гадалка заглянет в ваши текущие задачи и статистику, чтобы подсказать, на чем стоит сосредоточиться сегодня. Она видит то, что скрыто от ваших глаз.</p>
              
              <button
                onClick={() => {
                  if (player.gold >= 100) {
                    setPlayer(prev => ({ ...prev, gold: prev.gold - 100 }));
                    setShowFortuneTellerNode(false);
                    askMasterForAdvice();
                    import('./lib/sfx').then(({ playSound }) => playSound('powerup'));
                  } else {
                    setGmMessage("У вас нет 100 золота. Духи требуют равноценный обмен.");
                  }
                }}
                disabled={isGeneratingTasks || player.gold < 100}
                className="w-full py-4 bg-transparent hover:bg-fuchsia-500/5 text-fuchsia-400 border border-fuchsia-500/40 rounded-xl text-xs uppercase tracking-[3px] font-bold transition-all disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                {isGeneratingTasks ? <Loader2 size={18} className="animate-spin" /> : (
                  <>Получить Совет <span className="opacity-50 flex items-center ml-1 text-[10px] tracking-normal font-sans font-light">(100 <Coins size={10} className="ml-0.5" />)</span></>
                )}
              </button>
            </div>
          </div>
        </NPCModal>

        <NPCModal
          isOpen={showAltarNode}
          onClose={() => setShowAltarNode(false)}
          npcId="altar"
          fallbackName="Алтарь Клятв"
          overrideName="АЛТАРЬ КЛЯТВ"
          fallbackQuote="Слова — ветер, но клятва крови вечна. Чего ты желаешь достичь?"
          themeColor="rose"
          gameState={gameState}
          leftAlignHeader={true}
        >
          <div className="flex items-center justify-center gap-3 w-[70%] md:w-[60%] mx-auto mb-8 mt-4">
            <div className="flex-1 h-[1px] bg-rose-500/20 text-center"></div>
            <span className="text-[10px] text-rose-500/60 font-serif">♦</span>
            <span className="text-[10px] font-serif uppercase tracking-[3px] text-rose-500 whitespace-nowrap">Кровавый Договор</span>
            <span className="text-[10px] text-rose-500/60 font-serif">♦</span>
            <div className="flex-1 h-[1px] bg-rose-500/20"></div>
          </div>

          <div className="px-6 pb-10 w-full max-w-sm mx-auto">
            {!gameState.altarTask || gameState.altarTask.status !== 'active' ? (
              <div className="space-y-4">
                <p className="text-slate-400/80 text-[12px] leading-relaxed italic font-serif opacity-80 border border-rose-500/20 bg-black/40 backdrop-blur-md p-4 rounded-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
                  «Поклянись завершить великое дело до конца недели. Если страж сочтет задачу достойной, ты получишь могущественное благословение. Осторожно: нарушишь клятву, наказание будет жестоким.»
                </p>
                
                <textarea
                  value={oathInput}
                  onChange={(e) => setOathInput(e.target.value)}
                  placeholder="Я клянусь..."
                  className="w-full bg-black/40 backdrop-blur-md border border-rose-500/30 rounded-xl p-4 text-slate-200 placeholder-rose-900/50 focus:outline-none focus:border-rose-400 focus:shadow-[0_0_15px_rgba(244,63,94,0.3)] resize-none h-28 text-sm transition-all shadow-inner font-serif"
                />

                <button 
                  onClick={async () => {
                    if (!oathInput.trim() || !effectiveApiKey) {
                      setGmMessage(effectiveApiKey ? "Клятва не может быть пустой." : "Для работы Вратника нужен API ключ.");
                      return;
                    }
                    setIsEvaluatingOath(true);
                    try {
                      const { evaluateOathWithAI } = await import('./lib/ai');
                      const result = await evaluateOathWithAI(effectiveApiKey, effectiveAiBaseUrl, effectiveAiModel, oathInput);
                      setGmMessage(result.gatekeeperMessage);
                      if (result.accepted) {
                        setGameState(prev => ({
                          ...prev,
                          altarTask: {
                            id: crypto.randomUUID(),
                            description: oathInput,
                            rewardType: result.rewardType,
                            rewardValue: result.rewardValue,
                            deadline: Date.now() + 7 * 24 * 60 * 60 * 1000,
                            status: 'active'
                          }
                        }));
                        setShowAltarNode(false);
                        setOathInput('');
                        import('./lib/sfx').then(({ playSound }) => playSound('powerup'));
                      }
                    } catch (e) {
                      setGmMessage("Врата не отвечают. Попробуйте позже.");
                      console.error(e);
                    } finally {
                      setIsEvaluatingOath(false);
                    }
                  }}
                  disabled={isEvaluatingOath || !oathInput.trim()}
                  className="w-full py-4 bg-transparent hover:bg-rose-500/5 text-rose-400 border border-rose-500/40 rounded-xl text-xs uppercase tracking-[3px] font-bold transition-all disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {isEvaluatingOath ? <Loader2 size={18} className="animate-spin" /> : <><Flame size={16} /> Принести Клятву</>}
                </button>
              </div>
            ) : (
              <div className="bg-black/40 backdrop-blur-md border border-rose-500/20 p-5 rounded-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
                <div className="flex flex-col gap-4">
                  <h4 className="text-rose-400 font-normal font-serif tracking-wider flex items-center gap-2 text-lg">
                    <Shield size={18} className="text-rose-500" /> Текущая Клятва
                  </h4>
                  <p className="text-sm font-serif text-slate-200/90 leading-relaxed italic border border-rose-500/10 bg-rose-950/20 p-3 rounded-lg line-clamp-4">
                    «{gameState.altarTask.description}»
                  </p>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        import('./lib/sfx').then(({ playSound }) => playSound('powerup'));
                        setPlayer(prev => ({
                          ...prev,
                          gold: gameState.altarTask!.rewardType === 'gold' ? prev.gold + (gameState.altarTask!.rewardValue as number) : prev.gold,
                          xp: gameState.altarTask!.rewardType === 'xp' ? prev.xp + (gameState.altarTask!.rewardValue as number) : prev.xp
                        }));
                        setGameState(prev => ({
                          ...prev,
                          altarTask: { ...prev.altarTask!, status: 'completed' }
                        }));
                        setGmMessage("Ты исполнил клятву. Награда твоя.");
                        setShowAltarNode(false);
                      }}
                      className="flex-1 py-3 bg-transparent hover:bg-emerald-500/5 text-emerald-400 rounded-xl text-[10px] uppercase tracking-widest font-bold border border-emerald-500/40 transition-all active:scale-[0.98] flex flex-col items-center justify-center gap-1"
                    >
                      <CheckCircle size={14} className="mb-0.5" />
                      Исполнено
                    </button>
                    <button 
                      onClick={() => {
                        import('./lib/sfx').then(({ playSound }) => playSound('error'));
                        setPlayer(prev => ({ ...prev, xp: Math.max(0, prev.xp - 100), gold: Math.max(0, prev.gold - 50) }));
                        setGameState(prev => ({ ...prev, altarTask: { ...prev.altarTask!, status: 'failed' } }));
                        setGmMessage("Клятва нарушена... Боги проклинают тебя (-100 XP, -50 Золота)");
                        setShowAltarNode(false);
                      }}
                      className="flex-1 py-3 bg-transparent hover:bg-rose-500/5 text-rose-400 rounded-xl text-[10px] uppercase tracking-widest font-bold border border-rose-500/40 transition-all active:scale-[0.98] flex flex-col items-center justify-center gap-1"
                    >
                      <X size={14} className="mb-0.5" />
                      Провалено
                    </button>
                  </div>
                  <p className="text-[10px] text-center text-slate-500 mt-2 opacity-80 flex items-center justify-center gap-1 uppercase tracking-widest font-serif">
                    <Clock size={10} /> 
                    Осталось дней: {Math.ceil((gameState.altarTask.deadline - Date.now()) / (1000 * 60 * 60 * 24))}
                  </p>
                </div>
              </div>
            )}
          </div>
        </NPCModal>

        <NPCModal
          isOpen={showBeastNode}
          onClose={() => setShowBeastNode(false)}
          npcId="beast"
          fallbackName="Торговка Зверьем"
          overrideName="ТОРГОВКА ЗВЕРЬЕМ"
          fallbackQuote="Тебе нужен верный спутник? Или еда для него? У меня есть все."
          themeColor="emerald"
          gameState={gameState}
          leftAlignHeader={true}
        >
          {/* Player Gold Header */}
          <div className="absolute top-24 right-6 sm:top-20 z-30">
            <div className="bg-[rgba(20,30,25,0.6)] backdrop-blur-lg px-4 py-2 rounded-2xl border border-emerald-500/20 flex items-center gap-2 shadow-[0_4px_15px_rgba(0,0,0,0.4)]">
              <span className="text-emerald-100 font-bold tracking-[0.1em] font-serif">{player.gold}</span>
              <Coins className="text-emerald-400 filter drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]" size={16} />
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 w-[70%] md:w-[60%] mx-auto mb-8 mt-4">
            <div className="flex-1 h-[1px] bg-emerald-500/20 text-center"></div>
            <span className="text-[10px] text-emerald-500/60 font-serif">♦</span>
            <span className="text-[10px] font-serif uppercase tracking-[3px] text-emerald-500 whitespace-nowrap">Мои товары</span>
            <span className="text-[10px] text-emerald-500/60 font-serif">♦</span>
            <div className="flex-1 h-[1px] bg-emerald-500/20"></div>
          </div>

          <div className="flex flex-col gap-5 pb-10 px-1 w-full max-w-sm mx-auto">
            {/* Egg Item */}
            <div className="relative p-5 bg-black/40 backdrop-blur-md border border-emerald-500/20 rounded-xl flex gap-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] transition-all duration-500 hover:border-emerald-500/40 group overflow-hidden">
               <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-emerald-900/30 border border-emerald-500/20 relative flex items-center justify-center shadow-inner">
                <span className="text-3xl filter drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] group-hover:scale-110 transition-transform duration-300">🥚</span>
              </div>
              
              <div className="flex flex-col flex-1 min-w-0">
                <h4 className="text-lg font-normal text-slate-100 font-serif tracking-wider">Таинственное Яйцо</h4>
                <p className="text-[12px] text-slate-400/80 mt-1 leading-relaxed italic font-serif">Случайный питомец из древних преданий. Предыдущий исчезнет навеки.</p>
                <div className="mt-auto flex items-center justify-between pt-4">
                   <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-1.5">
                    <span className="text-emerald-400 font-light text-xs tracking-tighter">200</span>
                    <Coins size={12} className="text-emerald-500" />
                  </div>
                  
                  <button 
                    onClick={() => {
                      if (player.gold >= 200) {
                        const types = ['Дракон', 'Волк', 'Грифон', 'Феникс', 'Слайм', 'Фея', 'Энт', 'Василиск'];
                        const type = types[Math.floor(Math.random() * types.length)];
                        const rarityRoll = Math.random();
                        let rarity: 'common' | 'rare' | 'epic' | 'legendary' = 'common';
                        if (rarityRoll > 0.95) rarity = 'legendary';
                        else if (rarityRoll > 0.8) rarity = 'epic';
                        else if (rarityRoll > 0.5) rarity = 'rare';

                        const newPet: Familiar = {
                          name: `Яйцо (${type})`,
                          type,
                          rarity,
                          stage: 'egg',
                          status: 'active',
                          xp: 0,
                          level: 1
                        };
                        setPlayer(prev => ({ ...prev, gold: prev.gold - 200, familiar: newPet }));
                        import('./lib/sfx').then(({ playSound }) => playSound('coin'));
                        setShowBeastNode(false);
                      }
                    }}
                    disabled={player.gold < 200}
                    className="px-6 py-1.5 bg-transparent hover:bg-emerald-500/5 text-emerald-500 disabled:opacity-20 border border-emerald-500/40 rounded-[8px] text-[11px] uppercase tracking-[2px] transition-all active:scale-[0.98]"
                  >
                    Купить
                  </button>
                </div>
              </div>
            </div>

            {/* Food Item */}
            <div className="relative p-5 bg-black/40 backdrop-blur-md border border-emerald-500/20 rounded-xl flex gap-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] transition-all duration-500 hover:border-emerald-500/40 group overflow-hidden">
               <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-emerald-900/30 border border-emerald-500/20 relative flex items-center justify-center shadow-inner">
                <span className="text-3xl filter drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] group-hover:scale-110 transition-transform duration-300">🍖</span>
              </div>
              
              <div className="flex flex-col flex-1 min-w-0">
                <h4 className="text-lg font-normal text-slate-100 font-serif tracking-wider">Питательный Корм</h4>
                <p className="text-[12px] text-slate-400/80 mt-1 leading-relaxed italic font-serif">Смесь из редких трав. Исцеляет раны и возвращает силы вашему зверю.</p>
                <div className="mt-auto flex items-center justify-between pt-4">
                  <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-1.5">
                    <span className="text-emerald-400 font-light text-xs tracking-tighter">50</span>
                    <Coins size={12} className="text-emerald-500" />
                  </div>

                  <button 
                    onClick={() => {
                      if (player.gold >= 50 && player.familiar) {
                        setPlayer(prev => ({ 
                          ...prev, 
                          gold: prev.gold - 50, 
                          familiar: prev.familiar ? { ...prev.familiar, status: 'active', injuredUntil: undefined } : undefined 
                        }));
                        import('./lib/sfx').then(({ playSound }) => playSound('coin'));
                        setShowBeastNode(false);
                      }
                    }}
                    disabled={player.gold < 50 || !player.familiar || player.familiar.status !== 'injured'}
                    className="px-6 py-1.5 bg-transparent hover:bg-emerald-500/5 text-emerald-500 disabled:opacity-20 border border-emerald-500/40 rounded-[8px] text-[11px] uppercase tracking-[2px] transition-all active:scale-[0.98]"
                  >
                    Купить
                  </button>
                </div>
              </div>
            </div>
            
            <div className="pt-10 text-center flex flex-col items-center">
               <div className="flex items-center w-32 mb-6 opacity-30">
                 <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent to-emerald-500"></div>
                 <div className="mx-2 text-[8px] text-emerald-500">♦</div>
                 <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent to-emerald-500"></div>
               </div>
               <p className="text-[13px] text-slate-400 italic font-serif leading-relaxed max-w-[260px] font-light">
                 «Я забочусь о каждом существе, что попадает в мои руки. Выбирай мудро, путник, ибо связь со зверем — священна.»
               </p>
            </div>
          </div>
        </NPCModal>
      </AnimatePresence>

      <AnimatePresence>
        {activeEvent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setActiveEvent(null)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-[#1A1D24] border-2 border-red-900/50 rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.15)] overflow-hidden flex flex-col"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-rose-500 to-red-900" />
              <div className="absolute top-0 right-0 p-4">
                <button onClick={() => setActiveEvent(null)} className="text-slate-500 hover:text-slate-300">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 pb-2 text-center flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-red-950/50 border border-red-500/30 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                  <Flame size={32} className="text-red-500 animate-pulse" />
                </div>
                <h2 className="text-xl font-black text-rose-100 uppercase tracking-widest drop-shadow-md mb-2">
                  Случайное Событие
                </h2>
                <div className="w-12 h-0.5 bg-red-500/30 rounded-full mb-4" />
              </div>
              
              <div className="px-6 pb-6 space-y-4">
                <p className="text-[13px] text-slate-300 leading-relaxed font-serif italic text-center">
                  "{activeEvent.description}"
                </p>
                <div className="bg-red-950/20 border border-red-900/30 rounded-xl p-4 flex flex-col items-center text-center">
                  <span className="text-[10px] uppercase font-bold text-red-400 mb-1 tracking-wider">Ваша задача</span>
                  <p className="text-[14px] font-bold text-rose-50">
                    {activeEvent.taskPrompt}
                  </p>
                </div>
                
                <button
                  onClick={() => {
                    setPlayer(prev => ({...prev, gold: prev.gold + (activeEvent.rewardGold || 10)}));
                    setGameState(prev => ({...prev, events: prev.events?.filter(e => e.id !== activeEvent.id)}));
                    import('./lib/sfx').then(({ playSound }) => playSound('powerup'));
                    setActiveEvent(null);
                  }}
                  className="w-full py-3.5 bg-gradient-to-r from-red-900 to-rose-900 hover:from-red-800 hover:to-rose-800 text-rose-50 font-black tracking-wider uppercase text-sm rounded-xl border border-red-500/50 shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle size={18} />
                  Миссия Выполнена <span className="opacity-70">(+{activeEvent.rewardGold || 10} <Coins size={12} className="inline-block" />)</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
