
(function () {
    'use strict';

    /* ========== КОНСТАНТЫ ========== */
    const TASKS_KEY = 'taskflow_tasks_v1';
    const HABITS_KEY = 'taskflow_habits_v1';
    const ORDERS_KEY = 'taskflow_orders_v1';
    const NOTIF_KEY = 'taskflow_notifications_enabled';
    const NOTIFIED_KEY = 'taskflow_notified_ids';
    const DAY_MS = 86400000;
    const WEEK_DAYS = 7;
    const CHECK_INTERVAL = 60000;

    /* ========== СОСТОЯНИЕ ========== */
    let tasks = [];
    let habits = [];
    let orders = [];
    let currentFilter = 'all';
    let editing = null;
    let editingOrder = null;
    let notifiedIds = new Set();
    let checkTimer = null;

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

            const savedNotified = localStorage.getItem(NOTIFIED_KEY);
            if (savedNotified) {
                notifiedIds = new Set(JSON.parse(savedNotified));
            }
        } catch (e) {
            console.error('Ошибка загрузки:', e);
            tasks = [];
            habits = [];
            orders = [];
        }
    }

    function saveTasks() {
        try { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)); }
        catch (e) {
            console.error('Ошибка сохранения задач:', e);
            showToast('Хранилище заполнено', 'fa-exclamation-triangle');
        }
    }

    function saveHabits() {
        try { localStorage.setItem(HABITS_KEY, JSON.stringify(habits)); }
        catch (e) {
            console.error('Ошибка сохранения привычек:', e);
            showToast('Хранилище заполнено', 'fa-exclamation-triangle');
        }
    }

    function saveOrders() {
        try { localStorage.setItem(ORDERS_KEY, JSON.stringify(orders)); }
        catch (e) {
            console.error('Ошибка сохранения заказов:', e);
            showToast('Хранилище заполнено', 'fa-exclamation-triangle');
        }
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
                        body: 'Уведомления активированы! Мы напомним о задачах с дедлайном.',
                        icon: 'icons/web-app-manifest-192x192.png',
                        badge: 'icons/web-app-manifest-192x192.png'
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
            showToast('Ошибка запроса разрешения', 'fa-exclamation-triangle');
            return false;
        }
    }

    function updateNotifyBadge() {
        if (!isNotificationSupported()) {
            notifyBadge.hidden = true;
            return;
        }
        const perm = getNotificationPermission();
        notifyBadge.hidden = (perm === 'granted');
    }

    function sendNotification(title, options = {}) {
        if (!isNotificationSupported()) return;
        if (Notification.permission !== 'granted') return;

        try {
            const notif = new Notification(title, {
                icon: 'icons/web-app-manifest-192x192.png',
                badge: 'icons/web-app-manifest-192x192.png',
                ...options
            });

            notif.onclick = () => {
                window.focus();
                notif.close();
            };
        } catch (e) {
            console.warn('Notification failed:', e);
        }
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
                const timeStr = new Date(dl).toLocaleDateString('ru-RU', {
                    day: 'numeric', month: 'long'
                });

                const title = isOverdue ? '⚠️ Задача просрочена' : '📌 Напоминание';
                const body = isOverdue
                    ? `"${task.text}" — дедлайн был ${timeStr}`
                    : `"${task.text}" — дедлайн сегодня`;

                sendNotification(title, {
                    body,
                    tag: task.id,
                    requireInteraction: true
                });

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
                         data-action="toggle-task"
                         data-id="${task.id}"
                         role="checkbox"
                         aria-checked="${task.completed}"
                         tabindex="0">
                        <i class="fas fa-check"></i>
                    </div>
                    <div class="item-content">
                        <div class="item-text ${task.completed ? 'completed-text' : ''}"
                             data-action="edit-task"
                             data-id="${task.id}"
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
                         data-action="increment-habit"
                         data-id="${habit.id}"
                         title="${doneToday ? 'Уже отмечено сегодня' : 'Отметить выполнение'}"
                         role="button"
                         tabindex="0">
                        <span class="habit-progress">${habit.streak}</span>
                    </div>
                    <div class="item-content">
                        <div class="item-text"
                             data-action="edit-habit"
                             data-id="${habit.id}"
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

        // Таблица (десктоп)
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

        // Итоговая строка
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

        // Карточки (мобильные)
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

    /* ========== СТАТИСТИКА ========== */

    function renderStats() {
        const now = Date.now();
        const weekAgo = now - WEEK_DAYS * DAY_MS;

        const completedWeek = tasks.filter(t => t.completed && (t.completedAt || t.createdAt) >= weekAgo).length;
        const createdWeek = tasks.filter(t => t.createdAt >= weekAgo).length;
        const bestStreak = habits.length > 0 ? Math.max(...habits.map(h => h.streak)) : 0;
        const rate = createdWeek > 0 ? Math.round((completedWeek / createdWeek) * 100) : 0;

        $('statCompletedWeek').textContent = completedWeek;
        $('statCreatedWeek').textContent = createdWeek;
        $('statBestStreak').textContent = bestStreak;
        $('statRate').textContent = Math.min(rate, 100) + '%';

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

            const total = completed + Math.min(habitActs, 5);

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
            text,
            completed: false,
            createdAt: Date.now(),
            completedAt: null,
            deadline,
            repeat,
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

        if (task.completed && task.repeat !== 'none') {
            task.lastReset = Date.now();
        }

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
        if (!confirm('Удалить все задачи? Действие нельзя отменить.')) return;
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
            text,
            streak: 0,
            target,
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
        if (!confirm('Удалить все привычки? Действие нельзя отменить.')) return;
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
            <input type="text" id="ordWeek" class="modal-input" value="${order ? escapeHtml(order.week || '') : 'Неделя ' + (orders.length + 1)}" placeholder="Например: Неделя 1">

            <div class="order-modal-grid">
                <div>
                    <label class="modal-label">Отправлено откликов</label>
                    <input type="number" id="ordResponses" class="modal-input" min="0" value="${order ? (order.responses || 0) : 0}">
                </div>
                <div>
                    <label class="modal-label">Ответов</label>
                    <input type="number" id="ordReplies" class="modal-input" min="0" value="${order ? (order.replies || 0) : 0}">
                </div>
                <div>
                    <label class="modal-label">Сделок</label>
                    <input type="number" id="ordDeals" class="modal-input" min="0" value="${order ? (order.deals || 0) : 0}">
                </div>
                <div>
                    <label class="modal-label">Доход, ₽</label>
                    <input type="number" id="ordIncome" class="modal-input" min="0" value="${order ? (order.income || 0) : 0}">
                </div>
                <div>
                    <label class="modal-label">Клиентов на поддержке</label>
                    <input type="number" id="ordSupport" class="modal-input" min="0" value="${order ? (order.support || 0) : 0}">
                </div>
            </div>

            <label class="modal-label">Заметки</label>
            <textarea id="ordNotes" class="modal-input modal-textarea" rows="3" placeholder="Что важного было на этой неделе...">${order ? escapeHtml(order.notes || '') : ''}</textarea>
        `;

        modalOverlay.hidden = false;
        setTimeout(() => $('ordWeek').focus(), 50);
    }

    function saveOrderModal() {
        const week = $('ordWeek').value.trim();
        if (!week) {
            showToast('Укажите название недели', 'fa-exclamation-triangle');
            return;
        }

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
        if (orders.length === 0) {
            showToast('Нет данных для экспорта', 'fa-exclamation-triangle');
            return;
        }

        const headers = ['Неделя', 'Отправлено откликов', 'Ответов', 'Сделок', 'Доход', 'Средний чек', 'Клиентов на поддержке', 'Заметки'];
        const rows = orders.map(o => [
            o.week || '',
            o.responses || 0,
            o.replies || 0,
            o.deals || 0,
            o.income || 0,
            calcAvg(o.income, o.deals),
            o.support || 0,
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
        const date = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `taskflow-orders-${date}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('CSV экспортирован');
    }

    /* ========== МОДАЛЬНОЕ ОКНО ========== */

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
        modalInput.style.display = 'block';
    }

    function saveModal() {
        // Если открыт режим заказа — идём в свою ветку
        if (editingOrder || $('ordWeek')) {
            saveOrderModal();
            return;
        }

        if (!editing) return;
        const { type, id } = editing;
        const newText = modalInput.value.trim();

        if (!newText) {
            showToast('Название не может быть пустым', 'fa-exclamation-triangle');
            return;
        }

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
            version: 4,
            exportedAt: new Date().toISOString(),
            tasks,
            habits,
            orders
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const date = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `taskflow-backup-${date}.json`;
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

                const importTasks = Array.isArray(data.tasks) ? data.tasks : null;
                const importHabits = Array.isArray(data.habits) ? data.habits : null;
                const importOrders = Array.isArray(data.orders) ? data.orders : null;

                if (!importTasks && !importHabits && !importOrders) throw new Error('Нет данных');

                if (!confirm('Импортировать данные? Текущие данные будут заменены.')) return;

                if (importTasks) tasks = importTasks;
                if (importHabits) habits = importHabits;
                if (importOrders) orders = importOrders;

                saveTasks();
                saveHabits();
                saveOrders();
                renderTasks();
                renderHabits();
                renderOrders();
                renderStats();
                showToast('Данные импортированы');
            } catch (err) {
                console.error(err);
                showToast('Ошибка импорта файла', 'fa-exclamation-triangle');
            }
        };
        reader.readAsText(file);
    }

    /* ========== ДЕЛЕГИРОВАНИЕ СОБЫТИЙ ========== */

    function handleTaskClick(e) {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;
        const id = target.dataset.id;

        if (action === 'toggle-task') {
            e.stopPropagation();
            toggleTask(id);
        } else if (action === 'delete-task') {
            e.stopPropagation();
            deleteTask(id);
        }
    }

    function handleHabitClick(e) {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;
        const id = target.dataset.id;

        if (action === 'increment-habit') {
            e.stopPropagation();
            incrementHabit(id);
        } else if (action === 'delete-habit') {
            e.stopPropagation();
            deleteHabit(id);
        }
    }

    function handleTaskDblClick(e) {
        const editBtn = e.target.closest('button[data-action="edit-task"]');
        if (editBtn) {
            openEditModal('task', editBtn.dataset.id);
            return;
        }
        const textEl = e.target.closest('.item-text');
        if (textEl) {
            const card = textEl.closest('.item-card');
            if (card) openEditModal('task', card.dataset.id);
        }
    }

    function handleHabitDblClick(e) {
        const editBtn = e.target.closest('button[data-action="edit-habit"]');
        if (editBtn) {
            openEditModal('habit', editBtn.dataset.id);
            return;
        }
        const textEl = e.target.closest('.item-text');
        if (textEl) {
            const card = textEl.closest('.item-card');
            if (card) openEditModal('habit', card.dataset.id);
        }
    }

    function handleTaskClickForEdit(e) {
        const btn = e.target.closest('button[data-action="edit-task"]');
        if (btn) {
            e.stopPropagation();
            openEditModal('task', btn.dataset.id);
        }
    }

    function handleHabitClickForEdit(e) {
        const btn = e.target.closest('button[data-action="edit-habit"]');
        if (btn) {
            e.stopPropagation();
            openEditModal('habit', btn.dataset.id);
        }
    }

    taskListEl.addEventListener('click', handleTaskClick);
    taskListEl.addEventListener('click', handleTaskClickForEdit);
    taskListEl.addEventListener('dblclick', handleTaskDblClick);

    habitListEl.addEventListener('click', handleHabitClick);
    habitListEl.addEventListener('click', handleHabitClickForEdit);
    habitListEl.addEventListener('dblclick', handleHabitDblClick);

    // Делегирование для заказов (таблица + карточки)
    [ordersBodyEl, ordersCardsEl].forEach(el => {
        el.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;
            const { action, id } = target.dataset;
            if (action === 'edit-order') openOrderModal(id);
            else if (action === 'delete-order') deleteOrder(id);
        });
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

    exportBtn.addEventListener('click', exportData);
    importBtn.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) importData(file);
        e.target.value = '';
    });

    /* ========== ФИЛЬТРЫ ========== */

    document.querySelectorAll('.filter-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTasks();
        });
    });

    /* ========== ВКЛАДКИ ========== */

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
        });
    });

    /* ========== МОДАЛЬНОЕ ОКНО ========== */

    modalCancel.addEventListener('click', closeModal);
    modalSave.addEventListener('click', saveModal);
    modalInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveModal();
    });
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modalOverlay.hidden) closeModal();
    });

    /* ========== УВЕДОМЛЕНИЯ — UI ========== */

    notifyBadge.addEventListener('click', requestNotificationPermission);

    /* ========== СИНХРОНИЗАЦИЯ МЕЖДУ ВКЛАДКАМИ ========== */

    window.addEventListener('storage', (e) => {
        if (e.key === TASKS_KEY) {
            loadFromStorage();
            renderTasks();
            renderStats();
        } else if (e.key === HABITS_KEY) {
            loadFromStorage();
            renderHabits();
            renderStats();
        } else if (e.key === ORDERS_KEY) {
            loadFromStorage();
            renderOrders();
        }
    });

    /* ========== PWA ========== */

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then((reg) => console.log('SW registered:', reg.scope))
                .catch((err) => console.warn('SW registration failed:', err));
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
        if (outcome === 'accepted') {
            showToast('Приложение установлено', 'fa-download');
        }
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

    /* ========== ВИДИМОСТЬ ВКЛАДКИ ========== */

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            processRepeats();
            checkDeadlines();
        }
    });

    /* ========== ИНИЦИАЛИЗАЦИЯ ========== */

    function init() {
        loadFromStorage();
        processRepeats();
        renderTasks();
        renderHabits();
        renderOrders();
        renderStats();

        const today = new Date().toISOString().slice(0, 10);
        taskDate.min = today;

        updateNotifyBadge();
        startDeadlineChecker();
        checkDeadlines();

        taskInput.focus();

        console.log('%c⚡ TaskFlow Premium v4', 'font-size: 16px; font-weight: bold; color: #6d8cff;');
        console.log('%c• Планировщик • Заказы • Статистика', 'color: #8e9bb8;');
        console.log('%c• Уведомления • Повторы • CSV • PWA', 'color: #8e9bb8;');
    }

    setInterval(processRepeats, 300000);

    init();
})();
