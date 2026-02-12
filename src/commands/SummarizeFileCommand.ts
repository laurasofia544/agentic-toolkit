import type { Command as CommanderProgram } from "commander";
import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import { mustGetEnv, ensureDir, slugify, timestamp, writeText } from "../utils.js";
import type { Command } from "./Command.js";

export class SummarizeFileCommand implements Command {
  name = "summarize-file";
  description = "Summarize a local text/markdown file and save the result to references/summaries/";

  register(program: CommanderProgram): void {
    program
      .command(this.name)
      .description(this.description)
      .argument("<filePath>", "Path to a .txt or .md file")
      .option("-g, --goal <goal>", "What you want the summary for (default: study notes)", "study notes")
      .option("-m, --model <model>", "OpenAI model", "gpt-4.1-mini")
      .action(async (filePath: string, opts: { goal: string; model: string }) => {
        try {
          const fullPath = path.resolve(filePath);
          if (!fs.existsSync(fullPath)) {
            throw new Error(`File not found: ${fullPath}`);
          }

          const inputText = fs.readFileSync(fullPath, "utf8");
          if (inputText.trim().length === 0) {
            throw new Error("File is empty.");
          }

          const client = new OpenAI({ apiKey: mustGetEnv("OPENAI_API_KEY") });

          const prompt = `Summarize the following content for the goal: ${opts.goal}

Requirements:
- Start with a 3–5 sentence summary.
- Then give 8–12 bullet points of key takeaways.
- Then give 5 “flashcard Q&A” items.

CONTENT:
${inputText}`;

          const resp = await client.responses.create({
            model: opts.model,
            input: [
              {
                role: "user",
                content: [{ type: "input_text", text: prompt }]
              }
            ]
          });

          const parts: string[] = [];
          for (const item of resp.output ?? []) {
            if (item.type === "message") {
              for (const c of item.content ?? []) {
                if (c.type === "output_text" && c.text) parts.push(c.text);
              }
            }
          }
          const outputText = parts.join("\n\n").trim() || "No output extracted. Check raw response JSON.";

          const outDir = path.join("references", "summaries");
          ensureDir(outDir);

          const baseName = `${slugify(path.basename(fullPath))}__${timestamp()}`;
          const outPath = path.join(outDir, `${baseName}.md`);

          const md = `# File Summary

**Input file:** ${fullPath}  
**Goal:** ${opts.goal}  
**Model:** ${opts.model}  

---

${outputText}
`;

          writeText(outPath, md);

          console.log(outputText);
          console.log(`Saved to: ${outPath}`);
        } catch (err: any) {
          console.error(err?.message ?? String(err));
          process.exitCode = 1;
        }
      });
  }
}
