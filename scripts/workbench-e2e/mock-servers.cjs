const http = require('http');
const STOP = new Set('the a an and or of to in for with on at is are be by as from that this their they your our can will'.split(' '));
const toks = (s) => new Set((String(s).toLowerCase().match(/[a-z0-9+#]{3,}/g) || []).filter((w) => !STOP.has(w)));
const overlap = (req, ev) => { const r = toks(req), e = toks(ev); if (!r.size) return 1; let h = 0; for (const t of r) if (e.has(t)) h++; return h / r.size; };
const zlib = require('zlib');
const readBody = (req) => new Promise((res) => { const ch = []; req.on('data', (c) => ch.push(c)); req.on('end', () => { let buf = Buffer.concat(ch); try { const enc = req.headers['content-encoding']; if (enc === 'gzip') buf = zlib.gunzipSync(buf); else if (enc === 'deflate') buf = zlib.inflateSync(buf); else if (enc === 'br') buf = zlib.brotliDecompressSync(buf); else if (enc === 'zstd') buf = zlib.zstdDecompressSync(buf); } catch (e) {} res(buf.toString('utf8')); }); });
process.on('uncaughtException', (e) => console.log('uncaught', e.message));
const send = (res, obj, code = 200) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };

// ---- mock Anthropic (messages API)
http.createServer(async (req, res) => {
  const body = JSON.parse((await readBody(req)) || '{}');
  const system = String(body.system || ''); const user = String(body.messages?.[0]?.content || '');
  let text = '{}';
  if (system.includes('review ATS gaps')) {
    const items = [...user.matchAll(/^#(\d+) \[[^\]]*\] (.*)$/gm)].map((m) => {
      const idx = Number(m[1]), r = m[2];
      if (/compensation|python|certif/i.test(r)) return { index: idx, kind: 'true-gap', reason: 'Known gap: nothing in your facts supports this.', question: null };
      if (/startup|large-enterprise|office|hyderabad/i.test(r)) return { index: idx, kind: 'needs-fact', reason: 'Your facts do not say either way.', question: 'Have you worked in a startup environment? Where, and what was your role?' };
      return { index: idx, kind: 'rephrase', reason: 'Your facts already show this; the wording differs.', question: null };
    });
    text = JSON.stringify({ items });
  } else if (system.includes('help close ONE ATS gap')) {
    const req = (user.match(/<gap[^>]*>([\s\S]*?)<\/gap>/) || [])[1] || '';
    const fact = (user.match(/<candidate_fact>([\s\S]*?)<\/candidate_fact>/) || [])[1];
    const targets = [...user.matchAll(/^((?:hero\.description|experience\.\d+\.bullets\.\d+|skills\.\d+\.items\.\d+)) \| (.*)$/gm)].map((m) => ({ path: m[1], text: m[2] }));
    if (fact) {
      text = JSON.stringify({ kind: 'rephrase', explanation: 'Drafted a new bullet from your answer.', question: null, edit: { path: 'experience.0.bullets.+', after: fact.trim().replace(/\.?$/, '.') } });
    } else if (/compensation|python|certif/i.test(req)) {
      text = JSON.stringify({ kind: 'true-gap', explanation: 'Your verified facts show you do not have this; adding it would be a fabrication.', question: null, edit: null });
    } else if (/startup|large-enterprise|office|hyderabad/i.test(req)) {
      text = JSON.stringify({ kind: 'needs-fact', explanation: 'Only you can say.', question: 'Have you worked in a startup environment? Where, and what was your role?', edit: null });
    } else {
      const words = [...toks(req)];
      const cand = targets.filter((t) => t.path.startsWith('experience') && t.text.length < 190).sort((a, b) => overlap(req, b.text) - overlap(req, a.text))[0];
      const bad = /FABRICATE/i.test(req);
      text = JSON.stringify({ kind: 'rephrase', explanation: 'Reworded an existing bullet to use the job’s own terms.', question: null, edit: { path: cand.path, after: cand.text.replace(/\.$/, '') + ' — ' + words.slice(0, 7).join(' ') + (bad ? ' with 99% accuracy' : '') } });
    }
  } else if (system.includes('strict resume fact-checker')) {
    const edited = (user.match(/<edited>([\s\S]*?)<\/edited>/) || [])[1] || '';
    const sup = !/zzzfake|fabricated/i.test(edited);
    text = JSON.stringify({ supported: sup, issues: sup ? [] : ['Contains a claim not in your facts.'] });
  } else if (system.includes('You judge whether')) {
    const r = (user.match(/<requirement>([\s\S]*?)<\/requirement>/) || [])[1] || ''; const e = (user.match(/<evidence>([\s\S]*?)<\/evidence>/) || [])[1] || '';
    const o = overlap(r, e);
    text = JSON.stringify({ verdict: o >= 0.5 ? 'covered' : o >= 0.25 ? 'partial' : 'missing', reason: 'mock' });
  }
  send(res, { id: 'msg_mock', type: 'message', role: 'assistant', model: body.model, content: [{ type: 'text', text }], stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } });
}).listen(4011, () => console.log('mock anthropic :4011'));

// ---- mock Jev (TypeSafe systemone)
http.createServer(async (req, res) => {
  const body = JSON.parse((await readBody(req)) || '{}');
  const st = body.state || {};
  const ev = Array.isArray(st.resumeEvidence) ? st.resumeEvidence.join(' ') : String(st.resumeEvidence || '');
  const o = overlap(st.jobRequirement || '', ev);
  const choice = o >= 0.5 ? 'covered' : o >= 0.25 ? 'partial' : 'missing';
  const p = { covered: 0.05, partial: 0.05, missing: 0.05 }; p[choice] = 0.9;
  send(res, { answers: { answer: { choice, probabilities: p } } });
}).listen(4012, () => console.log('mock jev :4012'));
