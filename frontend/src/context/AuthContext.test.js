import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

jest.mock('../services/api', () => ({
  authAPI: {
    login: jest.fn(),
    register: jest.fn(),
    refresh: jest.fn(),
  },
}));

// Helper component that uses AuthContext
function TestConsumer() {
  const { user, isAuthenticated, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="auth-status">{isAuthenticated ? 'logged-in' : 'logged-out'}</span>
      <span data-testid="user-email">{user?.email || 'none'}</span>
      <button
        data-testid="btn-login"
        onClick={() => login('test@example.com', 'password123')}
      >
        Login
      </button>
      <button data-testid="btn-logout" onClick={logout}>
        Logout
      </button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

describe('AuthContext', () => {
  it('throws when used outside AuthProvider', () => {
    // Suppress the console.error from React for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useAuth must be used within AuthProvider');
    consoleSpy.mockRestore();
  });

  it('starts logged out when no token in localStorage', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );
    expect(screen.getByTestId('auth-status').textContent).toBe('logged-out');
    expect(screen.getByTestId('user-email').textContent).toBe('none');
  });

  it('logs in successfully and updates state', async () => {
    authAPI.login.mockResolvedValueOnce({
      data: {
        user: { id: 'u1', name: 'Alice', email: 'alice@example.com', role: 'admin' },
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
      },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByTestId('btn-login'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe('logged-in');
    });

    expect(screen.getByTestId('user-email').textContent).toBe('alice@example.com');
    expect(localStorage.getItem('cloud_mgmt_token')).toBe('test-access-token');
  });

  it('returns error on failed login', async () => {
    authAPI.login.mockRejectedValueOnce({
      response: { data: { error: 'Invalid credentials.' } },
    });

    let loginResult;
    function TestLoginResult() {
      const { login } = useAuth();
      return (
        <button
          data-testid="btn-login-err"
          onClick={async () => {
            loginResult = await login('bad@example.com', 'wrong');
          }}
        >
          Login
        </button>
      );
    }

    render(
      <AuthProvider>
        <TestLoginResult />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByTestId('btn-login-err'));

    await waitFor(() => {
      expect(loginResult).toBeDefined();
    });

    expect(loginResult.success).toBe(false);
    expect(loginResult.error).toBe('Invalid credentials.');
  });

  it('clears state and localStorage on logout', async () => {
    // Seed localStorage as if user is logged in
    localStorage.setItem('cloud_mgmt_token', 'some-token');
    localStorage.setItem('cloud_mgmt_user', JSON.stringify({ email: 'alice@example.com' }));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    // Should start as logged-in (token exists in localStorage)
    expect(screen.getByTestId('auth-status').textContent).toBe('logged-in');

    fireEvent.click(screen.getByTestId('btn-logout'));

    expect(screen.getByTestId('auth-status').textContent).toBe('logged-out');
    expect(localStorage.getItem('cloud_mgmt_token')).toBeNull();
  });
});
