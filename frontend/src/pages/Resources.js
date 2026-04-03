import React, { useState, useMemo } from 'react';
import {
  Box, Card, CardContent, Typography, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TablePagination,
  Chip, TextField, InputAdornment, Select, MenuItem, FormControl,
  InputLabel, Button, IconButton, Tooltip, Skeleton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

const STATUS_COLORS = {
  running: 'success',
  stopped: 'error',
  pending: 'warning',
  terminated: 'default',
  healthy: 'success',
  degraded: 'warning',
};

const MOCK_RESOURCES = [
  { id: 'r1',  provider: 'AWS',   type: 'EC2',          name: 'ec2-prod-api-01',      status: 'running',    region: 'us-east-1',      cost: 142.50 },
  { id: 'r2',  provider: 'AWS',   type: 'EC2',          name: 'ec2-prod-api-02',      status: 'running',    region: 'us-east-1',      cost: 142.50 },
  { id: 'r3',  provider: 'AWS',   type: 'EC2',          name: 'ec2-staging-01',       status: 'stopped',    region: 'us-west-2',      cost: 0.00 },
  { id: 'r4',  provider: 'AWS',   type: 'RDS',          name: 'rds-mysql-prod',       status: 'running',    region: 'us-east-1',      cost: 310.80 },
  { id: 'r5',  provider: 'AWS',   type: 'S3',           name: 'prod-assets-bucket',   status: 'healthy',    region: 'us-east-1',      cost: 28.40 },
  { id: 'r6',  provider: 'AWS',   type: 'Lambda',       name: 'process-events-fn',    status: 'running',    region: 'us-east-1',      cost: 4.20 },
  { id: 'r7',  provider: 'AWS',   type: 'EKS',          name: 'prod-k8s-cluster',     status: 'running',    region: 'us-east-1',      cost: 720.00 },
  { id: 'r8',  provider: 'AWS',   type: 'CloudFront',   name: 'cdn-distribution',     status: 'running',    region: 'global',         cost: 55.10 },
  { id: 'r9',  provider: 'Azure', type: 'VM',           name: 'vm-prod-web-01',       status: 'running',    region: 'eastus',         cost: 98.40 },
  { id: 'r10', provider: 'Azure', type: 'VM',           name: 'vm-prod-web-02',       status: 'running',    region: 'eastus',         cost: 98.40 },
  { id: 'r11', provider: 'Azure', type: 'SQL Database', name: 'azure-sql-prod',       status: 'running',    region: 'eastus',         cost: 240.00 },
  { id: 'r12', provider: 'Azure', type: 'AKS',          name: 'aks-prod-cluster',     status: 'running',    region: 'westeurope',     cost: 580.00 },
  { id: 'r13', provider: 'Azure', type: 'Storage',      name: 'prod-storage-account', status: 'healthy',    region: 'eastus',         cost: 18.60 },
  { id: 'r14', provider: 'Azure', type: 'Cosmos DB',    name: 'cosmosdb-analytics',   status: 'running',    region: 'eastus2',        cost: 420.00 },
  { id: 'r15', provider: 'Azure', type: 'VM',           name: 'vm-dev-01',            status: 'stopped',    region: 'eastus',         cost: 0.00 },
  { id: 'r16', provider: 'GCP',   type: 'GCE',          name: 'gce-prod-api-01',      status: 'running',    region: 'us-central1',    cost: 88.20 },
  { id: 'r17', provider: 'GCP',   type: 'GKE',          name: 'gke-prod-cluster',     status: 'running',    region: 'us-central1',    cost: 490.00 },
  { id: 'r18', provider: 'GCP',   type: 'Cloud SQL',    name: 'cloudsql-postgres',    status: 'running',    region: 'us-central1',    cost: 195.60 },
  { id: 'r19', provider: 'GCP',   type: 'GCS',          name: 'ml-training-data',     status: 'healthy',    region: 'us-central1',    cost: 12.80 },
  { id: 'r20', provider: 'GCP',   type: 'Cloud Run',    name: 'api-gateway-service',  status: 'running',    region: 'us-central1',    cost: 22.40 },
  { id: 'r21', provider: 'GCP',   type: 'GCE',          name: 'gce-staging-01',       status: 'pending',    region: 'europe-west1',   cost: 44.10 },
];

const PROVIDER_COLORS = { AWS: '#FF9900', Azure: '#0078D4', GCP: '#4285F4' };

export default function Resources() {
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    return MOCK_RESOURCES.filter((r) => {
      const matchProvider = providerFilter === 'All' || r.provider === providerFilter;
      const matchStatus = statusFilter === 'All' || r.status === statusFilter;
      const matchSearch =
        !search ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.type.toLowerCase().includes(search.toLowerCase()) ||
        r.region.toLowerCase().includes(search.toLowerCase());
      return matchProvider && matchStatus && matchSearch;
    });
  }, [search, providerFilter, statusFilter]);

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1200);
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Resources</Typography>
          <Typography variant="body2" color="text.secondary">
            {filtered.length} of {MOCK_RESOURCES.length} resources
          </Typography>
        </Box>
        <Tooltip title="Sync resources">
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            size="small"
          >
            Sync
          </Button>
        </Tooltip>
      </Box>

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
                <MenuItem value="All">All Providers</MenuItem>
                <MenuItem value="AWS">AWS</MenuItem>
                <MenuItem value="Azure">Azure</MenuItem>
                <MenuItem value="GCP">GCP</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              >
                <MenuItem value="All">All Statuses</MenuItem>
                <MenuItem value="running">Running</MenuItem>
                <MenuItem value="stopped">Stopped</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="healthy">Healthy</MenuItem>
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
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <TableCell key={j}><Skeleton variant="text" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  : paginated.map((resource) => (
                      <TableRow
                        key={resource.id}
                        hover
                        sx={{ '&:last-child td': { border: 0 } }}
                      >
                        <TableCell>
                          <Chip
                            label={resource.provider}
                            size="small"
                            sx={{
                              bgcolor: PROVIDER_COLORS[resource.provider] + '22',
                              color: PROVIDER_COLORS[resource.provider],
                              fontWeight: 600,
                              border: `1px solid ${PROVIDER_COLORS[resource.provider]}44`,
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
                            {resource.cost === 0 ? '—' : `$${resource.cost.toFixed(2)}`}
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
                    ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={filtered.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(+e.target.value); setPage(0); }}
            rowsPerPageOptions={[5, 10, 25]}
          />
        </CardContent>
      </Card>
    </Box>
  );
}
