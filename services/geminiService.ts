

import { GoogleGenAI, Chat, GenerateContentResponse, Type, Content } from "@google/genai";
import { AIModelType, Character, Novel, PlotCard } from "../types";

// Initialize the client. 
// NOTE: process.env.API_KEY is injected by the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_MAPPING = {
  [AIModelType.FAST]: 'gemini-flash-lite-latest',
  [AIModelType.SMART]: 'gemini-3-pro-preview',
  [AIModelType.RESEARCH]: 'gemini-2.5-flash',
  [AIModelType.THINKING]: 'gemini-3-pro-preview',
};

/**
 * Retry helper to handle transient 500/network errors.
 */
async function withRetry<T>(
  operation: () => Promise<T>, 
  retries = 1, 
  fallback?: () => Promise<T>
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    console.warn(`Gemini API Attempt Failed: ${error.message}`);
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5s before retry
      return withRetry(operation, retries - 1, fallback);
    }
    if (fallback) {
       console.warn(`Switching to fallback operation...`);
       return fallback();
    }
    throw error;
  }
}

/**
 * Generates text based on the selected capability profile.
 */
export const generateText = async (
  prompt: string,
  modelType: AIModelType,
  systemInstruction?: string,
  chatHistoryContext?: string,
): Promise<{ text: string; groundingChunks?: any[] }> => {
  const modelId = MODEL_MAPPING[modelType];
  
  // Format chat history as a distinct, authoritative block
  const chatHistoryBlock = chatHistoryContext
    ? `
=== ⚡️近期灵感上下文 (Recent Context) ===
以下是作者与助手最近的 5 条讨论记录。
⚠️ 智能提取指令：请忽略聊天中的客套话（如“好的”、“没问题”），仅提取与当前生成任务（剧情/人设/润色）强相关的核心设定或修改建议，并将其应用到下方的生成任务中。如果聊天记录与大纲无冲突，请优先采纳聊天记录中的最新灵感。
----------------------------------------
${chatHistoryContext}
========================================
`
    : '';

  const finalPrompt = `${chatHistoryBlock}\n${prompt}`;

  const executeGeneration = async (overrideModel?: string) => {
      let config: any = {
        systemInstruction,
      };

      // Capability specific configurations
      if (modelType === AIModelType.THINKING && !overrideModel) {
        config = {
          ...config,
          thinkingConfig: { thinkingBudget: 32768 }, // Max budget for deep reasoning
        };
      } else if (modelType === AIModelType.RESEARCH || overrideModel === 'gemini-2.5-flash') {
        config = {
          ...config,
          tools: [{ googleSearch: {} }],
        };
      } else if (modelType === AIModelType.FAST) {
        config = {
            ...config,
            temperature: 0.7,
        }
      }

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: overrideModel || modelId,
        contents: finalPrompt,
        config: config,
      });

      // Handle Search Grounding Results
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

      return {
        text: response.text || "未生成任何内容。",
        groundingChunks,
      };
  };

  try {
      // If using SMART/THINKING (Pro models), provide a fallback to RESEARCH (Flash) if it fails
      if (modelType === AIModelType.SMART || modelType === AIModelType.THINKING) {
          return await withRetry(
              () => executeGeneration(), 
              1, 
              () => executeGeneration('gemini-2.5-flash')
          );
      } else {
          return await withRetry(() => executeGeneration(), 2);
      }
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error(`Failed to generate content using ${modelType}`);
  }
};

const FANQIE_STYLE_INSTRUCTION = `
你现在必须完全模仿番茄小说网头部大神作者（如“油子吟”）的写作风格。
核心风格定义：
1. **极度快节奏**：拒绝铺垫，拒绝慢热。每一章必须有明确的冲突或爽点。
2. **大白话/接地气**：使用中国网文读者的语言习惯，多用短句，多用口语，禁止翻译腔（如“噢，上帝”、“该死的”）。
3. **开篇即高潮**：第一段必须直接进入剧情核心（对话、冲突、金手指开启），**严禁以环境描写/景物描写作为章节开头**。
4. **情绪主导**：所有剧情服务于调动读者的情绪（震惊、期待、愤怒、爽）。
5. **排版优化**：段落要短，适合手机阅读。
`;

/**
 * Generates a full chapter based on plot card details.
 */
