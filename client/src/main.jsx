import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SettingsProvider } from "./context/SettingsContext";
import { LofiPlayerProvider } from "./context/LofiPlayerContext";
import { SocialProvider } from "./components/social";
import RoutesRoot from "./RoutesRoot";
import LofiPlayer from "./components/ui/LofiPlayer";
import ChatFab from "./components/social/ChatFab";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <SettingsProvider>
        <AuthProvider>
          <SocialProvider>
            <LofiPlayerProvider>
              <RoutesRoot />
              <ChatFab />
              <LofiPlayer />
            </LofiPlayerProvider>
          </SocialProvider>
        </AuthProvider>
      </SettingsProvider>
    </BrowserRouter>
  </React.StrictMode>
);
