import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Reports from './Reports';
import { getAuthToken } from '../../firebase';

// Mock dependencies
jest.mock('../../firebase', () => ({
  getAuthToken: jest.fn().mockResolvedValue('mock-token'),
}));

// Mock the sidebar component
jest.mock('../../components/AdminSideBar.js', () => {
  return {
    __esModule: true,
    default: ({ activeItem }) => <aside data-testid="sidebar" data-active={activeItem}>Admin Sidebar</aside>
  };
});

// Mock recharts components
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
    BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
    LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    XAxis: () => <div data-testid="x-axis" />,
    YAxis: () => <div data-testid="y-axis" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Bar: () => <div data-testid="bar" />,
    Line: () => <div data-testid="line" />,
  };
});

// Mock fetch
global.fetch = jest.fn();

describe('Reports Component', () => {
  const mockHourlyBookings = [
    { hour: '9:00', bookings: 5 },
    { hour: '10:00', bookings: 8 },
    { hour: '11:00', bookings: 12 },
    { hour: '12:00', bookings: 7 },
  ];

  const mockTopFacilities = [
    { name: 'Tennis Court', bookings: 25 },
    { name: 'Swimming Pool', bookings: 20 },
    { name: 'Basketball Court', bookings: 15 },
    { name: 'Gym', bookings: 10 },
  ];

  const mockDailyBookings = [
    { day: 'Mon', bookings: 15 },
    { day: 'Tue', bookings: 20 },
    { day: 'Wed', bookings: 18 },
    { day: 'Thu', bookings: 22 },
    { day: 'Fri', bookings: 30 },
    { day: 'Sat', bookings: 25 },
    { day: 'Sun', bookings: 10 },
  ];

  const mockSummaryStats = {
    totalBookings: 140,
    mostUsedFacility: 'Tennis Court',
    peakHour: '11:00 - 12:00',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful API responses
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/admin/hourly-bookings')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ hourlyBookings: mockHourlyBookings }),
        });
      } else if (url.includes('/api/admin/top-facilities')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ topFacilities: mockTopFacilities }),
        });
      } else if (url.includes('/api/admin/daily-bookings')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ dailyBookings: mockDailyBookings }),
        });
      } else if (url.includes('/api/admin/summary-stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSummaryStats),
        });
      }
      return Promise.reject(new Error('Not found'));
    });
  });

  it('displays loading state initially', () => {
    render(<Reports />);
    expect(screen.getByText(/loading reports/i)).toBeInTheDocument();
  });

  it('fetches and displays report data', async () => {
    render(<Reports />);
    
    // Check loading state is shown first
    expect(screen.getByText(/loading reports/i)).toBeInTheDocument();
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText(/loading reports/i)).not.toBeInTheDocument();
    });
    
    // Check summary stats are displayed
    expect(screen.getByText('Total Bookings This Week')).toBeInTheDocument();
    expect(screen.getByText('140')).toBeInTheDocument();
    expect(screen.getByText('Most Used Facility')).toBeInTheDocument();
    expect(screen.getByText('Tennis Court')).toBeInTheDocument();
    expect(screen.getByText('Peak Hour')).toBeInTheDocument();
    expect(screen.getByText('11:00 - 12:00')).toBeInTheDocument();
    
    // Check chart titles
    expect(screen.getByText('Peak Usage Times')).toBeInTheDocument();
    expect(screen.getByText('Top Booked Facilities')).toBeInTheDocument();
    expect(screen.getByText('Bookings Per Day')).toBeInTheDocument();
    
    // Check charts are rendered
    expect(screen.getAllByTestId('responsive-container').length).toBe(2);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    
    // Check top facilities are listed
    expect(screen.getByText('Tennis Court')).toBeInTheDocument();
    expect(screen.getByText('Swimming Pool')).toBeInTheDocument();
    expect(screen.getByText('Basketball Court')).toBeInTheDocument();
    expect(screen.getByText('Gym')).toBeInTheDocument();
    
    // Verify the sidebar is rendered with the correct active item
    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar).toBeInTheDocument();
    expect(sidebar).toHaveAttribute('data-active', 'reports');
  });

  it('handles API fetch errors gracefully', async () => {
    // Mock console.error to prevent error logs in test output
    const originalConsoleError = console.error;
    console.error = jest.fn();
    
    // Mock API failure
    global.fetch.mockImplementation(() => {
      return Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: 'Server error' }),
      });
    });
    
    render(<Reports />);
    
    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading reports/i)).not.toBeInTheDocument();
    });
    
    // Check that console.error was called (indicating error handling)
    expect(console.error).toHaveBeenCalled();
    
    // Check that the component rendered something despite the error
    expect(screen.getByText('Peak Usage Times')).toBeInTheDocument();
    
    // Restore console.error
    console.error = originalConsoleError;
  });

  it('handles network errors gracefully', async () => {
    // Mock console.error to prevent error logs in test output
    const originalConsoleError = console.error;
    console.error = jest.fn();
    
    // Mock network failure
    global.fetch.mockImplementation(() => {
      return Promise.reject(new Error('Network error'));
    });
    
    render(<Reports />);
    
    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading reports/i)).not.toBeInTheDocument();
    });
    
    // Check that console.error was called (indicating error handling)
    expect(console.error).toHaveBeenCalled();
    
    // Restore console.error
    console.error = originalConsoleError;
  });

  it('handles authentication token failure', async () => {
    // Mock console.error to prevent error logs in test output
    const originalConsoleError = console.error;
    console.error = jest.fn();
    
    // Mock auth token failure
    getAuthToken.mockRejectedValueOnce(new Error('Authentication failed'));
    
    render(<Reports />);
    
    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading reports/i)).not.toBeInTheDocument();
    });
    
    // Check that console.error was called (indicating error handling)
    expect(console.error).toHaveBeenCalled();
    
    // Restore console.error
    console.error = originalConsoleError;
  });

  it('renders correctly with empty data', async () => {
    // Mock API responses with empty data
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/admin/hourly-bookings')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ hourlyBookings: [] }),
        });
      } else if (url.includes('/api/admin/top-facilities')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ topFacilities: [] }),
        });
      } else if (url.includes('/api/admin/daily-bookings')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ dailyBookings: [] }),
        });
      } else if (url.includes('/api/admin/summary-stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            totalBookings: 0,
            mostUsedFacility: 'None',
            peakHour: 'None'
          }),
        });
      }
      return Promise.reject(new Error('Not found'));
    });
    
    render(<Reports />);
    
    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading reports/i)).not.toBeInTheDocument();
    });
    
    // Check summary stats are displayed with empty values
    expect(screen.getByText('Total Bookings This Week')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('Most Used Facility')).toBeInTheDocument();
    expect(screen.getByText('None')).toBeInTheDocument();
    expect(screen.getByText('Peak Hour')).toBeInTheDocument();
    expect(screen.getByText('None')).toBeInTheDocument();
    
    // Charts should still be rendered even with empty data
    expect(screen.getAllByTestId('responsive-container').length).toBe(2);
  });

  it('makes API requests with the correct authentication token', async () => {
    render(<Reports />);
    
    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading reports/i)).not.toBeInTheDocument();
    });
    
    // Check that getAuthToken was called
    expect(getAuthToken).toHaveBeenCalled();
    
    // Check that fetch was called with the correct headers
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/admin/hourly-bookings',
      { headers: { Authorization: 'Bearer mock-token' } }
    );
    
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/admin/top-facilities',
      { headers: { Authorization: 'Bearer mock-token' } }
    );
    
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/admin/daily-bookings',
      { headers: { Authorization: 'Bearer mock-token' } }
    );
    
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/admin/summary-stats',
      { headers: { Authorization: 'Bearer mock-token' } }
    );
  });
});
