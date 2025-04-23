// frontend/src/components/__tests__/ProtectedRoute.test.js
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter, Routes, Route, Outlet } from "react-router-dom";
import ProtectedRoute from "../ProtectedRoute"; // Adjust path
import { useAuth } from "../../context/AuthContext"; // Adjust path

// Mock the AuthContext
jest.mock("../../context/AuthContext");

// Mock child component
const MockChildComponent = () => (
  <div data-testid="child-component">Protected Content</div>
);
const MockLoginPage = () => <div data-testid="login-page">Please Login</div>;

describe("ProtectedRoute", () => {
  const renderWithRouter = (
    ui,
    { route = "/", authState = { authUser: null, loading: false } } = {}
  ) => {
    useAuth.mockReturnValue(authState); // Setup mock context return value
    window.history.pushState({}, "Test page", route);

    return render(
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/login" element={<MockLoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Outlet /> {/* Outlet allows nested route to render */}
              </ProtectedRoute>
            }
          >
            {/* Nested route that should be protected */}
            <Route index element={<MockChildComponent />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders child component if user is authenticated", () => {
    const authState = { authUser: { uid: "test-user" }, loading: false };
    renderWithRouter(null, { authState: authState, route: "/" });

    expect(screen.getByTestId("child-component")).toBeInTheDocument();
    expect(screen.queryByTestId("login-page")).not.toBeInTheDocument();
  });

  test("redirects to login page if user is not authenticated", () => {
    const authState = { authUser: null, loading: false }; // Not authenticated
    renderWithRouter(null, { authState: authState, route: "/" });

    // Check if the MockLoginPage content is rendered (indicating redirection)
    // Since MemoryRouter doesn't *actually* change the URL bar, we check
    // if the component rendered matches the redirected route's element.
    expect(screen.getByTestId("login-page")).toBeInTheDocument();
    expect(screen.queryByTestId("child-component")).not.toBeInTheDocument();
  });

  test("renders nothing (or a loader) if loading is true", () => {
    const authState = { authUser: null, loading: true }; // Loading state
    renderWithRouter(null, { authState: authState, route: "/" });

    // ProtectedRoute might render null or a loading indicator while loading
    // Adjust assertion based on your ProtectedRoute's implementation
    expect(screen.queryByTestId("child-component")).not.toBeInTheDocument();
    expect(screen.queryByTestId("login-page")).not.toBeInTheDocument();
    // Example if you add a loader:
    // expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    // Or if it renders null:
    const container = screen.getByRole("main") || document.body; // Adjust container query if needed
    expect(container).toBeEmptyDOMElement(); // Or check if container has specific limited children
  });

  test("redirects to login page even if loading is true but user becomes null", () => {
    // This scenario might be less common depending on how loading is handled,
    // but tests the case where loading finishes and user is null.
    const authState = { authUser: null, loading: false }; // Simulate loading finished, user is null
    renderWithRouter(null, { authState: authState, route: "/" });

    expect(screen.getByTestId("login-page")).toBeInTheDocument();
    expect(screen.queryByTestId("child-component")).not.toBeInTheDocument();
  });
});
