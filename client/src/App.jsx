// เส้นทางของหน้าเว็บ (ตารางที่ 3.4 + หน้าที่เพิ่มเติม)
// - ใช้ data router (createBrowserRouter) เพื่อให้ใช้ useBlocker ถามยืนยันก่อนออกจากห้องได้
// - ทุกหน้าเป็น lazy route: โหลดโค้ดของหน้าเมื่อเข้าหน้านั้นครั้งแรก ไฟล์แรกที่เปิดเว็บจึงเล็กลง
import { useEffect } from 'react';
import { Navigate, Route, createBrowserRouter, createRoutesFromElements } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import Layout, { Toaster, WakingBanner } from './components/Layout';
import RouteError from './components/RouteError';
import {
  FullPageLoader,
  GuestOnly,
  RequireAuth,
  RequireGuidelines,
  RequireModerator,
} from './components/guards';
import { bootstrapSession } from './lib/auth';
import { lazyPage } from './lib/lazyPage';
import { watchSystemTheme } from './lib/theme';

// path ใน import() ต้องเขียนตรง ๆ ไม่ใช้ตัวแปร Vite จึงแยกแต่ละหน้าเป็นไฟล์ของตัวเองได้
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route HydrateFallback={FullPageLoader} ErrorBoundary={RouteError}>
      <Route element={<GuestOnly />}>
        <Route path="/login" lazy={lazyPage(() => import('./pages/LoginPage'))} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/guidelines" lazy={lazyPage(() => import('./pages/GuidelinesPage'))} />
          <Route path="/me" lazy={lazyPage(() => import('./pages/MePage'))} />
          <Route element={<RequireGuidelines />}>
            <Route path="/lobby" lazy={lazyPage(() => import('./pages/LobbyPage'))} />
            <Route path="/room/:id" lazy={lazyPage(() => import('./pages/RoomPage'))} />
            <Route path="/karaoke" lazy={lazyPage(() => import('./pages/KaraokeLobbyPage'))} />
            <Route path="/karaoke/:id" lazy={lazyPage(() => import('./pages/KaraokeRoomPage'))} />
            <Route path="/qa" lazy={lazyPage(() => import('./pages/QABoardPage'))} />
            <Route path="/qa/new" lazy={lazyPage(() => import('./pages/QAComposePage'))} />
            <Route path="/qa/:id" lazy={lazyPage(() => import('./pages/QADetailPage'))} />
            <Route element={<RequireModerator />}>
              <Route
                path="/admin/reports"
                lazy={lazyPage(() => import('./pages/AdminReportsPage'))}
              />
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/lobby" replace />} />
      <Route path="*" lazy={lazyPage(() => import('./pages/NotFoundPage'))} />
    </Route>,
  ),
);

const App = () => {
  useEffect(() => {
    bootstrapSession();
  }, []);

  // เลือก "ตามเครื่อง" ไว้: เปลี่ยนโหมดของระบบแล้วหน้าเว็บเปลี่ยนตาม (index.html ตั้งโหมดแรกให้แล้ว)
  useEffect(() => watchSystemTheme(), []);

  return (
    <>
      <Toaster />
      <WakingBanner />
      <RouterProvider router={router} />
    </>
  );
};

export default App;
