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
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getAuthToken.mockResolvedValue('mock-token');
    auth.currentUser.getIdToken.mockResolvedValue('mock-token');
  });

  // Function: useEffect - fetchFacility
  test('fetchFacility function is called on component mount', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockFacility
    });

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
        'http://localhost:8080/api/facilities/123',
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json'
          }
        })
      );
    });
  });

  // Function: groupSlotsByDay
  test('groupSlotsByDay function correctly groups timeslots by day', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockFacility
    });

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
      // Check if tabs are created for each day
      expect(screen.getByText('Monday')).toBeInTheDocument();
      expect(screen.getByText('Tuesday')).toBeInTheDocument();
      
      // Check if slots are grouped under Monday tab
      expect(screen.getByText('09:00 - 10:00')).toBeInTheDocument();
      expect(screen.getByText('10:00 - 11:00')).toBeInTheDocument();
    });
  });

  // Function: handleDateSelect
  test('handleDateSelect function validates selected date against slot day', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockFacility
    });

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
      expect(screen.getByText('Tennis Court')).toBeInTheDocument();
    });

    // Select a time slot
    const slotButton = screen.getByText('09:00 - 10:00');
    fireEvent.click(slotButton);
    
    // Mock the handleDateSelect function
    const handleDateSelect = jest.fn();
    jest.spyOn(React, 'useState').mockImplementationOnce(() => [null, handleDateSelect]);
    
    // Simulate selecting a date
    const mockDate = new Date();
    // Set to a Tuesday (incorrect day for the Monday slot)
    while (mockDate.getDay() !== 2) { // 2 is Tuesday
      mockDate.setDate(mockDate.getDate() + 1);
    }
    
    // Call handleDateSelect with incorrect day
    handleDateSelect(mockDate);
    
    // Check that toast error is called
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Please select a Monday'));
  });

  // Function: confirmBooking
  test('confirmBooking function sends booking request and handles response', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockFacility
    });

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
      expect(screen.getByText('Tennis Court')).toBeInTheDocument();
    });

    // Mock the confirmBooking function and state
    const confirmBooking = jest.fn();
    jest.spyOn(React, 'useState').mockImplementationOnce(() => [mockFacility, jest.fn()]);
    jest.spyOn(React, 'useState').mockImplementationOnce(() => [
      { id: '1', day: 'Monday', start: '09:00', end: '10:00' },
      jest.fn()
    ]);
    jest.spyOn(React, 'useState').mockImplementationOnce(() => [new Date(), jest.fn()]);
    jest.spyOn(React, 'useState').mockImplementationOnce(() => [true, jest.fn()]);
    
    // Mock the fetch for booking
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Booking successful' })
    });
    
    // Call confirmBooking
    await act(async () => {
      confirmBooking();
    });
    
    // Check that fetch was called with correct data
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/facilities/bookings',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token'
        })
      })
    );
    
    // Check that success toast was shown
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Successfully booked'));
  });

  // Function: Tab change handler
  test('tab change handler function updates active tab', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockFacility
    });

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
      expect(screen.getByText('Monday')).toBeInTheDocument();
      expect(screen.getByText('Tuesday')).toBeInTheDocument();
    });

    // Click on Tuesday tab
    fireEvent.click(screen.getByText('Tuesday'));
    
    // Check that Tuesday slots are shown
    await waitFor(() => {
      expect(screen.getByText('14:00 - 15:00')).toBeInTheDocument();
    });
  });

  // Function: Slot selection handler
  test('slot selection handler function updates selected slot', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockFacility
    });

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
      expect(screen.getByText('09:00 - 10:00')).toBeInTheDocument();
    });

    // Click on a slot
    fireEvent.click(screen.getByText('09:00 - 10:00'));
    
    // Check that date picker appears
    await waitFor(() => {
      expect(screen.getByText('Select Date for Monday')).toBeInTheDocument();
    });
  });

  // Function: Dialog close handler
  test('dialog close handler function closes confirmation dialog', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockFacility
    });

    // Mock the state for showing confirmation dialog
    jest.spyOn(React, 'useState').mockImplementationOnce(() => [true, jest.fn()]);

    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/facility/123']}>
          <Routes>
            <Route path="/facility/:id" element={<FacilityDetail />} />
          </Routes>
        </MemoryRouter>
      );
    });

    // Mock the close handler
    const setShowConfirmation = jest.fn();
    jest.spyOn(React, 'useState').mockImplementationOnce(() => [true, setShowConfirmation]);
    
    // Click cancel button
    fireEvent.click(screen.getByText('Cancel'));
    
    // Check that dialog was closed
    expect(setShowConfirmation).toHaveBeenCalledWith(false);
  });
});
