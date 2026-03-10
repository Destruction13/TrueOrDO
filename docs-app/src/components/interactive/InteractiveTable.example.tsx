import React from 'react';
import { InteractiveTable } from './InteractiveTable';
import type { Column } from '../../types';

/**
 * Example usage of InteractiveTable component
 */

// Sample data
const sampleData = [
  { id: 1, name: 'Alice Johnson', age: 30, department: 'Engineering', salary: 95000, status: 'Active' },
  { id: 2, name: 'Bob Smith', age: 25, department: 'Marketing', salary: 65000, status: 'Active' },
  { id: 3, name: 'Charlie Brown', age: 35, department: 'Engineering', salary: 110000, status: 'Active' },
  { id: 4, name: 'David Wilson', age: 28, department: 'Sales', salary: 75000, status: 'On Leave' },
  { id: 5, name: 'Eve Davis', age: 32, department: 'HR', salary: 70000, status: 'Active' },
  { id: 6, name: 'Frank Miller', age: 29, department: 'Engineering', salary: 98000, status: 'Active' },
  { id: 7, name: 'Grace Lee', age: 27, department: 'Marketing', salary: 68000, status: 'Active' },
  { id: 8, name: 'Henry Taylor', age: 31, department: 'Sales', salary: 82000, status: 'Active' },
  { id: 9, name: 'Ivy Anderson', age: 26, department: 'Engineering', salary: 92000, status: 'Active' },
  { id: 10, name: 'Jack Thomas', age: 33, department: 'HR', salary: 73000, status: 'On Leave' },
  { id: 11, name: 'Kate Martinez', age: 29, department: 'Marketing', salary: 71000, status: 'Active' },
  { id: 12, name: 'Leo Garcia', age: 34, department: 'Engineering', salary: 105000, status: 'Active' },
];

// Column definitions
const columns: Column[] = [
  { 
    key: 'id', 
    title: 'ID',
    sortable: true,
    filterable: false,
  },
  { 
    key: 'name', 
    title: 'Name',
    sortable: true,
    filterable: true,
  },
  { 
    key: 'age', 
    title: 'Age',
    sortable: true,
    filterable: true,
  },
  { 
    key: 'department', 
    title: 'Department',
    sortable: true,
    filterable: true,
  },
  { 
    key: 'salary', 
    title: 'Salary',
    sortable: true,
    filterable: true,
    render: (value) => `$${value.toLocaleString()}`,
  },
  { 
    key: 'status', 
    title: 'Status',
    sortable: true,
    filterable: true,
    render: (value) => (
      <span 
        style={{ 
          padding: '0.25rem 0.5rem',
          borderRadius: '0.25rem',
          fontSize: '0.75rem',
          fontWeight: 600,
          backgroundColor: value === 'Active' ? '#dcfce7' : '#fef3c7',
          color: value === 'Active' ? '#166534' : '#92400e',
        }}
      >
        {value}
      </span>
    ),
  },
];

export const InteractiveTableExample: React.FC = () => {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>InteractiveTable Component Examples</h1>

      <section style={{ marginTop: '2rem' }}>
        <h2>Full-Featured Table</h2>
        <p>
          This table includes all features: sorting, filtering, global search, 
          sticky headers, and pagination.
        </p>
        <InteractiveTable
          data={sampleData}
          columns={columns}
          sortable={true}
          filterable={true}
          searchable={true}
          stickyHeader={true}
          pageSize={5}
        />
      </section>

      <section style={{ marginTop: '3rem' }}>
        <h2>Simple Table (No Filtering or Search)</h2>
        <p>
          A simpler version with only sorting and pagination enabled.
        </p>
        <InteractiveTable
          data={sampleData.slice(0, 6)}
          columns={columns}
          sortable={true}
          filterable={false}
          searchable={false}
          stickyHeader={false}
          pageSize={10}
        />
      </section>

      <section style={{ marginTop: '3rem' }}>
        <h2>Read-Only Table</h2>
        <p>
          A read-only table with no interactive features.
        </p>
        <InteractiveTable
          data={sampleData.slice(0, 4)}
          columns={columns}
          sortable={false}
          filterable={false}
          searchable={false}
          stickyHeader={false}
          pageSize={10}
        />
      </section>
    </div>
  );
};

export default InteractiveTableExample;
