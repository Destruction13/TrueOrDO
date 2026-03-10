/**
 * MermaidDiagram component
 * Renders Mermaid diagrams with zoom, pan, and export functionality
 * 
 * Features:
 * - Mermaid diagram rendering
 * - Zoom in/out functionality
 * - Pan (drag to move) functionality
 * - Click handlers for diagram elements
 * - Export to PNG/SVG
 * 
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4
 */

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import './MermaidDiagram.css';

export interface MermaidDiagramProps {
  chart: string;
  zoomable?: boolean;
  pannable?: boolean;
  exportable?: boolean;
  theme?: 'light' | 'dark';
  onElementClick?: (elementId: string, elementType: string) => void;
}

/**
 * MermaidDiagram component
 * Renders interactive Mermaid diagrams with zoom, pan, and export capabilities
 */
export function MermaidDiagram({
  chart,
  zoomable = true,
  pannable = true,
  exportable = true,
  theme = 'dark',
  onElementClick,
}: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize Mermaid and render diagram
   */
  useEffect(() => {
    const initializeMermaid = async () => {
      try {
        // Configure Mermaid
        mermaid.initialize({
          startOnLoad: false,
          theme: theme === 'dark' ? 'dark' : 'default',
          securityLevel: 'loose',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        });

        if (containerRef.current) {
          // Clear previous content
          containerRef.current.innerHTML = '';

          // Generate unique ID for this diagram
          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

          // Render diagram
          const { svg } = await mermaid.render(id, chart);
          
          // Insert SVG into container
          containerRef.current.innerHTML = svg;

          // Get reference to SVG element
          const svgElement = containerRef.current.querySelector('svg');
          if (svgElement) {
            svgRef.current = svgElement as SVGSVGElement;
            
            // Add click handlers to diagram elements
            if (onElementClick) {
              addClickHandlers(svgElement);
            }

            // Apply initial transform
            applyTransform();
          }

          setError(null);
        }
      } catch (err) {
        console.error('Failed to render Mermaid diagram:', err);
        setError('Failed to render diagram. Please check the syntax.');
      }
    };

    initializeMermaid();
  }, [chart, theme, onElementClick]);

  /**
   * Add click handlers to diagram elements
   */
  const addClickHandlers = (svg: SVGSVGElement) => {
    // Find all clickable elements (nodes, edges, etc.)
    const nodes = svg.querySelectorAll('.node, .edgeLabel, .cluster');
    
    nodes.forEach((node) => {
      const element = node as SVGElement;
      element.style.cursor = 'pointer';
      
      element.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Extract element information
        const elementId = element.id || element.getAttribute('data-id') || 'unknown';
        const elementType = element.classList.contains('node') ? 'node' :
                           element.classList.contains('edgeLabel') ? 'edge' :
                           element.classList.contains('cluster') ? 'cluster' : 'unknown';
        
        if (onElementClick) {
          onElementClick(elementId, elementType);
        }
      });
    });
  };

  /**
   * Apply zoom and pan transform to SVG
   */
  const applyTransform = () => {
    if (svgRef.current) {
      const transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
      svgRef.current.style.transform = transform;
      svgRef.current.style.transformOrigin = 'center center';
    }
  };

  /**
   * Update transform when zoom or pan changes
   */
  useEffect(() => {
    applyTransform();
  }, [zoom, pan]);

  /**
   * Handle zoom in
   */
  const handleZoomIn = () => {
    if (zoomable) {
      setZoom((prev) => Math.min(prev + 0.2, 3));
    }
  };

  /**
   * Handle zoom out
   */
  const handleZoomOut = () => {
    if (zoomable) {
      setZoom((prev) => Math.max(prev - 0.2, 0.5));
    }
  };

  /**
   * Reset zoom and pan
   */
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  /**
   * Handle mouse wheel for zoom
   */
  const handleWheel = (e: React.WheelEvent) => {
    if (zoomable && e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((prev) => Math.max(0.5, Math.min(3, prev + delta)));
    }
  };

  /**
   * Handle pan start
   */
  const handleMouseDown = (e: React.MouseEvent) => {
    if (pannable && e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  /**
   * Handle pan move
   */
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && pannable) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  /**
   * Handle pan end
   */
  const handleMouseUp = () => {
    setIsPanning(false);
  };

  /**
   * Export diagram to SVG
   */
  const exportToSVG = async () => {
    if (!svgRef.current) return;

    try {
      // Clone SVG and clean up
      const clone = svgRef.current.cloneNode(true) as SVGElement;
      
      // Remove transform for export
      clone.style.transform = '';
      
      // Serialize to string
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(clone);
      
      // Create blob and download
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = 'diagram.svg';
      a.click();
      
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export SVG:', err);
      alert('Failed to export diagram to SVG.');
    }
  };

  /**
   * Export diagram to PNG
   */
  const exportToPNG = async () => {
    if (!svgRef.current) return;

    try {
      // Clone SVG and clean up
      const clone = svgRef.current.cloneNode(true) as SVGElement;
      
      // Remove transform for export
      clone.style.transform = '';
      
      // Get SVG dimensions
      const bbox = svgRef.current.getBBox();
      const width = bbox.width;
      const height = bbox.height;
      
      // Serialize to string
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(clone);
      
      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = width * 2; // 2x for better quality
      canvas.height = height * 2;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }
      
      // Scale for better quality
      ctx.scale(2, 2);
      
      // Create image from SVG
      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      img.onload = () => {
        // Draw image on canvas
        ctx.drawImage(img, 0, 0);
        
        // Convert to PNG and download
        canvas.toBlob((blob) => {
          if (blob) {
            const pngUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = pngUrl;
            a.download = 'diagram.png';
            a.click();
            URL.revokeObjectURL(pngUrl);
          }
        }, 'image/png');
        
        URL.revokeObjectURL(url);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        throw new Error('Failed to load SVG image');
      };
      
      img.src = url;
    } catch (err) {
      console.error('Failed to export PNG:', err);
      alert('Failed to export diagram to PNG.');
    }
  };

  return (
    <div className="mermaid-diagram-wrapper">
      {/* Controls */}
      <div className="mermaid-controls">
        {zoomable && (
          <>
            <button
              className="mermaid-control-button"
              onClick={handleZoomIn}
              aria-label="Zoom in"
              title="Zoom in"
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 3V13M3 8H13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <button
              className="mermaid-control-button"
              onClick={handleZoomOut}
              aria-label="Zoom out"
              title="Zoom out"
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3 8H13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <button
              className="mermaid-control-button"
              onClick={handleReset}
              aria-label="Reset view"
              title="Reset view"
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M13 8C13 10.7614 10.7614 13 8 13C5.23858 13 3 10.7614 3 8C3 5.23858 5.23858 3 8 3C9.36 3 10.59 3.52 11.5 4.36"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M11 2V4.5H8.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </>
        )}
        
        {exportable && (
          <>
            <div className="mermaid-control-divider" />
            <button
              className="mermaid-control-button"
              onClick={exportToSVG}
              aria-label="Export to SVG"
              title="Export to SVG"
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 11V3M8 11L5.5 8.5M8 11L10.5 8.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M3 13H13"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <span className="mermaid-control-text">SVG</span>
            </button>
            <button
              className="mermaid-control-button"
              onClick={exportToPNG}
              aria-label="Export to PNG"
              title="Export to PNG"
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 11V3M8 11L5.5 8.5M8 11L10.5 8.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M3 13H13"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <span className="mermaid-control-text">PNG</span>
            </button>
          </>
        )}
        
        <div className="mermaid-zoom-indicator">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Diagram container */}
      <div
        className={`mermaid-diagram-container ${isPanning ? 'panning' : ''}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {error ? (
          <div className="mermaid-error">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" />
              <path
                d="M24 14V26M24 30V32"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <p>{error}</p>
          </div>
        ) : (
          <div ref={containerRef} className="mermaid-svg-wrapper" />
        )}
      </div>
    </div>
  );
}
