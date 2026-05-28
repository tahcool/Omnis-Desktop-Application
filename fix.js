const fs = require('fs');
['react-native-gesture-handler', '@react-native-community/datetimepicker'].forEach(m => {
  const p = '../omnis-mobile/node_modules/' + m + '/android/build.gradle';
  let c = fs.readFileSync(p, 'utf8');
  // First, remove any buggy buildDir lines we added before
  c = c.replace(/\nbuildDir =.*/g, '');
  // Then append the correct one
  const target = m === 'react-native-gesture-handler' ? 'rngh' : 'rndtp';
  c += '\nbuildDir = "C:/tmp/' + target + '"\n';
  fs.writeFileSync(p, c);
});
