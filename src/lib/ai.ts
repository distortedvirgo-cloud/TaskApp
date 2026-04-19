import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { StatType, Player, Boss } from '../App';

export const getOpenAIClient = (apiKey: string, baseUrl?: string) => {
  const isGemini = baseUrl?.includes('generativelanguage.googleapis.com');
  
  if (isGemini) {
    const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });
    
    // Return a proxy/wrapper that mocks the minimal OpenAI interface needed by this app
    return {
      chat: {
        completions: {
          create: async (params: any) => {
            const contents = params.messages.map((m: any) => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }]
            }));
            
            let systemInstruction = undefined;
            let finalContents = contents;
            if (contents.length > 0 && params.messages[0].role === 'user' && params.messages[0].content.includes('System:')) {
               // extract out of messages if needed, but our app sends system messages normally as role='system'
            }
            if (contents.length > 0 && params.messages[0].role === 'system') {
               systemInstruction = params.messages[0].content;
               finalContents = contents.slice(1);
            }

            const isJson = params.response_format?.type === 'json_object';
            
            const response = await ai.models.generateContent({
              model: params.model || 'gemini-3.1-flash-lite-preview',
              contents: finalContents,
              config: {
                systemInstruction,
                responseMimeType: isJson ? 'application/json' : undefined,
                temperature: params.temperature
              }
            });

            return {
              choices: [
                { message: { content: response.text } }
              ]
            };
          }
        }
      },
      images: {
        generate: async (params: any) => {
          const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-image-preview', // high quality image model
            contents: { parts: [{ text: params.prompt }] },
            config: {
              // @ts-ignore
              imageConfig: { aspectRatio: "1:1" }
            }
          });
          const part = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
          if (part && part.inlineData) {
             return { data: [ { b64_json: part.inlineData.data } ] };
          }
          throw new Error("Не удалось сгенерировать изображение в Gemini");
        }
      }
    } as any;
  }

  return new OpenAI({
    apiKey: apiKey || 'dummy-key',
    baseURL: baseUrl || undefined,
    dangerouslyAllowBrowser: true
  });
};

// Helper to robustly extract JSON from AI responses
function extractJSON(text: string): any {
  if (!text) throw new Error("Пустой ответ от ИИ");
  
  try {
    // Attempt direct parse first
    return JSON.parse(text);
  } catch (e) {
    // Try to extract from markdown code blocks
    const markdownMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (markdownMatch && markdownMatch[1]) {
      try {
        return JSON.parse(markdownMatch[1]);
      } catch (e2) {
        // Fallthrough
      }
    }
    
    // Try to find the first { and last }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch (e3) {
        // Fallthrough
      }
    }
    
    throw new Error("Не удалось извлечь JSON из ответа ИИ");
  }
}

export const askMasterAdvice = async (apiKey: string, baseUrl: string, model: string, chronicle: import('../App').HeroChronicle) => {
  try {
    const openai = getOpenAIClient(apiKey, baseUrl);
    const prompt = `Ты — Мастер Игры. Твоя цель: помочь герою. 
    Вот твоя память о нем (Летопись):
    Любимый стат: ${chronicle.behavior_analytics.favorite_stat}
    Слабый стат: ${chronicle.behavior_analytics.weakest_stat}
    Избегаемые задачи: ${chronicle.behavior_analytics.ignored_tasks_patterns.join(', ')}
    Недавние события: ${chronicle.recent_memory_log.join(' | ')}
    
    Игрок просит совета.
    Ограничение: Опирайся СТРОГО на предоставленные данные.
    
    Верни короткий ответ (2-3 предложения), где ты:
    1. Упоминаешь прошлый контекст (например, "Я вижу в Летописи, что вчера ты...").
    2. Даешь конкретный совет или небольшую задачу, связанную с его слабым статом или избегаемыми задачами.
    
    Пиши от лица мудрого, но строгого наставника.`;
    
    const response = await openai.chat.completions.create({
      model: model || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });
    return response.choices[0].message.content?.trim() || "Продолжай свой путь, герой. Твои деяния говорят сами за себя.";
  } catch (error) {
    console.error("[AI Advice] Error generating advice:", error);
    return "Мастер сейчас занят своими свитками. Возвращайся позже.";
  }
};

export const generatePlayerClass = async (apiKey: string, baseUrl: string, model: string, level: number, favoriteStat: string, previousClass: string) => {
  try {
    const openai = getOpenAIClient(apiKey, baseUrl);
    const prompt = `Игрок достиг ${level} уровня. Его главный стат: ${favoriteStat}. Прошлый класс: ${previousClass}. 
    Придумай короткое название нового класса (максимум 2 слова), отражающее его развитие. 
    Например: 'Ученик мага', 'Монах', 'Техномант'.
    Верни ТОЛЬКО название класса на русском языке, без кавычек и точек.`;
    
    const response = await openai.chat.completions.create({
      model: model || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });
    return response.choices[0].message.content?.trim() || previousClass;
  } catch (error) {
    console.error("[AI] Error generating player class:", error);
    return previousClass;
  }
};

