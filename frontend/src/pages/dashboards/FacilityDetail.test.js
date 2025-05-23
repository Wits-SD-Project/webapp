// FacilityDetail.functions.test.js

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { toast } from 'react-toastify';
import FacilityDetail from '../../pages/dashboards/FacilityDetail';
import { auth, getAuthToken } from '../../firebase';

// Mock dependencies
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('../../firebase', () => ({
  auth: {
    currentUser: {
      getIdToken: jest.fn()
    }
  },
  getAuthToken: jest.fn()
}));

jest.mock('../../components/ResSideBar', () => {
  return function DummySidebar({ activeItem }) {
    return <div data-testid="sidebar" data-active={activeItem}></div>;
  };
});

// Mock react-leaflet
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer"></div>,
  Marker: ({ children }) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }) => <div data-testid="popup">{children}</div>
}));

// Mock leaflet
jest.mock('leaflet', () => ({
  Icon: {
    Default: {
      prototype: {
        _getIconUrl: jest.fn()
      },
      mergeOptions: jest.fn()
    }
  },
  icon: jest.fn().mockReturnValue({}),
  marker: jest.fn().mockReturnValue({
    addTo: jest.fn().mockReturnValue({
      bindPopup: jest.fn().mockReturnValue({
        openPopup: jest.fn()
      })
    })
  }),
  divIcon: jest.fn().mockReturnValue({}),
  point: jest.fn().mockReturnValue({}),
  latLng: jest.fn().mockReturnValue({}),
  map: jest.fn().mockReturnValue({
    addLayer: jest.fn(),
    removeLayer: jest.fn(),
    setView: jest.fn(),
    getZoom: jest.fn(),
    setZoom: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  })
}));

// Mock react-datepicker
jest.mock('react-datepicker', () => {
  const MockDatePicker = ({ onChange, selected, filterDate, inline, minDate, dayClassName }) => {
    // Create a simple date picker for testing
    const handleDateChange = (e) => {
      const mockDate = new Date('2023-06-15');
      onChange(mockDate);
    };
    
    return (
      <div data-testid="date-picker">
        <button data-testid="select-date-button" onClick={handleDateChange}>Select Date</button>
      </div>
    );
  };
  return MockDatePicker;
});

// Mock fetch
global.fetch = jest.fn();

