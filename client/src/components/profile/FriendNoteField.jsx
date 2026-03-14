import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { sanitizeNote, parseNote, validateNote } from '../../utils/noteParser';
import { debounce } from '../../utils/debounce';
import { retryWithBackoff } from '../../utils/retryWithBackoff';
import { useNotification } from '../../context/NotificationContext';
import { useSocketReconnection } from '../../hooks/useSocketReconnection';
import './FriendNoteField.css';

/**
 * Поле для заметок о друге (Discord-style)
 * Автосохранение с debounce, санитизация, ограничение 500 символов
 * 
 * @param {Object} props
 * @param {string} props.targetUserId - ID пользователя для заметки
 * @param {string} [props.initialNote=''] - Начальное значение заметки
 * @param {Object} props.socket - Socket.IO инстанс
 * @param {Function} props.onSave - Callback при успешном сохранении
 * @param {Function} [props.onReloadProfile] - Callback для перезагрузки данных профиля
 */
function FriendNoteField({ 
  targetUserId, 
  initialNote = '', 
  socket,
  onSave,
  onReloadProfile
}) {
  const [noteText, setNoteText] = useState(parseNote(initialNote));
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const textareaRef = useRef(null);
  const { addNotification } = useNotification();
  
  // Хранение предыдущего значения для rollback при ошибке
  const previousNoteRef = useRef(parseNote(initialNote));

  // Обработка переподключения Socket.IO
  useSocketReconnection(socket, () => {
    // При восстановлении соединения перезагружаем данные профиля
    if (onReloadProfile) {
      onReloadProfile();
    }
  });

  // Функция сохранения заметки на сервер с optimistic update и retry logic
  const saveNote = useCallback(async (text) => {
    // Проверка наличия socket перед отправкой
    if (!socket) {
      addNotification({
        type: 'error',
        message: 'Нет соединения с сервером. Попробуйте позже.',
        duration: 4000
      });
      return;
    }

    // Проверка наличия targetUserId
    if (!targetUserId) {
      addNotification({
        type: 'error',
        message: 'Не указан пользователь для заметки',
        duration: 3000
      });
      return;
    }

    // Валидация заметки (длина, тип)
    const validation = validateNote(text);
    if (!validation.valid) {
      addNotification({
        type: 'error',
        message: validation.error,
        duration: 3000
      });
      return;
    }

    // Сохраняем предыдущее значение для возможного rollback
    const previousNote = previousNoteRef.current;
    
    // Optimistic update: обновляем UI сразу
    previousNoteRef.current = text;
    setIsSaving(true);

    const sanitized = sanitizeNote(text);
    
    try {
      // Оборачиваем Socket.IO emit в retry logic
      await retryWithBackoff(async () => {
        return new Promise((resolve, reject) => {
          // Таймаут для каждой попытки
          const timeoutId = setTimeout(() => {
            reject(new Error('Превышено время ожидания'));
          }, 5000);

          socket.emit('profile:note:set', {
            targetUserId,
            note: sanitized
          }, (response) => {
            clearTimeout(timeoutId);

            if (response?.success) {
              resolve(response);
            } else {
              // Проверяем тип ошибки
              const errorMessage = response?.error || 'Не удалось сохранить заметку';
              
              // Если это ошибка валидации, не повторяем
              if (errorMessage.includes('валидац') || errorMessage.includes('длин')) {
                const validationError = new Error(errorMessage);
                validationError.isValidationError = true;
                reject(validationError);
              } else {
                // Сетевая ошибка - можно повторить
                reject(new Error(errorMessage));
              }
            }
          });
        });
      }, 3, 1000); // Максимум 3 попытки, базовая задержка 1 секунда

      // Успех после всех попыток
      setIsSaving(false);
      if (onSave) {
        onSave(sanitized);
      }
      addNotification({
        type: 'success',
        message: 'Заметка сохранена',
        duration: 2000
      });

    } catch (error) {
      // Все попытки исчерпаны или ошибка валидации
      setIsSaving(false);
      
      // Откатываем к предыдущему значению
      setNoteText(previousNote);
      previousNoteRef.current = previousNote;
      
      addNotification({
        type: 'error',
        message: error.message || 'Не удалось сохранить заметку после нескольких попыток',
        duration: 4000
      });
    }
  }, [socket, targetUserId, onSave, addNotification]);

  // Debounced версия функции сохранения
  const debouncedSave = useRef(
    debounce((text) => saveNote(text), 500)
  ).current;

  // Обновление счетчика символов
  useEffect(() => {
    setCharCount(noteText.length);
  }, [noteText]);
  
  // Синхронизация previousNoteRef при изменении initialNote
  useEffect(() => {
    const parsedInitial = parseNote(initialNote);
    previousNoteRef.current = parsedInitial;
    setNoteText(parsedInitial);
  }, [initialNote]);

  // Автосохранение при изменении текста
  useEffect(() => {
    if (noteText !== parseNote(initialNote)) {
      debouncedSave(noteText);
    }
  }, [noteText, initialNote, debouncedSave]);

  // Cleanup debounce при размонтировании
  useEffect(() => {
    return () => {
      if (debouncedSave.cancel) {
        debouncedSave.cancel();
      }
    };
  }, [debouncedSave]);

  // Обработка изменения текста
  const handleChange = useCallback((e) => {
    const newText = e.target.value;
    
    // Ограничение 500 символов
    if (newText.length <= 500) {
      setNoteText(newText);
    }
  }, []);

  // Обработка фокуса
  const handleFocus = useCallback(() => {
    setIsEditing(true);
  }, []);

  // Обработка потери фокуса
  const handleBlur = useCallback(() => {
    setIsEditing(false);
  }, []);

  return (
    <div className="friend-note-field">
      <div className={`friend-note-field__wrapper ${isEditing ? 'friend-note-field__wrapper--editing' : ''}`}>
        <textarea
          ref={textareaRef}
          className="friend-note-field__textarea"
          placeholder="Добавить заметку"
          value={noteText}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          maxLength={500}
          rows={3}
          aria-label="Заметка о пользователе"
          aria-describedby="friend-note-hint"
        />
        
        {/* Индикатор сохранения */}
        {isSaving && (
          <div className="friend-note-field__saving">
            <span className="friend-note-field__spinner" />
            <span className="friend-note-field__saving-text">Сохранение...</span>
          </div>
        )}
      </div>

      {/* Счетчик символов и подсказка */}
      <div className="friend-note-field__footer">
        <span id="friend-note-hint" className="friend-note-field__hint">видна только вам</span>
        {isEditing && (
          <span className={`friend-note-field__counter ${charCount >= 450 ? 'friend-note-field__counter--warning' : ''}`}>
            {charCount}/500
          </span>
        )}
      </div>
    </div>
  );
}

export default memo(FriendNoteField);