export const generateFamiliar = async (
  apiKey: string, 
  baseUrl: string, 
  model: string, 
  playerClass: string, 
  stage: 'baby' | 'evolved' | 'ultra', 
  currentFamiliar?: {name: string, type: string}, 
  enableImages: boolean = true, 
  imageModel: string = "dall-e-3",
  imageApiKey?: string,
  imageBaseUrl?: string
) => {
  try {
    const openai = getOpenAIClient(apiKey, baseUrl);
    let prompt = '';
    
    if (stage === 'baby') {
      prompt = `Игрок класса "${playerClass}" заслужил фамильяра. 
      Придумай вид существа (животное, дух, механизм и т.д.) и его имя. 
      Верни ТОЛЬКО JSON в формате: {"type": "вид существа", "name": "имя существа", "imagePrompt": "A short English prompt for an AI image generator to create a portrait of this pet."}`;
    } else if (stage === 'evolved') {
      prompt = `Фамильяр игрока (вид: ${currentFamiliar?.type}, имя: ${currentFamiliar?.name}) эволюционирует. 
      Придумай ему крутую приставку или измени вид на более сильный (например, Волк -> Огненный Волк). Имя оставь прежним.
      Верни ТОЛЬКО JSON в формате: {"type": "новый вид существа", "name": "${currentFamiliar?.name}", "imagePrompt": "A short English prompt for an AI image generator to create a portrait of this evolved pet."}`;
    } else if (stage === 'ultra') {
      prompt = `Фамильяр игрока (вид: ${currentFamiliar?.type}, имя: ${currentFamiliar?.name}) достигает идеальной, эпической формы. 
      Сделай его вид легендарным. Имя оставь прежним.
      Верни ТОЛЬКО JSON в формате: {"type": "эпический вид существа", "name": "${currentFamiliar?.name}", "imagePrompt": "A short English prompt for an AI image generator to create a portrait of this legendary pet."}`;
    }

    const response = await openai.chat.completions.create({
      model: model || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      response_format: { type: "json_object" }
    });
    
    const content = response.choices[0].message.content;
    if (content) {
      const data = JSON.parse(content) as { type: string, name: string, imagePrompt?: string, imageUrl?: string };
      if (data.imagePrompt && enableImages) {
        try {
          data.imageUrl = await generateAIImage(imageApiKey || apiKey, imageBaseUrl || baseUrl, imageModel, data.imagePrompt, enableImages);
        } catch (e) {
          console.error("Failed to generate pet image", e);
        }
      }
      return data;
    }
    return null;
  } catch (error) {
    console.error("[AI] Error generating familiar:", error);
    return null;
  }
};

export const generateDailyMemoryLog = async (apiKey: string, baseUrl: string, model: string, completed: string[], missed: string[]) => {
  try {
    const openai = getOpenAIClient(apiKey, baseUrl);
    const prompt = `Ты — беспристрастный летописец. Опиши прошедший день героя одним коротким предложением от третьего лица, отметив его слабости и успехи.
    Ограничение: Опирайся СТРОГО на предоставленные данные. Не выдумывай герою задачи или привычки, которых нет в списке.
    
    Выполненные задачи: ${completed.length > 0 ? completed.join(', ') : 'Нет'}
    Пропущенные задачи: ${missed.length > 0 ? missed.join(', ') : 'Нет'}
    
    Верни ТОЛЬКО одно предложение на русском языке.`;
    
    const response = await openai.chat.completions.create({
      model: model || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });
    return response.choices[0].message.content?.trim() || "День прошел без особых событий.";
  } catch (error) {
    console.error("[AI Memory] Error generating daily log:", error);
    return "День прошел без особых событий.";
  }
};

export const updateBehaviorAnalytics = async (apiKey: string, baseUrl: string, model: string, memoryLog: string[], tasks: any[]) => {
  try {
    const openai = getOpenAIClient(apiKey, baseUrl);
    const completedTasks = tasks.filter(t => t.completed).map(t => t.text);
    const missedTasks = tasks.filter(t => !t.completed).map(t => t.text);
    
    const prompt = `Ты — Мастер Игры. Проанализируй поведение игрока за последнюю неделю.
    Ограничение: Опирайся СТРОГО на предоставленные данные. Не выдумывай.
    
    Недавняя память (дни):
    ${memoryLog.join('\n')}
    
    Текущие выполненные задачи: ${completedTasks.join(', ')}
    Текущие пропущенные/невыполненные задачи: ${missedTasks.join(', ')}
    
    Верни ТОЛЬКО валидный JSON объект со следующей структурой:
    {
      "ignored_tasks_patterns": ["паттерн 1", "паттерн 2"], // какие типы задач игрок избегает (например "уборка", "спорт")
      "preferred_tasks_patterns": ["паттерн 1", "паттерн 2"], // какие типы задач игрок любит
      "master_summary": "Текст от лица Мастера (2-3 предложения), резюмирующий поведение игрока, его сильные и слабые стороны на основе этих данных."
    }`;
    
    const response = await openai.chat.completions.create({
      model: model || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });
    
    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error("Пустой ответ от OpenAI");

    return extractJSON(content);
  } catch (error) {
    console.error("[AI Analytics] Error updating behavior analytics:", error);
    return null;
  }
};

