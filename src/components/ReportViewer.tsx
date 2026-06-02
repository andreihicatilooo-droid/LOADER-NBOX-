import React, { useMemo, useState } from 'react';
import { Position } from '../types';
import { Copy, CheckCircle2 } from 'lucide-react';

interface ReportViewerProps {
  positions: Position[];
}

export function ReportViewer({ positions }: ReportViewerProps) {
  const [copied, setCopied] = useState(false);

  const reportText = useMemo(() => {
    return positions.map((pos, index) => {
      const parts: string[] = [];
      
      // Unique photos
      pos.uniquePhotos.forEach(p => {
        if (p.nboxUrl) parts.push(p.nboxUrl);
      });

      // Common photo
      if (pos.commonPhoto?.nboxUrl) {
        parts.push(pos.commonPhoto.nboxUrl);
      }

      // Unique description
      if (pos.uniqueDescription.trim()) {
        parts.push(pos.uniqueDescription.trim());
      }

      // Common description
      if (pos.commonDescription.trim()) {
        parts.push(pos.commonDescription.trim());
      }

      return `${index + 1}. ${parts.join(" , ")}`;
    }).join("\n");
  }, [positions]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy text', e);
    }
  };

  if (positions.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500 bg-[#111116]/80 backdrop-blur-sm rounded-xl border border-gray-800/60 mt-6 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
        <p className="font-mono text-sm tracking-wider uppercase text-gray-600">Нет данных для составления отчета.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#111116]/80 backdrop-blur-sm rounded-xl border border-gray-800/60 p-6 max-w-4xl mx-auto mt-6 shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-600/0 via-gray-600/50 to-gray-600/0 opacity-50 group-hover:opacity-100 transition-opacity"></div>
      
      <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
        <h2 className="text-xl font-bold tracking-tight text-gray-200 flex items-center gap-2 uppercase">
          <span className="text-gray-500 font-mono">[ЛОГ]</span> 
          Сгенерированный отчёт
        </h2>
        <button 
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2 bg-[#1a1a24] hover:bg-white hover:text-black border border-gray-700 hover:border-white text-gray-300 rounded transition-all font-mono text-sm uppercase tracking-wider"
        >
          {copied ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}
          {copied ? 'СКОПИРОВАНО' : 'КОПИРОВАТЬ'}
        </button>
      </div>
      <div className="relative">
        <div className="absolute top-0 left-0 bottom-0 w-8 bg-[#0a0a0c] border-r border-gray-800 rounded-l flex flex-col pt-3 items-center text-[#333] font-mono text-xs select-none">
           {reportText.split('\n').map((_, i) => <span key={i} className="mb-[6px]">{i+1}</span>)}
        </div>
        <textarea
          readOnly
          value={reportText}
          rows={15}
          className="w-full h-96 p-4 pl-12 bg-[#0d0d11] border border-gray-800 rounded text-sm font-mono text-gray-300 focus:outline-none resize-none whitespace-pre-wrap selection:bg-red-900 selection:text-red-100 shadow-inner"
        />
      </div>
    </div>
  );
}
