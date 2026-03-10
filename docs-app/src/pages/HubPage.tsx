import { motion } from 'framer-motion';
import { pageTransition, staggerChildren } from '../lib/animation/variants';
import { AnimatedSection } from '../components/AnimatedSection';
import { SectionCard } from '../components/SectionCard';
import { useLanguage } from '../contexts/LanguageContext';
import './HubPage.css';

/**
 * HubPage component
 * Main landing page with hero section and section cards
 */
export function HubPage() {
  const { translate } = useLanguage();

  const sections = [
    {
      id: 'api',
      icon: '📡',
      title: translate('hub.api.title'),
      description: translate('hub.api.description'),
      path: '/api'
    },
    {
      id: 'technical',
      icon: '⚙️',
      title: translate('hub.technical.title'),
      description: translate('hub.technical.description'),
      path: '/technical'
    },
    {
      id: 'guides',
      icon: '📚',
      title: translate('hub.guides.title'),
      description: translate('hub.guides.description'),
      path: '/guides'
    },
    {
      id: 'plan',
      icon: '📋',
      title: translate('hub.plan.title'),
      description: translate('hub.plan.description'),
      path: '/plan'
    }
  ];

  return (
    <motion.div 
      className="hub-page"
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <AnimatedSection animation="fadeIn" className="hub-hero">
        <h1 className="hub-hero-title">{translate('hub.title')}</h1>
        <p className="hub-hero-description">
          {translate('hub.description')}
        </p>
      </AnimatedSection>

      <motion.div 
        className="hub-sections-grid"
        variants={staggerChildren}
        initial="initial"
        animate="animate"
      >
        {sections.map((section, index) => (
          <AnimatedSection
            key={section.id}
            animation="slideInFromBottom"
            delay={index * 0.1}
          >
            <SectionCard
              icon={section.icon}
              title={section.title}
              description={section.description}
              path={section.path}
            />
          </AnimatedSection>
        ))}
      </motion.div>
    </motion.div>
  );
}
