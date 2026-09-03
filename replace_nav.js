const fs = require('fs');
let html = fs.readFileSync('systems/salestrack/index.html', 'utf8');

const target1 = "const scrollableViews = ['view-orders-list', 'view-stock', 'view-group-sales-list', 'view-quotations-list', 'view-ce-list', 'view-customers-list', 'view-products-list', 'view-settings', 'view-aftersales', 'view-rental-defects', 'view-rental-fleet', 'view-fleet-manager', 'view-customer-profiles', 'view-psv', 'view-cdv', 'view-marketing', 'view-ft-defect-queue', 'view-training', 'view-training-library'];";
const replacement1 = "const scrollableViews = ['view-orders-list', 'view-stock', 'view-group-sales-list', 'view-quotations-list', 'view-ce-list', 'view-customers-list', 'view-products-list', 'view-settings', 'view-user-management', 'view-aftersales', 'view-rental-defects', 'view-rental-fleet', 'view-fleet-manager', 'view-customer-profiles', 'view-psv', 'view-cdv', 'view-marketing', 'view-ft-defect-queue', 'view-training', 'view-training-library'];";
html = html.replace(target1, replacement1);

const target2 = "</body>";
const replacement2 = "  <script src=\"user_management_logic.js\"></script>\n</body>";
html = html.replace(target2, replacement2);

fs.writeFileSync('systems/salestrack/index.html', html);
