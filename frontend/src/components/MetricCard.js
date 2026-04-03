import React from 'react';
import { Card, CardContent, Box, Typography, Avatar } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';

export default function MetricCard({ title, value, subtitle, icon, color = 'primary', trend, trendValue }) {
  const colors = {
    primary: { bg: '#e8eaf6', icon: '#1a237e' },
    secondary: { bg: '#e1f5fe', icon: '#0288d1' },
    success: { bg: '#e8f5e9', icon: '#2e7d32' },
    warning: { bg: '#fff3e0', icon: '#ed6c02' },
    error: { bg: '#ffebee', icon: '#d32f2f' },
    info: { bg: '#e3f2fd', icon: '#0277bd' },
  };

  const palette = colors[color] || colors.primary;

  const TrendIcon =
    trend === 'up' ? TrendingUpIcon
    : trend === 'down' ? TrendingDownIcon
    : TrendingFlatIcon;

  const trendColor =
    trend === 'up' ? '#2e7d32'
    : trend === 'down' ? '#d32f2f'
    : '#757575';

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary" fontWeight={500} gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
            {trendValue && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 0.5 }}>
                <TrendIcon sx={{ fontSize: 16, color: trendColor }} />
                <Typography variant="caption" sx={{ color: trendColor, fontWeight: 600 }}>
                  {trendValue}
                </Typography>
              </Box>
            )}
          </Box>
          {icon && (
            <Avatar
              sx={{
                bgcolor: palette.bg,
                color: palette.icon,
                width: 52,
                height: 52,
                ml: 2,
              }}
            >
              {icon}
            </Avatar>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
