(function () {
    'use strict';

    /* ========== KEYS ========== */
    const TASKS_KEY          = 'taskflow_tasks_v1';
    const HABITS_KEY         = 'taskflow_habits_v1';
    const ORDERS_KEY         = 'taskflow_orders_v1';
    const GOALS_KEY          = 'taskflow_goals_v2';
    const JOURNAL_KEY        = 'taskflow_journal_v1';
    const DICT_KEY           = 'taskflow_dictionary_v1';
    const WOD_KEY            = 'taskflow_wordoftheday_v1';
    const STUDY_KEY          = 'taskflow_studystats_v1';
    const DIARY_KEY          = 'taskflow_diary_v1';
    const NOTIFIED_KEY       = 'taskflow_notified_ids';
    const PRIMARY_GOAL_KEY   = 'taskflow_primary_goal_v1';
    const THEME_KEY          = 'taskflow_theme_v1';
    const DAILY_REMINDER_KEY = 'taskflow_daily_reminder_v1';

    const DAY_MS = 86400000;
    const WEEK_DAYS = 7;

    /* ========== CATEGORIES / MOODS ========== */
    const CATEGORIES = [
        { id: 'psychology', name: 'Психология', icon: 'fa-brain' },
        { id: 'business',   name: 'Бизнес',     icon: 'fa-briefcase' },
        { id: 'it',         name: 'IT',          icon: 'fa-code' },
        { id: 'science',    name: 'Наука',       icon: 'fa-flask' },
        { id: 'philosophy', name: 'Философия',   icon: 'fa-scroll' },
        { id: 'medicine',   name: 'Медицина',    icon: 'fa-heart-pulse' },
        { id: 'art',        name: 'Искусство',   icon: 'fa-palette' },
        { id: 'other',      name: 'Другое',      icon: 'fa-bookmark' }
    ];

    const MOODS = [
        { id: 'fire',   emoji: '🔥', label: 'Сложно, но иду' },
        { id: 'flow',   emoji: '🎯', label: 'В потоке' },
        { id: 'calm',   emoji: '😌', label: 'Спокойно' },
        { id: 'tired',  emoji: '😤', label: 'Устал' },
        { id: 'panic',  emoji: '😰', label: 'Паника' },
        { id: 'strong', emoji: '💪', label: 'Сила' },
        { id: 'sad',    emoji: '🌧', label: 'Грустно' },
        { id: 'empty',  emoji: '🧊', label: 'Пусто' },
        { id: 'star',   emoji: '✨', label: 'Кайф' }
    ];

    /* ========== STATE ========== */
    let tasks = [];
    let habits = [];
    let orders = [];
    let goals = [];
    let journal = [];
    let dict = [];
    let diary = [];
    let wod = { date: null, wordId: null };
    let studyStats = { streak: 0, lastStudy: null };
    let currentFilter = 'all';
    let dictFilter = 'all';
    let dictCategory = 'all';
    let dictSearchQuery = '';
    let chartPeriod = 'all';
    let primaryGoalId = null;
    let editing = null;
    let editingOrder = null;
    let editingWord = null;
    let editingGoal = null;
    let editingJournal = null;
    let editingDiary = null;
    let notifiedIds = new Set();
    const collapsedGoals = new Set();

    let diarySearchQuery = '';

    // Chart swipe state
    let viewRange = null;
    let chartIsDragging = false;
    let chartDragStartX = 0;
    let chartDragStartRange = null;
    let chartDragMoved = false;
    let chartPointerId = null;

    let study = { active: false, queue: [], index: 0, knowCount: 0, reviewCount: 0 };

    // Ежедневное напоминание
    let dailyReminder = {
        enabled: true,
        hour: 13,
        minute: 0,
        lastFiredDate: null
    };
    let dailyReminderTimer = null;

    /* ========== DOM ========== */
    const $ = (id) => document.getElementById(id);

    // Planner
    const taskInput = $('taskInput');
    const taskDate = $('taskDate');
    const taskRepeat = $('taskRepeat');
    const addTaskBtn = $('addTaskBtn');
    const taskListEl = $('taskList');
    const taskSubtitle = $('taskSubtitle');
    const habitInput = $('habitInput');
    const habitTarget = $('habitTarget');
    const addHabitBtn = $('addHabitBtn');
    const habitListEl = $('habitList');
    const habitSubtitle = $('habitSubtitle');

    // Orders
    const ordersBodyEl = $('ordersBody');
    const ordersCardsEl = $('ordersCards');
    const ordersSummaryEl = $('ordersSummary');
    const ordersSubtitle = $('ordersSubtitle');
    const addOrderBtn = $('addOrderBtn');
    const exportCsvBtn = $('exportCsvBtn');

    // Strategy
    const treeListEl = $('treeList');
    const treeSubtitle = $('treeSubtitle');
    const journalListEl = $('journalList');
    const journalSubtitle = $('journalSubtitle');
    const journalQuickInput = $('journalQuickInput');
    const journalQuickAdd = $('journalQuickAdd');
    const journalGoalSelect = $('journalGoalSelect');
    const journalMoodSelect = $('journalMoodSelect');
    const newJournalBtn = $('newJournalBtn');
    const addMainGoalBtn = $('addMainGoalBtn');
    const strategyCalcBtn = $('strategyCalcBtn');
    const expandAllBtn = $('expandAllBtn');
    const collapseAllBtn = $('collapseAllBtn');
    const strategyTitle = $('strategyTitle');
    const strategyMeta = $('strategyMeta');

    const heroChartEl = $('heroChart');
    const chartTooltipEl = $('chartTooltip');
    const chartKpiEl = $('chartKpi');
    const chartInsightEl = $('chartInsight');

    // Dictionary
    const dictListEl = $('dictList');
    const dictCountEl = $('dictCount');
    const dictSearchEl = $('dictSearch');
    const dictCategoriesEl = $('dictCategories');
    const addWordBtn = $('addWordBtn');
    const exportDictCsvBtn = $('exportDictCsvBtn');
    const studyStartBtn = $('studyStartBtn');
    const wordOfDayEl = $('wordOfDay');
    const wodWordEl = $('wodWord');
    const wodMeaningEl = $('wodMeaning');
    const wodToggleEl = $('wodToggle');
    const wodMetaEl = $('wodMeta');

    const studyModeEl = $('studyMode');
    const dictionaryMainEl = $('dictionaryMain');
    const studyCounterEl = $('studyCounter');
    const studyProgressFillEl = $('studyProgressFill');
    const studyCategoryEl = $('studyCategory');
    const studyWordEl = $('studyWord');
    const studyMeaningEl = $('studyMeaning');
    const showMeaningBtn = $('showMeaningBtn');
    const studyActionsEl = $('studyActions');
    const knowBtn = $('knowBtn');
    const reviewBtn = $('reviewBtn');
    const studyExitBtn = $('studyExitBtn');
    const studyFinishedEl = $('studyFinished');
    const studyFinishedStatsEl = $('studyFinishedStats');
    const studyRestartBtn = $('studyRestartBtn');
    const studyCardEl = $('studyCard');

    // Diary
    const diaryListEl = $('diaryList');
    const diaryListSub = $('diaryListSub');
    const diarySearchEl = $('diarySearch');

    // Header
    const themeToggle = $('themeToggle');
    const themeIcon = $('themeIcon');
    const installBadge = $('installBadge');
    const notifyBadge = $('notifyBadge');
    const exportBtn = $('exportBtn');
    const importBtn = $('importBtn');
    const importInput = $('importInput');
    const resetTasksBtn = $('resetTasksBtn');
    const resetHabitsBtn = $('resetHabitsBtn');

    // Modal
    const modalOverlay = $('modalOverlay');
    const modalTitle = $('modalTitle');
    const modalInput = $('modalInput');
    const modalExtra = $('modalExtra');
    const modalCancel = $('modalCancel');
    const modalSave = $('modalSave');
    const modalCloseBtn = $('modalCloseBtn');
    const toast = $('toast');

    const calcModalOverlay = $('calcModalOverlay');
    const calcModalClose = $('calcModalClose');

    /* ========== UTILS ========== */
    function generateId() {
        return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 11);
    }

    function escapeHtml(text) {
        if (text == null) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    function formatDate(ts) {
        if (!ts) return '';
        const d = new Date(ts);
        const now = new Date();
        const diff = now - d;
        if (diff < DAY_MS) return 'сегодня';
        if (diff < 2 * DAY_MS) return 'вчера';
        return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    }

    function formatDateFull(ts) {
        if (!ts) return '';
        return new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    function formatDateShort(ts) {
        if (!ts) return '';
        return new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    }

    function isCompletedToday(ts) {
        if (!ts) return false;
        return new Date(ts).toDateString() === new Date().toDateString();
    }

    function daysUntil(deadline) {
        if (!deadline) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const d = new Date(deadline);
        d.setHours(0, 0, 0, 0);
        return Math.round((d - today) / DAY_MS);
    }

    function isOverdueTask(task) {
        if (!task.deadline || task.completed) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return new Date(task.deadline).setHours(0, 0, 0, 0) < today;
    }

    function showToast(message, icon = 'fa-circle-check') {
        toast.innerHTML = `<i class="fas ${icon}"></i> ${escapeHtml(message)}`;
        toast.classList.add('show');
        clearTimeout(showToast._t);
        showToast._t = setTimeout(() => toast.classList.remove('show'), 2200);
    }

    function pluralize(n, one, few, many) {
        const m10 = n % 10, m100 = n % 100;
        if (m10 === 1 && m100 !== 11) return one;
        if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
        return many;
    }

    function formatMoney(n) {
        if (!n) return '0';
        return new Intl.NumberFormat('ru-RU').format(Math.round(n));
    }

    function formatNumber(n) {
        return new Intl.NumberFormat('ru-RU').format(Math.round(n));
    }

    function pluralizeTime(days) {
        if (days < 1) return 'меньше дня';
        if (days < 30) return `${days} ${pluralize(days, 'день', 'дня', 'дней')}`;
        if (days < 365) {
            const m = Math.round(days / 30);
            return `≈ ${m} ${pluralize(m, 'месяц', 'месяца', 'месяцев')}`;
        }
        const y = (days / 365).toFixed(1);
        return `≈ ${y} ${pluralize(Math.round(y), 'год', 'года', 'лет')}`;
    }

    function todayStr() {
        return new Date().toISOString().slice(0, 10);
    }

    function getCategoryInfo(id) {
        return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
    }

    function getMoodInfo(id) {
        return MOODS.find(m => m.id === id) || MOODS[0];
    }

    function truncateText(text, maxLen = 160) {
        if (!text) return '';
        if (text.length <= maxLen) return text;
        return text.slice(0, maxLen).trim() + '…';
    }

    function shortMoney(v) {
        if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
        if (v >= 1_000) return Math.round(v / 1000) + 'k';
        return Math.round(v);
    }

    /* ========== THEME ========== */
    function applyTheme(theme) {
        document.body.dataset.theme = theme;
        if (themeIcon) {
            themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', theme === 'dark' ? '#0e1117' : '#2457d6');
        try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
    }

    function initTheme() {
        let saved = 'light';
        try { saved = localStorage.getItem(THEME_KEY) || 'light'; } catch (e) {}
        if (!localStorage.getItem(THEME_KEY)) {
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                saved = 'dark';
            }
        }
        applyTheme(saved);
    }

    themeToggle.addEventListener('click', () => {
        const current = document.body.dataset.theme || 'light';
        applyTheme(current === 'dark' ? 'light' : 'dark');
    });

    /* ========== STORAGE ========== */
    function readJSON(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return fallback;
            const parsed = JSON.parse(raw);
            return parsed == null ? fallback : parsed;
        } catch (e) { return fallback; }
    }

    function loadAll() {
        try {
            tasks  = readJSON(TASKS_KEY,  defaultTasks());
            habits = readJSON(HABITS_KEY, defaultHabits());
            orders = readJSON(ORDERS_KEY, defaultOrders());
            goals  = readJSON(GOALS_KEY,  defaultGoals());
            journal= readJSON(JOURNAL_KEY,[]);
            dict   = readJSON(DICT_KEY,   defaultDict());
            diary  = readJSON(DIARY_KEY,  []);
            wod    = readJSON(WOD_KEY,    { date: null, wordId: null });
            studyStats = readJSON(STUDY_KEY, { streak: 0, lastStudy: null });
            primaryGoalId = localStorage.getItem(PRIMARY_GOAL_KEY) || null;
            dailyReminder = readJSON(DAILY_REMINDER_KEY, { enabled: true, hour: 13, minute: 0, lastFiredDate: null });

            const notified = localStorage.getItem(NOTIFIED_KEY);
            notifiedIds = notified ? new Set(JSON.parse(notified)) : new Set();
        } catch (e) {
            console.error('loadAll error', e);
        }
    }

    function saveTasks()  { try { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)); } catch (e) { showToast('Хранилище заполнено', 'fa-triangle-exclamation'); } }
    function saveHabits() { try { localStorage.setItem(HABITS_KEY, JSON.stringify(habits)); } catch (e) { showToast('Хранилище заполнено', 'fa-triangle-exclamation'); } }
    function saveOrders() { try { localStorage.setItem(ORDERS_KEY, JSON.stringify(orders)); } catch (e) { showToast('Хранилище заполнено', 'fa-triangle-exclamation'); } }
    function saveGoals()  { try { localStorage.setItem(GOALS_KEY, JSON.stringify(goals)); } catch (e) { showToast('Хранилище заполнено', 'fa-triangle-exclamation'); } }
    function saveJournal(){ try { localStorage.setItem(JOURNAL_KEY, JSON.stringify(journal)); } catch (e) { showToast('Хранилище заполнено', 'fa-triangle-exclamation'); } }
    function saveDict()   { try { localStorage.setItem(DICT_KEY, JSON.stringify(dict)); } catch (e) { showToast('Хранилище заполнено', 'fa-triangle-exclamation'); } }
    function saveDiary()  { try { localStorage.setItem(DIARY_KEY, JSON.stringify(diary)); } catch (e) { showToast('Хранилище заполнено', 'fa-triangle-exclamation'); } }
    function saveWod()    { try { localStorage.setItem(WOD_KEY, JSON.stringify(wod)); } catch (e) {} }
    function saveStudyStats() { try { localStorage.setItem(STUDY_KEY, JSON.stringify(studyStats)); } catch (e) {} }
    function saveNotified()   { try { localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...notifiedIds])); } catch (e) {} }
    function saveDailyReminder() { try { localStorage.setItem(DAILY_REMINDER_KEY, JSON.stringify(dailyReminder)); } catch (e) {} }
    function savePrimaryGoal() {
        try {
            if (primaryGoalId) localStorage.setItem(PRIMARY_GOAL_KEY, primaryGoalId);
            else localStorage.removeItem(PRIMARY_GOAL_KEY);
        } catch (e) {}
    }

    /* ========== DEFAULT DATA ========== */
    function defaultTasks() {
        return [
            { id: generateId(), text: 'Изучить новый фреймворк', completed: false, createdAt: Date.now(), completedAt: null, deadline: null, repeat: 'none', lastReset: null },
            { id: generateId(), text: 'Провести встречу с командой', completed: true, createdAt: Date.now() - DAY_MS, completedAt: Date.now() - DAY_MS / 2, deadline: null, repeat: 'none', lastReset: null },
            { id: generateId(), text: 'Записать видео для клиента', completed: false, createdAt: Date.now() - 2 * DAY_MS, completedAt: null, deadline: Date.now() + 2 * DAY_MS, repeat: 'none', lastReset: null }
        ];
    }

    function defaultHabits() {
        return [
            { id: generateId(), text: 'Медитация 10 минут', streak: 3, target: 7, lastCompleted: null, createdAt: Date.now() },
            { id: generateId(), text: 'Чтение 20 страниц', streak: 5, target: 10, lastCompleted: null, createdAt: Date.now() - DAY_MS },
            { id: generateId(), text: 'Пить воду 2 литра', streak: 1, target: 7, lastCompleted: null, createdAt: Date.now() - 3 * DAY_MS }
        ];
    }

    function defaultOrders() {
        return [
            { id: generateId(), week: 'Неделя 1', responses: 20, replies: 5, deals: 1, income: 15000, support: 1, notes: 'Первая сделка' },
            { id: generateId(), week: 'Неделя 2', responses: 25, replies: 8, deals: 2, income: 34000, support: 2, notes: 'Два лендинга' },
            { id: generateId(), week: 'Неделя 3', responses: 30, replies: 12, deals: 3, income: 52000, support: 3, notes: 'Повторные обращения' }
        ];
    }

    function defaultGoals() {
        const mainId = generateId();
        return [
            {
                id: mainId,
                title: 'Выйти на 211 000 ₽ в месяц',
                note: '61 000 ₽ на жизнь + 100 000 ₽ на вклад. Копим на машину.',
                deadline: Date.now() + 30 * DAY_MS,
                amount: 211000,
                amountCurrent: 0,
                status: 'active',
                parentId: null,
                createdAt: Date.now(),
                order: 0
            },
            {
                id: generateId(),
                title: '61 000 ₽ на жизнь',
                note: 'Любая работа с зп 61 000 ₽.',
                deadline: Date.now() + 30 * DAY_MS,
                amount: 61000,
                amountCurrent: 0,
                status: 'active',
                parentId: mainId,
                createdAt: Date.now(),
                order: 0
            },
            {
                id: generateId(),
                title: '100 000 ₽ на вклад',
                note: 'Откладывать и не трогать.',
                deadline: Date.now() + 30 * DAY_MS,
                amount: 100000,
                amountCurrent: 0,
                status: 'active',
                parentId: mainId,
                createdAt: Date.now(),
                order: 1
            }
        ];
    }

    function defaultDict() {
        return [
            {
                id: generateId(),
                word: 'Рефлексия',
                meaning: 'Способность человека осмыслять свои мысли, эмоции, действия и результаты, чтобы лучше понимать себя и корректировать поведение.',
                example: 'После рефлексии я понял, что зря потратил неделю на бесполезные задачи.',
                category: 'psychology', favorite: true, know: false, review: false, createdAt: Date.now()
            },
            {
                id: generateId(),
                word: 'Синергия',
                meaning: 'Эффект, при котором результат взаимодействия нескольких элементов больше, чем простая сумма их отдельных результатов.',
                example: 'Командная работа дала синергию.',
                category: 'business', favorite: false, know: false, review: false, createdAt: Date.now() - DAY_MS
            }
        ];
    }

    /* ========== REPEATS ========== */
    function processRepeats() {
        const now = Date.now();
        let changed = false;

        tasks.forEach(task => {
            if (task.repeat === 'none' || !task.completed) return;
            const lastReset = task.lastReset || 0;
            const diff = now - lastReset;

            let shouldReset = false;
            if (task.repeat === 'daily' && diff >= DAY_MS) shouldReset = true;
            else if (task.repeat === 'weekly' && diff >= 7 * DAY_MS) shouldReset = true;
            else if (task.repeat === 'monthly' && diff >= 30 * DAY_MS) shouldReset = true;

            if (shouldReset) {
                task.completed = false;
                task.completedAt = null;
                task.lastReset = now;
                task.createdAt = now;
                if (task.deadline) {
                    const oldDl = new Date(task.deadline);
                    if (task.repeat === 'daily') oldDl.setDate(oldDl.getDate() + 1);
                    else if (task.repeat === 'weekly') oldDl.setDate(oldDl.getDate() + 7);
                    else if (task.repeat === 'monthly') oldDl.setMonth(oldDl.getMonth() + 1);
                    task.deadline = oldDl.getTime();
                }
                changed = true;
            }
        });

        if (changed) { saveTasks(); renderTasks(); }
    }

    function getRepeatLabel(repeat) {
        const map = { daily: 'ежедневно', weekly: 'еженедельно', monthly: 'ежемесячно' };
        return map[repeat] || '';
    }

    /* ========== NOTIFICATIONS ========== */
    function notificationSupported() { return 'Notification' in window; }

    async function requestNotificationPermission() {
        if (!notificationSupported()) { showToast('Уведомления не поддерживаются', 'fa-triangle-exclamation'); return; }
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                updateNotifyBadge();
                showToast('Уведомления включены');
                await sendNotification('TaskFlow', { body: 'Уведомления активированы' });
                checkDeadlines();
                checkDailyReminder();
            } else {
                showToast('Разрешение не получено', 'fa-bell-slash');
            }
        } catch (e) { console.error(e); }
    }

    function updateNotifyBadge() {
        if (!notificationSupported()) { notifyBadge.hidden = true; return; }
        notifyBadge.hidden = Notification.permission === 'granted';
    }

    async function sendNotification(title, options = {}) {
        if (!notificationSupported() || Notification.permission !== 'granted') return;

        const fullOptions = {
            icon: 'icons/web-app-manifest-192x192.png',
            badge: 'icons/web-app-manifest-192x192.png',
            ...options
        };

        // Сначала пробуем через Service Worker (работает в фоне)
        try {
            if ('serviceWorker' in navigator) {
                const reg = await navigator.serviceWorker.ready;
                if (reg && reg.showNotification) {
                    await reg.showNotification(title, fullOptions);
                    return;
                }
            }
        } catch (e) {
            console.warn('SW showNotification failed, fallback', e);
        }

        // Fallback
        try {
            const n = new Notification(title, fullOptions);
            n.onclick = () => { window.focus(); n.close(); };
        } catch (e) {
            console.warn('Notification failed', e);
        }
    }

    function checkDeadlines() {
        if (!notificationSupported() || Notification.permission !== 'granted') return;
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const todayEnd = todayStart.getTime() + DAY_MS;

        tasks.forEach(task => {
            if (task.completed || !task.deadline) return;
            const dl = new Date(task.deadline).getTime();
            const key = `${task.id}-${new Date(dl).toDateString()}`;
            const isToday = dl >= todayStart.getTime() && dl < todayEnd;
            const isOverdue = dl < todayStart.getTime();

            if ((isToday || isOverdue) && !notifiedIds.has(key)) {
                const str = new Date(dl).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
                sendNotification(isOverdue ? 'Задача просрочена' : 'Напоминание', {
                    body: isOverdue ? `«${task.text}» — дедлайн был ${str}` : `«${task.text}» — дедлайн сегодня`,
                    tag: task.id
                });
                notifiedIds.add(key);
            }
        });
        saveNotified();
    }

    /* ========== ЕЖЕДНЕВНОЕ НАПОМИНАНИЕ ========== */
    function checkDailyReminder() {
        if (!dailyReminder.enabled) return;
        if (!notificationSupported() || Notification.permission !== 'granted') return;

        const now = new Date();
        const todayStrLocal = now.toISOString().slice(0, 10);

        // Уже отправляли сегодня?
        if (dailyReminder.lastFiredDate === todayStrLocal) return;

        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const targetMinutes = dailyReminder.hour * 60 + dailyReminder.minute;

        if (currentMinutes >= targetMinutes) {
            const activeTasks = tasks.filter(t => !t.completed).length;
            const completedToday = tasks.filter(t => t.completed && isCompletedToday(t.completedAt)).length;

            let body = 'Как дела? Не забудь записать задачи на сегодня';
            if (activeTasks > 0) {
                body = `У тебя ${activeTasks} ${pluralize(activeTasks, 'активная задача', 'активные задачи', 'активных задач')}`;
            }
            if (completedToday > 0) {
                body = `Сегодня уже закрыто ${completedToday}. Продолжай!`;
            }

            sendNotification('TaskFlow · 13:00', {
                body,
                tag: 'daily-reminder',
                requireInteraction: false
            });

            dailyReminder.lastFiredDate = todayStrLocal;
            saveDailyReminder();
        }
    }

    function startDailyReminder() {
        if (dailyReminderTimer) clearInterval(dailyReminderTimer);
        // Проверяем каждую минуту
        dailyReminderTimer = setInterval(checkDailyReminder, 60 * 1000);
        // И сразу при запуске — через 3 секунды
        setTimeout(checkDailyReminder, 3000);
    }

    /* ============================================================
       PLANNER
       ============================================================ */
    function getFilteredTasks() {
        let list = [...tasks];
        if (currentFilter === 'active') list = list.filter(t => !t.completed);
        else if (currentFilter === 'completed') list = list.filter(t => t.completed);
        else if (currentFilter === 'overdue') list = list.filter(t => isOverdueTask(t));

        return list.sort((a, b) => {
            if (a.completed === b.completed) {
                if (!a.completed) {
                    if (a.deadline && b.deadline) return a.deadline - b.deadline;
                    if (a.deadline) return -1;
                    if (b.deadline) return 1;
                }
                return b.createdAt - a.createdAt;
            }
            return a.completed ? 1 : -1;
        });
    }

    function renderTasks() {
        const active = tasks.filter(t => !t.completed).length;
        taskSubtitle.textContent = `${tasks.length} всего · ${active} активных`;

        const filtered = getFilteredTasks();
        if (filtered.length === 0) {
            taskListEl.innerHTML = emptyState('fa-clipboard-list', currentFilter === 'all' ? 'Нет задач. Добавьте первую' : 'Ничего не найдено');
            return;
        }

        taskListEl.innerHTML = filtered.map(task => {
            const overdue = isOverdueTask(task);
            const daysLeft = daysUntil(task.deadline);
            const repeatLabel = getRepeatLabel(task.repeat);

            let deadlineTag = '';
            if (task.deadline) {
                let cls = '', txt = '';
                if (overdue) { cls = 'overdue'; txt = `просрочено ${Math.abs(daysLeft)} дн`; }
                else if (daysLeft === 0) { cls = 'today'; txt = 'сегодня'; }
                else if (daysLeft === 1) { txt = 'завтра'; }
                else if (daysLeft < 7) { txt = `${daysLeft} дн`; }
                else { txt = formatDateShort(task.deadline); }
                deadlineTag = `<span class="item-tag ${cls}"><i class="fas fa-flag"></i> ${txt}</span>`;
            }

            const repeatTag = repeatLabel ? `<span class="item-tag"><i class="fas fa-redo"></i> ${repeatLabel}</span>` : '';

            return `
                <div class="item ${overdue ? 'overdue' : ''} ${task.completed ? 'done' : ''}" data-id="${task.id}">
                    <div class="item-check ${task.completed ? 'checked' : ''}" data-action="toggle-task" data-id="${task.id}">
                        ${task.completed ? '<i class="fas fa-check"></i>' : ''}
                    </div>
                    <div class="item-main">
                        <div class="item-title" data-action="edit-task" data-id="${task.id}">${escapeHtml(task.text)}</div>
                        <div class="item-meta">${deadlineTag}${repeatTag}</div>
                    </div>
                    <div class="item-actions">
                        <button class="icon-btn" data-action="edit-task" data-id="${task.id}"><i class="fas fa-pen"></i></button>
                        <button class="icon-btn danger" data-action="delete-task" data-id="${task.id}"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderHabits() {
        const best = habits.length ? Math.max(...habits.map(h => h.streak)) : 0;
        habitSubtitle.textContent = `${habits.length} всего · лучший стрик ${best}`;

        if (habits.length === 0) {
            habitListEl.innerHTML = emptyState('fa-seedling', 'Нет привычек. Начните отслеживать');
            return;
        }

        habitListEl.innerHTML = habits.map(habit => {
            const progress = habit.target > 0 ? Math.min((habit.streak / habit.target) * 100, 100) : 0;
            const doneToday = isCompletedToday(habit.lastCompleted);
            const full = habit.streak >= habit.target;

            return `
                <div class="item" data-id="${habit.id}">
                    <div class="item-check ${doneToday ? 'checked' : ''}" data-action="increment-habit" data-id="${habit.id}">
                        <span class="num">${habit.streak}</span>
                    </div>
                    <div class="item-main">
                        <div class="item-title" data-action="edit-habit" data-id="${habit.id}">${escapeHtml(habit.text)}</div>
                        <div class="item-meta">
                            <span class="item-tag ${full ? 'done' : ''}"><i class="fas fa-fire"></i> ${habit.streak} / ${habit.target}</span>
                        </div>
                        <div class="progress-track"><div class="progress-fill" style="width: ${progress}%"></div></div>
                    </div>
                    <div class="item-actions">
                        <button class="icon-btn" data-action="edit-habit" data-id="${habit.id}"><i class="fas fa-pen"></i></button>
                        <button class="icon-btn danger" data-action="delete-habit" data-id="${habit.id}"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function emptyState(icon, text) {
        return `<div class="empty"><i class="fas ${icon}"></i><span>${escapeHtml(text)}</span></div>`;
    }

    /* ============================================================
       ORDERS
       ============================================================ */
    function calcAvg(income, deals) {
        if (!deals) return 0;
        return Math.round(income / deals);
    }

    function renderOrders() {
        ordersSubtitle.textContent = `${orders.length} ${pluralize(orders.length, 'неделя', 'недели', 'недель')}`;

        const totalIncome = orders.reduce((s, o) => s + (Number(o.income) || 0), 0);
        const totalDeals = orders.reduce((s, o) => s + (Number(o.deals) || 0), 0);
        const totalResponses = orders.reduce((s, o) => s + (Number(o.responses) || 0), 0);
        const avg = totalDeals > 0 ? Math.round(totalIncome / totalDeals) : 0;
        const conv = totalResponses > 0 ? Math.round((totalDeals / totalResponses) * 100) : 0;

        ordersSummaryEl.innerHTML = `
            <div class="order-kpi">
                <div class="order-kpi-label">Доход всего</div>
                <div class="order-kpi-value accent">${formatMoney(totalIncome)} ₽</div>
            </div>
            <div class="order-kpi">
                <div class="order-kpi-label">Сделок</div>
                <div class="order-kpi-value">${totalDeals}</div>
            </div>
            <div class="order-kpi">
                <div class="order-kpi-label">Средний чек</div>
                <div class="order-kpi-value">${formatMoney(avg)} ₽</div>
            </div>
            <div class="order-kpi">
                <div class="order-kpi-label">Конверсия</div>
                <div class="order-kpi-value">${conv}%</div>
            </div>
        `;

        if (orders.length === 0) {
            ordersBodyEl.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-dim);">Нет данных</td></tr>`;
            ordersCardsEl.innerHTML = emptyState('fa-briefcase', 'Нажмите «Неделя», чтобы добавить запись');
            return;
        }

        ordersBodyEl.innerHTML = orders.map(o => `
            <tr data-id="${o.id}">
                <td class="week">${escapeHtml(o.week || '')}</td>
                <td class="num">${o.responses || 0}</td>
                <td class="num">${o.replies || 0}</td>
                <td class="num">${o.deals || 0}</td>
                <td class="num">${formatMoney(o.income)} ₽</td>
                <td class="num avg">${formatMoney(calcAvg(o.income, o.deals))} ₽</td>
                <td class="num">${o.support || 0}</td>
                <td class="notes" title="${escapeHtml(o.notes || '')}">${escapeHtml(o.notes || '—')}</td>
                <td>
                    <div class="actions">
                        <button class="icon-btn" data-action="edit-order" data-id="${o.id}"><i class="fas fa-pen"></i></button>
                        <button class="icon-btn danger" data-action="delete-order" data-id="${o.id}"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');

        ordersCardsEl.innerHTML = orders.map(o => `
            <div class="order-card" data-id="${o.id}">
                <div class="order-card-head">
                    <span class="order-card-title">${escapeHtml(o.week || '')}</span>
                    <div class="actions" style="opacity:1;">
                        <button class="icon-btn" data-action="edit-order" data-id="${o.id}"><i class="fas fa-pen"></i></button>
                        <button class="icon-btn danger" data-action="delete-order" data-id="${o.id}"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <div class="order-card-grid">
                    <div class="order-card-field"><span class="order-card-field-label">Отклики</span><span class="order-card-field-value">${o.responses || 0}</span></div>
                    <div class="order-card-field"><span class="order-card-field-label">Ответы</span><span class="order-card-field-value">${o.replies || 0}</span></div>
                    <div class="order-card-field"><span class="order-card-field-label">Сделки</span><span class="order-card-field-value">${o.deals || 0}</span></div>
                    <div class="order-card-field"><span class="order-card-field-label">Доход</span><span class="order-card-field-value accent">${formatMoney(o.income)} ₽</span></div>
                    <div class="order-card-field"><span class="order-card-field-label">Ср. чек</span><span class="order-card-field-value">${formatMoney(calcAvg(o.income, o.deals))} ₽</span></div>
                    <div class="order-card-field"><span class="order-card-field-label">На поддержке</span><span class="order-card-field-value">${o.support || 0}</span></div>
                    ${o.notes ? `<div class="order-card-field" style="grid-column:1/-1;"><span class="order-card-field-label">Заметки</span><span class="order-card-field-value" style="font-weight:400;color:var(--text-soft);font-size:13px;">${escapeHtml(o.notes)}</span></div>` : ''}
                </div>
            </div>
        `).join('');
    }

    /* ============================================================
       STRATEGY · TREE
       ============================================================ */
    function getGoalById(id) { return goals.find(g => g.id === id); }
    function getChildren(parentId) {
        return goals.filter(g => g.parentId === parentId).sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    function getRootGoals() { return getChildren(null); }

    function getGoalProgress(goal) {
        const children = getChildren(goal.id);
        if (children.length > 0) {
            const sum = children.reduce((a, c) => a + getGoalProgress(c), 0);
            return Math.round(sum / children.length);
        }
        if (goal.status === 'done') return 100;
        if (goal.status === 'paused') return 30;
        if (goal.status === 'blocked') return 10;
        if (goal.amount && goal.amountCurrent) {
            return Math.min(Math.round((goal.amountCurrent / goal.amount) * 100), 100);
        }
        return 0;
    }

    function getDescendantCount(id) {
        let count = 0;
        getChildren(id).forEach(c => { count += 1 + getDescendantCount(c.id); });
        return count;
    }

    function getPrimaryGoal() {
        if (primaryGoalId) {
            const g = getGoalById(primaryGoalId);
            if (g) return g;
        }
        const roots = getRootGoals();
        return roots[0] || null;
    }

    function renderTree() {
        const roots = getRootGoals();
        const total = goals.length;
        treeSubtitle.textContent = `${total} ${pluralize(total, 'цель', 'цели', 'целей')}`;

        if (roots.length === 0) {
            treeListEl.innerHTML = emptyState('fa-bullseye', 'Нажмите «Новая цель»');
            return;
        }
        treeListEl.innerHTML = roots.map(g => renderTreeNode(g, 0)).join('');
    }

    function renderTreeNode(goal, depth) {
        const children = getChildren(goal.id);
        const progress = getGoalProgress(goal);
        const daysLeft = daysUntil(goal.deadline);
        const isCollapsed = collapsedGoals.has(goal.id);

        let deadlineTag = '';
        if (daysLeft !== null) {
            let cls = '', txt = '';
            if (daysLeft < 0) { cls = 'bad'; txt = `просрочено ${Math.abs(daysLeft)} дн`; }
            else if (daysLeft === 0) { cls = 'warn'; txt = 'сегодня'; }
            else if (daysLeft <= 3) { cls = 'warn'; txt = `${daysLeft} дн`; }
            else { txt = `${daysLeft} дн`; }
            deadlineTag = `<span class="goal-tag ${cls}"><i class="fas fa-hourglass-half"></i> ${txt}</span>`;
        }

        const amountTag = goal.amount
            ? `<span class="goal-tag accent"><i class="fas fa-ruble-sign"></i> ${formatMoney(goal.amountCurrent || 0)} / ${formatMoney(goal.amount)}</span>`
            : '';

        const childrenCount = getDescendantCount(goal.id);
        const childrenTag = childrenCount > 0
            ? `<span class="goal-tag"><i class="fas fa-sitemap"></i> ${childrenCount}</span>`
            : '';

        const noteText = goal.note || '';
        const needsTruncate = noteText.length > 160;
        const noteHtml = noteText ? `
            <div class="goal-note" data-note-id="${goal.id}">${escapeHtml(needsTruncate ? truncateText(noteText, 160) : noteText)}</div>
            ${needsTruncate ? `
                <button class="goal-note-btn" data-action="toggle-goal-note" data-id="${goal.id}">
                    <span>Показать полностью</span><i class="fas fa-chevron-down"></i>
                </button>
            ` : ''}
        ` : '';

        const statusLabel = { active: 'в работе', paused: 'отложено', blocked: 'заблокировано', done: 'готово' }[goal.status] || '';

        return `
            <div class="tree-node" data-goal-id="${goal.id}">
                <div class="goal status-${goal.status} ${goal.status === 'done' ? 'done' : ''}">
                    <div class="goal-head">
                        <div class="goal-title-block">
                            <button class="goal-chevron ${isCollapsed ? 'collapsed' : ''} ${children.length ? '' : 'invisible'}"
                                    data-action="toggle-collapse" data-id="${goal.id}">
                                <i class="fas fa-chevron-down"></i>
                            </button>
                            <div class="goal-title-wrap">
                                <div class="goal-title">${escapeHtml(goal.title)}</div>
                                <div class="goal-meta">
                                    ${deadlineTag}
                                    ${amountTag}
                                    ${childrenTag}
                                </div>
                            </div>
                        </div>
                        <div class="goal-actions">
                            <button class="goal-action" data-action="add-subgoal" data-id="${goal.id}" title="Добавить подцель">
                                <i class="fas fa-plus"></i>
                            </button>
                            <button class="goal-action" data-action="edit-goal" data-id="${goal.id}" title="Редактировать">
                                <i class="fas fa-pen"></i>
                            </button>
                            <button class="goal-action" data-action="cycle-status" data-id="${goal.id}" title="Статус: ${statusLabel}">
                                <span class="status-dot"></span>
                            </button>
                            <button class="goal-action" data-action="make-primary" data-id="${goal.id}" title="Сделать основной">
                                <i class="fas fa-crosshairs"></i>
                            </button>
                            <button class="goal-action danger" data-action="delete-goal" data-id="${goal.id}" title="Удалить">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    ${noteHtml}
                    <div class="goal-progress">
                        <div class="goal-progress-track">
                            <div class="goal-progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <div class="goal-progress-pct">${progress}%</div>
                    </div>
                </div>
                ${children.length ? `
                    <div class="tree-children ${isCollapsed ? 'collapsed' : ''}">
                        ${children.map(c => renderTreeNode(c, depth + 1)).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    /* ============================================================
       STRATEGY · HEADER + KPI
       ============================================================ */
    function renderStrategyHeader() {
        const goal = getPrimaryGoal();

        if (!goal) {
            strategyTitle.textContent = 'Стратегия';
            strategyMeta.innerHTML = '<span>Нет основной цели. Создайте первую</span>';
            return;
        }

        strategyTitle.textContent = goal.title;

        const days = daysUntil(goal.deadline);
        const progress = getGoalProgress(goal);

        const entries = journal.filter(j => j.goalId === goal.id && j.value > 0).sort((a, b) => a.date - b.date);

        let weeklyDelta = 0;
        if (entries.length >= 1) {
            const weekAgo = Date.now() - 7 * DAY_MS;
            const recent = entries.filter(e => e.date >= weekAgo);
            if (recent.length >= 1) {
                const before = entries.filter(e => e.date < weekAgo);
                const lastVal = entries[entries.length - 1].value;
                const beforeVal = before.length ? before[before.length - 1].value : 0;
                weeklyDelta = lastVal - beforeVal;
            }
        } else if (goal.amountCurrent) {
            weeklyDelta = goal.amountCurrent;
        }

        strategyMeta.innerHTML = `
            ${days !== null ? `<span>${days >= 0 ? `<strong>${days}</strong> дн до дедлайна` : `<strong style="color:var(--bad);">просрочено</strong>`}</span>` : ''}
            <span>прогресс <strong>${progress}%</strong></span>
            ${goal.amount ? `<span><strong>${formatMoney(goal.amountCurrent || 0)}</strong> / ${formatMoney(goal.amount)} ₽</span>` : ''}
            ${weeklyDelta > 0 ? `<span style="color:var(--good);">+${formatMoney(weeklyDelta)} ₽ за неделю</span>` : ''}
        `;
    }

    function renderStrategyKpi() {
        const goal = getPrimaryGoal();
        if (!goal || !chartKpiEl) {
            if (chartKpiEl) chartKpiEl.innerHTML = '';
            return;
        }

        const entries = journal.filter(j => j.goalId === goal.id && j.value > 0).sort((a, b) => a.date - b.date);
        const current = goal.amountCurrent || (entries.length ? entries[entries.length - 1].value : 0);
        const target = goal.amount || 0;
        const days = daysUntil(goal.deadline);

        let perDay = 0;
        if (days && days > 0 && target > current) {
            perDay = Math.round((target - current) / days);
        }

        const progress = target ? Math.round((current / target) * 100) : 0;

        chartKpiEl.innerHTML = `
            <div class="chart-kpi-item">
                <div class="chart-kpi-value accent">${formatMoney(current)} ₽</div>
                <div class="chart-kpi-label">Сейчас</div>
            </div>
            <div class="chart-kpi-item">
                <div class="chart-kpi-value">${formatMoney(target)} ₽</div>
                <div class="chart-kpi-label">Цель</div>
            </div>
            <div class="chart-kpi-item">
                <div class="chart-kpi-value">${progress}%</div>
                <div class="chart-kpi-label">Прогресс</div>
            </div>
            ${perDay > 0 ? `
                <div class="chart-kpi-item">
                    <div class="chart-kpi-value good">+${formatMoney(perDay)} ₽/дн</div>
                    <div class="chart-kpi-label">Темп</div>
                </div>
            ` : ''}
        `;
    }

    /* ============================================================
       STRATEGY · CHART
       ============================================================ */
    function getChartEntries() {
        const goal = getPrimaryGoal();
        if (!goal) return { goal: null, entries: [] };

        const relatedIds = new Set([goal.id]);
        (function collect(pid) {
            getChildren(pid).forEach(c => { relatedIds.add(c.id); collect(c.id); });
        })(goal.id);

        let entries = journal
            .filter(j => j.goalId && relatedIds.has(j.goalId) && j.value > 0)
            .sort((a, b) => a.date - b.date);

        if (goal.amountCurrent && goal.amountCurrent > 0) {
            const last = entries[entries.length - 1];
            if (!last || last.value !== goal.amountCurrent) {
                entries.push({ date: Date.now(), value: goal.amountCurrent });
            }
        }

        return { goal, entries };
    }

    function renderChart() {
        if (!heroChartEl) return;

        const { goal, entries } = getChartEntries();
        renderStrategyHeader();
        renderStrategyKpi();

        if (!goal) {
            heroChartEl.innerHTML = '';
            chartInsightEl.innerHTML = '<i class="fas fa-circle-info"></i> Создайте цель, чтобы увидеть график прогресса';
            removeBrusher();
            return;
        }

        if (entries.length === 0) {
            heroChartEl.innerHTML = `
                <foreignObject x="0" y="0" width="100%" height="100%">
                    <div xmlns="http://www.w3.org/1999/xhtml" class="chart-empty">
                        <i class="fas fa-chart-line"></i>
                        <div>Пока нет данных. Запиши прогресс в дневник пути — график появится</div>
                    </div>
                </foreignObject>
            `;
            chartInsightEl.innerHTML = '<i class="fas fa-circle-info"></i> Добавь первую запись с числом в дневник пути';
            removeBrusher();
            return;
        }

        const firstDate = entries[0].date;
        const lastDate = Math.max(goal.deadline || 0, Date.now(), entries[entries.length - 1].date);
        const fullStart = firstDate - 1 * DAY_MS;
        const fullEnd = lastDate + 1 * DAY_MS;

        if (!viewRange || viewRange.start < fullStart || viewRange.end > fullEnd || viewRange.end - viewRange.start < DAY_MS) {
            viewRange = { start: fullStart, end: fullEnd };
        }

        if (chartPeriod === '7') {
            viewRange = { start: Date.now() - 7 * DAY_MS, end: Date.now() + 1 * DAY_MS };
        } else if (chartPeriod === '30') {
            viewRange = { start: Date.now() - 30 * DAY_MS, end: Date.now() + 1 * DAY_MS };
        }

        const W = 900, H = 380;
        const pad = { top: 32, right: 40, bottom: 44, left: 76 };
        const chartW = W - pad.left - pad.right;
        const chartH = H - pad.top - pad.bottom;

        const minDate = viewRange.start;
        const maxDate = viewRange.end;

        const visibleEntries = entries.filter(e => e.date >= minDate && e.date <= maxDate);
        const scaleEntries = visibleEntries.length ? visibleEntries : entries;

        const target = goal.amount || Math.max(...scaleEntries.map(e => e.value)) * 1.2;
        const maxVal = Math.max(target, ...scaleEntries.map(e => e.value));

        const xFor = (d) => pad.left + ((d - minDate) / (maxDate - minDate)) * chartW;
        const yFor = (v) => pad.top + chartH - (v / maxVal) * chartH;

        let gridSvg = '';
        for (let i = 0; i <= 4; i++) {
            const y = pad.top + (chartH / 4) * i;
            const val = maxVal * (1 - i / 4);
            gridSvg += `<line class="chart-grid" x1="${pad.left}" y1="${y}" x2="${W - pad.right}" y2="${y}" />`;
            gridSvg += `<text class="chart-axis-text" x="${pad.left - 10}" y="${y + 4}" text-anchor="end">${shortMoney(val)}</text>`;
        }

        const totalDays = Math.max(1, Math.round((maxDate - minDate) / DAY_MS));
        const stepDays = Math.max(1, Math.ceil(totalDays / 6));
        let xLabels = '';
        for (let d = 0; d <= totalDays; d += stepDays) {
            const date = minDate + d * DAY_MS;
            const x = xFor(date);
            const label = new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
            xLabels += `<text class="chart-axis-text" x="${x}" y="${H - pad.bottom + 22}" text-anchor="middle">${label}</text>`;
        }

        const axisSvg = `
            <line class="chart-axis-line" x1="${pad.left}" y1="${pad.top + chartH}" x2="${W - pad.right}" y2="${pad.top + chartH}" />
            <line class="chart-axis-line" x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${pad.top + chartH}" />
        `;

        let targetLine = '';
        if (goal.amount) {
            const y = yFor(goal.amount);
            if (y >= pad.top && y <= pad.top + chartH) {
                targetLine = `
                    <line class="chart-target-line" x1="${pad.left}" y1="${y}" x2="${W - pad.right}" y2="${y}" />
                    <text class="chart-axis-text" x="${W - pad.right}" y="${y - 6}" text-anchor="end" fill="#2457d6">цель ${formatMoney(goal.amount)} ₽</text>
                `;
            }
        }

        const points = entries.map(e => ({ x: xFor(e.date), y: yFor(e.value), v: e.value, d: e.date }));
        const pointsInWindow = points.filter(p => p.d >= minDate - 3 * DAY_MS && p.d <= maxDate + 3 * DAY_MS);

        const linePath = smoothPath(pointsInWindow);

        const areaPath = pointsInWindow.length > 1
            ? `${linePath} L ${pointsInWindow[pointsInWindow.length - 1].x},${pad.top + chartH} L ${pointsInWindow[0].x},${pad.top + chartH} Z`
            : '';

        let forecastSvg = '';
        if (goal.amount && goal.deadline && goal.deadline > entries[entries.length - 1].date) {
            const last = points[points.length - 1];
            const tx = xFor(goal.deadline);
            const ty = yFor(goal.amount);
            if (tx >= pad.left - 5 && tx <= W - pad.right + 5) {
                forecastSvg = `<path class="chart-forecast" d="M ${last.x} ${last.y} L ${tx} ${ty}" />`;
                forecastSvg += `<circle cx="${tx}" cy="${ty}" r="4" fill="none" stroke="#2457d6" stroke-width="1.5" stroke-dasharray="2 3" opacity="0.7" />`;
            }
        }

        let dotsSvg = '';
        const lastEntryDate = entries[entries.length - 1].date;
        pointsInWindow.forEach(p => {
            const isLast = Math.abs(p.d - lastEntryDate) < DAY_MS / 2;
            const cls = isLast ? 'chart-dot-last' : 'chart-dot';
            dotsSvg += `<circle class="${cls}" cx="${p.x}" cy="${p.y}" r="${isLast ? 6 : 4}" />`;
        });

        const nowPoints = pointsInWindow.filter(p => p.d <= Date.now());
        const lastVisible = nowPoints[nowPoints.length - 1];
        if (lastVisible) {
            dotsSvg += `<text class="chart-dot-label" x="${lastVisible.x}" y="${lastVisible.y - 14}" text-anchor="middle">${formatMoney(lastVisible.v)} ₽</text>`;
        }

        heroChartEl.innerHTML = `
            <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#2457d6" stop-opacity="0.3"/>
                    <stop offset="60%" stop-color="#2457d6" stop-opacity="0.05"/>
                    <stop offset="100%" stop-color="#2457d6" stop-opacity="0"/>
                </linearGradient>
            </defs>
            ${gridSvg}
            ${axisSvg}
            ${xLabels}
            ${targetLine}
            ${areaPath ? `<path class="chart-area" d="${areaPath}" />` : ''}
            ${forecastSvg}
            ${pointsInWindow.length > 1 ? `<path class="chart-line-glow" d="${linePath}" />` : ''}
            ${pointsInWindow.length > 1 ? `<path class="chart-line" d="${linePath}" />` : ''}
            ${dotsSvg}

            <g id="chartFocusGroup" style="display:none; pointer-events:none;">
                <line class="chart-focus-line" x1="0" y1="${pad.top}" x2="0" y2="${pad.top + chartH}" />
                <circle class="chart-focus-dot" cx="0" cy="0" r="6" />
                <text class="chart-focus-label" x="0" y="0" text-anchor="middle"></text>
                <text class="chart-focus-date" x="0" y="0" text-anchor="middle"></text>
            </g>
        `;

        setupChartSwipe(entries, pad, chartW, chartH, W, xFor, yFor);
        renderBrusher(entries, fullStart, fullEnd);
        renderChartInsight(goal, entries);
    }

    function smoothPath(points) {
        if (points.length === 0) return '';
        if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

        let d = `M ${points[0].x} ${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i - 1] || points[i];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[i + 2] || p2;

            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;
            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;

            d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
        }
        return d;
    }

    function setupChartSwipe(entries, pad, chartW, chartH, W, xFor, yFor) {
        const wrap = heroChartEl.parentElement;
        const focusGroup = document.getElementById('chartFocusGroup');
        if (!focusGroup) return;
        const focusLine = focusGroup.querySelector('.chart-focus-line');
        const focusDot = focusGroup.querySelector('.chart-focus-dot');
        const focusLabel = focusGroup.querySelector('.chart-focus-label');
        const focusDate = focusGroup.querySelector('.chart-focus-date');

        wrap.style.touchAction = 'pan-y';

        function showFocusAt(clientX) {
            const rect = wrap.getBoundingClientRect();
            const ratio = (clientX - rect.left) / rect.width;
            const svgX = ratio * W;

            if (svgX < pad.left - 10 || svgX > W - pad.right + 10) {
                focusGroup.style.display = 'none';
                return;
            }

            const dateAtX = viewRange.start + ((svgX - pad.left) / chartW) * (viewRange.end - viewRange.start);

            let nearest = null, minDist = Infinity;
            entries.forEach(e => {
                const d = Math.abs(e.date - dateAtX);
                if (d < minDist) { minDist = d; nearest = e; }
            });
            if (!nearest) return;

            const px = xFor(nearest.date);
            const py = yFor(nearest.value);

            focusLine.setAttribute('x1', px);
            focusLine.setAttribute('x2', px);
            focusDot.setAttribute('cx', px);
            focusDot.setAttribute('cy', py);

            const labelY = Math.max(py - 14, pad.top + 16);
            focusLabel.setAttribute('x', px);
            focusLabel.setAttribute('y', labelY);
            focusLabel.textContent = `${formatMoney(nearest.value)} ₽`;

            focusDate.setAttribute('x', px);
            focusDate.setAttribute('y', pad.top + chartH - 8);
            focusDate.textContent = new Date(nearest.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

            focusGroup.style.display = '';
        }

        function hideFocus() { focusGroup.style.display = 'none'; }

        function onPointerDown(e) {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            chartPointerId = e.pointerId;
            chartIsDragging = true;
            chartDragMoved = false;
            chartDragStartX = e.clientX;
            chartDragStartRange = { start: viewRange.start, end: viewRange.end };
            try { wrap.setPointerCapture(e.pointerId); } catch (err) {}
            wrap.classList.add('dragging');
        }

        function onPointerMove(e) {
            if (!chartIsDragging) {
                const rect = wrap.getBoundingClientRect();
                if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
                    showFocusAt(e.clientX);
                } else {
                    hideFocus();
                }
                return;
            }

            const dx = e.clientX - chartDragStartX;
            if (Math.abs(dx) > 4) chartDragMoved = true;

            const rect = wrap.getBoundingClientRect();
            const dxSvg = -(dx / rect.width) * W;
            const span = chartDragStartRange.end - chartDragStartRange.start;
            const dxTime = (dxSvg / chartW) * span;

            let newStart = chartDragStartRange.start + dxTime;
            let newEnd = chartDragStartRange.end + dxTime;

            const fullStart = entries[0].date - 1 * DAY_MS;
            const fullEnd = Math.max(
                entries[entries.length - 1].date,
                getPrimaryGoal()?.deadline || 0,
                Date.now()
            ) + 1 * DAY_MS;

            if (newStart < fullStart) { newEnd += fullStart - newStart; newStart = fullStart; }
            if (newEnd > fullEnd) { newStart -= newEnd - fullEnd; newEnd = fullEnd; }

            viewRange = { start: newStart, end: newEnd };
            requestAnimationFrame(() => renderChart());
        }

        function onPointerUp(e) {
            if (chartPointerId === null) return;
            try { wrap.releasePointerCapture(e.pointerId); } catch (err) {}
            chartIsDragging = false;
            chartPointerId = null;
            wrap.classList.remove('dragging');

            if (!chartDragMoved) {
                showFocusAt(e.clientX);
            } else {
                hideFocus();
            }
        }

        function onPointerLeave() { if (!chartIsDragging) hideFocus(); }

        if (!wrap._swipeBound) {
            wrap._swipeBound = true;
            wrap.addEventListener('pointerdown', onPointerDown);
            wrap.addEventListener('pointermove', onPointerMove);
            wrap.addEventListener('pointerup', onPointerUp);
            wrap.addEventListener('pointercancel', onPointerUp);
            wrap.addEventListener('pointerleave', onPointerLeave);
        }
    }

    function removeBrusher() {
        const existing = document.querySelector('.chart-brusher');
        if (existing) existing.remove();
    }

    function renderBrusher(entries, fullStart, fullEnd) {
        removeBrusher();
        if (entries.length < 2) return;

        const hero = document.querySelector('.chart-hero');
        if (!hero) return;

        const brusher = document.createElement('div');
        brusher.className = 'chart-brusher';

        const totalSpan = fullEnd - fullStart;
        if (totalSpan <= 0) return;

        const BW = 900, BH = 52;
        const pad = 4;

        const xFor = (d) => pad + ((d - fullStart) / totalSpan) * (BW - 2 * pad);
        const maxVal = Math.max(...entries.map(e => e.value));

        const miniPoints = entries.map(e => ({
            x: xFor(e.date),
            y: BH - pad - (e.value / maxVal) * (BH - 2 * pad)
        }));
        const miniLine = smoothPath(miniPoints);

        const rangeStart = Math.max(viewRange.start, fullStart);
        const rangeEnd = Math.min(viewRange.end, fullEnd);
        const rectX = xFor(rangeStart);
        const rectW = Math.max(30, xFor(rangeEnd) - xFor(rangeStart));

        const isFull = Math.abs(viewRange.start - fullStart) < 2 * DAY_MS
                    && Math.abs(viewRange.end - fullEnd) < 2 * DAY_MS;

        brusher.innerHTML = `
            <svg class="chart-brusher-svg" viewBox="0 0 ${BW} ${BH}" preserveAspectRatio="none">
                <rect class="chart-brusher-track" x="0" y="0" width="${BW}" height="${BH}" />
                <path class="chart-brusher-mini-area" d="${miniLine} L ${miniPoints[miniPoints.length - 1].x} ${BH} L ${miniPoints[0].x} ${BH} Z" />
                <path class="chart-brusher-mini-line" d="${miniLine}" />
                <rect class="chart-brusher-bar" x="${rectX}" y="0" width="${rectW}" height="${BH}" rx="4" />
            </svg>
            <div class="chart-range-info">
                <span><strong>${formatRangeDate(rangeStart)}</strong> → <strong>${formatRangeDate(rangeEnd)}</strong></span>
            </div>
            <button class="chart-reset-btn" id="chartResetBtn" ${isFull ? 'disabled' : ''}>
                <i class="fas fa-rotate-left"></i> Сбросить
            </button>
        `;

        hero.appendChild(brusher);

        const brusherSvg = brusher.querySelector('.chart-brusher-svg');
        brusherSvg.addEventListener('click', (e) => {
            if (e.target.classList.contains('chart-brusher-bar')) return;
            const rect = brusherSvg.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const ratio = x / rect.width;
            const clickDate = fullStart + ratio * totalSpan;

            const span = viewRange.end - viewRange.start;
            const half = span / 2;
            let newStart = clickDate - half;
            let newEnd = clickDate + half;

            if (newStart < fullStart) { newEnd += fullStart - newStart; newStart = fullStart; }
            if (newEnd > fullEnd) { newStart -= newEnd - fullEnd; newEnd = fullEnd; }

            viewRange = { start: newStart, end: newEnd };
            renderChart();
        });

        const bar = brusher.querySelector('.chart-brusher-bar');
        let dragging = false;
        let dragStartX = 0;
        let dragStartRange = null;

        bar.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            dragging = true;
            dragStartX = e.clientX;
            dragStartRange = { start: viewRange.start, end: viewRange.end };
            bar.classList.add('dragging');
            try { bar.setPointerCapture(e.pointerId); } catch (err) {}
        });

        bar.addEventListener('pointermove', (e) => {
            if (!dragging) return;
            const rect = brusherSvg.getBoundingClientRect();
            const dx = e.clientX - dragStartX;
            const dxDate = (dx / rect.width) * totalSpan;
            const span = dragStartRange.end - dragStartRange.start;

            let newStart = dragStartRange.start + dxDate;
            let newEnd = dragStartRange.end + dxDate;

            if (newStart < fullStart) { newStart = fullStart; newEnd = fullStart + span; }
            if (newEnd > fullEnd) { newEnd = fullEnd; newStart = fullEnd - span; }

            viewRange = { start: newStart, end: newEnd };
            renderChart();
        });

        bar.addEventListener('pointerup', (e) => {
            dragging = false;
            bar.classList.remove('dragging');
            try { bar.releasePointerCapture(e.pointerId); } catch (err) {}
        });

        const resetBtn = brusher.querySelector('#chartResetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                viewRange = { start: fullStart, end: fullEnd };
                renderChart();
            });
        }
    }

    function formatRangeDate(ts) {
        return new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    }

    function renderChartInsight(goal, entries) {
        if (!chartInsightEl) return;
        const current = goal.amountCurrent || (entries.length ? entries[entries.length - 1].value : 0);
        const target = goal.amount || 0;
        const days = daysUntil(goal.deadline);

        if (!target) {
            chartInsightEl.innerHTML = '<i class="fas fa-circle-info"></i> Укажи сумму цели, чтобы видеть темп и прогноз';
            return;
        }

        if (days === null) {
            const progress = Math.round((current / target) * 100);
            chartInsightEl.innerHTML = `<i class="fas fa-circle-info"></i> Прогресс <strong>${progress}%</strong>. Поставь дедлайн, чтобы видеть темп`;
            return;
        }

        if (days < 0) {
            const progress = Math.round((current / target) * 100);
            chartInsightEl.innerHTML = `<i class="fas fa-triangle-exclamation" style="color:var(--bad);"></i> Дедлайн прошёл. Текущий прогресс <strong>${progress}%</strong>`;
            return;
        }

        const perDay = Math.max(0, Math.round((target - current) / days));
        const recent = entries.slice(-7);
        const realPerDay = recent.length >= 2
            ? Math.round((recent[recent.length - 1].value - recent[0].value) / Math.max(1, Math.round((recent[recent.length - 1].date - recent[0].date) / DAY_MS)))
            : 0;

        if (realPerDay > 0 && perDay > 0) {
            const ratio = Math.round((realPerDay / perDay) * 100);
            const statusText = ratio >= 100 ? 'идёшь с опережением' : (ratio >= 70 ? 'почти в темпе' : 'отстаёшь от темпа');
            chartInsightEl.innerHTML = `<i class="fas fa-lightbulb" style="color:var(--accent);"></i> Осталось <strong>${days} дн</strong>. Нужно <strong>+${formatMoney(perDay)} ₽/день</strong>. Сейчас идёшь по <strong>${formatMoney(realPerDay)} ₽/день</strong> — ${statusText}`;
        } else {
            chartInsightEl.innerHTML = `<i class="fas fa-lightbulb" style="color:var(--accent);"></i> Осталось <strong>${days} дн</strong>. Нужно темпом <strong>+${formatMoney(perDay)} ₽/день</strong>`;
        }
    }

    /* ============================================================
       STRATEGY · JOURNAL (path)
       ============================================================ */
    function renderMoodSelect() {
        if (!journalMoodSelect) return;
        journalMoodSelect.innerHTML = MOODS.map(m => `<option value="${m.id}">${m.emoji} ${m.label}</option>`).join('');
    }

    function renderJournal() {
        journalSubtitle.textContent = `${journal.length} ${pluralize(journal.length, 'запись', 'записи', 'записей')}`;

        if (journal.length === 0) {
            journalListEl.innerHTML = emptyState('fa-book', 'Пиши, как идёт путь');
            return;
        }

        const sorted = [...journal].sort((a, b) => b.date - a.date);

        journalListEl.innerHTML = sorted.map(entry => {
            const mood = getMoodInfo(entry.mood);
            const goal = entry.goalId ? getGoalById(entry.goalId) : null;

            return `
                <div class="journal-entry" data-id="${entry.id}">
                    <div class="journal-entry-head">
                        <div style="min-width:0;">
                            <div class="journal-entry-date">${formatDateFull(entry.date)}</div>
                            ${goal ? `<span class="journal-entry-goal"><i class="fas fa-crosshairs"></i> ${escapeHtml(goal.title)}</span>` : ''}
                        </div>
                        <div class="journal-entry-actions">
                            <button class="icon-btn" data-action="edit-journal" data-id="${entry.id}"><i class="fas fa-pen"></i></button>
                            <button class="icon-btn danger" data-action="delete-journal" data-id="${entry.id}"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                    ${entry.mood ? `<div class="journal-entry-mood"><span class="emoji">${mood.emoji}</span>${mood.label}</div>` : ''}
                    ${entry.text ? `<div class="journal-entry-text">${escapeHtml(entry.text)}</div>` : ''}
                    ${entry.value ? `<div class="journal-entry-value"><i class="fas fa-arrow-trend-up"></i> ${formatMoney(entry.value)} ₽</div>` : ''}
                </div>
            `;
        }).join('');
    }

    function renderGoalSelectors() {
        const flat = [];
        (function collect(pid, depth) {
            getChildren(pid).forEach(g => {
                flat.push({ g, depth });
                collect(g.id, depth + 1);
            });
        })(null, 0);

        const options = '<option value="">Без привязки</option>' +
            flat.map(({ g, depth }) => `<option value="${g.id}">${'· '.repeat(depth)}${escapeHtml(g.title)}</option>`).join('');

        if (journalGoalSelect) {
            const cur = journalGoalSelect.value;
            journalGoalSelect.innerHTML = options;
            if (cur) journalGoalSelect.value = cur;
        }
    }

    function addJournalQuick(goalId, text, mood, value) {
        if (!text && !value) return;
        journal.push({
            id: generateId(),
            goalId: goalId || null,
            text: (text || '').trim(),
            mood: mood || null,
            value: value || 0,
            date: Date.now()
        });
        saveJournal();
        renderJournal();
        renderChart();
        showToast('Запись добавлена');
    }

    function openJournalModal(id = null) {
        editingJournal = id || null;
        const entry = id ? journal.find(j => j.id === id) : null;

        modalTitle.textContent = id ? 'Запись' : 'Новая запись';
        modalInput.style.display = 'none';
        modalInput.value = '';

        const flat = [];
        (function collect(pid, depth) {
            getChildren(pid).forEach(g => {
                flat.push({ g, depth });
                collect(g.id, depth + 1);
            });
        })(null, 0);

        const goalOptions = '<option value="">Без привязки</option>' +
            flat.map(({ g, depth }) => `<option value="${g.id}" ${entry && entry.goalId === g.id ? 'selected' : ''}>${'· '.repeat(depth)}${escapeHtml(g.title)}</option>`).join('');

        const moodOptions = MOODS.map(m =>
            `<option value="${m.id}" ${entry && entry.mood === m.id ? 'selected' : ''}>${m.emoji} ${m.label}</option>`
        ).join('');

        modalExtra.innerHTML = `
            <label class="field"><span>Настроение</span>
                <select id="jmMood" class="input">${moodOptions}</select>
            </label>
            <label class="field"><span>К цели</span>
                <select id="jmGoal" class="input">${goalOptions}</select>
            </label>
            <label class="field"><span>Текст</span>
                <textarea id="jmText" class="input" rows="4" placeholder="Что произошло...">${entry ? escapeHtml(entry.text || '') : ''}</textarea>
            </label>
            <label class="field"><span>Прогресс, ₽</span>
                <input type="number" id="jmValue" class="input" min="0" value="${entry && entry.value ? entry.value : ''}" placeholder="Например: 25000">
            </label>
        `;

        modalOverlay.hidden = false;
        setTimeout(() => $('jmText').focus(), 50);
    }

    function saveJournalModal() {
        const mood = $('jmMood').value;
        const goalId = $('jmGoal').value || null;
        const text = $('jmText').value.trim();
        const value = Number($('jmValue').value) || 0;

        if (!text && !value) { showToast('Добавь текст или прогресс', 'fa-triangle-exclamation'); return; }

        if (editingJournal) {
            const entry = journal.find(j => j.id === editingJournal);
            if (entry) { entry.mood = mood; entry.goalId = goalId; entry.text = text; entry.value = value; }
            showToast('Запись обновлена');
        } else {
            addJournalQuick(goalId, text, mood, value);
        }
        saveJournal();
        renderJournal();
        renderChart();
        closeModal();
    }

    function deleteJournal(id) {
        if (!confirm('Удалить запись?')) return;
        journal = journal.filter(j => j.id !== id);
        saveJournal();
        renderJournal();
        renderChart();
        showToast('Удалено', 'fa-trash');
    }

    /* ============================================================
       STRATEGY · GOAL CRUD
       ============================================================ */
    function openGoalModal(parentId = null, editId = null) {
        editingGoal = editId || null;
        const goal = editId ? getGoalById(editId) : null;

        modalTitle.textContent = editId ? 'Редактировать цель' : (parentId ? 'Новая подцель' : 'Новая цель');
        modalInput.style.display = 'none';
        modalInput.value = '';

        const deadlineValue = goal && goal.deadline ? new Date(goal.deadline).toISOString().slice(0, 10) : '';

        modalExtra.innerHTML = `
            <label class="field"><span>Название *</span>
                <input type="text" id="gmTitle" class="input" value="${goal ? escapeHtml(goal.title) : ''}" placeholder="Например: Выйти на 211 000 ₽">
            </label>
            <label class="field"><span>Заметка</span>
                <textarea id="gmNote" class="input" rows="3" placeholder="Зачем эта цель...">${goal ? escapeHtml(goal.note || '') : ''}</textarea>
            </label>
            <div class="grid-2">
                <label class="field"><span>Дедлайн</span>
                    <input type="date" id="gmDeadline" class="input" value="${deadlineValue}">
                </label>
                <label class="field"><span>Статус</span>
                    <select id="gmStatus" class="input">
                        <option value="active" ${goal && goal.status === 'active' ? 'selected' : ''}>В работе</option>
                        <option value="paused" ${goal && goal.status === 'paused' ? 'selected' : ''}>Отложено</option>
                        <option value="blocked" ${goal && goal.status === 'blocked' ? 'selected' : ''}>Заблокировано</option>
                        <option value="done" ${goal && goal.status === 'done' ? 'selected' : ''}>Готово</option>
                    </select>
                </label>
                <label class="field"><span>Сумма цели, ₽</span>
                    <input type="number" id="gmAmount" class="input" min="0" value="${goal && goal.amount ? goal.amount : ''}" placeholder="211000">
                </label>
                <label class="field"><span>Текущий прогресс, ₽</span>
                    <input type="number" id="gmAmountCurrent" class="input" min="0" value="${goal && goal.amountCurrent ? goal.amountCurrent : 0}">
                </label>
            </div>
        `;

        modalOverlay.dataset.parentId = parentId || '';
        modalOverlay.hidden = false;
        setTimeout(() => $('gmTitle').focus(), 50);
    }

    function saveGoalModal() {
        const title = $('gmTitle').value.trim();
        if (!title) { showToast('Введите название', 'fa-triangle-exclamation'); return; }

        const deadlineVal = $('gmDeadline').value;
        const data = {
            title,
            note: $('gmNote').value.trim(),
            deadline: deadlineVal ? new Date(deadlineVal).getTime() : null,
            status: $('gmStatus').value,
            amount: Number($('gmAmount').value) || null,
            amountCurrent: Number($('gmAmountCurrent').value) || 0
        };

        if (editingGoal) {
            const goal = getGoalById(editingGoal);
            if (goal) Object.assign(goal, data);
            showToast('Цель обновлена');
        } else {
            const parentId = modalOverlay.dataset.parentId || null;
            const siblings = getChildren(parentId);
            const newGoal = {
                id: generateId(),
                ...data,
                parentId: parentId || null,
                createdAt: Date.now(),
                order: siblings.length
            };
            goals.push(newGoal);
            if (parentId) collapsedGoals.delete(parentId);
            if (!primaryGoalId && !parentId) {
                primaryGoalId = newGoal.id;
                savePrimaryGoal();
            }
            showToast(parentId ? 'Подцель добавлена' : 'Цель добавлена');
        }

        saveGoals();
        renderTree();
        renderGoalSelectors();
        renderChart();
        renderStats();
        closeModal();
    }

    function deleteGoal(id) {
        const desc = getDescendantCount(id);
        const msg = desc > 0 ? `Удалить цель и ${desc} ${pluralize(desc, 'подцель', 'подцели', 'подцелей')}?` : 'Удалить цель?';
        if (!confirm(msg)) return;

        const del = new Set([id]);
        (function collect(pid) {
            getChildren(pid).forEach(c => { del.add(c.id); collect(c.id); });
        })(id);

        goals = goals.filter(g => !del.has(g.id));
        if (del.has(primaryGoalId)) {
            primaryGoalId = getRootGoals()[0]?.id || null;
            savePrimaryGoal();
        }
        saveGoals();
        renderTree();
        renderGoalSelectors();
        renderChart();
        renderStats();
        showToast('Удалено', 'fa-trash');
    }

    function cycleGoalStatus(id) {
        const goal = getGoalById(id);
        if (!goal) return;
        const order = ['active', 'paused', 'blocked', 'done'];
        const idx = order.indexOf(goal.status);
        goal.status = order[(idx + 1) % order.length];
        saveGoals();
        renderTree();
        renderChart();
        renderStats();
    }

    function toggleGoalNote(id) {
        const noteEl = document.querySelector(`[data-note-id="${id}"]`);
        const btn = document.querySelector(`[data-action="toggle-goal-note"][data-id="${id}"]`);
        const goal = getGoalById(id);
        if (!noteEl || !goal) return;
        const expanded = noteEl.classList.toggle('expanded');
        if (expanded) {
            noteEl.textContent = goal.note;
            if (btn) { btn.classList.add('expanded'); btn.querySelector('span').textContent = 'Свернуть'; }
        } else {
            noteEl.textContent = truncateText(goal.note, 160);
            if (btn) { btn.classList.remove('expanded'); btn.querySelector('span').textContent = 'Показать полностью'; }
        }
    }

    function toggleCollapse(id) {
        if (collapsedGoals.has(id)) collapsedGoals.delete(id);
        else collapsedGoals.add(id);
        renderTree();
    }

    function makePrimary(id) {
        primaryGoalId = id;
        savePrimaryGoal();
        viewRange = null;
        renderTree();
        renderChart();
        showToast('Основная цель изменена');
    }

    /* ============================================================
       DICTIONARY
       ============================================================ */
    function renderDictCategories() {
        const counts = {};
        dict.forEach(w => { counts[w.category] = (counts[w.category] || 0) + 1; });

        let html = `<button class="chip ${dictCategory === 'all' ? 'active' : ''}" data-cat="all">Все <span style="opacity:.6">(${dict.length})</span></button>`;
        CATEGORIES.forEach(cat => {
            const count = counts[cat.id] || 0;
            if (count === 0 && dictCategory !== cat.id) return;
            html += `<button class="chip ${dictCategory === cat.id ? 'active' : ''}" data-cat="${cat.id}"><i class="fas ${cat.icon}"></i> ${cat.name} <span style="opacity:.6">(${count})</span></button>`;
        });
        dictCategoriesEl.innerHTML = html;
    }

    function getFilteredDict() {
        let list = [...dict];
        if (dictFilter === 'favorite') list = list.filter(w => w.favorite);
        else if (dictFilter === 'review') list = list.filter(w => w.review);
        if (dictCategory !== 'all') list = list.filter(w => w.category === dictCategory);
        if (dictSearchQuery) {
            const q = dictSearchQuery.toLowerCase();
            list = list.filter(w => (w.word || '').toLowerCase().includes(q) || (w.meaning || '').toLowerCase().includes(q));
        }
        return list.sort((a, b) => b.createdAt - a.createdAt);
    }

    function renderDict() {
        dictCountEl.textContent = `${dict.length} ${pluralize(dict.length, 'слово', 'слова', 'слов')}`;
        renderDictCategories();

        const filtered = getFilteredDict();
        if (filtered.length === 0) {
            dictListEl.innerHTML = emptyState('fa-book-open', dict.length === 0 ? 'Добавь первое слово' : 'Ничего не найдено');
            return;
        }

        dictListEl.innerHTML = filtered.map(w => {
            const cat = getCategoryInfo(w.category);
            const needsTruncate = (w.meaning || '').length > 140;
            const display = needsTruncate ? truncateText(w.meaning, 140) : w.meaning;

            return `
                <div class="dict-card" data-id="${w.id}">
                    <div class="dict-card-head">
                        <div class="dict-card-title">
                            <span class="dict-card-word">${escapeHtml(w.word)}</span>
                            <button class="dict-star ${w.favorite ? 'active' : ''}" data-action="toggle-favorite" data-id="${w.id}">
                                <i class="fas fa-star"></i>
                            </button>
                        </div>
                        <div class="dict-card-actions">
                            <button class="icon-btn" data-action="edit-word" data-id="${w.id}"><i class="fas fa-pen"></i></button>
                            <button class="icon-btn danger" data-action="delete-word" data-id="${w.id}"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                    <div class="dict-card-meaning" data-meaning-id="${w.id}">${escapeHtml(display)}</div>
                    ${needsTruncate ? `
                        <button class="goal-note-btn" data-action="toggle-meaning" data-id="${w.id}">
                            <span>Показать полностью</span><i class="fas fa-chevron-down"></i>
                        </button>
                    ` : ''}
                    ${w.example ? `<div class="dict-card-example">${escapeHtml(w.example)}</div>` : ''}
                    <div class="dict-card-tags">
                        <span class="dict-tag"><i class="fas ${cat.icon}"></i> ${cat.name}</span>
                        ${w.review ? `<span class="dict-tag review"><i class="fas fa-redo"></i> повторить</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    function openWordModal(id = null) {
        editingWord = id;
        const word = id ? dict.find(w => w.id === id) : null;

        modalTitle.textContent = id ? 'Редактировать слово' : 'Новое слово';
        modalInput.style.display = 'none';
        modalInput.value = '';

        const catOptions = CATEGORIES.map(c => `<option value="${c.id}" ${word && word.category === c.id ? 'selected' : ''}>${c.name}</option>`).join('');

        modalExtra.innerHTML = `
            <label class="field"><span>Слово *</span>
                <input type="text" id="wmWord" class="input" value="${word ? escapeHtml(word.word) : ''}">
            </label>
            <label class="field"><span>Значение *</span>
                <textarea id="wmMeaning" class="input" rows="4">${word ? escapeHtml(word.meaning) : ''}</textarea>
            </label>
            <label class="field"><span>Пример</span>
                <textarea id="wmExample" class="input" rows="2">${word ? escapeHtml(word.example || '') : ''}</textarea>
            </label>
            <label class="field"><span>Категория</span>
                <select id="wmCategory" class="input">${catOptions}</select>
            </label>
            <label class="checkbox-line">
                <input type="checkbox" id="wmFavorite" ${word && word.favorite ? 'checked' : ''}>
                <span>Добавить в избранное</span>
            </label>
        `;

        modalOverlay.hidden = false;
        setTimeout(() => $('wmWord').focus(), 50);
    }

    function saveWordModal() {
        const word = $('wmWord').value.trim();
        const meaning = $('wmMeaning').value.trim();
        if (!word) { showToast('Введите слово', 'fa-triangle-exclamation'); return; }
        if (!meaning) { showToast('Введите значение', 'fa-triangle-exclamation'); return; }

        const data = {
            word, meaning,
            example: $('wmExample').value.trim(),
            category: $('wmCategory').value,
            favorite: $('wmFavorite').checked
        };

        if (editingWord) {
            const w = dict.find(x => x.id === editingWord);
            if (w) Object.assign(w, data);
            showToast('Слово обновлено');
        } else {
            dict.unshift({ id: generateId(), ...data, know: false, review: false, createdAt: Date.now() });
            showToast('Слово добавлено');
        }
        saveDict();
        renderDict();
        updateWordOfDay();
        renderStats();
        editingWord = null;
        closeModal();
    }

    function deleteWord(id) {
        if (!confirm('Удалить слово?')) return;
        dict = dict.filter(w => w.id !== id);
        saveDict();
        renderDict();
        updateWordOfDay();
        renderStats();
        showToast('Удалено', 'fa-trash');
    }

    function toggleFavorite(id) {
        const w = dict.find(x => x.id === id);
        if (!w) return;
        w.favorite = !w.favorite;
        saveDict();
        renderDict();
    }

    function toggleMeaningExpand(id) {
        const el = document.querySelector(`[data-meaning-id="${id}"]`);
        const btn = document.querySelector(`[data-action="toggle-meaning"][data-id="${id}"]`);
        const w = dict.find(x => x.id === id);
        if (!el || !w) return;
        const expanded = el.classList.toggle('expanded');
        if (expanded) {
            el.textContent = w.meaning;
            if (btn) { btn.classList.add('expanded'); btn.querySelector('span').textContent = 'Свернуть'; }
        } else {
            el.textContent = truncateText(w.meaning, 140);
            if (btn) { btn.classList.remove('expanded'); btn.querySelector('span').textContent = 'Показать полностью'; }
        }
    }

    function updateWordOfDay() {
        if (dict.length === 0) { wordOfDayEl.hidden = true; return; }
        const today = todayStr();
        let word = wod.wordId ? dict.find(w => w.id === wod.wordId) : null;
        if (wod.date !== today || !word) {
            word = dict[Math.floor(Math.random() * dict.length)];
            wod = { date: today, wordId: word.id };
            saveWod();
        }
        wordOfDayEl.hidden = false;
        wodWordEl.textContent = word.word;

        const needsToggle = (word.meaning || '').length > 140;
        wodMeaningEl.textContent = needsToggle ? truncateText(word.meaning, 140) : word.meaning;
        wodMeaningEl.classList.remove('expanded');
        wodToggleEl.querySelector('span').textContent = 'Развернуть';
        wodToggleEl.classList.remove('expanded');

        const cat = getCategoryInfo(word.category);
        wodMetaEl.innerHTML = `
            <span class="goal-tag"><i class="fas ${cat.icon}"></i> ${cat.name}</span>
            <span class="goal-tag"><i class="far fa-clock"></i> ${formatDate(word.createdAt)}</span>
        `;
    }

    function exportDictCsv() {
        if (dict.length === 0) { showToast('Словарь пуст', 'fa-triangle-exclamation'); return; }
        const headers = ['Слово', 'Значение', 'Пример', 'Категория', 'Избранное', 'Дата'];
        const rows = dict.map(w => {
            const cat = getCategoryInfo(w.category);
            return [w.word || '', w.meaning || '', w.example || '', cat.name, w.favorite ? 'да' : 'нет', new Date(w.createdAt).toLocaleDateString('ru-RU')];
        });
        const BOM = '\uFEFF';
        const csv = BOM + [headers, ...rows].map(r => r.map(cell => {
            const s = String(cell);
            return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        }).join(';')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `taskflow-dictionary-${todayStr()}.csv`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('CSV экспортирован');
    }

    /* ============================================================
       STUDY
       ============================================================ */
    function startStudy() {
        const queue = [
            ...dict.filter(w => w.review),
            ...dict.filter(w => !w.review && !w.know),
            ...dict.filter(w => w.know && !w.review)
        ];
        if (queue.length === 0) { showToast('Нет слов для изучения', 'fa-triangle-exclamation'); return; }

        study = { active: true, queue: queue.map(w => w.id), index: 0, knowCount: 0, reviewCount: 0 };

        dictionaryMainEl.style.display = 'none';
        studyModeEl.hidden = false;
        studyFinishedEl.hidden = true;
        studyCardEl.hidden = false;
        studyActionsEl.hidden = true;
        studyMeaningEl.hidden = true;
        showMeaningBtn.hidden = false;

        showStudyCard();
    }

    function showStudyCard() {
        if (study.index >= study.queue.length) { finishStudy(); return; }
        const w = dict.find(x => x.id === study.queue[study.index]);
        if (!w) { study.index++; showStudyCard(); return; }

        const cat = getCategoryInfo(w.category);
        studyCategoryEl.textContent = cat.name;
        studyWordEl.textContent = w.word;
        studyMeaningEl.textContent = w.meaning;
        studyMeaningEl.hidden = true;
        studyActionsEl.hidden = true;
        showMeaningBtn.hidden = false;

        studyCounterEl.textContent = `${study.index + 1} / ${study.queue.length}`;
        studyProgressFillEl.style.width = (study.index / study.queue.length * 100) + '%';
    }

    function revealMeaning() {
        studyMeaningEl.hidden = false;
        studyActionsEl.hidden = false;
        showMeaningBtn.hidden = true;
    }

    function markKnow() {
        const w = dict.find(x => x.id === study.queue[study.index]);
        if (w) { w.know = true; w.review = false; }
        study.knowCount++;
        study.index++;
        saveDict();
        showStudyCard();
    }

    function markReview() {
        const w = dict.find(x => x.id === study.queue[study.index]);
        if (w) { w.review = true; w.know = false; }
        study.reviewCount++;
        study.index++;
        saveDict();
        showStudyCard();
    }

    function finishStudy() {
        studyCardEl.hidden = true;
        studyActionsEl.hidden = true;
        studyFinishedEl.hidden = false;
        studyProgressFillEl.style.width = '100%';

        const today = todayStr();
        const last = studyStats.lastStudy ? new Date(studyStats.lastStudy).toISOString().slice(0, 10) : null;
        const yest = new Date(Date.now() - DAY_MS).toISOString().slice(0, 10);

        if (last === today) {}
        else if (last === yest) studyStats.streak += 1;
        else studyStats.streak = 1;

        studyStats.lastStudy = Date.now();
        saveStudyStats();

        studyFinishedStatsEl.innerHTML = `
            <div>Знаю: <strong>${study.knowCount}</strong></div>
            <div>Повторить: <strong>${study.reviewCount}</strong></div>
            <div>Стрик: <strong>${studyStats.streak}</strong></div>
        `;

        renderDict();
        renderStats();
    }

    function exitStudy() {
        study.active = false;
        studyModeEl.hidden = true;
        dictionaryMainEl.style.display = 'block';
        renderDict();
        updateWordOfDay();
    }

    /* ============================================================
       DIARY · простой личный дневник
       ============================================================ */

    function diaryRenderList() {
        if (!diaryListEl) return;

        let list = [...diary];

        if (diarySearchQuery) {
            const q = diarySearchQuery.toLowerCase();
            list = list.filter(e => (e.text || '').toLowerCase().includes(q));
        }

        list.sort((a, b) => b.createdAt - a.createdAt);

        if (diaryListSub) {
            diaryListSub.textContent = list.length === diary.length
                ? `${diary.length} ${pluralize(diary.length, 'запись', 'записи', 'записей')}`
                : `${list.length} из ${diary.length}`;
        }

        if (list.length === 0) {
            if (diary.length === 0) {
                diaryListEl.innerHTML = `
                    <div class="diary-empty">
                        <div class="diary-empty-icon"><i class="fas fa-feather"></i></div>
                        <div class="diary-empty-title">Твой дневник пуст</div>
                        <div class="diary-empty-text">Пиши то, что думаешь, чувствуешь, замечаешь. Никто, кроме тебя, этого не увидит.</div>
                    </div>
                `;
            } else {
                diaryListEl.innerHTML = emptyState('fa-magnifying-glass', 'Ничего не найдено');
            }
            return;
        }

        diaryListEl.innerHTML = list.map(entry => {
            const dateObj = new Date(entry.createdAt);
            const dateMain = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
            const timeStr = dateObj.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

            return `
                <div class="diary-post" data-id="${entry.id}">
                    <div class="diary-post-head">
                        <div class="diary-post-date">
                            <span class="diary-post-date-main">${dateMain}</span>
                            <span class="diary-post-date-time">${timeStr}</span>
                        </div>
                        <div class="diary-post-actions">
                            <button class="icon-btn" data-action="edit-diary" data-id="${entry.id}" title="Редактировать">
                                <i class="fas fa-pen"></i>
                            </button>
                            <button class="icon-btn danger" data-action="delete-diary" data-id="${entry.id}" title="Удалить">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="diary-post-text">${escapeHtml(entry.text || '')}</div>
                </div>
            `;
        }).join('');
    }

    function diaryAddEntry(text) {
        if (!text) return;
        diary.push({
            id: generateId(),
            text: text.trim(),
            createdAt: Date.now()
        });
        saveDiary();
        diaryRenderList();
        showToast('Запись добавлена');
    }

    function diaryDeleteEntry(id) {
        if (!confirm('Удалить запись?')) return;
        diary = diary.filter(e => e.id !== id);
        saveDiary();
        diaryRenderList();
        showToast('Удалено', 'fa-trash');
    }

    function openDiaryEdit(id) {
        const entry = diary.find(e => e.id === id);
        if (!entry) return;

        modalTitle.textContent = 'Редактировать запись';
        modalInput.style.display = 'none';
        modalInput.value = '';
        editingDiary = id;

        modalExtra.innerHTML = `
            <label class="field"><span>Запись</span>
                <textarea id="dmText" class="input" rows="10" placeholder="Пиши, что на душе...">${escapeHtml(entry.text || '')}</textarea>
            </label>
        `;

        modalOverlay.hidden = false;
        setTimeout(() => $('dmText').focus(), 80);
    }

    function saveDiaryModal() {
        const text = $('dmText').value.trim();
        if (!text) { showToast('Пусто', 'fa-triangle-exclamation'); return; }

        if (editingDiary) {
            const entry = diary.find(e => e.id === editingDiary);
            if (entry) {
                entry.text = text;
                entry.updatedAt = Date.now();
            }
            showToast('Сохранено');
        }

        saveDiary();
        diaryRenderList();
        editingDiary = null;
        closeModal();
    }

    function diaryRenderAll() {
        diaryRenderList();
    }

    /* ============================================================
       CALCULATORS
       ============================================================ */
    function calcMoney() {
        const amount = Number($('moneyAmount').value) || 0;
        const period = $('moneyPeriod').value;
        const goalSum = Number($('moneyGoal').value) || 0;
        if (amount <= 0) { showToast('Введите сумму', 'fa-triangle-exclamation'); return; }

        let perDay = amount, periodLabel = 'в день';
        if (period === 'week')  { perDay = amount / 7;   periodLabel = 'в неделю'; }
        if (period === 'month') { perDay = amount / 30;  periodLabel = 'в месяц'; }
        if (period === 'year')  { perDay = amount / 365; periodLabel = 'в год'; }

        const perMonth = perDay * 30;
        const perYear = perDay * 365;

        let html = `
            <div class="calc-result-main">${formatNumber(perYear)} ₽</div>
            <div class="calc-result-label">За год, если откладываешь ${formatNumber(amount)} ₽ ${periodLabel}</div>
            <div class="calc-details">
                <div class="calc-detail"><div class="calc-detail-value">${formatNumber(perMonth)} ₽</div><div class="calc-detail-label">Месяц</div></div>
                <div class="calc-detail"><div class="calc-detail-value">${formatNumber(perYear * 5)} ₽</div><div class="calc-detail-label">5 лет</div></div>
                <div class="calc-detail"><div class="calc-detail-value">${formatNumber(perYear * 10)} ₽</div><div class="calc-detail-label">10 лет</div></div>
            </div>
        `;
        if (goalSum > 0) {
            const days = Math.ceil(goalSum / perDay);
            const date = new Date(Date.now() + days * DAY_MS);
            html += `
                <div class="calc-details" style="margin-top:14px;padding-top:14px;border-top:1px solid var(--line);">
                    <div class="calc-detail"><div class="calc-detail-value">${pluralizeTime(days)}</div><div class="calc-detail-label">До цели</div></div>
                    <div class="calc-detail"><div class="calc-detail-value">${date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</div><div class="calc-detail-label">Дата</div></div>
                </div>
            `;
        }
        const el = $('moneyResult');
        el.innerHTML = html;
        el.hidden = false;
    }

    function calcBook() {
        const total = Number($('bookTotal').value) || 0;
        const amount = Number($('bookAmount').value) || 0;
        const period = $('bookPeriod').value;
        if (total <= 0 || amount <= 0) { showToast('Заполните поля', 'fa-triangle-exclamation'); return; }

        let perDay = amount;
        if (period === 'week')  perDay = amount / 7;
        if (period === 'month') perDay = amount / 30;

        const days = Math.ceil(total / perDay);
        const date = new Date(Date.now() + days * DAY_MS);
        const booksYear = (perDay * 365 / total).toFixed(1);

        const el = $('bookResult');
        el.innerHTML = `
            <div class="calc-result-main">${pluralizeTime(days)}</div>
            <div class="calc-result-label">Прочитаешь книгу на ${total} страниц</div>
            <div class="calc-details">
                <div class="calc-detail"><div class="calc-detail-value">${date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</div><div class="calc-detail-label">Финиш</div></div>
                <div class="calc-detail"><div class="calc-detail-value">${booksYear}</div><div class="calc-detail-label">Книг в год</div></div>
                <div class="calc-detail"><div class="calc-detail-value">${Math.round(perDay * 365)}</div><div class="calc-detail-label">Страниц в год</div></div>
            </div>
        `;
        el.hidden = false;
    }

    /* ============================================================
       STATS
       ============================================================ */
    function renderStats() {
        const weekAgo = Date.now() - WEEK_DAYS * DAY_MS;
        const completed = tasks.filter(t => t.completed && (t.completedAt || t.createdAt) >= weekAgo).length;
        const created = tasks.filter(t => t.createdAt >= weekAgo).length;
        const activeGoals = goals.filter(g => g.status === 'active').length;

        $('statCompletedWeek').textContent = completed;
        $('statCreatedWeek').textContent = created;
        $('statGoalsActive').textContent = activeGoals;
        $('statWordsTotal').textContent = dict.length;

        renderWeekChart();
    }

    function renderWeekChart() {
        const chart = $('weekChart');
        const dayNames = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
        const today = new Date(); today.setHours(0, 0, 0, 0);

        const data = [];
        for (let i = 6; i >= 0; i--) {
            const start = today.getTime() - i * DAY_MS;
            const end = start + DAY_MS;
            const completed = tasks.filter(t => t.completed && (t.completedAt || t.createdAt) >= start && (t.completedAt || t.createdAt) < end).length;
            const habitActs = habits.reduce((s, h) => s + (h.streak > 0 && h.createdAt < end ? 1 : 0), 0);
            const words = dict.filter(w => w.createdAt >= start && w.createdAt < end).length;
            const journ = journal.filter(j => j.date >= start && j.date < end).length;
            const diaryCount = diary.filter(d => d.createdAt >= start && d.createdAt < end).length;
            const total = completed + Math.min(habitActs, 5) + words + journ + diaryCount;
            const date = new Date(start);
            data.push({ label: dayNames[(date.getDay() + 6) % 7], value: total });
        }

        const max = Math.max(...data.map(d => d.value), 1);

        chart.innerHTML = data.map(d => `
            <div class="week-bar-wrap">
                <div class="week-bar-value">${d.value || ''}</div>
                <div class="week-bar" style="height: ${(d.value / max) * 100}%"></div>
                <div class="week-bar-label">${d.label}</div>
            </div>
        `).join('');
    }

    /* ============================================================
       MODALS
       ============================================================ */
    function openEditModal(type, id) {
        editing = { type, id };
        const item = type === 'task' ? tasks.find(t => t.id === id) : habits.find(h => h.id === id);
        if (!item) return;
        modalInput.style.display = 'block';
        modalTitle.textContent = type === 'task' ? 'Задача' : 'Привычка';
        modalInput.value = item.text;

        if (type === 'task') {
            const dl = item.deadline ? new Date(item.deadline).toISOString().slice(0, 10) : '';
            modalExtra.innerHTML = `
                <div class="grid-2">
                    <label class="field"><span>Дедлайн</span>
                        <input type="date" id="tmDeadline" class="input" value="${dl}">
                    </label>
                    <label class="field"><span>Повтор</span>
                        <select id="tmRepeat" class="input">
                            <option value="none" ${item.repeat === 'none' ? 'selected' : ''}>Без повтора</option>
                            <option value="daily" ${item.repeat === 'daily' ? 'selected' : ''}>Каждый день</option>
                            <option value="weekly" ${item.repeat === 'weekly' ? 'selected' : ''}>Каждую неделю</option>
                            <option value="monthly" ${item.repeat === 'monthly' ? 'selected' : ''}>Каждый месяц</option>
                        </select>
                    </label>
                </div>
            `;
        } else {
            modalExtra.innerHTML = `<label class="field"><span>Цель (дней)</span><input type="number" id="hmTarget" class="input" min="1" max="365" value="${item.target}"></label>`;
        }
        modalOverlay.hidden = false;
        setTimeout(() => modalInput.focus(), 50);
    }

    function openOrderModal(id = null) {
        editingOrder = id;
        const order = id ? orders.find(o => o.id === id) : null;
        modalTitle.textContent = id ? 'Редактировать' : 'Новая неделя';
        modalInput.style.display = 'none';

        modalExtra.innerHTML = `
            <label class="field"><span>Неделя</span>
                <input type="text" id="omWeek" class="input" value="${order ? escapeHtml(order.week || '') : 'Неделя ' + (orders.length + 1)}">
            </label>
            <div class="grid-2">
                <label class="field"><span>Отклики</span><input type="number" id="omResponses" class="input" min="0" value="${order ? order.responses || 0 : 0}"></label>
                <label class="field"><span>Ответы</span><input type="number" id="omReplies" class="input" min="0" value="${order ? order.replies || 0 : 0}"></label>
                <label class="field"><span>Сделки</span><input type="number" id="omDeals" class="input" min="0" value="${order ? order.deals || 0 : 0}"></label>
                <label class="field"><span>Доход, ₽</span><input type="number" id="omIncome" class="input" min="0" value="${order ? order.income || 0 : 0}"></label>
                <label class="field"><span>На поддержке</span><input type="number" id="omSupport" class="input" min="0" value="${order ? order.support || 0 : 0}"></label>
            </div>
            <label class="field"><span>Заметки</span>
                <textarea id="omNotes" class="input" rows="2">${order ? escapeHtml(order.notes || '') : ''}</textarea>
            </label>
        `;
        modalOverlay.hidden = false;
        setTimeout(() => $('omWeek').focus(), 50);
    }

    function saveOrderModal() {
        const week = $('omWeek').value.trim();
        if (!week) { showToast('Введите название', 'fa-triangle-exclamation'); return; }
        const data = {
            week,
            responses: Number($('omResponses').value) || 0,
            replies: Number($('omReplies').value) || 0,
            deals: Number($('omDeals').value) || 0,
            income: Number($('omIncome').value) || 0,
            support: Number($('omSupport').value) || 0,
            notes: $('omNotes').value.trim()
        };
        if (editingOrder) {
            const o = orders.find(x => x.id === editingOrder);
            if (o) Object.assign(o, data);
            showToast('Обновлено');
        } else {
            orders.push({ id: generateId(), ...data });
            showToast('Добавлено');
        }
        saveOrders();
        renderOrders();
        editingOrder = null;
        closeModal();
    }

    function deleteOrder(id) {
        if (!confirm('Удалить?')) return;
        orders = orders.filter(o => o.id !== id);
        saveOrders();
        renderOrders();
        showToast('Удалено', 'fa-trash');
    }

    function exportOrdersCsv() {
        if (!orders.length) { showToast('Нет данных', 'fa-triangle-exclamation'); return; }
        const headers = ['Неделя', 'Отклики', 'Ответы', 'Сделки', 'Доход', 'Средний чек', 'Поддержка', 'Заметки'];
        const rows = orders.map(o => [o.week, o.responses, o.replies, o.deals, o.income, calcAvg(o.income, o.deals), o.support, (o.notes || '').replace(/"/g, '""')]);
        const totalIncome = orders.reduce((s, o) => s + (o.income || 0), 0);
        const totalDeals = orders.reduce((s, o) => s + (o.deals || 0), 0);
        rows.push(['ИТОГО', '', '', totalDeals, totalIncome, totalDeals ? Math.round(totalIncome / totalDeals) : 0, '', '']);
        const BOM = '\uFEFF';
        const csv = BOM + [headers, ...rows].map(r => r.map(c => {
            const s = String(c);
            return /[",;\n]/.test(s) ? `"${s}"` : s;
        }).join(';')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `taskflow-orders-${todayStr()}.csv`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('CSV экспортирован');
    }

    function closeModal() {
        modalOverlay.hidden = true;
        editing = null; editingOrder = null; editingWord = null; editingGoal = null; editingJournal = null; editingDiary = null;
        modalInput.style.display = 'block';
        modalOverlay.dataset.parentId = '';
    }

    function saveModal() {
        if ($('omWeek')) { saveOrderModal(); return; }
        if ($('wmWord')) { saveWordModal(); return; }
        if ($('gmTitle')) { saveGoalModal(); return; }
        if ($('jmText')) { saveJournalModal(); return; }
        if ($('dmText')) { saveDiaryModal(); return; }

        if (!editing) return;
        const { type, id } = editing;
        const text = modalInput.value.trim();
        if (!text) { showToast('Пустое название', 'fa-triangle-exclamation'); return; }

        if (type === 'task') {
            const task = tasks.find(t => t.id === id);
            if (task) {
                task.text = text;
                const dl = $('tmDeadline'); const rp = $('tmRepeat');
                task.deadline = dl && dl.value ? new Date(dl.value).getTime() : null;
                if (rp) task.repeat = rp.value;
            }
            saveTasks(); renderTasks(); renderStats();
        } else {
            const h = habits.find(x => x.id === id);
            if (h) {
                h.text = text;
                const t = $('hmTarget');
                if (t) h.target = Math.max(1, Math.min(365, parseInt(t.value) || 7));
            }
            saveHabits(); renderHabits(); renderStats();
        }
        showToast('Сохранено');
        closeModal();
    }

    /* ============================================================
       EXPORT / IMPORT
       ============================================================ */
    function exportAll() {
        const data = {
            version: 13,
            exportedAt: new Date().toISOString(),
            tasks, habits, orders, goals, journal, dict, diary,
            primaryGoalId
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `taskflow-backup-${todayStr()}.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Экспортировано');
    }

    function importAll(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!data || typeof data !== 'object') throw new Error('Неверный формат');
                if (!confirm('Импортировать данные? Текущие будут заменены.')) return;

                if (Array.isArray(data.tasks))   tasks = data.tasks;
                if (Array.isArray(data.habits))  habits = data.habits;
                if (Array.isArray(data.orders))  orders = data.orders;
                if (Array.isArray(data.goals))   goals = data.goals;
                if (Array.isArray(data.journal)) journal = data.journal;
                if (Array.isArray(data.dict))    dict = data.dict;
                if (Array.isArray(data.diary))   diary = data.diary;
                if (data.primaryGoalId) { primaryGoalId = data.primaryGoalId; savePrimaryGoal(); }

                viewRange = null;
                saveTasks(); saveHabits(); saveOrders(); saveGoals(); saveJournal(); saveDict(); saveDiary();
                renderAll();
                showToast('Импортировано');
            } catch (err) {
                console.error(err);
                showToast('Ошибка импорта', 'fa-triangle-exclamation');
            }
        };
        reader.readAsText(file);
    }

    /* ============================================================
       EVENT DELEGATION
       ============================================================ */
    taskListEl.addEventListener('click', (e) => {
        const t = e.target.closest('[data-action]');
        if (!t) return;
        e.stopPropagation();
        const { action, id } = t.dataset;
        if (action === 'toggle-task') toggleTask(id);
        else if (action === 'delete-task') deleteTask(id);
        else if (action === 'edit-task') openEditModal('task', id);
    });

    habitListEl.addEventListener('click', (e) => {
        const t = e.target.closest('[data-action]');
        if (!t) return;
        e.stopPropagation();
        const { action, id } = t.dataset;
        if (action === 'increment-habit') incrementHabit(id);
        else if (action === 'delete-habit') deleteHabit(id);
        else if (action === 'edit-habit') openEditModal('habit', id);
    });

    [ordersBodyEl, ordersCardsEl].forEach(el => {
        el.addEventListener('click', (e) => {
            const t = e.target.closest('[data-action]');
            if (!t) return;
            const { action, id } = t.dataset;
            if (action === 'edit-order') openOrderModal(id);
            else if (action === 'delete-order') deleteOrder(id);
        });
    });

    treeListEl.addEventListener('click', (e) => {
        const t = e.target.closest('[data-action]');
        if (!t) return;
        const { action, id } = t.dataset;
        if (action === 'edit-goal') openGoalModal(null, id);
        else if (action === 'add-subgoal') openGoalModal(id, null);
        else if (action === 'delete-goal') deleteGoal(id);
        else if (action === 'cycle-status') cycleGoalStatus(id);
        else if (action === 'toggle-goal-note') toggleGoalNote(id);
        else if (action === 'toggle-collapse') toggleCollapse(id);
        else if (action === 'make-primary') makePrimary(id);
    });

    journalListEl.addEventListener('click', (e) => {
        const t = e.target.closest('[data-action]');
        if (!t) return;
        const { action, id } = t.dataset;
        if (action === 'edit-journal') openJournalModal(id);
        else if (action === 'delete-journal') deleteJournal(id);
    });

    journalQuickAdd.addEventListener('click', () => {
        const text = journalQuickInput.value.trim();
        const mood = journalMoodSelect.value;
        const goalId = journalGoalSelect.value || primaryGoalId || null;
        if (!text) { showToast('Напиши что-нибудь', 'fa-triangle-exclamation'); return; }
        addJournalQuick(goalId, text, mood, 0);
        journalQuickInput.value = '';
    });

    journalQuickInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') journalQuickAdd.click();
    });

    dictListEl.addEventListener('click', (e) => {
        const t = e.target.closest('[data-action]');
        if (!t) return;
        e.stopPropagation();
        const { action, id } = t.dataset;
        if (action === 'toggle-favorite') toggleFavorite(id);
        else if (action === 'edit-word') openWordModal(id);
        else if (action === 'delete-word') deleteWord(id);
        else if (action === 'toggle-meaning') toggleMeaningExpand(id);
    });

    dictCategoriesEl.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-cat]');
        if (!btn) return;
        dictCategory = btn.dataset.cat;
        renderDict();
    });

    wodToggleEl.addEventListener('click', () => {
        const expanded = wodMeaningEl.classList.toggle('expanded');
        const w = dict.find(x => x.id === wod.wordId);
        if (!w) return;
        if (expanded) {
            wodMeaningEl.textContent = w.meaning;
            wodToggleEl.classList.add('expanded');
            wodToggleEl.querySelector('span').textContent = 'Свернуть';
        } else {
            wodMeaningEl.textContent = truncateText(w.meaning, 140);
            wodToggleEl.classList.remove('expanded');
            wodToggleEl.querySelector('span').textContent = 'Развернуть';
        }
    });

    // Diary events
    const diaryQuickInput = $('diaryQuickInput');
    const diaryQuickAdd = $('diaryQuickAdd');

    if (diaryQuickAdd) {
        diaryQuickAdd.addEventListener('click', () => {
            const text = diaryQuickInput.value.trim();
            if (!text) { showToast('Напиши что-нибудь', 'fa-triangle-exclamation'); return; }
            diaryAddEntry(text);
            diaryQuickInput.value = '';
        });
    }

    if (diaryQuickInput) {
        diaryQuickInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                diaryQuickAdd.click();
            }
        });
    }

    if (diaryListEl) {
        diaryListEl.addEventListener('click', (e) => {
            const t = e.target.closest('[data-action]');
            if (!t) return;
            const { action, id } = t.dataset;
            if (action === 'edit-diary') openDiaryEdit(id);
            else if (action === 'delete-diary') diaryDeleteEntry(id);
        });
    }

    if (diarySearchEl) {
        diarySearchEl.addEventListener('input', (e) => {
            diarySearchQuery = e.target.value.trim();
            diaryRenderList();
        });
    }

    /* ========== TASK/HABIT ACTIONS ========== */
    function addTask() {
        const text = taskInput.value.trim();
        if (!text) return;
        tasks.push({
            id: generateId(),
            text,
            completed: false,
            createdAt: Date.now(),
            completedAt: null,
            deadline: taskDate.value ? new Date(taskDate.value).getTime() : null,
            repeat: taskRepeat.value,
            lastReset: Date.now()
        });
        taskInput.value = '';
        taskDate.value = '';
        taskRepeat.value = 'none';
        saveTasks(); renderTasks(); renderStats();
        taskInput.focus();
        showToast('Задача добавлена');
    }

    function toggleTask(id) {
        const t = tasks.find(x => x.id === id);
        if (!t) return;
        t.completed = !t.completed;
        t.completedAt = t.completed ? Date.now() : null;
        if (t.completed && t.repeat !== 'none') t.lastReset = Date.now();
        saveTasks(); renderTasks(); renderStats();
    }

    function deleteTask(id) {
        tasks = tasks.filter(t => t.id !== id);
        saveTasks(); renderTasks(); renderStats();
        showToast('Удалено', 'fa-trash');
    }

    function addHabit() {
        const text = habitInput.value.trim();
        if (!text) return;
        const target = Math.max(1, Math.min(365, parseInt(habitTarget.value) || 7));
        habits.push({ id: generateId(), text, streak: 0, target, lastCompleted: null, createdAt: Date.now() });
        habitInput.value = '';
        habitTarget.value = 7;
        saveHabits(); renderHabits(); renderStats();
        habitInput.focus();
        showToast('Привычка добавлена');
    }

    function incrementHabit(id) {
        const h = habits.find(x => x.id === id);
        if (!h) return;
        if (isCompletedToday(h.lastCompleted)) {
            h.streak = Math.max(0, h.streak - 1);
            h.lastCompleted = null;
        } else {
            h.streak += 1;
            h.lastCompleted = Date.now();
        }
        saveHabits(); renderHabits(); renderStats();
    }

    function deleteHabit(id) {
        habits = habits.filter(h => h.id !== id);
        saveHabits(); renderHabits(); renderStats();
        showToast('Удалено', 'fa-trash');
    }

    /* ========== NAV ========== */
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const panel = $('panel-' + tab.dataset.tab);
            if (panel) panel.classList.add('active');

            if (tab.dataset.tab === 'strategy') { renderChart(); renderTree(); renderJournal(); }
            if (tab.dataset.tab === 'stats') renderStats();
            if (tab.dataset.tab === 'orders') renderOrders();
            if (tab.dataset.tab === 'dictionary') { renderDict(); updateWordOfDay(); }
            if (tab.dataset.tab === 'diary') diaryRenderAll();
        });
    });

    document.querySelectorAll('#taskFilterChips .chip[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#taskFilterChips .chip[data-filter]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTasks();
        });
    });

    document.querySelectorAll('#panel-dictionary .chip[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#panel-dictionary .chip[data-filter]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            dictFilter = btn.dataset.filter;
            renderDict();
        });
    });

    /* ========== EVENT WIRES ========== */
    addTaskBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addTask(); });
    addHabitBtn.addEventListener('click', addHabit);
    habitInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addHabit(); });

    addOrderBtn.addEventListener('click', () => openOrderModal(null));
    exportCsvBtn.addEventListener('click', exportOrdersCsv);

    addMainGoalBtn.addEventListener('click', () => openGoalModal(null, null));
    expandAllBtn.addEventListener('click', () => { collapsedGoals.clear(); renderTree(); });
    collapseAllBtn.addEventListener('click', () => {
        goals.forEach(g => { if (getChildren(g.id).length) collapsedGoals.add(g.id); });
        renderTree();
    });
    newJournalBtn.addEventListener('click', () => openJournalModal(null));

    strategyCalcBtn.addEventListener('click', () => calcModalOverlay.hidden = false);
    calcModalClose.addEventListener('click', () => calcModalOverlay.hidden = true);
    calcModalOverlay.addEventListener('click', (e) => { if (e.target === calcModalOverlay) calcModalOverlay.hidden = true; });

    document.querySelectorAll('.calc-tabs .chip').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.calc-tabs .chip').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.calc-pane').forEach(p => p.classList.remove('active'));
            $('calc-' + tab.dataset.calc).classList.add('active');
        });
    });
    $('calcMoneyBtn').addEventListener('click', calcMoney);
    $('calcBookBtn').addEventListener('click', calcBook);

    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            chartPeriod = btn.dataset.period;
            viewRange = null;
            renderChart();
        });
    });

    addWordBtn.addEventListener('click', () => openWordModal(null));
    exportDictCsvBtn.addEventListener('click', exportDictCsv);
    dictSearchEl.addEventListener('input', (e) => { dictSearchQuery = e.target.value.trim(); renderDict(); });

    studyStartBtn.addEventListener('click', startStudy);
    studyExitBtn.addEventListener('click', exitStudy);
    showMeaningBtn.addEventListener('click', revealMeaning);
    knowBtn.addEventListener('click', markKnow);
    reviewBtn.addEventListener('click', markReview);
    studyRestartBtn.addEventListener('click', startStudy);

    resetTasksBtn.addEventListener('click', () => {
        if (!confirm('Удалить все задачи?')) return;
        tasks = [];
        saveTasks(); renderTasks(); renderStats();
        showToast('Задачи сброшены');
    });
    resetHabitsBtn.addEventListener('click', () => {
        if (!confirm('Удалить все привычки?')) return;
        habits = [];
        saveHabits(); renderHabits(); renderStats();
        showToast('Привычки сброшены');
    });

    exportBtn.addEventListener('click', exportAll);
    importBtn.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', (e) => {
        const f = e.target.files[0];
        if (f) importAll(f);
        e.target.value = '';
    });

    notifyBadge.addEventListener('click', requestNotificationPermission);

    modalCancel.addEventListener('click', closeModal);
    modalCloseBtn.addEventListener('click', closeModal);
    modalSave.addEventListener('click', saveModal);
    modalInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') saveModal(); });
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (!modalOverlay.hidden) closeModal();
            if (!calcModalOverlay.hidden) calcModalOverlay.hidden = true;
        }
    });

    window.addEventListener('storage', (e) => {
        if (e.key === TASKS_KEY)  { loadAll(); renderTasks(); renderStats(); }
        if (e.key === HABITS_KEY) { loadAll(); renderHabits(); renderStats(); }
        if (e.key === ORDERS_KEY) { loadAll(); renderOrders(); }
        if (e.key === GOALS_KEY)  { loadAll(); renderTree(); renderGoalSelectors(); renderChart(); renderStats(); }
        if (e.key === JOURNAL_KEY){ loadAll(); renderJournal(); renderChart(); }
        if (e.key === DICT_KEY)   { loadAll(); renderDict(); updateWordOfDay(); renderStats(); }
        if (e.key === DIARY_KEY)  { loadAll(); diaryRenderAll(); }
        if (e.key === DAILY_REMINDER_KEY) { loadAll(); }
    });

    /* ========== PWA ========== */
    const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.hostname === '';

    if ('serviceWorker' in navigator && !isLocalhost) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js').then((reg) => {
                console.log('SW:', reg.scope);
                setInterval(() => reg.update(), 5 * 60 * 1000);
                reg.addEventListener('updatefound', () => {
                    const nw = reg.installing;
                    if (!nw) return;
                    nw.addEventListener('statechange', () => {
                        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
                            showToast('Обновление готово', 'fa-rotate');
                            setTimeout(() => { nw.postMessage('SKIP_WAITING'); location.reload(); }, 1400);
                        }
                    });
                });
            }).catch((e) => console.warn('SW fail', e));

            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (refreshing) return;
                refreshing = true;
                location.reload();
            });
        });
    } else if (isLocalhost && 'serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
    }

    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installBadge.hidden = false;
    });
    installBadge.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') showToast('Установлено');
        deferredPrompt = null;
        installBadge.hidden = true;
    });
    window.addEventListener('appinstalled', () => { installBadge.hidden = true; });
    if (window.matchMedia('(display-mode: standalone)').matches) installBadge.hidden = true;

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            processRepeats();
            checkDeadlines();
            checkDailyReminder();
            renderChart();
        }
    });

    /* ========== RENDER ALL + INIT ========== */
    function renderAll() {
        renderTasks();
        renderHabits();
        renderOrders();
        renderTree();
        renderGoalSelectors();
        renderMoodSelect();
        renderJournal();
        renderDict();
        updateWordOfDay();
        renderChart();
        renderStats();
        diaryRenderAll();
    }

    function init() {
        initTheme();
        loadAll();
        processRepeats();
        renderAll();

        taskDate.min = todayStr();
        updateNotifyBadge();
        checkDeadlines();
        startDailyReminder();

        console.log('%c⚡ TaskFlow · Office Edition v13', 'font-size:15px;font-weight:bold;color:#2457d6;');
        console.log('%c+ ежедневное напоминание в 13:00', 'color:#64748b;');
    }

    setInterval(processRepeats, 300000);

    init();
})();
