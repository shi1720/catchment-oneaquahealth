import test from "node:test";
import assert from "node:assert/strict";
const base = process.env.CATCHMENT_TEST_URL ?? "http://localhost:5173";
const origin = new URL(base).origin;
async function session() {
  const r = await fetch(base + "/api/workspace");
  assert.equal(r.status, 200);
  return {
    cookie: r.headers.get("set-cookie").split(";")[0],
    data: await r.json(),
  };
}
async function post(
  s,
  action,
  extra = {},
  revision = s.data.revision,
  id = crypto.randomUUID(),
  requestOrigin = origin,
) {
  const r = await fetch(base + "/api/workspace", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: requestOrigin,
      Cookie: s.cookie,
    },
    body: JSON.stringify({ action, revision, requestId: id, ...extra }),
  });
  const raw = await r.text();
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    body = { error: raw };
  }
  if (r.ok) s.data = body;
  return { status: r.status, body };
}
const observation = {
  siteId: "B03",
  observedAt: new Date().toISOString(),
  appearance: "cloudy",
  odour: "sewage",
  wildlife: "none_seen",
  notes: "Synthetic API test observation from a safe bank.",
  calibrated: true,
  oxygen: 3.5,
};

test("API enforces isolation, validation, concurrency, idempotency, daily budget, snapshots and follow-up", async (t) => {
  const s = await session();
  await t.test("cross-origin writes rejected", async () => {
    assert.equal(
      (
        await post(
          s,
          "observe",
          { observation },
          s.data.revision,
          crypto.randomUUID(),
          "https://untrusted.example",
        )
      ).status,
      403,
    );
  });
  await t.test("enum arrays rejected", async () => {
    assert.equal(
      (
        await post(s, "observe", {
          observation: { ...observation, wildlife: ["distressed"] },
        })
      ).status,
      400,
    );
    assert.equal(s.data.workspace.observations.length, 5);
  });
  let id;
  await t.test("valid observation persists", async () => {
    assert.equal((await post(s, "observe", { observation })).status, 200);
    id = s.data.workspace.observations.find(
      (o) => o.source === "participant",
    ).id;
  });
  await t.test("duplicate observation rejected", async () => {
    assert.equal((await post(s, "observe", { observation })).status, 400);
    assert.equal(s.data.workspace.observations.length, 6);
  });
  await t.test("stale revision rejected", async () => {
    assert.equal(
      (
        await post(
          s,
          "review",
          {
            id,
            status: "confirmed",
            note: "Evidence checked for the API integration test.",
          },
          0,
        )
      ).status,
      409,
    );
  });
  await t.test(
    "review idempotency works even with original revision",
    async () => {
      const req = crypto.randomUUID(),
        rev = s.data.revision;
      assert.equal(
        (
          await post(
            s,
            "review",
            {
              id,
              status: "confirmed",
              note: "Evidence checked for the API integration test.",
            },
            rev,
            req,
          )
        ).status,
        200,
      );
      const after = s.data.revision;
      assert.equal(
        (
          await post(
            s,
            "review",
            {
              id,
              status: "confirmed",
              note: "Evidence checked for the API integration test.",
            },
            rev,
            req,
          )
        ).status,
        200,
      );
      assert.equal(s.data.revision, after);
    },
  );
  await t.test(
    "dispatch requires actual coordinator acknowledgement",
    async () => {
      assert.equal(
        (await post(s, "dispatch", { budget: 80, capacity: 2 })).status,
        400,
      );
    },
  );
  await t.test("dispatch stores immutable evidence snapshots", async () => {
    assert.equal(
      (
        await post(s, "dispatch", {
          budget: 80,
          capacity: 2,
          acknowledged: true,
        })
      ).status,
      200,
    );
    assert.equal(s.data.workspace.missions.length, 2);
    const m = s.data.workspace.missions.find((m) => m.siteId === "B03");
    assert.ok(m.assessmentSnapshot.contributions.length > 0);
    assert.ok(
      m.evidenceSnapshot.some((o) => o.id === id && o.status === "confirmed"),
    );
  });
  await t.test("repeated dispatch cannot overspend daily limits", async () => {
    assert.equal(
      (
        await post(s, "dispatch", {
          budget: 80,
          capacity: 2,
          acknowledged: true,
        })
      ).status,
      400,
    );
    assert.equal(s.data.workspace.missions.length, 2);
  });
  await t.test("later review leaves mission snapshot intact", async () => {
    assert.equal(
      (
        await post(s, "review", {
          id,
          status: "rejected",
          note: "Later reviewer rejected this synthetic report.",
        })
      ).status,
      200,
    );
    assert.equal(
      s.data.workspace.missions
        .find((m) => m.siteId === "B03")
        .evidenceSnapshot.find((o) => o.id === id).status,
      "confirmed",
    );
  });
  await t.test("complete and link a follow-up to the mission", async () => {
    const m = s.data.workspace.missions.find((m) => m.siteId === "B03");
    assert.equal(
      (
        await post(s, "complete", {
          id: m.id,
          outcome:
            "Synthetic visit complete, sample BF-003 recorded. Laboratory review is pending.",
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await post(s, "observe", {
          observation: {
            ...observation,
            notes:
              "Follow-up evidence after the completed demonstration visit.",
            missionId: m.id,
          },
        })
      ).status,
      200,
    );
    assert.ok(s.data.workspace.observations.some((o) => o.missionId === m.id));
    assert.equal(
      (
        await post(s, "observe", {
          observation: {
            ...observation,
            siteId: "B02",
            notes: "Invalid site for the selected completed mission.",
            missionId: m.id,
          },
        })
      ).status,
      400,
    );
  });
  await t.test("completed visits still consume daily budget", async () => {
    assert.equal(
      (
        await post(s, "dispatch", {
          budget: 80,
          capacity: 2,
          acknowledged: true,
        })
      ).status,
      400,
    );
  });
  await t.test("all-or-nothing import leaves no partial records", async () => {
    const count = s.data.workspace.observations.length;
    assert.equal(
      (
        await post(s, "import", {
          observations: [
            { ...observation, notes: "Valid imported entry." },
            { ...observation, ph: 99 },
          ],
        })
      ).status,
      400,
    );
    const fresh = await fetch(base + "/api/workspace", {
      headers: { Cookie: s.cookie },
    });
    assert.equal((await fresh.json()).workspace.observations.length, count);
  });
  await t.test("another visitor cannot access this workspace", async () => {
    const second = await session();
    assert.equal(second.data.workspace.observations.length, 5);
    assert.equal(second.data.workspace.missions.length, 0);
  });
  await t.test(
    "exports require session and contain decision provenance",
    async () => {
      assert.equal((await fetch(base + "/api/export?format=json")).status, 401);
      const r = await fetch(base + "/api/export?format=json", {
        headers: { Cookie: s.cookie },
      });
      assert.equal(r.status, 200);
      const d = await r.json();
      assert.ok(d.missions[0].assessmentSnapshot);
      assert.ok(d.audit.some((a) => a.missionIds?.length));
      assert.equal(
        (
          await fetch(base + "/api/export?format=xml", {
            headers: { Cookie: s.cookie },
          })
        ).status,
        400,
      );
    },
  );
  await t.test(
    "concurrent writes preserve one complete winning revision",
    async () => {
      const rev = s.data.revision;
      const results = await Promise.all([
        post(
          s,
          "review",
          { id, status: "confirmed", note: "Concurrent review number one." },
          rev,
        ),
        post(
          s,
          "review",
          { id, status: "rejected", note: "Concurrent review number two." },
          rev,
        ),
      ]);
      assert.deepEqual(results.map((x) => x.status).sort(), [200, 409]);
    },
  );
  await t.test("reset replaces only the owning demonstration", async () => {
    assert.equal(
      (await post(s, "reset", { confirmation: "RESET" })).status,
      200,
    );
    assert.equal(s.data.workspace.observations.length, 5);
    assert.equal(s.data.workspace.missions.length, 0);
  });
});
