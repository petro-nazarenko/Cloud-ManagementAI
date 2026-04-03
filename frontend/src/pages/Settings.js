import React, { useState } from 'react';
import {
  Box, Card, CardContent, Grid, Typography, Button, TextField,
  Switch, FormControlLabel, Divider, Avatar, Chip, Alert,
  List, ListItem, ListItemText, ListItemSecondaryAction,
  Select, MenuItem, FormControl, InputLabel, Snackbar,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import PersonIcon from '@mui/icons-material/Person';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SecurityIcon from '@mui/icons-material/Security';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || 'Admin',
    timezone: 'UTC-5 (Eastern)',
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
  const [costThreshold, setCostThreshold] = useState('500');

  const handleSave = () => {
    setSaved(true);
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
                  {user?.avatar || 'U'}
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
                    <MenuItem value="UTC-8 (Pacific)">UTC-8 (Pacific)</MenuItem>
                    <MenuItem value="UTC-7 (Mountain)">UTC-7 (Mountain)</MenuItem>
                    <MenuItem value="UTC-6 (Central)">UTC-6 (Central)</MenuItem>
                    <MenuItem value="UTC-5 (Eastern)">UTC-5 (Eastern)</MenuItem>
                    <MenuItem value="UTC+0 (London)">UTC+0 (London)</MenuItem>
                    <MenuItem value="UTC+1 (Paris)">UTC+1 (Paris)</MenuItem>
                  </Select>
                </FormControl>
                <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} size="small" sx={{ alignSelf: 'flex-start' }}>
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
                <Alert severity="info" sx={{ fontSize: 12 }}>
                  Current month spend: <strong>$30,700</strong> — 6,040% of threshold
                </Alert>
                <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} size="small" sx={{ alignSelf: 'flex-start' }}>
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
                <TextField label="Current Password" type="password" size="small" fullWidth />
                <TextField label="New Password" type="password" size="small" fullWidth />
                <TextField label="Confirm New Password" type="password" size="small" fullWidth />
                <FormControlLabel
                  control={<Switch defaultChecked size="small" />}
                  label={<Typography variant="body2">Enable two-factor authentication</Typography>}
                />
                <FormControlLabel
                  control={<Switch size="small" />}
                  label={<Typography variant="body2">Log out all other sessions</Typography>}
                />
                <Button variant="outlined" color="error" size="small" sx={{ alignSelf: 'flex-start' }}>
                  Change Password
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar
        open={saved}
        autoHideDuration={3000}
        onClose={() => setSaved(false)}
        message="Settings saved successfully"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      />
    </Box>
  );
}
