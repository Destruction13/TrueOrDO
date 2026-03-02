import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import "./NicknameCustomizer.css";

// Debounce hook
function useDebounce(callback, delay) {
  const timeoutRef = useRef(null);
  
  const debouncedCallback = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return debouncedCallback;
}

export default function NicknameCustomizer() {
  const { user, updateProfile } = useAuth();
  
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [editableNickname, setEditableNickname] = useState(user?.nickname || "");
  
  const nicknameInputRef = useRef(null);

  // Синхронизация никнейма с user
  useEffect(() => {
    if (user?.nickname !== undefined) {
      setEditableNickname(user.nickname || "");
    }
  }, [user?.nickname]);

  // Debounce-сохранение никнейма
  const saveNickname = useCallback(async (newNickname) => {
    if (newNickname === user?.nickname) return; // Без изменений
    
    setNicknameSaving(true);
    try {
      await updateProfile({ nickname: newNickname || null });
    } catch (error) {
      console.error("Failed to save nickname:", error);
      // Откатываем к предыдущему значению при ошибке
      setEditableNickname(user?.nickname || "");
    } finally {
      setNicknameSaving(false);
    }
  }, [user?.nickname, updateProfile]);

  const debouncedSaveNickname = useDebounce(saveNickname, 800);

  const handleNicknameChange = (e) => {
    const value = e.target.value;
    setEditableNickname(value);
    debouncedSaveNickname(value);
  };

  return (
    <div className="nickname-customizer nickname-customizer--simple">
      <div className="nickname-customizer__input-wrapper">
        <input
          ref={nicknameInputRef}
          type="text"
          value={editableNickname}
          onChange={handleNicknameChange}
          placeholder="Введите никнейм..."
          maxLength={30}
          className="nickname-customizer__input"
        />
        {nicknameSaving && (
          <span className="nickname-customizer__saving-indicator">💾</span>
        )}
      </div>
    </div>
  );
}
