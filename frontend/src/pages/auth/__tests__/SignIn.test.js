import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SignIn from '../SignIn';
import { useAuth } from '../../../context/AuthContext';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Mock all the external dependencies
jest.mock('../../../context/AuthContext');
jest.mock('firebase/auth');
jest.mock('react-router-dom');
jest.mock('react-toastify');
jest.mock('../../../auth/auth');
jest.mock('react-spinners');

// Mock CSS and image imports
jest.mock('../../../styles/signin.css', () => ({}));
jest.mock('../../../assets/logo.png', () => 'test-logo.png');

describe('SignIn Component', () => {
  const mockSetAuthUser = jest.fn();
  const mockNavigate = jest.fn();
  
  beforeEach(() => {
    useAuth.mockReturnValue({ setAuthUser: mockSetAuthUser });
    useNavigate.mockReturnValue(mockNavigate);
    toast.success = jest.fn();
    toast.error = jest.fn();
    
    // Mock GoogleAuthProvider methods
    GoogleAuthProvider.credentialFromResult = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<SignIn />);
    
    expect(screen.getByAltText('Sports Sphere Logo')).toBeInTheDocument();
    expect(screen.getByText('Sign in now')).toBeInTheDocument();
    expect(screen.getByText('Welcome to Sports Sphere')).toBeInTheDocument();
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
    expect(screen.getByText(/Don't have an account/)).toBeInTheDocument();
  });

  describe('Google Sign In', () => {
    it('handles successful Google sign in', async () => {
      const mockUser = { 
        email: 'test@example.com',
        getIdToken: jest.fn().mockResolvedValue('mock-id-token')
      };
      
      signInWithPopup.mockResolvedValue({ 
        user: mockUser,
        credential: 'mock-credential'
      });
      
      GoogleAuthProvider.credentialFromResult.mockReturnValue({});
      
      // Mock the backend response
      require('../../../auth/auth').signInWithThirdParty.mockResolvedValue({
        email: 'test@example.com',
        role: 'resident',
        name: 'Test User'
      });
      
      render(<SignIn />);
      
      fireEvent.click(screen.getByText('Sign in with Google'));
      
      // Check loading state
      await waitFor(() => {
        expect(screen.getByRole('button')).toBeDisabled();
      });
      
      await waitFor(() => {
        expect(signInWithPopup).toHaveBeenCalled();
        expect(mockSetAuthUser).toHaveBeenCalledWith({
          email: 'test@example.com',
          role: 'resident',
          name: 'Test User'
        });
        expect(toast.success).toHaveBeenCalledWith('Welcome back, Test User');
        expect(mockNavigate).toHaveBeenCalledWith('/resident-dashboard');
      });
    });

    it('shows loading spinner during Google sign in', async () => {
      signInWithPopup.mockImplementation(() => 
        new Promise((resolve) => setTimeout(() => resolve({ 
          user: { getIdToken: () => Promise.resolve('token') } 
        }), 100))
      );
      
      render(<SignIn />);
      
      fireEvent.click(screen.getByText('Sign in with Google'));
      
      await waitFor(() => {
        expect(screen.getByTestId('clip-loader')).toBeInTheDocument();
      });
    });

    it('handles user not registered error', async () => {
      signInWithPopup.mockRejectedValue({
        response: { data: { message: 'User not registered.' } }
      });
      
      render(<SignIn />);
      
      fireEvent.click(screen.getByText('Sign in with Google'));
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Account not registered. Please sign up first.');
        expect(mockSetAuthUser).toHaveBeenCalledWith(null);
      });
    });

    it('handles account not approved error', async () => {
      signInWithPopup.mockRejectedValue({
        response: { data: { message: 'Account not yet approved.' } }
      });
      
      render(<SignIn />);
      
      fireEvent.click(screen.getByText('Sign in with Google'));
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('⏳ Waiting for admin approval.');
        expect(mockSetAuthUser).toHaveBeenCalledWith(null);
      });
    });

    it('handles access denied error', async () => {
      signInWithPopup.mockRejectedValue({
        response: { data: { message: 'Access denied.' } }
      });
      
      render(<SignIn />);
      
      fireEvent.click(screen.getByText('Sign in with Google'));
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('⛔ Access denied.');
        expect(mockSetAuthUser).toHaveBeenCalledWith(null);
      });
    });

    it('handles generic sign in error', async () => {
      signInWithPopup.mockRejectedValue(new Error('Generic error'));
      
      render(<SignIn />);
      
      fireEvent.click(screen.getByText('Sign in with Google'));
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Sign in failed. Please try again.');
        expect(mockSetAuthUser).toHaveBeenCalledWith(null);
      });
    });

    it('handles no credential returned from Google', async () => {
      signInWithPopup.mockResolvedValue({ 
        user: { getIdToken: () => Promise.resolve('token') }
      });
      GoogleAuthProvider.credentialFromResult.mockReturnValue(null);
      
      render(<SignIn />);
      
      fireEvent.click(screen.getByText('Sign in with Google'));
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Sign in failed. Please try again.');
      });
    });
  });

  it('navigates to sign up page when register link is clicked', () => {
    const { container } = render(<SignIn />);
    const registerLink = container.querySelector('.register-link');
    
    fireEvent.click(registerLink);
    
    expect(window.location.pathname).toBe('/signup');
  });
});