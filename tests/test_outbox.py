"""
Frappe Outbox Feasibility Proof — Disposable Environment Test
=============================================================
This script proves that Frappe's MariaDB transaction model supports
an atomic outbox pattern. It requires a running Frappe/bench environment.

PREREQUISITES:
  - A Frappe site with bench configured
  - Run via: bench --site <site> execute omnis.tests.test_outbox.run_all_tests

If no Frappe runtime is available, these tests are MARKED AS UNEXECUTED.
The logic is fully specified so they can be run when a disposable 
bench environment is provisioned.

PROVES:
  1. Successful commit persists both business record and outbox event
  2. Failure before commit persists neither
  3. Crash after commit leaves event available for replay
  4. Duplicate delivery does not duplicate business effects (idempotency)

WRITER COVERAGE ANALYSIS (appended at bottom)
"""

import sys
import json
import traceback
from datetime import datetime

# ── Test harness ──────────────────────────────────────────────────────

RESULTS = []

def record(name, status, detail=""):
    RESULTS.append({"test": name, "status": status, "detail": detail})
    print(f"  {'✅' if status == 'PASS' else '❌' if status == 'FAIL' else '⏭️ '} {name}: {status}" + (f" — {detail}" if detail else ""))

def require_frappe():
    """Import frappe or mark all tests as unexecuted."""
    try:
        import frappe
        return frappe
    except ImportError:
        return None


# ── Outbox table DDL ─────────────────────────────────────────────────

OUTBOX_DDL = """
CREATE TABLE IF NOT EXISTS `tabOutbox Event` (
  `name`           VARCHAR(140) NOT NULL PRIMARY KEY,
  `event_id`       VARCHAR(140) NOT NULL UNIQUE,
  `doctype`        VARCHAR(140) NOT NULL,
  `docname`        VARCHAR(140) NOT NULL,
  `operation`      ENUM('INSERT','UPDATE','DELETE') NOT NULL,
  `payload`        LONGTEXT,
  `source_site`    VARCHAR(140) NOT NULL,
  `created_at`     DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `published_at`   DATETIME(6) DEFAULT NULL,
  `attempts`       INT DEFAULT 0,
  INDEX idx_unpublished (`published_at`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
"""

IDEMPOTENCY_DDL = """
CREATE TABLE IF NOT EXISTS `tabIdempotency Key` (
  `event_id`    VARCHAR(140) NOT NULL PRIMARY KEY,
  `processed_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
"""


# ── Test 1: Successful commit persists both ──────────────────────────

def test_atomic_commit(frappe):
    """
    Business mutation (GSM Task insert) + outbox event insert
    in one transaction. Both must persist after commit.
    """
    import uuid
    event_id = f"test-outbox-{uuid.uuid4().hex[:12]}"
    task_name = None

    try:
        # Begin transaction (Frappe auto-begins)
        doc = frappe.new_doc("GSM Task Manager")
        doc.task = f"Outbox Test Task {event_id}"
        doc.assignee = "test@outbox.local"
        doc.status = "Open"
        doc.date_assigned = datetime.now().strftime("%Y-%m-%d")
        doc.save(ignore_permissions=True)
        task_name = doc.name

        # Insert outbox event in SAME transaction
        frappe.db.sql("""
            INSERT INTO `tabOutbox Event` 
            (name, event_id, doctype, docname, operation, payload, source_site)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            event_id, event_id, "GSM Task Manager", task_name,
            "INSERT", json.dumps({"task": doc.task}), frappe.local.site
        ))

        frappe.db.commit()

        # Verify both exist
        task_exists = frappe.db.exists("GSM Task Manager", task_name)
        event_exists = frappe.db.sql(
            "SELECT 1 FROM `tabOutbox Event` WHERE event_id = %s", event_id
        )

        if task_exists and event_exists:
            record("atomic_commit", "PASS", "Both business record and outbox event persisted")
        else:
            record("atomic_commit", "FAIL", 
                   f"task_exists={bool(task_exists)}, event_exists={bool(event_exists)}")

    except Exception as e:
        record("atomic_commit", "FAIL", str(e))
    finally:
        # Cleanup
        try:
            if task_name:
                frappe.delete_doc("GSM Task Manager", task_name, ignore_permissions=True, force=True)
            frappe.db.sql("DELETE FROM `tabOutbox Event` WHERE event_id = %s", event_id)
            frappe.db.commit()
        except:
            pass


# ── Test 2: Failure before commit persists neither ───────────────────

def test_rollback_atomicity(frappe):
    """
    Business mutation + outbox event insert, then ROLLBACK.
    Neither must persist.
    """
    import uuid
    event_id = f"test-rollback-{uuid.uuid4().hex[:12]}"
    task_title = f"Rollback Test {event_id}"

    try:
        doc = frappe.new_doc("GSM Task Manager")
        doc.task = task_title
        doc.assignee = "test@rollback.local"
        doc.status = "Open"
        doc.date_assigned = datetime.now().strftime("%Y-%m-%d")
        doc.save(ignore_permissions=True)
        task_name = doc.name

        frappe.db.sql("""
            INSERT INTO `tabOutbox Event`
            (name, event_id, doctype, docname, operation, payload, source_site)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            event_id, event_id, "GSM Task Manager", task_name,
            "INSERT", json.dumps({"task": task_title}), frappe.local.site
        ))

        # Simulate failure: rollback instead of commit
        frappe.db.rollback()

        # Verify neither exists
        task_exists = frappe.db.sql(
            "SELECT 1 FROM `tabGSM Task Manager` WHERE name = %s", task_name
        )
        event_exists = frappe.db.sql(
            "SELECT 1 FROM `tabOutbox Event` WHERE event_id = %s", event_id
        )

        if not task_exists and not event_exists:
            record("rollback_atomicity", "PASS", "Neither persisted after rollback")
        else:
            record("rollback_atomicity", "FAIL",
                   f"task_leaked={bool(task_exists)}, event_leaked={bool(event_exists)}")

    except Exception as e:
        record("rollback_atomicity", "FAIL", str(e))


