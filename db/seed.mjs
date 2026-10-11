// Generates db/seed.sql with bcrypt-hashed demo passwords + demo workspace.
// Run: node db/seed.mjs   (then apply with wrangler d1 execute --local/--remote --file=db/seed.sql)
import { hashSync } from "bcryptjs";
import { writeFileSync } from "node:fs";

const passwordHash = hashSync("password", 10);
const t = (daysOffset) => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString();
};
const q = (v) => (v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
const b = (v) => (v ? 1 : 0);

const rows = [];
rows.push(`-- TaskBoard demo seed (all demo passwords: "password")`);
rows.push(`INSERT INTO users (id,name,email,password_hash,role,avatar_color) VALUES
  ('u_admin','Fajar Satria','admin@example.com','${passwordHash}','admin','bg-violet-600'),
  ('u_member','Dustin Bird','member@example.com','${passwordHash}','member','bg-blue-600'),
  ('u_client','Cora Client','client@example.com','${passwordHash}','client','bg-emerald-600');`);
rows.push(`INSERT INTO boards (id,title,description,background,favorite,archived,created_at,updated_at) VALUES
  ('b_website','Website Redesign — Acme Corp','Full redesign: homepage, pricing, blog. Client reviews every Friday.','from-blue-600 to-indigo-700',1,0,${q(t(-14))},${q(t(-1))}),
  ('b_mobile','Mobile App MVP','MVP scope: auth, kanban view, push notifications.','from-emerald-500 to-teal-700',0,0,${q(t(-10))},${q(t(-2))});`);
rows.push(`INSERT INTO board_members (board_id,user_id,kind) VALUES
  ('b_website','u_admin','member'),('b_website','u_member','member'),('b_website','u_client','client'),
  ('b_mobile','u_admin','member'),('b_mobile','u_member','member');`);
rows.push(`INSERT INTO lists (id,board_id,title,position) VALUES
  ('l_backlog','b_website','Backlog',0),('l_progress','b_website','In Progress',1),
  ('l_review','b_website','In Review',2),('l_done','b_website','Done',3),
  ('m_backlog','b_mobile','Backlog',0),('m_progress','b_mobile','In Progress',1),('m_done','b_mobile','Done',2);`);

const cards = [
  ["c_hero","b_website","l_progress","Redesign homepage hero section","New headline, subcopy + CTA. Reference Figma v3. Needs client approval on imagery.",0,t(2),0],
  ["c_pricing","b_website","l_backlog","Pricing page copy + layout","3 tiers. Include FAQ accordion and monthly/yearly toggle.",0,t(5),0],
  ["c_blog","b_website","l_review","Blog template + CMS wiring","Waiting on client feedback for author bios.",0,t(-1),0],
  ["c_launch","b_website","l_done","Sitemap + IA approved","Approved by client on kickoff call.",0,t(-10),1],
  ["c_auth","b_mobile","m_progress","Auth flow (email + OAuth)","Email magic link + Google OAuth. Store session securely.",0,t(3),0],
  ["c_push","b_mobile","m_backlog","Push notifications setup","FCM/APNs research spike first.",0,null,0],
];
rows.push(`INSERT INTO cards (id,board_id,list_id,title,description,position,due_date,completed,archived,created_at,updated_at) VALUES\n` +
  cards.map(([id,bid,lid,title,desc,pos,due,done], i) =>
    `  (${q(id)},${q(bid)},${q(lid)},${q(title)},${q(desc)},${pos},${q(due)},${b(done)},0,${q(t(-(6-i)))},${q(t(-1))})`).join(",\n") + ";");
rows.push(`INSERT INTO card_labels (card_id,label) VALUES
  ('c_hero','blue'),('c_hero','purple'),('c_pricing','blue'),('c_blog','yellow'),('c_launch','green'),('c_auth','red'),('c_auth','blue'),('c_push','orange');`);
rows.push(`INSERT INTO card_members (card_id,user_id) VALUES
  ('c_hero','u_member'),('c_pricing','u_admin'),('c_blog','u_member'),('c_blog','u_admin'),('c_launch','u_admin'),('c_auth','u_member');`);
rows.push(`INSERT INTO checklist_items (id,card_id,text,done) VALUES
  ('ch1','c_hero','Wireframe hero variants',1),('ch2','c_hero','Hi-fi in Figma',1),
  ('ch3','c_hero','Client approval on imagery',0),('ch4','c_hero','Implement in Next.js',0),
  ('ch5','c_auth','Magic link email template',1),('ch6','c_auth','Google OAuth credentials',0);`);
rows.push(`INSERT INTO comments (id,card_id,user_id,text,created_at) VALUES
  ('cm1','c_hero','u_client','Love direction 2! Can we try a darker hero background?',${q(t(-2))}),
  ('cm2','c_hero','u_member','On it — pushing updated mock today.',${q(t(-1))}),
  ('cm3','c_blog','u_admin','Sent author bio request to client, awaiting reply.',${q(t(-1))});`);
rows.push(`INSERT INTO time_logs (id,card_id,user_id,hours,note,date,created_at) VALUES
  ('tl1','c_hero','u_member',3.5,'Hero hi-fi mockups',${q(t(-2).slice(0,10))},${q(t(-2))}),
  ('tl2','c_hero','u_member',2,'Revisions after feedback',${q(t(-1).slice(0,10))},${q(t(-1))}),
  ('tl3','c_blog','u_admin',4,'CMS schema + template',${q(t(-3).slice(0,10))},${q(t(-3))});`);
rows.push(`INSERT INTO activities (id,board_id,card_id,user_id,text,created_at) VALUES
  ('a1','b_website','c_launch','u_client','approved Sitemap + IA',${q(t(-9))}),
  ('a2','b_website','c_hero','u_member','moved Redesign homepage hero section to In Progress',${q(t(-4))}),
  ('a3','b_website','c_hero','u_member','logged 2h — Revisions after feedback',${q(t(-1))}),
  ('a4','b_website','c_blog','u_admin','moved Blog template to In Review',${q(t(-1))});`);

writeFileSync(new URL("./seed.sql", import.meta.url), rows.join("\n") + "\n");
console.log("Wrote db/seed.sql");
