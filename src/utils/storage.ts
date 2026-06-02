import localforage from 'localforage';
import { Photo } from '../types';

localforage.config({
  name: 'CerberLoader',
  storeName: 'cerber_storage'
});

export const PRESETS_KEY = 'cerber_desc_presets';
export const COMMON_PHOTOS_KEY = 'cerber_common_photos';

// Photos storage (saving common photos)
export async function saveCommonPhotoToStorage(photoFile: File, previewUrl: string): Promise<string> {
  const photos: any[] = await localforage.getItem(COMMON_PHOTOS_KEY) || [];
  
  // Convert file to ArrayBuffer for storage
  const arrayBuffer = await photoFile.arrayBuffer();
  
  const record = {
    id: crypto.randomUUID(),
    name: photoFile.name,
    type: photoFile.type,
    data: arrayBuffer,
    timestamp: Date.now()
  };
  
  // Keep last 10 photos max
  photos.unshift(record);
  if (photos.length > 10) photos.pop();
  
  await localforage.setItem(COMMON_PHOTOS_KEY, photos);
  return record.id;
}

export async function getCommonPhotosFromStorage(): Promise<{ id: string, name: string, file: File, previewUrl: string }[]> {
  const photos: any[] = await localforage.getItem(COMMON_PHOTOS_KEY) || [];
  
  return photos.map(p => {
    const file = new File([p.data], p.name, { type: p.type });
    return {
      id: p.id,
      name: p.name,
      file,
      previewUrl: URL.createObjectURL(file)
    };
  });
}

export async function deleteCommonPhotoFromStorage(id: string): Promise<void> {
  const photos: any[] = await localforage.getItem(COMMON_PHOTOS_KEY) || [];
  const newPhotos = photos.filter(p => p.id !== id);
  await localforage.setItem(COMMON_PHOTOS_KEY, newPhotos);
}

// Description Presets (can be simple localStorage or localforage)
export interface DescPreset {
  id: string;
  name: string;
  text: string;
  isCommon: boolean;
}

export async function getPresets(): Promise<DescPreset[]> {
  return (await localforage.getItem<DescPreset[]>(PRESETS_KEY)) || [];
}

export async function savePreset(preset: Omit<DescPreset, 'id'>): Promise<DescPreset> {
  const presets = await getPresets();
  const newPreset = { ...preset, id: crypto.randomUUID() };
  presets.push(newPreset);
  await localforage.setItem(PRESETS_KEY, presets);
  return newPreset;
}

export async function deletePreset(id: string): Promise<void> {
  const presets = await getPresets();
  await localforage.setItem(PRESETS_KEY, presets.filter(p => p.id !== id));
}
