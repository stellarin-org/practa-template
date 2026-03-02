import type { Express, Request, Response, NextFunction } from "express";

let openaiClient: any = null;
let geminiClient: any = null;
let anthropicClient: any = null;

function getOpenAI() {
  if (!openaiClient) {
    if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
      throw Object.assign(
        new Error("OpenAI integration is not configured. Install the OpenAI Replit AI integration to use this provider."),
        { status: 501, type: "not_configured" }
      );
    }
    const { default: OpenAI } = require("openai");
    openaiClient = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  }
  return openaiClient;
}

function getGemini() {
  if (!geminiClient) {
    if (!process.env.AI_INTEGRATIONS_GEMINI_API_KEY) {
      throw Object.assign(
        new Error("Gemini integration is not configured. Install the Gemini Replit AI integration to use this provider."),
        { status: 501, type: "not_configured" }
      );
    }
    const { GoogleGenAI } = require("@google/genai");
    geminiClient = new GoogleGenAI({
      apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
      httpOptions: {
        apiVersion: "",
        baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
      },
    });
  }
  return geminiClient;
}

function getAnthropic() {
  if (!anthropicClient) {
    if (!process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY) {
      throw Object.assign(
        new Error("Anthropic integration is not configured. Install the Anthropic Replit AI integration to use this provider."),
        { status: 501, type: "not_configured" }
      );
    }
    const { default: Anthropic } = require("@anthropic-ai/sdk");
    anthropicClient = new Anthropic({
      apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
    });
  }
  return anthropicClient;
}

const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 10;

function rateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);

  if (recent.length >= RATE_LIMIT_MAX) {
    return res.status(429).json({ error: "Rate limit exceeded. Try again in a minute." });
  }

  recent.push(now);
  rateLimitMap.set(ip, recent);
  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of rateLimitMap) {
    const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);
    if (recent.length === 0) {
      rateLimitMap.delete(ip);
    } else {
      rateLimitMap.set(ip, recent);
    }
  }
}, RATE_LIMIT_WINDOW);

export function registerPractaAIRoutes(app: Express) {
  const jsonLimit = require("express").json({ limit: "2mb" });

  app.post("/api/ai/openai", jsonLimit, rateLimit, async (req: Request, res: Response) => {
    try {
      const openai = getOpenAI();
      const { messages, ...rest } = req.body;
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "messages array is required and must be non-empty" });
      }

      const response = await openai.chat.completions.create({
        messages,
        ...rest,
      });

      res.json(response);
    } catch (error: any) {
      console.error("[practa-ai/openai] Error:", error?.message || error);
      const status = error?.status || error?.statusCode || 500;
      res.status(status).json({
        error: error?.message || "OpenAI request failed",
        type: error?.type || "api_error",
      });
    }
  });

  app.post("/api/ai/gemini", jsonLimit, rateLimit, async (req: Request, res: Response) => {
    try {
      const gemini = getGemini();
      const { model, contents, generationConfig, ...rest } = req.body;
      if (!contents) {
        return res.status(400).json({ error: "contents is required" });
      }

      const response = await gemini.models.generateContent({
        model: model || "gemini-2.5-flash",
        contents,
        config: generationConfig,
        ...rest,
      });

      res.json({
        text: response.text || "",
        candidates: response.candidates,
        usageMetadata: response.usageMetadata,
        modelVersion: response.modelVersion,
      });
    } catch (error: any) {
      console.error("[practa-ai/gemini] Error:", error?.message || error);
      const status = error?.status || error?.statusCode || 500;
      res.status(status).json({
        error: error?.message || "Gemini request failed",
        type: error?.type || "api_error",
      });
    }
  });

  app.post("/api/ai/anthropic", jsonLimit, rateLimit, async (req: Request, res: Response) => {
    try {
      const anthropic = getAnthropic();
      const { messages, ...rest } = req.body;
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "messages array is required and must be non-empty" });
      }

      const response = await anthropic.messages.create({
        messages,
        ...rest,
      });

      res.json(response);
    } catch (error: any) {
      console.error("[practa-ai/anthropic] Error:", error?.message || error);
      const status = error?.status || error?.statusCode || 500;
      res.status(status).json({
        error: error?.message || "Anthropic request failed",
        type: error?.type || "api_error",
      });
    }
  });
}
