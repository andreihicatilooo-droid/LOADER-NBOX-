import asyncio
import aiohttp
import mimetypes
from pathlib import Path
from html.parser import HTMLParser
from typing import Union, List, Dict, Optional
import io

class UploaderNetworkError(Exception):
    pass

class UploaderParseError(Exception):
    pass

class _NboxHTMLParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.raw_links = []
        self.delete_links = []
        self.images = []

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if tag == "a" and "href" in attrs_dict:
            href = attrs_dict["href"]
            if not href.startswith("/cdn-cgi/") and not href.startswith("/about") and not href.startswith("/faq") and not href.startswith("/terms"):
                if "delete" in href:
                    self.delete_links.append(href)
                else:
                    self.raw_links.append(href)
        elif tag == "img" and "src" in attrs_dict:
            src = attrs_dict["src"]
            self.images.append(src)

class NboxUploaderService:
    ENDPOINT = "https://nbox.me/put"
    MAX_FILES_PER_BATCH = 20

    def __init__(self, proxy_url: Optional[str] = None, headers: Optional[Dict[str, str]] = None):
        self.proxy_url = proxy_url
        self.headers = headers or {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        }

    async def upload(self, files: List[Union[str, Path, bytes]], filenames: Optional[List[str]] = None) -> List[Dict]:
        results = []
        
        # Normalize to list of tuples (filename, content, mimetype)
        normalized_files = []
        for i, file_obj in enumerate(files):
            if isinstance(file_obj, (str, Path)):
                path = Path(file_obj)
                content = path.read_bytes()
                name = path.name
            elif isinstance(file_obj, bytes):
                content = file_obj
                name = filenames[i] if filenames and i < len(filenames) else f"file_bytes_{i}.bin"
            else:
                raise ValueError("Unsupported file type")
                
            mime = mimetypes.guess_type(name)[0] or "application/octet-stream"
            normalized_files.append((name, content, mime))

        # Batching 
        for i in range(0, len(normalized_files), self.MAX_FILES_PER_BATCH):
            batch = normalized_files[i:i + self.MAX_FILES_PER_BATCH]
            batch_result = await self._upload_batch(batch)
            results.extend(batch_result)

        return results

    async def _upload_batch(self, batch) -> List[Dict]:
        data = aiohttp.FormData(quote_fields=False)
        for name, content, mime in batch:
            data.add_field('files', content, filename=name, content_type=mime)
        
        async with aiohttp.ClientSession(headers=self.headers) as session:
            try:
                async with session.post(self.ENDPOINT, data=data, proxy=self.proxy_url) as response:
                    if response.status not in (200, 201):
                        raise UploaderNetworkError(f"HTTP Error: {response.status}")
                    html_content = await response.text()
            except aiohttp.ClientError as e:
                raise UploaderNetworkError(f"Network error: {str(e)}")
        
        return self._parse_html(html_content)

    def _parse_html(self, html: str) -> List[Dict]:
        parser = _NboxHTMLParser()
        parser.feed(html)
        
        results = []
        
        # Match links to create structure
        # Heuristic matching based on unique IDs in nbox URLs.
        base_url = "https://nbox.me"
        for i, link in enumerate(parser.raw_links):
            del_url = f"{base_url}{parser.delete_links[i]}" if i < len(parser.delete_links) else None
            thumb_url = f"{base_url}{parser.images[i]}" if i < len(parser.images) else None
            direct_url = f"{base_url}{link}" if not link.startswith("http") else link
            
            results.append({
                "direct_url": direct_url,
                "delete_url": del_url,
                "thumb_url": thumb_url
            })
            
        if not results:
            raise UploaderParseError("Failed to parse HTML structure. The service layout might have changed or Cloudflare blocked the request.")

        return results

async def main():
    service = NboxUploaderService()
    try:
        sample_bytes = b"Hello world! This is a test file for nbox.me."
        result = await service.upload([sample_bytes], filenames=["hello_nbox.txt"])
        print("Upload success:", result)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
