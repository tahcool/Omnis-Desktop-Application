const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    for (const { from, to } of replacements) {
        if (!content.includes(from)) {
            console.warn(`WARNING: Could not find substring in ${filePath}:`, from);
        }
        content = content.split(from).join(to);
    }
    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${filePath}`);
    } else {
        console.log(`No changes made to ${filePath}`);
    }
}

const mainReplacements = [
    {
        from: "const SUPER_ADMIN_EMAIL = 'takunda@industrial-exchange.group';",
        to: "const SUPER_ADMIN_EMAILS = ['takunda@industrial-exchange.group', 'zaranyika.rt@gmail.com'];"
    },
    {
        from: "if (email === SUPER_ADMIN_EMAIL)",
        to: "if (SUPER_ADMIN_EMAILS.includes(email))"
    }
];

replaceInFile('main.js', mainReplacements);

const indexReplacements = [
    {
        from: "const SUPER_ADMIN_EMAIL = 'takunda@industrial-exchange.group';",
        to: "const SUPER_ADMIN_EMAILS = ['takunda@industrial-exchange.group', 'zaranyika.rt@gmail.com'];"
    },
    {
        from: "function isSuperAdmin(u) { return u.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase(); }",
        to: "function isSuperAdmin(u) { return u.email && SUPER_ADMIN_EMAILS.some(e => e.toLowerCase() === u.email.toLowerCase()); }"
    },
    {
        from: "if (email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {",
        to: "if (SUPER_ADMIN_EMAILS.some(e => e.toLowerCase() === email.toLowerCase())) {"
    },
    {
        from: "return email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();",
        to: "return SUPER_ADMIN_EMAILS.some(e => e.toLowerCase() === email.toLowerCase());"
    },
    {
        from: "if (val.indexOf('\"email\"') !== -1 || val.indexOf(SUPER_ADMIN_EMAIL) !== -1) {",
        to: "if (val.indexOf('\"email\"') !== -1 || SUPER_ADMIN_EMAILS.some(e => val.indexOf(e) !== -1)) {"
    },
    {
        from: "if (sess.session.user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {",
        to: "if (SUPER_ADMIN_EMAILS.some(e => e.toLowerCase() === sess.session.user.email.toLowerCase())) {"
    },
    {
        from: "if (val.toLowerCase().indexOf(SUPER_ADMIN_EMAIL.toLowerCase()) !== -1) {",
        to: "if (SUPER_ADMIN_EMAILS.some(e => val.toLowerCase().indexOf(e.toLowerCase()) !== -1)) {"
    }
];

replaceInFile('systems/fleetrack/index.html', indexReplacements);
replaceInFile('web-deploy/index.html', indexReplacements);
replaceInFile('temp.html', indexReplacements);
replaceInFile('temp_old_index.html', indexReplacements);
replaceInFile('omnis-web-deploy/systems/fleetrack/index.html', indexReplacements);
