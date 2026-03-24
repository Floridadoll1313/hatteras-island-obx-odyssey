/**
 * calculates changes to the GameState based on time elapsed
 * or major realm transitions.
 */
export const calculateTideSync = (
  currentState: GameState, 
  lastLoginTimestamp: number
): GameState => {
  const now = Date.now();
  const minutesElapsed = Math.floor((now - lastLoginTimestamp) / 60000);
  
  // 1. Passive Sand Dollar Generation (0.01 SD per minute * Evolution)
  const passiveGain = minutesElapsed * (currentState.aiStatus.evolution * 0.01);
  
  // 2. Harmony Restoration (Restores 1 HP every 5 minutes)
  const healthRestored = Math.floor(minutesElapsed / 5);
  const newHealth = Math.min(
    currentState.playerStats.maxHealth, 
    currentState.playerStats.health + healthRestored
  );

  // 3. Event Decay
  // If this is a manual "sync," we might decrement event durations 
  // based on time rather than just transitions.
  const updatedEvents = currentState.activeEvents.map(event => ({
    ...event,
    duration: event.duration - Math.floor(minutesElapsed / 30) // Decay every 30 mins
  })).filter(event => event.duration > 0);

  return {
    ...currentState,
    sandDollars: currentState.sandDollars + passiveGain,
    playerStats: {
      ...currentState.playerStats,
      health: newHealth
    },
    activeEvents: updatedEvents,
    history: [
      ...currentState.history, 
      `Tide Sync: Restored ${healthRestored} Harmony and gathered ${passiveGain.toFixed(2)} Sand Dollars.`
    ]
  };
};
