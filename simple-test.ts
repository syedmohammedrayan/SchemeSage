import Anthropic from '@anthropic-ai/sdk';
import { config } from 'dotenv';
config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const AGENT_ID = process.env.ANTHROPIC_AGENT_ID;
const ENV_ID = process.env.ANTHROPIC_ENV_ID;

async function test() {
  console.log("Starting test...");
  try {
    const session = await (anthropic.beta as any).sessions.create({
      agent: AGENT_ID,
      environment_id: ENV_ID,
    });
    console.log("Session created:", session.id);

    await (anthropic.beta as any).sessions.events.send(session.id, {
      events: [
        {
          type: 'user.message',
          content: [
            {
              type: 'text',
              text: 'Hello, navigate to https://example.com and tell me the title.',
            },
          ],
        },
      ],
    });
    console.log("Event sent.");
  } catch (err) {
    console.error("Test failed:", err);
  }
}

test();
