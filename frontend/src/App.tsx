import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/layouts/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { MeetingsPage } from '@/pages/MeetingsPage';
import { MeetingDetailPage } from '@/pages/MeetingDetailPage';
import { MeetingEditorPage } from '@/pages/MeetingEditorPage';
import { DecisionsPage } from '@/pages/DecisionsPage';
import { DecisionDetailPage } from '@/pages/DecisionDetailPage';
import { DecisionEditorPage } from '@/pages/DecisionEditorPage';
import { ActionsPage } from '@/pages/ActionsPage';
import { ActionDetailPage } from '@/pages/ActionDetailPage';
import { ActionEditorPage } from '@/pages/ActionEditorPage';
import { UsersPage } from '@/pages/UsersPage';
import { DivisionsPage } from '@/pages/DivisionsPage';
import { DepartmentsPage } from '@/pages/DepartmentsPage';
import { AttachmentsPage } from '@/pages/AttachmentsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { SearchPage } from '@/pages/SearchPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="meetings" element={<MeetingsPage />} />
          <Route path="meetings/new" element={<MeetingEditorPage />} />
          <Route path="meetings/:id/edit" element={<MeetingEditorPage />} />
          <Route path="meetings/:id" element={<MeetingDetailPage />} />
          <Route path="decisions" element={<DecisionsPage />} />
          <Route path="decisions/new" element={<DecisionEditorPage />} />
          <Route path="decisions/:id/edit" element={<DecisionEditorPage />} />
          <Route path="decisions/:id" element={<DecisionDetailPage />} />
          <Route path="actions" element={<ActionsPage />} />
          <Route path="actions/new" element={<ActionEditorPage />} />
          <Route path="actions/:id/edit" element={<ActionEditorPage />} />
          <Route path="actions/:id" element={<ActionDetailPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="divisions" element={<DivisionsPage />} />
          <Route path="departments" element={<DepartmentsPage />} />
          <Route path="attachments" element={<AttachmentsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
