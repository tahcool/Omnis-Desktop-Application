const fs = require('fs');
let c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');

// Reroute all 3 customer API calls from ft_breakdown_dashboard → ft_customer_dashboard
c = c.replace(
  /mxg_fleet_track\.omnis_dashboard\.ft_breakdown_dashboard\.get_ft_customers/g,
  'mxg_fleet_track.omnis_dashboard.ft_customer_dashboard.get_ft_customers'
);
c = c.replace(
  /mxg_fleet_track\.omnis_dashboard\.ft_breakdown_dashboard\.create_ft_customer/g,
  'mxg_fleet_track.omnis_dashboard.ft_customer_dashboard.create_ft_customer'
);
c = c.replace(
  /mxg_fleet_track\.omnis_dashboard\.ft_breakdown_dashboard\.update_ft_customer/g,
  'mxg_fleet_track.omnis_dashboard.ft_customer_dashboard.update_ft_customer'
);

fs.writeFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html', c, 'utf8');

// Verify
const hits = (c.match(/ft_customer_dashboard\.(get|create|update)_ft_customer/g) || []);
console.log('Rerouted calls:', hits);
