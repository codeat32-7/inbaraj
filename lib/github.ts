const OWNER = process.env.GITHUB_OWNER || 'codeat32-7';
const REPO = process.env.GITHUB_REPO || 'inbaraj';

interface GitHubFileResponse {
  sha: string;
  content: string;
}

function getHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN not set');
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };
}

function getBranch(): string {
  return process.env.GITHUB_BRANCH || 'main';
}

async function getFileSha(path: string): Promise<string | null> {
  const headers = getHeaders();
  const branch = getBranch();
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}?ref=${branch}`;

  const res = await fetch(url, { headers });
  if (!res.ok) return null;

  const data = (await res.json()) as GitHubFileResponse;
  return data.sha;
}

export async function commitFile(
  path: string,
  content: string,
  message: string
): Promise<void> {
  const headers = getHeaders();
  const branch = getBranch();
  const sha = await getFileSha(path);

  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;
  const body: Record<string, string> = {
    message,
    content: Buffer.from(content).toString('base64'),
    branch,
  };

  if (sha) {
    body.sha = sha;
  }

  const res = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`GitHub API error: ${err.message || res.statusText}`);
  }
}

export async function getFileContent(path: string): Promise<string | null> {
  const headers = getHeaders();
  const branch = getBranch();
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}?ref=${branch}`;

  const res = await fetch(url, { headers, next: { revalidate: 0 } });
  if (!res.ok) return null;

  const data = (await res.json()) as GitHubFileResponse;
  return Buffer.from(data.content, 'base64').toString('utf-8');
}

export async function getRegistryFromGitHub(): Promise<Record<string, { company: string; created: string; active: boolean }>> {
  const content = await getFileContent('data/profiles/registry.json');
  if (!content) return {};
  return JSON.parse(content);
}

export async function getProfileFromGitHub(slug: string): Promise<Record<string, unknown> | null> {
  const content = await getFileContent(`data/profiles/${slug}.json`);
  if (!content) return null;
  return JSON.parse(content);
}
