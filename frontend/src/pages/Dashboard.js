import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Grid, Typography, Chip, List,
  ListItem, ListItemAvatar, ListItemText, Avatar, Divider,
  LinearProgress, Button, CircularProgress, Alert,
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CloudIcon from '@mui/icons-material/Cloud';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import MetricCard from '../components/MetricCard';
import { analyticsAPI, resourcesAPI, providersAPI } from '../services/api';

const PROVIDER_COLORS = { aws: '#FF9900', azure: '#0078D4', gcp: '#4285F4' };

export default function Dashboard() {
  const [costs, setCosts] = useState(null);
  const [resources, setResources] = useState(null);
  const [providers, setProviders] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError('');
      try {
        const [costsRes, resourcesRes, providersRes, recsRes] = await Promise.all([
          analyticsAPI.costs({ period: '30d' }),
          resourcesAPI.list({ limit: 5 }),
          providersAPI.list(),
          analyticsAPI.recommendations({ status: 'open' }),
        ]);
        setCosts(costsRes.data);
        setResources(resourcesRes.data);
        setProviders(providersRes.data.providers || []);
        setRecommendations(recsRes.data.data || []);
      } catch (err) {
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Build cost trend data from providers breakdown
  const costTrendData = costs
    ? costs.breakdown.map((p) => ({
        name: p.provider.toUpperCase(),
        total: p.total,
        services: p.services,
      }))
    : [];

  // Build chart-friendly monthly data (use single period as single point)
  const chartData = costs
    ? [
        {
          month: 'Current',
          ...(costs.breakdown.reduce((acc, p) => { acc[p.provider] = p.total; return acc; }, {})),
        },
      ]
    : [];

  const totalCost = costs?.grandTotal?.amount || 0;
  const totalResources = resources?.total || 0;
  const connectedProviders = providers.filter((p) => p.configured).length;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Dashboard</Typography>
          <Typography variant="body2" color="text.secondary">
            Overview of your cloud infrastructure
          </Typography>
        </Box>
        <Chip label="Last 30 days" variant="outlined" size="small" />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Summary cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Total Resources"
            value={String(totalResources)}
            subtitle={`Across ${connectedProviders} providers`}
            icon={<StorageIcon />}
            color="primary"
            trend="up"
            trendValue="Live from API"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Monthly Cost"
            value={`$${totalCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            subtitle="Current period estimate"
            icon={<AttachMoneyIcon />}
            color="secondary"
            trend="up"
            trendValue="Live from API"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Open Recommendations"
            value={String(recommendations.length)}
            subtitle="Potential cost savings"
            icon={<WarningAmberIcon />}
            color="warning"
            trend="flat"
            trendValue="Check Analytics"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Cloud Providers"
            value={String(providers.length)}
            subtitle={providers.map((p) => p.name.toUpperCase()).join(' · ')}
            icon={<CloudIcon />}
            color="success"
            trend="flat"
            trendValue={`${connectedProviders} configured`}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Cost Breakdown Chart */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">Cost Breakdown by Provider</Typography>
                <Chip label="30 days" size="small" variant="outlined" />
              </Box>
              {costs && costs.breakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={[
                    costs.breakdown.reduce((acc, p) => {
                      acc[p.provider] = p.total;
                      return acc;
                    }, { month: 'Current' })
                  ]} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, '']} />
                    <Legend />
                    {costs.breakdown.map((p) => (
                      <Line
                        key={p.provider}
                        type="monotone"
                        dataKey={p.provider}
                        name={p.provider.toUpperCase()}
                        stroke={PROVIDER_COLORS[p.provider] || '#666'}
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                  <Typography>No cost data available. Configure cloud provider credentials to see live data.</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Provider Health */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Provider Status</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {providers.map((p) => (
                  <Box key={p.name}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: PROVIDER_COLORS[p.name] || '#999' }} />
                        <Typography variant="body2" fontWeight={600}>{p.name.toUpperCase()}</Typography>
                        <Chip
                          label={p.configured ? 'configured' : 'unconfigured'}
                          size="small"
                          color={p.configured ? 'success' : 'default'}
                          sx={{ height: 18, fontSize: 10 }}
                        />
                      </Box>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={p.configured ? 100 : 0}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: 'grey.100',
                        '& .MuiLinearProgress-bar': { bgcolor: p.configured ? PROVIDER_COLORS[p.name] : '#ccc', borderRadius: 3 },
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {p.configured ? 'Ready' : 'Set credentials in Settings'}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Cost Breakdown per Provider */}
        {costs && costs.breakdown.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Cost Breakdown</Typography>
                <List disablePadding>
                  {costs.breakdown.map((p, idx) => (
                    <React.Fragment key={p.provider}>
                      {idx > 0 && <Divider component="li" />}
                      <ListItem alignItems="flex-start" sx={{ px: 0, py: 1.5 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: PROVIDER_COLORS[p.provider] + '22', color: PROVIDER_COLORS[p.provider], border: `1px solid ${PROVIDER_COLORS[p.provider]}44` }}>
                            <CloudIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" fontWeight={600}>{p.provider.toUpperCase()}</Typography>
                              <Chip label={`$${p.total.toLocaleString()}`} size="small" color="primary" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
                            </Box>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary">
                              {p.services.map((s) => `${s.service}: $${s.amount.toLocaleString()}`).join(' · ')}
                            </Typography>
                          }
                        />
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
