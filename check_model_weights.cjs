const fs = require('fs');
const buffer = fs.readFileSync('/home/swalimnr/Downloads/model.glb');
const jsonChunkLength = buffer.readUInt32LE(12);
const jsonString = buffer.toString('utf8', 20, 20 + jsonChunkLength);
const gltf = JSON.parse(jsonString);

if (gltf.meshes) {
  gltf.meshes.forEach(m => {
    console.log(m.name, 'weights:', m.weights ? m.weights.length : 0);
  });
}
