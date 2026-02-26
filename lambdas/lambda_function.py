import json
import hashlib
import time
import uuid
from datetime import datetime, timezone
from urllib import error, parse, request

import boto3


ddb = boto3.resource("dynamodb")
table = ddb.Table("mcp_tool_sessions")
CACHE_TABLE_NAME = "mcp_credentials_cache"
VALIDATION_DEVICE_ID = "0"
CACHE_TTL_SECONDS = 86400 # 24 hours
APPSFLYER_TIMEOUT_SECONDS = 3
cache_table = ddb.Table("mcp_credentials_cache")


def _resp(code, body):
    return {
        "statusCode": code,
        "headers": {"content-type": "application/json"},
        "body": json.dumps(body),
    }


def _credentials_cache_key(app_id, dev_key):
    hashed = hashlib.sha256(f"{app_id}|{dev_key}".encode("utf-8")).hexdigest()
    return f"cred#{hashed}"


def _get_cached_validation(cache_key):

    try:
        response = cache_table.get_item(Key={"id": cache_key})
        item = response.get("Item")
        if not item:
            return None
        expires_at = int(item.get("expiresAt", 0))
        if expires_at <= int(time.time()):
            return None
        return {"ok": bool(item.get("ok")), "message": item.get("message")}
    except Exception as e:
        print(f"cache_get_error: {e}")
        return None


def _set_cached_validation(cache_key, result):
    if CACHE_TTL_SECONDS <= 0:
        return

    try:
        cache_table.put_item(
            Item={
                "id": cache_key,
                "ok": bool(result.get("ok")),
                "message": result.get("message", ""),
                "expiresAt": int(time.time()) + CACHE_TTL_SECONDS,
            }
        )
    except Exception as e:
        print(f"cache_set_error: {e}")


def _validate_against_appsflyer(app_id, dev_key):
    encoded_app_id = parse.quote(app_id, safe="")
    query = parse.urlencode({"devkey": dev_key, "device_id": VALIDATION_DEVICE_ID})
    url = f"https://gcdsdk.appsflyer.com/install_data/v4.0/{encoded_app_id}?{query}"
    req = request.Request(url, headers={"accept": "application/json"}, method="GET")

    try:
        with request.urlopen(req, timeout=APPSFLYER_TIMEOUT_SECONDS) as response:
            status = int(response.getcode())
            body = response.read().decode("utf-8", errors="replace")
    except error.HTTPError as e:
        status = int(e.code)
        body = e.read().decode("utf-8", errors="replace") if e.fp else ""
    except Exception as e:
        return {
            "ok": False,
            "message": f"credential_validation_error: {e}",
        }

    if status in (200, 404):
        return {"ok": True}
    if status == 403:
        return {"ok": False, "message": "credential_validation_forbidden"}

    compact_body = " ".join(body.split())[:300]
    return {
        "ok": False,
        "message": f"credential_validation_http_{status}: {compact_body}",
    }


def _validate_credentials(app_id, dev_key):
    cache_key = _credentials_cache_key(app_id, dev_key)
    cached = _get_cached_validation(cache_key)
    if cached is not None:
        return cached

    result = _validate_against_appsflyer(app_id, dev_key)
    _set_cached_validation(cache_key, result)
    return result


def handler(event, context):
    try:
        body = event.get("body") or "{}"
        payload = json.loads(body)
    except Exception:
        return _resp(400, {"ok": False, "error": "invalid_json"})

    try:
        app_id = payload.get("appId")
        dev_key = payload.get("devKey")
        tool_name = payload.get("toolName")
        os = payload.get("os")
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

        if (
            not app_id
            or not dev_key
            or not tool_name
            or status not in ("success", "error")
        ):
            return _resp(400, {"ok": False, "error": "missing_fields"})

        validation = _validate_credentials(app_id, dev_key)
        if not validation.get("ok"):
            return _resp(
                403,
                {
                    "ok": False,
                    "error": "credential_validation_failed",
                    "details": validation.get("message"),
                },
            )

        table.put_item(
            Item={
                "id": str(uuid.uuid4()),
                "appId": app_id,
                "os": os,
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
