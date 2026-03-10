/**
 * ApiEndpointDetail Example
 * Demonstrates usage of the ApiEndpointDetail component
 */

import { ApiEndpointDetail } from './ApiEndpointDetail';
import type { ApiEndpoint } from '../../types';

// Example 1: Complete POST endpoint with all fields
const createUserEndpoint: ApiEndpoint = {
  method: 'POST',
  url: '/api/v1/users',
  description: 'Create a new user account with the provided information.',
  authentication: 'Bearer token required in Authorization header',
  parameters: [
    {
      name: 'username',
      type: 'string',
      required: true,
      description: 'Unique username for the account (3-20 characters)',
    },
    {
      name: 'email',
      type: 'string',
      required: true,
      description: 'Valid email address for the user',
    },
    {
      name: 'password',
      type: 'string',
      required: true,
      description: 'Password (minimum 8 characters)',
    },
    {
      name: 'age',
      type: 'number',
      required: false,
      description: 'User age (optional, must be 18 or older)',
    },
  ],
  requestExample: `{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "age": 25
}`,
  responseFormat: `{
  "id": "string",
  "username": "string",
  "email": "string",
  "createdAt": "string",
  "updatedAt": "string"
}`,
  responseExample: `{
  "id": "user_123abc",
  "username": "john_doe",
  "email": "john@example.com",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}`,
};

// Example 2: Simple GET endpoint
const getUserEndpoint: ApiEndpoint = {
  method: 'GET',
  url: '/api/v1/users/:id',
  description: 'Retrieve a user by their unique ID.',
  authentication: 'Bearer token required',
  parameters: [
    {
      name: 'id',
      type: 'string',
      required: true,
      description: 'Unique user identifier',
    },
  ],
  responseExample: `{
  "id": "user_123abc",
  "username": "john_doe",
  "email": "john@example.com",
  "createdAt": "2024-01-15T10:30:00Z"
}`,
};

// Example 3: DELETE endpoint
const deleteUserEndpoint: ApiEndpoint = {
  method: 'DELETE',
  url: '/api/v1/users/:id',
  description: 'Delete a user account permanently.',
  authentication: 'Bearer token required with admin privileges',
  parameters: [
    {
      name: 'id',
      type: 'string',
      required: true,
      description: 'ID of the user to delete',
    },
  ],
  responseExample: `{
  "success": true,
  "message": "User deleted successfully"
}`,
};

// Example 4: Minimal endpoint (no parameters or examples)
const healthCheckEndpoint: ApiEndpoint = {
  method: 'GET',
  url: '/api/v1/health',
  description: 'Check the health status of the API service.',
};

/**
 * Example component showing different endpoint types
 */
export function ApiEndpointDetailExamples() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '2rem' }}>
      <div>
        <h2>Example 1: Complete POST Endpoint</h2>
        <ApiEndpointDetail endpoint={createUserEndpoint} theme="dark" />
      </div>

      <div>
        <h2>Example 2: Simple GET Endpoint</h2>
        <ApiEndpointDetail endpoint={getUserEndpoint} theme="dark" />
      </div>

      <div>
        <h2>Example 3: DELETE Endpoint</h2>
        <ApiEndpointDetail endpoint={deleteUserEndpoint} theme="dark" />
      </div>

      <div>
        <h2>Example 4: Minimal Endpoint</h2>
        <ApiEndpointDetail endpoint={healthCheckEndpoint} theme="light" />
      </div>
    </div>
  );
}
