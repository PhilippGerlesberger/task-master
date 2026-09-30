export type Priority = 1 | 2 | 3 | 4 | 5;
export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

export interface ListItem {
  kind: "list";
  id: string;
  title: string;
  parentListId?: string;
  childListIds: string[];
}

export interface TaskItem {
  kind: "task";
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  listIds: string[];
}

export interface BacklogState {
  lists: ListItem[];
  tasks: TaskItem[];
}

export type AddItemInput =
  | {
      kind: "list";
      title: string;
      parentListId?: string;
    }
  | {
      kind: "task";
      title: string;
      description?: string;
      priority: Priority;
      listId: string;
    };

function createId(prefix: "list" | "task"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export const initialBacklog: BacklogState = {
  lists: [
    {
      kind: "list",
      id: "list-home",
      title: "Home",
      childListIds: ["list-home-routines", "list-home-shopping"]
    },
    {
      kind: "list",
      id: "list-home-routines",
      title: "Routines",
      parentListId: "list-home",
      childListIds: []
    },
    {
      kind: "list",
      id: "list-home-shopping",
      title: "Shopping",
      parentListId: "list-home",
      childListIds: []
    },
    {
      kind: "list",
      id: "list-work",
      title: "Work",
      childListIds: ["list-work-release"]
    },
    {
      kind: "list",
      id: "list-work-release",
      title: "Release 1.0",
      parentListId: "list-work",
      childListIds: ["list-work-release-frontend"]
    },
    {
      kind: "list",
      id: "list-work-release-frontend",
      title: "Frontend",
      parentListId: "list-work-release",
      childListIds: []
    }
  ],
  tasks: [
    {
      kind: "task",
      id: "task-1",
      title: "Prepare weekly groceries",
      description: "Milk, vegetables, coffee",
      status: "TODO",
      priority: 2,
      listIds: ["list-home-shopping"]
    },
    {
      kind: "task",
      id: "task-2",
      title: "Morning stretching",
      status: "IN_PROGRESS",
      priority: 3,
      listIds: ["list-home-routines"]
    },
    {
      kind: "task",
      id: "task-3",
      title: "Implement task board skeleton",
      status: "TODO",
      priority: 5,
      listIds: ["list-work-release-frontend"]
    },
    {
      kind: "task",
      id: "task-4",
      title: "Fix navbar responsive bug",
      status: "DONE",
      priority: 4,
      listIds: ["list-work-release-frontend"]
    }
  ]
};

export function addBacklogItem(state: BacklogState, input: AddItemInput): BacklogState {
  if (input.kind === "list") {
    if (input.parentListId) {
      const parent = state.lists.find((list) => list.id === input.parentListId);
      if (!parent) {
        throw new Error("Parent list does not exist.");
      }
    }

    const nextList: ListItem = {
      kind: "list",
      id: createId("list"),
      title: input.title.trim(),
      parentListId: input.parentListId,
      childListIds: []
    };

    const updatedLists = state.lists.map((list) => {
      if (list.id !== input.parentListId) {
        return list;
      }

      return {
        ...list,
        childListIds: [...list.childListIds, nextList.id]
      };
    });

    return {
      ...state,
      lists: [...updatedLists, nextList]
    };
  }

  const targetList = state.lists.find((list) => list.id === input.listId);
  if (!targetList) {
    throw new Error("Target list does not exist.");
  }

  const nextTask: TaskItem = {
    kind: "task",
    id: createId("task"),
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    status: "TODO",
    priority: input.priority,
    listIds: [input.listId]
  };

  return {
    ...state,
    tasks: [...state.tasks, nextTask]
  };
}

export function getRootLists(state: BacklogState): ListItem[] {
  return state.lists.filter((list) => !list.parentListId);
}

export function getChildLists(state: BacklogState, listId: string): ListItem[] {
  const parent = state.lists.find((list) => list.id === listId);
  if (!parent) {
    return [];
  }

  return parent.childListIds
    .map((childId) => state.lists.find((list) => list.id === childId))
    .filter((list): list is ListItem => Boolean(list));
}

export function getTasksForList(state: BacklogState, listId: string): TaskItem[] {
  return state.tasks.filter((task) => task.listIds.includes(listId));
}
