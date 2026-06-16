const fs = require('fs');
const buffer = fs.readFileSync('public/custom_avatar.glb');

// Find the start of the JSON chunk
const jsonChunkLength = buffer.readUInt32LE(12);
const jsonString = buffer.toString('utf8', 20, 20 + jsonChunkLength);
const gltf = JSON.parse(jsonString);

const boneNames = gltf.nodes.map(n => n.name).filter(n => n && (n.toLowerCase().includes('arm') || n.toLowerCase().includes('spine') || n.toLowerCase().includes('shoulder')));
console.log(boneNames);
