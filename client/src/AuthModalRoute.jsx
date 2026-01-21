import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AuthScreen from "./components/auth/AuthScreen";
import "./components/auth/AuthModalRoute.css";

export default function AuthModalRoute({ mode = "login" }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Lock page scroll while modal is open
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const handleClose = () => {
    // If opened as modal above a background route, go back.
    if (location.state?.backgroundLocation) {
      navigate(-1);
      return;
    }
    // Direct navigation fallback
    navigate("/");
  };

  return (
    <div className="auth-modal-route" role="dialog" aria-modal="true">
      <div className="auth-modal-route__backdrop" onClick={handleClose} />
      <div className="auth-modal-route__panel" onClick={(e) => e.stopPropagation()}>
        <AuthScreen
          initialMode={mode}
          onSuccess={handleClose}
          onClose={handleClose}
        />
      </div>
    </div>
  );
}
