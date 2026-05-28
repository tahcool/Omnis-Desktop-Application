const fs = require('fs');
const path = require('path');

const walkSync = function(dir, filelist) {
  const files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      if (file !== 'node_modules') { // avoid deep nesting
        filelist = walkSync(path.join(dir, file), filelist);
      }
    }
    else {
      if (file === 'build.gradle') {
        filelist.push(path.join(dir, file));
      }
    }
  });
  return filelist;
};

const nodeModulesPath = '../omnis-mobile/node_modules';
console.log('Finding build.gradle files...');
const allBuildGradles = walkSync(nodeModulesPath);

let patched = 0;
allBuildGradles.forEach(p => {
  if (p.includes('\\android\\build.gradle') || p.includes('/android/build.gradle')) {
    let content = fs.readFileSync(p, 'utf8');
    // Remove previously added buildDir if any
    content = content.replace(/\nbuildDir =.*/g, '');
    
    // Extract module name
    let moduleName = 'unknown';
    const parts = p.split(path.sep);
    for (let i=0; i<parts.length; i++) {
        if (parts[i] === 'node_modules') {
            if (parts[i+1].startsWith('@')) {
                moduleName = parts[i+2];
            } else {
                moduleName = parts[i+1];
            }
            break;
        }
    }
    
    // Only patch React Native/Expo modules
    if (moduleName !== 'unknown' && content.includes('apply plugin')) {
        const shortName = moduleName.substring(0, 8).replace(/[^a-zA-Z0-9]/g, '');
        content += '\nbuildDir = "C:/tmp/' + shortName + '"\n';
        fs.writeFileSync(p, content);
        patched++;
    }
  }
});

console.log('Patched ' + patched + ' modules!');
