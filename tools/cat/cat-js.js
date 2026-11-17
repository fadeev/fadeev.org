// Write cat.js from the template and the built clip data.
//   node cat-js.js <cat.template.js> <cat-clips.json> <walk-travel.json> <version> <out cat.js>
const fs = require('fs');
const [tpl, clipsFile, walkFile, version, out] = process.argv.slice(2);
const data = JSON.parse(fs.readFileSync(clipsFile));
const walkTravel = JSON.parse(fs.readFileSync(walkFile));
const num = (v, d) => +v.toFixed(d);
const rowsOf = (arr, d, per = 16, indent = '      ') => {
  const r = []; for (let i = 0; i < arr.length; i += per) r.push(indent + arr.slice(i, i + per).map(v => num(v, d).toFixed(d)).join(', ') + ',');
  return r.join('\n');
};
const lines = [];
lines.push(`const version = ${version};`);
lines.push(`const cell = { width: ${data.cell.width}, height: ${data.cell.height}, ground: ${data.cell.ground} };`);
lines.push('const clips = {');
for (const [name, c] of Object.entries(data.clips)) {
  const parts = [`src: '${c.src}'`, `frames: ${c.frames}`, `fps: ${c.fps}`, `columns: ${c.columns}`, `rows: ${c.rows}`];
  if (name === 'idle' || name === 'sitloop' || name === 'walk' || name === 'petloop') parts.push('loop: true');
  if (c.every) parts.push(`every: ${c.every}`, `length: ${c.length}`);
  if (c.skip && c.skip.length) parts.push(`skip: [${c.skip.join(', ')}]`);
  if (name === 'walk') {
    lines.push(`  ${name}: { ${parts.join(', ')}, stride: ${walkTravel.stride}, travel: [`);
    lines.push(rowsOf(walkTravel.travel, 4, 16, '    '));
    lines.push('  ] },');
  } else if (c.travel) {
    lines.push(`  ${name}: { ${parts.join(', ')}, travel: [`);
    lines.push(rowsOf(c.travel, 1, 16, '    '));
    lines.push('  ] },');
  } else lines.push(`  ${name}: { ${parts.join(', ')} },`);
}
lines.push('};');
lines.push(`const joins = {`);
lines.push(`  startToWalk: { frame: ${data.joins.startToWalk.frame}, dx: ${data.joins.startToWalk.dx} },`);
lines.push(`  walkToStop: { frame: ${data.joins.walkToStop.frame}, dx: ${data.joins.walkToStop.dx} },`);
lines.push(`  // idle exposures each clip leaves from or arrives on`);
lines.push(`  idleExit: { ${Object.entries(data.joins.idleExit).map(([k, v]) => `${k}: ${v}`).join(', ')} },`);
lines.push(`  idleEntry: { ${Object.entries(data.joins.idleEntry).map(([k, v]) => `${k}: ${v}`).join(', ')} },`);
if (data.joins.pet) lines.push(`  // relaxing after petting lands on this idle exposure\n  pet: { entry: ${data.joins.pet.entry} },`);
if (data.joins.turn) lines.push(`  // the turn leaves the idle at \`exit\`, lands on the mirrored idle at \`entry\`, drawn \`dx\` sheet px over\n  turn: { exit: ${data.joins.turn.exit}, entry: ${data.joins.turn.entry}, dx: ${data.joins.turn.dx} },`);
lines.push('};');
fs.writeFileSync(out, fs.readFileSync(tpl, 'utf8').replace('/*CLIPS*/', lines.join('\n')));
console.log('wrote', out);
