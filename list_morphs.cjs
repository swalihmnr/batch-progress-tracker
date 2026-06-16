const fs = require('fs');
const buffer = fs.readFileSync('public/custom_avatar.glb');
const jsonChunkLength = buffer.readUInt32LE(12);
const jsonString = buffer.toString('utf8', 20, 20 + jsonChunkLength);
const gltf = JSON.parse(jsonString);

const targetNames = new Set();
if (gltf.meshes) {
  gltf.meshes.forEach(m => {
    if (m.extras && m.extras.targetNames) {
      m.extras.targetNames.forEach(t => targetNames.add(t));
    }
  });
}
console.log(Array.from(targetNames));
