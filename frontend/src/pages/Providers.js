import React, { useState } from 'react';
import {
  Box, Card, CardContent, Grid, Typography, Chip, Button,
  Avatar, Divider, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField,
  LinearProgress, IconButton, Tooltip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

const PROVIDERS = [
  {
    id: 'aws',
    name: 'Amazon Web Services',
    shortName: 'AWS',
    logo: '🟠',
    color: '#FF9900',
    bgColor: '#FFF8E1',
    status: 'connected',
    accountId: '123456789012',
    regions: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'],
    resources: { total: 142, compute: 38, database: 12, storage: 56, network: 24, other: 12 },
    monthlyCost: 15200,
    lastSync: '2 minutes ago',
    healthScore: 98,
  },
  {
    id: 'azure',
    name: 'Microsoft Azure',
    shortName: 'Azure',
    logo: '🔵',
    color: '#0078D4',
    bgColor: '#E3F2FD',
    status: 'connected',
    accountId: 'sub-a1b2c3d4-prod',
    regions: ['eastus', 'westeurope', 'eastus2', 'southeastasia'],
    resources: { total: 98, compute: 28, database: 8, storage: 30, network: 18, other: 14 },
    monthlyCost: 10100,
    lastSync: '5 minutes ago',
    healthScore: 94,
  },
  {
    id: 'gcp',
    name: 'Google Cloud Platform',
    shortName: 'GCP',
    logo: '🔷',
    color: '#4285F4',
    bgColor: '#E8F5E9',
    status: 'warning',
    accountId: 'my-org-prod-420042',
    regions: ['us-central1', 'europe-west1', 'asia-east1'],
    resources: { total: 61, compute: 18, database: 6, storage: 22, network: 10, other: 5 },
    monthlyCost: 5600,
    lastSync: '18 minutes ago',
    healthScore: 81,
  },
];

const resourceTypeLabels = ['compute', 'database', 'storage', 'network', 'other'];

function ProviderCard({ provider, onDisconnect, onSync }) {
  const statusIcon =
    provider.status === 'connected' ? (
      <CheckCircleIcon sx={{ color: '#2e7d32', fontSize: 18 }} />
    ) : provider.status === 'warning' ? (
      <WarningAmberIcon sx={{ color: '#ed6c02', fontSize: 18 }} />
    ) : (
      <ErrorIcon sx={{ color: '#d32f2f', fontSize: 18 }} />
    );

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: provider.bgColor, width: 52, height: 52, fontSize: 26 }}>
              {provider.logo}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700}>{provider.shortName}</Typography>
              <Typography variant="caption" color="text.secondary">{provider.name}</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {statusIcon}
            <Chip
              label={provider.status}
              size="small"
              color={provider.status === 'connected' ? 'success' : provider.status === 'warning' ? 'warning' : 'error'}
              variant="outlined"
            />
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Account info */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary" display="block">Account ID</Typography>
          <Typography variant="body2" fontWeight={500} fontFamily="monospace">{provider.accountId}</Typography>
        </Box>

        {/* Health score */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">Health Score</Typography>
            <Typography variant="caption" fontWeight={700} color={provider.healthScore >= 90 ? 'success.main' : 'warning.main'}>
              {provider.healthScore}/100
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={provider.healthScore}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: 'grey.100',
              '& .MuiLinearProgress-bar': {
                bgcolor: provider.healthScore >= 90 ? '#2e7d32' : '#ed6c02',
                borderRadius: 3,
              },
            }}
          />
        </Box>

        {/* Resource breakdown */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Resources ({provider.resources.total} total)
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {resourceTypeLabels.map((type) => (
              <Chip
                key={type}
                label={`${type.charAt(0).toUpperCase() + type.slice(1)}: ${provider.resources[type]}`}
                size="small"
                variant="outlined"
                sx={{ fontSize: 11 }}
              />
            ))}
          </Box>
        </Box>

        {/* Active regions */}
        <Box sx={{ mb: 2.5 }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
            Active Regions
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {provider.regions.map((r) => (
              <Chip key={r} label={r} size="small" sx={{ fontSize: 10, height: 20, bgcolor: `${provider.color}15`, color: provider.color }} />
            ))}
          </Box>
        </Box>

        {/* Cost + sync info */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Monthly Cost</Typography>
            <Typography variant="h6" fontWeight={700}>${provider.monthlyCost.toLocaleString()}</Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" color="text.secondary" display="block">Last sync</Typography>
            <Typography variant="caption" fontWeight={500}>{provider.lastSync}</Typography>
          </Box>
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => onSync(provider.id)}
            sx={{ flex: 1 }}
          >
            Sync
          </Button>
          <Tooltip title="View in console">
            <IconButton size="small" sx={{ border: '1px solid', borderColor: 'divider' }}>
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Disconnect">
            <IconButton
              size="small"
              color="error"
              sx={{ border: '1px solid', borderColor: 'error.light' }}
              onClick={() => onDisconnect(provider.id)}
            >
              <LinkOffIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function Providers() {
  const [providers, setProviders] = useState(PROVIDERS);
  const [connectOpen, setConnectOpen] = useState(false);
  const [newProvider, setNewProvider] = useState({ type: '', accessKey: '', secretKey: '', region: '' });

  const handleSync = (id) => {
    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, lastSync: 'just now' } : p))
    );
  };

  const handleDisconnect = (id) => {
    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'disconnected' } : p))
    );
  };

  const totalResources = providers.reduce((s, p) => s + p.resources.total, 0);
  const totalCost = providers.reduce((s, p) => s + p.monthlyCost, 0);
  const connectedCount = providers.filter((p) => p.status === 'connected').length;

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Cloud Providers</Typography>
          <Typography variant="body2" color="text.secondary">
            {connectedCount} of {providers.length} providers connected · {totalResources} resources · ${totalCost.toLocaleString()}/mo
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

      <Grid container spacing={3}>
        {providers.map((provider) => (
          <Grid item xs={12} md={6} lg={4} key={provider.id}>
            <ProviderCard
              provider={provider}
              onSync={handleSync}
              onDisconnect={handleDisconnect}
            />
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
              <option value="digitalocean">DigitalOcean</option>
            </TextField>
            <TextField
              label="Access Key ID"
              value={newProvider.accessKey}
              onChange={(e) => setNewProvider({ ...newProvider, accessKey: e.target.value })}
              fullWidth
              size="small"
              placeholder="AKIAIOSFODNN7EXAMPLE"
            />
            <TextField
              label="Secret Access Key"
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
          <Button variant="contained" onClick={() => setConnectOpen(false)}>
            Test &amp; Connect
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
