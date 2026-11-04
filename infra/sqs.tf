resource "aws_sqs_queue" "cover_art_dlq" {
  name                      = "playlistfox-cover-art-dlq"
  message_retention_seconds = 1209600
}

resource "aws_sqs_queue" "cover_art" {
  name                       = "playlistfox-cover-art"
  visibility_timeout_seconds = 720
  message_retention_seconds  = 3600

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.cover_art_dlq.arn
    maxReceiveCount     = 2
  })
}