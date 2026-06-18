const fs = require('fs');
let c = fs.readFileSync('systems/salestrack/index.html', 'utf8');

c = c.replace(/if\(window\.salestrack\)\s*window\.salestrack\.generateCertificate/g, 'window.certLogic.generateCertificate');
c = c.replace(/if\(window\.salestrack\)\s*window\.salestrack\.populateCertificateFromTraining/g, 'window.certLogic.populateCertificateFromTraining');
c = c.replace(/certificates_logic\.js(\?v=\d+)?/g, 'certificates_logic.js?v=5');

fs.writeFileSync('systems/salestrack/index.html', c);
console.log("Index HTML patched successfully!");
