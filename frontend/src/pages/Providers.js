import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Grid, Typography, Chip, Button,
  Avatar, Divider, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField,
  LinearProgress, IconButton, Tooltip, CircularProgress, Alert,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import { providersAPI, usersAPI } from '../services/api';

const PROVIDER_META = {
  aws: { logo: '🟠', color: '#FF9900', bgColor: '#FFF8E1', displayName: 'Amazon Web Services' },
  azure: { logo: '🔵', color: '#0078D4', bgColor: '#E3F2FD', displayName: 'Microsoft Azure' },
  gcp: { logo: '🔷', color: '#4285F4', bgColor: '#E8F5E9', displayName: 'Google Cloud Platform' },
};

function ProviderCard({ provider, onSync }) {
  const meta = PROVIDER_META[provider.name] || { logo: '☁', color: '#666', bgColor: '#f5f5f5', displayName: provider.name };

  const statusIcon =
    provider.configured ? (
      <CheckCircleIcon sx={{ color: '#2e7d32', fontSize: 18 }} />
    ) : (
      <WarningAmberIcon sx={{ color: '#ed6c02', fontSize: 18 }} />
    );

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: meta.bgColor, width: 52, height: 52, fontSize: 26 }}>
              {meta.logo}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700}>{provider.name.toUpperCase()}</Typography>
              <Typography variant="caption" color="text.secondary">{meta.displayName}</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {statusIcon}
            <Chip
              label={provider.configured ? 'configured' : 'unconfigured'}
              size="small"
              color={provider.configured ? 'success' : 'warning'}
              variant="outlined"
            />
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Status info */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary" display="block">Status</Typography>
          <Typography variant="body2" fontWeight={500}>{provider.status}</Typography>
        </Box>

        {!provider.configured && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
              Configuration
            </Typography>
            <Typography variant="caption" color="warning.main">
              Credentials not configured. Use Settings → Cloud Credentials to connect.
            </Typography>
          </Box>
        )}

        {/* Connection bar */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">Connectivity</Typography>
            <Typography variant="caption" fontWeight={700} color={provider.configured ? 'success.main' : 'warning.main'}>
              {provider.configured ? '100%' : '0%'}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={provider.configured ? 100 : 0}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: 'grey.100',
              '& .MuiLinearProgress-bar': {
                bgcolor: provider.configured ? '#2e7d32' : '#ed6c02',
                borderRadius: 3,
              },
            }}
          />
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => onSync(provider.name)}
            disabled={!provider.configured}
            sx={{ flex: 1 }}
          >
            Sync
          </Button>
          <Tooltip title={provider.configured ? 'Disconnect' : 'Not connected'}>
            <span>
              <IconButton
                size="small"
                color="error"
                sx={{ border: '1px solid', borderColor: 'error.light' }}
                disabled={!provider.configured}
              >
                <LinkOffIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function Providers() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connectOpen, setConnectOpen] = useState(false);
  const [newProvider, setNewProvider] = useState({ type: '', accessKey: '', secretKey: '', region: '' });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const fetchProviders = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await providersAPI.list();
      setProviders(res.data.providers || []);
    } catch (err) {
      setError('Failed to load providers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProviders(); }, []);

  const handleSync = () => fetchProviders();

  const handleConnect = async () => {
    if (!newProvider.type) return;
    setSaving(true);
    setSaveMsg('');
    try {
      await usersAPI.saveCloudCredentials(newProvider.type, {
        accessKeyId: newProvider.accessKey,
        secretAccessKey: newProvider.secretKey,
        region: newProvider.region,
      });
      setSaveMsg('Credentials saved securely.');
      await fetchProviders();
      setTimeout(() => {
        setConnectOpen(false);
        setSaveMsg('');
        setNewProvider({ type: '', accessKey: '', secretKey: '', region: '' });
      }, 1500);
    } catch (err) {
      setSaveMsg(err.response?.data?.error || 'Failed to save credentials.');
    } finally {
      setSaving(false);
    }
  };

  const configuredCount = providers.filter((p) => p.configured).length;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Cloud Providers</Typography>
          <Typography variant="body2" color="text.secondary">
            {configuredCount} of {providers.length} providers configured
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setConnectOpen(true)}
          size="small"
        >
          Connect Provider
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Grid container spacing={3}>
        {providers.map((provider) => (
          <Grid item xs={12} md={6} lg={4} key={provider.name}>
            <ProviderCard provider={provider} onSync={handleSync} />
          </Grid>
        ))}

        {/* Add provider CTA card */}
        <Grid item xs={12} md={6} lg={4}>
          <Card
            sx={{
              height: '100%',
              minHeight: 200,
              border: '2px dashed',
              borderColor: 'divider',
              boxShadow: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.50' },
            }}
            onClick={() => setConnectOpen(true)}
          >
            <Box sx={{ textAlign: 'center', p: 3 }}>
              <Avatar sx={{ bgcolor: 'grey.100', mx: 'auto', mb: 1.5, width: 52, height: 52 }}>
                <AddIcon color="action" />
              </Avatar>
              <Typography variant="body1" fontWeight={600} color="text.secondary">
                Connect New Provider
              </Typography>
              <Typography variant="caption" color="text.secondary">
                AWS · Azure · GCP · DigitalOcean · more
              </Typography>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Connect dialog */}
      <Dialog open={connectOpen} onClose={() => setConnectOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Connect Cloud Provider</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {saveMsg && (
              <Alert severity={saveMsg.includes('saved') ? 'success' : 'error'}>{saveMsg}</Alert>
            )}
            <TextField
              label="Provider Type"
              select
              SelectProps={{ native: true }}
              value={newProvider.type}
              onChange={(e) => setNewProvider({ ...newProvider, type: e.target.value })}
              fullWidth
              size="small"
            >
              <option value="">Select provider…</option>
              <option value="aws">Amazon Web Services</option>
              <option value="azure">Microsoft Azure</option>
              <option value="gcp">Google Cloud Platform</option>
            </TextField>
            <TextField
              label="Access Key ID / Client ID"
              value={newProvider.accessKey}
              onChange={(e) => setNewProvider({ ...newProvider, accessKey: e.target.value })}
              fullWidth
              size="small"
            />
            <TextField
              label="Secret Access Key / Client Secret"
              type="password"
              value={newProvider.secretKey}
              onChange={(e) => setNewProvider({ ...newProvider, secretKey: e.target.value })}
              fullWidth
              size="small"
            />
            <TextField
              label="Default Region"
              value={newProvider.region}
              onChange={(e) => setNewProvider({ ...newProvider, region: e.target.value })}
              fullWidth
              size="small"
              placeholder="us-east-1"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConnectOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleConnect} disabled={saving || !newProvider.type}>
            {saving ? 'Saving…' : 'Save Credentials'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

