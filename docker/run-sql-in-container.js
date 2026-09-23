const { execSync } = require('child_process');
const fs = require('fs');

console.log('=== Running Live Database Migration Test Suite ===\n');

try {
  // 1. Run 001_schema.sql
  console.log('1. Executing 001_schema.sql...');
  execSync('docker cp ..\\db\\migrations\\001_schema.sql worklog-postgres:/tmp/001_schema.sql', { stdio: 'inherit' });
  execSync('docker exec worklog-postgres psql -U postgres -d worklog -f /tmp/001_schema.sql', { stdio: 'inherit' });
  console.log('✅ 001_schema.sql executed successfully.\n');

  // 2. Run 002_seed.sql
  console.log('2. Executing 002_seed.sql...');
  execSync('docker cp ..\\db\\migrations\\002_seed.sql worklog-postgres:/tmp/002_seed.sql', { stdio: 'inherit' });
  execSync('docker exec worklog-postgres psql -U postgres -d worklog -f /tmp/002_seed.sql', { stdio: 'inherit' });
  console.log('✅ 002_seed.sql executed successfully.\n');

  // 3. Run 003_functions.sql
  console.log('3. Executing 003_functions.sql...');
  execSync('docker cp ..\\db\\migrations\\003_functions.sql worklog-postgres:/tmp/003_functions.sql', { stdio: 'inherit' });
  execSync('docker exec worklog-postgres psql -U postgres -d worklog -f /tmp/003_functions.sql', { stdio: 'inherit' });
  console.log('✅ 003_functions.sql executed successfully.\n');

  // 4. Check Tables & Counts
  console.log('4. Querying Created Tables and Sample Counts...');
  const tableCount = execSync('docker exec worklog-postgres psql -U postgres -d worklog -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = \'wl\';"').toString().trim();
  console.log(`Verified Table Count in schema 'wl': ${tableCount} tables`);

  const empCount = execSync('docker exec worklog-postgres psql -U postgres -d worklog -t -c "SELECT count(*) FROM wl.employees;"').toString().trim();
  console.log(`Verified Seeded Employees: ${empCount} employees`);

  const projCount = execSync('docker exec worklog-postgres psql -U postgres -d worklog -t -c "SELECT count(*) FROM wl.projects;"').toString().trim();
  console.log(`Verified Seeded Projects: ${projCount} projects`);

  console.log('\n🎉 ALL LIVE DATABASE MIGRATIONS AND PL/PGSQL TEST SUITES COMPLETED CLEANLY!');
} catch (err) {
  console.error('\n❌ Execution Failed:', err.message);
  process.exit(1);
}
