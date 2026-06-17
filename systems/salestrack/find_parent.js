const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('C:\\Users\\Administrator\\omnis\\systems\\salestrack\\index.html', 'utf8');

const dom = new JSDOM(html);
const el = dom.window.document.getElementById('view-settings');
if (el) {
    console.log("Parent ID:", el.parentElement.id);
    console.log("Parent Tag:", el.parentElement.tagName);
    console.log("Grandparent ID:", el.parentElement.parentElement.id);
} else {
    console.log("Not found");
}
