/**
 * ScrollToTop Component Example
 * 
 * This example demonstrates the ScrollToTop button component.
 * The button appears when the user scrolls down more than 300px
 * and smoothly scrolls back to the top when clicked.
 */

import { ScrollToTop } from './ScrollToTop';

export function ScrollToTopExample() {
  return (
    <div style={{ minHeight: '200vh', padding: '2rem' }}>
      <h1>Scroll Down to See the Button</h1>
      <p>
        Scroll down this page to see the "Scroll to Top" button appear
        in the bottom-right corner. Click it to smoothly scroll back to the top.
      </p>
      
      <div style={{ marginTop: '100vh' }}>
        <h2>Middle of the Page</h2>
        <p>Keep scrolling...</p>
      </div>
      
      <div style={{ marginTop: '50vh' }}>
        <h2>Bottom of the Page</h2>
        <p>
          The button should be visible now. Click it to return to the top!
        </p>
      </div>
      
      {/* Add the ScrollToTop component */}
      <ScrollToTop />
    </div>
  );
}
