
export interface Volume {
  id: string;
  title: string;
  outline: string;
}

export interface ChapterVersion {
  id: string;
  timestamp: number;
  title: string;
  content: string;
  summary?: string; // Snapshot of the outline at that time
}

export interface Chapter {
  id: string;
  volumeId?: string;
  title: string;
  content: string;
  summary?: string;
  chapterOutline?: string; // Brief summary or outline for the chapter
  history?: ChapterVersion[]; // Version history
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string; // Text displayed in UI
  fullPrompt?: string; // Actual text sent to AI (includes hidden file content)
  isThinking?: boolean; // To differentiate standard chat from deep thinking outputs
  groundingMetadata?: any; // For search results
}

export interface Character {
  id: string;
  name: string;
  personality: string; // 性格特点
  abilities: string; // 能力
  background: string; // 经历的情节/背景
}

export interface PlotCard {
  id: string;
  title: string; // 方便识别的卡片标题
  summary: string; // 大致剧情概括
  characterIds: string[]; // 参与人物 IDs
  style: string; // 行文风格
}

export interface WorldData {
  type: 'character' | 'plot';
  data: Partial<Character> | Partial<PlotCard>;
}

export interface Novel {
  id: string; // Unique identifier for the project
  title: string;
  author: string;
  description?: string;
  outline?: string; // Global novel outline
  volumes?: Volume[];
  genre: string;
  chapters: Chapter[];
  characters: Character[]; // Added character cards
  plotCards: PlotCard[]; // Added plot cards
  chatHistory?: ChatMessage[]; 
  createdAt: Date;
}

export enum AIModelType {
  FAST = 'FAST', // Flash Lite
  SMART = 'SMART', // 3 Pro
  RESEARCH = 'RESEARCH', // Flash with Search
  THINKING = 'THINKING', // 3 Pro with Thinking Budget
}

export interface GenerationConfig {
  modelType: AIModelType;
  systemInstruction?: string;
  prompt: string;
  context?: string; // e.g. previous chapter content
}