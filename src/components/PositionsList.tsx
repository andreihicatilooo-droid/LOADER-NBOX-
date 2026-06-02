import React from 'react';
import { Position } from '../types';
import { ArrowUp, ArrowDown, Edit2, Trash2, Image as ImageIcon } from 'lucide-react';

interface PositionsListProps {
  positions: Position[];
  onEdit: (position: Position) => void;
  onDelete: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

export function PositionsList({
  positions,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown
}: PositionsListProps) {
  if (positions.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500 bg-[#111116]/80 backdrop-blur-sm rounded-xl border border-gray-800/60 mt-6 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
        <ImageIcon className="mx-auto h-12 w-12 text-gray-700 mb-4 opacity-50" />
        <p className="font-mono text-sm tracking-wider uppercase text-gray-600">Архив пуст. Ожидание данных.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-6">
      {positions.map((pos, index) => (
        <div key={pos.id} className="bg-[#15151a] p-4 rounded-lg border border-gray-800/80 flex items-start gap-4 hover:border-gray-600 transition-colors shadow-lg relative group overflow-hidden">
          {/* Cyber Accent Line */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-800 group-hover:bg-red-600/50 transition-colors"></div>

          <div className="flex flex-col items-center gap-1 mt-1 pl-2">
            <button 
              onClick={() => onMoveUp(index)} 
              disabled={index === 0}
              className="p-1 text-gray-600 hover:text-white hover:bg-gray-800 rounded disabled:opacity-30 transition-all"
            >
              <ArrowUp size={16} />
            </button>
            <span className="font-mono text-xs font-bold text-gray-400 select-none w-6 text-center">{index + 1}</span>
            <button 
              onClick={() => onMoveDown(index)} 
              disabled={index === positions.length - 1}
              className="p-1 text-gray-600 hover:text-white hover:bg-gray-800 rounded disabled:opacity-30 transition-all"
            >
              <ArrowDown size={16} />
            </button>
          </div>

          <div className="flex-1 flex gap-4 overflow-hidden items-center ml-2">
            <div className="flex gap-2 p-2 bg-[#0a0a0c] rounded border border-gray-900 shadow-inner">
              {pos.uniquePhotos.map((p, i) => (
                <img 
                  key={p.id} 
                  src={p.previewUrl} 
                  alt={`unique-${i}`} 
                  className="w-14 h-14 rounded object-cover border border-gray-800 opacity-80 group-hover:opacity-100 transition-opacity filter grayscale group-hover:grayscale-0" 
                />
              ))}
            </div>
            {pos.commonPhoto && (
              <div className="border-l border-gray-800 pl-4 flex gap-2">
                 <img 
                    src={pos.commonPhoto.previewUrl} 
                    alt="common" 
                    className="w-14 h-14 rounded object-cover border border-red-900/30 opacity-80 group-hover:opacity-100 transition-opacity filter grayscale group-hover:grayscale-0 shadow-[0_0_10px_rgba(220,38,38,0.05)] text-gray-500 relative before:content-['CV'] before:absolute before:-top-4 before:left-0 before:text-[10px] before:font-mono opacity-80" 
                  />
              </div>
            )}
            
            <div className="flex-1 pl-4 flex flex-col justify-center min-w-0 pr-4">
               <div className="text-xs text-gray-400 truncate mb-1.5 font-mono bg-gray-900/50 p-1.5 rounded" title={pos.uniqueDescription}>
                 <span className="text-gray-600 mr-2 uppercase tracking-wide text-[10px] bg-black px-1 py-0.5 rounded">УНИК</span> 
                 {pos.uniqueDescription || "НЕТ ДАННЫХ"}
               </div>
               <div className="text-xs text-gray-500 truncate font-mono bg-gray-900/30 p-1.5 rounded" title={pos.commonDescription}>
                 <span className="text-gray-600 mr-2 uppercase tracking-wide text-[10px] bg-black px-1 py-0.5 rounded">ОБЩ</span> 
                 {pos.commonDescription || "НЕТ ДАННЫХ"}
               </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-l border-gray-800 pl-4 h-full pr-2">
            <button 
               onClick={() => onEdit(pos)}
               className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 border border-transparent hover:border-gray-700 rounded transition-all"
               title="Редактировать"
            >
              <Edit2 size={16} />
            </button>
             <button 
               onClick={() => onDelete(pos.id)}
               className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-900/20 border border-transparent hover:border-red-900/50 rounded transition-all"
               title="Удалить"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