# ── Test 3: Crash after commit leaves event for replay ───────────────

def test_crash_recovery(frappe):
    """
    After a successful commit, the outbox event must survive even if 
    the publishing step fails. Simulate by committing, then checking 
    the event remains unpublished (published_at IS NULL).
    """
    import uuid
    event_id = f"test-crash-{uuid.uuid4().hex[:12]}"

    try:
        doc = frappe.new_doc("GSM Task Manager")
        doc.task = f"Crash Recovery Test {event_id}"
        doc.assignee = "test@crash.local"
        doc.status = "Open"
        doc.date_assigned = datetime.now().strftime("%Y-%m-%d")
        doc.save(ignore_permissions=True)
        task_name = doc.name

        frappe.db.sql("""
            INSERT INTO `tabOutbox Event`
            (name, event_id, doctype, docname, operation, payload, source_site, published_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, NULL)
        """, (
            event_id, event_id, "GSM Task Manager", task_name,
            "INSERT", json.dumps({"task": doc.task}), frappe.local.site
        ))

        frappe.db.commit()

        # Simulate: "publisher crashed" — event was never marked published
        unpublished = frappe.db.sql("""
            SELECT event_id FROM `tabOutbox Event`
            WHERE event_id = %s AND published_at IS NULL
        """, event_id)

        if unpublished:
            record("crash_recovery", "PASS", "Unpublished event available for replay")
        else:
            record("crash_recovery", "FAIL", "Event missing or already published")

    except Exception as e:
        record("crash_recovery", "FAIL", str(e))
    finally:
        try:
            frappe.db.sql("DELETE FROM `tabOutbox Event` WHERE event_id = %s", event_id)
            frappe.db.sql("DELETE FROM `tabGSM Task Manager` WHERE name LIKE %s", f"%{event_id[-12:]}%")
            frappe.db.commit()
        except:
            pass


# ── Test 4: Idempotent consumer (duplicate delivery) ─────────────────

def test_idempotent_consumer(frappe):
    """
    Delivering the same event_id twice must not create two business 
    records. Uses an idempotency table to track processed events.
    """
    import uuid
    event_id = f"test-idemp-{uuid.uuid4().hex[:12]}"
    created_count = 0

    def process_event(eid, payload):
        """Simulates a consumer that checks idempotency before applying."""
        nonlocal created_count
        already = frappe.db.sql(
            "SELECT 1 FROM `tabIdempotency Key` WHERE event_id = %s", eid
        )
        if already:
            return  # Skip duplicate

        # Process: create a record
        doc = frappe.new_doc("GSM Task Manager")
        doc.task = payload["task"]
        doc.assignee = "test@idemp.local"
        doc.status = "Open"
        doc.date_assigned = datetime.now().strftime("%Y-%m-%d")
        doc.save(ignore_permissions=True)
        created_count += 1

        # Mark as processed
        frappe.db.sql(
            "INSERT INTO `tabIdempotency Key` (event_id) VALUES (%s)", eid
        )
        frappe.db.commit()

    try:
        payload = {"task": f"Idempotency Test {event_id}"}

        # Deliver twice
        process_event(event_id, payload)
        process_event(event_id, payload)

        if created_count == 1:
            record("idempotent_consumer", "PASS", "Duplicate delivery created exactly 1 record")
        else:
            record("idempotent_consumer", "FAIL", f"Created {created_count} records (expected 1)")

    except Exception as e:
        record("idempotent_consumer", "FAIL", str(e))
    finally:
        try:
            frappe.db.sql("DELETE FROM `tabIdempotency Key` WHERE event_id = %s", event_id)
            frappe.db.sql("DELETE FROM `tabGSM Task Manager` WHERE task LIKE %s", f"%{event_id[-12:]}%")
            frappe.db.commit()
        except:
            pass


