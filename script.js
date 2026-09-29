(function () {
    'use strict';

    /* ========== КОНСТАНТЫ ========== */
    const TASKS_KEY = 'taskflow_tasks_v1';
    const HABITS_KEY = 'taskflow_habits_v1';
    const ORDERS_KEY = 'taskflow_orders_v1';
    const GOALS_KEY = 'taskflow_goals_v2';
    const JOURNAL_KEY = 'taskflow_journal_v1';
    const DICT_KEY = 'taskflow_dictionary_v1';
    const WOD_KEY = 'taskflow_wordoftheday_v1';
    const STUDY_KEY = 'taskflow_studystats_v1';
    const NOTIF_KEY = 'taskflow_notifications_enabled';
    const NOTIFIED_KEY = 'taskflow_notified_ids';
    const DAY_MS = 86400000;
    const WEEK_DAYS = 7;
    const CHECK_INTERVAL = 60000;

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

    /* ========== СОСТОЯНИЕ ========== */
    let tasks = [];
    let habits = [];
    let orders = [];
    let goals = [];
    let journal = [];
    let dict = [];
    let wod = { date: null, wordId: null };
    let studyStats = { streak: 0, lastStudy: null };
    let currentFilter = 'all';
    let dictFilter = 'all';
    let dictCategory = 'all';
    let dictSearchQuery = '';
    let strategyMode = 'tree';
    let editing = null;
    let editingOrder = null;
    let editingWord = null;
    let editingGoal = null;
    let editingJournal = null;
    let notifiedIds = new Set();
    let checkTimer = null;
    const collapsedGoals = new Set();

    let study = {
        active: false,
        queue: [],
        index: 0,
        knowCount: 0,
        reviewCount: 0,
        originalTotal: 0
    };

    /* ========== DOM ========== */
    const $ = (id) => document.getElementById(id);

    const taskInput = $('taskInput');
    const taskDate = $('taskDate');
    const taskRepeat = $('taskRepeat');
    const addTaskBtn = $('addTaskBtn');
    const taskListEl = $('taskList');
    const taskCountEl = $('taskCount');

    const habitInput = $('habitInput');
    const habitTarget = $('habitTarget');
    const addHabitBtn = $('addHabitBtn');
    const habitListEl = $('habitList');
    const habitCountEl = $('habitCount');

    const ordersBodyEl = $('ordersBody');
    const ordersFootEl = $('ordersFoot');
    const ordersCardsEl = $('ordersCards');
    const ordersCountEl = $('ordersCount');
    const addOrderBtn = $('addOrderBtn');
    const exportCsvBtn = $('exportCsvBtn');

    const treeListEl = $('treeList');
    const journalListEl = $('journalList');
    const journalQuickInput = $('journalQuickInput');
    const journalQuickAdd = $('journalQuickAdd');
    const journalGoalSelect = $('journalGoalSelect');
    const journalMoodSelect = $('journalMoodSelect');
    const addMainGoalBtn = $('addMainGoalBtn');
    const strategyCalcBtn = $('strategyCalcBtn');
    const chartGoalSelect = $('chartGoalSelect');
    const progressChartEl = $('progressChart');
    const chartLegendEl = $('chartLegend');

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

    const resetTasksBtn = $('resetTasksBtn');
    const resetHabitsBtn = $('resetHabitsBtn');
    const exportBtn = $('exportBtn');
    const importBtn = $('importBtn');
    const importInput = $('importInput');
    const installBadge = $('installBadge');
    const notifyBadge = $('notifyBadge');

    const modalOverlay = $('modalOverlay');
    const modalTitle = $('modalTitle');
    const modalInput = $('modalInput');
    const modalExtra = $('modalExtra');
    const modalCancel = $('modalCancel');
    const modalSave = $('modalSave');
    const toast = $('toast');

    const calcModalOverlay = $('calcModalOverlay');
    const calcModalClose = $('calcModalClose');

    /* ========== УТИЛИТЫ ========== */

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

    function formatDeadline(deadline) {
        if (!deadline) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const d = new Date(deadline);
        d.setHours(0, 0, 0, 0);
        const diff = d - today;
        const days = Math.round(diff / DAY_MS);

        let text, className = '';
        if (days < 0) { text = `Просрочено · ${Math.abs(days)} дн.`; className = 'overdue'; }
        else if (days === 0) { text = 'Сегодня'; className = 'today'; }
        else if (days === 1) { text = 'Завтра'; }
        else if (days < 7) { text = `Через ${days} дн.`; }
        else { text = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }); }

        return { text, className };
    }

    function daysUntil(deadline) {
        if (!deadline) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const d = new Date(deadline);
        d.setHours(0, 0, 0, 0);
        return Math.round((d - today) / DAY_MS);
    }

    function isOverdue(task) {
        if (!task.deadline || task.completed) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return new Date(task.deadline).setHours(0, 0, 0, 0) < today;
    }

    function showToast(message, icon = 'fa-check-circle') {
        toast.innerHTML = `<i class="fas ${icon}"></i> ${escapeHtml(message)}`;
        toast.classList.add('show');
        clearTimeout(showToast._t);
        showToast._t = setTimeout(() => toast.classList.remove('show'), 2500);
    }

    function pluralize(n, one, few, many) {
        const mod10 = n % 10;
        const mod100 = n % 100;
        if (mod10 === 1 && mod100 !== 11) return one;
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
        return many;
    }

    function formatMoney(n) {
        if (!n) return '0';
        return new Intl.NumberFormat('ru-RU').format(n);
    }

    function formatNumber(n) {
        return new Intl.NumberFormat('ru-RU').format(Math.round(n));
    }

    function pluralizeTime(days) {
        if (days < 1) return 'меньше дня';
        if (days < 30) return `${days} ${pluralize(days, 'день', 'дня', 'дней')}`;
        if (days < 365) {
            const months = Math.round(days / 30);
            return `≈ ${months} ${pluralize(months, 'месяц', 'месяца', 'месяцев')}`;
        }
        const years = (days / 365).toFixed(1);
        return `≈ ${years} ${pluralize(Math.round(years), 'год', 'года', 'лет')}`;
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
        return text.slice(0, maxLen).trim() + '...';
    }

    /* ========== LOCALSTORAGE ========== */

    function loadFromStorage() {
        try {
            const sT = localStorage.getItem(TASKS_KEY);
            if (sT) {
                const p = JSON.parse(sT);
                tasks = Array.isArray(p) ? p : [];
            } else {
                tasks = [
                    { id: generateId(), text: 'Изучить новый фреймворк', completed: false, createdAt: Date.now(), completedAt: null, deadline: null, repeat: 'none', lastReset: null },
                    { id: generateId(), text: 'Провести встречу с командой', completed: true, createdAt: Date.now() - DAY_MS, completedAt: Date.now() - DAY_MS / 2, deadline: null, repeat: 'none', lastReset: null },
                    { id: generateId(), text: 'Записать видео для клиента', completed: false, createdAt: Date.now() - 2 * DAY_MS, completedAt: null, deadline: Date.now() + 2 * DAY_MS, repeat: 'none', lastReset: null },
                ];
            }

            const sH = localStorage.getItem(HABITS_KEY);
            if (sH) {
                const p = JSON.parse(sH);
                habits = Array.isArray(p) ? p : [];
            } else {
                habits = [
                    { id: generateId(), text: 'Медитация 10 минут', streak: 3, target: 7, lastCompleted: null, createdAt: Date.now() },
                    { id: generateId(), text: 'Чтение 20 страниц', streak: 5, target: 10, lastCompleted: null, createdAt: Date.now() - DAY_MS },
                    { id: generateId(), text: 'Пить воду 2 литра', streak: 1, target: 7, lastCompleted: null, createdAt: Date.now() - 3 * DAY_MS },
                ];
            }

            const sO = localStorage.getItem(ORDERS_KEY);
            if (sO) {
                const p = JSON.parse(sO);
                orders = Array.isArray(p) ? p : [];
            } else {
                orders = [
                    { id: generateId(), week: 'Неделя 1', responses: 20, replies: 5, deals: 1, income: 15000, support: 1, notes: 'Первая сделка' },
                    { id: generateId(), week: 'Неделя 2', responses: 25, replies: 8, deals: 2, income: 34000, support: 2, notes: 'Два лендинга' },
                    { id: generateId(), week: 'Неделя 3', responses: 30, replies: 12, deals: 3, income: 52000, support: 3, notes: 'Повторные обращения' },
                ];
            }

            const sG = localStorage.getItem(GOALS_KEY);
            if (sG) {
                const p = JSON.parse(sG);
                goals = Array.isArray(p) ? p : [];
            } else {
                const mainId = generateId();
                const sub1 = generateId();
                const sub2 = generateId();
                goals = [
                    {
                        id: mainId,
                        title: 'Выйти на 211 000 рублей в месяц',
                        note: '61 000 руб на жизнь и 100 000 руб на вклад, накопить 2 000 000 рублей на машину.',
                        deadline: Date.now() + 30 * DAY_MS,
                        amount: 211000,
                        amountCurrent: 0,
                        status: 'active',
                        parentId: null,
                        createdAt: Date.now(),
                        order: 0
                    },
                    {
                        id: sub1,
                        title: '61 000 рублей в месяц',
                        note: 'Это может быть любая работа с зп 61 000 руб.',
                        deadline: Date.now() + 30 * DAY_MS,
                        amount: 61000,
                        amountCurrent: 0,
                        status: 'active',
                        parentId: mainId,
                        createdAt: Date.now(),
                        order: 0
                    },
                    {
                        id: sub2,
                        title: '100 000 рублей в месяц на вклад',
                        note: 'Откладывать и не трогать. Цель — накопить на машину.',
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

            const sJ = localStorage.getItem(JOURNAL_KEY);
            if (sJ) {
                const p = JSON.parse(sJ);
                journal = Array.isArray(p) ? p : [];
            } else {
                journal = [];
            }

            const sD = localStorage.getItem(DICT_KEY);
            if (sD) {
                const p = JSON.parse(sD);
                dict = Array.isArray(p) ? p : [];
            } else {
                dict = [
                    {
                        id: generateId(), word: 'Рефлексия',
                        meaning: 'Способность человека осмыслять свои мысли, эмоции, действия и результаты, чтобы лучше понимать себя и корректировать поведение.',
                        example: 'После рефлексии я понял, что зря потратил неделю на бесполезные задачи.',
                        category: 'psychology', favorite: true, know: false, review: false, createdAt: Date.now()
                    },
                    {
                        id: generateId(), word: 'Синергия',
                        meaning: 'Эффект, при котором результат взаимодействия нескольких элементов больше, чем простая сумма их отдельных результатов. 1 + 1 = 3.',
                        example: 'Командная работа дала синергию.',
                        category: 'business', favorite: false, know: false, review: false, createdAt: Date.now() - DAY_MS
                    }
                ];
            }

            const sW = localStorage.getItem(WOD_KEY);
            if (sW) { try { wod = JSON.parse(sW); } catch (e) { wod = { date: null, wordId: null }; } }

            const sS = localStorage.getItem(STUDY_KEY);
            if (sS) { try { studyStats = JSON.parse(sS); } catch (e) { studyStats = { streak: 0, lastStudy: null }; } }

            const sN = localStorage.getItem(NOTIFIED_KEY);
            if (sN) notifiedIds = new Set(JSON.parse(sN));
        } catch (e) {
            console.error('Ошибка загрузки:', e);
            tasks = []; habits = []; orders = []; goals = []; journal = []; dict = [];
        }
    }

    function saveTasks() {
        try { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)); }
        catch (e) { console.error(e); showToast('Хранилище заполнено', 'fa-exclamation-triangle'); }
    }
    function saveHabits() {
        try { localStorage.setItem(HABITS_KEY, JSON.stringify(habits)); }
        catch (e) { console.error(e); showToast('Хранилище заполнено', 'fa-exclamation-triangle'); }
    }
    function saveOrders() {
        try { localStorage.setItem(ORDERS_KEY, JSON.stringify(orders)); }
        catch (e) { console.error(e); showToast('Хранилище заполнено', 'fa-exclamation-triangle'); }
    }
    function saveGoals() {
        try { localStorage.setItem(GOALS_KEY, JSON.stringify(goals)); }
        catch (e) { console.error(e); showToast('Хранилище заполнено', 'fa-exclamation-triangle'); }
    }
    function saveJournal() {
        try { localStorage.setItem(JOURNAL_KEY, JSON.stringify(journal)); }
        catch (e) { console.error(e); showToast('Хранилище заполнено', 'fa-exclamation-triangle'); }
    }
    function saveDict() {
        try { localStorage.setItem(DICT_KEY, JSON.stringify(dict)); }
        catch (e) { console.error(e); showToast('Хранилище заполнено', 'fa-exclamation-triangle'); }
    }
    function saveWod() {
        try { localStorage.setItem(WOD_KEY, JSON.stringify(wod)); } catch (e) {}
    }
    function saveStudyStats() {
        try { localStorage.setItem(STUDY_KEY, JSON.stringify(studyStats)); } catch (e) {}
    }
    function saveNotified() {
        try { localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...notifiedIds])); } catch (e) {}
    }

    /* ========== ПОВТОРЯЮЩИЕСЯ ЗАДАЧИ ========== */

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

        if (changed) {
            saveTasks();
            renderTasks();
        }
    }

    function getRepeatLabel(repeat) {
        const map = { daily: 'Ежедневно', weekly: 'Еженедельно', monthly: 'Ежемесячно' };
        return map[repeat] || '';
    }

    /* ========== УВЕДОМЛЕНИЯ ========== */

    function isNotificationSupported() { return 'Notification' in window; }
    function getNotificationPermission() {
        if (!isNotificationSupported()) return 'unsupported';
        return Notification.permission;
    }

    async function requestNotificationPermission() {
        if (!isNotificationSupported()) {
            showToast('Уведомления не поддерживаются', 'fa-exclamation-triangle');
            return false;
        }
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                localStorage.setItem(NOTIF_KEY, 'true');
                updateNotifyBadge();
                showToast('Уведомления включены');
                try {
                    new Notification('TaskFlow', {
                        body: 'Уведомления активированы!',
                        icon: 'icons/web-app-manifest-192x192.png'
                    });
                } catch (e) {}
                checkDeadlines();
                startDeadlineChecker();
                return true;
            } else {
                showToast('Разрешение не получено', 'fa-bell-slash');
                return false;
            }
        } catch (e) {
            console.error('Notification error:', e);
            return false;
        }
    }

    function updateNotifyBadge() {
        if (!isNotificationSupported()) { notifyBadge.hidden = true; return; }
        notifyBadge.hidden = (getNotificationPermission() === 'granted');
    }

    function sendNotification(title, options = {}) {
        if (!isNotificationSupported()) return;
        if (Notification.permission !== 'granted') return;
        try {
            const notif = new Notification(title, {
                icon: 'icons/web-app-manifest-192x192.png',
                ...options
            });
            notif.onclick = () => { window.focus(); notif.close(); };
        } catch (e) {}
    }

    function checkDeadlines() {
        if (!isNotificationSupported()) return;
        if (Notification.permission !== 'granted') return;

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = todayStart.getTime() + DAY_MS;

        tasks.forEach(task => {
            if (task.completed || !task.deadline) return;

            const dl = new Date(task.deadline).getTime();
            const notifKey = `${task.id}-${new Date(dl).toDateString()}`;
            const isToday = dl >= todayStart.getTime() && dl < todayEnd;
            const isOverdue = dl < todayStart.getTime();

            if ((isToday || isOverdue) && !notifiedIds.has(notifKey)) {
                const timeStr = new Date(dl).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
                const title = isOverdue ? '⚠️ Задача просрочена' : '📌 Напоминание';
                const body = isOverdue
                    ? `"${task.text}" — дедлайн был ${timeStr}`
                    : `"${task.text}" — дедлайн сегодня`;
                sendNotification(title, { body, tag: task.id, requireInteraction: true });
                notifiedIds.add(notifKey);
            }

            const tomorrow = todayStart.getTime() + DAY_MS;
            const isTomorrow = dl >= tomorrow && dl < tomorrow + DAY_MS;
            const notifKeyTomorrow = `${task.id}-tomorrow-${new Date(dl).toDateString()}`;

            if (isTomorrow && !notifiedIds.has(notifKeyTomorrow)) {
                sendNotification('⏰ Напоминание', {
                    body: `Завтра дедлайн: "${task.text}"`,
                    tag: task.id + '-tomorrow'
                });
                notifiedIds.add(notifKeyTomorrow);
            }
        });

        saveNotified();
    }

    function startDeadlineChecker() {
        if (checkTimer) clearInterval(checkTimer);
        if (!isNotificationSupported()) return;
        if (Notification.permission !== 'granted') return;
        checkTimer = setInterval(checkDeadlines, CHECK_INTERVAL);
    }

    /* ========== РЕНДЕР ЗАДАЧ ========== */

    function getFilteredTasks() {
        let list = [...tasks];
        if (currentFilter === 'active') list = list.filter(t => !t.completed);
        else if (currentFilter === 'completed') list = list.filter(t => t.completed);
        else if (currentFilter === 'overdue') list = list.filter(t => isOverdue(t));

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
        taskCountEl.textContent = tasks.length;
        const filtered = getFilteredTasks();

        if (filtered.length === 0) {
            taskListEl.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <span>${currentFilter === 'all' ? 'Нет задач. Добавьте первую!' : 'Ничего не найдено'}</span>
                </div>
            `;
            return;
        }

        taskListEl.innerHTML = filtered.map(task => {
            const dl = formatDeadline(task.deadline);
            const overdue = isOverdue(task);
            const repeatLabel = getRepeatLabel(task.repeat);

            return `
                <div class="item-card ${overdue ? 'overdue' : ''}" data-id="${task.id}">
                    <div class="item-check ${task.completed ? 'completed' : ''}"
                         data-action="toggle-task" data-id="${task.id}"
                         role="checkbox" aria-checked="${task.completed}" tabindex="0">
                        <i class="fas fa-check"></i>
                    </div>
                    <div class="item-content">
                        <div class="item-text ${task.completed ? 'completed-text' : ''}"
                             data-action="edit-task" data-id="${task.id}"
                             title="Двойной клик — редактировать">
                            ${escapeHtml(task.text)}
                        </div>
                        <div class="item-meta">
                            <span><i class="far fa-clock"></i> ${formatDate(task.createdAt)}</span>
                            ${dl ? `<span class="deadline-badge ${dl.className}"><i class="fas fa-flag"></i> ${dl.text}</span>` : ''}
                            ${repeatLabel ? `<span class="repeat-badge"><i class="fas fa-redo"></i> ${repeatLabel}</span>` : ''}
                        </div>
                    </div>
                    <div class="item-actions">
                        <button class="icon-btn" type="button" data-action="edit-task" data-id="${task.id}" aria-label="Редактировать">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="icon-btn delete" type="button" data-action="delete-task" data-id="${task.id}" aria-label="Удалить">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    /* ========== РЕНДЕР ПРИВЫЧЕК ========== */

    function renderHabits() {
        habitCountEl.textContent = habits.length;

        if (habits.length === 0) {
            habitListEl.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-leaf"></i>
                    <span>Нет привычек. Начните отслеживать!</span>
                </div>
            `;
            return;
        }

        habitListEl.innerHTML = habits.map(habit => {
            const progress = habit.target > 0
                ? Math.min((habit.streak / habit.target) * 100, 100)
                : 0;
            const doneToday = isCompletedToday(habit.lastCompleted);

            return `
                <div class="item-card" data-id="${habit.id}">
                    <div class="item-check ${habit.streak > 0 ? 'completed' : ''}"
                         data-action="increment-habit" data-id="${habit.id}"
                         title="${doneToday ? 'Уже отмечено сегодня' : 'Отметить выполнение'}"
                         role="button" tabindex="0">
                        <span class="habit-progress">${habit.streak}</span>
                    </div>
                    <div class="item-content">
                        <div class="item-text" data-action="edit-habit" data-id="${habit.id}"
                             title="Двойной клик — редактировать">
                            ${escapeHtml(habit.text)}
                        </div>
                        <div class="item-meta">
                            <span><i class="fas fa-fire"></i> ${habit.streak} / ${habit.target}</span>
                            <span><i class="fas fa-calendar-alt"></i> ${formatDate(habit.createdAt)}</span>
                        </div>
                        <div class="habit-progress-bar">
                            <div class="habit-progress-fill" style="width: ${progress}%"></div>
                        </div>
                    </div>
                    <div class="item-actions">
                        <button class="icon-btn" type="button" data-action="edit-habit" data-id="${habit.id}" aria-label="Редактировать">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="icon-btn delete" type="button" data-action="delete-habit" data-id="${habit.id}" aria-label="Удалить">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    /* ========== РЕНДЕР ЗАКАЗОВ ========== */

    function calcAvg(income, deals) {
        if (!deals || deals === 0) return 0;
        return Math.round(income / deals);
    }

    function getOrdersTotals() {
        const totalIncome = orders.reduce((sum, o) => sum + (Number(o.income) || 0), 0);
        const totalDeals = orders.reduce((sum, o) => sum + (Number(o.deals) || 0), 0);
        const avgCheck = totalDeals > 0 ? Math.round(totalIncome / totalDeals) : 0;
        return { totalIncome, totalDeals, avgCheck };
    }

    function renderOrders() {
        ordersCountEl.textContent = `${orders.length} ${pluralize(orders.length, 'неделя', 'недели', 'недель')}`;

        if (orders.length === 0) {
            ordersBodyEl.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align:center; padding: 3rem 1rem; color:#5a6a8c;">
                        <i class="fas fa-briefcase" style="font-size:2rem; opacity:0.3; display:block; margin-bottom:0.8rem;"></i>
                        Нет данных. Нажмите «Добавить неделю».
                    </td>
                </tr>
            `;
            ordersFootEl.innerHTML = '';
            ordersCardsEl.innerHTML = '';
            return;
        }

        ordersBodyEl.innerHTML = orders.map(o => `
            <tr data-id="${o.id}">
                <td class="cell-week">${escapeHtml(o.week || '')}</td>
                <td class="cell-num">${o.responses || 0}</td>
                <td class="cell-num">${o.replies || 0}</td>
                <td class="cell-num">${o.deals || 0}</td>
                <td class="cell-num">${formatMoney(o.income)} ₽</td>
                <td class="cell-avg">${formatMoney(calcAvg(o.income, o.deals))} ₽</td>
                <td class="cell-num">${o.support || 0}</td>
                <td class="cell-notes" title="${escapeHtml(o.notes || '')}">${escapeHtml(o.notes || '—')}</td>
                <td>
                    <div class="row-actions">
                        <button class="icon-btn" data-action="edit-order" data-id="${o.id}" aria-label="Редактировать">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="icon-btn delete" data-action="delete-order" data-id="${o.id}" aria-label="Удалить">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        const { totalIncome, totalDeals, avgCheck } = getOrdersTotals();
        ordersFootEl.innerHTML = `
            <tr>
                <td class="cell-total-label">Итого</td>
                <td></td>
                <td></td>
                <td class="cell-total-num">${totalDeals}</td>
                <td class="cell-total-num">${formatMoney(totalIncome)} ₽</td>
                <td class="cell-total-num">${formatMoney(avgCheck)} ₽</td>
                <td></td>
                <td></td>
                <td></td>
            </tr>
        `;

        ordersCardsEl.innerHTML = orders.map(o => `
            <div class="order-card" data-id="${o.id}">
                <div class="order-card-header">
                    <span class="order-card-week">${escapeHtml(o.week || '')}</span>
                    <div class="order-card-actions">
                        <button class="icon-btn" data-action="edit-order" data-id="${o.id}" aria-label="Редактировать">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="icon-btn delete" data-action="delete-order" data-id="${o.id}" aria-label="Удалить">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
                <div class="order-card-grid">
                    <div class="order-field">
                        <span class="order-field-label">Отправлено</span>
                        <span class="order-field-value">${o.responses || 0}</span>
                    </div>
                    <div class="order-field">
                        <span class="order-field-label">Ответов</span>
                        <span class="order-field-value">${o.replies || 0}</span>
                    </div>
                    <div class="order-field">
                        <span class="order-field-label">Сделок</span>
                        <span class="order-field-value">${o.deals || 0}</span>
                    </div>
                    <div class="order-field">
                        <span class="order-field-label">Доход</span>
                        <span class="order-field-value">${formatMoney(o.income)} ₽</span>
                    </div>
                    <div class="order-field">
                        <span class="order-field-label">Средний чек</span>
                        <span class="order-field-value avg">${formatMoney(calcAvg(o.income, o.deals))} ₽</span>
                    </div>
                    <div class="order-field">
                        <span class="order-field-label">На поддержке</span>
                        <span class="order-field-value">${o.support || 0}</span>
                    </div>
                    ${o.notes ? `
                        <div class="order-field order-field-notes">
                            <span class="order-field-label">Заметки</span>
                            <span class="order-field-value">${escapeHtml(o.notes)}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('') + `
            <div class="order-total-card">
                <div class="order-total-title">Итого за всё время</div>
                <div class="order-total-grid">
                    <div class="order-total-item">
                        <div class="order-total-value">${formatMoney(totalIncome)} ₽</div>
                        <div class="order-total-label">Общий доход</div>
                    </div>
                    <div class="order-total-item">
                        <div class="order-total-value">${totalDeals}</div>
                        <div class="order-total-label">Всего сделок</div>
                    </div>
                    <div class="order-total-item">
                        <div class="order-total-value">${formatMoney(avgCheck)} ₽</div>
                        <div class="order-total-label">Средний чек</div>
                    </div>
                </div>
            </div>
        `;
    }

    /* ============================================
       СТРАТЕГИЯ · ДЕРЕВО ЦЕЛЕЙ
       ============================================ */

    function getGoalById(id) {
        return goals.find(g => g.id === id);
    }

    function getChildren(parentId) {
        return goals
            .filter(g => g.parentId === parentId)
            .sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    function getRootGoals() {
        return getChildren(null);
    }

    function getGoalProgress(goal) {
        const children = getChildren(goal.id);

        if (children.length > 0) {
            const sum = children.reduce((acc, c) => acc + getGoalProgress(c), 0);
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

    function getDescendantCount(goalId) {
        const children = getChildren(goalId);
        let count = children.length;
        children.forEach(c => { count += getDescendantCount(c.id); });
        return count;
    }

    function renderTree() {
        const roots = getRootGoals();

        if (roots.length === 0) {
            treeListEl.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-sitemap"></i>
                    <span>Нет целей. Нажмите «Новая цель», чтобы начать</span>
                </div>
            `;
            return;
        }

        treeListEl.innerHTML = roots.map(g => renderTreeNode(g)).join('');
    }

    function renderTreeNode(goal) {
        const children = getChildren(goal.id);
        const progress = getGoalProgress(goal);
        const daysLeft = daysUntil(goal.deadline);
        const isCollapsed = collapsedGoals.has(goal.id);

        let deadlineChip = '';
        if (daysLeft !== null) {
            let cls = 'deadline-normal';
            let text = '';
            if (daysLeft < 0) { cls = 'deadline-overdue'; text = `Просрочено · ${Math.abs(daysLeft)} дн.`; }
            else if (daysLeft === 0) { cls = 'deadline-soon'; text = 'Сегодня'; }
            else if (daysLeft <= 3) { cls = 'deadline-soon'; text = `${daysLeft} дн.`; }
            else { text = `${daysLeft} дн.`; }
            deadlineChip = `<span class="goal-chip ${cls}"><i class="fas fa-hourglass-half"></i> ${text}</span>`;
        }

        const amountChip = goal.amount
            ? `<span class="goal-chip amount"><i class="fas fa-ruble-sign"></i> ${formatMoney(goal.amountCurrent || 0)} / ${formatMoney(goal.amount)}</span>`
            : '';

        const childrenCount = getDescendantCount(goal.id);
        const childrenChip = childrenCount > 0
            ? `<span class="goal-chip children"><i class="fas fa-sitemap"></i> ${childrenCount} ${pluralize(childrenCount, 'подцель', 'подцели', 'подцелей')}</span>`
            : '';

        const noteText = goal.note || '';
        const needsTruncate = noteText.length > 160;
        const noteHtml = noteText ? `
            <div class="goal-card-note" data-note-id="${goal.id}">
                ${escapeHtml(needsTruncate ? truncateText(noteText, 160) : noteText)}
            </div>
            ${needsTruncate ? `
                <button class="btn-show-more-goal" data-action="toggle-goal-note" data-id="${goal.id}">
                    <span>Показать полностью</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
            ` : ''}
        ` : '';

        const hasChildren = children.length > 0;

        return `
            <div class="tree-node" data-goal-id="${goal.id}">
                <div class="goal-card status-${goal.status}">
                    <div class="goal-card-main">
                        <div class="goal-card-header-row">
                            <div class="goal-card-title-block">
                                <div class="goal-title-row">
                                    <button class="goal-expand-btn ${isCollapsed ? 'collapsed' : ''} ${hasChildren ? '' : 'hidden'}"
                                            data-action="toggle-collapse" data-id="${goal.id}"
                                            aria-label="${isCollapsed ? 'Развернуть' : 'Свернуть'}">
                                        <i class="fas fa-chevron-down"></i>
                                    </button>
                                    <span class="goal-title-text">${escapeHtml(goal.title)}</span>
                                </div>
                                <div class="goal-card-meta">
                                    ${deadlineChip}
                                    ${amountChip}
                                    ${childrenChip}
                                </div>
                            </div>
                            <div class="goal-card-actions">
                                <button class="goal-action-btn" data-action="add-subgoal" data-id="${goal.id}" title="Добавить подцель">
                                    <i class="fas fa-plus"></i>
                                </button>
                                <button class="goal-action-btn" data-action="edit-goal" data-id="${goal.id}" title="Редактировать">
                                    <i class="fas fa-pen"></i>
                                </button>
                                <button class="goal-action-btn status-dot" data-action="cycle-status" data-id="${goal.id}" title="Сменить статус">
                                    <i class="fas fa-circle"></i>
                                </button>
                                <button class="goal-action-btn delete" data-action="delete-goal" data-id="${goal.id}" title="Удалить">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </div>

                        ${noteHtml}

                        <div class="goal-progress-row">
                            <div class="goal-progress-track">
                                <div class="goal-progress-fill" style="width: ${progress}%"></div>
                            </div>
                            <div class="goal-progress-pct">${progress}%</div>
                        </div>
                    </div>
                </div>

                ${hasChildren ? `
                    <div class="tree-node-children ${isCollapsed ? 'collapsed' : ''}">
                        ${children.map(c => renderTreeNode(c)).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    function openGoalModal(parentId = null, editId = null) {
        editingGoal = editId || null;
        const goal = editId ? getGoalById(editId) : null;

        modalTitle.textContent = editId
            ? 'Редактировать цель'
            : (parentId ? 'Новая подцель' : 'Новая цель');
        modalInput.style.display = 'none';
        modalInput.value = '';

        const deadlineValue = goal && goal.deadline
            ? new Date(goal.deadline).toISOString().slice(0, 10)
            : '';

        modalExtra.innerHTML = `
            <label class="modal-label">Название *</label>
            <input type="text" id="goalTitle" class="modal-input" placeholder="Например: Поднять 211 000 ₽ за месяц" value="${goal ? escapeHtml(goal.title) : ''}">

            <label class="modal-label">Заметка</label>
            <textarea id="goalNote" class="modal-input modal-textarea" rows="3" placeholder="Зачем эта цель, что важно помнить...">${goal ? escapeHtml(goal.note || '') : ''}</textarea>

            <div class="order-modal-grid">
                <div>
                    <label class="modal-label">Дедлайн</label>
                    <input type="date" id="goalDeadline" class="modal-input" value="${deadlineValue}">
                </div>
                <div>
                    <label class="modal-label">Статус</label>
                    <select id="goalStatus" class="modal-input">
                        <option value="active" ${goal && goal.status === 'active' ? 'selected' : ''}>🟢 В работе</option>
                        <option value="paused" ${goal && goal.status === 'paused' ? 'selected' : ''}>🟡 Отложено</option>
                        <option value="blocked" ${goal && goal.status === 'blocked' ? 'selected' : ''}>🔴 Заблокировано</option>
                        <option value="done" ${goal && goal.status === 'done' ? 'selected' : ''}>✅ Готово</option>
                    </select>
                </div>
                <div>
                    <label class="modal-label">Сумма цели, ₽</label>
                    <input type="number" id="goalAmount" class="modal-input" min="0" placeholder="211000" value="${goal && goal.amount ? goal.amount : ''}">
                </div>
                <div>
                    <label class="modal-label">Текущий прогресс, ₽</label>
                    <input type="number" id="goalAmountCurrent" class="modal-input" min="0" placeholder="0" value="${goal && goal.amountCurrent ? goal.amountCurrent : 0}">
                </div>
            </div>
        `;

        modalOverlay.dataset.parentId = parentId || '';
        modalOverlay.dataset.editGoalId = editId || '';
        modalOverlay.hidden = false;
        setTimeout(() => $('goalTitle').focus(), 50);
    }

    function saveGoalModal() {
        const title = $('goalTitle').value.trim();
        if (!title) { showToast('Введите название цели', 'fa-exclamation-triangle'); return; }

        const note = $('goalNote').value.trim();
        const deadlineVal = $('goalDeadline').value;
        const status = $('goalStatus').value;
        const amount = Number($('goalAmount').value) || 0;
        const amountCurrent = Number($('goalAmountCurrent').value) || 0;

        const data = {
            title, note,
            deadline: deadlineVal ? new Date(deadlineVal).getTime() : null,
            status,
            amount: amount || null,
            amountCurrent: amountCurrent || 0
        };

        if (editingGoal) {
            const goal = getGoalById(editingGoal);
            if (goal) Object.assign(goal, data);
            showToast('Цель обновлена');
        } else {
            const parentId = modalOverlay.dataset.parentId || null;
            const siblings = getChildren(parentId);
            goals.push({
                id: generateId(),
                ...data,
                parentId: parentId || null,
                createdAt: Date.now(),
                order: siblings.length
            });
            if (parentId) collapsedGoals.delete(parentId);
            showToast(parentId ? 'Подцель добавлена' : 'Цель добавлена');
        }

        saveGoals();
        renderTree();
        renderStrategyPickers();
        renderStats();
        closeModal();
    }

    function deleteGoalById(id) {
        const descendants = getDescendantCount(id);
        const msg = descendants > 0
            ? `Удалить цель и все её подцели (${descendants} шт.)?`
            : 'Удалить цель?';
        if (!confirm(msg)) return;

        const toDelete = new Set([id]);
        function collectChildren(pid) {
            getChildren(pid).forEach(c => {
                toDelete.add(c.id);
                collectChildren(c.id);
            });
        }
        collectChildren(id);

        goals = goals.filter(g => !toDelete.has(g.id));
        saveGoals();
        renderTree();
        renderStrategyPickers();
        renderStats();
        showToast('Удалено', 'fa-trash-alt');
    }

    function cycleGoalStatus(id) {
        const goal = getGoalById(id);
        if (!goal) return;
        const order = ['active', 'paused', 'blocked', 'done'];
        const idx = order.indexOf(goal.status);
        goal.status = order[(idx + 1) % order.length];
        saveGoals();
        renderTree();
        renderStats();
    }

    function toggleGoalNote(id) {
        const noteEl = document.querySelector(`[data-note-id="${id}"]`);
        const btn = document.querySelector(`[data-action="toggle-goal-note"][data-id="${id}"]`);
        const goal = getGoalById(id);
        if (!noteEl || !goal) return;

        const isExpanded = noteEl.classList.toggle('expanded');

        if (isExpanded) {
            noteEl.textContent = goal.note;
            if (btn) {
                btn.classList.add('expanded');
                btn.querySelector('span').textContent = 'Свернуть';
            }
        } else {
            noteEl.textContent = truncateText(goal.note, 160);
            if (btn) {
                btn.classList.remove('expanded');
                btn.querySelector('span').textContent = 'Показать полностью';
            }
        }
    }

    function toggleCollapse(id) {
        if (collapsedGoals.has(id)) collapsedGoals.delete(id);
        else collapsedGoals.add(id);
        renderTree();
    }

    /* ============================================
       СТРАТЕГИЯ · ДНЕВНИК
       ============================================ */

    function renderMoodSelect() {
        if (!journalMoodSelect) return;
        journalMoodSelect.innerHTML = MOODS.map(m =>
            `<option value="${m.id}">${m.emoji} ${m.label}</option>`
        ).join('');
    }

    function renderStrategyPickers() {
        const flat = [];
        function collect(parentId, depth) {
            getChildren(parentId).forEach(g => {
                flat.push({ goal: g, depth });
                collect(g.id, depth + 1);
            });
        }
        collect(null, 0);

        const optionsHtml = '<option value="">Без привязки к цели</option>' +
            flat.map(({ goal, depth }) =>
                `<option value="${goal.id}">${'— '.repeat(depth)}${escapeHtml(goal.title)}</option>`
            ).join('');

        if (journalGoalSelect) {
            const current = journalGoalSelect.value;
            journalGoalSelect.innerHTML = optionsHtml;
            if (current) journalGoalSelect.value = current;
        }

        if (chartGoalSelect) {
            const current = chartGoalSelect.value;
            const chartOptions = flat.map(({ goal, depth }) =>
                `<option value="${goal.id}">${'— '.repeat(depth)}${escapeHtml(goal.title)}</option>`
            ).join('');
            chartGoalSelect.innerHTML = chartOptions || '<option value="">Нет целей</option>';
            if (current && goals.find(g => g.id === current)) {
                chartGoalSelect.value = current;
            } else if (flat.length > 0) {
                chartGoalSelect.value = flat[0].goal.id;
            }
        }
    }

    function renderJournal() {
        if (journal.length === 0) {
            journalListEl.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-book"></i>
                    <span>Дневник пуст. Начни записывать, как идёт путь к цели</span>
                </div>
            `;
            return;
        }

        const sorted = [...journal].sort((a, b) => b.date - a.date);

        journalListEl.innerHTML = sorted.map(entry => {
            const mood = getMoodInfo(entry.mood);
            const goal = entry.goalId ? getGoalById(entry.goalId) : null;

            return `
                <div class="journal-entry" data-id="${entry.id}">
                    <div class="journal-entry-header">
                        <div class="journal-entry-meta">
                            <div class="journal-entry-date">
                                <i class="far fa-calendar"></i> ${formatDateFull(entry.date)}
                            </div>
                            ${goal ? `<span class="journal-entry-goal"><i class="fas fa-sitemap"></i> ${escapeHtml(goal.title)}</span>` : ''}
                        </div>
                        <div class="journal-entry-actions">
                            <button class="icon-btn" data-action="edit-journal" data-id="${entry.id}" aria-label="Редактировать">
                                <i class="fas fa-pen"></i>
                            </button>
                            <button class="icon-btn delete" data-action="delete-journal" data-id="${entry.id}" aria-label="Удалить">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                    ${entry.mood ? `
                        <div class="journal-entry-mood">
                            <span class="emoji">${mood.emoji}</span> ${mood.label}
                        </div>
                    ` : ''}
                    ${entry.text ? `<div class="journal-entry-text">${escapeHtml(entry.text)}</div>` : ''}
                    ${entry.value ? `
                        <div class="journal-entry-value">
                            <i class="fas fa-chart-line"></i> ${formatMoney(entry.value)} ₽
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    function addJournalEntry({ goalId, text, mood, value, date }) {
        if (!text && !mood && !value) return;
        journal.push({
            id: generateId(),
            goalId: goalId || null,
            text: (text || '').trim(),
            mood: mood || null,
            value: value || 0,
            date: date || Date.now()
        });
        saveJournal();
        renderJournal();
        renderChart();
        showToast('Запись добавлена');
    }

    function openJournalModal(id = null) {
        editingJournal = id || null;
        const entry = id ? journal.find(j => j.id === id) : null;

        modalTitle.textContent = id ? 'Редактировать запись' : 'Новая запись';
        modalInput.style.display = 'none';
        modalInput.value = '';

        const flat = [];
        function collect(parentId, depth) {
            getChildren(parentId).forEach(g => {
                flat.push({ goal: g, depth });
                collect(g.id, depth + 1);
            });
        }
        collect(null, 0);

        const goalOptions = '<option value="">Без привязки</option>' +
            flat.map(({ goal, depth }) =>
                `<option value="${goal.id}" ${entry && entry.goalId === goal.id ? 'selected' : ''}>${'— '.repeat(depth)}${escapeHtml(goal.title)}</option>`
            ).join('');

        const moodOptions = MOODS.map(m =>
            `<option value="${m.id}" ${entry && entry.mood === m.id ? 'selected' : ''}>${m.emoji} ${m.label}</option>`
        ).join('');

        modalExtra.innerHTML = `
            <label class="modal-label">Как ты себя чувствуешь?</label>
            <select id="journalMood" class="modal-input">${moodOptions}</select>

            <label class="modal-label">К какой цели относится</label>
            <select id="journalGoal" class="modal-input">${goalOptions}</select>

            <label class="modal-label">Текст</label>
            <textarea id="journalText" class="modal-input modal-textarea" rows="4" placeholder="Что произошло, что помогло, что мешает...">${entry ? escapeHtml(entry.text || '') : ''}</textarea>

            <label class="modal-label">Числовой прогресс (₽, опционально)</label>
            <input type="number" id="journalValue" class="modal-input" min="0" value="${entry && entry.value ? entry.value : ''}" placeholder="Например: 25000">
        `;

        modalOverlay.hidden = false;
        setTimeout(() => $('journalText').focus(), 50);
    }

    function saveJournalModal() {
        const mood = $('journalMood').value;
        const goalId = $('journalGoal').value || null;
        const text = $('journalText').value.trim();
        const value = Number($('journalValue').value) || 0;

        if (!text && !value) {
            showToast('Добавь текст или прогресс', 'fa-exclamation-triangle');
            return;
        }

        if (editingJournal) {
            const entry = journal.find(j => j.id === editingJournal);
            if (entry) {
                entry.mood = mood;
                entry.goalId = goalId;
                entry.text = text;
                entry.value = value;
            }
            showToast('Запись обновлена');
        } else {
            addJournalEntry({ goalId, text, mood, value });
        }

        saveJournal();
        renderJournal();
        renderChart();
        closeModal();
    }

    function deleteJournalEntry(id) {
        if (!confirm('Удалить запись?')) return;
        journal = journal.filter(j => j.id !== id);
        saveJournal();
        renderJournal();
        renderChart();
        showToast('Удалено', 'fa-trash-alt');
    }

    /* ============================================
       СТРАТЕГИЯ · ГРАФИК
       ============================================ */

    function renderChart() {
        if (!progressChartEl) return;

        const goalId = chartGoalSelect ? chartGoalSelect.value : null;
        const goal = goalId ? getGoalById(goalId) : null;

        if (!goal) {
            progressChartEl.innerHTML = '';
            if (chartLegendEl) chartLegendEl.innerHTML = '';
            return;
        }

        const relatedGoalIds = new Set([goal.id]);
        function collect(pid) {
            getChildren(pid).forEach(c => {
                relatedGoalIds.add(c.id);
                collect(c.id);
            });
        }
        collect(goal.id);

        const entries = journal
            .filter(j => j.goalId && relatedGoalIds.has(j.goalId) && j.value > 0)
            .sort((a, b) => a.date - b.date);

        const points = entries.map(j => ({ date: j.date, value: j.value }));

        if (goal.amountCurrent && goal.amountCurrent > 0) {
            const last = points[points.length - 1];
            if (!last || last.value !== goal.amountCurrent) {
                points.push({ date: Date.now(), value: goal.amountCurrent });
            }
        }

        const svg = progressChartEl;
        const W = 800, H = 400;
        const padding = { top: 40, right: 40, bottom: 50, left: 70 };
        const chartW = W - padding.left - padding.right;
        const chartH = H - padding.top - padding.bottom;

        if (points.length === 0) {
            svg.innerHTML = `
                <foreignObject x="0" y="0" width="${W}" height="${H}">
                    <div xmlns="http://www.w3.org/1999/xhtml" class="chart-empty" style="height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                        <i class="fas fa-chart-line"></i>
                        <span>Добавь записи с числовым прогрессом в дневник — и здесь появится график</span>
                    </div>
                </foreignObject>
            `;
            if (chartLegendEl) chartLegendEl.innerHTML = '';
            return;
        }

        const targetAmount = goal.amount || Math.max(...points.map(p => p.value)) * 1.2;
        const maxValue = Math.max(targetAmount, ...points.map(p => p.value));
        const startDate = Math.min(...points.map(p => p.date), goal.createdAt || points[0].date);
        const endDate = Math.max(goal.deadline || Date.now(), ...points.map(p => p.date));

        const minDate = startDate - 2 * DAY_MS;
        const maxDate = endDate + 2 * DAY_MS;

        function xFor(date) {
            return padding.left + ((date - minDate) / (maxDate - minDate)) * chartW;
        }
        function yFor(value) {
            return padding.top + chartH - (value / maxValue) * chartH;
        }

        let gridSvg = '';
        for (let i = 0; i <= 4; i++) {
            const y = padding.top + (chartH / 4) * i;
            const value = maxValue * (1 - i / 4);
            gridSvg += `<line class="chart-grid-line" x1="${padding.left}" y1="${y}" x2="${W - padding.right}" y2="${y}" />`;
            gridSvg += `<text class="chart-axis-label" x="${padding.left - 10}" y="${y + 4}" text-anchor="end">${formatMoney(value)}</text>`;
        }

        const totalDays = Math.round((maxDate - minDate) / DAY_MS);
        const stepDays = Math.max(1, Math.round(totalDays / 6));
        let xLabelsSvg = '';
        for (let d = 0; d <= totalDays; d += stepDays) {
            const date = minDate + d * DAY_MS;
            const x = xFor(date);
            const label = new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
            xLabelsSvg += `<text class="chart-axis-label" x="${x}" y="${H - padding.bottom + 22}" text-anchor="middle">${label}</text>`;
        }

        const linePoints = points.map(p => `${xFor(p.date)},${yFor(p.value)}`).join(' ');

        const areaPoints = points.length > 1
            ? `${padding.left},${padding.top + chartH} ${linePoints} ${xFor(points[points.length - 1].date)},${padding.top + chartH}`
            : '';

        let forecastSvg = '';
        if (goal.amount && goal.deadline && points.length > 0) {
            const last = points[points.length - 1];
            const forecastEnd = { x: xFor(goal.deadline), y: yFor(goal.amount) };
            const lastPoint = { x: xFor(last.date), y: yFor(last.value) };
            forecastSvg = `<line class="chart-forecast-line" x1="${lastPoint.x}" y1="${lastPoint.y}" x2="${forecastEnd.x}" y2="${forecastEnd.y}" />`;
        }

        let pointsSvg = '';
        points.forEach((p, i) => {
            const x = xFor(p.date);
            const y = yFor(p.value);
            pointsSvg += `<circle class="chart-point" cx="${x}" cy="${y}" r="5"><title>${formatDateShort(p.date)}: ${formatMoney(p.value)} ₽</title></circle>`;
            if (i === points.length - 1) {
                pointsSvg += `<text class="chart-point-label" x="${x}" y="${y - 14}" text-anchor="middle">${formatMoney(p.value)} ₽</text>`;
            }
        });

        svg.innerHTML = `
            <defs>
                <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#6d8cff"/>
                    <stop offset="100%" stop-color="#a46eff"/>
                </linearGradient>
                <linearGradient id="progressArea" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#6d8cff" stop-opacity="0.5"/>
                    <stop offset="100%" stop-color="#6d8cff" stop-opacity="0"/>
                </linearGradient>
            </defs>

            ${gridSvg}
            <line class="chart-axis-line" x1="${padding.left}" y1="${padding.top + chartH}" x2="${W - padding.right}" y2="${padding.top + chartH}" />
            <line class="chart-axis-line" x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartH}" />

            ${xLabelsSvg}
            ${areaPoints ? `<polygon class="chart-progress-area" points="${areaPoints}" />` : ''}
            ${points.length > 1 ? `<polyline class="chart-progress-line" points="${linePoints}" />` : ''}
            ${forecastSvg}
            ${pointsSvg}
        `;

        if (chartLegendEl) {
            chartLegendEl.innerHTML = `
                <div class="chart-legend-item">
                    <div class="chart-legend-line solid"></div>
                    <span>Прогресс</span>
                </div>
                ${forecastSvg ? `
                    <div class="chart-legend-item">
                        <div class="chart-legend-line dashed"></div>
                        <span>Прогноз к дедлайну</span>
                    </div>
                ` : ''}
                <div class="chart-legend-item">
                    <span><strong>${formatMoney(goal.amountCurrent || (points[points.length - 1]?.value || 0))}</strong> из ${formatMoney(goal.amount || 0)} ₽</span>
                </div>
            `;
        }
    }

    /* ============================================
       КАЛЬКУЛЯТОРЫ
       ============================================ */

    function calcMoney() {
        const amount = Number($('moneyAmount').value) || 0;
        const period = $('moneyPeriod').value;
        const goalSum = Number($('moneyGoal').value) || 0;

        if (amount <= 0) { showToast('Введите сумму больше 0', 'fa-exclamation-triangle'); return; }

        let perDay = amount;
        let periodLabel = '';
        if (period === 'week') { perDay = amount / 7; periodLabel = 'в неделю'; }
        else if (period === 'month') { perDay = amount / 30; periodLabel = 'в месяц'; }
        else if (period === 'year') { perDay = amount / 365; periodLabel = 'в год'; }
        else { periodLabel = 'в день'; }

        const perMonth = perDay * 30;
        const perYear = perDay * 365;

        let resultHTML = `
            <div class="calc-result-main">${formatNumber(perYear)} ₽</div>
            <div class="calc-result-label">За год, если откладываете ${formatNumber(amount)} ₽ ${periodLabel}</div>
            <div class="calc-result-details">
                <div class="calc-detail">
                    <div class="calc-detail-value">${formatNumber(perMonth)} ₽</div>
                    <div class="calc-detail-label">За месяц</div>
                </div>
                <div class="calc-detail">
                    <div class="calc-detail-value">${formatNumber(perYear * 5)} ₽</div>
                    <div class="calc-detail-label">За 5 лет</div>
                </div>
                <div class="calc-detail">
                    <div class="calc-detail-value">${formatNumber(perYear * 10)} ₽</div>
                    <div class="calc-detail-label">За 10 лет</div>
                </div>
            </div>
        `;

        if (goalSum > 0) {
            const daysToGoal = Math.ceil(goalSum / perDay);
            const dateToGoal = new Date(Date.now() + daysToGoal * DAY_MS);
            const dateStr = dateToGoal.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
            resultHTML += `
                <div class="calc-result-details" style="margin-top:1rem; padding-top:1rem; border-top:1px solid rgba(255,255,255,0.1);">
                    <div class="calc-detail">
                        <div class="calc-detail-value">${pluralizeTime(daysToGoal)}</div>
                        <div class="calc-detail-label">До цели ${formatNumber(goalSum)} ₽</div>
                    </div>
                    <div class="calc-detail">
                        <div class="calc-detail-value">${dateStr}</div>
                        <div class="calc-detail-label">Примерная дата</div>
                    </div>
                </div>
            `;
        }

        const resultEl = $('moneyResult');
        resultEl.innerHTML = resultHTML;
        resultEl.hidden = false;
    }

    function calcBook() {
        const total = Number($('bookTotal').value) || 0;
        const amount = Number($('bookAmount').value) || 0;
        const period = $('bookPeriod').value;

        if (total <= 0 || amount <= 0) { showToast('Заполните все поля', 'fa-exclamation-triangle'); return; }

        let perDay = amount;
        let periodLabel = '';
        if (period === 'week') { perDay = amount / 7; periodLabel = 'стр. в неделю'; }
        else if (period === 'month') { perDay = amount / 30; periodLabel = 'стр. в месяц'; }
        else { periodLabel = 'стр. в день'; }

        const daysToFinish = Math.ceil(total / perDay);
        const dateToFinish = new Date(Date.now() + daysToFinish * DAY_MS);
        const dateStr = dateToFinish.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
        const booksPerYear = (perDay * 365 / total).toFixed(1);

        const resultEl = $('bookResult');
        resultEl.innerHTML = `
            <div class="calc-result-main">${pluralizeTime(daysToFinish)}</div>
            <div class="calc-result-label">Прочитаете книгу на ${total} страниц</div>
            <div class="calc-result-details">
                <div class="calc-detail">
                    <div class="calc-detail-value">${dateStr}</div>
                    <div class="calc-detail-label">Примерная дата финиша</div>
                </div>
                <div class="calc-detail">
                    <div class="calc-detail-value">${booksPerYear}</div>
                    <div class="calc-detail-label">Книг за год</div>
                </div>
                <div class="calc-detail">
                    <div class="calc-detail-value">${Math.round(perDay * 365)}</div>
                    <div class="calc-detail-label">Страниц за год</div>
                </div>
            </div>
        `;
        resultEl.hidden = false;
    }

    /* ========== РЕНДЕР СЛОВАРЯ ========== */

    function renderDictCategories() {
        const counts = {};
        dict.forEach(w => { counts[w.category] = (counts[w.category] || 0) + 1; });

        let html = `
            <button class="dict-cat-btn ${dictCategory === 'all' ? 'active' : ''}" data-cat="all">
                <i class="fas fa-layer-group"></i> Все (${dict.length})
            </button>
        `;

        CATEGORIES.forEach(cat => {
            const count = counts[cat.id] || 0;
            if (count === 0 && dictCategory !== cat.id) return;
            html += `
                <button class="dict-cat-btn ${dictCategory === cat.id ? 'active' : ''}" data-cat="${cat.id}">
                    <i class="fas ${cat.icon}"></i> ${cat.name} (${count})
                </button>
            `;
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
            list = list.filter(w =>
                (w.word || '').toLowerCase().includes(q) ||
                (w.meaning || '').toLowerCase().includes(q)
            );
        }
        return list.sort((a, b) => b.createdAt - a.createdAt);
    }

    function renderDict() {
        dictCountEl.textContent = `${dict.length} ${pluralize(dict.length, 'слово', 'слова', 'слов')}`;
        renderDictCategories();

        const filtered = getFilteredDict();

        if (filtered.length === 0) {
            dictListEl.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-book-open"></i>
                    <span>${dict.length === 0 ? 'Словарь пуст. Добавьте первое слово!' : 'Ничего не найдено'}</span>
                </div>
            `;
            return;
        }

        dictListEl.innerHTML = filtered.map(w => {
            const cat = getCategoryInfo(w.category);
            const needsTruncate = (w.meaning || '').length > 140;
            const displayMeaning = needsTruncate ? truncateText(w.meaning, 140) : w.meaning;

            return `
                <div class="dict-card" data-id="${w.id}">
                    <div class="dict-card-header">
                        <div class="dict-card-title">
                            <span class="dict-card-word">${escapeHtml(w.word)}</span>
                            <button class="dict-card-star ${w.favorite ? 'active' : ''}"
                                    data-action="toggle-favorite" data-id="${w.id}">
                                <i class="fas fa-star"></i>
                            </button>
                        </div>
                        <div class="dict-card-actions">
                            <button class="icon-btn" data-action="edit-word" data-id="${w.id}" aria-label="Редактировать">
                                <i class="fas fa-pen"></i>
                            </button>
                            <button class="icon-btn delete" data-action="delete-word" data-id="${w.id}" aria-label="Удалить">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>

                    <div class="dict-card-meaning" data-meaning-id="${w.id}">
                        ${escapeHtml(displayMeaning)}
                    </div>

                    ${needsTruncate ? `
                        <button class="btn-show-more" data-action="toggle-meaning" data-id="${w.id}">
                            <span>Показать полностью</span>
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    ` : ''}

                    ${w.example ? `<div class="dict-card-example">${escapeHtml(w.example)}</div>` : ''}

                    <div class="dict-card-tags">
                        <span class="dict-card-category">
                            <i class="fas ${cat.icon}"></i> ${cat.name}
                        </span>
                        ${w.review ? `<span class="dict-card-tag"><i class="fas fa-redo"></i> Повторить</span>` : ''}
                    </div>

                    <div class="dict-card-meta">
                        <span><i class="far fa-clock"></i> ${formatDate(w.createdAt)}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    /* ========== СЛОВО ДНЯ ========== */

    function updateWordOfDay() {
        if (dict.length === 0) { wordOfDayEl.hidden = true; return; }

        const today = todayStr();
        let word = wod.wordId ? dict.find(w => w.id === wod.wordId) : null;
        const needNew = wod.date !== today || !word;

        if (needNew) {
            word = dict[Math.floor(Math.random() * dict.length)];
            wod = { date: today, wordId: word.id };
            saveWod();
        }

        wordOfDayEl.hidden = false;
        wodWordEl.textContent = word.word;

        const needsToggle = (word.meaning || '').length > 140;
        if (needsToggle) {
            wodMeaningEl.textContent = truncateText(word.meaning, 140);
        } else {
            wodMeaningEl.textContent = word.meaning;
        }
        wodMeaningEl.classList.remove('expanded');

        const cat = getCategoryInfo(word.category);
        wodMetaEl.innerHTML = `
            <span><i class="fas ${cat.icon}"></i> ${cat.name}</span>
            <span><i class="far fa-clock"></i> ${formatDate(word.createdAt)}</span>
        `;

        wodToggleEl.style.display = needsToggle ? 'inline-flex' : 'none';
        wodToggleEl.classList.remove('expanded');
        wodToggleEl.querySelector('span').textContent = 'Показать полностью';
    }

    /* ========== МОДАЛКА СЛОВА ========== */

    function openWordModal(id = null) {
        editingWord = id;
        const word = id ? dict.find(w => w.id === id) : null;

        modalTitle.textContent = id ? 'Редактировать слово' : 'Новое слово';
        modalInput.style.display = 'none';
        modalInput.value = '';

        const categoriesOptions = CATEGORIES.map(c =>
            `<option value="${c.id}" ${word && word.category === c.id ? 'selected' : ''}>${c.name}</option>`
        ).join('');

        modalExtra.innerHTML = `
            <label class="modal-label">Слово *</label>
            <input type="text" id="wWord" class="modal-input" placeholder="Например: Рефлексия" value="${word ? escapeHtml(word.word) : ''}">

            <label class="modal-label">Значение *</label>
            <textarea id="wMeaning" class="modal-input modal-textarea" rows="4" placeholder="Полное определение или объяснение...">${word ? escapeHtml(word.meaning) : ''}</textarea>

            <label class="modal-label">Пример использования</label>
            <textarea id="wExample" class="modal-input modal-textarea" rows="2" placeholder="Как это слово используется в контексте...">${word ? escapeHtml(word.example || '') : ''}</textarea>

            <label class="modal-label">Категория</label>
            <select id="wCategory" class="modal-input">${categoriesOptions}</select>

            <label class="modal-label" style="display:flex; align-items:center; gap:0.5rem; cursor:pointer; margin-top:0.5rem;">
                <input type="checkbox" id="wFavorite" ${word && word.favorite ? 'checked' : ''} style="width:auto; margin:0;">
                <span>⭐ Добавить в избранное</span>
            </label>
        `;

        modalOverlay.hidden = false;
        setTimeout(() => $('wWord').focus(), 50);
    }

    function saveWordModal() {
        const word = $('wWord').value.trim();
        const meaning = $('wMeaning').value.trim();
        const example = $('wExample').value.trim();
        const category = $('wCategory').value;
        const favorite = $('wFavorite').checked;

        if (!word) { showToast('Введите слово', 'fa-exclamation-triangle'); return; }
        if (!meaning) { showToast('Введите значение', 'fa-exclamation-triangle'); return; }

        const data = { word, meaning, example, category, favorite };

        if (editingWord) {
            const w = dict.find(x => x.id === editingWord);
            if (w) Object.assign(w, data);
            showToast('Слово обновлено');
        } else {
            dict.unshift({
                id: generateId(), ...data,
                know: false, review: false,
                createdAt: Date.now()
            });
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
        showToast('Слово удалено', 'fa-trash-alt');
    }

    function toggleFavorite(id) {
        const w = dict.find(x => x.id === id);
        if (!w) return;
        w.favorite = !w.favorite;
        saveDict();
        renderDict();
    }

    function toggleMeaningExpand(id) {
        const meaningEl = document.querySelector(`[data-meaning-id="${id}"]`);
        const btn = document.querySelector(`[data-action="toggle-meaning"][data-id="${id}"]`);
        const w = dict.find(x => x.id === id);
        if (!meaningEl || !w) return;

        const isExpanded = meaningEl.classList.toggle('expanded');
        if (isExpanded) {
            meaningEl.textContent = w.meaning;
            if (btn) {
                btn.classList.add('expanded');
                btn.querySelector('span').textContent = 'Свернуть';
            }
        } else {
            meaningEl.textContent = truncateText(w.meaning, 140);
            if (btn) {
                btn.classList.remove('expanded');
                btn.querySelector('span').textContent = 'Показать полностью';
            }
        }
    }

    function exportDictCsv() {
        if (dict.length === 0) { showToast('Словарь пуст', 'fa-exclamation-triangle'); return; }

        const headers = ['Слово', 'Значение', 'Пример', 'Категория', 'Избранное', 'Дата'];
        const rows = dict.map(w => {
            const cat = getCategoryInfo(w.category);
            return [
                w.word || '', w.meaning || '', w.example || '',
                cat.name, w.favorite ? 'да' : 'нет',
                new Date(w.createdAt).toLocaleDateString('ru-RU')
            ];
        });

        const BOM = '\uFEFF';
        const csv = BOM + [headers, ...rows]
            .map(r => r.map(cell => {
                const s = String(cell);
                return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
            }).join(';'))
            .join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `taskflow-dictionary-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('CSV экспортирован');
    }

    /* ========== РЕЖИМ ИЗУЧЕНИЯ ========== */

    function startStudy() {
        const reviewWords = dict.filter(w => w.review);
        const otherWords = dict.filter(w => !w.review && !w.know);
        const knowWords = dict.filter(w => w.know && !w.review);
        const queue = [...reviewWords, ...otherWords, ...knowWords];

        if (queue.length === 0) {
            showToast('Нет слов для изучения', 'fa-exclamation-triangle');
            return;
        }

        study = {
            active: true,
            queue: queue.map(w => w.id),
            index: 0,
            knowCount: 0,
            reviewCount: 0,
            originalTotal: queue.length
        };

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
        const progress = (study.index / study.queue.length) * 100;
        studyProgressFillEl.style.width = progress + '%';
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
        const lastDate = studyStats.lastStudy ? new Date(studyStats.lastStudy).toISOString().slice(0, 10) : null;
        const yesterday = new Date(Date.now() - DAY_MS).toISOString().slice(0, 10);

        if (lastDate === today) {}
        else if (lastDate === yesterday) studyStats.streak += 1;
        else studyStats.streak = 1;

        studyStats.lastStudy = Date.now();
        saveStudyStats();

        studyFinishedStatsEl.innerHTML = `
            <div>✅ Знаю: <strong>${study.knowCount}</strong></div>
            <div>🔁 Повторить: <strong>${study.reviewCount}</strong></div>
            <div>🔥 Дней подряд: <strong>${studyStats.streak}</strong></div>
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

    /* ========== ДЕЙСТВИЯ С ЗАДАЧАМИ ========== */

    function addTask() {
        const text = taskInput.value.trim();
        if (!text) return;

        const deadline = taskDate.value ? new Date(taskDate.value).getTime() : null;
        const repeat = taskRepeat.value;

        tasks.push({
            id: generateId(), text,
            completed: false,
            createdAt: Date.now(), completedAt: null,
            deadline, repeat, lastReset: Date.now()
        });

        taskInput.value = '';
        taskDate.value = '';
        taskRepeat.value = 'none';
        saveTasks();
        renderTasks();
        renderStats();
        taskInput.focus();
        showToast('Задача добавлена');
    }

    function toggleTask(id) {
        const task = tasks.find(t => t.id === id);
        if (!task) return;
        task.completed = !task.completed;
        task.completedAt = task.completed ? Date.now() : null;
        if (task.completed && task.repeat !== 'none') task.lastReset = Date.now();
        saveTasks();
        renderTasks();
        renderStats();
    }

    function deleteTask(id) {
        tasks = tasks.filter(t => t.id !== id);
        saveTasks();
        renderTasks();
        renderStats();
        showToast('Задача удалена', 'fa-trash-alt');
    }

    function resetTasks() {
        if (tasks.length === 0) return;
        if (!confirm('Удалить все задачи?')) return;
        tasks = [];
        saveTasks();
        renderTasks();
        renderStats();
        showToast('Задачи сброшены');
    }

    /* ========== ДЕЙСТВИЯ С ПРИВЫЧКАМИ ========== */

    function addHabit() {
        const text = habitInput.value.trim();
        if (!text) return;
        const target = Math.max(1, Math.min(365, parseInt(habitTarget.value) || 7));
        habits.push({ id: generateId(), text, streak: 0, target, lastCompleted: null, createdAt: Date.now() });
        habitInput.value = '';
        habitTarget.value = 7;
        saveHabits();
        renderHabits();
        renderStats();
        habitInput.focus();
        showToast('Привычка добавлена');
    }

    function incrementHabit(id) {
        const habit = habits.find(h => h.id === id);
        if (!habit) return;
        if (isCompletedToday(habit.lastCompleted)) {
            habit.streak = Math.max(0, habit.streak - 1);
            habit.lastCompleted = null;
        } else {
            habit.streak += 1;
            habit.lastCompleted = Date.now();
        }
        saveHabits();
        renderHabits();
        renderStats();
    }

    function deleteHabit(id) {
        habits = habits.filter(h => h.id !== id);
        saveHabits();
        renderHabits();
        renderStats();
        showToast('Привычка удалена', 'fa-trash-alt');
    }

    function resetHabits() {
        if (habits.length === 0) return;
        if (!confirm('Удалить все привычки?')) return;
        habits = [];
        saveHabits();
        renderHabits();
        renderStats();
        showToast('Привычки сброшены');
    }

    /* ========== ДЕЙСТВИЯ С ЗАКАЗАМИ ========== */

    function openOrderModal(id = null) {
        editingOrder = id;
        const order = id ? orders.find(o => o.id === id) : null;

        modalTitle.textContent = id ? 'Редактировать неделю' : 'Новая неделя';
        modalInput.style.display = 'none';
        modalInput.value = '';

        modalExtra.innerHTML = `
            <label class="modal-label">Неделя</label>
            <input type="text" id="ordWeek" class="modal-input" value="${order ? escapeHtml(order.week || '') : 'Неделя ' + (orders.length + 1)}">

            <div class="order-modal-grid">
                <div><label class="modal-label">Отправлено откликов</label>
                    <input type="number" id="ordResponses" class="modal-input" min="0" value="${order ? (order.responses || 0) : 0}"></div>
                <div><label class="modal-label">Ответов</label>
                    <input type="number" id="ordReplies" class="modal-input" min="0" value="${order ? (order.replies || 0) : 0}"></div>
                <div><label class="modal-label">Сделок</label>
                    <input type="number" id="ordDeals" class="modal-input" min="0" value="${order ? (order.deals || 0) : 0}"></div>
                <div><label class="modal-label">Доход, ₽</label>
                    <input type="number" id="ordIncome" class="modal-input" min="0" value="${order ? (order.income || 0) : 0}"></div>
                <div><label class="modal-label">На поддержке</label>
                    <input type="number" id="ordSupport" class="modal-input" min="0" value="${order ? (order.support || 0) : 0}"></div>
            </div>

            <label class="modal-label">Заметки</label>
            <textarea id="ordNotes" class="modal-input modal-textarea" rows="3">${order ? escapeHtml(order.notes || '') : ''}</textarea>
        `;

        modalOverlay.hidden = false;
        setTimeout(() => $('ordWeek').focus(), 50);
    }

    function saveOrderModal() {
        const week = $('ordWeek').value.trim();
        if (!week) { showToast('Укажите название недели', 'fa-exclamation-triangle'); return; }

        const data = {
            week,
            responses: Number($('ordResponses').value) || 0,
            replies: Number($('ordReplies').value) || 0,
            deals: Number($('ordDeals').value) || 0,
            income: Number($('ordIncome').value) || 0,
            support: Number($('ordSupport').value) || 0,
            notes: $('ordNotes').value.trim()
        };

        if (editingOrder) {
            const order = orders.find(o => o.id === editingOrder);
            if (order) Object.assign(order, data);
            showToast('Запись обновлена');
        } else {
            orders.push({ id: generateId(), ...data });
            showToast('Неделя добавлена');
        }
        saveOrders();
        renderOrders();
        editingOrder = null;
        closeModal();
    }

    function deleteOrder(id) {
        if (!confirm('Удалить запись?')) return;
        orders = orders.filter(o => o.id !== id);
        saveOrders();
        renderOrders();
        showToast('Запись удалена', 'fa-trash-alt');
    }

    function exportOrdersCsv() {
        if (orders.length === 0) { showToast('Нет данных', 'fa-exclamation-triangle'); return; }

        const headers = ['Неделя', 'Отправлено откликов', 'Ответов', 'Сделок', 'Доход', 'Средний чек', 'Клиентов на поддержке', 'Заметки'];
        const rows = orders.map(o => [
            o.week || '', o.responses || 0, o.replies || 0, o.deals || 0,
            o.income || 0, calcAvg(o.income, o.deals), o.support || 0,
            (o.notes || '').replace(/"/g, '""')
        ]);
        const { totalIncome, totalDeals, avgCheck } = getOrdersTotals();
        rows.push(['ИТОГО', '', '', totalDeals, totalIncome, avgCheck, '', '']);

        const BOM = '\uFEFF';
        const csv = BOM + [headers, ...rows]
            .map(r => r.map(cell => {
                const s = String(cell);
                return /[",;\n]/.test(s) ? `"${s}"` : s;
            }).join(';'))
            .join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `taskflow-orders-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('CSV экспортирован');
    }

    /* ========== ОБЩАЯ МОДАЛКА ========== */

    function openEditModal(type, id) {
        editing = { type, id };
        const item = type === 'task'
            ? tasks.find(t => t.id === id)
            : habits.find(h => h.id === id);

        if (!item) return;
        modalInput.style.display = 'block';
        modalTitle.textContent = type === 'task' ? 'Редактировать задачу' : 'Редактировать привычку';
        modalInput.value = item.text;

        if (type === 'task') {
            const dlValue = item.deadline ? new Date(item.deadline).toISOString().slice(0, 10) : '';
            modalExtra.innerHTML = `
                <label class="modal-label">Дедлайн</label>
                <input type="date" id="modalDeadline" class="modal-input" value="${dlValue}">
                <label class="modal-label">Повтор</label>
                <select id="modalRepeat" class="modal-input">
                    <option value="none" ${item.repeat === 'none' ? 'selected' : ''}>Не повторять</option>
                    <option value="daily" ${item.repeat === 'daily' ? 'selected' : ''}>Каждый день</option>
                    <option value="weekly" ${item.repeat === 'weekly' ? 'selected' : ''}>Каждую неделю</option>
                    <option value="monthly" ${item.repeat === 'monthly' ? 'selected' : ''}>Каждый месяц</option>
                </select>
            `;
        } else {
            modalExtra.innerHTML = `
                <label class="modal-label">Цель (дней)</label>
                <input type="number" id="modalTarget" class="modal-input" min="1" max="365" value="${item.target}">
            `;
        }
        modalOverlay.hidden = false;
        setTimeout(() => modalInput.focus(), 50);
    }

    function closeModal() {
        modalOverlay.hidden = true;
        editing = null;
        editingOrder = null;
        editingWord = null;
        editingGoal = null;
        editingJournal = null;
        modalInput.style.display = 'block';
        modalOverlay.dataset.parentId = '';
        modalOverlay.dataset.editGoalId = '';
    }

    function saveModal() {
        if ($('ordWeek')) { saveOrderModal(); return; }
        if ($('wWord')) { saveWordModal(); return; }
        if ($('goalTitle')) { saveGoalModal(); return; }
        if ($('journalText')) { saveJournalModal(); return; }

        if (!editing) return;
        const { type, id } = editing;
        const newText = modalInput.value.trim();
        if (!newText) { showToast('Название не может быть пустым', 'fa-exclamation-triangle'); return; }

        if (type === 'task') {
            const task = tasks.find(t => t.id === id);
            if (task) {
                task.text = newText;
                const dlEl = $('modalDeadline');
                const repEl = $('modalRepeat');
                task.deadline = dlEl && dlEl.value ? new Date(dlEl.value).getTime() : null;
                if (repEl) task.repeat = repEl.value;
            }
            saveTasks();
            renderTasks();
            renderStats();
        } else {
            const habit = habits.find(h => h.id === id);
            if (habit) {
                habit.text = newText;
                const tEl = $('modalTarget');
                if (tEl) habit.target = Math.max(1, Math.min(365, parseInt(tEl.value) || 7));
            }
            saveHabits();
            renderHabits();
            renderStats();
        }
        showToast('Сохранено');
        closeModal();
    }

    /* ========== ЭКСПОРТ / ИМПОРТ ========== */

    function exportData() {
        const data = {
            version: 9,
            exportedAt: new Date().toISOString(),
            tasks, habits, orders, goals, journal, dict
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `taskflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Экспортировано');
    }

    function importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!data || typeof data !== 'object') throw new Error('Неверный формат');

                const iT = Array.isArray(data.tasks) ? data.tasks : null;
                const iH = Array.isArray(data.habits) ? data.habits : null;
                const iO = Array.isArray(data.orders) ? data.orders : null;
                const iG = Array.isArray(data.goals) ? data.goals : null;
                const iJ = Array.isArray(data.journal) ? data.journal : null;
                const iD = Array.isArray(data.dict) ? data.dict : null;

                if (!iT && !iH && !iO && !iG && !iJ && !iD) throw new Error('Нет данных');
                if (!confirm('Импортировать данные? Текущие данные будут заменены.')) return;

                if (iT) tasks = iT;
                if (iH) habits = iH;
                if (iO) orders = iO;
                if (iG) goals = iG;
                if (iJ) journal = iJ;
                if (iD) dict = iD;

                saveTasks(); saveHabits(); saveOrders(); saveGoals(); saveJournal(); saveDict();
                renderTasks(); renderHabits(); renderOrders(); renderTree(); renderJournal(); renderDict();
                renderStrategyPickers();
                updateWordOfDay();
                renderChart();
                renderStats();
                showToast('Данные импортированы');
            } catch (err) {
                console.error(err);
                showToast('Ошибка импорта', 'fa-exclamation-triangle');
            }
        };
        reader.readAsText(file);
    }

    /* ========== СТАТИСТИКА ========== */

    function renderStats() {
        const now = Date.now();
        const weekAgo = now - WEEK_DAYS * DAY_MS;

        const completedWeek = tasks.filter(t => t.completed && (t.completedAt || t.createdAt) >= weekAgo).length;
        const createdWeek = tasks.filter(t => t.createdAt >= weekAgo).length;
        const activeGoals = goals.filter(g => g.status === 'active').length;

        $('statCompletedWeek').textContent = completedWeek;
        $('statCreatedWeek').textContent = createdWeek;
        $('statGoalsActive').textContent = activeGoals;
        $('statWordsTotal').textContent = dict.length;

        renderWeekChart();
    }

    function renderWeekChart() {
        const chart = $('weekChart');
        const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const data = [];
        for (let i = 6; i >= 0; i--) {
            const dayStart = today.getTime() - i * DAY_MS;
            const dayEnd = dayStart + DAY_MS;

            const completed = tasks.filter(t => t.completed && (t.completedAt || t.createdAt) >= dayStart && (t.completedAt || t.createdAt) < dayEnd).length;
            const habitActs = habits.reduce((sum, h) => sum + (h.streak > 0 && h.createdAt < dayEnd ? 1 : 0), 0);
            const words = dict.filter(w => w.createdAt >= dayStart && w.createdAt < dayEnd).length;
            const journalCount = journal.filter(j => j.date >= dayStart && j.date < dayEnd).length;

            const total = completed + Math.min(habitActs, 5) + words + journalCount;

            const date = new Date(dayStart);
            const dayName = days[(date.getDay() + 6) % 7];
            data.push({ label: dayName, value: total });
        }

        const max = Math.max(...data.map(d => d.value), 1);

        chart.innerHTML = data.map(d => {
            const height = (d.value / max) * 100;
            return `
                <div class="chart-bar-wrapper">
                    <div class="chart-value">${d.value || ''}</div>
                    <div class="chart-bar" style="height: ${height}%"></div>
                    <div class="chart-label">${d.label}</div>
                </div>
            `;
        }).join('');
    }

    /* ========== ДЕЛЕГИРОВАНИЕ СОБЫТИЙ ========== */

    taskListEl.addEventListener('click', (e) => {
        const t = e.target.closest('[data-action]');
        if (!t) return;
        const { action, id } = t.dataset;
        if (action === 'toggle-task') { e.stopPropagation(); toggleTask(id); }
        else if (action === 'delete-task') { e.stopPropagation(); deleteTask(id); }
        else if (action === 'edit-task' && t.tagName === 'BUTTON') { e.stopPropagation(); openEditModal('task', id); }
    });
    taskListEl.addEventListener('dblclick', (e) => {
        const textEl = e.target.closest('.item-text');
        if (textEl) {
            const card = textEl.closest('.item-card');
            if (card) openEditModal('task', card.dataset.id);
        }
    });

    habitListEl.addEventListener('click', (e) => {
        const t = e.target.closest('[data-action]');
        if (!t) return;
        const { action, id } = t.dataset;
        if (action === 'increment-habit') { e.stopPropagation(); incrementHabit(id); }
        else if (action === 'delete-habit') { e.stopPropagation(); deleteHabit(id); }
        else if (action === 'edit-habit' && t.tagName === 'BUTTON') { e.stopPropagation(); openEditModal('habit', id); }
    });
    habitListEl.addEventListener('dblclick', (e) => {
        const textEl = e.target.closest('.item-text');
        if (textEl) {
            const card = textEl.closest('.item-card');
            if (card) openEditModal('habit', card.dataset.id);
        }
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
        else if (action === 'delete-goal') deleteGoalById(id);
        else if (action === 'cycle-status') cycleGoalStatus(id);
        else if (action === 'toggle-goal-note') toggleGoalNote(id);
        else if (action === 'toggle-collapse') toggleCollapse(id);
    });

    journalListEl.addEventListener('click', (e) => {
        const t = e.target.closest('[data-action]');
        if (!t) return;
        const { action, id } = t.dataset;
        if (action === 'edit-journal') openJournalModal(id);
        else if (action === 'delete-journal') deleteJournalEntry(id);
    });

    journalQuickAdd.addEventListener('click', () => {
        const text = journalQuickInput.value.trim();
        const mood = journalMoodSelect.value;
        const goalId = journalGoalSelect.value || null;
        if (!text) { showToast('Напиши что-нибудь', 'fa-exclamation-triangle'); return; }
        addJournalEntry({ goalId, text, mood });
        journalQuickInput.value = '';
    });

    journalQuickInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') journalQuickAdd.click();
    });

    dictListEl.addEventListener('click', (e) => {
        const t = e.target.closest('[data-action]');
        if (!t) return;
        const { action, id } = t.dataset;
        if (action === 'toggle-favorite') { e.stopPropagation(); toggleFavorite(id); }
        else if (action === 'edit-word') { e.stopPropagation(); openWordModal(id); }
        else if (action === 'delete-word') { e.stopPropagation(); deleteWord(id); }
        else if (action === 'toggle-meaning') { e.stopPropagation(); toggleMeaningExpand(id); }
    });

    dictCategoriesEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.dict-cat-btn');
        if (!btn) return;
        dictCategory = btn.dataset.cat;
        renderDict();
    });

    wodToggleEl.addEventListener('click', () => {
        const isExpanded = wodMeaningEl.classList.toggle('expanded');
        const w = dict.find(x => x.id === wod.wordId);
        if (!w) return;
        if (isExpanded) {
            wodMeaningEl.textContent = w.meaning;
            wodToggleEl.classList.add('expanded');
            wodToggleEl.querySelector('span').textContent = 'Свернуть';
        } else {
            wodMeaningEl.textContent = truncateText(w.meaning, 140);
            wodToggleEl.classList.remove('expanded');
            wodToggleEl.querySelector('span').textContent = 'Показать полностью';
        }
    });

    [taskListEl, habitListEl].forEach((el) => {
        el.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            const target = e.target.closest('[data-action]');
            if (!target || target.tagName === 'BUTTON') return;
            e.preventDefault();
            target.click();
        });
    });

    /* ========== ФОРМЫ ========== */

    addTaskBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addTask(); });

    addHabitBtn.addEventListener('click', addHabit);
    habitInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addHabit(); });

    resetTasksBtn.addEventListener('click', resetTasks);
    resetHabitsBtn.addEventListener('click', resetHabits);

    addOrderBtn.addEventListener('click', () => openOrderModal(null));
    exportCsvBtn.addEventListener('click', exportOrdersCsv);

    addWordBtn.addEventListener('click', () => openWordModal(null));
    exportDictCsvBtn.addEventListener('click', exportDictCsv);

    addMainGoalBtn.addEventListener('click', () => openGoalModal(null, null));

    strategyCalcBtn.addEventListener('click', () => {
        calcModalOverlay.hidden = false;
    });
    calcModalClose.addEventListener('click', () => {
        calcModalOverlay.hidden = true;
    });
    calcModalOverlay.addEventListener('click', (e) => {
        if (e.target === calcModalOverlay) calcModalOverlay.hidden = true;
    });

    document.querySelectorAll('.strategy-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.strategy-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.strategy-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const mode = tab.dataset.mode;
            strategyMode = mode;
            $('strategy-' + mode).classList.add('active');

            if (mode === 'journal') {
                renderJournal();
                renderStrategyPickers();
                renderMoodSelect();
            }
            if (mode === 'chart') {
                renderStrategyPickers();
                renderChart();
            }
        });
    });

    if (chartGoalSelect) {
        chartGoalSelect.addEventListener('change', renderChart);
    }

    document.querySelectorAll('.calc-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.calc-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.calc-form').forEach(f => f.classList.remove('active'));
            tab.classList.add('active');
            $('calc-' + tab.dataset.calc).classList.add('active');
        });
    });

    $('calcMoneyBtn').addEventListener('click', calcMoney);
    $('calcBookBtn').addEventListener('click', calcBook);

    studyStartBtn.addEventListener('click', startStudy);
    studyExitBtn.addEventListener('click', exitStudy);
    showMeaningBtn.addEventListener('click', revealMeaning);
    knowBtn.addEventListener('click', markKnow);
    reviewBtn.addEventListener('click', markReview);
    studyRestartBtn.addEventListener('click', startStudy);

    document.querySelectorAll('.filter-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTasks();
        });
    });

    document.querySelectorAll('.dict-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.dict-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            dictFilter = btn.dataset.filter;
            renderDict();
        });
    });

    dictSearchEl.addEventListener('input', (e) => {
        dictSearchQuery = e.target.value.trim();
        renderDict();
    });

    document.querySelectorAll('.tab').forEach((tab) => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            const panel = $('panel-' + tab.dataset.tab);
            if (panel) panel.classList.add('active');

            if (tab.dataset.tab === 'stats') renderStats();
            if (tab.dataset.tab === 'orders') renderOrders();
            if (tab.dataset.tab === 'strategy') {
                if (strategyMode === 'tree') renderTree();
                if (strategyMode === 'journal') { renderJournal(); renderStrategyPickers(); renderMoodSelect(); }
                if (strategyMode === 'chart') { renderStrategyPickers(); renderChart(); }
            }
            if (tab.dataset.tab === 'dictionary') {
                renderDict();
                updateWordOfDay();
            }
        });
    });

    modalCancel.addEventListener('click', closeModal);
    modalSave.addEventListener('click', saveModal);
    modalInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') saveModal(); });
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (!modalOverlay.hidden) closeModal();
            if (!calcModalOverlay.hidden) calcModalOverlay.hidden = true;
        }
    });

    notifyBadge.addEventListener('click', requestNotificationPermission);

    window.addEventListener('storage', (e) => {
        if (e.key === TASKS_KEY) { loadFromStorage(); renderTasks(); renderStats(); }
        else if (e.key === HABITS_KEY) { loadFromStorage(); renderHabits(); renderStats(); }
        else if (e.key === ORDERS_KEY) { loadFromStorage(); renderOrders(); }
        else if (e.key === GOALS_KEY) { loadFromStorage(); renderTree(); renderStrategyPickers(); renderChart(); renderStats(); }
        else if (e.key === JOURNAL_KEY) { loadFromStorage(); renderJournal(); renderChart(); }
        else if (e.key === DICT_KEY) { loadFromStorage(); renderDict(); updateWordOfDay(); renderStats(); }
    });

    /* ========== PWA ========== */

    const isLocalhost = location.hostname === 'localhost' 
                     || location.hostname === '127.0.0.1'
                     || location.hostname === '';

    if ('serviceWorker' in navigator && !isLocalhost) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then((reg) => {
                    console.log('SW registered:', reg.scope);
                    setInterval(() => reg.update(), 5 * 60 * 1000);
                    reg.addEventListener('updatefound', () => {
                        const newWorker = reg.installing;
                        if (!newWorker) return;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                console.log('Новая версия TaskFlow загружена');
                                showToast('Обновление готово', 'fa-sync');
                                setTimeout(() => {
                                    newWorker.postMessage('SKIP_WAITING');
                                    window.location.reload();
                                }, 1500);
                            }
                        });
                    });
                })
                .catch((err) => console.warn('SW registration failed:', err));

            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (refreshing) return;
                refreshing = true;
                window.location.reload();
            });
        });
    } else if (isLocalhost && 'serviceWorker' in navigator) {
        console.log('%c⚙ SW отключён на localhost', 'color: #8e9bb8;');
        navigator.serviceWorker.getRegistrations().then(regs => {
            regs.forEach(reg => reg.unregister());
        });
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
        if (outcome === 'accepted') showToast('Приложение установлено', 'fa-download');
        deferredPrompt = null;
        installBadge.hidden = true;
    });

    window.addEventListener('appinstalled', () => {
        installBadge.hidden = true;
        showToast('TaskFlow установлен!', 'fa-check-circle');
    });

    if (window.matchMedia('(display-mode: standalone)').matches) {
        installBadge.hidden = true;
    }

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            processRepeats();
            checkDeadlines();
            if (strategyMode === 'chart') renderChart();
        }
    });

    /* ========== ИНИЦИАЛИЗАЦИЯ ========== */

    function init() {
        loadFromStorage();
        processRepeats();
        renderTasks();
        renderHabits();
        renderOrders();
        renderTree();
        renderJournal();
        renderMoodSelect();
        renderStrategyPickers();
        renderDict();
        updateWordOfDay();
        renderStats();
        renderChart();

        taskDate.min = todayStr();

        updateNotifyBadge();
        startDeadlineChecker();
        checkDeadlines();

        taskInput.focus();

        console.log('%c⚡ TaskFlow Premium v9', 'font-size: 16px; font-weight: bold; color: #6d8cff;');
        console.log('%c• Планировщик • Заказы • Стратегия • Словарь • Статистика', 'color: #8e9bb8;');
    }

    setInterval(processRepeats, 300000);

    init();
})();
