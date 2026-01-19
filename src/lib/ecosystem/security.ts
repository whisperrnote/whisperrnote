/**
 * Whisperr Ecosystem Security Protocol (WESP)
 * Centralized security and encryption logic for the entire ecosystem.
 * Hosted by the ID node (Identity Management System).
 */

import { MeshProtocol } from './mesh';

export class EcosystemSecurity {
  private static instance: EcosystemSecurity;
  private masterKey: CryptoKey | null = null;
  private isUnlocked = false;
  private nodeId: string = 'id';

  // Constants aligned with WhisperrKeep for backward compatibility
  private static readonly PBKDF2_ITERATIONS = 600000;
  private static readonly SALT_SIZE = 32;
  private static readonly IV_SIZE = 16;
  private static readonly KEY_SIZE = 256;

  static getInstance(): EcosystemSecurity {
    if (!EcosystemSecurity.instance) {
      EcosystemSecurity.instance = new EcosystemSecurity();
    }
    return EcosystemSecurity.instance;
  }

  /**
   * Initialize security for a specific node
   */
  init(nodeId: string) {
    this.nodeId = nodeId;
    this.listenForMeshDirectives();
  }

  private listenForMeshDirectives() {
    MeshProtocol.subscribe((msg) => {
      // Sync unlock state across nodes
      if (msg.type === 'COMMAND' && msg.payload.action === 'SYNC_MASTERPASS_KEY') {
        if (msg.sourceNode === 'id' && this.nodeId !== 'id') {
          // If ID (Control Node) broadcasts a key, other nodes import it
          this.syncKeyFromMaster(msg.payload.keyBytes);
        }
      }

      if (msg.type === 'COMMAND' && msg.payload.action === 'LOCK_SYSTEM') {
        this.lock();
      }

      // Handle key requests from other nodes
      if (msg.type === 'RPC_REQUEST' && msg.payload.method === 'REQUEST_KEY_SYNC') {
        if (this.nodeId === 'id' && this.masterKey && this.isUnlocked) {
          this.reBroadcastKey(msg.sourceNode);
        }
      }
    });

    // Request key if we are not ID and not unlocked
    if (this.nodeId !== 'id' && !this.isUnlocked) {
      MeshProtocol.broadcast({
        type: 'RPC_REQUEST',
        targetNode: 'id',
        payload: { method: 'REQUEST_KEY_SYNC' }
      }, this.nodeId);
    }
  }

  private async reBroadcastKey(targetNode: string) {
    if (!this.masterKey) return;
    const keyBytes = await crypto.subtle.exportKey("raw", this.masterKey);
    MeshProtocol.broadcast({
      type: 'COMMAND',
      targetNode: targetNode,
      payload: { 
        action: 'SYNC_MASTERPASS_KEY', 
        keyBytes: keyBytes 
      }
    }, 'id');
  }

  private async syncKeyFromMaster(keyBytes: ArrayBuffer) {
    try {
      this.masterKey = await crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt", "wrapKey", "unwrapKey"],
      );
      this.isUnlocked = true;
      if (typeof sessionStorage !== "undefined") {
          sessionStorage.setItem("whisperr_vault_unlocked", "true");
      }
      console.log(`[Security] Node ${this.nodeId} successfully synced MasterPass from ID`);
    } catch (e) {
      console.error("[Security] Key sync failed", e);
    }
  }

  /**
   * Derive key from password
   */
  private async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"],
    );

    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: EcosystemSecurity.PBKDF2_ITERATIONS,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: EcosystemSecurity.KEY_SIZE },
      true,
      ["encrypt", "decrypt", "wrapKey", "unwrapKey"],
    );
  }

  async unlock(password: string, keyChainEntry?: any): Promise<boolean> {
    try {
      if (!keyChainEntry) return false;

      const salt = new Uint8Array(
        atob(keyChainEntry.salt).split("").map(c => c.charCodeAt(0))
      );

      const authKey = await this.deriveKey(password, salt);
      const wrappedKeyBytes = new Uint8Array(
        atob(keyChainEntry.wrappedKey).split("").map(c => c.charCodeAt(0))
      );

      const iv = wrappedKeyBytes.slice(0, EcosystemSecurity.IV_SIZE);
      const ciphertext = wrappedKeyBytes.slice(EcosystemSecurity.IV_SIZE);

      const mekBytes = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        authKey,
        ciphertext
      );

      this.masterKey = await crypto.subtle.importKey(
        "raw",
        mekBytes,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
      );

      this.isUnlocked = true;

      // If we are ID, broadcast the key to other nodes in the mesh
      if (this.nodeId === 'id') {
        MeshProtocol.broadcast({
          type: 'COMMAND',
          targetNode: 'all',
          payload: { 
            action: 'SYNC_MASTERPASS_KEY', 
            keyBytes: mekBytes 
          }
        }, 'id');
      }

      return true;
    } catch (e) {
      console.error("[Security] Unlock failed", e);
      return false;
    }
  }

  async encrypt(data: string): Promise<string> {
    if (!this.masterKey) throw new Error("Security vault locked");
    
    const encoder = new TextEncoder();
    const plaintext = encoder.encode(JSON.stringify(data));
    const iv = crypto.getRandomValues(new Uint8Array(EcosystemSecurity.IV_SIZE));

    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      this.masterKey,
      plaintext,
    );

    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  async decrypt(encryptedData: string): Promise<string> {
    if (!this.masterKey) throw new Error("Security vault locked");

    const combined = new Uint8Array(
      atob(encryptedData).split("").map((char) => char.charCodeAt(0)),
    );

    const iv = combined.slice(0, EcosystemSecurity.IV_SIZE);
    const encrypted = combined.slice(EcosystemSecurity.IV_SIZE);

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      this.masterKey,
      encrypted,
    );

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decrypted));
  }

  lock() {
    this.masterKey = null;
    this.isUnlocked = false;
    if (typeof sessionStorage !== "undefined") {
        sessionStorage.removeItem("whisperr_vault_unlocked");
    }
  }

  get status() {
    return {
      isUnlocked: this.isUnlocked,
      hasKey: !!this.masterKey
    };
  }
}

export const ecosystemSecurity = EcosystemSecurity.getInstance();
