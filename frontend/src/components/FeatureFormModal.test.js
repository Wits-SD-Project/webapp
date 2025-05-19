import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FeatureFormModal from './FeatureFormModal';
import { toast } from 'react-toastify';

// Mock dependencies
jest.mock('react-toastify', () => ({
  toast: {
    error: jest.fn(),
  },
}));

describe('FeatureFormModal Component', () => {
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
    it('renders all form elements correctly in create mode', () => {
      render(<FeatureFormModal {...defaultProps} />);
      
      // Check if all form elements are rendered
      expect(screen.getByText('Create New Facility')).toBeInTheDocument();
      expect(screen.getByLabelText('Facility Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Facility Type')).toBeInTheDocument();
      expect(screen.getByLabelText('Is Outdoors?')).toBeInTheDocument();
      expect(screen.getByLabelText('Availability')).toBeInTheDocument();
      expect(screen.getByLabelText('Facility Description')).toBeInTheDocument();
      expect(screen.getByText('Suggested Features (General)')).toBeInTheDocument();
      expect(screen.getByLabelText('Add custom feature')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Create Facility')).toBeInTheDocument();
      
      // Check if General features are pre-populated
      // Use getAllByText instead of getByText for elements that appear multiple times
      expect(screen.getAllByText('Parking')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Accessible Entrance')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Drinking Water')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Restrooms')[0]).toBeInTheDocument();
    });

    it('renders all form elements correctly in edit mode', () => {
      const initialData = {
        name: 'Test Facility',
        type: 'Tennis Court',
        isOutdoors: 'Yes',
        availability: 'Available',
        description: 'This is a test description that is longer than fifty characters to pass validation.',
        features: ['Net', 'Lighting']
      };
      
      render(<FeatureFormModal {...defaultProps} isEditMode={true} initialData={initialData} />);
      
      // Check if all form elements are rendered with correct values
      expect(screen.getByText('Edit Facility')).toBeInTheDocument();
      expect(screen.getByLabelText('Facility Name')).toHaveValue('Test Facility');
      expect(screen.getByLabelText('Facility Type')).toHaveTextContent('Tennis Court');
      expect(screen.getByLabelText('Is Outdoors?')).toHaveTextContent('Yes');
      expect(screen.getByLabelText('Availability')).toHaveTextContent('Available');
      expect(screen.getByLabelText('Facility Description')).toHaveValue(initialData.description);
      
      // Check if features are correctly displayed - use getAllByText for multiple elements
      expect(screen.getAllByText('Net')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Lighting')[0]).toBeInTheDocument();
      
      // Check button text
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });
  });

  // ================= BRANCH COVERAGE TESTS =================
  describe('Branch Coverage', () => {
    it('handles isOutdoors boolean value in initialData', () => {
      const initialData = {
        name: 'Test Facility',
        isOutdoors: true, // Boolean true instead of string "Yes"
      };
      
      render(<FeatureFormModal {...defaultProps} initialData={initialData} />);
      expect(screen.getByLabelText('Is Outdoors?')).toHaveTextContent('Yes');
    });
    
    it('handles isOutdoors string value in initialData', () => {
      const initialData = {
        name: 'Test Facility',
        isOutdoors: 'Yes', // String "Yes"
      };
      
      render(<FeatureFormModal {...defaultProps} initialData={initialData} />);
      expect(screen.getByLabelText('Is Outdoors?')).toHaveTextContent('Yes');
    });
    
    it('handles falsy isOutdoors value in initialData', () => {
      const initialData = {
        name: 'Test Facility',
        isOutdoors: false, // Boolean false
      };
      
      render(<FeatureFormModal {...defaultProps} initialData={initialData} />);
      expect(screen.getByLabelText('Is Outdoors?')).toHaveTextContent('No');
    });
    
    // Fix the validation tests to match the actual validation in the component
    it('shows validation error when submitting invalid form', async () => {
      render(<FeatureFormModal {...defaultProps} />);
      
      // Fill in required fields but with short description
      await userEvent.type(screen.getByLabelText('Facility Name'), 'Test Facility');
      await userEvent.type(screen.getByLabelText('Facility Description'), 'Too short');
      
      // Try to submit - button should be disabled due to validation
      expect(screen.getByText('Create Facility')).toBeDisabled();
      
      // Check that onSubmit and onClose were not called
      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
    
    it('validates name field is required', async () => {
      render(<FeatureFormModal {...defaultProps} />);
      
      // Fill in only description with valid length
      await userEvent.type(screen.getByLabelText('Facility Description'), 'This is a test description that is longer than fifty characters to pass validation.');
      
      // Button should be disabled due to missing name
      expect(screen.getByText('Create Facility')).toBeDisabled();
      
      // Check that onSubmit and onClose were not called
      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
    
    it('enables submit button when form is valid', async () => {
      render(<FeatureFormModal {...defaultProps} />);
      
      // Initially button should be disabled
      expect(screen.getByText('Create Facility')).toBeDisabled();
      
      // Add name and valid description
      await userEvent.type(screen.getByLabelText('Facility Name'), 'Test Facility');
      await userEvent.type(
        screen.getByLabelText('Facility Description'), 
        'This is a test description that is longer than fifty characters to pass validation.'
      );
      
      // Button should be enabled
      await waitFor(() => {
        expect(screen.getByText('Create Facility')).not.toBeDisabled();
      });
    });
  });

  // ================= FUNCTION COVERAGE TESTS =================
  describe('Function Coverage', () => {
    it('adds suggested features when clicked', async () => {
      render(<FeatureFormModal {...defaultProps} facilityType="Tennis Court" />);
      
      // Check that Tennis Court features are displayed
      expect(screen.getByText('Suggested Features (Tennis Court)')).toBeInTheDocument();
      
      // Get initial chip count
      const initialChips = screen.getAllByRole('button').filter(button => 
        button.textContent.includes('Net') && button.querySelector('[aria-hidden="true"]')
      );
      
      // Click on a suggested feature
      fireEvent.click(screen.getAllByText('Net')[0]);
      
      // Check if feature count increased
      const finalChips = screen.getAllByRole('button').filter(button => 
        button.textContent.includes('Net') && button.querySelector('[aria-hidden="true"]')
      );
      expect(finalChips.length).toBeGreaterThan(initialChips.length);
    });
    
    it('adds custom feature via input field', async () => {
      render(<FeatureFormModal {...defaultProps} />);
      
      // Get the autocomplete input
      const autocompleteInput = screen.getByLabelText('Add custom feature');
      
      // Set a value and trigger change
      fireEvent.change(autocompleteInput, { target: { value: 'Custom Feature' } });
      
      // Trigger Enter key to add the feature
      fireEvent.keyDown(autocompleteInput, { key: 'Enter', code: 'Enter' });
      
      // Check if the feature was added
      await waitFor(() => {
        const chips = screen.getAllByRole('button').filter(button => 
          button.textContent.includes('Custom Feature')
        );
        expect(chips.length).toBeGreaterThan(0);
      });
    });
    
    it('adds custom feature via autocomplete change', async () => {
      render(<FeatureFormModal {...defaultProps} />);
      
      // Get the autocomplete input
      const autocompleteInput = screen.getByLabelText('Add custom feature');
      
      // Set a value
      fireEvent.change(autocompleteInput, { target: { value: 'Custom Feature' } });
      
      // Simulate autocomplete selection
      fireEvent.change(autocompleteInput, { target: { value: 'Custom Feature' } });
      
      // Trigger the onChange of Autocomplete
      const onChange = screen.getByLabelText('Add custom feature').closest('div').querySelector('input').onchange;
      if (onChange) {
        fireEvent.change(autocompleteInput, { target: { value: '' } });
      }
      
      // Trigger blur to complete the selection
      fireEvent.blur(autocompleteInput);
    });
    
    it('removes feature when delete is clicked', async () => {
      // Start with initial features
      const initialData = {
        features: ['Net', 'Lighting']
      };
      
      render(<FeatureFormModal {...defaultProps} initialData={initialData} />);
      
      // Check initial features are there
      expect(screen.getAllByText('Net')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Lighting')[0]).toBeInTheDocument();
      
      // Find and click delete button on the Net chip
      const deleteButtons = screen.getAllByRole('button').filter(button => 
        button.textContent.includes('Net') && button.querySelector('[aria-hidden="true"]')
      );
      
      if (deleteButtons.length > 0 && deleteButtons[0].querySelector('[aria-hidden="true"]')) {
        fireEvent.click(deleteButtons[0].querySelector('[aria-hidden="true"]'));
      } else {
        // Alternative: click the whole chip if we can't find the delete icon
        fireEvent.click(deleteButtons[0]);
      }
      
      // Verify the feature was removed by checking the features array length decreased
      const remainingNetChips = screen.getAllByRole('button').filter(button => 
        button.textContent.includes('Net') && button.querySelector('[aria-hidden="true"]')
      );
      
      // The length should be less than the original
      expect(remainingNetChips.length).toBeLessThan(deleteButtons.length);
      
      // Lighting should still be there
      expect(screen.getAllByText('Lighting')[0]).toBeInTheDocument();
    });
    
    it('submits form with correct data', async () => {
      render(<FeatureFormModal {...defaultProps} facilityType="Tennis Court" />);
      
      // Fill in form
      await userEvent.type(screen.getByLabelText('Facility Name'), 'Test Tennis Court');
      
      // Add description
      await userEvent.type(
        screen.getByLabelText('Facility Description'), 
        'This is a test description that is longer than fifty characters to pass validation.'
      );
      
      // Select isOutdoors
      fireEvent.mouseDown(screen.getByLabelText('Is Outdoors?'));
      fireEvent.click(screen.getByText('Yes'));
      
      // Select availability
      fireEvent.mouseDown(screen.getByLabelText('Availability'));
      fireEvent.click(screen.getByText('Under Maintenance'));
      
      // Wait for form to be valid
      await waitFor(() => {
        expect(screen.getByText('Create Facility')).not.toBeDisabled();
      });
      
      // Submit form
      fireEvent.click(screen.getByText('Create Facility'));
      
      // Check if onSubmit was called
      expect(defaultProps.onSubmit).toHaveBeenCalled();
      
      // Check if onClose was called
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  // ================= LINE COVERAGE TESTS =================
  describe('Line Coverage', () => {
    it('initializes with default values when no initialData provided', () => {
      render(<FeatureFormModal {...defaultProps} />);
      
      expect(screen.getByLabelText('Facility Name')).toHaveValue('');
      expect(screen.getByLabelText('Facility Type')).toHaveTextContent('General');
      expect(screen.getByLabelText('Is Outdoors?')).toHaveTextContent('No');
      expect(screen.getByLabelText('Availability')).toHaveTextContent('Available');
      expect(screen.getByLabelText('Facility Description')).toHaveValue('');
    });
    
    it('initializes with provided facilityType', () => {
      render(<FeatureFormModal {...defaultProps} facilityType="Swimming Pool" />);
      
      expect(screen.getByLabelText('Facility Type')).toHaveTextContent('Swimming Pool');
      expect(screen.getByText('Suggested Features (Swimming Pool)')).toBeInTheDocument();
      
      // Check Swimming Pool specific features are displayed
      expect(screen.getAllByText('Lanes')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Diving Board')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Heated')[0]).toBeInTheDocument();
    });
    
    it('does not add duplicate features', async () => {
      render(<FeatureFormModal {...defaultProps} />);
      
      // Get initial count of Parking chips
      const initialChips = screen.getAllByRole('button').filter(button => 
        button.textContent.includes('Parking') && button.querySelector('[aria-hidden="true"]')
      );
      
      // Try to add the same feature again
      fireEvent.click(screen.getAllByText('Parking')[0]);
      
      // Count should remain the same
      const finalChips = screen.getAllByRole('button').filter(button => 
        button.textContent.includes('Parking') && button.querySelector('[aria-hidden="true"]')
      );
      
      expect(finalChips.length).toBe(initialChips.length);
    });
    
    it('does not add empty features', async () => {
      render(<FeatureFormModal {...defaultProps} />);
      
      // Count initial features (General features)
      const initialChipCount = screen.getAllByRole('button').filter(button => 
        button.querySelector('[aria-hidden="true"]')
      ).length;
      
      // Try to add empty feature by directly calling handleAddFeature with empty string
      // We can't use userEvent.type with empty string, so we'll simulate the function call
      const autocompleteInput = screen.getByLabelText('Add custom feature');
      fireEvent.change(autocompleteInput, { target: { value: '' } });
      fireEvent.keyDown(autocompleteInput, { key: 'Enter', code: 'Enter' });
      
      // No new feature should be added
      const newChipCount = screen.getAllByRole('button').filter(button => 
        button.querySelector('[aria-hidden="true"]')
      ).length;
      
      expect(newChipCount).toBe(initialChipCount);
    });
    
    it('does not pre-populate General features in edit mode', () => {
      const initialData = {
        name: 'Test Facility',
        features: ['Custom Feature']
      };
      
      render(<FeatureFormModal {...defaultProps} isEditMode={true} initialData={initialData} />);
      
      // Should only have the custom feature, not the General features
      expect(screen.getByText('Custom Feature')).toBeInTheDocument();
      
      // Count chips - should only be 1
      const chips = screen.getAllByRole('button').filter(button => 
        button.querySelector('[aria-hidden="true"]')
      );
      expect(chips.length).toBe(1);
    });
    
    it('handles cancel button click', () => {
      render(<FeatureFormModal {...defaultProps} />);
      
      // Click cancel
      fireEvent.click(screen.getByText('Cancel'));
      
      // Check if onClose was called
      expect(defaultProps.onClose).toHaveBeenCalled();
      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });
  });
});
