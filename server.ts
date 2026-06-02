import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";
import FormData from "form-data";
import axios from "axios";
import * as cheerio from "cheerio";
import { SocksProxyAgent } from "socks-proxy-agent";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'dummy' });
const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for nbox.me proxy
  app.post("/api/upload-nbox", (req, res) => {
    upload.single("file")(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: "Multer error: " + err.message });
      }
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

      const { useTor, torProxyUrl } = req.body;
      
      const formData = new FormData();
      formData.append("files", req.file.buffer, {
        filename: req.file.originalname || "image.jpg",
        contentType: req.file.mimetype || "image/jpeg",
      });

      let httpsAgent = undefined;
      if (useTor === 'true' && torProxyUrl) {
         try {
            httpsAgent = new SocksProxyAgent(torProxyUrl);
         } catch (e) {
            console.error("Invalid Tor Proxy URL:", e);
         }
      }

      let response;
      try {
        response = await axios.post("https://nbox.me/put", formData, {
          headers: {
            ...formData.getHeaders(),
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
          },
          httpsAgent,
          validateStatus: () => true
        });
      } catch (err: any) {
        console.error("nbox.me request failed:", err);
        response = { status: 500, data: '' };
      }

      let direct_url: string | undefined;
      let delete_url: string | undefined;
      let isNboxSuccess = false;

      if (response.status === 200 || response.status === 201) {
        const $ = cheerio.load(response.data);
        const rawLinks: string[] = [];
        const deleteLinks: string[] = [];
        
        $("a").each((_, el) => {
          const href = $(el).attr("href");
          if (href && !href.startsWith("/cdn-cgi/") && !href.startsWith("/about") && !href.startsWith("/faq") && !href.startsWith("/terms")) {
            if (href.includes("delete")) {
              deleteLinks.push(href);
            } else {
              rawLinks.push(href);
            }
          }
        });

        if (rawLinks.length > 0) {
          direct_url = rawLinks[0].startsWith("http") ? rawLinks[0] : `https://nbox.me${rawLinks[0]}`;
          delete_url = deleteLinks.length > 0 ? `https://nbox.me${deleteLinks[0]}` : undefined;
          isNboxSuccess = true;
        }
      }

      if (!isNboxSuccess) {
        console.warn(`nbox.me failed. Falling back to catbox.moe...`);
        const catboxForm = new FormData();
        catboxForm.append("reqtype", "fileupload");
        catboxForm.append("fileToUpload", req.file.buffer, {
          filename: req.file.originalname || "image.jpg",
          contentType: req.file.mimetype || "image/jpeg",
        });
        
        const catboxResponse = await axios.post("https://catbox.moe/user/api.php", catboxForm, {
          headers: {
            ...catboxForm.getHeaders(),
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
          },
          validateStatus: () => true
        });

        if (catboxResponse.status === 200 && typeof catboxResponse.data === 'string' && (catboxResponse.data.startsWith('http') || catboxResponse.data.includes('catbox.moe'))) {
           return res.json({ direct_url: catboxResponse.data.trim(), delete_url: undefined });
        }

        return res.status(response.status || 500).json({ error: "nbox.me failed and catbox.moe fallback also failed.", details: response.data || "" });
      }

      res.json({ direct_url, delete_url });
    } catch (error: any) {
      console.error("Nbox Upload Error:", error);
      res.status(500).json({ error: error.message || "Failed to upload to nbox" });
    }
    }); // Close multer callback
  });

  // API Route for generating description
  app.post("/api/generate-description", async (req, res) => {
    try {
      const { prompt, isCommon } = req.body;
      
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API key is missing. Configure it in secrets." });
      }

      const systemInstruction = isCommon 
        ? "Ты ИИ-ассистент, помогающий писать общие описания (шаблоны/правила/глобальную информацию) для группы фотографий. Отвечай только сгенерированным текстом."
        : "Ты ИИ-ассистент, помогающий писать уникальные описания для конкретных фотографий. Отвечай только сгенерированным текстом.";

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt || "Опиши фотографии в мрачном киберпанк стиле.",
        config: { systemInstruction }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate description" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
