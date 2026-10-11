export type Role = "admin" | "member" | "client";

export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // plain for local demo only
  role: Role;
  avatarColor: string;
}

export type LabelColor = "red" | "orange" | "yellow" | "green" | "blue" | "purple";

export const LABELS: Record<LabelColor, { name: string; bg: string; dot: string }> = {
  red: { name: "Bug / Urgent", bg: "bg-red-500", dot: "bg-red-500" },
  orange: { name: "High priority", bg: "bg-orange-500", dot: "bg-orange-500" },
  yellow: { name: "In review", bg: "bg-yellow-400", dot: "bg-yellow-400" },
  green: { name: "Approved / Done", bg: "bg-green-500", dot: "bg-green-500" },
  blue: { name: "Feature", bg: "bg-blue-500", dot: "bg-blue-500" },
  purple: { name: "Design", bg: "bg-purple-500", dot: "bg-purple-500" },
};

export interface Board {
  id: string;
  title: string;
  description: string;
  background: string;
  memberIds: string[];
  clientIds: string[];
  favorite: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface List {
  id: string;
  boardId: string;
  title: string;
  order: number;
}

export interface Card {
  id: string;
  boardId: string;
  listId: string;
  title: string;
  description: string;
  order: number;
  labelIds: LabelColor[];
  memberIds: string[];
  dueDate: string | null;
  completed: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItem {
  id: string;
  cardId: string;
  text: string;
  done: boolean;
}

export interface Comment {
  id: string;
  cardId: string;
  userId: string;
  text: string;
  createdAt: string;
}

export interface TimeLog {
  id: string;
  cardId: string;
  userId: string;
  hours: number;
  note: string;
  date: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  boardId: string;
  cardId: string | null;
  userId: string;
  text: string;
  createdAt: string;
}

/** Client → server mutation intents. IDs are generated client-side so the
 *  optimistic UI and D1 rows stay identical without a refetch. */
export type CardOrderUpdate = { id: string; listId: string; order: number; completed?: boolean };
export type ListOrderUpdate = { id: string; order: number };

export type MutateOp =
  | { op: "createBoard"; board: Board; lists: List[]; activity: Activity }
  | {
      op: "updateBoard";
      id: string;
      patch: Partial<Pick<Board, "title" | "description" | "background" | "favorite" | "archived">>;
      memberIds?: string[];
      clientIds?: string[];
    }
  | { op: "deleteBoard"; id: string }
  | { op: "createList"; list: List }
  | { op: "updateList"; id: string; title: string }
  | { op: "deleteList"; id: string; cardIds: string[] }
  | { op: "moveList"; boardId: string; updates: ListOrderUpdate[] }
  | { op: "createCard"; card: Card; activity: Activity }
  | {
      op: "updateCard";
      id: string;
      patch: Partial<Pick<Card, "title" | "description" | "dueDate" | "completed" | "archived">>;
      labelIds?: LabelColor[];
      memberIds?: string[];
    }
  | { op: "deleteCard"; id: string }
  | { op: "archiveCard"; id: string; archived: boolean; activity: Activity }
  | { op: "moveCard"; boardId: string; updates: CardOrderUpdate[]; activity: Activity }
  | { op: "toggleLabel"; cardId: string; labelIds: LabelColor[] }
  | { op: "addChecklistItem"; item: ChecklistItem }
  | { op: "toggleChecklistItem"; id: string; done: boolean }
  | { op: "deleteChecklistItem"; id: string }
  | { op: "addComment"; comment: Comment; activity: Activity }
  | { op: "deleteComment"; id: string }
  | { op: "addTimeLog"; log: TimeLog; activity: Activity }
  | { op: "deleteTimeLog"; id: string }
  | { op: "updateUserRole"; userId: string; role: Role }
  | { op: "resetDemo" };
