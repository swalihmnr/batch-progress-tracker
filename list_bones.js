const fs = require('fs');
// Very simple script to just read strings from the file to guess bone names
const buffer = fs.readFileSync('public/custom_avatar.glb');
const content = buffer.toString('utf8');
const match = content.match(/LeftArm|LeftForeArm|RightArm|RightForeArm|Spine|Neck/g);
console.log([...new Set(match)]);
