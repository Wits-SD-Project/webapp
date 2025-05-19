import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import EventDetailsModal from './EventDetailsModal';
import { format } from 'date-fns';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => {
  const actual = jest.requireActual('framer-motion');
  return {
    ...actual,
    motion: {
      div: ({ children, ...props }) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }) => <>{children}</>,
  };
});

describe('EventDetailsModal Component', () => {
  // Sample event data for testing
  const mockStartDate = new Date('2023-06-15T14:00:00');
  const mockEndDate = new Date('2023-06-15T16:00:00');
  
  const mockEvent = {
    eventName: 'Test Event',
    startTime: mockStartDate,
    endTime: mockEndDate,
    description: 'This is a test event description',
    facility: { name: 'Test Facility' },
    posterImage: 'https://example.com/image.jpg'
  };

  const mockEventNoImage = {
    eventName: 'Test Event No Image',
    startTime: mockStartDate,
    endTime: mockEndDate,
    description: 'This is a test event description',
    facility: { name: 'Test Facility' }
  };

  const mockEventNoTimes = {
    eventName: 'Test Event No Times',
    description: 'This is a test event description',
    facility: { name: 'Test Facility' }
  };

  const mockEventNoFacility = {
    eventName: 'Test Event No Facility',
    startTime: mockStartDate,
    endTime: mockEndDate,
    description: 'This is a test event description'
  };

  const mockEventMinimal = {
    // No name, description, facility, or times
  };

  const onCloseMock = jest.fn();

  beforeEach(() => {
    onCloseMock.mockClear();
  });

  it('renders null when no event is provided', () => {
    const { container } = render(<EventDetailsModal event={null} onClose={onCloseMock} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders event details correctly with all information', () => {
    render(<EventDetailsModal event={mockEvent} onClose={onCloseMock} />);
    
    // Check if all event details are rendered correctly
    expect(screen.getByText('Test Event')).toBeInTheDocument();
    expect(screen.getByText(/This is a test event description/)).toBeInTheDocument();
    expect(screen.getByText(/📍 Test Facility/)).toBeInTheDocument();
    
    // Check date formatting
    const formattedStartTime = format(mockStartDate, "EEEE, MMMM dd, yyyy 'at' h:mm a");
    const formattedEndTime = format(mockEndDate, "h:mm a");
    expect(screen.getByText(`${formattedStartTime} - ${formattedEndTime}`)).toBeInTheDocument();
    
    // Check if image is rendered
    const image = screen.getByAltText('Test Event');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
    
    // Check if calendar buttons are rendered
    expect(screen.getByText(/Add to Google Calendar/)).toBeInTheDocument();
    expect(screen.getByText(/Add to Outlook Calendar/)).toBeInTheDocument();
  });

  it('renders placeholder when no image is provided', () => {
    render(<EventDetailsModal event={mockEventNoImage} onClose={onCloseMock} />);
    
    // Check if placeholder is rendered instead of image
    expect(screen.queryByAltText('Test Event No Image')).not.toBeInTheDocument();
    expect(document.querySelector('.placeholder-image-modal')).toBeInTheDocument();
  });

  it('displays "Date and time not available" when no times are provided', () => {
    render(<EventDetailsModal event={mockEventNoTimes} onClose={onCloseMock} />);
    
    expect(screen.getByText('Date and time not available')).toBeInTheDocument();
  });

  it('displays "Location not specified" when no facility is provided', () => {
    render(<EventDetailsModal event={mockEventNoFacility} onClose={onCloseMock} />);
    
    expect(screen.getByText('📍 Location not specified')).toBeInTheDocument();
  });

  it('displays fallback values for minimal event data', () => {
    render(<EventDetailsModal event={mockEventMinimal} onClose={onCloseMock} />);
    
    expect(screen.getByText('Unnamed Event')).toBeInTheDocument();
    expect(screen.getByText('No description available.')).toBeInTheDocument();
    expect(screen.getByText('📍 Location not specified')).toBeInTheDocument();
    expect(screen.getByText('Date and time not available')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<EventDetailsModal event={mockEvent} onClose={onCloseMock} />);
    
    const closeButton = screen.getByLabelText('Close event details');
    fireEvent.click(closeButton);
    
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    render(<EventDetailsModal event={mockEvent} onClose={onCloseMock} />);
    
    // Find the backdrop (modal-backdrop class)
    const backdrop = document.querySelector('.modal-backdrop');
    fireEvent.click(backdrop);
    
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when modal content is clicked', () => {
    render(<EventDetailsModal event={mockEvent} onClose={onCloseMock} />);
    
    // Find the modal content
    const modalContent = document.querySelector('.modal-content');
    fireEvent.click(modalContent);
    
    expect(onCloseMock).not.toHaveBeenCalled();
  });

  it('generates correct Google Calendar link', () => {
    render(<EventDetailsModal event={mockEvent} onClose={onCloseMock} />);
    
    const googleCalendarLink = screen.getByText(/Add to Google Calendar/).closest('a');
    expect(googleCalendarLink).toHaveAttribute('href', expect.stringContaining('calendar.google.com/calendar/render'));
    expect(googleCalendarLink).toHaveAttribute('href', expect.stringContaining('text=Test%20Event'));
    expect(googleCalendarLink).toHaveAttribute('href', expect.stringContaining('location=Test%20Facility'));
    
    // Check for date format in the link
    const startFormatted = format(mockStartDate, "yyyyMMdd'T'HHmmss");
    const endFormatted = format(mockEndDate, "yyyyMMdd'T'HHmmss");
    expect(googleCalendarLink).toHaveAttribute('href', expect.stringContaining(`dates=${startFormatted}/${endFormatted}`));
  });

  it('generates correct Outlook Calendar link', () => {
    render(<EventDetailsModal event={mockEvent} onClose={onCloseMock} />);
    
    const outlookCalendarLink = screen.getByText(/Add to Outlook Calendar/).closest('a');
    expect(outlookCalendarLink).toHaveAttribute('href', expect.stringContaining('outlook.live.com/owa/'));
    expect(outlookCalendarLink).toHaveAttribute('href', expect.stringContaining('subject=Test%20Event'));
    expect(outlookCalendarLink).toHaveAttribute('href', expect.stringContaining('location=Test%20Facility'));
    
    // Check for date format in the link
    const startFormatted = format(mockStartDate, "yyyy-MM-dd'T'HH:mm:ss");
    const endFormatted = format(mockEndDate, "yyyy-MM-dd'T'HH:mm:ss");
    expect(outlookCalendarLink).toHaveAttribute('href', expect.stringContaining(`startdt=${startFormatted}`));
    expect(outlookCalendarLink).toHaveAttribute('href', expect.stringContaining(`enddt=${endFormatted}`));
  });

  it('generates fallback calendar links when no times are provided', () => {
    render(<EventDetailsModal event={mockEventNoTimes} onClose={onCloseMock} />);
    
    const googleCalendarLink = screen.getByText(/Add to Google Calendar/).closest('a');
    const outlookCalendarLink = screen.getByText(/Add to Outlook Calendar/).closest('a');
    
    expect(googleCalendarLink).toHaveAttribute('href', '#');
    expect(outlookCalendarLink).toHaveAttribute('href', '#');
  });

  it('has proper accessibility attributes', () => {
    render(<EventDetailsModal event={mockEvent} onClose={onCloseMock} />);
    
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'event-modal-title');
    
    const closeButton = screen.getByLabelText('Close event details');
    expect(closeButton).toBeInTheDocument();
    
    // Check calendar button accessibility
    const googleCalendarIcon = screen.getByLabelText('Google Calendar');
    const outlookCalendarIcon = screen.getByLabelText('Outlook Calendar');
    expect(googleCalendarIcon).toBeInTheDocument();
    expect(outlookCalendarIcon).toBeInTheDocument();
  });
});
