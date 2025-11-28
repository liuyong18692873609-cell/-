
import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { createChatSession, generateText } from '../services/geminiService';
import { AIModelType, ChatMessage } from '../types';
import { Spinner } from './ui/Spinner';
import { Content, GenerateContentResponse } from '@google/genai';
import ReactMarkdown from 'react-markdown';

interface ChatPanelProps {
  context: string;
  initialMessages: ChatMessage[];
  onMessagesUpdate: (messages: ChatMessage[]) => void;
  onSaveToOutline?: (type: 'global' | 'chapter' | 'volume', content: string) => void;
  fullScreen?: boolean;
}

type Tab = 'chat' | 'think' | 'research';

const SYSTEM_INSTRUCTION = "你是一位拥有十年经验的国内顶尖网文主编。你深谙起点、晋江等平台的爆款逻辑，熟悉玄幻、都市、仙侠、言情等主流题材。请根据用户的历史讨论记录和小说内容，提供犀利的点评、灵感启发或大纲优化建议。你的回复必须符合中国人的思维方式和网文创作习惯，多用行内术语（如：爽点、毒点、节奏、代入感、人设弧光）。严禁翻译腔，语言要简练、有见地。";

// --- Helper: Sanitize History for API ---
const sanitizeHistory = (messages: ChatMessage[]): Content[] => {
  const history: Content[] = [];
  const validMessages = messages.filter(m => (m.fullPrompt || m.text) && (m.fullPrompt || m.text).trim() !== '');
  
  for (const msg of validMessages) {
      const role = msg.role;
      const content = msg.fullPrompt || msg.text; // Prioritize hidden full context (with file) if available
      
      if (history.length === 0) {
          if (role === 'user') {
              history.push({ role: 'user', parts: [{ text: content }] });
          }
      } else {
          const last = history[history.length - 1];
          if (last.role === role) {
              last.parts[0].text += `\n\n${content}`;
          } else {
              history.push({ role: role, parts: [{ text: content }] });
          }
      }
  }
  return history;
};

interface MessageItemProps {
    msg: ChatMessage;
    activeTab: string;
    onSaveToOutline?: (type: 'global' | 'chapter' | 'volume', content: string) => void;
    onDelete: (id: string) => void;
}

