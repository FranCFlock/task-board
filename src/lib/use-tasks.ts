"use client";

import { useCallback, useEffect, useState } from "react";
import { newTaskId, normalizeTask, parseTasks, type TaskDraft } from "./tasks";
import type { Task } from "./types";

// Bump the version if the stored shape changes; old entries are then ignored.
const STORAGE_KEY = "status-board:tasks:v1";

function save(tasks: Task[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // Private mode or full storage: edits still work for this session.
  }
}

/**
 * Task list with create / update / delete, persisted in this browser only.
 * Starts from the demo tasks (same as the server render) and swaps in saved edits after mount.
 */
export function useTasks(demoTasks: Task[], milestoneIds: string[]) {
  const [tasks, setTasks] = useState(demoTasks);
  const [edited, setEdited] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const saved = raw ? parseTasks(JSON.parse(raw), milestoneIds) : null;
      if (saved) {
        setTasks(saved);
        setEdited(true);
      }
    } catch {
      // Unreadable or corrupt storage: keep the demo data.
    }
  }, [milestoneIds]);

  const commit = useCallback((change: (prev: Task[]) => Task[]) => {
    setTasks((prev) => {
      const next = change(prev);
      save(next);
      return next;
    });
    setEdited(true);
  }, []);

  const create = useCallback(
    (draft: TaskDraft) => commit((prev) => [...prev, { ...normalizeTask(draft), id: newTaskId() }]),
    [commit],
  );
  const update = useCallback(
    (id: string, draft: TaskDraft) =>
      commit((prev) => prev.map((t) => (t.id === id ? { ...normalizeTask(draft), id } : t))),
    [commit],
  );
  const remove = useCallback((id: string) => commit((prev) => prev.filter((t) => t.id !== id)), [commit]);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to clean up.
    }
    setTasks(demoTasks);
    setEdited(false);
  }, [demoTasks]);

  return { tasks, edited, create, update, remove, reset };
}