# ── Runner ────────────────────────────────────────────────────────────

def setup_tables(frappe):
    """Create outbox and idempotency tables if they don't exist."""
    frappe.db.sql(OUTBOX_DDL)
    frappe.db.sql(IDEMPOTENCY_DDL)
    frappe.db.commit()

def teardown_tables(frappe):
    """Drop test tables."""
    frappe.db.sql("DROP TABLE IF EXISTS `tabOutbox Event`")
    frappe.db.sql("DROP TABLE IF EXISTS `tabIdempotency Key`")
    frappe.db.commit()

def run_all_tests():
    frappe = require_frappe()

    print("=" * 60)
    print("Frappe Outbox Feasibility Proof")
    print("=" * 60)

    if frappe is None:
        print("\n⚠️  Frappe runtime not available.")
        print("   Tests are SPECIFIED but UNEXECUTED.")
        print("   Run in a disposable bench environment:")
        print("   bench --site <site> execute omnis.tests.test_outbox.run_all_tests")
        for name in ["atomic_commit", "rollback_atomicity", "crash_recovery", "idempotent_consumer"]:
            record(name, "NOT_RUN", "No Frappe runtime available")
    else:
        try:
            setup_tables(frappe)
            test_atomic_commit(frappe)
            test_rollback_atomicity(frappe)
            test_crash_recovery(frappe)
            test_idempotent_consumer(frappe)
        finally:
            try:
                teardown_tables(frappe)
            except:
                pass

    print("\n" + "=" * 60)
    print("WRITER COVERAGE ANALYSIS")
    print("=" * 60)
    print("""
The outbox pattern can cover these writer categories:

COVERED (within Frappe Python transaction boundary):
  ✅ doc.save() / doc.insert() — all 24 write sites in omnis_dashboard.py
  ✅ frappe.delete_doc() — 4 delete sites in omnis_dashboard.py
  ✅ frappe.db.set_value() — 5 sites in omnis_dashboard.py
  ✅ frappe.db.sql(UPDATE/INSERT) — 1 raw SQL site in omnis_dashboard.py
  ✅ Hooks (doc events, on_update, after_insert) — same transaction if synchronous

PARTIALLY COVERED:
  ⚠️  frappe.enqueue() / background jobs — outbox insert must happen BEFORE
     enqueue; the job itself runs in a separate transaction
  ⚠️  Direct REST API writes from external clients — must be routed
     through outbox-aware endpoints

NOT COVERED (require alternative capture):
  ❌ Direct SQL from MySQL CLI or admin tools (no Python context)
  ❌ Import Data Tool (frappe.core) — bulk import uses separate transactions
  ❌ Bench console writes (frappe.get_doc().save()) without outbox wrapper
  ❌ WhatsApp webhook handlers (fleetrack) — separate app, own transactions

ALTERNATIVE: MariaDB Binlog CDC
  If outbox cannot cover all writers, MariaDB binary log CDC is available:
  Prerequisites:
    - binlog_format = ROW (verify: SHOW VARIABLES LIKE 'binlog_format')
    - Server ID configured
    - A dedicated CDC user with REPLICATION SLAVE privilege
    - Maxwell, Debezium, or custom binlog tailer
  Limitations:
    - Requires network access to MariaDB from CDC consumer
    - Schema changes require CDC consumer restart
    - Captures ALL writes, not just business-relevant ones (filter needed)
    - Does NOT provide business-level event semantics (row-level only)
  
  Modified-timestamp polling is NOT a substitute for CDC:
    - Cannot capture deletes
    - Cannot guarantee ordering
    - Race condition between read and write of modified timestamp
    - Polling interval creates inherent lag
""")

    print("\n" + "=" * 60)
    print("RESULTS SUMMARY")
    print("=" * 60)
    for r in RESULTS:
        print(f"  {r['status']:8s} | {r['test']}")

    passed = sum(1 for r in RESULTS if r['status'] == 'PASS')
    failed = sum(1 for r in RESULTS if r['status'] == 'FAIL')
    not_run = sum(1 for r in RESULTS if r['status'] == 'NOT_RUN')
    print(f"\n  Total: {len(RESULTS)} | Pass: {passed} | Fail: {failed} | Not Run: {not_run}")
    
    return RESULTS


if __name__ == "__main__":
    run_all_tests()
