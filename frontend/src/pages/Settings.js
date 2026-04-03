import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Grid, Typography, Button, TextField,
  Switch, FormControlLabel, Divider, Avatar, Chip, Alert,
  List, ListItem, ListItemText, ListItemSecondaryAction,
  Select, MenuItem, FormControl, InputLabel, Snackbar, CircularProgress,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import PersonIcon from '@mui/icons-material/Person';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SecurityIcon from '@mui/icons-material/Security';
import { useAuth } from '../context/AuthContext';
import { usersAPI } from '../services/api';

export default function Settings() {
  const { user, logout } = useAuth();
  const [saved, setSaved] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
const LOGOUT_DELAY_MS = 3000;

  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || 'viewer',
    timezone: 'UTC',
  });
  const [notifications, setNotifications] = useState({
    costAlerts: true,
    securityAlerts: true,
    resourceChanges: false,
    weeklyReport: true,
    emailDigest: true,
    slackIntegration: false,
  });
  const [currency, setCurrency] = useState('USD');
  const [costThreshold, setCostThreshold] = useState('1000');
  const [passwordFields, setPasswordFields] = useState({ current: '', next: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');

  // Load current user data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await usersAPI.me();
        const u = res.data;
        setProfile({ name: u.name, email: u.email, role: u.role, timezone: u.timezone || 'UTC' });
        setCurrency(u.currency || 'USD');
        setCostThreshold(String(u.costAlertThreshold || 1000));
        if (u.notifications) setNotifications(u.notifications);
      } catch {
        // Use data from auth context as fallback
      }
    };
    loadProfile();
  }, []);

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await usersAPI.updateProfile({ name: profile.name, email: profile.email, timezone: profile.timezone });
      setSaveMsg('Profile saved successfully');
      setSaved(true);
    } catch (err) {
      setSaveMsg(err.response?.data?.error || 'Failed to save profile');
      setSaved(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setLoading(true);
    try {
      await usersAPI.updateNotifications(notifications);
      setSaveMsg('Notification preferences saved');
      setSaved(true);
    } catch {
      setSaveMsg('Failed to save notifications');
      setSaved(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    setLoading(true);
    try {
      await usersAPI.updateSettings({ currency, costAlertThreshold: parseFloat(costThreshold) });
      setSaveMsg('Preferences saved successfully');
      setSaved(true);
    } catch {
      setSaveMsg('Failed to save preferences');
      setSaved(true);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    if (passwordFields.next !== passwordFields.confirm) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (passwordFields.next.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await usersAPI.updatePassword(passwordFields.current, passwordFields.next);
      setSaveMsg('Password changed successfully. Please log in again.');
      setSaved(true);
      setPasswordFields({ current: '', next: '', confirm: '' });
      setTimeout(() => logout(), LOGOUT_DELAY_MS);
    } catch (err) {
      setPasswordError(err.response?.data?.error || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Settings</Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your account preferences and platform configuration
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Profile */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
                  <PersonIcon />
                </Avatar>
                <Typography variant="h6">Profile</Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 64, height: 64, fontSize: 28 }}>
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </Avatar>
                <Box>
                  <Typography variant="body1" fontWeight={700}>{profile.name}</Typography>
                  <Chip label={profile.role} size="small" color="primary" variant="outlined" />
                </Box>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Display Name"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  fullWidth
                  size="small"
                />
                <TextField
                  label="Email Address"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  fullWidth
                  size="small"
                />
                <FormControl size="small" fullWidth>
                  <InputLabel>Timezone</InputLabel>
                  <Select
                    value={profile.timezone}
                    label="Timezone"
                    onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                  >
                    <MenuItem value="UTC">UTC</MenuItem>
                    <MenuItem value="UTC-8 (Pacific)">UTC-8 (Pacific)</MenuItem>
                    <MenuItem value="UTC-7 (Mountain)">UTC-7 (Mountain)</MenuItem>
                    <MenuItem value="UTC-6 (Central)">UTC-6 (Central)</MenuItem>
                    <MenuItem value="UTC-5 (Eastern)">UTC-5 (Eastern)</MenuItem>
                    <MenuItem value="UTC+0 (London)">UTC+0 (London)</MenuItem>
                    <MenuItem value="UTC+1 (Paris)">UTC+1 (Paris)</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                  onClick={handleSaveProfile}
                  disabled={loading}
                  size="small"
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Save Profile
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Notifications */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Avatar sx={{ bgcolor: 'warning.light', color: 'warning.dark', width: 36, height: 36 }}>
                  <NotificationsIcon />
                </Avatar>
                <Typography variant="h6">Notifications</Typography>
              </Box>
              <List disablePadding>
                {[
                  { key: 'costAlerts', label: 'Cost Alerts', sub: 'Alert when spend exceeds threshold' },
                  { key: 'securityAlerts', label: 'Security Alerts', sub: 'Unauthorized access & anomalies' },
                  { key: 'resourceChanges', label: 'Resource Changes', sub: 'All create/update/delete events' },
                  { key: 'weeklyReport', label: 'Weekly Report', sub: 'Summary email every Monday' },
                  { key: 'emailDigest', label: 'Email Digest', sub: 'Daily digest of activities' },
                  { key: 'slackIntegration', label: 'Slack Notifications', sub: 'Send alerts to Slack channel' },
                ].map(({ key, label, sub }, idx) => (
                  <React.Fragment key={key}>
                    {idx > 0 && <Divider component="li" />}
                    <ListItem disablePadding sx={{ py: 1 }}>
                      <ListItemText
                        primary={<Typography variant="body2" fontWeight={500}>{label}</Typography>}
                        secondary={<Typography variant="caption" color="text.secondary">{sub}</Typography>}
                      />
                      <ListItemSecondaryAction>
                        <Switch
                          edge="end"
                          checked={notifications[key]}
                          onChange={(e) => setNotifications({ ...notifications, [key]: e.target.checked })}
                          size="small"
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveNotifications}
                disabled={loading}
                size="small"
                sx={{ mt: 2 }}
              >
                Save Notifications
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Cost Preferences */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Avatar sx={{ bgcolor: 'success.light', color: 'success.dark', width: 36, height: 36 }}>
                  <SecurityIcon />
                </Avatar>
                <Typography variant="h6">Cost Preferences</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Currency</InputLabel>
                  <Select value={currency} label="Currency" onChange={(e) => setCurrency(e.target.value)}>
                    <MenuItem value="USD">USD — US Dollar</MenuItem>
                    <MenuItem value="EUR">EUR — Euro</MenuItem>
                    <MenuItem value="GBP">GBP — British Pound</MenuItem>
                    <MenuItem value="JPY">JPY — Japanese Yen</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="Monthly Cost Alert Threshold ($)"
                  value={costThreshold}
                  onChange={(e) => setCostThreshold(e.target.value)}
                  type="number"
                  size="small"
                  fullWidth
                  helperText="Receive an alert when monthly spend exceeds this amount"
                />
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSavePreferences}
                  disabled={loading}
                  size="small"
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Save Preferences
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Security */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Avatar sx={{ bgcolor: 'error.light', color: 'error.dark', width: 36, height: 36 }}>
                  <SecurityIcon />
                </Avatar>
                <Typography variant="h6">Security</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {passwordError && <Alert severity="error">{passwordError}</Alert>}
                <TextField
                  label="Current Password"
                  type="password"
                  size="small"
                  fullWidth
                  value={passwordFields.current}
                  onChange={(e) => setPasswordFields({ ...passwordFields, current: e.target.value })}
                />
                <TextField
                  label="New Password"
                  type="password"
                  size="small"
                  fullWidth
                  value={passwordFields.next}
                  onChange={(e) => setPasswordFields({ ...passwordFields, next: e.target.value })}
                />
                <TextField
                  label="Confirm New Password"
                  type="password"
                  size="small"
                  fullWidth
                  value={passwordFields.confirm}
                  onChange={(e) => setPasswordFields({ ...passwordFields, confirm: e.target.value })}
                />
                <FormControlLabel
                  control={<Switch defaultChecked size="small" />}
                  label={<Typography variant="body2">Enable two-factor authentication</Typography>}
                />
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  sx={{ alignSelf: 'flex-start' }}
                  onClick={handleChangePassword}
                  disabled={loading || !passwordFields.current || !passwordFields.next}
                >
                  Change Password
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar
        open={saved}
        autoHideDuration={4000}
        onClose={() => setSaved(false)}
        message={saveMsg}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      />
    </Box>
  );
}

