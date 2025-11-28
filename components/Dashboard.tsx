
import React, { useState, useRef } from 'react';
import { Novel } from '../types';

interface DashboardProps {
  novels: Novel[];
  onCreateNovel: (novel: Omit<Novel, 'id' | 'chapters' | 'createdAt'>) => void;
  onSelectNovel: (novelId: string) => void;
  onImportNovel: (file: File) => void;
  onExportNovel: (novelId: string) => void;
  onDeleteNovel: (novelId: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ novels, onCreateNovel, onSelectNovel, onImportNovel, onExportNovel, onDeleteNovel }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newGenre, setNewGenre] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    
    onCreateNovel({
      title: newTitle,
      author: newAuthor || '佚名',
      genre: newGenre || '未分类',
      description: newDesc,
      characters: [],
      plotCards: [],
    });
    
    // Reset form
    setNewTitle('');
    setNewAuthor('');
    setNewGenre('');
    setNewDesc('');
    setIsCreating(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImportNovel(e.target.files[0]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2 rounded-lg">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
            </div>
            <div>
                <h1 className="text-xl font-serif font-bold text-gray-900 tracking-wide">梦想写作</h1>
                <p className="text-xs text-gray-500">AI 驱动的专业创作平台</p>
            </div>
          </div>
          <div className="flex gap-3">
             <input 
               type="file" 
               ref={fileInputRef} 
               onChange={handleFileChange} 
               accept=".json" 
               className="hidden" 
             />
             
             <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-white text-gray-600 border border-gray-300 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2 text-sm"
             >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                导入
             </button>

             <button
                onClick={() => setIsCreating(true)}
                className="bg-indigo-600 text-white px-3 py-2 rounded-md hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2 text-sm font-medium"
             >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                新建作品
             </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Creating Form Modal */}
        {isCreating && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden transform scale-100">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">创建新书</h3>
                <button onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">书名 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
                    placeholder="请输入书名"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">作者</label>
                    <input
                      type="text"
                      value={newAuthor}
                      onChange={(e) => setNewAuthor(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
                      placeholder="笔名"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                    <input
                      type="text"
                      value={newGenre}
                      onChange={(e) => setNewGenre(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
                      placeholder="例如：玄幻"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">简介</label>
                  <textarea
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none h-24 transition-shadow"
                    placeholder="一句话描述你的故事..."
                  />
                </div>
                <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 shadow-sm transition-colors"
                  >
                    立即创建
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Project Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {novels.length === 0 ? (
             <div className="col-span-full text-center py-24 text-gray-400 bg-white rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center">
                <div className="bg-gray-50 p-4 rounded-full mb-4">
                    <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                </div>
                <p className="text-lg font-medium text-gray-600">还没有作品</p>
                <p className="text-sm mt-1 text-gray-400">点击右上角 "新建作品" 开始你的创作之旅</p>
             </div>
          ) : (
            novels.map(novel => (
              <div 
                key={novel.id} 
                className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-hidden flex flex-col h-52 group"
              >
                {/* Clickable Body - Opens Project */}
                <div 
                    onClick={() => onSelectNovel(novel.id)}
                    className="p-5 flex-1 cursor-pointer hover:bg-gray-50/50 transition-colors relative"
                >
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-bold text-gray-800 font-serif group-hover:text-indigo-600 transition-colors line-clamp-1 mr-2" title={novel.title}>
                            {novel.title}
                        </h3>
                        <span className="shrink-0 text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium border border-indigo-100">
                            {novel.genre}
                        </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3 font-medium flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                        {novel.author}
                    </p>
                    <p className="text-sm text-gray-400 line-clamp-3 leading-relaxed">
                        {novel.description || '暂无简介...'}
                    </p>
                </div>

                {/* Action Footer - Separate Click Targets */}
                <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400 relative z-10">
                  <div className="flex items-center gap-1" title="章节数量">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                      <span>{novel.chapters.length} 章</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                      <span className="mr-2 opacity-60">{new Date(novel.createdAt).toLocaleDateString()}</span>
                      
                      <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onExportNovel(novel.id);
                        }}
                        className="text-gray-400 hover:text-indigo-600 p-1.5 rounded hover:bg-white hover:shadow-sm transition-all"
                        title="导出项目"
                      >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                      </button>
                      
                      <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onDeleteNovel(novel.id);
                        }}
                        className="text-gray-400 hover:text-red-600 p-1.5 rounded hover:bg-white hover:shadow-sm transition-all"
                        title="删除项目"
                      >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
