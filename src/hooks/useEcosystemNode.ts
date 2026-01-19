'use client';

import { useEffect } from 'react';
import { MeshProtocol } from '@/lib/ecosystem/mesh';

/**
 * useEcosystemNode - Registers this application as a node in the distributed mesh.
 * @param nodeId The unique ID of this node (e.g., 'keep', 'flow')
 */
export const useEcosystemNode = (nodeId: string) => {
  useEffect(() => {
    // 1. Join Mesh (Pulse)
    MeshProtocol.broadcast({
      type: 'PULSE',
      targetNode: 'all',
      payload: { 
        status: 'joined', 
        time: new Date().toISOString() 
      }
    }, nodeId);

    // 2. Setup Heartbeat
    const heartbeat = setInterval(() => {
      MeshProtocol.broadcast({
        type: 'PULSE',
        targetNode: 'all',
        payload: { health: 1.0 }
      }, nodeId);
    }, 30000);

    return () => clearInterval(heartbeat);
  }, [nodeId]);
};
