import { Routes, Route, useLocation } from "react-router-dom";
import App from "./App";
import { LandingPage, GamesPage, TruthOrDarePage, AliasPage, CodenamesPage, EmotionalPage, PricingPage } from "./pages";
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
        
        {/* Truth or Dare - с опциональным кодом комнаты */}
        <Route path="/truth-or-dare" element={<TruthOrDarePage />} />
        <Route path="/truth-or-dare/:roomCode" element={<TruthOrDarePage />} />
        
        {/* Alias - с опциональным кодом комнаты */}
        <Route path="/alias" element={<AliasPage />} />
        <Route path="/alias/:roomCode" element={<AliasPage />} />

        {/* Codenames - с опциональным кодом комнаты */}
        <Route path="/codenames" element={<CodenamesPage />} />
        <Route path="/codenames/:roomCode" element={<CodenamesPage />} />

        {/* Emotional - с опциональным кодом комнаты */}
        <Route path="/emotional" element={<EmotionalPage />} />
        <Route path="/emotional/:roomCode" element={<EmotionalPage />} />

        {/* Pricing - страница покупки VIP/PRO */}
        <Route path="/pricing" element={<PricingPage />} />

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
