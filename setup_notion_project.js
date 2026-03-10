const ROOT_PAGE_ID = "3198ba33-a218-80f0-8693-fc7b37ed95f7";
const TOKEN = process.env.NOTION_API_TOKEN;

if (!TOKEN) {
    console.error("ОШИБКА: Пожалуйста, установите переменную окружения NOTION_API_TOKEN");
    process.exit(1);
}

const headers = {
    "Authorization": `Bearer ${TOKEN}`,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json"
};

async function api(method, endpoint, body = null) {
    const url = `https://api.notion.com/v1${endpoint}`;
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(url, options);
    const data = await res.json();

    if (!res.ok) {
        console.error(`Ошибка (${res.status}):`, data.message);
        throw new Error(data.message);
    }
    return data;
}

const epicsDatabaseSchema = {
    parent: { type: "page_id", page_id: ROOT_PAGE_ID },
    title: [{ type: "text", text: { content: "Epics" } }],
    properties: {
        "Название эпика": { title: {} },
        "Описание": { rich_text: {} },
        "Дедлайн": { date: {} },
        "Статус": {
            select: {
                options: [
                    { name: "Not Started", color: "default" },
                    { name: "In Progress", color: "blue" },
                    { name: "Done", color: "green" }
                ]
            }
        },
        "Приоритет": {
            select: {
                options: [
                    { name: "High", color: "red" },
                    { name: "Medium", color: "yellow" },
                    { name: "Low", color: "blue" }
                ]
            }
        },
        "Ответственные роли": {
            multi_select: {
                options: [
                    { name: "Claude Code", color: "purple" },
                    { name: "Dev", color: "blue" },
                    { name: "Designer", color: "pink" },
                    { name: "QA", color: "orange" }
                ]
            }
        },
        "Фаза": {
            select: {
                options: [
                    { name: "Phase 1: Chat & Messenger", color: "gray" },
                    { name: "Phase 2: Customization & Profiles", color: "blue" },
                    { name: "Phase 3: Monetization & VIP", color: "yellow" },
                    { name: "Phase 4: Social & Friends", color: "pink" },
                    { name: "Phase 5: Games & Bug Fixes", color: "red" },
                    { name: "Phase 6: Infrastructure & Automation", color: "green" }
                ]
            }
        }
    }
};

function getTasksDatabaseSchema(epicsDbId) {
    return {
        parent: { type: "page_id", page_id: ROOT_PAGE_ID },
        title: [{ type: "text", text: { content: "Tasks" } }],
        properties: {
            "Название задачи": { title: {} },
            "Описание": { rich_text: {} },
            "Связанный эпик": {
                relation: {
                    database_id: epicsDbId,
                    single_property: {}
                }
            },
            "Дедлайн": { date: {} },
            "Приоритет": {
                select: {
                    options: [
                        { name: "High", color: "red" },
                        { name: "Medium", color: "yellow" },
                        { name: "Low", color: "blue" }
                    ]
                }
            },
            "Роль": {
                multi_select: {
                    options: [
                        { name: "Claude Code", color: "purple" },
                        { name: "Dev", color: "blue" },
                        { name: "Designer", color: "pink" },
                        { name: "QA", color: "orange" }
                    ]
                }
            },
            "Статус": {
                select: {
                    options: [
                        { name: "Not Started", color: "default" },
                        { name: "In Progress", color: "blue" },
                        { name: "Done", color: "green" }
                    ]
                }
            },
            "Метрики (KPI)": { rich_text: {} }
        }
    };
}

