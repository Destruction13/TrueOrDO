/**
 * ApiEndpointDetail component
 * Displays complete API endpoint documentation with HTTP method, URL, parameters, and examples
 * 
 * Features:
 * - HTTP method badge with color coding
 * - URL path display
 * - Parameters table with name, type, required, description
 * - Request example with syntax highlighting
 * - Response format and example with syntax highlighting
 * - Authentication requirements display
 * 
 * Validates: Requirements 4.3, 4.4, 4.5
 */

import { CodeBlock } from './CodeBlock';
import type { ApiEndpoint } from '../../types';
import './ApiEndpointDetail.css';

export interface ApiEndpointDetailProps {
  endpoint: ApiEndpoint;
  theme?: 'light' | 'dark';
}

/**
 * Get CSS class for HTTP method badge
 */
function getMethodClass(method: string): string {
  const methodMap: Record<string, string> = {
    GET: 'method-get',
    POST: 'method-post',
    PUT: 'method-put',
    DELETE: 'method-delete',
    PATCH: 'method-patch',
  };
  return methodMap[method] || 'method-default';
}

/**
 * ApiEndpointDetail component
 * Renders complete API endpoint documentation
 */
export function ApiEndpointDetail({ endpoint, theme = 'dark' }: ApiEndpointDetailProps) {
  const {
    method,
    url,
    description,
    parameters = [],
    requestExample,
    responseFormat,
    responseExample,
    authentication,
  } = endpoint;

  return (
    <div className="api-endpoint-detail">
      {/* Header with method and URL */}
      <div className="api-endpoint-header">
        <span className={`http-method-badge ${getMethodClass(method)}`}>
          {method}
        </span>
        <code className="api-endpoint-url">{url}</code>
      </div>

      {/* Description */}
      {description && (
        <div className="api-endpoint-description">
          <p>{description}</p>
        </div>
      )}

      {/* Authentication requirements */}
      {authentication && (
        <div className="api-endpoint-auth">
          <h3>Authentication</h3>
          <p>{authentication}</p>
        </div>
      )}

      {/* Parameters table */}
      {parameters.length > 0 && (
        <div className="api-endpoint-section">
          <h3>Parameters</h3>
          <div className="parameters-table-wrapper">
            <table className="parameters-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Required</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {parameters.map((param, index) => (
                  <tr key={index}>
                    <td>
                      <code className="param-name">{param.name}</code>
                    </td>
                    <td>
                      <code className="param-type">{param.type}</code>
                    </td>
                    <td>
                      <span className={`param-required ${param.required ? 'required' : 'optional'}`}>
                        {param.required ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td>{param.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Request example */}
      {requestExample && (
        <div className="api-endpoint-section">
          <h3>Request Example</h3>
          <CodeBlock
            code={requestExample}
            language="json"
            showLineNumbers={true}
            showCopyButton={true}
            theme={theme}
          />
        </div>
      )}

      {/* Response format */}
      {responseFormat && (
        <div className="api-endpoint-section">
          <h3>Response Format</h3>
          <CodeBlock
            code={responseFormat}
            language="json"
            showLineNumbers={true}
            showCopyButton={true}
            theme={theme}
          />
        </div>
      )}

      {/* Response example */}
      {responseExample && (
        <div className="api-endpoint-section">
          <h3>Response Example</h3>
          <CodeBlock
            code={responseExample}
            language="json"
            showLineNumbers={true}
            showCopyButton={true}
            theme={theme}
          />
        </div>
      )}
    </div>
  );
}
