import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button,
  InputAdornment, IconButton, Alert, CircularProgress, Divider,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import CloudIcon from '@mui/icons-material/Cloud';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password);
      if (!result.success) {
        setError(result.error || 'Login failed. Please try again.');
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f0f2f5',
        backgroundImage: 'radial-gradient(ellipse at 20% 50%, #1a237e18 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, #0288d118 0%, transparent 60%)',
        p: 2,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 440 }}>
        {/* Logo */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: '#1a237e',
              borderRadius: 3,
              width: 64,
              height: 64,
              mb: 2,
            }}
          >
            <CloudIcon sx={{ color: 'white', fontSize: 36 }} />
          </Box>
          <Typography variant="h5" fontWeight={700} color="primary">
            Cloud Management AI
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Intelligent cloud infrastructure platform
          </Typography>
        </Box>

        <Card>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
              Sign in
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Enter your credentials to access the dashboard
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <TextField
                label="Email address"
                type="email"
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
                autoComplete="email"
              />
              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                sx={{ mb: 1 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                autoComplete="current-password"
              />

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
                <Button variant="text" size="small" sx={{ p: 0, minWidth: 'auto', fontSize: 13 }}>
                  Forgot password?
                </Button>
              </Box>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
                sx={{ mb: 2, py: 1.4 }}
              >
                {loading ? <CircularProgress size={22} color="inherit" /> : 'Sign in'}
              </Button>

              <Divider sx={{ my: 2 }}>
                <Typography variant="caption" color="text.secondary">Demo credentials</Typography>
              </Divider>

              <Alert severity="info" sx={{ fontSize: 12 }}>
                Demo credentials: <strong>admin@example.com</strong> / <strong>admin1234</strong>
              </Alert>
            </Box>
          </CardContent>
        </Card>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 3 }}>
          © {new Date().getFullYear()} Cloud Management AI. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
}
