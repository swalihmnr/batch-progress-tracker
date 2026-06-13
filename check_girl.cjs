const fs = require('fs');
const buffer = fs.readFileSync('/home/swalimnr/Downloads/girl.glb');
const jsonChunkLength = buffer.readUInt32LE(12);
const jsonString = buffer.toString('utf8', 20, 20 + jsonChunkLength);
const gltf = JSON.parse(jsonString);
let hasWeights = false;
if (gltf.meshes) {
  gltf.meshes.forEach(m => {
    if (m.weights && m.weights.length > 0) hasWeights = true;
  });
}
console.log('Has blendshapes:', hasWeights);
