import OpenAI from "openai";
import path from "node:path";
import { mustGetEnv, slugify, timestamp, writeJSON, writeText } from "./utils.js";

export async function webSearch(query: string) {
  const client = new OpenAI({ apiKey: mustGetEnv("OPENAI_API_KEY") });

  // Web search is enabled via the tools array in the Responses API.
  // Docs: Web search tool for Responses API.
  const resp = await client.responses.create({
  model: "gpt-4.1-mini",
  input: [
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: `Search the web for: ${query}\n\nReturn:\n1) A short summary\n2) Bullet key points\n3) Sources (URLs if available)`
        }
      ]
    }
  ],
  tools: [{ type: "web_search" }]
});


  const stamp = timestamp();
  const base = `web-search__${slugify(query)}__${stamp}`;
  const jsonPath = path.join("references", `${base}.json`);
  const mdPath = path.join("references", `${base}.md`);

  writeJSON(jsonPath, resp);

  // Extract any text output for quick reading (best-effort)
  const textParts: string[] = [];
  for (const item of resp.output ?? []) {
    if (item.type === "message") {
      for (const c of item.content ?? []) {
        if (c.type === "output_text" && c.text) textParts.push(c.text);
      }
    }
  }
  writeText(mdPath, textParts.join("\n\n") || "No text output extracted. Check the JSON.");

  console.log(`Saved:\n- ${jsonPath}\n- ${mdPath}`);
}
