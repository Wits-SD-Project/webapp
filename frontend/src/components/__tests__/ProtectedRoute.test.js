// src/components/__tests__/ProtectedRoute.test.js
import React from "react";
import { render, screen, waitFor } from "@testing-library/react"; // Added waitFor
import "@testing-library/jest-dom";
import {
  MemoryRouter,
  Routes,
  Route,
  Outlet,
  useLocation,
} from "react-router-dom";
import ProtectedRoute from "../ProtectedRoute"; // Adjust path
import { useAuth } from "../../context/AuthContext"; // Adjust path
import { toast } from "react-toastify"; // Import toast to check calls

// Mock the AuthContext
jest.mock("../../context/AuthContext");
// Mock react-toastify
jest.mock("react-toastify");

// Mock child component
const MockChildComponent = () => (
  <div data-testid="child-component">Protected Content</div>
);
// Ensure MockLoginPage has the test ID expected by the tests
const MockLoginPage = () => {
  // Use location to check if we landed here (optional)
  // const location = useLocation();
  // console.log("Rendering MockLoginPage at:", location.pathname);
  return <div data-testid="login-page">Please Login</div>;
};
const MockSigninPage = () => {
  // Component for /signin route
  return <div data-testid="signin-page">Please Sign In</div>;
};

describe("ProtectedRoute", () => {
  const renderWithRouter = (
    ui, // ui is not used here as the structure defines the routes
    { route = "/", authState = { authUser: null, loading: false } } = {}
  ) => {
    useAuth.mockReturnValue(authState); // Setup mock context return value
    // No need to manipulate window.history with MemoryRouter

    return render(
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          {/* Define the target routes for redirects */}
          <Route path="/login" element={<MockLoginPage />} />
          <Route path="/signin" element={<MockSigninPage />} />{" "}
          {/* Use the dedicated signin mock */}
          <Route
            path="/"
            element={
              // The route being protected
              <ProtectedRoute>
                {" "}
                {/* Pass requiredRole if testing role protection */}
                <Outlet /> {/* Outlet renders the nested child route */}
              </ProtectedRoute>
            }
          >
            {/* Nested route that should be protected */}
            <Route index element={<MockChildComponent />} />
          </Route>
          {/* Add other routes if needed for testing navigation */}
          <Route path="/other" element={<div>Other Page</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    toast.error.mockClear(); // Clear toast mock calls
  });

  test("renders child component if user is authenticated", () => {
    const authState = {
      authUser: { uid: "test-user", role: "resident" },
      loading: false,
    }; // Added role
    renderWithRouter(null, { authState: authState, route: "/" });

    expect(screen.getByTestId("child-component")).toBeInTheDocument();
    expect(screen.queryByTestId("login-page")).not.toBeInTheDocument();
    expect(screen.queryByTestId("signin-page")).not.toBeInTheDocument();
  });

  test("redirects to signin page and shows toast if user is not authenticated", async () => {
    const authState = { authUser: null, loading: false }; // Not authenticated
    renderWithRouter(null, { authState: authState, route: "/" });

    // Check if the MockSigninPage content is rendered (indicating redirection)
    await waitFor(() => {
      expect(screen.getByTestId("signin-page")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("child-component")).not.toBeInTheDocument();

    // Check if the toast error was called
    expect(toast.error).toHaveBeenCalledWith("Please sign in to continue");
  });

  test("renders loading indicator if loading is true", () => {
    const authState = { authUser: null, loading: true }; // Loading state
    renderWithRouter(null, { authState: authState, route: "/" });

    // ProtectedRoute renders a div with class "loading-spinner"
    expect(screen.queryByTestId("child-component")).not.toBeInTheDocument();
    expect(screen.queryByTestId("login-page")).not.toBeInTheDocument();
    expect(screen.queryByTestId("signin-page")).not.toBeInTheDocument();

    // Check for the actual loading indicator text/element
    const loadingElement = screen.getByText(/loading.../i);
    expect(loadingElement).toBeInTheDocument();
    expect(loadingElement).toHaveClass("loading-spinner");
  });

  test("redirects to signin page if loading finishes and user is null", async () => {
    const authState = { authUser: null, loading: false }; // Simulate loading finished, user is null
    renderWithRouter(null, { authState: authState, route: "/" });

    await waitFor(() => {
      expect(screen.getByTestId("signin-page")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("child-component")).not.toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith("Please sign in to continue");
  });

  test("redirects to home and shows toast if user role does not match requiredRole", async () => {
    const authState = {
      authUser: { uid: "test-user", role: "resident" },
      loading: false,
    };
    // Mock ProtectedRoute to include a requiredRole prop for this test
    const renderWithRoleCheck = (
      ui,
      {
        route = "/",
        authState = { authUser: null, loading: false },
        requiredRole = null,
      } = {}
    ) => {
      useAuth.mockReturnValue(authState);
      return render(
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="/signin" element={<MockSigninPage />} />
            <Route
              path="/"
              element={<div data-testid="home-page">Home</div>}
            />{" "}
            {/* Add a home route */}
            <Route
              path="/protected-admin" // Example protected route
              element={
                <ProtectedRoute requiredRole={requiredRole}>
                  <Outlet />
                </ProtectedRoute>
              }
            >
              <Route index element={<MockChildComponent />} />
            </Route>
          </Routes>
        </MemoryRouter>
      );
    };

    renderWithRoleCheck(null, {
      authState: authState,
      route: "/protected-admin",
      requiredRole: "admin",
    }); // User is resident, requires admin

    // Should redirect to "/" (home page in this setup)
    await waitFor(() => {
      expect(screen.getByTestId("home-page")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("child-component")).not.toBeInTheDocument(); // Child should not render
    expect(toast.error).toHaveBeenCalledWith(
      "You don't have permission to access this page"
    );
  });

  test("renders child if user role matches requiredRole", () => {
    const authState = {
      authUser: { uid: "test-user", role: "admin" },
      loading: false,
    };
    const renderWithRoleCheck = (
      ui,
      {
        route = "/",
        authState = { authUser: null, loading: false },
        requiredRole = null,
      } = {}
    ) => {
      useAuth.mockReturnValue(authState);
      return render(
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="/signin" element={<MockSigninPage />} />
            <Route path="/" element={<div data-testid="home-page">Home</div>} />
            <Route
              path="/protected-admin"
              element={
                <ProtectedRoute requiredRole={requiredRole}>
                  <Outlet />
                </ProtectedRoute>
              }
            >
              <Route index element={<MockChildComponent />} />
            </Route>
          </Routes>
        </MemoryRouter>
      );
    };

    renderWithRoleCheck(null, {
      authState: authState,
      route: "/protected-admin",
      requiredRole: "admin",
    });

    expect(screen.getByTestId("child-component")).toBeInTheDocument();
    expect(screen.queryByTestId("home-page")).not.toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });
});
