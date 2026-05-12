import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/layouts/AppLayout';
import { PageLoading } from '@/components/PageLoading';

const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const MeetingsPage = lazy(() => import('@/pages/MeetingsPage').then((m) => ({ default: m.MeetingsPage })));
const MeetingDetailPage = lazy(() => import('@/pages/MeetingDetailPage').then((m) => ({ default: m.MeetingDetailPage })));
const MeetingEditorPage = lazy(() => import('@/pages/MeetingEditorPage').then((m) => ({ default: m.MeetingEditorPage })));
const DecisionsPage = lazy(() => import('@/pages/DecisionsPage').then((m) => ({ default: m.DecisionsPage })));
const DecisionDetailPage = lazy(() => import('@/pages/DecisionDetailPage').then((m) => ({ default: m.DecisionDetailPage })));
const DecisionEditorPage = lazy(() => import('@/pages/DecisionEditorPage').then((m) => ({ default: m.DecisionEditorPage })));
const ActionsPage = lazy(() => import('@/pages/ActionsPage').then((m) => ({ default: m.ActionsPage })));
const ActionDetailPage = lazy(() => import('@/pages/ActionDetailPage').then((m) => ({ default: m.ActionDetailPage })));
const ActionEditorPage = lazy(() => import('@/pages/ActionEditorPage').then((m) => ({ default: m.ActionEditorPage })));
const UsersPage = lazy(() => import('@/pages/UsersPage').then((m) => ({ default: m.UsersPage })));
const DivisionsPage = lazy(() => import('@/pages/DivisionsPage').then((m) => ({ default: m.DivisionsPage })));
const DepartmentsPage = lazy(() => import('@/pages/DepartmentsPage').then((m) => ({ default: m.DepartmentsPage })));
const AttachmentsPage = lazy(() => import('@/pages/AttachmentsPage').then((m) => ({ default: m.AttachmentsPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const SearchPage = lazy(() => import('@/pages/SearchPage').then((m) => ({ default: m.SearchPage })));

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <Suspense fallback={<PageLoading />}>
            <LoginPage />
          </Suspense>
        }
      />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route
            index
            element={
              <Suspense fallback={<PageLoading />}>
                <DashboardPage />
              </Suspense>
            }
          />
          <Route
            path="meetings"
            element={
              <Suspense fallback={<PageLoading />}>
                <MeetingsPage />
              </Suspense>
            }
          />
          <Route
            path="meetings/new"
            element={
              <Suspense fallback={<PageLoading />}>
                <MeetingEditorPage />
              </Suspense>
            }
          />
          <Route
            path="meetings/:id/edit"
            element={
              <Suspense fallback={<PageLoading />}>
                <MeetingEditorPage />
              </Suspense>
            }
          />
          <Route
            path="meetings/:id"
            element={
              <Suspense fallback={<PageLoading />}>
                <MeetingDetailPage />
              </Suspense>
            }
          />
          <Route
            path="decisions"
            element={
              <Suspense fallback={<PageLoading />}>
                <DecisionsPage />
              </Suspense>
            }
          />
          <Route
            path="decisions/new"
            element={
              <Suspense fallback={<PageLoading />}>
                <DecisionEditorPage />
              </Suspense>
            }
          />
          <Route
            path="decisions/:id/edit"
            element={
              <Suspense fallback={<PageLoading />}>
                <DecisionEditorPage />
              </Suspense>
            }
          />
          <Route
            path="decisions/:id"
            element={
              <Suspense fallback={<PageLoading />}>
                <DecisionDetailPage />
              </Suspense>
            }
          />
          <Route
            path="actions"
            element={
              <Suspense fallback={<PageLoading />}>
                <ActionsPage />
              </Suspense>
            }
          />
          <Route
            path="actions/new"
            element={
              <Suspense fallback={<PageLoading />}>
                <ActionEditorPage />
              </Suspense>
            }
          />
          <Route
            path="actions/:id/edit"
            element={
              <Suspense fallback={<PageLoading />}>
                <ActionEditorPage />
              </Suspense>
            }
          />
          <Route
            path="actions/:id"
            element={
              <Suspense fallback={<PageLoading />}>
                <ActionDetailPage />
              </Suspense>
            }
          />
          <Route
            path="users"
            element={
              <Suspense fallback={<PageLoading />}>
                <UsersPage />
              </Suspense>
            }
          />
          <Route
            path="divisions"
            element={
              <Suspense fallback={<PageLoading />}>
                <DivisionsPage />
              </Suspense>
            }
          />
          <Route
            path="departments"
            element={
              <Suspense fallback={<PageLoading />}>
                <DepartmentsPage />
              </Suspense>
            }
          />
          <Route
            path="attachments"
            element={
              <Suspense fallback={<PageLoading />}>
                <AttachmentsPage />
              </Suspense>
            }
          />
          <Route
            path="settings"
            element={
              <Suspense fallback={<PageLoading />}>
                <SettingsPage />
              </Suspense>
            }
          />
          <Route
            path="profile"
            element={
              <Suspense fallback={<PageLoading />}>
                <ProfilePage />
              </Suspense>
            }
          />
          <Route
            path="search"
            element={
              <Suspense fallback={<PageLoading />}>
                <SearchPage />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
