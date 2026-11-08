import { HashRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { BrokerDashboardView } from '@/presentation/components/broker/BrokerDashboardView';
import { ClientVisitView } from '@/presentation/components/visitor/ClientVisitView';
import { ReportsView } from '@/presentation/components/reports/ReportsView';

function RedirectToVisitor1(): JSX.Element {
  const { tourId } = useParams<{ tourId: string }>();
  return <Navigate to={`/visit/${tourId || 'demo-tour-alphaville-2026'}/VISITOR_1`} replace />;
}

export function AppRoutes(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<BrokerDashboardView />} />
      <Route path="/visit/:tourId/:slot" element={<ClientVisitView />} />
      <Route path="/visit/:tourId" element={<RedirectToVisitor1 />} />
      <Route path="/report/:tourId" element={<ReportsView />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App(): JSX.Element {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
}
