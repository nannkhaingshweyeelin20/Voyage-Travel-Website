import { ensureAppTables, runSchemaUpgrades } from './db';
import { seedDefaultDestinations } from './destinationRepository';

async function main() {
  await ensureAppTables();
  await runSchemaUpgrades();
  await seedDefaultDestinations();
  console.log('Destination seed completed.');
}

main().catch((error) => {
  console.error('Destination seed failed:', error);
  process.exit(1);
});