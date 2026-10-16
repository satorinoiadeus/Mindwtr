import test from "node:test";
import assert from "node:assert/strict";
import { newTask } from "./domain";
import { boardColumns, boardLane, calendarCells, filterAndSortTasks } from "./project-views";

test("board has stable default lanes and preserves existing custom headings", () => {
    assert.equal(boardLane({ heading: "" }), "To do");
    assert.deepEqual(boardColumns([{ heading: "" }, { heading: "Review" }, { heading: "Review" }]),
        ["To do", "In progress", "Waiting", "Review"]);
});

test("filter and sort never mutate the persisted workspace order", () => {
    const a = { ...newTask("Zebra"), priority: "low" as const, order: 0, tags: ["home"] };
    const b = { ...newTask("Alpha"), priority: "high" as const, order: 1, scheduled: "2026-10-20" };
    const source = [a, b];
    assert.deepEqual(filterAndSortTasks(source, "", "all", "priority").map(t => t.title), ["Alpha", "Zebra"]);
    assert.deepEqual(source.map(t => t.title), ["Zebra", "Alpha"]);
    assert.deepEqual(filterAndSortTasks(source, "home", "low", "position").map(t => t.title), ["Zebra"]);
});

test("calendar starts on Monday and includes leap day", () => {
    const cells = calendarCells(2024, 1);
    assert.equal(cells.filter(Boolean).length, 29);
    assert.equal(cells[3], "2024-02-01");
    assert.ok(cells.includes("2024-02-29"));
});
