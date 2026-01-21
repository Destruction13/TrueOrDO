import { Routes, Route, useLocation } from "react-router-dom";
import App from "./App";
import { LandingPage, GamesPage, TruthOrDarePage, AliasPage } from "./pages";
import AuthModalRoute from "./AuthModalRoute";

export default function RoutesRoot() {
  const location = useLocation();
  const backgroundLocation = location.state?.backgroundLocation;

  return (
    <>
      {/*
        If a backgroundLocation is set, render the main routes using that location
        so the previous page stays visible under the modal.
      */}
      <Routes location={backgroundLocation || location}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/games" element={<GamesPage />} />
        <Route path="/truth-or-dare" element={<TruthOrDarePage />} />
        <Route path="/alias" element={<AliasPage />} />

        {/* Full-page fallbacks if user opens these routes directly */}
        <Route path="/login" element={<App />} />
        <Route path="/register" element={<App />} />
        <Route path="/profile" element={<App />} />
        <Route path="/verify-email" element={<App />} />
        <Route path="/reset-password" element={<App />} />
      </Routes>

      {/* Modal routes: render only when we have a background */}
      {backgroundLocation && (
        <Routes>
          <Route path="/login" element={<AuthModalRoute mode="login" />} />
          <Route path="/register" element={<AuthModalRoute mode="register" />} />
        </Routes>
      )}
    </>
  );
}
