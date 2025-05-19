// UserDashboard.test.js

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import UserDashboard from '../../pages/dashboards/UserDashboard';
import { db, auth } from '../../firebase';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';

// Mock Firebase modules
jest.mock('../../firebase', () => ({
  db: {},
  auth: {
    onAuthStateChanged: jest.fn(),
    currentUser: { uid: 'test-user-uid', displayName: 'Test User' }
  }
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  doc: jest.fn(),
  deleteDoc: jest.fn(),
  updateDoc: jest.fn()
}));

jest.mock('../../components/ResSideBar.js', () => {
  return function DummySidebar({ activeItem }) {
    return <div data-testid="sidebar" data-active={activeItem}>Sidebar Mock</div>;
  };
});

// Mock next/router
jest.mock('next/router', () => ({
  __esModule: true,
  useRouter: () => ({
    push: jest.fn(),
    query: {},
    asPath: '',
    route: '',
    pathname: '',
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn()
    }
  })
}));


describe('UserDashboard Component - Comprehensive Test Coverage', () => {
  const mockBookings = [
    {
      id: '1',
      facilityName: 'Tennis Court',
      date: '2025-05-20',
      slot: '09:00 - 10:00',
      status: 'pending',
      user: 'test-user-uid',
      userName: 'Test User'
    },
    {
      id: '2',
      facilityName: 'Swimming Pool',
      date: '2025-05-21',
      slot: '14:00 - 15:00',
      status: 'approved',
      user: 'test-user-uid',
      userName: 'Test User'
    },
    {
      id: '3',
      facilityName: 'Basketball Court',
      date: '2025-05-22',
      slot: '16:00 - 17:00',
      status: 'rejected',
      user: 'test-user-uid',
      userName: 'Test User'
    },
    {
      id: '4',
      facilityName: 'Gym',
      date: null,
      slot: null,
      status: 'pending',
      user: 'test-user-uid',
      userName: 'Test User'
    }
  ];

  const mockNotifications = [
    {
      id: '1',
      facilityName: 'Tennis Court',
      status: 'approved',
      slot: '09:00 - 10:00',
      read: false,
      createdAt: { toDate: () => new Date('2025-05-18') }
    },
    {
      id: '2',
      facilityName: 'Swimming Pool',
      status: 'rejected',
      slot: '14:00 - 15:00',
      read: true,
      createdAt: { toDate: () => new Date('2025-05-17') }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock auth state
    auth.onAuthStateChanged.mockImplementation((callback) => {
      callback({ uid: 'test-user-uid', displayName: 'Test User' });
      return jest.fn(); // Return unsubscribe function
    });
    
    // Mock query and getDocs for bookings
    query.mockReturnValue('query-mock');
    where.mockReturnValue('where-condition');
    collection.mockReturnValue('collection-mock');
    
    // Mock getDocs response for bookings
    getDocs.mockImplementation((queryRef) => {
      if (queryRef === 'query-mock') {
        return Promise.resolve({
          docs: mockBookings.map(booking => ({
            id: booking.id,
            data: () => booking,
            ref: `booking-ref-${booking.id}`
          }))
        });
      }
      // For notifications
      return Promise.resolve({
        docs: mockNotifications.map(notification => ({
          id: notification.id,
          data: () => notification,
          ref: `notification-ref-${notification.id}`
        }))
      });
    });
    
    // Mock document reference
    doc.mockReturnValue('doc-ref');
  });

  // ================= STATEMENT COVERAGE TESTS =================
  
  describe('Statement Coverage', () => {
    // Statement: Component initial render
    test('component renders correctly with initial state', async () => {
      await act(async () => {
        render(<UserDashboard />);
      });
      
      // Check that sidebar is rendered
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar').getAttribute('data-active')).toBe('dashboard');
      
      // Check that header is rendered
      expect(screen.getByText('My Bookings')).toBeInTheDocument();
      
      // Check that bookings are rendered
      expect(screen.getByText('Tennis Court')).toBeInTheDocument();
      expect(screen.getByText('Swimming Pool')).toBeInTheDocument();
      expect(screen.getByText('Basketball Court')).toBeInTheDocument();
      
      // Check that notifications are rendered
      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('Your booking for Tennis Court has been approved')).toBeInTheDocument();
      expect(screen.getByText('Your booking for Swimming Pool has been rejected')).toBeInTheDocument();
    });

    // Statement: Render booking with missing fields
    test('renders bookings with missing fields correctly', async () => {
      await act(async () => {
        render(<UserDashboard />);
      });
      
      // Check that bookings with missing fields are rendered correctly
      expect(screen.getByText('Gym')).toBeInTheDocument();
      
      // Find the row for the Gym booking
      const gymBookingCard = screen.getAllByTestId('booking-card')[3];
      
      // Check that missing fields are handled properly
      expect(gymBookingCard.textContent).toContain('No date specified');
      expect(gymBookingCard.textContent).toContain('No time specified');
    });

    // Statement: Render different booking statuses
    test('renders different booking statuses correctly', async () => {
      await act(async () => {
        render(<UserDashboard />);
      });
      
      // Check that status classes are applied correctly
      const bookingCards = screen.getAllByTestId('booking-card');
      
      expect(bookingCards[0].querySelector('.status').textContent).toBe('pending');
      expect(bookingCards[0].querySelector('.status').className).toContain('pending');
      
      expect(bookingCards[1].querySelector('.status').textContent).toBe('approved');
      expect(bookingCards[1].querySelector('.status').className).toContain('approved');
      
      expect(bookingCards[2].querySelector('.status').textContent).toBe('rejected');
      expect(bookingCards[2].querySelector('.status').className).toContain('rejected');
    });
  });

  // ================= BRANCH COVERAGE TESTS =================
  
  describe('Branch Coverage', () => {
    // Branch: User authentication state (user exists vs doesn't exist)
    test('handles both authenticated and unauthenticated user branches', async () => {
      // Test authenticated user branch
      await act(async () => {
        render(<UserDashboard />);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Tennis Court')).toBeInTheDocument();
      });
      
      // Test unauthenticated user branch
      jest.clearAllMocks();
      auth.onAuthStateChanged.mockImplementationOnce((callback) => {
        callback(null); // No user
        return jest.fn();
      });
      
      await act(async () => {
        render(<UserDashboard />);
      });
      
      // fetchBookings should not be called with null uid
      expect(getDocs).not.toHaveBeenCalled();
    });

    // Branch: Cancel booking success vs failure
    test('handles cancelBooking success and failure branches', async () => {
      await act(async () => {
        render(<UserDashboard />);
      });
      
      // Mock successful delete
      deleteDoc.mockResolvedValueOnce({});
      
      // Click cancel button on pending booking
      await act(async () => {
        const cancelButtons = screen.getAllByText('Cancel');
        fireEvent.click(cancelButtons[0]);
      });
      
      // Check if deleteDoc was called
      expect(doc).toHaveBeenCalledWith(db, 'bookings', '1');
      expect(deleteDoc).toHaveBeenCalledWith('doc-ref');
      
      // Mock failure branch
      jest.clearAllMocks();
      deleteDoc.mockRejectedValueOnce(new Error('Delete failed'));
      console.error = jest.fn(); // Mock console.error
      
      await act(async () => {
        render(<UserDashboard />);
      });
      
      // Click cancel button
      await act(async () => {
        const cancelButtons = screen.getAllByText('Cancel');
        fireEvent.click(cancelButtons[0]);
      });
      
      // Check if error was logged
      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith(
          'Error cancelling booking:',
          expect.any(Error)
        );
      });
    });

    // Branch: Read notification success vs failure
    test('handles markNotificationAsRead success and failure branches', async () => {
      await act(async () => {
        render(<UserDashboard />);
      });
      
      // Mock successful update
      updateDoc.mockResolvedValueOnce({});
      
      // Click on unread notification
      await act(async () => {
        const notifications = screen.getAllByTestId('notification-item');
        fireEvent.click(notifications[0]);
      });
      
      // Check if updateDoc was called
      expect(doc).toHaveBeenCalledWith(db, 'notifications', '1');
      expect(updateDoc).toHaveBeenCalledWith('doc-ref', { read: true });
      
      // Mock failure branch
      jest.clearAllMocks();
      updateDoc.mockRejectedValueOnce(new Error('Update failed'));
      console.error = jest.fn(); // Mock console.error
      
      await act(async () => {
        render(<UserDashboard />);
      });
      
      // Click on unread notification
      await act(async () => {
        const notifications = screen.getAllByTestId('notification-item');
        fireEvent.click(notifications[0]);
      });
      
      // Check if error was logged
      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith(
          'Error marking notification as read:',
          expect.any(Error)
        );
      });
    });

    // Branch: Notification read vs unread rendering
    test('renders read and unread notifications differently', async () => {
      await act(async () => {
        render(<UserDashboard />);
      });
      
      const notifications = screen.getAllByTestId('notification-item');
      
      // First notification is unread
      expect(notifications[0].className).toContain('unread');
      
      // Second notification is read
      expect(notifications[1].className).not.toContain('unread');
    });
  });

  // ================= FUNCTION COVERAGE TESTS =================
  
  describe('Function Coverage', () => {
    // Function: fetchUserBookings
    test('fetchUserBookings function retrieves bookings for user', async () => {
      await act(async () => {
        render(<UserDashboard />);
      });
      
      // Check that the query was constructed correctly
      expect(collection).toHaveBeenCalledWith(db, 'bookings');
      expect(where).toHaveBeenCalledWith('user', '==', 'test-user-uid');
      expect(query).toHaveBeenCalledWith('collection-mock', 'where-condition');
      expect(getDocs).toHaveBeenCalledWith('query-mock');
      
      // Check that bookings were set in state
      await waitFor(() => {
        expect(screen.getByText('Tennis Court')).toBeInTheDocument();
        expect(screen.getByText('Swimming Pool')).toBeInTheDocument();
        expect(screen.getByText('Basketball Court')).toBeInTheDocument();
      });
    });

    // Function: fetchNotifications
    test('fetchNotifications function retrieves notifications for user', async () => {
      await act(async () => {
        render(<UserDashboard />);
      });
      
      // Check that the query was constructed correctly for notifications
      expect(collection).toHaveBeenCalledWith(db, 'notifications');
      expect(where).toHaveBeenCalledWith('userName', '==', 'Test User');
      
      // Check that notifications were set in state
      await waitFor(() => {
        expect(screen.getByText('Your booking for Tennis Court has been approved')).toBeInTheDocument();
        expect(screen.getByText('Your booking for Swimming Pool has been rejected')).toBeInTheDocument();
      });
    });

    // Function: useEffect cleanup
    test('useEffect cleanup function unsubscribes from auth state changes', async () => {
      const unsubscribeMock = jest.fn();
      auth.onAuthStateChanged.mockReturnValueOnce(unsubscribeMock);
      
      let component;
      await act(async () => {
        component = render(<UserDashboard />);
      });
      
      // Unmount component to trigger cleanup
      component.unmount();
      
      // Check that unsubscribe was called
      expect(unsubscribeMock).toHaveBeenCalled();
    });

    // Function: cancelBooking
    test('cancelBooking function deletes booking document', async () => {
      await act(async () => {
        render(<UserDashboard />);
      });
      
      // Mock successful delete
      deleteDoc.mockResolvedValueOnce({});
      
      // Click cancel button on pending booking
      await act(async () => {
        const cancelButtons = screen.getAllByText('Cancel');
        fireEvent.click(cancelButtons[0]);
      });
      
      // Check if deleteDoc was called with correct parameters
      expect(doc).toHaveBeenCalledWith(db, 'bookings', '1');
      expect(deleteDoc).toHaveBeenCalledWith('doc-ref');
      
      // Check that booking was removed from UI
      await waitFor(() => {
        const bookingCards = screen.getAllByTestId('booking-card');
        expect(bookingCards.length).toBe(3); // One less than before
      });
    });

    // Function: markNotificationAsRead
    test('markNotificationAsRead function updates notification document', async () => {
      await act(async () => {
        render(<UserDashboard />);
      });
      
      // Mock successful update
      updateDoc.mockResolvedValueOnce({});
      
      // Click on unread notification
      await act(async () => {
        const notifications = screen.getAllByTestId('notification-item');
        fireEvent.click(notifications[0]);
      });
      
      // Check if updateDoc was called with correct parameters
      expect(doc).toHaveBeenCalledWith(db, 'notifications', '1');
      expect(updateDoc).toHaveBeenCalledWith('doc-ref', { read: true });
      
      // Check that notification was updated in UI
      await waitFor(() => {
        const notifications = screen.getAllByTestId('notification-item');
        expect(notifications[0].className).not.toContain('unread');
      });
    });
  });

  // ================= LINE COVERAGE TESTS =================
  
  describe('Line Coverage', () => {
    // Line: Conditional rendering based on booking status
    test('renders different action buttons based on booking status', async () => {
      await act(async () => {
        render(<UserDashboard />);
      });
      
      const bookingCards = screen.getAllByTestId('booking-card');
      
      // Pending bookings should have Cancel button
      expect(bookingCards[0].textContent).toContain('Cancel');
      expect(bookingCards[3].textContent).toContain('Cancel');
      
      // Approved and rejected bookings should not have Cancel button
      expect(bookingCards[1].textContent).not.toContain('Cancel');
      expect(bookingCards[2].textContent).not.toContain('Cancel');
    });

    // Line: Format date display
    test('formats dates correctly in bookings and notifications', async () => {
      // Add a booking with different date formats
      const dateFormatBookings = [
        { ...mockBookings[0], date: '2025-05-20' }, // ISO string
        { ...mockBookings[1], date: new Date('2025-05-21') }, // Date object
        { ...mockBookings[2], date: { toDate: () => new Date('2025-05-22') } } // Firestore timestamp
      ];
      
      // Mock getDocs response with date format bookings
      getDocs.mockImplementationOnce(() => Promise.resolve({
        docs: dateFormatBookings.map(booking => ({
          id: booking.id,
          data: () => booking,
          ref: `booking-ref-${booking.id}`
        }))
      })).mockImplementationOnce(() => Promise.resolve({
        docs: mockNotifications.map(notification => ({
          id: notification.id,
          data: () => notification,
          ref: `notification-ref-${notification.id}`
        }))
      }));
      
      await act(async () => {
        render(<UserDashboard />);
      });
      
      const bookingCards = screen.getAllByTestId('booking-card');
      
      // Check that dates are formatted consistently regardless of input format
      expect(bookingCards[0].textContent).toContain('May 20, 2025');
      expect(bookingCards[1].textContent).toContain('May 21, 2025');
      expect(bookingCards[2].textContent).toContain('May 22, 2025');
      
      // Check notification timestamps
      const notifications = screen.getAllByTestId('notification-item');
      expect(notifications[0].textContent).toContain('May 18, 2025');
      expect(notifications[1].textContent).toContain('May 17, 2025');
    });

    // Line: Handle missing date and time information
    test('handles missing date and time information in bookings', async () => {
      // Create bookings with missing date/time info
      const incompleteBookings = [
        { ...mockBookings[0] }, // Complete booking
        { ...mockBookings[1], date: null }, // Missing date
        { ...mockBookings[2], slot: null }, // Missing slot
        { ...mockBookings[3], date: null, slot: null } // Missing both
      ];
      
      // Mock getDocs response with incomplete bookings
      getDocs.mockImplementationOnce(() => Promise.resolve({
        docs: incompleteBookings.map(booking => ({
          id: booking.id,
          data: () => booking,
          ref: `booking-ref-${booking.id}`
        }))
      })).mockImplementationOnce(() => Promise.resolve({
        docs: mockNotifications.map(notification => ({
          id: notification.id,
          data: () => notification,
          ref: `notification-ref-${notification.id}`
        }))
      }));
      
      await act(async () => {
        render(<UserDashboard />);
      });
      
      const bookingCards = screen.getAllByTestId('booking-card');
      
      // Complete booking should show date and time
      expect(bookingCards[0].textContent).toContain('May 20, 2025');
      expect(bookingCards[0].textContent).toContain('09:00 - 10:00');
      
      // Missing date should show placeholder
      expect(bookingCards[1].textContent).toContain('No date specified');
      expect(bookingCards[1].textContent).toContain('14:00 - 15:00');
      
      // Missing slot should show placeholder
      expect(bookingCards[2].textContent).toContain('May 22, 2025');
      expect(bookingCards[2].textContent).toContain('No time specified');
      
      // Missing both should show placeholders
      expect(bookingCards[3].textContent).toContain('No date specified');
      expect(bookingCards[3].textContent).toContain('No time specified');
    });

    // Line: Empty state handling
    test('handles empty states for bookings and notifications', async () => {
      // Mock empty responses
      getDocs.mockImplementationOnce(() => Promise.resolve({
        docs: [] // No bookings
      })).mockImplementationOnce(() => Promise.resolve({
        docs: [] // No notifications
      }));
      
      await act(async () => {
        render(<UserDashboard />);
      });
      
      // Check for empty state messages
      expect(screen.getByText('You have no bookings yet')).toBeInTheDocument();
      expect(screen.getByText('No notifications')).toBeInTheDocument();
    });
  });
});
