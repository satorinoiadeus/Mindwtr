import { sortAreasForOrderDisplay } from "@still/core/area-ordering";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
    blank,
    seed,
    uid,
    newTask,
    newProject,
    localDate,
    parseQuick,
    complete,
    matches,
    merge,
    type Task,
    type Project,
    type Workspace,
    type View,
} from "./domain";
import {
    createStore,
    exportBackup,
    importBackup,
    confirmReplacement,
    type Store,
} from "./storage";
import "./style.css";
import "./studio.css";
import { boardColumns, boardLane, filterAndSortTasks, type SortMode } from "./project-views";
const navs = [
    ["inbox", "Inbox", "▣"],
    ["today", "Today", "☀"],
    ["upcoming", "Upcoming", "▦"],
    ["anytime", "Anytime", "◇"],
    ["someday", "Someday", "◷"],
    ["logbook", "Logbook", "✓"],
    ["trash", "Trash", "⌫"],
] as const;
function labelDate(s: string | null) {
    if (!s) return "";
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d, 12).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
    });
}
function App() {
    const [, setClock] = useState(0);
    useEffect(() => {
        const refresh = () => setClock((n) => n + 1);
        const timer = setInterval(refresh, 60000);
        window.addEventListener("focus", refresh);
        return () => {
            clearInterval(timer);
            window.removeEventListener("focus", refresh);
        };
    }, []);
    const [w, setW] = useState<Workspace | null>(null),
        [store, setStore] = useState<Store | null>(null),
        [loaded, setLoaded] = useState(false),
        [error, setError] = useState(""),
        [busy, setBusy] = useState(false),
        [view, setView] = useState<View>("today"),
        [query, setQuery] = useState(""),
        [menu, setMenu] = useState(false),
        [theme, setTheme] = useState(() => {
            try {
                return localStorage.getItem("still.theme") === "dark"
                    ? "dark"
                    : "light";
            } catch {
                return "light";
            }
        }),
        [modal, setModal] = useState<
            "task" | "project" | "area" | "settings" | "import" | null
        >(null),
        [task, setTask] = useState<Task | null>(null),
        [project, setProject] = useState<Project | null>(null),
        [areaId, setAreaId] = useState<string | null>(null),
        [incoming, setIncoming] = useState<Workspace | null>(null),
        [importWarnings, setImportWarnings] = useState<string[]>([]),
        [undo, setUndo] = useState<Workspace | null>(null),
        [message, setMessage] = useState("");
    const locked = useRef(false),
        current = useRef(w);
    const touchDrag = useRef<{
        kind: "task" | "project";
        id: string;
        target: string | null;
        startY: number;
        moved: boolean;
    } | null>(null);
    const [dragTarget, setDragTarget] = useState<string | null>(null);
    const [layout, setLayout] = useState<"list" | "board" | "table" | "calendar">(() => {
        const saved = localStorage.getItem("still.layout");
        return saved === "board" || saved === "table" || saved === "calendar" ? saved : "list";
    });
    const [design, setDesign] = useState<"studio" | "classic">(() =>
        localStorage.getItem("still.design") === "classic" ? "classic" : "studio",
    );
    const [filterText, setFilterText] = useState("");
    const [filterPriority, setFilterPriority] = useState("all");
    const [sortMode, setSortMode] = useState<SortMode>("position");
    const [quickTitle, setQuickTitle] = useState("");
    current.current = w;
    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const s = await createStore(),
                    value = await s.load();
                if (active) {
                    setStore(s);
                    setW(value);
                    setLoaded(true);
                }
            } catch (e) {
                setError(String(e));
                setLoaded(true);
            }
        })();
        return () => {
            active = false;
        };
    }, []);
    useEffect(() => {
        document.documentElement.dataset.design = design;
        localStorage.setItem("still.design", design);
    }, [design]);
    useEffect(() => {
        localStorage.setItem("still.layout", layout);
    }, [layout]);
    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        try {
            localStorage.setItem("still.theme", theme);
        } catch {
            /* preference only */
        }
    }, [theme]);
    useEffect(() => {
        if (!message) return;
        const id = setTimeout(() => setMessage(""), 5000);
        return () => clearTimeout(id);
    }, [message]);
    async function commit(next: Workspace, note = "Saved", keepUndo = true) {
        if (!store || locked.current) return false;
        locked.current = true;
        setBusy(true);
        setError("");
        try {
            await store.save(next);
            setUndo(keepUndo ? current.current : null);
            setW(next);
            current.current = next;
            setMessage(note);
            return true;
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            return false;
        } finally {
            locked.current = false;
            setBusy(false);
        }
    }
    async function confirmChange(message: string) {
        try {
            return await confirmReplacement(message);
        } catch (e) {
            setError(String(e));
            return false;
        }
    }
    function go(v: View) {
        setView(v);
        setMenu(false);
    }
    function addTask() {
        let t = newTask();
        if (view.startsWith("project:")) t.projectId = view.slice(8);
        if (view.startsWith("area:")) t.areaId = view.slice(5);
        if (view === "today") t.scheduled = localDate();
        if (view === "someday") t.someday = true;
        setTask(t);
        setModal("task");
    }
    function addArea() {
        setMenu(false);
        setError("");
        setAreaId(null);
        setModal("area");
    }
    function addProject() {
        setMenu(false);
        setError("");
        const currentArea = view.startsWith("area:")
            ? view.slice(5)
            : (w?.projects.find((p) => `project:${p.id}` === view)?.areaId ??
              null);
        setProject({ ...newProject(), areaId: currentArea });
        setModal("project");
    }
    useEffect(() => {
        function key(e: KeyboardEvent) {
            const el = e.target as HTMLElement;
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                go("search");
                return;
            }
            if (e.key === "Escape") {
                setModal(null);
                setMenu(false);
            }
            if (
                !modal &&
                !(
                    el instanceof HTMLInputElement ||
                    el instanceof HTMLTextAreaElement ||
                    el instanceof HTMLSelectElement
                ) &&
                e.key.toLowerCase() === "n"
            ) {
                e.preventDefault();
                addTask();
            }
        }
        window.addEventListener("keydown", key);
        return () => window.removeEventListener("keydown", key);
    }, [view, modal]);
    const todayKey = localDate();
    // Counts are independent of navigation, search typing and open dialogs.
    const navCounts = useMemo(
        () =>
            Object.fromEntries(
                navs.map(([v]) => [
                    v,
                    w
                        ? w.tasks.reduce(
                              (n, t) => n + Number(matches(w, t, v, todayKey)),
                              0,
                          )
                        : 0,
                ]),
            ),
        [w, todayKey],
    );
    if (!loaded)
        return (
            <div className="start">
                <div className="mark">s.</div>
                <p>Making a little room…</p>
            </div>
        );
    if (!w)
        return (
            <div className="start">
                <div className="mark">s.</div>
                <div className="eyebrow">
                    A LITTLE SPACE FOR YOUR NEXT ACTION
                </div>
                <h1>
                    Less noise.
                    <br />
                    More room.
                </h1>
                <p>
                    Meet Still. A calm place to turn what’s on your
                    <br className="desktop" /> mind into something you can do.
                </p>
                {error && (
                    <div role="alert" className="error">
                        {error}
                    </div>
                )}
                <button
                    disabled={busy || !store}
                    className="primary"
                    onClick={() => commit(seed(), "Sample workspace ready")}
                >
                    Explore a sample workspace →
                </button>
                <button
                    disabled={busy || !store}
                    className="plain"
                    onClick={() => commit(blank(), "Your space is ready")}
                >
                    Start with an empty space
                </button>
                <small>
                    {store?.kind ?? "Storage unavailable"} · No account. No
                    cloud.
                </small>
            </div>
        );
    const area = w.areas.find((a) => `area:${a.id}` === view),
        p = w.projects.find((p) => `project:${p.id}` === view),
        title =
            area?.title ??
            p?.title ??
            navs.find((n) => n[0] === view)?.[1] ??
            "Search";
    const tasks = w.tasks
        .filter((t) => matches(w, t, view, localDate(), query))
        .sort((a, b) =>
            view === "upcoming"
                ? (a.scheduled ?? "").localeCompare(b.scheduled ?? "") ||
                  a.order - b.order
                : a.order - b.order,
        );
    const visibleTasks = filterAndSortTasks(tasks, filterText, filterPriority,
        view === "upcoming" && sortMode === "position" ? "date" : sortMode);
    const shownProjects = w.projects.filter((p) =>
        view === "trash"
            ? !!p.deletedAt
            : view === "logbook"
              ? !p.deletedAt && p.state !== "active"
              : area
                ? !p.deletedAt && p.state === "active" && p.areaId === area.id
                : false,
    ).sort((a, b) => a.order - b.order);
    const activeProjects = w.projects
        .filter((p) => !p.deletedAt && p.state === "active")
        .sort((a, b) => a.order - b.order);
    async function updateTask(t: Task) {
        if (!w) return;
        const next = {
            ...w,
            tasks: w.tasks.some((x) => x.id === t.id)
                ? w.tasks.map((x) => (x.id === t.id ? t : x))
                : [...w.tasks, t],
        };
        if (await commit(next, "Task saved")) setModal(null);
    }
    async function updateProject(p: Project) {
        if (!w) return;
        const next = {
            ...w,
            projects: w.projects.some((x) => x.id === p.id)
                ? w.projects.map((x) => (x.id === p.id ? p : x))
                : [...w.projects, p],
        };
        if (await commit(next, "Project saved")) {
            setModal(null);
            if (!w.projects.some((x) => x.id === p.id)) go(`project:${p.id}`);
        }
    }
    function moveTaskTo(id: string, targetId: string) {
        if (!w || id === targetId || busy || view === "trash" || sortMode !== "position" || filterText || filterPriority !== "all") return;
        const from = tasks.findIndex((t) => t.id === id);
        const to = tasks.findIndex((t) => t.id === targetId);
        if (from < 0 || to < 0) return;
        if (view === "upcoming" && tasks[from].scheduled !== tasks[to].scheduled) return;
        const ordered = tasks.map((t) => t.id);
        ordered.splice(from, 1);
        ordered.splice(to, 0, id);
        const other = w.tasks.filter((t) => !ordered.includes(t.id)).map((t) => t.id);
        const ids = [...ordered, ...other];
        void commit({ ...w, tasks: w.tasks.map((t) => ({ ...t, order: ids.indexOf(t.id) })) }, "Task moved");
    }
    function reorderProject(id: string, targetId: string) {
        if (!w || busy || id === targetId) return;
        const ids = activeProjects.map((p) => p.id);
        const from = ids.indexOf(id), to = ids.indexOf(targetId);
        if (from < 0 || to < 0) return;
        ids.splice(from, 1);
        ids.splice(to, 0, id);
        const all = [...ids, ...w.projects.filter((p) => !ids.includes(p.id)).map((p) => p.id)];
        void commit({ ...w, projects: w.projects.map((p) => ({ ...p, order: all.indexOf(p.id) })) }, "Projects reordered");
    }
    // Mobile WebViews do not reliably support HTML5 drag events. A dedicated
    // touch handle uses Pointer Events; desktop keeps native drag and drop.
    function beginTouchDrag(e: React.PointerEvent<HTMLElement>, kind: "task" | "project", id: string) {
        if (e.pointerType === "mouse" || busy || view === "trash" || view === "logbook" || (kind === "task" && (sortMode !== "position" || filterText || filterPriority !== "all"))) return;
        touchDrag.current = { kind, id, target: null, startY: e.clientY, moved: false };
        e.currentTarget.setPointerCapture(e.pointerId);
    }
    function updateTouchDrag(e: React.PointerEvent<HTMLElement>) {
        const d = touchDrag.current;
        if (!d) return;
        if (!d.moved && Math.abs(e.clientY - d.startY) < 8) return;
        d.moved = true;
        const item = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>(
            d.kind === "task" ? "[data-still-task]" : "[data-still-project]",
        );
        const target = item?.dataset[d.kind === "task" ? "stillTask" : "stillProject"] ?? null;
        d.target = target && target !== d.id ? target : null;
        setDragTarget(d.target ? `${d.kind}:${d.target}` : null);
        e.preventDefault();
    }
    function finishTouchDrag(e: React.PointerEvent<HTMLElement>) {
        const d = touchDrag.current;
        touchDrag.current = null;
        setDragTarget(null);
        if (!d) return;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
        if (!d.moved || !d.target) return;
        if (d.kind === "task") moveTaskTo(d.id, d.target);
        else reorderProject(d.id, d.target);
    }
    function cancelTouchDrag() {
        touchDrag.current = null;
        setDragTarget(null);
    }
    function reorder(id: string, direction: number) {
        if (!w || sortMode !== "position" || filterText || filterPriority !== "all") return;
        const i = tasks.findIndex((t) => t.id === id),
            other = tasks[i + direction];
        if (!other) return;
        const ids = tasks.map((t) => t.id);
        [ids[i], ids[i + direction]] = [ids[i + direction], ids[i]];
        const ordered = [
            ...ids,
            ...w.tasks.filter((t) => !ids.includes(t.id)).map((t) => t.id),
        ];
        commit(
            {
                ...w,
                tasks: w.tasks.map((t) => ({
                    ...t,
                    order: ordered.indexOf(t.id),
                })),
            },
            "Order updated",
        );
    }
    function quickAddTask(title: string, heading = "", scheduled: string | null = null) {
        if (!title.trim() || busy) return;
        const next = newTask(title.trim());
        if (view.startsWith("project:")) next.projectId = view.slice(8);
        if (view.startsWith("area:")) next.areaId = view.slice(5);
        if (view === "today") next.scheduled = localDate();
        if (view === "someday") next.someday = true;
        if (scheduled) next.scheduled = scheduled;
        next.heading = heading === "To do" ? "" : heading;
        void commit({ ...w, tasks: [...w.tasks, next] }, "Task added").then((ok) => {
            if (ok) setQuickTitle("");
        });
    }
    function moveToLane(id: string, lane: string) {
        const found = w.tasks.find((t) => t.id === id);
        if (found && !busy) void updateTask({ ...found, heading: lane === "To do" ? "" : lane });
    }
    function trashTask(id: string) {
        if (busy) return;
        void commit({ ...w, tasks: w.tasks.map((t) => t.id === id ? { ...t, deletedAt: new Date().toISOString() } : t) }, "Moved to Trash");
    }
    function editProject(p: Project) {
        setProject(p);
        setModal("project");
    }
    const subtitle: Record<string, string> = {
        inbox: "A place to put things down. Decide what comes next later.",
        today: "A little focus goes a long way.",
        upcoming: "Make space for what’s ahead.",
        anytime: "Ready when you are.",
        someday: "Good ideas can wait here.",
        logbook: "Small steps, kept.",
        trash: "Nothing here is gone forever.",
        search: "Find a task, a note, or a tag.",
    };
    return (
        <div className="shell">
            <aside className={menu ? "open" : ""}>
                <div className="brand">
                    <span className="mark small">s.</span> still{" "}
                    <span className="brand-label">YOUR QUIET SPACE</span>
                </div>
                <button className="search" onClick={() => go("search")}>
                    <span>⌕ &nbsp; Search</span>
                    <kbd>Ctrl K</kbd>
                </button>
                <nav>
                    {navs.map(([v, t, icon]) => (
                        <button
                            key={v}
                            onClick={() => go(v)}
                            className={view === v ? "selected" : ""}
                        >
                            <span className={"nav-icon " + v}>{icon}</span>
                            {t}
                            <span className="count">{navCounts[v] || ""}</span>
                        </button>
                    ))}
                </nav>
                <div className="section-label">
                    AREAS
                    <button aria-label="Add area" onClick={addArea}>
                        ＋
                    </button>
                </div>
                <div className="areas">
                    {sortAreasForOrderDisplay(
                        w.areas.map((a) => ({ ...a, name: a.title })),
                    ).map((a) => (
                        <div key={a.id}>
                            <div className="area-line">
                                <button
                                    onClick={() => go(`area:${a.id}`)}
                                    className={
                                        view === `area:${a.id}`
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    ▧ &nbsp; {a.title}
                                </button>
                                <button
                                    className="area-edit"
                                    aria-label={`Edit area ${a.title}`}
                                    onClick={() => {
                                        setAreaId(a.id);
                                        setModal("area");
                                    }}
                                >
                                    ···
                                </button>
                            </div>
                            {activeProjects
                                .filter((p) => p.areaId === a.id)
                                .map((p) => (
                                    <button
                                        className={
                                            "project-link " +
                                            (view === `project:${p.id}`
                                                ? "selected"
                                                : "")
                                        }
                                        key={p.id}
                                        onClick={() => go(`project:${p.id}`)}
                                    >
                                        ◌ &nbsp; {p.title}
                                    </button>
                                ))}
                        </div>
                    ))}
                    {activeProjects
                        .filter((p) => !p.areaId)
                        .map((p) => (
                            <button
                                className={
                                    "project-link " +
                                    (view === `project:${p.id}`
                                        ? "selected"
                                        : "")
                                }
                                key={p.id}
                                onClick={() => go(`project:${p.id}`)}
                            >
                                ◌ &nbsp; {p.title}
                            </button>
                        ))}
                </div>
                <button className="new-project" onClick={addProject}>
                    ＋ New project
                </button>
                <div className="sidebar-foot">
                    <button onClick={() => setModal("settings")}>
                        ⚙ &nbsp; Settings & backups
                    </button>
                    <small>{store?.kind}</small>
                </div>
            </aside>
            {menu && (
                <button
                    className="scrim"
                    aria-label="Close navigation"
                    onClick={() => setMenu(false)}
                />
            )}
            <main>

                <div className="topline">
                    <button
                        className="mobile plain"
                        aria-label="Open navigation"
                        onClick={() => setMenu(!menu)}
                    >
                        ☰
                    </button>
                    <span>
                        {new Date().toLocaleDateString(undefined, {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                        })}
                    </span>
                    <span className="local-dot">
                        ● &nbsp; {busy ? "Saving…" : "Saved on this device"}
                    </span>
                </div>
                {w.sample && (
                    <div className="sample-banner">
                        SAMPLE WORKSPACE{" "}
                        <span>
                            Make yourself at home. These are example tasks.
                        </span>
                        <button onClick={() => setModal("settings")}>
                            Start fresh ↗
                        </button>
                    </div>
                )}
                <header>
                    <div className="eyebrow">STILL / {p ? "PROJECT" : area ? "AREA" : "WORKSPACE"}</div>
                    <div className="heading-line">
                        <h1>{title}</h1>
                        {p ? (
                            <div className="heading-actions">
                                <button className="secondary" onClick={() => editProject(p)}>Edit project</button>
                                <button className="icon-action danger" aria-label="Move project to Trash"
                                    onClick={() => void commit({ ...w, projects: w.projects.map(x => x.id === p.id ? { ...x, deletedAt: new Date().toISOString() } : x) }, "Project moved to Trash").then(ok => { if (ok) go("inbox"); })}>⌫</button>
                            </div>
                        ) : area ? (
                            <button
                                className="secondary"
                                onClick={() => {
                                    setAreaId(area.id);
                                    setModal("area");
                                }}
                            >
                                Edit area
                            </button>
                        ) : (
                            <span className="quiet-icon">
                                {view === "today" ? "☀" : "✳"}
                            </span>
                        )}
                    </div>
                    <p>
                        {p?.notes ||
                            subtitle[view] ||
                            "Your projects and next actions, in one place."}
                    </p>
                    {area && (
                        <button className="area-add-project" onClick={addProject}>
                            <span className="area-add-icon">＋</span> Add project to {area.title}
                        </button>
                    )}
                    {p && (
                        <div className="project-info">
                            <span>
                                Done means:{" "}
                                {p.doneMeans || "Define a clear finish line."}
                            </span>
                            {p.deadline && (
                                <span>Deadline {labelDate(p.deadline)}</span>
                            )}
                            <progress
                                max={Math.max(
                                    1,
                                    w.tasks.filter(
                                        (t) =>
                                            t.projectId === p.id &&
                                            !t.deletedAt,
                                    ).length,
                                )}
                                value={
                                    w.tasks.filter(
                                        (t) =>
                                            t.projectId === p.id &&
                                            !t.deletedAt &&
                                            t.completedAt,
                                    ).length
                                }
                            />
                            <small>
                                {
                                    w.tasks.filter(
                                        (t) =>
                                            t.projectId === p.id &&
                                            !t.deletedAt &&
                                            t.completedAt,
                                    ).length
                                }{" "}
                                of{" "}
                                {
                                    w.tasks.filter(
                                        (t) =>
                                            t.projectId === p.id &&
                                            !t.deletedAt,
                                    ).length
                                }{" "}
                                tasks complete
                            </small>
                        </div>
                    )}
                </header>
                {error && (
                    <div className="error" role="alert">
                        {error}
                        <button className="plain" onClick={() => setError("")}>
                            Dismiss
                        </button>
                    </div>
                )}
                {view === "search" && (
                    <input
                        className="query"
                        autoFocus
                        placeholder="Search titles, notes, and #tags…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        aria-label="Search tasks"
                    />
                )}
                {shownProjects.length > 0 && (
                    <section className="project-cards">
                        {shownProjects.map((p) => {
                            const ts = w.tasks.filter(
                                    (t) => t.projectId === p.id && !t.deletedAt,
                                ),
                                done = ts.filter((t) => t.completedAt).length,
                                next = ts
                                    .filter(
                                        (t) =>
                                            !t.completedAt &&
                                            !t.someday &&
                                            (!t.scheduled ||
                                                t.scheduled <= localDate()),
                                    )
                                    .sort((a, b) => a.order - b.order)[0];
                            return (
                                <article className={"project-card " + (dragTarget === `project:${p.id}` ? "drop-target" : "")} key={p.id}
                                    data-still-project={p.id}
                                    draggable={view !== "trash" && view !== "logbook"}
                                    onDragStart={(e) => { e.dataTransfer.setData("application/x-still-project", p.id); e.dataTransfer.effectAllowed = "move"; }}
                                    onDragOver={(e) => { if (e.dataTransfer.types.includes("application/x-still-project")) e.preventDefault(); }}
                                    onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("application/x-still-project"); if (id) reorderProject(id, p.id); }}
                                >
                                    <div className="project-card-top">
                                        {view !== "trash" && view !== "logbook" && (
                                            <button type="button" className="drag-grip project-grip"
                                                aria-label={`Drag to reorder ${p.title}`}
                                                onPointerDown={(e) => beginTouchDrag(e, "project", p.id)}
                                                onPointerMove={updateTouchDrag}
                                                onPointerUp={finishTouchDrag}
                                                onPointerCancel={cancelTouchDrag}>⠿</button>
                                        )}
                                        <button
                                            className="project-title"
                                            onClick={() =>
                                                p.deletedAt
                                                    ? editProject(p)
                                                    : go(`project:${p.id}`)
                                            }
                                        >
                                            ◌ &nbsp; {p.title}
                                        </button>
                                        {view === "trash" ? (
                                            <button
                                                className="text-button"
                                                onClick={() =>
                                                    updateProject({
                                                        ...p,
                                                        deletedAt: null,
                                                    })
                                                }
                                            >
                                                Restore project
                                            </button>
                                        ) : view === "logbook" ? (
                                            <button
                                                className="text-button"
                                                onClick={() =>
                                                    updateProject({
                                                        ...p,
                                                        state: "active",
                                                    })
                                                }
                                            >
                                                Reopen
                                            </button>
                                        ) : (
                                            <button
                                                className="text-button"
                                                onClick={() => editProject(p)}
                                            >
                                                Edit
                                            </button>
                                        )}
                                    </div>
                                    <p>
                                        {p.state === "archived"
                                            ? "Archived · "
                                            : p.state === "completed"
                                              ? "Completed · "
                                              : ""}
                                        {p.doneMeans || "One clear outcome."}
                                    </p>
                                    <progress
                                        max={Math.max(1, ts.length)}
                                        value={done}
                                    />
                                    <div className="project-next">
                                        <small>
                                            {done}/{ts.length} complete
                                        </small>
                                        {!p.deletedAt &&
                                            p.state === "active" &&
                                            (next ? (
                                                <span>Next: {next.title}</span>
                                            ) : (
                                                <button
                                                    className="text-button"
                                                    onClick={() => {
                                                        setTask({
                                                            ...newTask(),
                                                            projectId: p.id,
                                                        });
                                                        setModal("task");
                                                    }}
                                                >
                                                    ＋ Add next action
                                                </button>
                                            ))}
                                    </div>
                                </article>
                            );
                        })}
                    </section>
                )}
                {!["trash", "logbook", "search"].includes(view) && (
                    <div className="workspace-tools">
                        <div className="view-tabs" role="group" aria-label="Task layout">
                            {(["list", "board", "table", "calendar"] as const).map((mode) => (
                                <button key={mode} className={layout === mode ? "active" : ""}
                                    aria-pressed={layout === mode} onClick={() => setLayout(mode)}>
                                    <span aria-hidden="true">{{ list: "☷", board: "▥", table: "▤", calendar: "▦" }[mode]}</span>
                                    {mode[0].toUpperCase() + mode.slice(1)}
                                </button>
                            ))}
                        </div>
                        <div className="filter-tools">
                            <label className="filter-search">
                                <span aria-hidden="true">⌕</span>
                                <input aria-label="Filter tasks" placeholder="Filter tasks…" value={filterText}
                                    onChange={(e) => setFilterText(e.target.value)} />
                            </label>
                            <select aria-label="Filter by priority" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
                                <option value="all">All priorities</option>
                                <option value="high">High priority</option>
                                <option value="low">Low priority</option>
                                <option value="none">No priority</option>
                            </select>
                            <select aria-label="Sort tasks" value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)}>
                                <option value="position">Custom order</option>
                                <option value="date">Scheduled date</option>
                                <option value="priority">Priority</option>
                                <option value="title">Task name</option>
                            </select>
                        </div>
                    </div>
                )}
                {!["trash", "logbook", "search"].includes(view) && (
                    <form className="quick-capture" onSubmit={(e) => { e.preventDefault(); quickAddTask(quickTitle); }}>
                        <span aria-hidden="true" className="quick-plus">＋</span>
                        <input aria-label="Quick add task" placeholder={p ? "Add a task to this project…" : "Add a task…"}
                            value={quickTitle} onChange={(e) => setQuickTitle(e.target.value)} />
                        <button className="primary" disabled={!quickTitle.trim() || busy}>Add</button>
                    </form>
                )}
                {layout === "board" && !["trash", "logbook", "search"].includes(view) ? (
                    <ProjectBoard tasks={visibleTasks} busy={busy} onEdit={(t) => { setTask(t); setModal("task"); }}
                        onMove={moveToLane} onQuickAdd={quickAddTask} onComplete={(id) => void commit(complete(w, id), "Task completed")}
                        onTrash={trashTask} />
                ) : layout === "table" && !["trash", "logbook", "search"].includes(view) ? (
                    <ProjectTable tasks={visibleTasks} busy={busy} onEdit={(t) => { setTask(t); setModal("task"); }}
                        onComplete={(id) => void commit(complete(w, id), "Task updated")} onTrash={trashTask} />
                ) : layout === "calendar" && !["trash", "logbook", "search"].includes(view) ? (
                    <ProjectCalendar tasks={visibleTasks} onEdit={(t) => { setTask(t); setModal("task"); }}
                        onQuickAdd={(date) => { const t = newTask(); t.scheduled = date; if (p) t.projectId = p.id; if (area) t.areaId = area.id; setTask(t); setModal("task"); }} />
                ) : (
                <section className="task-section">
                    <div className="list-label">
                        <span>
                            {view === "today"
                                ? "YOUR NEXT ACTIONS"
                                : p
                                  ? "PROJECT ACTIONS"
                                  : "TASKS"}
                        </span>
                        <span>
                            {visibleTasks.length}{" "}
                            {visibleTasks.length === 1 ? "task" : "tasks"}
                        </span>
                    </div>
                    {visibleTasks.length === 0 ? (
                        <div className="empty">
                            <div className="empty-symbol">◌</div>
                            <h2>
                                {view === "trash"
                                    ? "A clean slate."
                                    : view === "logbook"
                                      ? "Your small wins will live here."
                                      : view === "today"
                                        ? "Room to breathe."
                                        : "A little space to begin."}
                            </h2>
                            <p>
                                {view === "search"
                                    ? "Try a different word."
                                    : ["trash", "logbook"].includes(view)
                                      ? "Keep going, one small step at a time."
                                      : "Add one clear, doable action."}
                            </p>
                            {!["trash", "logbook", "search"].includes(view) && (
                                <button className="secondary" onClick={addTask}>
                                    ＋ Add next action
                                </button>
                            )}
                        </div>
                    ) : (
                        visibleTasks.map((t, i) => (
                            <React.Fragment key={t.id}>
                                {view === "upcoming" &&
                                    (i === 0 ||
                                        visibleTasks[i - 1].scheduled !==
                                            t.scheduled) && (
                                        <h3 className="group-title">
                                            {labelDate(t.scheduled)}
                                        </h3>
                                    )}
                                {p &&
                                    t.heading &&
                                    (i === 0 ||
                                        visibleTasks[i - 1].heading !== t.heading) && (
                                        <h3 className="group-title">
                                            {t.heading}
                                        </h3>
                                    )}
                                <div
                                    className={"task-row " + (t.completedAt ? "done" : "") + (dragTarget === `task:${t.id}` ? " drop-target" : "")}
                                    data-still-task={t.id}
                                    draggable={view !== "trash" && view !== "logbook" && !busy && sortMode === "position" && !filterText && filterPriority === "all"}
                                    onDragStart={(e) => { e.dataTransfer.setData("application/x-still-task", t.id); e.dataTransfer.effectAllowed = "move"; }}
                                    onDragOver={(e) => { if (e.dataTransfer.types.includes("application/x-still-task")) e.preventDefault(); }}
                                    onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("application/x-still-task"); if (id) moveTaskTo(id, t.id); }}
                                >
                                    <button
                                        className={
                                            "check " +
                                            (t.priority === "high"
                                                ? "high"
                                                : "")
                                        }
                                        disabled={busy || view === "trash"}
                                        aria-label={
                                            t.completedAt
                                                ? `Reopen ${t.title}`
                                                : `Complete ${t.title}`
                                        }
                                        onClick={() =>
                                            commit(
                                                complete(w, t.id),
                                                t.completedAt
                                                    ? "Task reopened"
                                                    : "A small step, done.",
                                            )
                                        }
                                    >
                                        {t.completedAt ? "✓" : ""}
                                    </button>
                                    <div className="task-content">
                                        <InlineTitle
                                            title={t.title}
                                            disabled={busy || view === "trash"}
                                            save={(title) =>
                                                updateTask({ ...t, title })
                                            }
                                        />
                                        <div className="task-meta">
                                            {t.projectId && (
                                                <span>
                                                    {
                                                        w.projects.find(
                                                            (p) =>
                                                                p.id ===
                                                                t.projectId,
                                                        )?.title
                                                    }
                                                </span>
                                            )}
                                            {t.areaId && (
                                                <span>
                                                    {
                                                        w.areas.find(
                                                            (a) =>
                                                                a.id ===
                                                                t.areaId,
                                                        )?.title
                                                    }
                                                </span>
                                            )}
                                            {t.scheduled && (
                                                <span
                                                    className={
                                                        t.scheduled <
                                                            localDate() &&
                                                        !t.completedAt
                                                            ? "overdue"
                                                            : ""
                                                    }
                                                >
                                                    {t.scheduled === localDate()
                                                        ? "Today"
                                                        : labelDate(
                                                              t.scheduled,
                                                          )}
                                                </span>
                                            )}
                                            {t.deadline && (
                                                <span
                                                    className={
                                                        t.deadline <
                                                            localDate() &&
                                                        !t.completedAt
                                                            ? "overdue"
                                                            : ""
                                                    }
                                                >
                                                    ⚑ Due{" "}
                                                    {labelDate(t.deadline)}
                                                </span>
                                            )}
                                            {t.repeat !== "none" && (
                                                <span>↻ {t.repeat}</span>
                                            )}
                                            {t.checklist.length > 0 && (
                                                <span>
                                                    ☷{" "}
                                                    {
                                                        t.checklist.filter(
                                                            (c) => c.done,
                                                        ).length
                                                    }
                                                    /{t.checklist.length}
                                                </span>
                                            )}
                                            {t.tags.map((tag) => (
                                                <span key={tag} className="tag">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="row-actions">
                                        {view !== "trash" && view !== "logbook" && (
                                            <button type="button" className="drag-grip"
                                                aria-label={`Drag to reorder ${t.title}`}
                                                onPointerDown={(e) => beginTouchDrag(e, "task", t.id)}
                                                onPointerMove={updateTouchDrag}
                                                onPointerUp={finishTouchDrag}
                                                onPointerCancel={cancelTouchDrag}>⠿</button>
                                        )}
                                        {view === "trash" ? (
                                            <button
                                                className="text-button"
                                                onClick={() => {
                                                    const parent =
                                                        w.projects.find(
                                                            (p) =>
                                                                p.id ===
                                                                t.projectId,
                                                        );
                                                    commit(
                                                        {
                                                            ...w,
                                                            tasks: w.tasks.map(
                                                                (x) =>
                                                                    x.id ===
                                                                    t.id
                                                                        ? {
                                                                              ...x,
                                                                              deletedAt:
                                                                                  null,
                                                                          }
                                                                        : x,
                                                            ),
                                                            projects:
                                                                parent?.deletedAt
                                                                    ? w.projects.map(
                                                                          (
                                                                              p,
                                                                          ) =>
                                                                              p.id ===
                                                                              parent.id
                                                                                  ? {
                                                                                        ...p,
                                                                                        deletedAt:
                                                                                            null,
                                                                                    }
                                                                                  : p,
                                                                      )
                                                                    : w.projects,
                                                        },
                                                        "Restored",
                                                    );
                                                }}
                                            >
                                                Restore
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    className="reorder"
                                                    aria-label={`Move ${t.title} up`}
                                                    disabled={
                                                        busy || sortMode !== "position" || !!filterText || filterPriority !== "all" ||
                                                        i === 0 ||
                                                        (view === "upcoming" &&
                                                            visibleTasks[i - 1]
                                                                ?.scheduled !==
                                                                t.scheduled)
                                                    }
                                                    onClick={() =>
                                                        reorder(t.id, -1)
                                                    }
                                                >
                                                    ↑
                                                </button>
                                                <button
                                                    className="reorder"
                                                    aria-label={`Move ${t.title} down`}
                                                    disabled={
                                                        busy || sortMode !== "position" || !!filterText || filterPriority !== "all" ||
                                                        i ===
                                                            visibleTasks.length - 1 ||
                                                        (view === "upcoming" &&
                                                            visibleTasks[i + 1]
                                                                ?.scheduled !==
                                                                t.scheduled)
                                                    }
                                                    onClick={() =>
                                                        reorder(t.id, 1)
                                                    }
                                                >
                                                    ↓
                                                </button>
                                                <button className="row-trash" aria-label={`Delete ${t.title}`}
                                                    disabled={busy} onClick={() => trashTask(t.id)}>⌫</button>
                                                <button
                                                    className="edit-button"
                                                    aria-label={`Edit ${t.title}`}
                                                    onClick={() => {
                                                        setTask(t);
                                                        setModal("task");
                                                    }}
                                                >
                                                    ···
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </React.Fragment>
                        ))
                    )}
                </section>
                )}
                {!["trash", "logbook"].includes(view) && (
                    <button className="add-inline" onClick={addTask}>
                        ＋ <span>New task</span>
                        <kbd>N</kbd>
                    </button>
                )}
                <div className="bottom-note">
                    One thing at a time is enough.<span>✳</span>
                </div>
            </main>
            <nav className="mobile-bottom-bar" aria-label="Quick navigation">
                <button onClick={() => go("inbox")} className={view === "inbox" ? "active" : ""}>⌑<small>Inbox</small></button>
                <button onClick={() => go("today")} className={view === "today" ? "active" : ""}>☀<small>Today</small></button>
                <button onClick={() => setMenu(true)}>▦<small>Browse</small></button>
                <button onClick={addTask} className="mobile-bottom-add" aria-label="Add task">＋</button>
            </nav>
            {message && (
                <div className="toast" role="status">
                    <span>{message}</span>
                    {undo && (
                        <button
                            onClick={() => {
                                const prev = undo;
                                commit(prev, "Undone", false);
                            }}
                            disabled={busy}
                        >
                            Undo
                        </button>
                    )}
                    <button
                        aria-label="Dismiss notification"
                        onClick={() => setMessage("")}
                    >
                        ×
                    </button>
                </div>
            )}
            {modal && (
                <div
                    className="modal-backdrop"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) setModal(null);
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-label={
                            modal === "task"
                                ? "Task editor"
                                : modal === "project"
                                  ? "Project editor"
                                  : modal === "area"
                                    ? "Area editor"
                                    : "Settings and backups"
                        }
                        className="modal"
                        ref={(node) => {
                            if (node && !node.dataset.focused) {
                                node.dataset.focused = "yes";
                                setTimeout(
                                    () =>
                                        node
                                            .querySelector<HTMLElement>(
                                                "input,textarea,select",
                                            )
                                            ?.focus(),
                                    0,
                                );
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key !== "Tab") return;
                            const nodes = Array.from(
                                e.currentTarget.querySelectorAll<HTMLElement>(
                                    "input:not([disabled]),button:not([disabled]),select:not([disabled]),textarea:not([disabled])",
                                ),
                            );
                            const first = nodes[0],
                                last = nodes.at(-1);
                            if (
                                e.shiftKey &&
                                document.activeElement === first
                            ) {
                                e.preventDefault();
                                last?.focus();
                            } else if (
                                !e.shiftKey &&
                                document.activeElement === last
                            ) {
                                e.preventDefault();
                                first?.focus();
                            }
                        }}
                    >
                        {error && (
                            <div className="error" role="alert">
                                {error}
                            </div>
                        )}
                        <button
                            className="close"
                            aria-label="Close dialog"
                            onClick={() => setModal(null)}
                        >
                            ×
                        </button>
                        {modal === "task" && task && (
                            <TaskForm
                                key={task.id}
                                task={task}
                                w={w}
                                busy={busy}
                                save={updateTask}
                                remove={() =>
                                    commit(
                                        {
                                            ...w,
                                            tasks: w.tasks.map((t) =>
                                                t.id === task.id
                                                    ? {
                                                          ...t,
                                                          deletedAt:
                                                              new Date().toISOString(),
                                                      }
                                                    : t,
                                            ),
                                        },
                                        "Moved to Trash",
                                    ).then((ok) => {
                                        if (ok) setModal(null);
                                    })
                                }
                            />
                        )}{" "}
                        {modal === "project" && project && (
                            <ProjectForm
                                key={project.id}
                                project={project}
                                w={w}
                                busy={busy}
                                save={updateProject}
                            />
                        )}{" "}
                        {modal === "area" && (
                            <AreaForm
                                key={areaId ?? "new"}
                                w={w}
                                id={areaId}
                                busy={busy}
                                save={async (title) => {
                                    const createdId = uid();
                                    const next = {
                                        ...w,
                                        areas: areaId
                                            ? w.areas.map((a) =>
                                                  a.id === areaId
                                                      ? { ...a, title }
                                                      : a,
                                              )
                                            : [
                                                  ...w.areas,
                                                  {
                                                      id: createdId,
                                                      title,
                                                      order: w.areas.length,
                                                  },
                                              ],
                                    };
                                    if (await commit(next, "Area saved")) {
                                        setModal(null);
                                        if (!areaId) go(`area:${createdId}`);
                                    }
                                }}
                                remove={async () => {
                                    if (
                                        w.projects.some(
                                            (p) => p.areaId === areaId,
                                        ) ||
                                        w.tasks.some((t) => t.areaId === areaId)
                                    ) {
                                        setError(
                                            "Move all projects and tasks out of this area before deleting it, including items in Logbook and Trash.",
                                        );
                                        return;
                                    }
                                    if (
                                        await commit(
                                            {
                                                ...w,
                                                areas: w.areas.filter(
                                                    (a) => a.id !== areaId,
                                                ),
                                            },
                                            "Area deleted",
                                        )
                                    )
                                        setModal(null);
                                }}
                            />
                        )}
                        {modal === "settings" && (
                            <>
                                <div className="eyebrow">
                                    YOUR SPACE, YOUR DATA
                                </div>
                                <h2>Settings & backups</h2>
                                <p className="help">
                                    {store?.kind}. Desktop and mobile keep
                                    separate workspaces. Move them with a backup
                                    file.
                                </p>
                                <label>
                                    Interface style
                                    <select value={design} onChange={(e) => setDesign(e.target.value as "studio" | "classic")}>
                                        <option value="studio">Studio · refined</option>
                                        <option value="classic">Classic · original Still</option>
                                    </select>
                                </label>
                                <label>
                                    Appearance
                                    <select
                                        value={theme}
                                        onChange={(e) =>
                                            setTheme(e.target.value)
                                        }
                                    >
                                        <option value="light">Light</option>
                                        <option value="dark">Dark</option>
                                    </select>
                                </label>
                                <div className="settings-actions">
                                    <button
                                        className="secondary"
                                        onClick={async () => {
                                            try {
                                                if (await exportBackup(w)) {
                                                    setUndo(null);
                                                    setMessage(
                                                        "Backup exported",
                                                    );
                                                }
                                            } catch (e) {
                                                setError(String(e));
                                            }
                                        }}
                                    >
                                        Export JSON backup ↗
                                    </button>
                                    <button
                                        className="secondary"
                                        onClick={async () => {
                                            try {
                                                const x = await importBackup();
                                                if (x) {
                                                    setIncoming(x.workspace);
                                                    setImportWarnings(
                                                        x.warnings,
                                                    );
                                                    setModal("import");
                                                }
                                            } catch (e) {
                                                setError(String(e));
                                                setModal(null);
                                            }
                                        }}
                                    >
                                        Import backup
                                    </button>
                                </div>
                                <p className="help">
                                    You can also import a legacy JSON export.
                                    The preview explains any differences before
                                    you save. Existing app data stays untouched.
                                </p>
                                <h3>A fresh beginning</h3>
                                <p className="help">
                                    Export a backup before replacing your
                                    workspace.
                                </p>
                                <div className="settings-actions">
                                    <button
                                        className="secondary"
                                        onClick={async () => {
                                            if (
                                                await confirmChange(
                                                    "Replace this entire workspace with an empty one? Export a backup first.",
                                                )
                                            )
                                                commit(
                                                    blank(),
                                                    "Empty workspace ready",
                                                ).then((ok) => {
                                                    if (ok) {
                                                        go("inbox");
                                                        setModal(null);
                                                    }
                                                });
                                        }}
                                    >
                                        Start empty
                                    </button>
                                    <button
                                        className="secondary"
                                        onClick={async () => {
                                            if (
                                                await confirmChange(
                                                    "Replace this entire workspace with sample tasks? Export a backup first.",
                                                )
                                            )
                                                commit(
                                                    seed(),
                                                    "Sample workspace ready",
                                                ).then((ok) => {
                                                    if (ok) {
                                                        go("today");
                                                        setModal(null);
                                                    }
                                                });
                                        }}
                                    >
                                        Load sample
                                    </button>
                                </div>
                                <h3>Quick entry</h3>
                                <p className="help">
                                    <code>
                                        Write proposal tomorrow #business !high
                                    </code>
                                    <br />
                                    Understands today, tomorrow, #tags, !high
                                    and !low. Everything else stays in the
                                    title. Review parsed fields before saving. N
                                    opens capture; Ctrl/Cmd K opens search.
                                </p>
                                <h3>Recurrence</h3>
                                <p className="help">
                                    Repeats from the scheduled date, or
                                    completion day if unscheduled. Missed dates
                                    are skipped; only one future task is
                                    created. Monthly repeats preserve the
                                    original day and clamp to the month’s last
                                    day. Deadlines do not carry forward.
                                    Reopening a task keeps its existing next
                                    occurrence. Undo reverses the last change.
                                </p>
                                <p className="help">
                                    Still 0.4.0 · Based on the original Mindwtr
                                    foundations, licensed under AGPL-3.0-only.
                                    Source: github.com/satorinoiadeus/Mindwtr.
                                    Dates use your local calendar. No
                                    notifications, accounts, or cloud sync.
                                </p>
                            </>
                        )}
                        {modal === "import" && incoming && (
                            <>
                                <div className="eyebrow">BACKUP PREVIEW</div>
                                {importWarnings.length > 0 && (
                                    <div
                                        className="migration-notes"
                                        role="note"
                                    >
                                        <strong>Review before importing</strong>
                                        <ul>
                                            {importWarnings.map((note) => (
                                                <li key={note}>{note}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                <h2>Bring your tasks home.</h2>
                                <p>
                                    {incoming.areas.length} areas ·{" "}
                                    {incoming.projects.length} projects ·{" "}
                                    {incoming.tasks.length} tasks
                                </p>
                                <p className="help">
                                    Merge adds new IDs and keeps your current
                                    versions of existing items. Importing twice
                                    will not duplicate them. Replace overwrites
                                    the workspace.
                                </p>
                                <div className="settings-actions">
                                    <button
                                        disabled={busy}
                                        className="primary"
                                        onClick={async () => {
                                            try {
                                                if (
                                                    await commit(
                                                        merge(w, incoming),
                                                        "Backup merged",
                                                    )
                                                ) {
                                                    setModal(null);
                                                    go("inbox");
                                                }
                                            } catch (e) {
                                                setError(String(e));
                                            }
                                        }}
                                    >
                                        Merge
                                    </button>
                                    <button
                                        disabled={busy}
                                        className="secondary"
                                        onClick={async () => {
                                            if (
                                                await confirmChange(
                                                    "Replace all current data with this backup?",
                                                )
                                            )
                                                commit(
                                                    incoming,
                                                    "Backup restored",
                                                ).then((ok) => {
                                                    if (ok) {
                                                        setModal(null);
                                                        go("inbox");
                                                    }
                                                });
                                        }}
                                    >
                                        Replace everything
                                    </button>
                                </div>
                            </>
                        )}
                    </section>
                </div>
            )}
        </div>
    );
}

/** Board, table and calendar deliberately reuse Still's existing task fields.
 * Vikunja-inspired information architecture; not a copied Vue component. */
function ProjectBoard({ tasks, busy, onEdit, onMove, onQuickAdd, onComplete, onTrash }: {
    tasks: Task[];
    busy: boolean;
    onEdit: (t: Task) => void;
    onMove: (id: string, lane: string) => void;
    onQuickAdd: (title: string, lane: string) => void;
    onComplete: (id: string) => void;
    onTrash: (id: string) => void;
}) {
    const [drafts, setDrafts] = useState<Record<string, string>>({});
    const [drop, setDrop] = useState("");
    const touch = useRef<{ id: string; target: string | null; startX: number; startY: number; moved: boolean } | null>(null);
    function touchStart(e: React.PointerEvent<HTMLButtonElement>, id: string) {
        if (e.pointerType === "mouse" || busy) return;
        touch.current = { id, target: null, startX: e.clientX, startY: e.clientY, moved: false };
        e.currentTarget.setPointerCapture(e.pointerId);
    }
    function touchMove(e: React.PointerEvent<HTMLButtonElement>) {
        const d = touch.current;
        if (!d) return;
        if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 8) return;
        d.moved = true;
        const lane = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-still-lane]")?.dataset.stillLane ?? null;
        d.target = lane;
        setDrop(lane ?? "");
        e.preventDefault();
    }
    function touchEnd(e: React.PointerEvent<HTMLButtonElement>) {
        const d = touch.current;
        touch.current = null;
        setDrop("");
        if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
        if (d?.moved && d.target) onMove(d.id, d.target);
    }
    const columns = boardColumns(tasks);
    return (
        <section className="board-view" aria-label="Kanban board">
            {columns.map((lane) => {
                const cards = tasks.filter((t) => boardLane(t) === lane);
                return <div className={"board-lane " + (drop === lane ? "board-drop" : "")} key={lane} data-still-lane={lane}
                    onDragOver={(e) => { if (e.dataTransfer.types.includes("application/x-still-task")) { e.preventDefault(); setDrop(lane); } }}
                    onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrop(""); }}
                    onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("application/x-still-task"); setDrop(""); if (id) onMove(id, lane); }}>
                    <div className="board-lane-head"><span className="lane-dot" /> <h2>{lane}</h2><span className="lane-count">{cards.length}</span></div>
                    <div className="board-cards">
                        {cards.map((t) => <article className="board-card" key={t.id} draggable={!busy}
                            onDragStart={(e) => { e.dataTransfer.setData("application/x-still-task", t.id); e.dataTransfer.effectAllowed = "move"; }}>
                            <div className="board-card-top">
                                <button className="check" aria-label={`Complete ${t.title}`} onClick={() => onComplete(t.id)} disabled={busy}>✓</button>
                                <button className="board-card-title" onClick={() => onEdit(t)}>{t.title}</button>
                                <button className="board-grip" aria-label={`Drag ${t.title} to another column`}
                                    onPointerDown={e => touchStart(e, t.id)} onPointerMove={touchMove}
                                    onPointerUp={touchEnd} onPointerCancel={() => { touch.current = null; setDrop(""); }}>⠿</button>
                                <button className="card-trash" aria-label={`Delete ${t.title}`} onClick={() => onTrash(t.id)} disabled={busy}>×</button>
                            </div>
                            {(t.scheduled || t.deadline || t.tags.length > 0 || t.priority !== "none" || t.checklist.length > 0) &&
                                <div className="board-card-meta">
                                    {t.priority === "high" && <span className="priority-high">◆ High</span>}
                                    {t.scheduled && <span>▦ {labelDate(t.scheduled)}</span>}
                                    {t.deadline && <span>⚑ {labelDate(t.deadline)}</span>}
                                    {t.checklist.length > 0 && <span>☷ {t.checklist.filter(c => c.done).length}/{t.checklist.length}</span>}
                                    {t.tags.slice(0, 2).map(tag => <span className="board-tag" key={tag}>#{tag}</span>)}
                                </div>}
                            <select className="board-move" aria-label={`Move ${t.title} to column`} value={lane}
                                onChange={(e) => onMove(t.id, e.target.value)} disabled={busy}>
                                {columns.map(col => <option key={col} value={col}>{col}</option>)}
                            </select>
                        </article>)}
                    </div>
                    <form className="lane-add" onSubmit={(e) => { e.preventDefault(); const title = drafts[lane]?.trim(); if (title) { onQuickAdd(title, lane); setDrafts(s => ({ ...s, [lane]: "" })); } }}>
                        <input aria-label={`New task in ${lane}`} placeholder="＋ Add a task" value={drafts[lane] ?? ""}
                            onChange={e => setDrafts(s => ({ ...s, [lane]: e.target.value }))} />
                        {drafts[lane]?.trim() && <button className="primary" disabled={busy}>Add</button>}
                    </form>
                </div>;
            })}
        </section>
    );
}

function ProjectTable({ tasks, busy, onEdit, onComplete, onTrash }: {
    tasks: Task[];
    busy: boolean;
    onEdit: (t: Task) => void;
    onComplete: (id: string) => void;
    onTrash: (id: string) => void;
}) {
    return <div className="table-wrap"><table className="task-table">
        <thead><tr><th scope="col">Done</th><th scope="col">Task</th><th scope="col">Priority</th><th scope="col">Schedule</th><th scope="col">Deadline</th><th scope="col">Labels</th><th scope="col">Actions</th></tr></thead>
        <tbody>{tasks.map(t => <tr key={t.id}>
            <td><button className="check" aria-label={`Complete ${t.title}`} disabled={busy} onClick={() => onComplete(t.id)}>✓</button></td>
            <td><button className="table-title" onClick={() => onEdit(t)}>{t.title}</button></td>
            <td><span className={t.priority === "high" ? "priority-high" : ""}>{t.priority === "none" ? "—" : t.priority}</span></td>
            <td>{t.scheduled ? labelDate(t.scheduled) : "—"}</td>
            <td>{t.deadline ? labelDate(t.deadline) : "—"}</td>
            <td>{t.tags.slice(0, 3).map(tag => <span className="board-tag" key={tag}>#{tag}</span>)}</td>
            <td><button className="table-edit" onClick={() => onEdit(t)}>Edit</button> <button className="card-trash" aria-label={`Delete ${t.title}`} onClick={() => onTrash(t.id)}>×</button></td>
        </tr>)}</tbody>
    </table>{tasks.length === 0 && <p className="table-empty">No tasks match this view.</p>}</div>;
}

function ProjectCalendar({ tasks, onEdit, onQuickAdd }: {
    tasks: Task[];
    onEdit: (t: Task) => void;
    onQuickAdd: (date: string) => void;
}) {
    const [offset, setOffset] = useState(0);
    const [selected, setSelected] = useState<string | null>(null);
    const base = new Date();
    const current = new Date(base.getFullYear(), base.getMonth() + offset, 1, 12);
    const y = current.getFullYear(), m = current.getMonth();
    const start = (current.getDay() + 6) % 7;
    const length = new Date(y, m + 1, 0, 12).getDate();
    const cells: (string | null)[] = [...Array(start).fill(null)];
    for (let d = 1; d <= length; d++) cells.push(`${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    while (cells.length % 7) cells.push(null);
    return <section className="calendar-view">
        <div className="calendar-toolbar"><h2>{current.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2>
            <div><button onClick={() => setOffset(v => v - 1)} aria-label="Previous month">‹</button>
                <button onClick={() => { setOffset(0); setSelected(null); }}>Today</button>
                <button onClick={() => setOffset(v => v + 1)} aria-label="Next month">›</button></div>
        </div>
        <div className="calendar-grid">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => <div className="calendar-weekday" key={day}>{day}</div>)}
            {cells.map((day, i) => <div className={"calendar-cell " + (!day ? "calendar-outside " : "") + (day === localDate() ? "calendar-today " : "") + (day === selected ? "calendar-selected" : "")} key={day ?? `blank-${i}`}>
                {day && <><button className="calendar-day" aria-label={`Select ${day}`} onClick={() => setSelected(day)}>{Number(day.slice(-2))}</button>
                    <div className="calendar-items">{tasks.filter(t => t.scheduled === day).slice(0, 3).map(t => <button className="calendar-item" key={t.id} onClick={() => onEdit(t)} title={t.title}>{t.title}</button>)}</div>
                    {tasks.filter(t => t.scheduled === day).length > 3 && <small>+{tasks.filter(t => t.scheduled === day).length - 3} more</small>}
                </>}
            </div>)}
        </div>
        <div className="calendar-footer"><span>{selected ? `Selected: ${labelDate(selected)}` : "Choose a day to schedule a task."}</span>
            <button className="secondary" onClick={() => onQuickAdd(selected ?? localDate())}>＋ Add scheduled task</button></div>
    </section>;
}
function InlineTitle({
    title,
    save,
    disabled,
}: {
    title: string;
    save: (s: string) => void;
    disabled: boolean;
}) {
    const [editing, setEditing] = useState(false),
        [draft, setDraft] = useState(title);
    useEffect(() => setDraft(title), [title]);
    return editing ? (
        <input
            className="inline-title"
            aria-label="Task title"
            autoFocus
            value={draft}
            maxLength={500}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") {
                    setDraft(title);
                    setEditing(false);
                }
            }}
            onBlur={() => {
                setEditing(false);
                if (draft.trim() && draft.trim() !== title) save(draft.trim());
                else setDraft(title);
            }}
        />
    ) : (
        <button
            className="task-title"
            disabled={disabled}
            title="Click to edit title"
            onClick={() => setEditing(true)}
        >
            {title}
        </button>
    );
}
function TaskForm({
    task,
    w,
    busy,
    save,
    remove,
}: {
    task: Task;
    w: Workspace;
    busy: boolean;
    save: (t: Task) => void;
    remove: () => void;
}) {
    const [t, set] = useState(structuredClone(task)),
        [quick, setQuick] = useState(""),
        [check, setCheck] = useState("");
    const existing = w.tasks.some((x) => x.id === t.id);
    const change = <K extends keyof Task>(key: K, value: Task[K]) =>
        set((s) => ({ ...s, [key]: value }));
    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                if (t.title.trim())
                    save({
                        ...t,
                        title: t.title.trim(),
                        tags: t.tags.filter(Boolean),
                        repeatDay:
                            t.repeat === "monthly"
                                ? (t.repeatDay ??
                                  Number(
                                      (t.scheduled ?? localDate()).slice(-2),
                                  ))
                                : t.repeatDay,
                    });
            }}
        >
            <div className="eyebrow">ONE CLEAR NEXT ACTION</div>
            <h2>
                {existing ? "A little more detail." : "What’s on your mind?"}
            </h2>
            {!existing && (
                <div className="quick">
                    <label>
                        Quick entry
                        <input
                            value={quick}
                            onChange={(e) => setQuick(e.target.value)}
                            placeholder="Write proposal tomorrow #business !high"
                        />
                    </label>
                    <button
                        type="button"
                        className="text-button"
                        onClick={() => {
                            const parsed = parseQuick(quick);
                            set((s) => ({ ...s, ...parsed }));
                            setQuick("");
                        }}
                    >
                        Parse into fields ↓
                    </button>
                </div>
            )}
            <label>
                Task title
                <input
                    required
                    maxLength={500}
                    value={t.title}
                    onChange={(e) => change("title", e.target.value)}
                    placeholder="Start with a verb…"
                />
            </label>
            <label>
                Notes
                <textarea
                    value={t.notes}
                    onChange={(e) => change("notes", e.target.value)}
                    rows={3}
                    placeholder="Anything worth remembering."
                />
            </label>
            <label>
                Location
                <select
                    value={
                        t.projectId
                            ? "p:" + t.projectId
                            : t.areaId
                              ? "a:" + t.areaId
                              : "inbox"
                    }
                    onChange={(e) => {
                        const v = e.target.value;
                        set((s) => ({
                            ...s,
                            projectId: v.startsWith("p:") ? v.slice(2) : null,
                            areaId: v.startsWith("a:") ? v.slice(2) : null,
                        }));
                    }}
                >
                    <option value="inbox">Inbox</option>
                    <optgroup label="Areas">
                        {w.areas.map((a) => (
                            <option key={a.id} value={"a:" + a.id}>
                                {a.title}
                            </option>
                        ))}
                    </optgroup>
                    <optgroup label="Projects">
                        {w.projects
                            .filter(
                                (p) =>
                                    !p.deletedAt &&
                                    (p.state === "active" ||
                                        p.id === t.projectId),
                            )
                            .map((p) => (
                                <option key={p.id} value={"p:" + p.id}>
                                    {p.title}
                                </option>
                            ))}
                    </optgroup>
                </select>
            </label>
            {t.projectId && (
                <label>
                    Heading (optional)
                    <input
                        value={t.heading}
                        onChange={(e) => change("heading", e.target.value)}
                        placeholder="e.g. First steps"
                    />
                </label>
            )}
            <div className="form-grid">
                <label>
                    Scheduled · when I’ll work on it
                    <input
                        type="date"
                        min="1900-01-01"
                        max="9999-12-31"
                        value={t.scheduled ?? ""}
                        onChange={(e) => {
                            change("scheduled", e.target.value || null);
                            if (e.target.value) {
                                change("someday", false);
                                if (t.repeat === "monthly")
                                    change(
                                        "repeatDay",
                                        Number(e.target.value.slice(-2)),
                                    );
                            }
                        }}
                    />
                </label>
                <label>
                    Deadline · when it must be done
                    <input
                        type="date"
                        min="1900-01-01"
                        max="9999-12-31"
                        value={t.deadline ?? ""}
                        onChange={(e) =>
                            change("deadline", e.target.value || null)
                        }
                    />
                </label>
            </div>
            <label className="checkbox-label">
                <input
                    type="checkbox"
                    checked={t.someday}
                    onChange={(e) =>
                        set((s) => ({
                            ...s,
                            someday: e.target.checked,
                            scheduled: e.target.checked ? null : s.scheduled,
                        }))
                    }
                />{" "}
                Someday · intentionally set aside
            </label>
            <div className="form-grid">
                <label>
                    Priority
                    <select
                        value={t.priority}
                        onChange={(e) =>
                            change(
                                "priority",
                                e.target.value as Task["priority"],
                            )
                        }
                    >
                        <option value="none">Normal</option>
                        <option value="high">High</option>
                        <option value="low">Low</option>
                    </select>
                </label>
                <label>
                    Repeat
                    <select
                        value={t.repeat}
                        onChange={(e) => {
                            change("repeat", e.target.value as Task["repeat"]);
                            change(
                                "repeatDay",
                                Number((t.scheduled ?? localDate()).slice(-2)),
                            );
                        }}
                    >
                        <option value="none">Does not repeat</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                    </select>
                </label>
            </div>
            <label>
                Tags · separated by commas
                <input
                    value={t.tags.join(", ")}
                    onChange={(e) =>
                        change("tags", [
                            ...new Set(
                                e.target.value
                                    .split(",")
                                    .map((s) => s.trim().replace(/^#/, "")),
                            ),
                        ])
                    }
                />
            </label>
            <label>Checklist</label>
            <div className="checklist">
                {t.checklist.map((c) => (
                    <div key={c.id}>
                        <input
                            aria-label={`Complete checklist item ${c.title}`}
                            type="checkbox"
                            checked={c.done}
                            onChange={() =>
                                change(
                                    "checklist",
                                    t.checklist.map((x) =>
                                        x.id === c.id
                                            ? { ...x, done: !x.done }
                                            : x,
                                    ),
                                )
                            }
                        />
                        <input
                            aria-label="Checklist item title"
                            value={c.title}
                            onChange={(e) =>
                                change(
                                    "checklist",
                                    t.checklist.map((x) =>
                                        x.id === c.id
                                            ? { ...x, title: e.target.value }
                                            : x,
                                    ),
                                )
                            }
                        />
                        <button
                            type="button"
                            className="plain"
                            aria-label={`Remove checklist item ${c.title}`}
                            onClick={() =>
                                change(
                                    "checklist",
                                    t.checklist.filter((x) => x.id !== c.id),
                                )
                            }
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
            <div className="check-add">
                <input
                    aria-label="New checklist item"
                    value={check}
                    onChange={(e) => setCheck(e.target.value)}
                    placeholder="Another small step"
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            if (check.trim()) {
                                change("checklist", [
                                    ...t.checklist,
                                    {
                                        id: uid(),
                                        title: check.trim(),
                                        done: false,
                                    },
                                ]);
                                setCheck("");
                            }
                        }
                    }}
                />
                <button
                    className="secondary"
                    type="button"
                    onClick={() => {
                        if (check.trim()) {
                            change("checklist", [
                                ...t.checklist,
                                { id: uid(), title: check.trim(), done: false },
                            ]);
                            setCheck("");
                        }
                    }}
                >
                    Add
                </button>
            </div>
            <div className="form-footer">
                {existing && (
                    <button
                        className="danger plain"
                        type="button"
                        disabled={busy}
                        onClick={remove}
                    >
                        Move to Trash
                    </button>
                )}
                <button
                    className="primary"
                    disabled={
                        busy ||
                        !t.title.trim() ||
                        t.checklist.some((c) => !c.title.trim())
                    }
                >
                    Save task →
                </button>
            </div>
        </form>
    );
}
function ProjectForm({
    project,
    w,
    busy,
    save,
}: {
    project: Project;
    w: Workspace;
    busy: boolean;
    save: (p: Project) => void;
}) {
    const [p, set] = useState({ ...project });
    const change = <K extends keyof Project>(key: K, value: Project[K]) =>
        set((s) => ({ ...s, [key]: value }));
    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                if (p.title.trim()) save({ ...p, title: p.title.trim() });
            }}
        >
            <div className="eyebrow">A FINISH LINE YOU CAN SEE</div>
            <h2>
                {w.projects.some((x) => x.id === p.id)
                    ? "Shape your project."
                    : "One doable project."}
            </h2>
            <label>
                Outcome
                <input
                    required
                    maxLength={500}
                    value={p.title}
                    placeholder="Launch the first pilot"
                    onChange={(e) => change("title", e.target.value)}
                />
            </label>
            <label>
                Done means…
                <textarea
                    rows={2}
                    value={p.doneMeans}
                    onChange={(e) => change("doneMeans", e.target.value)}
                    placeholder="What will be true when this is finished?"
                />
            </label>
            <label>
                Notes
                <textarea
                    rows={3}
                    value={p.notes}
                    onChange={(e) => change("notes", e.target.value)}
                />
            </label>
            <label>
                Area
                <select
                    value={p.areaId ?? ""}
                    onChange={(e) => change("areaId", e.target.value || null)}
                >
                    <option value="">No area</option>
                    {w.areas.map((a) => (
                        <option key={a.id} value={a.id}>
                            {a.title}
                        </option>
                    ))}
                </select>
            </label>
            <div className="form-grid">
                <label>
                    Deadline
                    <input
                        type="date"
                        min="1900-01-01"
                        max="9999-12-31"
                        value={p.deadline ?? ""}
                        onChange={(e) =>
                            change("deadline", e.target.value || null)
                        }
                    />
                </label>
                <label>
                    Status
                    <select
                        value={p.state}
                        onChange={(e) =>
                            change("state", e.target.value as Project["state"])
                        }
                    >
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="archived">Archived</option>
                    </select>
                </label>
            </div>
            <p className="help">
                Completing or archiving a project hides its unfinished actions
                from active lists. Reopen it from Logbook.
            </p>
            <div className="form-footer">
                {w.projects.some((x) => x.id === p.id) && (
                    <button
                        type="button"
                        className="danger plain"
                        disabled={busy}
                        onClick={() =>
                            save({
                                ...p,
                                deletedAt: p.deletedAt
                                    ? null
                                    : new Date().toISOString(),
                            })
                        }
                    >
                        {p.deletedAt
                            ? "Restore project"
                            : "Move project to Trash"}
                    </button>
                )}
                <button className="primary" disabled={busy || !p.title.trim()}>
                    Save project →
                </button>
            </div>
        </form>
    );
}
function AreaForm({
    w,
    id,
    busy,
    save,
    remove,
}: {
    w: Workspace;
    id: string | null;
    busy: boolean;
    save: (s: string) => void;
    remove: () => void;
}) {
    const [title, set] = useState(
        w.areas.find((a) => a.id === id)?.title ?? "",
    );
    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                if (title.trim()) save(title.trim());
            }}
        >
            <div className="eyebrow">A PART OF YOUR LIFE</div>
            <h2>{id ? "Your area." : "Create an area."}</h2>
            <p className="help">
                An ongoing responsibility, without a finish date.
            </p>
            <label>
                Name
                <input
                    required
                    maxLength={100}
                    value={title}
                    onChange={(e) => set(e.target.value)}
                    placeholder="Personal, Health, Creative…"
                />
            </label>
            <div className="form-footer">
                {id && (
                    <button
                        type="button"
                        className="plain danger"
                        disabled={busy}
                        onClick={remove}
                    >
                        Delete empty area
                    </button>
                )}
                <button className="primary" disabled={busy || !title.trim()}>
                    Save area →
                </button>
            </div>
        </form>
    );
}
createRoot(document.getElementById("root")!).render(<App />);
