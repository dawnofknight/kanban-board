-- TaskBoard demo seed (all demo passwords: "password")
INSERT INTO users (id,name,email,password_hash,role,avatar_color) VALUES
  ('u_admin','Ava Admin','admin@example.com','$2b$10$kC2CqptxGs04h0lX4yhAOuvvc/2D0vbGa.mzXMBwtJACnXSGkIwgW','admin','bg-violet-600'),
  ('u_member','Milo Member','member@example.com','$2b$10$kC2CqptxGs04h0lX4yhAOuvvc/2D0vbGa.mzXMBwtJACnXSGkIwgW','member','bg-blue-600'),
  ('u_client','Cora Client','client@example.com','$2b$10$kC2CqptxGs04h0lX4yhAOuvvc/2D0vbGa.mzXMBwtJACnXSGkIwgW','client','bg-emerald-600');
INSERT INTO boards (id,title,description,background,favorite,archived,created_at,updated_at) VALUES
  ('b_website','Website Redesign — Acme Corp','Full redesign: homepage, pricing, blog. Client reviews every Friday.','from-blue-600 to-indigo-700',1,0,'2026-09-27T13:14:30.828Z','2026-10-10T13:14:30.829Z'),
  ('b_mobile','Mobile App MVP','MVP scope: auth, kanban view, push notifications.','from-emerald-500 to-teal-700',0,0,'2026-10-01T13:14:30.829Z','2026-10-09T13:14:30.829Z');
INSERT INTO board_members (board_id,user_id,kind) VALUES
  ('b_website','u_admin','member'),('b_website','u_member','member'),('b_website','u_client','client'),
  ('b_mobile','u_admin','member'),('b_mobile','u_member','member');
INSERT INTO lists (id,board_id,title,position) VALUES
  ('l_backlog','b_website','Backlog',0),('l_progress','b_website','In Progress',1),
  ('l_review','b_website','In Review',2),('l_done','b_website','Done',3),
  ('m_backlog','b_mobile','Backlog',0),('m_progress','b_mobile','In Progress',1),('m_done','b_mobile','Done',2);
INSERT INTO cards (id,board_id,list_id,title,description,position,due_date,completed,archived,created_at,updated_at) VALUES
  ('c_hero','b_website','l_progress','Redesign homepage hero section','New headline, subcopy + CTA. Reference Figma v3. Needs client approval on imagery.',0,'2026-10-13T13:14:30.829Z',0,0,'2026-10-05T13:14:30.829Z','2026-10-10T13:14:30.829Z'),
  ('c_pricing','b_website','l_backlog','Pricing page copy + layout','3 tiers. Include FAQ accordion and monthly/yearly toggle.',0,'2026-10-16T13:14:30.829Z',0,0,'2026-10-06T13:14:30.829Z','2026-10-10T13:14:30.829Z'),
  ('c_blog','b_website','l_review','Blog template + CMS wiring','Waiting on client feedback for author bios.',0,'2026-10-10T13:14:30.829Z',0,0,'2026-10-07T13:14:30.829Z','2026-10-10T13:14:30.829Z'),
  ('c_launch','b_website','l_done','Sitemap + IA approved','Approved by client on kickoff call.',0,'2026-10-01T13:14:30.829Z',1,0,'2026-10-08T13:14:30.829Z','2026-10-10T13:14:30.829Z'),
  ('c_auth','b_mobile','m_progress','Auth flow (email + OAuth)','Email magic link + Google OAuth. Store session securely.',0,'2026-10-14T13:14:30.829Z',0,0,'2026-10-09T13:14:30.829Z','2026-10-10T13:14:30.829Z'),
  ('c_push','b_mobile','m_backlog','Push notifications setup','FCM/APNs research spike first.',0,NULL,0,0,'2026-10-10T13:14:30.829Z','2026-10-10T13:14:30.829Z');
INSERT INTO card_labels (card_id,label) VALUES
  ('c_hero','blue'),('c_hero','purple'),('c_pricing','blue'),('c_blog','yellow'),('c_launch','green'),('c_auth','red'),('c_auth','blue'),('c_push','orange');
INSERT INTO card_members (card_id,user_id) VALUES
  ('c_hero','u_member'),('c_pricing','u_admin'),('c_blog','u_member'),('c_blog','u_admin'),('c_launch','u_admin'),('c_auth','u_member');
INSERT INTO checklist_items (id,card_id,text,done) VALUES
  ('ch1','c_hero','Wireframe hero variants',1),('ch2','c_hero','Hi-fi in Figma',1),
  ('ch3','c_hero','Client approval on imagery',0),('ch4','c_hero','Implement in Next.js',0),
  ('ch5','c_auth','Magic link email template',1),('ch6','c_auth','Google OAuth credentials',0);
INSERT INTO comments (id,card_id,user_id,text,created_at) VALUES
  ('cm1','c_hero','u_client','Love direction 2! Can we try a darker hero background?','2026-10-09T13:14:30.829Z'),
  ('cm2','c_hero','u_member','On it — pushing updated mock today.','2026-10-10T13:14:30.829Z'),
  ('cm3','c_blog','u_admin','Sent author bio request to client, awaiting reply.','2026-10-10T13:14:30.829Z');
INSERT INTO time_logs (id,card_id,user_id,hours,note,date,created_at) VALUES
  ('tl1','c_hero','u_member',3.5,'Hero hi-fi mockups','2026-10-09','2026-10-09T13:14:30.829Z'),
  ('tl2','c_hero','u_member',2,'Revisions after feedback','2026-10-10','2026-10-10T13:14:30.829Z'),
  ('tl3','c_blog','u_admin',4,'CMS schema + template','2026-10-08','2026-10-08T13:14:30.829Z');
INSERT INTO activities (id,board_id,card_id,user_id,text,created_at) VALUES
  ('a1','b_website','c_launch','u_client','approved Sitemap + IA','2026-10-02T13:14:30.829Z'),
  ('a2','b_website','c_hero','u_member','moved Redesign homepage hero section to In Progress','2026-10-07T13:14:30.829Z'),
  ('a3','b_website','c_hero','u_member','logged 2h — Revisions after feedback','2026-10-10T13:14:30.829Z'),
  ('a4','b_website','c_blog','u_admin','moved Blog template to In Review','2026-10-10T13:14:30.829Z');
