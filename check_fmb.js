const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const toml = require('toml');
const config = toml.parse(fs.readFileSync('supabase/config.toml', 'utf8'));

const supabaseUrl = 'https://' + config.project_id + '.supabase.co';
// Need key... I can just use curl or a local script that uses the real keys?
// Wait, I can run an electron script or node script. Let's write a node script that uses postgres directly?