const targetEpics = [
    {
        name: "💬 EPIC-01: Интеллектуальный Мессенджер & Система Чата",
        description: "Разработка полнофункционального мессенджера (Partial Read, Self-Healing, Unread Sync)",
        phase: "Phase 1: Chat & Messenger",
        priority: "High",
        roles: ["Claude Code", "Dev", "QA"],
        tasks: [
            { name: "Архитектура Unread Messages", desc: "Устранение дублирования счетчиков непрочитанных. Единый источник правды.", role: ["Claude Code", "Dev"], kpi: "0 рассинхронов счетчика", priority: "High" },
            { name: "Partial Read Functionality (Как в Telegram)", desc: "Пометка сообщений прочитанными по мере скроллинга и их видимости во Viewport'е.", role: ["Dev", "Claude Code"], kpi: "Плавный скролл, 100% точность IntersectionObserver", priority: "High" },
            { name: "Unread Sync между вкладками и устройствами", desc: "WebSocket & LocalStorage события для синхронизации статусов Read/Unread.", role: ["Dev", "Claude Code"], kpi: "Синхронизация < 100ms", priority: "High" },
            { name: "Self-Healing Mechanism", desc: "Авто-восстановление консистентности (исправление багов, если счетчик завис).", role: ["Claude Code", "QA"], kpi: "Автоматический фикс счетчиков", priority: "Medium" }
        ]
    },
    {
        name: "🎨 EPIC-02: Кастомизация и Умные Профили Игроков",
        description: "Редизайн мини-профиля, полного профиля и кастомизация (Рамки, Аватары, Эмоции)",
        phase: "Phase 2: Customization & Profiles",
        priority: "High",
        roles: ["Designer", "Dev", "Claude Code"],
        tasks: [
            { name: "Интеграция Рамок профиля (Borders)", desc: "Отображение кастомных рамок для VIP/Активных пользователей в худе и профиле.", role: ["Designer", "Dev", "Claude Code"], kpi: "Новые слои для аватара", priority: "High" },
            { name: "Редизайн Мини-профиля (mini-profile)", desc: "Новый поп-ап профиля при клике на пользователя в чате/игре.", role: ["Designer", "Dev"], kpi: "Pixel-perfect сборка", priority: "Medium" },
            { name: "Система эмоций (Emotional)", desc: "Отображение эмоций/статусов/реакций поверх профилей (Emotional_fix).", role: ["Dev", "QA"], kpi: "Без утечек памяти", priority: "Medium" },
            { name: "Обновление Full Profile", desc: "Полноэкранный профиль с достижениями, рамками и статистикой.", role: ["Designer", "Dev"], kpi: "Гладкие анимации Vue", priority: "Low" }
        ]
    },
    {
        name: "💰 EPIC-03: Экономика, Монетизация и VIP Клуб",
        description: "Внедрение VIP уровней, румбиков и платежей",
        phase: "Phase 3: Monetization & VIP",
        priority: "High",
        roles: ["Dev", "Designer", "QA"],
        tasks: [
            { name: "Логика VIP Tiers", desc: "Интеграция бизнес-правил для VIP1, VIP2 и их бустов/перков.", role: ["Dev", "Claude Code"], kpi: "100% coverage логики бустов", priority: "High" },
            { name: "Внутренняя валюта (Румбики)", desc: "Начисление румбиков за победы / списание за рамки и кастомизацию.", role: ["Dev", "Claude Code"], kpi: "Абсолютная консистентность БД", priority: "High" },
            { name: "Интеграция платежных UI компонентов", desc: "Визуал для покупки VIP и валюты.", role: ["Designer", "Dev"], kpi: "Высокая конверсия в клик", priority: "Medium" }
        ]
    },
    {
        name: "👥 EPIC-04: Социальная Экосистема и Лобби",
        description: "Развитие социального взаимодействия (Friends list, Invites, Parties)",
        phase: "Phase 4: Social & Friends",
        priority: "Medium",
        roles: ["Dev", "QA"],
        tasks: [
            { name: "Friends List System", desc: "Добавление в друзья, подтверждение, список онлайн-друзей.", role: ["Dev", "Claude Code"], kpi: "Загрузка списка друзей < 200ms", priority: "High" },
            { name: "Party / Lobby System", desc: "Приглашение друзей в группу для совместных игр.", role: ["Dev"], kpi: "Надежный WebSocket Sync", priority: "High" },
            { name: "Leaderboards (Cyberrunner)", desc: "Сортировка друзей по очкам, глобальные лидерборды.", role: ["Dev", "QA"], kpi: "Правильное вычисление рангов", priority: "Medium" }
        ]
    },
    {
        name: "⚙️ EPIC-05: Стабилизация, Оптимизация и QA",
        description: "Устранение багов, рефакторинг сокетов, фиксы UI (socket_fix_report.txt)",
        phase: "Phase 5: Games & Bug Fixes",
        priority: "High",
        roles: ["QA", "Dev", "Claude Code"],
        tasks: [
            { name: "Socket Connection Fix", desc: "Анализ socket_fix_report.txt, устранение обрывов.", role: ["Claude Code", "Dev"], kpi: "Uptime 99.9%", priority: "High" },
            { name: "UI/UX Fixes (fix_ui.md)", desc: "Общие визуальные баги, ползущие верстки, адаптив.", role: ["Designer", "Dev"], kpi: "0 UI issues", priority: "Medium" },
            { name: "Оптимизация производительности", desc: "Memory leak tests, уменьшение бандла.", role: ["Claude Code", "Dev"], kpi: "Lighthouse 90+", priority: "Medium" }
        ]
    },
    {
        name: "🤖 EPIC-06: Автоматизация процессов и CI/CD",
        description: "Координация Claude Code, CI/CD, кодогенерация",
        phase: "Phase 6: Infrastructure & Automation",
        priority: "Medium",
        roles: ["Claude Code", "Dev"],
        tasks: [
            { name: "Авто-генерация рутинного кода", desc: "Настройка Claude Code для генерации CRUD роутов.", role: ["Claude Code"], kpi: ">20 часов сэкономлено", priority: "High" },
            { name: "Code Review & Refactoring Bot", desc: "Claude Code проверяет PR и пишет тесты.", role: ["Claude Code"], kpi: "Code Coverage >85%", priority: "Medium" },
            { name: "Release Automation", desc: "Авто-сборка и деплой на сервер (deploy/).", role: ["Dev", "QA"], kpi: "Zero-downtime deploy", priority: "High" }
        ]
    }
];

