import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SignIn from "../SignIn";
import { GoogleAuthProvider } from "firebase/auth";

// Mocks
const mockNavigate = jest.fn();
const mockSignInWithPopup = jest.fn();
const mockGetIdToken = jest.fn();
const mockSignInWithThirdParty = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
const mockSetAuthUser = jest.fn();

beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "log").mockImplementation(() => {});
});

// Mock modules
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

jest.mock("../../../auth/auth", () => ({
  signInWithThirdParty: (...args) => mockSignInWithThirdParty(...args),
}));

jest.mock("react-toastify", () => ({
  toast: {
    success: (msg) => mockToastSuccess(msg),
    error: (msg) => mockToastError(msg),
  },
}));

jest.mock("react-spinners", () => ({
  ClipLoader: () => <div>Loading...</div>,
}));

jest.mock("../../../context/AuthContext", () => ({
  useAuth: () => ({
    setAuthUser: mockSetAuthUser,
  }),
}));

jest.mock("firebase/auth", () => ({
  auth: {},
  GoogleAuthProvider: class {
    static credentialFromResult = jest.fn(() => ({}));
  },
  signInWithPopup: (...args) => mockSignInWithPopup(...args),
  getAuth: () => ({}),
}));

// Setup
const renderComponent = () =>
  render(
    <MemoryRouter>
      <SignIn />
    </MemoryRouter>
  );

// ✅ Basic test coverage
describe("SignIn Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders logo and sign in button", () => {
    const { getByText, getByRole } = renderComponent();
    expect(getByText(/sign in now/i)).toBeInTheDocument();
    expect(
      getByRole("button", { name: /sign in with google/i })
    ).toBeInTheDocument();
  });

  test("triggers third-party Google sign in success path", async () => {
    GoogleAuthProvider.credentialFromResult = jest.fn(() => ({
      accessToken: "mock",
    })); // ✅ Add this

    const mockUser = {
      email: "test@example.com",
      role: "admin",
      name: "Test User",
      getIdToken: mockGetIdToken,
    };
    mockSignInWithPopup.mockResolvedValueOnce({ user: mockUser });
    mockGetIdToken.mockResolvedValueOnce("mockToken");
    mockSignInWithThirdParty.mockResolvedValueOnce(mockUser);

    const { getByRole } = renderComponent();
    fireEvent.click(getByRole("button", { name: /sign in with google/i }));

    await waitFor(() => {
      expect(mockSetAuthUser).toHaveBeenCalledWith({
        email: "test@example.com",
        role: "admin",
        name: "Test User",
      });
      expect(mockToastSuccess).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/admin-dashboard");
    });
  });

  test("shows toast error for 'User not registered'", async () => {
    GoogleAuthProvider.credentialFromResult = jest.fn(() => ({
      accessToken: "mock",
    }));

    const error = {
      response: {
        data: {
          message: "User not registered.",
        },
      },
    };

    const mockUser = {
      getIdToken: mockGetIdToken,
    };

    mockSignInWithPopup.mockResolvedValueOnce({ user: mockUser });
    mockGetIdToken.mockResolvedValueOnce("token");
    mockSignInWithThirdParty.mockRejectedValueOnce(error);

    const { getByRole } = renderComponent();
    fireEvent.click(getByRole("button", { name: /sign in with google/i }));

    await waitFor(() => {
      expect(mockSetAuthUser).toHaveBeenCalledWith(null);
      expect(mockToastError).toHaveBeenCalledWith(
        "Account not registered. Please sign up first."
      );
    });
  });

  test("handles unknown error gracefully", async () => {
    mockSignInWithPopup.mockImplementationOnce(() => {
      throw new Error("Unknown error");
    });

    const { getByRole } = renderComponent();
    fireEvent.click(getByRole("button", { name: /sign in with google/i }));

    await waitFor(() => {
      expect(mockSetAuthUser).toHaveBeenCalledWith(null);
      expect(mockToastError).toHaveBeenCalledWith(
        "Sign in failed. Please try again."
      );
    });
  });
});
