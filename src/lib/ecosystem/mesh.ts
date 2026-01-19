/**
 * Whisperr Ecosystem Mesh Protocol
 * Defines the communication and state synchronization between distributed nodes.
 */

export type NodeType = 'control' | 'data' | 'secure' | 'logic' | 'message';

export interface NodeIdentity {
  id: string;
  type: NodeType;
  subdomain: string;
  version: string;
  status: 'online' | 'degraded' | 'offline';
  capabilities: string[];
}

export interface MeshMessage<T = any> {
  id: string;
  sourceNode: string;
  targetNode: string | 'all';
  type: 'RPC_REQUEST' | 'RPC_RESPONSE' | 'STATE_SYNC' | 'PULSE' | 'COMMAND';
  payload: T;
  timestamp: number;
  signature?: string; // For node-to-node validation
}

export const MeshProtocol = {
  /**
   * Node Registry (Distributed Source of Truth)
   */
  getNodes: (): NodeIdentity[] => [
    { id: 'id', type: 'control', subdomain: 'id', version: '1.0.0', status: 'online', capabilities: ['auth', 'identity', 'quota'] },
    { id: 'note', type: 'data', subdomain: 'note', version: '1.2.0', status: 'online', capabilities: ['knowledge_graph', 'ai_search'] },
    { id: 'keep', type: 'secure', subdomain: 'keep', version: '1.1.0', status: 'online', capabilities: ['vault', 'encryption', 'passkeys'] },
    { id: 'flow', type: 'logic', subdomain: 'flow', version: '1.0.5', status: 'online', capabilities: ['task_orchestration', 'events'] },
    { id: 'connect', type: 'message', subdomain: 'connect', version: '1.0.0', status: 'online', capabilities: ['realtime_comm', 'p2p_relay'] },
  ],

  /**
   * Broadcasts a message to the mesh
   */
  broadcast: (message: Omit<MeshMessage, 'id' | 'timestamp' | 'sourceNode'>, sourceId: string) => {
    const fullMessage: MeshMessage = {
      ...message,
      id: crypto.randomUUID(),
      sourceNode: sourceId,
      timestamp: Date.now()
    };

    // 1. Same-origin broadcast
    if (typeof window !== 'undefined') {
      const channel = new BroadcastChannel('whisperr_mesh_internal');
      channel.postMessage(fullMessage);
      
      // 2. Cross-origin relay (via Windowing System if active)
      window.parent.postMessage(fullMessage, '*');
      
      // 3. To child frames
      const frames = document.querySelectorAll('iframe');
      frames.forEach(frame => {
        frame.contentWindow?.postMessage(fullMessage, '*');
      });
    }

    return fullMessage;
  },

  /**
   * Listen for mesh events
   */
  subscribe: (handler: (msg: MeshMessage) => void) => {
    if (typeof window === 'undefined') return () => {};

    const bc = new BroadcastChannel('whisperr_mesh_internal');
    const bcHandler = (e: MessageEvent) => handler(e.data);
    bc.addEventListener('message', bcHandler);

    const winHandler = (e: MessageEvent) => {
      // Basic security check: ensure it matches MeshMessage schema
      if (e.data?.sourceNode && e.data?.type) {
        handler(e.data);
      }
    };
    window.addEventListener('message', winHandler);

    return () => {
      bc.removeEventListener('message', bcHandler);
      window.removeEventListener('message', winHandler);
      bc.close();
    };
  }
};