export const categorizeTasksBatchWithAI = async (apiKey: string, baseUrl: string, model: string, tasks: string[]) => {
  try {
    const openai = getOpenAIClient(apiKey, baseUrl);
    const systemPrompt = `You are a task categorizer.
    Categorize each provided task into exactly one of these 4 stats:
    - strength (Сила/Тело: спорт, питание, сон, прогулки)
    - intelligence (Интеллект/Разум: чтение, обучение, работа, программирование)
    - charisma (Харизма/Дух/Социум: общение, соцсети, помощь)
    - willpower (Воля/Дисциплина: рутина, уборка, неприятные дела)

    You also must evaluate the difficulty of each task on a scale of 1 to 5:
    1 - Very easy, trivial (e.g., drink water)
    2 - Easy, takes little effort (e.g., make the bed)
    3 - Medium, requires some time/effort (e.g., 30 min workout, read a chapter)
    4 - Hard, requires significant effort/time (e.g., intense 1h workout, deep work session)
    5 - Very hard, exhausting (e.g., run a marathon, finish a huge project)
    
    Return ONLY a valid JSON object with this exact structure, no markdown formatting:
    {
      "results": [
        {
          "stat": "strength" | "intelligence" | "charisma" | "willpower",
          "difficulty": 1 | 2 | 3 | 4 | 5
        }
      ]
    }
    The "results" array MUST be in the exact same order as the tasks provided.`;

    const tasksList = tasks.map((t, i) => `${i + 1}. "${t}"`).join('\n');

    console.log("[AI Categorization] Requesting batch task categorization...");
    const response = await openai.chat.completions.create({
      model: model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Categorize and evaluate the following tasks:\n${tasksList}` }
      ],
      response_format: { type: 'json_object' }
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error("Пустой ответ от OpenAI");

    const data = extractJSON(content);

    if (!Array.isArray(data.results) || data.results.length !== tasks.length) {
      throw new Error("Неверный формат ответа ИИ (ожидался массив results правильной длины)");
    }

    console.log("[AI Categorization] Successfully categorized tasks batch.");
    return data.results as { stat: StatType, difficulty: number }[];
  } catch (error) {
    console.error("[AI Categorization] Error:", error);
    throw error;
  }
};

export const evaluateTasksBatchWithAI = async (apiKey: string, baseUrl: string, model: string, tasks: { text: string, stat: StatType }[]) => {
  try {
    const openai = getOpenAIClient(apiKey, baseUrl);
    const systemPrompt = `You are a Game Master in an RPG habit tracker.
    Evaluate the effort required for a batch of completed tasks and assign XP, Gold, and Difficulty.
    Base XP is 25 per task, Base Stat XP is 20 per task. Scale them from 0.5x to 3x based on perceived difficulty and effort.
    Assign a difficulty rating from 1 to 5 (1 = trivial, 5 = monumental).
    Assign gold reward based on difficulty (e.g., 5-10 for trivial, up to 50-100 for monumental).
    Categorize each task into one of these 4 stats:
    - strength (Сила/Тело: спорт, питание, сон, прогулки)
    - intelligence (Интеллект/Разум: чтение, обучение, работа, программирование)
    - charisma (Харизма/Дух/Социум: общение, соцсети, помощь)
    - willpower (Воля/Дисциплина: рутина, уборка, неприятные дела)
    
    Return ONLY a valid JSON object with this exact structure, no markdown formatting:
    {
      "results": [
        {
          "xp": number,
          "statXp": number,
          "gold": number,
          "difficulty": number,
          "suggestedStat": "strength" | "intelligence" | "charisma" | "willpower"
        }
      ],
      "gmComment": "A short, encouraging, in-character comment from the Game Master in Russian summarizing the player's overall achievements."
    }
    The "results" array MUST be in the exact same order as the tasks provided.`;

    const tasksList = tasks.map((t, i) => `${i + 1}. "${t.text}" (Current category: ${t.stat})`).join('\n');

    console.log("[AI Evaluation] Requesting batch task evaluation...");
    const response = await openai.chat.completions.create({
      model: model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `The player just completed the following tasks:\n${tasksList}\nEvaluate each task and provide a summary comment.` }
      ],
      response_format: { type: 'json_object' }
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error("Пустой ответ от OpenAI");

    const data = extractJSON(content);

    if (!Array.isArray(data.results) || data.results.length !== tasks.length) {
      throw new Error("Неверный формат ответа ИИ (ожидался массив results правильной длины)");
    }

    console.log("[AI Evaluation] Successfully evaluated tasks batch.");
    return data as {
      results: { xp: number, statXp: number, suggestedStat: StatType }[],
      gmComment: string
    };
  } catch (error) {
    console.error("[AI Evaluation] Error:", error);
    throw error;
  }
};

export const evaluateTaskWithAI = async (apiKey: string, baseUrl: string, model: string, taskText: string, stat: StatType) => {
  try {
    const openai = getOpenAIClient(apiKey, baseUrl);
    const systemPrompt = `You are a Game Master in an RPG habit tracker.
    Evaluate the effort required for the completed task and assign XP, Gold, and Difficulty.
    Base XP is 25, Base Stat XP is 20. Scale them from 0.5x to 3x based on perceived difficulty and effort.
    Assign a difficulty rating from 1 to 5 (1 = trivial, 5 = monumental).
    Assign gold reward based on difficulty (e.g., 5-10 for trivial, up to 50-100 for monumental).
    Categorize the task into one of these 4 stats:
    - strength (Сила/Тело: спорт, питание, сон, прогулки)
    - intelligence (Интеллект/Разум: чтение, обучение, работа, программирование)
    - charisma (Харизма/Дух/Социум: общение, соцсети, помощь)
    - willpower (Воля/Дисциплина: рутина, уборка, неприятные дела)
    
    Return ONLY a valid JSON object with this exact structure, no markdown formatting:
    {
      "xp": number,
      "statXp": number,
      "gold": number,
      "difficulty": number,
      "suggestedStat": "strength" | "intelligence" | "charisma" | "willpower",
      "gmComment": "A short, encouraging, in-character comment from the Game Master in Russian."
    }`;

    console.log("[AI Evaluation] Requesting task evaluation...");
    const response = await openai.chat.completions.create({
      model: model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `The player just completed the task: "${taskText}". Current category is ${stat}, but feel free to suggest a better one if it fits the 4 stats strictly.` }
      ],
      response_format: { type: 'json_object' }
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error("Пустой ответ от OpenAI");

    const data = extractJSON(content);

    if (typeof data.xp !== 'number' || typeof data.statXp !== 'number') {
      throw new Error("Неверные типы данных в ответе ИИ (ожидались числа для xp и statXp)");
    }

    console.log("[AI Evaluation] Successfully evaluated task.");
    return {
      xp: data.xp,
      statXp: data.statXp,
      suggestedStat: data.suggestedStat as StatType || stat,
      gmComment: data.gmComment || "Отличная работа! Продолжай в том же духе."
    };
  } catch (error: any) {
    console.error("[AI Evaluation] Fatal error during task evaluation:", error);
    throw new Error(error?.message || "Неизвестная ошибка при оценке задачи");
  }
};

export const generateAICampaign = async (apiKey: string, baseUrl: string, model: string, playerStats: Player['stats'], defeatedBosses: string[], currentStory: string, playerLevel: number, dailyPointsHistory: Record<string, number> = {}, inventory: import('../App').Trophy[] = [], nemesisBoss?: Boss, chronicle?: import('../App').HeroChronicle, isReroll: boolean = false): Promise<{ campaign: import('../App').Campaign, newStoryContext: string }> => {
  try {
    const openai = getOpenAIClient(apiKey, baseUrl);
    let nemesisPrompt = "";
    if (nemesisBoss && nemesisBoss.escaped) {
      nemesisPrompt = `The player recently failed to defeat a boss named "${nemesisBoss.name}". This boss has escaped and is now returning as a "Scarred" or "Vengeful" version of themselves. They should be the main boss of this campaign, with higher stats and immunity (multiplier 0.0) to the stat the player used most against them.`;
    } else if (chronicle?.campaign_history.nemesis && Math.random() < 0.2 && !isReroll) {
      nemesisPrompt = `The player's old nemesis "${chronicle.campaign_history.nemesis}" has returned. They should be the main boss of this campaign, adapted to counter the player's strengths.`;
    }

    const chronicleContext = chronicle ? `
    Player Chronicle (Memory):
    Favorite Stat: ${chronicle.behavior_analytics.favorite_stat}
    Weakest Stat: ${chronicle.behavior_analytics.weakest_stat}
    Ignored Patterns: ${chronicle.behavior_analytics.ignored_tasks_patterns.join(', ')}
    Preferred Patterns: ${chronicle.behavior_analytics.preferred_tasks_patterns.join(', ')}
    Recent Memory: ${chronicle.recent_memory_log.join(' | ')}
    
    CRITICAL INSTRUCTION: Make the main boss a counter-measure against the player based on this chronicle. If they ignore certain tasks or have a weak stat, the boss should exploit this (e.g. resistance to their favorite stat, vulnerability to their weakest stat to force them to use it). The boss description should subtly mock or reference their recent behavior or ignored tasks.
    ` : '';

    const systemPrompt = `You are a Game Master in an RPG habit tracker.
    Create a weekly campaign. The player will face 2-3 mini-bosses (minions) over the week, leading up to a main boss.
    ${nemesisPrompt}
    ${chronicleContext}
    For each enemy, assign exactly ONE vulnerability (multiplier 1.5) and optionally ONE resistance (multiplier 0.5) to their stats (strength, intelligence, charisma, willpower). The rest should be 1.0.
    Also generate a small trophy/relic that drops from each boss. The effect should be microscopic to not break game balance (e.g., +1% XP to Willpower, +1.5% damage to weaknesses, -1% to future boss HP).
    For each boss, provide a single emoji that best represents them (e.g., 🐺 for a wolf, 🧛‍♂️ for a vampire, 👁️ for an eye monster).
    For each boss, provide a 'banter' object with 4 short phrases (one for each stat: strength, intelligence, charisma, willpower). The boss will say this phrase when hit by that stat.
    Return ONLY a valid JSON object with this exact structure, no markdown formatting:
    {
      "theme": "Campaign theme/name in Russian",
      "colorTheme": "slate" | "emerald" | "rose" | "amber" | "blue" | "purple" | "cyan",
      "mapPrompt": "A short English prompt for an AI image generator to create a top-down fantasy map for this campaign. Not photorealistic, stylized.",
      "newStoryContext": "Updated brief storyline summary in Russian including this new threat.",
      "enemies": [
        {
          "name": "Mini-boss Name (in Russian)",
          "description": "Description of the mini-boss in Russian.",
          "imagePrompt": "A short English prompt for an AI image generator to create a fantasy portrait of this mini-boss. MUST INCLUDE: 'Fantasy game art, highly detailed portrait. The character is placed in a fitting atmospheric background. No UI elements, no text.'",
          "avatarEmoji": "🐺",
          "isMiniBoss": true,
          "multipliers": { "strength": 1.5, "intelligence": 0.5, "charisma": 1.0, "willpower": 1.0 },
          "banter": {
            "strength": "Твои мышцы бесполезны!",
            "intelligence": "Жалкие фокусы!",
            "charisma": "Твои слова пусты!",
            "willpower": "Твоя воля сломлена!"
          },
          "dropTrophy": {
            "name": "Trophy Name in Russian",
            "description": "Short lore description in Russian.",
            "icon": "A single emoji representing the trophy",
            "effect": {
              "type": "xp_boost" | "damage_boost" | "boss_hp_reduction",
              "targetStat": "strength" | "intelligence" | "charisma" | "willpower" | null,
              "value": 0.01
            }
          }
        },
        {
          "name": "Main Boss Name (in Russian)",
          "description": "Epic description of the main boss in Russian.",
          "imagePrompt": "A short English prompt for an AI image generator to create a fantasy portrait of this main boss. MUST INCLUDE: 'Fantasy game art, highly detailed portrait. The character is placed in a fitting atmospheric background. No UI elements, no text.'",
          "avatarEmoji": "🐉",
          "isMiniBoss": false,
          "multipliers": { "strength": 1.0, "intelligence": 1.5, "charisma": 1.0, "willpower": 0.5 },
          "dropTrophy": {
            "name": "Epic Trophy Name in Russian",
            "description": "Short lore description in Russian.",
            "icon": "A single emoji representing the trophy",
            "effect": {
              "type": "xp_boost" | "damage_boost" | "boss_hp_reduction",
              "targetStat": "strength" | "intelligence" | "charisma" | "willpower" | null,
              "value": 0.02
            }
          }
        }
      ]
    }`;

    const userPrompt = isReroll 
      ? `Player stats: ${JSON.stringify(playerStats)}
    Defeated bosses: ${defeatedBosses.join(', ')}
    The player is rerolling the campaign. Discard the current story and start a completely new, unrelated campaign narrative.`
      : `Player stats: ${JSON.stringify(playerStats)}
    Defeated bosses: ${defeatedBosses.join(', ')}
    Current story: ${currentStory}`;

    console.log("[AI Campaign] Requesting campaign generation...");
    const response = await openai.chat.completions.create({
      model: model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error("Пустой ответ от OpenAI");

    const data = extractJSON(content);
    
    if (!data.enemies || !Array.isArray(data.enemies) || data.enemies.length === 0) {
      throw new Error("ИИ не вернул список врагов");
    }

    // Calculate dynamic HP base based on last 14 days
    let avgProductivity = 200; // Default Weekly_Base_Power
    const historyValues = Object.values(dailyPointsHistory);
    if (historyValues.length > 0) {
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

    const enemies: Boss[] = data.enemies.map((e: any, index: number) => {
      const isMiniBoss = e.isMiniBoss !== undefined ? !!e.isMiniBoss : index < data.enemies.length - 1;
      const finalMultiplier = Math.max(0.1, 1.15 - hpReduction); // Boss is 15% stronger than average
      const maxHp = isMiniBoss ? Math.floor((avgProductivity * 0.3) * finalMultiplier) : Math.floor(avgProductivity * finalMultiplier);
      
      const now = new Date();
      const daysToAdd = isMiniBoss ? 1 : 6;
      const expirationDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysToAdd, 23, 59, 59, 999);

      return {
        id: Date.now().toString() + Math.random(),
        level: playerLevel,
        name: e.name || (isMiniBoss ? "Приспешник" : "Неизвестный Босс"),
        description: e.description || "...",
        hp: maxHp,
        maxHp,
        expiresAt: expirationDate.getTime(),
        multipliers: e.multipliers || { strength: 1, intelligence: 1, charisma: 1, willpower: 1 },
        isMiniBoss,
        imagePrompt: e.imagePrompt,
        defeated: false,
        isNemesis: !isMiniBoss && !!nemesisBoss,
        dropTrophy: e.dropTrophy ? {
          id: Date.now().toString() + Math.random(),
          ...e.dropTrophy
        } : undefined
      };
    });

    console.log("[AI Campaign] Successfully generated campaign:", data.theme);

    return {
      campaign: {
        id: Date.now().toString(),
        theme: data.theme || "Новая угроза",
        colorTheme: data.colorTheme || "slate",
        mapPrompt: data.mapPrompt || "",
        enemies,
        currentEnemyIndex: 0,
        deadline: Date.now() + 7 * 24 * 60 * 60 * 1000
      },
      newStoryContext: data.newStoryContext || currentStory
    };
  } catch (error: any) {
    console.error("[AI Campaign] Fatal error during campaign generation:", error);
    throw new Error(error?.message || "Неизвестная ошибка при генерации кампании");
  }
};

export const generateAIImage = async (apiKey: string, baseUrl: string, model: string, prompt: string, enabled: boolean = true) => {
  if (!enabled) {
    console.log("[AI Image] Генерация изображений отключена в настройках разработчика.");
    return null;
  }

  if (!apiKey && !baseUrl) {
    console.warn("[AI Image] No API key or Base URL provided, skipping image generation.");
    return null;
  }
  
  try {
    console.log("[AI Image] Requesting image generation for prompt:", prompt.substring(0, 50) + "...");
    const openai = getOpenAIClient(apiKey, baseUrl);
    const response = await openai.images.generate({
      model: model || "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json",
      // @ts-ignore - nano-gpt specific parameters
      guidance_scale: 7.5,
      num_inference_steps: 30,
    } as any);
    
    if (!response?.data?.[0]) {
      console.error("[AI Image] Invalid response structure from OpenAI:", response);
      return null;
    }

    const data = response.data[0];
    if (data.b64_json) {
      console.log("[AI Image] Successfully generated image (base64)");
      return `data:image/png;base64,${data.b64_json}`;
    }
    if (data.url) {
      console.log("[AI Image] Successfully generated image (url)");
      return data.url;
    }
    
    console.error("[AI Image] No image data found in response:", data);
    return null;
  } catch (error) {
    console.error("[AI Image] Fatal error during image generation:", error);
    return null;
  }
};

export const generateAITrophy = async (
  apiKey: string, 
  baseUrl: string, 
  model: string, 
  bossName: string,
  imageModel: string,
  enableAiImages: boolean = true,
  imageApiKey?: string,
  imageBaseUrl?: string
): Promise<import('../App').Trophy> => {
  try {
    const openai = getOpenAIClient(apiKey, baseUrl);
    const systemPrompt = `You are a Game Master in an RPG habit tracker.
    The player just defeated a boss named "${bossName}".
    Generate a small trophy/relic as a reward.
    The effect should be microscopic to not break game balance (e.g., +1% XP to Willpower, +1.5% damage to weaknesses, -1% to future boss HP).
    Return ONLY a valid JSON object with this exact structure, no markdown formatting:
    {
      "name": "Trophy Name in Russian",
      "description": "Short lore description in Russian.",
      "imagePrompt": "English prompt for an image generation AI (e.g., DALL-E) to create a dark fantasy RPG icon of this item on a black background.",
      "icon": "A single emoji representing the trophy",
      "effect": {
        "type": "xp_boost" | "damage_boost" | "boss_hp_reduction",
        "targetStat": "strength" | "intelligence" | "charisma" | "willpower" | null,
        "value": number // e.g., 0.01 for 1%
      }
    }`;

    console.log("[AI Trophy] Requesting trophy generation...");
    const response = await openai.chat.completions.create({
      model: model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate a trophy for defeating ${bossName}.` }
      ],
      response_format: { type: 'json_object' }
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error("Пустой ответ от OpenAI");

    const data = extractJSON(content);
    
    let imageUrl: string | undefined = undefined;
    if (enableAiImages && data.imagePrompt) {
      const generatedImage = await generateAIImage(imageApiKey || apiKey, imageBaseUrl || baseUrl, imageModel, data.imagePrompt, enableAiImages);
      if (generatedImage) {
        imageUrl = generatedImage;
      }
    }
    
    return {
      id: Date.now().toString() + Math.random(),
      name: data.name || "Неизвестный трофей",
      description: data.description || "...",
      imagePrompt: data.imagePrompt,
      icon: data.icon || "🏆",
      imageUrl: imageUrl,
      effect: data.effect || { type: 'xp_boost', value: 0.01 }
    };
  } catch (error: any) {
    console.error("[AI Trophy] Fatal error during trophy generation:", error);
    // Fallback trophy
    return {
      id: Date.now().toString() + Math.random(),
      name: `Осколок: ${bossName}`,
      description: "Слабое воспоминание о победе.",
      icon: "✨",
      effect: { type: 'xp_boost', value: 0.01 }
    };
  }
};

