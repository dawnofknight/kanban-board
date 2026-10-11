import type { Activity, Board, Card, ChecklistItem, Comment, List, TimeLog, User } from "./types";

const t = (daysOffset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString();
};

export const seedUsers: User[] = [
  { id: "u_admin", name: "Ava Admin", email: "admin@example.com", password: "password", role: "admin", avatarColor: "bg-violet-600" },
  { id: "u_member", name: "Milo Member", email: "member@example.com", password: "password", role: "member", avatarColor: "bg-blue-600" },
  { id: "u_client", name: "Cora Client", email: "client@example.com", password: "password", role: "client", avatarColor: "bg-emerald-600" },
];

export const seedBoards: Board[] = [
  {
    id: "b_website",
    title: "Website Redesign — Acme Corp",
    description: "Full redesign: homepage, pricing, blog. Client reviews every Friday.",
    background: "from-blue-600 to-indigo-700",
    memberIds: ["u_admin", "u_member"],
    clientIds: ["u_client"],
    favorite: true,
    archived: false,
    createdAt: t(-14),
    updatedAt: t(-1),
  },
  {
    id: "b_mobile",
    title: "Mobile App MVP",
    description: "MVP scope: auth, kanban view, push notifications.",
    background: "from-emerald-500 to-teal-700",
    memberIds: ["u_admin", "u_member"],
    clientIds: [],
    favorite: false,
    archived: false,
    createdAt: t(-10),
    updatedAt: t(-2),
  },
];

export const seedLists: List[] = [
  { id: "l_backlog", boardId: "b_website", title: "Backlog", order: 0 },
  { id: "l_progress", boardId: "b_website", title: "In Progress", order: 1 },
  { id: "l_review", boardId: "b_website", title: "In Review", order: 2 },
  { id: "l_done", boardId: "b_website", title: "Done", order: 3 },
  { id: "m_backlog", boardId: "b_mobile", title: "Backlog", order: 0 },
  { id: "m_progress", boardId: "b_mobile", title: "In Progress", order: 1 },
  { id: "m_done", boardId: "b_mobile", title: "Done", order: 2 },
];

export const seedCards: Card[] = [
  {
    id: "c_hero", boardId: "b_website", listId: "l_progress",
    title: "Redesign homepage hero section",
    description: "New headline, subcopy + CTA. Reference Figma v3. Needs client approval on imagery.",
    order: 0, labelIds: ["blue", "purple"], memberIds: ["u_member"],
    dueDate: t(2), completed: false, archived: false, createdAt: t(-6), updatedAt: t(-1),
  },
  {
    id: "c_pricing", boardId: "b_website", listId: "l_backlog",
    title: "Pricing page copy + layout",
    description: "3 tiers. Include FAQ accordion and monthly/yearly toggle.",
    order: 0, labelIds: ["blue"], memberIds: ["u_admin"],
    dueDate: t(5), completed: false, archived: false, createdAt: t(-5), updatedAt: t(-3),
  },
  {
    id: "c_blog", boardId: "b_website", listId: "l_review",
    title: "Blog template + CMS wiring",
    description: "Waiting on client feedback for author bios.",
    order: 0, labelIds: ["yellow"], memberIds: ["u_member", "u_admin"],
    dueDate: t(-1), completed: false, archived: false, createdAt: t(-8), updatedAt: t(-1),
  },
  {
    id: "c_launch", boardId: "b_website", listId: "l_done",
    title: "Sitemap + IA approved",
    description: "Approved by client on kickoff call.",
    order: 0, labelIds: ["green"], memberIds: ["u_admin"],
    dueDate: t(-10), completed: true, archived: false, createdAt: t(-13), updatedAt: t(-9),
  },
  {
    id: "c_auth", boardId: "b_mobile", listId: "m_progress",
    title: "Auth flow (email + OAuth)",
    description: "Email magic link + Google OAuth. Store session securely.",
    order: 0, labelIds: ["red", "blue"], memberIds: ["u_member"],
    dueDate: t(3), completed: false, archived: false, createdAt: t(-4), updatedAt: t(-1),
  },
  {
    id: "c_push", boardId: "b_mobile", listId: "m_backlog",
    title: "Push notifications setup",
    description: "FCM/APNs research spike first.",
    order: 0, labelIds: ["orange"], memberIds: [],
    dueDate: null, completed: false, archived: false, createdAt: t(-2), updatedAt: t(-2),
  },
];

export const seedChecklist: ChecklistItem[] = [
  { id: "ch1", cardId: "c_hero", text: "Wireframe hero variants", done: true },
  { id: "ch2", cardId: "c_hero", text: "Hi-fi in Figma", done: true },
  { id: "ch3", cardId: "c_hero", text: "Client approval on imagery", done: false },
  { id: "ch4", cardId: "c_hero", text: "Implement in Next.js", done: false },
  { id: "ch5", cardId: "c_auth", text: "Magic link email template", done: true },
  { id: "ch6", cardId: "c_auth", text: "Google OAuth credentials", done: false },
];

export const seedComments: Comment[] = [
  { id: "cm1", cardId: "c_hero", userId: "u_client", text: "Love direction 2! Can we try a darker hero background?", createdAt: t(-2) },
  { id: "cm2", cardId: "c_hero", userId: "u_member", text: "On it — pushing updated mock today.", createdAt: t(-1) },
  { id: "cm3", cardId: "c_blog", userId: "u_admin", text: "Sent author bio request to client, awaiting reply.", createdAt: t(-1) },
];

export const seedTimeLogs: TimeLog[] = [
  { id: "tl1", cardId: "c_hero", userId: "u_member", hours: 3.5, note: "Hero hi-fi mockups", date: t(-2).slice(0, 10), createdAt: t(-2) },
  { id: "tl2", cardId: "c_hero", userId: "u_member", hours: 2, note: "Revisions after feedback", date: t(-1).slice(0, 10), createdAt: t(-1) },
  { id: "tl3", cardId: "c_blog", userId: "u_admin", hours: 4, note: "CMS schema + template", date: t(-3).slice(0, 10), createdAt: t(-3) },
];

export const seedActivity: Activity[] = [
  { id: "a1", boardId: "b_website", cardId: "c_launch", userId: "u_client", text: "approved Sitemap + IA", createdAt: t(-9) },
  { id: "a2", boardId: "b_website", cardId: "c_hero", userId: "u_member", text: "moved Redesign homepage hero section to In Progress", createdAt: t(-4) },
  { id: "a3", boardId: "b_website", cardId: "c_hero", userId: "u_member", text: "logged 2h — Revisions after feedback", createdAt: t(-1) },
  { id: "a4", boardId: "b_website", cardId: "c_blog", userId: "u_admin", text: "moved Blog template to In Review", createdAt: t(-1) },
];
