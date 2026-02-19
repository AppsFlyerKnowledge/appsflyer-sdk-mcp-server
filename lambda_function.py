import json
import os
import uuid
from datetime import datetime, timezone

import boto3


ddb = boto3.resource("dynamodb")
table = ddb.Table(os.environ["TABLE_NAME"])


def _resp(code, body):
    return {
        "statusCode": code,
        "headers": {"content-type": "application/json"},
        "body": json.dumps(body),
    }


def handler(event, context):
    try:
        body = event.get("body") or "{}"
        payload = json.loads(body)
    except Exception:
        return _resp(400, {"ok": False, "error": "invalid_json"})

    try:
        session_id = payload.get("sessionId")
        tool_name = payload.get("toolName")
        status = payload.get("status")
        parameters = payload.get("parameters", {})
        if not isinstance(parameters, dict):
            parameters = {"value": parameters}
        incoming_timestamp = payload.get("timeStamp")

        if isinstance(incoming_timestamp, str) and incoming_timestamp.strip():
            timestamp = incoming_timestamp.strip()
        elif isinstance(incoming_timestamp, (int, float)):
            timestamp = datetime.fromtimestamp(
                int(incoming_timestamp) / 1000, tz=timezone.utc
            ).isoformat()
        else:
            timestamp = datetime.now(timezone.utc).isoformat()

        if not session_id or not tool_name or status not in ("success", "error"):
            return _resp(400, {"ok": False, "error": "missing_fields"})

        table.put_item(
            Item={
                "id": str(uuid.uuid4()),
                "sessionId": session_id,
                "timeStamp": timestamp,
                "toolName": tool_name,
                "status": status,
                "parameters": parameters,
            }
        )
        return _resp(200, {"ok": True})
    except Exception as e:
        print(f"lambda_error: {e}")
        return _resp(500, {"ok": False, "error": "lambda_exception"})
