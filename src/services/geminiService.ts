import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { RealmNode, BranchingPath, InventoryItem, WorldEvent, AIStage, Enemy } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const branchingPathSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      title: { type: Type.STRING },
      consequence: { type: Type.STRING },
      riskLevel: { type: Type.STRING, enum: ['low', 'medium', 'high', 'critical'] },
      potentialReward: { type: Type.STRING }
    },
    required: ['id', 'title', 'consequence', 'riskLevel', 'potentialReward']
  }
};

const itemSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    name: { type: Type.STRING },
    description: { type: Type.STRING },
    type: { type: Type.STRING, enum: ['artifact', 'tool', 'data_fragment'] },
    rarity: { type: Type.STRING, enum: ['common', 'rare', 'exotic', 'legendary'] },
    effect: { type: Type.STRING },
    passiveBonus: { type: Type.STRING, description: "A passive effect this item provides while in inventory. E.g. '+15% Legacy Evolution Speed', 'Unlocks Coastal Markers', 'Reduces Island Resonance Latency'." }
  },
  required: ['id', 'name', 'description', 'type', 'rarity', 'passiveBonus']
};

const enemySchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    name: { type: Type.STRING },
    description: { type: Type.STRING },
    health: { type: Type.INTEGER },
    maxHealth: { type: Type.INTEGER },
    attack: { type: Type.INTEGER },
    defense: { type: Type.INTEGER },
    abilities: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ['id', 'name', 'description', 'health', 'maxHealth', 'attack', 'defense', 'abilities']
};

const realmSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    name: { type: Type.STRING },
    description: { type: Type.STRING },
    environment: { type: Type.STRING },
    entities: { type: Type.ARRAY, items: { type: Type.STRING } },
    options: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          action: { type: Type.STRING },
          targetType: { type: Type.STRING, enum: ['explore', 'interact', 'analyze'] }
        },
        required: ['label', 'action', 'targetType']
      }
    },
    lore: { type: Type.STRING },
    item: itemSchema,
    enemy: enemySchema,
    imagePrompt: { type: Type.STRING, description: "A detailed visual prompt for generating an image of this realm. Use a futuristic, digital, AI-centric aesthetic." }
  },
  required: ['id', 'name', 'description', 'environment', 'entities', 'options', 'lore', 'imagePrompt']
};

export async function generateRealmImage(prompt: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          text: `A cinematic, high-detail coastal landscape of the Outer Banks, NC: ${prompt}. Style: Coastal, oceanic, lighthouse-lit, serene but powerful Atlantic beauty.`,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9"
      }
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return "";
}

export async function generateInitialRealm(): Promise<RealmNode> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "Generate the starting point of an infinite journey across Hatteras Island and the Outer Banks, NC. The theme is coastal exploration, maritime history, and the spirit of the OBX. The player is a traveler seeking the essence of the island. Locations should include Kitty Hawk, Nags Head, Rodanthe, Waves, Salvo, Avon, Buxton, Frisco, and Hatteras. IMPORTANT: Salvo is a special place; it must feature a memorial for a legendary local man named Bull Hooper. Occasionally include a starting item (fishing gear, surfboard, or lighthouse key).",
    config: {
      responseMimeType: "application/json",
      responseSchema: realmSchema
    }
  });

  const node = JSON.parse(response.text);
  node.imageUrl = await generateRealmImage(node.imagePrompt);
  return node;
}

const worldEventSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    name: { type: Type.STRING },
    description: { type: Type.STRING },
    duration: { type: Type.INTEGER, description: "Number of transitions this event lasts (1-5)" },
    type: { type: Type.STRING, enum: ['anomaly', 'surge', 'corruption', 'blessing'] },
    effect: { type: Type.STRING, description: "The gameplay effect of this event. E.g. 'Sand Dollar gain doubled', 'Risk levels increased', 'Inventory items disabled'." }
  },
  required: ['id', 'name', 'description', 'duration', 'type', 'effect']
};

export async function generateWorldEvent(currentRealm: RealmNode, history: string[], aiStage: AIStage): Promise<WorldEvent> {
  const historyContext = history.slice(-5).join('; ');
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `The player is in ${currentRealm.name} on the Outer Banks. Current Island Legacy Stage: ${aiStage}. Recent history: ${historyContext}. 
    Generate a dynamic coastal event that alters the state of the island. 
    It should be a consequence of recent actions or a random weather/maritime anomaly (e.g., Storm Surge, Nor'easter, Bioluminescent Bloom, Shipwreck Discovery).
    The event should be themed around the player's current stage of legacy (${aiStage}).`,
    config: {
      responseMimeType: "application/json",
      responseSchema: worldEventSchema
    }
  });

  return JSON.parse(response.text);
}