export const generateShopItems = async (apiKey: string, baseUrl: string, model: string, playerLevel: number) => {
  try {
    const openai = getOpenAIClient(apiKey, baseUrl);
    const systemPrompt = `You are a mysterious traveling merchant in an RPG habit tracker.
    Generate a pool of EXACTLY 10 items for the player to buy with Gold. These items will be used as a pool for the entire campaign.
    Return ONLY a valid JSON object with this exact structure, no markdown formatting:
    {
      "items": [
        {
          "name": "Item Name in Russian",
          "lore": "Short lore description in Russian.",
          "effect": {
            "type": "heal_boss" | "damage_boost" | "xp_boost" | "pet_food",
            "value": number
          },
          "rarity": "gray" | "blue" | "purple" | "gold",
          "price": number
        }
      ]
    }
    Prices MUST be very high so the player has to save up for them (e.g., 300 to 2000 gold depending on rarity). Include at least 2-3 items with 'pet_food' type (value should be XP amount for pet, e.g. 10 to 50).`;

    const response = await openai.chat.completions.create({
      model: model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate shop items for a level ${playerLevel} player.` }
      ],
      response_format: { type: 'json_object' }
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error("Пустой ответ от OpenAI");

    const data = extractJSON(content);
    return data.items;
  } catch (error) {
    console.error("[AI Shop] Error generating shop items:", error);
    return [];
  }
};

export const decomposeTaskWithAI = async (apiKey: string, baseUrl: string, model: string, taskText: string) => {
  try {
    const openai = getOpenAIClient(apiKey, baseUrl);
    const systemPrompt = `You are a productivity assistant.
    Break down the given task into 3-5 small, actionable subtasks.
    Return ONLY a valid JSON object with this exact structure, no markdown formatting:
    {
      "subtasks": ["Subtask 1", "Subtask 2", "Subtask 3"]
    }`;

    const response = await openai.chat.completions.create({
      model: model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Break down this task: "${taskText}"` }
      ],
      response_format: { type: 'json_object' }
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error("Пустой ответ от OpenAI");

    const data = extractJSON(content);
    return data.subtasks;
  } catch (error) {
    console.error("[AI Decompose] Error decomposing task:", error);
    return [];
  }
};