describe('FacilityDetail Component - Function Coverage', () => {
  const mockFacility = {
    id: '123',
    name: 'Tennis Court',
    type: 'Sports',
    description: 'Professional tennis court with lighting',
    features: ['Lighting', 'Seating', 'Equipment Rental'],
    location: 'Main Campus',
    imageUrls: [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
      'https://example.com/image3.jpg'
    ],
    timeslots: [
      { id: '1', day: 'Monday', start: '09:00', end: '10:00' },
      { id: '2', day: 'Monday', start: '10:00', end: '11:00' },
      { id: '3', day: 'Tuesday', start: '14:00', end: '15:00' }
    ],
    coordinates: {
      lat: 40.7128,
      lng: -74.0060
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getAuthToken.mockResolvedValue('mock-token');
    auth.currentUser.getIdToken.mockResolvedValue('mock-token');
    
    // Mock successful facility fetch
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/facilities/123')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockFacility)
        });
      } else if (url.includes('api.open-meteo.com')) {
        return Promise.resolve({
          status: 200,
          json: () => Promise.resolve({
            daily: {
              time: ['2023-06-15', '2023-06-16', '2023-06-17'],
              weathercode: [0, 1, 2],
              temperature_2m_max: [25, 26, 24],
              temperature_2m_min: [18, 19, 17]
            }
          })
        });
      } else if (url.includes('/api/facilities/bookings')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'Booking successful' })
        });
      }
      
      return Promise.reject(new Error('Not found'));
    });
  });

  // Function: useEffect - fetchFacility
  test('fetchFacility function is called on component mount', async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/facility/123']}>
          <Routes>
            <Route path="/facility/:id" element={<FacilityDetail />} />
          </Routes>
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/facilities/123'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token'
          })
        })
      );
    });
  });

  // Function: groupSlotsByDay
  test('groupSlotsByDay function correctly groups timeslots by day', async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/facility/123']}>
          <Routes>
            <Route path="/facility/:id" element={<FacilityDetail />} />
          </Routes>
        </MemoryRouter>
      );
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Check if tabs are created for each day
    await waitFor(() => {
      expect(screen.getByText('Monday')).toBeInTheDocument();
      expect(screen.getByText('Tuesday')).toBeInTheDocument();
    });
    
    // Check if slots are grouped under Monday tab (which should be active by default)
    expect(screen.getByText('09:00 - 10:00')).toBeInTheDocument();
    expect(screen.getByText('10:00 - 11:00')).toBeInTheDocument();
  });

  // Function: handleSlotSelect and handleTabChange
  test('slot selection and tab change functions work correctly', async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/facility/123']}>
          <Routes>
            <Route path="/facility/:id" element={<FacilityDetail />} />
          </Routes>
        </MemoryRouter>
      );
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Check if Monday slots are visible by default
    expect(screen.getByText('09:00 - 10:00')).toBeInTheDocument();
    expect(screen.getByText('10:00 - 11:00')).toBeInTheDocument();
    
    // Click on Tuesday tab
    fireEvent.click(screen.getByText('Tuesday'));
    
    // Check that Tuesday slots are shown and Monday slots are hidden
    await waitFor(() => {
      expect(screen.getByText('14:00 - 15:00')).toBeInTheDocument();
      expect(screen.queryByText('09:00 - 10:00')).not.toBeInTheDocument();
    });
    
    // Click on a slot to select it
    fireEvent.click(screen.getByText('14:00 - 15:00'));
    
    // Check that date picker appears with correct day
    await waitFor(() => {
      expect(screen.getByText('Select Date for Tuesday')).toBeInTheDocument();
    });
  });

  // Function: handleDateSelect and confirmBooking
  test('date selection and booking confirmation flow works correctly', async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/facility/123']}>
          <Routes>
            <Route path="/facility/:id" element={<FacilityDetail />} />
          </Routes>
        </MemoryRouter>
      );
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Click on a slot
    fireEvent.click(screen.getByText('09:00 - 10:00'));
    
    // Check that date picker appears
    await waitFor(() => {
      expect(screen.getByText('Select Date for Monday')).toBeInTheDocument();
    });
    
    // Select a date
    fireEvent.click(screen.getByTestId('select-date-button'));
    
    // Check that confirmation dialog appears
    await waitFor(() => {
      expect(screen.getByText('Confirm Booking')).toBeInTheDocument();
      expect(screen.getByText(/Tennis Court/)).toBeInTheDocument();
      expect(screen.getByText(/09:00 - 10:00/)).toBeInTheDocument();
    });
    
    // Confirm booking
    fireEvent.click(screen.getByText('Confirm Booking'));
    
    // Check that booking API was called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/facilities/bookings'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token'
          })
        })
      );
    });
    
    // Check that success toast was shown
    expect(toast.success).toHaveBeenCalled();
  });

  // Function: Dialog close handler
  test('dialog close handler function closes confirmation dialog', async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/facility/123']}>
          <Routes>
            <Route path="/facility/:id" element={<FacilityDetail />} />
          </Routes>
        </MemoryRouter>
      );
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Click on a slot
    fireEvent.click(screen.getByText('09:00 - 10:00'));
    
    // Select a date
    fireEvent.click(screen.getByTestId('select-date-button'));
    
    // Check that confirmation dialog appears
    await waitFor(() => {
      expect(screen.getByText('Confirm Booking')).toBeInTheDocument();
    });
    
    // Click cancel button
    fireEvent.click(screen.getByText('Cancel'));
    
    // Check that dialog was closed
    await waitFor(() => {
      expect(screen.queryByText('Confirm Booking')).not.toBeInTheDocument();
    });
  });

  // Function: Error handling in fetchFacility
  test('fetchFacility handles errors correctly', async () => {
    // Mock facility fetch error
    global.fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Facility not found' })
      })
    );

    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/facility/123']}>
          <Routes>
            <Route path="/facility/:id" element={<FacilityDetail />} />
          </Routes>
        </MemoryRouter>
      );
    });

    // Check that error toast was shown
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Facility not found'));
    });
  });

  // Function: Error handling in confirmBooking
  test('confirmBooking handles errors correctly', async () => {
    // First fetch is successful to load the facility
    global.fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockFacility)
      })
    );
    
    // Second fetch for weather data
    global.fetch.mockImplementationOnce(() => 
      Promise.resolve({
        status: 200,
        json: () => Promise.resolve({
          daily: {
            time: ['2023-06-15', '2023-06-16', '2023-06-17'],
            weathercode: [0, 1, 2],
            temperature_2m_max: [25, 26, 24],
            temperature_2m_min: [18, 19, 17]
          }
        })
      })
    );
    
    // Third fetch for booking fails
    global.fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Booking failed - slot already taken' })
      })
    );

    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/facility/123']}>
          <Routes>
            <Route path="/facility/:id" element={<FacilityDetail />} />
          </Routes>
        </MemoryRouter>
      );
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Click on a slot
    fireEvent.click(screen.getByText('09:00 - 10:00'));
    
    // Select a date
    fireEvent.click(screen.getByTestId('select-date-button'));
    
    // Confirm booking
    await waitFor(() => {
      expect(screen.getByText('Confirm Booking')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Confirm Booking'));
    
    // Check that error toast was shown
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Booking failed - slot already taken');
    });
  });
});
