jest.mock('firebase/auth', () => {
    return {
      getAuth: jest.fn(() => ({
        currentUser: {
          getIdToken: jest.fn(() => Promise.resolve('mock-id-token')),
        },
        signInWithPopup: jest.fn(() =>
          Promise.resolve({
            user: {
              getIdToken: jest.fn(() => Promise.resolve("mock-id-token")),
              email: "test@example.com"
            }
          })
        )
      })),
      GoogleAuthProvider: jest.fn().mockImplementation(() => ({
        // mock methods if needed
      })),
      signInWithPopup: jest.fn(),
      signOut: jest.fn(),
    };
  });
  