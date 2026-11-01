const production = process.argv.includes('--production');
const required = production ? ['NEXTAUTH_SECRET'] : [];
const recommended = ['GEMINI_API_KEY', 'SUPABASE_URL', 'SUPABASE_SECRET_KEY'];
const missing = required.filter((name) => !process.env[name]);

console.log(`Environment validation (${production ? 'production' : 'local'})`);
for (const name of required) console.log(`${process.env[name] ? 'ok' : 'missing'} required: ${name}`);
for (const name of recommended) console.log(`${process.env[name] ? 'configured' : 'optional/missing'} integration: ${name}`);

if (missing.length) {
  console.error(`Missing required production variables: ${missing.join(', ')}`);
  process.exit(1);
}
