
import React, { useMemo } from 'react';
import { Novel } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

interface StatisticsPanelProps {
  novel: Novel;
}

const COLORS = ['#4f46e5', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0284c7', '#9333ea'];

const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ novel }) => {
  const chapterData = useMemo(() => {
      return novel.chapters.map(c => ({
        name: c.title.replace(/^(第.+?章).*/, '$1'), // Simplify title for axis
        fullTitle: c.title,
        wordCount: c.content.length,
      }));
  }, [novel.chapters]);

  const totalWords = chapterData.reduce((acc, cur) => acc + cur.wordCount, 0);

  const characterData = useMemo(() => {
    if (!novel.characters || novel.characters.length === 0) return [];
    const fullText = novel.chapters.map(c => c.content).join('\n');
    return novel.characters.map(char => {
        const escapedName = char.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedName, 'gi');
        const count = (fullText.match(regex) || []).length;
        return { name: char.name, value: count };
    })
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10); // Top 10
  }, [novel]);

  return (
    <div className="h-full bg-gray-50 flex flex-col overflow-hidden font-sans">
       <div className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center shrink-0">
            <h2 className="text-2xl font-serif font-bold text-gray-800">数据统计</h2>
            <div className="flex items-center gap-6">
                <div className="text-sm text-gray-500">
                    总字数 <span className="font-bold text-indigo-600 text-xl ml-1">{totalWords}</span>
                </div>
                <div className="text-sm text-gray-500">
                    总章节 <span className="font-bold text-gray-700 text-xl ml-1">{novel.chapters.length}</span>
                </div>
            </div>
       </div>

       <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
           <div className="max-w-6xl mx-auto space-y-6">
               
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                   {/* Chapter Word Count */}
                   <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
                       <h3 className="text-base font-bold text-gray-800 mb-6 border-l-4 border-indigo-500 pl-3">章节字数走势</h3>
                       <div className="h-[350px] w-full">
                           <ResponsiveContainer width="100%" height="100%">
                               <BarChart data={chapterData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                   <XAxis 
                                        dataKey="name" 
                                        tick={{fontSize: 11, fill: '#6b7280'}} 
                                        interval={0} 
                                        angle={-15} 
                                        textAnchor="end" 
                                        height={60} 
                                        tickMargin={10}
                                   />
                                   <YAxis tick={{fontSize: 11, fill: '#6b7280'}} />
                                   <Tooltip 
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        cursor={{ fill: '#f9fafb' }}
                                        labelStyle={{ color: '#374151', fontWeight: 'bold', marginBottom: '0.5rem' }}
                                   />
                                   <Bar dataKey="wordCount" name="字数" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={30} />
                               </BarChart>
                           </ResponsiveContainer>
                       </div>
                   </div>

                   {/* Character Mentions */}
                   <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                       <h3 className="text-base font-bold text-gray-800 mb-6 border-l-4 border-purple-500 pl-3">角色登场热度 (Top 10)</h3>
                       {characterData.length > 0 ? (
                           <div className="h-[300px] w-full flex items-center justify-center">
                               <ResponsiveContainer width="100%" height="100%">
                                   <PieChart>
                                       <Pie
                                           data={characterData}
                                           cx="50%"
                                           cy="50%"
                                           innerRadius={60}
                                           outerRadius={100}
                                           paddingAngle={5}
                                           dataKey="value"
                                       >
                                           {characterData.map((entry, index) => (
                                               <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                           ))}
                                       </Pie>
                                       <Tooltip />
                                       <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                                   </PieChart>
                               </ResponsiveContainer>
                           </div>
                       ) : (
                           <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">
                               暂无角色数据，请先在“设定”中添加人物。
                           </div>
                       )}
                   </div>

                   {/* Summary Stats Card */}
                   <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
                        <h3 className="text-base font-bold text-gray-800 mb-6 border-l-4 border-emerald-500 pl-3">创作概览</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span className="text-gray-500 text-sm">平均章节字数</span>
                                <span className="font-mono font-bold text-gray-800">
                                    {chapterData.length > 0 ? Math.round(totalWords / chapterData.length) : 0}
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span className="text-gray-500 text-sm">设定集规模</span>
                                <span className="font-mono font-bold text-gray-800">
                                    {novel.characters?.length || 0} 人 / {novel.plotCards?.length || 0} 卡
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span className="text-gray-500 text-sm">创建时间</span>
                                <span className="font-mono font-bold text-gray-800">
                                    {new Date(novel.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                   </div>
               </div>

           </div>
       </div>
    </div>
  );
};

export default StatisticsPanel;
