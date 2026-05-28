const fs = require('fs');
let c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');

// Exact old string (from inspection)
const oldStr = '<th style="padding:10px 8px;text-align:left;font-weight:700;color:#ffffff !important;">\r\n                    Created</th>\r\n                </tr>\r\n              </thead>\r\n              <tbody id="job-card-tbody">\r\n                <tr>\r\n                  <td colspan="6" style="padding:40px;text-align:center;color:#94a3b8;font-size:12px;">\r\n                    Loading job cards...';

const newStr = '<th style="padding:10px 8px;text-align:left;font-weight:700;border-right:1px solid rgba(255,255,255,0.2);color:#ffffff !important;">Created</th>\r\n                  <th style="padding:10px 8px;text-align:left;font-weight:700;color:#ffffff !important;">Actions</th>\r\n                </tr>\r\n              </thead>\r\n              <tbody id="job-card-tbody">\r\n                <tr>\r\n                  <td colspan="7" style="padding:40px;text-align:center;color:#94a3b8;font-size:12px;">\r\n                    Loading job cards...';

console.log('Found:', c.includes(oldStr));
const out = c.replace(oldStr, newStr);
fs.writeFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html', out, 'utf8');
console.log('Done');
