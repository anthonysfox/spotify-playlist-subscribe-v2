resource "aws_iam_user" "vercel" {
  name = "playlistfox-vercel"
}

data "aws_iam_policy_document" "vercel" {
  statement {
    actions = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.cover_art.arn]
  }

  statement {
    actions = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.cover_art.arn}/previews/*"]
  }

  statement {
    actions = ["s3:ListBucket"]
    resources = [aws_s3_bucket.cover_art.arn]
    condition {
      test = "StringLike"
      variable = "s3:prefix"
      values = ["previews/*"]
    }
  }
}

resource "aws_iam_user_policy" "vercel" {
  user = aws_iam_user.vercel.name
  policy = data.aws_iam_policy_document.vercel.json
}