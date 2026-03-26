import { lazy, Suspense } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
} from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { LoginPage } from "../pages/LoginPage";
import { ChangePasswordPage } from "../pages/ChangePasswordPage";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { HomePage } from "../pages/HomePage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { UserRole } from "@unionhub/shared/types";

/* ─── lazy page imports ──────────────────────────────────────── */
const PayslipPage = lazy(() =>
  import("../pages/PayslipPage").then((m) => ({ default: m.PayslipPage })),
);
const FtlPage = lazy(() =>
  import("../pages/FtlPage").then((m) => ({ default: m.FtlPage })),
);
const CtcPage = lazy(() =>
  import("../pages/CtcPage").then((m) => ({ default: m.CtcPage })),
);
const MembersPage = lazy(() =>
  import("../pages/MembersPage").then((m) => ({ default: m.MembersPage })),
);
const MemberDetailPage = lazy(() =>
  import("../pages/MemberDetailPage").then((m) => ({
    default: m.MemberDetailPage,
  })),
);
const IssuesPage = lazy(() =>
  import("../pages/IssuesPage").then((m) => ({ default: m.IssuesPage })),
);
const MyIssuesPage = lazy(() =>
  import("../pages/MyIssuesPage").then((m) => ({ default: m.MyIssuesPage })),
);
const ChatbotPage = lazy(() =>
  import("../pages/ChatbotPage").then((m) => ({ default: m.ChatbotPage })),
);
const DocumentsPage = lazy(() =>
  import("../pages/DocumentsPage").then((m) => ({ default: m.DocumentsPage })),
);

/* ─── admin+superadmin pages ─────────────────────────────────── */
const KnowledgeBasePage = lazy(() =>
  import("../pages/KnowledgeBasePage").then((m) => ({
    default: m.KnowledgeBasePage,
  })),
);
const StatisticsPage = lazy(() =>
  import("../pages/StatisticsPage").then((m) => ({
    default: m.StatisticsPage,
  })),
);
const MemberFormPage = lazy(() =>
  import("../pages/MemberFormPage").then((m) => ({
    default: m.MemberFormPage,
  })),
);

/* ─── superadmin-only pages ──────────────────────────────────── */
const DeactivatedMembersPage = lazy(() =>
  import("../pages/DeactivatedMembersPage").then((m) => ({
    default: m.DeactivatedMembersPage,
  })),
);
const SettingsPage = lazy(() =>
  import("../pages/SettingsPage").then((m) => ({ default: m.SettingsPage })),
);
const CompleteProfilePage = lazy(() =>
  import("../pages/CompleteProfilePage").then((m) => ({
    default: m.CompleteProfilePage,
  })),
);

/* ─── admin screens ──────────────────────────────────────────── */
const ContractsPage = lazy(() =>
  import("../screens/admin/ContractsPage").then((m) => ({
    default: m.ContractsPage,
  })),
);
const ClaContractsPage = lazy(() =>
  import("../screens/admin/ClaContractsPage").then((m) => ({
    default: m.ClaContractsPage,
  })),
);
const GradesPage = lazy(() =>
  import("../screens/admin/GradesPage").then((m) => ({
    default: m.GradesPage,
  })),
);
const BasesPage = lazy(() =>
  import("../screens/admin/BasesPage").then((m) => ({
    default: m.BasesPage,
  })),
);
const IssueCategoriesPage = lazy(() =>
  import("../screens/admin/IssueCategoriesPage").then((m) => ({
    default: m.IssueCategoriesPage,
  })),
);
const IssueUrgenciesPage = lazy(() =>
  import("../screens/admin/IssueUrgenciesPage").then((m) => ({
    default: m.IssueUrgenciesPage,
  })),
);
const IssuesAdminPage = lazy(() =>
  import("../screens/admin/IssuesAdminPage").then((m) => ({
    default: m.IssuesAdminPage,
  })),
);