// 1. Message Item (Memoized)
const MessageItem = memo(({ msg, activeTab, onSaveToOutline, onDelete }: MessageItemProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteClick = () => {
      setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
      onDelete(msg.id);
      setShowDeleteConfirm(false);
  };

  const cancelDelete = () => {
      setShowDeleteConfirm(false);
  };

  return (
    <div 
        className={`flex flex-col group ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
        style={{ 
            contentVisibility: 'auto', 
            containIntrinsicSize: '0 100px' // Rough estimate to prevent scrollbar jumping, allows browser to skip layout for offscreen items
        } as React.CSSProperties}
    >
      <div
        className={`relative max-w-[85%] p-4 rounded-2xl text-base shadow-sm ${
          msg.role === 'user'
            ? 'bg-indigo-600 text-white rounded-br-none'
            : activeTab === 'think' && msg.isThinking 
              ? 'bg-purple-50 border border-purple-200 text-gray-800 rounded-bl-none'
              : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
        }`}
      >
        <div className={`markdown-body ${msg.role === 'user' ? 'text-white' : 'text-gray-800'}`}>
            <ReactMarkdown>
                {msg.text}
            </ReactMarkdown>
        </div>
      </div>
      
      {/* Display Search Grounding Sources */}
      {msg.groundingMetadata && (
          <div className="mt-2 text-xs bg-white p-3 rounded border border-gray-200 w-full max-w-md shadow-sm">
              <p className="font-bold text-gray-500 mb-2 uppercase tracking-wider text-[10px]">参考来源</p>
              <ul className="space-y-1.5">
                  {msg.groundingMetadata.map((chunk: any, idx: number) => {
                      if (chunk.web) {
                          return (
                              <li key={idx}>
                                  <a href={chunk.web.uri} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate block">
                                      {chunk.web.title}
                                  </a>
                              </li>
                          )
                      }
                      return null;
                  })}
              </ul>
          </div>
      )}
      
      {/* Message Actions Row */}
      <div className="flex items-center gap-2 mt-1 px-1 min-h-[24px]">
          <span className="text-[10px] text-gray-400 select-none opacity-60">
              {msg.role === 'user' ? '你' : activeTab === 'think' ? '深度构思' : activeTab === 'research' ? '搜索' : '灵感助手'}
          </span>

          {/* Delete Button */}
          {!showDeleteConfirm ? (
             <button 
                onClick={handleDeleteClick}
                className="p-1 text-gray-400/60 hover:text-red-600 hover:bg-red-50 rounded transition-all flex items-center gap-1 opacity-60 hover:opacity-100"
                title="删除此消息"
            >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                <span className="text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">删除</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                <span className="text-[10px] text-red-500 font-medium">确认删除？</span>
                <button onClick={confirmDelete} className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded hover:bg-red-700">是</button>
                <button onClick={cancelDelete} className="text-[10px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded hover:bg-gray-300">否</button>
            </div>
          )}

          {/* Save Actions for AI Messages */}
          {msg.role === 'model' && onSaveToOutline && !showDeleteConfirm && (
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="h-3 w-px bg-gray-300 mx-1"></div>
                <button 
                    onClick={() => onSaveToOutline('global', msg.text)}
                    className="text-[10px] flex items-center gap-1 text-gray-500 hover:text-indigo-600 bg-transparent rounded hover:bg-gray-100 transition-all px-1"
                    title="总结并保存到全书大纲"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"></path></svg>
                    存全书
                </button>
                <button 
                    onClick={() => onSaveToOutline('volume', msg.text)}
                    className="text-[10px] flex items-center gap-1 text-gray-500 hover:text-blue-600 bg-transparent rounded hover:bg-gray-100 transition-all px-1"
                    title="总结并保存到分卷大纲"
                >
                     <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                    存分卷
                </button>
                <button 
                    onClick={() => onSaveToOutline('chapter', msg.text)}
                    className="text-[10px] flex items-center gap-1 text-gray-500 hover:text-purple-600 bg-transparent rounded hover:bg-gray-100 transition-all px-1"
                    title="总结并保存到当前章节细纲"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    存本章
                </button>
              </div>
          )}
      </div>
    </div>
  );
}, (prev, next) => prev.msg === next.msg && prev.activeTab === next.activeTab);

// 2. Message List (Render Boundary)
const MessageList = memo(({ 
    messages, 
    activeTab, 
    onSaveToOutline, 
    onDelete 
}: { 
    messages: ChatMessage[], 
    activeTab: string, 
    onSaveToOutline?: (type: 'global' | 'chapter' | 'volume', content: string) => void,
    onDelete: (id: string) => void
}) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const prevLengthRef = useRef(messages.length);

    // Optimized Auto-scroll: Only scroll when new messages are added
    useEffect(() => {
        if (messages.length > prevLengthRef.current) {
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 50);
        }
        prevLengthRef.current = messages.length;
    }, [messages.length]);

    // Always scroll to bottom when switching tabs
    useEffect(() => {
         setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 50);
    }, [activeTab]);

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar overscroll-contain">
            {messages.length === 0 && (
                <div className="text-center mt-20 text-gray-400 text-sm flex flex-col items-center gap-4 animate-in fade-in">
                    <div className={`p-4 rounded-full ${activeTab === 'chat' ? 'bg-indigo-100 text-indigo-500' : activeTab === 'think' ? 'bg-purple-100 text-purple-500' : 'bg-emerald-100 text-emerald-500'}`}>
                        {activeTab === 'chat' && <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>}
                        {activeTab === 'think' && <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>}
                        {activeTab === 'research' && <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>}
                    </div>
                    <p>
                        {activeTab === 'chat' && "我是您的专属网文主编，有任何卡文、设定或大纲问题都可以问我。"}
                        {activeTab === 'think' && "遇到剧情瓶颈了？基于中国社会逻辑和网文爽点为您深度推演。"}
                        {activeTab === 'research' && "需要查询成语、诗词、历史典故或玄幻设定？"}
                    </p>
                </div>
            )}
            
            {messages.map((msg) => (
                <MessageItem 
                    key={msg.id} 
                    msg={msg} 
                    activeTab={activeTab} 
                    onSaveToOutline={onSaveToOutline} 
                    onDelete={onDelete}
                />
            ))}
            <div ref={messagesEndRef} />
        </div>
    );
});

// 3. Chat Input (Isolated)
interface ChatInputProps { 
    activeTab: Tab; 
    isLoading: boolean; 
    onSend: (text: string, attachment?: {name: string, content: string}) => void;
    onStop: () => void;
}

const ChatInput = memo(({ activeTab, isLoading, onSend, onStop }: ChatInputProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [canSend, setCanSend] = useState(false);
  const [attachment, setAttachment] = useState<{ name: string; content: string } | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTriggerSend();
    }
  };

  const handleChange = () => {
      if (textareaRef.current) {
          const hasVal = textareaRef.current.value.trim().length > 0;
          const canSendNow = hasVal || !!attachment;
          if (canSendNow !== canSend) {
             setCanSend(canSendNow);
          }
      }
  };
  
  // Re-check canSend when attachment changes
  useEffect(() => {
      handleChange();
  }, [attachment]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        alert("文件过大，目前仅支持 2MB 以下的文本类文件（如 txt, md, json 等）。");
        e.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
        const content = ev.target?.result as string;
        setAttachment({
            name: file.name,
            content: content
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.onerror = () => {
        alert("读取文件失败。");
    };
    reader.readAsText(file);
  };

  const handleRemoveAttachment = () => {
      setAttachment(null);
  };

  const handleTriggerSend = () => {
      const rawText = textareaRef.current?.value.trim() || "";
      
      if ((rawText || attachment) && !isLoading) {
          // Pass separate args to allow parent to decide display vs prompt logic
          onSend(rawText, attachment || undefined);
          
          if (textareaRef.current) {
              textareaRef.current.value = '';
          }
          setAttachment(null);
          setCanSend(false);
      }
  };

  return (
      <div className="p-4 bg-gray-50 shrink-0 border-t border-gray-200">
        {/* Attachment Preview Chip */}
        {attachment && (
            <div className="mb-2 flex items-center gap-2 bg-white border border-indigo-100 text-indigo-700 px-3 py-2 rounded-lg text-sm shadow-sm animate-in fade-in slide-in-from-bottom-1">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                <span className="truncate max-w-[200px]">{attachment.name}</span>
                <button onClick={handleRemoveAttachment} className="ml-auto text-indigo-400 hover:text-indigo-900">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
        )}

        <div className="flex items-end gap-2 bg-white p-2 rounded-xl border border-gray-300 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
           {/* File Upload Button */}
            <button 
                onClick={handleUploadClick}
                disabled={isLoading}
                className="p-2 text-gray-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-gray-100"
                title="上传参考文件 (txt, md, json)"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
            </button>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                className="hidden" 
                accept=".txt,.md,.json,.csv,.log"
            />

            <textarea
                ref={textareaRef}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder="输入消息..."
                disabled={isLoading}
                className="flex-1 max-h-32 min-h-[44px] py-2.5 px-2 bg-transparent border-none focus:ring-0 resize-none text-sm text-gray-800 placeholder-gray-400 custom-scrollbar"
                rows={1}
                style={{ height: 'auto' }} 
                onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                }}
            />
            
            <button
                onClick={isLoading ? onStop : handleTriggerSend}
                disabled={!isLoading && !canSend}
                className={`p-2 rounded-lg transition-all duration-200 ${
                    isLoading
                    ? 'bg-red-50 text-red-600 shadow-sm hover:bg-red-100 border border-red-100'
                    : canSend
                      ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700' 
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
                title={isLoading ? "停止思考" : "发送"}
            >
                {isLoading ? (
                    <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"></path></svg>
                ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                )}
            </button>
        </div>
        <div className="text-center mt-2">
            <p className="text-[10px] text-gray-400">AI可能会产生错误信息，请核对重要事实。</p>
        </div>
      </div>
  );
});

const ChatPanel: React.FC<ChatPanelProps> = ({ 
    context, 
    initialMessages, 
    onMessagesUpdate, 
    onSaveToOutline,
    fullScreen 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [isLoading, setIsLoading] = useState(false);
  const chatSession = useRef<any | null>(null); 
  const prevContextRef = useRef(context);
  const historyFileInputRef = useRef<HTMLInputElement>(null);
  
  const abortRef = useRef(false);

  // --- Refs for Stable Callbacks ---
  const messagesRef = useRef(messages);
  const contextRef = useRef(context);
  const activeTabRef = useRef(activeTab);
  const onMessagesUpdateRef = useRef(onMessagesUpdate);
  const onSaveToOutlineRef = useRef(onSaveToOutline);

  // Sync Refs with State/Props
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { contextRef.current = context; }, [context]);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  useEffect(() => { onMessagesUpdateRef.current = onMessagesUpdate; }, [onMessagesUpdate]);
  useEffect(() => { onSaveToOutlineRef.current = onSaveToOutline; }, [onSaveToOutline]);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  // Initialize Session
  useEffect(() => {
      const initSession = () => {
        const history = sanitizeHistory(initialMessages);
        let systemInstruction = SYSTEM_INSTRUCTION;
        
        if (context) {
            systemInstruction += `\n\n【相关小说正文片段】：\n${context.slice(-2000)}`;
        }
        
        if (activeTab === 'think') {
            systemInstruction += "\n\n【当前模式】：深度构思模式。\n请运用中国式逻辑（人情世故、因果报应、利益交换）进行深度推演。分析剧情走向、伏笔埋设和人物动机。";
        } else if (activeTab === 'research') {
            systemInstruction += "\n\n【当前模式】：资料检索模式。\n请结合Google搜索工具，提供准确的历史典故、成语出处、玄幻设定素材等。";
        }

        try {
             chatSession.current = createChatSession(systemInstruction, history);
        } catch(e) { 
            console.error("Failed to create chat session", e); 
        }
      };
      
      if (!chatSession.current || prevContextRef.current !== context) {
          initSession();
          prevContextRef.current = context;
      }
  }, [context, activeTab, initialMessages]);

  // Stable Delete Handler
  const handleDeleteMessage = useCallback((id: string) => {
      const currentMessages = messagesRef.current;
      const newMessages = currentMessages.filter(m => m.id !== id);
      
      setMessages(newMessages);
      onMessagesUpdateRef.current(newMessages);
      
      // Re-construct System Instruction using current Refs
      let systemInstruction = SYSTEM_INSTRUCTION;
      const currentContext = contextRef.current;
      const currentTab = activeTabRef.current;

      if (currentContext) {
          systemInstruction += `\n\n【相关小说正文片段】：\n${currentContext.slice(-2000)}`;
      }
      if (currentTab === 'think') {
          systemInstruction += "\n\n【当前模式】：深度构思模式。\n请运用中国式逻辑（人情世故、因果报应、利益交换）进行深度推演。分析剧情走向、伏笔埋设和人物动机。";
      } else if (currentTab === 'research') {
          systemInstruction += "\n\n【当前模式】：资料检索模式。\n请结合Google搜索工具，提供准确的历史典故、成语出处、玄幻设定素材等。";
      }

      // Sync session
      const history = sanitizeHistory(newMessages);
      chatSession.current = createChatSession(systemInstruction, history);
  }, []); // No dependencies needed!

  // Stable Save Handler
  const handleSaveToOutlineStable = useCallback((type: 'global' | 'chapter' | 'volume', content: string) => {
      if (onSaveToOutlineRef.current) {
          onSaveToOutlineRef.current(type, content);
      }
  }, []);
  
  const handleStop = useCallback(() => {
      abortRef.current = true;
      setIsLoading(false);
  }, []);

  const handleSend = async (text: string, attachment?: {name: string, content: string}) => {
      if (!text.trim() && !attachment) return;
      
      abortRef.current = false;

      const msgId = Date.now().toString();
      const newUserMsg: ChatMessage = {
          id: msgId,
          role: 'user',
          text: text, // Default display text
          fullPrompt: text // Default prompt
      };

      // Handle file attachment logic
      if (attachment) {
          newUserMsg.text = text ? `${text}\n\n📎 **附件**: ${attachment.name}` : `📎 **附件**: ${attachment.name}`;
          newUserMsg.fullPrompt = `【系统检测到用户上传文件：${attachment.name}】\n--------------------------------------------------\n${attachment.content}\n--------------------------------------------------\n\n【用户请求】：${text || "请分析上述文件"}`;
      }

      const updatedMessages = [...messages, newUserMsg];
      setMessages(updatedMessages);
      onMessagesUpdate(updatedMessages);
      setIsLoading(true);

      try {
          if (!chatSession.current) {
               const history = sanitizeHistory(messages);
               chatSession.current = createChatSession(SYSTEM_INSTRUCTION, history);
          }

          let streamResult;
          const promptToSend = newUserMsg.fullPrompt || newUserMsg.text;

          try {
             streamResult = await chatSession.current.sendMessageStream({ message: promptToSend });
          } catch (err) {
             // Retry logic
             const history = sanitizeHistory(updatedMessages.slice(0, -1)); 
             chatSession.current = createChatSession(SYSTEM_INSTRUCTION, history);
             streamResult = await chatSession.current.sendMessageStream({ message: promptToSend });
          }

          const responseId = (Date.now() + 1).toString();
          let fullResponseText = "";
          
          const modelMsg: ChatMessage = {
              id: responseId,
              role: 'model',
              text: '',
              isThinking: activeTab === 'think'
          };
          
          setMessages(prev => [...prev, modelMsg]);

          let lastUpdateTime = 0;

          for await (const chunk of streamResult) {
               if (abortRef.current) break;

               const chunkText = (chunk as GenerateContentResponse).text; 
               if (chunkText) {
                   fullResponseText += chunkText;
                   const groundingMetadata = (chunk as GenerateContentResponse).candidates?.[0]?.groundingMetadata?.groundingChunks;
                   
                   // Throttled State Update: Update UI at most once every 100ms
                   const now = Date.now();
                   if (now - lastUpdateTime > 100) {
                        setMessages(prev => prev.map(m => 
                            m.id === responseId 
                            ? { ...m, text: fullResponseText, groundingMetadata: groundingMetadata || m.groundingMetadata } 
                            : m
                        ));
                        lastUpdateTime = now;
                   }
               }
          }
          
          // Final update to ensure everything is synced and thinking state is cleared
          const finalModelMsg = { ...modelMsg, text: fullResponseText, isThinking: false };
          
          // Update local state
          setMessages(prev => prev.map(m => m.id === responseId ? finalModelMsg : m));
          
          // Update parent state
          onMessagesUpdate([...updatedMessages, finalModelMsg]);

      } catch (error) {
          console.error("Chat Error:", error);
          const errorMsg: ChatMessage = {
              id: Date.now().toString(),
              role: 'model',
              text: "⚠️ 网络连接异常或AI服务暂时不可用，请稍后重试。"
          };
          setMessages(prev => [...prev, errorMsg]);
          onMessagesUpdate([...updatedMessages, errorMsg]);
      } finally {
          setIsLoading(false);
      }
  };

  const handleSendRef = useRef(handleSend);
  useEffect(() => { handleSendRef.current = handleSend; });

  const stableOnSend = useCallback((text: string, attachment?: {name: string, content: string}) => {
      handleSendRef.current(text, attachment);
  }, []);

  const handleAnalyzeImportedChat = async (importedMsgs: ChatMessage[]) => {
      if (importedMsgs.length === 0) return;
      
      setIsLoading(true);
      try {
          const chatText = importedMsgs.map(m => 
              `${m.role === 'user' ? '【用户】' : '【AI】'}: ${m.fullPrompt || m.text}`
          ).join('\n\n');

          const prompt = `
请分析以下导入的聊天记录，并生成一份摘要。
重点关注：
1. 用户之前的核心诉求是什么？
2. 之前讨论出的重要设定或剧情点有哪些？
3. 还有哪些未解决的问题？

【聊天记录】：
${chatText.slice(-10000)}
`;
          
          const result = await generateText(prompt, AIModelType.SMART);
          
          const analysisMsg: ChatMessage = {
              id: Date.now().toString(),
              role: 'model',
              text: `**📝 聊天记录分析报告**\n\n${result.text}`
          };

          const newMessages = [...importedMsgs, analysisMsg];
          setMessages(newMessages);
          onMessagesUpdate(newMessages);

          const history = sanitizeHistory(newMessages);
          chatSession.current = createChatSession(SYSTEM_INSTRUCTION, history);

      } catch (e) {
          console.error("Analysis failed", e);
      } finally {
          setIsLoading(false);
      }
  };

  const handleImportHistory = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
          try {
              const json = JSON.parse(ev.target?.result as string);
              if (Array.isArray(json) && json.every(m => m.role && (m.text || m.fullPrompt))) {
                  setMessages(json);
                  onMessagesUpdate(json);
                  
                  chatSession.current = null;
                  handleAnalyzeImportedChat(json);

                  alert("导入成功！正在为您分析历史记录...");
              } else {
                  alert("无效的聊天记录格式");
              }
          } catch (err) {
              alert("解析失败，文件可能已损坏");
          }
          if (historyFileInputRef.current) historyFileInputRef.current.value = '';
      };
      reader.readAsText(file);
  };

  const handleExportJSON = () => {
      const dataStr = JSON.stringify(messages, null, 2);
      const element = document.createElement("a");
      const file = new Blob([dataStr], {type: 'application/json'});
      element.href = URL.createObjectURL(file);
      element.download = `chat_history_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(element); 
      element.click();
      document.body.removeChild(element);
  };

  return (
    <div className={`flex flex-col h-full bg-paper ${fullScreen ? '' : 'border-l border-gray-200'}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center bg-white shrink-0 shadow-sm z-10">
          <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
              <button 
                  onClick={() => setActiveTab('chat')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'chat' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                  灵感助手
              </button>
              <button 
                  onClick={() => setActiveTab('think')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'think' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                  深度构思
              </button>
              <button 
                  onClick={() => setActiveTab('research')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'research' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                  资料检索
              </button>
          </div>

          <div className="flex gap-1">
              <input 
                  type="file" 
                  ref={historyFileInputRef} 
                  onChange={handleImportHistory} 
                  className="hidden" 
                  accept=".json"
              />
              <button 
                  onClick={() => historyFileInputRef.current?.click()}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-gray-50 rounded" 
                  title="导入聊天记录 (JSON)"
              >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              </button>
              <button 
                  onClick={handleExportJSON}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-gray-50 rounded" 
                  title="备份聊天记录 (JSON)"
              >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
              </button>
          </div>
      </div>

      {/* Message List */}
      <MessageList 
          messages={messages} 
          activeTab={activeTab} 
          onSaveToOutline={handleSaveToOutlineStable} // Use Stable Callback
          onDelete={handleDeleteMessage}              // Use Stable Callback
      />

      {/* Chat Input */}
      <ChatInput 
          activeTab={activeTab} 
          isLoading={isLoading} 
          onSend={stableOnSend}
          onStop={handleStop}
      />
    </div>
  );
};

export default ChatPanel;