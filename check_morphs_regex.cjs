const fs = require('fs');
const buffer = fs.readFileSync('public/custom_avatar.glb');
const str = buffer.toString('utf8');
const regex = /.{0,20}(morph|blendshape|viseme|jaw).{0,20}/gi;
let match;
const matches = [];
while ((match = regex.exec(str)) !== null) {
  matches.push(match[0]);
  if (matches.length > 50) break;
}
console.log([...new Set(matches)]);
