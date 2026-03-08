'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import type { User } from '@/types';

const NAV_ITEMS = [
  { href: '/dashboard', label: '首页', icon: '📊' },
  { href: '/transactions', label: '交易记录', icon: '💰' },
  { href: '/transactions/new', label: '新增交易', icon: '➕' },
  { href: '/reimbursements', label: '报销管理', icon: '📋' },
  { href: '/reimbursements/new', label: '提交报销', icon: '📝' },
];

const ADMIN_ITEMS = [
  { href: '/admin', label: '管理面板', icon: '⚙️' },
  { href: '/admin/members', label: '成员管理', icon: '👥' },
  { href: '/admin/approvals', label: '审批管理', icon: '✅' },
  { href: '/admin/sync', label: 'Sheets 同步', icon: '🔄' },
  { href: '/export', label: '数据导出', icon: '📥' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => {
        if (!res.ok) throw new Error('Not authenticated');
        return res.json();
      })
      .then(setUser)
      .catch(() => router.push('/login'));
  }, [router]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  const navItems = user.role === 'admin' ? [...NAV_ITEMS, ...ADMIN_ITEMS] : NAV_ITEMS;

  function NavContent({ currentUser }: { currentUser: User }) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4">
          <h2 className="text-lg font-bold">CCS 记账系统</h2>
          <p className="text-sm text-muted-foreground">剑桥中国学生会</p>
        </div>
        <Separator />
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                pathname === item.href
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <Separator />
        <div className="p-4 space-y-2">
          <div className="text-sm">
            <div className="font-medium">{currentUser.name}</div>
            <div className="text-muted-foreground text-xs">{currentUser.email}</div>
            <div className="text-muted-foreground text-xs">
              {currentUser.role === 'admin' ? '管理员' : '成员'}
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
            退出登录
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col border-r bg-card">
        <NavContent currentUser={user} />
      </aside>

      {/* Mobile nav */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b px-4 py-3 flex items-center justify-between">
        <h2 className="font-bold">CCS 记账</h2>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
            菜单
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">导航菜单</SheetTitle>
            <NavContent currentUser={user} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main content */}
      <main className="flex-1 md:p-6 p-4 pt-16 md:pt-6 bg-muted/40 min-h-screen overflow-auto">
        {children}
      </main>
    </div>
  );
}
