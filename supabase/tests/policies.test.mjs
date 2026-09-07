/**
 * Authorization tests for supabase/migrations.
 *
 *   npm run db:test
 *
 * Runs the migrations and the seed against PGlite (Postgres compiled to WASM),
 * then replays every access rule in docs/demo-features.md as the user it is
 * meant to apply to. No Docker, no Supabase project, no network.
 *
 * `supabase-stub.sql` stands in for the parts of a Supabase project the
 * migrations lean on: the `auth` and `storage` schemas, `auth.uid()`, and the
 * anon/authenticated/service_role roles.
 */

import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SUPABASE = join(HERE, "..");
const read = (p) => readFileSync(p, "utf8");

const db = await PGlite.create({ extensions: { pgcrypto } });

let failures = 0;
let passed = 0;

async function step(label, sql) {
  try {
    await db.exec(sql);
    console.log(`  ok    ${label}`);
    return true;
  } catch (error) {
    failures++;
    console.log(`  FAIL  ${label}\n        ${error.message}`);
    return false;
  }
}

console.log("── schema ──");
if (!(await step("supabase stub", read(join(HERE, "supabase-stub.sql"))))) process.exit(1);

for (const file of [
  "20260826000100_schema.sql",
  "20260826000200_rls.sql",
  "20260826000300_triggers.sql",
  "20260826000400_storage.sql",
  "20260826000500_grading_history.sql",
]) {
  if (!(await step(file, read(join(SUPABASE, "migrations", file))))) process.exit(1);
}

await step(
  "api grants",
  `grant select, insert, update, delete on all tables in schema public to authenticated;`,
);

if (!(await step("seed.sql", read(join(SUPABASE, "seed.sql"))))) process.exit(1);

// The seed claims to be re-runnable; a second pass proves it, and would have
// caught `classes.teacher_id` being ON DELETE RESTRICT.
if (!(await step("seed.sql is re-runnable", read(join(SUPABASE, "seed.sql"))))) process.exit(1);

const nullTokens = await db.query(`
  select count(*)::int n from auth.users
  where confirmation_token is null
     or recovery_token is null
     or email_change is null
     or email_change_token_new is null
`);
check(
  "no auth.users row has a NULL token column",
  Number(nullTokens.rows[0].n) === 0,
  `${nullTokens.rows[0].n} rows would make GoTrue answer 500 "Database error querying schema"`,
);

const counts = await db.query(`
  select
    (select count(*)::int from public.users) as users,
    (select count(*)::int from public.classes) as classes,
    (select count(*)::int from public.assignments) as assignments,
    (select count(*)::int from public.submissions) as submissions,
    (select count(*)::int from public.grading_history) as grading_history,
    (select count(*)::int from public.notifications) as notifications
`);
console.log("  data ", JSON.stringify(counts.rows[0]));

// ---------------------------------------------------------------------------
// Authorization checks, run as `authenticated` with a real auth.uid().
// ---------------------------------------------------------------------------
const U = {
  lan: "a0000000-0000-4000-8000-000000000001",
  minh: "a0000000-0000-4000-8000-000000000002",
  an: "b0000000-0000-4000-8000-000000000001",
  peer: "b0000000-0000-4000-8000-000000000002", // classmate of An, different parent
  chi: "b0000000-0000-4000-8000-000000000003",
  dung: "b0000000-0000-4000-8000-000000000004",
  hoa: "c0000000-0000-4000-8000-000000000001",
  otherParent: "c0000000-0000-4000-8000-000000000002",
  c6a1: "d0000000-0000-4000-8000-000000000001",
  c6a2: "d0000000-0000-4000-8000-000000000002",
  aToan: "e0000000-0000-4000-8000-000000000001",
  aLy: "e0000000-0000-4000-8000-000000000004",
  subAnAnh: "f0000000-0000-4000-8000-000000000001",
  subPeerAnh: "f0000000-0000-4000-8000-000000000003",
};

