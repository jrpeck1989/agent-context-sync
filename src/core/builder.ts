import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import * as mustache from "mustache";
import { z } from "zod";
import { getProjectRoot } from "./config";

// Zod schema for validation
const AgentOutputSchema = z.object({
  agent: z.string(),
  template: z.string(),
  outFile: z.string(),
});

const CursorRuleOutputSchema = z.object({
  type: z.literal("cursor-rule"),
  name: z.string(),
  template: z.string(),
  outFile: z.string(),
});

const OutputSchema = z.union([AgentOutputSchema, CursorRuleOutputSchema]);

const ConfigSchema = z.object({
  schema: z.number(),
  partialsDir: z.string(),
  templatesDir: z.string(),
  output: z.array(OutputSchema),
});

type BuildOutput = {
  outFile: string;
  content: string;
  isCursorRule?: boolean;
};

async function getBuildConfig() {
  const rootDir = getProjectRoot();
  const configPath = path.join(rootDir, ".agent-instructions.yaml");

  if (!fs.existsSync(configPath)) {
    throw new Error(
      '.agent-instructions.yaml not found. Please run "init" first.'
    );
  }

  const config = yaml.load(fs.readFileSync(configPath, "utf8"));
  return ConfigSchema.parse(config);
}

export async function getBuildOutput(): Promise<BuildOutput[]> {
  const validatedConfig = await getBuildConfig();
  const rootDir = getProjectRoot();
  const partialsDir = path.join(rootDir, validatedConfig.partialsDir);
  const templatesDir = path.join(rootDir, validatedConfig.templatesDir);

  const partials: Record<string, string> = {};
  const partialFiles = fs.readdirSync(partialsDir);
  for (const file of partialFiles) {
    const partialName = path.parse(file).name;
    partials[partialName] = fs.readFileSync(
      path.join(partialsDir, file),
      "utf8"
    );
  }

  const buildOutputs: BuildOutput[] = [];

  for (const output of validatedConfig.output) {
    const templatePath = path.join(templatesDir, output.template);
    if (!fs.existsSync(templatePath)) {
      console.error(`Error: Template not found: ${templatePath}`);
      continue;
    }
    const template = fs.readFileSync(templatePath, "utf8");
    const content = mustache.render(template, {}, partials);

    const isCursorRule = "type" in output && output.type === "cursor-rule";
    buildOutputs.push({
      outFile: output.outFile,
      content,
      isCursorRule,
    });
  }

  return buildOutputs;
}

export async function runBuild() {
  const buildOutputs = await getBuildOutput();
  const rootDir = getProjectRoot();

  for (const output of buildOutputs) {
    let outFilePath: string;

    if (output.isCursorRule) {
      // Create .cursor/rules directory if it doesn't exist
      const cursorRulesDir = path.join(rootDir, ".cursor", "rules");
      if (!fs.existsSync(cursorRulesDir)) {
        fs.mkdirSync(cursorRulesDir, { recursive: true });
      }
      outFilePath = path.join(cursorRulesDir, output.outFile);
    } else {
      outFilePath = path.join(rootDir, output.outFile);
    }

    fs.writeFileSync(outFilePath, output.content);
    console.error(`Successfully built: ${outFilePath}`);
  }
}
