terraform {
  required_version = ">= 1.6.0"

  backend "s3" {
    bucket         = "cloud-mgmt-terraform-state-dev"
    key            = "dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "cloud-mgmt-terraform-lock"
    encrypt        = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

module "aws" {
  source = "../../modules/aws"

  region       = var.region
  environment  = "dev"
  cluster_name = var.cluster_name

  vpc_cidr             = "10.0.0.0/16"
  public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnet_cidrs = ["10.0.11.0/24", "10.0.12.0/24"]

  kubernetes_version = "1.29"
  instance_type      = "t3.medium"
  node_desired_size  = 2
  node_min_size      = 1
  node_max_size      = 4

  db_instance_class    = "db.t3.medium"
  db_allocated_storage = 20
  db_name              = var.db_name
  db_username          = var.db_username
  db_password          = var.db_password
}

output "cluster_endpoint" {
  value = module.aws.cluster_endpoint
}

output "cluster_name" {
  value = module.aws.cluster_name
}

output "vpc_id" {
  value = module.aws.vpc_id
}

output "db_endpoint" {
  value = module.aws.db_endpoint
}