export const generateChapterFromPlot = async (
  summary: string,
  style: string,
  characters: Character[],
  chatHistoryContext?: string
): Promise<string> => {
  const characterProfiles = characters.map(c => 
    `- 姓名：${c.name}\n  性格：${c.personality}\n  能力：${c.abilities}\n  背景：${c.background}`
  ).join("\n\n");

  const chatReferenceInstruction = chatHistoryContext 
    ? `【特别指令】：请务必智能结合上方的【近期灵感上下文】。如果最近的聊天记录中包含了对该情节的具体修改意见或伏笔设计，请必须优先执行。`
    : ``;

  const prompt = `
请根据以下设定，写一个符合【番茄小说网】风格的章节。

【模仿对象】：油子吟（及同类大神作者）
【风格关键词】：${style || "轻松、脑洞、爽文、快节奏"}

${chatReferenceInstruction}

【本章大纲】：
${summary}

【登场角色】：
${characterProfiles}

【严格执行的写作禁令】：
1. **禁止写景开篇**：严禁出现“清晨，阳光洒在...”、“窗外下着雨...”这类AI感极强的开头。请直接以人物对话或突发事件开场！
2. **禁止AI连接词**：文中不得出现“随着...”、“与此同时...”、“只见...”等生硬连接词。
3. **拒绝说教**：不要在文中进行大段的背景设定说明（Info Dump），要通过剧情展示。

【写作要求】：
- 字数：2000字左右。
- 视角：第三人称（或根据大纲指定）。
- 逻辑：符合中国社会的人情世故和利益逻辑，拒绝西式中二。
`;

  const result = await generateText(
    prompt, 
    AIModelType.SMART, 
    FANQIE_STYLE_INSTRUCTION,
    chatHistoryContext
  );
  
  return result.text;
};

/**
 * Generates the next chapter based on context.
 */
export const generateNextChapter = async (
  lastChapterContent: string,
  globalOutline: string, 
  newChapterOutline: string,
  characters: Character[],
  chatHistoryContext?: string
): Promise<string> => {
    
  const characterProfiles = characters.map(c => 
    `- ${c.name} (${c.personality})`
  ).join(", ");

  const chatReferenceInstruction = chatHistoryContext 
    ? `【特别指令】：请务必智能结合上方的【近期灵感上下文】。作者最近可能在对话中指定了接下来的剧情走向或伏笔，请将其核心意图提取并统合到正文中。`
    : ``;

  const prompt = `
请续写下一章。
【核心指令】：模仿番茄小说作者“油子吟”的笔触。文风要骚气、犀利、有梗，节奏要飞快。

${chatReferenceInstruction}

【全书大纲背景】：
${globalOutline}

【角色】：
${characterProfiles}

【上一章末尾】：
...${lastChapterContent.slice(-800)}

【本章剧情指令】：
${newChapterOutline}

【写作铁律】：
1. **开头**：紧接上文悬念，或者直接开启新冲突。**绝对不要写环境描写！**
2. **对话**：人物语言要像“活人”，带有性格色彩和潜台词，不要像NPC。
3. **爽点**：如果本章有打脸或装逼情节，请铺垫好情绪，释放要干脆利落。

请直接输出正文。
`;

  const result = await generateText(
    prompt,
    AIModelType.SMART,
    FANQIE_STYLE_INSTRUCTION,
    chatHistoryContext
  );

  return result.text;
};

/**
 * Generates a full chapter based on detailed outlines.
 */
