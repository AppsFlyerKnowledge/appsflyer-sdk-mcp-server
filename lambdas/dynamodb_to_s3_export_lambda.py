import io
import json
import os
from decimal import Decimal
from typing import Any, Dict, Iterable

import boto3


def _decimal_to_number(value: Decimal) -> Any:
    if value % 1 == 0:
        return int(value)
    return float(value)


def _normalize_dynamodb_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        return _decimal_to_number(value)
    if isinstance(value, dict):
        return {k: _normalize_dynamodb_value(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_normalize_dynamodb_value(v) for v in value]
    return value


def _iter_scan_items(table) -> Iterable[Dict[str, Any]]:
    response = table.scan()
    for item in response.get("Items", []):
        yield item

    while "LastEvaluatedKey" in response:
        response = table.scan(ExclusiveStartKey=response["LastEvaluatedKey"])
        for item in response.get("Items", []):
            yield item


def lambda_handler(event, context):
    del event, context

    table_name = "mcp_tool_sessions"
    bucket_name = os.getenv("EXPORT_BUCKET_NAME")
    object_key = os.getenv("EXPORT_OBJECT_KEY", f"exports/{table_name}.ndjson")

    if not bucket_name:
        return {
            "statusCode": 500,
            "body": json.dumps(
                {"ok": False, "error": "missing_env_var_EXPORT_BUCKET_NAME"}
            ),
        }

    dynamodb = boto3.resource("dynamodb")
    s3_client = boto3.client("s3")
    table = dynamodb.Table(table_name)

    line_buffer = io.StringIO()
    exported_count = 0

    try:
        for item in _iter_scan_items(table):
            normalized_item = _normalize_dynamodb_value(item)
            line_buffer.write(json.dumps(normalized_item, ensure_ascii=False))
            line_buffer.write("\n")
            exported_count += 1

        s3_client.put_object(
            Bucket=bucket_name,
            Key=object_key,
            Body=line_buffer.getvalue().encode("utf-8"),
            ContentType="application/x-ndjson",
        )

        return {
            "statusCode": 200,
            "body": json.dumps(
                {
                    "ok": True,
                    "table": table_name,
                    "bucket": bucket_name,
                    "key": object_key,
                    "exportedRows": exported_count,
                }
            ),
        }
    except Exception as exc:
        print(f"dynamodb_export_error: {exc}")
        return {
            "statusCode": 500,
            "body": json.dumps({"ok": False, "error": "export_failed"}),
        }
