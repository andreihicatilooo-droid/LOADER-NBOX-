export interface Photo {
  id: string;
  file: File;
  previewUrl: string;
  nboxUrl?: string; // Initially undefined, populated after successful upload
  location?: { lat: number; lng: number }; // GPS Coordinates
}

export interface Position {
  id: string;
  uniquePhotos: Photo[];
  commonPhoto: Photo | null;
  uniqueDescription: string;
  commonDescription: string;
}

export interface AppState {
  globalCommonPhoto: Photo | null;
  globalCommonDescription: string;
  positions: Position[];
  currentPositionId: string | null;
}
