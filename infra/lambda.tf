data "archive_file" "cover_art" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/cover-art/dist"
  output_path = "${path.module}/build/cover-art.zip"
}

resource "aws_cloudwatch_log_group" "cover_art" {
  name              = "/aws/lambda/playlistfox-cover-art"
  retention_in_days = 14
}

resource "aws_lambda_function" "cover_art" {
  function_name    = "playlistfox-cover-art"
  role             = aws_iam_role.cover_art_lambda.arn
  runtime          = "nodejs22.x"
  architectures    = ["arm64"]
  handler          = "index.handler"
  filename         = data.archive_file.cover_art.output_path
  source_code_hash = data.archive_file.cover_art.output_base64sha256
  timeout          = 120
  memory_size      = 1024

  environment {
    variables = {
      COVER_ART_BUCKET = aws_s3_bucket.cover_art.bucket
      AI_KEY_PARAM     = local.ai_key_param
    }
  }

  depends_on = [aws_cloudwatch_log_group.cover_art]
}

resource "aws_lambda_event_source_mapping" "cover_art" {
  event_source_arn        = aws_sqs_queue.cover_art.arn
  function_name           = aws_lambda_function.cover_art.arn
  batch_size              = 1
  function_response_types = ["ReportBatchItemFailures"]

  scaling_config {
    maximum_concurrency = 2
  }
}