import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Bootstrap } from "@/components/Bootstrap";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TaskBoard — Kanban Project Management",
  description: "Trello clone: boards, lists, cards, time tracking and client progress dashboards.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} min-h-full flex flex-col bg-slate-200 text-slate-900`}>
        <Bootstrap />
        <Navbar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
