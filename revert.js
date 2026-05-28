const fs = require('fs');
const path = require('path');

const walkSync = function(dir, filelist) {
  const files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      if (file !== 'node_modules') {
        filelist = walkSync(path.join(dir, file), filelist);
      }
    } else {
      if (file === 'build.gradle') {
        filelist.push(path.join(dir, file));
      }
    }
  });
  return filelist;
};

const allBuildGradles = walkSync('../omnis-mobile/node_modules');
let reverted = 0;
allBuildGradles.forEach(p => {
  if (p.includes('\\android\\build.gradle') || p.includes('/android/build.gradle')) {
    let content = fs.readFileSync(p, 'utf8');
    if (content.includes('buildDir = "C:/tmp/')) {
      content = content.replace(/\nbuildDir = .*/g, '');
      fs.writeFileSync(p, content);
      reverted++;
    }
  }
});
console.log('Reverted ' + reverted + ' files');
