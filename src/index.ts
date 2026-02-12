import { SummarizeFileCommand } from "./commands/SummarizeFileCommand.js";
import { Command } from "commander";
import { webSearch } from "./tool_web_search.js";
import { imageGenerate } from "./tool_image_generate.js";
import { designFeedback } from "./tool_design_feedback.js";

const program = new Command();

program
  .name("cli-ai-toolkit")
  .description("CLI AI Toolkit (web-search, image-generate, design-feedback)")
  .version("1.0.0");

program
  .command("web-search")
  .description('Search the web using OpenAI built-in web search tool. Saves output in "references/".')
  .argument("<query...>", "Search query text")
  .action(async (queryParts: string[]) => {
    await webSearch(queryParts.join(" "));
  });

program
  .command("image-generate")
  .description('Generate an image using OpenAI and save it to "images/".')
  .argument("<prompt...>", "Image prompt text")
  .option("--size <size>", "1024x1024 | 1024x1536 | 1536x1024", "1024x1024")
  .action(async (promptParts: string[], opts: { size: string }) => {
    await imageGenerate(promptParts.join(" "), opts.size);
  });

program
  .command("design-feedback")
  .description('Take a screenshot of a URL and ask Gemini for UI/UX feedback. Saves to "references/screenshots" and "references/aI_feedback".')
  .argument("<url>", "Website URL")
  .option("--fullPage", "Capture full page", true)
  .option("--waitMs <ms>", "Extra wait time before screenshot", "1000")
  .action(async (url: string, opts: { fullPage: boolean; waitMs: string }) => {
    await designFeedback(url, opts.fullPage, Number(opts.waitMs));
  });
new SummarizeFileCommand().register(program);

program.parseAsync(process.argv);


