#Settings for terraform itself
terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws" # where to get the plugin
      version = "~> 6.0"        # any 6.x version, never 7.0
    }

    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.7"
    }
  }

  backend "s3" {
    bucket       = "playlistfox-tfstate-734169003262"
    key          = "infra/terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true
  }
}

# Configure the AWS plugin. Credentials come from AWS_PROFILE automatically
provider "aws" {
  region = "us-east-1"

  # Tag every resource Terraform creates, so you can find them in the console
  default_tags {
    tags = {
      Project   = "playlistfox"
      ManagedBy = "terraform"
    }
  }
}