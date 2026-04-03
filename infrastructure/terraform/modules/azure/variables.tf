variable "location" {
  description = "Azure region to deploy resources into"
  type        = string
  default     = "eastus"
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
  description = "Name of the AKS cluster and resource prefix"
  type        = string
}

variable "kubernetes_version" {
  description = "Kubernetes version for the AKS cluster"
  type        = string
  default     = "1.29"
}

variable "vnet_cidr" {
  description = "CIDR block for the virtual network"
  type        = string
  default     = "10.1.0.0/16"
}

variable "aks_subnet_cidr" {
  description = "CIDR block for the AKS subnet"
  type        = string
  default     = "10.1.1.0/24"
}

variable "db_subnet_cidr" {
  description = "CIDR block for the database subnet"
  type        = string
  default     = "10.1.2.0/24"
}

variable "node_vm_size" {
  description = "VM size for AKS worker nodes"
  type        = string
  default     = "Standard_D2s_v3"
}

variable "node_count" {
  description = "Initial number of worker nodes"
  type        = number
  default     = 2
}

variable "node_min_count" {
  description = "Minimum number of worker nodes for autoscaling"
  type        = number
  default     = 1
}

variable "node_max_count" {
  description = "Maximum number of worker nodes for autoscaling"
  type        = number
  default     = 5
}

variable "db_username" {
  description = "Administrator login for the PostgreSQL server"
  type        = string
  default     = "cloudmgmt_admin"
}

variable "db_password" {
  description = "Administrator password for the PostgreSQL server"
  type        = string
  sensitive   = true
  validation {
    condition     = length(var.db_password) >= 16
    error_message = "Database password must be at least 16 characters."
  }
}

variable "db_name" {
  description = "Name of the initial database"
  type        = string
  default     = "cloudmgmt"
}

variable "db_sku_name" {
  description = "SKU name for the PostgreSQL flexible server"
  type        = string
  default     = "B_Standard_B1ms"
}

variable "db_storage_mb" {
  description = "Storage size in MB for the PostgreSQL server"
  type        = number
  default     = 32768
}
