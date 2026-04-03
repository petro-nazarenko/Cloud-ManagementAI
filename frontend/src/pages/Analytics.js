import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Grid, Typography, Chip, List,
  ListItem, ListItemText, ListItemIcon, Avatar, Divider,
  ToggleButton, ToggleButtonGroup, CircularProgress, Alert, Button,
} from '@mui/material';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import StorageIcon from '@mui/icons-material/Storage';
import TimerIcon from '@mui/icons-material/Timer';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  ResponsiveContainer, Legend, AreaChart, Area,
} from 'recharts';
import MetricCard from '../components/MetricCard';
import { analyticsAPI } from '../services/api';

const SEVERITY_COLORS = { high: 'error', medium: 'warning', low: 'info' };
const TYPE_ICONS = {
  'right-sizing': <TrendingDownIcon />,
  'schedule': <TimerIcon />,
  'committed-use': <LightbulbIcon />,
  'storage-class': <StorageIcon />,
};

export default function Analytics() {
  const [costs, setCosts] = useState(null);
  const [usage, setUsage] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [usagePeriod, setUsagePeriod] = useState('30d');
  const [applyingRec, setApplyingRec] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError('');
      try {
        const [costsRes, usageRes, recsRes] = await Promise.all([
          analyticsAPI.costs({ period: '30d' }),
          analyticsAPI.usage(),
          analyticsAPI.recommendations({ status: 'open' }),
        ]);
        setCosts(costsRes.data);
        setUsage(usageRes.data.data || []);
        setRecommendations(recsRes.data.data || []);
      } catch (err) {
        setError('Failed to load analytics data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const handleDismiss = async (id) => {
    setApplyingRec(id);
    try {
      await analyticsAPI.updateRecommendation(id, 'dismissed');
      setRecommendations((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // ignore
    } finally {
      setApplyingRec(null);
    }
  };

  const handleApply = async (id) => {
    setApplyingRec(id);
    try {
      await analyticsAPI.updateRecommendation(id, 'applied');
      setRecommendations((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // ignore
    } finally {
      setApplyingRec(null);
    }
  };

  // Build cost breakdown data for bar chart
  const costBreakdownData = costs
    ? (() => {
        const serviceMap = {};
        for (const prov of costs.breakdown) {
          for (const svc of prov.services) {
            if (!serviceMap[svc.service]) serviceMap[svc.service] = { service: svc.service };
            serviceMap[svc.service][prov.provider] = svc.amount;
          }
        }
        return Object.values(serviceMap);
      })()
    : [];

  const providerColors = { aws: '#FF9900', azure: '#0078D4', gcp: '#4285F4' };

  // Build usage area chart data
  const usageChartData = usage.map((u) => ({
    name: u.name,
    cpu: u.cpuPercent || 0,
    memory: u.memoryPercent || 0,
    network: u.networkMbps || 0,
  }));

  const totalSavings = recommendations.reduce((s, r) => s + (r.estimatedMonthlySavings || 0), 0);
  const totalCost = costs?.grandTotal?.amount || 0;
  const avgCpu = usage.length > 0
    ? (usage.reduce((s, u) => s + (u.cpuPercent || 0), 0) / usage.length).toFixed(0)
    : 0;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Analytics</Typography>
        <Typography variant="body2" color="text.secondary">
          Cost analysis, usage trends, and optimization insights
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Summary row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <MetricCard
            title="Total Monthly Spend"
            value={`$${totalCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            subtitle="Across all providers"
            color="primary"
            trend="up"
            trendValue="Live from API"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <MetricCard
            title="Potential Savings"
            value={`$${totalSavings.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            subtitle={`${recommendations.length} open recommendations`}
            color="success"
            trend="flat"
            trendValue="Identified this period"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <MetricCard
            title="Avg. CPU Utilization"
            value={`${avgCpu}%`}
            subtitle="Across monitored resources"
            color="secondary"
            trend="flat"
            trendValue="Live metrics"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Cost breakdown bar chart */}
        <Grid item xs={12} lg={7}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>Cost Breakdown by Service</Typography>
              {costBreakdownData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={costBreakdownData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="service" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <RechartTooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, '']} />
                    <Legend />
                    {costs && costs.breakdown.map((p) => (
                      <Bar key={p.provider} dataKey={p.provider} name={p.provider.toUpperCase()} fill={providerColors[p.provider] || '#666'} radius={[4, 4, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                  <Typography>No cost data available.</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Provider spend summary */}
        <Grid item xs={12} lg={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Provider Cost Share</Typography>
              {costs && costs.breakdown.map((p) => {
                const pct = totalCost > 0 ? ((p.total / totalCost) * 100).toFixed(1) : 0;
                return (
                  <Box key={p.provider} sx={{ mb: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: providerColors[p.provider] || '#666' }} />
                        <Typography variant="body2" fontWeight={600}>{p.provider.toUpperCase()}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="body2" fontWeight={700}>${p.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Typography>
                        <Typography variant="caption" color="text.secondary">{pct}%</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ height: 8, bgcolor: 'grey.100', borderRadius: 4 }}>
                      <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: providerColors[p.provider] || '#666', borderRadius: 4 }} />
                    </Box>
                  </Box>
                );
              })}
            </CardContent>
          </Card>
        </Grid>

        {/* Usage metrics area chart */}
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">Resource Utilization</Typography>
                <ToggleButtonGroup
                  value={usagePeriod}
                  exclusive
                  onChange={(_, v) => v && setUsagePeriod(v)}
                  size="small"
                >
                  <ToggleButton value="7d">7D</ToggleButton>
                  <ToggleButton value="30d">30D</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              {usageChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={usageChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1a237e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#1a237e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0288d1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0288d1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                    <RechartTooltip formatter={(v) => [`${v}%`, '']} />
                    <Legend />
                    <Area type="monotone" dataKey="cpu" name="CPU" stroke="#1a237e" strokeWidth={2} fill="url(#cpuGrad)" />
                    <Area type="monotone" dataKey="memory" name="Memory" stroke="#0288d1" strokeWidth={2} fill="url(#memGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                  <Typography>No usage data available.</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Optimization recommendations */}
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Optimization Recommendations</Typography>
                <Chip
                  label={`~$${totalSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })} potential savings`}
                  color="success"
                  size="small"
                />
              </Box>
              {recommendations.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  <CheckCircleIcon sx={{ fontSize: 40, mb: 1, color: 'success.main' }} />
                  <Typography>No open recommendations — your infrastructure looks optimized!</Typography>
                </Box>
              ) : (
                <List disablePadding>
                  {recommendations.map((rec, idx) => (
                    <React.Fragment key={rec.id}>
                      {idx > 0 && <Divider component="li" />}
                      <ListItem alignItems="flex-start" sx={{ px: 0, py: 1.5 }}>
                        <ListItemIcon sx={{ minWidth: 44 }}>
                          <Avatar
                            sx={{
                              width: 36,
                              height: 36,
                              bgcolor: rec.severity === 'high' ? '#ffebee' : rec.severity === 'medium' ? '#fff3e0' : '#e3f2fd',
                              color: rec.severity === 'high' ? '#d32f2f' : rec.severity === 'medium' ? '#ed6c02' : '#0277bd',
                            }}
                          >
                            {TYPE_ICONS[rec.type] || <LightbulbIcon />}
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              <Typography variant="body2" fontWeight={600}>{rec.resourceName}</Typography>
                              <Chip label={rec.severity} size="small" color={SEVERITY_COLORS[rec.severity] || 'default'} variant="outlined" sx={{ height: 18, fontSize: 10 }} />
                              <Chip label={rec.provider?.toUpperCase()} size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
                              <Chip label={rec.type} size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
                            </Box>
                          }
                          secondary={
                            <Box sx={{ mt: 0.5 }}>
                              <Typography variant="caption" color="text.secondary" display="block">{rec.description}</Typography>
                              <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center' }}>
                                <Chip
                                  label={`Save $${(rec.estimatedMonthlySavings || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo`}
                                  size="small"
                                  color="success"
                                  sx={{ height: 20, fontSize: 11, fontWeight: 700 }}
                                />
                                <Button size="small" variant="outlined" disabled={applyingRec === rec.id} onClick={() => handleApply(rec.id)}>Apply</Button>
                                <Button size="small" color="inherit" disabled={applyingRec === rec.id} onClick={() => handleDismiss(rec.id)}>Dismiss</Button>
                              </Box>
                            </Box>
                          }
                        />
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
