// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { PlayerProvider } from "./context/PlayerContext";
import { ToastProvider } from "./context/ToastContext";
import { ThemeProvider } from "./context/ThemeContext";

import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";

import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import HomePage from "./pages/HomePage";
import SearchPage from "./pages/SearchPage";
import LibraryPage from "./pages/LibraryPage";
import FavoritesPage from "./pages/FavoritesPage";
import AlbumPage from "./pages/AlbumPage";
import ArtistPage from "./pages/ArtistPage";
import MyMusicPage from "./pages/MyMusicPage";
import CreateAlbumPage from "./pages/CreateAlbumPage";
import UploadPage from "./pages/UploadPage";

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <PlayerProvider>
              <Routes>
                {/* ── Public ─────────────────────────────────── */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/auth" element={<AuthPage />} />

                {/* ── Password Reset ─────────────────────────── */}
                <Route
                  path="/auth/reset"
                  element={<ResetPasswordPage />}
                />

                {/* ── Any logged-in user ─────────────────────── */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<AppLayout />}>
                    <Route path="/home" element={<HomePage />} />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/library" element={<LibraryPage />} />
                    <Route path="/favorites" element={<FavoritesPage />} />
                    <Route path="/album/:id" element={<AlbumPage />} />
                    <Route path="/artist/:id" element={<ArtistPage />} />
                  </Route>
                </Route>

                {/* ── Artists only ───────────────────────────── */}
                <Route element={<ProtectedRoute artistOnly />}>
                  <Route element={<AppLayout />}>
                    <Route path="/my-music" element={<MyMusicPage />} />
                    <Route path="/upload" element={<UploadPage />} />
                    <Route
                      path="/create-album"
                      element={<CreateAlbumPage />}
                    />
                  </Route>
                </Route>

                {/* ── Fallback ───────────────────────────────── */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </PlayerProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}