export const generateChapterFromOutlines = async (
  novelTitle: string,
  novelGenre: string,
  globalOutline: string,
  volumeOutline: string, // Added volume outline
  chapterIndex: number, 
  activeChapterTitle: string,
  activeChapterOutline: string,
  previousChaptersContent: string, 
  characters: Character[],
  modelType: AIModelType, 
  chatHistoryContext?: string
): Promise<string> => {
  const characterProfiles = characters.map(c => 
    `- 姓名：${c.name}\n  性格：${c.personality}\n  能力：${c.abilities}\n  背景：${c.background}`
  ).join("\n\n");

  const chatReferenceInstruction = chatHistoryContext 
    ? `【特别指令 - 智能统合】：请高度重视上方的【近期灵感上下文】。
       要求：
       1. 智能筛选：忽略聊天中的闲聊，仅提取与本章相关的剧情指令或语气要求。
       2. 优先级：如果聊天记录中的最新指令与大纲有细微冲突，以聊天记录中的最新想法为准（视为对大纲的临时修订）。`
    : ``;

  const prompt = `
你现在是一位顶级网文大神作家，你的任务是根据已有的大纲和设定，续写小说《${novelTitle}》（类型：${novelGenre}）的第 ${chapterIndex + 1} 章。

【写作风格总要求】：
你必须完全模仿番茄小说网头部大神作者（如“油子吟”）的写作风格。核心要点是：极度快节奏、口语化、开篇即高潮、情绪主导、短段落排版。严禁任何形式的景物描写开篇！

${chatReferenceInstruction}

【**最高优先级指令：严格遵守大纲**】
你必须严格、完全、一字不差地遵循以下所有大纲设定，不得自由发挥或偏离。所有剧情、人物行为、对话核心都必须源于以下大纲。

---
【全书核心大纲】：
${globalOutline}
---

【当前分卷规划（Volume Arc）】：
${volumeOutline || "无明确分卷规划，请跟随全书大纲。"}
---

【上一章结尾内容摘要】：
...${previousChaptersContent.slice(-1000)}

---

【当前章节】: ${activeChapterTitle}
【本章必须严格遵守的细纲】：
${activeChapterOutline}

---

【登场角色设定】：
${characterProfiles}

---

【写作铁律】：
1.  **绝对忠于大纲与指令**：再次强调，你必须严格按照【本章必须严格遵守的细纲】以及【近期灵感上下文】来展开剧情。请务必结合【当前分卷规划】来安排伏笔和节奏。
2.  **确保连续性**：剧情必须紧密衔接【上一章结尾内容摘要】，保持故事的连贯性。
3.  **番茄风格**：文笔要骚气、犀利、有梗，节奏飞快。对话要像“活人”，带有性格色彩和潜台词。
4.  **直接输出正文**：不要包含任何解释、标题或章节名，直接开始写正文内容。

现在，请开始创作第 ${chapterIndex + 1} 章的正文。
`;

  const result = await generateText(
    prompt,
    modelType,
    FANQIE_STYLE_INSTRUCTION,
    chatHistoryContext
  );
  
  return result.text;
};

/**
 * Generates a global novel outline.
 */
export const generateNovelOutline = async (
  title: string,
  genre: string,
  description: string,
  characters: Character[],
  novelContext?: string 
): Promise<string> => {
  const characterInfo = characters.map(c => `${c.name}（${c.personality}）`).join('、');

  const prompt = `
请为小说《${title}》设计一份符合【番茄小说/起点中文网】爆款标准的商业大纲。

【类型】：${genre}
【简介】：${description}
【主要角色】：${characterInfo || "待定"}

请按照以下结构输出（Markdown）：
1. **核心脑洞/金手指**：一句话讲清楚本书最吸引人的卖点（Hook）。
2. **卖点解析**：为什么这个设定能火？（分析爽点、代入感）。
3. **主线节奏图**：
   - **开篇（黄金三章）**：如何在前三章留住读者？
   - **前期（10-50章）**：主要矛盾和第一个大高潮。
   - **中期拓展**：地图换图或战力升级逻辑。
   - **大结局设想**。
4. **人物羁绊**：主角与核心配角的互动模式。

要求：思路清晰，符合中国网文市场规律，拒绝文青病，强调商业价值。
`;

  const result = await generateText(prompt, AIModelType.THINKING, undefined, novelContext);
  return result.text;
};

/**
 * Generates a volume (arc) outline.
 */
export const generateVolumeOutline = async (
  title: string,
  globalOutline: string,
  characters: Character[],
  novelContext?: string
): Promise<string> => {
  const characterInfo = characters.map(c => `${c.name}（${c.personality}）`).join('、');
  
  const prompt = `
请为小说《${title}》的当前分卷（Volume/Arc）设计一份详细的【分卷大纲】。
需基于全书大纲的走向，规划出本卷的起承转合。

【全书大纲】：
${globalOutline.slice(0, 2000)}

【主要角色】：${characterInfo || "待定"}

请按照以下结构输出（Markdown）：
1. **本卷核心事件**：本卷要解决的主要矛盾或达成的主要目标。
2. **人物成长弧光**：主角在本卷中获得的提升（战力/地位/心境）。
3. **关键剧情节点**：
   - **开端**：切入点与铺垫。
   - **发展**：冲突升级与阻碍。
   - **高潮**：本卷最大的爽点/决战。
   - **收尾**：伏笔回收与下一卷的引子。
4. **节奏把控**：预估章节数与情感曲线。

要求：逻辑严密，服务于全书主线，具有极强的可执行性。
`;
  const result = await generateText(prompt, AIModelType.THINKING, undefined, novelContext);
  return result.text;
}

