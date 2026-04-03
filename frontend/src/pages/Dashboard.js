import React, { useState } from 'react';
import {
  Box, Card, CardContent, Grid, Typography, Chip, List,
  ListItem, ListItemAvatar, ListItemText, Avatar, Divider,
  LinearProgress, Button,
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CloudIcon from '@mui/icons-material/Cloud';
import ErrorIcon from '@mui/icons-material/Error';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import MetricCard from '../components/MetricCard';

const costTrendData = [
  { month: 'Jul', aws: 12400, azure: 8200, gcp: 4100 },
  { month: 'Aug', aws: 13100, azure: 8600, gcp: 4300 },
  { month: 'Sep', aws: 12800, azure: 9100, gcp: 4800 },
  { month: 'Oct', aws: 14200, azure: 9400, gcp: 5100 },
  { month: 'Nov', aws: 13600, azure: 9800, gcp: 5400 },
  { month: 'Dec', aws: 15200, azure: 10300, gcp: 5800 },
  { month: 'Jan', aws: 14800, azure: 10100, gcp: 5600 },
];

const recentActivity = [
  { id: 1, type: 'created', icon: <AddCircleIcon />, color: 'success.main', resource: 'ec2-prod-api-03', provider: 'AWS', time: '5 min ago', detail: 't3.large • us-east-1' },
  { id: 2, type: 'alert', icon: <WarningAmberIcon />, color: 'warning.main', resource: 'Cost Anomaly', provider: 'Azure', time: '23 min ago', detail: '+18% spend in eastus' },
  { id: 3, type: 'deleted', icon: <DeleteIcon />, color: 'error.main', resource: 'old-backup-bucket', provider: 'GCP', time: '1 hr ago', detail: 'us-central1 • 240 GB freed' },
  { id: 4, type: 'updated', icon: <RefreshIcon />, color: 'info.main', resource: 'rds-mysql-prod', provider: 'AWS', time: '2 hr ago', detail: 'Scaled up to db.r6g.xlarge' },
  { id: 5, type: 'alert', icon: <ErrorIcon />, color: 'error.main', resource: 'Quota Warning', provider: 'Azure', time: '3 hr ago', detail: 'VM cores at 85% limit' },
];

const providerHealth = [
  { name: 'AWS', status: 'healthy', resources: 142, usage: 72, color: '#FF9900' },
  { name: 'Azure', status: 'healthy', resources: 98, usage: 85, color: '#0078D4' },
  { name: 'GCP', status: 'warning', resources: 61, usage: 58, color: '#4285F4' },
];

export default function Dashboard() {
  const [period] = useState('7d'); // eslint-disable-line no-unused-vars

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

      {/* Summary cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Total Resources"
            value="301"
            subtitle="Across 3 providers"
            icon={<StorageIcon />}
            color="primary"
            trend="up"
            trendValue="+12 this week"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Monthly Cost"
            value="$30,700"
            subtitle="Jan 2025 estimate"
            icon={<AttachMoneyIcon />}
            color="secondary"
            trend="up"
            trendValue="+4.2% vs last month"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Active Alerts"
            value="7"
            subtitle="3 critical, 4 warnings"
            icon={<WarningAmberIcon />}
            color="warning"
            trend="down"
            trendValue="-2 resolved today"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Cloud Providers"
            value="3"
            subtitle="AWS · Azure · GCP"
            icon={<CloudIcon />}
            color="success"
            trend="flat"
            trendValue="All connected"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Cost Trend Chart */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">Cost Trend</Typography>
                <Chip label="Monthly" size="small" variant="outlined" />
              </Box>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={costTrendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => [`$${v.toLocaleString()}`, '']} />
                  <Legend />
                  <Line type="monotone" dataKey="aws" name="AWS" stroke="#FF9900" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="azure" name="Azure" stroke="#0078D4" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="gcp" name="GCP" stroke="#4285F4" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Provider Health */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Provider Health</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {providerHealth.map((p) => (
                  <Box key={p.name}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: p.color }} />
                        <Typography variant="body2" fontWeight={600}>{p.name}</Typography>
                        <Chip
                          label={p.status}
                          size="small"
                          color={p.status === 'healthy' ? 'success' : 'warning'}
                          sx={{ height: 18, fontSize: 10 }}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {p.resources} resources
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={p.usage}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: 'grey.100',
                        '& .MuiLinearProgress-bar': { bgcolor: p.color, borderRadius: 3 },
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">{p.usage}% capacity used</Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6">Recent Activity</Typography>
                <Button size="small" variant="text">View all</Button>
              </Box>
              <List disablePadding>
                {recentActivity.map((item, idx) => (
                  <React.Fragment key={item.id}>
                    {idx > 0 && <Divider component="li" />}
                    <ListItem alignItems="flex-start" sx={{ px: 0, py: 1.5 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'transparent', color: item.color, border: '1px solid', borderColor: item.color, width: 36, height: 36 }}>
                          {item.icon}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontWeight={600}>{item.resource}</Typography>
                            <Chip label={item.provider} size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
                          </Box>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.25 }}>
                            <Typography variant="caption" color="text.secondary">{item.detail}</Typography>
                            <Typography variant="caption" color="text.secondary">{item.time}</Typography>
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
