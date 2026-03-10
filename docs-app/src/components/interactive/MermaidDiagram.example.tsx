/**
 * MermaidDiagram component examples
 * Demonstrates various use cases of the MermaidDiagram component
 */

import { MermaidDiagram } from './MermaidDiagram';

/**
 * Example 1: Simple flowchart
 */
export function SimpleFlowchartExample() {
  const chart = `
    graph TD
      A[Start] --> B{Is it working?}
      B -->|Yes| C[Great!]
      B -->|No| D[Debug]
      D --> A
      C --> E[End]
  `;

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Simple Flowchart</h2>
      <MermaidDiagram chart={chart} />
    </div>
  );
}

/**
 * Example 2: Sequence diagram
 */
export function SequenceDiagramExample() {
  const chart = `
    sequenceDiagram
      participant User
      participant Frontend
      participant Backend
      participant Database
      
      User->>Frontend: Click button
      Frontend->>Backend: API request
      Backend->>Database: Query data
      Database-->>Backend: Return results
      Backend-->>Frontend: JSON response
      Frontend-->>User: Display data
  `;

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Sequence Diagram</h2>
      <MermaidDiagram chart={chart} />
    </div>
  );
}

/**
 * Example 3: Class diagram
 */
export function ClassDiagramExample() {
  const chart = `
    classDiagram
      class Animal {
        +String name
        +int age
        +makeSound()
      }
      
      class Dog {
        +String breed
        +bark()
      }
      
      class Cat {
        +String color
        +meow()
      }
      
      Animal <|-- Dog
      Animal <|-- Cat
  `;

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Class Diagram</h2>
      <MermaidDiagram chart={chart} />
    </div>
  );
}

/**
 * Example 4: With element click handler
 */
export function InteractiveDiagramExample() {
  const chart = `
    graph LR
      A[Node A] --> B[Node B]
      B --> C[Node C]
      C --> D[Node D]
  `;

  const handleElementClick = (elementId: string, elementType: string) => {
    alert(`Clicked ${elementType}: ${elementId}`);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Interactive Diagram (Click on nodes)</h2>
      <MermaidDiagram 
        chart={chart} 
        onElementClick={handleElementClick}
      />
    </div>
  );
}

/**
 * Example 5: Light theme
 */
export function LightThemeExample() {
  const chart = `
    graph TD
      A[Light Theme] --> B[Clean]
      A --> C[Professional]
      B --> D[Easy to read]
      C --> D
  `;

  return (
    <div style={{ padding: '2rem', background: '#fff' }}>
      <h2>Light Theme</h2>
      <MermaidDiagram chart={chart} theme="light" />
    </div>
  );
}

/**
 * Example 6: Without zoom/pan
 */
export function StaticDiagramExample() {
  const chart = `
    graph TD
      A[Static Diagram] --> B[No Zoom]
      A --> C[No Pan]
  `;

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Static Diagram (No Zoom/Pan)</h2>
      <MermaidDiagram 
        chart={chart} 
        zoomable={false}
        pannable={false}
      />
    </div>
  );
}

/**
 * Example 7: Gantt chart
 */
export function GanttChartExample() {
  const chart = `
    gantt
      title Project Timeline
      dateFormat YYYY-MM-DD
      section Planning
      Requirements    :a1, 2024-01-01, 7d
      Design         :a2, after a1, 5d
      section Development
      Backend        :a3, after a2, 10d
      Frontend       :a4, after a2, 10d
      section Testing
      QA Testing     :a5, after a3, 5d
      section Deployment
      Deploy         :a6, after a5, 2d
  `;

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Gantt Chart</h2>
      <MermaidDiagram chart={chart} />
    </div>
  );
}

/**
 * Example 8: State diagram
 */
export function StateDiagramExample() {
  const chart = `
    stateDiagram-v2
      [*] --> Idle
      Idle --> Loading: Start
      Loading --> Success: Data loaded
      Loading --> Error: Failed
      Success --> Idle: Reset
      Error --> Idle: Retry
      Success --> [*]
      Error --> [*]
  `;

  return (
    <div style={{ padding: '2rem' }}>
      <h2>State Diagram</h2>
      <MermaidDiagram chart={chart} />
    </div>
  );
}