/* ─── helpers ────────────────────────────────────────────────── */
function PageSpinner() {
  return (
    <div className="flex items-center justify-center h-full py-16">
      <div className="w-8 h-8 border-4 border-[#177246] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const CAPTAIN_GRADES = ["CPT", "LTC", "LCC", "TRI", "TRE"];

function RequireAuth() {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-[#177246] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.mustChangePassword)
    return <Navigate to="/change-password" replace />;
  // Profile completion gate: non-superadmin with ruolo must have required dates
  if (user?.ruolo) {
    const isCaptain = CAPTAIN_GRADES.includes(
      user.grade?.codice?.toUpperCase() ?? "",
    );
    const needsDate = !user.dateOfEntry || (isCaptain && !user.dateOfCaptaincy);
    if (needsDate) return <Navigate to="/complete-profile" replace />;
  }
  return <Outlet />;
}

function RequireAdmin() {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPERADMIN)
    return <Navigate to="/" replace />;
  return <Outlet />;
}

function RequireSuperAdmin() {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== UserRole.SUPERADMIN) return <Navigate to="/" replace />;
  return <Outlet />;
}

function RequireGuest() {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  if (isLoading) return null;
  if (isAuthenticated && !user?.mustChangePassword) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

function S({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageSpinner />}>{children}</Suspense>;
}

/* ─── router ─────────────────────────────────────────────────── */
const router = createBrowserRouter([
  {
    element: <RequireGuest />,
    children: [{ path: "/login", element: <LoginPage /> }],
  },
  {
    path: "/change-password",
    element: <ChangePasswordPage />,
  },
  {
    path: "/complete-profile",
    element: (
      <S>
        <CompleteProfilePage />
      </S>
    ),
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { index: true, element: <HomePage /> },
          {
            path: "settings",
            element: (
              <S>
                <SettingsPage />
              </S>
            ),
          },
          {
            path: "payslip",
            element: (
              <S>
                <PayslipPage />
              </S>
            ),
          },
          {
            path: "ftl",
            element: (
              <S>
                <FtlPage />
              </S>
            ),
          },
          {
            path: "ctc",
            element: (
              <S>
                <CtcPage />
              </S>
            ),
          },
          {
            path: "documents",
            element: (
              <S>
                <DocumentsPage />
              </S>
            ),
          },
          {
            path: "my-issues",
            element: (
              <S>
                <MyIssuesPage />
              </S>
            ),
          },
          /* ── Admin-only routes ── */
          {
            element: <RequireAdmin />,
            children: [
              /* tools */
              {
                path: "chatbot",
                element: (
                  <S>
                    <ChatbotPage />
                  </S>
                ),
              },
              {
                path: "knowledge-base",
                element: (
                  <S>
                    <KnowledgeBasePage />
                  </S>
                ),
              },
              {
                path: "admin/statistics",
                element: (
                  <S>
                    <StatisticsPage />
                  </S>
                ),
              },
              /* members */
              {
                path: "members",
                element: (
                  <S>
                    <MembersPage />
                  </S>
                ),
              },
              {
                path: "members/new",
                element: (
                  <S>
                    <MemberFormPage mode="create" />
                  </S>
                ),
              },
              {
                path: "members/:id",
                element: (
                  <S>
                    <MemberDetailPage />
                  </S>
                ),
              },
              {
                path: "members/:id/edit",
                element: (
                  <S>
                    <MemberFormPage mode="edit" />
                  </S>
                ),
              },
              /* issues (old page kept for compat) */
              {
                path: "issues",
                element: (
                  <S>
                    <IssuesPage />
                  </S>
                ),
              },
              /* enhanced issues admin */
              {
                path: "admin/issues",
                element: (
                  <S>
                    <IssuesAdminPage />
                  </S>
                ),
              },
            ],
          },
          /* ── SuperAdmin-only routes ── */
          {
            element: <RequireSuperAdmin />,
            children: [
              {
                path: "admin/contracts",
                element: (
                  <S>
                    <ContractsPage />
                  </S>
                ),
              },
              {
                path: "admin/grades",
                element: (
                  <S>
                    <GradesPage />
                  </S>
                ),
              },
              {
                path: "admin/bases",
                element: (
                  <S>
                    <BasesPage />
                  </S>
                ),
              },
              {
                path: "admin/issue-categories",
                element: (
                  <S>
                    <IssueCategoriesPage />
                  </S>
                ),
              },
              {
                path: "admin/issue-urgencies",
                element: (
                  <S>
                    <IssueUrgenciesPage />
                  </S>
                ),
              },
              {
                path: "admin/deactivated",
                element: (
                  <S>
                    <DeactivatedMembersPage />
                  </S>
                ),
              },
              {
                path: "admin/cla-contracts",
                element: (
                  <S>
                    <ClaContractsPage />
                  </S>
                ),
              },
            ],
          },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
