import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Map, Sprout, Calendar, Menu, X, ShieldCheck, ChevronRight } from 'lucide-react';

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/farms', label: 'Farm & Fields', icon: Map },
    { to: '/advisory', label: 'Crop Advisory', icon: Sprout },
    { to: '/activities', label: 'Planner & Alerts', icon: Calendar },
  ];

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return { title: 'Telemetry & Intelligence Dashboard', category: 'Overview' };
      case '/farms':
        return { title: 'Farm & Field Management', category: 'Infrastructure' };
      case '/advisory':
        return { title: 'Crop Advisory & Precision Analysis', category: 'AI Decision Engine' };
      case '/activities':
        return { title: 'Activity Planner & Risk Alerts', category: 'Farm Operations' };
      default:
        return { title: 'AgriSārathi Platform', category: 'Portal' };
    }
  };

  const { title, category } = getPageTitle();

  return (
    <div className="min-h-screen bg-[#f8faf9] flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <header className="md:hidden bg-[#0d281a] text-white px-4 py-3 flex items-center justify-between border-b border-emerald-900/60 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-sm ring-1 ring-emerald-400/30">
            <Sprout size={20} className="text-emerald-50" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-white text-lg">AgriSārathi</span>
            <span className="block text-[10px] text-emerald-300 font-medium uppercase tracking-wider -mt-0.5">Farm Intelligence</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          className="p-2 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-900/80 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar (Desktop Persistent + Mobile Drawer) */}
      <aside
        className={`fixed md:sticky top-0 h-screen w-72 bg-[#0c2419] text-white flex flex-col z-50 transition-transform duration-200 ease-in-out md:translate-x-0 border-r border-emerald-950/80 shadow-xl md:shadow-none ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-emerald-900/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-md ring-1 ring-emerald-300/30">
                <Sprout size={22} className="text-emerald-50 animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5 font-sans">
                  AgriSārathi
                </h1>
                <p className="text-emerald-300/90 text-xs font-medium tracking-wide">
                  Agricultural Decision Intelligence
                </p>
              </div>
            </div>
            {/* Close button on mobile */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden text-emerald-300 hover:text-white p-1 rounded-lg"
              aria-label="Close navigation menu"
            >
              <X size={20} />
            </button>
          </div>
          <div className="mt-3.5 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-emerald-900/70 text-emerald-200 px-2.5 py-0.5 rounded-full border border-emerald-700/50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Live Agro-Intelligence
            </span>
            <span className="text-[11px] text-emerald-400/80 font-mono">v2.1</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-emerald-400/80 uppercase">
            Core Modules
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-800 to-emerald-900/90 text-white shadow-sm border border-emerald-700/70 font-semibold'
                      : 'text-emerald-100/80 hover:text-white hover:bg-emerald-900/40'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={19}
                      className={isActive ? 'text-emerald-300' : 'text-emerald-400/70'}
                    />
                    <span className="flex-1">{item.label}</span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer System Status */}
        <div className="p-4 m-3 rounded-xl bg-emerald-950/60 border border-emerald-900/50 text-xs text-emerald-200/90 space-y-2">
          <div className="flex items-center justify-between font-medium">
            <span className="flex items-center gap-1.5 text-emerald-300">
              <ShieldCheck size={14} className="text-emerald-400" />
              Agri-Agents
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300 font-mono bg-emerald-900/50 px-2 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Operational
            </span>
          </div>
          <p className="text-[11px] text-emerald-300/70 leading-relaxed">
            Multi-agent RAG, soil analytics & sensor telemetry active.
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar for Desktop */}
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-200/70 px-6 py-4 hidden md:flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="font-medium text-emerald-700">{category}</span>
            <ChevronRight size={14} className="text-gray-400" />
            <span className="font-semibold text-gray-800">{title}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/70 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Precision Agriculture Active
            </div>
          </div>
        </div>

        {/* Content View */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
