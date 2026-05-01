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
              imageConfig: { aspectRatio: params.aspectRatio || "1:1" }
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
  
  // Strip <think> tags and their contents (used by models like DeepSeek-R1 or o-series)
  const cleanedText = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  try {
    // Attempt direct parse first
    return JSON.parse(cleanedText);
  } catch (e) {
    // Try to extract from markdown code blocks
    const markdownMatch = cleanedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (markdownMatch && markdownMatch[1]) {
      try {
        return JSON.parse(markdownMatch[1]);
      } catch (e2) {
        // Fallthrough
      }
    }
    
    // Try to find the first { and last }
    const start = cleanedText.indexOf('{');
    const end = cleanedText.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(cleanedText.slice(start, end + 1));
      } catch (e3) {
        // Fallthrough
      }
    }
    
    throw new Error(`Не удалось извлечь JSON из ответа ИИ.\nСырой ответ:\n${cleanedText}`);
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
      prompt = `Игрок класса "${playerClass}" заслужил магического фамильяра. 
      Придумай вид существа (фэнтезийное животное, дух, голем и т.д.) и его имя. 
      Верни ТОЛЬКО JSON в формате: {"type": "вид существа", "name": "Имя", "imagePrompt": "Detailed English prompt for AI image generator. AAA game stylized digital painting of a cute but magical baby [creature description]. Hearthstone/Riot game art style, vibrant colors, cinematic lighting, fantasy companion. Clean stylized forms. Masterpiece."}`;
    } else if (stage === 'evolved') {
      prompt = `Фамильяр игрока (вид: ${currentFamiliar?.type}, имя: ${currentFamiliar?.name}) повзрослел и эволюционировал. 
      Придумай ему более взрослую, грозную или грациозную форму (например, Волк -> Бронированный Волк-Страж). Имя оставь прежним.
      Верни ТОЛЬКО JSON в формате: {"type": "новый вид существа", "name": "${currentFamiliar?.name}", "imagePrompt": "Detailed English prompt for AI image generator. AAA game stylized digital painting of an evolved, powerful [creature description]. Hearthstone/Riot game art style, vibrant colors, cinematic lighting, fantasy companion. Clean stylized forms. Masterpiece."}`;
    } else if (stage === 'ultra') {
      prompt = `Фамильяр игрока (вид: ${currentFamiliar?.type}, имя: ${currentFamiliar?.name}) достигает своей финальной, легендарной формы. 
      Сделай его вид божественным, мифическим и невероятно эпичным. Имя оставь прежним.
      Верни ТОЛЬКО JSON в формате: {"type": "эпический вид существа", "name": "${currentFamiliar?.name}", "imagePrompt": "Detailed English prompt for AI image generator. AAA game stylized digital painting of an epic, legendary mythic [creature description]. Hearthstone/Riot game art style, vibrant colors, cinematic lighting, ultimate fantasy companion, divine aura. Clean stylized forms. Masterpiece."}`;
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

    const jsonSchemaReminder = `Return ONLY a valid JSON object with this exact structure, no markdown formatting:
    {
      "results": [
        {
          "stat": "strength" | "intelligence" | "charisma" | "willpower",
          "difficulty": 1 | 2 | 3 | 4 | 5
        }
      ]
    }`;
    const userMessage = `Categorize and evaluate the following tasks:\n${tasksList}\n\nCRITICAL REMINDER FOR THINKING MODELS: Many reasoning models ignore the system structure. You MUST return ONLY a valid JSON object matching the exact structure below. Your response MUST contain the "results" array.\n\n${jsonSchemaReminder}`;

    console.log("[AI Categorization] Requesting batch task categorization...");
    const response = await openai.chat.completions.create({
      model: model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      response_format: { type: 'json_object' }
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error("Пустой ответ от OpenAI");

    const data = extractJSON(content);

    if (!Array.isArray(data.results) || data.results.length !== tasks.length) {
      throw new Error("Неверный формат ответа ИИ (ожидался массив results правильной длины).\n\nRAW RESULT:\n" + JSON.stringify(data, null, 2));
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

    const jsonSchemaReminder = `Return ONLY a valid JSON object with this exact structure, no markdown formatting:
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
    }`;
    const userMessage = `The player just completed the following tasks:\n${tasksList}\nEvaluate each task and provide a summary comment.\n\nCRITICAL REMINDER FOR THINKING MODELS: Many reasoning models ignore the system structure. You MUST return ONLY a valid JSON object matching the exact structure below. Your response MUST contain the "results" array.\n\n${jsonSchemaReminder}`;

    console.log("[AI Evaluation] Requesting batch task evaluation...");
    const response = await openai.chat.completions.create({
      model: model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      response_format: { type: 'json_object' }
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error("Пустой ответ от OpenAI");

    const data = extractJSON(content);

    if (!Array.isArray(data.results) || data.results.length !== tasks.length) {
      throw new Error("Неверный формат ответа ИИ (ожидался массив results правильной длины).\n\nRAW RESULT:\n" + JSON.stringify(data, null, 2));
    }

    console.log("[AI Evaluation] Successfully evaluated tasks batch.");
    return data as {
      results: { xp: number, statXp: number, suggestedStat: StatType, gold?: number, difficulty?: number }[],
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
      gold: data.gold,
      difficulty: data.difficulty,
      suggestedStat: data.suggestedStat as StatType || stat,
      gmComment: data.gmComment || "Отличная работа! Продолжай в том же духе."
    };
  } catch (error: any) {
    console.error("[AI Evaluation] Fatal error during task evaluation:", error);
    throw new Error(error?.message || "Неизвестная ошибка при оценке задачи");
  }
};

export const regenerateAITown = async (
  apiKey: string,
  baseUrl: string,
  model: string,
  seasonInfo: import('../App').HeroChronicle['season_info']
) => {
  const openai = getOpenAIClient(apiKey, baseUrl);
  const systemPrompt = `You are a Game Master in a dark fantasy RPG. 
  The player is currently in Season (Story Arc): "${seasonInfo?.name || 'Unknown'}".
  Season Lore: "${seasonInfo?.setting_lore || 'Unknown'}".

  CRITICAL: You need to regenerate the City/Camp (the player's safe haven) and its 5 NPCs.
  CITY RESTRICTIONS:
  - DIVERSITY: Generate a random and balanced mix of genders and races (women, men, elves, dwarves, orcs, tieflings, beastfolk, etc.). Minimum 50% of characters MUST be female. 
  - For each NPC, explicitly declare their \`gender\` (Male/Female) and \`race\` (Human, Elf, Dwarf, Tiefling, Orc, Beastfolk), and inject these into their \`imagePrompt\`.
  - COZY ATMOSPHERE: The city is a safe haven. NPCs MUST NOT be toxic, condescending, arrogant, or humiliating. 
  - TONE OF VOICE И СТИЛИСТИКА ТЕКСТА (ВАЖНО):
    1. Используй качественный, живой литературный русский язык в стиле хорошего фэнтези (как в играх серии Ведьмак, Dragon Age или Baldur's Gate).
    2. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНЫ англицизмы и геймерский сленг в речи персонажей. НЕ используй слова: скилл, левел, квест, рандомный, босс, апгрейд. Заменяй их на внутриигровые аналоги: навык, умение, ступень, поручение, задача, чудовище, враг, улучшение.
    3. Текст должен быть естественным и легко читаться. Избегай громоздких деепричастных оборотов, излишней поэтичности и театрального пафоса.
    4. Строй фразы по правилам русского синтаксиса, избегай прямого калькирования английских конструкций.
    5. Реплики NPC должны быть лаконичными (1-2 предложения), атмосферными, но привязанными к бытовым реалиям Лагеря. (e.g. "Присаживайся у огня, путник. Мои зелья согреют даже в самую темную ночь").

  NPC Roles:
  1. shop (Black market or cozy trader)
  2. fortune (A diviner, seer, or oracle)
  3. altar (A mystical shrine spirit or priest)
  4. beast (A friendly beastmaster or familiar breeder)
  5. expedition (Guild master or scout leader)
  
  For each NPC, provide a very specific \`imagePrompt\` that MUST exactly follow this template: "Medium shot, camera zoomed out. The character's torso and head must be fully visible within the frame. A polished stylized digital painting of an eccentric, uniquely designed [gender] [race] [profession]. AAA game character portrait, Riot Games and Hearthstone style, Arcane animation style. Highly distinctive, memorable dark-fantasy design with unique accessories, striking magical elements, or intricate exotic garments. Clean stylized forms, smooth 2.5D rendering, crisp edges, vibrant cinematic lighting. The character is positioned on the right side of the canvas. The background is a rich, completely colored [LOCATION IN ENGLISH]. ABSOLUTELY NO WHITE BORDERS OR EMPTY WHITE SPACE. Waist-up portrait. Looking directly at the viewer with a friendly expression. Masterpiece, NO messy brushstrokes, NO hyper-realism." NO UI elements, NO text.

  Return your response as a JSON object matching this structure EXACTLY:
  {
    "city_background_prompt": "A short English prompt for an AI image generator to create a top-down dark fantasy settlement/camp map for this season. Stylized concept art, high detail, no UI, no text.",
    "npcs": {
      "shop": { "name": "...", "quote": "...", "imagePrompt": "..." },
      "fortune": { "name": "...", "quote": "...", "imagePrompt": "..." },
      "altar": { "name": "...", "quote": "...", "imagePrompt": "..." },
      "beast": { "name": "...", "quote": "...", "imagePrompt": "..." },
      "expedition": { "name": "...", "quote": "...", "imagePrompt": "..." }
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
};

export const generateAICampaign = async (
  apiKey: string, 
  baseUrl: string, 
  model: string, 
  playerStats: Player['stats'], 
  defeatedBosses: string[], 
  currentStory: string, 
  playerLevel: number, 
  dailyPointsHistory: Record<string, number> = {}, 
  inventory: import('../App').Trophy[] = [], 
  nemesisBoss?: Boss, 
  chronicle?: import('../App').HeroChronicle, 
  isReroll: boolean = false
): Promise<{ campaign: import('../App').Campaign, masterTask?: any, newStoryContext: string, newSeasonInfo?: import('../App').HeroChronicle['season_info'] }> => {
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

    const isNewSeason = !chronicle?.season_info || isReroll;
    let seasonContext = "";
    if (isNewSeason) {
      seasonContext = `
      CRITICAL: You are generating the FIRST campaign of a NEW Season (Story Arc).
      A Season lasts between 2 and 4 campaigns (weeks).
      You MUST generate a global season setting/biome.
      Also generate 5 NPCs for the city/camp (a safe haven for the player).
      CITY RESTRICTIONS:
      - DIVERSITY: Generate a random and balanced mix of genders and races (women, men, elves, dwarves, orcs, tieflings, beastfolk, etc.). Minimum 50% of characters MUST be female. 
      - For each NPC, explicitly declare their \`gender\` (Male/Female) and \`race\` (Human, Elf, Dwarf, Tiefling, Orc, Beastfolk), and inject these into their \`imagePrompt\`.
      - COZY ATMOSPHERE: The city is a safe haven. NPCs MUST NOT be toxic, condescending, arrogant, or humiliating. 
      - TONE OF VOICE И СТИЛИСТИКА ТЕКСТА (ВАЖНО):
        1. Используй качественный, живой литературный русский язык в стиле хорошего фэнтези (как в играх серии Ведьмак, Dragon Age или Baldur's Gate).
        2. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНЫ англицизмы и геймерский сленг в речи персонажей. НЕ используй слова: скилл, левел, квест, рандомный, босс, апгрейд. Заменяй их на внутриигровые аналоги: навык, умение, ступень, поручение, задача, чудовище, враг, улучшение.
        3. Текст должен быть естественным и легко читаться. Избегай громоздких деепричастных оборотов, излишней поэтичности и театрального пафоса.
        4. Строй фразы по правилам русского синтаксиса, избегай прямого калькирования английских конструкций.
        5. Реплики NPC должны быть лаконичными (1-2 предложения), атмосферными, но привязанными к бытовым реалиям Лагеря. (e.g. "Присаживайся у огня, путник. Мои зелья согреют даже в самую темную ночь").

      NPC Roles:
      1. shop (Black market or cozy trader)
      2. fortune (A diviner, seer, or oracle)
      3. altar (A mystical shrine spirit or priest)
      4. beast (A friendly beastmaster or familiar breeder)
      5. expedition (Guild master or scout leader)
      
      For each NPC, provide a very specific \`imagePrompt\` that MUST exactly follow this template: "Medium shot, camera zoomed out. The character's torso and head must be fully visible within the frame. A polished stylized digital painting of an eccentric, uniquely designed [gender] [race] [profession]. AAA game character portrait, Riot Games and Hearthstone style, Arcane animation style. Highly distinctive, memorable dark-fantasy design with unique accessories, striking magical elements, or intricate exotic garments. Clean stylized forms, smooth 2.5D rendering, crisp edges, vibrant cinematic lighting. The background is a rich, completely colored [LOCATION IN ENGLISH]. ABSOLUTELY NO WHITE BORDERS OR EMPTY WHITE SPACE. Waist-up portrait. Looking directly at the viewer with a friendly expression. Masterpiece, NO messy brushstrokes, NO hyper-realism." NO UI elements, NO text.
      Return "season_info" in your JSON response with the new season's name, lore, total campaigns (2 to 4), and set current_campaign to 1. Ensure you include the 'npcs' object.
      `;
    } else if (chronicle?.season_info) {
      const nextIndex = chronicle.season_info.current_campaign + 1;
      const isFinale = nextIndex === chronicle.season_info.total_campaigns;
      seasonContext = `
      CRITICAL: You are generating campaign ${nextIndex} out of ${chronicle.season_info.total_campaigns} in the current Season "${chronicle.season_info.name}".
      Season Lore: ${chronicle.season_info.setting_lore}
      Keep the theme strictly within this Season!
      ${isFinale ? "THIS IS THE SEASON FINALE. The main boss MUST be the epic 'Главарь' (Boss of the Season) and the story should conclude the arc." : "This is a continuation of the season."}
      Return "season_info" in your JSON response to reflect the updated current_campaign index (${nextIndex}). DO NOT generate "city_background_prompt" or "npcs" again inside "season_info".
      `;
    }

    const seasonInfoJsonFormat = isNewSeason ? `
      "season_info": {
        "name": "Season Name",
        "setting_lore": "Global season lore summary",
        "total_campaigns": 3,
        "current_campaign": 1,
        "city_background_prompt": "A short English prompt for an AI image generator to create a top-down dark fantasy settlement/camp map for this season. Stylized concept art, high detail, no UI, no text.",
        "npcs": {
          "shop": { "name": "Shadow Broker", "quote": "Quote...", "imagePrompt": "Portrait of..." },
          "fortune": { "name": "Blind Seer", "quote": "Quote...", "imagePrompt": "Portrait of..." },
          "altar": { "name": "Blood Altar", "quote": "Quote...", "imagePrompt": "Portrait of..." },
          "beast": { "name": "Beastmaster", "quote": "Quote...", "imagePrompt": "Portrait of..." },
          "expedition": { "name": "Guild Master", "quote": "Quote...", "imagePrompt": "Portrait of..." }
        }
      },` : `
      "season_info": {
        "name": "Season Name",
        "setting_lore": "Global season lore summary (kept same as before)",
        "total_campaigns": ${chronicle?.season_info?.total_campaigns || 3},
        "current_campaign": ${chronicle?.season_info?.current_campaign !== undefined ? chronicle.season_info.current_campaign + 1 : 2}
      },`;

    const systemPrompt = `You are a Game Master in an RPG habit tracker.
    Create a weekly campaign. The player will face 2-3 mini-bosses (minions) over the week, leading up to a main boss.
    
    TONE OF VOICE И СТИЛИСТИКА ТЕКСТА (ВАЖНО):
    1. Используй качественный, живой литературный русский язык в стиле хорошего фэнтези (Ведьмак, Dragon Age, Baldur's Gate).
    2. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНЫ англицизмы и геймерский сленг. НЕ используй: скилл, левел, квест, рандомный, босс, апгрейд. Заменяй их на: навык, умение, ступень, поручение, задача, чудовище, враг, улучшение.
    3. Текст должен быть естественным, избегай театрального пафоса и деепричастных оборотов.

    ${seasonContext}
    ${nemesisPrompt}
    ${chronicleContext}
    For each enemy, assign exactly ONE vulnerability (multiplier 1.5) and optionally ONE resistance (multiplier 0.5) to their stats (strength, intelligence, charisma, willpower). The rest should be 1.0.
    Also generate a small trophy/relic that drops from each boss. The effect should be microscopic to not break game balance (e.g., +1% XP to Willpower, +1.5% damage to weaknesses, -1% to future boss HP).
    For each boss, provide a single emoji that best represents them.
    For each boss, provide a 'banter' object with 4 short phrases (one for each stat: strength, intelligence, charisma, willpower). The boss will say this phrase when hit by that stat.
    Return ONLY a valid JSON object with this exact structure, no markdown formatting:
    {
      "theme": "Campaign theme/name in Russian",
      "colorTheme": "slate" | "emerald" | "rose" | "amber" | "blue" | "purple" | "cyan",
      "mapPrompt": "A short English prompt for an AI image generator to create a top-down fantasy map for this campaign. Not photorealistic, stylized.",
      "newStoryContext": "Updated brief storyline summary in Russian including this new threat.",
      "masterTask": {
        "text": "Name of the weekly story-related real-life task for the player (e.g., 'Сходить в поход на выходных', 'Прочитать книгу о драконах'). MUST be realistic, not fantasy roleplay.",
        "stat": "strength",
        "difficulty": 4
      },${seasonInfoJsonFormat}
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
            "imagePrompt": "A short English prompt for an AI image generator to create a 2D fantasy game UI icon for this trophy. Isolated on dark background.",
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
            "imagePrompt": "A short English prompt for an AI image generator to create a 2D fantasy game UI epic icon for this item. Isolated on dark background.",
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

    const jsonSchemaReminder = `Return ONLY a valid JSON object with this exact structure, no markdown formatting:
    {
      "theme": "Campaign theme/name in Russian",
      "colorTheme": "slate" | "emerald" | "rose" | "amber" | "blue" | "purple" | "cyan",
      "mapPrompt": "A short English prompt for an AI image generator to create a top-down fantasy map for this campaign. Not photorealistic, stylized.",
      "newStoryContext": "Updated brief storyline summary in Russian including this new threat.",
      "masterTask": {
        "text": "Name of the weekly story-related real-life task for the player (e.g., 'Сходить в поход на выходных', 'Прочитать книгу о драконах'). MUST be realistic, not fantasy roleplay.",
        "stat": "strength",
        "difficulty": 4
      },${seasonInfoJsonFormat}
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
            "imagePrompt": "A short English prompt for an AI image generator to create a 2D fantasy game UI icon for this trophy.",
            "effect": {
              "type": "xp_boost",
              "targetStat": "strength",
              "value": 0.01
            }
          }
        },
        {
          "name": "Main Boss Name (in Russian)",
          "description": "Epic description of the main boss in Russian.",
          "imagePrompt": "A short English prompt for an AI image generator to create a fantasy portrait of this main boss.",
          "avatarEmoji": "🐉",
          "isMiniBoss": false,
          "multipliers": { "strength": 1.0, "intelligence": 1.5, "charisma": 1.0, "willpower": 0.5 },
          "dropTrophy": {
            "name": "Epic Trophy Name in Russian",
            "description": "Short lore description in Russian.",
            "icon": "A single emoji representing the trophy",
            "imagePrompt": "A short English prompt for an AI image generator to create a 2D fantasy game UI epic icon.",
            "effect": {
              "type": "boss_hp_reduction",
              "targetStat": null,
              "value": 0.05
            }
          }
        }
      ]
    }`;

    const finalUserPrompt = `${userPrompt}\n\nCRITICAL REMINDER FOR THINKING MODELS: Many reasoning models drop or ignore the system prompt. You MUST return ONLY a valid JSON object matching the exact structure below. DO NOT return a generic D&D campaign structure. Your response MUST contain the "theme", "colorTheme", "mapPrompt", "newStoryContext", "enemies" array, and other strictly defined fields from the JSON template.\n\n${jsonSchemaReminder}`;

    console.log("[AI Campaign] Requesting campaign generation...");
    const response = await openai.chat.completions.create({
      model: model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: finalUserPrompt }
      ],
      response_format: { type: 'json_object' }
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error("Пустой ответ от OpenAI");

    const data = extractJSON(content);
    
    if (!data.enemies || !Array.isArray(data.enemies) || data.enemies.length === 0) {
      throw new Error("ИИ не вернул список врагов.\n\nRAW RESULT:\n" + JSON.stringify(data, null, 2));
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
        id: crypto.randomUUID(),
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
          id: crypto.randomUUID(),
          ...e.dropTrophy
        } : undefined
      };
    });

    console.log("[AI Campaign] Successfully generated campaign:", data.theme);

    return {
      campaign: {
        id: crypto.randomUUID(),
        theme: data.theme || "Новая угроза",
        colorTheme: data.colorTheme || "slate",
        mapPrompt: data.mapPrompt || "",
        enemies,
        currentEnemyIndex: 0,
        deadline: Date.now() + 7 * 24 * 60 * 60 * 1000
      },
      masterTask: data.masterTask,
      newStoryContext: data.newStoryContext || currentStory,
      newSeasonInfo: data.season_info
    };
  } catch (error: any) {
    console.error("[AI Campaign] Fatal error during campaign generation:", error);
    throw new Error(error?.message || "Неизвестная ошибка при генерации кампании");
  }
};

const compressImage = async (base64Str: string, maxWidth = 512): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = Math.round(height * (maxWidth / width));
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => resolve(base64Str);
    img.src = base64Str;
  });
};

export const generateAIImage = async (apiKey: string, baseUrl: string, model: string, prompt: string, enabled: boolean = true, aspectRatio: string = "1:1") => {
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
      size: (aspectRatio === "9:16" || aspectRatio === "3:4") ? "1024x1792" : (aspectRatio === "16:9" ? "1792x1024" : "1024x1024"), // Adjusted for vertical/horizontal format when needed
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
      console.log("[AI Image] Successfully generated image (base64). Compressing...");
      const fullBase64 = `data:image/png;base64,${data.b64_json}`;
      try {
        const compressed = await compressImage(fullBase64);
        console.log(`[AI Image] Compressed base64 size: ${Math.round(compressed.length / 1024)}KB`);
        return compressed;
      } catch (e) {
        console.error("[AI Image] Compression failed, returning original base64", e);
        return fullBase64;
      }
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
      id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
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
    return data.items.map((item: any) => ({ ...item, id: crypto.randomUUID() }));
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
      response_format: { type: 'json_object' },
      temperature: 0.95
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error("Пустой ответ от OpenAI");

    return extractJSON(content);
  } catch (error) {
    console.error("[AI Encounter] Error generating encounter:", error);
    return null;
  }
};

export const evaluateOathWithAI = async (apiKey: string, baseUrl: string, model: string, oathText: string): Promise<any> => {
  try {
    const openai = getOpenAIClient(apiKey, baseUrl);

    const systemPrompt = `You are a strict, hardcore Gatekeeper of the Altar of Oaths in a dark fantasy gamified productivity app.
    The user submits a task they pledge to complete within 1 week.

    Read their oath: "${oathText}"

    If this is a minor routine (cleaning room, going to the store, normal homework), REJECT it with superiority.
    If it is a truly difficult or large project (exam prep, finishing a project, running a marathon), ACCEPT it and offer a generous reward in gold (200-1000) or XP (100-500).

    Return ONLY a valid JSON object:
    {
      "accepted": boolean,
      "gatekeeperMessage": "In character response (Russian). If rejecting, insult their weak ambition. If accepting, sound impressed and ominous.",
      "rewardType": "gold" | "xp" | "none",
      "rewardValue": number (0 if rejected)
    }`;

    const response = await openai.chat.completions.create({
      model: model || 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }],
      response_format: { type: 'json_object' }
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty response from AI");

    return extractJSON(content);
  } catch (error) {
    console.error("[AI Oath] Error:", error);
    return null;
  }
};

