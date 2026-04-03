terraform {
  required_version = ">= 1.6.0"

  backend "s3" {
    bucket         = "cloud-mgmt-terraform-state-prod"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "cloud-mgmt-terraform-lock-prod"
    encrypt        = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.100"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

module "aws" {
  source = "../../modules/aws"

  region       = var.aws_region
  environment  = "prod"
  cluster_name = "${var.cluster_name}-aws"

  vpc_cidr             = "10.0.0.0/16"
  public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnet_cidrs = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]

  kubernetes_version = "1.29"
  instance_type      = "t3.xlarge"
  node_desired_size  = 3
  node_min_size      = 2
  node_max_size      = 10

  db_instance_class    = "db.r6g.large"
  db_allocated_storage = 100
  db_name              = var.db_name
  db_username          = var.db_username
  db_password          = var.aws_db_password
}

module "azure" {
  source = "../../modules/azure"

  location     = var.azure_location
  environment  = "prod"
  cluster_name = "${var.cluster_name}-azure"

  vnet_cidr       = "10.1.0.0/16"
  aks_subnet_cidr = "10.1.1.0/24"
  db_subnet_cidr  = "10.1.2.0/24"

  kubernetes_version = "1.29"
  node_vm_size       = "Standard_D4s_v3"
  node_count         = 3
  node_min_count     = 2
  node_max_count     = 10

  db_username   = var.db_username
  db_password   = var.azure_db_password
  db_name       = var.db_name
  db_sku_name   = "GP_Standard_D2s_v3"
  db_storage_mb = 131072
}

module "gcp" {
  source = "../../modules/gcp"

  project_id   = var.gcp_project_id
  region       = var.gcp_region
  environment  = "prod"
  cluster_name = "${var.cluster_name}-gcp"

  gke_subnet_cidr = "10.2.0.0/24"
  pods_cidr       = "10.100.0.0/16"
  services_cidr   = "10.101.0.0/16"

  machine_type   = "e2-standard-4"
  node_count     = 2
  node_min_count = 2
  node_max_count = 10

  db_tier     = "db-custom-2-7680"
  db_name     = var.db_name
  db_username = var.db_username
  db_password = var.gcp_db_password
}

# ─── Outputs ─────────────────────────────────────────────────────────────────

output "aws_cluster_endpoint" {
  value = module.aws.cluster_endpoint
}

output "aws_cluster_name" {
  value = module.aws.cluster_name
}

output "aws_vpc_id" {
  value = module.aws.vpc_id
}

output "aws_db_endpoint" {
  value = module.aws.db_endpoint
}

output "azure_cluster_name" {
  value = module.azure.cluster_name
}

output "azure_resource_group" {
  value = module.azure.resource_group_name
}

output "azure_db_endpoint" {
  value = module.azure.db_endpoint
}

output "gcp_cluster_name" {
  value = module.gcp.cluster_name
}

output "gcp_vpc_id" {
  value = module.gcp.vpc_id
}

output "gcp_db_endpoint" {
  value = module.gcp.db_endpoint
}
