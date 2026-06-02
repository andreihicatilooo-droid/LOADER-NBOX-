import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Photo } from '../types';
import L from 'leaflet';
import { X } from 'lucide-react';

// Fix Leaflet's default icon path issues in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface PhotoMapProps {
  photos: Photo[];
  onClose: () => void;
}

export function PhotoMap({ photos, onClose }: PhotoMapProps) {
  const geoPhotos = photos.filter(p => p.location);

  if (geoPhotos.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-[#000]/90 backdrop-blur-sm flex items-center justify-center p-4">
         <div className="bg-[#15151a] p-6 rounded-lg border border-gray-800 shadow-2xl max-w-sm w-full text-center">
            <p className="text-gray-400 font-mono mb-4 text-sm">Координаты не найдены ни на одном фото.</p>
            <button onClick={onClose} className="px-4 py-2 bg-red-900/50 text-red-400 hover:bg-red-600 hover:text-white rounded transition-colors font-mono uppercase text-sm">ЗАКРЫТЬ</button>
         </div>
      </div>
    );
  }

  const center: [number, number] = [
    geoPhotos[0].location!.lat,
    geoPhotos[0].location!.lng
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#000]/90 backdrop-blur-sm flex flex-col pt-10 px-4 pb-4">
      <div className="bg-[#15151a] border border-gray-800 rounded shadow-2xl p-2 mb-4 flex items-center justify-between max-w-4xl mx-auto w-full">
         <span className="text-red-500 font-mono font-bold tracking-widest px-4 uppercase text-sm">GPS TRACKING</span>
         <button onClick={onClose} className="p-1.5 hover:bg-red-900/30 hover:text-red-400 text-gray-500 rounded transition-colors">
            <X size={20}/>
         </button>
      </div>
      <div className="flex-1 max-w-4xl mx-auto w-full rounded border border-gray-800 overflow-hidden relative shadow-[inset_0_0_50px_rgba(0,0,0,1)] bg-gray-900">
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            className="map-tiles"
          />
          {geoPhotos.map(photo => (
            <Marker key={photo.id} position={[photo.location!.lat, photo.location!.lng]}>
              <Popup>
                <div className="w-32 bg-gray-900">
                  <img src={photo.previewUrl} alt="preview" className="w-full h-auto rounded border border-gray-700 mb-1" />
                  <p className="text-[10px] font-mono text-gray-400 m-0 break-all">{photo.file.name}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        <style dangerouslySetInnerHTML={{__html: `
          .map-tiles { filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%); }
          .leaflet-popup-content-wrapper { background: #15151a; color: #fff; border: 1px solid #333; border-radius: 4px; }
          .leaflet-popup-tip { background: #15151a; border: 1px solid #333; }
        `}} />
      </div>
    </div>
  );
}
