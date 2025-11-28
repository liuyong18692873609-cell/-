

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Chapter, ChapterVersion, ChatMessage } from '../types';
import { AIModelType } from '../types';
import { generateText } from '../services/geminiService';
import { Spinner } from './ui/Spinner';

interface NovelEditorProps {
  activeChapter: Chapter | null;
  onUpdateChapter: (updatedChapter: Chapter) => void;
  isChatOpen: boolean;
  onToggleChat: () => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  hasUnsavedChanges: boolean;
  onAiGenerate: () => void;
  isGeneratingContent: boolean;
  selectedAiModel: AIModelType;
  onSelectAiModel: (model: AIModelType) => void;
  requestAiGeneration: (message: string, generationLogic: (useChatHistory: boolean) => Promise<void>) => void;
  chatHistory: ChatMessage[];
}

export interface NovelEditorHandle {
  save: () => void;
}

const NovelEditor = forwardRef<NovelEditorHandle, NovelEditorProps>(({ 
    activeChapter, 
    onUpdateChapter, 
    isChatOpen, 
    onToggleChat,
    setHasUnsavedChanges,
    hasUnsavedChanges,
    onAiGenerate,
    isGeneratingContent,
    selectedAiModel,
    onSelectAiModel,
    requestAiGeneration,
    chatHistory
}, ref) => {
  const [content, setContent] = useState(activeChapter?.content || '');
  const [title, setTitle] = useState(activeChapter?.title || '');
  const [isImproving, setIsImproving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update local content/title when activeChapter changes (including content updates from parent)
  useEffect(() => {
    if (activeChapter) {
      setContent(activeChapter.content);
      setTitle(activeChapter.title);
    }
  }, [activeChapter]); 

  // Keyboard shortcut for Save
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 's') {
              e.preventDefault();
              handleSave();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [content, title, activeChapter]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    if (!hasUnsavedChanges) {
        setHasUnsavedChanges(true);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    if (!hasUnsavedChanges) {
        setHasUnsavedChanges(true);
    }
  };

  const handleSave = () => {
      if (activeChapter) {
          const newVersion: ChapterVersion = {
              id: Date.now().toString(),
              timestamp: Date.now(),
              title: title,
              content: content,
              summary: activeChapter.chapterOutline
          };

          const updatedHistory = [newVersion, ...(activeChapter.history || [])].slice(0, 50);

          onUpdateChapter({ 
              ...activeChapter, 
              content, 
              title,
              history: updatedHistory
          });
          setHasUnsavedChanges(false);
      }
  };

  // Expose handleSave to parent via ref
  useImperativeHandle(ref, () => ({
    save: handleSave
  }), [handleSave]);

  const handleRestoreVersion = (version: ChapterVersion) => {
      if (window.confirm(`确定要恢复到 ${new Date(version.timestamp).toLocaleString()} 的版本吗？当前未保存的内容将会丢失。`)) {
          setContent(version.content);
          setTitle(version.title);
          setHasUnsavedChanges(true);
          setShowHistory(false);
      }
  };

  const handleFastImprove = async () => {
    if (!content.trim()) return;

    const selectionStart = textareaRef.current?.selectionStart || 0;
    const selectionEnd = textareaRef.current?.selectionEnd || 0;
    const selectedText = content.substring(selectionStart, selectionEnd);
    const actionText = selectedText ? "润色选中文字" : "续写当前章节";

    requestAiGeneration(
        `AI 快速${actionText}`,
        async (useChatHistory) => {
            setIsImproving(true);
            try {
                const chatHistoryContext = (useChatHistory && chatHistory?.length)
                    ? chatHistory.map(m => `${m.role === 'user' ? '作者' : 'AI'}: ${m.text}`).join('\n')
                    : undefined;

                const promptText = selectedText
                    ? `请润色以下文字，要求：
1. 增强画面感和氛围渲染。
2. 使用地道的中文成语或修辞，避免翻译腔。
3. 符合中国网文的阅读节奏，短句为主。
原文："${selectedText}"`
                    : `请根据上文逻辑，自然地续写一段情节（约200字）。
要求：符合中国网文风格，对话自然，不要有说教感。
上文：\n"${content.slice(-1000)}..."`;

                const result = await generateText(
                    promptText,
                    AIModelType.FAST,
                    "你是一位金牌中文小说编辑，擅长文字润色和续写，文风干练且有感染力。",
                    chatHistoryContext
                );

                if (selectedText) {
                    const newContent = content.substring(0, selectionStart) + result.text + content.substring(selectionEnd);
                    setContent(newContent);
                } else {
                    const newContent = content + "\n" + result.text;
                    setContent(newContent);
                }
                if (!hasUnsavedChanges) setHasUnsavedChanges(true);

            } catch (e) {
                alert("优化失败，请重试。");
            } finally {
                setIsImproving(false);
            }
        }
    );
  };


  if (!activeChapter) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 bg-paper font-serif">
        请选择或创建一个章节以开始写作。
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-paper relative shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white shrink-0 gap-4">
        
        <div className="flex-1 flex items-center gap-2 min-w-0">
            {hasUnsavedChanges && <span className="w-2 h-2 bg-red-500 rounded-full shrink-0" title="有未保存的修改"></span>}
            <input 
                type="text"
                value={title}
                onChange={handleTitleChange}
                className="font-serif text-xl font-bold text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none w-full transition-colors px-1"
                placeholder="章节标题"
            />
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
            
            <button
                onClick={() => setShowHistory(true)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                title="查看历史版本"
            >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </button>

            <div className="h-6 w-px bg-gray-200 mx-1"></div>

            <button
                onClick={handleSave}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors border ${
                    hasUnsavedChanges 
                    ? 'bg-white border-indigo-600 text-indigo-600 hover:bg-indigo-50 shadow-sm' 
                    : 'bg-transparent border-transparent text-gray-400 hover:bg-gray-100'
                }`}
                title="保存当前章节 (Ctrl+S)"
            >
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                {hasUnsavedChanges ? '保存' : '已保存'}
            </button>

            <div className="h-6 w-px bg-gray-200 mx-1"></div>

            <button
                onClick={handleFastImprove}
                disabled={isImproving || isGeneratingContent}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                title="使用 Gemini Flash Lite 进行极速润色或续写"
            >
                {isImproving ? <Spinner /> : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                )}
                {textareaRef.current?.selectionStart !== textareaRef.current?.selectionEnd ? "润色" : "续写"}
            </button>

            <div className="flex items-stretch rounded-md shadow-sm">
                <select
                    value={selectedAiModel}
                    onChange={(e) => onSelectAiModel(e.target.value as AIModelType)}
                    disabled={isImproving || isGeneratingContent}
                    className="px-2 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-l-md border-r border-purple-200 focus:ring-0 focus:outline-none focus:border-purple-300 transition-colors cursor-pointer disabled:opacity-50"
                    title="选择生成模型"
                >
                    <option value={AIModelType.SMART}>质量优先</option>
                    <option value={AIModelType.FAST}>速度优先</option>
                    <option value={AIModelType.THINKING}>深度思考</option>
                    <option value={AIModelType.RESEARCH}>联网搜索</option>
                </select>
                <button
                    onClick={onAiGenerate}
                    disabled={isImproving || isGeneratingContent}
                    className="flex items-center gap-2 pl-2 pr-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-r-md transition-colors disabled:opacity-50"
                    title="严格按照大纲设定，智能生成本章正文"
                >
                    {isGeneratingContent ? <Spinner /> : (
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
                    )}
                    智能生成
                </button>
            </div>


            <div className="h-6 w-px bg-gray-200 mx-1"></div>

            <button 
                onClick={onToggleChat}
                className={`p-2 rounded-md transition-colors ${isChatOpen ? 'bg-gray-100 text-gray-600' : 'text-gray-400 hover:bg-gray-50'}`}
                title={isChatOpen ? "收起助手" : "展开助手"}
            >
                {isChatOpen ? (
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg>
                ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path></svg>
                )}
            </button>
        </div>
      </div>
      
      <textarea
        ref={textareaRef}
        className="flex-1 w-full p-8 resize-none focus:outline-none font-serif text-lg leading-relaxed text-ink bg-paper placeholder-gray-300"
        placeholder="开始您的创作之旅..."
        value={content}
        onChange={handleContentChange}
      />
      <div className="absolute bottom-2 right-4 text-xs text-gray-400 bg-paper/80 px-2 py-1 rounded">
        {content.length} 字
      </div>

      {showHistory && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-8">
              <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl flex flex-col max-h-full">
                  <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2">
                          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          版本历史
                      </h3>
                      <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      </button>
                  </div>
                  <div className="overflow-y-auto p-6 space-y-4 flex-1">
                      {(!activeChapter.history || activeChapter.history.length === 0) ? (
                          <p className="text-center text-gray-400 py-10">暂无历史版本记录</p>
                      ) : (
                          activeChapter.history.map((version) => (
                              <div key={version.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors flex justify-between items-center group">
                                  <div>
                                      <p className="font-medium text-gray-800">{new Date(version.timestamp).toLocaleString()}</p>
                                      <p className="text-xs text-gray-500 mt-1">字数: {version.content.length} · 标题: {version.title}</p>
                                  </div>
                                  <button 
                                    onClick={() => handleRestoreVersion(version)}
                                    className="text-indigo-600 text-sm font-medium px-3 py-1.5 border border-indigo-200 rounded hover:bg-indigo-600 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                  >
                                      恢复此版本
                                  </button>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
});

export default NovelEditor;
