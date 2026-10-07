from datetime import datetime

from flask import Flask, jsonify, request
from flask_cors import CORS
from mysql.connector import Error

from db import get_connection

app = Flask(__name__)
CORS(app)  # lets the frontend (a different origin) call this API

REQUIRED_FIELDS = [
    "title", "description", "research_area", "faculty_name",
    "department", "required_skills", "positions", "deadline",
]
EDITABLE_FIELDS = REQUIRED_FIELDS + ["status"]


# ---------- helpers ----------

def serialize(row):
    """Convert a database row into JSON-friendly data."""
    if row and row.get("deadline"):
        row["deadline"] = row["deadline"].strftime("%Y-%m-%d")
    if row and row.get("created_at"):
        row["created_at"] = row["created_at"].strftime("%Y-%m-%d %H:%M:%S")
    return row


def validate(data, partial=False):
    """Return a list of error messages. partial=True is used for updates."""
    errors = []

    if not isinstance(data, dict):
        return ["Request body must be valid JSON"]

    if not partial:
        for field in REQUIRED_FIELDS:
            if field not in data or str(data[field]).strip() == "":
                errors.append(f"'{field}' is required")

    for field in REQUIRED_FIELDS:
        if field in data and field not in ("positions", "deadline"):
            if str(data[field]).strip() == "":
                errors.append(f"'{field}' cannot be empty")

    if "positions" in data:
        try:
            if int(data["positions"]) <= 0:
                errors.append("'positions' must be a positive number")
        except (ValueError, TypeError):
            errors.append("'positions' must be a number")

    if "deadline" in data:
        try:
            datetime.strptime(str(data["deadline"]), "%Y-%m-%d")
        except ValueError:
            errors.append("'deadline' must be a date in YYYY-MM-DD format")

    if "status" in data and data["status"] not in ("Open", "Closed"):
        errors.append("'status' must be 'Open' or 'Closed'")

    return errors


def fetch_one(cursor, opp_id):
    cursor.execute("SELECT * FROM opportunities WHERE id = %s", (opp_id,))
    return cursor.fetchone()


# ---------- routes ----------

@app.route("/api/opportunities", methods=["POST"])
def create_opportunity():
    data = request.get_json(silent=True)
    errors = validate(data)
    if errors:
        return jsonify({"error": "Validation failed", "details": errors}), 400

    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """INSERT INTO opportunities
               (title, description, research_area, faculty_name, department,
                required_skills, positions, deadline, status)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                data["title"].strip(), data["description"].strip(),
                data["research_area"].strip(), data["faculty_name"].strip(),
                data["department"].strip(), data["required_skills"].strip(),
                int(data["positions"]), data["deadline"],
                data.get("status", "Open"),
            ),
        )
        conn.commit()
        created = fetch_one(cursor, cursor.lastrowid)
        return jsonify(serialize(created)), 201
    except Error as e:
        return jsonify({"error": "Database error", "details": str(e)}), 500
    finally:
        if conn and conn.is_connected():
            conn.close()


@app.route("/api/opportunities", methods=["GET"])
def get_all_opportunities():
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM opportunities ORDER BY id DESC")
        rows = [serialize(r) for r in cursor.fetchall()]
        return jsonify(rows), 200
    except Error as e:
        return jsonify({"error": "Database error", "details": str(e)}), 500
    finally:
        if conn and conn.is_connected():
            conn.close()


@app.route("/api/opportunities/<int:opp_id>", methods=["GET"])
def get_opportunity(opp_id):
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        row = fetch_one(cursor, opp_id)
        if not row:
            return jsonify({"error": f"Opportunity {opp_id} not found"}), 404
        return jsonify(serialize(row)), 200
    except Error as e:
        return jsonify({"error": "Database error", "details": str(e)}), 500
    finally:
        if conn and conn.is_connected():
            conn.close()


@app.route("/api/opportunities/<int:opp_id>", methods=["PUT"])
def update_opportunity(opp_id):
    data = request.get_json(silent=True)
    errors = validate(data, partial=True)
    if errors:
        return jsonify({"error": "Validation failed", "details": errors}), 400

    fields = {k: v for k, v in data.items() if k in EDITABLE_FIELDS}
    if not fields:
        return jsonify({"error": "No valid fields to update"}), 400

    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        if not fetch_one(cursor, opp_id):
            return jsonify({"error": f"Opportunity {opp_id} not found"}), 404

        # Column names come from our fixed whitelist, never from user input
        set_clause = ", ".join(f"{col} = %s" for col in fields)
        cursor.execute(
            f"UPDATE opportunities SET {set_clause} WHERE id = %s",
            (*fields.values(), opp_id),
        )
        conn.commit()
        return jsonify(serialize(fetch_one(cursor, opp_id))), 200
    except Error as e:
        return jsonify({"error": "Database error", "details": str(e)}), 500
    finally:
        if conn and conn.is_connected():
            conn.close()


@app.route("/api/opportunities/<int:opp_id>", methods=["DELETE"])
def delete_opportunity(opp_id):
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        if not fetch_one(cursor, opp_id):
            return jsonify({"error": f"Opportunity {opp_id} not found"}), 404
        cursor.execute("DELETE FROM opportunities WHERE id = %s", (opp_id,))
        conn.commit()
        return jsonify({"message": f"Opportunity {opp_id} deleted"}), 200
    except Error as e:
        return jsonify({"error": "Database error", "details": str(e)}), 500
    finally:
        if conn and conn.is_connected():
            conn.close()


# ---------- error handlers ----------

@app.errorhandler(404)
def not_found(_):
    return jsonify({"error": "Route not found"}), 404


@app.errorhandler(500)
def server_error(_):
    return jsonify({"error": "Internal server error"}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)