import { NextResponse } from "next/server";

/**
 * POST /api/postgres/store
 *
 * Was a generic escape hatch for arbitrary Firestore writes
 * (`{collection, docId, data}` -> any doc, any shape). Postgres has a fixed
 * relational schema, so there's no equivalent generic write — every table
 * now has its own typed endpoint (see the other modules under
 * ACE-Academy-backend/src/modules/). No caller in this repo used this route;
 * kept as a stub (instead of deleted) in case something external still
 * points at it, so that caller gets a clear error instead of a silent 404
 * or a write that goes nowhere.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "This endpoint is deprecated: arbitrary-collection writes have no Postgres equivalent. Use the typed endpoint for the resource you're writing.",
    },
    { status: 410 }
  );
}
