import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Stage, Layer, Image as KonvaImage, Line, Arrow, Text as KonvaText } from 'react-konva';
import useImage from 'use-image';
import { X, Crop as CropIcon, Pen, ArrowRight, RotateCcw, Undo2, Redo2, Save, Type } from 'lucide-react';

interface PhotoEditorProps {
  photoUrl: string;
  onSave: (blob: Blob) => void;
  onClose: () => void;
}

type Mode = 'crop' | 'draw' | 'arrow' | 'text';
type HistoryState = {
  lines: any[];
  arrows: any[];
  texts: any[];
  cropDataURL: string | null;
};

export function PhotoEditor({ photoUrl, onSave, onClose }: PhotoEditorProps) {
  const [mode, setMode] = useState<Mode>('draw');
  const [color, setColor] = useState('#ff0000');
  const [strokeWidth, setStrokeWidth] = useState(5);

  const [crop, setCrop] = useState<Crop>({ unit: '%', width: 50, height: 50, x: 25, y: 25 });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  
  const [baseImageObj, setBaseImageObj] = useState<string>(photoUrl);
  const [imgRef, setImgRef] = useState<HTMLImageElement | null>(null);

  const [lines, setLines] = useState<any[]>([]);
  const [arrows, setArrows] = useState<any[]>([]);
  const [texts, setTexts] = useState<any[]>([]);
  const isDrawing = useRef(false);

  // History buffer
  const [history, setHistory] = useState<HistoryState[]>([{ lines: [], arrows: [], texts: [], cropDataURL: null }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [image] = useImage(baseImageObj);
  const stageRef = useRef<any>(null);

  const pushHistory = (newState: Partial<HistoryState>) => {
    const currentState = history[historyIndex];
    const updatedState: HistoryState = {
      lines: newState.lines !== undefined ? newState.lines : currentState.lines,
      arrows: newState.arrows !== undefined ? newState.arrows : currentState.arrows,
      texts: newState.texts !== undefined ? newState.texts : currentState.texts,
      cropDataURL: newState.cropDataURL !== undefined ? newState.cropDataURL : currentState.cropDataURL,
    };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(updatedState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      restoreState(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      restoreState(history[historyIndex + 1]);
    }
  };

  const reset = () => {
    setHistoryIndex(0);
    restoreState(history[0]);
  };

  const restoreState = (state: HistoryState) => {
    setLines(state.lines);
    setArrows(state.arrows);
    setTexts(state.texts);
    if (state.cropDataURL !== null) {
      setBaseImageObj(state.cropDataURL);
    } else {
      setBaseImageObj(photoUrl);
    }
  };

  const applyCrop = () => {
    if (!completedCrop || !imgRef) return;

    const canvas = document.createElement('canvas');
    const scaleX = imgRef.naturalWidth / imgRef.width;
    const scaleY = imgRef.naturalHeight / imgRef.height;
    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    ctx.drawImage(
      imgRef,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY
    );

    const croppedImageUrl = canvas.toDataURL('image/jpeg');
    setBaseImageObj(croppedImageUrl);
    setMode('draw');
    setLines([]);
    setArrows([]);
    setTexts([]);
    pushHistory({ cropDataURL: croppedImageUrl, lines: [], arrows: [], texts: [] });
  };

  const handleStageClick = (e: any) => {
     if (mode !== 'text') return;
     const stage = e.target.getStage();
     const pos = stage.getPointerPosition();
     const textStr = window.prompt("Введите текст:");
     if (textStr) {
       const newTexts = [...texts, { text: textStr, x: pos.x, y: pos.y, color, fontSize: strokeWidth * 5 }];
       setTexts(newTexts);
       pushHistory({ texts: newTexts });
     }
  };

  const handleMouseDown = (e: any) => {
    if (mode === 'crop' || mode === 'text') return;
    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();
    
    if (mode === 'draw') {
      setLines([...lines, { tool: mode, points: [pos.x, pos.y], color, strokeWidth }]);
    } else if (mode === 'arrow') {
      setArrows([...arrows, { points: [pos.x, pos.y, pos.x, pos.y], color, strokeWidth }]);
    }
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing.current || mode === 'crop' || mode === 'text') return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();

    if (mode === 'draw') {
      let lastLine = lines[lines.length - 1];
      lastLine.points = lastLine.points.concat([point.x, point.y]);
      lines.splice(lines.length - 1, 1, lastLine);
      setLines([...lines]);
    } else if (mode === 'arrow') {
      let lastArrow = arrows[arrows.length - 1];
      lastArrow.points[2] = point.x;
      lastArrow.points[3] = point.y;
      arrows.splice(arrows.length - 1, 1, lastArrow);
      setArrows([...arrows]);
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing.current || mode === 'crop' || mode === 'text') return;
    isDrawing.current = false;
    pushHistory({ lines: [...lines], arrows: [...arrows] });
  };

  const handleSave = () => {
    if (stageRef.current) {
      // Create a Blob from the stage
      const dataURL = stageRef.current.toDataURL({ pixelRatio: 2 });
      // Convert base64 to blob
      fetch(dataURL)
        .then(res => res.blob())
        .then(blob => onSave(blob));
    } else if (imgRef && mode === 'crop') {
      applyCrop();
      setTimeout(() => {
        if (stageRef.current) {
           const dataURL = stageRef.current.toDataURL({ pixelRatio: 2 });
           fetch(dataURL).then(res => res.blob()).then(blob => onSave(blob));
        }
      }, 100);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#000]/90 backdrop-blur-sm flex flex-col pt-10 px-4 pb-4">
      {/* Tool bar */}
      <div className="bg-[#15151a] border border-gray-800 rounded shadow-2xl p-2 mb-4 flex items-center justify-between max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-2 px-2">
           <button onClick={() => setMode('crop')} className={`p-2 rounded border transition-all ${mode === 'crop' ? 'bg-gray-800 border-gray-600 text-white shadow-inner' : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'}`} title="Кадрирование"><CropIcon size={18}/></button>
           <button onClick={() => setMode('draw')} className={`p-2 rounded border transition-all ${mode === 'draw' ? 'bg-gray-800 border-gray-600 text-white shadow-inner' : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'}`} title="Кисть"><Pen size={18}/></button>
           <button onClick={() => setMode('arrow')} className={`p-2 rounded border transition-all ${mode === 'arrow' ? 'bg-gray-800 border-gray-600 text-white shadow-inner' : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'}`} title="Стрелка"><ArrowRight size={18}/></button>
           <button onClick={() => setMode('text')} className={`p-2 rounded border transition-all ${mode === 'text' ? 'bg-gray-800 border-gray-600 text-white shadow-inner' : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'}`} title="Текст"><Type size={18}/></button>
           
           <div className="h-6 w-px bg-gray-800 mx-2"></div>
           
           <div className="flex items-center gap-3 px-2">
             <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0" title="Цвет" />
             <input type="range" min="1" max="20" value={strokeWidth} onChange={(e) => setStrokeWidth(parseInt(e.target.value))} className="w-20 accent-red-500" title="Размер" />
           </div>
           
           <div className="h-6 w-px bg-gray-800 mx-2"></div>

           <button onClick={undo} disabled={historyIndex === 0} className="p-2 text-gray-400 rounded hover:bg-gray-800 hover:text-white disabled:opacity-30 transition-colors" title="Отменить"><Undo2 size={18}/></button>
           <button onClick={redo} disabled={historyIndex === history.length - 1} className="p-2 text-gray-400 rounded hover:bg-gray-800 hover:text-white disabled:opacity-30 transition-colors" title="Повторить"><Redo2 size={18}/></button>
           <button onClick={reset} disabled={historyIndex === 0} className="p-2 text-gray-400 rounded hover:bg-red-900/50 hover:text-red-400 disabled:opacity-30 transition-colors ml-2" title="Сбросить"><RotateCcw size={18}/></button>
        </div>
        <div className="flex items-center gap-3 px-2">
           {mode === 'crop' && completedCrop && (
             <button onClick={applyCrop} className="px-3 py-1.5 bg-gray-800 border border-gray-600 text-gray-200 rounded text-xs font-mono tracking-wider hover:bg-white hover:text-black transition-all uppercase">ПРИМЕНИТЬ</button>
           )}
           <button onClick={handleSave} className="flex items-center gap-2 px-4 py-1.5 bg-gray-200 text-black border border-transparent rounded text-xs font-bold tracking-wider hover:bg-white transition-all uppercase">
             <Save size={14}/> СОХРАНИТЬ
           </button>
           <div className="h-6 w-px bg-gray-800 mx-1"></div>
           <button onClick={onClose} className="p-1.5 hover:bg-red-900/30 hover:text-red-400 text-gray-500 rounded transition-colors"><X size={20}/></button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 overflow-auto flex items-center justify-center bg-[#0a0a0c] border border-gray-800 rounded shadow-[inset_0_0_50px_rgba(0,0,0,0.8)] relative pattern-grid">
        {mode === 'crop' ? (
          <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)}>
            <img src={baseImageObj} onLoad={(e) => setImgRef(e.currentTarget)} alt="Crop preview" className="max-h-[70vh] object-contain" />
          </ReactCrop>
        ) : (
          <div className="shadow-2xl border border-gray-700 rounded overflow-hidden bg-white max-w-full max-h-full overflow-auto">
             <Stage 
                width={imgRef ? imgRef.width : window.innerWidth * 0.8} 
                height={imgRef ? imgRef.height : window.innerHeight * 0.8} 
                onClick={handleStageClick}
                onMouseDown={handleMouseDown}
                onMousemove={handleMouseMove}
                onMouseup={handleMouseUp}
                onTouchStart={handleMouseDown}
                onTouchMove={handleMouseMove}
                onTouchEnd={handleMouseUp}
                ref={stageRef}
             >
                <Layer>
                  {image && <KonvaImage image={image} />}
                  {lines.map((line, i) => (
                    <Line
                      key={`l-${i}`}
                      points={line.points}
                      stroke={line.color}
                      strokeWidth={line.strokeWidth}
                      tension={0.5}
                      lineCap="round"
                      lineJoin="round"
                    />
                  ))}
                  {arrows.map((arr, i) => (
                    <Arrow
                      key={`a-${i}`}
                      points={arr.points}
                      stroke={arr.color}
                      fill={arr.color}
                      strokeWidth={arr.strokeWidth}
                      pointerLength={arr.strokeWidth * 3}
                      pointerWidth={arr.strokeWidth * 3}
                    />
                  ))}
                  {texts.map((txt, i) => (
                    <KonvaText 
                      key={`t-${i}`}
                      x={txt.x}
                      y={txt.y}
                      text={txt.text}
                      fill={txt.color}
                      fontSize={txt.fontSize}
                      fontFamily="sans-serif"
                      draggable
                      onDragEnd={(e) => {
                        const newTexts = [...texts];
                        newTexts[i] = { ...txt, x: e.target.x(), y: e.target.y() };
                        setTexts(newTexts);
                        pushHistory({ texts: newTexts });
                      }}
                    />
                  ))}
                </Layer>
             </Stage>
          </div>
        )}
      </div>
    </div>
  );
}
