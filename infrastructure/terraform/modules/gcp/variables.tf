variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region to deploy resources into"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "GCP zone for zonal resources. Leave empty for regional cluster."
  type        = string
  default     = ""
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "cluster_name" {
  description = "Name of the GKE cluster and resource prefix"
  type        = string
}

variable "gke_subnet_cidr" {
  description = "CIDR block for the GKE subnet"
  type        = string
  default     = "10.2.0.0/24"
}

variable "pods_cidr" {
  description = "Secondary CIDR range for GKE pods"
  type        = string
  default     = "10.100.0.0/16"
}

variable "services_cidr" {
  description = "Secondary CIDR range for GKE services"
  type        = string
  default     = "10.101.0.0/16"
}

variable "master_ipv4_cidr" {
  description = "CIDR range for the GKE master network"
  type        = string
  default     = "172.16.0.0/28"
}

variable "master_authorized_networks" {
  description = "Networks authorized to access the GKE master endpoint"
  type = list(object({
    cidr_block   = string
    display_name = string
  }))
  default = []
}

variable "machine_type" {
  description = "Machine type for GKE worker nodes"
  type        = string
  default     = "e2-standard-2"
}

variable "node_count" {
  description = "Initial number of nodes per zone"
  type        = number
  default     = 1
}

variable "node_min_count" {
  description = "Minimum number of nodes per zone for autoscaling"
  type        = number
  default     = 1
}

variable "node_max_count" {
  description = "Maximum number of nodes per zone for autoscaling"
  type        = number
  default     = 5
}

variable "db_tier" {
  description = "Cloud SQL machine tier"
  type        = string
  default     = "db-f1-micro"
}

variable "db_name" {
  description = "Name of the initial database"
  type        = string
  default     = "cloudmgmt"
}

variable "db_username" {
  description = "Username for the Cloud SQL database"
  type        = string
  default     = "cloudmgmt_admin"
}

variable "db_password" {
  description = "Password for the Cloud SQL database user"
  type        = string
  sensitive   = true
  validation {
    condition     = length(var.db_password) >= 16
    error_message = "Database password must be at least 16 characters."
  }
}
