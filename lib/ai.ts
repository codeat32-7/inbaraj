import { DEFAULT_MODEL } from './models';
import Anthropic from '@anthropic-ai/sdk';
import { ResumeData, ProfileOverride } from './types';
import { GroundTruth } from './ground-truth';
import { ProfileOverrideSchema } from './schemas';

export interface ValidationViolation {
  section: string;
  field: string;
  generated: string;
  issue: 'fabricated_skill' | 'fabricated_metric' | 'fabricated_claim' | 'unverifiable';
  suggestion: string;
}

export interface ValidationResult {
  valid: boolean;
  violations: ValidationViolation[];
}

export interface GenerationPipelineResult {
  overrides: Partial<ProfileOverride>;
  validation: ValidationResult;
  retryCount: number;
}

const SYSTEM_PROMPT = `You are a resume tailoring expert. Given a candidate's base resume data (JSON) and a job description, produce a tailored version.

Rules:
1. ONLY reword, reorder, and re-emphasize existing achievements. NEVER fabricate or invent new experience, skills, metrics, or claims.
2. Every bullet point in your output MUST be a rephrased version of an existing bullet. Do not combine bullets or invent new ones.
3. Every skill MUST be derivable from existing skills — rephrasing is OK, but inventing new skills is NOT.
4. Every metric or number MUST exist in the base resume. Do not invent percentages, dollar amounts, or quantities.
5. Rewrite the hero headline and description to align with the role's language and priorities.
6. Reorder and rephrase experience bullets so the most relevant achievements lead.
7. Adjust skill emphasis — bring forward skills matching the JD, de-emphasize less relevant ones.
8. Tweak project descriptions to highlight aspects most relevant to the role.
9. You may add customSections (e.g. "Domain Expertise") that reorganize EXISTING facts from the base resume. Items in custom sections must be traceable to the base.
10. You may set a section to false to hide it if it's irrelevant to the role.
11. Return ONLY a JSON object with the fields that differ from the base. Do not include unchanged fields.
12. The response must be valid JSON — no markdown, no code fences, no commentary.

The override format:
{
  "hero": { "headline": "...", "description": "..." },
  "experience": [...],
  "skills": [...],
  "projects": [...] or false,
  "summary": "...",
  "customSections": [{ "id": "...", "title": "...", "position": "after:skills", "items": [...] }]
}

Only include fields you are changing. The system will deep-merge your overrides with the base.`;

const VALIDATION_SYSTEM_PROMPT = `You are a resume fact-checker. Your job is to compare a generated resume override against a ground truth document and flag ONLY genuinely fabricated content.

The ground truth contains the candidate's verified facts: skills, metrics, experience bullets, highlight texts, project names, project descriptions, tools, education, companies, and job titles.

CRITICAL: Use SEMANTIC understanding, not keyword matching. Rephrasing, paraphrasing, and reorganizing existing facts is ALLOWED and EXPECTED. The resume tailoring process deliberately rewords content to match job descriptions. Only flag content that introduces genuinely NEW claims not supported by ANY ground truth fact.

WHAT IS ALLOWED (do NOT flag these):
- Rephrasing: "end-to-end enterprise CMMS/SaaS rollouts" → "complex implementations for mid-to-large clients" (same meaning, different words)
- Combining: merging two related ground truth facts into one sentence
- Reorganizing: grouping existing skills under new category names relevant to the JD
- Emphasizing: highlighting a specific aspect of an existing achievement
- Shortening: condensing a verbose bullet into a tighter version while preserving the core claim
- Synonyms: "managing" for "spearheading", "data management" for "catalog management", "stakeholder communication" for "client workshops"
- Implied capabilities: if someone did "end-to-end SaaS rollouts" they clearly managed "complex implementations" — this is not fabrication

WHAT IS FABRICATED (DO flag these):
- Completely new skills with no basis in ground truth (e.g., "Payroll & HR data migration" when no payroll work exists)
- Invented metrics or numbers not in ground truth (e.g., "reduced timelines by 30%" when no such metric exists)
- Claims about experience the candidate never had (e.g., "managed data migrations" when they managed "catalog defects")
- New tools or technologies not listed anywhere in ground truth
- Certifications or qualifications not in ground truth

When checking, ask yourself: "Could a reasonable person read the ground truth and conclude this claim is supported?" If yes, it's allowed. If the claim introduces something genuinely new with no basis, flag it.

Return ONLY a JSON object in this exact format (no markdown, no code fences):
{
  "valid": true/false,
  "violations": [
    {
      "section": "skills|experience|summary|hero|customSections|highlights",
      "field": "specific field or item index",
      "generated": "the fabricated text",
      "issue": "fabricated_skill|fabricated_metric|fabricated_claim|unverifiable",
      "suggestion": "how to fix it using ground truth"
    }
  ]
}

If everything checks out, return {"valid": true, "violations": []}.
Only flag genuine fabrication. Do NOT flag reasonable rephrasings.`;

