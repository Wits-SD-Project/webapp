import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import FacilityFormModal from '../components/FalicityFormModal';
import { toast } from 'react-toastify';

// Mock dependencies
jest.mock('react-toastify', () => ({
  toast: {
    error: jest.fn(),
  },
}));

// Mock CloudinaryUploadWidget component
// jest.mock('../src/components/CloudinaryUploadWidget', () => ({
//   __esModule: true,
//   default: ({ onUpload }) => (
//     <button 
//       data-testid="cloudinary-widget" 
//       onClick={() => onUpload('https://res.cloudinary.com/ducyxqzb9/image/upload/v1/test-image.jpg')}
//     >
//       Upload Image
//     </button>
//   ),
// }));

// Mock MUI icons
jest.mock('@mui/icons-material/DeleteForever', () => ({
  __esModule: true,
  default: () => <span data-testid="delete-icon">DeleteIcon</span>,
}));

jest.mock('@mui/icons-material/Image', () => ({
  __esModule: true,
  default: () => <span data-testid="image-icon">ImageIcon</span>,
}));

describe('FacilityFormModal Component', () => {
  // Common props
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    onSubmit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ================= STATEMENT COVERAGE TESTS =================
  describe('Statement Coverage', () => {
    it('renders all form elements correctly', () => {
      render(<FacilityFormModal {...defaultProps} />);
      
      // Check if all form elements are rendered
      expect(screen.getByText('🏟️ Add New Facility')).toBeInTheDocument();
      expect(screen.getByLabelText(/Facility name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Type/i)).toBeInTheDocument();
      expect(screen.getByText('🌳 Outdoors')).toBeInTheDocument();
      expect(screen.getByText('✅ Available')).toBeInTheDocument();
      expect(screen.getByLabelText(/Location/i)).toBeInTheDocument();
      expect(screen.getByTestId('cloudinary-widget')).toBeInTheDocument();
      expect(screen.getByText('No images yet')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Save ✅')).toBeInTheDocument();
    });

    it('initializes with default state values', () => {
      render(<FacilityFormModal {...defaultProps} />);
      
      // Check default values
      expect(screen.getByLabelText(/Facility name/i)).toHaveValue('');
      expect(screen.getByLabelText(/Type/i)).toHaveValue('');
      expect(screen.getByLabelText(/Location/i)).toHaveValue('');
      expect(screen.getByText('🌳 Outdoors')).toBeInTheDocument(); // Default isOutdoors is "Yes"
      expect(screen.getByText('✅ Available')).toBeInTheDocument(); // Default availability is "Available"
    });
  });

  // ================= BRANCH COVERAGE TESTS =================
  describe('Branch Coverage', () => {
    it('handles form submission with required fields', async () => {
      render(<FacilityFormModal {...defaultProps} />);
      
      // Fill in required fields
      await userEvent.type(screen.getByLabelText(/Facility name/i), 'Tennis Court');
      await userEvent.type(screen.getByLabelText(/Type/i), 'Sports');
      
      // Submit the form
      fireEvent.click(screen.getByText('Save ✅'));
      
      // Check if onSubmit was called with correct data
      expect(defaultProps.onSubmit).toHaveBeenCalledWith({
        name: 'Tennis Court',
        type: 'Sports',
        isOutdoors: 'Yes',
        availability: 'Available',
        location: '',
        imageUrls: [],
      });
      
      // Check if onClose was called
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
    
    it('shows error toast when required fields are missing', async () => {
      render(<FacilityFormModal {...defaultProps} />);
      
      // Submit without filling required fields
      fireEvent.click(screen.getByText('Save ✅'));
      
      // Check if toast.error was called
      expect(toast.error).toHaveBeenCalledWith("Facility name and type are required 🤷‍♂️");
      
      // Check that onSubmit and onClose were not called
      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
    
    it('handles cancel button click', () => {
      render(<FacilityFormModal {...defaultProps} />);
      
      // Fill in some data
      userEvent.type(screen.getByLabelText(/Facility name/i), 'Tennis Court');
      
      // Click cancel
      fireEvent.click(screen.getByText('Cancel'));
      
      // Check if onClose was called
      expect(defaultProps.onClose).toHaveBeenCalled();
      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });
    
    it('handles different select options for isOutdoors', async () => {
      render(<FacilityFormModal {...defaultProps} />);
      
      // Change isOutdoors to "No"
      fireEvent.mouseDown(screen.getByText('🌳 Outdoors'));
      const indoorsOption = screen.getByText('🏛️ Indoors');
      fireEvent.click(indoorsOption);
      
      // Fill required fields
      await userEvent.type(screen.getByLabelText(/Facility name/i), 'Indoor Court');
      await userEvent.type(screen.getByLabelText(/Type/i), 'Sports');
      
      // Submit
      fireEvent.click(screen.getByText('Save ✅'));
      
      // Check if onSubmit was called with correct isOutdoors value
      expect(defaultProps.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          isOutdoors: 'No',
        })
      );
    });
    
    it('handles different select options for availability', async () => {
      render(<FacilityFormModal {...defaultProps} />);
      
      // Change availability to "Under Maintenance"
      fireEvent.mouseDown(screen.getByText('✅ Available'));
      const maintenanceOption = screen.getByText('🛠️ Maintenance');
      fireEvent.click(maintenanceOption);
      
      // Fill required fields
      await userEvent.type(screen.getByLabelText(/Facility name/i), 'Tennis Court');
      await userEvent.type(screen.getByLabelText(/Type/i), 'Sports');
      
      // Submit
      fireEvent.click(screen.getByText('Save ✅'));
      
      // Check if onSubmit was called with correct availability value
      expect(defaultProps.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          availability: 'Under Maintenance',
        })
      );
    });
  });

  // ================= FUNCTION COVERAGE TESTS =================
  describe('Function Coverage', () => {
    it('resets form state when closed', async () => {
      render(<FacilityFormModal {...defaultProps} />);
      
      // Fill in form fields
      await userEvent.type(screen.getByLabelText(/Facility name/i), 'Tennis Court');
      await userEvent.type(screen.getByLabelText(/Type/i), 'Sports');
      await userEvent.type(screen.getByLabelText(/Location/i), 'Building A');
      
      // Close the modal
      fireEvent.click(screen.getByText('Cancel'));
      
      // Re-open the modal
      render(<FacilityFormModal {...defaultProps} />);
      
      // Check if form fields are reset
      expect(screen.getByLabelText(/Facility name/i)).toHaveValue('');
      expect(screen.getByLabelText(/Type/i)).toHaveValue('');
      expect(screen.getByLabelText(/Location/i)).toHaveValue('');
    });
    
    it('adds images when uploaded through CloudinaryUploadWidget', async () => {
      render(<FacilityFormModal {...defaultProps} />);
      
      // Initially no images
      expect(screen.getByText('No images yet')).toBeInTheDocument();
      
      // Click upload button (mocked to add an image)
      fireEvent.click(screen.getByTestId('cloudinary-widget'));
      
      // Check if image is added
      await waitFor(() => {
        expect(screen.queryByText('No images yet')).not.toBeInTheDocument();
      });
      
      // Check if avatar is rendered
      const avatar = screen.getByRole('img');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', 'https://res.cloudinary.com/ducyxqzb9/image/upload/v1/test-image.jpg');
    });
    
    it('removes images when delete button is clicked', async () => {
      render(<FacilityFormModal {...defaultProps} />);
      
      // Add an image
      fireEvent.click(screen.getByTestId('cloudinary-widget'));
      
      // Wait for image to appear
      await waitFor(() => {
        expect(screen.queryByText('No images yet')).not.toBeInTheDocument();
      });
      
      // Find and click delete button
      const deleteButton = screen.getByTestId('delete-icon').closest('button');
      fireEvent.click(deleteButton);
      
      // Check if image is removed
      await waitFor(() => {
        expect(screen.getByText('No images yet')).toBeInTheDocument();
      });
    });
    
    it('handles multiple image uploads', async () => {
      render(<FacilityFormModal {...defaultProps} />);
      
      // Add multiple images
      fireEvent.click(screen.getByTestId('cloudinary-widget'));
      fireEvent.click(screen.getByTestId('cloudinary-widget'));
      fireEvent.click(screen.getByTestId('cloudinary-widget'));
      
      // Check if images are added
      await waitFor(() => {
        const avatars = screen.getAllByRole('img');
        expect(avatars.length).toBe(3);
      });
      
      // Fill required fields and submit
      await userEvent.type(screen.getByLabelText(/Facility name/i), 'Tennis Court');
      await userEvent.type(screen.getByLabelText(/Type/i), 'Sports');
      
      // Submit
      fireEvent.click(screen.getByText('Save ✅'));
      
      // Check if onSubmit was called with all images
      expect(defaultProps.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          imageUrls: [
            'https://res.cloudinary.com/ducyxqzb9/image/upload/v1/test-image.jpg',
            'https://res.cloudinary.com/ducyxqzb9/image/upload/v1/test-image.jpg',
            'https://res.cloudinary.com/ducyxqzb9/image/upload/v1/test-image.jpg',
          ],
        })
      );
    });
  });

  // ================= LINE COVERAGE TESTS =================
  describe('Line Coverage', () => {
    it('renders when modal is closed', () => {
      render(<FacilityFormModal {...defaultProps} open={false} />);
      
      // Dialog should not be visible when open is false
      expect(screen.queryByText('🏟️ Add New Facility')).not.toBeInTheDocument();
    });
    
    it('handles all input changes', async () => {
      render(<FacilityFormModal {...defaultProps} />);
      
      // Test name input
      await userEvent.type(screen.getByLabelText(/Facility name/i), 'Tennis Court');
      expect(screen.getByLabelText(/Facility name/i)).toHaveValue('Tennis Court');
      
      // Test type input
      await userEvent.type(screen.getByLabelText(/Type/i), 'Sports');
      expect(screen.getByLabelText(/Type/i)).toHaveValue('Sports');
      
      // Test location input
      await userEvent.type(screen.getByLabelText(/Location/i), 'Building A');
      expect(screen.getByLabelText(/Location/i)).toHaveValue('Building A');
      
      // Test isOutdoors select
      fireEvent.mouseDown(screen.getByText('🌳 Outdoors'));
      fireEvent.click(screen.getByText('🏛️ Indoors'));
      expect(screen.getByText('🏛️ Indoors')).toBeInTheDocument();
      
      // Test availability select
      fireEvent.mouseDown(screen.getByText('✅ Available'));
      fireEvent.click(screen.getByText('⛔ Closed'));
      expect(screen.getByText('⛔ Closed')).toBeInTheDocument();
    });
    
    it('submits form with all fields filled', async () => {
      render(<FacilityFormModal {...defaultProps} />);
      
      // Fill all fields
      await userEvent.type(screen.getByLabelText(/Facility name/i), 'Tennis Court');
      await userEvent.type(screen.getByLabelText(/Type/i), 'Sports');
      await userEvent.type(screen.getByLabelText(/Location/i), 'Building A');
      
      // Change selects
      fireEvent.mouseDown(screen.getByText('🌳 Outdoors'));
      fireEvent.click(screen.getByText('🏛️ Indoors'));
      
      fireEvent.mouseDown(screen.getByText('✅ Available'));
      fireEvent.click(screen.getByText('⛔ Closed'));
      
      // Add image
      fireEvent.click(screen.getByTestId('cloudinary-widget'));
      
      // Submit
      fireEvent.click(screen.getByText('Save ✅'));
      
      // Check if onSubmit was called with all fields
      expect(defaultProps.onSubmit).toHaveBeenCalledWith({
        name: 'Tennis Court',
        type: 'Sports',
        isOutdoors: 'No',
        availability: 'Closed',
        location: 'Building A',
        imageUrls: ['https://res.cloudinary.com/ducyxqzb9/image/upload/v1/test-image.jpg'],
      });
    });
  });
});
