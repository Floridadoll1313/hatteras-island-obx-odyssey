import { GameState, CombatLogEntry } from '../types'; // Adjust path if needed

/**
 * The "Tide Sync" Engine
 * Calculates passive gains, health recovery, and event decay based on time elapsed.
 */
export const calculateTideSync = (
  currentState: GameState,
  lastLoginTimestamp: number
): GameState => {
  const now = Date.now();
  // Ensure we don't calculate negative time if the clock is out of sync
  const msElapsed = Math.max(0, now - lastLoginTimestamp);
  const minutesElapsed = Math.floor(msElapsed / 60000);

  // 1. Passive Sand Dollar Generation
  // Strategy: 0.01 SD per minute multiplied by current AI Evolution level
  const evolutionFactor = currentState.aiStatus.evolution || 1;
  const passiveGain = Number((minutesElapsed * (evolutionFactor * 0.01)).toFixed(2));

  // 2. Harmony (Health) Restoration
  // Strategy: Restores 1 HP every 5 minutes of real-world time
  const healthRestored = Math.floor(minutesElapsed / 5);
  const updatedHealth = Math.min(
    currentState.playerStats.maxHealth,
    currentState.playerStats.health + healthRestored
  );

  // 3. Event Decay
  // Strategy: Events lose 1 duration point for every 30 minutes elapsed
  const decayAmount = Math.floor(minutesElapsed / 30);
  const updatedEvents = currentState.activeEvents
    .map((event) => ({
      ...event,
      duration: event.duration - decayAmount,
    }))
    .filter((event) => event.duration > 0);

  // 4. Create the "Ship's Log" Entry
  const syncMessage = `Tide Sync: While you were away, the ocean restored ${healthRestored} Harmony and washed up ${passiveGain} Sand Dollars.`;
  
  const newLog: CombatLogEntry = {
    message: syncMessage,
    type: 'system',
    timestamp: now,
  };

  return {
    ...currentState,
    sandDollars: currentState.sandDollars + passiveGain,
    playerStats: {
      ...currentState.playerStats,
      health: updatedHealth,
    },
    activeEvents: updatedEvents,
    history: [...currentState.history, syncMessage],
    // If you want to show the sync in the combat log style as well:
    aiStatus: {
      ...currentState.aiStatus,
      memory: [...currentState.aiStatus.memory, syncMessage].slice(-10), // Keep last 10 memories
    }
  };
};

/**
 * Initial State Factory
 * Useful for resetting the game or first-time players.
 */
export const getInitialState = (): GameState => ({
  currentRealm: null,
  history: ["Awakened on the Digital Shore."],
  inventory: [],
  activeEvents: [],
  sandDollars: 10,
  skills: ["Basic Analysis"],
  playerStats: {
    health: 100,
    maxHealth: 100,
    attack: 10,
    defense: 5,
  },
  combat: null,
  pastCombatLogs: [],
  aiStatus: {
    evolution: 1,
    stage: 'Tourist',
    traits: [],
    memory: [],
  },
  subscription: {
    tier: 'none',
    status: 'inactive',
  },
});
