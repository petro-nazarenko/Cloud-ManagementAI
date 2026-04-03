import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, AppBar, Toolbar, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, Typography, IconButton, Avatar,
  Menu, MenuItem, Divider, Tooltip, Badge,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import StorageIcon from '@mui/icons-material/Storage';
import BarChartIcon from '@mui/icons-material/BarChart';
import CloudIcon from '@mui/icons-material/Cloud';
import SettingsIcon from '@mui/icons-material/Settings';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { useAuth } from '../context/AuthContext';

const DRAWER_WIDTH = 240;
const MINI_WIDTH = 64;

const navItems = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { label: 'Resources', icon: <StorageIcon />, path: '/resources' },
  { label: 'Analytics', icon: <BarChartIcon />, path: '/analytics' },
  { label: 'Providers', icon: <CloudIcon />, path: '/providers' },
  { label: 'Settings', icon: <SettingsIcon />, path: '/settings' },
];

const mockAlerts = [
  { id: 1, text: 'High CPU usage on prod-server-01', time: '2m ago' },
  { id: 2, text: 'Cost anomaly detected in AWS us-east-1', time: '15m ago' },
  { id: 3, text: 'Azure subscription quota at 85%', time: '1h ago' },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [userAnchor, setUserAnchor] = useState(null);
  const [notifAnchor, setNotifAnchor] = useState(null);

  const drawerWidth = collapsed ? MINI_WIDTH : DRAWER_WIDTH;

  const handleNav = (path) => navigate(path);
  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            bgcolor: '#1a237e',
            color: 'white',
            transition: 'width 0.25s ease',
            overflowX: 'hidden',
            borderRight: 'none',
          },
        }}
      >
        {/* Logo */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: 2,
            py: 2,
            minHeight: 64,
            gap: 1.5,
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <Avatar sx={{ bgcolor: '#ffffff22', width: 36, height: 36 }}>
            <CloudIcon sx={{ fontSize: 20, color: 'white' }} />
          </Avatar>
          {!collapsed && (
            <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ color: 'white', flex: 1, lineHeight: 1.2 }}>
              Cloud<br />
              <span style={{ fontWeight: 400, fontSize: '0.75rem', opacity: 0.8 }}>Management AI</span>
            </Typography>
          )}
          <IconButton
            size="small"
            onClick={() => setCollapsed(!collapsed)}
            sx={{ color: 'rgba(255,255,255,0.7)', ml: 'auto' }}
          >
            {collapsed ? <MenuIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
          </IconButton>
        </Box>

        {/* Nav Items */}
        <List sx={{ pt: 1, px: 1 }}>
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Tooltip key={item.path} title={collapsed ? item.label : ''} placement="right">
                <ListItem disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => handleNav(item.path)}
                    sx={{
                      borderRadius: 2,
                      minHeight: 44,
                      bgcolor: active ? 'rgba(255,255,255,0.15)' : 'transparent',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                      px: collapsed ? 1.5 : 2,
                      justifyContent: collapsed ? 'center' : 'flex-start',
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        color: active ? 'white' : 'rgba(255,255,255,0.65)',
                        minWidth: collapsed ? 0 : 36,
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    {!collapsed && (
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{
                          fontSize: 14,
                          fontWeight: active ? 600 : 400,
                          color: active ? 'white' : 'rgba(255,255,255,0.75)',
                        }}
                      />
                    )}
                  </ListItemButton>
                </ListItem>
              </Tooltip>
            );
          })}
        </List>
      </Drawer>

      {/* Main area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <AppBar
          position="static"
          elevation={0}
          sx={{
            bgcolor: 'white',
            borderBottom: '1px solid',
            borderColor: 'divider',
            color: 'text.primary',
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between', minHeight: 64 }}>
            <Typography variant="h6" fontWeight={600} color="primary">
              {navItems.find((n) => isActive(n.path))?.label || 'Dashboard'}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* Notifications */}
              <Tooltip title="Notifications">
                <IconButton onClick={(e) => setNotifAnchor(e.currentTarget)}>
                  <Badge badgeContent={mockAlerts.length} color="error">
                    <NotificationsIcon />
                  </Badge>
                </IconButton>
              </Tooltip>

              {/* User avatar */}
              <Tooltip title={user?.name || 'User'}>
                <IconButton onClick={(e) => setUserAnchor(e.currentTarget)} sx={{ p: 0.5 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontSize: 14 }}>
                    {user?.avatar || <PersonIcon />}
                  </Avatar>
                </IconButton>
              </Tooltip>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Notification menu */}
        <Menu
          anchorEl={notifAnchor}
          open={Boolean(notifAnchor)}
          onClose={() => setNotifAnchor(null)}
          PaperProps={{ sx: { width: 320, maxHeight: 400 } }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem disabled>
            <Typography variant="subtitle2" fontWeight={700}>Notifications</Typography>
          </MenuItem>
          <Divider />
          {mockAlerts.map((a) => (
            <MenuItem key={a.id} onClick={() => setNotifAnchor(null)} sx={{ whiteSpace: 'normal' }}>
              <Box>
                <Typography variant="body2">{a.text}</Typography>
                <Typography variant="caption" color="text.secondary">{a.time}</Typography>
              </Box>
            </MenuItem>
          ))}
        </Menu>

        {/* User menu */}
        <Menu
          anchorEl={userAnchor}
          open={Boolean(userAnchor)}
          onClose={() => setUserAnchor(null)}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem disabled>
            <Box>
              <Typography variant="subtitle2" fontWeight={700}>{user?.name}</Typography>
              <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
            </Box>
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => { setUserAnchor(null); navigate('/settings'); }}>
            <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
            Profile
          </MenuItem>
          <MenuItem onClick={() => { setUserAnchor(null); logout(); }}>
            <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
            Sign out
          </MenuItem>
        </Menu>

        {/* Page content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
