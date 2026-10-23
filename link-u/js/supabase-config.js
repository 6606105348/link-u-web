// Link U - Supabase Database Configuration
// กำหนดการเชื่อมต่อฐานข้อมูล Supabase ไว้ในโค้ดโดยตรง (Database connection configured in code)

// ============================================================================
// การตั้งค่าฐานข้อมูล Supabase (กำหนดค่าในโค้ดที่นี่)
// ============================================================================
export const SUPABASE_CONFIG = {
    // ระบุ Supabase Project URL ของคุณที่นี่ (ตัวอย่าง: 'https://xxxxxxxxxxxxxxxx.supabase.co')
    url: 'https://cuqiztqsktscmwyzrwjv.supabase.co',

    // ระบุ Supabase Anon Key (Public Key) ของคุณที่นี่
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1cWl6dHFza3RzY213eXpyd2p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMTg5MDcsImV4cCI6MjEwNjU5NDkwN30.PXzvMWN_ijVgFmiLpAqsYwTBJJ2yQPkdd1y0l2YFV0Y'
};

const STORAGE_KEY = 'linku_supabase_credentials';

export const SupabaseConfig = {
    // ดึงค่าการเชื่อมต่อฐานข้อมูล:
    // 1. ตรวจสอบค่าที่กำหนดไว้ในโค้ด (SUPABASE_CONFIG) ก่อนเป็นอันดับแรก
    // 2. หากยังไม่ได้กรอกในโค้ด จะตรวจสอบจาก localStorage ที่เคยบันทึกไว้
    getConfig() {
        if (SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey) {
            return {
                url: SUPABASE_CONFIG.url.trim().replace(/\/+$/, ''),
                key: SUPABASE_CONFIG.anonKey.trim()
            };
        }

        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.url && parsed.key) {
                    return parsed;
                }
            }
        } catch (e) {
            console.warn('Error reading Supabase credentials from localStorage:', e);
        }

        return {
            url: SUPABASE_CONFIG.url || '',
            key: SUPABASE_CONFIG.anonKey || ''
        };
    },

    // บันทึกการตั้งค่าลง localStorage (รองรับความเข้ากันได้)
    saveConfig(url, key) {
        const cleanUrl = (url || '').trim().replace(/\/+$/, '');
        const cleanKey = (key || '').trim();

        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            url: cleanUrl,
            key: cleanKey,
            configuredAt: new Date().toISOString()
        }));

        return { url: cleanUrl, key: cleanKey };
    },

    // ล้างค่าที่บันทึก
    clearConfig() {
        localStorage.removeItem(STORAGE_KEY);
    },

    // ตรวจสอบว่ามีการเชื่อมต่อที่พร้อมใช้งานหรือไม่
    isConfigured() {
        const config = this.getConfig();
        return Boolean(config.url && config.key && config.url.startsWith('http'));
    }
};
