import {
    getAuthToken,
    signUpWithThirdParty,
    signInWithThirdParty,
    uploadFacility,
  } from '../auth';
  
  jest.mock('firebase/auth', () => ({
    getAuth: jest.fn(),
  }));
  
  global.fetch = jest.fn();
  
  describe('API Utilities', () => {
    const { getAuth } = require('firebase/auth');
  
    beforeEach(() => {
      jest.clearAllMocks();
    });
  
    describe('getAuthToken', () => {
      it('should return a token if user is authenticated', async () => {
        getAuth.mockReturnValue({
          currentUser: {
            getIdToken: jest.fn(() => Promise.resolve('mock-id-token')),
          },
        });
  
        const token = await getAuthToken();
        expect(token).toBe('mock-id-token');
      });
  
      it('should throw if user is not authenticated', async () => {
        getAuth.mockReturnValue({ currentUser: null });
  
        await expect(getAuthToken()).rejects.toThrow('User not authenticated');
      });
    });
  
    describe('signUpWithThirdParty', () => {
      it('should call fetch and return JSON on success', async () => {
        const mockResponse = { message: 'Signup successful' };
        fetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });
  
        const res = await signUpWithThirdParty({
          idToken: 'token',
          provider: 'google',
          role: 'user',
        });
  
        expect(fetch).toHaveBeenCalledWith(
          'http://localhost:8080/api/auth/signup/thirdparty',
          expect.objectContaining({
            method: 'POST',
          })
        );
        expect(res).toEqual(mockResponse);
      });
  
      it('should throw error on failed signup', async () => {
        fetch.mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ message: 'Signup failed' }),
        });
  
        await expect(
          signUpWithThirdParty({ idToken: 'x', provider: 'y', role: 'z' })
        ).rejects.toThrow('Signup failed');
      });
    });
  
    describe('signInWithThirdParty', () => {
      it('should return response JSON on success', async () => {
        const mockResponse = { token: 'abc' };
        fetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });
  
        const res = await signInWithThirdParty({ idToken: 'some-token' });
        expect(res).toEqual(mockResponse);
      });
  
      it('should throw error on failed signin', async () => {
        fetch.mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ message: 'Signin failed' }),
        });
  
        await expect(
          signInWithThirdParty({ idToken: 'bad-token' })
        ).rejects.toThrow('Signin failed');
      });
    });
  
    describe('uploadFacility', () => {
      it('should upload facility and return JSON', async () => {
        const mockRes = { id: 'facility123' };
        fetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockRes),
        });
  
        const result = await uploadFacility({
          name: 'Test Gym',
          type: 'basketball',
          isOutdoors: false,
          availability: ['Mon', 'Tue'],
        });
  
        expect(fetch).toHaveBeenCalledWith(
          'http://localhost:8080/api/facilities/upload',
          expect.objectContaining({
            method: 'POST',
          })
        );
        expect(result).toEqual(mockRes);
      });
  
      it('should throw error on failure', async () => {
        fetch.mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ message: 'Upload failed' }),
        });
  
        await expect(
          uploadFacility({
            name: 'Fail Gym',
            type: 'badminton',
            isOutdoors: true,
            availability: [],
          })
        ).rejects.toThrow('Upload failed');
      });
    });
  });
  