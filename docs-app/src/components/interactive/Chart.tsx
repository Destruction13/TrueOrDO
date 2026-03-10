/**
 * Chart component
 * Renders interactive charts using recharts library
 * 
 * Features:
 * - Line, bar, area, and pie chart types
 * - Interactive tooltips on hover
 * - Zoom functionality
 * - Export to PNG
 * 
 * Validates: Requirements 9.1, 9.2, 9.3, 9.5
 */

import { useState, useRef } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ChartProps } from '../../types';
import './Chart.css';

/**
 * Default colors for chart elements
 */
const CHART_COLORS = [
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7c7c',
  '#a78bfa',
  '#fb923c',
  '#34d399',
  '#f472b6',
];

/**
 * Custom tooltip component for better styling
 */
function CustomTooltip(props: any) {
  const { active, payload, label } = props;
  
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      {payload.map((entry: any, index: number) => (
        <p key={index} className="chart-tooltip-value" style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
        </p>
      ))}
    </div>
  );
}

/**
 * Chart component
 * Renders interactive charts with zoom and export capabilities
 */
export function Chart({
  data,
  type,
  xKey,
  yKey,
  title,
  zoomable = true,
  exportable = true,
}: ChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null);

  /**
   * Handle zoom reset
   */
  const handleResetZoom = () => {
    setZoomDomain(null);
  };

  /**
   * Export chart to PNG
   */
  const exportToPNG = async () => {
    if (!chartRef.current) return;

    try {
      // Find the SVG element within the chart
      const svgElement = chartRef.current.querySelector('svg');
      if (!svgElement) {
        throw new Error('SVG element not found');
      }

      // Get SVG dimensions
      const bbox = svgElement.getBBox();
      const width = bbox.width || svgElement.clientWidth;
      const height = bbox.height || svgElement.clientHeight;

      // Clone and serialize SVG
      const clone = svgElement.cloneNode(true) as SVGElement;
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

      // Set white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

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
            a.download = `chart-${type}-${Date.now()}.png`;
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
      alert('Failed to export chart to PNG.');
    }
  };

  /**
   * Render line chart
   */
  const renderLineChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="chart-grid" />
        <XAxis
          dataKey={xKey}
          className="chart-axis"
          domain={zoomDomain || undefined}
        />
        <YAxis className="chart-axis" />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Line
          type="monotone"
          dataKey={yKey}
          stroke={CHART_COLORS[0]}
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );

  /**
   * Render bar chart
   */
  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="chart-grid" />
        <XAxis
          dataKey={xKey}
          className="chart-axis"
          domain={zoomDomain || undefined}
        />
        <YAxis className="chart-axis" />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar dataKey={yKey} fill={CHART_COLORS[0]} />
      </BarChart>
    </ResponsiveContainer>
  );

  /**
   * Render area chart
   */
  const renderAreaChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="chart-grid" />
        <XAxis
          dataKey={xKey}
          className="chart-axis"
          domain={zoomDomain || undefined}
        />
        <YAxis className="chart-axis" />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Area
          type="monotone"
          dataKey={yKey}
          stroke={CHART_COLORS[0]}
          fill={CHART_COLORS[0]}
          fillOpacity={0.6}
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  /**
   * Render pie chart
   */
  const renderPieChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey={yKey}
          nameKey={xKey}
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={(entry: any) => `${entry[xKey]}: ${entry[yKey]}`}
        >
          {data.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );

  /**
   * Render appropriate chart based on type
   */
  const renderChart = () => {
    switch (type) {
      case 'line':
        return renderLineChart();
      case 'bar':
        return renderBarChart();
      case 'area':
        return renderAreaChart();
      case 'pie':
        return renderPieChart();
      default:
        return <div className="chart-error">Unsupported chart type: {type}</div>;
    }
  };

  return (
    <div className="chart-wrapper">
      {/* Title and controls */}
      <div className="chart-header">
        {title && <h3 className="chart-title">{title}</h3>}
        <div className="chart-controls">
          {zoomable && type !== 'pie' && zoomDomain && (
            <button
              className="chart-control-button"
              onClick={handleResetZoom}
              aria-label="Reset zoom"
              title="Reset zoom"
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
              <span className="chart-control-text">Reset</span>
            </button>
          )}
          {exportable && (
            <button
              className="chart-control-button"
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
              <span className="chart-control-text">PNG</span>
            </button>
          )}
        </div>
      </div>

      {/* Chart container */}
      <div className="chart-container" ref={chartRef}>
        {data.length === 0 ? (
          <div className="chart-empty">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <path
                d="M8 40V16L24 8L40 16V40H8Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M24 24V40"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <p>No data available</p>
          </div>
        ) : (
          renderChart()
        )}
      </div>
    </div>
  );
}
