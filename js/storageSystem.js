/**
 * Storage System (Client-Side)
 * Replaces server.js for data persistence.
 * Uses IndexedDB for heavy assets (Images) and LocalStorage/IndexedDB for Card Metadata.
 */

const DB_NAME = 'HologramCardDB';
const DB_VERSION = 1;
const STORE_CARDS = 'cards';
const STORE_IMAGES = 'images'; // For storing uploaded user assets

/**
 * Storage System (Supabase Version)
 * Replaces IndexedDB/LocalStorage with Cloud Database.
 */

class StorageSystem {
    constructor() {
        this.client = window.supabaseClient;
        this.memoryCache = null; // In-Memory Cache
        if (!this.client) {
            console.warn("Supabase Client missing. Cloud features will fail.");
        }
        // No INIT_DB needed for Cloud-only mode
        this.ready = Promise.resolve();
    }

    // --- CARD DATA OPERATIONS ---

    async saveCard(cardData) {
        if (!this.client) {
            if (window.Toast) Toast.show("Cloud Error: Supabase Not Configured", "error");
            throw new Error("No Cloud Client");
        }

        // Ensure ID and timestamps
        if (!cardData.id) cardData.id = crypto.randomUUID();
        cardData.updatedAt = Date.now();

        const payload = {
            id: cardData.id,
            name: cardData.name || 'Untitled Card',
            data: cardData,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await this.client
            .from('cards')
            .upsert(payload)
            .select();

        if (error) {
            console.error("Supabase Save Error:", error);
            if (window.Toast) Toast.show("Cloud Save Failed: " + error.message, "error");
            throw error;
        }

        // Invalidate Cache on Save
        this.memoryCache = null;

        // [DEBUG REMOVED]
        return { success: true, id: cardData.id, mode: 'cloud' };
    }

    async getCards() {
        // Return Cache if available
        if (this.memoryCache) {
            // [DEBUG REMOVED]
            return this.memoryCache;
        }

        if (!this.client) return [];

        const { data, error } = await this.client
            .from('cards')
            .select('*')
            .order('updated_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error("Supabase Load Error:", error);
            if (window.Toast) Toast.show("Cloud Load Failed", "error");
            return [];
        }

        // Update Cache
        this.memoryCache = data.map(row => row.data);
        return this.memoryCache;
    }

    async deleteCard(id) {
        if (!this.client) return { success: false };

        const { error } = await this.client
            .from('cards')
            .delete()
            .eq('id', id);

        if (error) {
            console.error("Supabase Delete Error:", error);
            throw error;
        }

        // Invalidate Cache on Delete
        this.memoryCache = null;

        return { success: true };
    }

    // --- ASSET OPERATIONS (Images) ---

    async saveAsset(blob) {
        if (!this.client) {
            if (window.Toast) Toast.show("Cloud Error: Cannot Upload Image", "error");
            throw new Error("No Cloud Client");
        }

        const ext = blob.type.split('/')[1] || 'png';
        const fileName = `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
        const filePath = `${fileName}`;

        const { data, error } = await this.client
            .storage
            .from('card-assets')
            .upload(filePath, blob, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error("Supabase Upload Error:", error);
            const msg = error.message || error.error_description || "Unknown Error";
            if (window.Toast) Toast.show(`Upload Failed: ${msg}`, "error");
            throw error;
        }

        const { data: publicData } = this.client
            .storage
            .from('card-assets')
            .getPublicUrl(filePath);

        return { success: true, url: publicData.publicUrl, isLocal: false };
    }

    async getAssetUrl(assetUrl) {
        return assetUrl;
    }
}

// Singleton Export
const storage = new StorageSystem();
window.StorageSystem = storage;