async function as(userId, sql) {
  await db.exec("reset role;");
  await db.exec(
    `select set_config('request.jwt.claims', '{"sub":"${userId}","role":"authenticated"}', false);
     set role authenticated;`,
  );
  try {
    return { rows: (await db.query(sql)).rows, error: null };
  } catch (error) {
    return { rows: null, error: error.message };
  } finally {
    await db.exec("reset role;");
  }
}

function check(label, condition, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ok    ${label}`);
  } else {
    failures++;
    console.log(`  FAIL  ${label}${detail ? `\n        ${detail}` : ""}`);
  }
}

async function reads(label, userId, sql, expect) {
  const { rows, error } = await as(userId, sql);
  if (error) return check(label, false, `unexpected error: ${error}`);
  const got = rows.length === 1 && "n" in rows[0] ? Number(rows[0].n) : rows.length;
  check(label, got === expect, `expected ${expect}, got ${got}`);
}

async function denied(label, userId, sql) {
  const { rows, error } = await as(userId, sql);
  const blocked = error !== null || (rows && rows.length === 0);
  check(label, blocked, `expected a denial, got ${JSON.stringify(rows)}`);
}

console.log("\n── student ──");
await reads("An sees only their own class", U.an, "select count(*)::int n from public.classes", 1);
await reads("An sees 3 assignments of 6A1", U.an, "select count(*)::int n from public.assignments", 3);
await reads("An sees only their own submissions", U.an, "select count(*)::int n from public.submissions", 2);
await reads("An cannot read a classmate's submission", U.an, `select count(*)::int n from public.submissions where student_id = '${U.peer}'`, 0);
await reads("An sees only themselves and their teacher", U.an, "select count(*)::int n from public.users", 2);
await reads("An can see their teacher by name", U.an, `select count(*)::int n from public.users where id = '${U.lan}'`, 1);
await reads("An cannot see a classmate", U.an, `select count(*)::int n from public.users where id = '${U.peer}'`, 0);
await denied("An cannot submit as a classmate", U.an, `insert into public.submissions (assignment_id, student_id, submission_type, external_url) values ('${U.aToan}','${U.peer}','link','https://x.test/a') returning id`);
await denied("An cannot submit to another class's assignment", U.an, `insert into public.submissions (assignment_id, student_id, submission_type, external_url) values ('${U.aLy}','${U.an}','link','https://x.test/a') returning id`);
await denied("An cannot create an assignment", U.an, `insert into public.assignments (class_id, title, due_at) values ('${U.c6a1}','Tự giao','2026-12-01T00:00:00Z') returning id`);

const selfGrade = await as(U.an, `update public.submissions set score = 10, feedback = 'tuyet' where id = '${U.subAnAnh}' returning score`);
check(
  "An cannot grade their own work",
  selfGrade.error !== null || (selfGrade.rows ?? []).length === 0,
  `got ${JSON.stringify(selfGrade)}`,
);

const anToanSub = await as(U.an, `select id from public.submissions where assignment_id = '${U.aToan}' and student_id = '${U.an}'`);
const anToanId = anToanSub.rows?.[0]?.id;
const resubmit = await as(U.an, `update public.submissions set external_url = 'https://x.test/updated' where id = '${anToanId}' returning external_url, score`);
check("An can update ungraded work", resubmit.rows?.[0]?.external_url === "https://x.test/updated", JSON.stringify(resubmit));
check("re-submitting does not carry a score", resubmit.rows?.[0]?.score === null, JSON.stringify(resubmit.rows?.[0]));

const regraded = await as(U.an, `update public.submissions set external_url = 'https://x.test/late' where id = '${U.subAnAnh}' returning id`);
check("An cannot touch already-graded work", (regraded.rows ?? []).length === 0, JSON.stringify(regraded));

console.log("\n── teacher ──");
await reads("Lan sees only 6A1", U.lan, "select count(*)::int n from public.classes", 1);
await reads("Lan sees 6A1 assignments only", U.lan, "select count(*)::int n from public.assignments", 3);
await reads("Lan sees 6A1 submissions only", U.lan, "select count(*)::int n from public.submissions", 4);
await reads("Minh cannot read 6A1 submissions", U.minh, "select count(*)::int n from public.submissions", 0);
await reads("Minh cannot read 6A1 assignments", U.minh, `select count(*)::int n from public.assignments where class_id = '${U.c6a1}'`, 0);
await reads("Lan sees her own grading history", U.lan, "select count(*)::int n from public.grading_history", 2);
await reads("Minh cannot read Lan's grading history", U.minh, "select count(*)::int n from public.grading_history", 0);
await denied("Minh cannot create an assignment in 6A1", U.minh, `insert into public.assignments (class_id, title, due_at) values ('${U.c6a1}','Chen ngang','2026-12-01T00:00:00Z') returning id`);
await denied("Minh cannot grade a 6A1 submission", U.minh, `update public.submissions set score = 1 where id = '${U.subAnAnh}' returning id`);
await denied("Lan cannot write grading history directly", U.lan, `insert into public.grading_history (submission_id, assignment_id, student_id, teacher_id, score) values ('${U.subAnAnh}', '${U.aToan}', '${U.an}', '${U.lan}', 10) returning id`);

const original = await db.query(
  `select external_url from public.submissions where id = '${U.subPeerAnh}'`,
);
const tamper = await as(U.lan, `update public.submissions set external_url = 'https://teacher.test/rewrite', score = 7 where id = '${U.subPeerAnh}' returning external_url, score, graded_by`);
check(
  "teacher cannot rewrite the student's work",
  tamper.rows?.[0]?.external_url === original.rows[0].external_url,
  `wanted ${original.rows[0].external_url}, got ${tamper.rows?.[0]?.external_url}`,
);
check("grading stamps graded_by server-side", tamper.rows?.[0]?.graded_by === U.lan, JSON.stringify(tamper.rows?.[0]));
await reads("Lan history includes the new grade", U.lan, "select count(*)::int n from public.grading_history", 3);

const ungraded = await db.query(
  `select id from public.submissions where assignment_id = '${U.aToan}' and student_id = '${U.chi}'`,
);
const noScore = await as(U.lan, `update public.submissions set feedback = 'chi nhan xet' where id = '${ungraded.rows[0].id}' returning id`);
check("grading without a score is refused", noScore.error !== null, JSON.stringify(noScore));

console.log("\n── parent ──");
await reads("Hoa sees her two children (+ their teacher, + herself)", U.hoa, "select count(*)::int n from public.users", 4);
await reads("Hoa cannot see an unrelated pupil", U.hoa, `select count(*)::int n from public.users where id = '${U.peer}'`, 0);
await reads("Hoa sees her children's submissions only", U.hoa, "select count(*)::int n from public.submissions", 3);
await reads("Hoa reads only her own notifications", U.hoa, `select count(*)::int n from public.notifications where recipient_user_id <> '${U.hoa}'`, 0);
await denied("Hoa cannot mark another parent's notification read", U.hoa, `update public.notifications set is_read = true where recipient_user_id = '${U.otherParent}' returning id`);

const hoaTamper = await as(U.hoa, `update public.notifications set is_read = true, title = 'da sua' where recipient_user_id = '${U.hoa}' returning title, is_read`);
check("marking read cannot rewrite the notification", hoaTamper.rows?.every((r) => r.title !== "da sua") === true, JSON.stringify(hoaTamper.rows?.[0]));

console.log("\n── notifications ──");
const before = await db.query("select count(*)::int n from public.notifications where type = 'assignment_created'");
await as(U.lan, `insert into public.assignments (class_id, title, due_at) values ('${U.c6a1}', 'Bai moi', now() + interval '5 days')`);
const after = await db.query("select count(*)::int n from public.notifications where type = 'assignment_created'");
const delta = Number(after.rows[0].n) - Number(before.rows[0].n);
// 6A1 has three pupils; An and Chi share a parent, Binh has his own => 3 links.
check("a new 6A1 assignment notifies exactly the linked parents", delta === 3, `delta ${delta}`);
const seeded = Number(before.rows[0].n);
check("the seed notified parents for all four assignments", seeded === 10, `got ${seeded}`);

const kinds = await db.query("select type, count(*)::int n from public.notifications group by type order by type");
console.log("  types ", JSON.stringify(kinds.rows));
const updated = kinds.rows.find((r) => r.type === "grade_updated");
check("re-grading emits grade_updated", Number(updated?.n ?? 0) >= 1, JSON.stringify(kinds.rows));

console.log("\n── integrity ──");
const badRole = await db
  .query(`insert into public.class_students (class_id, student_id) values ('${U.c6a1}', '${U.lan}')`)
  .then(() => null)
  .catch((e) => e.message);
check("a teacher cannot be enrolled as a student", badRole !== null, String(badRole));

const twoClasses = await db
  .query(`insert into public.class_students (class_id, student_id) values ('${U.c6a2}', '${U.an}')`)
  .then(() => null)
  .catch((e) => e.message);
check("a student cannot belong to two classes", twoClasses !== null, String(twoClasses));

const badScore = await db
  .query(`update public.submissions set score = 99 where id = '${U.subAnAnh}'`)
  .then(() => null)
  .catch((e) => e.message);
check("a score above 10 is refused", badScore !== null, String(badScore));

const bothPayloads = await db
  .query(`insert into public.submissions (assignment_id, student_id, submission_type, storage_path, external_url) values ('${U.aToan}','${U.peer}','link','a/b/c.pdf','https://x.test')`)
  .then(() => null)
  .catch((e) => e.message);
check("a submission cannot be both a file and a link", bothPayloads !== null, String(bothPayloads));

console.log("\n── storage policies ──");
await db.exec("reset role;");
const objectPath = `${U.aToan}/${U.an}/abc-bai.pdf`;
const upload = await as(U.an, `insert into storage.objects (bucket_id, name) values ('submissions', '${objectPath}') returning id`);
check("a student can upload into their own folder", upload.error === null && upload.rows.length === 1, JSON.stringify(upload));

const foreignUpload = await as(U.an, `insert into storage.objects (bucket_id, name) values ('submissions', '${U.aToan}/${U.peer}/abc.pdf') returning id`);
check("a student cannot upload into another pupil's folder", foreignUpload.error !== null || foreignUpload.rows.length === 0, JSON.stringify(foreignUpload));

const nestedUpload = await as(U.an, `insert into storage.objects (bucket_id, name) values ('submissions', '${U.aToan}/${U.an}/nested/abc.pdf') returning id`);
check("a student cannot upload into nested submission folders", nestedUpload.error !== null || nestedUpload.rows.length === 0, JSON.stringify(nestedUpload));

await reads("the class teacher can read the file", U.lan, `select count(*)::int n from storage.objects where name = '${objectPath}'`, 1);
await reads("another teacher cannot read the file", U.minh, `select count(*)::int n from storage.objects where name = '${objectPath}'`, 0);
await reads("the pupil's parent can read the file", U.hoa, `select count(*)::int n from storage.objects where name = '${objectPath}'`, 1);
await reads("an unrelated parent cannot read the file", U.otherParent, `select count(*)::int n from storage.objects where name = '${objectPath}'`, 0);
await reads("a malformed path does not raise", U.an, `select count(*)::int n from storage.objects where name = 'not-a-uuid/nope.pdf'`, 0);

const fileResubmit = await as(U.an, `
  update public.submissions
  set submission_type = 'file', storage_path = '${objectPath}', external_url = null
  where assignment_id = '${U.aToan}' and student_id = '${U.an}'
  returning id
`);
check("An can point ungraded work at an uploaded file", fileResubmit.rows?.length === 1, JSON.stringify(fileResubmit));

const deleteUngradedFile = await as(U.an, `delete from storage.objects where name = '${objectPath}' returning id`);
check("An can delete an ungraded file submission", deleteUngradedFile.error === null && deleteUngradedFile.rows.length === 1, JSON.stringify(deleteUngradedFile));

const gradedSub = await db.query(
  `select assignment_id from public.submissions where id = '${U.subPeerAnh}'`,
);
const gradedObjectPath = `${gradedSub.rows[0].assignment_id}/${U.peer}/graded.pdf`;
await db.exec(`
  insert into storage.objects (bucket_id, name) values ('submissions', '${gradedObjectPath}');
  alter table public.submissions disable trigger submissions_guard_update;
  update public.submissions
    set submission_type = 'file', storage_path = '${gradedObjectPath}', external_url = null
    where id = '${U.subPeerAnh}';
  alter table public.submissions enable trigger submissions_guard_update;
`);

const deleteGradedFile = await as(U.peer, `delete from storage.objects where name = '${gradedObjectPath}' returning id`);
check("a student cannot delete a file after it is graded", deleteGradedFile.error !== null || deleteGradedFile.rows.length === 0, JSON.stringify(deleteGradedFile));


// ---------------------------------------------------------------------------
// PostgREST embed hints.
//
// PostgREST resolves `parent(child(...))` through the foreign keys, and refuses
// the query when more than one path exists. It counts three kinds: a direct FK
// either way, and a many-to-many inferred from any junction table whose primary
// key is exactly its two foreign keys. `class_students` makes `classes` and
// `users` such a pair, which is not obvious from either table alone — so derive
// the ambiguous pairs from the schema and check the query strings against them.
// ---------------------------------------------------------------------------
console.log("\n── postgrest embeds ──");

const paths = await db.query(`
  with fk as (
    select c.conname, c.conrelid, c.conkey,
           src.relname as src, tgt.relname as tgt
    from pg_constraint c
    join pg_class src on src.oid = c.conrelid
    join pg_class tgt on tgt.oid = c.confrelid
    join pg_namespace ns on ns.oid = src.relnamespace
    where c.contype = 'f' and ns.nspname = 'public'
  ),
  junction as (
    select f1.tgt as a, f2.tgt as b
    from fk f1
    join fk f2 on f2.conrelid = f1.conrelid and f1.conname < f2.conname
    join pg_constraint pk
      on pk.conrelid = f1.conrelid and pk.contype = 'p'
     and pk.conkey @> (f1.conkey || f2.conkey)
     and (f1.conkey || f2.conkey) @> pk.conkey
  ),
  edge as (
    select src as parent, tgt as child from fk
    union all
    select tgt as parent, src as child from fk
    union all
    select a as parent, b as child from junction
    union all
    select b as parent, a as child from junction
  )
  select parent, child, count(*)::int as n
  from edge group by parent, child having count(*) > 1
  order by parent, child
`);

const ambiguous = new Set(paths.rows.map((r) => `${r.parent}>${r.child}`));
console.log("  pairs needing an explicit FK hint:");
for (const r of paths.rows) console.log(`        ${r.parent} -> ${r.child}  (${r.n} paths)`);

/** Walk a select string, yielding [parentTable, childTable, isHinted]. */
function embeds(from, select) {
  const found = [];
  const stack = [from];
  const token = /(?:(\w+)\s*:\s*)?(\w+)(!\w+)?\s*\(|\)/g;
  let m;
  while ((m = token.exec(select)) !== null) {
    if (m[0] === ")") {
      if (stack.length > 1) stack.pop();
      continue;
    }
    const [, , table, hint] = m;
    found.push([stack[stack.length - 1], table, Boolean(hint)]);
    stack.push(table);
  }
  return found;
}

const dataDir = join(HERE, "..", "..", "src", "lib", "data");
const queryRe = /\.from\(\s*"(\w+)"\s*\)[\s\S]{0,80}?\.select\(\s*"((?:[^"\\]|\\.)*)"/g;

let checked = 0;
for (const file of readdirSync(dataDir).filter((f) => f.endsWith(".ts"))) {
  const source = readFileSync(join(dataDir, file), "utf8");
  for (const [, from, select] of source.matchAll(queryRe)) {
    if (!select.includes("(")) continue;
    for (const [parent, child, hinted] of embeds(from, select)) {
      checked++;
      if (ambiguous.has(`${parent}>${child}`) && !hinted) {
        check(
          `${file}: ${parent}(${child}(…)) needs an FK hint`,
          false,
          `PostgREST sees more than one path; write ${child}!<constraint>(…)`,
        );
      }
    }
  }
}
check(`every embed in src/lib/data names its FK where ambiguous`, true, "");
console.log(`  (${checked} embeds inspected)`);

console.log(`\n${failures === 0 ? "PASS" : "FAIL"} — ${passed} checks passed, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
