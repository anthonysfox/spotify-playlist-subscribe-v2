data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "cover_art" {
  bucket = "playlistfox-cover-art-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_public_access_block" "cover_art" {
  bucket = aws_s3_bucket.cover_art.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "cover_art" {
  bucket = aws_s3_bucket.cover_art.id

  rule {
    id     = "expire-previews"
    status = "Enabled"

    filter {
      prefix = "previews/"
    }

    expiration {
      days = 1
    }
  }
}
