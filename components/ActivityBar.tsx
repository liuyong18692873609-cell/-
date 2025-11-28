
import React from 'react';

export type ViewMode = 'write' | 'world' | 'outline' | 'chat' | 'stats';

interface ActivityBarProps {
  currentMode: ViewMode;
  onChangeMode: (mode: ViewMode) => void;
  onBack: () => void;
}

const ActivityBar: React.FC<ActivityBarProps> = ({ currentMode, onChangeMode, onBack }) => {
  return (
    <div className="w-16 bg-[#1e1e1e] border-r border-gray-800 flex flex-col items-center py-4 z-30 shrink-0">
      {/* Back to Dashboard */}
      <button 
        onClick={onBack}
        className="mb-6 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-all group relative"
        title="返回项目列表"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        <span className="absolute left-12 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity z-50 pointer-events-none">
            返回列表
        </span>
      </button>

      <div className="w-8 h-px bg-gray-700 mb-6"></div>

      {/* Navigation Icons */}
      <div className="flex flex-col gap-6 w-full items-center">
        <NavIcon 
            isActive={currentMode === 'write'} 
            onClick={() => onChangeMode('write')} 
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>}
            label="写作"
        />
        <NavIcon 
            isActive={currentMode === 'world'} 
            onClick={() => onChangeMode('world')} 
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
            label="设定"
        />
        <NavIcon 
            isActive={currentMode === 'outline'} 
            onClick={() => onChangeMode('outline')} 
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>}
            label="大纲"
        />
        <NavIcon 
            isActive={currentMode === 'stats'} 
            onClick={() => onChangeMode('stats')} 
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>}
            label="统计"
        />
        <NavIcon 
            isActive={currentMode === 'chat'} 
            onClick={() => onChangeMode('chat')} 
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>}
            label="助手"
        />
      </div>
    </div>
  );
};

const NavIcon: React.FC<{ isActive: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ isActive, onClick, icon, label }) => (
    <button
        onClick={onClick}
        className={`relative p-3 rounded-xl transition-all duration-200 group ${
            isActive 
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' 
            : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
        }`}
    >
        {icon}
        <span className="absolute left-14 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity z-50 pointer-events-none shadow-md">
            {label}
        </span>
    </button>
);

export default ActivityBar;
