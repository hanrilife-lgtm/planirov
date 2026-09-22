(function () {
    'use strict';

    /* ========== КОНСТАНТЫ ========== */
    const TASKS_KEY = 'taskflow_tasks_v1';
    const HABITS_KEY = 'taskflow_habits_v1';
    const ORDERS_KEY = 'taskflow_orders_v1';
    const GOALS_KEY = 'taskflow_goals_v1';
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

    /* ========== СОСТОЯНИЕ ========== */
    let tasks = [];
    let habits = [];
    let orders = [];
    let goals = [];
    let dict = [];
    let wod = { date: null, wordId: null };
    let studyStats = { streak: 0, lastStudy: null };
    let currentFilter = 'all';
    let dictFilter = 'all';
    let dictCategory = 'all';
    let dictSearchQuery = '';
    let editing = null;
    let editingOrder = null;
    let editingWord = null;
    let notifiedIds = new Set();
    let checkTimer = null;

    // Состояние режима изучения
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

    const goalsListEl = $('goalsList');
    const goalsCountEl = $('goalsCount');

    // Словарь
    const dictListEl = $('dictList');
    const dictCountEl = $('dictCount');
    const dictSearchEl = $('dictSearch');
    const dictCategoriesEl = $('dictCategories');
    const addWordBtn = $('addWordBtn');
    const exportDictCsvBtn = $('exportDictCsvBtn');
    const studyStartBtn = $('studyStartBtn');

    // Слово дня
    const wordOfDayEl = $('wordOfDay');
    const wodWordEl = $('wodWord');
    const wodMeaningEl = $('wodMeaning');
    const wodToggleEl = $('wodToggle');
    const wodMetaEl = $('wodMeta');

    // Режим изучения
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

    /* ========== УТИЛИТЫ ========== */

    function generateId() {
        return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 11);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
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

    /* ========== LOCALSTORAGE ========== */

    function loadFromStorage() {
        try {
            const savedTasks = localStorage.getItem(TASKS_KEY);
            if (savedTasks) {
                const parsed = JSON.parse(savedTasks);
                tasks = Array.isArray(parsed) ? parsed : [];
            } else {
                tasks = [
                    { id: generateId(), text: 'Изучить новый фреймворк', completed: false, createdAt: Date.now(), completedAt: null, deadline: null, repeat: 'none', lastReset: null },
                    { id: generateId(), text: 'Провести встречу с командой', completed: true, createdAt: Date.now() - DAY_MS, completedAt: Date.now() - DAY_MS / 2, deadline: null, repeat: 'none', lastReset: null },
                    { id: generateId(), text: 'Записать видео для клиента', completed: false, createdAt: Date.now() - 2 * DAY_MS, completedAt: null, deadline: Date.now() + 2 * DAY_MS, repeat: 'none', lastReset: null },
                ];
            }

            const savedHabits = localStorage.getItem(HABITS_KEY);
            if (savedHabits) {
                const parsed = JSON.parse(savedHabits);
                habits = Array.isArray(parsed) ? parsed : [];
            } else {
                habits = [
                    { id: generateId(), text: 'Медитация 10 минут', streak: 3, target: 7, lastCompleted: null, createdAt: Date.now() },
                    { id: generateId(), text: 'Чтение 20 страниц', streak: 5, target: 10, lastCompleted: null, createdAt: Date.now() - DAY_MS },
                    { id: generateId(), text: 'Пить воду 2 литра', streak: 1, target: 7, lastCompleted: null, createdAt: Date.now() - 3 * DAY_MS },
                ];
            }

            const savedOrders = localStorage.getItem(ORDERS_KEY);
            if (savedOrders) {
                const parsed = JSON.parse(savedOrders);
                orders = Array.isArray(parsed) ? parsed : [];
            } else {
                orders = [
                    { id: generateId(), week: 'Неделя 1', responses: 20, replies: 5, deals: 1, income: 15000, support: 1, notes: 'Первая сделка, клиент доволен' },
                    { id: generateId(), week: 'Неделя 2', responses: 25, replies: 8, deals: 2, income: 34000, support: 2, notes: 'Два лендинга' },
                    { id: generateId(), week: 'Неделя 3', responses: 30, replies: 12, deals: 3, income: 52000, support: 3, notes: 'Пошли повторные обращения' },
                ];
            }

            const savedGoals = localStorage.getItem(GOALS_KEY);
            if (savedGoals) {
                const parsed = JSON.parse(savedGoals);
                goals = Array.isArray(parsed) ? parsed : [];
            } else {
                goals = [];
            }

            const savedDict = localStorage.getItem(DICT_KEY);
            if (savedDict) {
                const parsed = JSON.parse(savedDict);
                dict = Array.isArray(parsed) ? parsed : [];
            } else {
                dict = [
                    {
                        id: generateId(),
                        word: 'Рефлексия',
                        meaning: 'Способность человека осмыслять свои мысли, эмоции, действия и результаты, чтобы лучше понимать себя и корректировать поведение.',
                        example: 'После рефлексии я понял, что зря потратил неделю на бесполезные задачи.',
                        category: 'psychology',
                        favorite: true,
                        know: false,
                        review: false,
                        createdAt: Date.now()
                    },
                    {
                        id: generateId(),
                        word: 'Синергия',
                        meaning: 'Эффект, при котором результат взаимодействия нескольких элементов больше, чем простая сумма их отдельных результатов. 1 + 1 = 3.',
                        example: 'Командная работа дала синергию — мы сделали за неделю то, что по отдельности делали бы месяц.',
                        category: 'business',
                        favorite: false,
                        know: false,
                        review: false,
                        createdAt: Date.now() - DAY_MS
                    }
                ];
            }

            const savedWod = localStorage.getItem(WOD_KEY);
            if (savedWod) {
                try { wod = JSON.parse(savedWod); } catch (e) { wod = { date: null, wordId: null }; }
            }

            const savedStudy = localStorage.getItem(STUDY_KEY);
            if (savedStudy) {
                try { studyStats = JSON.parse(savedStudy); } catch (e) { studyStats = { streak: 0, lastStudy: null }; }
            }

            const savedNotified = localStorage.getItem(NOTIFIED_KEY);
            if (savedNotified) {
                notifiedIds = new Set(JSON.parse(savedNotified));
            }
        } catch (e) {
            console.error('Ошибка загрузки:', e);
            tasks = []; habits = []; orders = []; goals = []; dict = [];
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

    function saveDict() {
        try { localStorage.setItem(DICT_KEY, JSON.stringify(dict)); }
        catch (e) { console.error(e); showToast('Хранилище заполнено', 'fa-exclamation-triangle'); }
    }

    function saveWod() {
        try { localStorage.setItem(WOD_KEY, JSON.stringify(wod)); }
        catch (e) {}
    }

    function saveStudyStats() {
        try { localStorage.setItem(STUDY_KEY, JSON.stringify(studyStats)); }
        catch (e) {}
    }

    function saveNotified() {
        try { localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...notifiedIds])); }
        catch (e) {}
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

    function isNotificationSupported() {
        return 'Notification' in window;
    }

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
        if (!isNotificationSupported()) {
            notifyBadge.hidden = true;
            return;
        }
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

    /* ========== РЕНДЕР ЦЕЛЕЙ ========== */

    function renderGoals() {
        goalsCountEl.textContent = goals.length;

        if (goals.length === 0) {
            goalsListEl.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bullseye"></i>
                    <span>Рассчитайте что-то и зафиксируйте как цель</span>
                </div>
            `;
            return;
        }

        const icons = { money: 'fa-coins', book: 'fa-book' };

        goalsListEl.innerHTML = goals.map(g => {
            const daysPassed = Math.floor((Date.now() - g.startDate) / DAY_MS);
            const progress = Math.min((daysPassed / g.totalDays) * 100, 100);
            const daysLeft = Math.max(g.totalDays - daysPassed, 0);

            return `
                <div class="goal-card" data-id="${g.id}">
                    <div class="goal-card-header">
                        <div class="goal-card-title">
                            <i class="fas ${icons[g.type] || 'fa-flag'}"></i>
                            ${escapeHtml(g.title)}
                        </div>
                        <div class="goal-card-actions">
                            <button class="icon-btn delete" data-action="delete-goal" data-id="${g.id}" aria-label="Удалить">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                    <div class="goal-card-info">
                        <span><i class="fas fa-info-circle"></i> ${escapeHtml(g.info)}</span>
                        <span><i class="fas fa-hourglass-half"></i> Осталось: <strong>${pluralizeTime(daysLeft)}</strong></span>
                    </div>
                    <div class="goal-progress-bar">
                        <div class="goal-progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <div class="goal-progress-label">Прогресс: ${Math.round(progress)}% · ${daysPassed} из ${g.totalDays} дней</div>
                </div>
            `;
        }).join('');
    }

    /* ========== СЛОВАРЬ: рендер категорий ========== */

    function renderDictCategories() {
        const counts = {};
        dict.forEach(w => {
            counts[w.category] = (counts[w.category] || 0) + 1;
        });

        let html = `
            <button class="dict-cat-btn ${dictCategory === 'all' ? 'active' : ''}" data-cat="all">
                <i class="fas fa-layer-group"></i> Все (${dict.length})
            </button>
        `;

        CATEGORIES.forEach(cat => {
            const count = counts[cat.id] || 0;
            if (count === 0 && dictCategory !== cat.id) return; // скрываем пустые
            html += `
                <button class="dict-cat-btn ${dictCategory === cat.id ? 'active' : ''}" data-cat="${cat.id}">
                    <i class="fas ${cat.icon}"></i> ${cat.name} (${count})
                </button>
            `;
        });

        dictCategoriesEl.innerHTML = html;
    }

    /* ========== СЛОВАРЬ: рендер списка ========== */

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

    function truncateText(text, maxLen = 140) {
        if (!text) return '';
        if (text.length <= maxLen) return text;
        return text.slice(0, maxLen).trim() + '...';
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
            const displayMeaning = needsTruncate ? truncateText(w.meaning) : w.meaning;

            return `
                <div class="dict-card" data-id="${w.id}">
                    <div class="dict-card-header">
                        <div class="dict-card-title">
                            <span class="dict-card-word">${escapeHtml(w.word)}</span>
                            <button class="dict-card-star ${w.favorite ? 'active' : ''}"
                                    data-action="toggle-favorite" data-id="${w.id}"
                                    aria-label="Избранное">
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

                    ${w.example ? `
                        <div class="dict-card-example">${escapeHtml(w.example)}</div>
                    ` : ''}

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
        if (dict.length === 0) {
            wordOfDayEl.hidden = true;
            return;
        }

        const today = todayStr();

        // Если сегодня ещё не выбирали или слово удалили — выбираем новое
        let word = wod.wordId ? dict.find(w => w.id === wod.wordId) : null;
        const needNew = wod.date !== today || !word;

        if (needNew) {
            // Выбираем случайное
            const randomIndex = Math.floor(Math.random() * dict.length);
            word = dict[randomIndex];
            wod = { date: today, wordId: word.id };
            saveWod();
        }

        wordOfDayEl.hidden = false;
        wodWordEl.textContent = word.word;
        wodMeaningEl.textContent = word.meaning;
        wodMeaningEl.classList.remove('expanded');

        const cat = getCategoryInfo(word.category);
        wodMetaEl.innerHTML = `
            <span><i class="fas ${cat.icon}"></i> ${cat.name}</span>
            <span><i class="far fa-clock"></i> ${formatDate(word.createdAt)}</span>
        `;

        // Показываем/скрываем кнопку "Показать полностью"
        const needsToggle = (word.meaning || '').length > 140;
        wodToggleEl.style.display = needsToggle ? 'inline-flex' : 'none';
        wodToggleEl.classList.remove('expanded');
        wodToggleEl.querySelector('span').textContent = 'Показать полностью';

        // Если нужно — обрезаем
        if (needsToggle) {
            wodMeaningEl.textContent = truncateText(word.meaning);
        } else {
            wodMeaningEl.textContent = word.meaning;
        }
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
            <select id="wCategory" class="modal-input">
                ${categoriesOptions}
            </select>

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

        if (!word) {
            showToast('Введите слово', 'fa-exclamation-triangle');
            return;
        }
        if (!meaning) {
            showToast('Введите значение', 'fa-exclamation-triangle');
            return;
        }

        const data = { word, meaning, example, category, favorite };

        if (editingWord) {
            const w = dict.find(x => x.id === editingWord);
            if (w) Object.assign(w, data);
            showToast('Слово обновлено');
        } else {
            dict.unshift({
                id: generateId(),
                ...data,
                know: false,
                review: false,
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
            meaningEl.textContent = truncateText(w.meaning);
            if (btn) {
                btn.classList.remove('expanded');
                btn.querySelector('span').textContent = 'Показать полностью';
            }
        }
    }

    /* ========== ЭКСПОРТ СЛОВАРЯ В CSV ========== */

    function exportDictCsv() {
        if (dict.length === 0) {
            showToast('Словарь пуст', 'fa-exclamation-triangle');
            return;
        }

        const headers = ['Слово', 'Значение', 'Пример', 'Категория', 'Избранное', 'Дата'];
        const rows = dict.map(w => {
            const cat = getCategoryInfo(w.category);
            return [
                w.word || '',
                w.meaning || '',
                w.example || '',
                cat.name,
                w.favorite ? 'да' : 'нет',
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
        const date = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `taskflow-dictionary-${date}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('CSV экспортирован');
    }

    /* ========== РЕЖИМ ИЗУЧЕНИЯ ========== */

    function startStudy() {
        // Формируем очередь: сначала слова с review=true, потом остальные
        const reviewWords = dict.filter(w => w.review);
        const otherWords = dict.filter(w => !w.review && !w.know);
        const knowWords = dict.filter(w => w.know && !w.review);

        // Очередь: приоритет — review, потом обычные, потом уже знакомые (для закрепления)
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

        // Показываем режим изучения
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
        if (study.index >= study.queue.length) {
            finishStudy();
            return;
        }

        const w = dict.find(x => x.id === study.queue[study.index]);
        if (!w) {
            // Слово удалили — пропускаем
            study.index++;
            showStudyCard();
            return;
        }

        const cat = getCategoryInfo(w.category);

        studyCategoryEl.textContent = cat.name;
        studyWordEl.textContent = w.word;
        studyMeaningEl.textContent = w.meaning;
        studyMeaningEl.hidden = true;
        studyActionsEl.hidden = true;
        showMeaningBtn.hidden = false;

        studyCounterEl.textContent = `${study.index + 1} / ${study.queue.length}`;

        const progress = ((study.index) / study.queue.length) * 100;
        studyProgressFillEl.style.width = progress + '%';
    }

    function revealMeaning() {
        studyMeaningEl.hidden = false;
        studyActionsEl.hidden = false;
        showMeaningBtn.hidden = true;
    }

    function markKnow() {
        const w = dict.find(x => x.id === study.queue[study.index]);
        if (w) {
            w.know = true;
            w.review = false;
        }
        study.knowCount++;
        study.index++;
        saveDict();
        showStudyCard();
    }

    function markReview() {
        const w = dict.find(x => x.id === study.queue[study.index]);
        if (w) {
            w.review = true;
            w.know = false;
        }
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

        // Обновляем стрик изучения
        const today = todayStr();
        const lastDate = studyStats.lastStudy ? new Date(studyStats.lastStudy).toISOString().slice(0, 10) : null;
        const yesterday = new Date(Date.now() - DAY_MS).toISOString().slice(0, 10);

        if (lastDate === today) {
            // Уже занимались сегодня — стрик не меняем
        } else if (lastDate === yesterday) {
            studyStats.streak += 1;
        } else {
            studyStats.streak = 1;
        }
        studyStats.lastStudy = Date.now();
        saveStudyStats();

        studyFinishedStatsEl.innerHTML = `
            <div>✅ Знаю: <strong>${study.knowCount}</strong></div>
            <div>🔁 Повторить: <strong>${study.reviewCount}</strong></div>
            <div>🔥 Дней подряд: <strong>${studyStats.streak}</strong></div>
        `;

        // Обновляем список слов и статистику
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

    /* ========== КАЛЬКУЛЯТОРЫ ========== */

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
        const per5Years = perYear * 5;

        let resultHTML = `
            <div class="calc-result-main">${formatNumber(perYear)} ₽</div>
            <div class="calc-result-label">Накопите за год, если откладываете ${formatNumber(amount)} ₽ ${periodLabel}</div>
            <div class="calc-result-details">
                <div class="calc-detail">
                    <div class="calc-detail-value">${formatNumber(perMonth)} ₽</div>
                    <div class="calc-detail-label">За месяц</div>
                </div>
                <div class="calc-detail">
                    <div class="calc-detail-value">${formatNumber(per5Years)} ₽</div>
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

        resultHTML += `
            <button class="btn-save-goal" data-goal-type="money"
                data-title="Накопления: ${formatNumber(perYear)} ₽ за год"
                data-info="Откладываю ${formatNumber(amount)} ₽ ${periodLabel}">
                <i class="fas fa-flag"></i> Зафиксировать как цель
            </button>
        `;

        const resultEl = $('moneyResult');
        resultEl.innerHTML = resultHTML;
        resultEl.hidden = false;

        resultEl.querySelector('.btn-save-goal').addEventListener('click', (e) => {
            addGoal({
                type: 'money',
                title: e.target.dataset.title,
                info: e.target.dataset.info,
                totalDays: goalSum > 0 ? Math.ceil(goalSum / perDay) : 365
            });
        });
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
            <button class="btn-save-goal" data-goal-type="book"
                data-title="Чтение: книга за ${pluralizeTime(daysToFinish)}"
                data-info="Читаю ${amount} ${periodLabel}">
                <i class="fas fa-flag"></i> Зафиксировать как цель
            </button>
        `;
        resultEl.hidden = false;

        resultEl.querySelector('.btn-save-goal').addEventListener('click', (e) => {
            addGoal({
                type: 'book',
                title: e.target.dataset.title,
                info: e.target.dataset.info,
                totalDays: daysToFinish
            });
        });
    }

    /* ========== УПРАВЛЕНИЕ ЦЕЛЯМИ ========== */

    function addGoal(data) {
        goals.unshift({
            id: generateId(),
            type: data.type,
            title: data.title,
            info: data.info,
            totalDays: data.totalDays,
            createdAt: Date.now(),
            startDate: Date.now()
        });
        saveGoals();
        renderGoals();
        showToast('Цель зафиксирована');

        if (isNotificationSupported() && Notification.permission === 'granted') {
            try {
                new Notification('🎯 Новая цель', {
                    body: data.title,
                    icon: 'icons/web-app-manifest-192x192.png'
                });
            } catch (e) {}
        }
    }

    function deleteGoal(id) {
        if (!confirm('Удалить цель?')) return;
        goals = goals.filter(g => g.id !== id);
        saveGoals();
        renderGoals();
        showToast('Цель удалена', 'fa-trash-alt');
    }

    /* ========== СТАТИСТИКА ========== */

    function renderStats() {
        const now = Date.now();
        const weekAgo = now - WEEK_DAYS * DAY_MS;

        const completedWeek = tasks.filter(t => t.completed && (t.completedAt || t.createdAt) >= weekAgo).length;
        const createdWeek = tasks.filter(t => t.createdAt >= weekAgo).length;
        const bestStreak = habits.length > 0 ? Math.max(...habits.map(h => h.streak)) : 0;

        $('statCompletedWeek').textContent = completedWeek;
        $('statCreatedWeek').textContent = createdWeek;
        $('statBestStreak').textContent = bestStreak;
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

            const total = completed + Math.min(habitActs, 5) + words;

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

    /* ========== ДЕЙСТВИЯ С ЗАДАЧАМИ ========== */

    function addTask() {
        const text = taskInput.value.trim();
        if (!text) return;

        const deadline = taskDate.value ? new Date(taskDate.value).getTime() : null;
        const repeat = taskRepeat.value;

        tasks.push({
            id: generateId(),
            text, completed: false,
            createdAt: Date.now(),
            completedAt: null,
            deadline, repeat,
            lastReset: Date.now()
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
        habits.push({
            id: generateId(),
            text, streak: 0, target,
            lastCompleted: null,
            createdAt: Date.now()
        });
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

    /* ========== МОДАЛЬНОЕ ОКНО (общее) ========== */

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
        modalInput.style.display = 'block';
    }

    function saveModal() {
        if ($('ordWeek')) { saveOrderModal(); return; }
        if ($('wWord')) { saveWordModal(); return; }

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
            version: 7,
            exportedAt: new Date().toISOString(),
            tasks, habits, orders, goals, dict
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
                const iD = Array.isArray(data.dict) ? data.dict : null;

                if (!iT && !iH && !iO && !iG && !iD) throw new Error('Нет данных');
                if (!confirm('Импортировать данные? Текущие данные будут заменены.')) return;

                if (iT) tasks = iT;
                if (iH) habits = iH;
                if (iO) orders = iO;
                if (iG) goals = iG;
                if (iD) dict = iD;

                saveTasks(); saveHabits(); saveOrders(); saveGoals(); saveDict();
                renderTasks(); renderHabits(); renderOrders(); renderGoals(); renderDict();
                updateWordOfDay();
                renderStats();
                showToast('Данные импортированы');
            } catch (err) {
                console.error(err);
                showToast('Ошибка импорта', 'fa-exclamation-triangle');
            }
        };
        reader.readAsText(file);
    }

    /* ========== ДЕЛЕГИРОВАНИЕ СОБЫТИЙ ========== */

    // Задачи
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

    // Привычки
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

    // Заказы
    [ordersBodyEl, ordersCardsEl].forEach(el => {
        el.addEventListener('click', (e) => {
            const t = e.target.closest('[data-action]');
            if (!t) return;
            const { action, id } = t.dataset;
            if (action === 'edit-order') openOrderModal(id);
            else if (action === 'delete-order') deleteOrder(id);
        });
    });

    // Цели
    goalsListEl.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action="delete-goal"]');
        if (btn) deleteGoal(btn.dataset.id);
    });

    // Словарь
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

    // Слово дня
    wodToggleEl.addEventListener('click', () => {
        const isExpanded = wodMeaningEl.classList.toggle('expanded');
        const w = dict.find(x => x.id === wod.wordId);
        if (!w) return;

        if (isExpanded) {
            wodMeaningEl.textContent = w.meaning;
            wodToggleEl.classList.add('expanded');
            wodToggleEl.querySelector('span').textContent = 'Свернуть';
        } else {
            wodMeaningEl.textContent = truncateText(w.meaning);
            wodToggleEl.classList.remove('expanded');
            wodToggleEl.querySelector('span').textContent = 'Показать полностью';
        }
    });

    // Клавиатура
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

    exportBtn.addEventListener('click', exportData);
    importBtn.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) importData(file);
        e.target.value = '';
    });

    // Поиск и фильтры словаря
    dictSearchEl.addEventListener('input', (e) => {
        dictSearchQuery = e.target.value.trim();
        renderDict();
    });

    document.querySelectorAll('.dict-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.dict-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            dictFilter = btn.dataset.filter;
            renderDict();
        });
    });

    // Калькуляторы
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

    // Режим изучения
    studyStartBtn.addEventListener('click', startStudy);
    studyExitBtn.addEventListener('click', exitStudy);
    showMeaningBtn.addEventListener('click', revealMeaning);
    knowBtn.addEventListener('click', markKnow);
    reviewBtn.addEventListener('click', markReview);
    studyRestartBtn.addEventListener('click', startStudy);

    // Фильтры задач
    document.querySelectorAll('.filter-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTasks();
        });
    });

    // Вкладки
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
            if (tab.dataset.tab === 'goals') renderGoals();
            if (tab.dataset.tab === 'dictionary') {
                renderDict();
                updateWordOfDay();
            }
        });
    });

    // Модальное окно
    modalCancel.addEventListener('click', closeModal);
    modalSave.addEventListener('click', saveModal);
    modalInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') saveModal(); });
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modalOverlay.hidden) closeModal();
    });

    // Уведомления
    notifyBadge.addEventListener('click', requestNotificationPermission);

    // Синхронизация вкладок
    window.addEventListener('storage', (e) => {
        if (e.key === TASKS_KEY) { loadFromStorage(); renderTasks(); renderStats(); }
        else if (e.key === HABITS_KEY) { loadFromStorage(); renderHabits(); renderStats(); }
        else if (e.key === ORDERS_KEY) { loadFromStorage(); renderOrders(); }
        else if (e.key === GOALS_KEY) { loadFromStorage(); renderGoals(); }
        else if (e.key === DICT_KEY) { loadFromStorage(); renderDict(); updateWordOfDay(); renderStats(); }
    });

    /* ========== PWA ========== */

    const isLocalhost = location.hostname === 'localhost' 
                     || location.hostname === '127.0.0.1'
                     || location.hostname === '';

    if ('serviceWorker' in navigator && !isLocalhost) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then((reg) => console.log('SW registered:', reg.scope))
                .catch((err) => console.warn('SW registration failed:', err));
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
            renderGoals();
            updateWordOfDay();
        }
    });

    /* ========== ИНИЦИАЛИЗАЦИЯ ========== */

    function init() {
        loadFromStorage();
        processRepeats();
        renderTasks();
        renderHabits();
        renderOrders();
        renderGoals();
        renderDict();
        updateWordOfDay();
        renderStats();

        taskDate.min = todayStr();

        updateNotifyBadge();
        startDeadlineChecker();
        checkDeadlines();

        taskInput.focus();

        console.log('%c⚡ TaskFlow Premium v7', 'font-size: 16px; font-weight: bold; color: #6d8cff;');
        console.log('%c• Планировщик • Заказы • Цели • Словарь • Статистика', 'color: #8e9bb8;');
        console.log('%c• Игра-карточки • Слово дня • CSV • PWA', 'color: #8e9bb8;');
    }

    setInterval(processRepeats, 300000);

    init();
})();