const ADAPT_SYSTEM_PROMPT = `You are a resume adaptation expert. Given a candidate's current resume data (JSON) and specific instructions on what to change, produce an updated version.

Rules:
1. ONLY modify what the user asks for. Keep everything else unchanged.
2. NEVER fabricate or invent new experience, skills, metrics, or claims.
3. Every bullet point in your output MUST be based on content from the source resume. Do not invent new ones.
4. Every skill MUST be derivable from existing skills — rephrasing is OK, but inventing new skills is NOT.
5. Every metric or number MUST exist in the source resume. Do not invent percentages, dollar amounts, or quantities.
6. You may reword, reorder, re-emphasize, add custom sections (from existing content), or hide sections as instructed.
7. Return ONLY a JSON object with the fields that differ from the source. Do not include unchanged fields.
8. The response must be valid JSON — no markdown, no code fences, no commentary.

The override format:
{
  "hero": { "headline": "...", "description": "..." },
  "experience": [...],
  "skills": [...],
  "projects": [...] or false,
  "summary": "...",
  "customSections": [{ "id": "...", "title": "...", "position": "after:skills", "items": [...] }]
}

Only include fields you are changing. The system will deep-merge your overrides with the base.`;

function stripCodeFences(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  return cleaned.trim();
}

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }
  return new Anthropic({ apiKey });
}

async function callClaude(
  client: Anthropic,
  model: string,
  system: string,
  userMessage: string,
  attempt = 0
): Promise<string> {
  try {
    const message = await client.messages.create({
      model,
      max_tokens: 16000,
      system,
      messages: [{ role: 'user', content: userMessage }],
    });

    const textBlock = message.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from Claude');
    }
    if (message.stop_reason === 'max_tokens') {
      throw new Error('Claude response was cut off (output too long). Try a shorter job description.');
    }

    return stripCodeFences(textBlock.text);
  } catch (error) {
    const isRetryable =
      error instanceof Error &&
      (error.message.includes('500') ||
        error.message.includes('socket') ||
        error.message.includes('overloaded') ||
        error.message.includes('Internal server error'));

    if (isRetryable && attempt < 2) {
      const delay = (attempt + 1) * 3000;
      await new Promise((r) => setTimeout(r, delay));
      return callClaude(client, model, system, userMessage, attempt + 1);
    }
    throw error;
  }
}

async function generateOverrides(
  client: Anthropic,
  model: string,
  base: ResumeData,
  jobDescription: string,
  feedbackFromValidation?: string
): Promise<Partial<ProfileOverride>> {
  let userMessage = `## Base Resume (JSON)\n\`\`\`json\n${JSON.stringify(base, null, 2)}\n\`\`\`\n\n## Job Description\n${jobDescription}\n\nProduce the tailored override JSON now.`;

  if (feedbackFromValidation) {
    userMessage += `\n\n## IMPORTANT: Previous attempt had fabrication issues\nThe following violations were found. Fix them by using ONLY content from the base resume:\n${feedbackFromValidation}`;
  }

  const raw = await callClaude(client, model, SYSTEM_PROMPT, userMessage);
  const parsed = JSON.parse(raw);

  // Zod validation
  const result = ProfileOverrideSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid AI output structure: ${issues}`);
  }

  return result.data as Partial<ProfileOverride>;
}

async function validateOverrides(
  client: Anthropic,
  model: string,
  groundTruth: GroundTruth,
  overrides: Partial<ProfileOverride>
): Promise<ValidationResult> {
  const userMessage = `## Ground Truth (all verified facts)\n\`\`\`json\n${JSON.stringify(groundTruth, null, 2)}\n\`\`\`\n\n## Generated Override to Validate\n\`\`\`json\n${JSON.stringify(overrides, null, 2)}\n\`\`\`\n\nValidate the override against the ground truth and return your findings as JSON.`;

  const raw = await callClaude(client, model, VALIDATION_SYSTEM_PROMPT, userMessage);

  try {
    const parsed = JSON.parse(raw);
    return {
      valid: !!parsed.valid,
      violations: Array.isArray(parsed.violations) ? parsed.violations : [],
    };
  } catch {
    // If validator response is malformed, treat as unvalidated
    return { valid: false, violations: [{ section: 'system', field: 'validator', generated: raw.slice(0, 200), issue: 'unverifiable', suggestion: 'Validator returned malformed response' }] };
  }
}

