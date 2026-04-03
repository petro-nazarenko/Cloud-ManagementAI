variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "cloud-mgmt-dev"
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "cloudmgmt"
}

variable "db_username" {
  description = "Database admin username"
  type        = string
  default     = "cloudmgmt_admin"
}

variable "db_password" {
  description = "Database admin password"
  type        = string
  sensitive   = true
}
