import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export const registerLeanIXAgent = async (agentData: any) => {
  const LEANIX_TOKEN = process.env.LEANIX_TOKEN || 'mock-token';
  const LEANIX_ENDPOINT = process.env.LEANIX_ENDPOINT || 'https://mock.leanix.net/services/discovery-ai-agents/v1/agents/a2a/cards';

  const payload = {
    data: [
      {
        name: agentData.name,
        description: agentData.description,
        url: agentData.url || "https://schemesage.com/api/agent",
        
        provider: {
          organization: "SchemeSage",
          url: "https://schemesage.com"
        },
        
        version: agentData.version || "1.0.0",
        
        capabilities: {
          streaming: agentData.streaming || false,
          pushNotifications: agentData.pushNotifications || false,
          stateTransitionHistory: true
        },
        
        skills: agentData.skills || [
          {
            id: "general-ai",
            name: "General AI Capability",
            description: "Default AI Skill"
          }
        ]
      }
    ]
  };

  console.log(`[LeanIX Sync] Preparing to sync AI Agent "${agentData.name}" to LeanIX...`);

  // If we don't have a real token in dev, just mock the success so it doesn't crash the UI
  if (LEANIX_TOKEN === 'mock-token' || process.env.NODE_ENV === 'development' && !process.env.LEANIX_TOKEN) {
    console.log('[LeanIX Sync] Mocking success response (No real LEANIX_TOKEN found). Payload:', JSON.stringify(payload, null, 2));
    return { success: true, mocked: true, message: "Mock synced to LeanIX" };
  }

  try {
    const response = await axios.post(
      LEANIX_ENDPOINT,
      payload,
      {
        headers: {
          Authorization: `Bearer ${LEANIX_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );
    console.log(`[LeanIX Sync] Successfully synced "${agentData.name}"`);
    return response.data;
  } catch (error: any) {
    console.error(`[LeanIX Sync] Failed to sync "${agentData.name}":`, error.response?.data || error.message);
    throw error;
  }
};
