/* ============================================
   TASKFLOW · МОДУЛЬ ЛИЦЕНЗИИ
   ============================================ */

const LICENSE_KEY = 'taskflow_license_v1';

// Ограничения для Free
const FREE_LIMITS = {
    maxTasks: 5,
    maxHabits: 2,
    maxStatsDays: 7,
    allowedRepeats: ['none', 'daily', 'weekly'],
    allowedNotifyDays: [0],  // 0 = только в день дедлайна
    allowImport: false,
    allowThemes: ['dark-default']
};

// Полный набор для Premium
const PREMIUM_LIMITS = {
    maxTasks: Infinity,
    maxHabits: Infinity,
    maxStatsDays: 365,
    allowedRepeats: ['none', 'daily', 'weekly', 'monthly', 'yearly', 'custom'],
    allowedNotifyDays: [-7, -3, -1, 0, 1],
    allowImport: true,
    allowThemes: ['dark-default', 'light', 'amethyst', 'emerald', 'sunset']
};

// Промо-коды (в реальности — на сервере)
const VALID_CODES = {
    'TASKFLOW-PRO-2025': { plan: 'premium', expires: null },
    'TRIAL-7DAYS':       { plan: 'premium', expires: 7 * 86400000 }
};

class License {
    constructor() {
        this.data = this.load();
    }

    load() {
        try {
            const raw = localStorage.getItem(LICENSE_KEY);
            return raw ? JSON.parse(raw) : { plan: 'free', activatedAt: null, expiresAt: null };
        } catch {
            return { plan: 'free', activatedAt: null, expiresAt: null };
        }
    }

    save() {
        localStorage.setItem(LICENSE_KEY, JSON.stringify(this.data));
    }

    isPremium() {
        if (this.data.plan !== 'premium') return false;
        if (this.data.expiresAt && Date.now() > this.data.expiresAt) {
            this.data.plan = 'free';
            this.save();
            return false;
        }
        return true;
    }

    get limits() {
        return this.isPremium() ? PREMIUM_LIMITS : FREE_LIMITS;
    }

    activate(code) {
        const normalized = code.trim().toUpperCase();
        const entry = VALID_CODES[normalized];
        if (!entry) return { ok: false, error: 'Неверный код' };

        this.data.plan = entry.plan;
        this.data.activatedAt = Date.now();
        this.data.expiresAt = entry.expires ? Date.now() + entry.expires : null;
        this.save();
        return { ok: true };
    }

    deactivate() {
        this.data = { plan: 'free', activatedAt: null, expiresAt: null };
        this.save();
    }
}

export const license = new License();