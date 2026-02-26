import { Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NetworkGuard } from './components/NetworkGuard';
import { Landing } from './pages/Landing';
import { AppLayout } from './components/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { CreateGroup } from './pages/CreateGroup';
import { GroupOverview } from './pages/GroupOverview';
import { AddExpense } from './pages/AddExpense';
import { ExpenseDetail } from './pages/ExpenseDetail';
import { DisputesCenter } from './pages/DisputesCenter';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<NetworkGuard><AppLayout /></NetworkGuard>}>
          <Route index element={<Dashboard />} />
          <Route path="new" element={<CreateGroup />} />
          <Route path="group/:groupAddress" element={<GroupOverview />} />
          <Route path="group/:groupAddress/add" element={<AddExpense />} />
          <Route path="group/:groupAddress/expense/:expenseId" element={<ExpenseDetail />} />
          <Route path="group/:groupAddress/disputes" element={<DisputesCenter />} />
          <Route path="group/:groupAddress/settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