function getDateOffset(weeks) {
    const d = new Date();
    d.setDate(d.getDate() + weeks * 7);
    return d.toISOString().split('T')[0];
}

async function run() {
    console.log("🚀 Стартуем создание Notion-инфраструктуры для PartyChaos...");

    console.log("📂 Создаю новую базу данных Epics...");
    const epicsDb = await api("POST", "/databases", epicsDatabaseSchema);
    console.log(`✅ Epics DB создана. ID: ${epicsDb.id}`);

    console.log("📂 Создаю новую базу данных Tasks...");
    const tasksDatabaseSchema = getTasksDatabaseSchema(epicsDb.id);
    const tasksDb = await api("POST", "/databases", tasksDatabaseSchema);
    console.log(`✅ Tasks DB создана. ID: ${tasksDb.id}`);

    console.log("⚙️  Наполняю проекты новыми эпиками и задачами (это займёт ~1-2 минуты)...");

    for (const epicInfo of targetEpics) {
        console.log(`\n📌 Эпик: ${epicInfo.name}`);
        const epicDeadline = getDateOffset(8);

        // В описание эпика добавим немного визуала / ссылок
        const epicPayload = {
            parent: { database_id: epicsDb.id },
            properties: {
                "Название эпика": { title: [{ text: { content: epicInfo.name } }] },
                "Описание": { rich_text: [{ text: { content: epicInfo.description } }] },
                "Фаза": { select: { name: epicInfo.phase } },
                "Приоритет": { select: { name: epicInfo.priority } },
                "Ответственные роли": { multi_select: epicInfo.roles.map(r => ({ name: r })) },
                "Статус": { select: { name: "Not Started" } },
                "Дедлайн": { date: { start: epicDeadline } }
            }
        };

        const epic = await api("POST", "/pages", epicPayload);

        let taskOffsetWeeks = epicInfo.phase.includes("Phase 1") ? 2 :
            epicInfo.phase.includes("Phase 2") ? 3 :
                epicInfo.phase.includes("Phase 3") ? 4 :
                    epicInfo.phase.includes("Phase 4") ? 5 :
                        epicInfo.phase.includes("Phase 5") ? 6 : 8;

        for (const taskInfo of epicInfo.tasks) {
            console.log(`   └─ Задача: ${taskInfo.name}`);
            const taskDeadline = getDateOffset(taskOffsetWeeks);

            const taskPayload = {
                parent: { database_id: tasksDb.id },
                properties: {
                    "Название задачи": { title: [{ text: { content: taskInfo.name } }] },
                    // Форматируем описание так, чтобы было понятно, что от нас требуется
                    "Описание": { rich_text: [{ text: { content: `🎯 Цель: ${taskInfo.desc}` } }] },
                    "Связанный эпик": { relation: [{ id: epic.id }] },
                    "Приоритет": { select: { name: taskInfo.priority } },
                    "Роль": { multi_select: taskInfo.role.map(r => ({ name: r })) },
                    "Метрики (KPI)": { rich_text: [{ text: { content: `📊 ${taskInfo.kpi}` } }] },
                    "Статус": { select: { name: "Not Started" } },
                    "Дедлайн": { date: { start: taskDeadline } }
                }
            };

            await api("POST", "/pages", taskPayload);
            await new Promise(r => setTimeout(r, 450));
        }
    }

    console.log("\n🎉 ПРОЕКТ УСПЕШНО СГЕНЕРИРОВАН С УЧЕТОМ НЕДОСТАЮЩИХ ФИЧ!");
    console.log("Удалите старые/пустые таблицы Epics и Tasks в Notion, и проверьте новые с актуальными данными!");
}

run().catch(err => {
    console.error("Критическая ошибка:", err);
});
