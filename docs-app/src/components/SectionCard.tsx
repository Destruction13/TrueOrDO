import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import './SectionCard.css';

interface SectionCardProps {
  icon: string;
  title: string;
  description: string;
  path: string;
}

/**
 * SectionCard component
 * Displays a clickable card for a documentation section
 */
export function SectionCard({ icon, title, description, path }: SectionCardProps) {
  return (
    <Link to={path} className="section-card-link">
      <motion.div
        className="section-card"
        whileHover={{ 
          scale: 1.05, 
          y: -4,
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
          transition: { duration: 0.2 }
        }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="section-card-icon">{icon}</div>
        <h3 className="section-card-title">{title}</h3>
        <p className="section-card-description">{description}</p>
      </motion.div>
    </Link>
  );
}
