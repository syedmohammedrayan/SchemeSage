import { config } from 'dotenv';
config();
import { runManagedScraper } from './server/services/managedScraper.js';

runManagedScraper('https://www.india.gov.in/topics/social-development')
  .then(console.log)
  .catch(console.error);
