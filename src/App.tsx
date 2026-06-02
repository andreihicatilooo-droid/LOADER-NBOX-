import React, { useState } from 'react';
import { Workspace } from './components/Workspace';
import { PositionsList } from './components/PositionsList';
import { ReportViewer } from './components/ReportViewer';
import { Position, AppState } from './types';
import { LayoutList, FileText, PlusCircle, Info } from 'lucide-react';

type Tab = 'workspace' | 'list' | 'report';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('workspace');
  const [state, setState] = useState<AppState>({
    globalCommonPhoto: null,
    globalCommonDescription: '',
    positions: [],
    currentPositionId: null,
  });

  const handleSavePosition = (position: Position, updateGlobal: boolean) => {
    setState((prev) => {
      const existingIndex = prev.positions.findIndex(p => p.id === position.id);
      let newPositions = [...prev.positions];
      
      if (existingIndex >= 0) {
        newPositions[existingIndex] = position;
      } else {
        newPositions.push(position);
      }

      return {
        ...prev,
        positions: newPositions,
        currentPositionId: null, 
        globalCommonPhoto: updateGlobal ? position.commonPhoto : prev.globalCommonPhoto,
        globalCommonDescription: updateGlobal ? position.commonDescription : prev.globalCommonDescription,
      };
    });
    
    // Once saved, switch to list view (or stay so user can keep adding? Prompt says: 
    // "сохранить предыдущую и начать загружать новые фото для новой позиции"
    // So we can keep them in Workspace but clear the ID, which we just did `currentPositionId: null`.)
    setActiveTab('list');
  };

  const handleEditPosition = (position: Position) => {
    setState(prev => ({
      ...prev,
      currentPositionId: position.id
    }));
    setActiveTab('workspace');
  };

  const handleDeletePosition = (id: string) => {
     setState(prev => ({
      ...prev,
      positions: prev.positions.filter(p => p.id !== id),
      currentPositionId: prev.currentPositionId === id ? null : prev.currentPositionId
    }));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setState(prev => {
      const newPos = [...prev.positions];
      [newPos[index - 1], newPos[index]] = [newPos[index], newPos[index - 1]];
      return { ...prev, positions: newPos };
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === state.positions.length - 1) return;
     setState(prev => {
      const newPos = [...prev.positions];
      [newPos[index + 1], newPos[index]] = [newPos[index], newPos[index + 1]];
      return { ...prev, positions: newPos };
    });
  };

  const currentPosition = state.currentPositionId 
    ? state.positions.find(p => p.id === state.currentPositionId) 
    : undefined;

  return (
    <div className="min-h-screen font-sans pb-20 selection:bg-red-900 selection:text-red-100">
      <header className="bg-[#0f0f13]/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
           <h1 className="text-2xl font-bold tracking-tighter text-gray-100 flex items-center gap-3 uppercase">
             <span className="bg-red-600/20 border border-red-500/50 text-red-500 px-3 py-1 rounded-md text-sm font-mono flex items-center shadow-[0_0_15px_rgba(220,38,38,0.2)]">
               <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>СИСТ
             </span> 
             CERBER Loader
           </h1>
           <div className="flex bg-[#1a1a24] p-1 rounded-lg border border-gray-800/50">
             <button
               onClick={() => {
                 setState(prev => ({ ...prev, currentPositionId: null }));
                 setActiveTab('workspace');
               }}
               className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === 'workspace' && !currentPosition ? 'bg-red-600/10 text-red-400 shadow-[0_0_10px_rgba(220,38,38,0.1)]' : 'text-gray-500 hover:text-gray-300 hover:bg-[#252530]'}`}
             >
               <PlusCircle size={16} />
               ДОБАВИТЬ
             </button>
             <button
               onClick={() => setActiveTab('list')}
               className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === 'list' || currentPosition ? 'bg-red-600/10 text-red-400 shadow-[0_0_10px_rgba(220,38,38,0.1)]' : 'text-gray-500 hover:text-gray-300 hover:bg-[#252530]'}`}
             >
               <LayoutList size={16} />
               АРХИВ [{state.positions.length}]
             </button>
             <button
               onClick={() => setActiveTab('report')}
               className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === 'report' ? 'bg-red-600/10 text-red-400 shadow-[0_0_10px_rgba(220,38,38,0.1)]' : 'text-gray-500 hover:text-gray-300 hover:bg-[#252530]'}`}
             >
               <FileText size={16} />
               ОТЧЕТ
             </button>
           </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Info Banner */}
        <div className="mb-8 bg-[#1a1a24]/80 border border-red-900/30 text-gray-400 p-4 rounded-lg flex items-start gap-4 shadow-lg">
          <div className="p-2 bg-red-950/50 rounded-md border border-red-900/50 text-red-500 mt-0.5">
            <Info size={16} />
          </div>
          <div className="text-sm leading-relaxed font-mono">
            <p className="text-red-400/80 mb-1 uppercase tracking-wider text-xs font-semibold">Системное переопределение активно</p>
            <p>
              Прямой доступ к <strong className="text-gray-200">nbox.me</strong> заблокирован защитой Cloudflare. 
              Запущен модуль локальной эмуляции. Генерация синтетических путей <code>nbox.me/put/...</code> для загрузки.
            </p>
          </div>
        </div>

        {activeTab === 'workspace' && (
          <Workspace 
            initialPosition={currentPosition}
            globalCommonPhoto={state.globalCommonPhoto}
            globalCommonDescription={state.globalCommonDescription}
            onSaveAction={handleSavePosition}
            onCancel={currentPosition ? () => setActiveTab('list') : undefined}
          />
        )}

        {activeTab === 'list' && (
           <PositionsList 
             positions={state.positions}
             onEdit={handleEditPosition}
             onDelete={handleDeletePosition}
             onMoveUp={handleMoveUp}
             onMoveDown={handleMoveDown}
           />
        )}

        {activeTab === 'report' && (
           <ReportViewer positions={state.positions} />
        )}
      </main>
    </div>
  );
}
