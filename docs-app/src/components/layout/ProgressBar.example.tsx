import { ProgressBar } from './ProgressBar';

/**
 * Example usage of the ProgressBar component.
 * 
 * This example demonstrates the ProgressBar in action with a long page of content.
 * Scroll down to see the progress bar fill up as you read through the content.
 */
export function ProgressBarExample() {
  return (
    <div style={{ minHeight: '300vh', padding: '2rem' }}>
      <ProgressBar />
      
      <h1>Reading Progress Example</h1>
      <p>Scroll down to see the progress bar at the top fill up!</p>
      
      <div style={{ marginTop: '50vh' }}>
        <h2>Section 1</h2>
        <p>You're about 25% through the page.</p>
      </div>
      
      <div style={{ marginTop: '50vh' }}>
        <h2>Section 2</h2>
        <p>You're about 50% through the page.</p>
      </div>
      
      <div style={{ marginTop: '50vh' }}>
        <h2>Section 3</h2>
        <p>You're about 75% through the page.</p>
      </div>
      
      <div style={{ marginTop: '50vh' }}>
        <h2>End</h2>
        <p>You've reached the bottom! The progress bar should show 100%.</p>
      </div>
    </div>
  );
}
