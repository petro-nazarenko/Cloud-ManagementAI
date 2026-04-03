output "cluster_endpoint" {
  description = "Endpoint URL of the GKE cluster API server"
  value       = "https://${google_container_cluster.main.endpoint}"
  sensitive   = true
}

output "cluster_name" {
  description = "Name of the GKE cluster"
  value       = google_container_cluster.main.name
}

output "vpc_id" {
  description = "Self-link of the GCP VPC network"
  value       = google_compute_network.main.self_link
}

output "subnet_id" {
  description = "Self-link of the GKE subnet"
  value       = google_compute_subnetwork.gke.self_link
}

output "cluster_ca_certificate" {
  description = "Base64-encoded public certificate of the cluster's CA"
  value       = google_container_cluster.main.master_auth[0].cluster_ca_certificate
  sensitive   = true
}

output "db_endpoint" {
  description = "Private IP address of the Cloud SQL instance"
  value       = google_sql_database_instance.main.private_ip_address
}

output "db_connection_name" {
  description = "Connection name for the Cloud SQL instance (for Cloud SQL Proxy)"
  value       = google_sql_database_instance.main.connection_name
}

output "db_name" {
  description = "Name of the Cloud SQL database"
  value       = google_sql_database.main.name
}
