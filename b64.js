const fs = require('fs');

function getBase64(file) {
    if (!fs.existsSync(file)) return '';
    return 'data:image/png;base64,' + fs.readFileSync(file).toString('base64');
}

const mxLogo = getBase64('assets/images/MXG Logo.png');
const spzLogo = getBase64('assets/images/IEG_logo.png'); // using IEG logo or we can use local paths

console.log(mxLogo.substring(0, 50));
