/** Forgiving matching for the search box: ignores case, accents and punctuation, matches word starts and the middle of words, and tolerates typos. */

export const norm = (s?: string) =>
  (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’`]/g, '').replace(/[\s!-\/:-@\[-`{-~]+/g, ' ').trim();

export const queryTokens = (q: string) => norm(q).split(' ').filter(Boolean);

/** A searchable thing: normalised text per field, the same with spaces removed ("lovestory"), and its distinct words for typo matching. */
export interface Prepped { f: Record<string, string>; j: Record<string, string>; words: string[] }

export function prep(fields: Record<string, string | undefined>): Prepped {
  const f: Record<string, string> = {}, j: Record<string, string> = {};
  const words = new Set<string>();
  for (const k in fields) {
    const v = norm(fields[k]);
    f[k] = v; j[k] = v.replace(/ /g, '');
    for (const w of v.split(' ')) if (w.length >= 3 && !/^\d+$/.test(w)) words.add(w);
  }
  return { f, j, words: [...words] };
}

/** Edit distance, giving up (returns max + 1) once it must exceed max. */
function lev(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let low = i;
    for (let k = 1; k <= b.length; k++) {
      cur[k] = Math.min(prev[k] + 1, cur[k - 1] + 1, prev[k - 1] + (a[i - 1] === b[k - 1] ? 0 : 1));
      if (cur[k] < low) low = cur[k];
    }
    if (low > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

const close = (t: string, w: string) => {
  const d = t.length >= 8 ? 2 : 1;
  return lev(t, w, d) <= d || (w.length > t.length && lev(t, w.slice(0, t.length), d) <= d);
};

function tokenScore(p: Prepped, t: string, fuzzy: boolean, hits: Set<string>, weights: Record<string, number>) {
  let best = 0;
  for (const k in p.f) {
    const v = p.f[k];
    if (!v) continue;
    let s = 0;
    if (v === t) s = 4;
    else if (v.startsWith(t)) s = 3;
    else if (` ${v}`.includes(` ${t}`)) s = 2.5;
    else if (v.includes(t) || (t.length >= 4 && p.j[k].includes(t))) s = 1.5;
    if (s) { hits.add(k); best = Math.max(best, s * (weights[k] ?? 1)); }
  }
  if (!best && fuzzy && t.length >= 4 && !/^\d+$/.test(t) && p.words.some((w) => close(t, w))) best = 0.8;
  return best;
}

export interface Hit<T> { item: T; hits: Set<string>; score: number }

/** Every word typed must match something. Exact matches come first; typo-tolerant ones are added after them when exact matches are few. */
export function searchItems<T>(rows: { item: T; p: Prepped }[], q: string, weights: Record<string, number> = {}): Hit<T>[] {
  const toks = queryTokens(q);
  if (!toks.length) return [];
  const phrase = toks.length > 1 ? toks.join(' ') : '';
  const run = (fuzzy: boolean) => {
    const out: Hit<T>[] = [];
    for (const { item, p } of rows) {
      const hits = new Set<string>();
      let score = 0, ok = true;
      for (const t of toks) {
        const s = tokenScore(p, t, fuzzy, hits, weights);
        if (!s) { ok = false; break; }
        score += s;
      }
      if (!ok) continue;
      if (phrase && Object.values(p.f).some((v) => v.includes(phrase))) score += 3;
      out.push({ item, hits, score });
    }
    return out.sort((a, b) => b.score - a.score);
  };
  const exact = run(false);
  if (exact.length >= 12) return exact;
  const seen = new Set(exact.map((x) => x.item));
  return exact.concat(run(true).filter((x) => !seen.has(x.item)));
}
