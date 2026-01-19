'use client';

import React, { useEffect, useState } from 'react';
import { useIsland } from '@/components/ui/DynamicIsland';
import { useAuth } from '@/components/ui/AuthContext';

const PRO_TIPS = [
  {
    title: 'Elite Encryption Active',
    message: 'Upgrade to Whisperr PRO for post-quantum mesh security on all nodes.',
    actionLabel: 'Go PRO',
    type: 'pro' as const,
  },
  {
    title: 'AI Synthesis Insight',
    message: 'Your notes are growing. PRO users get automated cross-linking and AI mind-mapping.',
    actionLabel: 'Enhance',
    type: 'pro' as const,
  },
  {
    title: 'Ecosystem Sync',
    message: 'Sync notes instantly across WhisperrKeep and WhisperrConnect with PRO.',
    actionLabel: 'Unlock',
    type: 'pro' as const,
  },
  {
    title: 'Creative Mode',
    message: 'Doodles are better with high-res exports. Upgrade today.',
    actionLabel: 'Upgrade',
    type: 'success' as const,
  }
];

export const EcosystemEvents: React.FC = () => {
  const { showIsland } = useIsland();
  const { user } = useAuth();
  const [lastShown, setLastShown] = useState<number>(0);

  useEffect(() => {
    // Only show to non-pro users or new users
    // For now, let's just use a timer logic
    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastShown > 300000) { // Every 5 minutes
        const randomTip = PRO_TIPS[Math.floor(Math.random() * PRO_TIPS.length)];
        
        showIsland({
          title: randomTip.title,
          message: randomTip.message,
          type: randomTip.type,
          action: {
            label: randomTip.actionLabel,
            onClick: () => {
              window.open('/settings?pro=upgrade', '_blank');
            }
          }
        });
        
        setLastShown(now);
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [showIsland, lastShown]);

  return null; // Logic only component
};
