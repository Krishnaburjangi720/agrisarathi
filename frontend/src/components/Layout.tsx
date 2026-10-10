import { NavLink, Outlet } from 'react-router-dom';
import { Home, Map, Sprout, Calendar } from 'lucide-react';

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-green-800 text-white flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight text-green-100 flex items-center gap-2">
            <Sprout size={28} />
            AgriSārathi
          </h1>
          <p className="text-green-300 text-sm mt-1">Farm Intelligence</p>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive ? 'bg-green-700 font-semibold' : 'hover:bg-green-700/50 text-green-100'
              }`
            }
          >
            <Home size={20} />
            Dashboard
          </NavLink>
          <NavLink
            to="/farms"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive ? 'bg-green-700 font-semibold' : 'hover:bg-green-700/50 text-green-100'
              }`
            }
          >
            <Map size={20} />
            Farm & Fields
          </NavLink>
          <NavLink
            to="/advisory"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive ? 'bg-green-700 font-semibold' : 'hover:bg-green-700/50 text-green-100'
              }`
            }
          >
            <Sprout size={20} />
            Crop Advisory
          </NavLink>
          <NavLink
            to="/activities"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive ? 'bg-green-700 font-semibold' : 'hover:bg-green-700/50 text-green-100'
              }`
            }
          >
            <Calendar size={20} />
            Planner & Alerts
          </NavLink>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
