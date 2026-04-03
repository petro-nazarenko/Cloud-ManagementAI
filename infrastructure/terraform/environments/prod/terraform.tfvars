aws_region     = "us-east-1"
cluster_name   = "cloud-mgmt-prod"

gcp_project_id = "REPLACE_WITH_GCP_PROJECT_ID"
gcp_region     = "us-central1"

azure_location = "eastus"

db_name        = "cloudmgmt"
db_username    = "cloudmgmt_admin"
# Sensitive passwords are provided via TF_VAR_* environment variables or a secrets manager:
#   export TF_VAR_aws_db_password=<secret>
#   export TF_VAR_azure_db_password=<secret>
#   export TF_VAR_gcp_db_password=<secret>
