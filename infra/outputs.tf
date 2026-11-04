output "cover_art_bucket_name" {
  value       = aws_s3_bucket.cover_art.bucket
  description = "Name of the S3bucket for cover art previews"
}

output "cover_art_queue_url" {
  value = aws_sqs_queue.cover_art.url
  description = "URL the website sends cover art jobs to"
}