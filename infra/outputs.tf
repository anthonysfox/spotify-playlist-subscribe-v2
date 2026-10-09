output "cover_art_bucket_name" {
  value       = aws_s3_bucket.cover_art.bucket
  description = "Name of the S3bucket for cover art previews"
}