const fs = require('fs');
const html = fs.readFileSync('c:\\Users\\Administrator\\omnis\\systems\\salestrack\\index.html', 'utf-8');
const scriptMatches = [...html.matchAll(/<script(?:[^>]*)>([\s\S]*?)<\/script>/gi)];
if (scriptMatches) {
  scriptMatches.forEach((match, i) => {
    fs.writeFileSync('temp' + i + '.js', match[1]);
    try {
      require('child_process').execSync('node -c temp' + i + '.js', {stdio: 'ignore'});
      console.log('Script ' + i + ' OK');
    } catch(e) {
      console.log('Script ' + i + ' FAIL');
    }
    fs.unlinkSync('temp' + i + '.js');
  });
}
