import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TablePagination,
  Chip, TextField, InputAdornment, Select, MenuItem, FormControl,
  InputLabel, IconButton, Tooltip, Skeleton, Alert, Dialog,
  DialogTitle, DialogContent, DialogActions, Button,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { auditAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ACTION_COLORS = {
  create: 'success',
  update: 'info',
  delete: 'error',
  'role-change': 'warning',
  login: 'default',
};

const PAGE_SIZE_OPTIONS = [25, 50, 100];

export default function AuditLog() {
  const { user } = useAuth();
  const [rows, setRows]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [emailSearch, setEmailSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const canView = user?.role === 'admin' || user?.role === 'operator';

  const fetchLogs = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setError('');
    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        ...(actionFilter && { action: actionFilter }),
        ...(resourceFilter && { resource: resourceFilter }),
        ...(emailSearch && { userEmail: emailSearch }),
      };
      const res = await auditAPI.list(params);
      setRows(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch {
      setError('Failed to load audit logs. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, actionFilter, resourceFilter, emailSearch, canView]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  if (!canView) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">Access denied — audit log requires admin or operator role.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Audit Log</Typography>
          <Typography variant="body2" color="text.secondary">
            {total.toLocaleString()} events recorded
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={fetchLogs} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Filters */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: 2, pb: '12px !important' }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Search by email…"
              value={emailSearch}
              onChange={(e) => { setEmailSearch(e.target.value); setPage(0); }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
              sx={{ minWidth: 200 }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Action</InputLabel>
              <Select
                label="Action"
                value={actionFilter}
                onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
              >
                <MenuItem value="">All</MenuItem>
                {['create', 'update', 'delete', 'role-change'].map((a) => (
                  <MenuItem key={a} value={a}>{a}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Resource</InputLabel>
              <Select
                label="Resource"
                value={resourceFilter}
                onChange={(e) => { setResourceFilter(e.target.value); setPage(0); }}
              >
                <MenuItem value="">All</MenuItem>
                {['resource', 'user', 'provider', 'recommendation'].map((r) => (
                  <MenuItem key={r} value={r}>{r}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Resource</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Resource ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>IP</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading
                ? Array.from({ length: rowsPerPage > 10 ? 8 : rowsPerPage }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <TableCell key={j}><Skeleton variant="text" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : rows.length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No audit log entries found.
                      </TableCell>
                    </TableRow>
                  )
                  : rows.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                        {new Date(row.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{row.userEmail || row.userId || '—'}</TableCell>
                      <TableCell>
                        <Chip
                          label={row.action}
                          size="small"
                          color={ACTION_COLORS[row.action] || 'default'}
                          variant="outlined"
                          sx={{ fontSize: 11, height: 20 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{row.resource}</TableCell>
                      <TableCell sx={{ fontSize: 11, color: 'text.secondary' }}>
                        {row.resourceId ? row.resourceId.slice(0, 12) + (row.resourceId.length > 12 ? '…' : '') : '—'}
                      </TableCell>
                      <TableCell sx={{ fontSize: 11, color: 'text.secondary' }}>{row.ip || '—'}</TableCell>
                      <TableCell align="center">
                        {(row.before || row.after) && (
                          <Tooltip title="View diff">
                            <IconButton size="small" onClick={() => setSelected(row)}>
                              <InfoOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={PAGE_SIZE_OPTIONS}
        />
      </Card>

      {/* Detail dialog */}
      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} maxWidth="md" fullWidth>
        <DialogTitle>Audit Entry — {selected?.action} / {selected?.resource}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="caption" color="text.secondary">
            {selected && new Date(selected.createdAt).toLocaleString()} &nbsp;·&nbsp; {selected?.userEmail}
          </Typography>
          {selected?.before && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Before</Typography>
              <Box component="pre" sx={{ bgcolor: 'grey.50', p: 1.5, borderRadius: 1, fontSize: 12, overflow: 'auto', maxHeight: 200 }}>
                {JSON.stringify(selected.before, null, 2)}
              </Box>
            </Box>
          )}
          {selected?.after && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>After</Typography>
              <Box component="pre" sx={{ bgcolor: 'grey.50', p: 1.5, borderRadius: 1, fontSize: 12, overflow: 'auto', maxHeight: 200 }}>
                {JSON.stringify(selected.after, null, 2)}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelected(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
