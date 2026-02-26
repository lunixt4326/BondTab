import { Outlet, NavLink, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Plus, User, Menu, X,
  Shield, ChevronLeft,
} from 'lucide-react';
import { useState } from 'react';
import { WalletButton } from './WalletButton';
import { ToastContainer } from './Toast';
import { useAccount } from 'wagmi';

const navItems = [
  { path: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { path: '/app/new', label: 'New Group', icon: Plus, end: false },
  { path: '/app/profile', label: 'Profile', icon: User, end: false },
];

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-surface-950 flex">
      {/* Background texture */}
      <div
        className="fixed inset-0 bg-cover bg-center opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'url(/bgbondtab.jpg)' }}
      />

      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex flex-col w-56 border-r border-surface-700/50 bg-surface-900/70 backdrop-blur-md relative z-10">
        <Link to="/" className="p-4 flex items-center gap-2.5 border-b border-surface-700/50 group hover:bg-surface-800/40 transition-colors">
          <img src="/logo.png" alt="BondTab" className="w-8 h-8 rounded-lg shadow-md shadow-accent/10 group-hover:shadow-accent/25 transition-shadow" />
          <span className="font-display font-semibold text-sm text-neutral-100 tracking-tight group-hover:text-accent transition-colors">
            BondTab
          </span>
        </Link>
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-accent/10 text-accent border border-accent/20 shadow-sm shadow-accent/5'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-surface-700/40'
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-surface-700/50">
          <div className="flex items-center gap-2 px-3 py-2 text-[10px] text-neutral-600">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Polygon Mainnet
          </div>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-56 bg-surface-900 border-r border-surface-700/50 z-50 lg:hidden"
            >
              <div className="p-4 flex items-center justify-between border-b border-surface-700/50">
                <Link to="/" className="flex items-center gap-2.5 group" onClick={() => setSidebarOpen(false)}>
                  <img src="/logo.png" alt="BondTab" className="w-8 h-8 rounded-lg shadow-md shadow-accent/10" />
                  <span className="font-display font-semibold text-sm text-neutral-100 group-hover:text-accent transition-colors">BondTab</span>
                </Link>
                <button onClick={() => setSidebarOpen(false)} className="text-neutral-500 hover:text-neutral-300 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <nav className="p-3 space-y-0.5">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-accent/10 text-accent border border-accent/20'
                          : 'text-neutral-400 hover:text-neutral-200 hover:bg-surface-700/40'
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </NavLink>
                ))}
              </nav>
              <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-surface-700/50">
                <div className="flex items-center gap-2 px-3 py-2 text-[10px] text-neutral-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Polygon Mainnet
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Topbar */}
        <header className="h-14 border-b border-surface-700/50 bg-surface-900/60 backdrop-blur-md flex items-center justify-between px-4 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            {location.pathname !== '/app' && (
              <NavLink to="/app" className="text-neutral-500 hover:text-neutral-300 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </NavLink>
            )}
          </div>
          <WalletButton />
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {!isConnected ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card p-8 text-center max-w-sm"
              >
                <img src="/logo.png" alt="BondTab" className="w-14 h-14 mx-auto mb-4 rounded-xl shadow-lg shadow-accent/10" />
                <h2 className="font-display font-semibold text-base text-neutral-100 mb-2">
                  Connect Your Wallet
                </h2>
                <p className="text-xs text-neutral-400 mb-5">
                  Connect your wallet to access BondTab groups and expense splitting.
                </p>
                <WalletButton />
              </motion.div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}
