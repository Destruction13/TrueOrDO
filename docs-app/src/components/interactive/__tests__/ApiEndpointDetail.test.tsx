/**
 * ApiEndpointDetail component tests
 * Tests for API endpoint detail page display
 * 
 * Validates: Requirements 4.3, 4.4, 4.5
 */

import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../../../test-utils';
import { ApiEndpointDetail } from '../ApiEndpointDetail';
import type { ApiEndpoint } from '../../../types';

describe('ApiEndpointDetail', () => {
  const mockEndpoint: ApiEndpoint = {
    method: 'POST',
    url: '/api/v1/users',
    description: 'Create a new user account',
    parameters: [
      {
        name: 'username',
        type: 'string',
        required: true,
        description: 'Unique username for the account',
      },
      {
        name: 'email',
        type: 'string',
        required: true,
        description: 'User email address',
      },
      {
        name: 'age',
        type: 'number',
        required: false,
        description: 'User age (optional)',
      },
    ],
    requestExample: '{\n  "username": "john_doe",\n  "email": "john@example.com",\n  "age": 25\n}',
    responseFormat: '{\n  "id": "string",\n  "username": "string",\n  "email": "string",\n  "createdAt": "string"\n}',
    responseExample: '{\n  "id": "user_123",\n  "username": "john_doe",\n  "email": "john@example.com",\n  "createdAt": "2024-01-15T10:30:00Z"\n}',
    authentication: 'Bearer token required',
  };

  describe('HTTP Method and URL Display', () => {
    it('should display HTTP method badge', () => {
      render(<ApiEndpointDetail endpoint={mockEndpoint} />);
      
      const methodBadge = screen.getByText('POST');
      expect(methodBadge).toBeInTheDocument();
      expect(methodBadge).toHaveClass('http-method-badge');
      expect(methodBadge).toHaveClass('method-post');
    });

    it('should display URL path', () => {
      render(<ApiEndpointDetail endpoint={mockEndpoint} />);
      
      const url = screen.getByText('/api/v1/users');
      expect(url).toBeInTheDocument();
      expect(url).toHaveClass('api-endpoint-url');
    });

    it('should apply correct CSS class for GET method', () => {
      const getEndpoint: ApiEndpoint = {
        ...mockEndpoint,
        method: 'GET',
      };
      
      render(<ApiEndpointDetail endpoint={getEndpoint} />);
      
      const methodBadge = screen.getByText('GET');
      expect(methodBadge).toHaveClass('method-get');
    });

    it('should apply correct CSS class for DELETE method', () => {
      const deleteEndpoint: ApiEndpoint = {
        ...mockEndpoint,
        method: 'DELETE',
      };
      
      render(<ApiEndpointDetail endpoint={deleteEndpoint} />);
      
      const methodBadge = screen.getByText('DELETE');
      expect(methodBadge).toHaveClass('method-delete');
    });
  });

  describe('Description Display', () => {
    it('should display endpoint description', () => {
      render(<ApiEndpointDetail endpoint={mockEndpoint} />);
      
      expect(screen.getByText('Create a new user account')).toBeInTheDocument();
    });

    it('should not render description section when description is missing', () => {
      const endpointWithoutDescription: ApiEndpoint = {
        ...mockEndpoint,
        description: '',
      };
      
      const { container } = render(<ApiEndpointDetail endpoint={endpointWithoutDescription} />);
      
      expect(container.querySelector('.api-endpoint-description')).not.toBeInTheDocument();
    });
  });

  describe('Authentication Display', () => {
    it('should display authentication requirements', () => {
      render(<ApiEndpointDetail endpoint={mockEndpoint} />);
      
      expect(screen.getByText('Authentication')).toBeInTheDocument();
      expect(screen.getByText('Bearer token required')).toBeInTheDocument();
    });

    it('should not render authentication section when not specified', () => {
      const endpointWithoutAuth: ApiEndpoint = {
        ...mockEndpoint,
        authentication: undefined,
      };
      
      const { container } = render(<ApiEndpointDetail endpoint={endpointWithoutAuth} />);
      
      expect(container.querySelector('.api-endpoint-auth')).not.toBeInTheDocument();
    });
  });

  describe('Parameters Table', () => {
    it('should display parameters table with headers', () => {
      render(<ApiEndpointDetail endpoint={mockEndpoint} />);
      
      expect(screen.getByText('Parameters')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Required')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    it('should display all parameter rows', () => {
      render(<ApiEndpointDetail endpoint={mockEndpoint} />);
      
      // Check parameter names
      expect(screen.getByText('username')).toBeInTheDocument();
      expect(screen.getByText('email')).toBeInTheDocument();
      expect(screen.getByText('age')).toBeInTheDocument();
      
      // Check parameter types
      const stringTypes = screen.getAllByText('string');
      expect(stringTypes).toHaveLength(2); // username and email
      expect(screen.getByText('number')).toBeInTheDocument();
      
      // Check parameter descriptions
      expect(screen.getByText('Unique username for the account')).toBeInTheDocument();
      expect(screen.getByText('User email address')).toBeInTheDocument();
      expect(screen.getByText('User age (optional)')).toBeInTheDocument();
    });

    it('should display required status correctly', () => {
      render(<ApiEndpointDetail endpoint={mockEndpoint} />);
      
      const yesElements = screen.getAllByText('Yes');
      const noElements = screen.getAllByText('No');
      
      expect(yesElements).toHaveLength(2); // username and email are required
      expect(noElements).toHaveLength(1); // age is optional
    });

    it('should not render parameters section when no parameters', () => {
      const endpointWithoutParams: ApiEndpoint = {
        ...mockEndpoint,
        parameters: [],
      };
      
      const { container } = render(<ApiEndpointDetail endpoint={endpointWithoutParams} />);
      
      expect(container.querySelector('.parameters-table')).not.toBeInTheDocument();
    });
  });

  describe('Request Example Display', () => {
    it('should display request example section', () => {
      render(<ApiEndpointDetail endpoint={mockEndpoint} />);
      
      expect(screen.getByText('Request Example')).toBeInTheDocument();
    });

    it('should render request example in CodeBlock', () => {
      const { container } = render(<ApiEndpointDetail endpoint={mockEndpoint} />);
      
      // CodeBlock should be present
      const codeBlocks = container.querySelectorAll('.code-block-wrapper');
      expect(codeBlocks.length).toBeGreaterThan(0);
      
      // Request example content should be present (text may be split across elements)
      expect(container.textContent).toContain('john_doe');
      expect(container.textContent).toContain('john@example.com');
    });

    it('should not render request example section when not provided', () => {
      const endpointWithoutRequest: ApiEndpoint = {
        ...mockEndpoint,
        requestExample: undefined,
      };
      
      render(<ApiEndpointDetail endpoint={endpointWithoutRequest} />);
      
      expect(screen.queryByText('Request Example')).not.toBeInTheDocument();
    });
  });

  describe('Response Format Display', () => {
    it('should display response format section', () => {
      render(<ApiEndpointDetail endpoint={mockEndpoint} />);
      
      expect(screen.getByText('Response Format')).toBeInTheDocument();
    });

    it('should render response format in CodeBlock', () => {
      const { container } = render(<ApiEndpointDetail endpoint={mockEndpoint} />);
      
      // Response format content should be present (text may be split across elements)
      expect(container.textContent).toContain('id');
      expect(container.textContent).toContain('string');
      expect(container.textContent).toContain('createdAt');
    });

    it('should not render response format section when not provided', () => {
      const endpointWithoutFormat: ApiEndpoint = {
        ...mockEndpoint,
        responseFormat: undefined,
      };
      
      render(<ApiEndpointDetail endpoint={endpointWithoutFormat} />);
      
      expect(screen.queryByText('Response Format')).not.toBeInTheDocument();
    });
  });

  describe('Response Example Display', () => {
    it('should display response example section', () => {
      render(<ApiEndpointDetail endpoint={mockEndpoint} />);
      
      expect(screen.getByText('Response Example')).toBeInTheDocument();
    });

    it('should render response example in CodeBlock', () => {
      const { container } = render(<ApiEndpointDetail endpoint={mockEndpoint} />);
      
      // Response example content should be present (text may be split across elements)
      expect(container.textContent).toContain('user_123');
      expect(container.textContent).toContain('john_doe');
      expect(container.textContent).toContain('2024-01-15T10:30:00Z');
    });

    it('should not render response example section when not provided', () => {
      const endpointWithoutExample: ApiEndpoint = {
        ...mockEndpoint,
        responseExample: undefined,
      };
      
      render(<ApiEndpointDetail endpoint={endpointWithoutExample} />);
      
      expect(screen.queryByText('Response Example')).not.toBeInTheDocument();
    });
  });

  describe('Complete Endpoint Information', () => {
    it('should display all required fields for complete endpoint', () => {
      render(<ApiEndpointDetail endpoint={mockEndpoint} />);
      
      // HTTP method and URL
      expect(screen.getByText('POST')).toBeInTheDocument();
      expect(screen.getByText('/api/v1/users')).toBeInTheDocument();
      
      // Description
      expect(screen.getByText('Create a new user account')).toBeInTheDocument();
      
      // Parameters
      expect(screen.getByText('Parameters')).toBeInTheDocument();
      expect(screen.getByText('username')).toBeInTheDocument();
      
      // Request example
      expect(screen.getByText('Request Example')).toBeInTheDocument();
      
      // Response format
      expect(screen.getByText('Response Format')).toBeInTheDocument();
      
      // Response example
      expect(screen.getByText('Response Example')).toBeInTheDocument();
    });

    it('should work with minimal endpoint data', () => {
      const minimalEndpoint: ApiEndpoint = {
        method: 'GET',
        url: '/api/v1/status',
        description: 'Check API status',
      };
      
      render(<ApiEndpointDetail endpoint={minimalEndpoint} />);
      
      expect(screen.getByText('GET')).toBeInTheDocument();
      expect(screen.getByText('/api/v1/status')).toBeInTheDocument();
      expect(screen.getByText('Check API status')).toBeInTheDocument();
    });
  });

  describe('Theme Support', () => {
    it('should pass theme prop to CodeBlock components', () => {
      const { rerender } = render(<ApiEndpointDetail endpoint={mockEndpoint} theme="light" />);
      
      // Component should render without errors
      expect(screen.getByText('POST')).toBeInTheDocument();
      
      // Rerender with dark theme
      rerender(<ApiEndpointDetail endpoint={mockEndpoint} theme="dark" />);
      expect(screen.getByText('POST')).toBeInTheDocument();
    });

    it('should default to dark theme when not specified', () => {
      render(<ApiEndpointDetail endpoint={mockEndpoint} />);
      
      // Should render successfully with default theme
      expect(screen.getByText('POST')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty parameter array', () => {
      const endpointWithEmptyParams: ApiEndpoint = {
        ...mockEndpoint,
        parameters: [],
      };
      
      const { container } = render(<ApiEndpointDetail endpoint={endpointWithEmptyParams} />);
      
      expect(container.querySelector('.parameters-table')).not.toBeInTheDocument();
    });

    it('should handle long URLs without breaking layout', () => {
      const endpointWithLongUrl: ApiEndpoint = {
        ...mockEndpoint,
        url: '/api/v1/users/very/long/path/that/might/cause/layout/issues/in/some/cases',
      };
      
      render(<ApiEndpointDetail endpoint={endpointWithLongUrl} />);
      
      const url = screen.getByText(endpointWithLongUrl.url);
      expect(url).toBeInTheDocument();
      expect(url).toHaveClass('api-endpoint-url');
    });

    it('should handle special characters in parameter descriptions', () => {
      const endpointWithSpecialChars: ApiEndpoint = {
        ...mockEndpoint,
        parameters: [
          {
            name: 'query',
            type: 'string',
            required: true,
            description: 'Search query with special chars: <>&"\'',
          },
        ],
      };
      
      render(<ApiEndpointDetail endpoint={endpointWithSpecialChars} />);
      
      expect(screen.getByText(/Search query with special chars/)).toBeInTheDocument();
    });
  });
});