function formatViolationsAsFeedback(violations: ValidationViolation[]): string {
  return violations.map((v, i) =>
    `${i + 1}. [${v.section}] "${v.generated}" — ${v.issue}: ${v.suggestion}`
  ).join('\n');
}

export async function tailorResumeWithValidation(
  base: ResumeData,
  jobDescription: string,
  groundTruth: GroundTruth,
  model: string = DEFAULT_MODEL
): Promise<GenerationPipelineResult> {
  const client = getClient();
  const maxRetries = 2;
  let retryCount = 0;
  let overrides: Partial<ProfileOverride>;
  let validation: ValidationResult;

  // Initial generation
  overrides = await generateOverrides(client, model, base, jobDescription);

  // Validation loop
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    validation = await validateOverrides(client, model, groundTruth, overrides);

    if (validation.valid || attempt === maxRetries) {
      return { overrides, validation, retryCount };
    }

    // Re-generate with feedback
    retryCount++;
    const feedback = formatViolationsAsFeedback(validation.violations);
    overrides = await generateOverrides(client, model, base, jobDescription, feedback);
  }

  // Should not reach here, but TypeScript needs it
  return { overrides, validation: { valid: false, violations: [] }, retryCount };
}

async function generateAdaptOverrides(
  client: Anthropic,
  model: string,
  sourceResume: ResumeData,
  instruction: string,
  feedbackFromValidation?: string
): Promise<Partial<ProfileOverride>> {
  let userMessage = `## Source Resume (JSON)\n\`\`\`json\n${JSON.stringify(sourceResume, null, 2)}\n\`\`\`\n\n## What to change\n${instruction}\n\nProduce the override JSON reflecting these changes.`;

  if (feedbackFromValidation) {
    userMessage += `\n\n## IMPORTANT: Previous attempt had fabrication issues\nThe following violations were found. Fix them by using ONLY content from the source resume:\n${feedbackFromValidation}`;
  }

  const raw = await callClaude(client, model, ADAPT_SYSTEM_PROMPT, userMessage);
  const parsed = JSON.parse(raw);

  const result = ProfileOverrideSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid AI output structure: ${issues}`);
  }

  return result.data as Partial<ProfileOverride>;
}

export async function adaptResumeWithValidation(
  sourceResume: ResumeData,
  instruction: string,
  groundTruth: GroundTruth,
  model: string = DEFAULT_MODEL
): Promise<GenerationPipelineResult> {
  const client = getClient();
  const maxRetries = 2;
  let retryCount = 0;
  let overrides: Partial<ProfileOverride>;
  let validation: ValidationResult;

  // Initial generation
  overrides = await generateAdaptOverrides(client, model, sourceResume, instruction);

  // Validation loop
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    validation = await validateOverrides(client, model, groundTruth, overrides);

    if (validation.valid || attempt === maxRetries) {
      return { overrides, validation, retryCount };
    }

    // Re-generate with feedback
    retryCount++;
    const feedback = formatViolationsAsFeedback(validation.violations);
    overrides = await generateAdaptOverrides(client, model, sourceResume, instruction, feedback);
  }

  return { overrides, validation: { valid: false, violations: [] }, retryCount };
}
