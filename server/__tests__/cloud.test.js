const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { cloudinary: cloudinaryModule, storage, deleteImage } = require('../config/cloudinary');

// Mock Cloudinary SDK
jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      destroy: jest.fn()
    }
  }
}));

// Mock environment variables
process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
process.env.CLOUDINARY_API_KEY = 'test-key';
process.env.CLOUDINARY_API_SECRET = 'test-secret';

describe('Cloudinary Configuration', () => {
  test('should configure Cloudinary with environment variables', () => {
    expect(cloudinary.config).toHaveBeenCalledWith({
      cloud_name: 'test-cloud',
      api_key: 'test-key',
      api_secret: 'test-secret'
    });
  });
});

describe('Cloudinary Storage Configuration', () => {
  test('should create storage with correct parameters', () => {
    expect(storage).toBeInstanceOf(CloudinaryStorage);
    
    const expectedParams = {
      folder: 'sport-facilities',
      allowed_formats: ['jpg', 'jpeg', 'png'],
      transformation: [{ width: 800, height: 600, crop: 'limit' }]
    };

    // Verify storage configuration
    expect(storage._cloudinary).toBe(cloudinaryModule);
    expect(storage._params).toEqual(expectedParams);
  });
});

describe('deleteImage Function', () => {
  const publicId = 'test-public-id';
  const consoleError = console.error;

  beforeEach(() => {
    console.error = jest.fn();
    cloudinary.uploader.destroy.mockReset();
  });

  afterAll(() => {
    console.error = consoleError;
  });

  test('should delete image successfully', async () => {
    cloudinary.uploader.destroy.mockResolvedValue({ result: 'ok' });

    const result = await deleteImage(publicId);
    
    expect(result).toBe(true);
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(publicId);
    expect(console.error).not.toHaveBeenCalled();
  });

  test('should handle deletion failure', async () => {
    const mockError = new Error('Cloudinary API error');
    cloudinary.uploader.destroy.mockRejectedValue(mockError);

    const result = await deleteImage(publicId);
    
    expect(result).toBe(false);
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(publicId);
    expect(console.error).toHaveBeenCalledWith('Error deleting image:', mockError);
  });

  test('should handle invalid public ID', async () => {
    cloudinary.uploader.destroy.mockResolvedValue({ result: 'not found' });

    const result = await deleteImage('invalid-id');
    
    expect(result).toBe(true); // Cloudinary returns success even if ID doesn't exist
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('invalid-id');
  });
});