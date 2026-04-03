output "cluster_endpoint" {
  description = "Endpoint URL of the AKS cluster API server"
  value       = azurerm_kubernetes_cluster.main.kube_config[0].host
  sensitive   = true
}

output "cluster_name" {
  description = "Name of the AKS cluster"
  value       = azurerm_kubernetes_cluster.main.name
}

output "resource_group_name" {
  description = "Name of the Azure resource group"
  value       = azurerm_resource_group.main.name
}

output "vpc_id" {
  description = "ID of the Azure virtual network"
  value       = azurerm_virtual_network.main.id
}

output "kube_config" {
  description = "Raw kubeconfig for the AKS cluster"
  value       = azurerm_kubernetes_cluster.main.kube_config_raw
  sensitive   = true
}

output "db_endpoint" {
  description = "FQDN of the PostgreSQL flexible server"
  value       = azurerm_postgresql_flexible_server.main.fqdn
}

output "db_name" {
  description = "Name of the PostgreSQL database"
  value       = azurerm_postgresql_flexible_server_database.main.name
}

output "log_analytics_workspace_id" {
  description = "ID of the Log Analytics workspace"
  value       = azurerm_log_analytics_workspace.main.id
}