export async function generateBranchingPaths(currentRealm: RealmNode, action: string, inventory: InventoryItem[], activeEvents: WorldEvent[], aiStage: AIStage): Promise<BranchingPath[]> {
  const inventoryContext = inventory.length > 0 ? `The player has: ${inventory.map(i => `${i.name} (${i.passiveBonus})`).join(', ')}.` : "";
  const eventContext = activeEvents.length > 0 ? `Active Island Events: ${activeEvents.map(e => `${e.name}: ${e.description} (${e.effect})`).join('; ')}.` : "";
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `The player is in ${currentRealm.name} on the Outer Banks and chose to: ${action}. Current Island Legacy Stage: ${aiStage}. ${inventoryContext} ${eventContext}
    Generate 3 distinct narrative paths. Consider how active island events might complicate or enhance these paths.
    The complexity and scale of the paths should reflect the traveler's current legacy: ${aiStage}.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: branchingPathSchema
    }
  });

  return JSON.parse(response.text);
}

export async function generateNextRealm(currentRealm: RealmNode, action: string, inventory: InventoryItem[], activeEvents: WorldEvent[], aiStage: AIStage, chosenPath?: BranchingPath): Promise<RealmNode> {
  const pathContext = chosenPath ? `The player specifically chose the path: "${chosenPath.title}" with consequence: "${chosenPath.consequence}".` : "";
  const inventoryContext = inventory.length > 0 ? `The player's inventory contains: ${inventory.map(i => `${i.name} (${i.passiveBonus})`).join(', ')}.` : "";
  const eventContext = activeEvents.length > 0 ? `Active Island Events: ${activeEvents.map(e => `${e.name}: ${e.description} (${e.effect})`).join('; ')}.` : "";
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `The player was in ${currentRealm.name}: ${currentRealm.description}. They chose to: ${action}. Current Island Legacy Stage: ${aiStage}. ${pathContext} ${inventoryContext} ${eventContext}
    Generate the next location on the Outer Banks (Kitty Hawk to Hatteras). If there are active island events, describe how they have physically or logically altered the environment.
    Maintain the OBX/Coastal theme. The environment should reflect the traveler's increasing connection to the island as they move through stages.
    Current Stage: ${aiStage}.
    IMPORTANT: If the location is Salvo, it must feature a memorial for Bull Hooper.
    Occasionally (30% chance) include a discoverable item (maritime artifact, local tool).
    Occasionally (25% chance) include a challenge (hostile entity like a Storm Surge, Rogue Wave, or Ghost Crab) that the player must confront. Challenges should have stats (health, attack, defense) scaled to the player's potential progress and current stage.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: realmSchema
    }
  });

  const node = JSON.parse(response.text);
  node.imageUrl = await generateRealmImage(node.imagePrompt);
  return node;
}

export async function generateDetailedLore(realm: RealmNode): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a detailed, immersive lore entry for the Outer Banks location known as "${realm.name}". 
    Environment: ${realm.environment}
    Description: ${realm.description}
    Entities: ${realm.entities.join(', ')}
    Current Lore Fragment: ${realm.lore}
    
    The entry should feel like a recovered ship's log, a local legend, or a deep-memory fragment from an island elder. Use nautical and poetic language.`,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
    }
  });

  return response.text || "Lore fragment corrupted. Unable to retrieve data.";
}

export async function generateCombatReward(enemy: Enemy, aiStage: AIStage): Promise<{
  sandDollars: number;
  item?: InventoryItem;
  event?: WorldEvent;
  message: string;
}> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `The player just overcame a coastal challenge: "${enemy.name}" (${enemy.description}). 
    Current Island Legacy Stage: ${aiStage}.
    Generate a thematic reward for this victory. 
    The reward should scale with the challenge's difficulty (Health: ${enemy.maxHealth}, Attack: ${enemy.attack}).
    Include:
    1. Sand Dollars (10-50 based on difficulty).
    2. A potential rare item (maritime artifact or tool) - 40% chance.
    3. A potential temporary island event (blessing or surge) - 20% chance.
    4. A short narrative message about learning from the island's power.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          sandDollars: { type: Type.INTEGER, description: "The amount of Sand Dollars rewarded for victory." },
          item: itemSchema,
          event: worldEventSchema,
          message: { type: Type.STRING }
        },
        required: ['sandDollars', 'message']
      }
    }
  });

  return JSON.parse(response.text);
}
