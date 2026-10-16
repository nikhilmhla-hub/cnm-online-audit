import { test } from "node:test";
import assert from "node:assert/strict";
import { deliverEnquiry } from "../lib/enquiry-delivery.ts";

const input = {
  name: "CNM QA TEST",
  phone: "6377525604",
  source: "Website Audit",
  consent: true,
  class: "XII",
  exam: "JEE",
  submissionId: "qa-enquiry-20261017",
};
const request = (value = input) =>
  new Request("https://example.invalid/api/leads", {
    method: "POST",
    body: JSON.stringify(value),
  });
const saved = {
  id: "test-row",
  phone: input.phone,
  queue_number: "CNM007",
  submission_id: input.submissionId,
};
function database(
  initial = [],
  { invisibleWrite = false, conflict = false } = {},
) {
  const rows = structuredClone(initial);
  const writes = [];
  let firstInsert = true;
  const db = {
    from() {
      let operation = "read",
        value,
        filters = [],
        latest = false;
      const query = {
        select() {
          return query;
        },
        eq(k, v) {
          filters.push([k, v]);
          return query;
        },
        not() {
          return query;
        },
        order() {
          latest = true;
          return query;
        },
        limit() {
          return query;
        },
        abortSignal() {
          return query;
        },
        update(v) {
          operation = "update";
          value = v;
          return query;
        },
        insert(v) {
          operation = "insert";
          value = v;
          return query;
        },
        then(resolve, reject) {
          try {
            if (operation === "insert" && conflict && firstInsert) {
              firstInsert = false;
              rows.push({ ...saved, submission_id: "other-submission" });
              return Promise.resolve({
                data: null,
                error: { code: "23505" },
              }).then(resolve, reject);
            }
            let found = rows.filter((r) =>
              filters.every(([k, v]) => r[k] === v),
            );
            if (latest) found = found.slice(-1);
            if (operation === "insert") {
              const row = { id: "new-row", ...value };
              rows.push(row);
              found = [row];
              writes.push(value);
            }
            if (operation === "update") {
              found.forEach((row) => Object.assign(row, value));
              writes.push(value);
            }
            return Promise.resolve({
              data: invisibleWrite && operation !== "read" ? [] : found,
              error: null,
            }).then(resolve, reject);
          } catch (error) {
            return Promise.reject(error).then(resolve, reject);
          }
        },
      };
      return query;
    },
  };
  return { db, rows, writes };
}
const unavailable = async () => {
  throw new TypeError("fetch failed");
};

test("invalid contact and missing consent do not touch either store", async () => {
  let calls = 0;
  const deps = {
    getDatabase: async () => {
      calls++;
      throw Error();
    },
    backupUrl: "https://backup.invalid",
    fetchBackup: async () => {
      calls++;
      return Response.json({ status: "success" });
    },
  };
  for (const payload of [
    { ...input, phone: "bad" },
    { ...input, consent: false },
    {},
  ])
    assert.equal((await deliverEnquiry(request(payload), deps)).status, 400);
  assert.equal(calls, 0);
});
test("new website lead is persisted with source, confirmed row and receipt", async () => {
  const { db, rows } = database();
  const response = await deliverEnquiry(
    request({ ...input, phone: "+91 63775 25604" }),
    { getDatabase: async () => db },
  );
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.storage, "primary");
  assert.equal(body.leadId, "new-row");
  assert.equal(body.receiptId, input.submissionId);
  assert.equal(rows[0].phone, input.phone);
  assert.equal(rows[0].source, "Website Audit");
});
test("existing phone keeps its queue and updates attribution", async () => {
  const { db, rows } = database([
    { ...saved, submission_id: "older", source: "Social Media" },
  ]);
  const body = await (
    await deliverEnquiry(request(), { getDatabase: async () => db })
  ).json();
  assert.equal(body.queueNumber, "CNM007");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].source, "Website Audit");
});
test("same submission replay does not rewrite the lead or resend the backup", async () => {
  const { db, writes } = database([saved]);
  let backups = 0;
  const body = await (
    await deliverEnquiry(request(), {
      getDatabase: async () => db,
      backupUrl: "https://backup.invalid",
      fetchBackup: async () => {
        backups++;
        return Response.json({ status: "success" });
      },
    })
  ).json();
  assert.equal(body.status, "success");
  assert.equal(writes.length, 0);
  assert.equal(backups, 0);
});
test("concurrent phone insertion resolves to the same lead without a second row", async () => {
  const { db, rows } = database([], { conflict: true });
  const body = await (
    await deliverEnquiry(request(), { getDatabase: async () => db })
  ).json();
  assert.equal(body.leadId, "test-row");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].queue_number, "CNM007");
});
test("primary outage can use a positively acknowledged existing backup", async () => {
  let received;
  const response = await deliverEnquiry(request(), {
    getDatabase: unavailable,
    backupUrl: "https://backup.invalid",
    fetchBackup: async (_url, init) => {
      received = JSON.parse(init.body);
      return Response.json({ status: "success" });
    },
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.storage, "backup");
  assert.equal(body.backupSaved, true);
  assert.equal(received.source, "Website Audit");
  assert.equal(received.submissionId, input.submissionId);
});
test("HTML, rejected and failed backup responses never produce false success", async () => {
  for (const response of [
    new Response("<html>sign in</html>"),
    Response.json({ status: "error" }),
    new Response("", { status: 503 }),
  ]) {
    const result = await deliverEnquiry(request(), {
      getDatabase: unavailable,
      backupUrl: "https://backup.invalid",
      fetchBackup: async () => response,
    });
    const body = await result.json();
    assert.equal(result.status, 503);
    assert.equal(body.code, "ENQUIRY_NOT_CONFIRMED");
    assert.equal(body.reference, input.submissionId);
    assert.ok(!JSON.stringify(body).includes("fetch failed"));
  }
});
test("backup failure cannot turn a confirmed database save into a failure", async () => {
  const { db } = database();
  const response = await deliverEnquiry(request(), {
    getDatabase: async () => db,
    backupUrl: "https://backup.invalid",
    fetchBackup: async () => {
      throw Error("offline");
    },
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).storage, "primary");
});
test("a zero-row update is not reported as confirmed persistence", async () => {
  const { db } = database([{ ...saved, submission_id: "older" }], {
    invisibleWrite: true,
  });
  assert.equal(
    (await deliverEnquiry(request(), { getDatabase: async () => db })).status,
    503,
  );
});
test("backup requests carry a bounded timeout signal", async () => {
  const response = await deliverEnquiry(request(), {
    getDatabase: unavailable,
    backupUrl: "https://backup.invalid",
    timeoutMs: 10,
    fetchBackup: async (_url, init) => {
      await new Promise((_, reject) => {
        init.signal.addEventListener(
          "abort",
          () => reject(init.signal.reason),
          { once: true },
        );
        setTimeout(() => reject(Error("deadline missed")), 80);
      });
    },
  });
  assert.equal(response.status, 503);
});
