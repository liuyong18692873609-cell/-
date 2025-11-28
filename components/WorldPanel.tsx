
import React, { useState, useEffect } from 'react';
import { Character, PlotCard, Novel } from '../types';
import { Spinner } from './ui/Spinner';
import { generateWorldSettings } from '../services/geminiService';

interface WorldPanelProps {
  novel: Novel;
  onAddCharacter: (char: Omit<Character, 'id'>) => void;
  onUpdateCharacter: (id: string, char: Omit<Character, 'id'>) => void;
  onDeleteCharacter: (id: string, skipConfirm?: boolean) => void;
  onAddPlotCard: (card: Omit<PlotCard, 'id'>) => void;
  onUpdatePlotCard: (id: string, card: Omit<PlotCard, 'id'>) => void;
  onDeletePlotCard: (id: string, skipConfirm?: boolean) => void;
  onGenerateChapter: (card: PlotCard) => void;
  onBatchUpdateSettings: (settings: Partial<{ characters: Character[], plots: PlotCard[] }>) => void;
  isGenerating: boolean; // For chapter generation
  requestAiGeneration: (message: string, generationLogic: (useChatHistory: boolean) => Promise<void>) => void;
}

const WorldPanel: React.FC<WorldPanelProps> = ({ 
  novel, 
  onAddCharacter, 
  onUpdateCharacter,
  onDeleteCharacter,
  onAddPlotCard, 
  onUpdatePlotCard,
  onDeletePlotCard,
  onGenerateChapter,
  onBatchUpdateSettings,
  isGenerating,
  requestAiGeneration
}) => {
  const [isGeneratingChars, setIsGeneratingChars] = useState(false);
  const [isGeneratingPlots, setIsGeneratingPlots] = useState(false);
  const [showAddChar, setShowAddChar] = useState(false);
  const [showAddPlot, setShowAddPlot] = useState(false);

  // Selection State for Batch Operations
  const [selectedCharIds, setSelectedCharIds] = useState<string[]>([]);
  const [selectedPlotIds, setSelectedPlotIds] = useState<string[]>([]);

  // Editing State
  const [editingCharId, setEditingCharId] = useState<string | null>(null);
  const [editingPlotId, setEditingPlotId] = useState<string | null>(null);

  // Character Form State
  const [charName, setCharName] = useState('');
  const [charPersonality, setCharPersonality] = useState('');
  const [charAbilities, setCharAbilities] = useState('');
  const [charBackground, setCharBackground] = useState('');

  // Plot Form State
  const [plotTitle, setPlotTitle] = useState('');
  const [plotSummary, setPlotSummary] = useState('');
  const [plotStyle, setPlotStyle] = useState('');
  const [selectedCharIdsForPlot, setSelectedCharIdsForPlot] = useState<string[]>([]);

  // Sync selection with props to prevent stale deleted items remaining selected
  useEffect(() => {
    if (novel.characters) {
      const currentIds = new Set(novel.characters.map(c => c.id));
      setSelectedCharIds(prev => prev.filter(id => currentIds.has(id)));
    }
  }, [novel.characters]);

  useEffect(() => {
    if (novel.plotCards) {
      const currentIds = new Set(novel.plotCards.map(c => c.id));
      setSelectedPlotIds(prev => prev.filter(id => currentIds.has(id)));
    }
  }, [novel.plotCards]);


  // --- AI Settings Generation ---
  const handleAiGenerate = async (type: 'characters' | 'plots') => {
    if (!novel) return;
    const typeText = type === 'characters' ? '人物' : '情节';

    requestAiGeneration(
      `智能生成${typeText}卡`,
      async (useChatHistory) => {
        if (type === 'characters') setIsGeneratingChars(true);
        if (type === 'plots') setIsGeneratingPlots(true);

        try {
            const result = await generateWorldSettings(novel, type, useChatHistory);
            onBatchUpdateSettings(result);
        } catch (e) {
            console.error(`Failed to generate world settings for ${type}`, e);
            alert(`智能生成${typeText}失败，请检查网络或稍后重试。AI返回的数据可能不符合预期格式。`);
        } finally {
            if (type === 'characters') setIsGeneratingChars(false);
            if (type === 'plots') setIsGeneratingPlots(false);
        }
      }
    );
  };

  // --- Character Handlers ---
  const handleStartAddCharacter = () => {
    setEditingCharId(null);
    setCharName('');
    setCharPersonality('');
    setCharAbilities('');
    setCharBackground('');
    setShowAddChar(true);
  };

  const handleStartEditCharacter = (e: React.MouseEvent, char: Character) => {
    e.stopPropagation();
    setEditingCharId(char.id);
    setCharName(char.name);
    setCharPersonality(char.personality);
    setCharAbilities(char.abilities);
    setCharBackground(char.background);
    setShowAddChar(true);
  };

  const handleSaveCharacter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!charName.trim()) return;
    const charData = {
      name: charName,
      personality: charPersonality,
      abilities: charAbilities,
      background: charBackground
    };

    if (editingCharId) {
      onUpdateCharacter(editingCharId, charData);
    } else {
      onAddCharacter(charData);
    }

    setShowAddChar(false);
    setEditingCharId(null);
  };

  const handleDeleteCharClick = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      onDeleteCharacter(id);
  };

  const toggleCharSelection = (id: string) => {
      setSelectedCharIds(prev => 
          prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
  };

  const handleBatchDeleteCharacters = () => {
      if (selectedCharIds.length === 0) return;
      if (window.confirm(`确定要删除选中的 ${selectedCharIds.length} 个人物卡吗？`)) {
          selectedCharIds.forEach(id => onDeleteCharacter(id, true));
          // Selection clearing is handled by useEffect
      }
  };

  // --- Plot Card Handlers ---
  const handleStartAddPlot = () => {
    setEditingPlotId(null);
    setPlotTitle('');
    setPlotSummary('');
    setPlotStyle('');
    setSelectedCharIdsForPlot([]);
    setShowAddPlot(true);
  };

  const handleStartEditPlot = (e: React.MouseEvent, card: PlotCard) => {
    e.stopPropagation();
    setEditingPlotId(card.id);
    setPlotTitle(card.title);
    setPlotSummary(card.summary);
    setPlotStyle(card.style);
    setSelectedCharIdsForPlot(card.characterIds);
    setShowAddPlot(true);
  };

  const handleDeletePlotClick = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      onDeletePlotCard(id);
  };

  const handleSavePlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plotTitle.trim()) return;
    const plotData = {
      title: plotTitle,
      summary: plotSummary,
      style: plotStyle || '标准网文风格',
      characterIds: selectedCharIdsForPlot
    };

    if (editingPlotId) {
      onUpdatePlotCard(editingPlotId, plotData);
    } else {
      onAddPlotCard(plotData);
    }

    setShowAddPlot(false);
    setEditingPlotId(null);
  };

  const togglePlotSelection = (id: string) => {
      setSelectedPlotIds(prev => 
          prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
  };

  const handleBatchDeletePlots = () => {
      if (selectedPlotIds.length === 0) return;
      if (window.confirm(`确定要删除选中的 ${selectedPlotIds.length} 个情节卡吗？`)) {
          selectedPlotIds.forEach(id => onDeletePlotCard(id, true));
          // Selection clearing is handled by useEffect
      }
  };


  return (
    <div className="h-full bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center shrink-0">
        <h2 className="text-2xl font-serif font-bold text-gray-800">世界设定</h2>
      </div>
      
      {/* Split View Container */}
      <div className="flex-1 flex flex-col overflow-hidden p-6 gap-6">
        
        {/* Top: Characters Panel */}
        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 p-5 min-h-0">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <h3 className="font-bold text-lg text-gray-700 border-l-4 border-indigo-500 pl-3">人物卡</h3>
            <div className="flex items-center gap-2">
                {selectedCharIds.length > 0 ? (
                    <button
                        onClick={handleBatchDeleteCharacters}
                        className="flex items-center gap-1.5 px-3 py-1 text-xs bg-red-50 text-red-600 rounded-md hover:bg-red-100 border border-red-200 transition-colors"
                    >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        删除选中 ({selectedCharIds.length})
                    </button>
                ) : (
                    <>
                        <button
                            onClick={() => handleAiGenerate('characters')}
                            disabled={isGeneratingChars}
                            className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 border border-indigo-200 transition-colors disabled:opacity-60"
                        >
                            {isGeneratingChars ? <Spinner className="w-3 h-3"/> : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>}
                            AI 智能生成
                        </button>
                        <button onClick={handleStartAddCharacter} className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-all flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                        添加
                        </button>
                    </>
                )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
            {showAddChar && (
              <div className="bg-indigo-50 p-3 rounded border border-indigo-200 text-sm animate-in fade-in slide-in-from-top-2">
                <h3 className="text-indigo-800 font-bold mb-2 text-sm">{editingCharId ? '编辑人物' : '新建人物'}</h3>
                <form onSubmit={handleSaveCharacter} className="space-y-2">
                  <input className="w-full bg-white border border-gray-300 rounded p-2 text-gray-800 placeholder-gray-400 focus:border-indigo-500 outline-none text-sm" placeholder="人物名称" value={charName} onChange={e => setCharName(e.target.value)} required autoFocus/>
                  <textarea className="w-full bg-white border border-gray-300 rounded p-2 text-gray-800 placeholder-gray-400 focus:border-indigo-500 outline-none resize-none h-16 text-sm" placeholder="性格特点" value={charPersonality} onChange={e => setCharPersonality(e.target.value)} />
                  <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={() => setShowAddChar(false)} className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-md">取消</button>
                    <button type="submit" className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-md hover:bg-indigo-500">保存</button>
                  </div>
                </form>
              </div>
            )}
            {(novel.characters || []).map(char => (
              <div key={char.id} className="bg-gray-50/50 border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-all group relative flex items-start gap-3">
                <div className="pt-1">
                     <input 
                        type="checkbox" 
                        checked={selectedCharIds.includes(char.id)}
                        onChange={() => toggleCharSelection(char.id)}
                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300 cursor-pointer"
                     />
                </div>
                <div className="flex-1">
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button onClick={(e) => handleStartEditCharacter(e, char)} className="text-gray-400 hover:text-indigo-600 p-1.5 rounded-full hover:bg-gray-200" title="编辑"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                    <button onClick={(e) => handleDeleteCharClick(e, char.id)} className="text-gray-400 hover:text-red-600 p-1.5 rounded-full hover:bg-gray-200" title="删除"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                    </div>
                    <h4 className="text-indigo-700 font-bold pr-16">{char.name}</h4>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{char.personality || '暂无性格描述'}</p>
                </div>
              </div>
            ))}
            {(!novel.characters || novel.characters.length === 0) && !showAddChar && <div className="text-center text-sm text-gray-400 py-10">暂无人物设定</div>}
          </div>
        </div>

        {/* Bottom: Plots Panel */}
        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 p-5 min-h-0">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <h3 className="font-bold text-lg text-gray-700 border-l-4 border-purple-500 pl-3">情节卡</h3>
            <div className="flex items-center gap-2">
                {selectedPlotIds.length > 0 ? (
                    <button
                        onClick={handleBatchDeletePlots}
                        className="flex items-center gap-1.5 px-3 py-1 text-xs bg-red-50 text-red-600 rounded-md hover:bg-red-100 border border-red-200 transition-colors"
                    >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        删除选中 ({selectedPlotIds.length})
                    </button>
                ) : (
                    <>
                        <button
                            onClick={() => handleAiGenerate('plots')}
                            disabled={isGeneratingPlots}
                            className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-purple-50 text-purple-600 rounded-md hover:bg-purple-100 border border-purple-200 transition-colors disabled:opacity-60"
                        >
                            {isGeneratingPlots ? <Spinner className="w-3 h-3"/> : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>}
                            AI 智能生成
                        </button>
                        <button onClick={handleStartAddPlot} className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-all flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                        添加
                        </button>
                    </>
                )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
             {showAddPlot && (
              <div className="bg-purple-50 p-3 rounded border border-purple-200 text-sm animate-in fade-in slide-in-from-top-2">
                <h3 className="text-purple-800 font-bold mb-2 text-sm">{editingPlotId ? '编辑情节卡' : '新建情节卡'}</h3>
                <form onSubmit={handleSavePlot} className="space-y-2">
                  <input className="w-full bg-white border border-gray-300 rounded p-2 text-gray-800 placeholder-gray-400 focus:border-purple-500 outline-none text-sm" placeholder="情节标题" value={plotTitle} onChange={e => setPlotTitle(e.target.value)} required autoFocus/>
                  <textarea className="w-full bg-white border border-gray-300 rounded p-2 text-gray-800 placeholder-gray-400 focus:border-purple-500 outline-none resize-none h-20 text-sm" placeholder="剧情概括" value={plotSummary} onChange={e => setPlotSummary(e.target.value)} />
                  <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={() => setShowAddPlot(false)} className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-md">取消</button>
                    <button type="submit" className="px-3 py-1 text-xs bg-purple-600 text-white rounded-md hover:bg-purple-500">保存</button>
                  </div>
                </form>
              </div>
            )}
            {(novel.plotCards || []).map(card => (
              <div key={card.id} className="bg-gray-50/50 border border-gray-200 rounded-lg p-3 hover:border-purple-300 transition-all group relative flex items-start gap-3">
                <div className="pt-1">
                     <input 
                        type="checkbox" 
                        checked={selectedPlotIds.includes(card.id)}
                        onChange={() => togglePlotSelection(card.id)}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 border-gray-300 cursor-pointer"
                     />
                </div>
                <div className="flex-1">
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button onClick={(e) => handleStartEditPlot(e, card)} className="text-gray-400 hover:text-purple-600 p-1.5 rounded-full hover:bg-gray-200" title="编辑"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                    <button onClick={(e) => handleDeletePlotClick(e, card.id)} className="text-gray-400 hover:text-red-600 p-1.5 rounded-full hover:bg-gray-200" title="删除"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                    </div>
                    <h4 className="text-purple-700 font-bold pr-16">{card.title}</h4>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{card.summary || '暂无剧情概括'}</p>
                    <button 
                        onClick={() => onGenerateChapter(card)}
                        disabled={isGenerating}
                        className="mt-3 w-full py-1.5 bg-purple-50 border border-purple-200 text-purple-600 text-xs rounded-md hover:bg-purple-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isGenerating ? <Spinner className="w-3 h-3" /> : '生成章节'}
                    </button>
                </div>
              </div>
            ))}
            {(!novel.plotCards || novel.plotCards.length === 0) && !showAddPlot && <div className="text-center text-sm text-gray-400 py-10">暂无情节卡</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorldPanel;
