import { Express, Request, Response } from "express";

const CDN_BASE_URL =
  process.env.CDN_BASE_URL ||
  "https://stellarin-practa-verification.replit.app";

const FETCH_TIMEOUT_MS = 15000;
const MAX_RESPONSE_SIZE = 5 * 1024 * 1024; // 5MB

export function registerCdnRoutes(app: Express): void {
  app.get("/api/cdn-proxy/*", async (req: Request, res: Response) => {
    const path = req.params[0];

    if (!path) {
      return res.status(400).json({ error: "Path is required" });
    }

    const cdnUrl = `${CDN_BASE_URL}/${path}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const response = await fetch(cdnUrl, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "User-Agent": "Stellarin-CDN-Proxy/1.0",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return res.status(response.status).json({
          error: `CDN returned ${response.status}`,
        });
      }

      const contentLength = response.headers.get("content-length");
      if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
        return res.status(413).json({ error: "Response too large" });
      }

      const contentType =
        response.headers.get("content-type") || "application/octet-stream";
      res.setHeader("Content-Type", contentType);

      if (contentLength) {
        res.setHeader("Content-Length", contentLength);
      }

      res.setHeader("Cache-Control", "public, max-age=300");

      const arrayBuffer = await response.arrayBuffer();

      if (arrayBuffer.byteLength > MAX_RESPONSE_SIZE) {
        return res.status(413).json({ error: "Response too large" });
      }

      res.send(Buffer.from(arrayBuffer));
    } catch (error: any) {
      if (error?.name === "AbortError") {
        return res.status(504).json({ error: "CDN request timed out" });
      }

      console.error("CDN proxy error:", error?.message || error);
      res.status(502).json({ error: "Failed to fetch from CDN" });
    }
  });
}
