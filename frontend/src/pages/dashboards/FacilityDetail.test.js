import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import FacilityDetail from './FacilityDetail';
import { toast } from 'react-toastify';
import { auth, getAuthToken } from '../../firebase';

// Mock dependencies
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ id: 'facility123' }),
}));

jest.mock('../../firebase', () => ({
  auth: {
    currentUser: {
      getIdToken: jest.fn().mockResolvedValue('mock-token'),
    },
  },
  getAuthToken: jest.fn().mockResolvedValue('mock-token'),
}));

jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }) => <div data-testid="map-marker">{children}</div>,
  Popup: ({ children }) => <div data-testid="map-popup">{children}</div>,
}));

jest.mock('leaflet', () => ({
  Icon: {
    Default: {
      prototype: {
        _getIconUrl: jest.fn(),
      },
      mergeOptions: jest.fn(),
    },
  },
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
        <button onClick={handleDateChange}>Select Date</button>
      </div>
    );
  };
  return MockDatePicker;
});

// Mock fetch
global.fetch = jest.fn();

describe('FacilityDetail Component', () => {
  const mockFacility = {
    id: 'facility123',
    name: 'Test Facility',
    description: 'This is a test facility description',
    type: 'Tennis Court',
    location: 'Test Location',
    features: ['Lighting', 'Seating', 'Accessible'],
    timeslots: [
      { id: 'slot1', day: 'Monday', start: '09:00', end: '10:00' },
      { id: 'slot2', day: 'Monday', start: '10:00', end: '11:00' },
      { id: 'slot3', day: 'Tuesday', start: '14:00', end: '15:00' },
    ],
    imageUrls: [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
      'https://example.com/image3.jpg',
    ],
    coordinates: {
      lat: 40.7128,
      lng: -74.0060,
    },
  };

  const mockWeatherData = {
    daily: {
      time: ['2023-06-15', '2023-06-16', '2023-06-17', '2023-06-18', '2023-06-19', '2023-06-20', '2023-06-21'],
      weathercode: [0, 1, 2, 3, 61, 71, 95],
      temperature_2m_max: [25, 26, 24, 22, 20, 19, 21],
      temperature_2m_min: [18, 19, 17, 15, 14, 13, 15],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful facility fetch
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/facilities/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockFacility),
        });
      }
      
      if (url.includes('api.open-meteo.com')) {
        return Promise.resolve({
          status: 200,
          json: () => Promise.resolve(mockWeatherData),
        });
      }
      
      if (url.includes('/api/facilities/bookings')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ message: 'Booking successful' }),
        });
      }
      
      return Promise.reject(new Error('Not found'));
    });
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter initialEntries={[`/facilities/facility123`]}>
        <Routes>
          <Route path="/facilities/:id" element={<FacilityDetail />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('displays loading state initially', () => {
    renderComponent();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('fetches and displays facility details', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Test Facility')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Test Location')).toBeInTheDocument();
    expect(screen.getByText('Tennis Court')).toBeInTheDocument();
    expect(screen.getByText('This is a test facility description')).toBeInTheDocument();
    
    // Check features
    expect(screen.getByText('Lighting')).toBeInTheDocument();
    expect(screen.getByText('Seating')).toBeInTheDocument();
    expect(screen.getByText('Accessible')).toBeInTheDocument();
    
    // Check timeslots
    expect(screen.getByText('Monday')).toBeInTheDocument();
    expect(screen.getByText('Tuesday')).toBeInTheDocument();
    
    // Check images
    const images = document.querySelectorAll('img');
    expect(images.length).toBeGreaterThan(0);
    expect(images[0]).toHaveAttribute('src', 'https://example.com/image1.jpg');
    
    // Check map
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });

  it('handles facility fetch error', async () => {
    global.fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Facility not found' }),
      })
    );
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Facility not found')).toBeInTheDocument();
    });
    
    expect(toast.error).toHaveBeenCalled();
  });

  it('displays weather forecast when coordinates are available', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Test Facility')).toBeInTheDocument();
    });
    
    await waitFor(() => {
      expect(screen.getByText('7-Day Weather Forecast')).toBeInTheDocument();
    });
  });

  it('handles weather fetch error gracefully', async () => {
    // First fetch is facility, second is weather
    global.fetch
      .mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockFacility),
        })
      )
      .mockImplementationOnce(() => 
        Promise.reject(new Error('Weather API error'))
      );
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Test Facility')).toBeInTheDocument();
    });
    
    // Component should still render even if weather fails
    expect(screen.getByText('Features')).toBeInTheDocument();
  });

  it('allows selecting a timeslot', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Test Facility')).toBeInTheDocument();
    });
    
    // Click on a timeslot
    const slotButton = screen.getByText('09:00 - 10:00');
    fireEvent.click(slotButton);
    
    // Date picker should be visible
    expect(screen.getByText('Select Date for Monday')).toBeInTheDocument();
    expect(screen.getByTestId('date-picker')).toBeInTheDocument();
  });

  it('handles date selection and shows confirmation dialog', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Test Facility')).toBeInTheDocument();
    });
    
    // Click on a timeslot
    const slotButton = screen.getByText('09:00 - 10:00');
    fireEvent.click(slotButton);
    
    // Select a date
    const datePickerButton = screen.getByText('Select Date');
    fireEvent.click(datePickerButton);
    
    // Confirmation dialog should be visible
    await waitFor(() => {
      expect(screen.getByText('Confirm Booking')).toBeInTheDocument();
    });
    
    // Dialog should show selected details
    expect(screen.getByText('09:00 - 10:00')).toBeInTheDocument();
  });

  it('completes a booking successfully', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Test Facility')).toBeInTheDocument();
    });
    
    // Click on a timeslot
    const slotButton = screen.getByText('09:00 - 10:00');
    fireEvent.click(slotButton);
    
    // Select a date
    const datePickerButton = screen.getByText('Select Date');
    fireEvent.click(datePickerButton);
    
    // Wait for confirmation dialog
    await waitFor(() => {
      expect(screen.getByText('Confirm Booking')).toBeInTheDocument();
    });
    
    // Confirm booking
    const confirmButton = screen.getByText('Confirm Booking');
    fireEvent.click(confirmButton);
    
    // Check booking API was called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/facilities/bookings',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token',
          }),
        })
      );
    });
    
    // Success toast should be shown
    expect(toast.success).toHaveBeenCalled();
  });

  it('handles booking error', async () => {
    // Mock booking API failure
    global.fetch
      .mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockFacility),
        })
      )
      .mockImplementationOnce(() => 
        Promise.resolve({
          status: 200,
          json: () => Promise.resolve(mockWeatherData),
        })
      )
      .mockImplementationOnce(() => 
        Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ message: 'Booking failed - slot already taken' }),
        })
      );
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Test Facility')).toBeInTheDocument();
    });
    
    // Click on a timeslot
    const slotButton = screen.getByText('09:00 - 10:00');
    fireEvent.click(slotButton);
    
    // Select a date
    const datePickerButton = screen.getByText('Select Date');
    fireEvent.click(datePickerButton);
    
    // Wait for confirmation dialog
    await waitFor(() => {
      expect(screen.getByText('Confirm Booking')).toBeInTheDocument();
    });
    
    // Confirm booking
    const confirmButton = screen.getByText('Confirm Booking');
    fireEvent.click(confirmButton);
    
    // Error toast should be shown
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Booking failed - slot already taken');
    });
  });

  it('handles tab switching for different days', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Test Facility')).toBeInTheDocument();
    });
    
    // Should start with Monday tab active
    expect(screen.getByText('09:00 - 10:00')).toBeInTheDocument();
    expect(screen.getByText('10:00 - 11:00')).toBeInTheDocument();
    
    // Switch to Tuesday tab
    const tuesdayTab = screen.getByText('Tuesday');
    fireEvent.click(tuesdayTab);
    
    // Should show Tuesday slots
    expect(screen.getByText('14:00 - 15:00')).toBeInTheDocument();
  });

  it('closes confirmation dialog when cancel is clicked', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Test Facility')).toBeInTheDocument();
    });
    
    // Click on a timeslot
    const slotButton = screen.getByText('09:00 - 10:00');
    fireEvent.click(slotButton);
    
    // Select a date
    const datePickerButton = screen.getByText('Select Date');
    fireEvent.click(datePickerButton);
    
    // Wait for confirmation dialog
    await waitFor(() => {
      expect(screen.getByText('Confirm Booking')).toBeInTheDocument();
    });
    
    // Click cancel
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    // Dialog should be closed
    await waitFor(() => {
      expect(screen.queryByText('Confirm Booking')).not.toBeInTheDocument();
    });
  });

  it('handles facility without images', async () => {
    const facilityNoImages = { ...mockFacility, imageUrls: [] };
    
    global.fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(facilityNoImages),
      })
    );
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Test Facility')).toBeInTheDocument();
    });
    
    // Should use placeholder image
    const images = document.querySelectorAll('img');
    expect(images[0]).toHaveAttribute('src', expect.stringContaining('unsplash.com'));
  });

  it('handles facility without features', async () => {
    const facilityNoFeatures = { ...mockFacility, features: [] };
    
    global.fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(facilityNoFeatures),
      })
    );
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Test Facility')).toBeInTheDocument();
    });
    
    // Should show no features message
    expect(screen.getByText('No features added yet.')).toBeInTheDocument();
  });

  it('handles facility without coordinates (no map or weather)', async () => {
    const facilityNoCoordinates = { ...mockFacility, coordinates: null };
    
    global.fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(facilityNoCoordinates),
      })
    );
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Test Facility')).toBeInTheDocument();
    });
    
    // Map and weather sections should not be present
    expect(screen.queryByText('Facility Location')).not.toBeInTheDocument();
    expect(screen.queryByText('7-Day Weather Forecast')).not.toBeInTheDocument();
    expect(screen.queryByTestId('map-container')).not.toBeInTheDocument();
  });

  it('handles authentication failure', async () => {
    // Mock auth token failure
    getAuthToken.mockRejectedValueOnce(new Error('Authentication failed'));
    
    renderComponent();
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Authentication failed'));
    });
  });
});
