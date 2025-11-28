
import React, { useState, useEffect, useMemo } from 'react';
import { Novel, Chapter, Volume } from '../types';
import { generateNovelOutline, generateChapterOutline, generateVolumeOutline } from '../services/geminiService';
import { Spinner } from './ui/Spinner';

interface OutlineManagerProps {
  novel: Novel;
  onUpdateNovel: (updatedNovel: Novel) => void;
  onUpdateChapter: (updatedChapter: Chapter) => void;
  requestAiGeneration: (message: string, generationLogic: (useChatHistory: boolean) => Promise<void>) => void;
  onNewVolume: () => void;
  onNewChapter: (volumeId: string) => void;
}

const OutlineManager: React.FC<OutlineManagerProps> = ({ novel, onUpdateNovel, onUpdateChapter, requestAiGeneration, onNewVolume, onNewChapter }) => {
  const [activeTab, setActiveTab] = useState<'global' | 'volume' | 'chapters'>('chapters');
  const [isGenerating, setIsGenerating] = useState<string | boolean>(false); // string for volumeId, bool for global
  const [expandedChapterId, setExpandedChapterId] = useState<string | null>(null);
  const [expandedVolumeId, setExpandedVolumeId] = useState<string | null>(novel.volumes?.[0]?.id || null);
  
  const [globalOutline, setGlobalOutline] = useState(novel.outline || '');
  const [volumes, setVolumes] = useState<Volume[]>(() => JSON.parse(JSON.stringify(novel.volumes || [])));

  useEffect(() => {
    setGlobalOutline(novel.outline || '');
  }, [novel.outline]);

  useEffect(() => {
    setVolumes(JSON.parse(JSON.stringify(novel.volumes || [])));
  }, [novel.volumes]);

  const handleSaveGlobal = () => {
      onUpdateNovel({ ...novel, outline: globalOutline });
      alert("全书大纲已保存！");
  };

  const handleSaveVolumes = () => {
      onUpdateNovel({ ...novel, volumes });
      alert("分卷大纲已保存！");
  };

  const handleGenerateGlobal = async () => {
    requestAiGeneration(
        `为《${novel.title}》生成全书大纲`,
        async (useChatHistory) => {
            setIsGenerating(true);
            try {
                const chatContext = useChatHistory && novel.chatHistory
                    ? novel.chatHistory.map(m => `${m.role === 'user' ? '【作者】' : '【AI助手】'}: ${m.text}`).join('\n')
                    : undefined;

                const result = await generateNovelOutline(
                    novel.title,
                    novel.genre,
                    novel.description || '',
                    novel.characters || [],
                    chatContext
                );
                setGlobalOutline(result);
            } catch (e) {
                alert("生成失败，请重试");
            } finally {
                setIsGenerating(false);
            }
        }
    );
  };

  const handleGenerateVolume = async (volumeId: string, volumeTitle: string) => {
    requestAiGeneration(
        `为分卷《${volumeTitle}》生成大纲`,
        async (useChatHistory) => {
            setIsGenerating(volumeId);
            try {
                 const chatContext = useChatHistory && novel.chatHistory
                    ? novel.chatHistory.map(m => `${m.role === 'user' ? '【作者】' : '【AI助手】'}: ${m.text}`).join('\n')
                    : undefined;
                
                const result = await generateVolumeOutline(
                    novel.title,
                    novel.outline || novel.description || '',
                    novel.characters || [],
                    chatContext
                );
                setVolumes(vols => vols.map(v => v.id === volumeId ? {...v, outline: result} : v));
            } catch (e) {
                alert("生成分卷大纲失败，请重试");
            } finally {
                setIsGenerating(false);
            }
        }
    );
  };

  const handleDeleteVolume = (volumeId: string) => {
      if (window.confirm("确定要删除此分卷及其大纲吗？（该分卷下的章节将变为“未分类”）")) {
          const newVolumes = volumes.filter(v => v.id !== volumeId);
          setVolumes(newVolumes);
          onUpdateNovel({ ...novel, volumes: newVolumes });
      }
  };

  const handleVolumeChange = (volumeId: string, field: 'title' | 'outline', value: string) => {
      setVolumes(vols => vols.map(v => v.id === volumeId ? {...v, [field]: value} : v));
  };


  const handleGenerateChapterOutline = async (chapter: Chapter) => {
    requestAiGeneration(
        `为章节《${chapter.title}》生成细纲`,
        async (useChatHistory) => {
            setIsGenerating(chapter.id);
            try {
                const prevIndex = novel.chapters.findIndex(c => c.id === chapter.id) - 1;
                const prevChapter = prevIndex >= 0 ? novel.chapters[prevIndex] : null;
                const prevSummary = prevChapter ? (prevChapter.chapterOutline || prevChapter.content.slice(0, 500)) : "无前文";
                
                const parentVolume = novel.volumes?.find(v => v.id === chapter.volumeId);
                const volumeOutlineForPrompt = parentVolume ? parentVolume.outline : '';

                const chatContext = useChatHistory && novel.chatHistory
                    ? novel.chatHistory.map(m => `${m.role === 'user' ? '【作者】' : '【AI助手】'}: ${m.text}`).join('\n')
                    : undefined;

                const result = await generateChapterOutline(
                    chapter.title,
                    globalOutline || novel.description || '',
                    volumeOutlineForPrompt,
                    prevSummary,
                    chatContext
                );
                
                onUpdateChapter({ ...chapter, chapterOutline: result });
            } catch (e) {
                alert("生成失败");
            } finally {
                setIsGenerating(false);
            }
        }
    );
  };

  const handleChapterOutlineChange = (chapter: Chapter, val: string) => {
      onUpdateChapter({ ...chapter, chapterOutline: val });
  };
  
  const chaptersByVolume = useMemo(() => {
    const grouped: { [key: string]: Chapter[] } = { unassigned: [] };
    (novel.volumes || []).forEach(v => {
      grouped[v.id] = [];
    });

    novel.chapters.forEach(chapter => {
      const volId = chapter.volumeId;
      if (volId && grouped[volId]) {
        grouped[volId].push(chapter);
      } else {
        grouped.unassigned.push(chapter);
      }
    });
    return grouped;
  }, [novel.chapters, novel.volumes]);

  return (
    <div className="h-full bg-gray-50 flex flex-col">
       <div className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
            <h2 className="text-2xl font-serif font-bold text-gray-800">大纲策划</h2>
            <div className="flex bg-gray-100 p-1 rounded-lg">
                <button 
                    onClick={() => setActiveTab('global')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'global' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    全书大纲
                </button>
                <button 
                    onClick={() => setActiveTab('volume')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'volume' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    分卷大纲
                </button>
                <button 
                    onClick={() => setActiveTab('chapters')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'chapters' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    分章细纲
                </button>
            </div>
       </div>

       <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full">
           {activeTab === 'global' && (
               <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-[500px] flex flex-col">
                   <div className="flex justify-between items-center mb-4">
                       <h3 className="font-bold text-lg text-gray-700">全书故事结构</h3>
                       <div className="flex gap-3">
                           <button
                                onClick={handleGenerateGlobal}
                                disabled={!!isGenerating}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-50 text-purple-600 rounded hover:bg-purple-100 border border-purple-200 transition-colors"
                           >
                               {isGenerating === true ? <Spinner /> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>}
                               AI 智能生成
                           </button>
                           <button
                                onClick={handleSaveGlobal}
                                className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors shadow-sm"
                           >
                               保存大纲
                           </button>
                       </div>
                   </div>
                   <textarea
                        value={globalOutline}
                        onChange={(e) => setGlobalOutline(e.target.value)}
                        placeholder="在此规划您的全书大纲..."
                        className="flex-1 w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-base leading-relaxed text-gray-800 bg-gray-50 font-sans"
                   />
               </div>
           )}
           
           {activeTab === 'volume' && (
               <div className="space-y-6">
                 {volumes.map(vol => (
                   <div key={vol.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
                       <div className="flex justify-between items-center mb-4">
                           <input 
                              value={vol.title}
                              onChange={(e) => handleVolumeChange(vol.id, 'title', e.target.value)}
                              className="font-bold text-lg text-gray-700 border-b-2 border-transparent focus:border-blue-500 outline-none"
                           />
                           <div className="flex gap-3">
                              <button onClick={() => handleDeleteVolume(vol.id)} className="text-gray-400 hover:text-red-500 text-xs">删除</button>
                               <button
                                   onClick={() => handleGenerateVolume(vol.id, vol.title)}
                                   disabled={!!isGenerating}
                                   className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 border border-blue-200 transition-colors"
                               >
                                   {isGenerating === vol.id ? <Spinner /> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>}
                                   AI 智能生成
                               </button>
                           </div>
                       </div>
                       <textarea
                            value={vol.outline}
                            onChange={(e) => handleVolumeChange(vol.id, 'outline', e.target.value)}
                            placeholder={`在此规划《${vol.title}》的起承转合...`}
                            className="h-48 w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-base leading-relaxed text-gray-800 bg-gray-50 font-sans"
                       />
                   </div>
                 ))}
                  <div className="flex justify-center gap-4 mt-6">
                      <button onClick={onNewVolume} className="px-4 py-2 text-sm bg-white text-gray-700 rounded-lg hover:bg-gray-200 transition-colors shadow-sm border border-gray-300">新增分卷</button>
                      <button onClick={handleSaveVolumes} className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md">保存所有修改</button>
                  </div>
               </div>
           )}

           {activeTab === 'chapters' && (
               <div className="space-y-4">
                  {(novel.volumes || []).map(volume => (
                    <div key={volume.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
                      <div className="px-6 py-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setExpandedVolumeId(expandedVolumeId === volume.id ? null : volume.id)}>
                        <div className="flex items-center gap-3">
                          <span className={`transform transition-transform ${expandedVolumeId === volume.id ? 'rotate-90' : ''}`}><svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg></span>
                          <h3 className="font-bold text-lg text-gray-800">{volume.title}</h3>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); onNewChapter(volume.id); }} className="px-3 py-1 text-xs bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 transition-colors">添加章节至本卷</button>
                      </div>

                      {expandedVolumeId === volume.id && (
                        <div className="border-t border-gray-100 p-4 space-y-2">
                          {chaptersByVolume[volume.id]?.length > 0 ? chaptersByVolume[volume.id].map(chapter => (
                              <div key={chapter.id} className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                                <div className="px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-100" onClick={() => setExpandedChapterId(expandedChapterId === chapter.id ? null : chapter.id)}>
                                    <div className="flex items-center gap-3">
                                        <span className={`transform transition-transform duration-200 ${expandedChapterId === chapter.id ? 'rotate-90' : 'rotate-0'}`}><svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg></span>
                                        <span className="font-medium text-sm text-gray-800">{chapter.title}</span>
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${chapter.chapterOutline ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{chapter.chapterOutline ? '已规划' : '未规划'}</span>
                                </div>
                                {expandedChapterId === chapter.id && (
                                    <div className="px-4 pb-4 border-t border-gray-200 bg-white">
                                        <div className="flex justify-between items-center my-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase">本章细纲 (Beat Sheet)</label>
                                            <button onClick={() => handleGenerateChapterOutline(chapter)} disabled={!!isGenerating} className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1 disabled:opacity-50"><Spinner className={`w-3 h-3 ${isGenerating === chapter.id ? 'block' : 'hidden'}`} /> AI 生成</button>
                                        </div>
                                        <textarea value={chapter.chapterOutline || ''} onChange={(e) => handleChapterOutlineChange(chapter, e.target.value)} className="w-full h-32 p-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-indigo-500" placeholder="本章发生的关键事件、冲突与转折..."/>
                                    </div>
                                )}
                              </div>
                          )) : <p className="text-center text-sm text-gray-400 py-4">本卷暂无章节</p>}
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="flex justify-center mt-6">
                    <button onClick={onNewVolume} className="px-4 py-2 text-sm bg-white text-gray-700 rounded-lg hover:bg-gray-200 transition-colors shadow-sm border border-gray-300">新增分卷</button>
                  </div>
               </div>
           )}
       </div>
    </div>
  );
};

export default OutlineManager;