export const generateRandomEncounter = async (apiKey: string, baseUrl: string, model: string, weakestStat: string, existingTasks: string[]) => {
  try {
    const openai = getOpenAIClient(apiKey, baseUrl);
    const existingStr = existingTasks.length > 0 ? `DO NOT duplicate or closely repeat these existing tasks: ${existingTasks.join(', ')}` : '';

    const systemPrompt = `You are a Game Master in an RPG habit tracker. Generate a random daily encounter for the player.
    
    CRITICAL RULES:
    1. The "story" and the "task" MUST be logically connected. If the story is about moving a boulder, the task should be fitness/strength oriented (like 'Do 20 squats'). If the story is about deciphering a runic tablet, the task should be 'Read 10 pages of a book'.
    2. The "task" MUST be a realistic, general real-life habit/action (e.g., fitness, learning, chores, mindfulness). DO NOT give specific, inaccessible fantasy tasks like "Chop wood" or "Hunt an animal". You must translate the RPG fantasy context into a viable real-world activity.
    3. You MUST focus the task primarily on the player's weakest stat: ${weakestStat}.
    4. ${existingStr}

    Return ONLY a valid JSON object with this exact structure, no markdown formatting:
    {
      "story": "Micro-story in Russian (e.g., 'Странствующий монах молится у дороги. Если вы присоединитесь к нему, то укрепите свой дух')",
      "task": "Easy real-life task for today in Russian (e.g., 'Помедитировать 5 минут')",
      "stat": "strength" | "intelligence" | "charisma" | "willpower",
      "difficulty": 1 | 2 | 3 | 4 | 5,
      "buff": {
        "type": "xp_boost" | "damage_boost",
        "value": 0.05
      }
    }`;

    const response = await openai.chat.completions.create({
      model: model || 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }],
      response_format: { type: 'json_object' }
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error("Пустой ответ от OpenAI");

    return extractJSON(content);
  } catch (error) {
    console.error("[AI Encounter] Error generating encounter:", error);
    return null;
  }
};

