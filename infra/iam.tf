data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "cover_art_lambda" {
  name               = "playlistfox-cover-art-lambda"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

resource "aws_iam_role_policy_attachment" "cover_art_logs" {
  role       = aws_iam_role.cover_art_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

locals {
  ai_key_param = "/playlistfox/ai-gateway-api-key"
}

data "aws_iam_policy_document" "cover_art_lambda" {
  statement {
    actions   = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"]
    resources = [aws_sqs_queue.cover_art.arn]
  }

  statement {
    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.cover_art.arn}/previews/*"]
  }

  statement {
    actions   = ["ssm:GetParameter"]
    resources = ["arn:aws:ssm:us-east-1:${data.aws_caller_identity.current.account_id}:parameter${local.ai_key_param}"]
  }
}

resource "aws_iam_role_policy" "cover_art_lambda" {
  role   = aws_iam_role.cover_art_lambda.id
  policy = data.aws_iam_policy_document.cover_art_lambda.json
}