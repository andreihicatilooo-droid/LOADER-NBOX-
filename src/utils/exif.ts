import exifr from 'exifr';

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export async function extractGeoLocation(file: File): Promise<GeoLocation | null> {
  try {
    const data = await exifr.gps(file);
    if (data && data.latitude != null && data.longitude != null) {
      return {
        latitude: data.latitude,
        longitude: data.longitude
      };
    }
    return null;
  } catch (error) {
    console.error("EXIF extract error:", error);
    return null;
  }
}
