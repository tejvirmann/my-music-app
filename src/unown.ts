import { norm } from './search';

// Metro needs literal require paths, so every glyph is listed. Produced by scripts/crop-unown.py (black on transparent).
const GLYPHS = {
  a: require('../assets/unown/a.png'),
  b: require('../assets/unown/b.png'),
  c: require('../assets/unown/c.png'),
  d: require('../assets/unown/d.png'),
  e: require('../assets/unown/e.png'),
  f: require('../assets/unown/f.png'),
  g: require('../assets/unown/g.png'),
  h: require('../assets/unown/h.png'),
  i: require('../assets/unown/i.png'),
  j: require('../assets/unown/j.png'),
  k: require('../assets/unown/k.png'),
  l: require('../assets/unown/l.png'),
  m: require('../assets/unown/m.png'),
  n: require('../assets/unown/n.png'),
  o: require('../assets/unown/o.png'),
  p: require('../assets/unown/p.png'),
  q: require('../assets/unown/q.png'),
  r: require('../assets/unown/r.png'),
  s: require('../assets/unown/s.png'),
  t: require('../assets/unown/t.png'),
  u: require('../assets/unown/u.png'),
  v: require('../assets/unown/v.png'),
  w: require('../assets/unown/w.png'),
  x: require('../assets/unown/x.png'),
  y: require('../assets/unown/y.png'),
  z: require('../assets/unown/z.png'),
  bang: require('../assets/unown/bang.png'),
  question: require('../assets/unown/question.png'),
};

/** The Unown that matches the name's first letter. Digits get ! and anything else gets ?. */
export function unownFor(name: string) {
  const ch = norm(name).replace(/ /g, '')[0] ?? '';
  if (ch >= 'a' && ch <= 'z') return GLYPHS[ch as keyof typeof GLYPHS];
  return ch >= '0' && ch <= '9' ? GLYPHS.bang : GLYPHS.question;
}
