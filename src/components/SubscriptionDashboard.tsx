import React from 'react';
import { SubscriptionTier, GameState } from '../types';

interface Props {
  gameState: GameState;
  onUpgrade: (tier: SubscriptionTier) => void;
}

export const SubscriptionDashboard: React.FC<Props> = ({ gameState, onUpgrade }) => {
  const tiers: { id: SubscriptionTier; label: string; price: string; perk: string }[] = [
    { id: 'initiate', label: 'Initiate', price: '$17.00', perk: '2x Sand Dollar Gain' },
    { id: 'automator', label: 'Automator', price: '$35.00', perk: '4x Sand Dollar Gain' },
    { id: 'architect', label: 'Architect', price: '$75.00', perk: '8x Sand Dollar Gain' },
    { id: 'omniscient', label: 'Omniscient', price: '$150.00', perk: 'Max Evolution Rate' },
  ];

  return (
    <div className="subscription-container" style={{ padding: '20px', border: '1px solid #005f73' }}>
      <h2>Island Membership</h2>
      <p>Current Status: <strong>{gameState.subscription.tier.toUpperCase()}</strong></p>
      
      <div className="tier-grid" style={{ display: 'grid', gap: '10px', marginTop: '10px' }}>
        {tiers.map((tier) => (
          <div key={tier.id} style={{ padding: '10px', border: '1px solid #94D2BD' }}>
            <h3>{tier.label}</h3>
            <p>{tier.price} / month</p>
            <p><small>{tier.perk}</small></p>
            <button 
              disabled={gameState.subscription.tier === tier.id}
              onClick={() => onUpgrade(tier.id)}
            >
              {gameState.subscription.tier === tier.id ? 'Active' : 'Upgrade'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
