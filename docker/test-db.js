const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function testDatabase() {
  const client = new Client({
    host: 'localhost',
    port: 5433,
    user: 'postgres',
    password: 'postgres_secret',
    database: 'worklog',
  });

  try {
    console.log('Connecting to PostgreSQL database "worklog"...');
    await client.connect();
    console.log('Connected successfully!');

    // 1. Run 001_schema.sql
    console.log('Executing 001_schema.sql...');
    const schemaSql = fs.readFileSync(path.join(__dirname, '../db/migrations/001_schema.sql'), 'utf8');
    await client.query(schemaSql);
    console.log('✅ 001_schema.sql executed cleanly.');

    // 2. Run 002_seed.sql
    console.log('Executing 002_seed.sql...');
    const seedSql = fs.readFileSync(path.join(__dirname, '../db/migrations/002_seed.sql'), 'utf8');
    await client.query(seedSql);
    console.log('✅ 002_seed.sql executed cleanly (including all table assertions).');

    // 3. Run 003_functions.sql
    console.log('Executing 003_functions.sql...');
    const functionsSql = fs.readFileSync(path.join(__dirname, '../db/migrations/003_functions.sql'), 'utf8');
    await client.query(functionsSql);
    console.log('✅ 003_functions.sql executed cleanly (including full lifecycle assertions).');

    // 4. Verification Queries
    const tablesRes = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'wl' ORDER BY table_name;");
    console.log('\nVerified Created Tables in Schema wl (' + tablesRes.rows.length + ' tables):');
    tablesRes.rows.forEach(r => console.log('  - ' + r.table_name));

    const empRes = await client.query("SELECT count(*) FROM wl.employees;");
    console.log('\nEmployee Count:', empRes.rows[0].count);

    const projRes = await client.query("SELECT count(*) FROM wl.projects;");
    console.log('Project Count:', projRes.rows[0].count);

    console.log('\n🎉 ALL DATABASE MIGRATIONS AND PL/PGSQL TEST SUITES PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Database Test Failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

testDatabase();
