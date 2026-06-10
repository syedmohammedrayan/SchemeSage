import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function main() {
  console.log('🚀 Initializing Anthropic Managed Agent creation...');

  try {
    // 1. Create the Managed Agent
    console.log('📦 Creating Agent: Web Scraper Agent...');
    const agent = await (anthropic.beta as any).agents.create({
      name: 'Web Scraper Agent',
      model: 'claude-sonnet-4-6', // Model specified by user
      system: `You are a Global Scheme Discovery Agent. Your goal is to find and extract welfare schemes from any government portal in India, including central and all state-level official websites.

For every scraping or discovery request:
1. If a specific URL is provided, start there.
2. If no URL is provided or the goal is broad (e.g., "find schemes for farmers in Bihar"), search for the official state portal or use your knowledge to navigate to the relevant government directory.
3. Use Browser Use Cloud to interact with dynamic elements, dropdowns, and pagination to find as many relevant schemes as possible.
4. Extract structured data into a JSON array. Never invent data.
5. Call submit_extraction exactly once with the final normalized payload.

Data Schema:
- name: Official name of the scheme.
- description: Detailed summary of what the scheme provides.
- benefits: Key advantages for the beneficiary.
- eligibility: Who can apply (age, income, region, etc.).
- documents: Required documentation.
- officialLink: Direct URL to the scheme page.
- ministry: The governing department or state ministry.`,
      tools: [
        {
          type: 'agent_toolset_20260401'
        }
      ]
    });

    console.log(`✅ Agent Created! ID: ${agent.id}`);

    // 2. Create the Environment
    console.log('🌐 Creating Environment: unrestricted-cloud...');
    const environment = await (anthropic.beta as any).environments.create({
      name: 'env',
      config: {
        type: 'cloud',
        networking: { type: 'unrestricted' }
      }
    });

    console.log(`✅ Environment Created! ID: ${environment.id}`);

    // 3. Save to .env
    const envPath = path.join(process.cwd(), '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');

    if (!envContent.includes('ANTHROPIC_AGENT_ID')) {
      envContent += `\nANTHROPIC_AGENT_ID=${agent.id}`;
      envContent += `\nANTHROPIC_ENV_ID=${environment.id}\n`;
      fs.writeFileSync(envPath, envContent);
      console.log('📝 Added Agent and Environment IDs to .env');
    } else {
      console.log('⚠️ Agent IDs already exist in .env. Please update them manually if needed.');
    }

    console.log('\n✨ Setup Complete! You can now use the Managed Agent for scraping.');
  } catch (error: any) {
    console.error('❌ Error during setup:', error.message || error);
    if (error.status === 401) {
      console.error('💡 Hint: Your ANTHROPIC_API_KEY might be invalid.');
    }
    process.exit(1);
  }
}

main();
