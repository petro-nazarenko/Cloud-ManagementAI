import React, { useState } from 'react';
import {
  Box, Card, CardContent, Grid, Typography, Chip, List,
  ListItem, ListItemText, ListItemIcon, Avatar, Divider,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import StorageIcon from '@mui/icons-material/Storage';
import TimerIcon from '@mui/icons-material/Timer';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  ResponsiveContainer, Legend, AreaChart, Area,
} from 'recharts';
import MetricCard from '../components/MetricCard';

const costBreakdownData = [
  { service: 'Compute', aws: 8200, azure: 5100, gcp: 2900 },
  { service: 'Database', aws: 4800, azure: 3600, gcp: 1900 },
  { service: 'Storage', aws: 1200, azure: 800, gcp: 600 },
  { service: 'Network', aws: 600, azure: 400, gcp: 280 },
  { service: 'Functions', aws: 400, azure: 200, gcp: 120 },
];

const usageData30d = Array.from({ length: 30 }, (_, i) => ({
  day: `${i + 1}`,
  cpu: Math.round(55 + Math.sin(i / 3) * 15 + Math.random() * 10),
  memory: Math.round(68 + Math.sin(i / 4 + 1) * 10 + Math.random() * 8),
  network: Math.round(40 + Math.sin(i / 5 + 2) * 20 + Math.random() * 12),
}));

const usageData7d = usageData30d.slice(-7).map((d, i) => ({
  ...d,
  day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
}));

const recommendations = [
  {
    id: 1,
    severity: 'high',
    icon: <TrendingDownIcon />,
    title: 'Right-size ec2-staging-01',
    description: 'Instance has been stopped for 14 days. Consider terminating or snapshotting to save $142/mo.',
    saving: '$142/mo',
    provider: 'AWS',
  },
  {
    id: 2,
    severity: 'high',
    icon: <StorageIcon />,
    title: 'Delete unused EBS volumes',
    description: '7 unattached EBS volumes totaling 2.1 TB detected in us-east-1.',
    saving: '$210/mo',
    provider: 'AWS',
  },
  {
    id: 3,
    severity: 'medium',
    icon: <TimerIcon />,
    title: 'Use Reserved Instances for rds-mysql-prod',
    description: 'Switching to 1-year reserved instance could reduce RDS costs significantly.',
    saving: '$930/yr',
    provider: 'AWS',
  },
  {
    id: 4,
    severity: 'medium',
    icon: <LightbulbIcon />,
    title: 'Enable Azure Spot VMs for dev workloads',
    description: 'vm-dev-01 and vm-staging-02 are suitable for Spot pricing during off-hours.',
    saving: '$85/mo',
    provider: 'Azure',
  },
  {
    id: 5,
    severity: 'low',
    icon: <StorageIcon />,
    title: 'Move infrequently accessed GCS data to Nearline',
    description: 'ml-training-data bucket has 78% cold data eligible for cheaper storage class.',
    saving: '$8/mo',
    provider: 'GCP',
  },
];

const SEVERITY_COLORS = { high: 'error', medium: 'warning', low: 'info' };
const PROVIDER_COLORS = { AWS: '#FF9900', Azure: '#0078D4', GCP: '#4285F4' };

const totalSavings = recommendations.reduce((sum, r) => {
  const match = r.saving.match(/\$([0-9,]+)/);
  return sum + (match ? parseInt(match[1].replace(',', '')) : 0);
}, 0);

export default function Analytics() {
  const [usagePeriod, setUsagePeriod] = useState('30d');

  const usageDataset = usagePeriod === '7d' ? usageData7d : usageData30d;

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Analytics</Typography>
        <Typography variant="body2" color="text.secondary">
          Cost analysis, usage trends, and optimization insights
        </Typography>
      </Box>

      {/* Summary row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <MetricCard
            title="Total Monthly Spend"
            value="$30,700"
            subtitle="Across AWS, Azure, GCP"
            color="primary"
            trend="up"
            trendValue="+4.2% MoM"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <MetricCard
            title="Potential Savings"
            value={`$${totalSavings.toLocaleString()}`}
            subtitle={`${recommendations.length} recommendations`}
            color="success"
            trend="flat"
            trendValue="Identified this month"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <MetricCard
            title="Avg. Resource Utilization"
            value="64%"
            subtitle="CPU + Memory composite"
            color="secondary"
            trend="up"
            trendValue="+3% vs last month"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Cost breakdown bar chart */}
        <Grid item xs={12} lg={7}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>Cost Breakdown by Service</Typography>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={costBreakdownData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="service" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <RechartTooltip formatter={(v) => [`$${v.toLocaleString()}`, '']} />
                  <Legend />
                  <Bar dataKey="aws" name="AWS" fill="#FF9900" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="azure" name="Azure" fill="#0078D4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="gcp" name="GCP" fill="#4285F4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Provider spend pie summary */}
        <Grid item xs={12} lg={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Provider Cost Share</Typography>
              {[
                { name: 'AWS', amount: 15200, pct: 49.5 },
                { name: 'Azure', amount: 10100, pct: 32.9 },
                { name: 'GCP', amount: 5400, pct: 17.6 },
              ].map((p) => (
                <Box key={p.name} sx={{ mb: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: PROVIDER_COLORS[p.name] }} />
                      <Typography variant="body2" fontWeight={600}>{p.name}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" fontWeight={700}>${p.amount.toLocaleString()}</Typography>
                      <Typography variant="caption" color="text.secondary">{p.pct}%</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ height: 8, bgcolor: 'grey.100', borderRadius: 4 }}>
                    <Box sx={{ height: '100%', width: `${p.pct}%`, bgcolor: PROVIDER_COLORS[p.name], borderRadius: 4 }} />
                  </Box>
                </Box>
              ))}
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
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={usageDataset} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1a237e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#1a237e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0288d1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0288d1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2e7d32" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2e7d32" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                  <RechartTooltip formatter={(v) => [`${v}%`, '']} />
                  <Legend />
                  <Area type="monotone" dataKey="cpu" name="CPU" stroke="#1a237e" strokeWidth={2} fill="url(#cpuGrad)" />
                  <Area type="monotone" dataKey="memory" name="Memory" stroke="#0288d1" strokeWidth={2} fill="url(#memGrad)" />
                  <Area type="monotone" dataKey="network" name="Network I/O" stroke="#2e7d32" strokeWidth={2} fill="url(#netGrad)" />
                </AreaChart>
              </ResponsiveContainer>
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
                  label={`~$${totalSavings.toLocaleString()} potential savings`}
                  color="success"
                  size="small"
                />
              </Box>
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
                            bgcolor:
                              rec.severity === 'high' ? '#ffebee'
                              : rec.severity === 'medium' ? '#fff3e0'
                              : '#e3f2fd',
                            color:
                              rec.severity === 'high' ? '#d32f2f'
                              : rec.severity === 'medium' ? '#ed6c02'
                              : '#0277bd',
                          }}
                        >
                          {rec.icon}
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography variant="body2" fontWeight={600}>{rec.title}</Typography>
                            <Chip label={rec.severity} size="small" color={SEVERITY_COLORS[rec.severity]} variant="outlined" sx={{ height: 18, fontSize: 10 }} />
                            <Chip label={rec.provider} size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
                          </Box>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                              {rec.description}
                            </Typography>
                            <Chip
                              label={`Save ${rec.saving}`}
                              size="small"
                              color="success"
                              sx={{ ml: 2, height: 20, fontSize: 11, fontWeight: 700, flexShrink: 0 }}
                            />
                          </Box>
                        }
                      />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
