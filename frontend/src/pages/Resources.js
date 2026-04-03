import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TablePagination,
  Chip, TextField, InputAdornment, Select, MenuItem, FormControl,
  InputLabel, Button, IconButton, Tooltip, Skeleton, Alert,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { resourcesAPI } from '../services/api';

const STATUS_COLORS = {
  running: 'success',
  stopped: 'error',
  pending: 'warning',
  terminated: 'default',
  healthy: 'success',
  degraded: 'warning',
  active: 'success',
  provisioning: 'warning',
};

const PROVIDER_COLORS = { aws: '#FF9900', azure: '#0078D4', gcp: '#4285F4' };
const PROVIDER_DISPLAY = { aws: 'AWS', azure: 'Azure', gcp: 'GCP' };

export default function Resources() {
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');

  const fetchResources = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        ...(providerFilter && { provider: providerFilter }),
        ...(statusFilter && { status: statusFilter }),
      };
      const res = await resourcesAPI.list(params);
      let rows = res.data.data || [];
      if (search) {
        const q = search.toLowerCase();
        rows = rows.filter((r) =>
          r.name?.toLowerCase().includes(q) ||
          r.type?.toLowerCase().includes(q) ||
          r.region?.toLowerCase().includes(q)
        );
      }
      setData(rows);
      setTotal(res.data.total || 0);
    } catch (err) {
      setError('Failed to load resources. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, providerFilter, statusFilter, search]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const handleRefresh = () => fetchResources();

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Resources</Typography>
          <Typography variant="body2" color="text.secondary">
            {total} resources across all providers
          </Typography>
        </Box>
        <Tooltip title="Sync resources">
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            size="small"
            disabled={loading}
          >
            Sync
          </Button>
        </Tooltip>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card>
        <CardContent sx={{ p: 3 }}>
          {/* Filters */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              placeholder="Search resources..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ flex: 1, minWidth: 220 }}
            />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Provider</InputLabel>
              <Select
                value={providerFilter}
                label="Provider"
                onChange={(e) => { setProviderFilter(e.target.value); setPage(0); }}
              >
                <MenuItem value="">All Providers</MenuItem>
                <MenuItem value="aws">AWS</MenuItem>
                <MenuItem value="azure">Azure</MenuItem>
                <MenuItem value="gcp">GCP</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="running">Running</MenuItem>
                <MenuItem value="stopped">Stopped</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="active">Active</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'grey.50' } }}>
                  <TableCell>Provider</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Region</TableCell>
                  <TableCell align="right">Monthly Cost</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading
                  ? Array.from({ length: rowsPerPage }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <TableCell key={j}><Skeleton variant="text" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  : data.map((resource) => {
                      const provColor = PROVIDER_COLORS[resource.provider] || '#666';
                      return (
                        <TableRow
                          key={resource.id}
                          hover
                          sx={{ '&:last-child td': { border: 0 } }}
                        >
                          <TableCell>
                            <Chip
                              label={PROVIDER_DISPLAY[resource.provider] || resource.provider}
                              size="small"
                              sx={{
                                bgcolor: provColor + '22',
                                color: provColor,
                                fontWeight: 600,
                                border: `1px solid ${provColor}44`,
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">{resource.type}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>{resource.name}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={resource.status}
                              size="small"
                              color={STATUS_COLORS[resource.status] || 'default'}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">{resource.region}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={600}>
                              {resource.monthlyCost ? `$${resource.monthlyCost.toFixed(2)}` : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="Open details">
                              <IconButton size="small">
                                <OpenInNewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(+e.target.value); setPage(0); }}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </CardContent>
      </Card>
    </Box>
  );
}
