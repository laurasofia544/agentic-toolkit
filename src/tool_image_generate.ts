import OpenAI from "openai";
import fs from "node:fs";
import path from "node:path";
import { mustGetEnv, slugify, timestamp, writeJSON } from "./utils.js";

export async function imageGenerate(prompt: string, size: string) {
  const client = new OpenAI({ apiKey: mustGetEnv("OPENAI_API_KEY") });

  const resp = await client.images.generate({
    model: "gpt-image-1",
    prompt,
    size: size as "1024x1024" | "1024x1536" | "1536x1024"
  });

  const stamp = timestamp();
  const base = `image__${slugify(prompt)}__${stamp}`;
  const pngPath = path.join("images", `${base}.png`);
  const jsonPath = path.join("images", `${base}.json`);

  const b64 = resp.data?.[0]?.b64_json;
  if (!b64) throw new Error("No b64_json returned from image generation.");

  fs.writeFileSync(pngPath, Buffer.from(b64, "base64"));
  writeJSON(jsonPath, { prompt, size, model: "gpt-image-1", createdAt: new Date().toISOString() });

  console.log(`Saved:\n- ${pngPath}\n- ${jsonPath}`);
}
