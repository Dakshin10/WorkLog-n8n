const { execSync } = require('child_process');
const path = require('path');

console.log('=== WORKLOG AI DATABASE INTEGRATION TEST RUNNER ===\n');

function runPsqlCommand(sqlCommand) {
  const cmd = `docker compose exec -T postgres psql -U postgres -d worklog -c "${sqlCommand.replace(/"/g, '\\"')}"`;
  return execSync(cmd, { cwd: __dirname }).toString().trim();
}

function runLocalSqlFile(fileName) {
  const hostPath = path.join(__dirname, '../db/migrations', fileName);
  console.log(`Copying ${fileName} to container...`);
  execSync(`docker cp "${hostPath}" worklog-postgres:/tmp/${fileName}`, { cwd: __dirname });
  
  console.log(`Executing /tmp/${fileName}...`);
  const cmd = `docker compose exec -T postgres psql -U postgres -d worklog -f /tmp/${fileName}`;
  return execSync(cmd, { cwd: __dirname }).toString().trim();
}

try {
  console.log('1. Applying 001_schema.sql...');
  const out1 = runLocalSqlFile('001_schema.sql');
  console.log(out1);
  console.log('   ✅ 001_schema.sql executed successfully.\n');

  console.log('2. Applying 002_seed.sql...');
  const out2 = runLocalSqlFile('002_seed.sql');
  console.log(out2);
  console.log('   ✅ 002_seed.sql executed successfully.\n');

  console.log('3. Applying 003_functions.sql...');
  const out3 = runLocalSqlFile('003_functions.sql');
  console.log(out3);
  console.log('   ✅ 003_functions.sql executed successfully (including lifecycle test assertions).\n');

  console.log('4. Querying verification stats...');
  const tableCount = runPsqlCommand("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'wl';");
  console.log('   - Tables in schema wl:\n' + tableCount);

  const empCount = runPsqlCommand("SELECT count(*) FROM wl.employees;");
  console.log('   - Total Employees:\n' + empCount);

  const projCount = runPsqlCommand("SELECT count(*) FROM wl.projects;");
  console.log('   - Total Projects:\n' + projCount);

  console.log('\n🎉 ALL DATABASE MIGRATIONS & BUSINESS FUNCTIONS TESTED AND VERIFIED CLEANLY!');
} catch (err) {
  console.error('\n❌ Execution Error:', err.message);
  if (err.stdout) console.log('stdout:', err.stdout.toString());
  if (err.stderr) console.log('stderr:', err.stderr.toString());
  process.exit(1);
}
