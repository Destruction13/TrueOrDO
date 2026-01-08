import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ShaderBackground from "./components/ShaderBackground";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* Фоновый шейдер - z-index: -10, pointer-events: none */}
    <ShaderBackground />
    {/* Основной UI поверх шейдера */}
    <App />
  </React.StrictMode>
);
