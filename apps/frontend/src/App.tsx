import React, { useMemo, useState } from "react";
import {
  addBacklogItem,
  getChildLists,
  getRootLists,
  getTasksForList,
  initialBacklog,
  type BacklogState,
  type ListItem,
  type Priority
} from "./backlogMock";

function ListTreeNode({
  state,
  list
}: {
  state: BacklogState;
  list: ListItem;
}) {
  const children = getChildLists(state, list.id);
  const tasks = getTasksForList(state, list.id);

  return (
    <li className="list-node">
      <div className="list-header">
        <strong>{list.title}</strong>
        <span className="list-meta">{tasks.length} tasks</span>
      </div>

      {tasks.length > 0 && (
        <ul className="task-list">
          {tasks.map((task) => (
            <li key={task.id} className="task-item">
              <span>{task.title}</span>
              <span className={`prio p${task.priority}`}>P{task.priority}</span>
            </li>
          ))}
        </ul>
      )}

      {children.length > 0 && (
        <ul className="children-list">
          {children.map((child) => (
            <ListTreeNode key={child.id} state={state} list={child} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function App() {
  const [backlog, setBacklog] = useState(initialBacklog);

  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<Priority>(3);
  const [taskListId, setTaskListId] = useState(initialBacklog.lists[0]?.id ?? "");

  const [listTitle, setListTitle] = useState("");
  const [parentListId, setParentListId] = useState("");

  const rootLists = useMemo(() => getRootLists(backlog), [backlog]);

  const handleAddTask = (event: React.FormEvent) => {
    event.preventDefault();
    if (!taskTitle.trim() || !taskListId) {
      return;
    }

    setBacklog((current) =>
      addBacklogItem(current, {
        kind: "task",
        title: taskTitle,
        priority: taskPriority,
        listId: taskListId
      })
    );

    setTaskTitle("");
  };

  const handleAddList = (event: React.FormEvent) => {
    event.preventDefault();
    if (!listTitle.trim()) {
      return;
    }

    setBacklog((current) =>
      addBacklogItem(current, {
        kind: "list",
        title: listTitle,
        parentListId: parentListId || undefined
      })
    );

    setListTitle("");
    setParentListId("");
  };

  return (
    <main className="app-shell">
      <header className="hero">
        <h1>Backlog Mock Playground</h1>
        <p>Nested lists, mixed task priorities, and local add-item flows for frontend development.</p>
      </header>

      <section className="forms-grid">
        <form className="card" onSubmit={handleAddTask}>
          <h2>Add Task</h2>
          <input
            value={taskTitle}
            onChange={(event) => setTaskTitle(event.target.value)}
            placeholder="Task title"
          />
          <select
            value={taskListId}
            onChange={(event) => setTaskListId(event.target.value)}
          >
            {backlog.lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.title}
              </option>
            ))}
          </select>
          <select
            value={taskPriority}
            onChange={(event) => setTaskPriority(Number(event.target.value) as Priority)}
          >
            <option value={1}>Priority 1</option>
            <option value={2}>Priority 2</option>
            <option value={3}>Priority 3</option>
            <option value={4}>Priority 4</option>
            <option value={5}>Priority 5</option>
          </select>
          <button type="submit">Add Task</button>
        </form>

        <form className="card" onSubmit={handleAddList}>
          <h2>Add List</h2>
          <input
            value={listTitle}
            onChange={(event) => setListTitle(event.target.value)}
            placeholder="List title"
          />
          <select
            value={parentListId}
            onChange={(event) => setParentListId(event.target.value)}
          >
            <option value="">No parent (root list)</option>
            {backlog.lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.title}
              </option>
            ))}
          </select>
          <button type="submit">Add List</button>
        </form>
      </section>

      <section className="tree card">
        <h2>Backlog Tree</h2>
        <ul className="root-list">
          {rootLists.map((list) => (
            <ListTreeNode key={list.id} state={backlog} list={list} />
          ))}
        </ul>
      </section>
    </main>
  );
}
