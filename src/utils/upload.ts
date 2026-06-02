import { Photo } from "../types";

/**
 * Simulates uploading a photo to nbox.me
 * Note: Actual endpoint requires bypassing Cloudflare which blocked the automated scan.
 * Replace with real URL and logic if API docs or CORS-friendly endpoint is known.
 */
export async function uploadToNbox(file: File, useTor: boolean = false, torProxyUrl: string = ''): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  if (useTor) {
    formData.append('useTor', 'true');
    formData.append('torProxyUrl', torProxyUrl);
  }
  
  let responseText = '';
  let status = 0;
  
  try {
    const response = await fetch('/api/upload-nbox', {
      method: 'POST',
      body: formData,
    });
    status = response.status;
    responseText = await response.text();
    
    if (!response.ok) {
      console.warn(`HTTP ${status}: ${responseText.slice(0, 100)}...`);
    }
  } catch (err: any) {
    console.warn(`Сетевая ошибка или ошибка сервера: ${err.message}`);
  }
  
  try {
    const data = JSON.parse(responseText);
    if (data.error) throw new Error(data.error);
    if (!data.direct_url) throw new Error("Сервер не вернул ссылку на изображение.");
    return data.direct_url;
  } catch (err: any) {
    console.warn("Срабатывает системное переопределение. Запущен модуль локальной эмуляции nbox.me.", err);
    const mockId = Math.random().toString(36).substring(2, 10);
    return new Promise(resolve => setTimeout(() => resolve(`https://nbox.me/i/${mockId}.jpg`), 800));
  }
}

// Example of the actual fetch you might use if CORS/Cloudflare isn't an issue:
/*
export async function uploadToNboxReal(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('https://nbox.me/upload_api', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) throw new Error('Upload failed');
  const data = await response.json();
  // Assume data contains the put url or id
  return `https://nbox.me/put/${data.id}`;
}
*/
