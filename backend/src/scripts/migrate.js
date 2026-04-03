'use strict';

require('dotenv').config();

const { close, connect, migrate, pendingMigrations, revertLastMigration } = require('../utils/db');

const main = async () => {
  const command = process.argv[2];

  await connect();

  if (command === '--pending') {
    const pending = await pendingMigrations();
    if (pending.length === 0) {
      console.log('No pending migrations.');
      return;
    }

    pending.forEach((migration) => console.log(migration.name));
    return;
  }

  if (command === '--down') {
    const reverted = await revertLastMigration();
    if (!reverted) {
      console.log('No migration reverted.');
      return;
    }

    console.log(`Reverted: ${reverted.name}`);
    return;
  }

  const executed = await migrate();
  if (executed.length === 0) {
    console.log('No migrations executed.');
    return;
  }

  executed.forEach((migration) => console.log(`Applied: ${migration.name}`));
};

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await close();
  });