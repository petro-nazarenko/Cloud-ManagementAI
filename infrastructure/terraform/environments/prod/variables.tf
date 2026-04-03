variable "cluster_name" {
  description = "Base name for all cloud clusters"
  type        = string
  default     = "cloud-mgmt-prod"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "azure_location" {
  description = "Azure region"
  type        = string
  default     = "eastus"
}

variable "gcp_project_id" {
  description = "GCP project ID"
  type        = string
}

variable "gcp_region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "db_name" {
  description = "Database name across all clouds"
  type        = string
  default     = "cloudmgmt"
}

variable "db_username" {
  description = "Database admin username across all clouds"
  type        = string
  default     = "cloudmgmt_admin"
}

variable "aws_db_password" {
  description = "Database password for AWS RDS"
  type        = string
  sensitive   = true
}

variable "azure_db_password" {
  description = "Database password for Azure PostgreSQL"
  type        = string
  sensitive   = true
}

variable "gcp_db_password" {
  description = "Database password for GCP Cloud SQL"
  type        = string
  sensitive   = true
}