/**
 * Generates a specific chapter outline.
 */
export const generateChapterOutline = async (
  chapterTitle: string,
  globalOutline: string,
  volumeOutline: string, // Added volume context
  previousChapterSummary: string,
  novelContext?: string 
): Promise<string> => {
  const prompt = `
请为章节《${chapterTitle}》设计一份细纲（Beat Sheet）。

【全书大纲】：
${globalOutline.slice(0, 500)}...

【当前分卷规划】：
${volumeOutline ? volumeOutline.slice(0, 1000) : "请根据全书大纲推演"}

【前情提要】：
${previousChapterSummary}

【设计要求】：
1. **核心冲突**：本章必须发生一件推动剧情的具体事件。
2. **承上启下**：必须符合分卷规划的进度。
3. **期待感管理**：结尾如何断章（Cliffhanger），让读者忍不住点下一章？
4. **剧情点**：列出3-4个具体的动作/对话节点。

请用编辑的口吻，直接列出干货。
`;

  const result = await generateText(prompt, AIModelType.SMART, undefined, novelContext);
  return result.text;
};

/**
 * Summarizes text for outline storage, strictly adhering to outline templates without filler.
 */
export const summarizeForOutline = async (content: string, type: 'global' | 'chapter' | 'volume'): Promise<string> => {
  let prompt = "";

  // Use SMART (Gemini 3 Pro) with a strict system instruction.
  const strictSystemInstruction = "你是一个纯粹的数据提取工具。只输出用户请求的结构化文本，不进行任何对话，不输出任何多余的解释性文字，不使用Markdown代码块包裹。";
  let resultText = "";

  if (type === 'global') {
    prompt = `
你的任务是从提供的文本中提取并整理出全书大纲。
请严格遵守以下规则：
1. **只输出大纲内容**，绝对禁止包含任何问候语、开场白（如“好的，这是为您整理的大纲”）、结束语或Markdown代码块标记（如 \`\`\`markdown）。
2. 如果信息不足，请根据上下文进行合理的推断填充，或留空，但必须保持格式完整。
3. 保持客观、简练的陈述语气。

请严格按照以下标准模板输出：

1. **核心脑洞/金手指**：[内容]
2. **卖点解析**：[内容]
3. **主线节奏图**：
   - **开篇**：[内容]
   - **前期剧情**：[内容]
   - **中期拓展**：[内容]
   - **大结局**：[内容]
4. **人物羁绊**：[内容]

【待提取内容】：
${content}
`;
  } else if (type === 'volume') {
      prompt = `
你的任务是从提供的文本中提取并整理出当前分卷大纲。
请严格遵守以下规则：
1. **只输出分卷大纲内容**，绝对禁止包含任何问候语、开场白、结束语或Markdown代码块标记。
2. 保持客观、简练的陈述语气。

请严格按照以下标准模板输出：

1. **本卷核心事件**：[内容]
2. **人物成长弧光**：[内容]
3. **关键剧情节点**：
   - **开端**：[内容]
   - **发展**：[内容]
   - **高潮**：[内容]
   - **收尾**：[内容]
4. **节奏把控**：[内容]

【待提取内容】：
${content}
`;
  } else {
    prompt = `
你的任务是从提供的文本中提取并整理出本章细纲。
请严格遵守以下规则：
1. **只输出细纲内容**，绝对禁止包含任何问候语、开场白（如“没问题，以下是细纲”）、结束语或Markdown代码块标记。
2. 保持客观、简练的陈述语气。

请严格按照以下标准模板输出：

1. **核心冲突**：[内容]
2. **剧情节点 (Beat Sheet)**：
   - [节点1]
   - [节点2]
   - [节点3]
3. **期待感管理**：[内容]

【待提取内容】：
${content}
`;
  }

  const result = await generateText(prompt, AIModelType.SMART, strictSystemInstruction);
  resultText = result.text;
  
  // Post-processing to clean up any potential markdown code blocks
  let cleanText = resultText.trim();
  if (cleanText.startsWith('```markdown')) cleanText = cleanText.slice(11);
  else if (cleanText.startsWith('```')) cleanText = cleanText.slice(3);
  
  if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);

  return cleanText.trim();
};

/**
 * Automatically generates Character and Plot cards from novel context.
 */
