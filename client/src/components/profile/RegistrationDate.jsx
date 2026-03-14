import { formatRegistrationDate } from '../../utils/dateFormatter';
import './RegistrationDate.css';

/**
 * Компонент отображения даты регистрации пользователя в стиле Discord
 * Показывает заголовок "В числе участников с" и дату на отдельной строке
 * 
 * @param {Object} props
 * @param {string} props.createdAt - ISO строка даты регистрации
 */
export default function RegistrationDate({ createdAt }) {
  if (!createdAt) {
    return null;
  }

  const date = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  
  if (isNaN(date.getTime())) {
    return null;
  }

  const day = date.getDate();
  const months = [
    'янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июня',
    'июля', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'
  ];
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return (
    <div className="registration-date">
      <div className="registration-date__title">В числе участников с</div>
      <div className="registration-date__date">{`${day} ${month} ${year} г.`}</div>
    </div>
  );
}
