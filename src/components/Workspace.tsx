import React, { useState, useRef, useEffect } from 'react';
import { Photo, Position } from '../types';
import { Upload, X, Save, ImagePlus, CheckCircle2, Loader2, Edit2, Replace, Map, Sparkles, FolderArchive, FolderOpen, Settings } from 'lucide-react';
import { uploadToNbox } from '../utils/upload';
import { PhotoEditor } from './PhotoEditor';
import { extractGeoLocation } from '../utils/exif';
import { PhotoMap } from './PhotoMap';
import { getPresets, savePreset, DescPreset, getCommonPhotosFromStorage, saveCommonPhotoToStorage } from '../utils/storage';

interface WorkspaceProps {
  initialPosition?: Position;
  globalCommonPhoto: Photo | null;
  globalCommonDescription: string;
  onSaveAction: (position: Position, setAsGlobalSettings: boolean) => void;
  onCancel?: () => void;
}

type UIPhoto = Photo & { isCommon: boolean };

export function Workspace({
  initialPosition,
  globalCommonPhoto,
  globalCommonDescription,
  onSaveAction,
  onCancel,
}: WorkspaceProps) {
  const [photos, setPhotos] = useState<UIPhoto[]>(() => {
    const list: UIPhoto[] = [];
    if (initialPosition) {
      if (initialPosition.commonPhoto) {
         list.push({ ...initialPosition.commonPhoto, isCommon: true });
      }
      list.push(...initialPosition.uniquePhotos.map(p => ({ ...p, isCommon: false })));
    } else {
      if (globalCommonPhoto) {
         list.push({ ...globalCommonPhoto, isCommon: true });
      }
    }
    return list;
  });
  
  const [uniqueDesc, setUniqueDesc] = useState(initialPosition?.uniqueDescription || '');
  const [commonDesc, setCommonDesc] = useState(
    initialPosition ? initialPosition.commonDescription : globalCommonDescription
  );

  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  
  const [editingPhoto, setEditingPhoto] = useState<{ id: string, url: string, isCommon: boolean } | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [presets, setPresets] = useState<DescPreset[]>([]);
  const [savedCommonPhotos, setSavedCommonPhotos] = useState<any[]>([]);

  // Proxy Settings
  const [useTor, setUseTor] = useState(false);
  const [torProxyUrl, setTorProxyUrl] = useState('socks5://127.0.0.1:9050');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    getPresets().then(setPresets);
    getCommonPhotosFromStorage().then(setSavedCommonPhotos);
  }, []);

  const generateAI = async (isCommon: boolean) => {
    const promptValue = prompt("Что описать? (например: 'фотографии объекта', 'описание оборудования')");
    if (!promptValue) return;

    try {
      const backup = isCommon ? commonDesc : uniqueDesc;
      if (isCommon) setCommonDesc("Генерация...");
      else setUniqueDesc("Генерация...");
      
      const res = await fetch("/api/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptValue, isCommon })
      });
      const data = await res.json();
      if (res.ok && data.text) {
         if (isCommon) setCommonDesc(data.text);
         else setUniqueDesc(data.text);
      } else {
         if (isCommon) setCommonDesc(backup);
         else setUniqueDesc(backup);
         throw new Error(data.error);
      }
    } catch(err: any) {
      alert("Ошибка ИИ: " + err.message);
    }
  };

  const handleSavePreset = async (isCommon: boolean) => {
    const name = prompt("Введите имя прессета:");
    if (!name) return;
    const text = isCommon ? commonDesc : uniqueDesc;
    if (!text) return alert("Описание пустое");
    
    await savePreset({ name, text, isCommon });
    setPresets(await getPresets());
  };

  const handleLoadPreset = (isCommon: boolean) => {
    const typePresets = presets.filter(p => p.isCommon === isCommon);
    if (typePresets.length === 0) return alert("Нет сохраненных прессетов");
    
    const names = typePresets.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
    const choice = prompt(`Выберите пресст (введите номер):\n${names}`);
    
    const index = parseInt(choice || '') - 1;
    if (!isNaN(index) && typePresets[index]) {
      if (isCommon) setCommonDesc(typePresets[index].text);
      else setUniqueDesc(typePresets[index].text);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotosChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newValidPhotos: UIPhoto[] = [];
      let dupCount = 0;
      
      for (const file of files) {
          if (photos.length + newValidPhotos.length >= 6) {
             alert('Максимум 6 фотографий!');
             break;
          }
          const isDup = photos.some(p => p.file.name === file.name && p.file.size === file.size) || 
                        newValidPhotos.some(f => f.file.name === file.name && f.file.size === file.size);
          if (isDup) {
            dupCount++;
          } else {
            const loc = await extractGeoLocation(file);
            newValidPhotos.push({
              id: crypto.randomUUID(),
              file,
              previewUrl: URL.createObjectURL(file),
              location: loc || undefined,
              isCommon: false
            });
          }
      }

      if (dupCount > 0) {
        alert(`Пропущено ${dupCount} дубликатов фотографий.`);
      }

      setPhotos(prev => [...prev, ...newValidPhotos]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSelectSavedCommon = (photo: any) => {
    setPhotos(prev => {
        if (prev.length >= 6) return prev;
        // Unset isCommon from others
        const mapped = prev.map(p => ({ ...p, isCommon: false }));
        return [...mapped, {
           id: crypto.randomUUID(),
           file: photo.file,
           previewUrl: photo.previewUrl,
           isCommon: true
        }];
    });
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const toggleCommon = (id: string) => {
    setPhotos(prev => prev.map(p => ({
        ...p,
        isCommon: p.id === id ? !p.isCommon : false
    })));
  };

  const handleSaveEditor = (blob: Blob) => {
    if (!editingPhoto) return;
    
    const newFile = new File([blob], 'edited_image.jpg', { type: 'image/jpeg' });
    const newPreviewUrl = URL.createObjectURL(blob);
    
    setPhotos(prev => prev.map(p => 
      p.id === editingPhoto.id ? { ...p, file: newFile, previewUrl: newPreviewUrl, nboxUrl: undefined } : p
    ));
    setEditingPhoto(null);
  };

  const handleSave = async () => {
    setIsUploading(true);
    setUploadStatus('Подготовка к загрузке...');

    try {
      const allToUpload = photos.filter(p => !p.nboxUrl);
      let uploadedCount = 0;
      const totalToUpload = allToUpload.length;

      const updatedPhotos = [];
      for (const p of photos) {
        let nboxUrl = p.nboxUrl;
        if (!nboxUrl) {
           setUploadStatus(`Загрузка: ${p.file.name}... ( ${uploadedCount + 1} из ${totalToUpload} )`);
           nboxUrl = await uploadToNbox(p.file, useTor, torProxyUrl);
           uploadedCount++;
        }
        updatedPhotos.push({ ...p, nboxUrl });
      }
      
      setUploadStatus('Сохранение...');
      setPhotos([...updatedPhotos]);

      const f_uniquePhotos = updatedPhotos.filter(p => !p.isCommon).map(p => {
          const { isCommon, ...rest } = p;
          return rest;
      });
      
      const foundCommon = updatedPhotos.find(p => p.isCommon);
      let f_commonPhoto = null;
      
      if (foundCommon) {
         const { isCommon, ...rest } = foundCommon;
         f_commonPhoto = rest;
         await saveCommonPhotoToStorage(f_commonPhoto.file, f_commonPhoto.previewUrl);
         // Update the local storage state to refresh the UI
         setSavedCommonPhotos(await getCommonPhotosFromStorage());
      }

      const position: Position = {
        id: initialPosition?.id || crypto.randomUUID(),
        uniquePhotos: f_uniquePhotos as Photo[],
        commonPhoto: f_commonPhoto as Photo | null,
        uniqueDescription: uniqueDesc,
        commonDescription: commonDesc,
      };

      const updateGlobalSettings = true; 
      onSaveAction(position, updateGlobalSettings);
      
      if (!initialPosition) {
        setPhotos(prev => prev.filter(p => p.isCommon)); // Keep only the common one for the next position
        setUniqueDesc('');
      }
    } catch (error) {
      console.error("Failed to upload", error);
      alert("Failed to upload photos. Check network or CORS.");
    } finally {
      setIsUploading(false);
      setUploadStatus('');
    }
  };

  return (
    <div className="bg-[#111116]/80 backdrop-blur-sm rounded-xl border border-gray-800/60 p-6 max-w-4xl mx-auto mt-6 shadow-[0_10px_40px_rgba(0,0,0,0.8)] relative overflow-hidden group">
      {/* Cyber Decor */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600/0 via-red-600/50 to-red-600/0 opacity-50 group-hover:opacity-100 transition-opacity"></div>
      
      <div className="flex justify-between items-center mb-6 border-b border-gray-800/50 pb-4">
        <h2 className="text-xl font-bold tracking-tight text-gray-200 flex items-center gap-2 uppercase">
          <span className="text-red-500 font-mono">[{initialPosition ? 'РЕДАКТ' : 'ИНИЦИАЛ'}]</span> 
          {initialPosition ? 'Изменение позиции' : 'Новая позиция'}
        </h2>
        {onCancel && (
          <button onClick={onCancel} className="text-gray-500 hover:text-red-400 font-mono text-sm tracking-wider uppercase transition-colors">
            [ Отмена ]
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Unified Photos List */}
        <div>
          <div className="flex justify-between items-end mb-3 border-b border-gray-800 pb-2">
            <label className="block text-sm font-semibold text-gray-300 uppercase tracking-widest font-mono">
              Список фотографий
            </label>
            <div className="flex gap-2">
              {photos.some(p => p.location != null) && (
                <button onClick={() => setShowMap(true)} className="text-xs text-red-500/80 font-mono bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 shadow-[0_0_8px_rgba(220,38,38,0.1)] flex items-center gap-1 hover:bg-red-500/20">
                  <Map size={12} /> КАРТА
                </button>
              )}
              <span className="text-xs text-red-500/80 font-mono bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 shadow-[0_0_8px_rgba(220,38,38,0.1)]">
                {photos.length}/6
              </span>
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
            {photos.map(photo => (
               <div key={photo.id} className="min-w-[180px] w-[180px] bg-[#0a0a0c] border border-gray-800 rounded-lg p-2.5 flex flex-col gap-3 shrink-0 relative shadow-inner">
                  <div className="relative aspect-square rounded overflow-hidden border border-gray-700">
                     <img src={photo.previewUrl} className="w-full h-full object-cover opacity-90" alt="photo" />
                     {photo.nboxUrl && (
                        <div className="absolute top-1.5 right-1.5 bg-green-500/90 text-white rounded-full p-0.5 shadow-md">
                          <CheckCircle2 size={12} />
                        </div>
                     )}
                     <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex items-center justify-center transition-all backdrop-blur-[2px]">
                         <button onClick={() => removePhoto(photo.id)} className="p-2 bg-red-900/80 text-red-100 rounded-md hover:bg-red-600 transition-colors" title="Удалить">
                           <X size={16} />
                         </button>
                     </div>
                  </div>
                  
                  <label className="flex items-center justify-between text-[11px] text-gray-400 font-mono font-semibold cursor-pointer border border-gray-800 rounded p-1.5 hover:bg-gray-800/50 transition-colors tooltip tooltip-top bg-[#111] shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
                     <span className="uppercase tracking-wider">Постоянное</span>
                     <input type="checkbox" checked={photo.isCommon} onChange={() => toggleCommon(photo.id)} className="accent-red-500 w-3.5 h-3.5 cursor-pointer" />
                  </label>
                  
                  <button onClick={() => setEditingPhoto({ id: photo.id, url: photo.previewUrl, isCommon: photo.isCommon })} className="w-full bg-[#15151a] hover:bg-gray-800 text-gray-300 border border-gray-700 hover:border-gray-500 text-[11px] py-2 rounded font-mono uppercase transition-colors flex items-center justify-center gap-2 mt-auto font-bold tracking-widest shadow-sm">
                     <Edit2 size={13} /> Изменить
                  </button>
               </div>
            ))}
            
            <button onClick={() => fileInputRef.current?.click()} className="min-w-[180px] w-[180px] bg-[#0a0a0c] border-2 border-dashed border-gray-700 hover:border-red-500/50 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/5 cursor-pointer shrink-0 transition-all gap-2 h-auto py-8">
               <ImagePlus size={28} className="opacity-70" />
               <span className="font-mono text-[11px] tracking-widest uppercase px-2 text-center font-bold">Добавить фото</span>
            </button>
          </div>
          
          <input
            type="file"
            multiple
            accept="image/*"
            ref={fileInputRef}
            onChange={handlePhotosChange}
            className="hidden"
          />

          {/* History */}
          {savedCommonPhotos.length > 0 && photos.length < 6 && (
            <div className="mt-2 pt-3 border-t border-gray-800/50">
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-widest font-mono mb-2">
                История (Сохраненные постоянные фото)
              </label>
              <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                 {savedCommonPhotos.map(p => (
                   <div key={p.id} className="w-14 h-14 flex-shrink-0 border border-gray-700 hover:border-red-500/50 rounded overflow-hidden relative group cursor-pointer" title={p.name} onClick={() => handleSelectSavedCommon(p)}>
                     <img src={p.previewUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity grayscale group-hover:grayscale-0" alt="saved common" />
                   </div>
                 ))}
              </div>
            </div>
          )}
        </div>

        {/* Descriptions */}
        <div className="grid md:grid-cols-2 gap-6 pb-2 relative z-10">
          <div className="bg-[#15151a] p-4 rounded-lg border border-gray-800 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-mono text-gray-500 uppercase tracking-wider">Локальное Описание [Уник]</label>
              <div className="flex gap-1">
                 <button onClick={() => generateAI(false)} className="p-1 text-gray-500 hover:text-yellow-400 transition-colors bg-gray-900 rounded" title="Сгенерировать ИИ"><Sparkles size={14}/></button>
                 <button onClick={() => handleLoadPreset(false)} className="p-1 text-gray-500 hover:text-blue-400 transition-colors bg-gray-900 rounded" title="Загрузить пресет"><FolderOpen size={14}/></button>
                 <button onClick={() => handleSavePreset(false)} className="p-1 text-gray-500 hover:text-green-400 transition-colors bg-gray-900 rounded" title="Сохранить как пресет"><FolderArchive size={14}/></button>
              </div>
            </div>
            <textarea
              rows={4}
              value={uniqueDesc}
              onChange={(e) => setUniqueDesc(e.target.value)}
              placeholder="Уникальные данные..."
              className="flex-1 w-full px-3 py-2 bg-[#0a0a0c] border border-gray-700/50 rounded-md focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 text-gray-300 text-sm font-mono placeholder:text-gray-600 transition-all resize-none shadow-inner"
            />
          </div>
          <div className="bg-[#15151a] p-4 rounded-lg border border-gray-800 flex flex-col">
             <div className="flex items-center justify-between mb-2">
               <label className="block text-xs font-mono text-gray-500 uppercase tracking-wider">Глобальное Описание [Общее]</label>
               <div className="flex gap-1">
                 <button onClick={() => generateAI(true)} className="p-1 text-gray-500 hover:text-yellow-400 transition-colors bg-gray-900 rounded" title="Сгенерировать ИИ"><Sparkles size={14}/></button>
                 <button onClick={() => handleLoadPreset(true)} className="p-1 text-gray-500 hover:text-blue-400 transition-colors bg-gray-900 rounded" title="Загрузить пресет"><FolderOpen size={14}/></button>
                 <button onClick={() => handleSavePreset(true)} className="p-1 text-gray-500 hover:text-green-400 transition-colors bg-gray-900 rounded" title="Сохранить как пресет"><FolderArchive size={14}/></button>
              </div>
             </div>
            <textarea
              rows={4}
              value={commonDesc}
              onChange={(e) => setCommonDesc(e.target.value)}
              placeholder="Общие данные для всех..."
              className="flex-1 w-full px-3 py-2 bg-[#0a0a0c] border border-gray-700/50 rounded-md focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 text-gray-300 text-sm font-mono placeholder:text-gray-600 transition-all resize-none shadow-inner"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="pt-6 border-t border-gray-800 flex flex-col gap-4">
          
          {showSettings && (
            <div className="bg-[#0a0a0c] border border-gray-800 rounded p-4 flex flex-col gap-3">
               <h4 className="text-gray-300 font-mono text-sm tracking-wider uppercase mb-1">Настройки сети (NBox Upload)</h4>
               
               <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={useTor} 
                    onChange={(e) => setUseTor(e.target.checked)} 
                    className="accent-red-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-gray-400 font-mono text-sm">Использовать Tor Proxy</span>
               </label>

               {useTor && (
                 <label className="flex flex-col gap-1">
                   <span className="text-gray-500 font-mono text-xs uppercase">SOCKS5 Proxy URL</span>
                   <input
                     type="text"
                     value={torProxyUrl}
                     onChange={(e) => setTorProxyUrl(e.target.value)}
                     placeholder="socks5://127.0.0.1:9050"
                     className="px-3 py-2 bg-[#111116] border border-gray-700/50 rounded-md focus:outline-none focus:border-red-500/50 text-gray-300 text-sm font-mono placeholder:text-gray-600 transition-all w-1/2"
                   />
                 </label>
               )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-xs font-mono tracking-widest text-red-400 animate-pulse flex items-center gap-2">
              {isUploading && <span className="w-1.5 h-1.5 bg-red-500 rounded-full inline-block"></span>}
              {uploadStatus}
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#15151a] hover:bg-gray-800 text-gray-400 font-bold rounded-md transition-all font-mono border border-gray-700"
                title="Настройки соединения"
              >
                <Settings size={16} />
              </button>
              <button
                onClick={handleSave}
                disabled={isUploading || photos.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 text-[#0c0c0e] font-bold rounded-md hover:bg-white hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-wide text-sm font-mono border border-transparent shadow-[0_0_10px_rgba(255,255,255,0.1)] focus:outline-none"
              >
                {isUploading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                {initialPosition ? 'ПРИМЕНИТЬ' : 'СОХРАНИТЬ И ДАЛЕЕ'}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {editingPhoto && (
        <PhotoEditor 
          photoUrl={editingPhoto.url} 
          onSave={handleSaveEditor} 
          onClose={() => setEditingPhoto(null)} 
        />
      )}
      {showMap && <PhotoMap photos={photos as any} onClose={() => setShowMap(false)} />}
    </div>
  );
}
