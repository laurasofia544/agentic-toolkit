import path from "node:path";
import fs from "node:fs";
import { chromium } from "playwright";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { mustGetEnv, slugify, timestamp, writeText } from "./utils.js";

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

export async function designFeedback(url: string, _fullPage: boolean, waitMs: number) {
  const stamp = timestamp();
  const siteSlug = slugify(url);

  const screenshotPath = path.join("references", "screenshots", `${siteSlug}__${stamp}.jpg`);
  const feedbackPath = path.join("references", "aI_feedback", `${siteSlug}__${stamp}.md`);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    if (waitMs > 0) await page.waitForTimeout(waitMs);

    await page.screenshot({
      path: screenshotPath,
      fullPage: false,
      type: "jpeg",
      quality: 60
    });
  } finally {
    await browser.close();
  }

  const geminiKey = mustGetEnv("GEMINI_API_KEY");
  const genAI = new GoogleGenerativeAI(geminiKey);

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const imgBytes = fs.readFileSync(screenshotPath);
  const imgB64 = imgBytes.toString("base64");

  const prompt = `You are a UI/UX reviewer. Review this webpage screenshot.

Return:
1) 5 strengths
2) 5 problems (be specific)
3) Top 3 fixes with exact UI changes
4) Accessibility notes (contrast, type size, spacing, focus states)
5) Mobile responsiveness risks
`;

  let result: any;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      result = await model.generateContent([
        { text: prompt },
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: imgB64
          }
        }
      ]);
      break;
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes("429") && attempt < 4) {
        const wait = 65000;
        console.log(`Gemini 429. Waiting ${wait / 1000}s then retrying... (attempt ${attempt}/4)`);
        await sleep(wait);
        continue;
      }
      throw e;
    }
  }

  const text = result?.response?.text?.() ?? "No output.";
  writeText(
    feedbackPath,
    `# Design Feedback\n\nURL: ${url}\n\nScreenshot: ${screenshotPath}\n\n---\n\n${text}\n`
  );

  console.log(`Saved:\n- ${screenshotPath}\n- ${feedbackPath}`);
}
