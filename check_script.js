const fs = require('fs');
const text = fs.readFileSync('c:\\Users\\Administrator\\omnis\\systems\\salestrack\\index.html', 'utf-8');
const start_idx = text.indexOf('id="sp-form-overlay"');
const script_tag = text.lastIndexOf('<script', start_idx);
const end_script_tag = text.lastIndexOf('</script', start_idx);
console.log('script_tag:', script_tag);
console.log('end_script_tag:', end_script_tag);
if (script_tag > end_script_tag) {
  console.log('Inside script tag: YES');
  console.log(text.substring(script_tag, script_tag + 200));
} else {
  console.log('Inside script tag: NO');
}
