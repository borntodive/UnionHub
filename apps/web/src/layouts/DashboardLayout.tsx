import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  Home,
  LogOut,
  Calculator,
  Clock,
  Thermometer,
  FileText,
  Users,
  AlertCircle,
  Menu,
  X,
  Settings,
  Briefcase,
  MapPin,
  Tag,
  Zap,
  BarChart2,
  UserX,
  FileBarChart,
  Award,
} from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "../store/authStore";
import { UserRole } from "@unionhub/shared/types";

/* ─── nav types ──────────────────────────────────────────────── */
interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles?: UserRole[];
}

interface NavSection {
  label: string;
  roles?: UserRole[];
  items: NavItem[];
}

/* ─── nav config ─────────────────────────────────────────────── */
const NAV_SECTIONS: NavSection[] = [
  {
    label: "Principale",
    items: [
      { to: "/", label: "Home", icon: <Home size={17} /> },
      {
        to: "/payslip",
        label: "Busta Paga",
        icon: <Calculator size={17} />,
      },
      { to: "/ftl", label: "FTL Calculator", icon: <Clock size={17} /> },
      {
        to: "/ctc",
        label: "CTC Calculator",
        icon: <Thermometer size={17} />,
      },
      {
        to: "/documents",
        label: "Documenti",
        icon: <FileText size={17} />,
      },
      {
        to: "/my-issues",
        label: "Le mie segnalazioni",
        icon: <AlertCircle size={17} />,
      },
      {
        to: "/settings",
        label: "Impostazioni",
        icon: <Settings size={17} />,
      },
    ],
  },
  {
    label: "Gestione",
    roles: [UserRole.ADMIN, UserRole.SUPERADMIN],
    items: [
      {
        to: "/members",
        label: "Soci",
        icon: <Users size={17} />,
        roles: [UserRole.ADMIN, UserRole.SUPERADMIN],
      },
      {
        to: "/admin/issues",
        label: "Segnalazioni",
        icon: <AlertCircle size={17} />,
        roles: [UserRole.ADMIN, UserRole.SUPERADMIN],
      },
      {
        to: "/admin/statistics",
        label: "Statistiche",
        icon: <BarChart2 size={17} />,
        roles: [UserRole.ADMIN, UserRole.SUPERADMIN],
      },
    ],
  },
  {
    label: "Configurazione",
    roles: [UserRole.SUPERADMIN],
    items: [
      {
        to: "/admin/contracts",
        label: "Contratti",
        icon: <Briefcase size={17} />,
        roles: [UserRole.SUPERADMIN],
      },
      {
        to: "/admin/grades",
        label: "Gradi",
        icon: <Award size={17} />,
        roles: [UserRole.SUPERADMIN],
      },
      {
        to: "/admin/bases",
        label: "Basi operative",
        icon: <MapPin size={17} />,
        roles: [UserRole.SUPERADMIN],
      },
      {
        to: "/admin/issue-categories",
        label: "Categorie",
        icon: <Tag size={17} />,
        roles: [UserRole.SUPERADMIN],
      },
      {
        to: "/admin/issue-urgencies",
        label: "Urgenze",
        icon: <Zap size={17} />,
        roles: [UserRole.SUPERADMIN],
      },
      {
        to: "/admin/deactivated",
        label: "Soci disattivati",
        icon: <UserX size={17} />,
        roles: [UserRole.SUPERADMIN],
      },
      {
        to: "/admin/cla-contracts",
        label: "CCNL",
        icon: <FileBarChart size={17} />,
        roles: [UserRole.SUPERADMIN],
      },
    ],
  },
];

/* ─── layout ─────────────────────────────────────────────────── */
export function DashboardLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const isAdmin =
    user?.role === UserRole.ADMIN || user?.role === UserRole.SUPERADMIN;

  const itemVisible = (item: NavItem) =>
    !item.roles || (user?.role && item.roles.includes(user.role as UserRole));

  const sectionVisible = (section: NavSection) =>
    !section.roles ||
    (user?.role && section.roles.includes(user.role as UserRole));

  const Sidebar = () => (
    <aside className="flex flex-col h-full bg-[#177246] text-white w-64 overflow-hidden">
      {/* brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-sm">
          U
        </div>
        <span className="font-bold text-lg">UnionHub</span>
      </div>

      {/* user info */}
      <div className="px-5 py-3.5 border-b border-white/10 flex-shrink-0">
        <p className="text-sm font-semibold truncate">
          {user?.nome} {user?.cognome}
        </p>
        <p className="text-xs text-white/60">{user?.crewcode}</p>
        <span className="inline-block mt-1 text-[10px] bg-white/20 rounded-full px-2 py-0.5 font-medium">
          {user?.role}
        </span>
      </div>

      {/* nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {NAV_SECTIONS.filter(sectionVisible).map((section, si) => {
          const visibleItems = section.items.filter(itemVisible);
          if (visibleItems.length === 0) return null;
          return (
            <div key={si} className={si > 0 ? "mt-4" : ""}>
              {/* section label — only shown if there are multiple sections visible */}
              {isAdmin && (
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest px-3 mb-1">
                  {section.label}
                </p>
              )}
              <div className="flex flex-col gap-0.5">
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    className={({ isActive }) =>
                      [
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-white/20 text-white"
                          : "text-white/75 hover:bg-white/10 hover:text-white",
                      ].join(" ")
                    }
                    onClick={() => setSidebarOpen(false)}
                  >
                    {item.icon}
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* logout */}
      <div className="px-3 py-4 border-t border-white/10 flex-shrink-0">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut size={17} />
          Esci
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* desktop sidebar */}
      <div className="hidden md:flex flex-col flex-shrink-0">
        <Sidebar />
      </div>

      {/* mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex flex-col md:hidden transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar />
      </div>

      {/* main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* mobile topbar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-[#177246] text-white flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)}>
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <span className="font-bold">UnionHub</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
