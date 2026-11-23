# Workbench end-to-end test (no real API keys needed)

Runs the ATS workbench in a real browser against **mock** Claude and Jev servers, so the whole flow
(score, triage, reword, ask-for-a-fact, accept a real gap, undo, reload, Studio handoff) can be checked offline.

```bash
node scripts/workbench-e2e/mock-servers.cjs &          # mock Anthropic :4011, mock Jev :4012 (decodes zstd bodies)
ADMIN_PASSWORD=pw ANTHROPIC_API_KEY=test ANTHROPIC_BASE_URL=http://localhost:4011 \
TYPESAFE_API_KEY=test TYPESAFE_BASE_URL=http://localhost:4012 npx next dev -p 3111 &
NODE_PATH=$(npm root -g) node scripts/workbench-e2e/e2e.cjs /tmp   # prints PASS/FAIL per step; screenshots in /tmp
```

The mocks are deterministic stand-ins. They prove the wiring and the guards, **not** how well the real
Jev/Claude judge or phrase things; confirm that once on the deployed site with the real keys.
Needs Playwright (preinstalled in the cloud environment). Saving to a live profile needs GitHub and is not covered.
