import { integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(), // admin | member | client
  avatarColor: text("avatar_color").notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: integer("expires_at").notNull(), // epoch ms
});

export const boards = sqliteTable("boards", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  background: text("background").notNull(),
  favorite: integer("favorite").notNull().default(0),
  archived: integer("archived").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const boardMembers = sqliteTable(
  "board_members",
  {
    boardId: text("board_id")
      .notNull()
      .references(() => boards.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    kind: text("kind").notNull(), // member | client
  },
  (t) => [primaryKey({ columns: [t.boardId, t.userId] })]
);

export const lists = sqliteTable("lists", {
  id: text("id").primaryKey(),
  boardId: text("board_id")
    .notNull()
    .references(() => boards.id),
  title: text("title").notNull(),
  position: integer("position").notNull().default(0),
});

export const cards = sqliteTable("cards", {
  id: text("id").primaryKey(),
  boardId: text("board_id")
    .notNull()
    .references(() => boards.id),
  listId: text("list_id")
    .notNull()
    .references(() => lists.id),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  position: integer("position").notNull().default(0),
  dueDate: text("due_date"),
  completed: integer("completed").notNull().default(0),
  archived: integer("archived").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const cardLabels = sqliteTable(
  "card_labels",
  {
    cardId: text("card_id")
      .notNull()
      .references(() => cards.id),
    label: text("label").notNull(), // LabelColor
  },
  (t) => [primaryKey({ columns: [t.cardId, t.label] })]
);

export const cardMembers = sqliteTable(
  "card_members",
  {
    cardId: text("card_id")
      .notNull()
      .references(() => cards.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
  },
  (t) => [primaryKey({ columns: [t.cardId, t.userId] })]
);

export const checklistItems = sqliteTable("checklist_items", {
  id: text("id").primaryKey(),
  cardId: text("card_id")
    .notNull()
    .references(() => cards.id),
  text: text("text").notNull(),
  done: integer("done").notNull().default(0),
});

export const comments = sqliteTable("comments", {
  id: text("id").primaryKey(),
  cardId: text("card_id")
    .notNull()
    .references(() => cards.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  text: text("text").notNull(),
  createdAt: text("created_at").notNull(),
});

export const timeLogs = sqliteTable("time_logs", {
  id: text("id").primaryKey(),
  cardId: text("card_id")
    .notNull()
    .references(() => cards.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  hours: real("hours").notNull(),
  note: text("note").notNull().default(""),
  date: text("date").notNull(),
  createdAt: text("created_at").notNull(),
});

export const activities = sqliteTable("activities", {
  id: text("id").primaryKey(),
  boardId: text("board_id")
    .notNull()
    .references(() => boards.id),
  cardId: text("card_id"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  text: text("text").notNull(),
  createdAt: text("created_at").notNull(),
});