export const generateWorldSettings = async (
  novel: Novel, 
  generationType: 'characters' | 'plots', 
  includeChatHistory: boolean
): Promise<Partial<{ characters: Character[], plots: PlotCard[] }>> => {
  
  // Use gemini-2.5-flash for more stable JSON extraction
  const modelId = 'gemini-2.5-flash';

  const chatHistoryBlock = includeChatHistory && novel.chatHistory && novel.chatHistory.length > 0 
    ? `
    【参考资料：近期灵感上下文 (Last 5 messages)】:
    ⚠️ 请智能筛选：仅提取与设定相关的灵感，忽略无关对话。
    ${(novel.chatHistory || [])
      .slice(-5) // Use the last 5 messages as requested by the enhanced context logic
      .map(m => `${m.role === 'user' ? '【作者】' : '【AI助手】'}: ${(m.text || '').slice(0, 1000)}`) // Limit char count to safe parsing
      .join('\n')}
    `
    : '';

  const context = `
    【小说标题】: ${novel.title}
    【小说简介】: ${novel.description}
    【全书大纲】: ${novel.outline}
    ${chatHistoryBlock}
    【已写章节内容摘要】: 
    ${novel.chapters.map(c => `--- ${c.title} ---\n${c.content.slice(0, 500)}...`).join('\n\n')}
  `;
  
  const generationTarget = generationType === 'characters' ? '核心人物' : '关键情节';
  const chatInstruction = includeChatHistory 
    ? `特别指令：请智能统合【近期灵感上下文】、【全书大纲】和【已写章节】，识别并生成${generationTarget}。`
    : `特别指令：仅根据大纲和正文内容生成。`;

  const prompt = `
    请仔细阅读以下小说资料。
    ${chatInstruction}
    
    【小说完整资料】:
    ${context.slice(0, 20000)}
    
    【任务要求】:
    1.  根据提供的信息，识别出${generationTarget}。
    2.  严格按照下面定义的 JSON 格式返回结果，只返回请求的字段，不要添加任何额外的解释或文字。
    `;
    
  let responseSchema: any = {};
  if (generationType === 'characters') {
      responseSchema = {
          type: Type.OBJECT,
          properties: {
            characters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "人物的姓名" },
                  personality: { type: Type.STRING, description: "人物的性格特点总结" },
                  abilities: { type: Type.STRING, description: "人物的能力或技能" },
                  background: { type: Type.STRING, description: "人物的背景故事或关键经历" },
                },
                required: ["name", "personality"]
              },
            },
          },
          required: ["characters"]
      };
  } else { // plots
      responseSchema = {
          type: Type.OBJECT,
          properties: {
             plots: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "情节的简短标题" },
                  summary: { type: Type.STRING, description: "情节的详细概括" },
                  style: { type: Type.STRING, description: "这个情节的写作风格（例如：悬疑、战斗）" },
                  characterIds: { type: Type.ARRAY, items: { type: Type.STRING }, description: "参与此情节的人物姓名列表" },
                },
                required: ["title", "summary"]
              },
            },
          },
          required: ["plots"]
      };
  }

  // Wrapped in retry for robustness
  return await withRetry(async () => {
      const response = await ai.models.generateContent({
        model: modelId,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        },
      });

      const jsonString = response.text.trim();
      if (jsonString.startsWith('{') && jsonString.endsWith('}')) {
          const parsed = JSON.parse(jsonString);
          return parsed; 
      }
      throw new Error("AI did not return a valid JSON object.");
  });
};


/**
 * Starts a chat session. 
 * We default to Gemini 3 Pro for the main chatbot experience.
 */
export const createChatSession = (systemInstruction?: string, history?: Content[]): Chat => {
  return ai.chats.create({
    model: MODEL_MAPPING[AIModelType.SMART],
    config: {
      systemInstruction: systemInstruction || "你是一位深谙番茄、起点等平台爆款逻辑的金牌主编。你的职责是帮助作者优化大纲、打磨开头、设计爽点。你的语言风格专业、犀利、直接，熟悉网文黑话（如：黄金三章、毒点、期待感、金手指、扮猪吃虎）。严禁使用翻译腔，思维逻辑必须符合中国网文市场。",
    },
    history: history,
  });
};

/**
 * Helper to stream chat messages
 */
export const sendMessageStream = async (chat: Chat, message: string) => {
  return chat.sendMessageStream({ message });
};