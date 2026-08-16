import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { signOut } from "../login/actions";
import { Sidebar, BottomNav } from "@/components/Nav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";
import { Avatar } from "@/components/ui";

/**
 * The shell renders from the session lookup alone — one indexed query — so the
 * frame is on screen before any page data is gathered.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b bg-bg/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-5">
          <Link href="/" aria-label="LifeScore home"><Logo /></Link>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <Link href="/profile" className="btn btn-ghost px-1.5" aria-label="Your profile">
              <Avatar name={user.name} hue={user.avatar_hue} size={26} />
            </Link>
            <form action={signOut}>
              <button type="submit" className="btn btn-ghost text-xs">Sign out</button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-5xl gap-8 px-5 pb-24 pt-6 lg:pb-10">
        <Sidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <BottomNav />
    </div>
  );
}
