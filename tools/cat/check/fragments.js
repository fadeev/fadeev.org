// List frames whose silhouette is in more than one piece (pieces over `min` px).
//   node fragments.js <dir> <names...>
const fs = require('fs');
const [dir, ...names] = process.argv.slice(2);
const W = 256, H = 160, n = W * H, min = 3;
for (const name of names) {
  const b = fs.readFileSync(`${dir}/${name}.1x.gray`), N = b.length / n, bad = [];
  for (let f = 0; f < N; f++) {
    const label = new Int32Array(n); let next = 1; const sizes = [];
    for (let i = 0; i < n; i++) {
      if (b[f * n + i] >= 128 || label[i]) continue;
      const st = [i]; label[i] = next; let size = 0;
      while (st.length) { const p = st.pop(); size++; const x = p % W, y = (p / W) | 0;
        for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) { const xx = x + u, yy = y + v; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const q = yy * W + xx; if (b[f * n + q] < 128 && !label[q]) { label[q] = next; st.push(q); } } }
      sizes.push(size); next++;
    }
    sizes.sort((a, c) => c - a);
    const extra = sizes.slice(1).filter(s => s >= min);
    if (extra.length) bad.push(`${f}:${extra.join('+')}`);
  }
  console.log(name.padEnd(9), N, 'frames,', bad.length, 'broken', bad.slice(0, 30).join(' '));
}