export const generateTasks = async (
  apiKey: string, 
  baseUrl: string, 
  model: string, 
  playerStats: any, 
  boss: any, 
  existingTasks: string[], 
  allBosses: any[],
  chronicle?: any
) => {
  try {
    const openai = getOpenAIClient(apiKey, baseUrl);
    
    // Формируем контекст кампании
    const campaignContext = allBosses.map((b, index) => {
      if (index === allBosses.length - 1) {
        return `Финальный босс (ИМЯ СКРЫТО ОТ ИГРОКА, используй только намеки): Неведомая угроза, ${b.description}`;
      }
      return `Босс ${index + 1}: ${b.name} - ${b.description}`;
    }).join('\n');

    const chronicleContext = chronicle ? `
    Player Chronicle (Memory):
    Favorite Stat: ${chronicle.behavior_analytics.favorite_stat}
    Weakest Stat: ${chronicle.behavior_analytics.weakest_stat}
    Ignored Patterns: ${chronicle.behavior_analytics.ignored_tasks_patterns.join(', ')}
    Recent Memory: ${chronicle.recent_memory_log.join(' | ')}
    
    CRITICAL INSTRUCTION: Tailor the tasks to challenge the player's weaknesses (Weakest Stat, Ignored Patterns) while utilizing their strengths. Reference their recent memory subtly if applicable.
    ` : '';

    const systemPrompt = `You are a Game Master. The player needs new quests for their current campaign.
    Generate exactly 3 ONE-OFF tasks. These tasks should form a cohesive narrative arc preparing the player for the entire campaign, not just the current boss.
    
    Campaign Context:
    ${campaignContext}
    ${chronicleContext}
    
    CRITICAL RULES:
    1. Distribute the 3 tasks logically: some for immediate preparation (current boss), some for mid-campaign, and 1-2 hinting at the final boss.
    2. NEVER use the name of the final boss. Use ominous hints, foreshadowing, and abstract threats (e.g., "prepare for the gathering shadow", "decipher the ancient warnings").
    3. NO DUPLICATES: The tasks MUST NOT duplicate or closely repeat any existing tasks in the user's quest log shown below (e.g. if they have 'Do 10 pushups', do not add 'Do 20 pushups').
    4. ACTIONABLE & REAL-LIFE: Tasks MUST be actionable, general real-life tasks (fitness, learning, chores). Do NOT give literal fantasy tasks like 'Chop wood' or 'Find a magic herb'.
    5. LOGICAL CONNECTION: The task description must weave the RPG story but the required real-life action must make logical sense in that context. FORMAT YOUR TASK TEXT LIKE THIS: "[Story fluff]. [Clear real life action]". Example 1: "Древние руны указывают путь к логову мага. Прочитай 10 страниц любой книги." Example 2: "Чтобы увернуться от клыков монстра, нужна ловкость. Сделай 20 приседаний."
    6. TARGET WEAKNESSES: The tasks MUST be tailored to the weakest stats listed above to force the user to improve in those areas.
    7. Categorize each task into one of these 4 stats:
       - strength (Сила/Тело: спорт, питание, сон, прогулки)
       - intelligence (Интеллект/Разум: чтение, обучение, работа, программирование)
       - charisma (Харизма/Дух/Социум: общение, соцсети, помощь)
       - willpower (Воля/Дисциплина: рутина, уборка, неприятные дела)
    8. EVALUATE DIFFICULTY: Rate each task's difficulty from 1 to 5 (1=Trivial, 2=Easy, 3=Medium, 4=Hard, 5=Exhausting).
    9. Add an "isMasterTask": true flag to all 3 tasks to visually distinguish them as story quests.
    
    Return ONLY a valid JSON object containing an array under the key "tasks", no markdown formatting:
    {
      "tasks": [
        { 
          "text": "Task description in Russian", 
          "stat": "strength" | "intelligence" | "charisma" | "willpower",
          "difficulty": 1 | 2 | 3 | 4 | 5,
          "isMasterTask": true
        }
      ]
    }`;

    const userPrompt = `Player stats: ${JSON.stringify(playerStats)}
    Current Boss: ${boss.name}
    Existing tasks: ${existingTasks.length > 0 ? existingTasks.join(', ') : 'None'}`;

    console.log("[AI Tasks] Requesting task generation...");
    const response = await openai.chat.completions.create({
      model: model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error("Пустой ответ от OpenAI");

    const data = extractJSON(content);

    if (!data.tasks || !Array.isArray(data.tasks)) {
      throw new Error("ИИ не вернул список задач");
    }

    console.log("[AI Tasks] Successfully generated tasks:", data.tasks.length);
    return data.tasks;
  } catch (error: any) {
    console.error("[AI Tasks] Fatal error during task generation:", error);
    throw new Error(error?.message || "Неизвестная ошибка при генерации заданий");
  }
};
